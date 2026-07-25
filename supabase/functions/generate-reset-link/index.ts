// Edge Function: gera um link de redefinição de senha (token de recovery real
// do Supabase Auth) para um usuário e devolve o link pronto para o Admin
// copiar/enviar manualmente — em vez de depender do e-mail de recovery do
// Supabase chegar (ver incidente de `otp_expired` documentado no CLAUDE.md).
// Precisa de service-role key — por isso roda aqui, nunca no frontend.
// Deploy: supabase functions deploy generate-reset-link
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response("Não autenticado", { status: 401, headers: CORS_HEADERS });
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "Admin") {
      return new Response("Apenas administradores podem gerar link de redefinição de senha", {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const { email, redirectTo } = await req.json();
    if (!email || !redirectTo) {
      return new Response("Campos obrigatórios: email, redirectTo", { status: 400, headers: CORS_HEADERS });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error) {
      return new Response(error.message, { status: 400, headers: CORS_HEADERS });
    }

    await callerClient.from("audit_logs").insert({
      user_id: caller.id,
      role: callerProfile.role,
      action_key: "edicao_manual",
      action_label: "Edição Manual",
      before: "—",
      after: `Link de redefinição de senha gerado para ${email}`,
    });

    return new Response(JSON.stringify({ actionLink: data.properties.action_link }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
