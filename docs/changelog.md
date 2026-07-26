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
