import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  LogIn,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { useAuth, consumeInactiveLogoutFlag } from "../context/AuthContext";
import chapelIllustration from "../assets/chapel-illustration.svg";

const INACTIVE_MESSAGE = "Sua conta está inativa. Entre em contato com o administrador para mais informações.";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Se a conta foi desativada enquanto a sessão estava ativa em algum
  // navegador (via assinatura Realtime no AuthContext), o signOut forçado
  // marca esse flag antes de redirecionar para cá.
  useEffect(() => {
    if (consumeInactiveLogoutFlag()) setErrorMessage(INACTIVE_MESSAGE);
  }, []);

  const authenticate = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Preencha e-mail e senha para continuar.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);
    if (error === "INACTIVE") {
      setErrorMessage(INACTIVE_MESSAGE);
      return;
    }
    if (error) {
      setErrorMessage("E-mail ou senha incorretos. Verifique e tente novamente.");
      return;
    }
    navigate("/dashboard");
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
            <LogIn size={22} />
          </span>
          <span className="font-display font-semibold text-[19px] tracking-tight">
            Contabilidade Ministerial
          </span>
        </div>

        <div className="relative z-10 max-w-[460px]">
          <p className="font-display font-medium text-3xl leading-[1.28] tracking-tight">
            Gestão transparente, governança sólida e mordomia fiel para a sua
            igreja.
          </p>
        </div>

        <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/20 bg-white/5 w-fit">
          <ShieldCheck size={14} className="text-neutral-300" />
          <span className="text-[11px] text-neutral-300">
            Plataforma protegida com criptografia de ponta
          </span>
        </div>
      </div>

      <div className="flex-[1_1_54%] min-w-0 md:min-w-[360px] flex flex-col overflow-y-auto">
        <div className="flex justify-end px-5 sm:px-8 pt-6">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 pb-16">
          <div className="w-full max-w-[400px]">
            <h1 className="font-display font-semibold text-[27px] tracking-tight mb-1.5">
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-7">
              Acesse o painel financeiro da sua igreja
            </p>

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-status-error/10 border border-status-error rounded-md px-3.5 py-3 mb-5">
                <span className="text-status-error text-xs leading-relaxed">
                  {errorMessage}
                </span>
              </div>
            )}

            <form onSubmit={authenticate}>
              <div className="flex flex-col gap-4 mb-2">
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">
                    E-mail Corporativo/Ministerial
                  </span>
                  <span className="flex items-center gap-2 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 bg-white dark:bg-neutral-900">
                    <Mail size={14} className="text-neutral-400 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="voce@igreja.org"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">
                    Senha de Acesso
                  </span>
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
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-neutral-700 dark:text-neutral-400 shrink-0"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between my-4">
                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-[15px] h-[15px] accent-orla-blue cursor-pointer"
                  />
                  Lembrar neste dispositivo
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs text-orla-blue hover:text-blue-400"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-md bg-orla-blue text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-70 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Autenticando…
                  </>
                ) : (
                  "Entrar na Plataforma"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showForgotPasswordModal && (
        <ForgotPasswordModal onClose={() => setShowForgotPasswordModal(false)} />
      )}
    </div>
  );
}
