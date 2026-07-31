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

## Módulo de Governança (só `master`)

CRUD de igrejas (`/governanca`): busca por nome/e-mail/CEP/responsável, filtro de hierarquia (Principal × Filha) e data de cadastro, paginação (10/página). O botão "Detalhes" de cada linha **navega** para `/detalhes-igreja/:churchId` (página dedicada, ver seção abaixo) em vez de abrir modal. A tabela de igrejas também tem um seletor de **Plano** por linha — o Master pode trocar o plano de qualquer igreja a qualquer momento, direto, sem depender de uma solicitação de pagamento aprovada.

Segunda aba, **"Solicitações de Assinatura (Pix)"** (`PaymentRequestsPanel`): lista `payment_requests` com `status = 'pending'` (igreja, usuário, plano solicitado, ciclo, data). Aprovar/rejeitar chama `admin_approve_payment_request`/`admin_reject_payment_request` — aprovar aplica o plano na igreja, rejeitar só destrava `subscription_status` (volta para `'active'` no plano atual).

## Página de Detalhes da Igreja (`/detalhes-igreja`, `ChurchDetails.tsx`)

Acesso restrito a `Admin`/`master` — `Tesoureiro`/`Auditor`/`Conselho Fiscal` não têm mais nem visão de leitura (nem item no menu, nem acesso direto pela URL). Duas entradas para a mesma página: o Master navega vindo de Governança (`/detalhes-igreja/:churchId`); o Admin acessa a **própria** igreja pelo item "Detalhes da Igreja" da Sidebar (`/detalhes-igreja`, sem parâmetro — resolve via `effectiveChurchId`).

- **Edição dos dados cadastrais** (nome, endereço, contato, CNPJ): `master` edita qualquer igreja; `Admin` só a própria igreja ou uma **filha direta** dela (`canEdit` no componente, reforçado no servidor pela RPC `update_church_profile`). Os demais papéis (Tesoureiro/Auditor/Conselho Fiscal) só visualizam. Reatribuir "Igreja Mãe" é exclusivo do master (campo nem aparece pra quem não é master). Ativar/Desativar a igreja também é exclusivo do master.
- **Membros/Admins** (paginado, 5/página): role/status editáveis por quem tem `canEdit` (mesmas RPCs `admin_update_user_role`/`admin_set_user_status` de `/usuarios`, que já aceitam alvo na própria igreja ou numa filha direta). "Adicionar Membro" chama `invite-user`.
- **Igrejas Filhas/Subcongregações** (paginado, 5/página): lista `churches` com `parent_church_id = <esta igreja>`. Botão "Adicionar Igreja Filha" (`AddChildChurchModal`) chama a RPC `create_child_church` — cadastro rápido (nome + responsável + e-mail/telefone opcionais; endereço fica em branco, completado depois na página da própria filha). Clicar numa linha navega para `/detalhes-igreja/:childId`. **A seção inteira (listagem + botão) só aparece quando a igreja em exibição é uma matriz** (`parent_church_id` nulo) — se a própria igreja já é uma filha, a seção nem renderiza, e o botão exige também `canEdit`. Hierarquia de só 2 níveis, sem netos: reforçada tanto na RPC (`create_child_church` rejeita se o alvo já for filha) quanto por um trigger de banco (`prevent_grandchild_church`, cobre até a reatribuição de "Igreja Mãe" feita pelo master via `UPDATE` direto).
- Validação de "nome obrigatório, resto opcional" (não exige mais endereço completo para salvar) — igrejas nascem sem endereço (autocadastro, cadastro rápido de filha) e devem poder ser completadas aos poucos.

## Planos de Assinatura e Autocadastro

- **Autocadastro (`/login`, alternando para "Cadastre sua Igreja"):** `SignupForm` cria o usuário via `supabase.auth.signUp()` (role `Admin`, `church_name` no metadata, sem `church_id` ainda) e chama a RPC `complete_pending_church_signup()` para criar a igreja no plano **Free** e vincular o profile — sem passar por nenhum fluxo de convite/Admin. Só coleta nome do responsável, e-mail, senha e nome da igreja; endereço fica em branco até ser completado depois em `/detalhes-igreja`. **Se o projeto exigir confirmação de e-mail** (`signUp()` sem sessão), a igreja só é criada no primeiro login pós-confirmação — `AuthContext.signIn()` chama a mesma RPC (idempotente) antes de buscar o profile, exatamente para cobrir esse caso.
- **`/planos`:** acessível a todos os papéis de igreja (inclusive `master`, gerenciando a igreja escolhida na Sidebar). Mostra os 3 planos (Free/Igreja Local/Presbitério) com toggle Mensal/Anual; ao escolher um plano pago, abre o `PixPaymentModal` (chave Pix + link de WhatsApp com comprovante + botão "Já fiz o Pix / Notificar Admin", que chama `request_subscription_change` — só Admin/Tesoureiro da própria igreja).
- **`usePlanLimits(churchId)`:** hook que resolve o plano da igreja + uso do mês corrente (`usage_counters`) em `canUseAI()`/`canDownloadPDF()`/`canAddChurch()`. Usado para bloquear (com convite para upgrade via `PricingModal`) a Importação por IA (`StatementImport.tsx`, nos dois pontos que chamam a Edge Function `parse-statement`) e a exportação de PDF do Livro Caixa (`CashBook.tsx`) quando a cota do plano é excedida; incrementa o contador (`increment_usage_counter`) só quando a ação de fato é executada. `canAddChurch()` também é reforçado no servidor por `create_child_church` (`plans.max_churches`).

## Regras de segurança reforçadas no banco (não só na UI)

- `admin_update_user_role`/`admin_set_user_status` exigem que o alvo pertença à **mesma igreja** de quem chama, ou a uma **igreja filha direta** dela, a menos que o chamador seja `master` — sem isso, um Admin de uma igreja poderia alterar role/status de usuário de uma igreja não relacionada.
- `generate-reset-link` confere mesma-igreja **antes** de gerar o link de recovery (que usa a service-role key e ignora RLS) — a checagem tem que vir antes da chamada sensível, não depois (só para log).
- Igreja desativada bloqueia login de todos os seus membros (`is_active()`/`has_role()` checam `churches.is_active`) e força logout de sessões já ativas via Realtime.
- Usuário com `status = 'Inativo'` tem o profile escondido pela RLS (`is_active()`) — `AuthContext.signIn()` trata isso como conta inativa, sem revelar se o e-mail existe.

Para o detalhe de *como* essas regras foram implementadas (SQL exato, migrations), ver [`database.md`](./database.md). Para o histórico de bugs de RBAC encontrados e corrigidos (inclusive a auditoria completa com teste ao vivo em produção), ver [`changelog.md`](./changelog.md).

## Aceite obrigatório dos Termos de Uso (independente de papel)

`profiles.termo_aceito = false` bloqueia **toda** a árvore de rotas protegidas — inclusive `master` — antes mesmo da checagem de `allowedRoles`, no mesmo ponto do `ProtectedRoute` onde `isPasswordRecovery` já é tratado. Enquanto pendente, `TermsAcceptanceModal` é renderizado em vez do `Outlet` (nenhuma tela ou dado da igreja carrega antes do aceite). Aceitar chama a RPC `accept_terms`, que grava o histórico imutável em `termo_aceite_registros`, ativa a flag e loga `aceite_termos` em `audit_logs` — ver [`database.md`](./database.md).
