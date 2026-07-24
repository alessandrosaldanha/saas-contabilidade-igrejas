// Constantes e mapeamentos compartilhados de exibição (labels, cores) para dados
// que hoje já vêm reais do Supabase (transactions, audit_logs).
import type { AuditActionKey } from "../types";

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const CATEGORY_TONE: Record<string, "success" | "purple" | "info" | "warning" | "neutral"> = {
  "Dízimos e Ofertas": "success",
  "Prebenda Pastoral": "purple",
  "Manutenção do Templo": "info",
  "Ação Social": "warning",
  "Contas e Utilidades": "neutral",
  "Administrativo": "neutral",
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
};
export const AUDIT_PAGE_SIZE = 15;

// ── Dashboard — série mensal por métrica (para gráfico exploratório) ──
export interface MetricMeta {
  id: string;
  label: string;
  color: string;
  values: number[];
}
