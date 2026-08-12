import { useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import CashBook from "./pages/CashBook";
import StatementImport from "./pages/StatementImport/StatementImport";
import AuditLogs from "./pages/AuditLogs";
import Users from "./pages/Users/Users";
import Governance from "./pages/Governance/Governance";
import PricingPlansPage from "./pages/PricingPlans/PricingPlans";
import ChurchDetails from "./pages/ChurchDetails/ChurchDetails";
import { getHomePath } from "./utils/homePath";
import type { UserRole } from "./types";

// O Master tem acesso irrestrito — além da Governança (exclusiva dele), também
// acessa todas as telas normais de igreja (Dashboard/Livro Caixa/Importação/
// Usuários/Auditoria), gerenciando a igreja escolhida no seletor da Sidebar.
const TENANT_ROLES: UserRole[] = ["Admin", "Tesoureiro", "Auditor", "Conselho Fiscal", "master"];
// Auditor e Conselho Fiscal não lançam/importam nada (papéis só de
// leitura/fiscalização) — por isso ficam de fora de "Extratos e Importação
// IA", diferente das outras telas de igreja acima. A RLS (transactions_insert_treasury/
// import_history_insert_treasury) e a Edge Function parse-statement só aceitam
// Admin/Tesoureiro/master mesmo — manter Conselho Fiscal aqui deixava a tela
// visível para ele sem nenhuma ação nela funcionar de verdade.
const IMPORTACAO_ROLES: UserRole[] = ["Admin", "Tesoureiro", "master"];

function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { isDark } = useApp();
  // useLayoutEffect (não useEffect): aplica a classe antes do browser pintar o
  // frame, para a troca de tema vinda do profile (Supabase) não gerar um
  // flash de "tema errado" entre o primeiro render e o sync do profile.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  return <>{children}</>;
}

function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={getHomePath(profile?.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ThemeRoot>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route element={<ProtectedRoute allowedRoles={["master"]} />}>
                    <Route path="governanca" element={<Governance />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={TENANT_ROLES} />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="livro-caixa" element={<CashBook />} />
                    <Route path="planos" element={<PricingPlansPage />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={IMPORTACAO_ROLES} />}>
                    <Route path="importacao" element={<StatementImport />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={["Admin", "master"]} />}>
                    <Route path="usuarios" element={<Users />} />
                    <Route path="detalhes-igreja" element={<ChurchDetails />} />
                    <Route path="detalhes-igreja/:churchId" element={<ChurchDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Auditor", "Conselho Fiscal", "master"]} />}>
                    <Route path="auditoria" element={<AuditLogs />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </BrowserRouter>
        </ThemeRoot>
      </AppProvider>
    </AuthProvider>
  );
}
