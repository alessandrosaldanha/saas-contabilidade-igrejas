import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ChurchUser, ImportHistoryItem, Transaction } from "../types";
import { supabase } from "../services/supabase";
import { isoToBr } from "../utils/format";
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
  refreshTransactions: () => Promise<void>;

  importHistory: ImportHistoryItem[];
  refreshImportHistory: () => Promise<void>;

  usersList: ChurchUser[];
  refreshUsers: () => Promise<void>;

  currentUser: { name: string; email: string; role: string };

  registerUnsavedGuard: (guard: UnsavedGuard | null) => void;
  guardedNavigate: (proceed: () => void) => void;
  pendingUnsavedPrompt: boolean;
  isResolvingUnsavedPrompt: boolean;
  resolveUnsavedPrompt: (choice: "cancel" | "discard" | "save") => void;
}

// Permite que uma página (hoje só a Importação de Extrato) registre uma verificação
// de "há algo não salvo?" — usada pelo Sidebar/logout antes de navegar para fora
// dessa página, para não deixar a pessoa perder um extrato importado sem querer.
interface UnsavedGuard {
  hasUnsaved: () => boolean;
  onSave: () => Promise<boolean>;
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

function mapTransactionRow(
  row: {
    id: string;
    occurred_on: string;
    description: string;
    value: number;
    type: Transaction["type"];
    category: string;
    confidence: Transaction["confidence"];
    created_by: string | null;
  },
  usersById: Map<string, string>,
): Transaction {
  return {
    id: row.id,
    date: isoToBr(row.occurred_on),
    desc: row.description,
    value: row.type === "saida" ? -Math.abs(row.value) : Math.abs(row.value),
    type: row.type,
    category: row.category,
    confidence: row.confidence,
    createdBy: (row.created_by && usersById.get(row.created_by)) || "—",
  };
}

function mapImportHistoryRow(
  row: {
    id: string;
    filename: string;
    month_label: string;
    count: number;
    imported_by: string | null;
    imported_at: string;
  },
  usersById: Map<string, string>,
): ImportHistoryItem {
  return {
    id: row.id,
    filename: row.filename,
    monthLabel: row.month_label,
    count: row.count,
    importedAt: new Date(row.imported_at).toLocaleDateString("pt-BR"),
    importedBy: (row.imported_by && usersById.get(row.imported_by)) || "—",
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

  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [importHistory, setImportHistoryState] = useState<ImportHistoryItem[]>([]);
  const [usersList, setUsersList] = useState<ChurchUser[]>([]);

  const { session, profile } = useAuth();

  const usersById = useMemo(() => new Map(usersList.map((u) => [u.id, u.name])), [usersList]);

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, last_access")
      .order("name");
    if (!error && data) setUsersList(data.map(mapProfileRow));
  }, []);

  const refreshTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, occurred_on, description, value, type, category, confidence, created_by")
      .order("occurred_on");
    if (!error && data) setTransactionsState(data.map((row) => mapTransactionRow(row, usersById)));
  }, [usersById]);

  const refreshImportHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("import_history")
      .select("id, filename, month_label, count, imported_by, imported_at")
      .order("imported_at", { ascending: false });
    if (!error && data) setImportHistoryState(data.map((row) => mapImportHistoryRow(row, usersById)));
  }, [usersById]);

  useEffect(() => {
    if (session) refreshUsers();
    else setUsersList([]);
  }, [session, refreshUsers]);

  useEffect(() => {
    if (session) {
      refreshTransactions();
      refreshImportHistory();
    } else {
      setTransactionsState([]);
      setImportHistoryState([]);
    }
  }, [session, refreshTransactions, refreshImportHistory]);

  const unsavedGuardRef = useRef<UnsavedGuard | null>(null);
  const pendingProceedRef = useRef<(() => void) | null>(null);
  const [pendingUnsavedPrompt, setPendingUnsavedPrompt] = useState(false);
  const [isResolvingUnsavedPrompt, setIsResolvingUnsavedPrompt] = useState(false);

  const registerUnsavedGuard = useCallback((guard: UnsavedGuard | null) => {
    unsavedGuardRef.current = guard;
  }, []);

  const guardedNavigate = useCallback((proceed: () => void) => {
    if (unsavedGuardRef.current?.hasUnsaved()) {
      pendingProceedRef.current = proceed;
      setPendingUnsavedPrompt(true);
    } else {
      proceed();
    }
  }, []);

  const resolveUnsavedPrompt = useCallback(async (choice: "cancel" | "discard" | "save") => {
    const proceed = pendingProceedRef.current;

    if (choice === "cancel") {
      setPendingUnsavedPrompt(false);
      pendingProceedRef.current = null;
      return;
    }

    if (choice === "discard") {
      pendingProceedRef.current = null;
      setPendingUnsavedPrompt(false);
      proceed?.();
      return;
    }

    const guard = unsavedGuardRef.current;
    if (!guard || !proceed) {
      setPendingUnsavedPrompt(false);
      return;
    }
    setIsResolvingUnsavedPrompt(true);
    const ok = await guard.onSave();
    setIsResolvingUnsavedPrompt(false);
    if (ok) {
      pendingProceedRef.current = null;
      setPendingUnsavedPrompt(false);
      proceed();
    }
    // se falhou (ou havia duplicata a resolver), deixa o aviso fechar mas sem navegar —
    // a própria página já mostrou o toast/modal de erro relevante.
    else {
      setPendingUnsavedPrompt(false);
    }
  }, []);

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
    refreshTransactions,
    importHistory,
    refreshImportHistory,
    usersList,
    refreshUsers,
    currentUser: profile
      ? { name: profile.name, email: profile.email, role: profile.role }
      : { name: "—", email: "—", role: "—" },
    registerUnsavedGuard,
    guardedNavigate,
    pendingUnsavedPrompt,
    isResolvingUnsavedPrompt,
    resolveUnsavedPrompt,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de um AppProvider");
  return ctx;
}
