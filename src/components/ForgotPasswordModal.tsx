import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, Loader2, X, CheckCircle2 } from "lucide-react";
import { supabase } from "../services/supabase";

interface ForgotPasswordModalProps {
  onClose: () => void;
}

// Autosserviço de "Esqueceu a senha?" — dispara o e-mail de recuperação do
// próprio Supabase Auth. A mensagem de sucesso é a mesma tanto se o e-mail
// existir quanto se não existir, para não expor quais e-mails estão cadastrados.
export default function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Informe seu e-mail para continuar.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      setErrorMessage("Não foi possível enviar o link de recuperação. Tente novamente em alguns instantes.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[420px] rounded-lg shadow-md p-5 sm:p-8 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={18} />
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-3.5 text-center py-4">
            <span className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-status-success" />
            </span>
            <h3 className="font-display font-semibold text-lg m-0">Verifique seu e-mail</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
            >
              Voltar para o Login
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display font-semibold text-lg mb-1.5 m-0">Recuperar senha</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5">
              Informe seu e-mail cadastrado para receber um link de redefinição de senha.
            </p>

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-status-error/10 border border-status-error rounded-md px-3.5 py-3 mb-5">
                <span className="text-status-error text-xs leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={submit}>
              <label className="block mb-5">
                <span className="block text-sm font-medium mb-1.5">E-mail</span>
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
                    autoFocus
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                  />
                </span>
              </label>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-70 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar link"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
