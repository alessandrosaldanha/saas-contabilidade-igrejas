import { useMemo, useState } from "react";
import { Presentation } from "lucide-react";
import Card from "../../components/Card";
import MetricCard from "./components/MetricCard";
import ExploratoryChart from "./components/ExploratoryChart";
import { useApp } from "../../context/AppContext";
import { fmtPlain } from "../../utils/format";
import { FLOW_COLORS } from "../../constants/chartColors";
import {
  buildCategoryBreakdown,
  buildPeriodMetricsMeta,
  computePeriodComparison,
  deltaLabel,
  getPeriodRange,
  type Period,
} from "../../utils/metrics";

const PERIOD_LABELS: Record<Period, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

type FlowFocus = "all" | "entradas" | "saidas";

export default function Dashboard() {
  const { isPresenting, enterPresentation, transactions } = useApp();
  const [period, setPeriod] = useState<Period>("trimestral");
  const [flowFocus, setFlowFocus] = useState<FlowFocus>("all");
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const today = new Date();

  const { current, previous } = useMemo(
    () => computePeriodComparison(transactions, period, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, period]
  );
  const saldoAtual = useMemo(() => transactions.reduce((s, t) => s + t.value, 0), [transactions]);

  const kpis = [
    { label: "Entradas Totais", value: fmtPlain(current.entradas), delta: deltaLabel(current.entradas, previous.entradas), tone: "success" as const },
    { label: "Saídas Totais", value: fmtPlain(current.saidas), delta: deltaLabel(current.saidas, previous.saidas), tone: "neutral" as const },
    { label: "Saldo Atual em Caixa", value: fmtPlain(saldoAtual), delta: "saldo acumulado de todos os lançamentos", tone: "success" as const },
    { label: "Lançamentos no Período", value: String(current.count), delta: `${PERIOD_LABELS[period]}`, tone: "neutral" as const },
  ];

  // Série reativa ao período selecionado — alimenta tanto o gráfico de linha
  // do topo quanto a Análise Exploratória (única fonte de verdade, ambos
  // sempre mostram a mesma janela/granularidade).
  const { labels, metrics } = useMemo(
    () => buildPeriodMetricsMeta(transactions, period, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, period]
  );

  const entradasSeries = metrics.find((m) => m.id === "entradas")?.values ?? [];
  const saidasSeries = metrics.find((m) => m.id === "saidas")?.values ?? [];
  const hasFlowData = entradasSeries.some((v) => v > 0) || saidasSeries.some((v) => v > 0);

  const max = Math.max(...entradasSeries, ...saidasSeries, 0.001) * 1.15;
  const n = labels.length;
  const toPoints = (vals: number[]) => vals.map((v, i) => ({ x: (i * 600) / Math.max(n - 1, 1), y: 190 - (v / max) * 170, v }));
  const entradasPoints = useMemo(() => toPoints(entradasSeries), [max, entradasSeries, n]);
  const saidasPoints = useMemo(() => toPoints(saidasSeries), [max, saidasSeries, n]);
  const gridLines = [0, 0.5, 1].map((f) => ({ y: 190 - f * 170, label: `R$ ${Math.round(max * f)}k` }));

  const toggleFlowFocus = (flow: "entradas" | "saidas") => {
    setFlowFocus((cur) => (cur === flow ? "all" : flow));
  };
  const showEntradas = flowFocus !== "saidas";
  const showSaidas = flowFocus !== "entradas";

  const { start: periodStart, end: periodEnd } = getPeriodRange(period, today);
  const donutData = useMemo(
    () => buildCategoryBreakdown(transactions, periodStart, periodEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, period]
  );
  let acc = 0;
  const gradParts = donutData.map((d) => {
    const start = acc;
    acc += d.pct;
    // Foco por categoria: dessatura as fatias não selecionadas em vez de
    // recalcular o donut para 100% de uma cor só (perderia o contexto de
    // proporção, que é o ponto de um gráfico de rosca).
    const isDimmed = highlightedCategory !== null && highlightedCategory !== d.name;
    const color = isDimmed ? `${d.color}33` : d.color;
    return `${color} ${start}% ${acc}%`;
  });
  const donutGradient = `conic-gradient(${gradParts.join(", ")})`;
  const donutTotalValue = donutData.reduce((s, d) => s + d.value, 0);
  const highlighted = donutData.find((d) => d.name === highlightedCategory) ?? null;

  const toggleCategoryHighlight = (name: string) => {
    setHighlightedCategory((cur) => (cur === name ? null : name));
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-5 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">
            Visão geral da saúde financeira da igreja
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-md border border-neutral-300 dark:border-white/10">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((id) => (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                className={`border-none px-3.5 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                  period === id ? "bg-orla-blue text-white" : "bg-transparent text-neutral-700 dark:text-neutral-400"
                }`}
              >
                {PERIOD_LABELS[id]}
              </button>
            ))}
          </div>
          {!isPresenting && (
            <button
              onClick={enterPresentation}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <Presentation size={15} />
              Modo Apresentação
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {kpis.map((k) => (
          <MetricCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaTone={k.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4.5 mb-8">
        <Card padding="lg">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <h3 className="font-display font-semibold text-base m-0">Entradas vs Saídas ({PERIOD_LABELS[period]})</h3>
            <div className="flex gap-3">
              <button
                onClick={() => toggleFlowFocus("entradas")}
                title="Clique para focar só em Entradas; clique de novo para ver as duas séries"
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-opacity ${
                  showEntradas ? "opacity-100" : "opacity-40"
                } hover:opacity-100`}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: FLOW_COLORS.entrada }} />
                <span className="text-neutral-700 dark:text-neutral-300">Entradas</span>
              </button>
              <button
                onClick={() => toggleFlowFocus("saidas")}
                title="Clique para focar só em Saídas; clique de novo para ver as duas séries"
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-opacity ${
                  showSaidas ? "opacity-100" : "opacity-40"
                } hover:opacity-100`}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: FLOW_COLORS.saida }} />
                <span className="text-neutral-700 dark:text-neutral-300">Saídas</span>
              </button>
            </div>
          </div>
          {hasFlowData ? (
            <>
              <svg viewBox="0 0 600 200" className="w-full h-[200px] block mt-2.5 overflow-visible">
                {gridLines.map((gl, i) => (
                  <g key={i}>
                    <line x1={0} x2={600} y1={gl.y} y2={gl.y} stroke="currentColor" className="text-neutral-200 dark:text-white/10" strokeWidth={1} />
                    <text x={0} y={gl.y - 3} fill="currentColor" className="text-neutral-700 dark:text-neutral-400" fontSize={10}>
                      {gl.label}
                    </text>
                  </g>
                ))}
                {showEntradas && (
                  <g>
                    <polyline
                      points={entradasPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={FLOW_COLORS.entrada}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {entradasPoints.map(
                      (p, i) =>
                        p.v > 0 && (
                          <text key={i} x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fontWeight={600} fill={FLOW_COLORS.entrada}>
                            {fmtPlain(p.v * 1000)}
                          </text>
                        )
                    )}
                  </g>
                )}
                {showSaidas && (
                  <g>
                    <polyline
                      points={saidasPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={FLOW_COLORS.saida}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {saidasPoints.map(
                      (p, i) =>
                        p.v > 0 && (
                          <text key={i} x={p.x} y={p.y + 14} textAnchor="middle" fontSize={9} fontWeight={600} fill={FLOW_COLORS.saida}>
                            {fmtPlain(p.v * 1000)}
                          </text>
                        )
                    )}
                  </g>
                )}
              </svg>
              <div className="flex justify-between mt-1 px-0.5">
                {labels.map((label) => (
                  <span key={label} className="text-[9px] text-neutral-700 dark:text-neutral-400">
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-neutral-700 dark:text-neutral-400">Sem lançamentos no período selecionado.</div>
          )}
        </Card>

        <Card padding="lg">
          <h3 className="font-display font-semibold text-base m-0 mb-4">Saídas por Categoria</h3>
          {donutData.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-5">
                <div
                  className="w-[150px] h-[150px] rounded-full flex items-center justify-center relative transition-[background] duration-200"
                  style={{ background: donutGradient }}
                >
                  <div className="w-[96px] h-[96px] rounded-full bg-white dark:bg-neutral-900 flex flex-col items-center justify-center px-2 text-center">
                    {highlighted ? (
                      <>
                        <span className="font-display font-semibold text-sm leading-tight">{fmtPlain(highlighted.value)}</span>
                        <span className="text-[9px] text-neutral-700 dark:text-neutral-400 leading-tight mt-0.5">{highlighted.pct}% · {highlighted.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-display font-semibold text-lg">{fmtPlain(donutTotalValue)}</span>
                        <span className="text-[10px] text-neutral-700 dark:text-neutral-400">total</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {donutData.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategoryHighlight(cat.name)}
                    title="Clique para focar nesta categoria"
                    className={`flex items-center justify-between gap-2 text-xs px-1.5 py-1 rounded-md transition-colors ${
                      highlightedCategory === cat.name ? "bg-neutral-100 dark:bg-white/5" : "hover:bg-neutral-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2 min-w-0 truncate ${
                        highlightedCategory === cat.name ? "text-black dark:text-white font-medium" : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 text-neutral-700 dark:text-neutral-400 whitespace-nowrap">
                      <span>{fmtPlain(cat.value)}</span>
                      <span className="w-9 text-right">{cat.pct}%</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-neutral-700 dark:text-neutral-400">Sem saídas no período.</div>
          )}
        </Card>
      </div>

      <ExploratoryChart metrics={metrics} labels={labels} />
    </div>
  );
}
