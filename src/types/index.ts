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

// "master" é o Admin Master da SaaS (acesso irrestrito a todas as igrejas) —
// nunca selecionável em nenhum formulário/fluxo do app, só atribuído por
// alteração direta no banco. ASSIGNABLE_ROLES é o que a UI deve sempre usar
// para popular selects de perfil de acesso.
export type UserRole = "master" | "Admin" | "Tesoureiro" | "Auditor" | "Conselho Fiscal";
export const ASSIGNABLE_ROLES: Exclude<UserRole, "master">[] = [
  "Admin",
  "Tesoureiro",
  "Auditor",
  "Conselho Fiscal",
];
export type UserStatus = "Ativo" | "Inativo" | "Convite Pendente";

export interface ChurchUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastAccess: string;
  cpf?: string | null;
  churchId?: string | null;
  // Só preenchido quando quem carrega a lista é o Master (visão global entre
  // igrejas) — para os demais papéis a igreja é sempre implicitamente a própria.
  churchName?: string | null;
}

export interface Church {
  id: string;
  name: string;
  email: string | null;
  cnpj: string | null;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  parentChurchId: string | null;
  isActive: boolean;
  createdAt: string;
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
