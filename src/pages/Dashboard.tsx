import { useMemo, useState } from "react";
import { Presentation } from "lucide-react";
import Card from "../components/Card";
import MetricCard from "../components/MetricCard";
import ThemeToggle from "../components/ThemeToggle";
import ExploratoryChart from "../components/ExploratoryChart";
import { useApp } from "../context/AppContext";
import { DASHBOARD_ENTRADAS, DASHBOARD_SAIDAS, DONUT_DATA, MONTHS } from "../services/mockData";
import { fmtPlain } from "../utils/format";

type Period = "trimestral" | "semestral" | "anual";
const PERIOD_LABELS: Record<Period, string> = { trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };

export default function Dashboard() {
  const { isPresenting, enterPresentation } = useApp();
  const [period, setPeriod] = useState<Period>("trimestral");

  const kpiScale = { trimestral: 1, semestral: 1.9, anual: 3.6 }[period];
  const kpis = [
    { label: "Entradas Totais", value: fmtPlain(128450 * kpiScale), delta: "+8,2% no período", tone: "success" as const },
    { label: "Saídas Totais", value: fmtPlain(94320 * kpiScale), delta: "+3,1% no período", tone: "neutral" as const },
    { label: "Saldo Atual em Caixa", value: fmtPlain(186740), delta: "+R$ 34.130 no período", tone: "success" as const },
    { label: "Reserva de Emergência", value: fmtPlain(60000), delta: "Meta: R$ 100.000", tone: "neutral" as const },
  ];

  const max = Math.max(...DASHBOARD_ENTRADAS, ...DASHBOARD_SAIDAS) * 1.15;
  const toPoints = (vals: number[]) => vals.map((v, i) => `${(i * 600) / (vals.length - 1)},${190 - (v / max) * 170}`).join(" ");
  const entradasPoints = useMemo(() => toPoints(DASHBOARD_ENTRADAS), [max]);
  const saidasPoints = useMemo(() => toPoints(DASHBOARD_SAIDAS), [max]);
  const gridLines = [0, 0.5, 1].map((f) => ({ y: 190 - f * 170, label: `R$ ${Math.round(max * f)}k` }));

  let acc = 0;
  const gradParts = DONUT_DATA.map((d) => {
    const start = acc;
    acc += d.pct;
    return `${d.color} ${start}% ${acc}%`;
  });
  const donutGradient = `conic-gradient(${gradParts.join(", ")})`;
  const donutTotal = "R$ 26,4k";

  return (
    <div>
      {!isPresenting && (
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
      )}

      <div className="flex items-start justify-between gap-5 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
            Visão geral da saúde financeira da igreja
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-md border border-neutral-200 dark:border-white/10">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((id) => (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                className={`border-none px-3.5 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                  period === id ? "bg-orla-blue text-white" : "bg-transparent text-neutral-600 dark:text-neutral-400"
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

      <div className="grid mb-8" style={{ gridTemplateColumns: "2fr 1fr", gap: "18px" }}>
        <Card padding="lg">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-display font-semibold text-base m-0">Entradas vs Saídas</h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-orla-blue inline-block" />
                Entradas
              </span>
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-orla-coral inline-block" />
                Saídas
              </span>
            </div>
          </div>
          <svg viewBox="0 0 600 200" className="w-full h-[200px] block mt-2.5">
            {gridLines.map((gl, i) => (
              <g key={i}>
                <line x1={0} x2={600} y1={gl.y} y2={gl.y} stroke="currentColor" className="text-neutral-200 dark:text-white/10" strokeWidth={1} />
                <text x={0} y={gl.y - 3} fill="currentColor" className="text-neutral-400" fontSize={10}>
                  {gl.label}
                </text>
              </g>
            ))}
            <polyline points={entradasPoints} fill="none" stroke="#0057ff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={saidasPoints} fill="none" stroke="#ff5e40" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-between mt-1 px-0.5">
            {MONTHS.map((m) => (
              <span key={m} className="text-[9px] text-neutral-400">
                {m}
              </span>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="font-display font-semibold text-base m-0 mb-4">Saídas por Categoria</h3>
          <div className="flex items-center justify-center mb-5">
            <div
              className="w-[150px] h-[150px] rounded-full flex items-center justify-center relative"
              style={{ background: donutGradient }}
            >
              <div className="w-[96px] h-[96px] rounded-full bg-white dark:bg-neutral-900 flex flex-col items-center justify-center">
                <span className="font-display font-semibold text-lg">{donutTotal}</span>
                <span className="text-[10px] text-neutral-400">total</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {DONUT_DATA.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </span>
                <span className="text-neutral-400">{cat.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ExploratoryChart />
    </div>
  );
}
