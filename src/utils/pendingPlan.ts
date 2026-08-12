const PENDING_PLAN_KEY = "pending_plan_selection";

// TTL sugerido pra quem for LER esta chave no futuro (ver contrato abaixo) —
// não é aplicado aqui, já que nada consome o valor ainda.
export const PENDING_PLAN_TTL_MS = 30 * 60 * 1000;

interface PendingPlanSelection {
  plan: string;
  capturedAt: number;
}

// Plano escolhido na landing (?plan=pro|unlimited, valor literal de
// `plans.name`) antes do cadastro. Por enquanto isto só CAPTURA o valor —
// nenhuma tela consome/redireciona com base nele ainda, porque hoje o
// onboarding sempre cai em /dashboard após o login (ver docs/changelog.md,
// entrada desta mesma sessão, pro porquê disso não foi acoplado agora).
//
// Contrato pra uma implementação futura de redirect pós-onboarding que venha
// a ler esta chave: (a) descartar o valor se `Date.now() - capturedAt >
// PENDING_PLAN_TTL_MS`; (b) remover a chave do localStorage assim que lida
// UMA vez, seja pra consumir o plano ou pra descartar por expiração — nunca
// deixá-la persistente, ou um login futuro sem relação com este cadastro
// herda o redirect por engano.
export function storePendingPlan(planName: string): void {
  const entry: PendingPlanSelection = { plan: planName, capturedAt: Date.now() };
  localStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(entry));
}
