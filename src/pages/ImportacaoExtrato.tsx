import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, Award, Send, Check } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { useApp } from "../context/AppContext";
import { CATEGORY_TONE, CONF_LABEL, CONF_TONE } from "../services/mockData";
import { fmt } from "../utils/format";
import type { ChatMessage } from "../types";

export default function ImportacaoExtrato() {
  const { transactions, setTransactions, importHistory, setImportHistory, showToastMsg } = useApp();
  const navigate = useNavigate();

  const [hasUploaded, setHasUploaded] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "ai",
      text: 'Olá! Encontrei 8 lançamentos no extrato. Posso ajustar categorias — é só me dizer em linguagem natural, por exemplo: "ajuste as saídas da Leroy Merlin para Manutenção do Templo".',
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const onDropzoneClick = () => {
    if (isUploading) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setHasUploaded(true);
    }, 900);
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !hasUploaded) return;
    const lower = text.toLowerCase();
    const userMsg: ChatMessage = { id: Date.now(), from: "user", text };
    let aiText =
      "Entendido — ainda não sei aplicar essa instrução automaticamente, mas registrei seu pedido para revisão manual.";
    let nextTransactions = transactions;
    let nextHighlight: string[] = [];

    if (lower.includes("leroy merlin")) {
      const matches = transactions.filter((t) => t.desc.toLowerCase().includes("leroy merlin"));
      nextTransactions = transactions.map((t) =>
        t.desc.toLowerCase().includes("leroy merlin") ? { ...t, category: "Manutenção do Templo", confidence: "alta" } : t
      );
      nextHighlight = matches.map((t) => t.id);
      aiText = `Ajustei ${matches.length} lançamento(s) da Leroy Merlin para "Manutenção do Templo" e elevei a confiança para Alta.`;
    } else if (lower.includes("ação social") || lower.includes("acao social")) {
      aiText = "As despesas de Ação Social já estão corretamente categorizadas nesta importação.";
    }

    setTransactions(nextTransactions);
    setHighlightIds(nextHighlight);
    setChatMessages((msgs) => [...msgs, userMsg, { id: Date.now() + 1, from: "ai", text: aiText }]);
    setChatInput("");
  };

  const confirmSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    setTimeout(() => {
      const rec = {
        id: Date.now(),
        filename: "extrato_julho_2026.ofx",
        monthLabel: "Julho de 2026",
        count: transactions.length,
        importedAt: "24/07/2026",
        importedBy: "Carlos Mendes",
      };
      setIsSaving(false);
      setShowSuccessModal(true);
      setImportHistory((h) => [rec, ...h]);
      showToastMsg("Extrato salvo por Carlos Mendes");
    }, 1200);
  };

  const totalCount = transactions.length;
  const entradasSum = transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const saidasSum = transactions.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);

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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
        <div className="flex flex-col gap-4 min-h-0">
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
                  <div className="text-xs text-neutral-400 mt-0.5">PDF ou OFX, até 10MB</div>
                </div>
              </div>
            )}
          </div>

          <Card padding="none" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4.5 py-4 border-b border-neutral-200 dark:border-white/10">
              <h3 className="font-display font-semibold text-[15px] m-0">Pré-visualização de lançamentos</h3>
              <Badge tone="neutral">{transactions.length} lançamentos</Badge>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-xs">
                <thead>
                  <tr className="text-left text-neutral-400">
                    <th className="px-3.5 py-2.5 font-medium">Data</th>
                    <th className="px-3.5 py-2.5 font-medium">Descrição</th>
                    <th className="px-3.5 py-2.5 font-medium">Valor</th>
                    <th className="px-3.5 py-2.5 font-medium">Tipo</th>
                    <th className="px-3.5 py-2.5 font-medium">Categoria</th>
                    <th className="px-3.5 py-2.5 font-medium">Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-neutral-200 dark:border-white/10 ${
                        highlightIds.includes(row.id) ? "bg-orla-blue/10" : ""
                      }`}
                    >
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
            </div>
          </Card>
        </div>

        <Card padding="none" className="flex flex-col min-h-0">
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
          </div>

          <div className="flex gap-2 px-4 py-3.5 border-t border-neutral-200 dark:border-white/10">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={!hasUploaded}
              placeholder={hasUploaded ? "ex: ajuste as saídas da Leroy Merlin…" : "Envie um extrato primeiro"}
              className="flex-1 bg-neutral-100 dark:bg-neutral-950 border-[1.5px] border-neutral-300 dark:border-white/10 rounded-md px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
            />
            <button
              onClick={sendMessage}
              disabled={!hasUploaded}
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
          disabled={isSaving}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[440px] rounded-lg shadow-md p-9 text-center">
            <div className="w-14 h-14 rounded-full bg-status-success flex items-center justify-center mx-auto mb-4.5">
              <Check size={26} strokeWidth={2.5} className="text-white" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2.5">Lançamentos Efetivados com Sucesso!</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6.5">
              O extrato foi registrado e vinculado ao mês correspondente no Livro Caixa. A ação foi gravada na Trilha
              de Auditoria.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setHasUploaded(false);
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
    </div>
  );
}
