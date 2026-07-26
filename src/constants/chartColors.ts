// Paleta fixa de cores usada em TODOS os gráficos do sistema (Dashboard e
// Análise Exploratória) — fonte única para que o mesmo fluxo/categoria tenha
// sempre a mesma cor em qualquer gráfico (linha, área, barra, radar ou donut).
// Espelha os tokens `flow.*` do tailwind.config.js (mesmos valores em hex,
// porque gráficos SVG usam `stroke`/`fill` inline e não podem consumir
// classes Tailwind diretamente).
import { SAIDA_CATEGORIES } from "./accountingCategories";

export const FLOW_COLORS = {
  entrada: "#10b981", // emerald-500 — padrão financeiro clássico para entradas
  saida: "#ef4444", // red-500 — padrão financeiro clássico para saídas
} as const;

// Uma cor fixa e distinta por categoria de saída — mantém o significado visual
// (ex.: "Manutenção de Templo" é sempre azul) consistente em todo o app.
// Só cobre categorias de saída porque hoje só existe breakdown por categoria
// para saídas (Dashboard "Saídas por Categoria"); se um breakdown de entradas
// for adicionado no futuro, as cores de ENTRADA_CATEGORIES entram aqui também.
const SAIDA_CATEGORY_COLORS: Record<string, string> = {
  "Sustento Pastoral / Prebenda": "#f97316", // orange-500
  "Utilidades (Água, Luz, Internet)": "#eab308", // yellow-500
  "Manutenção de Templo": "#3b82f6", // blue-500
  "Ação Social / Auxílio": "#a855f7", // purple-500
  "Material de Escola Dominical / Departamentos": "#ec4899", // pink-500
  "Eventos / Conferências": "#14b8a6", // teal-500
  "Taxas Bancárias / Impostos": "#64748b", // slate-500
  "Despesas Administrativas": "#78716c", // stone-500
};

const FALLBACK_CATEGORY_COLOR = "#9ca3af"; // gray-400 — categoria fora da taxonomia padrão

export function colorForCategory(category: string): string {
  return SAIDA_CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR;
}

// Lista ordenada (mesma ordem de exibição em toda a UI) de categorias de saída
// com sua cor fixa — usada para construir as séries do gráfico exploratório.
export const SAIDA_CATEGORIES_WITH_COLOR = SAIDA_CATEGORIES.map((label) => ({
  label,
  color: colorForCategory(label),
}));
