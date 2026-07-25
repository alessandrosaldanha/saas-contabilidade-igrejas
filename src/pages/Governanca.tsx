import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Building2 } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Pagination from "../components/Pagination";
import ChurchCreateModal from "../components/ChurchCreateModal";
import ChurchDetailsModal from "../components/ChurchDetailsModal";
import { supabase } from "../services/supabase";
import type { Church } from "../types";

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
  };
}

export default function Governanca() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [adminNamesByChurch, setAdminNamesByChurch] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [hierarchyFilter, setHierarchyFilter] = useState<"all" | "principal" | "filial">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

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

  useEffect(() => {
    refresh();
  }, []);

  // Se a igreja aberta no modal de detalhes tiver sido atualizada na lista
  // (ex.: ativar/desativar refletiu no refresh), mantém o modal em sincronia.
  useEffect(() => {
    if (!selectedChurch) return;
    const updated = churches.find((c) => c.id === selectedChurch.id);
    if (updated) setSelectedChurch(updated);
  }, [churches, selectedChurch]);

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
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
          Administração de todas as igrejas cadastradas na plataforma
        </p>
      </div>

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
              <tr className="text-left text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Nome da Igreja</th>
                <th className="px-4.5 py-3 font-medium text-xs">E-mail</th>
                <th className="px-4.5 py-3 font-medium text-xs">Status</th>
                <th className="px-4.5 py-3 font-medium text-xs">Data de Cadastro</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-t border-neutral-200 dark:border-white/10">
                  <td className="px-4.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-md bg-orla-blue/15 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-orla-blue" />
                      </span>
                      <div>
                        <div>{c.name}</div>
                        {c.parentChurchId && <div className="text-neutral-400 text-xs">Igreja Filha</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-500 dark:text-neutral-400">{c.email || "—"}</td>
                  <td className="px-4.5 py-3">
                    <Badge tone={c.isActive ? "success" : "neutral"} appearance="outline" dot>
                      {c.isActive ? "Ativa" : "Desativada"}
                    </Badge>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4.5 py-3 text-right">
                    <button
                      onClick={() => setSelectedChurch(c)}
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
            <div className="text-xs text-neutral-400">Clique em "Nova Igreja" para cadastrar a primeira.</div>
          </div>
        )}
        {!loading && churches.length > 0 && filtered.length === 0 && (
          <div className="p-10 text-center text-neutral-400 text-sm">Nenhum resultado encontrado para este filtro.</div>
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

      {selectedChurch && (
        <ChurchDetailsModal
          church={selectedChurch}
          allChurches={churches}
          onClose={() => setSelectedChurch(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
