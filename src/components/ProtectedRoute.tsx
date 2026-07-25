import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TermsAcceptanceModal from "./TermsAcceptanceModal";
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

  // Bloqueia toda a árvore de rotas protegidas (inclusive as com allowedRoles
  // abaixo, que nem chegam a avaliar) até o aceite explícito dos Termos de
  // Uso — igual à recuperação de senha acima, não é uma questão de role.
  if (!profile.termoAceito) {
    return <TermsAcceptanceModal />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // O Master não tem acesso a /dashboard (não pertence a nenhuma igreja) —
    // sem este caso especial, um Master barrado aqui cairia num loop de
    // redirecionamento (mandado de volta pra uma rota que ele também não pode acessar).
    return <Navigate to={profile.role === "master" ? "/governanca" : "/dashboard"} replace />;
  }

  return <Outlet />;
}
