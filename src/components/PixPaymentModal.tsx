import { useState } from "react";
import { X, QrCode, MessageCircle, CheckCircle2, Copy, Check } from "lucide-react";
import { supabase } from "../services/supabase";
import { useApp } from "../context/AppContext";
import { fmtPlain } from "../utils/format";
import type { BillingCycle, Plan } from "../types";

// Placeholder — trocar pelo WhatsApp real da organização antes de publicar
// em produção (os dados bancários/Pix em si já vêm do plano, configurados
// pelo master no Painel de Governança — ver `plans.pix_key`/`bank_name`/etc.).
const WHATSAPP_NUMBER = "5582981273619";

interface PixPaymentModalProps {
  plan: Plan;
  billingCycle: BillingCycle;
  churchName: string;
  onClose: () => void;
  onRequested: () => void;
}

export default function PixPaymentModal({ plan, billingCycle, churchName, onClose, onRequested }: PixPaymentModalProps) {
  const { showToastMsg } = useApp();
  const [isSending, setIsSending] = useState(false);
  const [requested, setRequested] = useState(false);
  const [copied, setCopied] = useState(false);

  const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const cycleLabel = billingCycle === "monthly" ? "mês" : "ano";
  const hasBankDetails = !!plan.pixKey;

  const whatsappMessage = `Olá! Sou tesoureiro da igreja ${churchName}. Fiz o Pix referente ao plano ${plan.displayName} e estou enviando o comprovante.`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  const copyPixKey = async () => {
    if (!plan.pixKey) return;
    await navigator.clipboard.writeText(plan.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const notifyAdmin = async () => {
    setIsSending(true);
    const { error } = await supabase.rpc("request_subscription_change", {
      p_plan_id: plan.id,
      p_billing_cycle: billingCycle,
    });
    setIsSending(false);
    if (error) {
      showToastMsg(`Falha ao registrar solicitação: ${error.message}`);
      return;
    }
    setRequested(true);
    onRequested();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8 relative">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-neutral-700 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={18} />
        </button>

        {requested ? (
          <div className="flex flex-col items-center gap-3.5 text-center py-4">
            <span className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-status-success" />
            </span>
            <h3 className="font-display font-semibold text-lg m-0">Solicitação enviada</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed">
              Sua solicitação foi enviada para análise do Admin. Assim que o pagamento for confirmado, o plano{" "}
              <strong>{plan.displayName}</strong> será ativado na sua igreja.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
            >
              Entendi
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display font-semibold text-lg m-0 mb-1.5">Pagamento via Pix</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-5">
              Plano <strong>{plan.displayName}</strong> — {fmtPlain(price)}/{cycleLabel}
            </p>

            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-white/10 rounded-md p-4 mb-5">
              {hasBankDetails ? (
                <>
                  <div className="w-full aspect-square max-w-[180px] mx-auto rounded-md border border-neutral-300 dark:border-white/20 flex flex-col items-center justify-center gap-2 mb-4 overflow-hidden bg-white">
                    {plan.pixQrCodeUrl ? (
                      <img src={plan.pixQrCodeUrl} alt="QR Code Pix" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <QrCode size={40} className="text-neutral-400" />
                        <span className="text-[11px] text-neutral-700 dark:text-neutral-400">QR Code Pix</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 text-sm">
                    <div>
                      <div className="text-xs text-neutral-700 dark:text-neutral-400 mb-1">Chave Pix</div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium break-all">{plan.pixKey}</span>
                        <button
                          onClick={copyPixKey}
                          title="Copiar Chave Pix"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 shrink-0"
                        >
                          {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                          {copied ? "Copiado" : "Copiar Chave"}
                        </button>
                      </div>
                    </div>
                    {plan.accountHolder && (
                      <div>
                        <div className="text-xs text-neutral-700 dark:text-neutral-400 mb-1">Titular</div>
                        <div className="font-medium">{plan.accountHolder}</div>
                      </div>
                    )}
                    {plan.accountDocument && (
                      <div>
                        <div className="text-xs text-neutral-700 dark:text-neutral-400 mb-1">CPF/CNPJ</div>
                        <div className="font-medium">{plan.accountDocument}</div>
                      </div>
                    )}
                    {plan.bankName && (
                      <div>
                        <div className="text-xs text-neutral-700 dark:text-neutral-400 mb-1">Banco</div>
                        <div className="font-medium">{plan.bankName}</div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-neutral-700 dark:text-neutral-400 leading-relaxed m-0">
                  Os dados bancários deste plano ainda não foram configurados. Solicite pelo WhatsApp abaixo e a
                  equipe envia a chave Pix diretamente.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-status-success text-white text-sm font-medium hover:opacity-90"
              >
                <MessageCircle size={15} />
                Enviar Comprovante via WhatsApp
              </a>
              <button
                onClick={notifyAdmin}
                disabled={isSending}
                className="px-4 py-2.5 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-70"
              >
                {isSending ? "Enviando…" : "Já fiz o Pix / Notificar Admin"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
