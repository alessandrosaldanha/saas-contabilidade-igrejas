import { Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      title="Alternar tema"
      aria-label="Alternar tema"
      className="w-9 h-9 flex items-center justify-center rounded-full border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}
