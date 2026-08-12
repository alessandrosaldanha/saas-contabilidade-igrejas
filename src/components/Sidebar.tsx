import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  X,
  Building2,
  CreditCard,
  Landmark,
} from "lucide-react";
import Avatar from "./Avatar";
import Badge from "./Badge";
import ProfileSettingsModal from "./ProfileSettingsModal";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import logoAzul from "../assets/logo-azul.svg";

// O Master tem acesso irrestrito — vê todos os menus normais de igreja (com
// a igreja escolhida no seletor abaixo) MAIS o menu exclusivo de Governança.
const TENANT_ROLES = ["Admin", "Tesoureiro", "Auditor", "Conselho Fiscal", "master"];
// Auditor e Conselho Fiscal não lançam/importam nada (papéis só de
// leitura/fiscalização) — por isso ficam de fora de "Extratos e Importação IA"
// (RLS e a Edge Function parse-statement só aceitam Admin/Tesoureiro/master).
const IMPORTACAO_ROLES = ["Admin", "Tesoureiro", "master"];

const NAV_ITEMS = [
  { to: "/governanca", label: "Governança (Admin Master)", icon: Building2, allowedRoles: ["master"] },
  { to: "/dashboard", label: "Dashboard Executivo", icon: LayoutGrid, allowedRoles: TENANT_ROLES },
  { to: "/detalhes-igreja", label: "Detalhes da Igreja", icon: Landmark, allowedRoles: ["Admin", "master"] },
  { to: "/importacao", label: "Extratos e Importação IA", icon: FileText, allowedRoles: IMPORTACAO_ROLES },
  { to: "/livro-caixa", label: "Livro Caixa (Lançamentos)", icon: Wallet, badge: 3, allowedRoles: TENANT_ROLES },
  { to: "/planos", label: "Planos e Assinatura", icon: CreditCard, allowedRoles: TENANT_ROLES },
  { to: "/usuarios", label: "Governança e Usuários", icon: Users, allowedRoles: ["Admin", "master"] },
  {
    to: "/auditoria",
    label: "Trilha de Auditoria (Logs)",
    icon: Clock,
    allowedRoles: ["Admin", "Auditor", "Conselho Fiscal", "master"],
  },
];

export default function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    closeMobileNav,
    isDark,
    toggleTheme,
    currentUser,
    guardedNavigate,
    masterChurches,
    viewingChurchId,
    setViewingChurchId,
  } = useApp();
  const { profile, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const expanded = !sidebarCollapsed;
  const navItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(currentUser.role)
  );

  // Fecha o popover de perfil ao clicar fora dele (fora do popover e do
  // botão que o abre) — sem isso, só fechava clicando de novo no gatilho.
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current?.contains(target)) return;
      if (profileTriggerRef.current?.contains(target)) return;
      setShowProfileMenu(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const performLogout = async () => {
    if (profile) {
      await supabase.from("audit_logs").insert({
        user_id: profile.id,
        role: profile.role,
        action_key: "acesso",
        action_label: "Acesso/Login",
        before: "Sessão ativa",
        after: "Logout",
      });
    }
    await signOut();
    navigate("/login");
  };

  const logout = () => {
    setShowProfileMenu(false);
    closeMobileNav();
    guardedNavigate(performLogout);
  };

  return (
    <>
      {/* Backdrop do drawer mobile — clicar fora fecha o menu. Some sozinho em md+. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeMobileNav} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-300 dark:border-white/10 flex flex-col py-5 px-3 transition-transform duration-200 w-[248px] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0 md:transition-[width] md:shrink-0 ${expanded ? "md:w-[248px]" : "md:w-[76px]"}`}
      >
        <div className={`flex items-center gap-2.5 px-1 pb-5 ${expanded ? "justify-start" : "md:justify-center"}`}>
          <img src={logoAzul} alt="Contabilidade Igreja" className="w-[30px] h-[30px] shrink-0" />
          <span
            className={`font-display font-semibold text-base leading-tight text-black dark:text-white ${expanded ? "" : "md:hidden"}`}
          >
            Contabilidade
            <br />
            Igreja
          </span>
          <button
            onClick={closeMobileNav}
            title="Fechar menu"
            className="ml-auto p-1.5 rounded-md text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {currentUser.role === "master" && (
          <div className={`px-1 pb-4 ${expanded ? "" : "md:hidden"}`}>
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-neutral-700 dark:text-neutral-500 mb-1.5">
              Igreja em Gestão
            </label>
            <select
              value={viewingChurchId ?? ""}
              onChange={(e) => setViewingChurchId(e.target.value || null)}
              className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-2.5 py-2 text-xs outline-none"
            >
              <option value="">Selecione uma igreja…</option>
              {masterChurches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          title="Recolher menu"
          className={`hidden md:flex items-center gap-2 border border-neutral-300 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 rounded-md px-2.5 py-1.5 text-[11px] mb-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
            expanded ? "justify-start" : "justify-center"
          }`}
        >
          <PanelLeft size={13} className={sidebarCollapsed ? "rotate-180" : ""} />
          {expanded && "Recolher"}
        </button>

        <div
          className={`text-[10px] font-semibold tracking-wider uppercase text-neutral-700 dark:text-neutral-500 px-3 pb-2 ${expanded ? "" : "md:hidden"}`}
        >
          Menu
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === location.pathname) return;
                e.preventDefault();
                closeMobileNav();
                guardedNavigate(() => navigate(item.to));
              }}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-r-sm border-l-[2.5px] px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "border-orla-blue bg-orla-blue/10 text-black dark:text-white font-semibold"
                    : "border-transparent text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                } ${expanded ? "" : "md:justify-center"}`
              }
            >
              <item.icon size={18} className="shrink-0" />
              <span
                className={`flex-1 flex items-center justify-between min-w-0 ${expanded ? "" : "md:hidden"}`}
              >
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <Badge tone="warning" size="sm">
                    {item.badge}
                  </Badge>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto relative">
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg shadow-md p-4 z-[60] min-w-[240px] max-w-[calc(100vw-2rem)]"
            >
            <div className="flex items-center gap-3 pb-3.5 border-b border-neutral-300 dark:border-white/10 mb-2">
              <Avatar name={currentUser.name} size="lg" />
              <div className="min-w-0">
                <div className="text-black dark:text-white text-sm font-medium truncate">{currentUser.name}</div>
                <div className="text-neutral-700 dark:text-neutral-400 text-xs truncate">{currentUser.email}</div>
                <div className="mt-1">
                  <Badge tone="purple" size="sm">
                    {currentUser.role}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowProfileMenu(false);
                setShowProfileModal(true);
              }}
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
            <div className="border-t border-neutral-300 dark:border-white/10 my-1.5" />
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
          ref={profileTriggerRef}
          onClick={() => setShowProfileMenu((v) => !v)}
          className="flex items-center gap-2.5 px-2 py-2.5 rounded-md cursor-pointer border-t border-neutral-300 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <Avatar name={currentUser.name} size="md" />
          <div className={`min-w-0 flex-1 ${expanded ? "" : "md:hidden"}`}>
            <div className="text-sm text-black dark:text-white truncate">{currentUser.name}</div>
            <div className="mt-0.5">
              <Badge tone="purple" size="sm">
                {currentUser.role}
              </Badge>
            </div>
          </div>
        </div>
        </div>
      </aside>

      {showProfileModal && <ProfileSettingsModal onClose={() => setShowProfileModal(false)} />}
    </>
  );
}
