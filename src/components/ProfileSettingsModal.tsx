import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";

interface ProfileSettingsModalProps {
  onClose: () => void;
}

export default function ProfileSettingsModal({ onClose }: ProfileSettingsModalProps) {
  const { profile, refreshProfile } = useAuth();
  const { showToastMsg } = useApp();

  const originalName = profile?.name ?? "";
  const originalEmail = profile?.email ?? "";

  const [name, setName] = useState(originalName);
  const [email, setEmail] = useState(originalEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const hasUnsavedChanges =
    name.trim() !== originalName ||
    email.trim() !== originalEmail ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const requestClose = () => {
    if (isSaving) return;
    if (hasUnsavedChanges) setConfirmingClose(true);
    else onClose();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      showToastMsg("Informe seu nome.");
      return;
    }
    if (!trimmedEmail) {
      showToastMsg("Informe seu e-mail.");
      return;
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        showToastMsg("A nova senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        showToastMsg("As senhas não coincidem.");
        return;
      }
    }

    const emailChanged = trimmedEmail !== originalEmail;
    const nameChanged = trimmedName !== originalName;

    setIsSaving(true);
    try {
      if (emailChanged || newPassword) {
        const { error } = await supabase.auth.updateUser({
          ...(emailChanged ? { email: trimmedEmail } : {}),
          ...(newPassword ? { password: newPassword } : {}),
        });
        if (error) throw new Error(error.message);
      }

      if (nameChanged || emailChanged) {
        const { error } = await supabase.rpc("update_own_profile", {
          new_name: trimmedName,
          new_email: trimmedEmail,
        });
        if (error) throw new Error(error.message);
      }

      await refreshProfile();
      showToastMsg(
        emailChanged
          ? "Perfil atualizado. Confirme a troca de e-mail pelo link enviado à sua caixa de entrada."
          : "Perfil atualizado com sucesso.",
      );
      onClose();
    } catch (err) {
      showToastMsg(`Falha ao atualizar perfil: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-lg shadow-md p-5 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-lg m-0">Configurações de Perfil</h3>
            <button onClick={requestClose} disabled={isSaving} className="text-neutral-400 p-1">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            <label className="block">
              <span className="block text-sm font-medium mb-1.5">Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1.5">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
              />
            </label>

            <div className="border-t border-neutral-200 dark:border-white/10 pt-3.5 mt-1">
              <label className="block mb-3.5">
                <span className="block text-sm font-medium mb-1.5">Senha Atual</span>
                <input
                  type="password"
                  value="••••••••"
                  disabled
                  className="w-full box-border border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950 text-neutral-400 rounded-md px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="block flex-1">
                  <span className="block text-sm font-medium mb-1.5">Nova Senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="block flex-1">
                  <span className="block text-sm font-medium mb-1.5">Confirmar Nova Senha</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Mínimo de 8 caracteres. Deixe os dois campos em branco para manter a senha atual.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 mt-6.5">
            <button
              onClick={requestClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
            >
              {isSaving ? "Salvando…" : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>

      {confirmingClose && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmingClose(false);
          }}
        >
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-status-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-status-warning" />
              </span>
              <h3 className="font-display font-semibold text-lg m-0">Alterações não salvas</h3>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              Você tem alterações não salvas. Deseja realmente sair sem salvar?
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                onClick={() => setConfirmingClose(false)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Continuar Editando
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-status-error text-white text-sm font-medium hover:opacity-90"
              >
                Sair sem Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
