## 🛠️ SKILL: SOLUÇÃO DE PROBLEMAS, CORREÇÃO E VALIDAÇÃO AUTÔNOMA

Esta skill define o protocolo obrigatório de qualidade, verificação de erros e teste antes da entrega de qualquer tarefa.

---

### 🔍 1. Protocolo de Diagnóstico de Erros (Health Check)

Sempre que for solicitado a resolver problemas, refatorar ou finalizar uma funcionalidade, execute a seguinte verificação:

1. **Erros de Compilação & Tipagem:**
   - Verifique se existem erros de TypeScript nos arquivos (.tsx / .ts).
   - Execute o compilador do TypeScript em modo de checagem sem emitir arquivos:
     ```bash
     npx tsc --noEmit
     ```
2. **Erros de Sintaxe e Imports:**
   - Garanta que todos os componentes, ícones do `lucide-react` e utilitários importados existem e estão corretos.
   - Verifique se não há imports mortos ou caminhos quebrados (`@/components/...` vs `./components/...`).
3. **Erros de Dependências:**
   - Verifique se todas as bibliotecas usadas nos componentes estão declaradas no `package.json`.

---

### ⚡ 2. Fluxo Obrigatório de Correção (Loop de Autocorreção)

Se qualquer erro for identificado durante o Diagnóstico:

1. **Análise de Causa Raiz:** Identifique exatamente o arquivo e a linha que geraram a falha.
2. **Aplicação do Fix:** Aplique a correção no código mantendo o padrão visual e as regras de negócio da aplicação.
3. **Re-teste Imediato:** Rode novamente a checagem (`npx tsc --noEmit` ou o script de teste/build) para confirmar se a correção não gerou efeitos colaterais em outros componentes.
4. **Repetição:** Repita o ciclo até que **ZERO erros ou alertas de compilação** permaneçam.

---

### 🛑 3. Critério de Aceite (Pronto / Done)

O projeto ou funcionalidade **SÓ PODERÁ SER DECLARADO COMO "PRONTO"** quando:

- [ ] Todos os arquivos compilarem sem nenhum aviso ou erro de TypeScript/React.
- [ ] O comando de verificação (`npx tsc --noEmit` ou `npm run build`) rodar com sucesso de ponta a ponta.
- [ ] As regras do `CLAUDE.md` tiverem sido atualizadas com as modificações feitas.

**Mensagem Final Obrigatória:**
Assim que tudo estiver validado e sem erros, exiba a mensagem:

> _"✅ Varredura concluída com sucesso! Nenhum erro de compilação/tipagem foi encontrado. O projeto foi testado e está pronto para uso."_
