import { useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import LivroCaixa from "./pages/LivroCaixa";
import ImportacaoExtrato from "./pages/ImportacaoExtrato";
import Auditoria from "./pages/Auditoria";
import Usuarios from "./pages/Usuarios";
import Governanca from "./pages/Governanca";
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

// A home do Master é a Governança (tela exclusiva dele); os demais caem no Dashboard.
function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={profile?.role === "master" ? "/governanca" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ThemeRoot>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomeRedirect />} />
                  <Route element={<ProtectedRoute allowedRoles={["master"]} />}>
                    <Route path="governanca" element={<Governanca />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={TENANT_ROLES} />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="livro-caixa" element={<LivroCaixa />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={IMPORTACAO_ROLES} />}>
                    <Route path="importacao" element={<ImportacaoExtrato />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={["Admin", "master"]} />}>
                    <Route path="usuarios" element={<Usuarios />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={["Admin", "Auditor", "Conselho Fiscal", "master"]} />}>
                    <Route path="auditoria" element={<Auditoria />} />
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
