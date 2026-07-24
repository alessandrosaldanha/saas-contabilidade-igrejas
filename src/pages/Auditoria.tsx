import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";
import { ACTION_TYPES, AUDIT_PAGE_SIZE, MONTHS_FULL } from "../services/mockData";
import type { AuditActionKey, AuditLog } from "../types";

const ACTION_FILTERS: Array<{ id: AuditActionKey | "all"; label: string }> = [
  { id: "all", label: "Todas as ações" },
  ...(Object.keys(ACTION_TYPES) as AuditActionKey[]).map((k) => ({ id: k, label: ACTION_TYPES[k].label })),
];

interface AuditLogRow {
  id: string;
  occurred_at: string;
  user_id: string | null;
  role: string;
  action_key: AuditActionKey;
  action_label: string;
  before: string | null;
  after: string | null;
  ip: string | null;
  device: string | null;
}

function mapRow(row: AuditLogRow, usersById: Map<string, string>): AuditLog {
  const dt = new Date(row.occurred_at);
  return {
    id: row.id,
    day: dt.getDate(),
    time: dt.toLocaleTimeString("pt-BR"),
    sortKey: dt.getTime(),
    datetime: dt.toLocaleString("pt-BR"),
    user: (row.user_id && usersById.get(row.user_id)) || "Sistema",
    role: row.role,
    actionKey: row.action_key,
    actionLabel: row.action_label,
    before: row.before ?? "—",
    after: row.after ?? "—",
    ip: row.ip ?? "—",
    device: row.device ?? "—",
  };
}

export default function Auditoria() {
  const { usersList } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<AuditActionKey | "all">("all");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const usersById = useMemo(() => new Map(usersList.map((u) => [u.id, u.name])), [usersList]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 1).toISOString();
    supabase
      .from("audit_logs")
      .select("id, occurred_at, user_id, role, action_key, action_label, before, after, ip, device")
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setLogs(data.map((row) => mapRow(row, usersById)));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year, month, usersById]);

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setPage(1);
  };
  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setPage(1);
  };

  const userOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.user))).sort(), [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.actionKey !== actionFilter) return false;
      if (userFilter !== "all" && l.user !== userFilter) return false;
      if (search) {
        const haystack = `${l.user} ${l.actionLabel} ${l.before} ${l.after} ${l.id}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, actionFilter, userFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * AUDIT_PAGE_SIZE, pageClamped * AUDIT_PAGE_SIZE);

  const kpiTotal = logs.length;
  const kpiIa = logs.filter((l) => l.actionKey === "categorizacao_ia").length;
  const kpiManual = logs.filter((l) => l.actionKey === "edicao_manual").length;
  const kpiEstorno = logs.filter((l) => l.actionKey === "estorno").length;

  const changeFilters = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const exportAuditReport = () => {
    const header = "DataHora;Usuario;Funcao;Acao;Antes;Depois;IP;Dispositivo\n";
    const body = filtered
      .map((l) => `${l.datetime};${l.user};${l.role};${l.actionLabel};${l.before};${l.after};${l.ip};${l.device}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${MONTHS_FULL[month].toLowerCase()}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Trilha de Auditoria</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
            Histórico completo e imutável de alterações
          </p>
        </div>
        <Badge tone="neutral" appearance="outline">
          Registro imutável
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={goPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="font-display font-semibold text-sm min-w-[150px] text-center">
          {MONTHS_FULL[month]} de {year}
        </span>
        <button
          onClick={goNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20"
        >
          <ChevronRight size={15} />
        </button>
        <select
          value={month}
          onChange={(e) => changeFilters(() => setMonth(parseInt(e.target.value, 10)))}
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        >
          {MONTHS_FULL.map((label, i) => (
            <option key={label} value={i}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={exportAuditReport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          <FileDown size={14} />
          Exportar Relatório de Auditoria
        </button>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap mb-3.5">
        <input
          value={search}
          onChange={(e) => changeFilters(() => setSearch(e.target.value))}
          placeholder="Buscar por usuário, evento, categoria ou ID…"
          className="flex-1 min-w-[240px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2 text-sm outline-none"
        />
        <select
          value={userFilter}
          onChange={(e) => changeFilters(() => setUserFilter(e.target.value))}
          className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
        >
          <option value="all">Todos os usuários</option>
          {userOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {ACTION_FILTERS.map((af) => (
          <button
            key={af.id}
            onClick={() => changeFilters(() => setActionFilter(af.id))}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              actionFilter === af.id
                ? "bg-orla-blue text-white border-transparent"
                : "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-white/20"
            }`}
          >
            {af.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 mb-5.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Total de Eventos no Mês</div>
          <div className="font-display font-semibold text-xl">{kpiTotal}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Categorizações da IA</div>
          <div className="font-display font-semibold text-xl text-orla-blue">{kpiIa}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5">
          <div className="text-[11px] text-neutral-400 mb-1">Ajustes Manuais / RBAC</div>
          <div className="font-display font-semibold text-xl">{kpiManual}</div>
        </div>
        <div className="bg-status-error/10 border border-status-error rounded-md px-4 py-3.5">
          <div className="text-[11px] text-status-error mb-1">Estornos / Exclusões Sensíveis</div>
          <div className="font-display font-semibold text-xl text-status-error">{kpiEstorno}</div>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Data/Hora</th>
                <th className="px-4.5 py-3 font-medium text-xs">Usuário</th>
                <th className="px-4.5 py-3 font-medium text-xs">Ação</th>
                <th className="px-4.5 py-3 font-medium text-xs">Antes → Depois</th>
                <th className="px-4.5 py-3 font-medium text-xs">IP / Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((log) => (
                <tr key={log.id} className="border-t border-neutral-200 dark:border-white/10">
                  <td className="px-4.5 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap text-xs">{log.datetime}</td>
                  <td className="px-4.5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={log.user} size="xs" />
                      <div>
                        <div className="text-xs">{log.user}</div>
                        <div className="text-neutral-400 text-[10px]">{log.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4.5 py-3">
                    <Badge tone={ACTION_TYPES[log.actionKey].tone}>{log.actionLabel}</Badge>
                  </td>
                  <td className="px-4.5 py-3 text-xs">
                    <span className="text-neutral-400">{log.before}</span>
                    <span className="text-neutral-400 mx-1">→</span>
                    <span>{log.after}</span>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-400 text-xs whitespace-nowrap">
                    {log.ip} · {log.device}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && pageRows.length === 0 && (
          <div className="p-8 text-center text-neutral-400 text-sm">Nenhum log encontrado para este filtro.</div>
        )}
        {loading && <div className="p-8 text-center text-neutral-400 text-sm">Carregando…</div>}
        <div className="flex items-center justify-between px-4.5 py-3.5 border-t border-neutral-200 dark:border-white/10 text-xs text-neutral-400">
          <span>
            Página {pageClamped} de {totalPages} · {filtered.length} registros
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageClamped === 1}
              className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageClamped === totalPages}
              className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
