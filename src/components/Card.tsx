import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  padding?: "none" | "md" | "lg";
  className?: string;
}

const PADDING_MAP = { none: "", md: "p-4", lg: "p-6" };

export default function Card({ children, padding = "md", className = "" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg shadow-sm ${PADDING_MAP[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
