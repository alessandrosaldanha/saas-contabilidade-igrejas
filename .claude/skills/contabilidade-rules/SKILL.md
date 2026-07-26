---
name: contabilidade-rules
description: Taxonomia padrão de categorias contábeis de igreja, política de confiança da IA e o funcionamento das regras de mapeamento (De-Para) por igreja. Use ao mexer em categorização de lançamentos, no fluxo de Importação de Extrato ou no Livro Caixa.
---

## 📖 SKILL: Regras de Negócio — Contabilidade de Igreja

Referência da política de categorização contábil usada em todo o app (Livro Caixa, Importação de Extrato, Edge Function `parse-statement`). Qualquer mudança na taxonomia ou na política de confiança deve manter os três pontos de duplicação abaixo sincronizados.

---

### 🗂️ 1. Taxonomia padrão de categorias

Fonte única no frontend: [`src/constants/accountingCategories.ts`](../../../src/constants/accountingCategories.ts). Espelhada (sem import compartilhado — runtime Deno separado) em [`supabase/functions/parse-statement/index.ts`](../../../supabase/functions/parse-statement/index.ts). Cores de exibição em `CATEGORY_TONE` (`src/services/mockData.ts`).

**Entradas:**
- Dízimos
- Ofertas Gerais
- Ofertas Especiais/Missões
- Campanhas/Eventos
- Outras Entradas

**Saídas:**
- Sustento Pastoral / Prebenda
- Utilidades (Água, Luz, Internet)
- Manutenção de Templo
- Ação Social / Auxílio
- Material de Escola Dominical / Departamentos
- Eventos / Conferências
- Taxas Bancárias / Impostos
- Despesas Administrativas

A categoria é sempre condicionada ao `type` (`entrada`/`saida`) do lançamento — nunca misturar as duas listas em um único select sem filtrar por tipo (`categoriesForType(type)`).

---

### 🎯 2. Política de confiança (`confidence`)

- `alta`: categoria óbvia pela descrição, ou veio de uma regra salva (De-Para) que bateu exatamente.
- `media`: razoavelmente certo, mas sem confirmação de uma regra/padrão explícito.
- `baixa`: chute da IA sem sinal forte na descrição, ou lançamento rebaixado no Modo Estrito por não bater com nenhuma regra salva.

Na UI (Importação de Extrato), lançamentos com `confidence !== "alta"` são destacados em amarelo/alerta na pré-visualização e contados no card "Pendentes de Revisão".

---

### 🔁 3. Regras de mapeamento (De-Para)

Tabela `category_rules` (por `church_id`, RLS igual a `transactions`/`import_history` — ver `docs/database.md`). Guarda `keyword` (palavra-chave/fornecedor) → `category`, por `type`.

- **Correspondência:** por palavra-chave normalizada (minúsculas, sem acento) **contida** na descrição do lançamento — não é igualdade exata. Regra com keyword mais longa vence em caso de múltiplos matches.
- **Quem gerencia:** Admin/Tesoureiro (mesmo grupo que importa/lança no Livro Caixa), via o botão "Gerenciar Regras" na tela de Importação.
- **Sugestão automática:** toda vez que uma instrução no chat de IA muda a categoria de um lançamento, a UI oferece salvar aquele fornecedor/descrição como regra padrão da igreja (banner com campo de palavra-chave editável).

---

### ⚙️ 4. Modo de categorização — "IA Autônoma" × "Modo Estrito"

Toggle na tela de Importação de Extrato, enviado à Edge Function `parse-statement` como `applyMode` (`"ai" | "strict"`), junto com `churchId` (para consultar `category_rules` daquela igreja):

- **IA Autônoma (`ai`):** comportamento padrão — o Gemini decide a categoria livremente a cada extração/refinamento. Regras salvas não são aplicadas automaticamente (servem só de referência/gestão).
- **Modo Estrito (`strict`):** a IA continua fazendo a leitura/OCR do extrato (isso é inerente — não tem como extrair texto de PDF/imagem sem ela), mas a categorização final segue esta ordem:
  1. Se a descrição bate com uma regra salva da igreja → usa a categoria da regra, `confidence = "alta"`.
  2. Se não bate com nenhuma regra → mantém a categoria sugerida pela IA, mas **rebaixa a confiança um nível** (`alta→media`, `media→baixa`, `baixa` permanece `baixa`) para forçar revisão humana explícita.

Preferência de modo persiste em `localStorage` por igreja (`categorization-mode:<church_id>`) — não é um dado de negócio no banco, só uma preferência de UI.
