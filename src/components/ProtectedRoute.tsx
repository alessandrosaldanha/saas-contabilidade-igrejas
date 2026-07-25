import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading, isPasswordRecovery } = useAuth();

  // Checado antes de tudo (inclusive antes de `loading`): uma sessão de
  // recuperação de senha nunca deve cair em nenhuma rota protegida, mesmo que
  // a sessão em si já pareça "válida" — ver detectPasswordRecoveryFromUrl() em
  // AuthContext.tsx para o porquê disso não pode esperar `loading` terminar.
  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-400">
        Carregando sessão…
      </div>
    );
  }

  if (!session || !profile || profile.status === "Inativo") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
