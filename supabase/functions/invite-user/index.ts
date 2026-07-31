// Edge Function: cria um novo usuário (Auth) já com a senha definida pelo Admin
// (em vez do fluxo de convite por e-mail, que sofria com o link sendo
// pré-consumido por scanners de segurança — ver CLAUDE.md) e grava name/role
// no profile. Precisa de service-role key — por isso roda aqui, nunca no frontend.
// Deploy: supabase functions deploy invite-user
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem por
// padrão no runtime de toda Edge Function (não precisam ser configuradas como secret).
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
      .select("role, church_id")
      .eq("id", caller.id)
      .single();

    const callerIsMaster = callerProfile?.role === "master";
    if (!callerIsMaster && callerProfile?.role !== "Admin") {
      return new Response("Apenas administradores podem convidar usuários", { status: 403, headers: CORS_HEADERS });
    }

    const { email, name, role, password, cpf, church_id } = await req.json();
    if (!email || !name || !role || !password) {
      return new Response("Campos obrigatórios: email, name, role, password", { status: 400, headers: CORS_HEADERS });
    }
    if (typeof password !== "string" || password.length < 8) {
      return new Response("A senha deve ter pelo menos 8 caracteres", { status: 400, headers: CORS_HEADERS });
    }
    if (!["Admin", "Tesoureiro", "Auditor", "Conselho Fiscal"].includes(role)) {
      return new Response("Perfil de acesso inválido", { status: 400, headers: CORS_HEADERS });
    }

    // Um Admin comum só cadastra membros da própria igreja OU de uma igreja
    // FILHA direta dela (subcongregação sob a mesma assinatura — hierarquia de
    // só 2 níveis); o Master pode escolher qualquer igreja, mas precisa
    // informá-la explicitamente.
    let effectiveChurchId: string | null;
    if (callerIsMaster) {
      if (!church_id) {
        return new Response("church_id é obrigatório para o Admin Master", { status: 400, headers: CORS_HEADERS });
      }
      const { data: churchRow } = await callerClient.from("churches").select("id").eq("id", church_id).single();
      if (!churchRow) {
        return new Response("Igreja não encontrada", { status: 400, headers: CORS_HEADERS });
      }
      effectiveChurchId = church_id;
    } else if (church_id && church_id !== callerProfile!.church_id) {
      const { data: childRow } = await callerClient
        .from("churches")
        .select("id")
        .eq("id", church_id)
        .eq("parent_church_id", callerProfile!.church_id)
        .single();
      if (!childRow) {
        return new Response("Você só pode convidar membros da sua igreja ou de suas igrejas filhas", {
          status: 403,
          headers: CORS_HEADERS,
        });
      }
      effectiveChurchId = church_id;
    } else {
      effectiveChurchId = callerProfile!.church_id;
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, church_id: effectiveChurchId, cpf: cpf || null },
    });

    if (error) {
      return new Response(error.message, { status: 400, headers: CORS_HEADERS });
    }

    await callerClient.from("audit_logs").insert({
      user_id: caller.id,
      role: callerProfile!.role,
      action_key: "edicao_manual",
      action_label: "Edição Manual",
      before: "—",
      after: `Usuário criado: ${email} (${role})`,
      church_id: effectiveChurchId,
    });

    return new Response(JSON.stringify({ userId: data.user?.id }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
