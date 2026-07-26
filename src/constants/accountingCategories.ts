// Fonte única das categorias contábeis padrão de contabilidade de igreja.
// Também replicadas (não importadas — runtime Deno separado, sem bundler
// compartilhado) em supabase/functions/parse-statement/index.ts; qualquer
// mudança aqui deve ser espelhada lá.
import type { TransactionType } from "../types";

export const ENTRADA_CATEGORIES = [
  "Dízimos",
  "Ofertas Gerais",
  "Ofertas Especiais/Missões",
  "Campanhas/Eventos",
  "Outras Entradas",
];

export const SAIDA_CATEGORIES = [
  "Sustento Pastoral / Prebenda",
  "Utilidades (Água, Luz, Internet)",
  "Manutenção de Templo",
  "Ação Social / Auxílio",
  "Material de Escola Dominical / Departamentos",
  "Eventos / Conferências",
  "Taxas Bancárias / Impostos",
  "Despesas Administrativas",
];

export const ALL_CATEGORIES = [...ENTRADA_CATEGORIES, ...SAIDA_CATEGORIES];

export function categoriesForType(type: TransactionType): string[] {
  return type === "entrada" ? ENTRADA_CATEGORIES : SAIDA_CATEGORIES;
}
