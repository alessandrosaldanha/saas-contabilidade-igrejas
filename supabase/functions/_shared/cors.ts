// Origens autorizadas a chamar as Edge Functions deste projeto via navegador.
// Antes, todas as funções respondiam "Access-Control-Allow-Origin: *" — qualquer
// site poderia montar uma requisição autenticada (reutilizando um token Bearer que
// já tivesse obtido de outra forma) e ler a resposta. Refletir só as origens
// conhecidas fecha essa superfície sem afetar nenhum fluxo real, já que o app só
// chama estas functions a partir do domínio de produção ou do localhost de dev.
export const ALLOWED_ORIGINS = [
  "https://saas-contabilidade-igrejas.vercel.app",
  "http://localhost:5173",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
