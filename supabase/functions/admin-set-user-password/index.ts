// Edge Function: o Admin Master define a senha de um usuário diretamente
// (sem link, sem e-mail) — atalho de emergência para quando o usuário não
// tem acesso ao e-mail cadastrado. Convive com generate-reset-link (fluxo
// normal via link); esta aqui é restrita ao master porque o Master literal-
// mente sabe a senha por um instante — por isso o log de auditoria abaixo é
// OBRIGATÓRIO, sem nenhuma forma de pular.
// Precisa de service-role key (admin.updateUserById) — nunca no frontend.
// Deploy: supabase functions deploy admin-set-user-password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "master") {
      return new Response("Apenas o Admin Master pode definir senha diretamente", {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const { target_id, new_password } = await req.json();
    if (!target_id || !new_password) {
      return new Response("Campos obrigatórios: target_id, new_password", { status: 400, headers: CORS_HEADERS });
    }
    if (typeof new_password !== "string" || new_password.length < 8) {
      return new Response("A senha deve ter pelo menos 8 caracteres", { status: 400, headers: CORS_HEADERS });
    }
    if (target_id === caller.id) {
      return new Response("Use a tela de Perfil para trocar a própria senha", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const { data: targetProfile } = await callerClient
      .from("profiles")
      .select("email, role, church_id")
      .eq("id", target_id)
      .single();
    if (!targetProfile) {
      return new Response("Usuário não encontrado", { status: 404, headers: CORS_HEADERS });
    }
    if (targetProfile.role === "master") {
      return new Response("Não é possível definir a senha de outro Admin Master por aqui", {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await adminClient.auth.admin.updateUserById(target_id, { password: new_password });
    if (error) {
      return new Response(error.message, { status: 400, headers: CORS_HEADERS });
    }

    // Log obrigatório e sem opção de pular — nunca grava a senha em texto,
    // só o fato de que foi definida manualmente e por quem.
    const { error: auditError } = await callerClient.from("audit_logs").insert({
      user_id: caller.id,
      role: callerProfile.role,
      action_key: "definicao_senha_direta",
      action_label: "Senha Definida pelo Master",
      before: "—",
      after: `Senha definida manualmente pelo Master para ${targetProfile.email}`,
      church_id: targetProfile.church_id ?? null,
    });
    if (auditError) {
      return new Response(`Senha alterada, mas falha ao registrar auditoria: ${auditError.message}`, {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
