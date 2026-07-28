import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "../../services/supabase";
import Badge from "../Badge";
import { categoriesForType } from "../../constants/accountingCategories";
import type { CategoryRule, TransactionType } from "../../types";

interface CategoryRulesModalProps {
  churchId: string | null;
  showToastMsg: (text: string) => void;
  onClose: () => void;
}

function mapRuleRow(row: { id: string; keyword: string; type: string; category: string; created_at: string }): CategoryRule {
  return { id: row.id, keyword: row.keyword, type: row.type as TransactionType, category: row.category, createdAt: row.created_at };
}

export default function CategoryRulesModal({ churchId, showToastMsg, onClose }: CategoryRulesModalProps) {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newType, setNewType] = useState<TransactionType>("saida");
  const [newCategory, setNewCategory] = useState(categoriesForType("saida")[0]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!churchId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("category_rules")
        .select("id, keyword, type, category, created_at")
        .eq("church_id", churchId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        if (!error && data) setRules(data.map(mapRuleRow));
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [churchId]);

  const onTypeChange = (type: TransactionType) => {
    setNewType(type);
    setNewCategory(categoriesForType(type)[0]);
  };

  const addRule = async () => {
    if (!churchId || isSaving || !newKeyword.trim()) return;
    setIsSaving(true);
    const { data, error } = await supabase
      .from("category_rules")
      .upsert({ church_id: churchId, keyword: newKeyword.trim(), type: newType, category: newCategory }, { onConflict: "church_id,keyword" })
      .select("id, keyword, type, category, created_at")
      .single();
    setIsSaving(false);
    if (error) {
      showToastMsg(`Falha ao salvar regra: ${error.message}`);
      return;
    }
    const saved = mapRuleRow(data);
    setRules((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
    setNewKeyword("");
    showToastMsg("Regra de categorização salva com sucesso");
  };

  const deleteRule = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("category_rules").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      showToastMsg(`Falha ao excluir regra: ${error.message}`);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => r.keyword.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [rules, search]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-full max-w-[620px] rounded-xl shadow-lg p-5 sm:p-7 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 mb-6 shrink-0">
          <div>
            <h3 className="font-display font-semibold text-xl m-0">Regras de Categorização Automática (De-Para)</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1.5 leading-relaxed">
              Ensine a IA a reconhecer fornecedores/descrições recorrentes — usadas automaticamente no Modo Estrito.
            </p>
          </div>
          <button
            onClick={onClose}
            title="Fechar"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {!churchId ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-400">
            Selecione uma igreja no menu lateral para gerenciar as regras.
          </p>
        ) : (
          <div className="flex flex-col min-h-0 gap-6">
            {/* Adicionar Nova Regra */}
            <div className="shrink-0 rounded-lg border border-neutral-300 dark:border-white/10 bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-5">
              <h4 className="text-sm font-semibold mb-3.5">Adicionar Nova Regra</h4>
              <div className="flex flex-col gap-3.5">
                <label className="block">
                  <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-400 mb-1.5">
                    Se a descrição contiver...
                  </span>
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="ex: ENERGIA, COMPESA, TARIFA"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-orla-blue"
                  />
                </label>

                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="block w-full sm:w-[140px] shrink-0">
                    <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-400 mb-1.5">Tipo</span>
                    <select
                      value={newType}
                      onChange={(e) => onTypeChange(e.target.value as TransactionType)}
                      className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3 py-2.5 text-sm outline-none focus:border-orla-blue"
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </label>
                  <label className="block flex-1">
                    <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-400 mb-1.5">
                      Categorizar como...
                    </span>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md px-3 py-2.5 text-sm outline-none focus:border-orla-blue"
                    >
                      {categoriesForType(newType).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  onClick={addRule}
                  disabled={isSaving || !newKeyword.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-orla-blue text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-60 mt-1"
                >
                  <Plus size={16} /> {isSaving ? "Adicionando…" : "Adicionar Regra"}
                </button>
              </div>
            </div>

            {/* Regras Cadastradas */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <h4 className="text-sm font-semibold">Regras Cadastradas</h4>
                <Badge tone="neutral">{rules.length}</Badge>
              </div>

              {rules.length > 5 && (
                <div className="relative mb-2.5">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por termo ou categoria…"
                    className="w-full box-border border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-900 rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:border-orla-blue"
                  />
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto border border-neutral-300 dark:border-white/10 rounded-md">
                {isLoading ? (
                  <div className="p-6 text-center text-neutral-700 dark:text-neutral-400 text-sm">Carregando regras…</div>
                ) : filteredRules.length === 0 ? (
                  <div className="p-6 text-center text-neutral-700 dark:text-neutral-400 text-sm">
                    {rules.length === 0 ? "Nenhuma regra salva ainda." : "Nenhuma regra corresponde à busca."}
                  </div>
                ) : (
                  filteredRules.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-300 dark:border-white/10 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 text-sm">
                        <span className="font-medium truncate shrink-0 max-w-[35%]">{r.keyword}</span>
                        <ArrowRight size={14} className="text-neutral-400 shrink-0" />
                        <span className="text-neutral-700 dark:text-neutral-400 truncate">{r.category}</span>
                        <Badge tone={r.type === "entrada" ? "success" : "error"}>
                          {r.type === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </div>
                      <button
                        onClick={() => deleteRule(r.id)}
                        disabled={deletingId === r.id}
                        title="Excluir regra"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-700 dark:text-neutral-400 hover:bg-status-error/10 hover:text-status-error disabled:opacity-50 shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-white/20 text-sm font-medium">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
