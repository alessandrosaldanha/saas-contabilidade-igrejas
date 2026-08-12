import type { ImportFormat, Plan, PublicPlan } from "../types";

// Sentinela de "ilimitado" nos limites numéricos de um plano (max_ai_reads,
// max_pdf_downloads, max_child_churches) — evita valores mágicos como
// 999999 espalhados pelo front.
export const UNLIMITED = -1;
export const isUnlimited = (value: number): boolean => value === UNLIMITED;

export interface PlanRow {
  id: string;
  name: Plan["name"];
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_ai_reads: number;
  max_csv_rows_daily: number;
  max_child_churches: number;
  max_pdf_downloads: number;
  allowed_import_formats: ImportFormat[];
  allow_strict_mode: boolean;
  features: string[];
  bank_name: string | null;
  account_holder: string | null;
  account_document: string | null;
  pix_key: string | null;
  pix_qr_code_url: string | null;
}

// Único mapeamento snake_case (banco) → camelCase (front) de um plano —
// reaproveitado por usePlanLimits, PricingPlans e Governança (antes
// triplicado em cada arquivo).
export function mapPlanRow(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    priceMonthly: row.price_monthly,
    priceYearly: row.price_yearly,
    maxAiReads: row.max_ai_reads,
    maxCsvRowsDaily: row.max_csv_rows_daily,
    maxChildChurches: row.max_child_churches,
    maxPdfDownloads: row.max_pdf_downloads,
    allowedImportFormats: row.allowed_import_formats,
    allowStrictMode: row.allow_strict_mode,
    features: row.features,
    bankName: row.bank_name,
    accountHolder: row.account_holder,
    accountDocument: row.account_document,
    pixKey: row.pix_key,
    pixQrCodeUrl: row.pix_qr_code_url,
  };
}

export interface PublicPlanRow {
  id: string;
  name: Plan["name"];
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_ai_reads: number;
  max_csv_rows_daily: number;
  max_child_churches: number;
  max_pdf_downloads: number;
  allowed_import_formats: ImportFormat[];
  allow_strict_mode: boolean;
  features: string[];
}

// Mapeamento da RPC pública `get_public_plans()` (sem dados bancários/Pix) —
// usada pela landing (fora de autenticação), reaproveitando o mesmo shape
// camelCase de mapPlanRow pros cards de plano ficarem visualmente idênticos.
export function mapPublicPlanRow(row: PublicPlanRow): PublicPlan {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    priceMonthly: row.price_monthly,
    priceYearly: row.price_yearly,
    maxAiReads: row.max_ai_reads,
    maxCsvRowsDaily: row.max_csv_rows_daily,
    maxChildChurches: row.max_child_churches,
    maxPdfDownloads: row.max_pdf_downloads,
    allowedImportFormats: row.allowed_import_formats,
    allowStrictMode: row.allow_strict_mode,
    features: row.features,
  };
}
