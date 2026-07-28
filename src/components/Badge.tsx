import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral" | "purple";

const TONE_SOLID: Record<BadgeTone, string> = {
  success: "bg-status-success/15 text-status-success",
  warning: "bg-status-warning/15 text-status-warning",
  error: "bg-status-error/15 text-status-error",
  info: "bg-orla-blue/15 text-orla-blue",
  neutral: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-400",
  purple: "bg-[#7c3aed]/15 text-[#7c3aed]",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  success: "border-status-success text-status-success",
  warning: "border-status-warning text-status-warning",
  error: "border-status-error text-status-error",
  info: "border-orla-blue text-orla-blue",
  neutral: "border-neutral-400 dark:border-white/25 text-neutral-700 dark:text-neutral-300",
  purple: "border-[#7c3aed] text-[#7c3aed]",
};

const DOT_COLOR: Record<BadgeTone, string> = {
  success: "bg-status-success",
  warning: "bg-status-warning",
  error: "bg-status-error",
  info: "bg-orla-blue",
  neutral: "bg-neutral-500",
  purple: "bg-[#7c3aed]",
};

interface BadgeProps {
  tone?: BadgeTone;
  appearance?: "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({ tone = "neutral", appearance = "solid", size = "sm", dot = false, children }: BadgeProps) {
  const sizeCls = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  const toneCls = appearance === "outline" ? `border bg-transparent ${TONE_OUTLINE[tone]}` : TONE_SOLID[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${sizeCls} ${toneCls}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[tone]}`} />}
      {children}
    </span>
  );
}
