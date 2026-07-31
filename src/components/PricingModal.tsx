import { X } from "lucide-react";
import PricingPlans from "./PricingPlans";

interface PricingModalProps {
  churchId: string | null;
  title?: string;
  description?: string;
  onClose: () => void;
}

// Aberto nos pontos de bloqueio (limite de IA/PDF atingido) convidando para o
// upgrade — mesmo conteúdo da página /planos, só embrulhado em overlay.
export default function PricingModal({ churchId, title, description, onClose }: PricingModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[920px] max-h-[92vh] overflow-y-auto rounded-lg shadow-md p-5 sm:p-8 my-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-display font-semibold text-xl m-0">{title ?? "Faça um upgrade do seu plano"}</h3>
            {description && <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">{description}</p>}
          </div>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <PricingPlans churchId={churchId} onChanged={onClose} />
      </div>
    </div>
  );
}
