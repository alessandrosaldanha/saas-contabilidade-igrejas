import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import Toast from "./Toast";
import UnsavedChangesPrompt from "./UnsavedChangesPrompt";
import { useApp } from "../context/AppContext";

export default function Layout() {
  const { isPresenting, showExitBadge, exitPresentation, openMobileNav } = useApp();

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black text-black dark:text-white overflow-hidden">
      {!isPresenting && <Sidebar />}

      <main className="flex-1 min-w-0 h-full overflow-y-auto px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {!isPresenting && (
          <button
            onClick={openMobileNav}
            title="Abrir menu"
            className="md:hidden mb-4 inline-flex items-center justify-center w-9 h-9 rounded-md border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
          >
            <Menu size={18} />
          </button>
        )}
        {isPresenting && showExitBadge && (
          <button
            onClick={exitPresentation}
            className="fixed top-5 right-6 z-[95] flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/80 text-white text-xs backdrop-blur-sm"
          >
            <X size={14} />
            Sair da Apresentação (Esc)
          </button>
        )}
        <Outlet />
      </main>

      <Toast />
      <UnsavedChangesPrompt />
    </div>
  );
}
