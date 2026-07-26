# Banco de Dados (Supabase / PostgreSQL)

Projeto: `fumabywngmjfzsobmbjr` (região `ca-central-1`). Schema versionado em `supabase/migrations/000N_*.sql`, aplicado via MCP `apply_migration` (histórico completo de decisões em [`changelog.md`](./changelog.md)).

## Tabelas

| Tabela | Descrição |
|---|---|
| `churches` | Igrejas (tenants). Nome, endereço completo, CNPJ/telefone/e-mail opcionais, `parent_church_id` (hierarquia principal/filha, só organizacional), `is_active`. Sem policy de `DELETE` — só ativar/desativar. |
| `profiles` | Estende `auth.users`. `role`, `status`, `church_id` (nulo só para `master`), `cpf` opcional, `termo_aceito` (flag rápida de aceite dos Termos de Uso, default `false`). Toda escrita passa por RPC `SECURITY DEFINER` — não há policy de `UPDATE` direta. |
| `transactions` | Lançamentos do Livro Caixa. `church_id NOT NULL DEFAULT current_church_id()`, `import_id` (FK opcional para `import_history`, `ON DELETE CASCADE`). Trigger `sync_church_id()` (`BEFORE INSERT OR UPDATE`) reforça `church_id` no servidor — ver nota abaixo. |
| `import_history` | Registro de cada lote de extrato importado (arquivo, mês, contagem). `church_id NOT NULL DEFAULT current_church_id()`. Mesmo trigger `sync_church_id()` de `transactions`. |
| `audit_logs` | Trilha de auditoria **append-only** (sem policy de `UPDATE`/`DELETE`). `church_id` nullable (ações globais do Master, ex. criar igreja, não pertencem a um tenant). |
| `termo_aceite_registros` | Histórico imutável de aceite dos Termos de Uso (um registro por aceite, não por usuário) — **append-only**, sem policy de `UPDATE`/`DELETE`. `user_id`, `versao_termo`, `data_aceite`, `ip_usuario`, `user_agent`, `church_id`. |

## Isolamento multi-tenant (RLS)

Toda tabela tenant-scoped segue o mesmo padrão de policy:

```sql
is_master() or (<regra original de role/status> and church_id = current_church_id())
```

- `is_master()`: `true` se `profiles.role = 'master'` do usuário autenticado — bypass total de tenant em toda RLS do projeto.
- `current_church_id()`: `church_id` do usuário autenticado (nulo para o Master).
- `has_role(roles[])` / `is_admin()` / `is_active()`: além do bypass de master, agora também exigem que a **igreja esteja ativa** (`churches.is_active`) — igreja desativada bloqueia login/escrita mesmo com token válido.
- `transactions`/`import_history` não dependem só do client acertar o `church_id`: o trigger `sync_church_id()` (migration `0012`) sobrescreve `NEW.church_id := current_church_id()` para qualquer papel que não seja `master` **antes** do `WITH CHECK` da policy avaliar a linha — mesmo um `church_id` explícito errado no payload (bug de front, chamada direta à API) é silenciosamente corrigido para a igreja do próprio usuário em vez de disparar violação de RLS. Para `master`, mantém o valor explícito (igreja em gestão), só rejeitando `null`.

## Funções e RPCs principais

| Função | Tipo | Uso |
|---|---|---|
| `is_master()`, `current_church_id()`, `has_role()`, `is_admin()`, `is_active()` | `SECURITY DEFINER`, internas | Usadas dentro das policies de RLS, nunca chamadas diretamente pelo client. |
| `request_ip()`, `request_device()` | `SECURITY DEFINER`, internas | Extraem IP/User-Agent da GUC `request.headers` (PostgREST) para a trilha de auditoria. `search_path` fixo (hardening, migration 0010). |
| `touch_last_access()` | RPC (client) | Chamada a cada login — atualiza `last_access`, ativa conta em `Convite Pendente`, grava log `acesso`. |
| `admin_update_user_role(target_id, new_role)` | RPC (client) | Só Admin (mesma igreja do alvo) ou Master. Nunca aceita `new_role = 'master'`. Grava log com `church_id` do alvo. |
| `admin_set_user_status(target_id, new_status)` | RPC (client) | Mesma regra de acesso acima, para `Ativo`/`Inativo`/`Convite Pendente`. |
| `update_own_profile(new_name, new_email)` | RPC (client) | Autoedição de nome/e-mail (qualquer role, só a própria linha). |
| `master_update_profile(target_id, new_name, new_email, new_cpf)` | RPC (client) | Só Master — edita nome/e-mail/CPF de **qualquer** perfil. |
| `accept_terms(p_versao_termo)` | RPC (client) | Única forma de registrar aceite dos Termos de Uso — grava em `termo_aceite_registros` (com IP/user-agent), ativa `profiles.termo_aceito` e loga `aceite_termos` em `audit_logs`. Chamada pelo `TermsAcceptanceModal` (bloqueante, ver `permissions-rbac.md`). |
| `handle_new_user()` | Trigger (`auth.users` → `profiles`) | Cria o profile automaticamente na criação do usuário, lendo `name`/`role`/`church_id`/`cpf` do `user_metadata`. |
| `log_transaction_insert/update/delete`, `log_import_history_update/delete`, `log_church_insert/update` | Triggers | Auditoria automática — toda escrita nessas tabelas gera um `audit_logs` correspondente, **sem depender do frontend lembrar de logar**. |
| `sync_church_id()` | Trigger (`BEFORE INSERT OR UPDATE` em `transactions`/`import_history`) | Reforça `church_id` no servidor (não-master: sempre `current_church_id()`; master: exige valor explícito não-nulo). Ver nota em "Isolamento multi-tenant" acima. |

## Padrão arquitetural: auditoria via trigger de banco

Decisão deliberada desde a Fase 4: sempre que possível, o log de auditoria é gravado por um **trigger de banco**, não por uma chamada explícita do frontend — garante que a ação é registrada não importa por qual caminho a escrita aconteceu (import IA, lançamento manual, chamada direta à API). Só ações sem nenhuma escrita de tabela própria para um trigger interceptar (login/logout, convite de usuário) logam explicitamente dentro da RPC/Edge Function.

## Edge Functions (Deno)

| Function | Papel exigido | O que faz |
|---|---|---|
| `invite-user` | Admin (própria igreja) ou `master` (qualquer igreja, `church_id` obrigatório no body) | Cria usuário via Admin API já com senha definida; valida que `role` nunca seja `master`. |
| `generate-reset-link` | Admin (só usuários da própria igreja) ou `master` | Gera link de recovery real via Admin API; checa mesma-igreja **antes** de chamar a API (bypassa RLS via service-role). |
| `parse-statement` | Admin/Tesoureiro/`master` | Envia o extrato (PDF nativo ou texto) ao Gemini com `responseSchema` estrito; modos `extract` e `refine`. |

Todas leem segredos via `Deno.env.get(...)` (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — este último injetado automaticamente pelo runtime, nunca configurado manualmente) e usam o CORS allow-list compartilhado (`_shared/cors.ts`).

## Migrations

Numeradas sequencialmente em `supabase/migrations/`. Para o histórico de *por que* cada uma foi criada, ver [`changelog.md`](./changelog.md). Duas migrations (`audit_logs_restrict_select_to_admin_auditor_conselho`, `add_update_own_profile_rpc`) foram aplicadas via MCP antes de existir o hábito de também salvar o arquivo local — reconstruídas depois como `0007`/`0008` para o repo refletir o estado real do banco.
