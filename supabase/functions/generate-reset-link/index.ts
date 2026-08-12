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

    // Mesma regra unificada de gestão de usuário usada em admin_update_user_role/
    // admin_set_user_status/admin_delete_user/cancel-invite: Admin só alcança
    // Tesoureiro/Auditor/Conselho Fiscal da própria igreja ou de uma filha
    // direta, nunca outro Admin nem o master. Antes disso, esta function só
    // checava "mesma igreja exata" e nunca checava o role do alvo — um Admin
    // podia resetar a senha de outro Admin da própria igreja sem barreira.
    const { data: targetProfile } = await callerClient
      .from("profiles")
      .select("id, role, church_id")
      .eq("email", email)
      .single();

    if (!targetProfile) {
      return new Response("Usuário não encontrado", { status: 404, headers: CORS_HEADERS });
    }

    if (!callerIsMaster) {
      if (targetProfile.role === "Admin" || targetProfile.role === "master") {
        return new Response("Apenas o Admin Master pode gerar link de redefinição para Administrador", {
          status: 403,
          headers: CORS_HEADERS,
        });
      }
      let sameOrChildChurch = targetProfile.church_id === callerProfile!.church_id;
      if (!sameOrChildChurch) {
        const { data: childRow } = await callerClient
          .from("churches")
          .select("id")
          .eq("id", targetProfile.church_id)
          .eq("parent_church_id", callerProfile!.church_id)
          .single();
        sameOrChildChurch = !!childRow;
      }
      if (!sameOrChildChurch) {
        return new Response("Você só pode gerar link de redefinição para usuários da sua igreja ou de suas igrejas filhas", {
          status: 403,
          headers: CORS_HEADERS,
        });
      }
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // `email` vem de public.profiles (o que o Admin vê na tabela), mas o
    // GoTrue procura o usuário pelo e-mail de LOGIN em auth.users — esses dois
    // podem divergir, porque admin_update_user_profile/master_update_profile
    // só escrevem profiles.email (ver docs/permissions-rbac.md). Buscar o
    // e-mail real pelo id evita o 404 "User with this email not found" que
    // isso causava sempre que os dois estavam fora de sincronia.
    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(targetProfile.id);
    const authEmail = authUserData?.user?.email;
    if (authUserError || !authEmail) {
      return new Response("Usuário não encontrado no Auth (e-mail de login pode estar desatualizado)", {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: authEmail,
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
      after:
        authEmail === email
          ? `Link de redefinição de senha gerado para ${email}`
          : `Link de redefinição de senha gerado para ${email} (e-mail de login no Auth: ${authEmail})`,
      church_id: targetProfile?.church_id ?? null,
    });

    return new Response(JSON.stringify({ actionLink: data.properties.action_link }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
