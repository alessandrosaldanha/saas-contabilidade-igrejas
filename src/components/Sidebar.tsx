import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Wallet,
  Users,
  Clock,
  PanelLeft,
  Settings,
  Moon,
  Sun,
  LogOut,
  Wallet as WalletIcon,
} from "lucide-react";
import Avatar from "./Avatar";
import Badge from "./Badge";
import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard Executivo", icon: LayoutGrid },
  { to: "/importacao", label: "Extratos e Importação IA", icon: FileText },
  { to: "/livro-caixa", label: "Livro Caixa (Lançamentos)", icon: Wallet, badge: 3 },
  { to: "/usuarios", label: "Governança e Usuários", icon: Users },
  { to: "/auditoria", label: "Trilha de Auditoria (Logs)", icon: Clock },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, isDark, toggleTheme, currentUser } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const expanded = !sidebarCollapsed;

  const logout = () => {
    setShowProfileMenu(false);
    navigate("/login");
  };

  return (
    <aside
      className={`shrink-0 h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/10 flex flex-col py-5 px-3 relative transition-[width] duration-200 ${
        expanded ? "w-[248px]" : "w-[76px]"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-1 pb-5 ${expanded ? "justify-start" : "justify-center"}`}>
        <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-md bg-orla-blue shrink-0">
          <WalletIcon size={17} className="text-white" />
        </span>
        {expanded && (
          <span className="font-display font-semibold text-base leading-tight text-black dark:text-white">
            Contabilidade
            <br />
            Igreja
          </span>
        )}
      </div>

      <button
        onClick={toggleSidebar}
        title="Recolher menu"
        className={`flex items-center gap-2 border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 rounded-md px-2.5 py-1.5 text-[11px] mb-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
          expanded ? "justify-start" : "justify-center"
        }`}
      >
        <PanelLeft size={13} className={sidebarCollapsed ? "rotate-180" : ""} />
        {expanded && "Recolher"}
      </button>

      {expanded && (
        <div className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 px-3 pb-2">
          Menu
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-r-sm border-l-[2.5px] px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-orla-blue bg-orla-blue/10 text-black dark:text-white font-semibold"
                  : "border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
              } ${expanded ? "" : "justify-center"}`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {expanded && (
              <span className="flex-1 flex items-center justify-between min-w-0">
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <Badge tone="warning" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto relative">
        {showProfileMenu && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-lg shadow-md p-4 z-[60] min-w-[240px]">
            <div className="flex items-center gap-3 pb-3.5 border-b border-neutral-200 dark:border-white/10 mb-2">
              <Avatar name={currentUser.name} size="lg" />
              <div className="min-w-0">
                <div className="text-black dark:text-white text-sm font-medium truncate">{currentUser.name}</div>
                <div className="text-neutral-500 dark:text-neutral-400 text-xs truncate">{currentUser.email}</div>
                <div className="mt-1">
                  <Badge tone="purple" size="sm">
                    {currentUser.role}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-md text-sm text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              <Settings size={15} />
              Configurações do Perfil
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-md text-sm text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              {isDark ? <Moon size={15} /> : <Sun size={15} />}
              Alternar Tema Claro/Escuro
            </button>
            <div className="border-t border-neutral-200 dark:border-white/10 my-1.5" />
            <button
              onClick={logout}
              className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-md text-sm text-status-error hover:bg-status-error/10"
            >
              <LogOut size={15} />
              Sair do Sistema / Logout
            </button>
          </div>
        )}

        <div
          onClick={() => setShowProfileMenu((v) => !v)}
          className="flex items-center gap-2.5 px-2 py-2.5 rounded-md cursor-pointer border-t border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <Avatar name={currentUser.name} size="md" />
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="text-sm text-black dark:text-white truncate">{currentUser.name}</div>
              <div className="mt-0.5">
                <Badge tone="purple" size="sm">
                  {currentUser.role}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
