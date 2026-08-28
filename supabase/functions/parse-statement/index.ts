// Edge Function: extrai e categoriza lançamentos de um extrato bancário via IA.
// Roda aqui (nunca no frontend) porque precisa de GEMINI_API_KEY/OPENAI_API_KEY.
// Deploy: supabase functions deploy parse-statement
// Secrets: supabase secrets set GEMINI_API_KEY=...
//          supabase secrets set OPENAI_API_KEY=...  (fallback, ver seção "Provedores de IA")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Alias "latest" em vez de uma versão fixa — evita quebrar quando o Google
// aposenta modelos antigos para novas chaves de API (ex.: gemini-2.5-flash
// parou de aceitar chaves novas pouco tempo depois do lançamento).
const GEMINI_MODEL = "gemini-flash-latest";

// Gemini é o provedor primário (mais barato, já testado em produção). O
// modelo da OpenAI só entra em ação como fallback (ver callAI) — por isso
// prioriza fidelidade de leitura sobre custo: "gpt-4o" em vez de um "mini",
// já que é usado raramente (só quando o Gemini já esgotou as tentativas).
const OPENAI_MODEL = "gpt-4o";

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

// A OpenAI (Structured Outputs, modo "strict") exige `additionalProperties:
// false` em todo objeto do schema — o Gemini não usa (nem aceita) esse campo,
// por isso os schemas não são compartilhados 1:1 entre os dois provedores,
// mesmo descrevendo o mesmo formato de dado.
const TRANSACTION_ITEM_SCHEMA_OPENAI = { ...TRANSACTION_ITEM_SCHEMA, additionalProperties: false };
const EXTRACT_SCHEMA_OPENAI = {
  type: "object",
  properties: { transactions: { type: "array", items: TRANSACTION_ITEM_SCHEMA_OPENAI } },
  required: ["transactions"],
  additionalProperties: false,
};
const REFINE_SCHEMA_OPENAI = {
  type: "object",
  properties: {
    transactions: { type: "array", items: TRANSACTION_ITEM_SCHEMA_OPENAI },
    summary: { type: "string", description: "Resumo em português do que foi ajustado, 1-2 frases" },
  },
  required: ["transactions", "summary"],
  additionalProperties: false,
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

// ─────────────────────────────────────────────────────────────────────────
// Provedores de IA: Gemini é o primário; a OpenAI entra só como fallback
// quando o Gemini esgota as tentativas (ex.: pico de demanda/rate limit do
// Google). Cada provedor tem seu próprio retry com backoff — só depois de
// esgotar os dois é que o erro sobe pro chamador (mensagem combinada).
// ─────────────────────────────────────────────────────────────────────────

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// `retryable` distingue erro transitório (vale nova tentativa/trocar de
// provedor) de erro de configuração/validação (chave ausente, schema/prompt
// rejeitado) — repetir esse último só reproduziria a mesma falha.
class ProviderError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof ProviderError ? err.retryable : true;
      console.error(
        `[parse-statement] ${label} falhou (tentativa ${attempt}/${MAX_ATTEMPTS}, retryable=${retryable}):`,
        err instanceof Error ? err.message : err,
      );
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      // Backoff simples (1s, 2s, ...) — suficiente pra picos curtos de
      // demanda/rate limit sem segurar a function por muito tempo.
      await sleep(BASE_DELAY_MS * attempt);
    }
  }
  throw lastErr;
}

async function callGeminiOnce(contents: unknown[], schema: unknown): Promise<unknown> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  // Diagnóstico seguro: confirma que o secret foi carregado do ambiente, sem
  // nunca logar o valor real (nem parcial) — só presença/ausência e o modelo.
  console.log(`[parse-statement] GEMINI_API_KEY carregada: ${apiKey ? "sim" : "NÃO"} | modelo: ${GEMINI_MODEL}`);
  if (!apiKey) throw new ProviderError("GEMINI_API_KEY não configurada", false);

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
    throw new ProviderError(`Falha de rede ao chamar o Gemini: ${err instanceof Error ? err.message : String(err)}`, true);
  }

  if (!res.ok) {
    const bodyText = await res.text();
    console.error(`[parse-statement] Gemini retornou ${res.status} (modelo ${GEMINI_MODEL}):`, bodyText);
    throw new ProviderError(`Gemini API error (${res.status}) usando modelo "${GEMINI_MODEL}": ${bodyText}`, RETRYABLE_STATUS.has(res.status));
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[parse-statement] Gemini não retornou texto. finishReason:", candidate?.finishReason, "payload:", JSON.stringify(data));
    const reason = candidate?.finishReason ? ` (finishReason: ${candidate.finishReason})` : "";
    throw new ProviderError(`Resposta vazia do Gemini${reason}`, true);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[parse-statement] Gemini retornou JSON inválido:", text);
    throw new ProviderError(`Gemini retornou um JSON inválido: ${err instanceof Error ? err.message : String(err)}`, false);
  }
}

async function callOpenAIOnce(input: unknown[], schema: unknown, schemaName: string): Promise<unknown> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  console.log(`[parse-statement] OPENAI_API_KEY carregada: ${apiKey ? "sim" : "NÃO"} | modelo: ${OPENAI_MODEL}`);
  if (!apiKey) throw new ProviderError("OPENAI_API_KEY não configurada", false);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
        text: { format: { type: "json_schema", name: schemaName, schema, strict: true } },
      }),
    });
  } catch (err) {
    throw new ProviderError(`Falha de rede ao chamar a OpenAI: ${err instanceof Error ? err.message : String(err)}`, true);
  }

  if (!res.ok) {
    const bodyText = await res.text();
    console.error(`[parse-statement] OpenAI retornou ${res.status} (modelo ${OPENAI_MODEL}):`, bodyText);
    throw new ProviderError(`OpenAI API error (${res.status}) usando modelo "${OPENAI_MODEL}": ${bodyText}`, RETRYABLE_STATUS.has(res.status));
  }

  const data = await res.json();
  // A Responses API não devolve um `output_text` pronto no JSON cru (isso é
  // um helper só dos SDKs oficiais) — precisa achar a mensagem de saída e
  // extrair o texto manualmente.
  const message = (data.output ?? []).find((o: { type?: string }) => o.type === "message");
  const textPart = (message?.content ?? []).find((c: { type?: string }) => c.type === "output_text");
  const text = textPart?.text;
  if (!text) {
    console.error("[parse-statement] OpenAI não retornou texto. status:", data.status, "payload:", JSON.stringify(data));
    throw new ProviderError(`Resposta vazia da OpenAI${data.status ? ` (status: ${data.status})` : ""}`, true);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[parse-statement] OpenAI retornou JSON inválido:", text);
    throw new ProviderError(`OpenAI retornou um JSON inválido: ${err instanceof Error ? err.message : String(err)}`, false);
  }
}

interface FilePart {
  mimeType: string;
  data: string; // base64
  filename?: string;
}

function buildGeminiContents(prompt: string, file?: FilePart): unknown[] {
  const parts: unknown[] = [];
  if (file) parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  parts.push({ text: prompt });
  return [{ role: "user", parts }];
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function buildOpenAIInput(prompt: string, file?: FilePart): unknown[] {
  const content: unknown[] = [];
  if (file) {
    if (file.mimeType.startsWith("image/")) {
      content.push({ type: "input_image", image_url: `data:${file.mimeType};base64,${file.data}` });
    } else if (file.mimeType === "application/pdf") {
      content.push({ type: "input_file", filename: file.filename ?? "extrato.pdf", file_data: `data:${file.mimeType};base64,${file.data}` });
    } else {
      // Texto puro (CSV/OFX caem aqui, com mimeType "text/plain") — decodifica
      // e embute como texto no prompt, mais confiável do que `input_file`
      // pra formatos que não são imagem/PDF.
      const decoded = decodeBase64Utf8(file.data);
      content.push({ type: "input_text", text: `Conteúdo do arquivo "${file.filename ?? "arquivo"}":\n\n${decoded}` });
    }
  }
  content.push({ type: "input_text", text: prompt });
  return [{ role: "user", content }];
}

interface CallAIOptions {
  prompt: string;
  file?: FilePart;
  geminiSchema: unknown;
  openaiSchema: unknown;
  schemaName: string;
}

// Orquestra os dois provedores: tenta o Gemini (com seu próprio retry) e,
// só se ele esgotar as tentativas, cai pra OpenAI (com o retry dela). Se os
// dois falharem, propaga uma mensagem combinada com o erro de cada um.
async function callAI(opts: CallAIOptions): Promise<any> {
  try {
    return await withRetry(() => callGeminiOnce(buildGeminiContents(opts.prompt, opts.file), opts.geminiSchema), "Gemini");
  } catch (geminiErr) {
    console.error(
      "[parse-statement] Gemini esgotou as tentativas — usando OpenAI como fallback:",
      geminiErr instanceof Error ? geminiErr.message : geminiErr,
    );
    try {
      return await withRetry(
        () => callOpenAIOnce(buildOpenAIInput(opts.prompt, opts.file), opts.openaiSchema, opts.schemaName),
        "OpenAI (fallback)",
      );
    } catch (openaiErr) {
      const geminiMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      const openaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
      throw new Error(`Falha ao processar com IA — Gemini: ${geminiMsg} | OpenAI (fallback): ${openaiMsg}`);
    }
  }
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

      const result = await callAI({
        prompt,
        file: { mimeType, data: contentBase64, filename },
        geminiSchema: EXTRACT_SCHEMA,
        openaiSchema: EXTRACT_SCHEMA_OPENAI,
        schemaName: "extract_transactions",
      });

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

      const result = await callAI({
        prompt,
        geminiSchema: REFINE_SCHEMA,
        openaiSchema: REFINE_SCHEMA_OPENAI,
        schemaName: "refine_transactions",
      });

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
