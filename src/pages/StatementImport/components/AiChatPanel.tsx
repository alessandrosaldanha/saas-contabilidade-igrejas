import { useState } from "react";
import { Award, Send, Loader2, Check, Settings2, Lock } from "lucide-react";
import Card from "../../../components/Card";
import type { CategorizationMode, ChatMessage, TransactionType } from "../../../types";

export interface RuleSuggestion {
  id: string;
  desc: string;
  type: TransactionType;
  oldCategory: string;
  newCategory: string;
}

interface RuleSuggestionCardProps {
  suggestion: RuleSuggestion;
  onSave: (keyword: string) => void;
  onDismiss: () => void;
}

function RuleSuggestionCard({ suggestion, onSave, onDismiss }: RuleSuggestionCardProps) {
  const [keyword, setKeyword] = useState(suggestion.desc);
  return (
    <div className="rounded-lg border border-orla-blue/30 bg-orla-blue/5 px-3.5 py-3 flex flex-col gap-2">
      <p className="text-xs text-neutral-700 dark:text-neutral-400 m-0">
        Salvar <strong className="text-black dark:text-white">"{suggestion.newCategory}"</strong> como padrão para
        lançamentos parecidos com:
      </p>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3 py-2 text-xs outline-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onDismiss} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium">
          Ignorar
        </button>
        <button
          onClick={() => onSave(keyword)}
          disabled={!keyword.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orla-blue text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-60"
        >
          <Check size={13} /> Salvar como padrão
        </button>
      </div>
    </div>
  );
}

interface AiChatPanelProps {
  hasUploaded: boolean;
  chatMessages: ChatMessage[];
  isRefining: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSend: () => void;
  applyMode: CategorizationMode;
  onApplyModeChange: (mode: CategorizationMode) => void;
  strictModeLocked: boolean;
  onOpenRulesModal: () => void;
  ruleSuggestions: RuleSuggestion[];
  onSaveRuleSuggestion: (suggestion: RuleSuggestion, keyword: string) => void;
  onDismissRuleSuggestion: (id: string) => void;
}

export default function AiChatPanel({
  hasUploaded,
  chatMessages,
  isRefining,
  chatInput,
  onChatInputChange,
  onSend,
  applyMode,
  onApplyModeChange,
  strictModeLocked,
  onOpenRulesModal,
  ruleSuggestions,
  onSaveRuleSuggestion,
  onDismissRuleSuggestion,
}: AiChatPanelProps) {
  return (
    <Card padding="none" className="flex flex-col min-h-0 h-[420px] lg:h-auto">
      <div className="flex items-center justify-between gap-2 px-4.5 py-4 border-b border-neutral-300 dark:border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orla-blue shrink-0">
            <Award size={14} className="text-white" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium">Agente de IA · Categorização</div>
            <div className="text-[11px] text-neutral-700 dark:text-neutral-400">Ajuste categorias por linguagem natural</div>
          </div>
        </div>
        <button
          onClick={onOpenRulesModal}
          title="Gerenciar regras de mapeamento salvas"
          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 shrink-0"
        >
          <Settings2 size={15} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 px-4.5 py-2.5 border-b border-neutral-300 dark:border-white/10 text-xs">
        <button
          onClick={() => onApplyModeChange("ai")}
          className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
            applyMode === "ai"
              ? "bg-orla-blue text-white"
              : "text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5"
          }`}
        >
          IA Autônoma
        </button>
        <button
          onClick={() => !strictModeLocked && onApplyModeChange("strict")}
          disabled={strictModeLocked}
          title={strictModeLocked ? "Modo Estrito é exclusivo dos planos pagos — faça upgrade para liberar" : undefined}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            applyMode === "strict" && !strictModeLocked
              ? "bg-orla-blue text-white"
              : "text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:hover:bg-transparent"
          }`}
        >
          Modo Estrito (Regras Salvas)
          {strictModeLocked && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orla-blue/15 text-orla-blue text-[10px] font-semibold">
              <Lock size={9} />
              Pro
            </span>
          )}
        </button>
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
              <Loader2 size={13} className="animate-spin" /> Consultando extrato…
            </div>
          </div>
        )}
        {ruleSuggestions.map((s) => (
          <RuleSuggestionCard
            key={s.id}
            suggestion={s}
            onSave={(keyword) => onSaveRuleSuggestion(s, keyword)}
            onDismiss={() => onDismissRuleSuggestion(s.id)}
          />
        ))}
      </div>

      <div className="flex gap-2 px-4 py-3.5 border-t border-neutral-300 dark:border-white/10">
        <input
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          disabled={!hasUploaded || isRefining}
          placeholder={hasUploaded ? "ex: recategorize os pagamentos de energia…" : "Envie um extrato primeiro"}
          className="flex-1 bg-neutral-100 dark:bg-neutral-950 border-[1.5px] border-neutral-300 dark:border-white/10 rounded-md px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
        />
        <button
          onClick={onSend}
          disabled={!hasUploaded || isRefining}
          className="w-10 h-10 flex items-center justify-center rounded-md bg-orla-blue text-white disabled:opacity-50 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </Card>
  );
}
