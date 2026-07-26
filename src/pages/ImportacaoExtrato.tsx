import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, Award, Send, Check, AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getFunctionErrorMessage, supabase } from "../services/supabase";
import { CATEGORY_TONE, CONF_LABEL, CONF_TONE, MONTHS_FULL } from "../services/mockData";
import { fmt, isoToBr, brToIso } from "../utils/format";
import type { ChatMessage, Confidence, ImportHistoryItem, Transaction, TransactionType } from "../types";

interface ExtractedItem {
  date: string;
  description: string;
  value: number;
  type: TransactionType;
  category: string;
  confidence: Confidence;
}

function detectMimeType(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      const mimeType = detectMimeType(file.name);
      const { data, error } = await supabase.functions.invoke("parse-statement", {
        body: { mode: "extract", filename: file.name, mimeType, contentBase64 },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));

      const items = (data.transactions as ExtractedItem[]) ?? [];
      setStagedTransactions(items.map(itemToStaged));
      setFilename(file.name);
      setHasUploaded(true);
      setChatMessages([
        {
          id: Date.now(),
          from: "ai",
          text: `Encontrei ${items.length} lançamento(s) em "${file.name}". Posso ajustar categorias — é só me dizer em linguagem natural, por exemplo: "recategorize os pagamentos de energia para Contas e Utilidades".`,
        },
      ]);
    } catch (err) {
      showToastMsg(`Falha ao processar extrato: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const onDropzoneClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFileSelected(file);
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !hasUploaded || isRefining) return;
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
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));

      const items = (data.transactions as ExtractedItem[]) ?? [];
      setStagedTransactions(items.map(itemToStaged));
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
  const entradasSum = stagedTransactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const saidasSum = stagedTransactions.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl m-0 tracking-tight">Extratos e Importação IA</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
            Envie o extrato bancário e revise as sugestões da IA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-[560px]">
        <div className="flex flex-col gap-4 min-h-0 h-[480px] lg:h-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ofx,.qfx,.csv"
            onChange={onInputChange}
            className="hidden"
          />
          <div
            onClick={onDropzoneClick}
            className="border-[1.5px] border-dashed border-neutral-300 dark:border-white/20 rounded-lg text-center cursor-pointer bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            style={{ padding: isUploading ? "28px" : "36px" }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 size={26} className="text-orla-blue animate-spin" />
                <span className="text-sm text-neutral-500 dark:text-neutral-300">Processando extrato com IA…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <Upload size={26} className="text-neutral-400" />
                <div>
                  <div className="text-sm font-medium">
                    {hasUploaded ? "Enviar outro extrato bancário" : "Arraste o extrato ou clique para enviar"}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">PDF, OFX ou CSV, até 10MB</div>
                </div>
              </div>
            )}
          </div>

          <Card padding="none" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4.5 py-4 border-b border-neutral-200 dark:border-white/10">
              <h3 className="font-display font-semibold text-[15px] m-0">Pré-visualização de lançamentos</h3>
              <Badge tone="neutral">{stagedTransactions.length} lançamentos</Badge>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-900">
                  <tr className="text-left text-neutral-400 border-b border-neutral-200 dark:border-white/10">
                    <th className="px-3.5 py-2.5 font-medium">Data</th>
                    <th className="px-3.5 py-2.5 font-medium">Descrição</th>
                    <th className="px-3.5 py-2.5 font-medium">Valor</th>
                    <th className="px-3.5 py-2.5 font-medium">Tipo</th>
                    <th className="px-3.5 py-2.5 font-medium">Categoria</th>
                    <th className="px-3.5 py-2.5 font-medium">Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {stagedTransactions.map((row) => (
                    <tr key={row.id} className="border-t border-neutral-200 dark:border-white/10">
                      <td className="px-3.5 py-2.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-3.5 py-2.5">{row.desc}</td>
                      <td className={`px-3.5 py-2.5 whitespace-nowrap ${row.value < 0 ? "text-orla-coral" : "text-status-success"}`}>
                        {fmt(row.value)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge tone={row.type === "entrada" ? "success" : "error"}>
                          {row.type === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge tone={CATEGORY_TONE[row.category] || "neutral"}>{row.category}</Badge>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Badge tone={CONF_TONE[row.confidence]} appearance="outline">
                          {CONF_LABEL[row.confidence]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stagedTransactions.length === 0 && (
                <div className="p-8 text-center text-neutral-400 text-sm">
                  {hasUploaded ? "Nenhum lançamento encontrado neste extrato." : "Envie um extrato para ver a pré-visualização."}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card padding="none" className="flex flex-col min-h-0 h-[420px] lg:h-auto">
          <div className="flex items-center gap-2.5 px-4.5 py-4 border-b border-neutral-200 dark:border-white/10">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orla-blue shrink-0">
              <Award size={14} className="text-white" />
            </span>
            <div>
              <div className="text-sm font-medium">Agente de IA · Categorização</div>
              <div className="text-[11px] text-neutral-400">Ajuste categorias por linguagem natural</div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4.5 py-4 flex flex-col gap-2.5">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                    msg.from === "user" ? "bg-orla-blue text-white" : "bg-neutral-100 dark:bg-neutral-950"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isRefining && (
              <div className="flex justify-start">
                <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm bg-neutral-100 dark:bg-neutral-950 flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" /> Ajustando lançamentos…
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 px-4 py-3.5 border-t border-neutral-200 dark:border-white/10">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={!hasUploaded || isRefining}
              placeholder={hasUploaded ? "ex: recategorize os pagamentos de energia…" : "Envie um extrato primeiro"}
              className="flex-1 bg-neutral-100 dark:bg-neutral-950 border-[1.5px] border-neutral-300 dark:border-white/10 rounded-md px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
            />
            <button
              onClick={sendMessage}
              disabled={!hasUploaded || isRefining}
              className="w-10 h-10 flex items-center justify-center rounded-md bg-orla-blue text-white disabled:opacity-50 shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap mt-5 px-5.5 py-4 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex gap-7 flex-wrap">
          <div>
            <div className="text-[11px] text-neutral-400">Total de Lançamentos</div>
            <div className="font-display font-semibold text-lg">{totalCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400">Soma de Entradas</div>
            <div className="font-display font-semibold text-lg text-status-success">{fmt(entradasSum)}</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400">Soma de Saídas</div>
            <div className="font-display font-semibold text-lg text-orla-coral">{fmt(saidasSum)}</div>
          </div>
        </div>
        <button
          onClick={confirmSave}
          disabled={isSaving || totalCount === 0 || (profile?.role === "master" && !effectiveChurchId)}
          className="flex items-center gap-2 px-5 py-3 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-70"
        >
          {isSaving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Gravando lançamentos…
            </>
          ) : (
            <>
              <Check size={15} />
              Confirmar e Salvar no Livro Caixa
            </>
          )}
        </button>
      </div>

      <div className="mt-6.5">
        <h3 className="font-display font-semibold text-[15px] mb-3">Extratos Processados Recentemente</h3>
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="text-left text-neutral-400">
                  <th className="px-3.5 py-2.5 font-medium">Arquivo</th>
                  <th className="px-3.5 py-2.5 font-medium">Mês/Ano de Referência</th>
                  <th className="px-3.5 py-2.5 font-medium">Qtd. Transações</th>
                  <th className="px-3.5 py-2.5 font-medium">Data de Importação</th>
                  <th className="px-3.5 py-2.5 font-medium">Importado por</th>
                  <th className="px-3.5 py-2.5 font-medium">Status</th>
                  {(canEditHistory || canDeleteHistory) && (
                    <th className="px-3.5 py-2.5 font-medium text-right">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {importHistory.map((h) => (
                  <tr key={h.id} className="border-t border-neutral-200 dark:border-white/10">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{h.filename}</td>
                    <td className="px-3.5 py-2.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{h.monthLabel}</td>
                    <td className="px-3.5 py-2.5 text-neutral-500 dark:text-neutral-400">{h.count}</td>
                    <td className="px-3.5 py-2.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{h.importedAt}</td>
                    <td className="px-3.5 py-2.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{h.importedBy}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge tone="success" dot>
                        Salvo / Registrado
                      </Badge>
                    </td>
                    {(canEditHistory || canDeleteHistory) && (
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          {canEditHistory && (
                            <button
                              onClick={() => openHistoryEdit(h)}
                              title="Editar registro de importação"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDeleteHistory && (
                            <button
                              onClick={() => setHistoryDeleteTarget(h)}
                              title="Excluir registro de importação"
                              className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-500 dark:text-neutral-400 hover:bg-status-error/10 hover:text-status-error hover:border-status-error"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {importHistory.length === 0 && (
              <div className="p-6 text-center text-neutral-400 text-sm">Nenhuma importação registrada ainda.</div>
            )}
          </div>
        </Card>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-6 sm:p-9 text-center">
            <div className="w-14 h-14 rounded-full bg-status-success flex items-center justify-center mx-auto mb-4.5">
              <Check size={26} strokeWidth={2.5} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2.5">Lançamentos Efetivados com Sucesso!</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6.5">
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
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[480px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-status-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-status-warning" />
              </span>
              <h3 className="font-display font-semibold text-lg m-0">Possíveis lançamentos duplicados</h3>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              {duplicateWarning.length} lançamento(s) deste extrato já existem no Livro Caixa (mesma data, descrição
              e valor). Pode ser um extrato importado por engano duas vezes.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3 mb-6 max-h-[180px] overflow-y-auto text-sm">
              {duplicateWarning.map((t) => (
                <div key={t.id} className="flex justify-between py-1 border-b border-neutral-200 dark:border-white/10 last:border-0">
                  <span className="text-neutral-400">{t.date}</span>
                  <span className="flex-1 px-3 truncate">{t.desc}</span>
                  <span className={t.value < 0 ? "text-orla-coral" : "text-status-success"}>{fmt(t.value)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={doSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-md bg-status-warning text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
              >
                {isSaving ? "Salvando…" : "Salvar Mesmo Assim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyEdit && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Editar Registro de Importação</h3>
              <button onClick={() => setHistoryEdit(null)} className="text-neutral-400 p-1">
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

      {historyDeleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-5 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg m-0">Excluir Registro de Importação</h3>
              <button onClick={() => setHistoryDeleteTarget(null)} className="text-neutral-400 p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
              Isso exclui o registro do histórico de importação <strong>e todos os lançamentos deste extrato que
              ainda estejam vinculados no Livro Caixa</strong>. É registrado de forma imutável na Trilha de
              Auditoria.
            </p>
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-md px-4 py-3.5 mb-6 text-sm">
              <div className="font-medium">{historyDeleteTarget.filename}</div>
              <div className="text-xs text-neutral-400 mt-1">
                {historyDeleteTarget.monthLabel} · {historyDeleteTarget.count} lançamentos serão excluídos do Livro
                Caixa
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setHistoryDeleteTarget(null)}
                className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmHistoryDelete}
                disabled={isDeletingHistory}
                className="px-4 py-2 rounded-md bg-status-error text-white text-sm font-medium hover:opacity-90 disabled:opacity-70"
              >
                {isDeletingHistory ? "Excluindo…" : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
