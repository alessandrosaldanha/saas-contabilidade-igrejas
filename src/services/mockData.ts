// Camada de dados mock — simula as respostas que futuramente virão do Supabase
// (tabelas transactions/audit_logs/users) e da API do Gemini (categorização).
// Ao integrar o backend real, substitua as implementações abaixo mantendo a mesma
// assinatura de exports para não quebrar os componentes que os consomem.
import type { AuditLog, AuditActionKey } from "../types";

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const CURRENT_MONTH_INDEX = 6; // Julho/2026 — mês "atual" simulado

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

// Gerador pseudo-aleatório determinístico (mesma semente => mesmo resultado)
function seedRand(seed: number): number {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

// ── Auditoria ──────────────────────────────────────────────────────
const AUDIT_USERS = [
  { name: "Carlos Mendes", role: "Admin" },
  { name: "Ana Ferreira", role: "Tesoureiro" },
  { name: "Roberto Alves", role: "Tesoureiro" },
  { name: "Marta Souza", role: "Auditor" },
  { name: "Pedro Lima", role: "Auditor" },
];
export const ACTION_TYPES: Record<AuditActionKey, { label: string; tone: "info" | "success" | "error" | "purple" }> = {
  categorizacao_ia: { label: "Categorização IA", tone: "info" },
  edicao_manual: { label: "Edição Manual", tone: "info" },
  aprovacao_caixa: { label: "Aprovação de Caixa", tone: "success" },
  estorno: { label: "Estorno/Exclusão", tone: "error" },
  acesso: { label: "Acesso/Login", tone: "purple" },
};
const AUDIT_DETAILS: Record<AuditActionKey, Array<{ before: string; after: string }>> = {
  categorizacao_ia: [
    { before: "Administrativo", after: "Manutenção do Templo" },
    { before: "Sem categoria", after: "Ação Social" },
    { before: "Contas e Utilidades", after: "Prebenda Pastoral" },
  ],
  edicao_manual: [
    { before: "R$ 430,50", after: "R$ 450,00" },
    { before: "Pagamento", after: "Pagamento Fornecedor" },
  ],
  aprovacao_caixa: [
    { before: "Pendente", after: "Aprovado" },
    { before: "Bloqueado", after: "Liberado" },
  ],
  estorno: [
    { before: "Lançamento ativo", after: "Estornado" },
    { before: "Registro salvo", after: "Excluído" },
  ],
  acesso: [
    { before: "—", after: "Login realizado" },
    { before: "Sessão ativa", after: "Logout" },
  ],
};
const AUDIT_DEVICES = ["Chrome · Windows", "Safari · macOS", "Chrome · Android", "Firefox · Windows"];
const pad2 = (n: number) => String(n).padStart(2, "0");

export function genMonthAuditLogs(monthIdx: number): AuditLog[] {
  const seedBase = monthIdx * 7 + 3;
  const count = 15 + Math.floor(seedRand(seedBase) * 10);
  const keys = Object.keys(ACTION_TYPES) as AuditActionKey[];
  const list: AuditLog[] = [];
  for (let i = 0; i < count; i++) {
    const seed = seedBase * 50 + i;
    const day = 1 + Math.floor(seedRand(seed) * 28);
    const hh = Math.floor(seedRand(seed + 0.1) * 24);
    const mm = Math.floor(seedRand(seed + 0.2) * 60);
    const ss = Math.floor(seedRand(seed + 0.3) * 60);
    const actionKey = keys[Math.floor(seedRand(seed + 0.4) * keys.length)];
    const user = AUDIT_USERS[Math.floor(seedRand(seed + 0.5) * AUDIT_USERS.length)];
    const details = AUDIT_DETAILS[actionKey];
    const detail = details[Math.floor(seedRand(seed + 0.6) * details.length)];
    list.push({
      id: `${monthIdx}-${i}`,
      day,
      time: `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`,
      sortKey: day * 86400 + hh * 3600 + mm * 60 + ss,
      datetime: `${pad2(day)}/${pad2(monthIdx + 1)}/2026 ${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`,
      user: user.name,
      role: user.role,
      actionKey,
      actionLabel: ACTION_TYPES[actionKey].label,
      before: detail.before,
      after: detail.after,
      ip: `192.168.${1 + Math.floor(seedRand(seed + 0.7) * 20)}.${1 + Math.floor(seedRand(seed + 0.8) * 250)}`,
      device: AUDIT_DEVICES[Math.floor(seedRand(seed + 0.9) * AUDIT_DEVICES.length)],
    });
  }
  return list.sort((a, b) => b.sortKey - a.sortKey);
}
export const AUDIT_PAGE_SIZE = 15;

// ── Dashboard — série mensal por métrica (para gráfico exploratório) ──
export interface MetricMeta {
  id: string;
  label: string;
  color: string;
  values: number[];
}
