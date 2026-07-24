// Camada de dados mock — simula as respostas que futuramente virão do Supabase
// (tabelas transactions/audit_logs/users) e da API do Gemini (categorização).
// Ao integrar o backend real, substitua as implementações abaixo mantendo a mesma
// assinatura de exports para não quebrar os componentes que os consomem.
import type {
  Transaction,
  AuditLog,
  AuditActionKey,
  ChatMessage,
  ImportHistoryItem,
} from "../types";

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

const PEOPLE = ["Ana Ferreira", "Roberto Alves", "Carlos Mendes"];

// Gerador pseudo-aleatório determinístico (mesma semente => mesmo resultado)
function seedRand(seed: number): number {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

export function genMonthTransactions(monthIdx: number): Transaction[] {
  const count = 5 + Math.floor(seedRand(monthIdx + 1) * 3);
  const list: Transaction[] = [];
  const categories = ["Prebenda Pastoral", "Manutenção do Templo", "Ação Social", "Contas e Utilidades", "Administrativo"];
  for (let i = 0; i < count; i++) {
    const seed = (monthIdx + 1) * 100 + i;
    const day = 3 + Math.floor(seedRand(seed) * 24);
    const isEntrada = seedRand(seed + 0.5) > 0.45;
    const cat = isEntrada ? "Dízimos e Ofertas" : categories[Math.floor(seedRand(seed + 0.7) * categories.length)];
    const value = Math.round(300 + seedRand(seed + 0.3) * 3500) * (isEntrada ? 1 : -1);
    list.push({
      id: `g-${monthIdx}-${i}`,
      date: `${String(day).padStart(2, "0")}/${String(monthIdx + 1).padStart(2, "0")}/2026`,
      desc: isEntrada ? "PIX/TED — Dízimos e Ofertas" : `Pagamento — ${cat}`,
      value,
      type: isEntrada ? "entrada" : "saida",
      category: isEntrada ? "Dízimos e Ofertas" : cat,
      confidence: "alta",
      createdBy: PEOPLE[i % PEOPLE.length],
    });
  }
  return list.sort((a, b) => parseInt(a.date.slice(0, 2), 10) - parseInt(b.date.slice(0, 2), 10));
}

export const LEDGER_BASE_OPENING = 40000;

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "t1", date: "03/07/2026", desc: "PIX RECEBIDO - DÍZIMO JOÃO SILVA", value: 850.0, type: "entrada", category: "Dízimos e Ofertas", confidence: "alta", createdBy: "Ana Ferreira" },
  { id: "t2", date: "05/07/2026", desc: "TED - AJUDA MENSAL MEMBRO", value: 1200.0, type: "entrada", category: "Dízimos e Ofertas", confidence: "alta", createdBy: "Ana Ferreira" },
  { id: "lm1", date: "07/07/2026", desc: "LEROY MERLIN MATERIAIS LTDA", value: -430.5, type: "saida", category: "Administrativo", confidence: "baixa", createdBy: "Roberto Alves" },
  { id: "t4", date: "09/07/2026", desc: "ENERGISA DISTRIBUIDORA", value: -215.9, type: "saida", category: "Contas e Utilidades", confidence: "alta", createdBy: "Ana Ferreira" },
  { id: "t5", date: "12/07/2026", desc: "REPASSE PRÓ-LABORE PASTOR", value: -4500.0, type: "saida", category: "Prebenda Pastoral", confidence: "alta", createdBy: "Carlos Mendes" },
  { id: "lm2", date: "14/07/2026", desc: "LEROY MERLIN MATERIAIS LTDA", value: -128.0, type: "saida", category: "Administrativo", confidence: "baixa", createdBy: "Roberto Alves" },
  { id: "t7", date: "18/07/2026", desc: "DOAÇÃO CESTAS BÁSICAS - AÇÃO SOCIAL", value: -900.0, type: "saida", category: "Ação Social", confidence: "media", createdBy: "Ana Ferreira" },
  { id: "t8", date: "20/07/2026", desc: "OFERTA CULTO DOMINGO", value: 2340.0, type: "entrada", category: "Dízimos e Ofertas", confidence: "alta", createdBy: "Ana Ferreira" },
];

export function monthTransactions(monthIdx: number, currentMonthTx: Transaction[]): Transaction[] {
  return monthIdx === CURRENT_MONTH_INDEX ? currentMonthTx : genMonthTransactions(monthIdx);
}

export function computeLedger(monthIdx: number, currentMonthTx: Transaction[]) {
  let opening = LEDGER_BASE_OPENING;
  for (let m = 0; m < monthIdx; m++) {
    opening += monthTransactions(m, currentMonthTx).reduce((sum, t) => sum + t.value, 0);
  }
  const txs = monthTransactions(monthIdx, currentMonthTx);
  let balance = opening;
  const rows = txs.map((t) => {
    balance += t.value;
    return { ...t, balance };
  });
  const entradasTotal = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const saidasTotal = txs.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);
  return { rows, opening, entradasTotal, saidasTotal, saldoFinal: opening + entradasTotal + saidasTotal };
}

export const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    from: "ai",
    text: 'Olá! Encontrei 8 lançamentos no extrato. Posso ajustar categorias — é só me dizer em linguagem natural, por exemplo: "ajuste as saídas da Leroy Merlin para Manutenção do Templo".',
  },
];

export const DEFAULT_IMPORT_HISTORY: ImportHistoryItem[] = [
  { id: 1, filename: "extrato_junho_2026.ofx", monthLabel: "Junho de 2026", count: 6, importedAt: "05/07/2026", importedBy: "Ana Ferreira" },
  { id: 2, filename: "extrato_maio_2026.pdf", monthLabel: "Maio de 2026", count: 7, importedAt: "03/06/2026", importedBy: "Roberto Alves" },
];

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
export const METRICS_META: MetricMeta[] = [
  { id: "entradas", label: "Entradas Totais", color: "#198f51", values: [78, 82, 75, 90, 95, 88, 101, 97, 105, 110, 102, 128] },
  { id: "saidas", label: "Saídas Totais", color: "#d4453b", values: [60, 64, 58, 70, 73, 68, 75, 80, 78, 85, 90, 94] },
  { id: "prebenda", label: "Prebenda Pastoral", color: "#de7d02", values: [30, 32, 30, 34, 33, 35, 36, 34, 38, 40, 37, 42] },
  { id: "manutencao", label: "Manutenção do Templo", color: "#0057ff", values: [8, 10, 9, 14, 12, 11, 16, 13, 15, 18, 14, 20] },
  { id: "acaosocial", label: "Ação Social", color: "#7c3aed", values: [6, 7, 6, 8, 9, 8, 10, 9, 11, 10, 9, 12] },
  { id: "contas", label: "Contas/Utilidades", color: "#6f9bff", values: [5, 5, 6, 6, 5, 6, 6, 7, 6, 7, 6, 8] },
  { id: "administrativo", label: "Administrativo", color: "#aeaeb2", values: [4, 4, 4, 5, 4, 5, 5, 5, 5, 6, 5, 6] },
];

export const DASHBOARD_ENTRADAS = [78, 82, 75, 90, 95, 88, 101, 97, 105, 110, 102, 128];
export const DASHBOARD_SAIDAS = [60, 64, 58, 70, 73, 68, 75, 80, 78, 85, 90, 94];

export const DONUT_DATA = [
  { name: "Prebenda Pastoral", pct: 34, color: "#ff5e40" },
  { name: "Manutenção do Templo", pct: 28, color: "#0057ff" },
  { name: "Ação Social", pct: 18, color: "#198f51" },
  { name: "Contas e Utilidades", pct: 12, color: "#de7d02" },
  { name: "Administrativo", pct: 8, color: "#7c3aed" },
];
