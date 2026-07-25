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

Definida em dois lugares que precisam ficar espelhados: `src/App.tsx` (`ProtectedRoute allowedRoles`, o guard real) e `src/components/Sidebar.tsx` (`NAV_ITEMS[].allowedRoles`, só esconde o item do menu). Acesso direto pela URL a uma rota não permitida é redirecionado pelo `ProtectedRoute` (para `/dashboard`, ou `/governanca` se for `master`) — nunca uma tela de "Acesso Negado" separada.

**Por que Auditor/Conselho Fiscal ficam de fora de `/importacao`:** a RLS (`transactions_insert_treasury`/`import_history_insert_treasury`) e a própria Edge Function `parse-statement` só aceitam `Admin`/`Tesoureiro`/`master` — mostrar a tela para esses dois papéis deixaria os botões visíveis sem nenhuma ação funcionar de verdade (RLS bloqueando por baixo).

## Tela de Usuários — visão por papel

- **Admin:** vê e gerencia só os membros da própria igreja (`church_id` sempre filtrado — tanto explicitamente na query quanto pela RLS por baixo).
- **`master`:** visão global (todos os membros de todas as igrejas), com coluna e filtro **"Igreja"** exclusivos dele; o próprio `master` nunca aparece nessa listagem (`.neq("role", "master")`). Pode editar nome/e-mail/CPF de qualquer membro (`master_update_profile`), e role/status via as mesmas RPCs que o Admin usa.

## Módulo de Governança (só `master`)

CRUD de igrejas (`/governanca`): busca por nome/e-mail/CEP/responsável, filtro de hierarquia (Principal × Filha) e data de cadastro, paginação (10/página). Modal de detalhes: editar dados da igreja, ativar/desativar (bloqueia login em cascata para todos os membros — Realtime força logout de sessões já ativas), e gestão dos membros daquela igreja (editar, adicionar novo via `invite-user` com `church_id` explícito).

## Regras de segurança reforçadas no banco (não só na UI)

- `admin_update_user_role`/`admin_set_user_status` exigem que o alvo pertença à **mesma igreja** de quem chama, a menos que o chamador seja `master` — sem isso, um Admin de uma igreja poderia alterar role/status de usuário de **outra** igreja.
- `generate-reset-link` confere mesma-igreja **antes** de gerar o link de recovery (que usa a service-role key e ignora RLS) — a checagem tem que vir antes da chamada sensível, não depois (só para log).
- Igreja desativada bloqueia login de todos os seus membros (`is_active()`/`has_role()` checam `churches.is_active`) e força logout de sessões já ativas via Realtime.
- Usuário com `status = 'Inativo'` tem o profile escondido pela RLS (`is_active()`) — `AuthContext.signIn()` trata isso como conta inativa, sem revelar se o e-mail existe.

Para o detalhe de *como* essas regras foram implementadas (SQL exato, migrations), ver [`database.md`](./database.md). Para o histórico de bugs de RBAC encontrados e corrigidos (inclusive a auditoria completa com teste ao vivo em produção), ver [`changelog.md`](./changelog.md).

## Aceite obrigatório dos Termos de Uso (independente de papel)

`profiles.termo_aceito = false` bloqueia **toda** a árvore de rotas protegidas — inclusive `master` — antes mesmo da checagem de `allowedRoles`, no mesmo ponto do `ProtectedRoute` onde `isPasswordRecovery` já é tratado. Enquanto pendente, `TermsAcceptanceModal` é renderizado em vez do `Outlet` (nenhuma tela ou dado da igreja carrega antes do aceite). Aceitar chama a RPC `accept_terms`, que grava o histórico imutável em `termo_aceite_registros`, ativa a flag e loga `aceite_termos` em `audit_logs` — ver [`database.md`](./database.md).
