# 🏛️ Diretrizes do Projeto: Gestão Contábil de Igreja com IA

Plataforma web multi-tenant de **Gestão Financeira, Contábil e Governança (RBAC) para Igrejas Locais**, com automação via IA (Google Gemini) para leitura e categorização de extratos bancários. Ver [`docs/architecture.md`](./docs/architecture.md) para a visão completa.

## 🔄 REGRA OBRIGATÓRIA DE FINALIZAÇÃO (AUTO-DOCUMENTAÇÃO)

Toda vez que você (Claude Code) finalizar qualquer tarefa ou alteração solicitada pelo usuário, você DEVE automaticamente:

1. Atualizar a documentação relevante:
   - **[`docs/changelog.md`](./docs/changelog.md):** sempre adicionar uma entrada nova (`### [DATA] Título`) descrevendo o que foi feito, decisões técnicas e como foi validado — mesmo padrão já usado em todas as entradas anteriores.
   - **[`docs/architecture.md`](./docs/architecture.md), [`docs/database.md`](./docs/database.md) ou [`docs/permissions-rbac.md`](./docs/permissions-rbac.md):** atualizar se a mudança alterou stack/estrutura de pastas, schema/RLS/RPCs, ou a matriz de permissões (o que essas mudanças de fato *são hoje*, não o histórico — isso fica só no changelog).
   - Este `CLAUDE.md` raiz só muda se a diretriz essencial em si mudar (comandos, regra de auto-documentação, índice).
2. Informar ao usuário no terminal: _"Contexto atualizado com sucesso!"_

## 📚 Índice da Documentação

| Arquivo | Conteúdo |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Stack técnica, estrutura de pastas |
| [`docs/database.md`](./docs/database.md) | Schema, RLS, funções/RPCs, triggers, Edge Functions |
| [`docs/permissions-rbac.md`](./docs/permissions-rbac.md) | Matriz de papéis × rotas × permissões |
| [`docs/git-workflow.md`](./docs/git-workflow.md) | Branches (`hmg`/`main`), CI/CD (Vercel), tags e Releases |
| [`docs/changelog.md`](./docs/changelog.md) | Log cronológico detalhado de cada sessão de implementação |

## ⚙️ Comandos Essenciais

```bash
npx tsc --noEmit    # type-check (rodar antes de considerar qualquer tarefa concluída)
npm run build       # tsc -b + vite build — build de produção
npm run lint        # ESLint
npm run dev         # dev server local (Vite)
```

**Nunca declare uma tarefa concluída sem `npx tsc --noEmit` e `npm run build` passando sem erros.**

## 🌿 Git Workflow (resumo)

Todo desenvolvimento entra em `hmg` → Vercel faz deploy automático de preview → após validar, merge para `main` → tag + Release no GitHub. Detalhes completos e comandos exatos em [`docs/git-workflow.md`](./docs/git-workflow.md).

## 🧠 Skills & Protocolos de Execução

O Claude Code deve ler, carregar e seguir rigorosamente as skills definidas no arquivo `SKILLS.md` (ou na pasta `.claude/skills/`).

### Skills Ativas no Projeto:

1. **Skill de Auto-Documentação:** Registra alterações em `docs/changelog.md` (+ o doc modular relevante) ao finalizar cada tarefa.
2. **Skill de Solução de Problemas & QA:** Executa diagnósticos (`npx tsc --noEmit`), corrige falhas de tipagem/sintaxe e valida a compilação antes de declarar o projeto como "Pronto".

> **Instrução Permanente:** Antes de declarar qualquer comando ou tarefa como concluída, consulte o protocolo de qualidade acima para garantir que nenhuma dependência ou código esteja quebrado.
