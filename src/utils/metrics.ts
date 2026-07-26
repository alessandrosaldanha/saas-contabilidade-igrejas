import { MONTHS } from "../services/mockData";
import type { MetricMeta } from "../services/mockData";
import type { Transaction } from "../types";
import { FLOW_COLORS, SAIDA_CATEGORIES_WITH_COLOR, colorForCategory } from "../constants/chartColors";

const OUTROS_LABEL = "Outros";

function parseBrDate(brDate: string): Date {
  const [d, m, y] = brDate.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export type Period = "mensal" | "trimestral" | "semestral" | "anual";
const PERIOD_MONTHS: Record<Period, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

export function getPeriodRange(period: Period, today: Date) {
  const months = PERIOD_MONTHS[period];
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
  const prevEnd = start;
  const prevStart = new Date(start.getFullYear(), start.getMonth() - months, 1);
  return { start, end, prevStart, prevEnd };
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

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value, pct: Math.round((value / grandTotal) * 100), color: colorForCategory(name) }))
    .sort((a, b) => b.value - a.value);
}

export interface PeriodSeriesResult {
  labels: string[];
  metrics: MetricMeta[];
}

function bucketMetrics(
  transactions: Transaction[],
  bucketCount: number,
  bucketIndexFor: (date: Date) => number | null,
): MetricMeta[] {
  const entradas = Array(bucketCount).fill(0);
  const saidas = Array(bucketCount).fill(0);
  const byCategory = new Map(SAIDA_CATEGORIES_WITH_COLOR.map((c) => [c.label, Array(bucketCount).fill(0)]));
  byCategory.set(OUTROS_LABEL, Array(bucketCount).fill(0));

  for (const t of transactions) {
    const idx = bucketIndexFor(parseBrDate(t.date));
    if (idx === null) continue;
    if (t.type === "entrada") {
      entradas[idx] += t.value / 1000;
    } else {
      const abs = Math.abs(t.value) / 1000;
      saidas[idx] += abs;
      const bucket = byCategory.has(t.category) ? t.category : OUTROS_LABEL;
      byCategory.get(bucket)![idx] += abs;
    }
  }

  const categoryMetrics = [...SAIDA_CATEGORIES_WITH_COLOR, { label: OUTROS_LABEL, color: "#9ca3af" }]
    .map((c) => ({ id: c.label, label: c.label, color: c.color, values: byCategory.get(c.label)! }))
    .filter((m) => m.values.some((v) => v > 0));

  return [
    { id: "entradas", label: "Entradas Totais", color: FLOW_COLORS.entrada, values: entradas },
    { id: "saidas", label: "Saídas Totais", color: FLOW_COLORS.saida, values: saidas },
    ...categoryMetrics,
  ];
}

/**
 * Série temporal reativa ao filtro de período, para os gráficos (linha do topo
 * do Dashboard + Análise Exploratória). Granularidade varia por período:
 * - "mensal": semanas do mês corrente (4-5 buckets) — dividir por dia (até 31
 *   pontos) deixaria rótulos de valor e o radar (1 eixo por bucket) ilegíveis.
 * - demais períodos: um bucket por mês, últimos N meses terminando no mês
 *   corrente (mesma janela rolante de `getPeriodRange`).
 */
export function buildPeriodMetricsMeta(transactions: Transaction[], period: Period, today: Date): PeriodSeriesResult {
  if (period === "mensal") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = daysInMonth(year, month);
    const weekCount = Math.ceil(totalDays / 7);
    const labels = Array.from({ length: weekCount }, (_, i) => `Sem ${i + 1}`);

    const metrics = bucketMetrics(transactions, weekCount, (date) => {
      if (date.getFullYear() !== year || date.getMonth() !== month) return null;
      return Math.min(Math.floor((date.getDate() - 1) / 7), weekCount - 1);
    });
    return { labels, metrics };
  }

  const months = PERIOD_MONTHS[period];
  const monthKeys = Array.from({ length: months }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return `${d.getFullYear()}-${d.getMonth()}`;
  });
  const labels = monthKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    return `${MONTHS[m]}/${String(y).slice(-2)}`;
  });

  const metrics = bucketMetrics(transactions, months, (date) => {
    const idx = monthKeys.indexOf(`${date.getFullYear()}-${date.getMonth()}`);
    return idx === -1 ? null : idx;
  });
  return { labels, metrics };
}
