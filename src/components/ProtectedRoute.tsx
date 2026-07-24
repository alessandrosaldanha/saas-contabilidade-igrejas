import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

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
