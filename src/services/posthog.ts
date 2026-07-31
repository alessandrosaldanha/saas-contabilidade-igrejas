import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

// Diferente do Supabase (obrigatório), PostHog é só telemetria — sem a key,
// segue sem analytics em vez de quebrar o app (ex: dev local sem `.env` de analytics).
export function initPostHog(): void {
  if (!posthogKey) {
    console.warn("VITE_POSTHOG_KEY não definida — analytics do PostHog desativado.");
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
  });
}

export { posthog };
