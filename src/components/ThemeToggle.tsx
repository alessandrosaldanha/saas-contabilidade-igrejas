import { Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      {isDark ? "Modo escuro" : "Modo claro"}
    </button>
  );
}
