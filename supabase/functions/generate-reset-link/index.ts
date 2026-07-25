// Edge Function: gera um link de redefinição de senha (token de recovery real
// do Supabase Auth) para um usuário e devolve o link pronto para o Admin
// copiar/enviar manualmente — em vez de depender do e-mail de recovery do
// Supabase chegar (ver incidente de `otp_expired` documentado no CLAUDE.md).
// Precisa de service-role key — por isso roda aqui, nunca no frontend.
// Deploy: supabase functions deploy generate-reset-link
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ALLOWED_ORIGINS, corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req);
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
      .select("role, church_id")
      .eq("id", caller.id)
      .single();

    const callerIsMaster = callerProfile?.role === "master";
    if (!callerIsMaster && callerProfile?.role !== "Admin") {
      return new Response("Apenas administradores podem gerar link de redefinição de senha", {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const { email, redirectTo } = await req.json();
    if (!email || !redirectTo) {
      return new Response("Campos obrigatórios: email, redirectTo", { status: 400, headers: CORS_HEADERS });
    }
    // Defesa em profundidade: o Supabase Auth já valida `redirectTo` contra a
    // allow-list de Redirect URLs do projeto antes de gerar o link, mas checar
    // aqui também evita depender só dessa configuração remota.
    if (!ALLOWED_ORIGINS.some((origin) => redirectTo.startsWith(origin))) {
      return new Response("redirectTo fora do domínio autorizado", { status: 400, headers: CORS_HEADERS });
    }

    // Um Admin comum só pode gerar link de redefinição para alguém da própria
    // igreja — sem isso, um Admin de uma igreja poderia resetar a senha de
    // qualquer usuário de outra igreja só sabendo o e-mail. O Master não tem
    // essa restrição.
    const { data: targetProfile } = await callerClient
      .from("profiles")
      .select("church_id")
      .eq("email", email)
      .single();

    if (!targetProfile) {
      return new Response("Usuário não encontrado", { status: 404, headers: CORS_HEADERS });
    }
    if (!callerIsMaster && targetProfile.church_id !== callerProfile!.church_id) {
      return new Response("Você só pode gerar link de redefinição para usuários da sua própria igreja", {
        status: 403,
        headers: CORS_HEADERS,
      });
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
      church_id: targetProfile?.church_id ?? null,
    });

    return new Response(JSON.stringify({ actionLink: data.properties.action_link }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
