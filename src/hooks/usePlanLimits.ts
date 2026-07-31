import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import type { Plan, UsageCounter } from "../types";

function currentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mapPlanRow(row: {
  id: string;
  name: Plan["name"];
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_ai_reads: number;
  max_csv_rows_daily: number;
  max_churches: number;
  max_pdf_downloads: number;
}): Plan {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    priceMonthly: row.price_monthly,
    priceYearly: row.price_yearly,
    maxAiReads: row.max_ai_reads,
    maxCsvRowsDaily: row.max_csv_rows_daily,
    maxChurches: row.max_churches,
    maxPdfDownloads: row.max_pdf_downloads,
  };
}

const EMPTY_USAGE: Omit<UsageCounter, "churchId" | "monthYear"> = { aiReadsCount: 0, pdfDownloadsCount: 0 };

// Consulta o plano da igreja ativa + o uso do mês corrente, e expõe os
// limites já resolvidos (canUseAI/canDownloadPDF/canAddChurch) — usado nos
// pontos de bloqueio (Importação IA, Exportar PDF) e na tela de Planos.
export function usePlanLimits(churchId: string | null) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState(EMPTY_USAGE);
  const [childChurchesCount, setChildChurchesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!churchId) {
      setPlan(null);
      setUsage(EMPTY_USAGE);
      setChildChurchesCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const monthYear = currentMonthYear();
    const [{ data: churchRow }, { data: usageRow }, { count: childCount }] = await Promise.all([
      supabase.from("churches").select("plan:plans(*)").eq("id", churchId).single(),
      supabase
        .from("usage_counters")
        .select("ai_reads_count, pdf_downloads_count")
        .eq("church_id", churchId)
        .eq("month_year", monthYear)
        .maybeSingle(),
      supabase.from("churches").select("id", { count: "exact", head: true }).eq("parent_church_id", churchId),
    ]);

    const planRow = (churchRow as unknown as { plan: Parameters<typeof mapPlanRow>[0] | null } | null)?.plan ?? null;
    setPlan(planRow ? mapPlanRow(planRow) : null);
    setUsage({
      aiReadsCount: usageRow?.ai_reads_count ?? 0,
      pdfDownloadsCount: usageRow?.pdf_downloads_count ?? 0,
    });
    setChildChurchesCount(childCount ?? 0);
    setLoading(false);
  }, [churchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canUseAI = useCallback(() => !plan || usage.aiReadsCount < plan.maxAiReads, [plan, usage.aiReadsCount]);
  const canDownloadPDF = useCallback(
    () => !plan || usage.pdfDownloadsCount < plan.maxPdfDownloads,
    [plan, usage.pdfDownloadsCount],
  );
  const canAddChurch = useCallback(
    () => !plan || childChurchesCount + 1 < plan.maxChurches,
    [plan, childChurchesCount],
  );

  const registerAIUsage = useCallback(async () => {
    if (!churchId) return;
    await supabase.rpc("increment_usage_counter", { p_church_id: churchId, p_counter: "ai_reads" });
    setUsage((u) => ({ ...u, aiReadsCount: u.aiReadsCount + 1 }));
  }, [churchId]);

  const registerPDFUsage = useCallback(async () => {
    if (!churchId) return;
    await supabase.rpc("increment_usage_counter", { p_church_id: churchId, p_counter: "pdf_downloads" });
    setUsage((u) => ({ ...u, pdfDownloadsCount: u.pdfDownloadsCount + 1 }));
  }, [churchId]);

  return { plan, usage, loading, refresh, canUseAI, canDownloadPDF, canAddChurch, registerAIUsage, registerPDFUsage };
}
