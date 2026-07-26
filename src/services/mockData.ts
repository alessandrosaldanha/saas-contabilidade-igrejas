// Constantes e mapeamentos compartilhados de exibição (labels, cores) para dados
// que hoje já vêm reais do Supabase (transactions, audit_logs).
import type { AuditActionKey } from "../types";

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const CATEGORY_TONE: Record<string, "success" | "purple" | "info" | "warning" | "neutral"> = {
  // Entradas
  "Dízimos": "success",
  "Ofertas Gerais": "success",
  "Ofertas Especiais/Missões": "purple",
  "Campanhas/Eventos": "info",
  "Outras Entradas": "neutral",
  // Saídas
  "Sustento Pastoral / Prebenda": "purple",
  "Utilidades (Água, Luz, Internet)": "neutral",
  "Manutenção de Templo": "info",
  "Ação Social / Auxílio": "warning",
  "Material de Escola Dominical / Departamentos": "info",
  "Eventos / Conferências": "info",
  "Taxas Bancárias / Impostos": "warning",
  "Despesas Administrativas": "neutral",
};

export const CONF_TONE: Record<string, "success" | "warning" | "error"> = {
  alta: "success",
  media: "warning",
  baixa: "error",
};
export const CONF_LABEL: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export const ACTION_TYPES: Record<AuditActionKey, { label: string; tone: "info" | "success" | "error" | "purple" }> = {
  categorizacao_ia: { label: "Categorização IA", tone: "info" },
  edicao_manual: { label: "Edição Manual", tone: "info" },
  aprovacao_caixa: { label: "Aprovação de Caixa", tone: "success" },
  estorno: { label: "Estorno/Exclusão", tone: "error" },
  acesso: { label: "Acesso/Login", tone: "purple" },
  aceite_termos: { label: "Aceite dos Termos de Uso", tone: "success" },
};
export const AUDIT_PAGE_SIZE = 15;

// ── Dashboard — série mensal por métrica (para gráfico exploratório) ──
export interface MetricMeta {
  id: string;
  label: string;
  color: string;
  values: number[];
}
