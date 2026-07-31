# Banco de Dados (Supabase / PostgreSQL)

Projeto: `fumabywngmjfzsobmbjr` (região `ca-central-1`). Schema versionado em `supabase/migrations/000N_*.sql`, aplicado via MCP `apply_migration` (histórico completo de decisões em [`changelog.md`](./changelog.md)).

## Tabelas

| Tabela | Descrição |
|---|---|
| `churches` | Igrejas (tenants). Nome, endereço completo, CNPJ/telefone/e-mail opcionais, `parent_church_id` (hierarquia de 2 níveis igreja→filha, só organizacional — sem netos), `is_active`, `responsible_name` (só preenchido em igrejas filhas cadastradas via cadastro rápido, ainda sem login próprio). `plan_id` (FK `plans`, default = plano Free via `default_free_plan_id()`; uma filha herda o `plan_id`/`subscription_status` da mãe na criação) e `subscription_status` (`'active'`\|`'pending_approval'`\|`'expired'`). Sem policy de `DELETE` — só ativar/desativar. `UPDATE` de colunas "seguras" (nome/endereço/contato/responsável) passa pela RPC `update_church_profile`; `plan_id`/`subscription_status`/`is_active`/`parent_church_id` só mudam via `UPDATE` direto do `master` (`churches_update_master`) ou pelas RPCs de pagamento. |
| `profiles` | Estende `auth.users`. `role`, `status`, `church_id` (nulo para `master`, **e temporariamente nulo também logo após o autocadastro, até o primeiro login pós-confirmação de e-mail** — ver `complete_pending_church_signup` abaixo), `cpf` opcional, `termo_aceito` (flag rápida de aceite dos Termos de Uso, default `false`), `theme` (`'light'`\|`'dark'`, default `'dark'`, preferência de tema sincronizada entre dispositivos). Toda escrita passa por RPC `SECURITY DEFINER` — não há policy de `UPDATE` direta. |
| `transactions` | Lançamentos do Livro Caixa. `church_id NOT NULL DEFAULT current_church_id()`, `import_id` (FK opcional para `import_history`, `ON DELETE CASCADE`). Trigger `sync_church_id()` (`BEFORE INSERT OR UPDATE`) reforça `church_id` no servidor — ver nota abaixo. |
| `import_history` | Registro de cada lote de extrato importado (arquivo, mês, contagem). `church_id NOT NULL DEFAULT current_church_id()`. Mesmo trigger `sync_church_id()` de `transactions`. |
| `audit_logs` | Trilha de auditoria **append-only** (sem policy de `UPDATE`/`DELETE`). `church_id` nullable (ações globais do Master, ex. criar igreja, não pertencem a um tenant). |
| `termo_aceite_registros` | Histórico imutável de aceite dos Termos de Uso (um registro por aceite, não por usuário) — **append-only**, sem policy de `UPDATE`/`DELETE`. `user_id`, `versao_termo`, `data_aceite`, `ip_usuario`, `user_agent`, `church_id`. |
| `category_rules` | Regras de mapeamento (De-Para): `keyword` (fornecedor/descrição) → `category`, por `type` e `church_id`. Usadas pelo Modo Estrito da Edge Function `parse-statement` (correspondência por "contém", normalizada). `unique(church_id, keyword)`. Mesmo trigger `sync_church_id()` de `transactions`/`import_history`. Ver [`contabilidade-rules`](../.claude/skills/contabilidade-rules/SKILL.md) para a política completa. |
| `plans` | Catálogo dos 3 planos de assinatura (`free`/`pro`/`unlimited`), com os limites de uso (`max_ai_reads`, `max_csv_rows_daily`, `max_churches`, `max_pdf_downloads`) e preços (`price_monthly`/`price_yearly`). Seed fixo (migration `0015`), sem policy de INSERT/UPDATE/DELETE pelo client — catálogo só muda por migration. |
| `usage_counters` | Contador mensal de uso por igreja (`ai_reads_count`/`pdf_downloads_count`), `unique(church_id, month_year)` (`month_year` no formato `'YYYY-MM'`). Só leitura pelo client — toda escrita passa pela RPC `increment_usage_counter`. |
| `payment_requests` | Solicitação de troca de plano via Pix manual: `church_id`, `user_id` (FK para `profiles`, não `auth.users`, para o PostgREST conseguir embutir o nome do solicitante), `plan_id`, `billing_cycle` (`'monthly'`\|`'yearly'`), `status` (`'pending'`\|`'approved'`\|`'rejected'`). Sem policy de `DELETE`/`UPDATE` pelo client — aprovar/rejeitar passa pelas RPCs `admin_approve_payment_request`/`admin_reject_payment_request`. |

## Isolamento multi-tenant (RLS)

Toda tabela tenant-scoped segue o mesmo padrão de policy:

```sql
is_master() or (<regra original de role/status> and church_id = current_church_id())
```

- `is_master()`: `true` se `profiles.role = 'master'` do usuário autenticado — bypass total de tenant em toda RLS do projeto.
- `current_church_id()`: `church_id` do usuário autenticado (nulo para o Master).
- `has_role(roles[])` / `is_admin()` / `is_active()`: além do bypass de master, agora também exigem que a **igreja esteja ativa** (`churches.is_active`) — igreja desativada bloqueia login/escrita mesmo com token válido.
- `transactions`/`import_history` não dependem só do client acertar o `church_id`: o trigger `sync_church_id()` (migration `0012`) sobrescreve `NEW.church_id := current_church_id()` para qualquer papel que não seja `master` **antes** do `WITH CHECK` da policy avaliar a linha — mesmo um `church_id` explícito errado no payload (bug de front, chamada direta à API) é silenciosamente corrigido para a igreja do próprio usuário em vez de disparar violação de RLS. Para `master`, mantém o valor explícito (igreja em gestão), só rejeitando `null`.
- `churches`: além de `master` (`churches_select_master`), a policy `churches_select_own` permite ao próprio usuário enxergar a própria igreja (plano/limites, usado por `usePlanLimits`, e a página de Detalhes) e as igrejas filhas diretas (`parent_church_id = current_church_id()`, também usado por `canAddChurch()` no plano Presbitério). `UPDATE` direto continua exclusivo do `master` (`churches_update_master`) — um `Admin` só edita via as RPCs `update_church_profile`/`create_child_church`, nunca via `UPDATE` cru, então nunca consegue tocar `plan_id`/`subscription_status`/`is_active`/`parent_church_id` mesmo com uma chamada manual à API.
- `plans`: `SELECT` liberado para qualquer usuário autenticado (catálogo sem dado sensível). `usage_counters`/`payment_requests`: `SELECT` restrito à própria igreja (ou `master`); toda escrita passa por RPC.
- `profiles_select_active`: além de `is_master()` e `church_id = current_church_id()`, um `Admin` (`has_role(['Admin'])`) também enxerga os membros de uma igreja **filha direta** da sua (`exists(... c.parent_church_id = current_church_id())`) — necessário para a seção "Membros" da página de Detalhes de uma subcongregação funcionar para quem não é master. `admin_update_user_role`/`admin_set_user_status` seguem a mesma regra (checam `target_church = current_church_id() or` filha direta).

## Funções e RPCs principais

| Função | Tipo | Uso |
|---|---|---|
| `is_master()`, `current_church_id()`, `has_role()`, `is_admin()`, `is_active()` | `SECURITY DEFINER`, internas | Usadas dentro das policies de RLS, nunca chamadas diretamente pelo client. |
| `request_ip()`, `request_device()` | `SECURITY DEFINER`, internas | Extraem IP/User-Agent da GUC `request.headers` (PostgREST) para a trilha de auditoria. `search_path` fixo (hardening, migration 0010). |
| `touch_last_access()` | RPC (client) | Chamada a cada login — atualiza `last_access`, ativa conta em `Convite Pendente`, grava log `acesso`. |
| `admin_update_user_role(target_id, new_role)` | RPC (client) | Só Admin (mesma igreja do alvo) ou Master. Nunca aceita `new_role = 'master'`. Grava log com `church_id` do alvo. |
| `admin_set_user_status(target_id, new_status)` | RPC (client) | Mesma regra de acesso acima, para `Ativo`/`Inativo`/`Convite Pendente`. |
| `update_own_profile(new_name, new_email)` | RPC (client) | Autoedição de nome/e-mail (qualquer role, só a própria linha). |
| `update_own_theme(new_theme)` | RPC (client) | Autoedição da preferência de tema (`'light'`\|`'dark'`, valida o valor e rejeita qualquer outro). Chamada pelo `toggleTheme` do `AppContext` sempre que a igreja/usuário troca de tema pela Sidebar; fire-and-forget (não bloqueia a UI, erro só vai pro console). |
| `master_update_profile(target_id, new_name, new_email, new_cpf)` | RPC (client) | Só Master — edita nome/e-mail/CPF de **qualquer** perfil. |
| `accept_terms(p_versao_termo)` | RPC (client) | Única forma de registrar aceite dos Termos de Uso — grava em `termo_aceite_registros` (com IP/user-agent), ativa `profiles.termo_aceito` e loga `aceite_termos` em `audit_logs`. Chamada pelo `TermsAcceptanceModal` (bloqueante, ver `permissions-rbac.md`). |
| `handle_new_user()` | Trigger (`auth.users` → `profiles`) | Cria o profile automaticamente na criação do usuário, lendo `name`/`role`/`church_id`/`cpf` do `user_metadata`. No autocadastro (`SignupForm`), `church_id` vem vazio do metadata (só `church_name`) — a constraint `profiles_church_id_master_check` permite esse nulo transitório só quando `status = 'Convite Pendente'` (o default do trigger). |
| `complete_pending_church_signup()` | RPC (client) | Conclui o autocadastro: cria a igreja no plano Free e preenche `profiles.church_id` — **sem argumento**, lê `church_name` do próprio `auth.users.raw_user_meta_data` (gravado no `signUp()`). No-op idempotente se o profile já tem `church_id`. Chamada tanto pelo `SignupForm` (se `signUp()` já retornou sessão) quanto por `AuthContext.signIn()` a cada login (cobre o caso do projeto exigir confirmação de e-mail: sem sessão no `signUp()`, a igreja só pode ser criada no primeiro login pós-confirmação). |
| `default_free_plan_id()` | `SECURITY DEFINER`, interna | Resolve o `id` do plano `'free'` — usada como `DEFAULT` da coluna `churches.plan_id` (mesmo padrão de `current_church_id()` como default de `transactions.church_id`). |
| `create_child_church(p_parent_church_id, p_name, p_responsible_name, p_email, p_phone)` | RPC (client) | `Admin` cria uma igreja filha da **própria** igreja (`p_parent_church_id = current_church_id()`; master sem essa exigência). Rejeita se `p_parent_church_id` já for, ele mesmo, uma igreja filha (hierarquia de só 2 níveis, sem netos — reforçado também pelo trigger `on_church_prevent_grandchild`, que cobre qualquer `UPDATE` de `parent_church_id`, não só esta RPC). Herda `plan_id`/`subscription_status` da mãe e reforça `plans.max_churches` no servidor (master sem limite). Endereço fica em branco, preenchido depois via `update_church_profile`. |
| `update_church_profile(p_church_id, p_name, p_email, p_cnpj, p_phone, p_cep, p_street, p_number, p_neighborhood, p_city, p_uf, p_responsible_name)` | RPC (client) | Único caminho para editar dados cadastrais de uma igreja — `master` (qualquer igreja) ou `Admin` (própria igreja ou filha direta). Nunca toca `plan_id`/`subscription_status`/`is_active`/`parent_church_id`. Usada pela página `ChurchDetails`. |
| `increment_usage_counter(p_church_id, p_counter)` | RPC (client) | Upsert atômico do contador mensal (`'ai_reads'`\|`'pdf_downloads'`) em `usage_counters` — chamada pelo `usePlanLimits` após uma leitura de IA/exportação de PDF ter êxito. Master exige `p_church_id` explícito (igreja em gestão), mesmo padrão de `sync_church_id()`. |
| `request_subscription_change(p_plan_id, p_billing_cycle)` | RPC (client) | Botão "Já fiz o Pix / Notificar Admin" do `PixPaymentModal` — só Admin/Tesoureiro da própria igreja. Cria a `payment_requests` e marca `churches.subscription_status = 'pending_approval'` numa única transação (Admin/Tesoureiro não tem `UPDATE` direto em `churches`). |
| `admin_approve_payment_request(p_request_id)` / `admin_reject_payment_request(p_request_id)` | RPC (client) | Só Master — usadas na aba "Solicitações de Assinatura" da Governança. Aprovar aplica `plan_id`/`subscription_status = 'active'` na igreja; rejeitar só destrava o status (mantém o plano atual). Ambas rejeitam solicitação já processada (`status <> 'pending'`). |
| `log_transaction_insert/update/delete`, `log_import_history_update/delete`, `log_church_insert/update`, `log_category_rule_insert/update/delete` | Triggers | Auditoria automática — toda escrita nessas tabelas gera um `audit_logs` correspondente, **sem depender do frontend lembrar de logar**. |
| `sync_church_id()` | Trigger (`BEFORE INSERT OR UPDATE` em `transactions`/`import_history`/`category_rules`) | Reforça `church_id` no servidor (não-master: sempre `current_church_id()`; master: exige valor explícito não-nulo). Ver nota em "Isolamento multi-tenant" acima. |
| `prevent_grandchild_church()` | Trigger (`BEFORE INSERT OR UPDATE OF parent_church_id` em `churches`) | Impede hierarquia de 3+ níveis: rejeita se o novo `parent_church_id` já for, ele mesmo, uma igreja filha, ou se a própria linha já tiver filhas (o que tornaria essas filhas netas). Cobre qualquer caminho de escrita — `create_child_church` e o `UPDATE` direto que o master faz ao reatribuir "Igreja Mãe" na página de Detalhes. |

## Padrão arquitetural: auditoria via trigger de banco

Decisão deliberada desde a Fase 4: sempre que possível, o log de auditoria é gravado por um **trigger de banco**, não por uma chamada explícita do frontend — garante que a ação é registrada não importa por qual caminho a escrita aconteceu (import IA, lançamento manual, chamada direta à API). Só ações sem nenhuma escrita de tabela própria para um trigger interceptar (login/logout, convite de usuário) logam explicitamente dentro da RPC/Edge Function.

## Edge Functions (Deno)

| Function | Papel exigido | O que faz |
|---|---|---|
| `invite-user` | Admin (própria igreja ou igreja filha direta dela) ou `master` (qualquer igreja, `church_id` obrigatório no body) | Cria usuário via Admin API já com senha definida; valida que `role` nunca seja `master`. Se o `church_id` do body não for o do próprio Admin, confere no servidor que é uma filha direta (`parent_church_id`) antes de aceitar — nunca confia no valor sozinho. |
| `generate-reset-link` | Admin (só usuários da própria igreja) ou `master` | Gera link de recovery real via Admin API; checa mesma-igreja **antes** de chamar a API (bypassa RLS via service-role). |
| `parse-statement` | Admin/Tesoureiro/`master` | Envia o extrato (PDF nativo ou texto) ao Gemini com `responseSchema` estrito; modos `extract` e `refine`. Recebe também `applyMode` (`"ai" \| "strict"`) e `churchId` — no Modo Estrito, consulta `category_rules` da igreja e sobrepõe a categoria da IA quando a descrição bate com uma regra salva (ver [`contabilidade-rules`](../.claude/skills/contabilidade-rules/SKILL.md)). |

Todas leem segredos via `Deno.env.get(...)` (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — este último injetado automaticamente pelo runtime, nunca configurado manualmente) e usam o CORS allow-list compartilhado (`_shared/cors.ts`).

## Migrations

Numeradas sequencialmente em `supabase/migrations/`. Para o histórico de *por que* cada uma foi criada, ver [`changelog.md`](./changelog.md). Duas migrations (`audit_logs_restrict_select_to_admin_auditor_conselho`, `add_update_own_profile_rpc`) foram aplicadas via MCP antes de existir o hábito de também salvar o arquivo local — reconstruídas depois como `0007`/`0008` para o repo refletir o estado real do banco.
