import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Building2, Loader2 } from "lucide-react";
import { supabase } from "../../../services/supabase";
import { useAuth } from "../../../context/AuthContext";

interface SignupFormProps {
  onBackToLogin: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_MESSAGE =
  "Limite de tentativas atingido. Por favor, aguarde alguns minutos antes de tentar novamente ou entre em contato com o suporte.";

// Traduz mensagens conhecidas do Supabase Auth para PT-BR amigável — em
// particular o rate limit de envio de e-mail (SMTP padrão do Supabase é
// bem restritivo), que sem isso aparecia cru em inglês pro usuário final.
function friendlySignupError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("email rate limit exceeded") || normalized.includes("rate limit")) {
    return RATE_LIMIT_MESSAGE;
  }
  if (message === "User already registered") {
    return "Este e-mail já está cadastrado.";
  }
  return message;
}

// Autocadastro de nova igreja: cria o usuário (Supabase Auth) + a igreja no
// plano Free em dois passos encadeados — signUp() e depois a RPC
// complete_pending_church_signup(), que só pode rodar já autenticado. Se o
// projeto exigir confirmação de e-mail, signUp() não retorna sessão e a RPC
// não roda aqui: ela é chamada de novo (idempotente, lendo o nome da igreja
// do próprio user_metadata) no primeiro login pós-confirmação, em
// AuthContext.signIn() — ver migration 0018 para o porquê desse desenho.
export default function SignupForm({ onBackToLogin }: SignupFormProps) {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [churchName, setChurchName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return "Informe seu nome completo.";
    if (!EMAIL_RE.test(email.trim())) return "Informe um e-mail válido.";
    if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (password !== confirmPassword) return "As senhas não coincidem.";
    if (!churchName.trim()) return "Informe o nome da igreja.";
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: fullName.trim(), role: "Admin", church_name: churchName.trim() } },
    });
    if (error) {
      console.error("[SignupForm] Falha em supabase.auth.signUp:", error);
      setIsLoading(false);
      setErrorMessage(friendlySignupError(error.message));
      return;
    }

    // Sem sessão ativa após signUp() = projeto exige confirmação de e-mail —
    // não há como chamar complete_pending_church_signup() (precisa de
    // auth.uid()) até o link ser confirmado, então avisa e para por aqui. A
    // igreja é criada depois, automaticamente, no primeiro login pós-confirmação
    // (AuthContext.signIn chama a mesma RPC, lendo o nome do user_metadata).
    if (!data.session) {
      setIsLoading(false);
      setPendingEmailConfirmation(true);
      return;
    }

    const { error: churchError } = await supabase.rpc("complete_pending_church_signup");
    if (churchError) {
      console.error("[SignupForm] Falha em complete_pending_church_signup:", churchError);
      setIsLoading(false);
      const friendly = friendlySignupError(churchError.message);
      setErrorMessage(friendly === churchError.message ? `Não foi possível concluir o cadastro da igreja: ${friendly}` : friendly);
      return;
    }

    await supabase.rpc("touch_last_access");
    await refreshProfile();
    setIsLoading(false);
    navigate("/dashboard");
  };

  if (pendingEmailConfirmation) {
    return (
      <div className="w-full max-w-[400px] text-center">
        <h1 className="font-display font-semibold text-[27px] tracking-tight mb-3">Verifique seu e-mail</h1>
        <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-7 leading-relaxed">
          Enviamos um link de confirmação para <strong>{email.trim()}</strong>. Confirme seu e-mail e depois faça login
          para concluir o cadastro da sua igreja.
        </p>
        <button
          onClick={onBackToLogin}
          className="px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
        >
          Voltar para o Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="font-display font-semibold text-[27px] tracking-tight mb-1.5">Cadastre sua Igreja</h1>
      <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-7">
        Crie sua conta gratuita e comece a organizar as finanças da sua igreja
      </p>

      {errorMessage && (
        <div className="flex items-start gap-2.5 bg-status-error/10 border border-status-error rounded-md px-3.5 py-3 mb-5">
          <span className="text-status-error text-xs leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="flex flex-col gap-4 mb-2">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Nome Completo do Responsável</span>
            <span className="w-full box-border flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
              <User size={14} className="text-neutral-400 shrink-0" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Nome da Igreja</span>
            <span className="w-full box-border flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
              <Building2 size={14} className="text-neutral-400 shrink-0" />
              <input
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Ex: Igreja Batista Reformada"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
              />
            </span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-1.5">E-mail</span>
            <span className="w-full box-border flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
              <Mail size={14} className="text-neutral-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@igreja.org"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
              />
            </span>
          </label>

          <div className="w-full box-border flex flex-col sm:flex-row gap-3">
            <label className="block w-full sm:w-0 sm:flex-1 box-border">
              <span className="block text-sm font-medium mb-1.5">Senha</span>
              <span className="w-full box-border flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
                <Lock size={14} className="text-neutral-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-neutral-700 dark:text-neutral-400 shrink-0">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </span>
            </label>
            <label className="block w-full sm:w-0 sm:flex-1 box-border">
              <span className="block text-sm font-medium mb-1.5">Confirmar Senha</span>
              <span className="w-full box-border flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
                <Lock size={14} className="text-neutral-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                />
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-md bg-orla-blue text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-70 transition-colors mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Criando conta…
            </>
          ) : (
            "Criar Conta Gratuita"
          )}
        </button>

        <p className="text-center text-xs text-neutral-700 dark:text-neutral-400 mt-5">
          Já possui uma conta?{" "}
          <button type="button" onClick={onBackToLogin} className="text-orla-blue hover:text-blue-400 font-medium">
            Entrar
          </button>
        </p>
      </form>
    </div>
  );
}
