import { MONTHS } from "../services/mockData";
import type { MetricMeta } from "../services/mockData";
import { fmtBRLFull, fmtK } from "./format";

export interface BarSegment {
  x: number; y: number; width: number; height: number; color: string;
  labelX: number; labelY: number; valueLabel: string; title: string;
}
export function buildStackedBars(active: MetricMeta[], w: number, h: number): BarSegment[] {
  const padBottom = 24, padTop = 10, plotH = h - padTop - padBottom, n = MONTHS.length, gap = 10;
  const barW = w / n - gap;
  const totals = MONTHS.map((_, i) => active.reduce((sum, m) => sum + m.values[i], 0));
  const max = Math.max(...totals, 1) * 1.15;
  const bars: BarSegment[] = [];
  MONTHS.forEach((mo, i) => {
    let cum = 0;
    const total = totals[i] || 1;
    active.forEach((m) => {
      const val = m.values[i];
      const hgt = (val / max) * plotH;
      const x = i * (w / n) + gap / 2, y = h - padBottom - cum - hgt;
      bars.push({
        x, y, width: barW, height: Math.max(hgt, 0.5), color: m.color,
        labelX: x + barW / 2, labelY: y - 5, valueLabel: fmtBRLFull(val),
        title: `${mo} · ${m.label}: ${fmtK(val)} (${Math.round((val / total) * 100)}% do mês)`,
      });
      cum += hgt;
    });
  });
  return bars;
}

export interface SeriesMarker {
  cx: number; cy: number; labelY: number; color: string; valueLabel: string; title: string;
}
export interface LineSeries {
  color: string;
  points: string;
  markers: SeriesMarker[];
}
export function buildLines(active: MetricMeta[], w: number, h: number): LineSeries[] {
  const padBottom = 24, padTop = 10, plotH = h - padTop - padBottom, n = MONTHS.length;
  const max = Math.max(...active.flatMap((m) => m.values), 1) * 1.15;
  const totals = MONTHS.map((_, i) => active.reduce((s, m) => s + m.values[i], 0));
  return active.map((m) => {
    const pts = m.values.map((v, i) => [i * (w / (n - 1)), h - padBottom - (v / max) * plotH]);
    return {
      color: m.color,
      points: pts.map((p) => p.join(",")).join(" "),
      markers: pts.map(([cx, cy], i) => ({
        cx, cy, labelY: cy - 9, color: m.color, valueLabel: fmtBRLFull(m.values[i]),
        title: `${MONTHS[i]} · ${m.label}: ${fmtK(m.values[i])} (${Math.round((m.values[i] / (totals[i] || 1)) * 100)}% do mês)`,
      })),
    };
  });
}

export interface AreaSeries extends LineSeries {
  path: string;
}
export function buildAreas(active: MetricMeta[], w: number, h: number): AreaSeries[] {
  const padBottom = 24, padTop = 10, plotH = h - padTop - padBottom, n = MONTHS.length, baseline = h - padBottom;
  const max = Math.max(...active.flatMap((m) => m.values), 1) * 1.15;
  const totals = MONTHS.map((_, i) => active.reduce((s, m) => s + m.values[i], 0));
  return active.map((m) => {
    const pts = m.values.map((v, i) => [i * (w / (n - 1)), h - padBottom - (v / max) * plotH]);
    const path = `M0,${baseline} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${pts[pts.length - 1][0]},${baseline} Z`;
    return {
      color: m.color,
      path,
      points: pts.map((p) => p.join(",")).join(" "),
      markers: pts.map(([cx, cy], i) => ({
        cx, cy, labelY: cy - 9, color: m.color, valueLabel: fmtBRLFull(m.values[i]),
        title: `${MONTHS[i]} · ${m.label}: ${fmtK(m.values[i])} (${Math.round((m.values[i] / (totals[i] || 1)) * 100)}% do mês)`,
      })),
    };
  });
}

export interface RadarAxis {
  x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number; label: string;
}
export interface RadarPolygon {
  color: string; points: string; markers: SeriesMarker[];
}
export function buildRadar(active: MetricMeta[]): { axes: RadarAxis[]; polygons: RadarPolygon[] } {
  const size = 320, cx = size / 2, cy = size / 2, radius = size / 2 - 44, n = MONTHS.length;
  const max = Math.max(...active.flatMap((m) => m.values), 1) * 1.15;
  const totals = MONTHS.map((_, i) => active.reduce((s, m) => s + m.values[i], 0));
  const axes: RadarAxis[] = MONTHS.map((mo, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x1: cx, y1: cy, x2: cx + radius * Math.cos(angle), y2: cy + radius * Math.sin(angle),
      labelX: cx + (radius + 16) * Math.cos(angle), labelY: cy + (radius + 16) * Math.sin(angle), label: mo,
    };
  });
  const polygons: RadarPolygon[] = active.map((m) => {
    const pts = m.values.map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2, r = (v / max) * radius;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    return {
      color: m.color,
      points: pts.map((p) => p.join(",")).join(" "),
      markers: pts.map(([mx, my], i) => ({
        cx: mx, cy: my, labelY: my - 9, color: m.color, valueLabel: fmtBRLFull(m.values[i]),
        title: `${MONTHS[i]} · ${m.label}: ${fmtK(m.values[i])} (${Math.round((m.values[i] / (totals[i] || 1)) * 100)}% do mês)`,
      })),
    };
  });
  return { axes, polygons };
}
