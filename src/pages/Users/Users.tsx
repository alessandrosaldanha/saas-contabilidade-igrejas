import { useMemo, useState } from "react";
import { Search, UserPlus, KeyRound, Power, ShieldAlert, Copy, X } from "lucide-react";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Avatar from "../../components/Avatar";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getFunctionErrorMessage, supabase } from "../../services/supabase";
import { ASSIGNABLE_ROLES } from "../../types";
import type { ChurchUser, UserRole, UserStatus } from "../../types";

// "master" nunca aparece aqui de verdade (a RLS de profiles nunca deixa um
// Admin de igreja enxergar a linha do Admin Master), mas o tipo UserRole
// agora inclui essa role e o Record precisa de todas as chaves para compilar.
const ROLE_TONE: Record<UserRole, "purple" | "info" | "warning" | "neutral"> = {
  master: "neutral",
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
const ROLE_ORDER = ASSIGNABLE_ROLES;

const iconBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5";

interface RoleEditState {
  user: ChurchUser;
  selectedRole: UserRole;
  step: "select" | "confirm";
}

export default function Usuarios() {
  const { usersList, refreshUsers, showToastMsg, effectiveChurchId, viewingChurchId, masterChurches } = useApp();
  const { profile: authProfile, refreshProfile } = useAuth();
  const isMaster = authProfile?.role === "master";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // Só relevante para o Master — visão global entre igrejas (ver AppContext).
  const [churchFilter, setChurchFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCargo, setInviteCargo] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Tesoureiro");
  const [inviteChurchId, setInviteChurchId] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState("");

  const filtered = useMemo(() => {
    return usersList.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (isMaster && churchFilter !== "all" && u.churchId !== churchFilter) return false;
      if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [usersList, roleFilter, statusFilter, churchFilter, isMaster, search]);

  const kpiTotal = usersList.length;
  const kpiActive = usersList.filter((u) => u.status === "Ativo").length;
  const kpiAdmins = usersList.filter((u) => u.role === "Admin").length;

  const openInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteCargo("");
    setInviteRole("Tesoureiro");
    // Sugere a igreja em gestão (Sidebar) como ponto de partida, mas o Master
    // pode trocar no próprio modal — ele opera sobre todas as igrejas aqui.
    setInviteChurchId(viewingChurchId ?? "");
    setInvitePassword("");
    setInviteConfirmPassword("");
    setShowInviteModal(true);
  };

  const submitInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    if (!invitePassword || !inviteConfirmPassword) {
      showToastMsg("Preencha a senha e a confirmação de senha.");
      return;
    }
    if (invitePassword.length < 8) {
      showToastMsg("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (invitePassword !== inviteConfirmPassword) {
      showToastMsg("As senhas não coincidem.");
      return;
    }
    if (isMaster && !inviteChurchId) {
      showToastMsg("Selecione a igreja deste usuário.");
      return;
    }
    setIsInviting(true);
    // church_id só é de fato usado pela Edge Function quando quem chama é o
    // Master (um Admin comum sempre é cadastrado na própria igreja, ignorando
    // qualquer church_id enviado) — por isso é seguro sempre incluir aqui.
    const { error } = await supabase.functions.invoke("invite-user", {
      body: {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        password: invitePassword,
        church_id: isMaster ? inviteChurchId : effectiveChurchId,
      },
    });
    setIsInviting(false);
    if (error) {
      showToastMsg(`Falha ao cadastrar: ${await getFunctionErrorMessage(error)}`);
      return;
    }
    await refreshUsers();
    setShowInviteModal(false);
    showToastMsg(`Usuário ${inviteEmail} cadastrado com sucesso`);
  };

  const [roleEdit, setRoleEdit] = useState<RoleEditState | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const openRoleEdit = (user: ChurchUser) => setRoleEdit({ user, selectedRole: user.role, step: "select" });

  // Promover alguém a Admin, ou rebaixar um Admin (a si mesmo ou a outro),
  // exige um passo extra de confirmação com o aviso específico de cada caso;
  // qualquer outra troca de role é aplicada direto.
  const chooseRole = (role: UserRole) => {
    if (!roleEdit || isSavingRole) return;
    if (role === roleEdit.user.role) {
      setRoleEdit(null);
      return;
    }
    const needsConfirmation = role === "Admin" || roleEdit.user.role === "Admin";
    if (needsConfirmation) {
      setRoleEdit({ ...roleEdit, selectedRole: role, step: "confirm" });
    } else {
      applyRoleChange(roleEdit.user, role);
    }
  };

  const applyRoleChange = async (user: ChurchUser, role: UserRole) => {
    setIsSavingRole(true);
    const { error } = await supabase.rpc("admin_update_user_role", {
      target_id: user.id,
      new_role: role,
    });
    setIsSavingRole(false);
    if (error) {
      showToastMsg(`Falha ao alterar perfil: ${error.message}`);
      return;
    }
    setRoleEdit(null);
    await refreshUsers();
    // Se o próprio Admin logado mudou a sua role, atualiza o profile da sessão
    // atual — senão o Sidebar/ProtectedRoute continuariam achando que ele
    // ainda é Admin até o próximo login.
    if (user.id === authProfile?.id) await refreshProfile();
    showToastMsg(`Permissão de ${user.name} alterada para ${role}`);
  };

  const [resetLinkModal, setResetLinkModal] = useState<{ email: string; link: string } | null>(null);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  const resetUserPassword = async (email: string) => {
    setResettingEmail(email);
    const { data, error } = await supabase.functions.invoke("generate-reset-link", {
      body: { email, redirectTo: `${window.location.origin}/reset-password` },
    });
    setResettingEmail(null);
    if (error) {
      showToastMsg(`Falha ao gerar link: ${await getFunctionErrorMessage(error)}`);
      return;
    }
    const link = (data as { actionLink?: string })?.actionLink;
    if (!link) {
      showToastMsg("Link gerado, mas a resposta veio sem o link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      showToastMsg(`Link de redefinição copiado para a área de transferência (${email})`);
    } catch {
      // Clipboard pode falhar por permissão/navegador — mostra o link num modal
      // para o Admin copiar manualmente.
      setResetLinkModal({ email, link });
    }
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
        <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">Controle de acesso via Supabase Auth</p>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-700 dark:text-neutral-400 mb-1">Total de Usuários Cadastrados</div>
          <div className="font-display font-semibold text-xl">{kpiTotal}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-700 dark:text-neutral-400 mb-1">Ativos (últimos 30 dias)</div>
          <div className="font-display font-semibold text-xl text-status-success">{kpiActive}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-700 dark:text-neutral-400 mb-1">Perfis com Privilégio Admin</div>
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
        {isMaster && (
          <select
            value={churchFilter}
            onChange={(e) => setChurchFilter(e.target.value)}
            className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
          >
            <option value="all">Todas as Igrejas</option>
            {masterChurches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
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
              <tr className="text-left text-neutral-700 dark:text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Usuário</th>
                {isMaster && <th className="px-4.5 py-3 font-medium text-xs">Igreja</th>}
                <th className="px-4.5 py-3 font-medium text-xs">Função (Role)</th>
                <th className="px-4.5 py-3 font-medium text-xs">Status de Acesso</th>
                <th className="px-4.5 py-3 font-medium text-xs">Último acesso</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-neutral-300 dark:border-white/10">
                  <td className="px-4.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <div>{u.name}</div>
                        <div className="text-neutral-700 dark:text-neutral-400 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  {isMaster && (
                    <td className="px-4.5 py-3">
                      <Badge tone="neutral" appearance="outline">
                        {u.churchName || "—"}
                      </Badge>
                    </td>
                  )}
                  <td className="px-4.5 py-3">
                    <button
                      onClick={() => openRoleEdit(u)}
                      title="Alterar Permissão / Role"
                      className="inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orla-blue"
                    >
                      <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </button>
                  </td>
                  <td className="px-4.5 py-3">
                    <Badge tone={STATUS_TONE[u.status]} appearance="outline" dot>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400 text-xs">{u.lastAccess}</td>
                  <td className="px-4.5 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => resetUserPassword(u.email)}
                        disabled={resettingEmail === u.email}
                        title="Resetar Senha / Gerar Link"
                        className={`${iconBtnCls} disabled:opacity-50`}
                      >
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
          <div className="p-8 text-center text-neutral-700 dark:text-neutral-400 text-sm">Nenhum usuário encontrado para este filtro.</div>
        )}
      </Card>

      {showInviteModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Convidar Novo Usuário</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-neutral-700 dark:text-neutral-400 p-1">
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

              {isMaster && (
                <label className="block">
                  <span className="block text-sm font-medium mb-1.5">Igreja</span>
                  <select
                    value={inviteChurchId}
                    onChange={(e) => setInviteChurchId(e.target.value)}
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  >
                    <option value="">Selecione a igreja…</option>
                    {masterChurches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="block flex-1">
                  <span className="block text-sm font-medium mb-1.5">Senha</span>
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="block flex-1">
                  <span className="block text-sm font-medium mb-1.5">Confirmar Senha</span>
                  <input
                    type="password"
                    value={inviteConfirmPassword}
                    onChange={(e) => setInviteConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-400 -mt-2">
                O usuário já é criado com esta senha e pode entrar direto — use "Resetar Senha / Enviar Link" na
                tabela se ele precisar trocá-la depois.
              </p>
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
                {isInviting ? "Cadastrando…" : "Cadastrar Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetLinkModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[480px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg m-0">Link de Redefinição de Senha</h3>
              <button onClick={() => setResetLinkModal(null)} className="text-neutral-700 dark:text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-4">
              Não foi possível copiar automaticamente. Copie o link abaixo e envie manualmente para{" "}
              <strong>{resetLinkModal.email}</strong> — o link é de uso único e expira em algumas horas.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={resetLinkModal.link}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 border border-neutral-300 dark:border-white/20 bg-neutral-50 dark:bg-neutral-950 rounded-md px-3.5 py-2.5 text-xs outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetLinkModal.link);
                    showToastMsg("Link copiado para a área de transferência");
                  } catch {
                    showToastMsg("Não foi possível copiar — selecione o texto e copie manualmente.");
                  }
                }}
                title="Copiar link"
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md bg-orla-blue text-white hover:bg-blue-600"
              >
                <Copy size={15} />
              </button>
            </div>
            <div className="flex justify-end mt-6.5">
              <button
                onClick={() => setResetLinkModal(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {roleEdit && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[420px] rounded-lg shadow-md p-5 sm:p-8">
            {roleEdit.step === "select" ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-semibold text-lg m-0">Alterar Permissão</h3>
                  <button onClick={() => setRoleEdit(null)} className="text-neutral-700 dark:text-neutral-400 p-1">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-4">
                  Selecione a nova função de acesso para <strong>{roleEdit.user.name}</strong>.
                </p>
                <div className="flex flex-col gap-2">
                  {ROLE_ORDER.map((role) => (
                    <button
                      key={role}
                      onClick={() => chooseRole(role)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-md border text-sm font-medium ${
                        role === roleEdit.user.role
                          ? "border-orla-blue bg-orla-blue/10"
                          : "border-neutral-300 dark:border-white/20 hover:bg-neutral-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Badge tone={ROLE_TONE[role]}>{role}</Badge>
                      {role === roleEdit.user.role && <span className="text-xs text-neutral-700 dark:text-neutral-400">Atual</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-status-warning/15 flex items-center justify-center shrink-0">
                    <ShieldAlert size={20} className="text-status-warning" />
                  </span>
                  <h3 className="font-display font-semibold text-lg m-0">
                    {roleEdit.selectedRole === "Admin" ? "Promover a Administrador" : "Remover acesso de Administrador"}
                  </h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6">
                  {roleEdit.selectedRole === "Admin"
                    ? "Atenção: Ao tornar este usuário Administrador, ele terá acesso total ao sistema, incluindo exclusão e convite de novos membros."
                    : "Atenção: Ao remover o acesso de Administrador, este usuário perderá todos os privilégios administrativos e o acesso à aba de Governança e Usuários."}
                </p>
                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => setRoleEdit({ ...roleEdit, step: "select" })}
                    disabled={isSavingRole}
                    className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium disabled:opacity-70"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => applyRoleChange(roleEdit.user, roleEdit.selectedRole)}
                    disabled={isSavingRole}
                    className="px-4 py-2 rounded-md bg-status-warning text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
                  >
                    {isSavingRole ? "Salvando…" : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
