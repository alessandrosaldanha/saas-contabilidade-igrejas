import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmTone = "warning" | "error" | "primary";

const ICON_BG: Record<ConfirmTone, string> = {
  warning: "bg-status-warning/15 text-status-warning",
  error: "bg-status-error/15 text-status-error",
  primary: "bg-orla-blue/15 text-orla-blue",
};

const CONFIRM_BUTTON: Record<ConfirmTone, string> = {
  warning: "bg-status-warning",
  error: "bg-status-error",
  primary: "bg-orla-blue hover:bg-blue-600",
};

interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  detail?: ReactNode;
  tone?: ConfirmTone;
  confirmLabel: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Modal de confirmação genérico — extraído do padrão repetido (aviso de
// duplicata, exclusão de histórico) para reduzir duplicação de markup.
export default function ConfirmModal({
  title,
  description,
  detail,
  tone = "warning",
  confirmLabel,
  confirmingLabel,
  cancelLabel = "Cancelar",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[480px] rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ICON_BG[tone]}`}>
            <AlertTriangle size={20} />
          </span>
          <h3 className="font-display font-semibold text-lg m-0">{title}</h3>
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">{description}</div>
        {detail && (
          <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3 mb-6 max-h-[180px] overflow-y-auto text-sm">
            {detail}
          </div>
        )}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 disabled:opacity-70 ${CONFIRM_BUTTON[tone]}`}
          >
            {isConfirming ? confirmingLabel ?? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
