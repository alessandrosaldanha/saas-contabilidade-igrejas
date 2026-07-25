# Arquitetura

## Visão Geral do Projeto

Plataforma web multi-tenant de **Gestão Financeira, Contábil e Governança (RBAC) para Igrejas Locais**, focada em simplicidade, auditabilidade total (trilha de auditoria imutável) e automação via IA (leitura e categorização de extratos bancários PDF/OFX/CSV).

Cada igreja é um tenant isolado (dados separados por `church_id`); um papel `master` (Admin Master da SaaS) gerencia todas as igrejas a partir do módulo de Governança. Ver [`permissions-rbac.md`](./permissions-rbac.md) para a matriz completa de papéis e [`database.md`](./database.md) para o modelo de dados.

## Stack Técnica

- **Frontend:** React 18+ com TypeScript, Vite, Tailwind CSS e Lucide-React (ícones).
- **Roteamento:** React Router DOM v6 (`<BrowserRouter>`, não data router — sem `useBlocker` nativo).
- **Autenticação:** Supabase Auth (e-mail/senha), sessão gerenciada por `AuthContext`.
- **Banco de Dados & Storage:** Supabase (PostgreSQL com Row Level Security + Storage).
- **Backend serverless:** Supabase Edge Functions (Deno) para tudo que precisa de `service_role` key ou de segredos (Gemini) — nunca expostos ao frontend.
- **IA Integrada:** Google Gemini (alias `gemini-flash-latest`) para extração e categorização contábil de extratos bancários.
- **Deploy:** Vercel (frontend) + Supabase (banco/Edge Functions), com domínio próprio `contabilidadereformada.com.br`.

## Estrutura de Pastas

```text
src/
├── assets/          # Imagens, logos e ícones estáticos (ex: chapel-illustration.svg)
├── components/      # Componentes reutilizáveis
│   ├── Sidebar.tsx, Layout.tsx, Card.tsx, Badge.tsx, Avatar.tsx, MetricCard.tsx
│   ├── ThemeToggle.tsx, Toast.tsx, ExploratoryChart.tsx, ProtectedRoute.tsx
│   ├── ProfileSettingsModal.tsx, UnsavedChangesPrompt.tsx, Pagination.tsx
│   └── Church*.tsx, MemberEditModal.tsx   # módulo de Governança (só para `master`)
├── pages/           # Páginas/rotas principais
│   ├── Login.tsx, ResetPassword.tsx
│   ├── Dashboard.tsx, LivroCaixa.tsx, ImportacaoExtrato.tsx, Auditoria.tsx
│   ├── Usuarios.tsx                       # gestão de usuários (por igreja, ou global p/ master)
│   └── Governanca.tsx                     # CRUD de igrejas (só `master`)
├── context/
│   ├── AuthContext.tsx     # sessão Supabase Auth + profile + listeners Realtime
│   └── AppContext.tsx      # tema, dados compartilhados (transactions/usersList/etc.), navegação com guarda de não-salvos
├── types/           # Interfaces TypeScript (Transaction, ChurchUser, Church, AuditLog, etc.)
├── services/        # supabase.ts (client + helper de erro de Edge Function)
└── utils/           # format.ts, metrics.ts, cep.ts (ViaCEP), chartBuilders.ts

supabase/
├── migrations/      # Schema versionado (ver database.md)
└── functions/
    ├── invite-user/            # cria usuário (Admin API) já com senha
    ├── generate-reset-link/    # gera link de recovery via Admin API
    ├── parse-statement/        # chama o Gemini para ler/categorizar extratos
    └── _shared/cors.ts         # allow-list de CORS compartilhada pelas 3 functions

docs/                # Esta pasta — documentação modular (ver README abaixo)
```

## Documentação modular

| Arquivo | Conteúdo |
|---|---|
| [`docs/architecture.md`](./architecture.md) | Este arquivo — stack, estrutura de pastas |
| [`docs/database.md`](./database.md) | Schema, RLS, funções/RPCs, triggers |
| [`docs/permissions-rbac.md`](./permissions-rbac.md) | Matriz de papéis × rotas × permissões |
| [`docs/git-workflow.md`](./git-workflow.md) | Fluxo de branches (`hmg`/`main`), deploy e releases |
| [`docs/changelog.md`](./changelog.md) | Log cronológico detalhado de cada sessão de implementação |

O `CLAUDE.md` na raiz do repositório contém só as diretrizes essenciais e aponta para estes arquivos.
