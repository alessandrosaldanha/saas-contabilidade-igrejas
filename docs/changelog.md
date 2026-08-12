# Changelog / Log de Implementação

Histórico cronológico e detalhado de cada sessão de implementação — o que foi feito, decisões técnicas e como foi validado. Preservado na íntegra (só reorganizado para fora do `CLAUDE.md` raiz, que ficava grande demais).

---

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

### [2026-07-24] Incidente de segurança: segredos reais gravados em `.claude/settings.json`

**O que aconteceu:** o allowlist de permissões do Claude Code registra automaticamente os comandos Bash/PowerShell exatos que são aprovados. Como alguns comandos desta sessão continham valores reais (service_role key do Supabase, API key do Gemini) embutidos diretamente na linha de comando (ex.: `curl ... -H "apikey: sb_secret_..."`), esses valores foram parar em `.claude/settings.json`. O **GitHub Push Protection bloqueou o push** ao detectar os segredos, antes de qualquer exposição pública.

**Verificação feita:** conferido manualmente (via `git show <commit>:.claude/settings.json`) que nenhum commit **já publicado** no GitHub continha os segredos — o vazamento ficou restrito a um commit local que nunca foi aceito pelo remoto.

**Correção:** `.claude/settings.json` reescrito removendo os valores sensíveis das entradas do allowlist (mantendo as permissões genéricas/reutilizáveis); o commit local foi re-escrito (`--amend`, seguro porque nunca tinha sido publicado) antes do push.

**Lição para o futuro:** ao rodar comandos que precisam de uma chave/secret real (curl com `apikey`, `Authorization: Bearer`, etc.), preferir variáveis de ambiente de shell (`$VAR`) já populadas por um passo anterior em vez de colar o valor literal na linha de comando — isso evita que o valor literal seja gravado no allowlist de permissões. Revisar `.claude/settings.json` antes de qualquer commit que o inclua.

### [2026-07-24] Fase 2: Dashboard Executivo com dados reais

**O que foi feito:**
- **`src/utils/metrics.ts`** (novo): agregações reais a partir de `transactions` —
  - `buildMetricsMeta(transactions, year)`: séries mensais (12 meses, em milhares) por categoria — usadas pelo gráfico exploratório.
  - `computePeriodComparison` / `getPeriodRange`: totais de entradas/saídas para o período selecionado (trimestral = últimos 3 meses corridos, semestral = 6, anual = 12) **e** o período anterior de mesma duração, para calcular o delta.
  - `buildCategoryBreakdown`: saídas por categoria dentro de uma janela de datas, com percentuais.
  - `deltaLabel`: formata a variação percentual (ou avisa "sem dados no período anterior" quando não há base de comparação).
- **`src/pages/Dashboard.tsx`**: KPIs (Entradas/Saídas Totais do período com delta real vs. período anterior; Saldo Atual em Caixa = soma de **todos** os lançamentos reais; substituído "Reserva de Emergência" — que não tinha nenhuma fonte de dado real por trás — por "Lançamentos no Período", contagem real). Gráfico "Entradas vs Saídas" e donut "Saídas por Categoria" calculados a partir de `transactions` reais, com estado vazio ("sem lançamentos ainda") em vez de gráfico quebrado/zerado quando não há dados.
- **`src/components/ExploratoryChart.tsx`**: passou a receber `metrics: MetricMeta[]` via prop (antes importava `METRICS_META` mockado direto do módulo); adicionado estado vazio quando todas as séries selecionadas são zero.
- **`src/services/mockData.ts`**: removidos `METRICS_META`, `DASHBOARD_ENTRADAS`, `DASHBOARD_SAIDAS`, `DONUT_DATA` (mock não usado mais por ninguém).

**Decisões técnicas:**
- Períodos (trimestral/semestral/anual) são janelas **rolantes** a partir de hoje (não "trimestre/semestre civil") — mais simples e sempre mostra dado real disponível, mesmo logo no início do ano.
- Gráfico "Entradas vs Saídas" e o exploratório continuam com os meses fixos Jan–Dez do ano corrente (mesma convenção do mock original) — é um recorte diferente (calendário fixo) do das KPIs (janela rolante), igual já era no mock.
- Testado com dados reais no Supabase de produção (inseridos e depois removidos por mim, tomando cuidado de **não apagar 7 lançamentos reais que o próprio usuário já tinha importado** — identificados e preservados por não terem o prefixo "TESTE" usado nos meus dados de teste).

**Ainda mockado:** `Auditoria.tsx` (Fase 4) — trilha de auditoria continua sendo gerada por um gerador procedural fake, não reflete ações reais do sistema.

### [2026-07-24] Fase 4: Auditoria real + Estornos no Livro Caixa

**O que foi feito:**
- **`supabase/migrations/0002_audit_trail.sql`** (nova, aplicada via `supabase db query --linked --file` direto na produção):
  - `request_ip()` / `request_device()`: helpers que leem a GUC `request.headers` (exposta pelo PostgREST em toda chamada via REST/RPC) para capturar IP e User-Agent **reais** de quem executou a ação.
  - Trigger `on_transaction_insert` (AFTER INSERT em `transactions`) → loga `aprovacao_caixa` automaticamente sempre que um lançamento é gravado, não importa por qual caminho (import IA, futura entrada manual, etc.) — não depende do código do frontend lembrar de logar.
  - Trigger `on_transaction_delete` (AFTER DELETE) → loga `estorno` automaticamente. **Isso é a implementação do estorno**: estornar = excluir a linha; o trigger cuida do registro imutável.
  - `admin_update_user_role` / `admin_set_user_status` (RPCs já existentes da Fase 1): passaram a gravar um log `edicao_manual` com before/after do role ou status alterado.
  - `touch_last_access` (RPC já existente, chamada a cada login): passou a gravar um log `acesso` a cada login real (distingue "primeiro login" de logins subsequentes).
- **`supabase/functions/invite-user/index.ts`**: após convidar com sucesso, grava um log `edicao_manual` ("Convite enviado para X").
- **`src/components/Sidebar.tsx`**: logout grava um log `acesso` (client-side, já que logout não tem nenhuma escrita natural no banco para um trigger capturar).
- **`src/pages/LivroCaixa.tsx`**: nova coluna "Ações" (visível só para Admin) com botão de estorno por lançamento — abre modal de confirmação, executa `DELETE` real na tabela `transactions` (a RLS `transactions_delete_admin` já restringia a Admin desde a Fase 0) e recalcula o saldo automaticamente via `refreshTransactions()`.
- **`src/pages/Auditoria.tsx`**: reescrita para buscar `audit_logs` reais do Supabase (filtro por mês/ano real, sem mais "2026" fixo), resolvendo o nome do usuário via `usersList` do `AppContext`. Removidos de `services/mockData.ts`: `genMonthAuditLogs`, `AUDIT_USERS`, `AUDIT_DETAILS`, `AUDIT_DEVICES`, `seedRand`, `pad2`, `CURRENT_MONTH_INDEX` (todos mock, sem mais uso).

**Decisões técnicas:**
- **Auditoria via trigger de banco, não via chamada explícita no frontend** — para `transactions` (insert/estorno), a escolha foi propositalmente arquitetural: um trigger garante que o log é gravado não importa como/onde a escrita aconteceu, sem depender de nenhum desenvolvedor futuro lembrar de chamar `supabase.from('audit_logs').insert(...)` manualmente. Para RBAC (troca de role/status) e login, a mesma lógica foi aplicada dentro das RPCs `SECURITY DEFINER` já existentes (mesmo motivo). Só convite e logout ficaram client-side/na Edge Function, por não terem uma escrita de tabela própria para um trigger interceptar.
- **"Conciliação"** do pedido original foi interpretada como já coberta pelo próprio fluxo de revisão da IA antes de "Confirmar e Salvar" (Fase 3) — não existe um livro-razão paralelo para conciliar contra, então uma tela extra de "marcar como conciliado" seria um recurso decorativo sem dado real por trás. **Estornos**, que era a parte de fato faltante, foi implementado como descrito acima.
- Testado ponta a ponta em produção via Playwright: login gerou log real com IP/User-Agent reais; inserção de um lançamento de teste via API autenticada gerou log de "Aprovação de Caixa" (com o User-Agent do `curl`, distinto do navegador — confirma que a captura é por requisição, não um valor estático); estorno desse lançamento pela UI removeu a linha do Livro Caixa, recalculou o saldo e gerou o log de "Estorno/Exclusão".
- **Nota:** como `audit_logs` não tem policy de `DELETE` (imutável por design), os registros de teste gerados durante essa validação **não puderam ser apagados** e permanecem no histórico real de produção — estão identificáveis pelo texto "TESTE ESTORNO" no campo `before`/`after` de um deles.

**Status do escopo original do usuário:** com esta fase, todos os pilares pedidos (RBAC/Governança, Dashboard, Livro Caixa + Importação IA, Conciliação/Estornos) estão implementados e rodando com dados reais em produção.

### [2026-07-24] Ações no histórico de importação (editar/excluir registro)

**O que foi feito:**
- **`supabase/migrations/0004_import_history_manage.sql`** (nova, aplicada via `supabase db query --linked --file` direto na produção): policies `import_history_update_treasury` (Admin/Tesoureiro) e `import_history_delete_admin` (Admin) — antes `import_history` só tinha policy de `select`/`insert`, então UPDATE/DELETE eram negados por padrão. Triggers `on_import_history_update`/`on_import_history_delete` logam `edicao_manual` na auditoria (before/after com filename/mês/contagem), mesmo padrão arquitetural já usado em `transactions` (Fase 3/4).
- **`src/pages/ImportacaoExtrato.tsx`**: nova coluna "Ações" na tabela "Extratos Processados Recentemente" (dentro da `div.mt-6.5`) — botão de editar (Admin/Tesoureiro, abre modal para alterar nome do arquivo, mês/ano de referência e quantidade de transações) e botão de excluir (Admin, modal de confirmação, `DELETE` real em `import_history`).

**Decisões técnicas:**
- `import_history` **não tem vínculo (FK) com as linhas de `transactions`** que ela representa — é só um registro de auditoria do lote importado (arquivo, mês, contagem). Por isso "editar/excluir o registro de importação" só altera/remove essa linha de histórico; não apaga nem religa os lançamentos já salvos no Livro Caixa (esses continuam sendo geridos via estorno/edição em `LivroCaixa.tsx`, Fase 4/lançamento manual). O modal de exclusão deixa isso explícito no texto de confirmação.
- Permissões espelham o padrão já usado em `transactions`: editar (Admin+Tesoureiro, mesmos papéis que podem inserir um import) e excluir (só Admin, mesmo padrão de `transactions_delete_admin`).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end na UI (login real) não foi executado nesta sessão por não haver credenciais de teste disponíveis — recomenda-se validar manualmente os botões de editar/excluir antes de considerar encerrado.

### [2026-07-24] Ilustração no painel esquerdo da tela de Login

**O que foi feito:**
- **`src/assets/chapel-illustration.svg`** (nova): ilustração vetorial original (não é foto/stock) de uma capela minimalista em line-art, com halo/cruz no topo, janela rosácea, duas janelas laterais com brilho nas cores da marca (`orla-blue`/`orla-coral`) e um céu estrelado — tudo em tons de branco translúcido sobre fundo transparente, pensado para compor com o painel preto já existente.
- **`src/pages/Login.tsx`**: a `div.absolute.inset-0.opacity-[0.08].bg-[radial-gradient(...)]` (efeito de luz já existente no painel esquerdo) passou a ficar dentro de um wrapper `div.absolute.inset-0.overflow-hidden` que também contém a nova `<img>` (a ilustração), posicionada atrás do gradiente. A ilustração usa `opacity-70` própria — manter a opacidade de 0.08 no *container* (em vez de só no gradiente) deixaria a imagem praticamente invisível, então essa foi movida para ficar restrita à camada do gradiente, preservando o efeito de brilho original por cima da imagem.

**Decisões técnicas:**
- Não há nenhum asset de imagem (foto, logo, ilustração) no repositório (`src/assets` só tinha um `.gitkeep`) nem uma ferramenta de geração de imagem disponível nesta sessão — por isso optei por um SVG desenhado à mão (formas geométricas simples: retângulos, polígonos, círculos e curvas), em vez de uma foto de banco de imagens (evita depender de URL externa adivinhada/hotlink e mantém o bundle 100% offline/self-contained).
- Cores do brilho (`glowBlue`/`glowCoral`) usam os hex exatos de `orla-blue`/`orla-coral` do `tailwind.config.js`, para a ilustração conversar com a paleta da marca em vez de introduzir cores novas.
- Validado visualmente: subiu o dev server localmente, tirou screenshot da `/login` via Playwright (Chromium já cacheado localmente em `%LOCALAPPDATA%\ms-playwright`) e confirmou sem erros de console — a ilustração fica legível atrás do texto branco (`z-10`) sem competir com a leitura.

### [2026-07-24] Troca do botão "Estornar" por "Excluir" no Livro Caixa

**O que foi feito:**
- **`src/pages/LivroCaixa.tsx`**: o botão de ação restrito a Admin (ícone `RotateCcw`, rótulo "Estornar/Excluir") foi renomeado para um botão de exclusão direto (ícone `Trash2`, rótulo "Excluir lançamento"). Estados/handlers renomeados (`estornoTarget`→`deleteTarget`, `isEstornando`→`isDeleting`, `canEstornar`→`canDelete`, `confirmEstorno`→`confirmDelete`); modal de confirmação, textos de toast ("Falha ao excluir"/"Lançamento excluído com sucesso") e o modal em si ("Excluir Lançamento" / "Confirmar Exclusão") atualizados para o mesmo vocabulário. A coluna "Ações" agora tem só dois botões: Editar (Admin/Tesoureiro) e Excluir (Admin).

**Decisões técnicas:**
- A operação em si **não mudou** — já era um `DELETE` real na tabela `transactions` (o "estorno" nunca foi um estorno contábil/lançamento de reversão, sempre foi uma exclusão de linha). A mudança é só de nomenclatura/ícone na UI para refletir isso com mais clareza, a pedido do usuário.
- **Nenhuma migration foi necessária**: o trigger `on_transaction_delete` (Fase 4) já grava o log de auditoria com `action_key = 'estorno'` e `action_label = 'Estorno/Exclusão'` — esse rótulo já contemplava "exclusão" desde a Fase 4, então a Trilha de Auditoria não precisa de nenhum ajuste.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual na UI não foi executado nesta sessão porque `/livro-caixa` fica atrás de login (`ProtectedRoute`) e não há credenciais de teste disponíveis nesta sessão.

### [2026-07-24] Seletor de mês/ano (calendário) no Livro Caixa

**O que foi feito:**
- **`src/pages/LivroCaixa.tsx`**: a `div.flex.items-center.gap-2` da navegação de período ganhou um popover de calendário — clicar no texto "Mês de Ano" (antes só um `<span>` estático) abre um painel com um stepper de ano (‹ 2026 ›) e uma grade com os 12 meses; clicar em um mês seleciona e fecha o popover. O `<select>` de mês que existia ao lado (redundante com a nova grade) foi removido, já que o popover cobre o mesmo caso de uso e adiciona controle de ano, que antes só existia indiretamente (via `goPrevMonth`/`goNextMonth` cruzando a virada do ano).
- Novo estado `periodPickerOpen`; segue o mesmo padrão de popover já usado no dropdown de perfil do `Sidebar.tsx` (toggle simples no clique do gatilho, sem listener de clique-fora).

**Decisões técnicas:**
- Nenhuma mudança de dados/lógica de agregação — o popover só chama os mesmos `setMonth`/`setYear` que já existiam.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Como `/livro-caixa` exige login e não há credenciais nesta sessão, o layout do popover foi conferido visualmente via uma renderização estática isolada (mesmo CSS compilado do build, fora do repositório, em pasta temporária) com Playwright — confirmado que o popover abre, o mês atual fica destacado em azul e o texto/ícones ficam legíveis sobre o fundo escuro.

### [2026-07-24] Altura fixa + scroll vertical na tabela do Livro Caixa

**O que foi feito:**
- **`src/pages/LivroCaixa.tsx`**: o `div.overflow-x-auto` que envolve a tabela de lançamentos virou `div.overflow-auto.max-h-[780px]` — a tabela agora tem altura fixa (~15 linhas visíveis) com scroll vertical próprio, em vez de a página inteira crescer sem limite quando o mês tem muitos lançamentos. O `<thead>` ganhou `sticky top-0 z-10` (+ fundo `bg-white dark:bg-neutral-900` e uma borda inferior) para o cabeçalho continuar visível enquanto as linhas rolam por baixo.

**Decisões técnicas:**
- `max-h-[780px]` foi calculado a partir da altura real de cada linha (padding `py-3.5` + texto `text-sm`, ~50px/linha) para caber ~15 lançamentos antes de precisar rolar, conforme pedido.
- Sem essa mudança, o `<thead>` sticky ficaria transparente sobre as linhas roladas por baixo — por isso o `bg-white dark:bg-neutral-900` foi replicado ali (mesmo tom do `Card` que envolve a tabela).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Como a página real exige login, o comportamento (altura fixa, ~15 linhas visíveis, cabeçalho fixo durante o scroll) foi confirmado com uma renderização estática isolada (mesmo CSS compilado do build) e 40 linhas fake via Playwright, incluindo screenshot antes/depois de rolar.

### [2026-07-24] Altura fixa + scroll vertical nos dois painéis da tela de Importação

**O que foi feito:**
- **`src/pages/ImportacaoExtrato.tsx`**: o grid de duas colunas (Pré-visualização de lançamentos + Agente de IA/chat) ganhou altura fixa (`h-[560px]` no `div.grid`, no lugar do `style={{ minHeight: 0 }}` que não limitava nada de fato). O `div.overflow-auto` que envolve a tabela de pré-visualização virou `div.flex-1.min-h-0.overflow-auto` (faltava o `flex-1 min-h-0` para ele realmente respeitar a altura do Card pai em vez de crescer com o conteúdo) e o `<thead>` da tabela ganhou `sticky top-0 z-10 bg-white dark:bg-neutral-900`, mesmo tratamento já aplicado na tabela do Livro Caixa.
- O painel do chat (`Agente de IA · Categorização`) já tinha `flex-1 min-h-0 overflow-y-auto` na área de mensagens — só faltava a altura fixa no grid pai para esse scroll realmente entrar em ação em vez do painel crescer junto com a tabela.

**Decisões técnicas:**
- O bug de fundo era estrutural: `flex-1`/`min-h-0`/`overflow-auto` só limitam altura de fato quando existe um ancestral com altura **determinada** — sem isso (como no `style={{ minHeight: 0 }}` anterior, que não define altura nenhuma), esses containers apenas crescem para caber o conteúdo, e a "área de scroll" nunca tem o que rolar porque nunca fica menor que o conteúdo. Colocar `h-[560px]` no grid resolveu os dois painéis de uma vez, porque ambos já dependiam (corretamente) dessa altura vir de cima.
- `h-[560px]` foi escolhido para caber confortavelmente a pré-visualização + chat sem empurrar demais o resto da página (stats, botão de salvar, histórico de importações, que ficam abaixo do grid).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) e com uma renderização estática isolada (mesmo CSS compilado do build) simulando 40 lançamentos e 20 mensagens de chat via Playwright — confirmado que os dois painéis ficam com a mesma altura, cabeçalho da tabela fixo durante o scroll, e nenhum dos dois cresce além do grid.

### [2026-07-24] Exclusão de importação agora remove os lançamentos vinculados no Livro Caixa

**O que foi feito:**
- **`supabase/migrations/0005_link_transactions_to_import.sql`** (nova, aplicada via `supabase db query --linked --file` direto na produção): adiciona a coluna `transactions.import_id` (uuid, nullable, `references import_history(id) on delete cascade`). Antes disso, `import_history` era só um registro de auditoria do lote (arquivo/mês/contagem) **sem nenhum vínculo real** com as linhas de `transactions` que ela representava (decisão explícita da Fase de "Ações no histórico de importação", agora revertida a pedido do usuário).
- **`src/pages/ImportacaoExtrato.tsx`**: `doSave` agora insere o `import_history` **primeiro** (com `.select("id").single()` para capturar o id gerado) e só depois insere as `transactions`, cada uma já com `import_id` apontando para esse registro. `confirmHistoryDelete` passou a chamar `refreshTransactions()` além de `refreshImportHistory()` após excluir (para o Livro Caixa refletir a remoção em cascata sem precisar recarregar a página). O modal de confirmação de exclusão foi reescrito para avisar que os lançamentos vinculados também serão apagados do Livro Caixa (em vez do texto anterior, que dizia o oposto).

**Decisões técnicas:**
- A exclusão em cascata é feita **via `ON DELETE CASCADE` do Postgres**, não por uma segunda chamada `DELETE` no frontend — mesma filosofia arquitetural já usada no projeto (regra de negócio garantida pelo banco, não pela lembrança do código cliente). O trigger `on_transaction_delete` já existente (Fase 4) dispara normalmente para cada linha removida em cascata, então cada lançamento apagado continua gerando seu próprio log de auditoria (`estorno`), sem trigger adicional necessário.
- **Limitação conhecida:** lançamentos e registros de `import_history` criados **antes** desta migration não têm `import_id` (não há como reconstruir retroativamente qual lote originou quais linhas) — excluir um registro de importação antigo (pré-migration) não vai remover nenhum lançamento, mesmo que a contagem exibida no modal sugira que sim. Só extratos importados a partir de agora têm o vínculo real.
- A ordem de escrita foi invertida (`import_history` antes de `transactions`) porque o `import_id` das transações depende do id gerado pelo insert do histórico — não há transação atômica entre as duas chamadas (Supabase JS client não expõe transações multi-tabela sem uma RPC dedicada), então uma falha no insert de `transactions` após o `import_history` já ter sido criado deixa um registro de histórico "órfão" (sem lançamentos); não foi implementado rollback automático para esse caso por não ter sido pedido e por adicionar complexidade desproporcional ao risco.
- Validado com `npx tsc --noEmit`, `npm run build` (sem erros) e uma consulta direta ao `information_schema.columns` em produção confirmando que a coluna `import_id` foi criada como `uuid`/nullable. Teste end-to-end (upload real → exclusão → sumiço no Livro Caixa) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-24] Deploy em produção (Vercel) + correção de roteamento SPA

**O que foi feito:**
- App publicado em `https://saas-contabilidade-igrejas.vercel.app` (Vercel conectado ao repo GitHub, deploy automático a cada push em `main`).
- Variáveis de ambiente configuradas no Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Production + Preview).
- Supabase Auth (Authentication → URL Configuration): Site URL e Redirect URLs atualizados para a URL de produção do Vercel (+ `localhost:5173` mantido para dev local).
- **`vercel.json`** (novo): rewrite `/(.*) → /index.html` — sem isso, o Vercel retornava 404 em qualquer rota que não fosse a raiz (`/login`, `/dashboard`, etc.), porque tentava servir um arquivo estático físico em vez de deixar o React Router assumir o roteamento client-side.
- Validado com Playwright direto contra a URL de produção: login e Dashboard funcionando, sem erros de console.

### [2026-07-24] Lançamento manual (criar/editar) + detecção de duplicatas na importação

**O que foi feito:**
- **`supabase/migrations/0003_manual_entry.sql`**: trigger `on_transaction_update` (AFTER UPDATE em `transactions`) loga `edicao_manual` na auditoria sempre que um lançamento é editado — mesmo padrão arquitetural dos triggers de insert/delete da Fase 4.
- **`src/pages/LivroCaixa.tsx`**: botão "Novo Lançamento" (Admin/Tesoureiro) e botão "Editar" por linha (Admin/Tesoureiro) — modal compartilhado com campos data/valor/descrição/tipo/categoria. Antes só era possível criar lançamento via importação com IA e só era possível remover via estorno; agora dá pra lançar/corrigir manualmente também.
- **`src/pages/ImportacaoExtrato.tsx`**: antes de salvar, compara os lançamentos extraídos contra os já existentes no Livro Caixa (mesma data + descrição + valor + tipo) e, se achar coincidência, mostra um aviso listando os possíveis duplicados antes de permitir salvar (com opção de "Salvar Mesmo Assim" para casos legítimos de coincidência).

**Por que isso foi feito agora (não estava no escopo original):** durante o teste da Fase 4, descobri que os 7 lançamentos reais do usuário estavam **duplicados** no banco de produção — ele tinha reimportado o mesmo extrato duas vezes pelo site (sem perceber) e a importação não tinha nenhuma proteção contra isso. Confirmei com o usuário antes de remover o lote duplicado (mantive o lote original, removi o mais recente). Como a causa raiz era uma lacuna real de produto, implementei a detecção de duplicatas na mesma sessão em vez de só reportar o problema.

**Decisões técnicas:**
- Detecção de duplicata é uma comparação **exata** (data + descrição + valor + tipo) feita no cliente contra `transactions` já carregado — não usa fuzzy matching. Suficiente para pegar o caso real que causou o incidente (reimportar o mesmo arquivo gera exatamente os mesmos valores), mas não pega duplicatas com descrição levemente diferente entre duas extrações da IA do mesmo lançamento.
- Categoria no formulário de lançamento manual usa a mesma lista fixa de categorias do `parse-statement` (Dízimos e Ofertas, Prebenda Pastoral, Manutenção do Templo, Ação Social, Contas e Utilidades, Administrativo, Outros) — mantém consistência com os gráficos/filtros que já dependem desses nomes exatos.
- Confiança de lançamento manual é sempre `"alta"` (não pede o campo na UI) — o conceito de "confidence" só faz sentido para inferência da IA, não para algo que um humano digitou diretamente.
- Testado ponta a ponta: criação, edição (com log de auditoria real gerado) e aviso de duplicata (confirmado que "Cancelar" não grava nada, testado contra os dados reais de produção).

### [2026-07-24] Diagnóstico + correção: "Falha ao processar extrato: Edge Function returned a non-2xx status code"

**O que foi investigado:**
- Confirmado via `supabase functions list --project-ref fumabywngmjfzsobmbjr` que `parse-statement` está `ACTIVE` e implantada; `supabase secrets list` confirmou que `GEMINI_API_KEY` está configurada (não removida/expirada).
- Testado o endpoint diretamente com `curl` usando a `anon key` (`VITE_SUPABASE_ANON_KEY`, chave pública, segura para usar em teste) como Bearer: o gateway aceitou o JWT normalmente e a função respondeu `401 Não autenticado` (nosso próprio código, não um erro de gateway/CORS) — descarta rotação de chaves de assinatura JWT do projeto como causa.
- **Causa raiz identificada:** a mensagem "Edge Function returned a non-2xx status code" **não é o erro real** — é o texto genérico que `@supabase/supabase-js` (`FunctionsHttpError`) usa para `error.message` sempre que a função retorna qualquer status não-2xx. O corpo de resposta de verdade (onde `parse-statement` coloca a mensagem útil, ex.: `"GEMINI_API_KEY não configurada"`, `"Gemini API error (404): ..."`, `"Resposta vazia do Gemini"`) só existe em `error.context` (um `Response` cru) e nunca era lido pelo frontend — por isso qualquer falha real na função (Gemini fora do ar, modelo aposentado, JSON inválido, profile/role) sempre aparecia disfarçada atrás da mesma frase genérica, não importa a causa nem o formato do arquivo.

**O que foi corrigido:**
- **`src/services/supabase.ts`**: novo helper `getFunctionErrorMessage(error)` — se o erro for `FunctionsHttpError`, lê `error.context.clone().text()` para extrair o corpo real da resposta; senão cai para `error.message`.
- **`src/pages/ImportacaoExtrato.tsx`** (`onFileSelected` e `sendMessage`) e **`src/pages/Usuarios.tsx`** (`submitInvite`): as 3 chamadas a `supabase.functions.invoke(...)` do projeto agora usam `await getFunctionErrorMessage(error)` em vez de `error.message` — os toasts passam a mostrar a causa real (status HTTP + texto) em vez do genérico.
- **`supabase/functions/parse-statement/index.ts`**: `console.error` em cada ponto de falha (falha de rede ao chamar o Gemini, status não-2xx do Gemini — logando status e corpo —, resposta sem texto — logando `finishReason`, útil quando a IA para por `SAFETY`/`MAX_TOKENS` —, JSON inválido do Gemini, falha ao buscar `profile`, erro não tratado no catch geral) e `console.log` no início de cada requisição (`mode`, `caller`, `filename`) para aparecer no Log Explorer do Supabase; mensagens de erro para o Gemini agora incluem qual modelo (`GEMINI_MODEL`) foi usado, para facilitar detectar se `gemini-flash-latest` voltar a apontar para um modelo indisponível (mesmo problema já documentado na Fase 3).
- Deploy publicado via `supabase functions deploy parse-statement --project-ref fumabywngmjfzsobmbjr`.

**Decisões técnicas:**
- Não foi possível reproduzir a chamada real de extração/Gemini nesta sessão (exige um usuário Admin/Tesoureiro autenticado de verdade, sem credenciais disponíveis) nem ler os logs de execução passados (a versão instalada do Supabase CLI, `2.109.1`, não tem subcomando `functions logs`; acesso só pelo Log Explorer do dashboard). Por isso a causa raiz *específica* de por que o Gemini/gateway está retornando não-2xx nas tentativas do usuário não pôde ser confirmada diretamente — a correção prioritária foi eliminar o mascaramento do erro, que é a causa raiz do sintoma relatado ("não dá pra saber por que falhou") e pré-requisito para diagnosticar qualquer causa de fundo.
- **Próximo passo recomendado:** o usuário deve tentar importar um extrato novamente — o toast agora vai mostrar a mensagem real (ex. `"Gemini API error (404)..."`, `"GEMINI_API_KEY não configurada"`, `"Apenas Admin/Tesoureiro podem importar extratos"`, etc.), o que aponta diretamente a causa. Alternativamente, consultar Log Explorer em `https://supabase.com/dashboard/project/fumabywngmjfzsobmbjr/functions` (função `parse-statement`) para ver os novos logs estruturados.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end real não executado nesta sessão (sem credenciais de usuário Admin/Tesoureiro).

### [2026-07-24] Aviso de lançamentos não salvos ao sair da tela de Importação

**O que foi feito:**
- **`src/context/AppContext.tsx`**: novo mecanismo genérico de "guarda de navegação" —
  - `registerUnsavedGuard(guard | null)`: uma página registra `{ hasUnsaved(): boolean, onSave(): Promise<boolean> }` (guardado em `useRef`, não dispara re-render).
  - `guardedNavigate(proceed)`: chamado no lugar de `navigate(...)` direto; se `hasUnsaved()` for `true`, guarda o `proceed` pendente e abre o aviso (`pendingUnsavedPrompt`); senão executa `proceed()` na hora.
  - `resolveUnsavedPrompt("cancel" | "discard" | "save")`: trata os 3 botões do aviso — cancelar fecha sem navegar; descartar chama `proceed()` direto; salvar chama `guard.onSave()` e só navega (`proceed()`) se a Promise resolver `true`.
- **`src/components/UnsavedChangesPrompt.tsx`** (novo): modal com os 3 botões ("Continuar editando" / "Sair sem salvar" / "Salvar e sair"), renderizado em **`src/components/Layout.tsx`** (sempre montado nas rotas protegidas, ao lado do `Toast`).
- **`src/components/Sidebar.tsx`**: cada item do menu (`NavLink`) e o logout agora passam por `guardedNavigate(...)` em vez de navegar direto — clicar num item para uma rota diferente da atual intercepta a navegação (`preventDefault` + `guardedNavigate`); clicar no item da rota atual navega normalmente (sem checagem, já que não é uma saída de verdade).
- **`src/pages/ImportacaoExtrato.tsx`**:
  - `doSave` passou a devolver `Promise<boolean>` (sucesso/falha), reaproveitado tanto pelo botão "Confirmar e Salvar" quanto pelo novo fluxo de saída.
  - Nova `trySaveForUnsavedGuard`: mesma checagem de duplicata do botão normal — se achar duplicata, abre o aviso de duplicata (já existente) em vez de salvar direto, e devolve `false` (a pessoa resolve a duplicata e tenta sair de novo depois).
  - `hasUnsavedImport = hasUploaded && stagedTransactions.length > 0 && !showSuccessModal` registrado via `registerUnsavedGuard` em um `useEffect` **sem array de dependências** (roda a cada render de propósito, para o guard nunca ficar com uma versão antiga de `stagedTransactions`/`profile` depois de um ajuste via chat de IA).
  - Novo `useEffect` com `window.addEventListener("beforeunload", ...)` — mesma checagem, mas para fechar/recarregar a aba do navegador (não interceptável pelo React Router; usa a confirmação nativa do navegador).

**Decisões técnicas:**
- Projeto usa `<BrowserRouter>` (não um data router via `createRouterProvider`), então o `useBlocker`/`unstable_useBlocker` do React Router v6 **não está disponível** (exige data router) — por isso a solução foi um mecanismo próprio via Context, interceptando cliques de navegação manualmente em vez de um blocker nativo do router.
- O guard é genérico (`registerUnsavedGuard`) para poder ser reaproveitado por outras páginas no futuro, mas hoje só `ImportacaoExtrato.tsx` o usa.
- **Escopo:** cobre navegação pelo menu lateral (todas as "abas"/rotas), logout e fechar/recarregar a aba do navegador. **Não cobre** o botão Voltar/Avançar do navegador (`popstate`) — interceptar isso de forma confiável sem um data router exigiria manipular o histórico do navegador diretamente, adicionando fragilidade desproporcional ao pedido original ("mudar de aba").
- `AppContext` fica **fora** do `<BrowserRouter>` em `App.tsx` — por isso não pode chamar `useNavigate()` diretamente; a navegação de fato (`navigate(...)`) é sempre passada de fora como a função `proceed`, vinda de um componente que já está dentro do Router (`Sidebar.tsx`).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end real (upload → tentar trocar de aba → ver o aviso → cada um dos 3 botões) **não foi executado nesta sessão** por não haver credenciais de um usuário Admin/Tesoureiro disponíveis — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-24] Investigação: "Saldo de Abertura" não zerava após excluir importação

**O que foi relatado:** ao excluir um extrato importado, Entradas/Saídas do mês voltavam a R$ 0,00, mas o "Saldo de Abertura" (e o Saldo Final) continuavam em R$ 124,32.

**O que foi investigado:** `LivroCaixa.tsx` não tem nenhuma tabela/coluna separada de "saldo inicial" — `computeLedger()` calcula `opening` 100% em runtime, somando `transactions` (vindo do `AppContext`) com data anterior ao mês exibido. Consultei a produção direto via `supabase db query --linked --file` (somente leitura):
- `import_history` estava com **0 linhas** — a exclusão do extrato removeu o registro e a cascata `ON DELETE CASCADE` (migration 0005) removeu corretamente **todos** os lançamentos vinculados a ele.
- Restavam **5 lançamentos** em `transactions`, todos com `import_id = null`, datados de 26–30/06/2026, somando exatamente R$ 124,32 (débitos e Pix reais). Esses são os "7 lançamentos reais do usuário" mencionados nas entradas antigas do log (Fase 2/Fase 3), hoje reduzidos a 5 após a limpeza de duplicata daquela época — importados **antes** de existir a coluna `import_id` (migration 0005), portanto nunca vinculados a nenhum registro de importação.

**Conclusão:** não havia bug no fluxo de exclusão/cascata — ele removeu exatamente o que estava vinculado ao extrato apagado. O "Saldo de Abertura" preso era matematicamente correto: refletia 5 lançamentos reais e distintos que **nunca fizeram parte do extrato excluído** e que, por serem anteriores à migration 0005, não têm `import_id` para nenhuma cascata alcançar (limitação já documentada explicitamente na própria migration 0005).

**Ação tomada (confirmada explicitamente pelo usuário antes de executar):** os 5 lançamentos órfãos foram removidos direto do banco de produção via `DELETE ... WHERE id IN (...)` (mesma tabela/trigger que a exclusão pela UI usa — `on_transaction_delete` disparou normalmente e gravou os 5 logs de `estorno` na auditoria; `user_id` ficou nulo e `role` como fallback `'Sistema'`, já que a conexão foi direta ao Postgres via CLI, sem contexto de sessão HTTP/JWT de um usuário logado). Verificado depois: `transactions` com 0 linhas, 5 novos registros de auditoria `estorno` criados.

**Decisões técnicas:**
- Nenhuma alteração de código foi necessária — o comportamento de `computeLedger`/cascata está correto. Registrando aqui para não reabrir essa investigação à toa numa sessão futura caso o mesmo tipo de dúvida apareça de novo com outro conjunto de dados.
- **Nota para o futuro:** qualquer lançamento criado manualmente (botão "Novo Lançamento" no Livro Caixa) também tem `import_id = null` por definição — isso é esperado e correto (não pertence a nenhum lote de importação), mas significa que "excluir um registro de importação" nunca vai remover lançamentos manuais nem, como visto aqui, lançamentos de antes da migration 0005. Se isso confundir usuários no futuro, a solução de produto seria a tela de Livro Caixa deixar mais explícito quais lançamentos têm origem manual vs. importada (hoje não há essa distinção visual).

### [2026-07-24] Refatoração de Gestão de Usuários e RBAC (front-end + back-end)

**O que foi feito:**
- **`supabase/migrations/0006_rbac_status_hardening.sql`** (nova, aplicada via `supabase db query --linked --file` direto na produção):
  - `has_role(roles)` passou a exigir também `status <> 'Inativo'` (antes só checava `role`). Como toda policy de escrita (`transactions`/`import_history` insert/update/delete) e `is_admin()` já usam `has_role()`, essa única mudança bloqueou usuários Inativos em todas elas de uma vez.
  - Nova função `is_active()` — para as policies de `select` (e o `insert` de `audit_logs`) que antes só checavam `auth.role() = 'authenticated'` (ou seja, **não** verificavam status nenhum, só se o token era válido). Recriadas como `profiles_select_active`, `transactions_select_active`, `audit_logs_select_active`, `audit_logs_insert_active`, `import_history_select_active`.
  - `alter publication supabase_realtime add table public.profiles` (idempotente, com checagem em `pg_publication_tables`) — habilita o Realtime na tabela `profiles` para o frontend detectar em tempo real quando o próprio usuário for desativado.
- **`src/context/AuthContext.tsx`**:
  - `signIn()`: após autenticar com sucesso no Supabase Auth, busca o `profile`; se vier vazio (agora impossível de vir para um usuário Inativo, já que a policy `profiles_select_active` esconde a linha), faz `signOut()` na hora e devolve `{ error: "INACTIVE" }` em vez de deixar entrar.
  - Novo `refreshProfile()` — refaz o fetch do profile da sessão atual sob demanda (usado quando o próprio Admin logado altera a sua própria role/status em `Usuarios.tsx`, para o Sidebar/ProtectedRoute pararem de usar um `profile.role` desatualizado sem precisar de novo login).
  - Novo `useEffect` com `supabase.channel(...).on("postgres_changes", { event: "UPDATE", table: "profiles", filter: "id=eq.<uid>" }, ...)`: se o próprio registro em `profiles` for atualizado com `status = "Inativo"` (por um Admin em outra sessão/navegador), marca um flag no `localStorage` e chama `signOut()` imediatamente — desloga a sessão ativa sem esperar a próxima renovação de token.
  - Exporta `consumeInactiveLogoutFlag()` (lê e limpa o flag do `localStorage`) para o `Login.tsx` mostrar a mesma mensagem de conta inativa depois desse logout forçado.
- **`src/pages/Login.tsx`**: se `signIn` devolver `"INACTIVE"`, mostra *"Sua conta está inativa. Entre em contato com o administrador para mais informações."* em vez do genérico "e-mail ou senha incorretos"; também mostra essa mensagem se chegar à tela via o logout forçado do Realtime (checando `consumeInactiveLogoutFlag()` num `useEffect` de montagem).
- **`src/pages/Usuarios.tsx`**: removido o botão "roleta" (`Shuffle`/`cycleUserRole`, que ciclava a role sequencialmente sem confirmação). No lugar:
  - A própria célula/Badge de role na tabela agora é clicável e abre um modal de seleção (lista das 4 roles, com a atual marcada).
  - Escolher uma role diferente da atual: se for **promoção para Admin** ou **rebaixamento de um Admin** (a si mesmo ou outro), o modal avança para um passo de confirmação com o aviso exato pedido para cada caso (`ShieldAlert` + texto), antes de chamar a RPC; qualquer outra troca é aplicada direto.
  - Depois de uma troca bem-sucedida em que `user.id === profile.id` (o próprio Admin logado alterando a si mesmo), chama `refreshProfile()` do `AuthContext`.

**Decisões técnicas:**
- **Nenhuma alteração foi necessária em `admin_update_user_role`/`admin_set_user_status`/ProtectedRoute/App.tsx/Sidebar.tsx** para as regras de RBAC do pedido — investiguei e confirmei que já estavam corretas desde a Fase 0/1: `admin_update_user_role` e `admin_set_user_status` já são `SECURITY DEFINER` com `if not is_admin() then raise exception` (só Admin altera roles/status, validado no banco, não só na UI); `/usuarios` já era a única rota restrita a `allowedRoles={["Admin"]}` em `App.tsx` (Tesoureiro/Auditor/Conselho Fiscal já tinham acesso a tudo mais). O trabalho de back-end desta sessão foi fechar a lacuna real que faltava: **status Inativo não bloqueava nada nas policies de RLS**, só a role importava.
- **Não usei banimento via Admin API (`auth.admin.updateUserById({ ban_duration })`)** para o bloqueio de usuário inativo, mesmo cogitando inicialmente — banir um usuário faz o próprio `signInWithPassword` falhar direto no GoTrue com um erro genérico (por segurança, o Supabase não diferencia "banido" de "senha errada" nessa resposta), o que **impediria** de mostrar a mensagem específica pedida ("Sua conta está inativa...") no login, já que o código nunca chegaria a rodar a checagem pós-login. Por isso o bloqueio de login é feito inteiramente no nosso código (checagem de profile pós-`signInWithPassword`), e o "desconectar sessão ativa" via Realtime (não via ban/revogação de token no GoTrue) — mais previsível e sob nosso controle total.
- **`auth.admin.signOut(jwt, scope)`** (o único método de sign-out da Admin API exposto pelo `supabase-js`) exige o **token** da sessão a encerrar, não o `user_id` — por isso não dava para forçar logout de um usuário a partir só do id dele via essa API; o Realtime resolve isso de forma mais direta (a própria aba do usuário se desloga sozinha ao ver a mudança).
- `is_active()` e o `has_role()` atualizado usam `status <> 'Inativo'` (não `status = 'Ativo'`) de propósito — assim, um usuário com `Convite Pendente` (primeiro login, antes do `touch_last_access` virar o status para `Ativo`) continua conseguindo se autenticar e carregar o próprio profile normalmente; só `Inativo` é bloqueado.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros); migration 0006 aplicada e conferida em produção (`pg_policies` mostrando as novas policies `_active`, `pg_publication_tables` confirmando `profiles` na publicação `supabase_realtime`). **Teste end-to-end real (login com usuário inativo, desativar um usuário logado em outra aba, promover/rebaixar Admin pela UI) não foi executado nesta sessão** por não haver credenciais de um segundo usuário de teste disponíveis — recomenda-se validar manualmente os 3 fluxos antes de considerar encerrado.

### [2026-07-25] Cadastro de usuário com senha própria + redefinição de senha via link com token

**O que foi feito:**
- **`supabase/functions/invite-user/index.ts`**: trocado `admin.inviteUserByEmail` por `admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } })` — o Admin agora define a senha do novo usuário diretamente na criação (`password` passou a ser campo obrigatório, validado no back-end com `>= 6` caracteres), em vez de depender do e-mail de convite (que já tinha o histórico de falhar com `otp_expired`, documentado na Fase 0). Log de auditoria atualizado de "Convite enviado" para "Usuário criado".
- **`supabase/functions/generate-reset-link/index.ts`** (nova Edge Function): recebe `{email, redirectTo}`, confere que quem chama é Admin, e usa `admin.generateLink({ type: "recovery", email, options: { redirectTo } })` (Admin API, precisa de service-role key) para gerar um link de redefinição de senha real do Supabase Auth — devolve `{ actionLink }` para o frontend. Grava log de auditoria "Link de redefinição de senha gerado para X".
- **`src/pages/Usuarios.tsx`**:
  - Modal de cadastro: removido o checkbox "Enviar e-mail de ativação" (não fazia mais sentido com `createUser`, que não envia e-mail nenhum sozinho); adicionados campos **Senha**/**Confirmar Senha**, validados no cliente (preenchidos, `>= 6` caracteres, iguais) antes de chamar a function.
  - Botão "Resetar Senha" (`KeyRound`) agora chama `generate-reset-link` (em vez de `supabase.auth.resetPasswordForEmail`, que nunca expõe o link/token gerado — só consegue *enviar* por e-mail, nunca devolver para o chamador) e tenta copiar o `actionLink` para a área de transferência via `navigator.clipboard.writeText`; se falhar (permissão/navegador), abre um modal de fallback com o link em um campo somente-leitura + botão "Copiar".
- **`src/pages/ResetPassword.tsx`** (nova página pública, rota `/reset-password` em `App.tsx`, fora do `ProtectedRoute`): ao carregar, aguarda o `supabase-js` processar o token da URL (evento `PASSWORD_RECOVERY` do `onAuthStateChange` **ou** uma sessão já presente via `getSession()`) — se nenhuma sessão aparecer, mostra "Link inválido ou expirado" (com a descrição do erro vinda de `#error_description=...` na URL, quando presente) em vez do formulário. Se a sessão de recovery for válida, busca `profiles.name/email` da própria sessão e mostra em modo leitura, com os campos **Nova Senha**/**Confirmar Nova Senha**; ao submeter, chama `supabase.auth.updateUser({ password })`, desloga a sessão temporária de recovery e redireciona para `/login` com mensagem de sucesso.
- **`src/context/AuthContext.tsx`**: o listener `onAuthStateChange` já existente ganhou uma rede de segurança — se o evento for `PASSWORD_RECOVERY` e a pessoa não estiver em `/reset-password` (porque o `redirectTo` não bateu com a allow-list de Redirect URLs do projeto e o Supabase caiu de volta pra Site URL), força `window.location.assign("/reset-password")`.

**Decisões técnicas:**
- **Não foi criado nenhum sistema próprio de tokens/tabela de reset** — o pedido descrevia um fluxo "com token", mas o Supabase Auth já resolve isso nativamente e de forma mais segura (`admin.generateLink`/`updateUser`, tokens de uso único com expiração, tudo já auditado/testado pelo próprio Supabase). Reimplementar isso à mão (tabela própria, hash, expiração manual) seria reinventar uma roda mais frágil e menos segura que a nativa — por isso a "tela de redefinição com token" foi construída sobre o fluxo real de recovery do Supabase (`type: "recovery"` do `generateLink`, que o `supabase-js` já sabe processar da URL sozinho), não sobre um token customizado.
- **`admin.signOut(jwt, scope)`** e bloqueio de e-mail não entraram nessa conta — `generateLink` é puramente Admin API (service-role), não manda e-mail nenhum sozinho (diferente de `inviteUserByEmail`/`resetPasswordForEmail`); é o Admin que decide copiar/enviar o link manualmente (por WhatsApp, etc.), o que é uma escolha deliberada dado o histórico de entrega de e-mail falhando (`otp_expired`) documentado nesta mesma sessão de trabalho anterior.
- **Ação necessária no Dashboard do Supabase (fora do alcance desta sessão, sem acesso à UI/API de configuração de Auth):** conferir em *Authentication → URL Configuration → Redirect URLs* se `<domínio-de-produção>/reset-password` (e `http://localhost:5173/reset-password` para dev local) estão na allow-list. Se não estiverem, o Supabase ainda funciona (a rede de segurança no `AuthContext` redireciona para `/reset-password` de qualquer página), mas o ideal é a pessoa já cair direto na tela certa.
- Removida a opção "Conselho Fiscal" do seletor de Perfil de Acesso no cadastro **não foi alterada** (já não existia antes desta sessão — só Admin/Tesoureiro/Auditor são oferecidos no convite; fora do escopo pedido, não mexi nisso).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros); as duas Edge Functions (`invite-user` atualizada, `generate-reset-link` nova) foram deployadas em produção e testadas com `curl` (sem token válido) confirmando que ambas exigem autenticação de Admin corretamente. **Teste end-to-end real (cadastrar usuário com senha, gerar link, abrir o link e redefinir a senha) não foi executado nesta sessão** por não haver credenciais de um usuário Admin disponíveis — recomenda-se validar manualmente os 3 fluxos (cadastro, geração de link, `/reset-password`) antes de considerar encerrado.

### [2026-07-25] Correção: link de redefinição de senha caía no Dashboard em vez de `/reset-password`

**Causa raiz encontrada:** o `AuthContext.tsx` anterior dependia só do evento assíncrono `PASSWORD_RECOVERY` do `onAuthStateChange` (com um `window.location.assign("/reset-password")` como reação) para desviar a sessão de recovery. Investigando o código-fonte do `@supabase/auth-js` (`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`) instalado (`2.110.8`), encontrei uma corrida real: `supabase.auth.getSession()` (chamado no primeiro `useEffect` do `AuthContext`) e o disparo do evento `PASSWORD_RECOVERY` **dependem da mesma Promise interna de inicialização do client**, mas:
- `getSession()` só espera essa Promise interna (`this.initializePromise`) resolver — e essa promise resolve **antes** de qualquer notificação de evento ser de fato entregue (o `_initialize()` da lib agenda a notificação via `setTimeout(fn, 0)`, sem esperar por ela, e retorna na hora).
- Como o `getSession().then(...)` do nosso código estava "na fila" logo atrás da própria inicialização interna da lib, ele resolvia (`setSession`/`setProfile`/`setLoading(false)` com uma sessão **perfeitamente válida**, indistinguível de um login normal) **antes** do evento `PASSWORD_RECOVERY` chegar ao nosso listener.
- Resultado: por uma fração de segundo (o suficiente para o React renderizar), o `ProtectedRoute` via `session`/`profile` prontos e mandava para `/dashboard` — e só depois (tarde demais) o evento `PASSWORD_RECOVERY` chegava e disparava o `window.location.assign`, gerando o efeito relatado ("autentica, mas cai no Dashboard").

**Correção aplicada:**
- **`src/context/AuthContext.tsx`**: nova função `detectPasswordRecoveryFromUrl()` — lê `type=recovery` direto do hash (`#...`) ou da query string da URL atual, **de forma síncrona**, sem depender de nenhuma Promise/evento do Supabase. Novo estado `isPasswordRecovery`, inicializado com essa checagem via lazy initializer do `useState` (`useState(() => detectPasswordRecoveryFromUrl())`) — já correto desde o **primeiro render**, eliminando a corrida por completo. O evento `PASSWORD_RECOVERY` do `onAuthStateChange` continua sendo escutado como confirmação redundante (`setIsPasswordRecovery(true)`), e `SIGNED_OUT` limpa a flag (momento em que `ResetPassword.tsx` desloga a sessão de recovery após trocar a senha com sucesso). Removido o `window.location.assign` (hard reload) que existia antes.
- **`src/components/ProtectedRoute.tsx`**: agora checa `isPasswordRecovery` **antes** até da checagem de `loading` — se verdadeiro, sempre `<Navigate to="/reset-password" replace />`, não importa se `session`/`profile` já parecem válidos. Como a flag está correta desde o primeiro render, não existe mais nenhuma janela em que uma sessão de recovery "passa" pelo guard achando que é um login normal.
- **`src/pages/Usuarios.tsx`**: mantido `redirectTo: \`${window.location.origin}/reset-password\`` ao chamar `generate-reset-link` — sem mudanças aqui, pois a correção acima já torna o fluxo robusto **independente** de onde o link efetivamente aterrissa (mesmo que o Supabase caia de volta pra Site URL por causa da allow-list de Redirect URLs, o token continua chegando com `type=recovery` na URL, então o `ProtectedRoute` intercepta em qualquer rota protegida).

**Decisões técnicas:**
- Não bastava só "ouvir melhor" o evento — o problema era estrutural (Promise de inicialização compartilhada com ordem de resolução desfavorável ao nosso código), por isso a correção teve que evitar depender de qualquer evento assíncrono como fonte da verdade inicial, e usar a própria URL (síncrona, disponível instantaneamente) como sinal primário.
- **Ainda vale conferir no Dashboard do Supabase** (*Authentication → URL Configuration → Redirect URLs*) se `<domínio-de-produção>/reset-password` está na allow-list — não é mais crítico para o bug corrigido aqui (o `ProtectedRoute` cobre o caso de a Site URL ser usada como fallback), mas evita um hop de redirect extra e deixa a experiência mais direta.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). **Teste end-to-end real (clicar num link de redefinição de verdade) não foi executado nesta sessão** por não haver um link/token real disponível para testar — a análise foi feita lendo o código-fonte da lib `@supabase/auth-js` instalada para confirmar a ordem exata de resolução das Promises envolvidas; recomenda-se validar manualmente gerando um link pela tela de Usuários e abrindo-o.

### [2026-07-25] Auditoria de responsividade (Mobile-First)

**O que foi feito:**
- **`src/context/AppContext.tsx`**: novo estado `mobileNavOpen` + `openMobileNav`/`closeMobileNav`/`toggleMobileNav` — independente do `sidebarCollapsed` (colapso ícone-só, só faz sentido no desktop).
- **`src/components/Sidebar.tsx`**: convertida de coluna fixa sempre visível para **drawer/off-canvas em `<md`**: `fixed inset-y-0 left-0 z-50 w-[248px]` com `-translate-x-full`/`translate-x-0` conforme `mobileNavOpen`, e `md:static md:translate-x-0` a partir de `md:` (768px) — aí volta a ser a coluna estática/colapsável de sempre. Backdrop (`bg-black/50`) atrás do drawer, clique fora fecha. Botão de colapsar ("Recolher") e o rótulo "Menu" agora só existem/aparecem no desktop (`hidden md:flex` / `md:hidden`); um botão **X** de fechar foi adicionado ao cabeçalho do drawer, visível só em mobile. Clicar em qualquer item do menu ou fazer logout fecha o drawer automaticamente (`closeMobileNav()` já integrado ao `guardedNavigate` existente).
- **`src/components/Layout.tsx`**: novo botão hambúrguer (`Menu` do lucide-react), visível só `md:hidden`, no topo do conteúdo principal, chamando `openMobileNav()`. Padding do `<main>` ajustado para mobile-first: `px-4 py-6 sm:px-6 md:px-10 md:py-8` (era `px-6 py-8 sm:px-10`, ou seja, o mobile já usava o valor "maior").
- **`src/pages/Dashboard.tsx`**: grid fixo `"2fr 1fr"` (gráfico Entradas/Saídas + donut) virou `grid grid-cols-1 lg:grid-cols-[2fr_1fr]` — empilha em telas `<lg` (1024px; usei `lg` em vez de `md` porque dois gráficos lado a lado ficam ilegíveis já em tablets). Linha de período/apresentação ganhou `flex-wrap` (pílulas de período + botão de apresentação não cabiam juntos em 320–375px).
- **`src/pages/LivroCaixa.tsx`**: linha de botões de exportar/novo lançamento ganhou `flex-wrap`; formulário de lançamento (Data/Valor, Tipo/Categoria) virou `flex-col sm:flex-row`; modal de relatório (PDF/Word) — sua tabela interna (que não tinha nenhum wrapper de scroll) ganhou `overflow-x-auto` + `min-w-[520px]`, e o grid de assinaturas virou `grid-cols-1 sm:grid-cols-2`.
- **`src/pages/ImportacaoExtrato.tsx`**: o grid de duas colunas com **altura fixa** (`h-[560px]`, `gridTemplateColumns: "1fr 1fr"`) — que sobrepunha os painéis de pré-visualização e chat de IA lado a lado em qualquer largura — virou `grid-cols-1 lg:grid-cols-2 lg:h-[560px]`, com cada painel ganhando sua própria altura em mobile (`h-[480px]`/`h-[420px]`, `lg:h-auto`) para empilhar verticalmente com scroll interno próprio. Formulário de edição do histórico (Mês/Qtd.) também virou `flex-col sm:flex-row`.
- **`src/pages/Usuarios.tsx`**: formulário de cadastro (Senha/Confirmar Senha) virou `flex-col sm:flex-row`.
- **`src/pages/Auditoria.tsx`**: barra de navegação de mês + exportar ganhou `flex-wrap` (não cabia em 320–375px).
- **`src/pages/Login.tsx` / `src/pages/ResetPassword.tsx`**: painel direito tinha `min-w-[360px]` **sem** breakpoint — em telas menores que 360px (existem phones reais nessa faixa) isso forçava overflow horizontal da página inteira, mesmo com o painel esquerdo já escondido. Virou `min-w-0 md:min-w-[360px]`. Paddings internos (`px-8`/`px-10`) reduzidos para `px-5 sm:px-8`/`px-5 sm:px-10`.
- **Modais em geral** (`Usuarios.tsx`, `LivroCaixa.tsx`, `ImportacaoExtrato.tsx`, `UnsavedChangesPrompt.tsx`): já seguiam o padrão `w-full max-w-[Npx]` (responsivo por natureza), mas o padding fixo (`p-6` no overlay, `p-8`/`p-9` no container) foi trocado por `p-4 sm:p-6` / `p-5 sm:p-8` / `p-5 sm:p-9` — em telas pequenas isso libera bem mais espaço útil de conteúdo.
- **Tabelas**: já seguiam o padrão `overflow-x-auto`/`overflow-auto` + `min-w-[Npx]` no `<table>` em todas as páginas (Livro Caixa, Importação, Usuários, Auditoria) — nenhuma mudança necessária aí, já satisfazia o pedido de "rolagem horizontal em vez de quebrar o layout". **Não foi implementado o formato alternativo de "cards empilhados" por linha** (explicitamente opcional no pedido) — ficaria como uma segunda variante de UI por tabela, desproporcional ao escopo desta auditoria.
- **`index.html`**: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` já estava presente e correta — nenhuma mudança necessária.

**Decisões técnicas:**
- O drawer mobile é **sempre "expandido"** (mostra ícone+texto) por padrão, porque um celular real carrega a página do zero (`sidebarCollapsed` começa `false`). A única forma de o drawer aparecer em modo ícone-só é um usuário de desktop colapsar o menu e depois encolher a janela do navegador para uma largura de mobile (sem trocar de dispositivo) — um caso de borda aceito conscientemente em vez de adicionar detecção de viewport via JS (`matchMedia`) só para esse cenário raro.
- Escolhi `lg:` (1024px) em vez de `md:` (768px) para os dois grids de 2 colunas com conteúdo mais denso (gráficos do Dashboard, painéis de Importação) — em tablets (768–1023px) duas colunas lado a lado ficariam apertadas demais para gráficos/tabelas; `md:` continua sendo o breakpoint do menu lateral (esse sim cabe bem a partir de 768px).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) e, para checagem visual real, subi o dev server (`npm run dev`) e usei o CLI do Playwright (`npx playwright screenshot --viewport-size=...`, baixando o browser Chromium correspondente à versão instalada) contra a tela pública `/login` em 320px, 375px e 768px — confirmado visualmente sem overflow horizontal e o painel ilustrado escondendo/aparecendo corretamente no breakpoint `md`. **As páginas autenticadas (Dashboard, Livro Caixa, Importação, Usuários, Auditoria, o drawer do Sidebar) não puderam ser testadas visualmente nesta sessão** por não haver credenciais de um usuário de teste disponíveis — a lógica foi validada por leitura cuidadosa do código e confirmação de que as classes Tailwind dinâmicas (`lg:grid-cols-[2fr_1fr]`, `-translate-x-full`, etc.) foram de fato geradas no CSS de produção (`grep` no bundle buildado). Recomenda-se validar manualmente essas telas em um dispositivo/emulador antes de considerar encerrado.

### [2026-07-25] Auditoria de Segurança completa (Frontend, Segredos, Dependências, Auth/Rotas) + correções aplicadas

**O que foi auditado (leitura/verificação, sem alteração):**
- **XSS/Frontend:** nenhuma ocorrência de `dangerouslySetInnerHTML`, `eval`, `new Function` ou `document.write` em `src/`. Nenhum `target="_blank"` no código (logo, sem risco de `rel="noopener noreferrer"` faltando). `localStorage` só é usado para uma flag booleana de UX (`logout_reason_inactive`, `AuthContext.tsx`) — nenhum token/segredo é gravado manualmente (o `supabase-js` já gerencia a sessão internamente).
- **Segredos:** `.env`/`.env.local` corretamente listados em `.gitignore`; confirmado via `git log --all -- .env` que o arquivo **nunca** foi commitado em nenhum branch. Nenhuma chave literal (`sb_secret_...`, JWT, `AIza...`) encontrada em código-fonte — as Edge Functions só leem segredos via `Deno.env.get(...)`. As duas entradas de `.claude/settings.json` que casaram com o padrão de busca são comandos do allowlist já mascarados (`supabase secrets set X=*`), consistente com a correção do incidente já documentado acima (24/07) — nenhum valor literal exposto atualmente.
- **Dependências (`npm audit`):** 9 avisos — `react-router-dom@6.30.4`/`react-router` (**moderado**, CVE de open-redirect que pode levar a XSS via `<Link>`/`useNavigate`, GHSA-jjmj-jmhj-qwj2; sem fix não-major disponível hoje — 6.30.4 já é a última release da série 6.x); `eslint`/`minimatch`/`brace-expansion` (**alto**, mas só `devDependencies`, não vão para o bundle de produção); `esbuild`/`vite` (**moderado**, só afeta o dev server local). Nenhuma dependência de produção crítica.
- **Auth/Rotas:** confirmado que RBAC é reforçado no banco (RLS + RPCs `SECURITY DEFINER`), não só na UI — `ProtectedRoute.tsx` bloqueia por `session`/`profile`/`status === "Inativo"` antes de qualquer render, e as 3 Edge Functions (`invite-user`, `generate-reset-link`, `parse-statement`) já validavam `role === "Admin"`/`has_role(['Admin','Tesoureiro'])` no servidor antes de qualquer ação privilegiada.

**Correções aplicadas nesta sessão:**
- **Política de senha fraca (mínimo 6 → 8 caracteres):** `src/pages/Usuarios.tsx` (cadastro), `src/pages/ResetPassword.tsx` (redefinição) e `supabase/functions/invite-user/index.ts` (validação server-side) — 6 caracteres estava abaixo do mínimo recomendado pela OWASP.
- **CORS aberto (`Access-Control-Allow-Origin: "*"`) nas 3 Edge Functions:** criado `supabase/functions/_shared/cors.ts` com uma allow-list (`https://saas-contabilidade-igrejas.vercel.app` + `http://localhost:5173`) — `corsHeaders(req)` agora reflete a origem da requisição só se ela estiver na lista (com `Vary: Origin`), em vez de aceitar qualquer site. `parse-statement`, `invite-user` e `generate-reset-link` atualizadas para importar o helper.
- **`generate-reset-link` sem validação de `redirectTo`:** adicionada checagem contra a mesma allow-list antes de chamar `generateLink` (defesa em profundidade — o Supabase Auth já valida isso pela allow-list de Redirect URLs do projeto, mas o código agora não depende só dessa configuração remota).

**Decisões técnicas:**
- **Não foi feito upgrade do `react-router-dom` para a v7** — é a única forma de eliminar de fato o CVE (não há patch não-major na série 6.x), mas é uma migração maior (mudanças de API/roteamento) que merece sua própria sessão de teste, não uma correção "de passagem" numa auditoria. Registrado aqui como pendência.
- **Dependências de dev (`eslint`, `esbuild`/`vite`) não foram atualizadas** — os avisos de severidade alta são todos em `devDependencies` (nunca chegam ao bundle de produção); corrigi-los exigiria `--force` com bump major do ESLint/Vite, risco desproporcional ao ganho de segurança real nesta sessão.
- As 3 Edge Functions foram **implantadas em produção** (`supabase functions deploy ...`, projeto `fumabywngmjfzsobmbjr`) imediatamente após a correção, já que as mudanças são hardening puro (allow-list já cobre o domínio de produção e o localhost de dev) e não alteram nenhum comportamento visível para usuários legítimos.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end real (cadastro/reset de senha com o novo mínimo de 8 caracteres, chamada às Edge Functions a partir do domínio de produção) não foi executado nesta sessão por não haver credenciais de um usuário Admin disponíveis — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Correção: Enter não submetia o formulário de Login

**O que foi encontrado:** `src/pages/Login.tsx` não tinha nenhuma tag `<form>` — os campos de e-mail/senha estavam soltos em `<div>`/`<label>`, e o botão "Entrar na Plataforma" chamava `authenticate()` via `onClick`, sem `type="submit"`. Sem um elemento `<form>` com `onSubmit`, o navegador não tem para onde disparar o evento de submissão ao pressionar Enter dentro de um `<input>` — por isso só o clique no botão funcionava.

**O que foi feito:**
- Envolvidos os campos (e-mail, senha, "lembrar"/"esqueceu a senha") e o botão de submit num único `<form onSubmit={authenticate}>`.
- `authenticate` passou a receber o evento (`FormEvent`) e chamar `e.preventDefault()` antes de qualquer validação, evitando o reload de página padrão do submit nativo.
- Botão principal trocado de `onClick={authenticate}` para `type="submit"` (sem `onClick`) — agora dispara tanto por clique quanto por Enter, através do `onSubmit` do form. O botão de mostrar/ocultar senha já era `type="button"`, então continua não disparando submit por engano.

**Decisões técnicas:**
- Não foi necessário nenhum `onKeyDown`/listener manual de tecla — usar a semântica nativa de `<form>`/`type="submit"` é a forma correta e mais robusta (funciona também com autofill do navegador, leitores de tela e Enter em qualquer campo do formulário, não só num input específico).
- Validado com `npx tsc --noEmit`, `npm run build` (sem erros) e um teste real em navegador (Playwright headless contra o dev server local): preenchendo e-mail/senha e pressionando Enter no campo de senha, o botão mudou para o estado "Autenticando…" sem nenhum clique no botão — confirmando que a submissão via teclado funciona igual à submissão via mouse.

### [2026-07-25] Reformulação completa do README.md (padrão enterprise) + correções de tooling

**O que foi feito:**
- **`README.md`** reescrito do zero, com base no estado real do repositório (não no protótipo original): título/tagline, badges (React, TypeScript, Vite, Tailwind, Supabase, Gemini, deploy Vercel, licença), índice navegável, tabela de funcionalidades por módulo, diagrama de arquitetura em Mermaid + tabela de stack por camada, mapa de pastas, pré-requisitos, passo a passo de instalação (clone → migrations → `.env` → secrets das Edge Functions → deploy), tabela de scripts (`dev`/`build`/`preview`/`lint`/`tsc --noEmit`), seção de deploy, seção de segurança/governança (refletindo a auditoria de segurança já documentada acima) e seção de contribuição/licença.
- **`LICENSE`** (novo, MIT) — não existia nenhum arquivo de licença no repositório apesar do README antigo já ter um badge "MIT"; confirmado com o usuário qual licença usar antes de criar o arquivo.
- **`eslint.config.js`** (novo) — o script `lint` do `package.json` já existia e todas as dependências do ESLint 9 (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`) já estavam instaladas, mas **não havia nenhum arquivo de configuração** (`eslint.config.js`) — `npm run lint` falhava direto com "ESLint couldn't find an eslint.config.(js|mjs|cjs) file". Corrigido com a configuração padrão do template Vite (react-ts) para não documentar no README um comando que na prática não funcionava. Rodado depois: 0 erros, 5 avisos pré-existentes (`react-refresh/only-export-components` em `AppContext.tsx`/`AuthContext.tsx`, `react-hooks/exhaustive-deps` em `Dashboard.tsx`) — não corrigidos, pois são avisos (não erros) fora do escopo desta tarefa.

**Decisões técnicas:**
- Removidas do README as referências a **Keycloak** (nunca foi de fato integrado — descartado ainda na Fase 1, ver decisão de 24/07 "Autenticação: Supabase Auth (não Keycloak)") e ao modelo fixo "Gemini 3.5 Flash" (o projeto usa o alias `gemini-flash-latest`, documentado como decisão deliberada para não quebrar quando o Google aposenta modelos).
- Export de relatório em PDF/Word descrito no README como "prévia de relatório" (modal), não como geração de arquivo real — só o CSV/Excel gera um arquivo de fato (`Blob`), consistente com o que o código faz hoje.
- Nenhum badge de CI foi incluído — não há pipeline de CI configurado (`.github/workflows` não existe); um badge de "build passing" seria enganoso.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) após todas as mudanças; `npm run lint` validado separadamente após criar o `eslint.config.js`.

### [2026-07-25] Correção: "Failed to send a request to the Edge Function" após configurar domínio próprio

**O que foi relatado:** ao tentar importar um extrato em `www.contabilidadereformada.com.br` (domínio próprio recém-comprado/configurado), a chamada à Edge Function `parse-statement` falhava com "Failed to send a request to the Edge Function".

**Causa raiz:** a allow-list de CORS criada na auditoria de segurança de 24/07 (`supabase/functions/_shared/cors.ts`) só continha o domínio antigo da Vercel (`saas-contabilidade-igrejas.vercel.app`) e `localhost`. Com o app agora servido em `www.contabilidadereformada.com.br`, o preflight `OPTIONS` respondia `Access-Control-Allow-Origin` com a URL antiga (fallback de origem não reconhecida) em vez da origem real da requisição — o navegador bloqueia a resposta por não bater com a origem, e o `supabase-js` reporta esse erro genérico de rede (não é um problema de `GEMINI_API_KEY`, que segue configurada normalmente nos Secrets).

**Correção:** adicionados `https://www.contabilidadereformada.com.br` e `https://contabilidadereformada.com.br` (com e sem `www`, por segurança) a `ALLOWED_ORIGINS` em `supabase/functions/_shared/cors.ts`. As 3 Edge Functions (`parse-statement`, `invite-user`, `generate-reset-link`) foram reimplantadas. Validado com `curl -X OPTIONS` simulando o preflight do navegador a partir da nova origem — resposta `200` com `Access-Control-Allow-Origin: https://www.contabilidadereformada.com.br` correto.

**Decisões técnicas:**
- Mantido o domínio antigo da Vercel na lista (não removido) — sem custo e evita quebrar acessos que ainda apontem para lá.
- **Pendência a verificar pelo usuário:** *Authentication → URL Configuration → Redirect URLs* no dashboard do Supabase deve incluir `https://www.contabilidadereformada.com.br/reset-password` (mesma observação já feita para o domínio da Vercel na Fase de redefinição de senha) — não foi possível confirmar/alterar isso nesta sessão por ser uma configuração do dashboard, fora do escopo de código.

### [2026-07-25] Correção: CORS travando em dev por porta variável do Vite

**O que foi relatado:** mesmo após o ajuste de CORS para o domínio próprio, a importação de extrato continuava falhando com "Failed to send a request to the Edge Function". Pedido ao usuário para abrir o DevTools e reproduzir — o console mostrou a causa exata: `Access to fetch at '.../parse-statement' from origin 'http://localhost:5174' has been blocked by CORS policy: ... 'Access-Control-Allow-Origin' header has a value 'https://www.contabilidadereformada.com.br' that is not equal to the supplied origin`.

**Causa raiz:** o teste estava rodando localmente, mas o Vite subiu na porta `5174` (não `5173`) — provavelmente porque a porta padrão já estava em uso por outro processo/sessão. A allow-list de CORS (`supabase/functions/_shared/cors.ts`) tinha `http://localhost:5173` fixo, então a porta 5174 caía no fallback (domínio de produção), causando o mismatch.

**Correção:** trocado o item fixo `"http://localhost:5173"` por uma checagem via regex (`/^https?:\/\/localhost:\d+$/`) que aceita **qualquer porta** de `localhost` — o Vite muda de porta sempre que a anterior está ocupada, então fixar uma única porta na allow-list é frágil e reabre esse mesmo problema a cada vez que isso acontecer. As 3 Edge Functions foram reimplantadas; validado com `curl -X OPTIONS` simulando `Origin: http://localhost:5174` — resposta `200` com o header correto.

**Decisão técnica:** aceitar qualquer porta de `localhost`/`127.0.0.1`... (na prática só `localhost`, já que é o host usado pelo Vite) não é um risco de segurança relevante — um site malicioso não consegue forjar `Origin: http://localhost:PORTA` de dentro do navegador de um usuário real (isso só aconteceria se o próprio computador do desenvolvedor já estivesse comprometido, cenário em que CORS já seria o menor dos problemas).

### [2026-07-25] MCP do Supabase conectado a esta sessão + restrição de acesso à Auditoria (Tesoureiro não vê mais)

**O que foi feito:**
- **Acesso via MCP:** o usuário conectou o servidor MCP oficial do Supabase (`claude mcp add --scope project --transport http supabase ...`, autorizado via `/mcp` no CLI de terminal) — a partir desta sessão, alterações no banco (schema, RLS, dados) passaram a ser feitas diretamente pelas ferramentas MCP (`mcp__supabase__*`) em vez de `supabase db query --linked --file` via Bash. `.mcp.json` (registro do servidor) e `skills-lock.json`/`.agents/skills` (skill de boas práticas de Postgres, instalada via `npx skills add`, sem relação com o MCP) ficaram como novos arquivos não rastreados na raiz do projeto.
- **`supabase/migrations` (nova migration aplicada em produção via MCP, `apply_migration`):** a policy `audit_logs_select_active` (lia `audit_logs` para qualquer usuário **ativo**, sem checar role) foi substituída por `audit_logs_select_admin_auditor_conselho`, usando `has_role(array['Admin','Auditor','Conselho Fiscal'])` — Tesoureiro deixou de poder ler a tabela mesmo via chamada direta à API/REST.
- **`src/components/Sidebar.tsx`:** o filtro de item de menu, que antes só tinha o caso especial `adminOnly` (usado só por "Governança e Usuários"), virou genérico (`allowedRoles: UserRole[]`). O item "Trilha de Auditoria (Logs)" ganhou `allowedRoles: ["Admin", "Auditor", "Conselho Fiscal"]` — some do menu para Tesoureiro.
- **`src/App.tsx`:** a rota `/auditoria` (antes sem nenhuma restrição de role, diferente do que a documentação anterior sugeria) passou a ficar dentro de um `<ProtectedRoute allowedRoles={["Admin", "Auditor", "Conselho Fiscal"]} />`, então acessar a URL direto também redireciona um Tesoureiro para fora.

**Decisões técnicas:**
- Igual ao padrão já estabelecido no projeto (RBAC reforçado no banco, não só na UI): esconder o item do menu sozinho não seria suficiente, já que a policy de `audit_logs` de leitura não filtrava por role nenhuma até esta correção — por isso a migration de RLS foi tratada como parte obrigatória do pedido, não como extra.
- `Conselho Fiscal` já existia como `UserRole` válida (`src/types/index.ts`), só não era oferecida no formulário de convite de usuário (decisão de sessão anterior, fora de escopo aqui) — usá-la nas novas restrições não exigiu nenhuma mudança de schema/tipo.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end (login como Tesoureiro confirmando que o menu some e `/auditoria` redireciona) não foi executado nesta sessão por falta de credenciais de um usuário Tesoureiro de teste — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Modal de "Configurações de Perfil" no menu footer da Sidebar

**O que foi feito:**
- **`supabase/migrations` (nova, aplicada via MCP `apply_migration`):** função `update_own_profile(new_name text, new_email text)` — `SECURITY DEFINER`, mesmo padrão de `admin_update_user_role`/`admin_set_user_status` — atualiza **apenas** `name`/`email` da própria linha (`auth.uid()`) em `profiles` (nunca `role`/`status`, que continuam exclusivos das RPCs de Admin); grava log `edicao_manual` em `audit_logs` (com `request_ip()`/`request_device()`) só quando algo de fato muda.
- **`src/components/ProfileSettingsModal.tsx`** (novo): modal com Nome/E-mail (editáveis, pré-preenchidos com `profile.name`/`profile.email`), campo "Senha Atual" mascarado e somente-leitura (a senha real nunca fica disponível para exibir — nem o Supabase a expõe), e "Nova Senha"/"Confirmar Nova Senha" opcionais (mínimo 8 caracteres, mesma regra já usada em `Usuarios.tsx`/`ResetPassword.tsx`). Salvar chama `supabase.auth.updateUser({ email, password })` (quando alterados) e a RPC `update_own_profile` (quando nome/e-mail mudam), depois `refreshProfile()` do `AuthContext` para refletir em toda a UI (Sidebar, badges, etc.) sem precisar de novo login. Rastreia alterações não salvas comparando os campos com os valores originais; fechar (X, clique fora, "Cancelar") com pendências abre uma confirmação — mesmo estilo visual do `UnsavedChangesPrompt.tsx` já existente (ícone de alerta, mesma paleta), mas com 2 botões ("Continuar Editando"/"Sair sem Salvar") em vez dos 3 do fluxo de importação. Toasts (`showToastMsg`, sistema padrão do projeto) em sucesso/erro.
- **`src/components/Sidebar.tsx`:** o botão "Configurações do Perfil" do menu footer (já existia visualmente, mas só fechava o dropdown) agora abre o modal; o modal é renderizado fora da `<aside>` (sibling, dentro do fragment) porque a própria `<aside>` usa `translate-x-*` (CSS `transform`), que cria um containing block para `position: fixed` — colocar o modal dentro dela quebraria o posicionamento em tela cheia.

**Decisões técnicas:**
- Não foi criada nenhuma policy de `UPDATE` direta em `profiles` — mantido o mesmo princípio de segurança já documentado no projeto (toda escrita em `profiles` passa por uma RPC `SECURITY DEFINER` que decide exatamente quais colunas podem mudar e por quem), só que agora também cobrindo a autoedição de nome/e-mail pelo próprio usuário.
- Troca de e-mail usa o fluxo padrão do Supabase Auth (exige confirmação por link antes de valer para login) — o toast avisa isso explicitamente; `profiles.email` é atualizado de imediato (só o valor de exibição na UI), o que pode divergir brevemente do e-mail de login real até a confirmação — aceito como simplificação, mesma natureza de trade-off já registrada nas decisões de reset de senha anteriores.
- Troca de senha não pede a senha atual (Supabase Auth não expõe/exige isso para uma sessão já autenticada) — mesmo comportamento já usado em `ResetPassword.tsx`.
- Validado com `npx tsc --noEmit`, `npm run build` e `get_advisors(security)` (só os mesmos avisos genéricos de SECURITY DEFINER já presentes em toda RPC do projeto, sem risco novo — a função falha com "Perfil não encontrado" para qualquer chamada sem sessão válida). Teste end-to-end real (editar nome/e-mail/senha, aviso de alterações não salvas) não foi executado nesta sessão por falta de credenciais de um usuário de teste — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Multi-tenant: Governança (Admin Master) + isolamento por igreja

**O que foi feito:** o app deixa de ser single-tenant (uma igreja implícita compartilhando todos os dados) e passa a ser multi-tenant de verdade — cada igreja isolada por `church_id`, com um novo papel `master` (Admin Master da SaaS) com acesso irrestrito a todas.

- **`supabase/migrations/0007_audit_logs_restrict_select.sql`, `0008_add_update_own_profile_rpc.sql`** (novos, arquivos locais recriados verbatim): duas migrations que já estavam aplicadas em produção via MCP `apply_migration` em sessões anteriores, mas nunca tinham sido salvas em `supabase/migrations/` — hygiene, sem mudança de comportamento, para o repo voltar a refletir o estado real do banco.
- **`supabase/migrations/0009_multi_tenant_churches.sql`** (novo, aplicado via MCP `apply_migration`):
  - Nova tabela `churches` (nome/endereço completo/CEP/email/CNPJ/telefone opcionais/`parent_church_id` self-FK/`is_active`), RLS habilitada, **sem policy de DELETE** (igreja só é ativada/desativada, nunca excluída).
  - `profiles` ganha `church_id` (nullable — só o Master fica `null`) e `cpf` (opcional); `transactions`/`import_history` ganham `church_id NOT NULL DEFAULT current_church_id()`; `audit_logs` ganha `church_id` (nullable, mesmo default) — como o default resolve sozinho via função `SECURITY DEFINER`, nenhum `insert` existente no frontend/triggers precisou mudar.
  - Novas funções `is_master()`/`current_church_id()`; `has_role()`/`is_active()` redefinidas para dar bypass total ao Master e também exigir que a **igreja esteja ativa** (além do status do usuário) — reaproveita 100% o mecanismo já existente de "profile invisível via RLS → `AuthContext.signIn()` trata como `INACTIVE`" para bloquear login de uma igreja desativada.
  - `admin_update_user_role`/`admin_set_user_status` passam a exigir mesma igreja do alvo (a menos que o chamador seja Master) — corrige uma lacuna real (antes um Admin de uma igreja podia alterar role/status de usuário de **outra** igreja, já que o RPC só checava `is_admin()`, sem comparar tenant).
  - Nova RPC `master_update_profile` (Master edita nome/e-mail/CPF de qualquer perfil). `handle_new_user()` passa a também gravar `church_id`/`cpf` vindos do `user_metadata`.
  - Triggers `on_church_insert`/`on_church_update` auditam criação/edição/ativação-desativação de igreja (`church_id` explícito = a própria igreja afetada, não a do Master, que é `null`).
  - Seed: usuário `alessandrosaldanha.as@gmail.com` (já existente) promovido a `master` (`church_id = null`); os outros 2 profiles e os 614 `audit_logs` existentes migrados para a igreja real "Igreja Batista Reformada" (Av. Eng. Corintho Campelo da Paz, 80, Santos Dumont, Maceió/AL, CEP 57075-440), criada como seed.
  - Realtime habilitado em `churches` (mesmo padrão já usado em `profiles`).
- **`supabase/functions/invite-user/index.ts`**: aceita chamador `master` além de `Admin`; Master informa `church_id` explícito no corpo (validado contra a tabela), Admin comum sempre usa o próprio (ignora qualquer valor enviado); valida que `role` nunca seja `"master"`; repassa `cpf` opcional.
- **`supabase/functions/generate-reset-link/index.ts`**: aceita chamador `master`; log de auditoria agora usa o `church_id` do usuário-alvo (não do chamador).
- **`src/types/index.ts`**: `UserRole` ganha `"master"` (+ `ASSIGNABLE_ROLES`, a lista das 4 roles atribuíveis pela UI); `ChurchUser` ganha `cpf?`/`churchId?`; nova interface `Church`.
- **`src/context/AuthContext.tsx`**: `fetchProfile` passa a selecionar `church_id`/`cpf`; novo listener Realtime na própria `churches` (força logout se a igreja for desativada em outra sessão — mesmo padrão do listener de status `Inativo` em `profiles`).
- **`src/context/AppContext.tsx`**: `refreshUsers`/`refreshTransactions`/`refreshImportHistory` pulam o fetch quando `profile.role === "master"`.
- **`src/components/Sidebar.tsx` / `ProtectedRoute.tsx` / `App.tsx`**: novo item "Governança (Admin Master)" (só `master`); Dashboard/Importação/Livro Caixa restritos aos 4 papéis de igreja; nova rota `/governanca`; redirect de fallback (rota não permitida / index / catch-all) agora é role-aware (`/governanca` para Master, `/dashboard` para os demais) — sem isso o Master cairia num loop de redirecionamento.
- **Novos componentes/página:** `src/utils/cep.ts` (`lookupCep`, ViaCEP), `src/components/Pagination.tsx` (paginação client-side reutilizável), `src/components/ChurchFormFields.tsx` (formulário de igreja com autofill de CEP), `src/components/ChurchCreateModal.tsx`, `src/components/ChurchDetailsModal.tsx` (dados da igreja editáveis + Ativar/Desativar com confirmação + sub-tabela de membros paginada 5/página + "Adicionar Membro"), `src/components/MemberEditModal.tsx` (edita nome/e-mail/CPF via `master_update_profile`, role/status via as RPCs já existentes), `src/pages/Governanca.tsx` (tabela de igrejas paginada 10/página, busca por nome/e-mail/CEP/responsável, filtro de hierarquia e data, estados vazio/não-encontrado).
- **`src/pages/Usuarios.tsx`**: ajuste mínimo — `ROLE_TONE`/`ROLE_ORDER` usam `ASSIGNABLE_ROLES` (nunca exibe `master`, que a RLS de `profiles` já esconde de qualquer Admin de igreja).

**Decisões técnicas:**
- **"Membros/Admins da igreja" = os mesmos `profiles`/RBAC de hoje** (com `church_id`+`cpf`), não um cadastro separado de congregação — confirmado com o usuário antes de implementar.
- **Onboarding de igreja nova**: botão "Adicionar Membro" no modal de detalhes (reaproveita `invite-user`) — o pedido original não descrevia isso, mas sem essa peça uma igreja recém-criada nunca teria usuário algum.
- **Paginação 100% client-side** (carrega todas as igrejas/membros e pagina/filtra em memória) — mesmo padrão já usado em `Usuarios.tsx`/`Auditoria.tsx`; volume de igrejas nesta fase da SaaS não justifica paginação server-side.
- **Sem policy de DELETE em `churches`** — só ativar/desativar, mesma filosofia de "sem hard delete" já usada no projeto (estorno de lançamento também é feito via RLS+trigger, nunca apagando o histórico de auditoria).
- **Hierarquia de igrejas é só organizacional** (`parent_church_id`, sem rollup de dados) — cada igreja (principal ou filha) continua sendo um tenant isolado; o filtro "Principal × Filha" é só uma etiqueta de exibição/busca.
- **CEP via ViaCEP** (pública, sem chave) — sem dependência nova instalada.
- Validado com `npx tsc --noEmit`, `npm run build` (sem erros) e `npm run lint` (só os mesmos warnings pré-existentes já tolerados no projeto). Dados de produção conferidos via MCP (`churches` com a igreja seed, os 3 `profiles` com `church_id` correto, os 614 `audit_logs` todos com `church_id`, novas policies em `pg_policies`). **Teste end-to-end real na UI (login como Master, criar igreja, ver isolamento entre igrejas) não foi executado nesta sessão** por não haver um segundo usuário/igreja de teste disponível — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Correção: Master via acesso total (menus normais + seletor de "igreja em gestão")

**O que foi relatado:** logo após a Fase de multi-tenant, o perfil `master` só via o menu "Governança" na Sidebar — os menus normais (Dashboard, Livro Caixa, Importação, Usuários, Auditoria) tinham sumido. Pedido explícito do usuário: Master **DEVE TER ACESSO A TUDO sem restrições**, vendo todos os menus normais + Governança.

**Causa raiz:** a Fase anterior tinha restringido de propósito esses 5 menus a `TENANT_ROLES` (Admin/Tesoureiro/Auditor/Conselho Fiscal), excluindo `master`, porque essas telas são todas **por-igreja** (um único saldo/ledger/equipe) e o Master não pertence a nenhuma igreja (`church_id = null`) — sem uma igreja de referência, essas telas não têm o que mostrar. Simplesmente adicionar `master` às roles permitidas sem resolver isso deixaria as telas vazias/quebradas.

**Solução escolhida (confirmada com o usuário via pergunta direta):** adicionar um seletor de **"Igreja em Gestão"** na Sidebar, visível só para o Master — ele escolhe qual igreja está gerenciando no momento, e todas essas 5 telas passam a mostrar/gravar os dados dessa igreja, exatamente como se o Master fosse o Admin dela.

**O que foi feito:**
- **`src/context/AppContext.tsx`:** novo `viewingChurchId`/`setViewingChurchId` (persistido em `localStorage`, mesma técnica já usada para `logout_reason_inactive`) — a igreja escolhida pelo Master. Novo `effectiveChurchId` = `viewingChurchId` para o Master, ou a própria `profile.churchId` para os demais papéis (que sempre têm uma igreja fixa, nunca escolhida). Novo `masterChurches` (lista de igrejas para popular o seletor, carregada só para `master`). `refreshUsers`/`refreshTransactions`/`refreshImportHistory` agora filtram explicitamente por `church_id = effectiveChurchId` (antes dependiam só da RLS, que não filtra nada para o Master — ele vê todas as linhas de todas as igrejas) e ficam vazios enquanto nenhuma igreja estiver selecionada, em vez de pular o fetch (mecanismo antigo, específico demais para "é master ou não").
- **`src/components/Sidebar.tsx`:** os 5 itens de menu voltam a ficar visíveis para `master` (mesma lista de roles + `"master"`); novo `<select>` "Igreja em Gestão" (só para Master) logo abaixo do cabeçalho, alimentado por `masterChurches`.
- **`src/App.tsx`:** `TENANT_ROLES` (grupo de rotas Dashboard/Importação/Livro Caixa) e as rotas `usuarios`/`auditoria` passam a incluir `"master"`.
- **`src/pages/LivroCaixa.tsx`/`ImportacaoExtrato.tsx`:** `canManage`/`canDelete`/`canEditHistory`/`canDeleteHistory` passam a valer também para `master` (só quando há uma igreja selecionada — sem isso não haveria `church_id` para gravar). Os `insert`s de `transactions`/`import_history` passam a incluir `church_id: effectiveChurchId` explicitamente quando quem grava é o Master (para os demais papéis o valor é `undefined`, que o JSON descarta, deixando o `DEFAULT current_church_id()` do banco resolver sozinho como já fazia) — necessário porque o Master não tem `church_id` próprio para o `DEFAULT` usar.
- **`src/pages/Usuarios.tsx`:** `submitInvite` passa `church_id: effectiveChurchId` no corpo da chamada a `invite-user` (a Edge Function já ignorava esse campo para chamadores não-Master, então é seguro sempre enviar) e bloqueia com um toast se o Master tentar cadastrar sem igreja selecionada.
- **`src/pages/Auditoria.tsx`:** query de `audit_logs` agora filtra por `church_id = effectiveChurchId` (antes trazia a tabela inteira sem filtro de tenant nenhum) e fica vazia sem uma igreja selecionada.

**Decisões técnicas:**
- Nenhuma tabela nova/RPC nova foi necessária — a RLS já dava ao Master bypass total (`is_master()`); o que faltava era só o **filtro do lado do cliente** para essas 5 telas saberem "qual das todas as igrejas visíveis para o Master mostrar agora", e o valor explícito de `church_id` nos `insert`s onde o `DEFAULT` do banco não se aplica ao Master.
- Seleção de igreja persistida em `localStorage` (não em `profiles`/banco) — é uma preferência de sessão de navegação do Master, não um dado de negócio; evita uma migration só para isso.
- `effectiveChurchId` unifica o código: para papéis normais é sempre a própria igreja (nunca muda), para o Master é a escolha atual — as páginas não precisam mais checar `role === "master"` em todo lugar, só nos pontos de escrita que dependem do `DEFAULT` do banco.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos). **Teste end-to-end real (login como Master, escolher igreja no seletor, criar lançamento/importar extrato/convidar usuário) não foi executado nesta sessão** por falta de credenciais de teste — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Tela de Usuários: visão global para o Master + correção de segurança em `generate-reset-link`

**O que foi pedido:** ajustes na tela de Usuários — Master deve ver TODOS os usuários de TODAS as igrejas (não só a igreja escolhida no seletor da Sidebar), com uma coluna/filtro "Igreja" visível só para ele; Admin continua vendo só a própria igreja; e uma checagem geral de consistência de rotas/permissões.

**O que foi feito:**
- **`src/context/AppContext.tsx`:** `refreshUsers` agora se comporta de forma diferente do resto (`refreshTransactions`/`refreshImportHistory`, que continuam exigindo a igreja escolhida no seletor da Sidebar, por serem um ledger por igreja): para `master`, busca **todos** os `profiles` sem filtro de `church_id`, com `church:churches(name)` embutido na própria query (join via PostgREST) para resolver o nome da igreja de cada usuário; para os demais papéis, continua restrito à própria igreja. `mapProfileRow`/`ChurchUser` ganham `churchName`.
- **`src/pages/Usuarios.tsx`:** nova coluna "Igreja" (badge) na tabela e novo filtro "Igreja" no topo, ambos renderizados só quando `profile.role === "master"`. O modal de "Convidar Novo Usuário" ganha um campo "Igreja" (só para o Master, obrigatório) — antes dependia implicitamente da "igreja em gestão" da Sidebar, o que não fazia mais sentido numa tela que agora mostra todas as igrejas ao mesmo tempo.
- **`supabase/functions/generate-reset-link/index.ts`** (correção de segurança, reimplantada): a checagem de que o e-mail-alvo pertence à mesma igreja do Admin que chama passou a acontecer **antes** de gerar o link (usando o `callerClient`, sujeito à RLS) — antes, a chamada real ao `adminClient.auth.admin.generateLink` (que usa a service-role key e **ignora RLS**) acontecia primeiro, e a checagem de igreja só rodava depois, apenas para compor a mensagem do log de auditoria. Ou seja, um Admin de uma igreja conseguia gerar um link de redefinição de senha válido para **qualquer e-mail de qualquer igreja**, bastando saber o e-mail. Corrigido: agora busca o perfil do e-mail-alvo primeiro e bloqueia com 403 se o chamador não for Master e a igreja não bater.
- Revisão geral: conferido via `pg_policies` que todas as policies de `profiles`/`transactions`/`import_history`/`audit_logs`/`churches` seguem o mesmo formato `is_master() or (<regra original> and church_id = current_church_id())`, sem nenhuma tabela esquecida; `profiles` continua sem nenhuma policy de `UPDATE` (toda escrita passa por RPC `SECURITY DEFINER`); `admin_update_user_role`/`admin_set_user_status` já tinham a checagem de mesma igreja (adicionada na fase multi-tenant); rotas em `App.tsx`/itens da `Sidebar.tsx` conferidos como espelhados 1:1 (mesmas `allowedRoles` nos dois lugares).

**Decisões técnicas:**
- `refreshUsers` foi deliberadamente desacoplado de `effectiveChurchId`/"igreja em gestão" para o Master — diferente de Livro Caixa/Importação/Auditoria (que são um saldo/ledger por igreja e não fazem sentido misturados), um diretório de pessoas é naturalmente multi-tenant "achatável" numa lista só, com a igreja como um atributo de cada linha — por isso a tela de Usuários pôde virar uma visão global sem exigir a escolha prévia de uma igreja.
- O embed `church:churches(name)` só é usado no branch do Master — para os demais papéis não é necessário (a coluna fica oculta) e evitaria uma tentativa de leitura de `churches` que a RLS bloquearia mesmo (só `is_master()` lê essa tabela).
- A falha em `generate-reset-link` não tinha sido pega na auditoria de segurança anterior porque, antes da Fase multi-tenant, não existia conceito de igreja/tenant — o código sempre esteve "correto" para um cenário single-tenant; o gap só passou a existir quando `church_id` foi introduzido sem revisitar essa função especificamente.
- Validado com `npx tsc --noEmit`, `npm run build` (o `tsc -b` do build pegou um erro de tipagem que o `--noEmit` sozinho não acusou — a query com embed `church:churches(name)` sem tipos gerados do banco tipa o relacionamento como array de 1 item, não objeto único; corrigido) e `npm run lint` (sem erros novos). **Teste end-to-end real (login como Master vendo todos os usuários, filtro por igreja, Admin tentando resetar senha de outra igreja e recebendo 403) não foi executado nesta sessão** por falta de credenciais de teste — recomenda-se validar manualmente antes de considerar encerrado.

### [2026-07-25] Correção: o próprio Master aparecia na listagem global de Usuários

**O que foi relatado:** a visão global de usuários do Master (fase anterior) buscava todos os `profiles` sem excluir a própria role `master` — a linha do Master (com `church_id` nulo, mostrando "Igreja: —") aparecia misturada na lista junto com os membros de igreja de verdade.

**O que foi feito:** `src/context/AppContext.tsx` — `refreshUsers` (branch do Master) ganhou `.neq("role", "master")` na query. A tela de Usuários é para gerir "membros/admins de igreja"; o Master não é um desses, é o dono da SaaS.

**Decisões técnicas:** os demais pontos pedidos (coluna "Igreja" só para o Master, filtro por igreja, isolamento do Admin à própria igreja) já tinham sido implementados na fase anterior e continuam corretos — confirmado por leitura do código antes de mexer, para não duplicar trabalho. Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste end-to-end real não executado nesta sessão por falta de credenciais de teste.

### [2026-07-25] Correção: coluna "Igreja" aparecia como "—" mesmo com church_id preenchido

**O que foi relatado:** `eber.felipe@gmail.com` e `eduardoeliaquim@gmail.com`, ambos vinculados à Igreja Batista Reformada, apareciam com "—" na coluna "Igreja" da tela de Usuários (visão do Master).

**Investigação:** conferido direto no banco (join manual `profiles` × `churches`) que os dados estavam corretos — os dois têm `church_id` preenchido e a igreja existe com o nome certo. Não era um problema de dado nem de RLS (a policy `churches_select_master` já libera `is_master()` para ler qualquer igreja, inclusive via embed).

**Causa raiz:** na correção anterior, um erro do `tsc -b` (`npm run build`) foi mal interpretado — ele reclamava que o tipo inferido do embed `church:churches(name)` era um array (`{name}[]`), e a correção então tratou `row.church` como array (`row.church?.[0]?.name`). Só que essa é a tipagem heurística do `supabase-js` **sem os tipos gerados do banco** (o projeto não usa `createClient<Database>()`) — na prática, o PostgREST devolve uma relação "para-um" (FK de `profiles.church_id` apontando para `churches.id`) como **objeto único**, nunca array. Resultado: `row.church?.[0]` sempre `undefined` (indexar `[0]` num objeto não é válido), então a coluna sempre caía no fallback "—", mesmo com o dado certo vindo da API.

**Correção:** `src/context/AppContext.tsx` — `ProfileRowWithChurch.church` volta a ser `{ name: string } | null` (objeto), acesso corrigido para `row.church?.name` (sem `[0]`). Para resolver o erro do `tsc -b` desta vez sem reintroduzir o bug, o resultado da query é convertido explicitamente via `data as unknown as ProfileRowWithChurch[]` em vez de deixar o tipo (impreciso) inferido pelo `supabase-js` guiar o formato dos dados em runtime.

**Decisão técnica:** a lição registrada aqui é: quando o `supabase-js` é usado sem tipos gerados do banco (`createClient<Database>()`), a tipagem que ele infere a partir da string do `.select(...)` é só uma heurística e pode divergir do formato real devolvido pelo PostgREST — especialmente em relações embutidas. Nesses casos, confiar no schema real (FK "para-um" = objeto; "para-muitos" = array) e usar um cast explícito é mais seguro do que ajustar o código para bater com o que o compilador está reclamando.

Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos). Teste end-to-end real (conferir visualmente que os dois usuários agora mostram "Igreja Batista Reformada" na tela) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-25] Auditor perde acesso a "Extratos e Importação IA"

**O que foi feito:** `Auditor` deixou de ter acesso à tela/rota de Importação de Extratos — papel só de leitura/fiscalização, não deveria poder importar/lançar nada.
- **`src/App.tsx`:** a rota `importacao` saiu do grupo `TENANT_ROLES` (Dashboard/Livro Caixa/Importação, que incluía Auditor) e ganhou seu próprio grupo `IMPORTACAO_ROLES = ["Admin", "Tesoureiro", "Conselho Fiscal", "master"]` — sem `Auditor`.
- **`src/components/Sidebar.tsx`:** o item "Extratos e Importação IA" passou a usar esse mesmo `IMPORTACAO_ROLES`, sumindo do menu para quem loga como Auditor.
- Acesso direto pela URL (`/importacao`) por um Auditor: o `ProtectedRoute` já redireciona (para `/dashboard`, rota que o Auditor continua acessando normalmente) quando a role não está em `allowedRoles` — nenhuma mudança adicional necessária, o mecanismo já existente cobre esse caso.

**Decisões técnicas:**
- Nenhuma mudança de RLS/banco foi necessária — Auditor já não tinha (e nunca teve) permissão de `INSERT`/`UPDATE`/`DELETE` em `transactions`/`import_history` (as policies desde a Fase 3 já restringem escrita a `has_role(['Admin','Tesoureiro'])`); esta mudança é só a UI/rota parar de expor uma tela cujas ações de escrita já eram bloqueadas por baixo.
- Dashboard/Livro Caixa/Auditoria continuam liberados para Auditor (não fizeram parte do pedido).
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos). Teste end-to-end real (login como Auditor confirmando que o menu some e a URL redireciona) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-25] Primeira release oficial: v1.0.0

**O que foi feito:** commitadas e enviadas para `origin/main` todas as mudanças pendentes da fase de Governança/multi-tenant (commit `f90a5df`), e criada a tag anotada `v1.0.0` (também enviada para o remoto), consolidando o módulo de Governança (Admin Master), o isolamento multi-tenant por `church_id`, os ajustes de matriz de permissões (RBAC) e as correções de CORS/domínio próprio já commitadas anteriormente no mesmo dia.

**Decisões técnicas:**
- O `gh` CLI está instalado mas não autenticado nesta sessão (sem navegador para o login interativo, e sem `GH_TOKEN`/`GITHUB_TOKEN` no ambiente) — não foi possível rodar `gh release create` diretamente. Combinado com o usuário: criar a tag anotada `v1.0.0` (com o changelog completo como mensagem da tag) e enviar para o GitHub; a criação do objeto "Release" em si (título + notas na UI) fica para o usuário fazer manualmente em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/new?tag=v1.0.0`, colando o changelog já pronto.
- Antes de criar a tag, nada do trabalho desta fase estava commitado — confirmado com o usuário antes de commitar/dar push, já que são ações que afetam o repositório remoto compartilhado.

### [2026-07-25] Auditoria completa de Governança/RBAC (Master/Admin/Tesoureiro/Auditor/Conselho Fiscal) com teste ao vivo em produção

**O que foi feito:** auditoria fim-a-fim do RBAC multi-tenant (introduzido na sessão anterior — módulo de Governança/Master, ver commit `f90a5df`), cobrindo front-end (rotas/menus), RLS e as 3 Edge Functions. Metodologia: leitura de `App.tsx`/`Sidebar.tsx`/`ProtectedRoute.tsx`/`AuthContext.tsx`/`AppContext.tsx`/migrations 0001–0009, seguida de **teste ao vivo em produção** (autorizado explicitamente pelo usuário): criada uma igreja de teste + 4 usuários de teste (Admin de outra igreja, Tesoureiro/Auditor/Conselho Fiscal da igreja real) via Admin API, login real de cada um, e tentativas de leitura/escrita cross-tenant e de escalonamento de privilégio via REST/RPC direto (bypassando a UI) — tudo limpo ao final (usuários, igreja e transação de teste removidos; as 2 linhas de `audit_logs` geradas pelo teste também, já que `user_id`/`church_id` delas apontavam só para os artefatos de teste).

**Resultado dos testes ao vivo:** todas as políticas de RLS resistiram — nenhuma leitura/escrita cross-tenant, nenhuma escalada de privilégio (Tesoureiro tentando se autopromover a Admin, Admin de uma igreja tentando alterar role de usuário de outra igreja, chamada anônima às RPCs de Admin), `audit_logs` corretamente vazio para Tesoureiro, `churches` corretamente vazio para não-master.

**Bugs reais encontrados e corrigidos:**
1. **Conselho Fiscal tinha acesso de UI a "Extratos e Importação IA" mas toda escrita falhava (RLS 403)** — a RLS (`transactions_insert_treasury`/`import_history_insert_treasury`) e a própria Edge Function `parse-statement` só aceitavam Admin/Tesoureiro, mas o front-end (`IMPORTACAO_ROLES` em `App.tsx` e `Sidebar.tsx`) incluía Conselho Fiscal — tela visível, botão "Confirmar e Salvar" habilitado, mas qualquer tentativa de salvar quebrava. Corrigido removendo Conselho Fiscal de `IMPORTACAO_ROLES` nos dois arquivos (mesmo tratamento que Auditor já tinha).
2. **Master não conseguia usar a Importação com IA** — `parse-statement/index.ts` checava `["Admin","Tesoureiro"].includes(profile.role)`, nunca atualizado para aceitar `master` quando o papel foi introduzido (diferente de `invite-user`/`generate-reset-link`, que já tratavam `master` corretamente). Corrigido e reimplantado em produção (`parse-statement` v9).
3. **`request_ip()`/`request_device()` sem `search_path` fixo** (`function_search_path_mutable`, apontado pelo advisor de segurança do Supabase) — sem exploração prática conhecida (não referenciam nada sem qualificar schema), mas corrigido por padrão de higiene (nova migration `0010_harden_function_search_path.sql`, aplicada em produção).

**Avisos do advisor considerados falso-positivo/aceitáveis (não alterados):** todas as RPCs `SECURITY DEFINER` (`admin_update_user_role`, `admin_set_user_status`, `has_role`, etc.) aparecem como "executável por `anon`/`authenticated`" — comportamento padrão do Postgrest para qualquer função exposta; **confirmado empiricamente no teste ao vivo** que chamar `admin_update_user_role` sem autenticação (ou como usuário sem permissão) é rejeitado pela checagem interna (`is_admin()`/`is_master()`) antes de qualquer efeito. "Leaked Password Protection Disabled" — requer ativação manual no Dashboard (Authentication → Policies), fora do escopo de código.

**Achado de segurança à parte (fora do RBAC, encontrado ao ler `.claude/settings.local.json` durante a auditoria) — já resolvido:** esse arquivo (não versionado — confirmado via `git ls-files`/`git log`, nunca foi commitado nem chegou ao GitHub) continha a **secret key (`sb_secret_...`, formato novo) em texto puro** em vários comandos `curl` do histórico de permissões (mesmo padrão do incidente de 24/07, mas daquela vez só o `settings.json` versionado tinha sido corrigido — o `settings.local.json`, local e não sincronizado, ficou de fora). Ação tomada: as 6 entradas com a key literal foram removidas do arquivo, e a `secret key` (`default`, id `7bb3dbc1-...`) foi revogada pelo usuário no dashboard do Supabase (Settings → API Keys → aba "Publishable and secret API keys" → tabela "Secret keys" — não confundir com a Publishable key, que é pública por design e não precisava ser tocada). Confirmado depois via `curl`: a key vazada agora responde `401 Unregistered API key`, e a `anon` key legada usada pelo app continua funcionando normalmente (nada quebrou). Como essa `sb_secret_` nunca foi referenciada em código (as Edge Functions usam a `SUPABASE_SERVICE_ROLE_KEY` legada via `Deno.env.get`, injetada automaticamente pelo runtime), a revogação não exigiu nenhum redeploy.

**Decisões técnicas:**
- Teste ao vivo optou por **criar contas de teste dedicadas** (prefixo "TESTE"/e-mails `@auditoria-rbac.local`) em vez de reutilizar contas reais — permite testar todos os papéis (inclusive Conselho Fiscal, que não tinha nenhum usuário real ainda) sem tocar em credenciais de produção.
- A limpeza removeu as linhas de `audit_logs` geradas pelo teste via `DELETE` direto (SQL, como superuser) — mesma exceção já usada antes (incidente "TESTE ESTORNO" de 24/07) para não deixar ruído de teste artificial na trilha de auditoria real, mantendo a política de imutabilidade para ações de usuários de verdade.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) após as correções de front-end.


### [2026-07-25] Correção: falso-positivo de erro do editor em `supabase/functions`

**O que foi encontrado:** o usuário reportou "um erro" em `supabase/functions/parse-statement/index.ts`. Investigação: o código roda normalmente em produção (logs do Supabase sem nenhuma falha nova desde o último deploy) e nenhuma revisão manual da lógica encontrou bug real. Causa raiz: o projeto não tinha nenhum `deno.json` nem `.vscode/settings.json` — sem isso, o VS Code usa o servidor de TypeScript padrão (voltado só para `src/`, via `tsconfig.app.json`) dentro da pasta `supabase/functions`, que é código Deno de verdade (`Deno.serve`, imports via URL `https://esm.sh/...`). O resultado é uma sequência de falsos-positivos no editor ("Cannot find name 'Deno'", "Cannot find module" nos imports HTTP), sem nenhum efeito na execução real da função.

**Correção:** criados `.vscode/settings.json` (raiz do projeto, com `deno.enablePaths: ["./supabase/functions"]` e `deno.enable: false` fora dela, para não afetar o TypeScript do `src/` React) e `supabase/functions/deno.json` (compilerOptions com `lib: ["deno.window"]`) — padrão recomendado pela própria Supabase para projetos que misturam Deno (Edge Functions) com um app Node/Vite no mesmo repositório. Requer a extensão "Deno for VS Code" (`denoland.vscode-deno`) instalada para o efeito completo; sem ela, o VS Code ainda mostrará os avisos (mas nenhum deles nunca afetou o app em produção).

**Decisão técnica:** nenhuma mudança de código em `parse-statement/index.ts` foi necessária — o "erro" era 100% de configuração do editor, não de lógica. Validado com `npx tsc --noEmit` (sem erros, os novos arquivos de config não afetam a checagem do `src/`).

### [2026-07-25] Master ganha visão global na Trilha de Auditoria

**O que foi pedido:** o Master deveria ter acesso irrestrito à auditoria de todas as igrejas (com um seletor "Todas as Igrejas" ou uma igreja específica), sem quebrar o isolamento das demais roles.

**O que foi feito:**
- **`src/pages/Auditoria.tsx`**: novo estado `churchFilter` (só relevante para `master`, default `"all"`) com um `<select>` próprio no topo da tela (mesmo padrão visual do filtro de usuários/ações já existentes), populado por `masterChurches` (já carregado no `AppContext` para o seletor da Sidebar). A query a `audit_logs` passa a ramificar por papel: `master` com `"all"` não aplica nenhum filtro de `church_id` (a RLS via `is_master()` já libera ver tudo); `master` com uma igreja específica ou qualquer outro papel filtra por `church_id` normalmente (`current_church_id()`/`effectiveChurchId`, sem nenhuma mudança de comportamento para quem não é master). Nova coluna "Igreja" (badge) na tabela, visível só para `master`, resolvida via embed `church:churches(name)` — necessária para o histórico global fazer sentido (sem ela, misturar logs de igrejas diferentes seria ilegível).
- **`src/types/index.ts`**: `AuditLog` ganha `churchName?: string | null`.

**Decisões técnicas:**
- **Diferente do Dashboard/Livro Caixa/Importação** (que dependem da "igreja em gestão" escolhida na Sidebar, por serem um ledger de uma igreja só), a Auditoria do Master tem seu **próprio seletor independente** — um log de auditoria já carrega a proveniência (`church_id`/nome da igreja) linha a linha, então uma visão "achatada" de todas as igrejas de uma vez faz sentido (mesmo racional já usado na tela de Usuários).
- **Nenhuma migration foi necessária** — a policy `audit_logs_select_admin_auditor_conselho` já implementava exatamente a regra pedida (`is_master() or (has_role([...]) and church_id = current_church_id())`) desde a fase de multi-tenant; confirmado via `pg_policies` antes de qualquer mudança de código, para não mexer em RLS que já estava correta.
- O embed `church:churches(name)` é tratado como **objeto único** (não array) na tipagem — mesma lição já registrada na correção da coluna "Igreja" em Usuários: sem os tipos gerados do banco, o `supabase-js` pode inferir a cardinalidade errada; o cast explícito (`data as unknown as AuditLogRow[]`) evita reintroduzir aquele bug.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos, `git status` confirmando que só os 2 arquivos pretendidos mudaram — nenhuma regressão em outras telas/papéis). Teste end-to-end real (login como Master, alternar entre "Todas as Igrejas" e uma igreja específica) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-25] Termos de Uso e Responsabilidade: aceite obrigatório no primeiro acesso

**O que foi pedido:** um modal bloqueante (sem botão de fechar) exibido logo após o login, exigindo aceite explícito dos Termos de Uso antes de liberar qualquer tela da plataforma — com foco jurídico em isentar o desenvolvedor de responsabilidade por vazamento de dados causado por mau uso do usuário (compartilhamento de credenciais, engenharia social) e por inconsistências em relatórios originadas de dados/arquivos incorretos enviados pelo próprio usuário, além de deixar claro que a IA é ferramenta auxiliar que exige conferência humana.

**O que foi feito:**
- **`supabase/migrations/0011_terms_acceptance.sql`** (aplicada via MCP `apply_migration`):
  - `profiles.termo_aceito boolean not null default false` — flag rápida para o frontend não precisar de uma query extra.
  - Tabela nova `termo_aceite_registros` (histórico **imutável**, um registro por aceite): `user_id`, `versao_termo`, `data_aceite`, `ip_usuario`, `user_agent`, `church_id`. RLS: cada usuário vê o próprio histórico; Admin/Auditor/Conselho Fiscal veem os da própria igreja; Master vê tudo. Sem policy de `UPDATE`/`DELETE` (append-only, mesmo padrão de `audit_logs`).
  - `audit_logs_action_key_check` ampliada com o novo valor `'aceite_termos'`, para o aceite também aparecer na trilha geral (`/auditoria`).
  - RPC `accept_terms(p_versao_termo)` (`SECURITY DEFINER`) — única forma de registrar o aceite: grava em `termo_aceite_registros` (reaproveitando `request_ip()`/`request_device()` já existentes), ativa `profiles.termo_aceito` e loga `aceite_termos` em `audit_logs`.
- **`src/components/TermsAcceptanceModal.tsx`** (novo): modal fullscreen sem botão de fechar nem `onClick` de backdrop para dispensar, com o texto completo das cláusulas (guarda de credenciais, isenção por vazamento de dados por mau uso do usuário, IA como ferramenta auxiliar sujeita a conferência, isenção sobre exatidão de relatórios/dados enviados pelo usuário, vigência do aceite) e checkbox obrigatório antes de habilitar o botão "Li e Aceito os Termos" (chama a RPC `accept_terms` e `refreshProfile()`).
- **`src/components/ProtectedRoute.tsx`**: nova checagem `!profile.termoAceito` logo após o bloqueio de sessão inválida/inativa (mesmo ponto onde `isPasswordRecovery` já é tratado, antes de `allowedRoles`) — renderiza `TermsAcceptanceModal` no lugar do `Outlet`, bloqueando toda a árvore de rotas (inclusive `master`) até o aceite. Como o `Login.tsx` já navega para `/dashboard`/`/governanca` após autenticar, o modal aparece naturalmente por cima da rota de destino sem precisar de nenhum redirecionamento dedicado.
- **`src/context/AuthContext.tsx`**: `fetchProfile()` agora seleciona e mapeia `termo_aceito` → `termoAceito`.
- **`src/types/index.ts`**: `ChurchUser.termoAceito?: boolean` (opcional — só relevante para o profile da própria sessão; listagens de outros membros em `Usuarios`/`ChurchDetailsModal` não o preenchem) e `AuditActionKey` ganha `'aceite_termos'`.
- **`src/services/mockData.ts`**: `ACTION_TYPES.aceite_termos` (label "Aceite dos Termos de Uso", tone `success`) para o filtro/badge da tela de Auditoria.

**Decisões técnicas:**
- **Tabela dedicada + `audit_logs`, não só uma:** `termo_aceite_registros` guarda o histórico completo e auditável (múltiplos aceites possíveis, ex. se a versão do termo mudar no futuro); o espelho em `audit_logs` é só para o evento aparecer na trilha geral que já é consultada na tela de Auditoria — mesma decisão de duplicação já usada para outras ações administrativas do projeto.
- **RPC `SECURITY DEFINER`, não policy de `UPDATE` direta em `profiles`:** segue o padrão já estabelecido no projeto desde a Fase 1 (nenhuma tabela sensível tem `UPDATE` liberado direto para o client).
- **Checagem no `ProtectedRoute`, não em cada página:** um único ponto de bloqueio, igual a `isPasswordRecovery`, evita esquecer a checagem em alguma rota nova no futuro e cobre `master` também (o aceite é sobre uso da plataforma, não sobre papel).
- **`TERMS_VERSION` como constante versionada** (`TermsAcceptanceModal.tsx`, hoje `"1.0"`): se o texto do termo mudar de forma relevante, o plano é uma migration dedicada que zera `termo_aceito` em massa — não é automático a partir só da constante mudar.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros; ambos passaram limpos após tornar `termoAceito` opcional no tipo, por causa de dois construtores de `ChurchUser` que listam outros membros sem essa coluna). Teste end-to-end real (login novo, ver o modal, aceitar, confirmar `termo_aceito = true` e o registro em `termo_aceite_registros`) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-25] Auditoria e correção da documentação (`CLAUDE.md`, `.claude/skills/`, `README.md`)

**O que foi pedido:** revisão completa da estrutura de documentação do projeto — validar `CLAUDE.md` e as skills em `.claude/skills/`, conferir se o `README.md` está condizente com as regras e o estado real do projeto, corrigir o que estiver incoerente e publicar em `hmg`.

**O que foi encontrado e corrigido:**
- **`.claude/skills/Master-Refactoring-Specialist/SKILL.md`** estava corrompido: o conteúdo era um script Python (`markdown_content = """...""" ... with open(...) as f: f.write(...)`) em vez de markdown puro, e não tinha frontmatter YAML. Reescrito como markdown limpo com `name`/`description`, preservando o conteúdo original (catálogo de refatorações de Fowler).
- **`.claude/skills/clean-code/SKILL.md`** e **`.claude/skills/error-ajustes-feature/SKILL.md`** não tinham frontmatter YAML (`name`/`description`), inconsistente com o padrão das demais skills do projeto. Frontmatter adicionado em ambos.
- **Skills NestJS/DDD órfãs:** `.claude/skills/nestjs-ddd-feature`, `nestjs-ddd-patterns`, `nestjs-ddd-tests` e `nestjs-project-setup` existiam no repositório e o `CLAUDE.md` as listava como "ativas no projeto" (item 4 da seção de skills), mas o projeto é 100% React + Vite + Supabase (Edge Functions em Deno) — não há NestJS em nenhum lugar do código ou dos docs. Removidas (decisão confirmada com o usuário) e a seção de skills do `CLAUDE.md` foi reescrita para listar apenas as skills de fato aplicáveis (`clean-code`, `clean-architecture`, `Master-Refactoring-Specialist`, auto-documentação, `error-ajustes-feature`).
- **`README.md` desatualizado em relação a `docs/architecture.md` e `docs/permissions-rbac.md`:**
  - Tabela de papéis listava só 4 papéis (`Admin`, `Tesoureiro`, `Auditor`, `Conselho Fiscal`); faltava o papel `master` (Admin Master da SaaS, multi-tenant) documentado desde a migration `0009_multi_tenant_churches.sql`. Adicionada linha de papéis corrigida (5 papéis) + nova linha "Multi-tenant & Governança".
  - Faltava menção ao recurso de Termos de Uso (aceite obrigatório, migration `0011_terms_acceptance.sql`). Adicionada linha "Termos de Uso" na tabela de funcionalidades.
  - Estrutura de pastas não mencionava `Governanca.tsx`, `TermsAcceptanceModal.tsx`, `Church*.tsx` nem a pasta `docs/`; e o range de migrations exemplificado (`0001...0006`) estava defasado (atual: `0001...0011`). Corrigido, com link para `docs/architecture.md` para a árvore completa.
  - Duas referências descreviam `CLAUDE.md` como "log vivo de arquitetura, decisões técnicas e histórico do projeto" — desde a modularização da documentação (ver entradas anteriores deste changelog), o histórico vive em `docs/changelog.md` e o `CLAUDE.md` raiz contém só as diretrizes essenciais. Ambas as referências corrigidas para apontar a `docs/changelog.md`.

**Validação:** `npx tsc --noEmit` rodado após as alterações (mudança é só de documentação/skills, sem código de aplicação alterado) — sem erros.

### [2026-07-25] Merge para `main` e Release v1.2.0

**O que foi feito:**
- Merge (`--no-ff`) de `hmg` em `main` com a auditoria de documentação/skills acima (commit de merge `d703777`).
- Ao revisar o histórico, identificado que a feature de Termos de Uso (commit `0d51444`, ver entrada anterior) e a adição da skill Clean Code (`22bdc75`) já estavam em `main` desde antes desta sessão, mas nunca haviam sido taggeadas/lançadas desde `v1.1.0` — pendência coberta junto nesta release.
- Tag anotada `v1.2.0` criada sobre `main` (`d703777`) e Release publicado no GitHub (`gh release create`), cobrindo: aceite obrigatório dos Termos de Uso e a auditoria de documentação/skills desta sessão.

**Decisões técnicas:**
- Autenticação do `gh` feita via `gh auth login` (fluxo de navegador) diretamente pelo usuário no terminal local — dois tokens (PAT) colados por engano no chat durante a tentativa de autenticação foram tratados como comprometidos e nunca usados em nenhum comando; usuário orientado a revogá-los.
- Versão `v1.2.0` (MINOR, SemVer) por incluir uma funcionalidade nova retrocompatível (Termos de Uso), não só a limpeza de documentação.

**Validação:** release publicado com sucesso em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/tag/v1.2.0`.

### [2026-07-26] Fix: RLS bloqueando salvamento de lançamentos/importação de extrato (`transactions`)

**O que foi pedido:** erro "Falha ao salvar lançamentos: new row violates row-level security policy for table 'transactions'" ao salvar extrato importado (`ImportacaoExtrato.tsx`) e lançamentos manuais (`LivroCaixa.tsx`).

**Diagnóstico (confirmado via MCP Supabase — `get_logs`, `execute_sql`, `pg_policies`):**
- A policy `transactions_insert_treasury` (e a análoga `import_history_insert_treasury`) já existia desde `0009_multi_tenant_churches.sql` e estava correta: `is_master() OR (has_role(['Admin','Tesoureiro']) AND church_id = current_church_id())`. Não era um caso de policy de INSERT ausente.
- O front dependia de enviar `church_id: undefined` (que o `JSON.stringify` do client Supabase omite do payload) para o `DEFAULT current_church_id()` da coluna resolver sozinho, e só enviava um valor explícito para o papel `master`. Reproduzido via SQL direto (`set local request.jwt.claim.sub = ...`) que **qualquer `church_id` explícito divergente do `current_church_id()` do usuário** (ex.: estado stale de `effectiveChurchId`, múltiplas abas, race condition) dispara exatamente essa mensagem de RLS — confirmando a causa raiz como a fragilidade desse contrato implícito front↔DEFAULT, não uma policy faltante.
- `get_advisors`/`pg_policies`/dados de `profiles`×`churches` no ambiente atual não mostraram nenhuma inconsistência de papel/igreja — o bug é de contrato entre camadas, reproduzível independente do estado dos dados.

**O que foi feito:**
- **`supabase/migrations/0012_transactions_church_id_trigger.sql`** (aplicada via MCP `apply_migration`): função `sync_church_id()` (`SECURITY DEFINER`) como trigger `BEFORE INSERT OR UPDATE` em `transactions` e `import_history` — força `NEW.church_id := current_church_id()` no servidor para qualquer papel que não seja `master`, **independente do que o client enviar**; para `master`, mantém o valor explícito escolhido na Sidebar, só validando que não veio nulo (`RAISE EXCEPTION` com mensagem clara em vez do erro genérico de RLS).
- **`src/pages/ImportacaoExtrato.tsx`** e **`src/pages/LivroCaixa.tsx`**: removida a lógica `profile.role === "master" ? effectiveChurchId : undefined` (e o comentário sobre depender do DEFAULT/omissão de campo) — `effectiveChurchId` (do `AppContext`) já resolve corretamente para **todos os papéis** (própria igreja para não-master, igreja em gestão para master), então os dois pontos de `insert` em `transactions`/`import_history` agora sempre enviam `church_id: effectiveChurchId` explicitamente.

**Decisões técnicas:**
- Trigger no banco em vez de só corrigir o front: a policy de RLS deixa de depender de o client omitir/acertar um campo — mesmo um bug futuro no front (ou um insert direto via API) não consegue mais gravar um `church_id` de outra igreja para quem não é master; o valor correto é sempre imposto no servidor antes do `WITH CHECK` ser avaliado.
- Validado com SQL direto (papel `Tesoureiro`, `set local request.jwt.claim.sub`): antes do fix, insert com `church_id` de outra igreja retornava `42501 new row violates row-level security policy`; depois do fix, o mesmo insert é aceito e o trigger substitui silenciosamente pelo `church_id` correto do usuário. Também validado o caso `master` sem igreja selecionada (retorna agora a mensagem clara "Selecione a igreja em gestão antes de salvar." em vez do erro genérico de RLS).
- `npx tsc --noEmit` e `npm run build` sem erros após a simplificação do front.

### [2026-07-26] Refactor de Extratos & Importações — regras de-para, categorias padronizadas e widgets

**O que foi pedido:** refactor completo da tela de Importação de Extrato (upload + chat de IA contábil): botão para limpar lançamentos carregados antes de salvar, regras de mapeamento (De-Para) salváveis por igreja com toggle "IA Autônoma"/"Modo Estrito", categorias contábeis padronizadas ao padrão de contabilidade de igreja, mensagens de loading do chat contextuais, cards de resumo + destaque visual para lançamentos de baixa confiança, e uma skill documentando as regras de negócio de categorização.

**O que foi feito:**
- **`supabase/migrations/0013_category_rules.sql`** (aplicada via MCP `apply_migration`): tabela `category_rules` (`church_id`, `keyword`, `type`, `category`, `unique(church_id, keyword)`), RLS no mesmo padrão de `transactions`/`import_history` (Admin/Tesoureiro escrevem, qualquer usuário ativo da igreja lê, master bypassa), trigger `sync_church_id_category_rules` (reaproveita `sync_church_id()` da `0012` — mesma classe de bug de RLS evitada de saída) e triggers de auditoria (`log_category_rule_insert/update/delete`, `action_key = 'edicao_manual'`). A mesma migration também renomeia `transactions.category` da taxonomia antiga (7 valores genéricos) para a nova (13 valores, ver abaixo) — precisou desabilitar temporariamente `sync_church_id_transactions` durante os `UPDATE`s, porque a migration roda sem sessão de usuário autenticado e o trigger zerava `church_id` (`current_church_id()` nulo sem `auth.uid()`).
- **`src/constants/accountingCategories.ts`** (novo): fonte única de `ENTRADA_CATEGORIES` (Dízimos, Ofertas Gerais, Ofertas Especiais/Missões, Campanhas/Eventos, Outras Entradas) e `SAIDA_CATEGORIES` (Sustento Pastoral / Prebenda, Utilidades, Manutenção de Templo, Ação Social / Auxílio, Material de Escola Dominical / Departamentos, Eventos / Conferências, Taxas Bancárias / Impostos, Despesas Administrativas) + `categoriesForType()`. Substitui as 3 listas antes duplicadas (`parse-statement/index.ts`, `LivroCaixa.tsx`, `mockData.ts`).
- **`supabase/functions/parse-statement/index.ts`**: passa a aceitar `applyMode` (`"ai" | "strict"`) e `churchId` no body de `extract`/`refine`. No Modo Estrito, busca `category_rules` da igreja (via `callerClient`, RLS já isola) e reprocessa os itens: regra batendo (correspondência por palavra-chave normalizada "contém") força `category`/`confidence: "alta"`; sem match, mantém a categoria da IA mas rebaixa a confiança um nível (`alta→media→baixa`) para forçar revisão. Deploy via MCP `deploy_edge_function` (v14).
- **`src/pages/LivroCaixa.tsx`**: usa `categoriesForType(formModal.type)` no select de categoria; ao trocar "Tipo" no formulário, a categoria é resetada para a primeira opção válida do novo tipo (antes as duas listas eram uma só, então nunca havia essa inconsistência).
- **Decomposição de `src/pages/ImportacaoExtrato.tsx`** (de ~775 linhas para orquestrador de estado): novos componentes `src/components/ConfirmModal.tsx` (modal de confirmação genérico, substitui a duplicação de markup entre aviso de duplicata/exclusão de histórico/novo confirm de limpar) e `src/components/importacao/{UploadDropzone,SummaryCards,TransactionsPreviewTable,AiChatPanel,CategoryRulesModal,ImportHistoryTable}.tsx`.
  - `TransactionsPreviewTable`: botão "Limpar Lançamentos" no header (visível com lançamentos carregados, confirma via `ConfirmModal`) e linhas com `confidence !== "alta"` destacadas em `bg-status-warning/10`.
  - `SummaryCards`: 4 cards acima da área de upload/preview — Total Entradas, Total Saídas, Saldo do Extrato, Pendentes de Revisão.
  - `AiChatPanel`: toggle "IA Autônoma"/"Modo Estrito" (persistido em `localStorage` por igreja, `categorization-mode:<church_id>`), botão "Gerenciar Regras", loading do chat trocado de "Ajustando lançamentos…" para "Consultando extrato…"; após um `refine` mudar a categoria de algum lançamento (comparado por posição+descrição, já que a API não preserva id entre chamadas), mostra um banner de sugestão com palavra-chave editável para salvar como regra padrão.
  - `CategoryRulesModal`: CRUD de `category_rules` direto via `supabase-js` (RLS protege), sem precisar passar pela Edge Function.
  - Loading do upload: "Lendo e categorizando lançamentos do PDF/Imagem…"; loading do botão de salvar: "Registrando lançamentos contábeis no banco de dados…".
- **`.claude/skills/contabilidade-rules/SKILL.md`** (novo): taxonomia de categorias, política de confiança, funcionamento das regras De-Para e do toggle IA Autônoma/Modo Estrito.
- **`docs/database.md`**: nova linha de `category_rules` na tabela de Tabelas, triggers de auditoria e `sync_church_id()` atualizados, descrição de `parse-statement` com `applyMode`/`churchId`.

**Decisões técnicas:**
- **Correspondência por palavra-chave "contém" (não igualdade exata)** e **Modo Estrito com fallback para a IA com confiança rebaixada** (não "nunca chama IA") — confirmado com o usuário antes de implementar: descrições de extrato bancário raramente são idênticas entre meses, e todo lançamento precisa sair categorizado mesmo sem regra correspondente.
- **Migração de dados de categoria antiga → nova** incluída na mesma migration (não deixada para depois): evita lançamentos já salvos ficarem com uma categoria que sumiu do dropdown/`CATEGORY_TONE`. Mapeamento 1:1 nos 6 primeiros casos; `"Outros"` mapeado condicionalmente por `type` (`"Outras Entradas"` para entrada, `"Despesas Administrativas"` para saída).
- **Sem heurística de classificação de intenção no chat** ("pergunta geral" vs "leitura de extrato"): o chat desta tela só tem um modo de chamada (`refine`, sempre sobre o extrato carregado), então inventar um classificador não pedido seria over-engineering — usa uma única mensagem contextual ("Consultando extrato…") para todo o loading do chat.
- **Diff de categoria por posição+descrição, não por id**, ao detectar mudanças para sugerir uma regra: a Edge Function sempre gera um `id` novo (`crypto.randomUUID()`) a cada `refine`, então não há id estável entre chamadas para comparar.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros/warnings novos). Teste end-to-end real (upload de extrato, Modo Estrito aplicando regra salva, salvar e conferir no Livro Caixa) não foi executado nesta sessão por falta de credenciais de teste.

### [2026-07-26] Fix: z-index do Toast atrás de modais + redesign do modal de Regras de Categorização

**O que foi pedido:** o container global de Toast (`src/components/Toast.tsx`) estava aparecendo atrás de modais/dialogs abertos; e o modal "Regras de Categorização (De-Para)" (`CategoryRulesModal.tsx`, introduzido no refactor de Importação de Extrato desta mesma sessão) precisava de um redesign mais espaçoso e organizado.

**O que foi feito:**
- **`src/components/Toast.tsx`**: `z-[90]` trocado para `z-[9999]` — acima de **todos** os `z-index` já usados no app (o maior antes disso era `z-[200]`, do `TermsAcceptanceModal`), garantindo que o toast sempre apareça por cima de qualquer modal/overlay/dropdown, inclusive modais aninhados (`z-[110]`).
- **`src/components/importacao/CategoryRulesModal.tsx`** redesenhado:
  - Cabeçalho com título "Regras de Categorização Automática (De-Para)", subtítulo explicativo e botão de fechar (`X`) com hover.
  - Seção "Adicionar Nova Regra" em card próprio (`bg-neutral-50`/`bg-neutral-950`, borda, padding maior): campo "Se a descrição contiver..." (input), "Tipo" (select compacto, necessário porque a lista de categorias é diferente por entrada/saída) e "Categorizar como..." (select), com o botão "Adicionar Regra" destacado (`bg-orla-blue`, full-width) abaixo dos campos.
  - Seção "Regras Cadastradas": cada regra agora é uma linha `[Termo Mapeado] ➔ [Categoria Atribuída]` com `Badge` de Entrada/Saída e um botão de excluir discreto (só ícone `Trash2`, sem borda, hover vermelho) — em vez da tabela crua anterior. Campo de busca (filtra por termo ou categoria) aparece automaticamente quando há mais de 5 regras salvas.
  - Área da lista fixada em `max-h-[300px] overflow-y-auto` (antes era `flex-1 min-h-0`, que dependia da altura do modal) — o formulário de adicionar fica sempre visível/fixo acima, só a lista rola.

**Decisões técnicas:**
- `z-[9999]` (não um valor "só um pouco maior", como `z-[210]`) porque o Toast é uma notificação transitória e global — deve vencer qualquer overlay futuro sem exigir lembrar de comparar valores toda vez que um novo modal for adicionado ao app.
- Mantido o select de "Tipo" no formulário de nova regra (não pedido explicitamente no redesign) porque as categorias são condicionadas ao tipo (`categoriesForType`, ver [`contabilidade-rules`](../.claude/skills/contabilidade-rules/SKILL.md)) — removê-lo quebraria a regra de negócio já estabelecida no refactor anterior.
- Busca só aparece com >5 regras: evita poluir a UI com um campo de filtro quando a lista é curta o suficiente para escanear visualmente.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros/warnings novos) e smoke test via `npm run dev` (Vite transforma os dois arquivos alterados sem erro). Teste visual real no navegador não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-26] Refactor completo de UI/UX, cores e filtros no Dashboard Executivo

**O que foi pedido:** adicionar filtro "Mensal" ao seletor de período (garantindo que todos os gráficos reajam a ele), padronizar as cores dos gráficos (entradas/saídas + paleta fixa por categoria) em todo o sistema, exibir rótulos de valor direto nos gráficos (sem depender de hover), permitir clicar em legendas/categorias para focar nos dados daquela seleção, e revisar os 4 gráficos da Análise Exploratória (Barras/Linhas/Área/Radar) quanto a cálculo correto, formatação monetária e ausência de quebra de layout.

**Bug encontrado durante a revisão (item 5a do pedido):** `SAIDA_CATEGORY_META` (`utils/metrics.ts`) ainda usava os **7 nomes antigos** de categoria ("Prebenda Pastoral", "Manutenção do Templo", "Ação Social", "Contas e Utilidades", "Administrativo") de antes do refactor de taxonomia contábil da sessão anterior — como `transactions.category` já grava os **novos** nomes (`src/constants/accountingCategories.ts`), o `byCategory.has(t.category)` nunca batia e **toda saída caía no bucket "Outros"** silenciosamente, tanto no gráfico de categorias quanto na Análise Exploratória. Corrigido como parte deste refactor (a nova paleta fixa já usa a taxonomia atual).

**O que foi feito:**
- **`tailwind.config.js`**: novo token semântico `flow.{entrada,saida}` (`#10b981`/`#ef4444`, emerald-500/red-500) — deliberadamente separado de `status.success`/`status.error` (usados em badges/toasts com semântica genérica de sucesso/erro) para não afetar nada fora dos gráficos.
- **`src/constants/chartColors.ts`** (novo): `FLOW_COLORS` (mesmos hex do token Tailwind, porque SVG usa `stroke`/`fill` inline) e um mapa fixo `category → cor` para as 8 categorias de saída (`Manutenção de Templo` → azul, `Utilidades` → amarelo, `Sustento Pastoral / Prebenda` → laranja, `Ação Social / Auxílio` → roxo, + 4 cores adicionais para as categorias restantes), com fallback cinza para qualquer valor fora da taxonomia padrão. Fonte única consumida por `utils/metrics.ts` — a mesma cor aparece no donut, nas linhas/barras/área/radar e nas legendas.
- **`src/utils/metrics.ts`**:
  - `Period` ganha `"mensal"` (`PERIOD_MONTHS.mensal = 1`) — reaproveitado automaticamente por `getPeriodRange`/`computePeriodComparison` (KPIs e donut já funcionam com o novo período sem código extra).
  - Nova `buildPeriodMetricsMeta(transactions, period, today)`: substitui a antiga `buildMetricsMeta(transactions, year)` (que sempre mostrava Jan-Dez do ano corrente, ignorando o filtro). Agora todos os gráficos usam a mesma janela do período selecionado: "mensal" agrega por **semana do mês corrente** (4-5 buckets); os demais períodos agregam por **mês**, numa janela rolante dos últimos N meses terminando no mês atual (mesma janela já usada pelos KPIs). Categorias sem nenhum lançamento no período são automaticamente excluídas da lista de métricas (em vez de aparecer como uma série zerada) — resolve o item 5c (sem quebra de layout).
  - Optei por **semana** em vez de dia para "mensal" (não dia-a-dia): um gráfico de radar com até 31 eixos (um por dia) ou barras/linhas com 31 rótulos de valor ficaria ilegível; 4-5 buckets mantêm todos os 4 modos de gráfico utilizáveis e os rótulos de valor legíveis.
- **`src/utils/chartBuilders.ts`**: as 4 funções (`buildStackedBars/buildLines/buildAreas/buildRadar`) passam a receber `labels: string[]` em vez de importar `MONTHS` fixo (agora funcionam com qualquer granularidade/tamanho de bucket); tooltip (`title`) trocado de `fmtK` (ex. "R$ 12k") para `fmtBRLFull` (formato completo "R$ 12.345,67", item 5b); nova flag `showLabel` por barra/marcador (`false` quando o valor é zero, ou quando a barra é baixa demais pra caber o texto) para o rótulo de valor não virar ruído visual.
- **`src/components/ExploratoryChart.tsx`**: recebe `labels` como prop; renderiza `<text>` com o valor (R$) diretamente em cima de cada barra/ponto/vértice do radar (item 3 — sem precisar de hover); clique na legenda agora **isola** a métrica clicada (mostra só ela) e clicar de novo na única selecionada **restaura a visão completa** (item 4), substituindo o toggle multi-seleção anterior — mais previsível e elimina o aviso "selecione ao menos 1 métrica" (nunca mais chega a zero selecionadas).
- **`src/pages/Dashboard.tsx`**:
  - "Mensal" adicionado ao seletor de período (`Mensal · Trimestral · Semestral · Anual`).
  - Gráfico "Entradas vs Saídas" reescrito para consumir a mesma `buildPeriodMetricsMeta` da Análise Exploratória (antes era fixo no ano calendário, ignorando o período) — título, eixo X e pontos agora reagem ao filtro. Cores trocadas dos hex soltos (`#0057ff`/`#ff5e40`, que nem batiam com a legenda em Tailwind) para `FLOW_COLORS` como fonte única. Legenda "Entradas"/"Saídas" agora clicável (isola uma série, clique de novo restaura as duas) e cada ponto não-zero mostra o valor em R$ acima/abaixo da linha.
  - Donut "Saídas por Categoria": cores agora vêm de `colorForCategory` (fixas, mesma paleta de todo o sistema); cada linha da legenda virou um botão clicável que "foca" a categoria — dessatura as demais fatias do gradiente e troca o centro do donut de "total" para o valor (R$) e % daquela categoria específica; valores em R$ (não só %) agora aparecem direto na legenda.
- **Escopo deliberadamente não alterado:** `CATEGORY_TONE`/`Badge` (usados em tabelas do Livro Caixa/Importação, não são "gráficos") ficaram fora da paleta fixa — o pedido fala em aplicar a paleta em "todos os gráficos do sistema", e badges de tabela são um componente de UI diferente, não um gráfico.

**Validação:** `npx tsc --noEmit`, `npm run build` e `npm run lint` sem erros/warnings novos; smoke test via `npm run dev` (todos os arquivos alterados transformam sem erro no Vite). Teste visual real no navegador (alternar os 4 períodos, clicar em legendas/categorias, conferir os 4 modos do gráfico exploratório) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-26] Fix: filtro de séries da Análise Exploratória volta a ser multi-select independente

**O que foi pedido:** o clique em uma pílula de série/categoria (`ExploratoryChart.tsx`, introduzido no refactor do Dashboard desta mesma sessão) estava "isolando" a série clicada e desmarcando todas as outras — impedindo combinar livremente 2+ séries (ex.: "Entradas Totais" + "Utilidades"). O comportamento correto é um toggle independente por pílula.

**O que foi feito:**
- **`src/components/ExploratoryChart.tsx`**: estado trocado de `selected: Record<string, boolean>` (com a lógica de isolar/restaurar) para `selectedSeries: Set<string>` — cada clique em uma pílula só adiciona/remove aquele próprio id do `Set` (`toggleSeries`), sem tocar nas demais séries selecionadas. O `useEffect` que sincroniza com mudanças em `metrics` (troca de período) foi reescrito para o mesmo modelo: preserva o que já estava selecionado, adiciona ids novos como selecionados por padrão, descarta ids que não existem mais.
- Adicionados os botões auxiliares "Selecionar Todas" e "Limpar Seleção" ao lado das pílulas, separados por um divisor vertical.
- Estado visual da pílula mantido (colorida + ícone de check quando ativa; cinza/neutra quando inativa) — só a semântica do clique mudou.
- Como agora é possível chegar a **zero** séries selecionadas (não existe mais a trava de "sempre isolar pelo menos uma"), a mensagem do estado vazio passou a diferenciar os dois casos: "Nenhuma série selecionada" (quando `selectedSeries` está vazio) vs. "Sem lançamentos suficientes neste período" (quando há séries selecionadas mas todas zeradas).

**Decisões técnicas:**
- `Set<string>` em vez de `Record<string, boolean>`: pedido explicitamente pelo usuário ("um Array ou Set com as chaves/IDs ativas") — também deixa `toggleSeries`/`selectAll`/`clearAll` mais diretos (`has`/`add`/`delete` em vez de espalhar um objeto inteiro a cada clique).
- Sem trava de "mínimo 1 selecionada": o pedido é explícito sobre toggle independente e não menciona essa restrição; o estado vazio já tem uma mensagem própria em vez de simplesmente não renderizar nada.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros/warnings novos) e smoke test via `npm run dev`. Teste visual real (combinar 2+ séries, usar Selecionar Todas/Limpar Seleção) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-26] Merge para `main` e Release v1.3.0

**O que foi feito:**
- `hmg` estava desatualizada em relação a `main` (faltavam os últimos 4 merges) — sincronizada via fast-forward (`git merge main --ff-only`) antes de commitar o trabalho desta sessão, para não perder histórico.
- Commit único em `hmg` (`1839fd3`) reunindo todo o trabalho da sessão: refactor de Extratos & Importação (regras de-para/De-Para, Modo Estrito, categorias padronizadas), refactor do Dashboard (filtro Mensal, cores fixas, data labels, interatividade), fix do z-index do Toast e redesign do modal de Regras de Categorização — ver entradas anteriores deste changelog para o detalhe técnico de cada parte.
- Merge (`--no-ff`) de `hmg` em `main` (commit `0839f0c`), validado com `npx tsc --noEmit`/`npm run build` limpos em `main` antes do push.
- Tag anotada `v1.3.0` criada sobre `main` e Release publicado no GitHub (`gh release create`, notas curadas em linguagem de usuário final, não o changelog técnico bruto).

**Decisões técnicas:**
- Versão `v1.3.0` (MINOR, SemVer): a sessão inclui funcionalidades novas retrocompatíveis (regras de-para, Modo Estrito, filtro Mensal), não só correções — não justifica MAJOR (sem breaking change de API/schema para quem já usa o sistema) nem se limita a PATCH.
- Notas da release escritas separadamente do changelog técnico (arquivo à parte usado só como `--notes-file`, não commitado): o changelog documenta decisões técnicas para quem mantém o código, a release fala com quem usa o produto — os dois públicos e formatos são diferentes o suficiente para não reaproveitar um como o outro diretamente.

**Validação:** release publicada em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/tag/v1.3.0`.

### [2026-07-26] Padronização do cabeçalho/filtros da Trilha de Auditoria com o Livro Caixa

**O que foi pedido:** a tela de Auditoria tinha um seletor de mês/ano diferente do Livro Caixa (setas `<`/`>` + um `<select>` de mês redundante ao lado, em vez do popover de calendário), e o card "Total de Eventos no Mês" não refletia os filtros de ação/usuário/busca já aplicados — só o mês.

**O que foi feito:**
- **`src/components/MonthYearPicker.tsx`** (novo): extraído o componente de navegação Mês/Ano que já existia embutido em `LivroCaixa.tsx` (botão `<` + rótulo com ícone de calendário abrindo popover de ano/mês + botão `>`) — agora é o mesmo componente reutilizado nas duas telas, não uma cópia visual.
- **`src/pages/LivroCaixa.tsx`**: troca o bloco de ~60 linhas de popover por `<MonthYearPicker year={year} month={month} onChange={...} />`; `goPrevMonth`/`goNextMonth`/`periodPickerOpen` (agora internos ao componente) removidos daqui.
- **`src/pages/Auditoria.tsx`**:
  - Removido o `<select>` de mês redundante ao lado das setas; troca pelo mesmo `MonthYearPicker`, na mesma estrutura de linha (`flex items-center justify-between gap-4 flex-wrap mb-4`, picker à esquerda + botão de exportar à direita) já usada no Livro Caixa.
  - `kpiTotal`/`kpiIa`/`kpiManual`/`kpiEstorno` passam a derivar de `filtered` (já filtrado por ação + usuário + busca), não de `logs` (só filtrado por mês) — os 4 cards agora batem com o que está de fato listado na tabela, não só com o mês.
  - Padding do input de busca ajustado de `py-2` para `py-2.5`, igual ao input do Livro Caixa.
  - Busca por mês continua vindo direto do Supabase por período (`gte`/`lt` em `occurred_at`, já existia) — trocar de mês pelo novo picker aciona o mesmo `useEffect` de sempre, sem mudança de comportamento aí.

**Decisões técnicas:**
- Extração em componente (não só copiar o JSX): o pedido diz explicitamente "utilize o MESMO componente" — copiar o markup manteria duas cópias divergindo com o tempo; um componente compartilhado é a única forma de garantir que as duas telas naveguem por período de forma idêntica no futuro também.
- Pílulas de ação (`ACTION_FILTERS`) e os selects de usuário/igreja (Master) mantidos como estavam — o pedido não menciona removê-los, e eles já seguiam o mesmo padrão visual de pílula/select usado no resto do app.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros/warnings novos) e smoke test via `npm run dev`. Teste visual real (abrir o popover, navegar meses, combinar filtro de ação com busca) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-26] Merge para `main` e Release v1.3.1

**O que foi feito:**
- Merge (`--no-ff`) de `hmg` em `main` (commit `eb785d3`), levando a padronização do filtro de Mês/Ano da Trilha de Auditoria com o Livro Caixa (`MonthYearPicker` compartilhado + correção dos cards de KPI) — validado com `npx tsc --noEmit`/`npm run build` limpos em `main` antes do push.
- Tag anotada `v1.3.1` criada sobre `main` e Release publicado no GitHub (`gh release create`), notas em linguagem de usuário final.

**Decisões técnicas:**
- Versão `v1.3.1` (PATCH, SemVer): a mudança é padronização visual/UX + correção de um cálculo de KPI que não refletia os filtros — nenhuma funcionalidade nova foi adicionada, então não justifica MINOR.

### [2026-07-27] Fluxo de "Esqueceu a senha?" (recuperação de senha via Supabase Auth)

**O que foi pedido:** ligar o link morto "Esqueceu a senha?" da tela de Login a um fluxo completo de recuperação de senha usando `supabase.auth.resetPasswordForEmail` + `updateUser`.

**O que foi feito:**
- **`src/components/ForgotPasswordModal.tsx`** (novo): modal (mesmo padrão visual do `ConfirmModal`) com campo de e-mail; no submit chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })` e, independente do e-mail existir ou não na base, mostra a mesma mensagem de sucesso ("Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.") — evita enumeração de e-mails cadastrados. Erro de envio mostra um banner inline (`bg-status-error/10`), mesmo padrão do Login/ResetPassword.
- **`src/pages/Login.tsx`**: o link `<a href="#">Esqueceu a senha?</a>` foi trocado por um `<button>` que abre o `ForgotPasswordModal` (estado local `showForgotPasswordModal`).
- A tela de confirmação de nova senha (`/reset-password` → `src/pages/ResetPassword.tsx`) **já existia e já implementava** o restante do pedido — captura da sessão temporária de recovery (`onAuthStateChange` + `getSession()`), campos "Nova Senha"/"Confirmar Nova Senha" com botão de olhinho, validação de senhas iguais, `updateUser({ password })`, `signOut()` e redirecionamento para `/login` — não foi necessário criar nada novo aqui, só o passo anterior (solicitação do e-mail) estava faltando.

**Decisões técnicas:**
- Nenhum toast global foi usado no `ForgotPasswordModal`: o `<Toast />` do `AppContext` só é montado dentro de `Layout` (árvore protegida) — `Login.tsx` fica fora dela. Mensagens de sucesso/erro seguem o mesmo padrão inline já usado em `Login.tsx`/`ResetPassword.tsx` (banners `bg-status-success/10`/`bg-status-error/10`), mantendo a mesma linguagem visual do restante do fluxo de autenticação.
- Validação de senha mínima **não foi alterada para 6 caracteres** como pedido originalmente — o padrão de 8 caracteres já é aplicado de forma consistente em todo o app (`ResetPassword.tsx`, `ProfileSettingsModal.tsx`, `ChurchDetailsModal.tsx`, `Usuarios.tsx`); reduzir só neste fluxo criaria uma inconsistência de segurança entre telas de troca de senha.
- `redirectTo` usa `window.location.origin` (não hardcoded) para funcionar tanto em produção quanto nos previews de `hmg` na Vercel — assume que a URL de callback (`/reset-password`) já está na allowlist de Redirect URLs do Supabase Auth, o que já era necessário para o fluxo de recovery pré-existente funcionar.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real do fluxo ponta a ponta (enviar e-mail, abrir link, trocar senha) não foi executado nesta sessão por falta de ambiente com browser automatizável e caixa de e-mail real.

**Validação:** release publicada em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/tag/v1.3.1`.

### [2026-07-27] Adição da skill `frontend-design`

**O que foi feito:**
- Skill `frontend-design` (repositório `anthropics/skills`) instalada em `.agents/skills/frontend-design/` (`SKILL.md` + `LICENSE.txt`) e registrada em `skills-lock.json` (fonte GitHub, hash calculado).
- Commit direto em `hmg` (`0174580`) e push para `origin/hmg`.

**Decisões técnicas:**
- Apenas adição de arquivos de skill/configuração — sem impacto em código da aplicação, então não houve necessidade de rodar `npx tsc --noEmit`/`npm run build`.

**Validação:** `git push origin hmg` concluído sem erros.

### [2026-07-27] Merge para `main` e Release v1.4.0

**O que foi feito:**
- Merge (`--no-ff`) de `hmg` em `main` (commit `98366e9`), levando o fluxo de recuperação de senha (`ForgotPasswordModal` + link "Esqueceu a senha?" funcional) e a skill `frontend-design` — validado com `npx tsc --noEmit`/`npm run build` limpos em `main` antes do push.
- Tag anotada `v1.4.0` criada sobre `main` e Release publicado no GitHub (`gh release create`), notas em linguagem de usuário final (funcionalidade de recuperação de senha + nota de segurança sobre a mensagem neutra de sucesso).

**Decisões técnicas:**
- Versão `v1.4.0` (MINOR, SemVer): a mudança introduz uma funcionalidade nova e retrocompatível (recuperação de senha) — não é apenas correção/ajuste visual (não justifica PATCH) e não quebra nenhum contrato existente (não justifica MAJOR).

**Validação:** release publicada em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/tag/v1.4.0`.

### [2026-07-27] Move o toggle de tema do Dashboard para o menu lateral (Sidebar)

**O que foi pedido:** o botão de alternância de tema (`ThemeToggle`) estava fixo no topo do Dashboard, poluindo uma tela que deveria focar só em métricas; movê-lo para um local mais global, acessível de qualquer tela.

**O que foi feito:**
- **`src/pages/Dashboard.tsx`**: removido o `<ThemeToggle />` (e o import correspondente) do topo da tela.
- **`src/components/Sidebar.tsx`**: nenhuma mudança necessária — o popover de perfil (aberto ao clicar no avatar/nome no rodapé da Sidebar) **já tinha** o item "Alternar Tema Claro/Escuro" (ícone Sol/Lua, chamando o mesmo `toggleTheme` do `AppContext`), adicionado em sessão anterior. Item 2 do pedido já estava implementado.
- `ThemeToggle.tsx` (componente em si) não foi removido do projeto — continua em uso em `Login.tsx` e `ResetPassword.tsx`, telas públicas que ficam fora da árvore do `Layout`/`Sidebar` e por isso ainda precisam de um controle de tema próprio.

**Decisões técnicas:**
- `CLAUDE.md` raiz **não foi alterado** para registrar este detalhe de implementação, apesar do pedido explícito — a própria regra de auto-documentação definida nele restringe o que motiva uma edição desse arquivo a mudanças na diretriz essencial (comandos, a própria regra de auto-documentação, índice), não a onde um componente específico está renderizado; esse tipo de decisão é exatamente o que o changelog existe para registrar, então ficou só aqui.
- Persistência de tema não foi alterada: `theme` em `AppContext.tsx` já era (antes e depois desta mudança) um estado em memória, sem `localStorage` — sobrevive a navegação entre rotas dentro da mesma sessão, mas volta para o padrão (`dark`) num F5/nova aba. Mover o gatilho de UI não altera esse comportamento; adicionar persistência entre reloads não fazia parte do pedido.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real (abrir o popover de perfil, alternar tema, confirmar que o Dashboard não exibe mais nenhum botão de tema) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-27] Ajuste fino de contraste/legibilidade do Modo Claro (sem tocar `dark:*`)

**O que foi pedido:** o Modo Claro tinha textos secundários e bordas "apagados" (baixo contraste) — pedido para escurecer textos/bordas do light mode usando tons de alto contraste (equivalente a `slate-900`/`slate-600`/`slate-200` do Tailwind), sem alterar nenhuma classe `dark:*`.

**O que foi feito:**
- **Causa raiz:** a paleta `neutral` deste projeto é customizada em `tailwind.config.js` (não é a `neutral`/`gray`/`slate` padrão do Tailwind) — `neutral-500` (`#aeaeb2`) e `neutral-400` (`#d7dce0`) são muito claros para uso como cor de texto (contraste ~2:1–2:3:1 contra branco, bem abaixo do mínimo de 4.5:1 do WCAG AA), enquanto `neutral-700` (`#474747`) é o tom que efetivamente corresponde ao nível de escurecimento pedido (equivalente a `slate-600`/`gray-600` do Tailwind padrão, que são bem mais escuros do que os números sugerem por comparação direta de dígito).
- Varredura em todo `src/**/*.tsx` (30 arquivos) trocando, **somente na classe sem prefixo** (a que comanda o Modo Claro): `text-neutral-500`/`text-neutral-400`/`text-neutral-600` → `text-neutral-700` (texto secundário/legendas/rótulos/células de tabela) e `border-neutral-200` → `border-neutral-300` (bordas de cards, tabelas, modais, divisores) — em todo par já existente como `text-neutral-500 dark:text-neutral-400` a classe `dark:*` foi preservada byte a byte.
- Casos sem par `dark:*` explícito (a classe era usada igual nos dois temas, ex.: cabeçalhos de tabela, KPIs, mensagens de estado vazio, botões de fechar `×`) — em vez de só troca simples, foi **adicionado** um `dark:text-neutral-400` fixo ao lado do novo `text-neutral-700`, fixando o Modo Escuro exatamente como já renderizava antes (a classe sem prefixo, que valia pros dois temas, agora vale só para o Claro).
- **Exceção deliberada:** ícones puramente decorativos (`Mail`/`Lock`/`Search`/`CalendarDays`/`Upload`/`ArrowRight` usados como acento ao lado de labels/inputs já escuros) foram mantidos em `text-neutral-400` nos dois temas — não são texto de leitura, e escurecê-los pesaria visualmente o design sem ganho de acessibilidade real (ícone decorativo ao lado de texto já legível é isento da regra de contraste do WCAG).
- Botões/ícones funcionais (fechar modal `×`, alternar visibilidade de senha, excluir regra) que usavam `text-neutral-400` sem nenhum par `dark:*` **foram incluídos** no ajuste (ficaram quase invisíveis no Modo Claro) — mesmo tratamento de "fixar dark, escurecer claro" acima.
- Não foram alterados os valores hexadecimais da paleta `neutral` em `tailwind.config.js` — trocar os hex mudaria os dois temas ao mesmo tempo (o Modo Escuro reusa exatamente os mesmos tokens numéricos via `dark:*`); o ajuste é só em qual token cada classe referencia.

**Decisões técnicas:**
- Optou-se por continuar usando a paleta `neutral` já customizada do projeto (não introduzir `slate`/`gray` como família nova de cor) — os tons pedidos (`slate-900`/`slate-600`/`slate-200`) já têm equivalente direto dentro da própria escala `neutral` deste projeto (`900`/`700`/`300` respectivamente); misturar duas famias de cinza no mesmo design system criaria inconsistência sem necessidade.
- `bg-white`/`bg-neutral-50` como fundo de telas/cards não precisou de ajuste — já é o padrão em todo o app (`Card.tsx`, `Layout.tsx`, `Sidebar.tsx`) e `neutral-50` (`#fbfcf6`) já é um branco quase puro, equivalente ao `slate-50`/`gray-50` pedido.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) e um diff completo revisado à mão confirmando que nenhuma classe `dark:*` foi alterada. Teste visual real (percorrer Sidebar, tabelas, cards do Dashboard, modais e botões no Modo Claro e comparar com o Modo Escuro) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-27] Fecha o popover de perfil/logout da Sidebar ao clicar fora

**O que foi pedido:** o popover de perfil/configurações/logout no rodapé da `Sidebar.tsx` só fechava clicando de novo no próprio gatilho (avatar/nome) — pedido para fechar também ao clicar em qualquer lugar fora do popover.

**O que foi feito:**
- **`src/components/Sidebar.tsx`**: adicionados `profileMenuRef` (no `<div>` do popover) e `profileTriggerRef` (no `<div>` clicável do avatar/nome que abre/fecha o popover).
- `useEffect` que, só enquanto `showProfileMenu` é `true`, registra um listener `mousedown` em `document`: se o alvo do clique não está dentro do popover nem do gatilho (`ref.current.contains(target)`), fecha o popover (`setShowProfileMenu(false)`). O listener é removido no cleanup do `useEffect` (e reavaliado a cada mudança de `showProfileMenu`), então não fica registrado à toa enquanto o popover está fechado.

**Decisões técnicas:**
- Listener condicionado a `showProfileMenu` (early return + dependência no array do `useEffect`) em vez de registrar um único listener global no mount do componente — evita rodar a checagem de `contains()` em todo clique da aplicação quando o popover nem está aberto.
- `mousedown` (não `click`) para consistência com o padrão já usado no backdrop mobile da própria Sidebar (`onClick={closeMobileNav}` no overlay) e para fechar o quanto antes no gesto de clique, sem esperar o `click` completo disparar depois de um possível `mouseup` fora do elemento.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real (abrir o popover, clicar fora, confirmar que fecha; clicar dentro do popover e nos seus botões, confirmar que não fecha precocemente) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-28] Persistência da preferência de Tema (Claro/Escuro) no Supabase

**O que foi pedido:** o tema (claro/escuro) só vivia em memória (`AppContext`) — pedido para persistir em `profiles.theme` no Supabase, carregado no login e sincronizado entre dispositivos, sem "piscar" a tela antes de aplicar o tema certo.

**O que foi feito:**
- **Migration `0014_add_theme_preference_to_profiles.sql`** (aplicada via MCP `apply_migration`, backfill automático via `DEFAULT` para as 7 linhas já existentes): coluna `profiles.theme text not null default 'dark' check (theme in ('light','dark'))`.
- **RPC `update_own_theme(new_theme)`** (`SECURITY DEFINER`, mesmo padrão de `update_own_profile`): valida `new_theme` e faz `update profiles set theme = new_theme where id = auth.uid()`. Necessária porque `profiles` **não tem policy de `UPDATE`** — um `supabase.from('profiles').update(...)` direto do client (como pedido originalmente) seria bloqueado pela RLS; abrir uma policy de `UPDATE` genérica (`id = auth.uid()`) teria sido pior — deixaria o próprio usuário reescrever `role`/`status`/`church_id` da própria linha via uma chamada REST manual, já que RLS não filtra por coluna.
- **`src/types/index.ts`**: `ChurchUser.theme?: "light" | "dark"`. **`src/context/AuthContext.tsx`**: `fetchProfile` passa a buscar a coluna `theme`.
- **`src/context/AppContext.tsx`**: estado `theme` agora inicializa lendo um cache em `localStorage` (`theme_preference`) em vez de sempre `"dark"` fixo; um `useEffect` com dependência só em `profile?.id` adota `profile.theme` (Supabase) assim que o profile da sessão carrega — dispara uma vez por login, não em todo `refreshProfile()`, para não sobrescrever um toggle manual feito depois. `toggleTheme` passou a, além de trocar o estado local, gravar o novo valor no cache local e chamar `supabase.rpc('update_own_theme', { new_theme })` de forma fire-and-forget (erro só vai pro console, nunca bloqueia a troca visual nem trava a UI esperando a rede).
- **`src/App.tsx`**: `ThemeRoot` troca `useEffect` por `useLayoutEffect` ao aplicar a classe `dark` no `<html>` — roda antes do browser pintar o frame, então quando o `theme` muda (ex.: sync do profile após o primeiro render) não há um frame visível com o tema errado.

**Decisões técnicas:**
- Persistência centralizada em `toggleTheme` (dentro do `AppContext`), não duplicada em cada componente que dispara a troca — tanto o botão da Sidebar quanto o `ThemeToggle.tsx` (usado em `Login`/`ResetPassword`, onde não há sessão) chamam a mesma função; nas telas públicas `session?.user.id` é `undefined` e a chamada ao Supabase simplesmente não dispara, sem necessidade de guarda extra em cada tela.
- Cache em `localStorage` mantido como complemento, não substituto, do Supabase: evita o "flash" de tema errado em visitas seguintes no mesmo aparelho *antes* do profile carregar, mas o Supabase é sempre a fonte da verdade — o cache é sobrescrito assim que `profile.theme` chega, inclusive se o usuário trocou de tema em outro dispositivo.
- Efeito de sync com dependência só em `profile?.id` (não em `profile.theme`/`profile` inteiro) — garante que o valor do Supabase é adotado uma vez por login e nunca reaplicado por cima de um toggle manual feito na mesma sessão (ex.: uma chamada a `refreshProfile()` em outra tela, que não deveria "puxar" o tema de volta).
- Troca de tema não gera entrada em `audit_logs` (diferente de `update_own_profile`, que loga nome/e-mail) — é uma preferência de UI de baixo risco, sem valor de governança, e nenhum dos `action_key` existentes (`categorizacao_ia`, `edicao_manual`, `aprovacao_caixa`, `estorno`, `acesso`, `aceite_termos`) se aplica sem forçar um encaixe artificial.
- `get_advisors` (security) confirma que `update_own_theme` gera os mesmos dois avisos `WARN` (`anon`/`authenticated` podem executar a função `SECURITY DEFINER`) que já existem para `update_own_profile` — aceitável pelo mesmo motivo: para um caller anônimo `auth.uid()` é `null`, então o `UPDATE` afeta zero linhas (no-op inofensivo).
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros), migration aplicada e conferida via `execute_sql` (coluna criada, função criada, backfill correto nas 7 linhas existentes). Teste visual real (login em dois dispositivos/navegadores diferentes, confirmar sincronização; medir ausência de flash) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-28] Merge para `main` e Release v1.5.0

**O que foi feito:**
- Commit único em `hmg` (`01112bf`) reunindo todo o trabalho da sessão: toggle de tema movido do Dashboard para o popover de perfil da Sidebar, popover fechando ao clicar fora, persistência da preferência de tema no Supabase (`profiles.theme` + RPC `update_own_theme`) e ajuste de contraste do Modo Claro em toda a aplicação — ver entradas anteriores deste changelog para o detalhe técnico de cada parte.
- Merge (`--no-ff`) de `hmg` em `main` (commit `41a3054`), validado com `npx tsc --noEmit`/`npm run build` limpos em `main` antes do push.
- Tag anotada `v1.5.0` criada sobre `main` e Release publicado no GitHub (`gh release create`), notas em linguagem de usuário final.

**Decisões técnicas:**
- Versão `v1.5.0` (MINOR, SemVer): a sessão inclui uma funcionalidade nova retrocompatível (persistência de tema entre dispositivos via Supabase), além de correções/ajustes (popover, contraste) — não se limita a PATCH e não há nenhum breaking change de schema/API para quem já usa o sistema (a migration só adiciona coluna com `DEFAULT`).
- Trabalho da sessão foi commitado em um único commit em `hmg` em vez de granularizado por feature — as quatro mudanças (mover toggle, corrigir popover, persistir tema, ajustar contraste) tocaram os mesmos arquivos em sequência dentro da mesma sessão, sem checkpoints intermediários separados; separar a posteriori via `git add -p` teria custo alto e risco de deixar algum estado intermediário sem compilar no meio do histórico.

**Validação:** release publicada em `https://github.com/alessandrosaldanha/saas-contabilidade-igrejas/releases/tag/v1.5.0`.

### [2026-07-31] Planos de Assinatura, Autocadastro de Igreja e Governança de Pagamentos (Pix manual)

**O que foi pedido:** implementar o modelo comercial completo da plataforma — 3 planos (Free/Igreja Local/Presbitério), autocadastro de nova igreja sem depender de convite de Admin, checkout via Pix manual (chave Pix + comprovante por WhatsApp + aprovação no Painel Master) e travas de limite de uso (leituras de IA/mês, PDFs/mês, nº de igrejas) na Importação e no Livro Caixa.

**O que foi feito:**
- **Migrations `0015`–`0017`** (aplicadas via MCP `apply_migration`): tabelas `plans` (seed fixo dos 3 planos), `usage_counters` (contador mensal por igreja, `unique(church_id, month_year)`) e `payment_requests` (solicitação de troca de plano); `churches.plan_id` (default = plano Free via nova função `default_free_plan_id()`) e `churches.subscription_status`. RPCs novas: `complete_self_signup`, `increment_usage_counter`, `admin_approve_payment_request`/`admin_reject_payment_request`, `request_subscription_change`. A constraint `profiles_church_id_master_check` foi relaxada para admitir `church_id` nulo logo após o autocadastro (janela entre `handle_new_user()` criar o profile e `complete_self_signup()` criar a igreja). Nova policy `churches_select_own` (só `SELECT`; `UPDATE` continua exclusivo do `master`) para o próprio usuário enxergar sua igreja e suas filhas diretas — ver `database.md` para o detalhe de cada função/policy.
- **Autocadastro:** `src/components/SignupForm.tsx` (alternado com o login em `src/pages/Login.tsx`, sem rota nova) — coleta nome do responsável, e-mail, senha e nome da igreja; encadeia `supabase.auth.signUp()` (role `Admin`, sem `church_id`) → RPC `complete_self_signup` (cria a igreja no plano Free, vincula o profile, ativa o status) → `touch_last_access` → redireciona para o Dashboard. Trata o caso de o projeto exigir confirmação de e-mail (sem sessão após `signUp()`) mostrando aviso em vez de tentar prosseguir sem `auth.uid()`.
- **Planos e checkout:** `src/components/PricingPlans.tsx` (3 cards + toggle Mensal/Anual, reaproveitado por `src/pages/Planos.tsx` — nova rota `/planos`, todos os papéis de igreja — e por `src/components/PricingModal.tsx`, aberto nos pontos de bloqueio). `src/components/PixPaymentModal.tsx`: chave Pix + placeholder de QR Code, link `wa.me` com mensagem pré-preenchida (igreja/plano), e botão "Já fiz o Pix / Notificar Admin" (RPC `request_subscription_change`).
- **Governança:** `src/pages/Governanca.tsx` ganhou abas — "Igrejas" (agora com seletor de Plano por linha, salvando direto em `churches.plan_id`) e "Solicitações de Assinatura (Pix)" (`src/components/PaymentRequestsPanel.tsx`, lista `payment_requests` pendentes e aprova/rejeita via RPC).
- **Travas de uso:** `src/hooks/usePlanLimits.ts` — resolve plano + uso do mês corrente e expõe `canUseAI()`/`canDownloadPDF()`/`canAddChurch()` + `registerAIUsage()`/`registerPDFUsage()`. Plugado em `ImportacaoExtrato.tsx` (nos dois pontos que chamam a Edge Function `parse-statement` — upload inicial e refino via chat) e em `LivroCaixa.tsx` (botão "Exportar PDF"), abrindo o `PricingModal` quando a cota do plano é excedida.
- **`src/types/index.ts`:** `Plan`, `UsageCounter`, `PaymentRequest`, `Church.planId`/`subscriptionStatus`.

**Decisões técnicas:**
- **Autocadastro em duas etapas (não um único INSERT):** a igreja não pode ser criada antes do usuário existir (RLS de `churches` sempre exigiu `master`), mas o profile também não pode ser criado sem igreja pelas regras de RBAC vigentes — a saída foi deixar o profile nascer com `church_id` nulo (só nessa janela, com uma constraint dedicada permitindo isso) e uma RPC `SECURITY DEFINER` separada, chamada já autenticada, cria a igreja e fecha o vínculo. Alternativa descartada: liberar `INSERT` em `churches` para `anon`/`authenticated` — abriria a tabela para criação anônima de igrejas "órfãs" sem controle algum.
- **Endereço da igreja não é coletado no autocadastro** (só nome) — os campos `NOT NULL` de endereço em `churches` são preenchidos com string vazia por `complete_self_signup` e completados depois pelo Master em Governança. Optou-se por isso em vez de tornar as colunas `NULL`-áveis para não alterar o contrato de `ChurchCreateModal`/`ChurchDetailsModal`, que já validam endereço completo antes de salvar.
- **`request_subscription_change`/`admin_approve_payment_request`/`admin_reject_payment_request` como RPC, não `UPDATE` direto do client:** `churches` só tem policy de `UPDATE` para `master` — Admin/Tesoureiro solicitando um Pix precisa marcar a própria igreja como `pending_approval` sem ganhar permissão geral de escrita em `churches`; a RPC `SECURITY DEFINER` faz exatamente essa exceção pontual, auditável e sem abrir a tabela.
- **Contagem de uso via `usage_counters` (tabela própria, não coluna em `churches`)** — soma incremental por `(church_id, month_year)` via `ON CONFLICT ... DO UPDATE`, evitando qualquer necessidade de zerar contadores manualmente todo mês (o mês seguinte simplesmente cria uma linha nova no primeiro uso).
- **`get_advisors` (security):** as novas funções `SECURITY DEFINER` aparecem nos mesmos avisos `WARN` (`anon`/`authenticated` podem executar) já presentes em toda função `SECURITY DEFINER` pré-existente do projeto — aceitável pelo mesmo motivo de sempre: cada uma valida `auth.uid()`/`is_master()`/`has_role()` internamente antes de qualquer efeito.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; apenas os warnings pré-existentes de `react-refresh`/`react-hooks`, não relacionados a esta sessão). Teste visual real (fluxo de cadastro ponta a ponta, checkout Pix, aprovação em Governança, bloqueio de limite) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-31] Correção crítica do autocadastro (dead-end de confirmação de e-mail) + Página de Detalhes da Igreja com hierarquia de subcongregações

**O que foi pedido:** corrigir o fluxo de cadastro (achado em produção: um usuário real ficou com o cadastro travado), ajustar o alinhamento do formulário de senha/confirmar senha do `SignupForm`, e transformar o antigo modal de Detalhes da Igreja numa página dedicada com RBAC (Admin edita a própria igreja, Master edita qualquer uma) e suporte a igrejas filhas/subcongregações, com paginação de 5 itens nas tabelas de membros e filhas.

**Causa raiz do bug crítico:** este projeto do Supabase Auth **exige confirmação de e-mail** — `supabase.auth.signUp()` não retorna sessão até o link ser confirmado. O `SignupForm` da sessão anterior já previa esse caso (tela "Verifique seu e-mail"), mas a criação da igreja (RPC `complete_self_signup`) só era chamada ali mesmo, imediatamente após o `signUp()` — nunca mais era tentada depois. Resultado: o usuário confirmava o e-mail, tentava logar, e caía num dead-end (profile existe com `church_id` nulo → `is_active()` retorna `false` → RLS esconde o próprio profile → `AuthContext.signIn()` interpreta como conta inativa e desloga). Confirmado via `execute_sql`: um usuário real (`julio123@gmail.com`, profile "Julio Machado") ficou nesse estado — igreja nunca foi criada porque o nome dela nunca chegou a ser persistido em lugar nenhum acessível após a falha. **Esse registro específico não foi corrigido automaticamente** (não há como recuperar o nome da igreja que a pessoa pretendia cadastrar) — para destravar, a pessoa precisa se cadastrar de novo, ou o Master pode convidá-la manualmente para uma igreja existente via Governança.

**O que foi feito:**
- **Migration `0018_church_hierarchy_self_service.sql`:** `complete_self_signup(text)` foi substituída por `complete_pending_church_signup()` — sem parâmetro, lê o `church_name` do próprio `user_metadata` (agora também gravado no `signUp()`), e é chamada de forma idempotente (no-op se `church_id` já existe) tanto pelo `SignupForm` quanto por `AuthContext.signIn()` a cada login — é esse segundo ponto que fecha o dead-end: a igreja passa a ser criada no primeiro login pós-confirmação, não só na janela imediatamente após o cadastro.
- **`src/context/AuthContext.tsx`:** `signIn()` agora chama `complete_pending_church_signup` logo após `signInWithPassword`, antes de `fetchProfile`.
- **`src/components/SignupForm.tsx`:** `signUp()` passa a incluir `church_name` no `user_metadata`; chamadas de `supabase.auth.signUp`/RPC logam o erro completo no console (`console.error`) além de mostrar mensagem na tela; layout do bloco Senha/Confirmar Senha corrigido (`w-full box-border` em todos os wrappers, e `sm:w-0 sm:flex-1` nas colunas em vez de só `flex-1`, para as duas ficarem sempre exatamente do mesmo tamanho e a linha nunca ultrapassar a largura do card).
- **Página `src/pages/ChurchDetails.tsx`** (nova, substitui `ChurchDetailsModal.tsx`, removido): rotas `/detalhes-igreja` (resolve a própria igreja via `effectiveChurchId` — item novo "Detalhes da Igreja" na Sidebar, todos os papéis de igreja) e `/detalhes-igreja/:churchId` (Master navega aqui a partir do botão "Detalhes" em Governança, que não abre mais modal). RBAC: `master` edita qualquer igreja; `Admin` só edita a própria igreja ou uma filha direta dela (`canEdit`); membros paginados 5/página (`Pagination` já existente, reaproveitado) com troca de role/status (`admin_update_user_role`/`admin_set_user_status`); seção "Igrejas Filhas/Subcongregações" paginada 5/página, com botão "Adicionar Igreja Filha" (`AddChildChurchModal.tsx`, novo) e navegação para a página de detalhes da filha ao clicar numa linha.
- **RPC `create_child_church`** (nova): `Admin` cria uma igreja filha da **própria** igreja (hierarquia de só 2 níveis); herda `plan_id`/`subscription_status` da igreja mãe (fazem parte da mesma assinatura) e reforça `plans.max_churches` no servidor (master sem limite). Coleta só nome + responsável + e-mail/telefone opcionais — endereço fica em branco, preenchido depois na própria página de detalhes da filha.
- **RPC `update_church_profile`** (nova): único caminho para editar dados cadastrais de uma igreja (nome/endereço/contato/responsável) — nunca `plan_id`/`subscription_status`/`is_active`/`parent_church_id`, que continuam exclusivos do `master` via `churches_update_master`/RPCs de pagamento já existentes. Usada tanto por `Admin` quanto por `master` na página de Detalhes (reatribuir "Igreja Mãe" continua sendo um `UPDATE` direto, só disponível pro master).
- **`profiles_select_active` / `admin_update_user_role` / `admin_set_user_status`:** estendidas para o `Admin` de uma igreja mãe também enxergar e gerenciar (role/status) os membros de uma igreja **filha direta** — sem isso a seção "Membros" da página de detalhes de uma subcongregação ficaria sempre vazia/travada pra quem não é master.
- **Edge Function `invite-user`** (redeploy): `Admin` agora também pode convidar membros para uma igreja filha direta da sua (antes só conseguia convidar para a própria `church_id`), verificado no servidor contra `parent_church_id`, não confiado do body da requisição.
- **`ChurchFormFields.tsx`:** novo campo opcional "Nome do Responsável" (`showResponsibleName`, só aparece ao editar uma igreja filha) e seletor "Igreja Mãe" agora ocultável (`showParentChurchSelector`, escondido para quem não é master). **`churches.responsible_name`** (nova coluna, nullable).

**Decisões técnicas:**
- **Por que uma RPC sem argumento chamada em todo login, em vez de resolver isso só no fluxo de confirmação de e-mail:** não há como interceptar "o usuário acabou de confirmar o e-mail" no frontend (o clique acontece no e-mail, fora do app) — o primeiro momento garantido em que o app roda código autenticado depois disso é o próximo login. Rodar a RPC (idempotente, `return` imediato se `church_id` já existe) em todo `signIn()` é a forma mais simples de garantir que a criação da igreja "alcança" o usuário mais cedo ou mais tarde, sem precisar de webhook do Supabase Auth nem de um cron job.
- **Validação de endereço relaxada na página de Detalhes** (só o nome é obrigatório para salvar) — diferente do antigo `ChurchDetailsModal`, que exigia endereço completo. Faz sentido agora que igrejas nascem sem endereço (autocadastro e cadastro rápido de filha) e o usuário deve poder salvar progressivamente.
- **Hierarquia de só 2 níveis (igreja → filhas), sem netos:** `create_child_church` exige `p_parent_church_id = current_church_id()` para quem não é master — um Admin só cria filhas da própria igreja, nunca uma filha de uma filha. Mantém a mesma limitação "só organizacional" já documentada para `parent_church_id` desde a migration `0009`.
- **`get_advisors` (security):** as 3 novas funções `SECURITY DEFINER` (`complete_pending_church_signup`, `create_child_church`, `update_church_profile`) aparecem nos mesmos avisos `WARN` já esperados (34 ocorrências no total, era 31 antes) — mesmo racional de sempre, cada uma valida permissão internamente antes de qualquer efeito.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos warnings pré-existentes de sempre). Teste visual real (autocadastro completo com confirmação de e-mail, navegação master→igreja→filha, paginação) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar manualmente antes de promover para `main`.

### [2026-07-31] Mensagem amigável para rate limit de e-mail no autocadastro

**O que foi feito:**
- **`src/components/SignupForm.tsx`:** nova função `friendlySignupError(message)` que traduz mensagens conhecidas do Supabase Auth para PT-BR — se a mensagem de erro (de `supabase.auth.signUp()` ou da RPC `complete_pending_church_signup`) contiver `"email rate limit exceeded"` ou `"rate limit"` (case-insensitive), exibe "Limite de tentativas atingido. Por favor, aguarde alguns minutos ou entre em contato com o suporte." em vez do texto cru em inglês. A tradução já existente de `"User already registered"` foi incorporada nessa mesma função.

**Decisões técnicas:**
- Checagem por `includes("rate limit")` (substring, case-insensitive) em vez de comparação exata — o SMTP padrão do Supabase (usado neste projeto, sem servidor de e-mail customizado configurado) tem um limite bem restrito de e-mails/hora, e é o erro mais provável de aparecer em uso real durante testes/demonstrações com múltiplos cadastros seguidos.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real (forçar o rate limit cadastrando várias contas em sequência) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-31] Bloqueia aninhamento de igrejas filhas (hierarquia de só 2 níveis) + ajuste no texto de rate limit

**O que foi feito:**
- **`src/pages/ChurchDetails.tsx`:** seção "Igrejas Filhas / Subcongregações" (listagem + botão "Adicionar Igreja Filha") só é renderizada quando a igreja em exibição é uma **matriz** (`!church.parentChurchId`, nova constante `isRootChurch`) — se a igreja já é uma filha, a seção inteira some, não só o botão. `canAddChild` passou a exigir `isRootChurch` também. O seletor "Igreja Mãe" (só master) agora busca especificamente igrejas matrizes (`churches` com `parent_church_id is null`) em vez de reaproveitar `masterChurches` do `AppContext` (que lista todas, inclusive filhas) — evita oferecer uma opção que o banco rejeitaria de qualquer forma.
- **Migration `0019_prevent_grandchild_churches.sql`:** RPC `create_child_church` passou a verificar se `p_parent_church_id` já é, ele mesmo, filha de outra igreja (`parent_church_id is not null`) — se for, rejeita com "Não é possível cadastrar uma igreja filha dentro de outra igreja filha". Antes essa checagem só existia implicitamente pela UI, não no servidor.
- **Migration `0020_church_hierarchy_trigger_guard.sql`:** trigger `on_church_prevent_grandchild` (`BEFORE INSERT OR UPDATE OF parent_church_id`) reforça a mesma regra **em qualquer caminho de escrita** em `churches` — inclusive a reatribuição de "Igreja Mãe" que o master faz via `UPDATE` direto (fora de `create_child_church`, que só uma RPC cobre). Bloqueia dois casos: (1) vincular uma igreja como filha de outra que já é filha; (2) transformar em filha uma igreja que já tem as próprias filhas (o que tornaria essas filhas netas por tabela).
- **`src/components/SignupForm.tsx`:** texto da mensagem de rate limit ajustado para "Limite de tentativas atingido. Por favor, aguarde alguns minutos **antes de tentar novamente** ou entre em contato com o suporte." (a lógica de detecção — `includes("rate limit")` — já existia da sessão anterior).

**Decisões técnicas:**
- **Trigger de banco, não só a checagem na RPC:** a RPC `create_child_church` sozinha não protegia contra o master reatribuir `parent_church_id` via `UPDATE` direto em `churches` (permitido pra ele desde sempre, `churches_update_master`) — só um trigger `BEFORE INSERT OR UPDATE` pega **todo** caminho de escrita, presente ou futuro, sem depender de cada função lembrar de checar. Mesmo padrão já documentado em `database.md` ("Regras de segurança reforçadas no banco, não só na UI").
- **Checagem simétrica (pai já é filha / já tem filhas):** só bloquear "o novo pai já é filha" não seria suficiente — reatribuir o `parent_church_id` de uma igreja que **já tem filhas próprias** para outra igreja qualquer também formaria uma cadeia de 3 níveis (as filhas dela virariam netas da nova mãe). As duas pontas da relação precisam ser checadas.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos warnings pré-existentes). Teste visual real (tentar aninhar uma filha dentro de outra filha pela UI e via chamada direta à RPC) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-31] Refatoração da estrutura de pastas para Feature-Driven (co-locação por página)

**O que foi feito:**
- **Nomenclatura de páginas em inglês:** `Auditoria.tsx`→`AuditLogs.tsx`, `Governanca.tsx`→`Governance.tsx`, `ImportacaoExtrato.tsx`→`StatementImport.tsx`, `LivroCaixa.tsx`→`CashBook.tsx`, `Planos.tsx`→`PricingPlans.tsx`, `Usuarios.tsx`→`Users.tsx` (todos via `git mv`, histórico preservado). Rotas/URLs (`/auditoria`, `/livro-caixa`, etc.) não mudaram — só o nome do arquivo/componente.
- **Co-locação por página:** para cada página com componentes usados **exclusivamente** por ela, criada a subpasta `pages/<Página>/` com a própria página (`pages/<Página>/<Página>.tsx`) + `pages/<Página>/components/`:
  - `Login/` ← `SignupForm`, `ForgotPasswordModal` (só usados no login/autocadastro).
  - `Dashboard/` ← `MetricCard`, `ExploratoryChart` (só usados no Dashboard).
  - `StatementImport/` ← toda a antiga pasta `components/importacao/` (`UploadDropzone`, `SummaryCards`, `TransactionsPreviewTable`, `ImportHistoryTable`, `AiChatPanel`, `CategoryRulesModal`).
  - `Users/` ← `MemberEditModal` (não referenciado por nenhuma tela hoje — mantido junto por afinidade de domínio, não por uso ativo).
  - `Governance/` ← `ChurchCreateModal`, `PaymentRequestsPanel`.
  - `ChurchDetails/` ← `AddChildChurchModal`.
  - `CashBook.tsx`, `AuditLogs.tsx`, `ResetPassword.tsx` e `PricingPlans/PricingPlans.tsx` (a página) ficaram **sem subpasta de componentes** — não têm nada de uso exclusivo.
- **Permanecem globais em `src/components/`** (usados por 2+ páginas, ou por outro componente global): `Avatar`, `Badge`, `Card`, `Pagination`, `MonthYearPicker` (UI base); `Layout`, `Sidebar`, `ProtectedRoute` (shells/roteamento); `Toast`, `ThemeToggle`, `ProfileSettingsModal`, `TermsAcceptanceModal`, `UnsavedChangesPrompt`, `ConfirmModal` (genéricos); `ChurchFormFields` (usado por `ChurchDetails` **e** por `Governance/ChurchCreateModal`); `PricingPlans`, `PricingModal`, `PixPaymentModal` (o card de planos é usado pela página `/planos` **e** pelo overlay `PricingModal`, aberto a partir de `StatementImport`/`CashBook` ao bater limite do plano).
- Todos os imports relativos dos arquivos movidos foram recalculados manualmente para a nova profundidade de pastas; `src/App.tsx` atualizado para importar cada página do novo caminho.

**Decisões técnicas:**
- **Critério de co-locação = uso exclusivo, não "parece relacionado":** `ChurchFormFields` e `ConfirmModal` pareciam candidatos óbvios para mover para `ChurchDetails/` e `StatementImport/` respectivamente, mas ambos são importados por um **segundo** consumidor (`ChurchCreateModal` da Governança, e `PaymentRequestsPanel` da Governança) — mover teria criado um import cruzado entre pastas de página irmãs, o que a proposta original explicitamente queria evitar. O mesmo valeu para o componente `PricingPlans` (cartões de planos): é usado tanto pela página `/planos` quanto pelo `PricingModal` (overlay de upgrade aberto do Livro Caixa/Importação) — ficou global.
- **`MemberEditModal` mantido, não excluído:** não é importado por nenhuma tela hoje (dead code pré-existente, de antes desta sessão), mas seu domínio (edição de membro) é claramente de `Users` — comover para `Users/components/` documenta a intenção sem exigir decidir se/quando será religado.
- Nenhuma lógica de negócio foi alterada — só caminhos de arquivo e imports. Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos 6 warnings pré-existentes, nenhum novo). Teste visual real na aplicação rodando não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se navegar por todas as rotas antes de promover para `main`.

### [2026-08-12] Imagens de produto editáveis na landing (Painel de Governança) + redesign visual

**O que foi feito:**
- **Migration `0029_landing_images.sql`:** bucket de Storage `landing-images` (público, dedicado — separado de `plan-assets`, nunca misturado com dados operacionais/checkout) e tabela `public.landing_images` (`key` PK, `image_url`, `updated_at`), com seed fixo das 6 seções que ganham imagem (`hero`, `feature_livro_caixa`, `feature_ia`, `feature_multi_igreja`, `feature_auditoria`, `sobre_nos`). RLS: `SELECT` liberado ao `anon` direto na tabela (sem coluna sensível, diferente de `plans` — não precisou de RPC/view intermediária); `INSERT`/`UPDATE`/`DELETE` só `master` (`public.is_master()`), mesmo padrão de `plan-assets`/`plans_update_master`.
- **`src/types/index.ts`:** novos tipos `LandingImageKey` e `LandingImage`. **`src/utils/landingImages.ts`** (novo): `LANDING_IMAGE_SECTIONS` (metadados das 6 seções) + `mapLandingImageRow`. **`src/utils/imageUpload.ts`** (novo): `uploadImageToBucket(bucket, path, file)` — validação de tipo (`image/*`) e tamanho (máx. 5MB) antes do upload, seguido de `getPublicUrl`; extrai e generaliza o padrão que já existia inline em `EditPlanModal.uploadQrCode` (sem alterar esse arquivo — ele continua funcionando como antes, e passa a ser candidato natural a usar o helper numa refatoração futura).
- **`src/pages/Governance/components/LandingImagesPanel.tsx`** (novo) + 4ª aba "Landing Page" em `Governance.tsx` (ao lado de Igrejas/Assinaturas/Planos, mesmo padrão de tabs manuais): um card por seção com preview da imagem atual (ou placeholder se vazia), botão de upload/troca e botão de remover — grava direto em `landing_images` via `supabase.from("landing_images").update(...)`.
- **`src/pages/Landing/Landing.tsx`:** busca `landing_images` sem autenticação (mesma mecânica pública de `get_public_plans()`/`PricingSection`) e redesenha 3 seções mantendo **100% do texto já existente**, só a apresentação:
  - **Hero:** com imagem cadastrada, vira 2 colunas (texto + mockup emoldurado — `rounded-2xl`, borda e `shadow-md`, como um print de tela); sem imagem, mantém o layout centralizado original.
  - **Como Funciona:** os mesmos 4 itens (títulos/descrições inalterados) saem do grid de 4 cards e viram blocos alternados (imagem à esquerda/texto à direita, invertendo a cada item via `lg:flex-row-reverse`); qualquer item sem imagem cadastrada renderiza só o texto, centralizado, largura total — nunca um espaço vazio ou ícone de imagem quebrada.
  - **Sobre Nós:** mesmo padrão condicional (2 colunas com imagem / texto centralizado sem ela).
  - **Alternância de fundo entre seções** (só tons já existentes de `neutral`, nenhuma cor nova): Hero mantém o overlay original; Como Funciona/Planos/Contato em `bg-white dark:bg-black` (igual ao body); Sobre Nós/FAQ em `bg-neutral-50 dark:bg-neutral-950` — para isso, cada `<section>` passou a ser full-bleed (a cor de fundo cobre a largura toda da viewport) com um `<div>` interno `max-w-* mx-auto px-*` para o conteúdo, em vez do padding/max-width ficar direto no `<section>` como antes (senão a faixa de cor ficaria limitada a `max-w-6xl`, não à largura da tela).

**Decisões técnicas:**
- **Tabela própria com `SELECT` público em vez de RPC/view:** `plans` precisou da RPC `get_public_plans()` porque a tabela mistura colunas de marketing com dados bancários/Pix sensíveis; `landing_images` só guarda URLs de imagens institucionais, então uma policy de `SELECT` direta (`using (true)`) já é segura e mais simples — sem introduzir uma função `SECURITY DEFINER` a mais.
- **Helper de upload extraído, mas `EditPlanModal` não tocado:** a tarefa era só a landing; refatorar o QR Code do Pix para usar o novo helper ficou fora de escopo desta sessão (evitar tocar em fluxo de checkout já validado em produção sem necessidade), mas o helper já nasce reutilizável para isso depois.
- **Fallback "sem imagem = sem buraco" em toda seção, não só onde foi pedido explicitamente:** a regra "renderiza normalmente sem a imagem" foi aplicada de forma consistente aos 4 itens de "Como Funciona" individualmente (não só Hero/Sobre Nós), já que o master pode cadastrar as imagens em ordem qualquer.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos 6 warnings pré-existentes, nenhum novo) e teste visual real: dev server + Playwright CLI (`@playwright/cli`, headless) navegando em `/`, screenshot full-page em modo claro e escuro, sem erros de console e sem nenhum placeholder de imagem quebrada (nenhuma imagem foi cadastrada ainda em `landing_images`, então todas as seções caem no fallback de texto). A aba "Landing Page" da Governança não foi testada visualmente nesta sessão (exige login como `master`, sem credencial disponível no ambiente) — o código segue exatamente o mesmo padrão já validado de `PlanManagementPanel`/`EditPlanModal`.

### [2026-08-12] Reverte "Como Funciona" da landing de blocos alternados para grid de cards

**O que foi feito:**
- **`src/pages/Landing/Landing.tsx`:** a seção "Como Funciona" voltou ao grid original (`grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-4`, um `Card` por item com ícone + título + descrição) — revertendo só essa seção do redesign em blocos alternados da entrada anterior. `HOW_IT_WORKS` voltou a ser só `icon`/`title`/`description` (sem `key` de imagem); Hero e "Sobre Nós" continuam exatamente como no redesign (blocos com imagem opcional), assim como a alternância de fundo entre seções.

**Decisões técnicas:**
- **Feedback de usabilidade real, não um bug:** sem nenhuma imagem cadastrada ainda para as 4 chaves de feature, o fallback "só texto" da versão em blocos resultava numa coluna única de títulos empilhados com muito espaço vazio — pior legibilidade que o grid de 4 colunas original. O grid não depende de imagem pra ficar bem diagramado, então é a opção certa enquanto essas imagens não existirem (ou mesmo definitivamente, por escolha do usuário).
- **Tabela `landing_images` e aba "Landing Page" da Governança mantidas intactas**, inclusive as 4 chaves de feature (`feature_livro_caixa`/`feature_ia`/`feature_multi_igreja`/`feature_auditoria`) — só deixaram de ser consumidas por esta seção da landing. Cadastrar uma imagem nessas chaves hoje não tem efeito visual em "Como Funciona"; decisão de reconsiderar o layout fica para quando/se isso for necessário.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros) e teste visual real (dev server + Playwright CLI, screenshot full-page) confirmando o grid de 4 cards restaurado, com Hero/Sobre Nós/alternância de fundo inalterados.

### [2026-07-31] Restringe "Detalhes da Igreja" a Admin/master (Tesoureiro/Auditor/Conselho Fiscal perdem o acesso)

**O que foi feito:**
- **`src/App.tsx`:** rotas `detalhes-igreja` e `detalhes-igreja/:churchId` saíram do grupo `ProtectedRoute allowedRoles={TENANT_ROLES}` (que inclui Tesoureiro/Auditor/Conselho Fiscal) e passaram para o grupo `allowedRoles={["Admin", "master"]}` — o mesmo já usado por `/usuarios`. Acesso direto pela URL por um papel não permitido é redirecionado pelo `ProtectedRoute` para `/dashboard` (comportamento já existente do guard, reaproveitado).
- **`src/components/Sidebar.tsx`:** item de menu "Detalhes da Igreja" (`NAV_ITEMS`) passou de `allowedRoles: TENANT_ROLES` para `allowedRoles: ["Admin", "master"]` — some do menu para Tesoureiro/Auditor/Conselho Fiscal.

**Decisões técnicas:**
- Antes, Tesoureiro/Auditor/Conselho Fiscal tinham acesso de **leitura** à página (o `canEdit` interno de `ChurchDetails.tsx` já os excluía de editar) — a regra de negócio pedida é mais restritiva: nenhuma visão para esses papéis, nem pelo menu nem pela URL direta. Não foi necessário alterar `ChurchDetails.tsx` em si: como só Admin/master agora chegam à rota, o `canEdit`/`isAdmin`/`isMaster` já existentes continuam corretos sem mudança de lógica interna.
- Nenhuma RLS/RPC do banco foi alterada — a página só lê/escreve `churches`/`profiles` já protegidos por RLS que exige Admin/master para mutação; a restrição de **visualização** vive inteiramente no guard de rota do frontend, igual ao padrão já usado por `/usuarios` e `/governanca`.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real (logar como Tesoureiro/Auditor/Conselho Fiscal e confirmar que o item não aparece e a URL redireciona) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-31] Merge para main e release v1.6.0

**O que foi feito:**
- Merge de `hmg` em `main` (`git merge --no-ff`) trazendo: planos de assinatura com checkout Pix (`PricingPlans`/`PricingModal`/`PixPaymentModal`, `usePlanLimits`, migrations `0015`/`0016`), hierarquia de igrejas filhas self-service (`AddChildChurchModal`, RPC `create_child_church`, migrations `0017`–`0020`, suporte do `invite-user`), a restrição de RBAC de "Detalhes da Igreja" a Admin/master, e a reorganização feature-driven de `src/pages`/`src/components`.
- Tag `v1.6.0` criada e Release publicada no GitHub (`gh release create`).

**Decisões técnicas:**
- Validado com `npx tsc --noEmit` e `npm run build` direto em `main` pós-merge (sem erros) antes do push, seguindo o mesmo procedimento das releases anteriores.

### [2026-07-31] Atualiza limites/regras dos planos (Free/Igreja Local/Presbitério) e adiciona travas de formato de importação e Modo Estrito por plano

**O que foi feito:**
- **Migration `0021_update_plan_limits.sql`:** adiciona `allowed_import_formats text[]` e `allow_strict_mode boolean` em `plans`; renomeia `max_churches` → `max_child_churches` (corrigindo um off-by-one — o Free, com seed `1`, bloqueava a própria 1ª igreja filha); atualiza o seed dos 3 planos: **Free** (10 leituras IA/mês, 10 PDFs/mês, 1 subcongregação, só CSV, Modo Estrito bloqueado), **Igreja Local/`pro`** (60 leituras IA/mês, 50 PDFs/mês, 10 subcongregações, todos os formatos, Modo Estrito liberado), **Presbitério/`unlimited`** (tudo ilimitado, todos os formatos, Modo Estrito liberado). Padroniza `-1` como sentinela de "ilimitado" nos 3 limites numéricos, substituindo o `999999` usado até aqui. `create_child_church()` também foi ajustada para a nova coluna/semântica (`v_children_count >= v_max_child_churches`, `-1` nunca bloqueia).
- **`src/types/index.ts`:** `Plan` ganha `allowedImportFormats: ImportFormat[]` e `allowStrictMode: boolean`; `maxChurches` renomeado para `maxChildChurches`. Novo tipo `ImportFormat = "csv" | "pdf" | "ofx" | "image"`.
- **`src/utils/plans.ts` (novo):** centraliza `mapPlanRow` (linha snake_case do banco → `Plan`) e `isUnlimited(n)` (`n === -1`) — antes esse mapeamento estava **triplicado** (`usePlanLimits.ts`, `PricingPlans.tsx`, `Governance.tsx`), cada cópia precisando ser atualizada manualmente a cada campo novo.
- **`src/hooks/usePlanLimits.ts`:** `canUseAI`/`canDownloadPDF` passam a tratar `-1` como ilimitado; `canAddChurch` renomeado para `canAddSubchurch` (limite corrigido, sem off-by-one); novos `canImportFormat(format)` e `canUseStrictMode()`.
- **`src/components/PricingPlans.tsx`:** `planFeatures()` reescrita para gerar os 5 bullets por plano pedidos (leituras de IA, formato de importação, PDFs, subcongregações, Modo Estrito Sim/Não), com textos "Ilimitado"/"Ilimitadas" quando o limite é `-1` (sem mais expor o `999999` cru).
- **`src/pages/StatementImport/StatementImport.tsx` + `components/UploadDropzone.tsx` + `components/AiChatPanel.tsx`:** `onFileSelected` agora detecta o formato do arquivo pela extensão (`detectImportFormat`) e bloqueia com `PricingModal` ("O plano Gratuito aceita apenas importação em CSV...") se o plano não permitir aquele formato — antes o `accept` do `<input type="file">` era só cosmético, sem nenhuma validação real. `detectMimeType` passou a diferenciar `image/jpeg`/`image/png` (antes qualquer não-PDF virava `text/plain`, quebrando imagens). `UploadDropzone` recebe `allowedFormats` do plano e ajusta dinamicamente o `accept` do input e o texto de dica. O botão "Modo Estrito" do `AiChatPanel` agora fica desabilitado (com badge "Pro" + tooltip) quando `!canUseStrictMode()`.
- **`src/pages/ChurchDetails/ChurchDetails.tsx`:** botão "Adicionar Igreja Filha / Subcongregação" passa a checar `canAddSubchurch()` (via `usePlanLimits` na igreja em exibição) antes de abrir o modal de cadastro — se o limite do plano foi atingido, abre um `PricingModal` com a mensagem de upgrade em vez do formulário. Master continua isento (mesma regra já reforçada no servidor).

**Decisões técnicas:**
- **`-1` em vez de `999999` como sentinela de ilimitado:** o valor mágico antigo exigia toda comparação saber o número exato (`>= 999999`) para exibir "ilimitado"; `-1` é inequívoco e nunca colide com um limite real. Centralizado em `isUnlimited()` para não espalhar a checagem.
- **Formatos de imagem habilitados de ponta a ponta:** a Edge Function `parse-statement` já repassava `mimeType`/`contentBase64` como `inlineData` pro Gemini (que já suporta imagem nativamente) — o gargalo era só o front, que nunca gerava um mimetype de imagem nem oferecia a extensão no seletor de arquivo. Como o backend já suportava, optei por fechar o ciclo completo (não só bloquear o formato no Free) em vez de deixar "Imagens" como um bullet que não correspondia a nenhuma funcionalidade real.
- **Botão de subcongregação continua clicável quando o limite é atingido (estilizado como bloqueado, sem o atributo HTML `disabled`):** usar `disabled` nativo impediria o `onClick` de abrir o `PricingModal` explicando o motivo — mesmo padrão já usado por `canUseAI`/`canDownloadPDF` nesta base (o bloqueio é uma ação alternativa no clique, não uma ausência de handler).
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos 6 warnings pré-existentes, nenhum novo). Migration aplicada diretamente no projeto Supabase via MCP (`apply_migration`) e seed conferido por `execute_sql`. Teste visual real (upload de PDF/imagem no plano Free, toggle de Modo Estrito, criação de subcongregação até o limite) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar esses 3 fluxos na preview do Vercel antes de promover para `main`.

### [2026-07-31] Corrige incremento de cota antes do sucesso e renomeia planos pagos para "Profissional"/"Premium"

**O que foi feito:**
- **`src/pages/StatementImport/StatementImport.tsx` (`onFileSelected`):** `registerAIUsage()` (incremento de `ai_reads_count`) foi movido para **depois** de todo o processamento de sucesso (staging dos lançamentos + mensagem de boas-vindas do chat), não mais logo após a Edge Function responder sem erro. Antes, se algo desse errado no mapeamento dos itens retornados (`itemToStaged`), a cota já teria sido descontada mesmo sem o extrato chegar a ficar staged para o usuário.
- **`src/pages/CashBook.tsx` (`openPdfExport`):** `registerPDFUsage()` (incremento de `pdf_downloads_count`) movido para **depois** de `setReportModal("pdf")` em vez de antes — mesmo princípio (só contar a cota quando a ação que ela paga de fato acontece), embora nesse fluxo específico (modal de relatório simulado, sem chamada de rede) não houvesse hoje um caminho de erro real entre as duas linhas.
- **Migration `0022_rename_plan_display_names.sql`:** `plans.display_name` do plano `pro` passa de "Igreja Local" para **"Profissional"**, e do `unlimited` de "Presbitério" para **"Premium"** (o `name` interno, usado em comparações no código, continua `pro`/`unlimited` — só o rótulo comercial mudou). `Gratuito` do plano `free` não mudou.
- **`src/components/PricingPlans.tsx`:** texto do botão de checkout passou de `Assinar {displayName}` para `Assinar Plano {displayName}` — produz "Assinar Plano Profissional"/"Assinar Plano Premium" automaticamente a partir do novo `display_name`, sem precisar de um texto hardcoded por plano.
- **`src/pages/StatementImport/StatementImport.tsx`:** mensagem de bloqueio de formato no plano Free ("Faça upgrade para o plano Igreja Local...") atualizada para "Faça upgrade para o plano Profissional...".
- **`docs/permissions-rbac.md`/`docs/database.md`:** referências ao nome de exibição dos planos atualizadas para Gratuito/Profissional/Premium, com nota explícita de que `name` (interno) e `display_name` (comercial) são coisas diferentes.

**Decisões técnicas:**
- **Por que mover o incremento para o fim do bloco de sucesso, e não só confiar no `try/catch` existente:** o `try/catch` já evitava contar a cota se a própria chamada à Edge Function falhasse (`error` truthy), mas não protegia contra uma falha **depois** da resposta da API (ex.: `data.transactions` malformado quebrando `itemToStaged`) — mover `registerAIUsage()`/`registerPDFUsage()` para o último passo do caminho feliz fecha essa lacuna sem precisar de nenhum bloco `try/catch` adicional.
- **`name` interno preservado:** renomear a coluna `name` (usada em `plan.name === "pro"` no front e em `where name = 'pro'` nas RPCs/migrations) quebraria toda a lógica de negócio para um problema que é puramente de rótulo — só `display_name` (o que o usuário lê) precisava mudar.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; mesmos 6 warnings pré-existentes, nenhum novo). Migration aplicada via MCP `apply_migration` e conferida com `execute_sql`. Teste visual real (forçar um erro de API durante a importação/exportação e confirmar que a cota não é descontada; conferir os novos nomes na tela `/planos`) não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-07-31] Gestão completa de planos (copy, limites e dados bancários/Pix) pelo Painel de Governança

**O que foi feito:**
- **Migration `0023_plan_management_and_bank_details.sql`:** `plans` ganha `description text`, `features text[]` (benefícios do card, antes só existiam como texto computado em `planFeatures()` no front — agora é copy livre editável), e os dados bancários/Pix de recebimento (`bank_name`, `account_holder`, `account_document`, `pix_key`, `pix_qr_code_url` — todos nullable, hoje `null` nos 3 planos, propositalmente: nenhum dado bancário real foi inventado pela migration). `description`/`features` foram semeados com a cópia que já existia (sem regressão visual). Nova policy `plans_update_master` (`UPDATE` liberado só para `master`, mesmo padrão de `churches_update_master`) — antes o catálogo só podia mudar por migration. Novo bucket de Storage público `plan-assets` (RLS: `SELECT` público, `INSERT`/`UPDATE`/`DELETE` só `master`) para os QR Codes Pix.
- **`src/types/index.ts`/`src/utils/plans.ts`:** `Plan` ganha `description`, `features: string[]`, `bankName`, `accountHolder`, `accountDocument`, `pixKey`, `pixQrCodeUrl`; `mapPlanRow`/`PlanRow` atualizados no único ponto centralizado.
- **`src/components/PricingPlans.tsx`:** removida a função `planFeatures()` que recalculava os bullets a partir dos limites numéricos — a tela `/planos` agora renderiza `plan.description` e `plan.features` direto do banco, sem nenhum texto fixo no componente.
- **`src/components/PixPaymentModal.tsx`:** removida a constante `PIX_KEY` hardcoded (única para todos os planos) — o modal agora exibe QR Code (`plan.pixQrCodeUrl`, com placeholder se ainda não configurado), Chave Pix com botão "Copiar Chave" (`navigator.clipboard`), Titular, CPF/CNPJ e Banco, todos vindos do plano escolhido. Se o plano ainda não tiver `pix_key` configurada, mostra um aviso em vez de dados vazios/quebrados.
- **`src/pages/Governance/Governance.tsx`:** nova terceira aba "Gestão de Planos & Dados Bancários"; `refreshPlans()` extraído para poder ser chamado de novo após salvar um plano.
- **`src/pages/Governance/components/PlanManagementPanel.tsx` (novo):** lista os 3 planos com resumo (preço, descrição, limites, nº de benefícios, badge "Dados bancários configurados/pendentes" nos planos pagos) e botão "Editar Plano".
- **`src/pages/Governance/components/EditPlanModal.tsx` (novo):** formulário completo em 4 seções — Informações Gerais (nome/descrição/preço mensal e anual), Dados de Recebimento Bancário (banco/titular/documento/chave Pix/upload de QR Code com fallback de URL colada), Recursos e Benefícios (lista dinâmica de texto, adicionar/remover) e Limites Operacionais (leituras de IA/PDFs/subcongregações com checkbox "Ilimitado" por campo que aplica o sentinela `-1`, formatos de importação por checkbox, toggle do Modo Estrito). Salva com um único `UPDATE` em `plans`.

**Decisões técnicas:**
- **Sem RPC intermediária para `UPDATE` de `plans`:** o padrão já estabelecido neste projeto para mutações exclusivas do master em uma tabela inteira é RLS direta (`churches_update_master`), não uma RPC com uma lista gigante de parâmetros — segui o mesmo padrão em vez de introduzir um segundo estilo para o mesmo tipo de operação.
- **Nenhuma checagem de `role === 'master'` dentro dos componentes novos:** a rota `/governanca` inteira já é `allowedRoles={["master"]}` no `App.tsx` — replicar a checagem dentro do painel seria redundante (a política de enforcement real, de qualquer forma, é a RLS `plans_update_master` no banco, não uma condicional no React).
- **Preço continua `price_monthly`/`price_yearly` (não um `price`/`billing_cycle` único como o pedido original sugeria):** a tela já tem um toggle Mensal/Anual funcionando ponta a ponta (`PricingPlans.tsx`, `PixPaymentModal.tsx`); colapsar em um único preço seria uma regressão do recurso existente para atender um formato de coluna que não se encaixa no produto atual.
- **Dados bancários deixados em branco pela migration, nunca inventados:** diferente de `description`/`features` (só copy de marketing, seguro herdar do que já existia), banco/titular/CPF-CNPJ/chave Pix são dados financeiros reais — a migration não fabrica nenhum, o master preenche pelo novo formulário antes do primeiro checkout real. O `PixPaymentModal` já foi escrito para lidar com `pix_key IS NULL` sem quebrar (mostra aviso em vez de dado vazio).
- Validado com `npx tsc --noEmit` (root `tsconfig.json` é só um arquivo de projeto-solução — `--noEmit` sem `-b` não checa nenhum arquivo de verdade nesta configuração, então o cheque que efetivamente importa é sempre `npm run build`, que roda `tsc -b`) e `npm run build`/`npm run lint` (sem erros; mesmos 6 warnings pré-existentes, nenhum novo). Migration + bucket aplicados via MCP (`apply_migration`) e conferidos com `execute_sql`. Teste visual real (editar um plano, fazer upload de um QR Code, abrir o checkout Pix e conferir os dados) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar antes de promover para `main`, e preencher os dados bancários reais dos planos pagos antes do primeiro checkout de verdade.

### [2026-07-31] Merge para main e release v1.7.0

**O que foi feito:**
- Merge de `hmg` em `main` (`git merge --no-ff`) trazendo: novos limites/regras por plano (leituras de IA, PDFs, subcongregações, formatos de importação, Modo Estrito) com `-1` como sentinela de ilimitado, correção do incremento de cota de IA/PDF para só contar após sucesso confirmado, renomeação dos planos pagos para Profissional/Premium, e a nova aba "Gestão de Planos & Dados Bancários" no Painel de Governança (edição completa de nome/descrição/preço/benefícios/limites e dados bancários/Pix, com upload de QR Code) — migrations `0021`–`0023`.
- Tag `v1.7.0` criada e Release publicada no GitHub (`gh release create`).

**Decisões técnicas:**
- Validado com `npm run build` direto em `main` pós-merge (sem erros) antes do push, seguindo o mesmo procedimento das releases anteriores.

### [2026-07-31] Instala PostHog (analytics de produto)

**O que foi feito:**
- **`posthog-js` adicionado às dependências** (`package.json`).
- **`src/services/posthog.ts` (novo):** `initPostHog()` inicializa o client a partir de `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST`; exporta a instância `posthog` para uso nos demais módulos.
- **`src/main.tsx`:** chama `initPostHog()` antes do `createRoot(...).render(...)`.
- **`src/context/AuthContext.tsx`:** novo `useEffect` que chama `posthog.identify(profile.id, { email, role, church_id })` quando o profile carrega, e `posthog.reset()` quando a sessão termina (guardado por `loading` para não disparar reset no primeiro render, antes da sessão inicial resolver).
- **`.env.example`:** novas variáveis `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` documentadas.
- **`src/vite-env.d.ts`:** tipagem das duas novas variáveis (opcionais).

**Decisões técnicas:**
- **Diferente do Supabase, ausência da key não lança erro:** `initPostHog()` só emite `console.warn` e segue sem analytics se `VITE_POSTHOG_KEY` não estiver definida — analytics é telemetria opcional, não uma dependência que pode travar o app (ex.: ambientes de dev sem essa chave configurada).
- **`identify`/`reset` no `AuthContext`, não em cada página:** é o único lugar que já centraliza o ciclo de vida da sessão (login/logout/troca de profile) — replicar isso por página duplicaria lógica e arriscaria esquecer alguma tela.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Sem teste visual em browser real (evento chegando no dashboard do PostHog) nesta sessão — falta a `VITE_POSTHOG_KEY` de um projeto PostHog real no ambiente; recomenda-se validar isso antes de promover para produção.

### [2026-08-11] Exclusão de usuário na tela de Governança e Usuários (soft-delete + cancelamento de convite)

**O que foi feito:**
- **Migration `0024_soft_delete_user.sql`:** novo estado terminal `'Excluído'` em `profiles.status` (constraint `profiles_status_check`). `has_role()`/`is_active()` atualizadas para tratar `'Excluído'` exatamente como `'Inativo'` (bloqueia login e desaparece da RLS `profiles_select_active`) — sem essa mudança, `is_active()` continuaria `true` para um usuário excluído (só checava `status <> 'Inativo'`). `admin_update_user_role`/`admin_set_user_status` passam a rejeitar qualquer alteração quando o alvo já está `'Excluído'` (estado terminal, sem caminho de volta). Nova RPC `admin_delete_user(target_id)`: soft-delete (`status = 'Excluído'`), mesma regra de alcance de `admin_update_user_role`/`admin_set_user_status` (master qualquer perfil exceto o próprio; Admin só a própria igreja ou uma filha direta, nunca outro Admin ou o master), rejeita alvo com `status = 'Convite Pendente'` (esse caso usa a Edge Function abaixo) e loga em `audit_logs` reaproveitando a `action_key` `'estorno'` (já existente, rótulo "Estorno/Exclusão").
- **Edge Function `supabase/functions/cancel-invite/index.ts` (nova, service-role):** hard delete real via `auth.admin.deleteUser` — só para `status = 'Convite Pendente'` (usuário nunca logou, sem nenhuma linha em `audit_logs`/`transactions`/`import_history` referenciando seu `id`, então excluir de verdade não quebra a trilha de auditoria). Mesma regra de alcance do Admin (própria igreja ou filha direta, nunca convite de outro Admin), mesmo padrão de `invite-user`/`generate-reset-link` (checagem de permissão com o client do chamador, operação sensível com o client de service-role).
- **`src/pages/Users/Users.tsx`:** novo botão na coluna "Ações Rápidas" — ícone `Trash2` ("Excluir Usuário") para `Ativo`/`Inativo`, ícone `Ban` ("Cancelar Convite") para `Convite Pendente`; só renderiza quando `canDeleteUser()` permite (master: qualquer um exceto ele mesmo; Admin: só a própria igreja, nunca outro Admin/master; Tesoureiro/Auditor/Conselho Fiscal: nunca). Confirmação via `ConfirmModal` (nome + e-mail visíveis, tom `error`, texto avisando irreversibilidade) antes de chamar a RPC/Edge Function; feedback via `showToastMsg` nos dois casos (sucesso e erro). Linha com `status = 'Excluído'`: avatar/nome com `opacity-50`, badge de role deixa de ser um botão clicável (vira `Badge` estático), e a coluna "Ações Rápidas" fica vazia (sem reset de senha/bloqueio/exclusão). Filtro "Todos os Status" ganha a opção `Excluído` (padrão da tela continua mostrando todos os status).
- **`src/pages/ChurchDetails/ChurchDetails.tsx`:** `STATUS_TONE` (usado na seção "Membros") ganha a chave `Excluído` só para o `Record` compilar — sem nenhum tratamento visual especial ali (o "apagado" é exclusivo da tela de Governança e Usuários; nos demais lugares o usuário aparece só como metadado histórico).
- **`src/context/AuthContext.tsx`:** o listener Realtime que força logout imediato quando `profiles.status` muda em outra sessão (hoje só para `'Inativo'`) passa a cobrir também `'Excluído'` — sem isso, excluir um usuário com sessão ativa em outro navegador não o desconectaria até o token expirar.
- **`src/types/index.ts`:** `UserStatus` ganha `'Excluído'`.

**Decisões técnicas:**
- **Soft-delete para quem já tem histórico, hard delete real só para convite pendente:** `audit_logs.user_id`, `transactions.created_by` e `import_history.imported_by` referenciam `profiles(id)` **sem** `ON DELETE CASCADE` (só `profiles.id → auth.users.id` tem cascade) — um hard delete de qualquer usuário que já logou pelo menos uma vez (todo login grava um `audit_logs` via `touch_last_access()`) já falharia hoje com violação de FK. Confirma a decisão de soft-delete como a única forma segura de preservar a trilha de auditoria imutável (pilar do projeto) para usuários com histórico real, e reserva o hard delete só para quem nunca gerou nenhuma linha referenciada (convite pendente).
- **Estado terminal sem período de graça:** `'Excluído'` não tem RPC de volta — `admin_set_user_status` explicitamente rejeita alterar um perfil já excluído, e não existe nenhum caminho (RPC ou policy) que aceite `new_status/new_role` para um perfil nesse estado. Sem purga automática/cron nesta rodada (decisão explícita, não esquecimento).
- **`estorno` reaproveitado como `action_key`, em vez de uma chave nova:** já existe no enum/constraint (`categorizacao_ia`/`edicao_manual`/`aprovacao_caixa`/`estorno`/`acesso`/`aceite_termos`) com o rótulo "Estorno/Exclusão" (tom `error`) — evita alterar o `check` de `audit_logs.action_key` e o `ACTION_TYPES`/`AuditActionKey` do front para uma ação que semanticamente já cabia ali.
- **`get_advisors` aponta `admin_delete_user` como `SECURITY DEFINER` executável por `anon`/`authenticated`:** mesmo aviso pré-existente em `has_role`/`is_active`/`admin_update_user_role`/`admin_set_user_status` — o enforcement real é interno à função (`is_master()`/`is_admin()` sobre `auth.uid()`, que é `null` para `anon`), mesmo padrão já aceito neste projeto para essa classe de RPC; não é uma regressão introduzida por esta mudança.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Migration aplicada e Edge Function implantada via MCP (`apply_migration`/`deploy_edge_function`) diretamente no projeto Supabase. Teste visual real (excluir um usuário Ativo, cancelar um convite pendente, confirmar o bloqueio de login e o "apagado" visual na tabela) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar esses 3 fluxos na preview do Vercel antes de promover para `main`.

### [2026-08-11] Merge para main e release v1.8.0

**O que foi feito:**
- Merge de `hmg` em `main` (`git merge --no-ff`) trazendo: exclusão de usuário na tela de Governança e Usuários (soft-delete via `admin_delete_user`/estado `'Excluído'`, cancelamento de convite via Edge Function `cancel-invite`, migration `0024`), instalação do PostHog (analytics de produto) e a atualização do README com hierarquia de igrejas/planos/estrutura de pastas — os três já estavam em `hmg`, aguardando promoção.
- Tag `v1.8.0` criada e Release publicada no GitHub (`gh release create`), já validada/aprovada pelo usuário antes do merge.

**Decisões técnicas:**
- Validado com `npx tsc --noEmit` e `npm run build` direto em `main` pós-merge (sem erros) antes do push, seguindo o mesmo procedimento das releases anteriores.

### [2026-08-11] Edição de usuário na Governança e correção de um buraco de permissão pré-existente (Admin não gerencia Admin)

**O que foi feito:**
- **Migration `0025_unify_user_management_permissions.sql`:** `admin_update_user_role` e `admin_set_user_status` passam a checar o `role` do alvo — Admin só gerencia perfil com `role` em `Tesoureiro`/`Auditor`/`Conselho Fiscal`, nunca outro `Admin` nem o `master`, mesmo dentro da própria igreja/filha direta. **Essa checagem nunca existiu** (confirmado lendo o `pg_get_functiondef` das duas funções live no banco) — um Admin já conseguia rebaixar/bloquear outro Admin da própria igreja desde a migration `0009`. Nova RPC `admin_update_user_profile(target_id, new_name, new_email)`: edição de nome/e-mail para Admin, mesmo alcance/checagem de role do alvo, reaproveitando o padrão de `master_update_profile` (que continua exclusivo do `master`, sem mudança). Todas logam em `audit_logs` (`action_key = 'edicao_manual'`).
- **`supabase/functions/generate-reset-link/index.ts`:** mesmo conserto — antes só checava "mesma igreja exata" (nem alcançava filha direta como as RPCs) e nunca checava o role do alvo; agora segue a regra unificada (mesma igreja ou filha direta, e alvo nunca `Admin`/`master`).
- **`src/pages/Users/Users.tsx`:** novo botão "Editar Usuário" (ícone `Pencil`) na coluna "Ações Rápidas", com modal (Nome/E-mail) — chama `master_update_profile` (master, preservando o `cpf` atual do usuário, que não é campo desta tela) ou `admin_update_user_profile` (Admin). `canDeleteUser` renomeado para `canManageUser` e reaproveitado tanto no botão de Editar quanto no de Excluir/Cancelar Convite — a regra de permissão é a mesma para as duas ações, então parou de fazer sentido ter dois booleanos idênticos.
- **`docs/database.md`/`docs/permissions-rbac.md`:** seção "Exclusão de usuário" da tela de Usuários generalizada para "Regra unificada de gestão de usuário", cobrindo as 5 ações (editar, excluir, cancelar convite, resetar senha, trocar role/status) com a mesma regra; tabela de RPCs/Edge Functions atualizada.

**Decisões técnicas:**
- **`church_id` ficou fora do modal de edição, de propósito:** é a única mudança que teria efeito colateral real fora da própria linha — `usersById` (resolve "Autor" no Livro Caixa e "Usuário" na Auditoria) é montado a partir de `usersList`, que para um Admin (não-master) é filtrado pela igreja atual (`AppContext.refreshUsers`). Mudar o `church_id` de alguém faria o Admin da igreja **de origem** passar a ver "—"/"Sistema" no lugar do nome desse usuário em lançamentos/logs antigos — não corrompe dado (cada linha de `transactions`/`import_history`/`audit_logs` já grava seu próprio `church_id` no momento do fato), mas quebra a atribuição visual do histórico. Não há hoje nenhuma RPC que troque `church_id` de um perfil existente, para nenhum papel — ficou assim de propósito, não é lacuna.
- **Nenhuma RPC de edição de nome/e-mail (`admin_update_user_profile`, `master_update_profile`, `update_own_profile`) sincroniza o e-mail de login no Supabase Auth** — as três só escrevem `public.profiles.email`. É uma limitação pré-existente (não introduzida agora) que passa a valer também para o novo caminho do Admin; documentado no modal e no `permissions-rbac.md` para não ser descoberta em produção.
- **Por que a checagem de role do alvo também bloqueia autoedição via essas RPCs:** um Admin chamando `admin_set_user_status`/`admin_update_user_role`/`admin_update_user_profile` no próprio `id` agora falha, porque o próprio `role` (`'Admin'`) cai na cláusula de exclusão — efeito colateral desejado, não um bug: autoedição de qualquer papel já tem um caminho dedicado (`update_own_profile`), não deveria passar pelas RPCs de gestão de terceiros.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Migration aplicada e Edge Function redeployada via MCP (`apply_migration`/`deploy_edge_function`); as três funções corrigidas foram relidas do banco (`pg_get_functiondef`) após aplicar para confirmar que o código live bate com o migration file. Teste visual real (Admin tentando gerenciar outro Admin da própria igreja e confirmando o bloqueio; editar nome/e-mail de um Tesoureiro) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar na preview do Vercel antes de promover para `main`.

### [2026-08-11] Merge para main e release v1.9.0

**O que foi feito:**
- Merge de `hmg` em `main` (`git merge --no-ff`) trazendo: correção do buraco de permissão pré-existente (Admin gerenciando outro Admin) em `admin_update_user_role`/`admin_set_user_status`/`generate-reset-link`, nova RPC `admin_update_user_profile` e o botão "Editar Usuário" na tela de Governança e Usuários — migration `0025`.
- Tag `v1.9.0` criada e Release publicada no GitHub (`gh release create`).

**Decisões técnicas:**
- Validado com `npx tsc --noEmit` e `npm run build` direto em `main` pós-merge (sem erros) antes do push, seguindo o mesmo procedimento das releases anteriores.

### [2026-08-11] Correção do fluxo de recuperação/alteração de senha + Master define senha direto

**O que foi pedido:** dois problemas distintos no fluxo de senha — (1) o e-mail de recuperação não estava chegando, e (2) avaliar se o master deveria poder definir a senha de um usuário diretamente no modal de edição, sem depender de link/e-mail.

**O que foi encontrado (Fase 1 — análise, via Supabase MCP):**
- Nos logs de Auth (`get_logs`), duas chamadas reais a `/admin/generate_link` retornaram `404 User with this email not found` momentos antes da análise — não era e-mail não entregue, era a Edge Function `generate-reset-link` falhando na origem.
- Cruzando `public.profiles` × `auth.users` (`execute_sql`), achamos a causa: o usuário Eber tinha `profiles.email = eber.felipe.santo@gmail.com` mas `auth.users.email = eber.felipe@gmail.com` — divergentes. `admin_update_user_profile`/`master_update_profile` sempre só escreveram `profiles.email` (limitação já documentada, ver changelog de `2026-08-11` anterior), nunca sincronizaram o e-mail de login no Auth; `generate-reset-link` buscava o usuário no Auth pelo e-mail do `profiles`, e o GoTrue não encontra porque procura pelo e-mail de `auth.users`.
- Separadamente, o autosserviço "Esqueci minha senha" (`ForgotPasswordModal` → `resetPasswordForEmail`) sempre retorna `200` mesmo se o e-mail não existir ou o envio falhar (comportamento de segurança do Supabase) — não dá para confirmar entrega só pelo retorno. O projeto usa o SMTP padrão do Supabase, sem provedor customizado (já documentado em `2026-07-31`) — suspeito nº 1 para esse segundo caminho, mas fica fora do escopo desta implementação (ação no dashboard, não no código).

**O que foi feito (Fase 2 — implementação, aprovada pelo usuário):**
- **`supabase/functions/generate-reset-link/index.ts`:** troca a busca do usuário no Auth — em vez de `generateLink({ email })` usando o e-mail de `profiles`, agora resolve por `admin.getUserById(targetProfile.id)` e usa o e-mail real do Auth. Corrige o 404 mesmo para registros que ainda estejam divergentes.
- **Nova Edge Function `supabase/functions/admin-update-user-profile/index.ts`:** substitui a chamada direta do client à RPC (`admin_update_user_profile`/`master_update_profile`) — agora sincroniza `auth.users.email` (via `admin.updateUserById`, service-role) **e** `public.profiles.email` (chamando a RPC por dentro) numa única operação. Ordem: Auth primeiro (valida formato/unicidade antes de gravar); se a RPC falhar depois, reverte o e-mail no Auth para o valor antigo — nunca fica um lado sincronizado e o outro não. Replica em JS a mesma regra unificada de permissão das demais Edge Functions (master gerencia qualquer um; Admin só Tesoureiro/Auditor/Conselho Fiscal da própria igreja ou filha direta), porque a escrita no Auth usa service-role e não passa pela RLS/RPC.
- **Nova Edge Function `supabase/functions/admin-set-user-password/index.ts`:** o Master define a senha de um usuário diretamente (`admin.updateUserById({ password })`), sem gerar nem enviar link — atalho de emergência para quando o usuário não tem acesso ao e-mail cadastrado. Restrita ao master (nunca aceita o próprio `id` do chamador nem alvo `master`), validação de senha (mínimo 8 caracteres, mesmo padrão do resto do app). Log em `audit_logs` **obrigatório, sem opção de pular**, novo `action_key` dedicado `'definicao_senha_direta'` (migration `0026`) — nunca grava a senha em texto, só o fato de que foi definida manualmente e por quem.
- **`src/pages/Users/Users.tsx`:** `saveEdit()` passa a chamar a Edge Function `admin-update-user-profile` em vez da RPC direto; nova seção "Definir nova senha (opcional)" dentro do modal "Editar Usuário", visível só para o master, com campos Nova Senha/Confirmar Nova Senha (mesma validação de 8 caracteres) e botão próprio "Definir Senha" que chama `admin-set-user-password`. O botão "Resetar Senha / Gerar Link" (ícone `KeyRound`) na tabela continua como está — as duas opções convivem.
- **Correção pontual do registro divergente do Eber:** `auth.users.email` e `auth.identities.identity_data->>'email'` sincronizados para `eber.felipe.santo@gmail.com` (valor confirmado com o usuário como o correto/atual) via `execute_sql` direto — sem isso, o reset de senha dele continuaria quebrado mesmo depois do fix de código.
- **`docs/database.md`/`docs/permissions-rbac.md`:** tabela de RPCs/Edge Functions e seção "Regra unificada de gestão de usuário" atualizadas com as duas novas Edge Functions e a nova mecânica de sincronia de e-mail.

**Decisões técnicas:**
- **Auth primeiro, RPC depois, com reversão no meio (`admin-update-user-profile`):** a alternativa (RPC primeiro) arriscaria gravar `profiles.email` e só depois descobrir que o e-mail já estava em uso em `auth.users` — ficaria um lado mudado e o outro não, recriando o mesmo bug que esta rodada corrige. Fazer a escrita mais restritiva (Auth, que valida unicidade) primeiro evita esse cenário; a reversão cobre o caso raro do lado contrário falhar.
- **`admin-set-user-password` restrita ao master, não ao Admin também:** decisão explícita do usuário — a ação é sensível o bastante (quem define a senha sabe seu valor por um instante) para ficar restrita a quem já tem acesso irrestrito ao sistema, em vez de estender esse poder a todo Admin de igreja.
- **`action_key` dedicado (`'definicao_senha_direta'`) em vez de reaproveitar `'edicao_manual'`:** mesmo racional já usado para `'aceite_termos'` (migration `0011`) — a ação é sensível o bastante para se destacar na Trilha de Auditoria em vez de se misturar com edições genéricas de nome/e-mail/role/status.
- **Deploy das Edge Functions via MCP (`deploy_edge_function`) exigiu ajustar o import do helper compartilhado:** o bundler do MCP posiciona os arquivos enviados dentro de um diretório `source/` por função, então `import ... from "../_shared/cors.ts"` (caminho correto para o `supabase functions deploy` local, que compartilha um único `_shared/` entre todas as functions) não resolve nesse bundler — o payload enviado ao MCP usa `"./_shared/cors.ts"` (cópia do arquivo dentro do próprio pacote da function). Os arquivos locais em `supabase/functions/*/index.ts` continuam com `"../_shared/cors.ts"`, que é o caminho certo para deploy via CLI — sem divergência real de comportamento, só de como cada ferramenta de deploy resolve o import.
- Migration `0026` aplicada e as 3 Edge Functions deployadas em produção via MCP (`apply_migration`/`deploy_edge_function`) — projeto usa um único banco/ambiente Supabase para `hmg`/`main` (ver `git-workflow.md`), então não há homologação separada para validar antes.
- **Fora do escopo desta implementação (ação do usuário, fora do código):** confirmar/adicionar `contabilidadereformada.com.br` em Authentication > URL Configuration > Redirect URLs no dashboard do Supabase (não há tool no MCP que leia essa configuração); avaliar migrar do SMTP padrão do Supabase para um provedor customizado (Resend) para resolver a entrega do autosserviço de recuperação de senha.
- Validado com `npx tsc --noEmit` e `npm run build` (sem erros). Teste visual real (Admin/Master editando e-mail de um usuário e confirmando login com o novo e-mail; master definindo senha direta; usuário resetando senha via link) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar na preview do Vercel antes de promover para `main`.

### [2026-08-12] Merge para main e release v1.10.0

**O que foi feito:**
- Merge de `hmg` em `main` (`git merge --no-ff`) trazendo: correção do 404 em `generate-reset-link` (resolve o usuário por `id` no Auth em vez do e-mail de `profiles`), nova Edge Function `admin-update-user-profile` (sincroniza `auth.users.email`/`profiles.email` atomicamente), nova Edge Function `admin-set-user-password` (master define senha direta, log obrigatório em `audit_logs`) e a correção do registro divergente do usuário Eber em produção — migration `0026`.
- Tag `v1.10.0` criada e Release publicada no GitHub (`gh release create`).

**Decisões técnicas:**
- Versão `v1.10.0` (MINOR, SemVer): a rodada inclui uma funcionalidade nova retrocompatível (master definir senha direto), além dos fixes — não se encaixa em PATCH.

### [2026-08-12] Landing page pública em "/" — domínio deixa de cair direto no login

**O que foi pedido:** hoje `contabilidadereformada.com.br` caía direto na tela de login, sem contexto de venda pra quem nunca ouviu falar do produto — criar uma landing pública em "/" com hero, benefícios, planos, FAQ e contato, reaproveitando o visual já existente.

**O que foi encontrado (Fase 1 — análise):**
- "/" não era login hardcoded: era `ProtectedRoute` + `Layout` com uma rota `index` (`HomeRedirect`), e `ProtectedRoute` checa `session` antes de tudo — sem sessão, cai em `/login` na hora. Proteção de rotas é 100% isolada em `ProtectedRoute.tsx`, sem nenhum redirect hardcoded pra "/" em outro lugar do código (logout e pós-login/cadastro já apontam pra `/login`/`/dashboard` diretamente).
- A RLS da tabela `plans` só libera `SELECT` para usuário **autenticado** — o componente `PricingPlans.tsx` (usado em `/planos`) não funciona numa página pública; os cards de plano da landing precisaram ser reconstruídos com dados estáticos, não uma reutilização direta do componente.
- Não existia nenhum componente de accordion/FAQ no projeto.

**O que foi feito (Fase 2 — implementação, plano de rotas aprovado pelo usuário):**
- **`src/pages/Landing/Landing.tsx`** (+ `components/PricingSection.tsx`, `components/FaqSection.tsx`): nova página pública em `/`, fora de `ProtectedRoute`. Enquanto `AuthContext.loading` resolve (checagem de sessão local, síncrona o bastante pra não valer a pena um skeleton dedicado), mostra um estado neutro de carregamento em vez de piscar a landing; se já há sessão ativa, `<Navigate>` direto pro painel (reaproveita a mesma lógica de destino do `HomeRedirect`). Seções: Hero (dor + CTAs), Como Funciona (4 cards: Livro Caixa, Importação com IA, Multi-igreja, Auditoria), Sobre Nós (menção à IBR Maceió), Planos (cards estáticos dos 3 planos — comentário no código apontando que precisam ser sincronizados manualmente se o master editar preço/benefícios pela Governança), Dúvidas Frequentes (novo `src/components/Accordion.tsx`, genérico e reaproveitável) e Contato (botão WhatsApp).
- **`src/utils/homePath.ts`** (`getHomePath`): extraído porque a lógica "master → `/governanca`, resto → `/dashboard`" já estava duplicada em `ProtectedRoute.tsx` e no `HomeRedirect` do `App.tsx`; a landing seria o 3º ponto de uso, então virou helper único reaproveitado pelos três.
- **`src/App.tsx`:** árvore de rotas reestruturada — `/` agora é a `Landing`; a árvore autenticada (`Layout`/`ProtectedRoute` com `dashboard`, `governanca`, `livro-caixa`, etc.) perdeu o `path="/"` e a rota `index` (ficou pathless, resolvendo pros mesmos caminhos absolutos de sempre — nenhum `NavLink`/link existente precisou mudar). `/login` e `/reset-password` continuam fora da árvore protegida, sem mudança de rota.
- **`src/pages/Login/Login.tsx`:** lê `?signup=1` da URL (`useSearchParams`) pra abrir direto no modo cadastro — usado pelo CTA "Começar Gratuitamente" da landing, já que o autocadastro nunca teve rota própria (é só um toggle interno do Login).
- **`index.html`:** `title`, `meta description` e Open Graph (`og:title`/`og:description`/`og:type`/`og:locale`/`og:url`) voltados para "contabilidade para igrejas" — como o app é SPA sem SSR, esses tags estáticos do documento são o que crawlers/preview de link (inclusive o preview do WhatsApp, canal de entrada esperado) realmente leem.

**Decisões técnicas:**
- Cards de plano com dados **estáticos** na landing (não uma chamada real ao Supabase) não foi só decisão de performance — é obrigatório, porque a RLS de `plans` bloqueia usuário não-autenticado. Conteúdo copiado do seed atual (migrations `0015`/`0021`/`0023`); precisa ser mantido em sincronia manual se o master editar o catálogo pela Governança.
- Links internos da landing (CTAs pro login/cadastro) usam `<Link>` do `react-router-dom`, não `<a href>` puro — evita reload completo da SPA já carregada; âncoras de navegação (`#planos`, `#duvidas`, etc.) continuam `<a href="#...">` normal (scroll nativo do browser, sem troca de rota).
- Reaproveitados 1:1 os design tokens existentes (`orla-blue`, escala `neutral`, `status.*`, `font-display`/`font-sans`, `rounded-md/lg`, `shadow-md`) e o `ThemeToggle`/`Card` já existentes — sem introduzir nenhum token novo.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros; únicos warnings são pré-existentes, não relacionados a esta mudança). Teste visual real no navegador (hero/cards/accordion em light/dark/mobile, fluxo `/login` e `/login?signup=1`) não foi executado nesta sessão por falta de ambiente com browser automatizável — recomenda-se validar na preview do Vercel antes de promover para `main`.

### [2026-08-12] Cards de plano da landing passam a ler a mesma fonte de dados de /planos

**O que foi pedido:** a rodada anterior deixou os cards de plano da landing com dados estáticos (cópia manual do seed de `plans`, comentário avisando "atualizar aqui também" se o master editasse o catálogo) — trocar isso por uma leitura real, pra editar um plano em Governança refletir nos dois lugares automaticamente.

**O que foi encontrado (Fase 1 — análise, schema/RLS reais via MCP Supabase):**
- Colunas de `plans`: públicas (`id`, `name`, `display_name`, `description`, `price_monthly`, `price_yearly`, `features`, `max_ai_reads`, `max_csv_rows_daily`, `max_child_churches`, `max_pdf_downloads`, `allowed_import_formats`, `allow_strict_mode`) vs. sensíveis (`bank_name`, `account_holder`, `account_document`, `pix_key`, `pix_qr_code_url`, exclusivas do checkout). O badge "Mais Popular" não é coluna — é derivado no client (`plan.name === "pro"`).
- RLS real (`pg_policies`, não só a descrição do doc): `plans_select_authenticated` — `SELECT`, `qual: (auth.uid() IS NOT NULL)` — confirma que hoje `anon` roda a query mas recebe 0 linhas (não erro).
- `PricingPlans.tsx` (`/planos`) faz `select("*")` — a linha inteira, incluindo os campos sensíveis, chega ao client autenticado hoje, só não é renderizada. Achado que decidiu a Fase 2: `PixPaymentModal.tsx` depende de `plan.pixKey`/`plan.pixQrCodeUrl` pra montar o checkout, então `/planos` **precisa** continuar lendo `plans` por inteiro — não faz sentido migrá-lo pra uma fonte só de colunas públicas.

**O que foi feito (Fase 2 — implementação):**
- **Migration `0027_public_plans_view.sql`:** primeira tentativa — `view` `public.public_plans` com só as colunas públicas + `grant select ... to anon, authenticated`. Views não têm RLS própria; o mecanismo real é a view rodar com as permissões do dono (bypassa a policy de linha de `plans` automaticamente) enquanto a exposição por coluna é garantida pela própria definição da view. `get_advisors(security)` acusou isso como `security_definer_view`, nível **ERROR** — falso-positivo aqui (`plans` é catálogo global sem dado por igreja), mas incômodo por ficar registrado como ERROR permanente nos advisors do projeto.
- **Migration `0028_public_plans_rpc.sql`:** substitui a view por uma função `get_public_plans()` `SECURITY DEFINER` equivalente (mesmas colunas, mesmo `grant execute ... to anon, authenticated`) — reavaliado com o usuário e escolhido porque o mesmo advisor classifica função `SECURITY DEFINER` exposta ao `anon` como **WARN**, não ERROR, e é o padrão que o projeto já usa (`accept_terms`, `default_free_plan_id()`, etc.) em vez de introduzir um tipo de objeto novo. Confirmado nível WARN nos advisors pós-migration, e testado de ponta a ponta via `curl` direto no REST do Supabase com a `anon key` (sem sessão) — devolve os 3 planos com as colunas certas, sem nenhum campo bancário/Pix no payload.
- **`src/types/index.ts`:** novo tipo `PublicPlan` (`Omit<Plan, "bankName" | "accountHolder" | "accountDocument" | "pixKey" | "pixQrCodeUrl">`).
- **`src/utils/plans.ts`:** novo `mapPublicPlanRow`/`PublicPlanRow`, ao lado do `mapPlanRow` existente — mesmo padrão camelCase, sem os campos bancários.
- **`src/pages/Landing/components/PricingSection.tsx`:** troca o array estático por `supabase.rpc("get_public_plans")` num `useEffect`, mapeado com `mapPublicPlanRow`. Removido o comentário de sincronização manual — não é mais dado duplicado.
- **`docs/database.md`:** nova linha na tabela de RPCs (`get_public_plans()`) e nota na seção de RLS de `plans` explicando a exceção pro `anon`.

**Decisões técnicas:**
- `PricingPlans.tsx` (`/planos`) **não foi migrado** pra `get_public_plans()` — decisão explícita, ver achado da Fase 1 acima (checkout precisa dos campos sensíveis, que a função pública nunca expõe). As duas telas convivem, cada uma lendo a fonte certa pro que precisa.
- View vs. função SECURITY DEFINER: a escolha final (função) não foi por causa de alguma diferença de segurança real entre as duas (o bypass de RLS é o mesmo mecanismo nos dois casos) — foi por como o linter automatizado do Supabase classifica cada tipo de objeto, e por consistência com o padrão já estabelecido no projeto.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos) + `get_advisors(security)` (só o WARN esperado, sem ERROR) + teste real via `curl` contra o REST do Supabase com a anon key. Teste visual da landing renderizando os cards no navegador não foi executado nesta sessão por falta de ambiente com browser automatizável.

### [2026-08-12] Botões de plano da landing + captura (ainda não consumida) do plano pretendido

**O que foi pedido:** texto de botão específico por plano nos cards da landing ("Assinar Profissional"/"Assinar Premium" em vez de "Começar Gratuitamente" genérico) e propagar o plano escolhido pra URL de cadastro, pra eventualmente pré-selecionar em `/planos`.

**O que foi encontrado (Fase 1 — análise):**
- Cada card já identifica seu plano por `plan.name` (`"free"`/`"pro"`/`"unlimited"`, vindo de `get_public_plans()`) — mesmo identificador usado em todo o código pra comparação (`plan.name === "pro"` pro badge "Mais Popular"). Decisão: o parâmetro de URL usa esse valor literal (`?plan=pro`), não uma tradução tipo "profissional"/"premium".
- `Login.tsx` já lê `?signup=1` via `useSearchParams()` — `?plan=` segue o mesmo padrão.
- **Achado que mudou o escopo do "pós-cadastro":** não existe tela de escolha de plano no onboarding hoje; `SignupForm.tsx` tem um `navigate("/dashboard")` após o cadastro, mas esse ramo (`signUp()` já com sessão) é código morto neste projeto — a confirmação de e-mail é obrigatória (já documentado em memória de sessões anteriores), então `signUp()` nunca retorna sessão imediata na prática. O "pós-cadastro" real acontece no primeiro **login** subsequente, em `Login.tsx` → `authenticate()` → `navigate("/dashboard")` — código compartilhado por **qualquer** login, não só o que vem de um CTA de plano. Amarrar um redirect pra `/planos` ali arriscaria disparar pra um login futuro sem relação alguma com este cadastro, enquanto a flag não fosse limpa.

**O que foi feito (Fase 2 — implementação, aprovada pelo usuário: capturar sem consumir nesta rodada):**
- **`src/pages/Landing/components/PricingSection.tsx`:** texto do CTA passa a ser dinâmico — `"Começar Gratuitamente"` fixo só pro plano com `priceMonthly === 0`; qualquer plano pago usa `` `Assinar ${plan.displayName}` ``. O `href` do CTA de plano pago passa a ser `/login?signup=1&plan={plan.name}` (plano gratuito continua em `/login?signup=1`, sem parâmetro).
- **Novo `src/utils/pendingPlan.ts`:** `storePendingPlan(planName)` grava `{ plan, capturedAt: Date.now() }` (JSON) no `localStorage`, não só o valor puro — pra permitir expiração numa leitura futura. Comentário no arquivo documenta o contrato pra quem for implementar o consumo depois: (a) descartar se `Date.now() - capturedAt > PENDING_PLAN_TTL_MS` (constante exportada, 30 minutos); (b) remover a chave do `localStorage` assim que lida uma vez — consumindo ou descartando por expiração —, nunca deixá-la persistente. Só a função de escrita existe por enquanto; nenhuma tela lê/consome ainda (evitar código morto de leitura sem consumidor real).
- **`src/pages/Login/Login.tsx`:** novo `useEffect` lendo `searchParams.get("plan")` (mesmo hook já usado pro `signup=1`) e chamando `storePendingPlan` quando presente.

**Decisões técnicas:**
- Redirect/pré-seleção pós-onboarding **propositalmente não implementado** nesta rodada — ver achado da Fase 1 sobre o `navigate("/dashboard")` de `authenticate()` ser compartilhado por todo login. Documentado aqui e no código (`pendingPlan.ts`) como parâmetro capturado mas não consumido, para uma implementação futura seguir o contrato de expiração/limpeza já especificado em vez de reinventar.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos). Teste visual real no navegador não foi executado nesta sessão por falta de ambiente com browser automatizável.
- Validado com `npx tsc --noEmit` e `npm run build` direto em `main` pós-merge (sem erros) antes do push, seguindo o mesmo procedimento das releases anteriores.

### [2026-08-12] Remoção de travessões do texto da landing page

**O que foi pedido:** o usuário identificou que o travessão (—) no texto estático da landing dava "cara de texto gerado por IA" e pediu para localizar todas as ocorrências no conteúdo visível (hero, sobre nós, cards de "como funciona", FAQ, planos, footer) e reescrever cada frase de forma fluida em português falado, sem troca mecânica por vírgula.

**O que foi feito:**
- Varredura com `grep` por `—`/`–` em todo `src/pages/Landing/` encontrou 6 ocorrências: 4 em texto renderizado (visível ao usuário) e 2 em comentários de código (não fazem parte do conteúdo da página, mantidos como estavam).
- **`src/pages/Landing/Landing.tsx`:** 3 ocorrências reescritas — descrição do card "Trilha de auditoria" (`HOW_IT_WORKS`), parágrafo do Hero e parágrafo da seção "Sobre nós" (menção à IBR Maceió).
- **`src/pages/Landing/components/FaqSection.tsx`:** 1 ocorrência reescrita — resposta da pergunta "Preciso saber contabilidade para usar a plataforma?".
- Nenhuma ocorrência encontrada em `PricingSection.tsx` fora de comentário de código.

**Decisões técnicas:**
- Cada frase foi reescrita com conectivo natural (vírgula + "com"/"e", aposto com vírgulas) em vez de substituição mecânica de `—` por `,` isolado, seguindo os exemplos fornecidos pelo usuário — o objetivo era manter a fluidez da frase, não só remover o caractere.
- Comentários de código com `—` (`Landing.tsx`, linha do comentário sobre `loading`; `PricingSection.tsx`, linha do comentário sobre RLS) foram deixados intactos: não são texto exibido ao visitante da landing, então não geram a impressão de "texto gerado por IA" visada pelo pedido.
- Validado com `npx tsc --noEmit` (sem erros). Build de produção e teste visual no navegador não foram executados nesta sessão (mudança é só de conteúdo textual, sem alteração de JSX/lógica); recomenda-se conferência visual rápida na preview do Vercel antes de promover para `main`.

### [2026-08-12] Header responsivo da landing (menu hambúrguer + âncoras Início/Sobre Nós)

**O que foi pedido:** o header da landing quebrava em tablet/mobile e não existia menu hambúrguer — os links de navegação simplesmente desapareciam abaixo de 768px sem nenhuma forma de acesso. Pedido: header com 3 estados (desktop em uma linha, tablet e mobile com hambúrguer), dropdown mobile com as âncoras + 2 CTAs, fechamento automático do menu ao clicar numa âncora, scroll suave, e duas âncoras novas ("Início", "Sobre Nós", com `id="sobre-nos"` a criar).

**O que foi encontrado (Fase 1 — análise):**
- Header (`Landing.tsx`): `<nav>` usava só `hidden md:flex` — abaixo de 768px a nav de âncoras (então só 4: Como Funciona/Planos/Dúvidas Frequentes/Contato) sumia por completo, sem hambúrguer. O grupo da direita (ThemeToggle + 2 CTAs) não tinha `hidden`/breakpoint nenhum, então em telas muito estreitas (375px) ele tentava conviver com a logo na mesma linha sem `flex-wrap`, causando overflow horizontal real (não só aperto visual).
- Não existiam âncoras "Início" nem "Sobre Nós" — a seção "Sobre nós" nem tinha `id`.
- Resto da página (Hero, grid "Como Funciona", `PricingSection` com CSS grid `auto-fit`, `Accordion` do FAQ) já usava breakpoints Tailwind (`sm:`/`lg:`) ou grid nativo responsivo — escopo do problema real ficou isolado ao header.
- Padrão de menu mobile já existente (`Sidebar.tsx`/`Layout.tsx`): drawer lateral fixo com backdrop, ícones `Menu`/`X` do lucide-react — usado para navegação de rotas do app autenticado. Não reaproveitado 1:1 (a landing navega por âncora na mesma página, não por rota), mas os ícones `Menu`/`X` e a paleta/blur do próprio header foram reaproveitados para o dropdown mobile, mantendo consistência visual.

**O que foi feito (Fase 2 — implementação, plano aprovado pelo usuário):**
- **`index.html`:** `class="scroll-smooth"` no `<html>` — rolagem suave nativa do navegador para qualquer âncora, sem JS de scroll customizado.
- **`src/pages/Landing/Landing.tsx`:** `NAV_LINKS` reordenado para Início → Sobre Nós → Como Funciona → Planos → Dúvidas Frequentes → Contato (`"#top"` no wrapper raiz da página para "Início" — rola para o topo real do documento, não para debaixo do header sticky; `id="sobre-nos"` adicionado à seção "Sobre nós"). Todas as seções-âncora (`#como-funciona`, `#sobre-nos`, `#planos`, `#duvidas`, `#contato`) ganharam `scroll-mt-16` (mesma altura do header, `h-16`) para o título da seção não ficar escondido atrás do header sticky ao rolar até ele.
- Header com 3 grupos: `<nav>` desktop (`hidden xl:flex`) e grupo de CTAs desktop (`hidden xl:flex`) só aparecem a partir de `xl`; abaixo disso, um grupo compacto (`flex xl:hidden`) mostra só ThemeToggle + botão hambúrguer (44×44px, `aria-expanded`/`aria-label` dinâmicos, ícone `Menu`/`X` alternando por estado `mobileMenuOpen`). Dropdown (`xl:hidden`, mesmo fundo/blur do header) some/aparece condicionalmente, com as 6 âncoras em lista vertical (`min-h-[44px]` cada) seguidas dos 2 CTAs empilhados (também `min-h-[44px]`); cada link/CTA do dropdown chama `closeMobileMenu` no `onClick`.
- Wordmark "Contabilidade Ministerial" ganhou `hidden sm:inline` (fica só o ícone abaixo de 640px) — sem isso, logo (213px) + grupo compacto (ThemeToggle com label + hambúrguer, ~176px) não cabiam nos ~335px disponíveis de um viewport de 375px, mesmo com a nav já escondida.

**Decisões técnicas:**
- **Breakpoint de colapso mudou de `lg` (1024px, conforme o plano original) para `xl` (1280px):** medido via Playwright que, com as 2 âncoras novas, nav (6 itens) + logo + CTAs desktop somam ~1040px de conteúdo, que não cabe nos ~960px disponíveis dentro do container `max-w-6xl` em 1024px — a única forma de manter tudo em uma linha sem encolher/quebrar texto (proibido pelo pedido) era adiar o breakpoint. Decisão tomada e aplicada sem pausar para confirmação porque o próprio critério de aceite do usuário ("nenhum item do header quebra linha ou fica cortado") já exigia essa mudança — manter `lg` violaria esse critério.
- **Item "Dúvidas Frequentes" da nav desktop abreviado para "Dúvidas" (via novo campo opcional `shortLabel` em `NAV_LINKS`), mantendo o texto completo no dropdown mobile e no `<h2>` da seção:** mesmo com o breakpoint em `xl`, o container real do header é limitado por `max-w-6xl` (1152px, igual ao resto da página) — a partir daí a largura disponível não cresce mais mesmo em monitores muito largos. Sem essa abreviação (+ redução de `gap-6`→`gap-4` na nav, `gap-4`→`gap-3` no header e `gap-3`→`gap-2` no grupo de CTAs), o conteúdo ficava ~5px maior que o espaço disponível — visualmente imperceptível na maioria das telas, mas sem margem de segurança nenhuma contra variação de fonte/renderização. Verificado que, sem essas reduções, os itens de nav mais longos ("Sobre Nós", "Como Funciona", "Dúvidas Frequentes") quebravam em duas linhas dentro do próprio link nos primeiros ~150px acima do breakpoint escolhido — exatamente o "aperto" que o pedido original queria evitar.
- Verificação feita com Playwright headless (Chromium já cacheado localmente, mesmo padrão de sessões anteriores) direto contra o dev server: nos 6 breakpoints testados (320, 375, 768, 1024, 1152, 1280px) não há overflow horizontal nem quebra de linha em nenhum item; em 375px o dropdown abre com as 6 âncoras completas + 2 CTAs, clicar em "Sobre Nós" fecha o menu e rola até a seção certa; em 1280px o header mostra tudo em uma linha só (hambúrguer não aparece).
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos).

### [2026-08-12] Novo favicon (Logo.azul.svg) — SVG + PNG/ICO/apple-touch-icon gerados

**O que foi pedido:** trocar o favicon (até então `wallet.svg`, ícone placeholder genérico) pelo novo logo da marca, cobrindo os formatos que navegadores/dispositivos modernos esperam além do SVG puro.

**O que foi feito:**
- `public/Logo.azul.svg` (anexo do usuário — corrigido de `Logo.azul.svg.svg`, extensão duplicada de como chegou) copiado para `public/favicon.svg`, usado direto por navegadores modernos (Chrome/Firefox/Edge) via `<link rel="icon" type="image/svg+xml">`.
- Formatos derivados gerados a partir do mesmo SVG com `sharp` (rasterização) + `png-to-ico` (empacotamento `.ico`) — instalados isoladamente numa pasta de trabalho fora do projeto (sem tocar `package.json`/lockfile, já que é uma ferramenta de geração usada uma vez, não uma dependência de runtime):
  - `favicon.ico` (16×16 + 32×32 combinados) — fallback para navegadores antigos.
  - `favicon-192.png`/`favicon-512.png` — ícones PWA/Android, mantendo os cantos transparentes do desenho original (o próprio SO decide a máscara).
  - `apple-touch-icon.png` (180×180) — único formato tratado diferente: em vez de herdar os cantos transparentes do SVG (arriscando renderizar como preto/branco em algumas versões do iOS, problema conhecido desse formato específico), os quatro cantos foram preenchidos (`flatten`) com a mesma cor de fundo do próprio desenho (`#00416B`), resultando num quadrado 100% sólido sem nenhuma linha de borda visível — o iOS aplica o próprio recorte arredondado por cima, sem duplicar arredondamento.
- `index.html`: 5 tags `<link>` (svg → ico → png 192 → png 512 → apple-touch-icon, nessa ordem) substituindo a única tag antiga (`wallet.svg`). `public/wallet.svg` removido (sem nenhuma outra referência no código — era só o favicon anterior).
- Não existe `manifest.json`/`site.webmanifest` no projeto — item 4 do pedido (atualizar ícones do manifest) não se aplica; **não foi criado um manifest novo**, já que isso seria PWA de verdade (escopo maior que "trocar o favicon") e não foi pedido.

**Decisões técnicas:**
- Antes de gerar qualquer coisa, renderizou-se o SVG original (`sharp`, respeitando o `viewBox`/`clip-path` como estão) pra inspeção visual — a suspeita inicial (bounding box dos paths do ícone parecia extrapolar o `viewBox` de 119×119) se mostrou falsa: o `clip-path` já recorta corretamente, o resultado é um selo/cruz completo dentro do quadrado azul arredondado, sem nada cortado.
- Validado de ponta a ponta com Playwright real (Chromium cacheado localmente) contra o dev server: as 5 tags `<link>` aparecem na ordem certa no `<head>`, as 5 URLs respondem `200` com o `content-type`/tamanho de arquivo esperado, sem erro de console. Inspeção visual direta dos PNGs gerados (`favicon-192.png`, `apple-touch-icon.png`) confirma cantos transparentes preservados no primeiro e quadrado 100% sólido (sem transparência/linha de borda) no segundo. Simulação real de "adicionar à tela inicial" num dispositivo físico não foi feita (fora do alcance desta sessão) — o que foi validado é que o arquivo certo, no tamanho certo, chega ao navegador.
- `npx tsc --noEmit`, `npm run build` (confirma que os 6 arquivos de `public/` são copiados pro `dist/`) e `npm run lint` sem erros novos.

### [2026-08-12] Logo unificado no Sidebar e na landing + rebranding "Contabilidade Ministerial" → "Contabilidade Igreja"

**O que foi pedido:** trocar os ícones genéricos do Sidebar (carteira) e do header da landing (seta de login) pelo novo `Logo.azul.svg` (já em uso como favicon), e corrigir a inconsistência de nome — a landing/telas de auth diziam "Contabilidade Ministerial" enquanto o Sidebar do app autenticado já dizia "Contabilidade Igreja".

**O que foi encontrado (grep por "Contabilidade Ministerial" em todo o projeto):**
- Voltadas ao usuário final: `Landing.tsx` (header, já no escopo do pedido, e footer), `Login.tsx`, `ResetPassword.tsx` (painel esquerdo dos dois), `index.html` (`<title>`/`og:title`).
- Fora de escopo, não tocadas: `docs/changelog.md` (registro histórico de sessão anterior — changelog é append-only, nunca reescrito) e `legacy-static/Login.dc.html` (protótipo estático arquivado como referência, não é código servido).
- `README.md` (título do repositório) — perguntado ao usuário; mantido como está (documentação interna, não é marca voltada ao usuário).

**O que foi feito:**
- `src/assets/logo-azul.svg`: cópia do `Logo.azul.svg` (mesmo arquivo do favicon, em `public/`) pro padrão já usado por assets inline do projeto (`chapel-illustration.svg`) — `public/` é servido bruto por URL (favicon), `src/assets/` é importado pelo bundler (uso inline em componentes); mesmo conteúdo, propósitos diferentes.
- `Sidebar.tsx`: badge azul + `WalletIcon` (ícone genérico de carteira) substituídos por `<img src={logoAzul}>` de 30×30 — o próprio SVG já tem o fundo azul arredondado embutido, então o wrapper `bg-orla-blue rounded-md` foi removido (evita arredondamento duplicado). Texto já era "Contabilidade Igreja", sem mudança.
- `Landing.tsx`: ícone `LogIn` (seta genérica) do header substituído por `<img src={logoAzul}>` de 24×24; texto do header e do footer trocado pra "Contabilidade Igreja".
- `Login.tsx`/`ResetPassword.tsx`: só o texto trocado pra "Contabilidade Igreja" — os ícones desses painéis (`LogIn`/`Lock`) não foram tocados, não fizeram parte do pedido nem da confirmação do usuário.
- `index.html`: `<title>` e `og:title` trocados de "Contabilidade Ministerial — Contabilidade para Igrejas" pra "Contabilidade Igreja — Contabilidade para Igrejas" (a segunda parte é a tagline de SEO, não o nome da marca — não mudou).

**Decisões técnicas:**
- Nenhum `rounded-*`/cor de fundo aplicado por CSS em cima do `<img>` do logo em nenhum dos dois lugares — o SVG já tem cantos arredondados + cantos transparentes embutidos (confirmado visualmente na sessão anterior, ao gerar o favicon); sobrepor arredondamento próprio via CSS criaria uma linha de borda dupla sutil, o mesmo problema já resolvido pro `apple-touch-icon`.
- Confirmado visualmente (renderização via `sharp` nos tamanhos exatos usados em produção — 30px do Sidebar, 24px do header da landing): o ícone permanece nítido, sem distorção, em ambos.
- Validado com `npx tsc --noEmit`, `npx vite build` (bundle confirma `logo-azul.svg` incluído nos assets) e `npx eslint .` — sem erros novos (`npm run build`/`npm run lint` tiveram uma instabilidade transitória da ferramenta de execução nesta sessão; os comandos equivalentes direto pelos binários funcionaram normalmente).

### [2026-08-12] Filtro de ações da Trilha de Auditoria vira multi-seleção (Acesso/Login oculto por padrão)

**O que foi pedido:** a listagem de `audit_logs` (append-only por design — "Registro imutável" é a garantia mostrada na própria tela) misturava eventos de Acesso/Login com ações administrativas, dificultando a revisão. Pedido explícito: **nenhum** DELETE/TRUNCATE/soft-delete em `audit_logs` sob nenhuma circunstância — a mudança é só na experiência de filtro da UI.

**O que foi encontrado (Fase 1 — análise, antes de decidir a Fase 2):**
- `AuditLogs.tsx`: as pílulas de ação (`ACTION_FILTERS`) já eram um filtro de **seleção única** (`actionFilter: AuditActionKey | "all"`) — ao clicar em "Edição Manual", o filtro (`l.actionKey !== actionFilter`) já excluía Acesso/Login corretamente. Ou seja, o item 1 do pedido (checar se selecionar outro filtro já esconde login) estava **correto por acaso**: funcionava, mas só porque o modelo era radio (um tipo por vez), não porque havia uma lógica de exclusão de login específica.
- O problema real: não existia meio-termo entre "Todas as ações" (mistura os 7 tipos, é o estado inicial da tela) e "exatamente 1 tipo" (exclui os outros 6, não só o login). Não dava pra ver, por exemplo, Edição Manual + Estorno + Aprovação de Caixa juntos, excluindo só Acesso/Login.
- Reportado ao usuário antes de prosseguir; confirmado com duas perguntas: (a) se "Senha Definida pelo Master" (`definicao_senha_direta`, ação sensível adicionada na sessão de 11/08, não citada na lista original de 5 tipos do pedido) deveria ficar visível por padrão junto das outras administrativas — confirmado que sim; (b) mecanismo de UI — pílulas viram multi-seleção (toggle independente por tipo) em vez de manter seleção única + checkbox à parte.

**O que foi feito (Fase 2 — implementação, aprovada pelo usuário):**
- **`src/pages/AuditLogs.tsx`:** `ACTION_FILTERS` (array com pseudo-item `"all"`) substituído por `ALL_ACTION_KEYS` (as 7 chaves de `ACTION_TYPES`) + `DEFAULT_VISIBLE_ACTIONS` (todas exceto `"acesso"`). Estado `actionFilter: AuditActionKey | "all"` virou `enabledActions: Set<AuditActionKey>`, inicializado com `DEFAULT_VISIBLE_ACTIONS`. Filtro em `filtered` (useMemo) trocado de comparação de igualdade única para `enabledActions.has(l.actionKey)`. Cada pílula agora é um toggle independente (`toggleAction`, liga/desliga sua própria chave no `Set`); novo botão de texto "Restaurar padrão" (`restoreDefaultActions`) reseta pro conjunto inicial (6 tipos administrativos, sem login).
- Nenhuma query ao Supabase mudou — o filtro continua sendo aplicado só no array já carregado (`logs`) em memória, no client; a chamada a `audit_logs` (`select`) que já buscava o mês inteiro sem filtro de `action_key` não foi tocada.

**Decisões técnicas:**
- **Filtro continua 100% client-side, não virou parâmetro de query:** a página já carregava o mês inteiro de uma vez e filtrava em memória (padrão pré-existente, ver `filtered = useMemo(...)`); manter esse padrão evita uma reformulação maior da função de busca só para um ajuste de UI, e o volume mensal de uma igreja não justifica paginação server-side aqui.
- **"Restaurar padrão" em vez de um par "Selecionar todos"/"Limpar seleção":** com 7 toggles individuais, a única lacuna real deixada pelo pedido era "como voltar ao estado recomendado depois de mexer nos filtros" — um atalho genérico de selecionar/limpar tudo não foi pedido e abriria mais uma decisão de design (o que "selecionar tudo" deveria fazer com o Acesso/Login) sem necessidade.
- **Nenhuma alteração em `audit_logs` no banco:** confirmado que a mudança é inteiramente de apresentação (estado de filtro em memória no componente React) — nenhuma migration, nenhuma policy, nenhuma função tocada. A garantia de "Registro imutável" já exibida na tela permanece intacta.
- Validado com `npx tsc --noEmit`, `npm run build` e `npm run lint` (sem erros novos). Teste visual real no navegador (abrir a tela, conferir que Acesso/Login some por padrão, alternar pílulas, "Restaurar padrão") não foi executado nesta sessão — `/auditoria` fica atrás de `ProtectedRoute` e não há credenciais de teste disponíveis; recomenda-se validar login real antes de promover para `main`.

### [2026-08-12] Hero da landing com fundo azul-gelo + redes sociais gerenciáveis no footer

**O que foi pedido:** (1) trocar o fundo do Hero (até então sem cor própria, só herdando `bg-white`/`bg-black` da página) por um tom bem claro/dessaturado de `orla-blue`, só nessa seção; (2) redes sociais no footer da landing, com URL/ativo/ordem editáveis pelo master via Governança.

**Antes de implementar:** perguntado ao usuário se a gestão de redes sociais deveria virar uma 5ª aba própria na Governança ou ficar dentro da aba "Landing Page" já existente — decidido reaproveitar "Landing Page" (volume pequeno, mesma responsabilidade de "conteúdo da landing pública" do `LandingImagesPanel`) e informado ao usuário antes de seguir. Confirmado por pergunta direta ao usuário que o seed inicial é só Instagram, Facebook, YouTube e WhatsApp (sem TikTok/LinkedIn/X).

**O que foi feito:**
- **Migration `0030_social_links.sql`:** tabela `social_links` (`platform` PK — mesmo padrão de `landing_images.key` —, `url` nullable, `display_order`, `is_active` default `false`), seed das 4 redes confirmadas (inativas, sem URL). RLS: duas policies de `SELECT` (`is_active = true` p/ `anon`, `is_master()` p/ o painel ver/gerenciar as inativas) + `INSERT`/`UPDATE`/`DELETE` só `master` (`social_links_insert/update/delete_master`). Aplicada via MCP `apply_migration`.
- **`src/types/index.ts`:** `SocialPlatform` (union das 4 chaves) + interface `SocialLink`.
- **`src/utils/socialLinks.ts`** (novo): `SOCIAL_PLATFORM_META` (label + ícone lucide-react por rede — `Instagram`, `Facebook`, `Youtube`, `MessageCircle` p/ WhatsApp, mesmo ícone já usado no bloco de Contato), `mapSocialLinkRow`, `isValidSocialUrl` (exige `https://` + `URL` parseável).
- **`src/pages/Governance/components/SocialLinksPanel.tsx`** (novo): lista das 4 redes com campo de URL + botão "Salvar" (valida antes de gravar), toggle ativo/inativo (bloqueado sem URL válida, com toast explicando por quê) e setas de reordenar (swap de `display_order` entre vizinhos, via `upsert` em lote). Renderizado dentro da aba "landing" de `Governance.tsx`, abaixo do `LandingImagesPanel` já existente.
- **`src/pages/Landing/Landing.tsx`:** novo `useEffect` lendo `social_links` (só `is_active = true`, ordenado por `display_order`) via a policy pública; footer ganhou uma linha de ícones circulares (um `<a target="_blank">` por rede ativa e com URL) acima da linha de copyright/login já existente — sem nenhum link ativo, a linha simplesmente não renderiza (`socialLinks.length > 0`). Hero (`<section>` do topo) ganhou `bg-[#eef3fc] dark:bg-[#0b1220]` — tom claro/dessaturado de `orla-blue` (`#0057ff`) no claro e seu equivalente escuro no dark, só nessa seção; as demais seções continuam na alternância `neutral-50`/branco já existente, sem mudança.

**Decisões técnicas:**
- **`platform` como PK (não um `id` + `created_at` separados):** o conjunto de redes é fixo e seedado (sem criar/remover linha pela UI), exatamente como `landing_images.key` — reaproveitar o mesmo desenho evita uma tabela com forma diferente para um caso de uso idêntico.
- **Duas policies de `SELECT` em vez de uma só `using (true)` (diferente de `landing_images`):** o pedido explícito era `SELECT` público só para `is_active = true`; como o master também precisa ver as inativas pra gerenciar no painel, a segunda policy (`is_master()`) foi necessária — a alternativa seria o painel ler por uma RPC/view intermediária, desnecessário aqui já que não há coluna sensível (mesmo racional de `landing_images`, só com o recorte de ativo/inativo a mais).
- **Nenhuma UI de adicionar/remover rede social:** não foi pedido (a lista de plataformas já foi confirmada e fechada) e abriria a necessidade de mapear ícone/validação para uma plataforma arbitrária digitada pelo master — fora do escopo atual.
- **Validado com `npx tsc --noEmit` e `npm run build`** (sem erros novos). Dev server (`npm run dev`) iniciado e parado logo depois só para confirmar que sobe sem erro — **teste visual real no navegador não foi executado nesta sessão** (sem ferramenta de screenshot/browser disponível no ambiente); recomenda-se abrir a landing e a aba "Landing Page" da Governança antes de promover para `main`, conferindo especialmente o tom do Hero nos dois temas e o comportamento do toggle "ativar sem URL".

### [2026-08-12] Merge para main e release v1.11.0

**O que foi feito:** commit único em `hmg` (`91a1d78`) reunindo todo o trabalho pendente sem commit até então — landing pública (Hero/Como Funciona/Sobre Nós/Planos/FAQ, migrations `0027`/`0028` da RPC pública de planos), imagens editáveis da landing (`LandingImagesPanel`, migration `0029`), Hero azul-gelo + redes sociais no footer (`SocialLinksPanel`, migration `0030`), favicon novo (`Logo.azul.svg` + derivados) e rebranding "Contabilidade Ministerial" → "Contabilidade Igreja", e o filtro multi-seleção da Trilha de Auditoria — já aprovado pelo usuário. Push para `hmg`, merge `--no-ff` para `main` (`91396dc`), `npx tsc --noEmit`/`npm run build` revalidados direto em `main` pós-merge (sem conflitos), tag `v1.11.0` e Release criada no GitHub.

**Decisão técnica:** todas essas mudanças já estavam na working tree sem nenhum commit anterior (sessões passadas implementaram mas não commitaram) — em vez de tentar recriar uma história granular por feature via `git add -p` (arriscado sem revisão interativa real, e vários arquivos como `index.html`/`Landing.tsx` são tocados por mais de uma feature), optou-se por um único commit abrangente na `hmg`, mesmo padrão já usado pelo repositório de bundlar múltiplas mudanças relacionadas num único commit/merge (ex.: `3595ff9`).

### [2026-08-12] Corrige uploads órfãos de "Como Funciona", carrossel do Hero e header/footer completos da landing

**O que foi pedido:** corrigir um bug de UX enganosa em Governança > Landing Page (master subia imagem numa seção e ela nunca aparecia no site) e implementar melhorias no header, footer e Hero da landing pública.

**Fase 1 (análise, confirmada com o usuário antes de implementar):**
- Confirmado por consulta direta ao banco: `landing_images.feature_livro_caixa` e `feature_ia` tinham `image_url` preenchida (upload feito pelo master), mas a seção "Como Funciona" em `Landing.tsx` é um grid estático de ícones desde uma rodada anterior — nunca lia essas 2 chaves (nem as outras 2 `feature_*`, vazias). 2 linhas órfãs confirmadas.
- Apresentadas 2 abordagens pro carrossel do Hero (tabela dedicada `landing_hero_images` 1:N vs. generalizar `landing_images` inteira para 1:N) — usuário aprovou a tabela dedicada (opção a), evitando forçar `display_order`/reordenação em seções que são sempre 1 imagem só (ex. `sobre_nos`).
- Usuário optou por remover os 4 cards de upload de feature da Governança (em vez de reaproveitá-los fazendo "Como Funciona" voltar a exibir imagem).

**O que foi feito:**
- **Migration `0031_landing_hero_carousel.sql`** (aplicada via MCP): tabela `landing_hero_images` (`id` PK, `image_url` obrigatória, `display_order`, `is_active` default `true`); RLS com o mesmo recorte de duas policies de `social_links` (`is_active = true` p/ `anon`, `is_master()` p/ o painel). Migra a imagem já cadastrada em `landing_images.key = 'hero'` como a primeira linha do carrossel (não perde upload existente) e remove as chaves órfãs (`hero`, `feature_livro_caixa`, `feature_ia`, `feature_multi_igreja`, `feature_auditoria`) de `landing_images` — só resta `sobre_nos`.
- **`src/types/index.ts`:** `LandingImageKey` reduzido a `"sobre_nos"`; nova interface `LandingHeroImage`.
- **`src/utils/landingImages.ts`:** `LANDING_IMAGE_SECTIONS` reduzido a 1 entrada (`sobre_nos`).
- **`src/utils/landingHeroImages.ts`** (novo): `mapLandingHeroImageRow`.
- **`src/pages/Landing/components/HeroCarousel.tsx`** (novo): recebe `images: string[]` — 0 imagens não renderiza nada, 1 imagem comportamento estático idêntico ao anterior, 2+ carrossel automático (5s) com dots clicáveis, pausa em `onMouseEnter`, mesmos tokens visuais (borda/sombra/raio) das demais seções com imagem.
- **`src/pages/Governance/components/HeroImagesPanel.tsx`** (novo) + plugado em `Governance.tsx` (aba "Landing Page", acima de `LandingImagesPanel`): adicionar imagem (upload), remover, reordenar (setas, mesmo padrão de `SocialLinksPanel`) — sem toggle de ativo/inativo na UI (não pedido; a coluna existe no banco mas toda imagem nova já entra ativa).
- **`src/components/ThemeToggle.tsx`:** removido o texto "Modo claro"/"Modo escuro" — só o ícone (sol/lua) num botão circular `w-9 h-9`, com `title`/`aria-label` "Alternar tema".
- **`src/pages/Landing/Landing.tsx`:** header com "Entrar" (era "Já tenho conta") e "Criar Conta" (era "Começar Gratuitamente") — só no header (desktop + menu mobile); a âncora "Contato" saiu de `NAV_LINKS` (a seção `#contato` em si continua intacta, incluindo o botão do WhatsApp). Hero passou a ler `landing_hero_images` e renderizar via `<HeroCarousel>`. Footer reconstruído em 3 colunas — logo+nome+tagline; navegação (mesmas âncoras do header + Contato, via novo `FOOTER_NAV_LINKS`); contato (ícones de redes sociais já existentes + novo link "Falar no WhatsApp") — mantendo a linha final de copyright/ano dinâmico e o link "Entrar na plataforma" que já existiam.

**Decisões técnicas:**
- **Tabela dedicada em vez de generalizar `landing_images`:** só o Hero precisa de 1:N hoje; forçar isso nas demais seções (sempre 1 imagem) seria complexidade permanente sem uso real — mesmo racional já usado para justificar `social_links` ter 2 policies de `SELECT` em vez de uma.
- **Sem toggle de ativo/inativo no `HeroImagesPanel`:** a coluna `is_active` existe (mesmo padrão de `social_links`/paridade de schema), mas nenhuma imagem nova precisa nascer inativa — expor o toggle sem um caso de uso real seria UI sem função.
- **Validado com `npx tsc --noEmit` e `npm run build`** (sem erros). **Teste visual real desta vez**: dev server + Playwright (headless Chromium, já cacheado no ambiente) navegando a landing em light/dark/mobile — header com "Entrar"/"Criar Conta"/toggle só-ícone/sem "Contato" confirmado nos 3, Hero renderizando a imagem migrada (1 imagem = estático, como esperado), footer nas 3 colunas com WhatsApp e nav completa, `console --errors` limpo nos dois temas.

### [2026-08-12] Merge para main e release v1.12.0

**O que foi feito:** commit `5eaef7f` em `hmg` (correção dos uploads órfãos, carrossel do Hero, header/footer completos — detalhado na entrada acima) enviado para `hmg`, merge `--no-ff` para `main` (`a74443b`), `npx tsc --noEmit`/`npm run build` revalidados direto em `main` pós-merge (sem conflitos, sem drift no working tree), tag `v1.12.0` e Release criada no GitHub.
