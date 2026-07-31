import { useEffect, useState } from "react";
import { Check, Receipt, X } from "lucide-react";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import ConfirmModal from "../../../components/ConfirmModal";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../services/supabase";
import type { PaymentRequest } from "../../../types";

function mapRequestRow(row: {
  id: string;
  church_id: string;
  plan_id: string;
  billing_cycle: PaymentRequest["billingCycle"];
  status: PaymentRequest["status"];
  created_at: string;
  user_id: string;
  church: { name: string } | null;
  requester: { name: string } | null;
  plan: { display_name: string } | null;
}): PaymentRequest {
  return {
    id: row.id,
    churchId: row.church_id,
    churchName: row.church?.name ?? "—",
    userId: row.user_id,
    userName: row.requester?.name ?? "—",
    planId: row.plan_id,
    planDisplayName: row.plan?.display_name ?? "—",
    billingCycle: row.billing_cycle,
    status: row.status,
    createdAt: row.created_at,
  };
}

interface PaymentRequestsPanelProps {
  // Chamado depois de aprovar/rejeitar, para a aba "Igrejas" refletir o plano
  // atualizado sem precisar trocar de aba manualmente.
  onProcessed: () => void;
}

export default function PaymentRequestsPanel({ onProcessed }: PaymentRequestsPanelProps) {
  const { showToastMsg } = useApp();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<{ request: PaymentRequest; action: "approve" | "reject" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id, church_id, plan_id, billing_cycle, status, created_at, user_id, church:churches(name), requester:profiles(name), plan:plans(display_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) setRequests((data as unknown as Parameters<typeof mapRequestRow>[0][]).map(mapRequestRow));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const confirmAction = async () => {
    if (!confirmTarget) return;
    setIsProcessing(true);
    const rpcName = confirmTarget.action === "approve" ? "admin_approve_payment_request" : "admin_reject_payment_request";
    const { error } = await supabase.rpc(rpcName, { p_request_id: confirmTarget.request.id });
    setIsProcessing(false);
    setConfirmTarget(null);
    if (error) {
      showToastMsg(`Falha ao processar solicitação: ${error.message}`);
      return;
    }
    showToastMsg(confirmTarget.action === "approve" ? "Assinatura aprovada com sucesso" : "Solicitação rejeitada");
    await refresh();
    onProcessed();
  };

  return (
    <>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-700 dark:text-neutral-400">
                <th className="px-4.5 py-3 font-medium text-xs">Igreja</th>
                <th className="px-4.5 py-3 font-medium text-xs">Usuário</th>
                <th className="px-4.5 py-3 font-medium text-xs">Plano Solicitado</th>
                <th className="px-4.5 py-3 font-medium text-xs">Ciclo</th>
                <th className="px-4.5 py-3 font-medium text-xs">Data</th>
                <th className="px-4.5 py-3 font-medium text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-neutral-300 dark:border-white/10">
                  <td className="px-4.5 py-3">{r.churchName}</td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400">{r.userName}</td>
                  <td className="px-4.5 py-3">
                    <Badge tone="info" appearance="outline">
                      {r.planDisplayName}
                    </Badge>
                  </td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400 text-xs">
                    {r.billingCycle === "monthly" ? "Mensal" : "Anual"}
                  </td>
                  <td className="px-4.5 py-3 text-neutral-700 dark:text-neutral-400 text-xs">
                    {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4.5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmTarget({ request: r, action: "reject" })}
                        title="Rejeitar"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-status-error hover:bg-status-error/10"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmTarget({ request: r, action: "approve" })}
                        title="Aprovar"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-status-success text-white hover:opacity-90"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && requests.length === 0 && (
          <div className="p-10 text-center">
            <Receipt size={28} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
            <div className="text-sm font-medium mb-1">Nenhuma solicitação pendente</div>
            <div className="text-xs text-neutral-700 dark:text-neutral-400">
              Solicitações de troca de plano via Pix aparecem aqui para aprovação.
            </div>
          </div>
        )}
      </Card>

      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.action === "approve" ? "Aprovar Assinatura" : "Rejeitar Solicitação"}
          tone={confirmTarget.action === "approve" ? "primary" : "error"}
          description={
            confirmTarget.action === "approve" ? (
              <>
                Confirma a aprovação do plano <strong>{confirmTarget.request.planDisplayName}</strong> para{" "}
                <strong>{confirmTarget.request.churchName}</strong>? O plano da igreja será atualizado imediatamente.
              </>
            ) : (
              <>
                Confirma a rejeição da solicitação de <strong>{confirmTarget.request.churchName}</strong>? A igreja
                permanecerá no plano atual.
              </>
            )
          }
          confirmLabel={confirmTarget.action === "approve" ? "Aprovar" : "Rejeitar"}
          confirmingLabel="Processando…"
          isConfirming={isProcessing}
          onConfirm={confirmAction}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </>
  );
}
