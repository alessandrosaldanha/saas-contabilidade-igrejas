// Edge Function: edita nome/e-mail de outro usuário sincronizando os DOIS
// lados — public.profiles (via RPC admin_update_user_profile/master_update_
// profile, que já validam permissão) E auth.users (via admin.updateUserById,
// só possível com service-role, por isso precisa desta function). Antes, o
// client chamava a RPC direto e só o profiles.email mudava — auth.users.email
// ficava para trás, causando 404 em generate-reset-link sempre que o e-mail
// de alguém era editado (ver docs/changelog.md).
// Ordem das escritas: Auth primeiro (valida formato/unicidade do e-mail antes
// de qualquer gravação), profiles depois via RPC; se a RPC falhar, o e-mail
// no Auth é revertido para o valor antigo — nunca fica um lado sincronizado
// e o outro não.
// Deploy: supabase functions deploy admin-update-user-profile
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
      return new Response("Apenas administradores podem editar usuários", { status: 403, headers: CORS_HEADERS });
    }

    const { target_id, new_name, new_email, new_cpf } = await req.json();
    if (!target_id || !new_name || !new_email) {
      return new Response("Campos obrigatórios: target_id, new_name, new_email", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }
    const trimmedEmail = String(new_email).trim();
    const trimmedName = String(new_name).trim();

    const { data: targetProfile } = await callerClient
      .from("profiles")
      .select("role, church_id")
      .eq("id", target_id)
      .single();
    if (!targetProfile) {
      return new Response("Usuário não encontrado", { status: 404, headers: CORS_HEADERS });
    }

    // Mesma regra unificada de gestão de usuário usada em generate-reset-link/
    // admin_update_user_role/admin_set_user_status/admin_delete_user/
    // cancel-invite: master gerencia qualquer um; Admin só Tesoureiro/
    // Auditor/Conselho Fiscal da própria igreja ou de uma filha direta,
    // nunca outro Admin nem o master. Checado aqui em JS porque a escrita no
    // Auth (abaixo) usa service-role e não passa pela RLS/RPC.
    if (!callerIsMaster) {
      if (targetProfile.role === "Admin" || targetProfile.role === "master") {
        return new Response("Apenas o Admin Master pode editar outro Administrador", {
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
        return new Response("Você só pode editar usuários da sua igreja ou de suas igrejas filhas", {
          status: 403,
          headers: CORS_HEADERS,
        });
      }
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(target_id);
    const oldAuthEmail = authUserData?.user?.email;
    if (authUserError || !oldAuthEmail) {
      return new Response("Usuário não encontrado no Auth", { status: 404, headers: CORS_HEADERS });
    }

    const emailChanged = oldAuthEmail !== trimmedEmail;
    if (emailChanged) {
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(target_id, {
        email: trimmedEmail,
        email_confirm: true,
      });
      if (updateAuthError) {
        return new Response(`Falha ao atualizar e-mail de login: ${updateAuthError.message}`, {
          status: 400,
          headers: CORS_HEADERS,
        });
      }
    }

    const { error: rpcError } = callerIsMaster
      ? await callerClient.rpc("master_update_profile", {
          target_id,
          new_name: trimmedName,
          new_email: trimmedEmail,
          new_cpf: new_cpf ?? null,
        })
      : await callerClient.rpc("admin_update_user_profile", {
          target_id,
          new_name: trimmedName,
          new_email: trimmedEmail,
        });

    if (rpcError) {
      // profiles não foi escrito — se o Auth já tinha mudado, reverte pra não
      // ficar um lado sincronizado e o outro não.
      if (emailChanged) {
        await adminClient.auth.admin.updateUserById(target_id, { email: oldAuthEmail, email_confirm: true });
      }
      return new Response(`Falha ao salvar perfil: ${rpcError.message}`, { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
