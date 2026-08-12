# Permissões (RBAC)

## Papéis

| Papel | Escopo | Descrição |
|---|---|---|
| `master` | Todas as igrejas | Admin Master da SaaS. Acesso irrestrito (bypass de RLS via `is_master()`). Nunca selecionável em nenhum formulário/fluxo do app — só atribuído por alteração direta no banco. Não pertence a nenhuma igreja (`church_id = null`); usa o seletor **"Igreja em Gestão"** na Sidebar para navegar pelas telas normais como se fosse o Admin da igreja escolhida. |
| `Admin` | Própria igreja | Gestão completa da própria igreja: Livro Caixa, Importação, Usuários, Auditoria. |
| `Tesoureiro` | Própria igreja | Lança/importa no Livro Caixa; sem acesso a Usuários/Auditoria. |
| `Auditor` | Própria igreja | Só leitura/fiscalização — **sem** acesso a Importação (não lança/importa nada) nem a Usuários. |
| `Conselho Fiscal` | Própria igreja | Só leitura/fiscalização — mesmas restrições do Auditor (sem Importação, sem Usuários). |

`ASSIGNABLE_ROLES` (`src/types/index.ts`) é a lista das 4 roles atribuíveis pela UI (exclui `master`) — sempre usar essa constante em selects de perfil de acesso em vez de listar manualmente.

## Matriz de rotas

| Rota | `master` | `Admin` | `Tesoureiro` | `Auditor` | `Conselho Fiscal` |
|---|:---:|:---:|:---:|:---:|:---:|
| `/governanca` | ✅ (exclusiva) | ❌ | ❌ | ❌ | ❌ |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/livro-caixa` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/importacao` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/usuarios` | ✅ (visão global) | ✅ (própria igreja) | ❌ | ❌ | ❌ |
| `/auditoria` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `/planos` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/detalhes-igreja` (e `/detalhes-igreja/:churchId`) | ✅ (qualquer igreja) | ✅ (própria igreja/filha) | ❌ | ❌ | ❌ |

Definida em dois lugares que precisam ficar espelhados: `src/App.tsx` (`ProtectedRoute allowedRoles`, o guard real) e `src/components/Sidebar.tsx` (`NAV_ITEMS[].allowedRoles`, só esconde o item do menu). Acesso direto pela URL a uma rota não permitida é redirecionado pelo `ProtectedRoute` (para `/dashboard`, ou `/governanca` se for `master`) — nunca uma tela de "Acesso Negado" separada.

**Por que Auditor/Conselho Fiscal ficam de fora de `/importacao`:** a RLS (`transactions_insert_treasury`/`import_history_insert_treasury`) e a própria Edge Function `parse-statement` só aceitam `Admin`/`Tesoureiro`/`master` — mostrar a tela para esses dois papéis deixaria os botões visíveis sem nenhuma ação funcionar de verdade (RLS bloqueando por baixo).

## Tela de Usuários — visão por papel

- **Admin:** vê e gerencia só os membros da própria igreja (`church_id` sempre filtrado — tanto explicitamente na query quanto pela RLS por baixo).
- **`master`:** visão global (todos os membros de todas as igrejas), com coluna e filtro **"Igreja"** exclusivos dele; o próprio `master` nunca aparece nessa listagem (`.neq("role", "master")`). Pode editar nome/e-mail/CPF de qualquer membro (`master_update_profile`), e role/status via as mesmas RPCs que o Admin usa.

### Regra unificada de gestão de usuário ("Ações Rápidas")

Vale igualmente para **toda** ação de gestão sobre outro usuário — editar, excluir, cancelar convite, resetar senha, trocar role/status — reforçada em cada RPC/Edge Function (`admin_update_user_role`, `admin_set_user_status`, `admin_delete_user`, `admin_update_user_profile`, `cancel-invite`, `generate-reset-link`, `admin-update-user-profile`, `admin-set-user-password`), nunca só no componente:

- **`master`:** gerencia qualquer usuário, exceto ele mesmo.
- **`Admin`:** gerencia só `Tesoureiro`/`Auditor`/`Conselho Fiscal` da própria igreja **ou de uma igreja filha direta** — nunca outro `Admin`, nunca o `master`, mesmo dentro da mesma igreja. A query da tela de Usuários hoje nunca traz membros de filha para a lista do Admin, então esse trecho do alcance só importa se essas RPCs forem reaproveitadas em outra tela (ex.: `ChurchDetails`).
- **`Tesoureiro`/`Auditor`/`Conselho Fiscal`:** não gerenciam ninguém — nenhuma ação aparece em nenhuma linha.
- **Enforcement real é sempre no backend** — o booleano no componente (`canManageUser`) só decide se o ícone aparece; a RPC/Edge Function decide se a operação é aceita.
- **Corrigido nesta rodada (migration `0025`):** até então, `admin_update_user_role`/`admin_set_user_status` nunca checavam o `role` do alvo — um Admin conseguia rebaixar/bloquear outro Admin da própria igreja sem barreira alguma, desde a migration `0009`. `generate-reset-link` tinha o mesmo buraco e ainda era mais restrita (só "mesma igreja exata", sem alcance de filha direta) — as três agora seguem a regra acima.
- **Corrigido numa rodada posterior (migration `0026` + Edge Functions `admin-update-user-profile`/`admin-set-user-password`):** `admin_update_user_profile`/`master_update_profile` só escreviam `public.profiles.email`, nunca sincronizavam o e-mail de login em `auth.users` — sempre que um Admin/Master editava o e-mail de alguém, os dois campos ficavam divergentes e o próximo "Resetar Senha / Gerar Link" desse usuário falhava com `404 User with this email not found` (confirmado em produção: um usuário real chegou a ficar nesse estado). A edição de nome/e-mail pelo Admin/Master agora passa pela Edge Function `admin-update-user-profile`, que sincroniza os dois lados atomicamente (ver `database.md`). Aproveitando o mesmo levantamento, `generate-reset-link` também passou a resolver o usuário por `id` em vez de pelo e-mail do profile, então mesmo um registro que já esteja divergente não quebra mais o fluxo.

**Ações e efeitos:**
- **Editar (ícone `Pencil`):** abre modal com nome/e-mail. Chama a Edge Function `admin-update-user-profile`, que por dentro usa `master_update_profile` (se quem edita é o master) ou `admin_update_user_profile` (mesmo alcance/checagem da regra acima) para gravar `public.profiles` **e** sincroniza `auth.users.email` via Admin API na mesma operação (ver `database.md`) — antes os dois só ficavam sincronizados por acaso, hoje sempre ficam. `church_id` não é editável por este modal — decisão explícita, ver `changelog.md` (efeito colateral: mudar a igreja de alguém quebraria a resolução do nome do autor em lançamentos/logs antigos na igreja de origem, já que `usersById` no front é escopado por igreja para quem não é master).
- **Definir Senha (só `master`, dentro do modal de Editar):** seção "Definir nova senha (opcional)", visível só para o master — define a senha do usuário direto via Edge Function `admin-set-user-password` (`admin.updateUserById`), sem gerar nem enviar link. Atalho de emergência para quando o usuário não tem acesso ao e-mail cadastrado; convive com "Resetar Senha / Gerar Link" (ícone `KeyRound`), que continua sendo o fluxo normal. Restrito ao master porque ele literalmente sabe a senha por um instante — por isso o log em `audit_logs` é obrigatório e usa um `action_key` próprio (`'definicao_senha_direta'`) para ficar destacado na Trilha de Auditoria em vez de se misturar com edições genéricas.
- **Excluir (`Ativo`/`Inativo`, ícone `Trash2`):** RPC `admin_delete_user` — soft-delete, `status` vira `'Excluído'` (estado terminal, sem período de graça, sem RPC de volta). Preserva o perfil (nome/e-mail) porque `audit_logs`/`transactions`/`import_history` referenciam `profiles(id)` sem `ON DELETE CASCADE` — um hard delete quebraria a trilha de auditoria.
- **Cancelar Convite (`Convite Pendente`, ícone `Ban`):** Edge Function `cancel-invite` — hard delete real (`auth.admin.deleteUser`), seguro porque esse perfil nunca gerou nenhuma linha de histórico.
- **`Excluído`:** tratamento visual "apagado" exclusivo desta tela — avatar/nome com opacidade reduzida, badge de status em tom neutro, badge de role deixa de ser clicável, coluna "Ações Rápidas" fica vazia (nenhuma ação, incluindo Editar). Em qualquer outro lugar (autor de lançamento, log de auditoria, etc.) o nome aparece normal — ali é só metadado histórico, não gestão da pessoa. `status = 'Excluído'` bloqueia login (`has_role()`/`is_active()` tratam como `'Inativo'`) e força logout imediato de sessão já ativa (mesmo listener Realtime do `AuthContext` que já cobria `'Inativo'`).
- Toda exclusão/cancelamento de convite passa por modal de confirmação explícito (nome + e-mail visíveis, ação descrita como irreversível). Edição de nome/e-mail salva direto, sem confirmação extra (mesmo padrão de `master_update_profile`/`update_own_profile`, que já editam sem esse passo).

## Módulo de Governança (só `master`)

CRUD de igrejas (`/governanca`): busca por nome/e-mail/CEP/responsável, filtro de hierarquia (Principal × Filha) e data de cadastro, paginação (10/página). O botão "Detalhes" de cada linha **navega** para `/detalhes-igreja/:churchId` (página dedicada, ver seção abaixo) em vez de abrir modal. A tabela de igrejas também tem um seletor de **Plano** por linha — o Master pode trocar o plano de qualquer igreja a qualquer momento, direto, sem depender de uma solicitação de pagamento aprovada.

Segunda aba, **"Solicitações de Assinatura (Pix)"** (`PaymentRequestsPanel`): lista `payment_requests` com `status = 'pending'` (igreja, usuário, plano solicitado, ciclo, data). Aprovar/rejeitar chama `admin_approve_payment_request`/`admin_reject_payment_request` — aprovar aplica o plano na igreja, rejeitar só destrava `subscription_status` (volta para `'active'` no plano atual).

Terceira aba, **"Gestão de Planos & Dados Bancários"** (`PlanManagementPanel`/`EditPlanModal`): edição completa dos 3 planos fixos do catálogo — nome, descrição, preços (mensal/anual), benefícios (`features`, lista livre editável), limites operacionais (leituras de IA/PDFs/subcongregações, com opção "Ilimitado" por campo, formatos de importação permitidos e liberação do Modo Estrito) e os dados bancários/Pix de recebimento (banco, titular, CPF/CNPJ, chave Pix, QR Code — upload direto para o bucket público `plan-assets` ou URL colada). Grava direto em `plans` (`UPDATE` liberado só para `master` via RLS `plans_update_master`, migration `0023`) — não há RPC intermediária, mesmo padrão de `churches_update_master`. Como a rota `/governanca` inteira já é restrita a `allowedRoles={["master"]}` (`App.tsx`), não há checagem de papel adicional dentro do componente.

## Página de Detalhes da Igreja (`/detalhes-igreja`, `ChurchDetails.tsx`)

Acesso restrito a `Admin`/`master` — `Tesoureiro`/`Auditor`/`Conselho Fiscal` não têm mais nem visão de leitura (nem item no menu, nem acesso direto pela URL). Duas entradas para a mesma página: o Master navega vindo de Governança (`/detalhes-igreja/:churchId`); o Admin acessa a **própria** igreja pelo item "Detalhes da Igreja" da Sidebar (`/detalhes-igreja`, sem parâmetro — resolve via `effectiveChurchId`).

- **Edição dos dados cadastrais** (nome, endereço, contato, CNPJ): `master` edita qualquer igreja; `Admin` só a própria igreja ou uma **filha direta** dela (`canEdit` no componente, reforçado no servidor pela RPC `update_church_profile`). Os demais papéis (Tesoureiro/Auditor/Conselho Fiscal) só visualizam. Reatribuir "Igreja Mãe" é exclusivo do master (campo nem aparece pra quem não é master). Ativar/Desativar a igreja também é exclusivo do master.
- **Membros/Admins** (paginado, 5/página): role/status editáveis por quem tem `canEdit` (mesmas RPCs `admin_update_user_role`/`admin_set_user_status` de `/usuarios`, que já aceitam alvo na própria igreja ou numa filha direta). "Adicionar Membro" chama `invite-user`.
- **Igrejas Filhas/Subcongregações** (paginado, 5/página): lista `churches` com `parent_church_id = <esta igreja>`. Botão "Adicionar Igreja Filha" (`AddChildChurchModal`) chama a RPC `create_child_church` — cadastro rápido (nome + responsável + e-mail/telefone opcionais; endereço fica em branco, completado depois na página da própria filha). Clicar numa linha navega para `/detalhes-igreja/:childId`. **A seção inteira (listagem + botão) só aparece quando a igreja em exibição é uma matriz** (`parent_church_id` nulo) — se a própria igreja já é uma filha, a seção nem renderiza, e o botão exige também `canEdit`. Hierarquia de só 2 níveis, sem netos: reforçada tanto na RPC (`create_child_church` rejeita se o alvo já for filha) quanto por um trigger de banco (`prevent_grandchild_church`, cobre até a reatribuição de "Igreja Mãe" feita pelo master via `UPDATE` direto).
- Validação de "nome obrigatório, resto opcional" (não exige mais endereço completo para salvar) — igrejas nascem sem endereço (autocadastro, cadastro rápido de filha) e devem poder ser completadas aos poucos.

## Planos de Assinatura e Autocadastro

- **Autocadastro (`/login`, alternando para "Cadastre sua Igreja"):** `SignupForm` cria o usuário via `supabase.auth.signUp()` (role `Admin`, `church_name` no metadata, sem `church_id` ainda) e chama a RPC `complete_pending_church_signup()` para criar a igreja no plano **Free** e vincular o profile — sem passar por nenhum fluxo de convite/Admin. Só coleta nome do responsável, e-mail, senha e nome da igreja; endereço fica em branco até ser completado depois em `/detalhes-igreja`. **Se o projeto exigir confirmação de e-mail** (`signUp()` sem sessão), a igreja só é criada no primeiro login pós-confirmação — `AuthContext.signIn()` chama a mesma RPC (idempotente) antes de buscar o profile, exatamente para cobrir esse caso.
- **`/planos`:** acessível a todos os papéis de igreja (inclusive `master`, gerenciando a igreja escolhida na Sidebar). Mostra os 3 planos (Gratuito/Profissional/Premium — nomes de exibição em `plans.display_name`; os identificadores internos `name` continuam `free`/`pro`/`unlimited`) com toggle Mensal/Anual, buscando nome/preço/descrição/benefícios direto de `plans` (sem nenhum texto fixo no componente — tudo vem do que o master configurou em "Gestão de Planos"); ao escolher um plano pago, abre o `PixPaymentModal` (QR Code + chave Pix com botão "Copiar Chave" + titular/CPF-CNPJ/banco, todos vindos do plano, mais o link de WhatsApp com comprovante e o botão "Já fiz o Pix / Notificar Admin", que chama `request_subscription_change` — só Admin/Tesoureiro da própria igreja). Se o plano ainda não tiver `pix_key` configurada, mostra um aviso no lugar dos dados bancários em vez de quebrar o modal.
- **`usePlanLimits(churchId)`:** hook que resolve o plano da igreja + uso do mês corrente (`usage_counters`) em `canUseAI()`/`canDownloadPDF()`/`canAddSubchurch()`/`canImportFormat(format)`/`canUseStrictMode()`. Usado para bloquear (com convite para upgrade via `PricingModal`) a Importação por IA e o formato do arquivo enviado (`StatementImport.tsx`), o toggle de Modo Estrito (`AiChatPanel.tsx`, desabilitado com badge "Pro" quando o plano não libera), a exportação de PDF do Livro Caixa (`CashBook.tsx`) e o cadastro de igreja filha (`ChurchDetails.tsx`) quando a cota do plano é excedida; incrementa o contador (`increment_usage_counter`) só quando a ação de fato é executada. `canAddSubchurch()` também é reforçado no servidor por `create_child_church` (`plans.max_child_churches`, `-1` = ilimitado) — `canImportFormat`/`canUseStrictMode` **só existem no frontend**, a Edge Function `parse-statement` não reforça `allowed_import_formats`/`allow_strict_mode` no servidor.

## Regras de segurança reforçadas no banco (não só na UI)

- `admin_update_user_role`/`admin_set_user_status`/`admin_delete_user`/`admin_update_user_profile`/`cancel-invite`/`generate-reset-link`/`admin-update-user-profile` exigem, todas, que o alvo pertença à **mesma igreja** de quem chama, ou a uma **igreja filha direta** dela, e que o `role` do alvo não seja `Admin`/`master`, a menos que o chamador seja `master` — sem isso, um Admin poderia gerenciar (editar/excluir/resetar senha/trocar role ou status de) usuário de uma igreja não relacionada, ou de outro Admin da própria igreja. `admin_update_user_role`/`admin_set_user_status`/`admin_update_user_profile` também rejeitam qualquer alteração se o alvo já estiver `'Excluído'`. `generate-reset-link`/`admin-update-user-profile` conferem isso **antes** de chamar a Admin API (que usa a service-role key e ignora RLS) — a checagem tem que vir antes da chamada sensível, não depois (só para log). `admin-set-user-password` é mais restrita ainda: só `master`, nunca o próprio `id` do chamador, nunca alvo `master`.
- Igreja desativada bloqueia login de todos os seus membros (`is_active()`/`has_role()` checam `churches.is_active`) e força logout de sessões já ativas via Realtime.
- Usuário com `status = 'Inativo'` tem o profile escondido pela RLS (`is_active()`) — `AuthContext.signIn()` trata isso como conta inativa, sem revelar se o e-mail existe.

Para o detalhe de *como* essas regras foram implementadas (SQL exato, migrations), ver [`database.md`](./database.md). Para o histórico de bugs de RBAC encontrados e corrigidos (inclusive a auditoria completa com teste ao vivo em produção), ver [`changelog.md`](./changelog.md).

## Aceite obrigatório dos Termos de Uso (independente de papel)

`profiles.termo_aceito = false` bloqueia **toda** a árvore de rotas protegidas — inclusive `master` — antes mesmo da checagem de `allowedRoles`, no mesmo ponto do `ProtectedRoute` onde `isPasswordRecovery` já é tratado. Enquanto pendente, `TermsAcceptanceModal` é renderizado em vez do `Outlet` (nenhuma tela ou dado da igreja carrega antes do aceite). Aceitar chama a RPC `accept_terms`, que grava o histórico imutável em `termo_aceite_registros`, ativa a flag e loga `aceite_termos` em `audit_logs` — ver [`database.md`](./database.md).
