import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { posthog } from "../services/posthog";
import type { ChurchUser } from "../types";

interface AuthContextValue {
  session: Session | null;
  profile: ChurchUser | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Sinalizado no localStorage logo antes de um signOut forçado (conta desativada
// enquanto a sessão estava ativa em algum navegador), para o Login.tsx mostrar a
// mesma mensagem de "conta inativa" de quem tenta logar já desativado.
const INACTIVE_LOGOUT_FLAG = "logout_reason_inactive";

// Detecta, direto da URL (sem esperar nenhum evento assíncrono do supabase-js),
// se este carregamento de página veio de um link de redefinição de senha
// (`type=recovery`, seja no hash `#...` do implicit grant ou na query string).
//
// Isso existe porque `supabase.auth.getSession()` resolve ANTES do evento
// "PASSWORD_RECOVERY" ser de fato entregue aos listeners de onAuthStateChange
// (ambos dependem da mesma promise interna de inicialização do client, mas
// getSession() está "na frente na fila" — a notificação do evento só dispara
// depois, via um setTimeout interno). Se o ProtectedRoute decidisse só com
// base em session/profile, ele via uma sessão "normal" nesse intervalo e
// mandava a pessoa pro Dashboard antes do evento de recovery chegar. Checar a
// URL direto, de forma síncrona, no primeiro render, elimina essa corrida.
function detectPasswordRecoveryFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<ChurchUser | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, email, role, status, last_access, cpf, church_id, termo_aceito, theme")
    .eq("id", userId)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    lastAccess: data.last_access ? new Date(data.last_access).toLocaleString("pt-BR") : "—",
    cpf: data.cpf,
    churchId: data.church_id,
    termoAceito: data.termo_aceito,
    theme: data.theme,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ChurchUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Inicializado de forma síncrona (lazy initializer) a partir da URL atual —
  // já disponível no primeiro render, sem esperar nenhum round-trip do Supabase.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => detectPasswordRecoveryFromUrl());

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setProfile(data.session ? await fetchProfile(data.session.user.id) : null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      setProfile(nextSession ? await fetchProfile(nextSession.user.id) : null);

      // Confirmação assíncrona (redundante com a checagem síncrona da URL acima,
      // mas cobre qualquer formato de link que a checagem síncrona não preveja).
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      // Limpa a flag quando a sessão de recovery é encerrada (ResetPassword.tsx
      // chama signOut() depois de trocar a senha com sucesso).
      if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Escuta o próprio registro em `profiles` em tempo real: se um Admin desativar
  // esta conta em outra sessão/navegador, desloga na hora em vez de esperar a
  // próxima renovação de token (a RLS já bloquearia as ações, mas isso também
  // encerra a sessão de verdade, como pedido).
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const nextStatus = (payload.new as { status?: string })?.status;
          if (nextStatus === "Inativo" || nextStatus === "Excluído") {
            localStorage.setItem(INACTIVE_LOGOUT_FLAG, "1");
            supabase.auth.signOut();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  // Mesma lógica acima, mas para a igreja do usuário (não o Master, que não
  // tem church_id): se um Admin Master desativar a igreja em outra sessão,
  // desloga na hora em vez de esperar a próxima renovação de token/RLS.
  useEffect(() => {
    const churchId = profile?.churchId;
    if (!churchId) return;

    const channel = supabase
      .channel(`church-status-${churchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "churches", filter: `id=eq.${churchId}` },
        (payload) => {
          if ((payload.new as { is_active?: boolean })?.is_active === false) {
            localStorage.setItem(INACTIVE_LOGOUT_FLAG, "1");
            supabase.auth.signOut();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.churchId]);

  // Associa os eventos do PostHog ao usuário logado; `loading` evita disparar
  // reset() no primeiro render (profile ainda null enquanto a sessão carrega).
  useEffect(() => {
    if (profile) {
      posthog.identify(profile.id, { email: profile.email, role: profile.role, church_id: profile.churchId });
    } else if (!loading) {
      posthog.reset();
    }
  }, [profile, loading]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Autocadastro (SignupForm) que ficou pendente de confirmação de e-mail:
    // signUp() não tinha sessão ainda para criar a igreja, então isso só pôde
    // acontecer agora, no primeiro login pós-confirmação — no-op (idempotente)
    // para qualquer login normal, inclusive master.
    await supabase.rpc("complete_pending_church_signup");

    const userProfile = await fetchProfile(data.user.id);
    if (!userProfile) {
      // RLS já bloqueia o profile de um usuário Inativo (is_active() na policy de
      // select) — chegar aqui sem profile visível significa conta desativada.
      await supabase.auth.signOut();
      return { error: "INACTIVE" };
    }

    await supabase.rpc("touch_last_access");
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    setProfile(await fetchProfile(session.user.id));
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, isPasswordRecovery, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function consumeInactiveLogoutFlag(): boolean {
  if (localStorage.getItem(INACTIVE_LOGOUT_FLAG) !== "1") return false;
  localStorage.removeItem(INACTIVE_LOGOUT_FLAG);
  return true;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
