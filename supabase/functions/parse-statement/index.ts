// Edge Function: extrai e categoriza lançamentos de um extrato bancário via Gemini.
// Roda aqui (nunca no frontend) porque precisa da GEMINI_API_KEY.
// Deploy: supabase functions deploy parse-statement
// Secret:  supabase secrets set GEMINI_API_KEY=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Alias "latest" em vez de uma versão fixa — evita quebrar quando o Google
// aposenta modelos antigos para novas chaves de API (ex.: gemini-2.5-flash
// parou de aceitar chaves novas pouco tempo depois do lançamento).
const GEMINI_MODEL = "gemini-flash-latest";

const CATEGORIES = [
  "Dízimos e Ofertas",
  "Prebenda Pastoral",
  "Manutenção do Templo",
  "Ação Social",
  "Contas e Utilidades",
  "Administrativo",
  "Outros",
];

const TRANSACTION_ITEM_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Data no formato YYYY-MM-DD" },
    description: { type: "string" },
    value: { type: "number", description: "Valor absoluto (sempre positivo)" },
    type: { type: "string", enum: ["entrada", "saida"] },
    category: { type: "string", enum: CATEGORIES },
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function callGemini(contents: unknown[], schema: unknown) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const res = await fetch(
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

  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Gemini");
  return JSON.parse(text);
}

Deno.serve(async (req) => {
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
    } = await callerClient.auth.getUser();
    if (!caller) return new Response("Não autenticado", { status: 401, headers: CORS_HEADERS });

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!profile || !["Admin", "Tesoureiro"].includes(profile.role)) {
      return new Response("Apenas Admin/Tesoureiro podem importar extratos", { status: 403, headers: CORS_HEADERS });
    }

    const body = await req.json();

    if (body.mode === "extract") {
      const { filename, mimeType, contentBase64 } = body;
      if (!filename || !mimeType || !contentBase64) {
        return new Response("Campos obrigatórios: filename, mimeType, contentBase64", { status: 400, headers: CORS_HEADERS });
      }

      const prompt = `Você é um assistente contábil de uma igreja. Leia o extrato bancário anexado (arquivo "${filename}") e extraia todos os lançamentos.
Para cada lançamento, classifique o tipo ("entrada" ou "saida") e escolha a categoria mais adequada dentre: ${CATEGORIES.join(", ")}.
Use "Dízimos e Ofertas" para entradas típicas de igreja. Para saídas, escolha a categoria mais específica possível; use "Outros" só se nenhuma se aplicar.
Defina "confidence" como "alta" quando a categoria for óbvia pela descrição, "media" quando razoavelmente certo, "baixa" quando for um chute.
Retorne todos os lançamentos encontrados, sem inventar nenhum que não esteja no extrato.`;

      const result = await callGemini(
        [{ role: "user", parts: [{ inlineData: { mimeType, data: contentBase64 } }, { text: prompt }] }],
        EXTRACT_SCHEMA,
      );
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
Categorias válidas: ${CATEGORIES.join(", ")}.`;

      const result = await callGemini([{ role: "user", parts: [{ text: prompt }] }], REFINE_SCHEMA);
      return new Response(JSON.stringify(result), { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response("Campo 'mode' deve ser 'extract' ou 'refine'", { status: 400, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 500, headers: CORS_HEADERS });
  }
});
