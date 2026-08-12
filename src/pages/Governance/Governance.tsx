import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Building2, Receipt, CreditCard, Image } from "lucide-react";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import ChurchCreateModal from "./components/ChurchCreateModal";
import PaymentRequestsPanel from "./components/PaymentRequestsPanel";
import PlanManagementPanel from "./components/PlanManagementPanel";
import LandingImagesPanel from "./components/LandingImagesPanel";
import HeroImagesPanel from "./components/HeroImagesPanel";
import SocialLinksPanel from "./components/SocialLinksPanel";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../services/supabase";
import { mapPlanRow } from "../../utils/plans";
import type { Church, Plan } from "../../types";

const CHURCHES_PAGE_SIZE = 10;

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

export default function Governanca() {
  const navigate = useNavigate();
  const { showToastMsg } = useApp();
  const [activeTab, setActiveTab] = useState<"igrejas" | "assinaturas" | "planos" | "landing">("igrejas");
  const [churches, setChurches] = useState<Church[]>([]);
  const [adminNamesByChurch, setAdminNamesByChurch] = useState<Map<string, string[]>>(new Map());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [hierarchyFilter, setHierarchyFilter] = useState<"all" | "principal" | "filial">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [{ data: churchRows, error: churchError }, { data: adminRows }] = await Promise.all([
      supabase.from("churches").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("name, church_id").eq("role", "Admin"),
    ]);
    if (!churchError && churchRows) setChurches(churchRows.map(mapChurchRow));
    const map = new Map<string, string[]>();
    (adminRows ?? []).forEach((row) => {
      if (!row.church_id) return;
      const list = map.get(row.church_id) ?? [];
      list.push(row.name);
      map.set(row.church_id, list);
    });
    setAdminNamesByChurch(map);
    setLoading(false);
  };

  const refreshPlans = async () => {
    const { data } = await supabase.from("plans").select("*").order("price_monthly");
    if (data) setPlans(data.map(mapPlanRow));
  };

  useEffect(() => {
    refresh();
    refreshPlans();
  }, []);

  // Ajuste manual de plano direto na tabela — Admin Master pode alternar o
  // plano de qualquer igreja a qualquer momento, sem depender de uma
  // solicitação de pagamento aprovada (ex.: cortesia, ajuste comercial).
  const changePlan = async (churchId: string, planId: string) => {
    setChurches((prev) => prev.map((c) => (c.id === churchId ? { ...c, planId } : c)));
    const { error } = await supabase.from("churches").update({ plan_id: planId }).eq("id", churchId);
    if (error) {
      showToastMsg(`Falha ao alterar plano: ${error.message}`);
      refresh();
      return;
    }
    showToastMsg("Plano da igreja atualizado com sucesso");
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return churches.filter((c) => {
      if (hierarchyFilter === "principal" && c.parentChurchId) return false;
      if (hierarchyFilter === "filial" && !c.parentChurchId) return false;
      if (dateFrom && c.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && c.createdAt.slice(0, 10) > dateTo) return false;
      if (term) {
        const admins = adminNamesByChurch.get(c.id) ?? [];
        const haystack = `${c.name} ${c.email ?? ""} ${c.cep} ${admins.join(" ")}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [churches, search, hierarchyFilter, dateFrom, dateTo, adminNamesByChurch]);

  const paged = filtered.slice((page - 1) * CHURCHES_PAGE_SIZE, page * CHURCHES_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, hierarchyFilter, dateFrom, dateTo]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Governança</h1>
        <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">
          Administração de todas as igrejas cadastradas na plataforma
        </p>
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-neutral-300 dark:border-white/10">
        <button
          onClick={() => setActiveTab("igrejas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "igrejas"
              ? "border-orla-blue text-black dark:text-white"
              : "border-transparent text-neutral-700 dark:text-neutral-400"
          }`}
        >
          <Building2 size={15} />
          Igrejas
        </button>
        <button
          onClick={() => setActiveTab("assinaturas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "assinaturas"
              ? "border-orla-blue text-black dark:text-white"
              : "border-transparent text-neutral-700 dark:text-neutral-400"
          }`}
        >
          <Receipt size={15} />
          Solicitações de Assinatura (Pix)
        </button>
        <button
          onClick={() => setActiveTab("planos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "planos"
              ? "border-orla-blue text-black dark:text-white"
              : "border-transparent text-neutral-700 dark:text-neutral-400"
          }`}
        >
          <CreditCard size={15} />
          Gestão de Planos & Dados Bancários
        </button>
        <button
          onClick={() => setActiveTab("landing")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "landing"
              ? "border-orla-blue text-black dark:text-white"
              : "border-transparent text-neutral-700 dark:text-neutral-400"
          }`}
        >
          <Image size={15} />
          Landing Page
        </button>
      </div>

      {activeTab === "assinaturas" ? (
        <PaymentRequestsPanel onProcessed={refresh} />
      ) : activeTab === "planos" ? (
        <PlanManagementPanel plans={plans} onChanged={refreshPlans} />
      ) : activeTab === "landing" ? (
        <div className="flex flex-col gap-4">
          <HeroImagesPanel />
          <LandingImagesPanel />
          <SocialLinksPanel />
        </div>
      ) : (
        <>
      <div className="flex items-center gap-2.5 flex-wrap mb-4.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, CEP ou responsável…"
            className="w-full box-border bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded-md pl-9 pr-3.5 py-2.5 text-sm outline-none"
          />
        </div>
        <select
          value={hierarchyFilter}
          onChange={(e) => setHierarchyFilter(e.target.value as typeof hierarchyFilter)}
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        >
          <option value="all">Todas as Igrejas</option>
          <option value="principal">Somente Principais</option>
          <option value="filial">Somente Filhas</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Cadastradas a partir de"
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Cadastradas até"
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
        >
          <Plus size={15} />
          Nova Igreja
        </button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-700 dark:text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Nome da Igreja</th>
                <th className="px-4.5 py-3 font-medium text-xs">E-mail</th>
                <th className="px-4.5 py-3 font-medium text-xs">Status</th>
                <th className="px-4.5 py-3 font-medium text-xs">Plano</th>
                <th className="px-4.5 py-3 font-medium text-xs">Data de Cadastro</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-t border-neutral-300 dark:border-white/10">
                  <td className="px-4.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-md bg-orla-blue/15 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-orla-blue" />
                      </span>
                      <div>
                        <div>{c.name}</div>
                        {c.parentChurchId && <div className="text-neutral-700 dark:text-neutral-400 text-xs">Igreja Filha</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400">{c.email || "—"}</td>
                  <td className="px-4.5 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge tone={c.isActive ? "success" : "neutral"} appearance="outline" dot>
                        {c.isActive ? "Ativa" : "Desativada"}
                      </Badge>
                      {c.subscriptionStatus === "pending_approval" && (
                        <Badge tone="warning" size="sm">
                          Aguardando Aprovação
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4.5 py-3">
                    <select
                      value={c.planId}
                      onChange={(e) => changePlan(c.id, e.target.value)}
                      className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-2.5 py-1.5"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4.5 py-3 text-right">
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

        {!loading && churches.length === 0 && (
          <div className="p-10 text-center">
            <Building2 size={28} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
            <div className="text-sm font-medium mb-1">Nenhuma igreja cadastrada ainda</div>
            <div className="text-xs text-neutral-700 dark:text-neutral-400">Clique em "Nova Igreja" para cadastrar a primeira.</div>
          </div>
        )}
        {!loading && churches.length > 0 && filtered.length === 0 && (
          <div className="p-10 text-center text-neutral-700 dark:text-neutral-400 text-sm">Nenhum resultado encontrado para este filtro.</div>
        )}
        {filtered.length > 0 && (
          <Pagination page={page} totalItems={filtered.length} pageSize={CHURCHES_PAGE_SIZE} onPageChange={setPage} />
        )}
      </Card>

      {showCreate && (
        <ChurchCreateModal
          parentOptions={churches.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}
        </>
      )}
    </div>
  );
}
