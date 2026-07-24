import type { MetricMeta } from "../services/mockData";
import type { Transaction } from "../types";

export const SAIDA_CATEGORY_META: Array<{ id: string; label: string; color: string }> = [
  { id: "prebenda", label: "Prebenda Pastoral", color: "#de7d02" },
  { id: "manutencao", label: "Manutenção do Templo", color: "#0057ff" },
  { id: "acaosocial", label: "Ação Social", color: "#7c3aed" },
  { id: "contas", label: "Contas e Utilidades", color: "#6f9bff" },
  { id: "administrativo", label: "Administrativo", color: "#aeaeb2" },
  { id: "outros", label: "Outros", color: "#8a8a92" },
];

function parseBrDate(brDate: string): Date {
  const [d, m, y] = brDate.split("/").map(Number);
  return new Date(y, m - 1, d);
}

/** Constrói as séries mensais (12 meses do `year`, em milhares) para o gráfico exploratório. */
export function buildMetricsMeta(transactions: Transaction[], year: number): MetricMeta[] {
  const entradas = Array(12).fill(0);
  const saidas = Array(12).fill(0);
  const byCategory = new Map(SAIDA_CATEGORY_META.map((c) => [c.label, Array(12).fill(0)]));

  for (const t of transactions) {
    const date = parseBrDate(t.date);
    if (date.getFullYear() !== year) continue;
    const idx = date.getMonth();
    if (t.type === "entrada") {
      entradas[idx] += t.value / 1000;
    } else {
      const abs = Math.abs(t.value) / 1000;
      saidas[idx] += abs;
      const bucket = byCategory.has(t.category) ? t.category : "Outros";
      byCategory.get(bucket)![idx] += abs;
    }
  }

  return [
    { id: "entradas", label: "Entradas Totais", color: "#198f51", values: entradas },
    { id: "saidas", label: "Saídas Totais", color: "#d4453b", values: saidas },
    ...SAIDA_CATEGORY_META.map((c) => ({ id: c.id, label: c.label, color: c.color, values: byCategory.get(c.label)! })),
  ];
}

export interface PeriodTotals {
  entradas: number;
  saidas: number;
  count: number;
}

function sumPeriod(transactions: Transaction[], start: Date, end: Date): PeriodTotals {
  let entradas = 0;
  let saidas = 0;
  let count = 0;
  for (const t of transactions) {
    const date = parseBrDate(t.date);
    if (date < start || date >= end) continue;
    count++;
    if (t.type === "entrada") entradas += t.value;
    else saidas += Math.abs(t.value);
  }
  return { entradas, saidas, count };
}

export type Period = "trimestral" | "semestral" | "anual";
const PERIOD_MONTHS: Record<Period, number> = { trimestral: 3, semestral: 6, anual: 12 };

export function getPeriodRange(period: Period, today: Date) {
  const months = PERIOD_MONTHS[period];
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  const prevEnd = start;
  const prevStart = new Date(start.getFullYear(), start.getMonth() - months, 1);
  return { start, end, prevStart, prevEnd };
}

/** Totais do período selecionado (janela corrente + janela anterior de mesma duração, para o delta). */
export function computePeriodComparison(transactions: Transaction[], period: Period, today: Date) {
  const { start, end, prevStart, prevEnd } = getPeriodRange(period, today);
  return {
    current: sumPeriod(transactions, start, end),
    previous: sumPeriod(transactions, prevStart, prevEnd),
  };
}

export function deltaLabel(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "sem lançamentos no período" : "sem dados no período anterior";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% no período`;
}

export interface CategorySlice {
  name: string;
  value: number;
  pct: number;
  color: string;
}

/** Saídas por categoria dentro de uma janela [start, end), já com percentuais calculados. */
export function buildCategoryBreakdown(transactions: Transaction[], start: Date, end: Date): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "saida") continue;
    const date = parseBrDate(t.date);
    if (date < start || date >= end) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.value));
  }
  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return [];

  const colorFor = (name: string) => SAIDA_CATEGORY_META.find((c) => c.label === name)?.color ?? "#8a8a92";
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value, pct: Math.round((value / grandTotal) * 100), color: colorFor(name) }))
    .sort((a, b) => b.value - a.value);
}
