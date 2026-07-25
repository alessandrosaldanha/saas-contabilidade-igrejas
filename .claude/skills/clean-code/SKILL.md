# SKILL: Clean Code & Best Practices (Robert C. Martin)

## Objetivo

Atuar como um arquiteto e desenvolvedor especialista focado na escrita de código limpo, legível, sustentável e de fácil manutenção, seguindo rigorosamente os princípios do livro "Código Limpo" de Robert C. Martin.

---

## 1. Regra do Escoteiro (Boy Scout Rule)

- Sempre deixe o código mais limpo do que como você o encontrou.
- Ao alterar um arquivo para adicionar uma nova funcionalidade ou corrigir um bug, refatore pequenas partes ao redor se identificar más práticas ("code smells").

---

## 2. Nomes Reveladores de Intenção

- **Variáveis e Funções:** Devem responder por que existem, o que fazem e como são usadas. Evite nomes genéricos (`data`, `temp`, `info`, `x`).
- **Sem Desinformação:** Não use abreviações obscuras ou nomes de tipos incorretos (ex: `userList` se o tipo for um `Set`).
- **Nomes Pronunciáveis e Buscáveis:** Dê preferência a nomes descritivos em vez de siglas curtas.
- **Classes:** Nomes com substantivos ou frases substantivas (ex: `UserAccount`, `TransactionRepository`).
- **Métodos/Funções:** Nomes com verbos ou frases verbais (ex: `calculateTotalBalance`, `sendNotification`).

---

## 3. Funções Pequenas e Focadas

- **Faça apenas uma coisa (Single Responsibility Principle):** A função deve ter apenas um motivo para mudar.
- **Tamanho reduzido:** Mantenha as funções o menor possível (idealmente menos de 20 linhas).
- **Apenas um nível de abstração por função:** Não misture lógica de alto nível com detalhes de baixo nível.
- **Parâmetros limitados:** - 0 parâmetros: Ideal (Nulo).
  - 1 a 2 parâmetros: Aceitável (Moinho / Díade).
  - 3 ou mais parâmetros: Evitar ou refatorar agrupando em um objeto de configuração/DTO.
- **Sem efeitos colaterais ocultos:** A função deve fazer exatamente o que o nome sugere, sem alterar estados não declarados.

---

## 4. Comentários (Código autoexplicativo)

- **Crie código limpo em vez de comentar código ruim:** O código deve explicar a si mesmo.
- **Comentários úteis:**
  - Explicação de decisão de negócios/arquitetura complexa ("Por que" e não "Como").
  - Alertas de consequências (ex: teste de longa duração).
- **Comentários proibidos:**
  - Código comentado (apague-o; o Git mantém o histórico).
  - Comentários redundantes ou óbvios.
  - Comentários de diário de alterações (use o controle de versão).

---

## 5. Tratamento de Erros e Exceções

- Prefira lançar **exceções** a retornar códigos de erro brutos (`null`, `-1`).
- Mantenha o tratamento de erro separado da lógica principal (blocos `try/catch` limpos).
- Não retorne nem passe valores `null` desnecessários; use _Null Object Pattern_ ou coleções vazias.

---

## 6. Formatação e Organização

- **Conceito da Primeira Página de Jornal:** Coloque as funções de alto nível no topo do arquivo e os detalhes de implementação mais abaixo (ordem descendente de abstração).
- Mantêm o estilo de indentação e espaçamento consistente em todo o projeto.
- Agrupe variáveis e funções relacionadas próximas umas das outras.

---

## 7. Testes Automatizados Limpos (FIRST)

Os testes unitários e de integração devem seguir a regra F.I.R.S.T.:

- **Fast (Rápidos):** Rodam rapidamente.
- **Independent (Independentes):** Não dependem de outros testes.
- **Repeatable (Repetíveis):** Funcionam em qualquer ambiente.
- **Self-Validating (Auto-validáveis):** Retornam sucesso ou falha (booleano).
- **Timely (Oportunos):** Escritos antes ou junto com o código de produção (TDD).

---

## Diretrizes de Resposta para a IA

Ao responder ou gerar código:

1. Aplique todas as regras acima por padrão.
2. Explique brevemente as refatorações realizadas com base no livro Clean Code (ex: "Extraí esta lógica para um método privado para manter um único nível de abstração").
3. Priorize a clareza e a facilidade de leitura para humanos acima de "truques de sintaxe".
