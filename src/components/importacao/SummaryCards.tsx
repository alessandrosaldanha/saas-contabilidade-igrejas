import Card from "../Card";
import { fmt } from "../../utils/format";
import type { Transaction } from "../../types";

interface SummaryCardsProps {
  transactions: Transaction[];
}

export default function SummaryCards({ transactions }: SummaryCardsProps) {
  const entradas = transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const saidas = transactions.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);
  const saldo = entradas + saidas;
  const pendentes = transactions.filter((t) => t.confidence !== "alta").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <Card>
        <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Total Entradas</div>
        <div className="font-display font-semibold text-lg text-status-success mt-1">{fmt(entradas)}</div>
      </Card>
      <Card>
        <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Total Saídas</div>
        <div className="font-display font-semibold text-lg text-orla-coral mt-1">{fmt(saidas)}</div>
      </Card>
      <Card>
        <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Saldo do Extrato Importado</div>
        <div className={`font-display font-semibold text-lg mt-1 ${saldo < 0 ? "text-orla-coral" : "text-status-success"}`}>
          {fmt(saldo)}
        </div>
      </Card>
      <Card>
        <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Pendentes de Revisão</div>
        <div className={`font-display font-semibold text-lg mt-1 ${pendentes > 0 ? "text-status-warning" : ""}`}>
          {pendentes}
        </div>
      </Card>
    </div>
  );
}
