import PricingPlans from "../../components/PricingPlans";
import { useApp } from "../../context/AppContext";

export default function Planos() {
  const { effectiveChurchId } = useApp();

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Planos e Assinatura</h1>
        <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">
          Escolha o plano ideal para a gestão financeira da sua igreja
        </p>
      </div>

      <PricingPlans churchId={effectiveChurchId} />
    </div>
  );
}
