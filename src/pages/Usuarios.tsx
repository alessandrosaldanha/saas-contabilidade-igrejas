import { useMemo, useState } from "react";
import { Search, UserPlus, Shuffle, KeyRound, Power, X } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";
import type { ChurchUser, UserRole, UserStatus } from "../types";

const ROLE_TONE: Record<UserRole, "purple" | "info" | "warning" | "neutral"> = {
  Admin: "purple",
  Tesoureiro: "info",
  Auditor: "warning",
  "Conselho Fiscal": "neutral",
};
const STATUS_TONE: Record<UserStatus, "success" | "neutral" | "warning"> = {
  Ativo: "success",
  Inativo: "neutral",
  "Convite Pendente": "warning",
};
const ROLE_ORDER: UserRole[] = ["Admin", "Tesoureiro", "Auditor", "Conselho Fiscal"];

const iconBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5";

export default function Usuarios() {
  const { usersList, refreshUsers, showToastMsg } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCargo, setInviteCargo] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Tesoureiro");
  const [inviteSendEmail, setInviteSendEmail] = useState(true);

  const filtered = useMemo(() => {
    return usersList.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [usersList, roleFilter, statusFilter, search]);

  const kpiTotal = usersList.length;
  const kpiActive = usersList.filter((u) => u.status === "Ativo").length;
  const kpiAdmins = usersList.filter((u) => u.role === "Admin").length;

  const openInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteCargo("");
    setInviteRole("Tesoureiro");
    setInviteSendEmail(true);
    setShowInviteModal(true);
  };

  const submitInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setIsInviting(true);
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { name: inviteName, email: inviteEmail, role: inviteRole },
    });
    setIsInviting(false);
    if (error) {
      showToastMsg(`Falha ao convidar: ${error.message}`);
      return;
    }
    await refreshUsers();
    setShowInviteModal(false);
    showToastMsg(`Convite enviado para ${inviteEmail}`);
  };

  const cycleUserRole = async (user: ChurchUser) => {
    const nextRole = ROLE_ORDER[(ROLE_ORDER.indexOf(user.role) + 1) % ROLE_ORDER.length];
    const { error } = await supabase.rpc("admin_update_user_role", {
      target_id: user.id,
      new_role: nextRole,
    });
    if (error) {
      showToastMsg(`Falha ao alterar perfil: ${error.message}`);
      return;
    }
    await refreshUsers();
  };

  const resetUserPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    showToastMsg(error ? `Falha ao enviar link: ${error.message}` : `Link de redefinição de senha enviado para ${email}`);
  };

  const toggleUserAccess = async (user: ChurchUser) => {
    const nextStatus: UserStatus = user.status === "Inativo" ? "Ativo" : "Inativo";
    const { error } = await supabase.rpc("admin_set_user_status", {
      target_id: user.id,
      new_status: nextStatus,
    });
    if (error) {
      showToastMsg(`Falha ao alterar acesso: ${error.message}`);
      return;
    }
    await refreshUsers();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Governança e Usuários</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">Controle de acesso via Supabase Auth</p>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Total de Usuários Cadastrados</div>
          <div className="font-display font-semibold text-xl">{kpiTotal}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Ativos (últimos 30 dias)</div>
          <div className="font-display font-semibold text-xl text-status-success">{kpiActive}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Perfis com Privilégio Admin</div>
          <div className="font-display font-semibold text-xl text-[#7c3aed]">{kpiAdmins}</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-4.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="w-full box-border bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded-md pl-9 pr-3.5 py-2.5 text-sm outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        >
          <option value="all">Todas as Funções</option>
          <option value="Admin">Administrador</option>
          <option value="Tesoureiro">Tesoureiro</option>
          <option value="Auditor">Auditor</option>
          <option value="Conselho Fiscal">Conselho Fiscal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        >
          <option value="all">Todos os Status</option>
          <option value="Ativo">Ativos</option>
          <option value="Inativo">Inativos</option>
          <option value="Convite Pendente">Convite Pendente</option>
        </select>
        <button
          onClick={openInviteModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
        >
          <UserPlus size={15} />
          Convidar Novo Usuário
        </button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Usuário</th>
                <th className="px-4.5 py-3 font-medium text-xs">Função (Role)</th>
                <th className="px-4.5 py-3 font-medium text-xs">Status de Acesso</th>
                <th className="px-4.5 py-3 font-medium text-xs">Último acesso</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-neutral-200 dark:border-white/10">
                  <td className="px-4.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <div>{u.name}</div>
                        <div className="text-neutral-400 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4.5 py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="px-4.5 py-3">
                    <Badge tone={STATUS_TONE[u.status]} appearance="outline" dot>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-400 text-xs">{u.lastAccess}</td>
                  <td className="px-4.5 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => cycleUserRole(u)} title="Alterar Permissões / Role" className={iconBtnCls}>
                        <Shuffle size={14} />
                      </button>
                      <button onClick={() => resetUserPassword(u.email)} title="Enviar Reset de Senha" className={iconBtnCls}>
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => toggleUserAccess(u)}
                        title={u.status === "Inativo" ? "Reativar Acesso" : "Bloquear Acesso"}
                        className={iconBtnCls}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-neutral-400 text-sm">Nenhum usuário encontrado para este filtro.</div>
        )}
      </Card>

      {showInviteModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Convidar Novo Usuário</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Nome Completo</span>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1.5">E-mail</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@igreja.org"
                  className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Cargo/Função na Igreja</span>
                <input
                  value={inviteCargo}
                  onChange={(e) => setInviteCargo(e.target.value)}
                  placeholder="ex: Secretário Financeiro"
                  className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Perfil de Acesso</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                >
                  <option value="Admin">Administrador</option>
                  <option value="Tesoureiro">Tesoureiro</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inviteSendEmail}
                  onChange={(e) => setInviteSendEmail(e.target.checked)}
                  className="w-[15px] h-[15px] accent-orla-blue cursor-pointer"
                />
                Enviar e-mail de ativação de conta via Supabase Auth
              </label>
            </div>

            <div className="flex justify-end gap-2.5 mt-6.5">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={submitInvite}
                disabled={isInviting}
                className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
              >
                {isInviting ? "Enviando…" : "Enviar Convite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
