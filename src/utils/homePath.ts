import type { UserRole } from "../types";

// A home do Master é a Governança (tela exclusiva dele, já que ele não
// pertence a nenhuma igreja); os demais papéis caem no Dashboard. Usado sempre
// que é preciso mandar um usuário autenticado para "a tela dele" — pós-login,
// landing pública com sessão ativa, ou um role barrado por allowedRoles.
export function getHomePath(role: UserRole | undefined): string {
  return role === "master" ? "/governanca" : "/dashboard";
}
