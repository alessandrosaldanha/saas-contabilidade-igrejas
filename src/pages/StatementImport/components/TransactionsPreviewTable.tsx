import { Trash2 } from "lucide-react";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import { CATEGORY_TONE, CONF_LABEL, CONF_TONE } from "../../../services/mockData";
import { fmt } from "../../../utils/format";
import type { Transaction } from "../../../types";

interface TransactionsPreviewTableProps {
  transactions: Transaction[];
  hasUploaded: boolean;
  onClearClick: () => void;
}

export default function TransactionsPreviewTable({ transactions, hasUploaded, onClearClick }: TransactionsPreviewTableProps) {
  return (
    <Card padding="none" className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4.5 py-4 border-b border-neutral-300 dark:border-white/10">
        <h3 className="font-display font-semibold text-[15px] m-0">Pré-visualização de lançamentos</h3>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{transactions.length} lançamentos</Badge>
          {transactions.length > 0 && (
            <button
              onClick={onClearClick}
              title="Limpar lançamentos carregados"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium text-neutral-700 dark:text-neutral-400 hover:bg-status-error/10 hover:text-status-error hover:border-status-error"
            >
              <Trash2 size={13} /> Limpar Lançamentos
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-900">
            <tr className="text-left text-neutral-700 dark:text-neutral-400 border-b border-neutral-300 dark:border-white/10">
              <th className="px-3.5 py-2.5 font-medium">Data</th>
              <th className="px-3.5 py-2.5 font-medium">Descrição</th>
              <th className="px-3.5 py-2.5 font-medium">Valor</th>
              <th className="px-3.5 py-2.5 font-medium">Tipo</th>
              <th className="px-3.5 py-2.5 font-medium">Categoria</th>
              <th className="px-3.5 py-2.5 font-medium">Confiança</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => {
              const lowConfidence = row.confidence !== "alta";
              return (
                <tr
                  key={row.id}
                  className={`border-t border-neutral-300 dark:border-white/10 ${lowConfidence ? "bg-status-warning/10" : ""}`}
                >
                  <td className="px-3.5 py-2.5 text-neutral-700 dark:text-neutral-400 whitespace-nowrap">{row.date}</td>
                  <td className="px-3.5 py-2.5">{row.desc}</td>
                  <td className={`px-3.5 py-2.5 whitespace-nowrap ${row.value < 0 ? "text-orla-coral" : "text-status-success"}`}>
                    {fmt(row.value)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={row.type === "entrada" ? "success" : "error"}>
                      {row.type === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={CATEGORY_TONE[row.category] || "neutral"}>{row.category}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={CONF_TONE[row.confidence]} appearance="outline">
                      {CONF_LABEL[row.confidence]}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <div className="p-8 text-center text-neutral-700 dark:text-neutral-400 text-sm">
            {hasUploaded ? "Nenhum lançamento encontrado neste extrato." : "Envie um extrato para ver a pré-visualização."}
          </div>
        )}
      </div>
    </Card>
  );
}
