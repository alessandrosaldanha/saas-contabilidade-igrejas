import { useState } from "react";
import type { ChangeEvent } from "react";
import { X, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { supabase } from "../../../services/supabase";
import { isUnlimited, UNLIMITED } from "../../../utils/plans";
import type { ImportFormat, Plan } from "../../../types";

interface EditPlanModalProps {
  plan: Plan;
  onClose: () => void;
  onSaved: () => void;
}

interface PlanFormState {
  displayName: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  features: string[];
  maxAiReads: number;
  maxPdfDownloads: number;
  maxChildChurches: number;
  allowedImportFormats: ImportFormat[];
  allowStrictMode: boolean;
  bankName: string;
  accountHolder: string;
  accountDocument: string;
  pixKey: string;
  pixQrCodeUrl: string;
}

function toFormState(plan: Plan): PlanFormState {
  return {
    displayName: plan.displayName,
    description: plan.description,
    priceMonthly: String(plan.priceMonthly),
    priceYearly: String(plan.priceYearly),
    features: plan.features.length > 0 ? plan.features : [""],
    maxAiReads: plan.maxAiReads,
    maxPdfDownloads: plan.maxPdfDownloads,
    maxChildChurches: plan.maxChildChurches,
    allowedImportFormats: plan.allowedImportFormats,
    allowStrictMode: plan.allowStrictMode,
    bankName: plan.bankName ?? "",
    accountHolder: plan.accountHolder ?? "",
    accountDocument: plan.accountDocument ?? "",
    pixKey: plan.pixKey ?? "",
    pixQrCodeUrl: plan.pixQrCodeUrl ?? "",
  };
}

const FORMAT_OPTIONS: { value: ImportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
  { value: "ofx", label: "OFX/QFX" },
  { value: "image", label: "Imagem" },
];

const inputCls =
  "w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none disabled:opacity-50";
const labelCls = "block text-sm font-medium mb-1.5";
const sectionTitleCls = "text-xs font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-400 mb-3";

interface LimitFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function LimitField({ label, value, onChange }: LimitFieldProps) {
  const unlimited = isUnlimited(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={labelCls}>{label}</span>
        <label className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => onChange(e.target.checked ? UNLIMITED : 0)}
          />
          Ilimitado
        </label>
      </div>
      <input
        type="number"
        min={0}
        value={unlimited ? "" : value}
        disabled={unlimited}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className={inputCls}
      />
    </div>
  );
}

// Modal de edição completa de um plano — só chega aqui quem já está dentro
// da Governança (rota /governanca restrita a `master`, ver App.tsx). Grava
// direto em `plans` (RLS `plans_update_master`, migration 0023).
export default function EditPlanModal({ plan, onClose, onSaved }: EditPlanModalProps) {
  const { showToastMsg } = useApp();
  const [form, setForm] = useState<PlanFormState>(toFormState(plan));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const patch = (p: Partial<PlanFormState>) => setForm((f) => ({ ...f, ...p }));

  const updateFeature = (index: number, value: string) =>
    patch({ features: form.features.map((f, i) => (i === index ? value : f)) });
  const addFeature = () => patch({ features: [...form.features, ""] });
  const removeFeature = (index: number) => patch({ features: form.features.filter((_, i) => i !== index) });

  const toggleFormat = (format: ImportFormat) => {
    const has = form.allowedImportFormats.includes(format);
    patch({
      allowedImportFormats: has
        ? form.allowedImportFormats.filter((f) => f !== format)
        : [...form.allowedImportFormats, format],
    });
  };

  const uploadQrCode = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingQr(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${plan.id}-qrcode-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("plan-assets").upload(path, file, { upsert: true });
    setIsUploadingQr(false);
    if (error) {
      showToastMsg(`Falha ao enviar QR Code: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("plan-assets").getPublicUrl(path);
    patch({ pixQrCodeUrl: data.publicUrl });
  };

  const submit = async () => {
    if (!form.displayName.trim()) {
      showToastMsg("Informe o nome do plano.");
      return;
    }
    const priceMonthly = parseFloat(form.priceMonthly.replace(",", "."));
    const priceYearly = parseFloat(form.priceYearly.replace(",", "."));
    if (!(priceMonthly >= 0) || !(priceYearly >= 0)) {
      showToastMsg("Informe preços mensal e anual válidos.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("plans")
      .update({
        display_name: form.displayName.trim(),
        description: form.description.trim(),
        price_monthly: priceMonthly,
        price_yearly: priceYearly,
        features: form.features.map((f) => f.trim()).filter(Boolean),
        max_ai_reads: form.maxAiReads,
        max_pdf_downloads: form.maxPdfDownloads,
        max_child_churches: form.maxChildChurches,
        allowed_import_formats: form.allowedImportFormats,
        allow_strict_mode: form.allowStrictMode,
        bank_name: form.bankName.trim() || null,
        account_holder: form.accountHolder.trim() || null,
        account_document: form.accountDocument.trim() || null,
        pix_key: form.pixKey.trim() || null,
        pix_qr_code_url: form.pixQrCodeUrl.trim() || null,
      })
      .eq("id", plan.id);
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao salvar plano: ${error.message}`);
      return;
    }
    showToastMsg(`Plano "${form.displayName.trim()}" atualizado com sucesso`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-lg shadow-md p-5 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-lg m-0">Editar Plano — {plan.displayName}</h3>
          <button onClick={onClose} className="text-neutral-700 dark:text-neutral-400 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <div className={sectionTitleCls}>Informações Gerais</div>
            <div className="flex flex-col gap-3.5">
              <label className="block">
                <span className={labelCls}>Nome do Plano</span>
                <input value={form.displayName} onChange={(e) => patch({ displayName: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Descrição</span>
                <input
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Frase curta exibida no card do plano"
                  className={inputCls}
                />
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="block flex-1">
                  <span className={labelCls}>Preço Mensal (R$)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.priceMonthly}
                    onChange={(e) => patch({ priceMonthly: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block flex-1">
                  <span className={labelCls}>Preço Anual (R$)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.priceYearly}
                    onChange={(e) => patch({ priceYearly: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          </section>

          <section>
            <div className={sectionTitleCls}>Dados de Recebimento Bancário</div>
            <div className="flex flex-col gap-3.5">
              <label className="block">
                <span className={labelCls}>Nome do Banco</span>
                <input
                  value={form.bankName}
                  onChange={(e) => patch({ bankName: e.target.value })}
                  placeholder="Ex: Banco Inter"
                  className={inputCls}
                />
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="block flex-1">
                  <span className={labelCls}>Titular da Conta</span>
                  <input
                    value={form.accountHolder}
                    onChange={(e) => patch({ accountHolder: e.target.value })}
                    placeholder="Nome ou Razão Social"
                    className={inputCls}
                  />
                </label>
                <label className="block flex-1">
                  <span className={labelCls}>CPF/CNPJ do Titular</span>
                  <input
                    value={form.accountDocument}
                    onChange={(e) => patch({ accountDocument: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className={inputCls}
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>Chave Pix</span>
                <input
                  value={form.pixKey}
                  onChange={(e) => patch({ pixKey: e.target.value })}
                  placeholder="e-mail, telefone, CPF/CNPJ ou chave aleatória"
                  className={inputCls}
                />
              </label>
              <div>
                <span className={labelCls}>QR Code Pix</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-md border border-neutral-300 dark:border-white/20 flex items-center justify-center overflow-hidden bg-white shrink-0">
                    {form.pixQrCodeUrl ? (
                      <img src={form.pixQrCodeUrl} alt="Pré-visualização do QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <Upload size={18} className="text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer">
                      {isUploadingQr ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {isUploadingQr ? "Enviando…" : "Enviar imagem"}
                      <input type="file" accept="image/*" onChange={uploadQrCode} disabled={isUploadingQr} className="hidden" />
                    </label>
                    <input
                      value={form.pixQrCodeUrl}
                      onChange={(e) => patch({ pixQrCodeUrl: e.target.value })}
                      placeholder="ou cole a URL da imagem"
                      className={`${inputCls} text-xs px-2.5 py-1.5`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className={sectionTitleCls}>Recursos e Benefícios</div>
            <div className="flex flex-col gap-2">
              {form.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={feature}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder="Ex: 60 leituras por IA / mês"
                    className={inputCls}
                  />
                  <button
                    onClick={() => removeFeature(i)}
                    title="Remover benefício"
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addFeature}
                className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-md border border-dashed border-neutral-300 dark:border-white/20 text-xs font-medium text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                <Plus size={13} />
                Adicionar Benefício
              </button>
            </div>
          </section>

          <section>
            <div className={sectionTitleCls}>Limites Operacionais</div>
            <div className="flex flex-col gap-3.5">
              <LimitField label="Leituras por IA / mês" value={form.maxAiReads} onChange={(v) => patch({ maxAiReads: v })} />
              <LimitField label="PDFs / mês" value={form.maxPdfDownloads} onChange={(v) => patch({ maxPdfDownloads: v })} />
              <LimitField
                label="Subcongregações"
                value={form.maxChildChurches}
                onChange={(v) => patch({ maxChildChurches: v })}
              />

              <div>
                <span className={labelCls}>Formatos de Importação Permitidos</span>
                <div className="flex flex-wrap gap-3">
                  {FORMAT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.allowedImportFormats.includes(opt.value)}
                        onChange={() => toggleFormat(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.allowStrictMode}
                  onChange={(e) => patch({ allowStrictMode: e.target.checked })}
                />
                Libera o Modo Estrito de Categorização
              </label>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2.5 mt-7">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
          >
            {isSaving ? "Salvando…" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
