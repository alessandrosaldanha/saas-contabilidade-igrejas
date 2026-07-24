import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { METRICS_META, MONTHS } from "../services/mockData";
import { buildStackedBars, buildLines, buildAreas, buildRadar } from "../utils/chartBuilders";
import Card from "./Card";

type ChartType = "bars" | "lines" | "area" | "radar";

const CHART_TABS: Array<{ id: ChartType; label: string }> = [
  { id: "bars", label: "Barras" },
  { id: "lines", label: "Linhas" },
  { id: "area", label: "Área" },
  { id: "radar", label: "Radar" },
];

export default function ExploratoryChart() {
  const [chartType, setChartType] = useState<ChartType>("lines");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(METRICS_META.map((m) => [m.id, true]))
  );
  const [warnMetricId, setWarnMetricId] = useState<string | null>(null);

  const toggleMetric = (id: string) => {
    const activeCount = Object.values(selected).filter(Boolean).length;
    if (selected[id] && activeCount === 1) {
      setWarnMetricId(id);
      setTimeout(() => setWarnMetricId((cur) => (cur === id ? null : cur)), 2200);
      return;
    }
    setSelected((s) => ({ ...s, [id]: !s[id] }));
    setWarnMetricId(null);
  };

  const active = useMemo(() => METRICS_META.filter((m) => selected[m.id]), [selected]);

  const bars = useMemo(() => (chartType === "bars" ? buildStackedBars(active, 880, 260) : []), [active, chartType]);
  const lines = useMemo(() => (chartType === "lines" ? buildLines(active, 880, 260) : []), [active, chartType]);
  const areas = useMemo(() => (chartType === "area" ? buildAreas(active, 880, 260) : []), [active, chartType]);
  const radar = useMemo(() => (chartType === "radar" ? buildRadar(active) : null), [active, chartType]);

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <h3 className="font-display font-semibold text-base m-0">Análise Exploratória de Fluxos e Categorias</h3>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-md border border-neutral-200 dark:border-white/10">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChartType(tab.id)}
              className={`border-none px-3.5 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                chartType === tab.id ? "bg-orla-blue text-white" : "bg-transparent text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {METRICS_META.map((m) => (
          <div key={m.id} className="relative">
            <button
              onClick={() => toggleMetric(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected[m.id]
                  ? "text-white border-transparent"
                  : "bg-transparent text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-white/20"
              }`}
              style={selected[m.id] ? { backgroundColor: m.color } : undefined}
            >
              {selected[m.id] && <Check size={11} strokeWidth={3} />}
              {m.label}
            </button>
            {warnMetricId === m.id && (
              <div className="absolute top-[calc(100%+6px)] left-0 z-10 whitespace-nowrap bg-status-error text-white text-[11px] font-medium px-2.5 py-1.5 rounded-sm shadow-md">
                Selecione ao menos 1 métrica
              </div>
            )}
          </div>
        ))}
      </div>

      {chartType === "bars" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block">
          {bars.map((bar, i) => (
            <g key={i}>
              <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.color} rx={2}>
                <title>{bar.title}</title>
              </rect>
            </g>
          ))}
        </svg>
      )}
      {chartType === "lines" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block">
          {lines.map((ln, i) => (
            <g key={i}>
              <polyline points={ln.points} fill="none" stroke={ln.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {ln.markers.map((pt, j) => (
                <circle key={j} cx={pt.cx} cy={pt.cy} r={3.5} fill={pt.color}>
                  <title>{pt.title}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      )}
      {chartType === "area" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block">
          {areas.map((ar, i) => (
            <g key={i}>
              <path d={ar.path} fill={ar.color} fillOpacity={0.18} stroke="none" />
              <polyline points={ar.points} fill="none" stroke={ar.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {ar.markers.map((pt, j) => (
                <circle key={j} cx={pt.cx} cy={pt.cy} r={3} fill={pt.color}>
                  <title>{pt.title}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      )}
      {chartType === "radar" && radar && (
        <div className="flex justify-center">
          <svg viewBox="0 0 320 320" className="w-[320px] h-[320px] block">
            {radar.axes.map((ax, i) => (
              <g key={i}>
                <line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="currentColor" className="text-neutral-200 dark:text-white/10" strokeWidth={1} />
                <text x={ax.labelX} y={ax.labelY} fill="currentColor" className="text-neutral-400" fontSize={9} textAnchor="middle">
                  {ax.label}
                </text>
              </g>
            ))}
            {radar.polygons.map((rp, i) => (
              <g key={i}>
                <polygon points={rp.points} fill={rp.color} fillOpacity={0.12} stroke={rp.color} strokeWidth={2} />
                {rp.markers.map((pt, j) => (
                  <circle key={j} cx={pt.cx} cy={pt.cy} r={3} fill={pt.color}>
                    <title>{pt.title}</title>
                  </circle>
                ))}
              </g>
            ))}
          </svg>
        </div>
      )}

      {chartType !== "radar" && (
        <div className="flex justify-between mt-1 px-0.5">
          {MONTHS.map((m) => (
            <span key={m} className="text-[9px] text-neutral-400">
              {m}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
