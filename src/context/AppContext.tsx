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

  // Drawer do menu lateral em telas mobile/tablet (< md) — independente do
  // colapso de ícone-só do desktop acima.
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;

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

  // O Master (dono da SaaS) não pertence a nenhuma igreja, mas tem acesso
  // irrestrito a todas — "igreja em visualização" é a igreja que ele escolheu
  // no seletor da Sidebar para ver/gerenciar Dashboard/Livro Caixa/Importação/
  // Usuários/Auditoria como se fosse o Admin dela. Para os demais papéis,
  // effectiveChurchId é sempre a própria igreja (profile.churchId).
  masterChurches: { id: string; name: string }[];
  viewingChurchId: string | null;
  setViewingChurchId: (id: string | null) => void;
  effectiveChurchId: string | null;

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
  cpf?: string | null;
  church_id?: string | null;
  church_name?: string | null;
}): ChurchUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastAccess: row.last_access ? new Date(row.last_access).toLocaleString("pt-BR") : "—",
    cpf: row.cpf,
    churchId: row.church_id,
    churchName: row.church_name,
  };
}

interface ProfileRowWithChurch {
  id: string;
  name: string;
  email: string;
  role: ChurchUser["role"];
  status: ChurchUser["status"];
  last_access: string | null;
  cpf: string | null;
  church_id: string | null;
  // `church_id` é FK de profiles para churches (relação "para um" / belongs-to)
  // — o PostgREST embute isso como objeto único (ou null), nunca como array.
  // Sem os tipos gerados do banco, o supabase-js às vezes infere um array por
  // via das dúvidas; por isso o cast explícito abaixo em vez de confiar nesse
  // tipo inferido (foi exatamente essa suposição errada — tratar como array e
  // acessar `[0]` — que fazia a coluna "Igreja" aparecer como "—" mesmo para
  // usuários com church_id preenchido).
  church: { name: string } | null;
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

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openMobileNav = useCallback(() => setMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);

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

  const isMaster = profile?.role === "master";

  // O Master escolhe, na Sidebar, qual igreja está gerenciando no momento —
  // persistido em localStorage para sobreviver a um F5. Para os demais
  // papéis, "igreja em visualização" é sempre a própria (nunca escolhida).
  const VIEWING_CHURCH_KEY = "master_viewing_church_id";
  const [viewingChurchId, setViewingChurchIdState] = useState<string | null>(() =>
    localStorage.getItem(VIEWING_CHURCH_KEY),
  );
  const setViewingChurchId = useCallback((id: string | null) => {
    setViewingChurchIdState(id);
    if (id) localStorage.setItem(VIEWING_CHURCH_KEY, id);
    else localStorage.removeItem(VIEWING_CHURCH_KEY);
  }, []);
  const effectiveChurchId = isMaster ? viewingChurchId : (profile?.churchId ?? null);

  const [masterChurches, setMasterChurches] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!isMaster) {
      setMasterChurches([]);
      return;
    }
    supabase
      .from("churches")
      .select("id, name")
      .order("name")
      .then(({ data }) => setMasterChurches(data ?? []));
  }, [isMaster]);

  // O Master vê o diretório de usuários por completo, de todas as igrejas
  // (a tela de Usuários mostra a coluna/filtro "Igreja" só para ele) — não
  // depende da "igreja em gestão" escolhida na Sidebar, ao contrário de
  // transactions/import_history, que são um ledger por igreja e exigem essa
  // escolha. Para os demais papéis, a busca continua restrita à própria
  // igreja (`effectiveChurchId` é sempre `profile.churchId` nesse caso).
  const refreshUsers = useCallback(async () => {
    if (isMaster) {
      // O próprio Master nunca aparece nesta listagem — é o dono da SaaS, não
      // um "membro/admin de igreja" a ser gerido por essa tela.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, status, last_access, cpf, church_id, church:churches(name)")
        .neq("role", "master")
        .order("name");
      if (!error && data) {
        // Cast explícito (em vez de deixar o TS inferir do select-string, que
        // sem os tipos gerados do banco pode errar a cardinalidade do embed).
        const rows = data as unknown as ProfileRowWithChurch[];
        setUsersList(
          rows.map((row) => mapProfileRow({ ...row, church_name: row.church?.name ?? null })),
        );
      }
      return;
    }

    if (!effectiveChurchId) {
      setUsersList([]);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, status, last_access, cpf, church_id")
      .eq("church_id", effectiveChurchId)
      .order("name");
    if (!error && data) setUsersList(data.map(mapProfileRow));
  }, [isMaster, effectiveChurchId]);

  const refreshTransactions = useCallback(async () => {
    if (!effectiveChurchId) {
      setTransactionsState([]);
      return;
    }
    const { data, error } = await supabase
      .from("transactions")
      .select("id, occurred_on, description, value, type, category, confidence, created_by")
      .eq("church_id", effectiveChurchId)
      .order("occurred_on");
    if (!error && data) setTransactionsState(data.map((row) => mapTransactionRow(row, usersById)));
  }, [effectiveChurchId, usersById]);

  const refreshImportHistory = useCallback(async () => {
    if (!effectiveChurchId) {
      setImportHistoryState([]);
      return;
    }
    const { data, error } = await supabase
      .from("import_history")
      .select("id, filename, month_label, count, imported_by, imported_at")
      .eq("church_id", effectiveChurchId)
      .order("imported_at", { ascending: false });
    if (!error && data) setImportHistoryState(data.map((row) => mapImportHistoryRow(row, usersById)));
  }, [effectiveChurchId, usersById]);

  useEffect(() => {
    if (session && (isMaster || effectiveChurchId)) refreshUsers();
    else setUsersList([]);
  }, [session, isMaster, effectiveChurchId, refreshUsers]);

  useEffect(() => {
    if (session && effectiveChurchId) {
      refreshTransactions();
      refreshImportHistory();
    } else {
      setTransactionsState([]);
      setImportHistoryState([]);
    }
  }, [session, effectiveChurchId, refreshTransactions, refreshImportHistory]);

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
    mobileNavOpen,
    openMobileNav,
    closeMobileNav,
    toggleMobileNav,
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
    masterChurches,
    viewingChurchId,
    setViewingChurchId,
    effectiveChurchId,
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
