import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LivroCaixa from "./pages/LivroCaixa";
import ImportacaoExtrato from "./pages/ImportacaoExtrato";
import Auditoria from "./pages/Auditoria";
import Usuarios from "./pages/Usuarios";

function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { isDark } = useApp();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ThemeRoot>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="importacao" element={<ImportacaoExtrato />} />
                  <Route path="livro-caixa" element={<LivroCaixa />} />
                  <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
                    <Route path="usuarios" element={<Usuarios />} />
                  </Route>
                  <Route path="auditoria" element={<Auditoria />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeRoot>
      </AppProvider>
    </AuthProvider>
  );
}
