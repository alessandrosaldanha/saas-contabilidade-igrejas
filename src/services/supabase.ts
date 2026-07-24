import { createClient, FunctionsHttpError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias — copie .env.example para .env e preencha com os dados do seu projeto Supabase.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// `supabase.functions.invoke` colapsa qualquer status não-2xx na mensagem genérica
// "Edge Function returned a non-2xx status code" — o corpo real da resposta (onde a
// função coloca a mensagem útil) só existe em `error.context`, um `Response` cru que
// precisa ser lido separadamente. Sem isso, todo erro de função vira essa frase genérica.
export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().text();
      if (body) return body;
    } catch {
      // corpo não pôde ser lido — cai para a mensagem genérica abaixo
    }
  }
  return error instanceof Error ? error.message : String(error);
}
