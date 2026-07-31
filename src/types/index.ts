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
  // Flag rápida de aceite dos Termos de Uso — checada pelo ProtectedRoute para
  // bloquear o acesso até o aceite explícito (histórico completo em
  // termo_aceite_registros, ver docs/database.md). Só é buscada/relevante
  // para o profile da própria sessão (AuthContext); listagens de outros
  // membros (Usuarios/ChurchDetails) não a preenchem.
  termoAceito?: boolean;
  // Preferência de tema (claro/escuro) persistida em profiles.theme — mesma
  // ressalva do termoAceito acima: só buscada/relevante para o profile da
  // própria sessão (AuthContext), não para listagens de outros membros.
  theme?: "light" | "dark";
}

export type SubscriptionStatus = "active" | "pending_approval" | "expired";

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
  planId: string;
  subscriptionStatus: SubscriptionStatus;
  // Só preenchido em igrejas filhas/subcongregações cadastradas via
  // "Adicionar Igreja Filha" (cadastro rápido, ainda sem login próprio).
  responsibleName: string | null;
}

// Nome técnico (`name`) usado no banco/regras de negócio (ex.: seleção do
// plano Free no autocadastro); `displayName` é o rótulo comercial exibido na UI.
export type PlanName = "free" | "pro" | "unlimited";

export interface Plan {
  id: string;
  name: PlanName;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  maxAiReads: number;
  maxCsvRowsDaily: number;
  maxChurches: number;
  maxPdfDownloads: number;
}

export interface UsageCounter {
  churchId: string;
  monthYear: string;
  aiReadsCount: number;
  pdfDownloadsCount: number;
}

export type BillingCycle = "monthly" | "yearly";
export type PaymentRequestStatus = "pending" | "approved" | "rejected";

export interface PaymentRequest {
  id: string;
  churchId: string;
  churchName: string;
  userId: string;
  userName: string;
  planId: string;
  planDisplayName: string;
  billingCycle: BillingCycle;
  status: PaymentRequestStatus;
  createdAt: string;
}

export type AuditActionKey =
  | "categorizacao_ia"
  | "edicao_manual"
  | "aprovacao_caixa"
  | "estorno"
  | "acesso"
  | "aceite_termos";

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
  // Só preenchido quando quem carrega o log é o Master (visão global entre
  // igrejas, "Todas as Igrejas") — para os demais papéis a igreja é sempre
  // implicitamente a própria.
  churchName?: string | null;
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

export type CategorizationMode = "ai" | "strict";

// Regra de mapeamento (De-Para): palavra-chave (fornecedor/descrição) →
// categoria, salva por igreja para reaproveitar em importações futuras.
export interface CategoryRule {
  id: string;
  keyword: string;
  type: TransactionType;
  category: string;
  createdAt: string;
}
