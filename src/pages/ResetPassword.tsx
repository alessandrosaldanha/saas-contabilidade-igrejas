import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { supabase } from "../services/supabase";
import chapelIllustration from "../assets/chapel-illustration.svg";

type PageStatus = "checking" | "ready" | "invalid" | "success";

interface ReadOnlyUser {
  name: string;
  email: string;
}

function readUrlErrorDescription(): string | null {
  // Um link de recovery inválido/expirado é redirecionado pelo GoTrue com
  // `#error=...&error_description=...` na URL, em vez de estabelecer sessão.
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const search = new URLSearchParams(window.location.search);
  const description = hash.get("error_description") || search.get("error_description");
  return description ? description.replace(/\+/g, " ") : null;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>("checking");
  const [user, setUser] = useState<ReadOnlyUser | null>(null);
  const [invalidReason, setInvalidReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session) return;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", data.session.user.id)
        .single();
      if (!active) return;
      setUser(
        profileRow
          ? { name: profileRow.name, email: profileRow.email }
          : { name: "—", email: data.session.user.email ?? "—" },
      );
      setStatus("ready");
    };

    // O supabase-js processa o token de recovery da URL assim que o client é
    // criado e dispara "PASSWORD_RECOVERY" quando a sessão temporária fica
    // pronta — mas isso pode acontecer um instante depois do primeiro render,
    // por isso checamos getSession() já de cara e também escutamos o evento.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) loadFromSession();
    });

    loadFromSession().then(() => {
      if (!active) return;
      // Se depois de processar a URL ainda não há sessão, o link é inválido/expirado.
      setStatus((current) => {
        if (current === "checking") {
          setInvalidReason(readUrlErrorDescription() || "O link é inválido ou já expirou.");
          return "invalid";
        }
        return current;
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    if (!password || !confirmPassword) {
      setErrorMessage("Preencha a nova senha e a confirmação.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await supabase.auth.signOut();
    setStatus("success");
    setTimeout(() => navigate("/login", { replace: true }), 2500);
  };

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-white dark:bg-black text-black dark:text-white">
      <div className="hidden md:flex flex-[1_1_46%] min-w-[360px] relative bg-black text-white flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={chapelIllustration}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-[26px] h-[18px]">
            <Lock size={20} />
          </span>
          <span className="font-display font-semibold text-[19px] tracking-tight">Contabilidade Ministerial</span>
        </div>
        <div className="relative z-10 max-w-[460px]">
          <p className="font-display font-medium text-3xl leading-[1.28] tracking-tight">
            Defina uma nova senha para continuar cuidando da gestão financeira da sua igreja.
          </p>
        </div>
        <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/20 bg-white/5 w-fit">
          <ShieldCheck size={14} className="text-neutral-300" />
          <span className="text-[11px] text-neutral-300">Plataforma protegida com criptografia de ponta</span>
        </div>
      </div>

      <div className="flex-[1_1_54%] min-w-0 md:min-w-[360px] flex flex-col overflow-y-auto">
        <div className="flex justify-end px-5 sm:px-8 pt-6">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 pb-16">
          <div className="w-full max-w-[400px]">
            {status === "checking" && (
              <div className="flex flex-col items-center gap-3 text-center py-10">
                <Loader2 size={24} className="text-orla-blue animate-spin" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Validando link de redefinição…</p>
              </div>
            )}

            {status === "invalid" && (
              <div className="flex flex-col items-center gap-3.5 text-center py-6">
                <span className="w-12 h-12 rounded-full bg-status-error/10 flex items-center justify-center">
                  <AlertTriangle size={22} className="text-status-error" />
                </span>
                <h1 className="font-display font-semibold text-xl tracking-tight">Link inválido ou expirado</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{invalidReason}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Peça ao administrador para gerar um novo link de redefinição de senha.
                </p>
                <button
                  onClick={() => navigate("/login", { replace: true })}
                  className="mt-2 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
                >
                  Voltar para o Login
                </button>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-3.5 text-center py-10">
                <span className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-status-success" />
                </span>
                <h1 className="font-display font-semibold text-xl tracking-tight">Senha redefinida com sucesso</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Redirecionando para o login…</p>
              </div>
            )}

            {status === "ready" && (
              <>
                <h1 className="font-display font-semibold text-[27px] tracking-tight mb-1.5">Redefinir senha</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                  Escolha uma nova senha de acesso para a sua conta
                </p>

                {user && (
                  <div className="flex items-center gap-3 border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950 rounded-md px-3.5 py-3 mb-6">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{user.name}</div>
                      <div className="text-neutral-400 text-xs truncate">{user.email}</div>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-start gap-2.5 bg-status-error/10 border border-status-error rounded-md px-3.5 py-3 mb-5">
                    <span className="text-status-error text-xs leading-relaxed">{errorMessage}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4 mb-6">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1.5">Nova Senha</span>
                    <span className="flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
                      <Lock size={14} className="text-neutral-400 shrink-0" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrorMessage("");
                        }}
                        placeholder="••••••••"
                        className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-neutral-400 shrink-0">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-medium mb-1.5">Confirmar Nova Senha</span>
                    <span className="flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
                      <Lock size={14} className="text-neutral-400 shrink-0" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrorMessage("");
                        }}
                        placeholder="••••••••"
                        className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                      />
                    </span>
                  </label>
                </div>

                <button
                  onClick={submit}
                  disabled={isSaving}
                  className="w-full h-12 rounded-md bg-orla-blue text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-70 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Salvando…
                    </>
                  ) : (
                    "Redefinir Senha"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
