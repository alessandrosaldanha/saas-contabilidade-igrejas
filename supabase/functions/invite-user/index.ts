// Edge Function: convida um novo usuário (Auth) e já grava name/role no profile.
// Precisa de service-role key — por isso roda aqui, nunca no frontend.
// Deploy: supabase functions deploy invite-user
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem por
// padrão no runtime de toda Edge Function (não precisam ser configuradas como secret).
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
      return new Response("Apenas administradores podem convidar usuários", { status: 403, headers: CORS_HEADERS });
    }

    const { email, name, role } = await req.json();
    if (!email || !name || !role) {
      return new Response("Campos obrigatórios: email, name, role", { status: 400, headers: CORS_HEADERS });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { name, role },
    });

    if (error) {
      return new Response(error.message, { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ userId: data.user?.id }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
