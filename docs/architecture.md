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
- **Analytics:** PostHog (`posthog-js`) — telemetria de produto, opcional via `VITE_POSTHOG_KEY` (sem a key, o app roda normalmente com analytics desativado).
- **Deploy:** Vercel (frontend) + Supabase (banco/Edge Functions), com domínio próprio `contabilidadereformada.com.br`.

## Estrutura de Pastas

Organização **feature-driven**: cada página com componentes/modais de uso exclusivo tem sua própria subpasta em `pages/<Página>/` com um `components/` local; o que é usado por 2+ páginas fica em `components/` (global). Nomenclatura de arquivos em inglês.

```text
src/
├── assets/          # Imagens, logos e ícones estáticos (ex: chapel-illustration.svg)
├── components/      # Componentes GLOBAIS (genéricos ou usados por 2+ páginas)
│   ├── Sidebar.tsx, Layout.tsx, ProtectedRoute.tsx    # shells de layout/roteamento
│   ├── Card.tsx, Badge.tsx, Avatar.tsx, Pagination.tsx, MonthYearPicker.tsx   # UI base
│   ├── ThemeToggle.tsx, Toast.tsx, ConfirmModal.tsx, UnsavedChangesPrompt.tsx
│   ├── ProfileSettingsModal.tsx, TermsAcceptanceModal.tsx  # popover de perfil / aceite de Termos (1º acesso)
│   ├── ChurchFormFields.tsx               # form de endereço/dados da igreja — usado por ChurchDetails E por Governance/ChurchCreateModal
│   └── PricingPlans.tsx, PricingModal.tsx, PixPaymentModal.tsx  # planos + checkout Pix — usados por /planos E pelos overlays de bloqueio (StatementImport/CashBook)
├── pages/           # Páginas/rotas principais (nomenclatura em inglês)
│   ├── Login/Login.tsx           + components/ (SignupForm, ForgotPasswordModal)
│   ├── ResetPassword.tsx
│   ├── Dashboard/Dashboard.tsx   + components/ (MetricCard, ExploratoryChart)
│   ├── CashBook.tsx                       # Livro Caixa — sem componentes exclusivos
│   ├── StatementImport/StatementImport.tsx + components/ (UploadDropzone, SummaryCards, TransactionsPreviewTable, ImportHistoryTable, AiChatPanel, CategoryRulesModal)
│   ├── AuditLogs.tsx                      # Trilha de Auditoria — sem componentes exclusivos
│   ├── Users/Users.tsx           + components/ (MemberEditModal)         # gestão de usuários (por igreja, ou global p/ master)
│   ├── Governance/Governance.tsx + components/ (ChurchCreateModal, PaymentRequestsPanel)  # CRUD de igrejas + aba de assinaturas (só `master`)
│   ├── PricingPlans/PricingPlans.tsx      # página /planos (usa o componente global PricingPlans)
│   └── ChurchDetails/ChurchDetails.tsx + components/ (AddChildChurchModal)  # própria igreja ou, p/ master, qualquer uma
├── context/
│   ├── AuthContext.tsx     # sessão Supabase Auth + profile + listeners Realtime
│   └── AppContext.tsx      # tema, dados compartilhados (transactions/usersList/etc.), navegação com guarda de não-salvos
├── hooks/
│   └── usePlanLimits.ts    # plano/uso mensal da igreja ativa — canUseAI/canDownloadPDF/canAddChurch
├── types/           # Interfaces TypeScript (Transaction, ChurchUser, Church, Plan, PaymentRequest, AuditLog, etc.)
├── services/        # supabase.ts (client + helper de erro de Edge Function), posthog.ts (analytics)
└── utils/           # format.ts, metrics.ts, cep.ts (ViaCEP), chartBuilders.ts

supabase/
├── migrations/      # Schema versionado (ver database.md)
└── functions/
    ├── invite-user/            # cria usuário (Admin API) já com senha
    ├── generate-reset-link/    # gera link de recovery via Admin API
    ├── cancel-invite/          # hard delete real de convite pendente (Admin API)
    ├── parse-statement/        # chama o Gemini para ler/categorizar extratos
    └── _shared/cors.ts         # allow-list de CORS compartilhada pelas 4 functions

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
