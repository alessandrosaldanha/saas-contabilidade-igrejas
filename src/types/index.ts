export type TransactionType = "entrada" | "saida";
export type Confidence = "alta" | "media" | "baixa";

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  value: number;
  type: TransactionType;
  category: string;
  confidence: Confidence;
  createdBy: string;
}

export interface LedgerRow extends Transaction {
  balance: number;
}

export type UserRole = "Admin" | "Tesoureiro" | "Auditor" | "Conselho Fiscal";
export type UserStatus = "Ativo" | "Inativo" | "Convite Pendente";

export interface ChurchUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastAccess: string;
}

export type AuditActionKey =
  | "categorizacao_ia"
  | "edicao_manual"
  | "aprovacao_caixa"
  | "estorno"
  | "acesso";

export interface AuditLog {
  id: string;
  day: number;
  time: string;
  sortKey: number;
  datetime: string;
  user: string;
  role: string;
  actionKey: AuditActionKey;
  actionLabel: string;
  before: string;
  after: string;
  ip: string;
  device: string;
}

export interface ChatMessage {
  id: number;
  from: "ai" | "user";
  text: string;
}

export interface ImportHistoryItem {
  id: string;
  filename: string;
  monthLabel: string;
  count: number;
  importedAt: string;
  importedBy: string;
}
