import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, FileType, RotateCcw, Sheet, X } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Avatar from "../components/Avatar";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { CATEGORY_TONE, MONTHS_FULL } from "../services/mockData";
import { fmt, fmtPlain, brToIso } from "../utils/format";
import type { LedgerRow, Transaction } from "../types";

type ReportFormat = "pdf" | "word" | null;

function computeLedger(transactions: Transaction[], year: number, monthIdx: number) {
  const periodStart = `${year}-${String(monthIdx + 1).padStart(2, "0")}-01`;
  const periodEnd =
    monthIdx === 11 ? `${year + 1}-01-01` : `${year}-${String(monthIdx + 2).padStart(2, "0")}-01`;

  let opening = 0;
  const txsInMonth: Transaction[] = [];
  for (const t of transactions) {
    const iso = brToIso(t.date);
    if (iso < periodStart) opening += t.value;
    else if (iso < periodEnd) txsInMonth.push(t);
  }

  let balance = opening;
  const rows: LedgerRow[] = txsInMonth.map((t) => {
    balance += t.value;
    return { ...t, balance };
  });
  const entradasTotal = txsInMonth.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const saidasTotal = txsInMonth.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);
  return { rows, opening, entradasTotal, saidasTotal, saldoFinal: opening + entradasTotal + saidasTotal };
}

export default function LivroCaixa() {
  const { transactions, refreshTransactions, showToastMsg } = useApp();
  const { profile } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [search, setSearch] = useState("");
  const [reportModal, setReportModal] = useState<ReportFormat>(null);
  const [estornoTarget, setEstornoTarget] = useState<LedgerRow | null>(null);
  const [isEstornando, setIsEstornando] = useState(false);

  const confirmEstorno = async () => {
    if (!estornoTarget || isEstornando) return;
    setIsEstornando(true);
    const { error } = await supabase.from("transactions").delete().eq("id", estornoTarget.id);
    setIsEstornando(false);
    if (error) {
      showToastMsg(`Falha ao estornar: ${error.message}`);
      return;
    }
    setEstornoTarget(null);
    await refreshTransactions();
    showToastMsg("Lançamento estornado com sucesso");
  };

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const ledger = useMemo(() => computeLedger(transactions, year, month), [transactions, year, month]);

  const filteredRows = useMemo(
    () =>
      ledger.rows.filter(
        (r) => !search || `${r.desc} ${r.category}`.toLowerCase().includes(search.toLowerCase())
      ),
    [ledger.rows, search]
  );

  const stats = [
    { label: "Saldo de Abertura", value: fmtPlain(ledger.opening), color: "text-black dark:text-white" },
    { label: "Total de Entradas", value: fmtPlain(ledger.entradasTotal), color: "text-status-success" },
    { label: "Total de Saídas", value: fmtPlain(Math.abs(ledger.saidasTotal)), color: "text-orla-coral" },
    { label: "Saldo Final do Mês", value: fmtPlain(ledger.saldoFinal), color: "text-black dark:text-white" },
  ];

  const exportCSV = () => {
    const header = "Data;Descricao;Categoria;Tipo;Valor;Saldo\n";
    const body = filteredRows
      .map((t) => `${t.date};${t.desc};${t.category};${t.type === "entrada" ? "Entrada" : "Saida"};${t.value.toFixed(2)};${t.balance.toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `livro_caixa_${MONTHS_FULL[month].toLowerCase()}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBtnCls =
    "flex items-center gap-2 px-3.5 py-2 rounded-md border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Livro Caixa</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
            Lançamentos confirmados e saldo em caixa
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex items-center gap-2">
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
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md text-xs px-3 py-2"
          >
            {MONTHS_FULL.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setReportModal("pdf")} className={exportBtnCls}>
            <FileText size={14} />
            Exportar PDF
          </button>
          <button onClick={() => setReportModal("word")} className={exportBtnCls}>
            <FileType size={14} />
            Exportar Word
          </button>
          <button onClick={exportCSV} className={exportBtnCls}>
            <Sheet size={14} />
            Exportar Excel/CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {stats.map((st) => (
          <div key={st.label} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3">
            <div className="text-[11px] text-neutral-400 mb-1">{st.label}</div>
            <div className={`font-display font-semibold text-base ${st.color}`}>{st.value}</div>
          </div>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por descrição ou categoria…"
        className="w-full box-border mb-3.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/20 rounded-md px-3.5 py-2.5 text-sm outline-none"
      />

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Data</th>
                <th className="px-4.5 py-3 font-medium text-xs">Descrição</th>
                <th className="px-4.5 py-3 font-medium text-xs">Categoria</th>
                <th className="px-4.5 py-3 font-medium text-xs">Tipo</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Valor</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Saldo</th>
                <th className="px-4.5 py-3 font-medium text-xs">Registrado por</th>
                {profile?.role === "Admin" && <th className="px-4.5 py-3 font-medium text-xs text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-200 dark:border-white/10">
                  <td className="px-4.5 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{row.date}</td>
                  <td className="px-4.5 py-3.5">{row.desc}</td>
                  <td className="px-4.5 py-3.5">
                    <Badge tone={CATEGORY_TONE[row.category] || "neutral"}>{row.category}</Badge>
                  </td>
                  <td className="px-4.5 py-3.5">
                    <Badge tone={row.type === "entrada" ? "success" : "error"}>
                      {row.type === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </td>
                  <td className={`px-4.5 py-3.5 text-right whitespace-nowrap ${row.value < 0 ? "text-orla-coral" : "text-status-success"}`}>
                    {fmt(row.value)}
                  </td>
                  <td className="px-4.5 py-3.5 text-right whitespace-nowrap font-medium">{fmtPlain(row.balance)}</td>
                  <td className="px-4.5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.createdBy} size="xs" />
                      <span className="text-xs text-neutral-400">{row.createdBy}</span>
                    </div>
                  </td>
                  {profile?.role === "Admin" && (
                    <td className="px-4.5 py-3.5 text-right">
                      <button
                        onClick={() => setEstornoTarget(row)}
                        title="Estornar / Excluir lançamento"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-500 dark:text-neutral-400 hover:bg-status-error/10 hover:text-status-error hover:border-status-error"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 && (
          <div className="p-8 text-center text-neutral-400 text-sm">Nenhum lançamento encontrado para este mês/busca.</div>
        )}
      </Card>

      {reportModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-lg shadow-md p-9">
            <div className="flex items-center justify-between mb-5.5">
              <span className="text-xs text-neutral-400 uppercase tracking-wide">
                {reportModal === "pdf" ? "Relatório PDF" : "Relatório Word"}
              </span>
              <button onClick={() => setReportModal(null)} className="text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-neutral-200 dark:border-white/10 pb-4 mb-4">
              <h2 className="font-display font-semibold text-xl m-0">Igreja Comunidade da Fé</h2>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                CNPJ 12.345.678/0001-90 · Relatório Contábil — Livro Caixa
              </div>
              <div className="flex gap-5 mt-2.5 text-xs text-neutral-400">
                <span>Período: {MONTHS_FULL[month]} de {year}</span>
                <span>Emitido em: {new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            <table className="w-full border-collapse text-xs mb-4.5">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-200 dark:border-white/10">
                  <th className="py-1.5 px-2 font-medium">Data</th>
                  <th className="py-1.5 px-2 font-medium">Descrição</th>
                  <th className="py-1.5 px-2 font-medium">Categoria</th>
                  <th className="py-1.5 px-2 font-medium">Tipo</th>
                  <th className="py-1.5 px-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-200 dark:border-white/10">
                    <td className="py-1.5 px-2 whitespace-nowrap">{row.date}</td>
                    <td className="py-1.5 px-2">{row.desc}</td>
                    <td className="py-1.5 px-2">{row.category}</td>
                    <td className="py-1.5 px-2">{row.type === "entrada" ? "Entrada" : "Saída"}</td>
                    <td className={`py-1.5 px-2 text-right ${row.value < 0 ? "text-orla-coral" : "text-status-success"}`}>{fmt(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-md p-4 mb-6.5">
              <div className="font-semibold text-sm mb-2">Resumo Financeiro do Mês</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Entradas: {fmtPlain(ledger.entradasTotal)} · Saídas: {fmtPlain(Math.abs(ledger.saidasTotal))} · Saldo final:{" "}
                {fmtPlain(ledger.saldoFinal)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 mt-8">
              <div className="border-t border-neutral-300 dark:border-white/20 pt-2 text-center text-xs text-neutral-400">
                Assinatura do Tesoureiro
              </div>
              <div className="border-t border-neutral-300 dark:border-white/20 pt-2 text-center text-xs text-neutral-400">
                Assinatura do Pastor / Conselho Fiscal
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-7">
              <button
                onClick={() => setReportModal(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
              >
                Imprimir / Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {estornoTarget && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Estornar Lançamento</h3>
              <button onClick={() => setEstornoTarget(null)} className="text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              Esta ação remove o lançamento do Livro Caixa e recalcula o saldo. É registrada de forma imutável na
              Trilha de Auditoria.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5 mb-6 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-neutral-400">{estornoTarget.date}</span>
                <span className={estornoTarget.value < 0 ? "text-orla-coral" : "text-status-success"}>{fmt(estornoTarget.value)}</span>
              </div>
              <div>{estornoTarget.desc}</div>
              <div className="text-xs text-neutral-400 mt-1">{estornoTarget.category}</div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setEstornoTarget(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEstorno}
                disabled={isEstornando}
                className="px-4 py-2 rounded-md bg-status-error text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
              >
                {isEstornando ? "Estornando…" : "Confirmar Estorno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
