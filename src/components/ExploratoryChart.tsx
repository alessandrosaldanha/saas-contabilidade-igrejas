import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { MetricMeta } from "../services/mockData";
import { buildStackedBars, buildLines, buildAreas, buildRadar } from "../utils/chartBuilders";
import Card from "./Card";

type ChartType = "bars" | "lines" | "area" | "radar";

const CHART_TABS: Array<{ id: ChartType; label: string }> = [
  { id: "bars", label: "Barras" },
  { id: "lines", label: "Linhas" },
  { id: "area", label: "Área" },
  { id: "radar", label: "Radar" },
];

interface ExploratoryChartProps {
  metrics: MetricMeta[];
  labels: string[];
}

export default function ExploratoryChart({ metrics, labels }: ExploratoryChartProps) {
  const [chartType, setChartType] = useState<ChartType>("lines");
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(() => new Set(metrics.map((m) => m.id)));

  // Quando a lista de métricas muda (ex.: troca de período), mantém a seleção
  // já feita para os ids que continuam existindo, adiciona os novos como
  // selecionados por padrão e descarta ids que não existem mais.
  useEffect(() => {
    setSelectedSeries((prev) => {
      const metricIds = new Set(metrics.map((m) => m.id));
      const next = new Set<string>();
      let changed = false;
      for (const id of metricIds) {
        if (prev.has(id)) next.add(id);
        else {
          next.add(id);
          changed = true;
        }
      }
      if (next.size !== prev.size) changed = true;
      return changed ? next : prev;
    });
  }, [metrics]);

  // Toggle independente: cada pílula liga/desliga só a própria série, sem
  // afetar as demais — permite combinar livremente qualquer conjunto de séries.
  const toggleSeries = (id: string) => {
    setSelectedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedSeries(new Set(metrics.map((m) => m.id)));
  const clearAll = () => setSelectedSeries(new Set());

  const active = useMemo(() => metrics.filter((m) => selectedSeries.has(m.id)), [selectedSeries, metrics]);
  const hasData = useMemo(() => active.some((m) => m.values.some((v) => v > 0)), [active]);

  const bars = useMemo(() => (chartType === "bars" ? buildStackedBars(active, labels, 880, 260) : []), [active, labels, chartType]);
  const lines = useMemo(() => (chartType === "lines" ? buildLines(active, labels, 880, 260) : []), [active, labels, chartType]);
  const areas = useMemo(() => (chartType === "area" ? buildAreas(active, labels, 880, 260) : []), [active, labels, chartType]);
  const radar = useMemo(() => (chartType === "radar" ? buildRadar(active, labels) : null), [active, labels, chartType]);

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <h3 className="font-display font-semibold text-base m-0">Análise Exploratória de Fluxos e Categorias</h3>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-md border border-neutral-300 dark:border-white/10">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChartType(tab.id)}
              className={`border-none px-3.5 py-1.5 rounded-sm text-xs font-medium cursor-pointer transition-colors ${
                chartType === tab.id ? "bg-orla-blue text-white" : "bg-transparent text-neutral-700 dark:text-neutral-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] text-neutral-700 dark:text-neutral-400 mr-1">Clique para ligar/desligar uma série:</span>
        {metrics.map((m) => {
          const isActive = selectedSeries.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleSeries(m.id)}
              title="Clique para ligar/desligar esta série (combine quantas quiser)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-neutral-100 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-400 border-neutral-300 dark:border-white/20"
              }`}
              style={isActive ? { backgroundColor: m.color } : undefined}
            >
              {isActive && <Check size={11} strokeWidth={3} />}
              {m.label}
            </button>
          );
        })}

        <span className="w-px self-stretch bg-neutral-200 dark:bg-white/10 mx-1" />

        <button
          onClick={selectAll}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          Selecionar Todas
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 rounded-full text-xs font-medium border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          Limpar Seleção
        </button>
      </div>

      {!hasData && (
        <div className="py-10 text-center text-sm text-neutral-700 dark:text-neutral-400">
          {selectedSeries.size === 0
            ? "Nenhuma série selecionada — clique em uma pílula acima para exibir o gráfico."
            : "Sem lançamentos suficientes neste período para exibir o gráfico."}
        </div>
      )}

      {hasData && chartType === "bars" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block overflow-visible">
          {bars.map((bar, i) => (
            <g key={i}>
              <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.color} rx={2}>
                <title>{bar.title}</title>
              </rect>
              {bar.showLabel && (
                <text x={bar.labelX} y={bar.labelY} textAnchor="middle" fontSize={9} fontWeight={600} fill="currentColor" className="text-neutral-700 dark:text-neutral-300 pointer-events-none">
                  {bar.valueLabel}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hasData && chartType === "lines" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block overflow-visible">
          {lines.map((ln, i) => (
            <g key={i}>
              <polyline points={ln.points} fill="none" stroke={ln.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {ln.markers.map((pt, j) => (
                <g key={j}>
                  <circle cx={pt.cx} cy={pt.cy} r={3.5} fill={pt.color}>
                    <title>{pt.title}</title>
                  </circle>
                  {pt.showLabel && (
                    <text x={pt.cx} y={pt.labelY} textAnchor="middle" fontSize={9} fontWeight={600} fill={pt.color} className="pointer-events-none">
                      {pt.valueLabel}
                    </text>
                  )}
                </g>
              ))}
            </g>
          ))}
        </svg>
      )}
      {hasData && chartType === "area" && (
        <svg viewBox="0 0 880 260" className="w-full h-[260px] block overflow-visible">
          {areas.map((ar, i) => (
            <g key={i}>
              <path d={ar.path} fill={ar.color} fillOpacity={0.18} stroke="none" />
              <polyline points={ar.points} fill="none" stroke={ar.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {ar.markers.map((pt, j) => (
                <g key={j}>
                  <circle cx={pt.cx} cy={pt.cy} r={3} fill={pt.color}>
                    <title>{pt.title}</title>
                  </circle>
                  {pt.showLabel && (
                    <text x={pt.cx} y={pt.labelY} textAnchor="middle" fontSize={9} fontWeight={600} fill={pt.color} className="pointer-events-none">
                      {pt.valueLabel}
                    </text>
                  )}
                </g>
              ))}
            </g>
          ))}
        </svg>
      )}
      {hasData && chartType === "radar" && radar && (
        <div className="flex justify-center">
          <svg viewBox="0 0 320 320" className="w-[320px] h-[320px] block overflow-visible">
            {radar.axes.map((ax, i) => (
              <g key={i}>
                <line x1={ax.x1} y1={ax.y1} x2={ax.x2} y2={ax.y2} stroke="currentColor" className="text-neutral-200 dark:text-white/10" strokeWidth={1} />
                <text x={ax.labelX} y={ax.labelY} fill="currentColor" className="text-neutral-700 dark:text-neutral-400" fontSize={9} textAnchor="middle">
                  {ax.label}
                </text>
              </g>
            ))}
            {radar.polygons.map((rp, i) => (
              <g key={i}>
                <polygon points={rp.points} fill={rp.color} fillOpacity={0.12} stroke={rp.color} strokeWidth={2} />
                {rp.markers.map((pt, j) => (
                  <g key={j}>
                    <circle cx={pt.cx} cy={pt.cy} r={3} fill={pt.color}>
                      <title>{pt.title}</title>
                    </circle>
                    {pt.showLabel && (
                      <text x={pt.cx} y={pt.labelY} textAnchor="middle" fontSize={8} fontWeight={600} fill={pt.color} className="pointer-events-none">
                        {pt.valueLabel}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </div>
      )}

      {hasData && chartType !== "radar" && (
        <div className="flex justify-between mt-1 px-0.5">
          {labels.map((label) => (
            <span key={label} className="text-[9px] text-neutral-700 dark:text-neutral-400">
              {label}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
