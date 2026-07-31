import { useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import Badge from "../../../components/Badge";
import { supabase } from "../../../services/supabase";
import { useApp } from "../../../context/AppContext";
import { ASSIGNABLE_ROLES } from "../../../types";
import type { ChurchUser, UserRole, UserStatus } from "../../../types";

const ROLE_TONE: Record<UserRole, "purple" | "info" | "warning" | "neutral"> = {
  master: "neutral",
  Admin: "purple",
  Tesoureiro: "info",
  Auditor: "warning",
  "Conselho Fiscal": "neutral",
};

const inputCls =
  "w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none";
const labelCls = "block text-sm font-medium mb-1.5";

interface MemberEditModalProps {
  member: ChurchUser;
  onClose: () => void;
  onSaved: () => void;
}

export default function MemberEditModal({ member, onClose, onSaved }: MemberEditModalProps) {
  const { showToastMsg } = useApp();
  const [step, setStep] = useState<"edit" | "roleConfirm">("edit");
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email);
  const [cpf, setCpf] = useState(member.cpf ?? "");
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const chooseRole = (role: UserRole) => {
    if (role === member.role) return;
    const needsConfirmation = role === "Admin" || member.role === "Admin";
    if (needsConfirmation) {
      setPendingRole(role);
      setStep("roleConfirm");
    } else {
      applyRoleChange(role);
    }
  };

  const applyRoleChange = async (role: UserRole) => {
    setIsSaving(true);
    const { error } = await supabase.rpc("admin_update_user_role", { target_id: member.id, new_role: role });
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao alterar perfil: ${error.message}`);
      return;
    }
    setPendingRole(null);
    setStep("edit");
    onSaved();
  };

  const toggleStatus = async () => {
    const nextStatus: UserStatus = member.status === "Inativo" ? "Ativo" : "Inativo";
    const { error } = await supabase.rpc("admin_set_user_status", { target_id: member.id, new_status: nextStatus });
    if (error) {
      showToastMsg(`Falha ao alterar acesso: ${error.message}`);
      return;
    }
    onSaved();
  };

  const saveDetails = async () => {
    if (!name.trim() || !email.trim()) {
      showToastMsg("Nome e e-mail não podem ficar em branco.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.rpc("master_update_profile", {
      target_id: member.id,
      new_name: name,
      new_email: email,
      new_cpf: cpf || null,
    });
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao salvar: ${error.message}`);
      return;
    }
    showToastMsg("Membro atualizado com sucesso");
    onSaved();
    onClose();
  };

  if (step === "roleConfirm" && pendingRole) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[420px] rounded-lg shadow-md p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-status-warning/15 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-status-warning" />
            </span>
            <h3 className="font-display font-semibold text-lg m-0">
              {pendingRole === "Admin" ? "Promover a Administrador" : "Remover acesso de Administrador"}
            </h3>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6">
            {pendingRole === "Admin"
              ? "Atenção: Ao tornar este usuário Administrador, ele terá acesso total ao sistema, incluindo exclusão e convite de novos membros nesta igreja."
              : "Atenção: Ao remover o acesso de Administrador, este usuário perderá todos os privilégios administrativos nesta igreja."}
          </p>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setStep("edit")}
              disabled={isSaving}
              className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium disabled:opacity-70"
            >
              Voltar
            </button>
            <button
              onClick={() => applyRoleChange(pendingRole)}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-status-warning text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
            >
              {isSaving ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[480px] rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg m-0">Editar Membro</h3>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className={labelCls}>Nome Completo</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>CPF</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Opcional"
              className={inputCls}
            />
          </label>

          <div>
            <span className={labelCls}>Perfil de Acesso</span>
            <div className="flex flex-wrap gap-1.5">
              {ASSIGNABLE_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => chooseRole(role)}
                  className="inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orla-blue"
                  title={role === member.role ? "Perfil atual" : `Alterar para ${role}`}
                >
                  <Badge tone={ROLE_TONE[role]} appearance={role === member.role ? "solid" : "outline"}>
                    {role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Status de Acesso</span>
            <button
              onClick={toggleStatus}
              className="px-3.5 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              {member.status === "Inativo" ? "Reativar Acesso" : "Bloquear Acesso"}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-6.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
          >
            Fechar
          </button>
          <button
            onClick={saveDetails}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Salvando…" : "Salvar Dados"}
          </button>
        </div>
      </div>
    </div>
  );
}
