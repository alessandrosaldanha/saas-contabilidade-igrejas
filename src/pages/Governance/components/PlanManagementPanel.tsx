import { useState } from "react";
import { Pencil, Landmark } from "lucide-react";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import EditPlanModal from "./EditPlanModal";
import { fmtPlain } from "../../../utils/format";
import { isUnlimited } from "../../../utils/plans";
import type { Plan } from "../../../types";

interface PlanManagementPanelProps {
  plans: Plan[];
  onChanged: () => void;
}

// Aba "Gestão de Planos & Dados Bancários" da Governança — só o master chega
// aqui (rota /governanca inteira é restrita a `allowedRoles={["master"]}`,
// ver App.tsx). Lista os 3 planos fixos do catálogo com um resumo dos
// limites/dados bancários e abre o EditPlanModal para edição completa.
export default function PlanManagementPanel({ plans, onChanged }: PlanManagementPanelProps) {
  const [editing, setEditing] = useState<Plan | null>(null);

  return (
    <div>
      <p className="text-sm text-neutral-700 dark:text-neutral-400 mb-4.5">
        Edite nome, descrição, preço, benefícios, limites operacionais e os dados bancários/Pix usados no checkout
        de cada plano. Alterações refletem imediatamente na tela <strong>/planos</strong> e no modal de pagamento.
      </p>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {plans.map((plan) => {
          const hasBankDetails = !!plan.pixKey;
          return (
            <Card key={plan.id} className="flex flex-col gap-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-display font-semibold text-base m-0">{plan.displayName}</h4>
                  <div className="text-lg font-display font-semibold mt-0.5">
                    {plan.priceMonthly === 0 ? "Grátis" : `${fmtPlain(plan.priceMonthly)}/mês`}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(plan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 shrink-0"
                >
                  <Pencil size={12} />
                  Editar Plano
                </button>
              </div>

              {plan.description && (
                <p className="text-xs text-neutral-700 dark:text-neutral-400 leading-relaxed m-0">{plan.description}</p>
              )}

              <ul className="text-xs text-neutral-700 dark:text-neutral-300 flex flex-col gap-1">
                <li>{isUnlimited(plan.maxAiReads) ? "Leituras de IA ilimitadas" : `${plan.maxAiReads} leituras de IA/mês`}</li>
                <li>{isUnlimited(plan.maxPdfDownloads) ? "PDFs ilimitados" : `${plan.maxPdfDownloads} PDFs/mês`}</li>
                <li>
                  {isUnlimited(plan.maxChildChurches)
                    ? "Subcongregações ilimitadas"
                    : `Até ${plan.maxChildChurches} subcongregação(ões)`}
                </li>
                <li>{plan.features.length} benefício(s) cadastrado(s)</li>
              </ul>

              {plan.priceMonthly > 0 && (
                <div className="pt-3 border-t border-neutral-300 dark:border-white/10">
                  <Badge tone={hasBankDetails ? "success" : "warning"} appearance="outline" dot>
                    <Landmark size={11} />
                    {hasBankDetails ? "Dados bancários configurados" : "Dados bancários pendentes"}
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {editing && (
        <EditPlanModal
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            onChanged();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
