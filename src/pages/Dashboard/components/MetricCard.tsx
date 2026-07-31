export type DeltaTone = "success" | "error" | "neutral";

const DELTA_COLOR: Record<DeltaTone, string> = {
  success: "text-status-success",
  error: "text-status-error",
  neutral: "text-neutral-700 dark:text-neutral-400",
};

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: DeltaTone;
  valueColor?: string;
}

export default function MetricCard({ label, value, delta, deltaTone = "neutral", valueColor }: MetricCardProps) {
  return (
    <div className="min-w-0 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-5">
      <div className="text-xs text-neutral-700 dark:text-neutral-400 mb-2">{label}</div>
      <div className={`font-display font-semibold text-2xl truncate ${valueColor ?? "text-black dark:text-white"}`}>{value}</div>
      {delta && <div className={`text-xs mt-2 ${DELTA_COLOR[deltaTone]}`}>{delta}</div>}
    </div>
  );
}
