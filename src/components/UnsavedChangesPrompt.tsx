import { AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function UnsavedChangesPrompt() {
  const { pendingUnsavedPrompt, isResolvingUnsavedPrompt, resolveUnsavedPrompt } = useApp();

  if (!pendingUnsavedPrompt) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-status-warning/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-status-warning" />
          </span>
          <h3 className="font-display font-semibold text-lg m-0">Lançamentos não salvos</h3>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6">
          Você importou um extrato e ainda não salvou os lançamentos no Livro Caixa. Se sair agora sem salvar, essas
          informações serão perdidas.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            onClick={() => resolveUnsavedPrompt("cancel")}
            disabled={isResolvingUnsavedPrompt}
            className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium disabled:opacity-70"
          >
            Continuar editando
          </button>
          <button
            onClick={() => resolveUnsavedPrompt("discard")}
            disabled={isResolvingUnsavedPrompt}
            className="px-4 py-2 rounded-md bg-status-error text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            Sair sem salvar
          </button>
          <button
            onClick={() => resolveUnsavedPrompt("save")}
            disabled={isResolvingUnsavedPrompt}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isResolvingUnsavedPrompt ? "Salvando…" : "Salvar e sair"}
          </button>
        </div>
      </div>
    </div>
  );
}
