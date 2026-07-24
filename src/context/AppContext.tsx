import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ChurchUser, ImportHistoryItem, Transaction } from "../types";
import { DEFAULT_IMPORT_HISTORY, DEFAULT_TRANSACTIONS } from "../services/mockData";
import { supabase } from "../services/supabase";
import { useAuth } from "./AuthContext";

interface AppContextValue {
  theme: "dark" | "light";
  isDark: boolean;
  toggleTheme: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  isPresenting: boolean;
  showExitBadge: boolean;
  enterPresentation: () => void;
  exitPresentation: () => void;

  toastText: string;
  showToast: boolean;
  showToastMsg: (text: string) => void;

  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;

  importHistory: ImportHistoryItem[];
  setImportHistory: React.Dispatch<React.SetStateAction<ImportHistoryItem[]>>;

  usersList: ChurchUser[];
  refreshUsers: () => Promise<void>;

  currentUser: { name: string; email: string; role: string };
}

function mapProfileRow(row: {
  id: string;
  name: string;
  email: string;
  role: ChurchUser["role"];
  status: ChurchUser["status"];
  last_access: string | null;
}): ChurchUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastAccess: row.last_access ? new Date(row.last_access).toLocaleString("pt-BR") : "—",
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  const [isPresenting, setIsPresenting] = useState(false);
  const [showExitBadge, setShowExitBadge] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHideBadge = useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setShowExitBadge(false), 3000);
  }, []);

  const enterPresentation = useCallback(() => {
    setIsPresenting(true);
    setShowExitBadge(true);
    scheduleHideBadge();
  }, [scheduleHideBadge]);

  const exitPresentation = useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setIsPresenting(false);
    setShowExitBadge(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPresentation();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY > 80) return;
      setShowExitBadge(true);
      scheduleHideBadge();
    };
    if (isPresenting) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("mousemove", onMouseMove);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isPresenting, exitPresentation, scheduleHideBadge]);

  const [toastText, setToastText] = useState("");
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToastMsg = useCallback((text: string) => {
    setToastText(text);
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3500);
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>(DEFAULT_IMPORT_HISTORY);
  const [usersList, setUsersList] = useState<ChurchUser[]>([]);

  const { session, profile } = useAuth();

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, last_access")
      .order("name");
    if (!error && data) setUsersList(data.map(mapProfileRow));
  }, []);

  useEffect(() => {
    if (session) refreshUsers();
    else setUsersList([]);
  }, [session, refreshUsers]);

  const value: AppContextValue = {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
    isPresenting,
    showExitBadge,
    enterPresentation,
    exitPresentation,
    toastText,
    showToast,
    showToastMsg,
    transactions,
    setTransactions,
    importHistory,
    setImportHistory,
    usersList,
    refreshUsers,
    currentUser: profile
      ? { name: profile.name, email: profile.email, role: profile.role }
      : { name: "—", email: "—", role: "—" },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de um AppProvider");
  return ctx;
}
