import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Check, X } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import PricingModal from "../../components/PricingModal";
import UploadDropzone from "./components/UploadDropzone";
import SummaryCards from "./components/SummaryCards";
import TransactionsPreviewTable from "./components/TransactionsPreviewTable";
import ImportHistoryTable from "./components/ImportHistoryTable";
import AiChatPanel from "./components/AiChatPanel";
import type { RuleSuggestion } from "./components/AiChatPanel";
import CategoryRulesModal from "./components/CategoryRulesModal";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { getFunctionErrorMessage, supabase } from "../../services/supabase";
import { MONTHS_FULL } from "../../services/mockData";
import { fmt, isoToBr, brToIso } from "../../utils/format";
import type {
  CategorizationMode,
  ChatMessage,
  Confidence,
  ImportFormat,
  ImportHistoryItem,
  Transaction,
  TransactionType,
} from "../../types";

interface ExtractedItem {
  date: string;
  description: string;
  value: number;
  type: TransactionType;
  category: string;
  confidence: Confidence;
}

function fileExtension(filename: string): string {
  return filename.toLowerCase().split(".").pop() ?? "";
}

function detectMimeType(filename: string): string {
  const ext = fileExtension(filename);
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "text/plain";
}

// null = extensão desconhecida (nem CSV/PDF/OFX/Imagem) — sempre bloqueada,
// mesmo em planos sem restrição de formato.
function detectImportFormat(filename: string): ImportFormat | null {
  const ext = fileExtension(filename);
  if (ext === "csv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "ofx" || ext === "qfx") return "ofx";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function itemToStaged(item: ExtractedItem): Transaction {
  return {
    id: crypto.randomUUID(),
    date: isoToBr(item.date),
    desc: item.description,
    value: item.type === "saida" ? -Math.abs(item.value) : Math.abs(item.value),
    type: item.type,
    category: item.category,
    confidence: item.confidence,
    createdBy: "",
  };
}

function stagedToApiItem(t: Transaction): ExtractedItem {
  return {
    date: brToIso(t.date),
    description: t.desc,
    value: Math.abs(t.value),
    type: t.type,
    category: t.category,
    confidence: t.confidence,
  };
}

function deriveMonthLabel(items: Transaction[]): string {
  const counts = new Map<string, number>();
  for (const t of items) {
    const [, m, y] = t.date.split("/");
    const key = `${y}-${m}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let bestKey = "";
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  const [y, m] = bestKey.split("-");
  return `${MONTHS_FULL[parseInt(m, 10) - 1]} de ${y}`;
}

interface HistoryEditForm {
  id: string;
  filename: string;
  monthLabel: string;
  count: string;
}

function findDuplicates(staged: Transaction[], existing: Transaction[]): Transaction[] {
  const existingKeys = new Set(existing.map((t) => `${t.date}|${t.desc}|${Math.abs(t.value)}|${t.type}`));
  return staged.filter((t) => existingKeys.has(`${t.date}|${t.desc}|${Math.abs(t.value)}|${t.type}`));
}

function categorizationModeKey(churchId: string | null): string {
  return `categorization-mode:${churchId ?? "none"}`;
}

export default function ImportacaoExtrato() {
  const {
    transactions,
    importHistory,
    refreshTransactions,
    refreshImportHistory,
    showToastMsg,
    registerUnsavedGuard,
    effectiveChurchId,
  } = useApp();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { plan, canUseAI, canImportFormat, canUseStrictMode, registerAIUsage } = usePlanLimits(effectiveChurchId);
  const [pricingModalReason, setPricingModalReason] = useState<"ai-limit" | "format" | null>(null);

  const [hasUploaded, setHasUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filename, setFilename] = useState("");
  const [stagedTransactions, setStagedTransactions] = useState<Transaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction[] | null>(null);
  const [historyEdit, setHistoryEdit] = useState<HistoryEditForm | null>(null);
  const [isSavingHistoryEdit, setIsSavingHistoryEdit] = useState(false);
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<ImportHistoryItem | null>(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [applyMode, setApplyModeState] = useState<CategorizationMode>("ai");
  const [ruleSuggestions, setRuleSuggestions] = useState<RuleSuggestion[]>([]);

  // Preferência de modo de categorização (IA Autônoma × Modo Estrito) persiste
  // por igreja no localStorage — evita a tesouraria ter que reescolher a cada
  // visita, sem precisar de uma coluna nova no banco para isso.
  useEffect(() => {
    const stored = localStorage.getItem(categorizationModeKey(effectiveChurchId));
    setApplyModeState(stored === "strict" ? "strict" : "ai");
  }, [effectiveChurchId]);

  const setApplyMode = (mode: CategorizationMode) => {
    setApplyModeState(mode);
    localStorage.setItem(categorizationModeKey(effectiveChurchId), mode);
  };

  // Master só importa/gerencia extratos depois de escolher uma igreja no
  // seletor da Sidebar (sem isso não haveria church_id para gravar o lote).
  const canEditHistory =
    profile?.role === "Admin" || profile?.role === "Tesoureiro" || (profile?.role === "master" && !!effectiveChurchId);
  const canDeleteHistory = profile?.role === "Admin" || (profile?.role === "master" && !!effectiveChurchId);

  const openHistoryEdit = (item: ImportHistoryItem) => {
    setHistoryEdit({ id: item.id, filename: item.filename, monthLabel: item.monthLabel, count: String(item.count) });
  };

  const submitHistoryEdit = async () => {
    if (!historyEdit || isSavingHistoryEdit) return;
    const count = parseInt(historyEdit.count, 10);
    if (!historyEdit.filename.trim() || !historyEdit.monthLabel.trim() || !(count >= 0)) {
      showToastMsg("Preencha nome do arquivo, mês/ano e uma quantidade válida.");
      return;
    }
    setIsSavingHistoryEdit(true);
    const { error } = await supabase
      .from("import_history")
      .update({ filename: historyEdit.filename.trim(), month_label: historyEdit.monthLabel.trim(), count })
      .eq("id", historyEdit.id);
    setIsSavingHistoryEdit(false);
    if (error) {
      showToastMsg(`Falha ao salvar: ${error.message}`);
      return;
    }
    setHistoryEdit(null);
    await refreshImportHistory();
    showToastMsg("Registro de importação atualizado com sucesso");
  };

  const confirmHistoryDelete = async () => {
    if (!historyDeleteTarget || isDeletingHistory) return;
    setIsDeletingHistory(true);
    const { error } = await supabase.from("import_history").delete().eq("id", historyDeleteTarget.id);
    setIsDeletingHistory(false);
    if (error) {
      showToastMsg(`Falha ao excluir: ${error.message}`);
      return;
    }
    setHistoryDeleteTarget(null);
    await Promise.all([refreshImportHistory(), refreshTransactions()]);
    showToastMsg("Registro de importação e lançamentos vinculados excluídos com sucesso");
  };

  const onFileSelected = async (file: File) => {
    const format = detectImportFormat(file.name);
    if (!format || !canImportFormat(format)) {
      setPricingModalReason("format");
      return;
    }
    if (!canUseAI()) {
      setPricingModalReason("ai-limit");
      return;
    }
    setIsUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      const mimeType = detectMimeType(file.name);
      const { data, error } = await supabase.functions.invoke("parse-statement", {
        body: { mode: "extract", filename: file.name, mimeType, contentBase64, applyMode, churchId: effectiveChurchId },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));

      const items = (data.transactions as ExtractedItem[]) ?? [];
      setStagedTransactions(items.map(itemToStaged));
      setFilename(file.name);
      setHasUploaded(true);
      setRuleSuggestions([]);
      setChatMessages([
        {
          id: Date.now(),
          from: "ai",
          text: `Encontrei ${items.length} lançamento(s) em "${file.name}". Posso ajustar categorias — é só me dizer em linguagem natural, por exemplo: "recategorize os pagamentos de energia para Utilidades (Água, Luz, Internet)".`,
        },
      ]);
      // Só conta a cota de leitura de IA depois que o extrato foi de fato
      // processado e os lançamentos ficaram staged com sucesso — nunca antes,
      // para não descontar do plano em caso de erro de API/arquivo inválido.
      await registerAIUsage();
    } catch (err) {
      showToastMsg(`Falha ao processar extrato: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !hasUploaded || isRefining) return;
    if (!canUseAI()) {
      setPricingModalReason("ai-limit");
      return;
    }
    const userMsg: ChatMessage = { id: Date.now(), from: "user", text };
    setChatMessages((msgs) => [...msgs, userMsg]);
    setChatInput("");
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-statement", {
        body: {
          mode: "refine",
          transactions: stagedTransactions.map(stagedToApiItem),
          instruction: text,
          applyMode,
          churchId: effectiveChurchId,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));

      const items = (data.transactions as ExtractedItem[]) ?? [];
      const newStaged = items.map(itemToStaged);

      // A API não devolve o id original (cada refine gera um array novo) —
      // compara por posição/descrição para identificar quais lançamentos
      // tiveram a categoria de fato alterada por essa instrução.
      const changed: RuleSuggestion[] = [];
      newStaged.forEach((nt, i) => {
        const old = stagedTransactions[i];
        if (old && old.desc === nt.desc && old.category !== nt.category) {
          changed.push({ id: nt.id, desc: nt.desc, type: nt.type, oldCategory: old.category, newCategory: nt.category });
        }
      });

      setStagedTransactions(newStaged);
      if (changed.length > 0) setRuleSuggestions((prev) => [...prev, ...changed]);
      setChatMessages((msgs) => [...msgs, { id: Date.now() + 1, from: "ai", text: data.summary || "Lançamentos atualizados." }]);
    } catch (err) {
      setChatMessages((msgs) => [
        ...msgs,
        { id: Date.now() + 1, from: "ai", text: `Não consegui aplicar essa instrução: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  const onSaveRuleSuggestion = async (suggestion: RuleSuggestion, keyword: string) => {
    if (!effectiveChurchId || !keyword.trim()) return;
    const { error } = await supabase
      .from("category_rules")
      .upsert(
        { church_id: effectiveChurchId, keyword: keyword.trim(), type: suggestion.type, category: suggestion.newCategory },
        { onConflict: "church_id,keyword" },
      );
    if (error) {
      showToastMsg(`Falha ao salvar regra: ${error.message}`);
      return;
    }
    setRuleSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    showToastMsg("Regra de categorização salva com sucesso");
  };

  const onDismissRuleSuggestion = (id: string) => {
    setRuleSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const confirmSave = () => {
    if (isSaving || stagedTransactions.length === 0 || !profile) return;
    const duplicates = findDuplicates(stagedTransactions, transactions);
    if (duplicates.length > 0) {
      setDuplicateWarning(duplicates);
      return;
    }
    doSave();
  };

  // Usado tanto pelo botão "Confirmar e Salvar" quanto pelo aviso de navegação com
  // lançamentos não salvos — por isso devolve se o salvamento teve sucesso ou não.
  const doSave = async (): Promise<boolean> => {
    if (isSaving || stagedTransactions.length === 0 || !profile) return false;
    if (profile.role === "master" && !effectiveChurchId) {
      showToastMsg("Selecione uma igreja no menu lateral antes de salvar.");
      return false;
    }
    setDuplicateWarning(null);
    setIsSaving(true);
    try {
      // effectiveChurchId já resolve para a própria igreja (não-master) ou para a
      // igreja em gestão escolhida na Sidebar (master) — nunca depender de
      // DEFAULT do banco/omissão de campo, que é frágil e sujeito a bugs de RLS.
      const { data: historyRow, error: historyError } = await supabase
        .from("import_history")
        .insert({
          filename,
          month_label: deriveMonthLabel(stagedTransactions),
          count: stagedTransactions.length,
          imported_by: profile.id,
          church_id: effectiveChurchId,
        })
        .select("id")
        .single();
      if (historyError) throw new Error(historyError.message);

      const rows = stagedTransactions.map((t) => ({
        occurred_on: brToIso(t.date),
        description: t.desc,
        value: Math.abs(t.value),
        type: t.type,
        category: t.category,
        confidence: t.confidence,
        created_by: profile.id,
        import_id: historyRow.id,
        church_id: effectiveChurchId,
      }));

      const { error: txError } = await supabase.from("transactions").insert(rows);
      if (txError) throw new Error(txError.message);

      await Promise.all([refreshTransactions(), refreshImportHistory()]);
      setShowSuccessModal(true);
      showToastMsg(`Extrato salvo por ${profile.name}`);
      return true;
    } catch (err) {
      showToastMsg(`Falha ao salvar lançamentos: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Chamado quando a pessoa tenta sair da tela (menu lateral, logout) com um extrato
  // importado e ainda não salvo. Se houver duplicatas, interrompe e mostra o aviso de
  // duplicata em vez de sair — a pessoa resolve isso e tenta sair de novo.
  const trySaveForUnsavedGuard = async (): Promise<boolean> => {
    if (stagedTransactions.length === 0 || !profile) return false;
    const duplicates = findDuplicates(stagedTransactions, transactions);
    if (duplicates.length > 0) {
      setDuplicateWarning(duplicates);
      return false;
    }
    return doSave();
  };

  const resetImport = () => {
    setHasUploaded(false);
    setStagedTransactions([]);
    setFilename("");
    setChatMessages([]);
    setChatInput("");
    setRuleSuggestions([]);
  };

  const hasUnsavedImport = hasUploaded && stagedTransactions.length > 0 && !showSuccessModal;

  // Avisa antes de sair da tela (menu lateral, logout) enquanto houver um extrato
  // importado e não salvo — a checagem some sozinha quando o extrato é salvo
  // (showSuccessModal vira true) ou o import é resetado/reenviado. Sem array de
  // dependências de propósito: registra de novo a cada render para o guard nunca
  // ficar com uma versão desatualizada de `stagedTransactions`/`profile`.
  useEffect(() => {
    registerUnsavedGuard({
      hasUnsaved: () => hasUnsavedImport,
      onSave: trySaveForUnsavedGuard,
    });
    return () => registerUnsavedGuard(null);
  });

  // Mesma checagem para fechar/recarregar a aba do navegador — não é interceptável
  // pelo React Router, então precisa do evento nativo `beforeunload`.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedImport) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedImport]);

  const totalCount = stagedTransactions.length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Extratos e Importação IA</h1>
          <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5">
            Envie o extrato bancário e revise as sugestões da IA
          </p>
        </div>
      </div>

      <SummaryCards transactions={stagedTransactions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-[560px]">
        <div className="flex flex-col gap-4 min-h-0 h-[480px] lg:h-auto">
          <UploadDropzone
            isUploading={isUploading}
            hasUploaded={hasUploaded}
            onFileSelected={onFileSelected}
            allowedFormats={plan?.allowedImportFormats ?? null}
          />
          <TransactionsPreviewTable
            transactions={stagedTransactions}
            hasUploaded={hasUploaded}
            onClearClick={() => setShowClearConfirm(true)}
          />
        </div>

        <AiChatPanel
          hasUploaded={hasUploaded}
          chatMessages={chatMessages}
          isRefining={isRefining}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={sendMessage}
          applyMode={applyMode}
          onApplyModeChange={setApplyMode}
          strictModeLocked={!canUseStrictMode()}
          onOpenRulesModal={() => setShowRulesModal(true)}
          ruleSuggestions={ruleSuggestions}
          onSaveRuleSuggestion={onSaveRuleSuggestion}
          onDismissRuleSuggestion={onDismissRuleSuggestion}
        />
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap mt-5 px-5.5 py-4 rounded-lg border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950">
        <div>
          <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Total de Lançamentos</div>
          <div className="font-display font-semibold text-lg">{totalCount}</div>
        </div>
        <button
          onClick={confirmSave}
          disabled={isSaving || totalCount === 0 || (profile?.role === "master" && !effectiveChurchId)}
          className="flex items-center gap-2 px-5 py-3 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Registrando lançamentos contábeis no banco de dados…
            </>
          ) : (
            <>
              <Check size={15} />
              Confirmar e Salvar no Livro Caixa
            </>
          )}
        </button>
      </div>

      <ImportHistoryTable
        items={importHistory}
        canEdit={canEditHistory}
        canDelete={canDeleteHistory}
        onEdit={openHistoryEdit}
        onDelete={setHistoryDeleteTarget}
      />

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-6 sm:p-9 text-center">
            <div className="w-14 h-14 rounded-full bg-status-success flex items-center justify-center mx-auto mb-4.5">
              <Check size={26} strokeWidth={2.5} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2.5">Lançamentos Efetivados com Sucesso!</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 leading-relaxed mb-6.5">
              O extrato foi registrado e vinculado ao mês correspondente no Livro Caixa.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  resetImport();
                }}
                className="px-4 py-2.5 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Importar Outro Arquivo
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/livro-caixa");
                }}
                className="px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600"
              >
                Ver no Livro Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && (
        <ConfirmModal
          title="Possíveis lançamentos duplicados"
          description={
            <>
              {duplicateWarning.length} lançamento(s) deste extrato já existem no Livro Caixa (mesma data, descrição
              e valor). Pode ser um extrato importado por engano duas vezes.
            </>
          }
          detail={duplicateWarning.map((t) => (
            <div key={t.id} className="flex justify-between py-1 border-b border-neutral-300 dark:border-white/10 last:border-0">
              <span className="text-neutral-700 dark:text-neutral-400">{t.date}</span>
              <span className="flex-1 px-3 truncate">{t.desc}</span>
              <span className={t.value < 0 ? "text-orla-coral" : "text-status-success"}>{fmt(t.value)}</span>
            </div>
          ))}
          confirmLabel="Salvar Mesmo Assim"
          confirmingLabel="Salvando…"
          isConfirming={isSaving}
          onConfirm={doSave}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}

      {showClearConfirm && (
        <ConfirmModal
          title="Limpar Lançamentos"
          description={`Isso descarta os ${stagedTransactions.length} lançamento(s) carregados deste extrato — nada foi salvo ainda no Livro Caixa. Quer continuar?`}
          tone="error"
          confirmLabel="Limpar Lançamentos"
          onConfirm={() => {
            setShowClearConfirm(false);
            resetImport();
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {historyDeleteTarget && (
        <ConfirmModal
          title="Excluir Registro de Importação"
          description={
            <>
              Isso exclui o registro do histórico de importação <strong>e todos os lançamentos deste extrato que
              ainda estejam vinculados no Livro Caixa</strong>. É registrado de forma imutável na Trilha de
              Auditoria.
            </>
          }
          detail={
            <div>
              <div className="font-medium">{historyDeleteTarget.filename}</div>
              <div className="text-xs text-neutral-700 dark:text-neutral-400 mt-1">
                {historyDeleteTarget.monthLabel} · {historyDeleteTarget.count} lançamentos serão excluídos do Livro Caixa
              </div>
            </div>
          }
          tone="error"
          confirmLabel="Confirmar Exclusão"
          confirmingLabel="Excluindo…"
          isConfirming={isDeletingHistory}
          onConfirm={confirmHistoryDelete}
          onCancel={() => setHistoryDeleteTarget(null)}
        />
      )}

      {showRulesModal && (
        <CategoryRulesModal churchId={effectiveChurchId} showToastMsg={showToastMsg} onClose={() => setShowRulesModal(false)} />
      )}

      {pricingModalReason && (
        <PricingModal
          churchId={effectiveChurchId}
          title={pricingModalReason === "format" ? "Formato de arquivo não disponível no seu plano" : "Limite de leituras de IA atingido"}
          description={
            pricingModalReason === "format"
              ? "O plano Gratuito aceita apenas importação em CSV. Faça upgrade para o plano Profissional para importar PDFs e Extratos Bancários."
              : "Sua igreja atingiu o limite de leituras de IA do plano atual. Faça upgrade para continuar importando extratos automaticamente."
          }
          onClose={() => setPricingModalReason(null)}
        />
      )}

      {historyEdit && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Editar Registro de Importação</h3>
              <button onClick={() => setHistoryEdit(null)} className="text-neutral-700 dark:text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <label className="block">
                <span className="block text-sm font-medium mb-1.5">Nome do Arquivo</span>
                <input
                  value={historyEdit.filename}
                  onChange={(e) => setHistoryEdit({ ...historyEdit, filename: e.target.value })}
                  className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="block flex-1">
                  <span className="block text-sm font-medium mb-1.5">Mês/Ano de Referência</span>
                  <input
                    value={historyEdit.monthLabel}
                    onChange={(e) => setHistoryEdit({ ...historyEdit, monthLabel: e.target.value })}
                    placeholder="ex: Julho de 2026"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
                <label className="block w-full sm:w-[140px]">
                  <span className="block text-sm font-medium mb-1.5">Qtd. Transações</span>
                  <input
                    type="number"
                    min={0}
                    value={historyEdit.count}
                    onChange={(e) => setHistoryEdit({ ...historyEdit, count: e.target.value })}
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6.5">
              <button
                onClick={() => setHistoryEdit(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={submitHistoryEdit}
                disabled={isSavingHistoryEdit}
                className="px-4 py-2 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
              >
                {isSavingHistoryEdit ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
