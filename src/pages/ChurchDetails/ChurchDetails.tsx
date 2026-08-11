import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Plus, Power, ShieldAlert, UserPlus, X } from "lucide-react";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Avatar from "../../components/Avatar";
import Pagination from "../../components/Pagination";
import ChurchFormFields, { ChurchFormState, EMPTY_CHURCH_FORM } from "../../components/ChurchFormFields";
import PricingModal from "../../components/PricingModal";
import AddChildChurchModal from "./components/AddChildChurchModal";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { supabase, getFunctionErrorMessage } from "../../services/supabase";
import { ASSIGNABLE_ROLES } from "../../types";
import type { Church, ChurchUser, UserRole, UserStatus } from "../../types";

const MEMBERS_PAGE_SIZE = 5;
const CHILDREN_PAGE_SIZE = 5;

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
  Excluído: "neutral",
};

function mapChurchRow(row: {
  id: string;
  name: string;
  email: string | null;
  cnpj: string | null;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  parent_church_id: string | null;
  is_active: boolean;
  created_at: string;
  plan_id: string;
  subscription_status: Church["subscriptionStatus"];
  responsible_name: string | null;
}): Church {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    cnpj: row.cnpj,
    phone: row.phone,
    cep: row.cep,
    street: row.street,
    number: row.number,
    neighborhood: row.neighborhood,
    city: row.city,
    uf: row.uf,
    parentChurchId: row.parent_church_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    planId: row.plan_id,
    subscriptionStatus: row.subscription_status,
    responsibleName: row.responsible_name,
  };
}

function mapMemberRow(row: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: ChurchUser["status"];
  last_access: string | null;
  cpf: string | null;
}): ChurchUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastAccess: row.last_access ? new Date(row.last_access).toLocaleString("pt-BR") : "—",
    cpf: row.cpf,
  };
}

function toFormState(church: Church): ChurchFormState {
  return {
    name: church.name,
    email: church.email ?? "",
    cnpj: church.cnpj ?? "",
    phone: church.phone ?? "",
    cep: church.cep,
    street: church.street,
    number: church.number,
    neighborhood: church.neighborhood,
    city: church.city,
    uf: church.uf,
    parentChurchId: church.parentChurchId ?? "",
    responsibleName: church.responsibleName ?? "",
  };
}

// Página dedicada de Detalhes da Igreja — substitui o antigo ChurchDetailsModal.
// Duas entradas: o Master navega aqui a partir de Governança (com :churchId na
// URL); o Admin/Tesoureiro de uma igreja acessa a própria igreja pelo item
// "Detalhes da Igreja" da Sidebar (sem :churchId — resolve via effectiveChurchId).
export default function ChurchDetails() {
  const { churchId: paramId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { effectiveChurchId, showToastMsg, refreshUsers } = useApp();

  const isMaster = profile?.role === "master";
  const isAdmin = profile?.role === "Admin";
  const targetChurchId = paramId ?? effectiveChurchId;

  // Só igrejas matrizes (sem parent_church_id) podem ser escolhidas como
  // "Igreja Mãe" — oferecer uma igreja que já é filha aqui resultaria sempre
  // num erro do trigger de banco que impede netas (migration 0020).
  const [rootChurches, setRootChurches] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!isMaster) return;
    supabase
      .from("churches")
      .select("id, name")
      .is("parent_church_id", null)
      .order("name")
      .then(({ data }) => setRootChurches(data ?? []));
  }, [isMaster]);

  const [church, setChurch] = useState<Church | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<ChurchFormState>(EMPTY_CHURCH_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);

  const [members, setMembers] = useState<ChurchUser[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [children, setChildren] = useState<Church[]>([]);
  const [childrenPage, setChildrenPage] = useState(1);

  const [showAddChild, setShowAddChild] = useState(false);
  const [showChildLimitModal, setShowChildLimitModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [roleEdit, setRoleEdit] = useState<{ user: ChurchUser; role: UserRole; step: "select" | "confirm" } | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const refreshChurch = async () => {
    if (!targetChurchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("churches").select("*").eq("id", targetChurchId).single();
    setLoading(false);
    if (error || !data) {
      setNotFound(true);
      return;
    }
    const mapped = mapChurchRow(data);
    setChurch(mapped);
    setValues(toFormState(mapped));
  };

  const refreshMembers = async () => {
    if (!targetChurchId) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, last_access, cpf")
      .eq("church_id", targetChurchId)
      .order("name");
    if (data) setMembers(data.map(mapMemberRow));
  };

  const refreshChildren = async () => {
    if (!targetChurchId) return;
    const { data } = await supabase
      .from("churches")
      .select("*")
      .eq("parent_church_id", targetChurchId)
      .order("created_at", { ascending: false });
    if (data) setChildren(data.map(mapChurchRow));
  };

  useEffect(() => {
    setNotFound(false);
    setMembersPage(1);
    setChildrenPage(1);
    refreshChurch();
    refreshMembers();
    refreshChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetChurchId]);

  const canEdit =
    isMaster ||
    (isAdmin &&
      !!church &&
      (church.id === profile?.churchId || church.parentChurchId === profile?.churchId));
  // Hierarquia de só 2 níveis (igreja matriz → filhas), sem netos: uma igreja
  // que já é filha (parent_church_id preenchido) nunca pode ter as próprias
  // filhas — nem visualizar a seção, nem cadastrar. Vale para todo mundo,
  // inclusive master (reforçado também no servidor, ver create_child_church).
  const isRootChurch = !church?.parentChurchId;
  const canAddChild = canEdit && !!church && isRootChurch && (isMaster || church.id === profile?.churchId);
  // Limite de subcongregações do plano — reforçado também no servidor
  // (create_child_church), master sempre isento (mesma regra da RPC).
  const { canAddSubchurch } = usePlanLimits(isRootChurch ? (church?.id ?? null) : null);
  const childLimitReached = canAddChild && !isMaster && !canAddSubchurch();

  const onAddChildClick = () => {
    if (childLimitReached) {
      setShowChildLimitModal(true);
      return;
    }
    setShowAddChild(true);
  };

  const parentOptions = useMemo(
    () => rootChurches.filter((c) => c.id !== church?.id),
    [rootChurches, church?.id],
  );

  const patch = (p: Partial<ChurchFormState>) => setValues((v) => ({ ...v, ...p }));

  const saveChurch = async () => {
    if (!church || !canEdit) return;
    if (!values.name.trim()) {
      showToastMsg("Informe o nome da igreja.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.rpc("update_church_profile", {
      p_church_id: church.id,
      p_name: values.name.trim(),
      p_email: values.email.trim() || null,
      p_cnpj: values.cnpj.trim() || null,
      p_phone: values.phone.trim() || null,
      p_cep: values.cep.trim(),
      p_street: values.street.trim(),
      p_number: values.number.trim(),
      p_neighborhood: values.neighborhood.trim(),
      p_city: values.city.trim(),
      p_uf: values.uf.trim().toUpperCase(),
      p_responsible_name: values.responsibleName.trim() || null,
    });
    if (error) {
      setIsSaving(false);
      showToastMsg(`Falha ao salvar igreja: ${error.message}`);
      return;
    }

    // Reatribuir a igreja mãe é uma operação de governança global — só o
    // master tem UPDATE liberado em churches para esta coluna (RLS).
    if (isMaster && (values.parentChurchId || null) !== church.parentChurchId) {
      const { error: parentError } = await supabase
        .from("churches")
        .update({ parent_church_id: values.parentChurchId || null })
        .eq("id", church.id);
      if (parentError) {
        setIsSaving(false);
        showToastMsg(`Falha ao atualizar igreja mãe: ${parentError.message}`);
        return;
      }
    }

    setIsSaving(false);
    showToastMsg("Igreja atualizada com sucesso");
    await refreshChurch();
  };

  const confirmToggleStatus = async () => {
    if (!church) return;
    const { error } = await supabase.from("churches").update({ is_active: !church.isActive }).eq("id", church.id);
    setStatusConfirm(false);
    if (error) {
      showToastMsg(`Falha ao alterar status: ${error.message}`);
      return;
    }
    showToastMsg(church.isActive ? "Igreja desativada" : "Igreja ativada");
    await refreshChurch();
  };

  const openRoleEdit = (user: ChurchUser) => setRoleEdit({ user, role: user.role, step: "select" });

  const chooseRole = (role: UserRole) => {
    if (!roleEdit) return;
    if (role === roleEdit.user.role) {
      setRoleEdit(null);
      return;
    }
    const needsConfirmation = role === "Admin" || roleEdit.user.role === "Admin";
    setRoleEdit(needsConfirmation ? { ...roleEdit, role, step: "confirm" } : roleEdit);
    if (!needsConfirmation) applyRoleChange(roleEdit.user, role);
  };

  const applyRoleChange = async (user: ChurchUser, role: UserRole) => {
    setIsSavingRole(true);
    const { error } = await supabase.rpc("admin_update_user_role", { target_id: user.id, new_role: role });
    setIsSavingRole(false);
    if (error) {
      showToastMsg(`Falha ao alterar perfil: ${error.message}`);
      return;
    }
    setRoleEdit(null);
    await refreshMembers();
    if (user.id === profile?.id) return;
    showToastMsg(`Permissão de ${user.name} alterada para ${role}`);
  };

  const toggleMemberAccess = async (user: ChurchUser) => {
    const nextStatus: UserStatus = user.status === "Inativo" ? "Ativo" : "Inativo";
    const { error } = await supabase.rpc("admin_set_user_status", { target_id: user.id, new_status: nextStatus });
    if (error) {
      showToastMsg(`Falha ao alterar acesso: ${error.message}`);
      return;
    }
    await refreshMembers();
  };

  const pagedMembers = members.slice((membersPage - 1) * MEMBERS_PAGE_SIZE, membersPage * MEMBERS_PAGE_SIZE);
  const pagedChildren = children.slice((childrenPage - 1) * CHILDREN_PAGE_SIZE, childrenPage * CHILDREN_PAGE_SIZE);

  if (loading) {
    return <div className="text-sm text-neutral-700 dark:text-neutral-400">Carregando…</div>;
  }

  if (notFound || !church) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white mb-4"
        >
          <ArrowLeft size={15} />
          Voltar
        </button>
        <div className="text-sm text-neutral-700 dark:text-neutral-400">
          {targetChurchId
            ? "Igreja não encontrada, ou você não tem permissão para visualizá-la."
            : "Selecione uma igreja no seletor \"Igreja em Gestão\" da Sidebar para ver os detalhes."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white mb-4"
      >
        <ArrowLeft size={15} />
        Voltar
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">{church.name}</h1>
          <div className="mt-1.5">
            <Badge tone={church.isActive ? "success" : "neutral"} appearance="outline" dot>
              {church.isActive ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </div>
        {isMaster && (
          <button
            onClick={() => setStatusConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            <Power size={14} />
            {church.isActive ? "Desativar Igreja" : "Ativar Igreja"}
          </button>
        )}
      </div>

      <Card>
        <ChurchFormFields
          values={values}
          onChange={patch}
          parentOptions={parentOptions}
          showParentChurchSelector={isMaster}
          showResponsibleName={!!church.parentChurchId}
        />
        {canEdit && (
          <div className="flex justify-end mt-6.5">
            <button
              onClick={saveChurch}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
            >
              {isSaving ? "Salvando…" : "Salvar Alterações"}
            </button>
          </div>
        )}
      </Card>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-base m-0">Membros/Admins da Igreja</h4>
          {canEdit && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-orla-blue text-white text-xs font-medium hover:bg-blue-600"
            >
              <UserPlus size={13} />
              Adicionar Membro
            </button>
          )}
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-neutral-700 dark:text-neutral-400">
                  <th className="px-4 py-2.5 font-medium text-xs">Nome</th>
                  <th className="px-4 py-2.5 font-medium text-xs">E-mail</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Função</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Status</th>
                  {canEdit && <th className="px-4 py-2.5 font-medium text-xs text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {pagedMembers.map((m) => (
                  <tr key={m.id} className="border-t border-neutral-300 dark:border-white/10">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} size="sm" />
                        {m.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-400">{m.email}</td>
                    <td className="px-4 py-2.5">
                      {canEdit ? (
                        <button
                          onClick={() => openRoleEdit(m)}
                          title="Alterar Permissão / Role"
                          className="inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orla-blue"
                        >
                          <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>
                        </button>
                      ) : (
                        <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[m.status]} appearance="outline" dot>
                        {m.status}
                      </Badge>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => toggleMemberAccess(m)}
                          title={m.status === "Inativo" ? "Reativar Acesso" : "Bloquear Acesso"}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                        >
                          <Power size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length === 0 && (
            <div className="p-6 text-center text-neutral-700 dark:text-neutral-400 text-sm">Nenhum membro cadastrado nesta igreja.</div>
          )}
          {members.length > 0 && (
            <Pagination page={membersPage} totalItems={members.length} pageSize={MEMBERS_PAGE_SIZE} onPageChange={setMembersPage} />
          )}
        </Card>
      </div>

      {isRootChurch && (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-base m-0">Igrejas Filhas / Subcongregações</h4>
          {canAddChild && (
            <button
              onClick={onAddChildClick}
              title={childLimitReached ? "Limite de subcongregações do plano atual atingido — faça upgrade para adicionar mais" : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium ${
                childLimitReached
                  ? "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-400 cursor-not-allowed"
                  : "bg-orla-blue text-white hover:bg-blue-600"
              }`}
            >
              <Plus size={13} />
              Adicionar Igreja Filha / Subcongregação
            </button>
          )}
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-neutral-700 dark:text-neutral-400">
                  <th className="px-4 py-2.5 font-medium text-xs">Nome</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Responsável</th>
                  <th className="px-4 py-2.5 font-medium text-xs">Status</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagedChildren.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-300 dark:border-white/10">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-md bg-orla-blue/15 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-orla-blue" />
                        </span>
                        {c.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-400">{c.responsibleName || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={c.isActive ? "success" : "neutral"} appearance="outline" dot>
                        {c.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => navigate(`/detalhes-igreja/${c.id}`)}
                        className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {children.length === 0 && (
            <div className="p-6 text-center text-neutral-700 dark:text-neutral-400 text-sm">Nenhuma igreja filha cadastrada.</div>
          )}
          {children.length > 0 && (
            <Pagination page={childrenPage} totalItems={children.length} pageSize={CHILDREN_PAGE_SIZE} onPageChange={setChildrenPage} />
          )}
        </Card>
      </div>
      )}

      {statusConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[420px] rounded-lg shadow-md p-5 sm:p-8">
            <h3 className="font-display font-semibold text-lg m-0 mb-3">{church.isActive ? "Desativar Igreja" : "Ativar Igreja"}</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6">
              {church.isActive
                ? "Ao desativar esta igreja, todos os membros vinculados a ela perderão acesso imediatamente à plataforma (login bloqueado e sessões ativas encerradas)."
                : "Ao ativar esta igreja, os membros vinculados a ela voltam a conseguir acessar a plataforma normalmente."}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setStatusConfirm(false)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmToggleStatus}
                className="px-4 py-2 rounded-md bg-status-warning text-white text-sm font-medium hover:opacity-90"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddChild && church && (
        <AddChildChurchModal
          parentChurchId={church.id}
          onClose={() => setShowAddChild(false)}
          onCreated={refreshChildren}
        />
      )}

      {showChildLimitModal && church && (
        <PricingModal
          churchId={church.id}
          title="Limite de subcongregações atingido"
          description="Sua igreja atingiu o limite de igrejas filhas do plano atual. Faça upgrade para cadastrar mais subcongregações."
          onClose={() => setShowChildLimitModal(false)}
        />
      )}

      {showAddMember && church && (
        <AddMemberModal
          churchId={church.id}
          onClose={() => setShowAddMember(false)}
          onAdded={async () => {
            await refreshMembers();
            await refreshUsers();
          }}
        />
      )}

      {roleEdit && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
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
                  {ASSIGNABLE_ROLES.map((role) => (
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
                    {roleEdit.role === "Admin" ? "Promover a Administrador" : "Remover acesso de Administrador"}
                  </h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6">
                  {roleEdit.role === "Admin"
                    ? "Atenção: Ao tornar este usuário Administrador, ele terá acesso total à gestão desta igreja."
                    : "Atenção: Ao remover o acesso de Administrador, este usuário perderá todos os privilégios administrativos nesta igreja."}
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
                    onClick={() => applyRoleChange(roleEdit.user, roleEdit.role)}
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

interface AddMemberModalProps {
  churchId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddMemberModal({ churchId, onClose, onAdded }: AddMemberModalProps) {
  const { showToastMsg } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Tesoureiro");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim()) return showToastMsg("Preencha nome e e-mail.");
    if (!password || password.length < 8) return showToastMsg("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmPassword) return showToastMsg("As senhas não coincidem.");

    setIsSaving(true);
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { name, email, role, password, church_id: churchId },
    });
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao cadastrar: ${await getFunctionErrorMessage(error)}`);
      return;
    }
    showToastMsg(`Membro ${email} cadastrado com sucesso`);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-lg m-0">Adicionar Membro</h3>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3.5">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Nome Completo</span>
            <input
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
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Perfil de Acesso</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="w-full box-border flex flex-col sm:flex-row gap-3">
            <label className="block w-full sm:w-0 sm:flex-1 box-border">
              <span className="block text-sm font-medium mb-1.5">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="block w-full sm:w-0 sm:flex-1 box-border">
              <span className="block text-sm font-medium mb-1.5">Confirmar Senha</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-6.5">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Cadastrando…" : "Cadastrar Membro"}
          </button>
        </div>
      </div>
    </div>
  );
}
