// Edge Function: cancela um convite pendente (hard delete real via Admin API)
// — só vale para profiles.status = 'Convite Pendente' (usuário nunca logou, sem
// nenhuma linha em audit_logs/transactions/import_history apontando pro seu id,
// então excluir de verdade não quebra a trilha de auditoria). Qualquer outro
// status usa a RPC admin_delete_user (soft-delete), nunca esta function.
// Precisa de service-role key — por isso roda aqui, nunca no frontend.
// Deploy: supabase functions deploy cancel-invite
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
      return new Response("Apenas administradores podem cancelar convites", { status: 403, headers: CORS_HEADERS });
    }

    const { target_id } = await req.json();
    if (!target_id) {
      return new Response("Campo obrigatório: target_id", { status: 400, headers: CORS_HEADERS });
    }
    if (target_id === caller.id) {
      return new Response("Você não pode cancelar o próprio convite", { status: 400, headers: CORS_HEADERS });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("role, status, church_id, name, email")
      .eq("id", target_id)
      .single();

    if (!targetProfile) {
      return new Response("Usuário não encontrado", { status: 404, headers: CORS_HEADERS });
    }
    if (targetProfile.status !== "Convite Pendente") {
      return new Response(
        "Este usuário já ativou a conta — use a opção Excluir Usuário, não o cancelamento de convite",
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Mesma regra da RPC admin_delete_user: Admin só cancela convites da própria
    // igreja ou de uma filha direta, nunca de outro Admin.
    if (!callerIsMaster) {
      if (targetProfile.role === "Admin") {
        return new Response("Apenas o Admin Master pode cancelar convite de Administrador", {
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
        return new Response("Você só pode cancelar convites da sua igreja ou de suas igrejas filhas", {
          status: 403,
          headers: CORS_HEADERS,
        });
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_id);
    if (deleteError) {
      return new Response(deleteError.message, { status: 400, headers: CORS_HEADERS });
    }

    await callerClient.from("audit_logs").insert({
      user_id: caller.id,
      role: callerProfile!.role,
      action_key: "estorno",
      action_label: "Estorno/Exclusão",
      before: "Convite Pendente",
      after: `Convite cancelado: ${targetProfile.name} (${targetProfile.email})`,
      church_id: targetProfile.church_id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
