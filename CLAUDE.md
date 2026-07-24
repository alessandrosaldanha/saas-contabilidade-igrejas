# 🏛️ Diretrizes e Contexto do Projeto: Gestão Contábil de Igreja com IA

## 🔄 REGRA OBRIGATÓRIA DE FINALIZAÇÃO (AUTO-DOCUMENTAÇÃO)

Toda vez que você (Claude Code) finalizar qualquer tarefa ou alteração solicitada pelo usuário, você DEVE automaticamente:

1. Atualizar este arquivo (`CLAUDE.md`) registrando:
   - Novas páginas, componentes ou rotas criadas.
   - Mudanças na estrutura de dados ou novas dependências instaladas.
   - Decorações ou decisões técnicas tomadas durante a execução.
2. Informar ao usuário no terminal: _"Contexto atualizado em CLAUDE.md com sucesso!"_

Este arquivo serve como a fonte da verdade de contexto, arquitetura, regras de negócio e stack técnica para o Claude Code.

---

## 🚀 1. Visão Geral do Projeto

Plataforma web de **Gestão Financeira, Contábil e Governança (RBAC) para Igrejas Locais**, focada em simplicidade, auditabilidade total e automação via IA (processamento de extratos bancários PDF/OFX).

---

## 🛠️ 2. Stack Técnica & Arquitetura

- **Frontend:** React 18+ com TypeScript, Vite, Tailwind CSS e Lucide-React (ícones).
- **Roteamento:** React Router DOM (v6+).
- **Autenticação:** Keycloak SSO (ou Supabase Auth / Clerk) com controle de perfis RBAC.
- **Banco de Dados & Storage (Free Tier):** Supabase (PostgreSQL + Storage de comprovantes).
- **IA Integrada:** API do Google Gemini (Gemini 1.5 Flash) para leitura e categorização contábil de extratos.

---

## 📐 3. Estrutura de Pastas Esperada

```text
src/
├── assets/          # Imagens, logos e ícones estáticos
├── components/      # Componentes reutilizáveis (Sidebar, Header, Modais, Cards, Banners)
├── pages/           # Páginas principais da aplicação
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── LivroCaixa.tsx
│   ├── ImportacaoExtrato.tsx
│   ├── Auditoria.tsx
│   └── Usuarios.tsx
├── types/           # Interfaces e tipos TypeScript (User, Transaction, AuditLog)
├── services/        # Integrações de API (Supabase, Gemini API, Auth)
└── utils/           # Funções utilitárias (Formatadores de Moeda R$, Datas, Exportação PDF)
```

---

## 📝 4. Log de Implementação

### [2026-07-24] Conversão do protótipo estático (.dc.html) para React + Vite + TS

**O que foi feito:**
- Projeto Vite (`react-ts`) criado na raiz, com Tailwind CSS, PostCSS/Autoprefixer, `lucide-react` e `react-router-dom` instalados e configurados (`tailwind.config.js`, `postcss.config.js`).
- Paleta de cores da marca (Orla) portada para `tailwind.config.js` (`orla-blue`, `orla-coral`, `neutral.*`, `status.*`) a partir de `legacy-static/_ds/.../tokens/colors.css`.
- Roteamento (`src/App.tsx`) com `react-router-dom`: `/login` (sem sidebar) e rotas aninhadas sob `Layout` (`/dashboard`, `/livro-caixa`, `/importacao`, `/usuarios`, `/auditoria`).
- **Componentes:** `Sidebar` (navegação + dropdown de perfil/logout + colapsar), `Layout`, `Card`, `Badge`, `Avatar`, `MetricCard`, `ThemeToggle`, `Toast`, `ExploratoryChart` (gráfico barras/linhas/área/radar).
- **Páginas:** `Login.tsx`, `Dashboard.tsx`, `LivroCaixa.tsx`, `ImportacaoExtrato.tsx`, `Auditoria.tsx`, `Usuarios.tsx` — todas com estado local via `useState` (filtros de mês, busca, modais, paginação) e estado global via `AppContext` (tema, modo apresentação, toast, transações/usuários/histórico de importação compartilhados entre páginas).
- **Estrutura de dados:** `src/types/index.ts` (interfaces `Transaction`, `ChurchUser`, `AuditLog`, etc.), `src/services/mockData.ts` (dados mock + geradores determinísticos de transações/logs de auditoria — placeholder para futura integração com Supabase/Gemini), `src/utils/format.ts` e `src/utils/chartBuilders.ts` (formatação de moeda e construção dos gráficos SVG).
- Arquivos estáticos originais (`Contabilidade Igreja.dc.html`, `Login.dc.html`, `support.js`) movidos para `legacy-static/` como referência; pasta `_ds` (tokens do design system) permanece na raiz.

**Decisões técnicas:**
- Autenticação, RBAC real, Supabase e Gemini API **não foram integrados** — o app usa dados mock e simula os fluxos (login com delay artificial, categorização de IA por regras simples de texto, export CSV real via Blob, export PDF/Word simulado em modal). Integração real fica para uma próxma etapa.
- Tema claro/escuro implementado via Tailwind `darkMode: "class"` (classe `dark` no `<html>`, alternada pelo `ThemeToggle`), em vez de custom properties CSS como no protótipo original.
- Build validado com `npm run build` (tsc + vite) e testado visualmente no navegador (todas as 6 telas), sem erros de console.

**Próximos passos sugeridos:** criar camada `services/supabase.ts` e `services/gemini.ts` quando a integração real for iniciada, mantendo as mesmas assinaturas hoje expostas por `services/mockData.ts`.

### [2026-07-24] Correção do remote Git e push inicial para GitHub pessoal

**O que foi feito:**
- `origin` estava apontando para uma URL divergente (`SaaS-contabilidade-para-igrejas-.git`, inexistente/privada); corrigido via `git remote set-url` para `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas.git` (repositório confirmado existente via `git ls-remote`).
- Push inicial de `main` (commit único `56ffb9b`) realizado com sucesso via PAT temporário (header `Authorization` passado apenas no comando `git -c http.extraheader=...`, nunca persistido no remote nem no `.git/config`).
- Branch `main` configurada com tracking para `origin/main`.

**Decisões técnicas:**
- Ambiente usa `credential.helper=manager` (Git Credential Manager) em nível de sistema, mas essa sessão do Claude Code é não-interativa (sem navegador para o fluxo OAuth do GCM) — por isso o push foi autenticado via PAT pontual em vez de depender do GCM.
- Nenhuma credencial do GitHub estava em cache no Windows Credential Manager (`cmdkey /list`) no momento — sem risco de conflito com conta corporativa.

**Próximos passos:** para pushes futuros feitos diretamente pelo usuário no terminal local (fora desta sessão), o GCM deve funcionar normalmente via navegador.

### [2026-07-24] Fase 0 + Fase 1: Fundação Supabase e RBAC real

**O que foi feito:**
- **Dependência:** `@supabase/supabase-js` instalada.
- **Schema real** em `supabase/migrations/0001_init.sql`: tabelas `profiles` (estende `auth.users` com `role`/`status` do RBAC), `transactions`, `audit_logs` (append-only) e `import_history`, todas com RLS habilitada.
  - Funções `has_role()`/`is_admin()` (SECURITY DEFINER) usadas nas policies.
  - Trigger `handle_new_user` cria o `profile` automaticamente quando um usuário é criado no Supabase Auth (via convite).
  - RPCs `admin_update_user_role`, `admin_set_user_status` e `touch_last_access` — únicas formas de alterar role/status/último acesso; qualquer update direto na tabela `profiles` por um usuário comum é bloqueado (sem policy de UPDATE liberada para o client).
- **Edge Function** `supabase/functions/invite-user/index.ts`: usa a service-role key (nunca exposta no frontend) para chamar `auth.admin.inviteUserByEmail`, verificando antes que quem chama é Admin.
- **`src/services/supabase.ts`**: client criado a partir de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (`.env.example` adicionado; `.env` no `.gitignore`).
- **`src/context/AuthContext.tsx`** (novo): sessão real do Supabase Auth + perfil (`profiles`), `signIn`/`signOut`.
- **`src/components/ProtectedRoute.tsx`** (novo): guard de rota — sem sessão ou com `status = "Inativo"` redireciona para `/login`; suporta `allowedRoles` para restringir por papel.
- **`src/App.tsx`**: `AuthProvider` envolvendo `AppProvider`; todas as rotas do `Layout` protegidas; `/usuarios` restrita a `allowedRoles={["Admin"]}`.
- **`src/pages/Login.tsx`**: autenticação real via `signIn` (Supabase Auth), removida a simulação com `setTimeout`/checagem de senha fake e as referências a "Keycloak".
- **`src/pages/Usuarios.tsx`**: convite real (chama a Edge Function `invite-user`), troca de role via RPC `admin_update_user_role`, ativar/bloquear acesso via RPC `admin_set_user_status`, reset de senha via `supabase.auth.resetPasswordForEmail`. Lista de usuários (`usersList`) agora vem de `AppContext.refreshUsers()`, que lê a tabela `profiles`.
- **`src/context/AppContext.tsx`**: `currentUser` passou a vir do perfil autenticado (`useAuth`); `usersList` é buscado do Supabase (removido o mock `DEFAULT_USERS`, que foi apagado de `src/services/mockData.ts`).
- **`src/components/Sidebar.tsx`**: item "Governança e Usuários" só aparece para `role === "Admin"`; logout chama `supabase.auth.signOut()`.
- **`src/types/index.ts`**: `ChurchUser.id` mudou de `number` para `string` (UUID do Supabase Auth).
- **`src/vite-env.d.ts`** (novo): tipagem de `import.meta.env` para as variáveis `VITE_SUPABASE_*`.

**Decisões técnicas:**
- Autenticação: **Supabase Auth** (não Keycloak) — evita integrar um segundo sistema, mantém tudo no free tier do Supabase.
- IA de categorização (Fase 3, ainda não implementada): decidido usar **Gemini 1.5/2.0 Flash**.
- Convite de usuário via Edge Function (não via update direto de tabela) porque `auth.admin.inviteUserByEmail` exige a service-role key, que não pode rodar no browser.
- Alteração de role/status feita só por RPC `SECURITY DEFINER` (e não por policy de `UPDATE` direta) porque o Postgres não diferencia "admin" de "usuário comum" a nível de `GRANT` de coluna — todos os usuários logados executam como o mesmo role `authenticated` no Postgres; a checagem de "é Admin?" precisa acontecer dentro da função.
- `Transaction`, `AuditLog` e `ImportHistoryItem` **continuavam mockados neste ponto** (`services/mockData.ts`) — a Fase 0 já criou o schema real para essas tabelas (`transactions`, `audit_logs`, `import_history`); `Transaction`/`ImportHistoryItem` foram religados à Fase 3 (ver entrada abaixo), `AuditLog` segue mockado (Fase 4).
- Validado com `npx tsc --noEmit`, `npm run build` e testes de fluxo via Playwright headless (login carrega sem erros de console, acesso direto a `/dashboard` sem sessão redireciona para `/login`, submit de login com Supabase inexistente mostra erro amigável sem exceção não tratada) contra um `.env` com credenciais placeholder (removido após o teste).

### [2026-07-24] Setup manual do Supabase concluído — projeto real em produção

**O que foi feito (com o usuário, passo a passo):**
1. Projeto criado em supabase.com: `saas-contabilidade-igrejas` (ref `fumabywngmjfzsobmbjr`, região `ca-central-1`, plano Free).
2. Migration `0001_init.sql` rodada com sucesso no SQL Editor — tabelas, funções e policies criadas.
3. `.env` local criado com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais (não commitado, está no `.gitignore`).
4. Supabase CLI instalada via Scoop (`npm install -g supabase` não é mais suportado), `supabase login` feito via device-code flow, `supabase link --project-ref fumabywngmjfzsobmbjr` e `supabase functions deploy invite-user` executados com sucesso.
5. Primeiro usuário Admin criado via Admin API (`/auth/v1/admin/users`) com `user_metadata: { role: "Admin" }` — o trigger `handle_new_user` criou o profile automaticamente já com a role correta. Senha definida diretamente via Admin API (o link de recuperação por e-mail falhou com `otp_expired`, causado por scanners de segurança do provedor de e-mail — Gmail/Outlook — que "pré-visitam" o link de recovery e consomem o token antes do clique real do usuário; workaround documentado abaixo).
6. Login validado no app rodando localmente: RBAC reconheceu o usuário como Admin (menu "Governança e Usuários" visível).

**Decisões técnicas / correções feitas durante o setup:**
- `SUPABASE_SERVICE_ROLE_KEY` **não deve** ser configurada via `supabase secrets set` — o runtime de toda Edge Function já injeta `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente; nomes de secret começando com `SUPABASE_` são bloqueados pela CLI. Comentário desatualizado removido de `supabase/functions/invite-user/index.ts`.
- **Links de recovery/convite por e-mail podem falhar com `otp_expired`** por causa de link-scanning dos provedores de e-mail. Para o bootstrap do primeiro Admin, a senha foi definida diretamente via `PUT /auth/v1/admin/users/{id}` (Admin API) em vez de depender do link por e-mail. Vale considerar isso ao testar o fluxo de convite da Fase 1 em produção — se usuários convidados relatarem o mesmo erro, a mitigação é a mesma (definir/resetar senha via Admin API, ou orientar a abrir o link em modo anônimo/outro navegador para evitar o pré-fetch).
- Chave de API do projeto está no formato novo da Supabase (`sb_publishable_...`/`sb_secret_...` em vez do JWT legado `eyJ...` — neste projeto especificamente veio o formato JWT legado para a anon key e o formato novo `sb_secret_...` para a service role, ambos funcionam normalmente com `@supabase/supabase-js`).

**Próximos passos sugeridos (Fase 2 e 3):** religar `Dashboard.tsx` às agregações reais de `transactions`; implementar parsing real de OFX/CSV/PDF e `services/gemini.ts` para a categorização de `ImportacaoExtrato.tsx`.

### [2026-07-24] Fase 3: Livro Caixa real + Importação de Extrato com IA (Gemini)

**O que foi feito:**
- **`supabase/functions/parse-statement/index.ts`** (nova Edge Function): dois modos —
  - `mode: "extract"`: recebe `{filename, mimeType, contentBase64}`, envia o arquivo (PDF nativo ou texto para OFX/CSV) para o Gemini com `responseSchema` estrito, devolve `{transactions: [...]}` já categorizados (`Dízimos e Ofertas`, `Prebenda Pastoral`, `Manutenção do Templo`, `Ação Social`, `Contas e Utilidades`, `Administrativo`, `Outros`).
  - `mode: "refine"`: recebe `{transactions, instruction}` (chat em linguagem natural) e devolve a lista atualizada + um resumo do que foi alterado — substitui o antigo `if/else` de string matching por categorização real via IA, nos dois sentidos (extração inicial e ajuste conversacional).
  - Checa `has_role(['Admin','Tesoureiro'])` antes de aceitar a requisição (mesmo padrão de `invite-user`).
- **`src/context/AppContext.tsx`**: `transactions`/`importHistory` agora vêm do Supabase (`refreshTransactions`/`refreshImportHistory`), com `created_by`/`imported_by` (uuid) resolvidos para nome via `usersList`. Removidos os setters diretos (`setTransactions`/`setImportHistory`) e todo o gerador procedural de histórico fake (`genMonthTransactions`, `monthTransactions`, `computeLedger`, `DEFAULT_TRANSACTIONS`, `DEFAULT_IMPORT_HISTORY`) de `services/mockData.ts`.
- **`src/pages/LivroCaixa.tsx`**: ledger calculado de verdade a partir das transações reais (navegação por mês **e ano**, não só mês fixo em 2026); saldo de abertura = soma real de tudo antes do período (sem mais "saldo base" hardcoded de R$ 40.000).
- **`src/pages/ImportacaoExtrato.tsx`**: upload real de arquivo (PDF/OFX/CSV, `<input type="file">` de verdade em vez do dropzone simulado), extração via `parse-statement`, chat de refinamento via IA de verdade, e "Confirmar e Salvar" grava de fato em `transactions` + `import_history` (antes só simulava com `setTimeout`).
- **`src/utils/format.ts`**: helpers `isoToBr`/`brToIso` para converter entre o formato de data do Postgres (`YYYY-MM-DD`) e o formato usado na UI (`DD/MM/YYYY`).
- **`src/types/index.ts`**: `ImportHistoryItem.id` mudou de `number` para `string` (UUID real).
- CORS adicionado em **ambas** as Edge Functions (`parse-statement` e `invite-user`) — faltava no deploy inicial de `invite-user` também (só não tinha sido pego porque nunca foi exercitado pelo navegador antes desta fase); sem isso, toda chamada via `supabase.functions.invoke` do frontend falha silenciosamente com erro de CORS no preflight `OPTIONS`.

**Decisões técnicas:**
- **Gemini faz o parsing E a categorização em uma única chamada** (em vez de uma lib de parsing de OFX/CSV/PDF + um segundo passo de categorização) — o Gemini lê PDF nativamente (multimodal) e texto puro para OFX/CSV, com `responseSchema` garantindo JSON estruturado. Mais simples de manter que parsers dedicados para os formatos bancários reais (que variam muito) e é literalmente o que o produto já promete ("IA lê o extrato").
- **Modelo: alias `gemini-flash-latest`**, não uma versão fixa. Motivo: `gemini-2.5-flash` (definido inicialmente) retornou 404 "no longer available to new users" ao testar com a chave real — o Google aposenta modelos para chaves novas rápido. O alias sempre aponta para o Flash atual (hoje resolve para `gemini-3.6-flash`); reavaliar se `gemini-flash-latest` for descontinuado no futuro.
- **Chat de refinamento não preserva IDs entre chamadas** — cada resposta do Gemini é uma lista nova (sem tracking de diff/highlight como no mock antigo). Trade-off aceito: o resumo em texto (`summary`) explica o que mudou, evitando a complexidade de casar IDs num conteúdo que a IA pode reordenar/mesclar livremente.
- **`created_by`/`imported_by`** guardam o UUID do usuário (não o nome) — nome é resolvido no client via join com `usersList` já carregado no `AppContext`. Evita duplicar dados e mantém a trilha de auditoria referenciando o usuário real.
- Testado ponta a ponta em produção (projeto Supabase real) via Playwright: upload de CSV real → Gemini extraiu e categorizou corretamente (inclusive "Leroy Merlin" → Manutenção do Templo, sem precisar de correção manual) → chat de refinamento aplicou a instrução ("recategorize para Contas e Utilidades, reduza confiança para média") → salvo com sucesso → apareceu no Livro Caixa com saldo calculado corretamente e "Registrado por" com o nome real. Dados de teste removidos do banco depois.

**Ainda mockado (fora do escopo desta fase):** `Dashboard.tsx` (Fase 2) e `Auditoria.tsx` (Fase 4).

## 🧠 7. SKILLS & PROTOCOLOS DE EXECUÇÃO

O Claude Code deve ler, carregar e seguir rigorosamente as skills definidas no arquivo `SKILLS.md` (ou na pasta `.claude/skills/`).

### Skills Ativas no Projeto:

1. **Skill de Auto-Documentação:** Registra alterações no `CLAUDE.md` ao finalizar cada tarefa.
2. **Skill de Solução de Problemas & QA:** Executa diagnósticos (`npx tsc --noEmit`), corrige falhas de tipagem/sintaxe e valida a compilação antes de declarar o projeto como "Pronto".

> **Instrução Permanente:** Antes de declarar qualquer comando ou tarefa como concluída, consulte o protocolo de qualidade em `SKILLS.md` para garantir que nenhuma dependência ou código esteja quebrado.
