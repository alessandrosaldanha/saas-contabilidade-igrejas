import { useEffect, useMemo, useState } from "react";
import { X, Power, UserPlus, Pencil } from "lucide-react";
import Card from "./Card";
import Badge from "./Badge";
import Avatar from "./Avatar";
import Pagination from "./Pagination";
import MemberEditModal from "./MemberEditModal";
import ChurchFormFields, { ChurchFormState } from "./ChurchFormFields";
import { supabase, getFunctionErrorMessage } from "../services/supabase";
import { useApp } from "../context/AppContext";
import { ASSIGNABLE_ROLES } from "../types";
import type { Church, ChurchUser, UserRole } from "../types";

const MEMBERS_PAGE_SIZE = 5;

const inputCls =
  "w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none";
const labelCls = "block text-sm font-medium mb-1.5";

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

interface ChurchDetailsModalProps {
  church: Church;
  allChurches: Church[];
  onClose: () => void;
  onChanged: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChurchDetailsModal({ church, allChurches, onClose, onChanged }: ChurchDetailsModalProps) {
  const { showToastMsg } = useApp();
  const [values, setValues] = useState<ChurchFormState>(toFormState(church));
  const [isSaving, setIsSaving] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);

  const [members, setMembers] = useState<ChurchUser[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [editingMember, setEditingMember] = useState<ChurchUser | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  const parentOptions = useMemo(
    () => allChurches.filter((c) => c.id !== church.id).map((c) => ({ id: c.id, name: c.name })),
    [allChurches, church.id],
  );

  const refreshMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, last_access, cpf")
      .eq("church_id", church.id)
      .order("name");
    if (!error && data) setMembers(data.map(mapMemberRow));
  };

  useEffect(() => {
    refreshMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church.id]);

  const patch = (p: Partial<ChurchFormState>) => setValues((v) => ({ ...v, ...p }));

  const saveChurch = async () => {
    if (!values.name.trim()) return showToastMsg("Informe o nome da igreja.");
    if (!values.street.trim() || !values.number.trim() || !values.neighborhood.trim() || !values.city.trim() || values.uf.trim().length !== 2) {
      return showToastMsg("Preencha o endereço completo (rua, número, bairro, cidade e UF).");
    }
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) return showToastMsg("E-mail inválido.");

    setIsSaving(true);
    const { error } = await supabase
      .from("churches")
      .update({
        name: values.name.trim(),
        email: values.email.trim() || null,
        cnpj: values.cnpj.trim() || null,
        phone: values.phone.trim() || null,
        cep: values.cep.trim(),
        street: values.street.trim(),
        number: values.number.trim(),
        neighborhood: values.neighborhood.trim(),
        city: values.city.trim(),
        uf: values.uf.trim().toUpperCase(),
        parent_church_id: values.parentChurchId || null,
      })
      .eq("id", church.id);
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao salvar igreja: ${error.message}`);
      return;
    }
    showToastMsg("Igreja atualizada com sucesso");
    onChanged();
  };

  const confirmToggleStatus = async () => {
    const { error } = await supabase.from("churches").update({ is_active: !church.isActive }).eq("id", church.id);
    setStatusConfirm(false);
    if (error) {
      showToastMsg(`Falha ao alterar status: ${error.message}`);
      return;
    }
    showToastMsg(church.isActive ? "Igreja desativada" : "Igreja ativada");
    onChanged();
  };

  const pagedMembers = members.slice((membersPage - 1) * MEMBERS_PAGE_SIZE, membersPage * MEMBERS_PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[820px] max-h-[92vh] overflow-y-auto rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg m-0">{church.name}</h3>
            <div className="mt-1.5">
              <Badge tone={church.isActive ? "success" : "neutral"} appearance="outline" dot>
                {church.isActive ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>

        <ChurchFormFields values={values} onChange={patch} parentOptions={parentOptions} />

        <div className="flex flex-wrap justify-between items-center gap-2.5 mt-6.5">
          <button
            onClick={() => setStatusConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            <Power size={14} />
            {church.isActive ? "Desativar Igreja" : "Ativar Igreja"}
          </button>
          <button
            onClick={saveChurch}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Salvando…" : "Salvar Alterações"}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display font-semibold text-base m-0">Membros/Admins da Igreja</h4>
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-orla-blue text-white text-xs font-medium hover:bg-blue-600"
            >
              <UserPlus size={13} />
              Adicionar Membro
            </button>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-neutral-700 dark:text-neutral-400">
                    <th className="px-4 py-2.5 font-medium text-xs">Nome</th>
                    <th className="px-4 py-2.5 font-medium text-xs">E-mail</th>
                    <th className="px-4 py-2.5 font-medium text-xs">CPF</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-right">Ações</th>
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
                      <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-400">{m.cpf || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setEditingMember(m)}
                          title="Editar Membro"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
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
      </div>

      {statusConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[420px] rounded-lg shadow-md p-5 sm:p-8">
            <h3 className="font-display font-semibold text-lg m-0 mb-3">
              {church.isActive ? "Desativar Igreja" : "Ativar Igreja"}
            </h3>
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

      {showAddMember && (
        <AddMemberModal churchId={church.id} onClose={() => setShowAddMember(false)} onAdded={refreshMembers} />
      )}

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => {
            refreshMembers();
            setEditingMember(null);
          }}
        />
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
            <span className={labelCls}>Nome Completo</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Perfil de Acesso</span>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputCls}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="block flex-1">
              <span className={labelCls}>Senha</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </label>
            <label className="block flex-1">
              <span className={labelCls}>Confirmar Senha</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
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
