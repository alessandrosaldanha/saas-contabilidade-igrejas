import { Check } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { showToast, toastText } = useApp();
  if (!showToast) return null;
  return (
    <div className="fixed top-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 shadow-md text-sm text-black dark:text-white">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-status-success shrink-0">
        <Check size={12} strokeWidth={3} className="text-white" />
      </span>
      {toastText}
    </div>
  );
}
