// Edge Function: extrai e categoriza lançamentos de um extrato bancário via Gemini.
// Roda aqui (nunca no frontend) porque precisa da GEMINI_API_KEY.
// Deploy: supabase functions deploy parse-statement
// Secret:  supabase secrets set GEMINI_API_KEY=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Alias "latest" em vez de uma versão fixa — evita quebrar quando o Google
// aposenta modelos antigos para novas chaves de API (ex.: gemini-2.5-flash
// parou de aceitar chaves novas pouco tempo depois do lançamento).
const GEMINI_MODEL = "gemini-flash-latest";

// Espelha src/constants/accountingCategories.ts — runtime Deno separado, sem
// bundler/import compartilhado com o frontend. Qualquer mudança na taxonomia
// precisa ser replicada nos dois lugares.
const ENTRADA_CATEGORIES = [
  "Dízimos",
  "Ofertas Gerais",
  "Ofertas Especiais/Missões",
  "Campanhas/Eventos",
  "Outras Entradas",
];
const SAIDA_CATEGORIES = [
  "Sustento Pastoral / Prebenda",
  "Utilidades (Água, Luz, Internet)",
  "Manutenção de Templo",
  "Ação Social / Auxílio",
  "Material de Escola Dominical / Departamentos",
  "Eventos / Conferências",
  "Taxas Bancárias / Impostos",
  "Despesas Administrativas",
];
const ALL_CATEGORIES = [...ENTRADA_CATEGORIES, ...SAIDA_CATEGORIES];

const TRANSACTION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Data no formato YYYY-MM-DD" },
    description: { type: "string" },
    value: { type: "number", description: "Valor absoluto (sempre positivo)" },
    type: { type: "string", enum: ["entrada", "saida"] },
    category: { type: "string", enum: ALL_CATEGORIES },
    confidence: { type: "string", enum: ["alta", "media", "baixa"] },
  },
  required: ["date", "description", "value", "type", "category", "confidence"],
};

const EXTRACT_SCHEMA = {
  type: "object",
  properties: { transactions: { type: "array", items: TRANSACTION_ITEM_SCHEMA } },
  required: ["transactions"],
};

const REFINE_SCHEMA = {
  type: "object",
  properties: {
    transactions: { type: "array", items: TRANSACTION_ITEM_SCHEMA },
    summary: { type: "string", description: "Resumo em português do que foi ajustado, 1-2 frases" },
  },
  required: ["transactions", "summary"],
};

interface TransactionItem {
  date: string;
  description: string;
  value: number;
  type: "entrada" | "saida";
  category: string;
  confidence: "alta" | "media" | "baixa";
}

interface CategoryRule {
  keyword: string;
  type: "entrada" | "saida";
  category: string;
}

// Normaliza para comparação "contém": minúsculas, sem acento, espaços colapsados.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function downgradeConfidence(c: TransactionItem["confidence"]): TransactionItem["confidence"] {
  if (c === "alta") return "media";
  if (c === "media") return "baixa";
  return "baixa";
}

// Modo Estrito: regra salva sempre vence (confiança "alta"); sem regra
// correspondente, mantém a categoria da IA mas rebaixa a confiança um nível
// para forçar revisão humana — a IA continua fazendo a leitura/OCR do
// extrato, só a categorização final muda de critério.
function applyStrictMode(items: TransactionItem[], rules: CategoryRule[]): TransactionItem[] {
  if (rules.length === 0) return items.map((item) => ({ ...item, confidence: downgradeConfidence(item.confidence) }));

  const normalizedRules = rules
    .map((r) => ({ ...r, normalizedKeyword: normalize(r.keyword) }))
    .sort((a, b) => b.normalizedKeyword.length - a.normalizedKeyword.length);

  return items.map((item) => {
    const normalizedDesc = normalize(item.description);
    const match = normalizedRules.find((r) => r.type === item.type && normalizedDesc.includes(r.normalizedKeyword));
    if (match) return { ...item, category: match.category, confidence: "alta" as const };
    return { ...item, confidence: downgradeConfidence(item.confidence) };
  });
}

// Erros transitórios do Gemini (modelo sobrecarregado ou rate limit) valem
// retry com backoff — um 4xx de validação (schema/prompt) nunca vale, pois
// tentar de novo só repetiria o mesmo erro.
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(contents: unknown[], schema: unknown) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  // Diagnóstico seguro: confirma que o secret foi carregado do ambiente, sem
  // nunca logar o valor real (nem parcial) — só presença/ausência e o modelo.
  console.log(`[parse-statement] GEMINI_API_KEY carregada: ${apiKey ? "sim" : "NÃO"} | modelo: ${GEMINI_MODEL}`);
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { responseMimeType: "application/json", responseSchema: schema },
          }),
        },
      );
    } catch (err) {
      console.error(`[parse-statement] falha de rede ao chamar Gemini (tentativa ${attempt}/${MAX_ATTEMPTS}):`, err);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`Falha de rede ao chamar o Gemini: ${err instanceof Error ? err.message : String(err)}`);
      }
      await sleep(BASE_DELAY_MS * attempt);
      continue;
    }

    if (!res.ok) {
      const bodyText = await res.text();
      const retryable = RETRYABLE_STATUS.has(res.status);
      console.error(
        `[parse-statement] Gemini retornou ${res.status} (modelo ${GEMINI_MODEL}, tentativa ${attempt}/${MAX_ATTEMPTS}, retryable=${retryable}):`,
        bodyText,
      );
      if (retryable && attempt < MAX_ATTEMPTS) {
        // Backoff simples (1s, 2s, ...) — suficiente pra picos curtos de
        // demanda/rate limit do Gemini sem segurar a function por muito tempo.
        await sleep(BASE_DELAY_MS * attempt);
        continue;
      }
      throw new Error(`Gemini API error (${res.status}) usando modelo "${GEMINI_MODEL}": ${bodyText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[parse-statement] Gemini não retornou texto. finishReason:", candidate?.finishReason, "payload:", JSON.stringify(data));
      const reason = candidate?.finishReason ? ` (finishReason: ${candidate.finishReason})` : "";
      throw new Error(`Resposta vazia do Gemini${reason}`);
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("[parse-statement] Gemini retornou JSON inválido:", text);
      throw new Error(`Gemini retornou um JSON inválido: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Inalcançável: o loop sempre retorna ou lança antes de terminar as tentativas.
  throw new Error("Falha ao chamar o Gemini após múltiplas tentativas");
}

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
      error: getUserError,
    } = await callerClient.auth.getUser();
    if (!caller) {
      console.error("[parse-statement] auth.getUser() falhou:", getUserError?.message);
      return new Response("Não autenticado", { status: 401, headers: CORS_HEADERS });
    }

    const { data: profile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError) {
      console.error(`[parse-statement] falha ao buscar profile de ${caller.id}:`, profileError.message);
      return new Response(`Falha ao verificar permissões: ${profileError.message}`, { status: 500, headers: CORS_HEADERS });
    }

    if (!profile || !["Admin", "Tesoureiro", "master"].includes(profile.role)) {
      return new Response("Apenas Admin/Tesoureiro podem importar extratos", { status: 403, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const applyMode: "ai" | "strict" = body.applyMode === "strict" ? "strict" : "ai";
    const churchId: string | null = body.churchId ?? null;
    console.log(`[parse-statement] mode=${body.mode} applyMode=${applyMode} caller=${caller.id} filename=${body.filename ?? "-"}`);

    // Modo Estrito consulta as regras salvas da igreja (RLS já isola por
    // church_id — o filtro explícito só remove ambiguidade quando quem chama
    // é o master, que enxerga todas as igrejas).
    async function loadRulesIfStrict(): Promise<CategoryRule[]> {
      if (applyMode !== "strict" || !churchId) return [];
      const { data, error } = await callerClient
        .from("category_rules")
        .select("keyword, type, category")
        .eq("church_id", churchId);
      if (error) {
        console.error("[parse-statement] falha ao buscar category_rules:", error.message);
        return [];
      }
      return (data as CategoryRule[]) ?? [];
    }

    if (body.mode === "extract") {
      const { filename, mimeType, contentBase64 } = body;
      if (!filename || !mimeType || !contentBase64) {
        return new Response("Campos obrigatórios: filename, mimeType, contentBase64", { status: 400, headers: CORS_HEADERS });
      }

      const prompt = `Você é um assistente contábil de uma igreja. Leia o extrato bancário anexado (arquivo "${filename}") e extraia todos os lançamentos.
Para cada lançamento, classifique o tipo ("entrada" ou "saida").
Se for "entrada", escolha a categoria mais adequada dentre: ${ENTRADA_CATEGORIES.join(", ")}. Use "Dízimos" para dízimos e "Ofertas Gerais" para ofertas típicas de culto.
Se for "saida", escolha a categoria mais específica dentre: ${SAIDA_CATEGORIES.join(", ")}; use "Despesas Administrativas" só se nenhuma outra se aplicar.
Defina "confidence" como "alta" quando a categoria for óbvia pela descrição, "media" quando razoavelmente certo, "baixa" quando for um chute.
Retorne todos os lançamentos encontrados, sem inventar nenhum que não esteja no extrato.`;

      const result = await callGemini(
        [{ role: "user", parts: [{ inlineData: { mimeType, data: contentBase64 } }, { text: prompt }] }],
        EXTRACT_SCHEMA,
      );

      const rules = await loadRulesIfStrict();
      if (applyMode === "strict") result.transactions = applyStrictMode(result.transactions ?? [], rules);

      return new Response(JSON.stringify(result), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    if (body.mode === "refine") {
      const { transactions, instruction } = body;
      if (!Array.isArray(transactions) || !instruction) {
        return new Response("Campos obrigatórios: transactions, instruction", { status: 400, headers: CORS_HEADERS });
      }

      const prompt = `Você é um assistente contábil de uma igreja ajudando a revisar lançamentos já extraídos de um extrato.
Lançamentos atuais (JSON): ${JSON.stringify(transactions)}
Instrução do usuário: "${instruction}"
Aplique a instrução aos lançamentos (ex.: recategorizar, corrigir tipo, ajustar confiança) e devolva a lista COMPLETA atualizada
(inclua também os lançamentos que não mudaram) e um resumo curto do que foi alterado.
Categorias válidas para "entrada": ${ENTRADA_CATEGORIES.join(", ")}.
Categorias válidas para "saida": ${SAIDA_CATEGORIES.join(", ")}.`;

      const result = await callGemini([{ role: "user", parts: [{ text: prompt }] }], REFINE_SCHEMA);

      const rules = await loadRulesIfStrict();
      if (applyMode === "strict") result.transactions = applyStrictMode(result.transactions ?? [], rules);

      return new Response(JSON.stringify(result), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response("Campo 'mode' deve ser 'extract' ou 'refine'", { status: 400, headers: CORS_HEADERS });
  } catch (err) {
    console.error("[parse-statement] erro não tratado:", err);
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
