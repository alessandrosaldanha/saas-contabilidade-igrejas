import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import PixPaymentModal from "./PixPaymentModal";
import Badge from "./Badge";
import { supabase } from "../services/supabase";
import { fmtPlain } from "../utils/format";
import type { BillingCycle, Plan } from "../types";

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

function planFeatures(plan: Plan): string[] {
  const aiFeature =
    plan.maxAiReads <= 0 ? "Sem leitura por IA (importação manual)" : `${plan.maxAiReads} leituras de IA por mês`;
  const pdfFeature = `${plan.maxPdfDownloads >= 999999 ? "PDFs ilimitados" : `${plan.maxPdfDownloads} PDFs/mês`}`;
  const churchFeature = plan.maxChurches > 1 ? `Até ${plan.maxChurches} igrejas (multi-igreja)` : "1 igreja";
  return [aiFeature, "Importação de extrato via CSV", pdfFeature, churchFeature];
}

interface PricingPlansProps {
  churchId: string | null;
  onChanged?: () => void;
}

// Núcleo compartilhado por /planos (página cheia) e PricingModal (overlay de
// bloqueio) — toggle Mensal/Anual + 3 cards + fluxo de checkout Pix.
export default function PricingPlans({ churchId, onChanged }: PricingPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [checkoutTarget, setCheckoutTarget] = useState<Plan | null>(null);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .order("price_monthly")
      .then(({ data }) => {
        if (data) setPlans(data.map(mapPlanRow));
      });
  }, []);

  useEffect(() => {
    if (!churchId) {
      setCurrentPlanId(null);
      setChurchName("");
      return;
    }
    supabase
      .from("churches")
      .select("name, plan_id")
      .eq("id", churchId)
      .single()
      .then(({ data }) => {
        setCurrentPlanId(data?.plan_id ?? null);
        setChurchName(data?.name ?? "");
      });
  }, [churchId]);

  return (
    <div>
      <div className="flex items-center justify-center gap-1 mb-8 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-md p-1 w-fit mx-auto">
        <button
          onClick={() => setCycle("monthly")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium ${
            cycle === "monthly" ? "bg-orla-blue text-white" : "text-neutral-700 dark:text-neutral-400"
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setCycle("yearly")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium ${
            cycle === "yearly" ? "bg-orla-blue text-white" : "text-neutral-700 dark:text-neutral-400"
          }`}
        >
          Anual (com desconto)
        </button>
      </div>

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.name === "pro";
          const price = cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-neutral-900 border rounded-lg p-6 flex flex-col ${
                isPopular ? "border-orla-blue shadow-md" : "border-neutral-300 dark:border-white/10"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-orla-blue text-white text-[11px] font-medium">
                  <Sparkles size={11} />
                  Mais Popular
                </span>
              )}

              <h3 className="font-display font-semibold text-lg m-0 mb-1">{plan.displayName}</h3>
              <div className="mb-4">
                <span className="font-display font-semibold text-3xl">
                  {plan.priceMonthly === 0 ? "Grátis" : fmtPlain(price)}
                </span>
                {plan.priceMonthly > 0 && (
                  <span className="text-sm text-neutral-700 dark:text-neutral-400">
                    /{cycle === "monthly" ? "mês" : "ano"}
                  </span>
                )}
              </div>

              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {planFeatures(plan).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <Check size={15} className="text-status-success shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Badge tone="success" appearance="outline" dot>
                  Plano Atual
                </Badge>
              ) : plan.priceMonthly === 0 ? (
                <span className="text-xs text-neutral-700 dark:text-neutral-400">Plano de degustação</span>
              ) : (
                <button
                  onClick={() => setCheckoutTarget(plan)}
                  disabled={!churchId}
                  className="w-full px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  Assinar {plan.displayName}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {checkoutTarget && (
        <PixPaymentModal
          plan={checkoutTarget}
          billingCycle={cycle}
          churchName={churchName}
          onClose={() => setCheckoutTarget(null)}
          onRequested={() => {
            setCheckoutTarget(null);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
