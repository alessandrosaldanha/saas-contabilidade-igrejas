import { Pencil, Trash2 } from "lucide-react";
import Card from "../Card";
import Badge from "../Badge";
import type { ImportHistoryItem } from "../../types";

interface ImportHistoryTableProps {
  items: ImportHistoryItem[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (item: ImportHistoryItem) => void;
  onDelete: (item: ImportHistoryItem) => void;
}

export default function ImportHistoryTable({ items, canEdit, canDelete, onEdit, onDelete }: ImportHistoryTableProps) {
  return (
    <div className="mt-6.5">
      <h3 className="font-display font-semibold text-[15px] mb-3">Extratos Processados Recentemente</h3>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr className="text-left text-neutral-700 dark:text-neutral-400">
                <th className="px-3.5 py-2.5 font-medium">Arquivo</th>
                <th className="px-3.5 py-2.5 font-medium">Mês/Ano de Referência</th>
                <th className="px-3.5 py-2.5 font-medium">Qtd. Transações</th>
                <th className="px-3.5 py-2.5 font-medium">Data de Importação</th>
                <th className="px-3.5 py-2.5 font-medium">Importado por</th>
                <th className="px-3.5 py-2.5 font-medium">Status</th>
                {(canEdit || canDelete) && <th className="px-3.5 py-2.5 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-t border-neutral-300 dark:border-white/10">
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{h.filename}</td>
                  <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-400 whitespace-nowrap">{h.monthLabel}</td>
                  <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-400">{h.count}</td>
                  <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-400 whitespace-nowrap">{h.importedAt}</td>
                  <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-400 whitespace-nowrap">{h.importedBy}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone="success" dot>
                      Salvo / Registrado
                    </Badge>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => onEdit(h)}
                            title="Editar registro de importação"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(h)}
                            title="Excluir registro de importação"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-status-error/10 hover:text-status-error hover:border-status-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="p-6 text-center text-neutral-700 dark:text-neutral-400 text-sm">Nenhuma importação registrada ainda.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
