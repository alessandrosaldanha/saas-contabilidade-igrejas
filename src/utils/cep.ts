export interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
}

// ViaCEP: API pública brasileira de consulta de CEP, sem chave/autenticação.
export async function lookupCep(cep: string): Promise<CepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      uf: data.uf || "",
    };
  } catch {
    return null;
  }
}
