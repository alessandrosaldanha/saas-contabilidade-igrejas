import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "../../../services/supabase";
import { fmtPlain } from "../../../utils/format";
import { mapPublicPlanRow } from "../../../utils/plans";
import type { PublicPlan } from "../../../types";

export default function PricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  // RPC pública (SECURITY DEFINER), não a tabela `plans` direto — a RLS de
  // `plans` só libera SELECT autenticado, e a landing é pública. Ver migration
  // `0028_public_plans_rpc.sql`: get_public_plans() devolve só as colunas de
  // marketing/limites, nunca dados bancários/Pix (exclusivos do checkout
  // autenticado em /planos). Mesma fonte de dados do master em Governança —
  // editar um plano lá reflete aqui automaticamente.
  useEffect(() => {
    supabase
      .rpc("get_public_plans")
      .then(({ data }) => {
        if (data) setPlans(data.map(mapPublicPlanRow));
      });
  }, []);

  return (
    <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {plans.map((plan) => {
        const isPopular = plan.name === "pro";
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
            {plan.description && (
              <p className="text-xs text-neutral-700 dark:text-neutral-400 mb-3 leading-relaxed">{plan.description}</p>
            )}
            <div className="mb-4">
              <span className="font-display font-semibold text-3xl">
                {plan.priceMonthly === 0 ? "Grátis" : fmtPlain(plan.priceMonthly)}
              </span>
              {plan.priceMonthly > 0 && <span className="text-sm text-neutral-700 dark:text-neutral-400">/mês</span>}
            </div>

            <ul className="flex flex-col gap-2.5 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check size={15} className="text-status-success shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              to={plan.priceMonthly === 0 ? "/login?signup=1" : `/login?signup=1&plan=${plan.name}`}
              className="w-full text-center px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
            >
              {plan.priceMonthly === 0 ? "Começar Gratuitamente" : `Assinar ${plan.displayName}`}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
