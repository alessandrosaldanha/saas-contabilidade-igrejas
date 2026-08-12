# Arquitetura

## Visão Geral do Projeto

Plataforma web multi-tenant de **Gestão Financeira, Contábil e Governança (RBAC) para Igrejas Locais**, focada em simplicidade, auditabilidade total (trilha de auditoria imutável) e automação via IA (leitura e categorização de extratos bancários PDF/OFX/CSV).

Cada igreja é um tenant isolado (dados separados por `church_id`); um papel `master` (Admin Master da SaaS) gerencia todas as igrejas a partir do módulo de Governança. Ver [`permissions-rbac.md`](./permissions-rbac.md) para a matriz completa de papéis e [`database.md`](./database.md) para o modelo de dados.

## Stack Técnica

- **Frontend:** React 18+ com TypeScript, Vite, Tailwind CSS e Lucide-React (ícones).
- **Roteamento:** React Router DOM v6 (`<BrowserRouter>`, não data router — sem `useBlocker` nativo). `/` é a landing pública (fora de `ProtectedRoute`, redireciona sozinha pro painel se já houver sessão ativa); `/login` (login + autocadastro, via `?signup=1`) e `/reset-password` também ficam fora da árvore protegida; o restante do app (`dashboard`, `livro-caixa`, `governanca`, etc.) é uma árvore de rotas sem `path` próprio, aninhada dentro de `ProtectedRoute`+`Layout`, resolvendo para os mesmos caminhos absolutos de sempre.
- **Autenticação:** Supabase Auth (e-mail/senha), sessão gerenciada por `AuthContext`.
- **Banco de Dados & Storage:** Supabase (PostgreSQL com Row Level Security + Storage).
- **Backend serverless:** Supabase Edge Functions (Deno) para tudo que precisa de `service_role` key ou de segredos (Gemini) — nunca expostos ao frontend.
- **IA Integrada:** Google Gemini (alias `gemini-flash-latest`) para extração e categorização contábil de extratos bancários.
- **Analytics:** PostHog (`posthog-js`) — telemetria de produto, opcional via `VITE_POSTHOG_KEY` (sem a key, o app roda normalmente com analytics desativado).
- **Deploy:** Vercel (frontend) + Supabase (banco/Edge Functions), com domínio próprio `contabilidadereformada.com.br`.

## Escala de z-index

Convenção observada no código existente (modais, Sidebar, Toast) e formalizada após um bug real (header da landing coberto por uma seção que empatava em z-index com ele — ver `changelog.md`, 2026-08-12): **nunca dois elementos que podem se sobrepor visualmente devem ficar no mesmo z-index** — em empate, quem vem depois no DOM pinta por cima, mesmo que semanticamente devesse ficar embaixo (ex.: um header sticky).

| Faixa | Uso | Exemplos |
|---|---|---|
| `auto`/sem z-index | Conteúdo normal em fluxo | Maioria dos elementos |
| `z-10` | Conteúdo decorativo que só precisa ficar acima do próprio fundo/seção adjacente (não compete com nav) | Cabeçalho sticky de tabela (`CashBook`, `TransactionsPreviewTable`), blocos decorativos em `Login`/`ResetPassword`, moldura do carrossel do Hero que "vaza" sobre "Como Funciona" (`Landing.tsx`) |
| `z-20` | Conteúdo que precisa ficar acima de uma camada `z-10` adjacente, ou dropdowns simples | `MonthYearPicker`, conteúdo de "Como Funciona" (acima da moldura do Hero que vaza) |
| `z-40` | Overlay/backdrop de navegação mobile | Backdrop do `Sidebar` no mobile |
| `z-50` | **Chrome de navegação persistente — nunca deve ser coberto por conteúdo de página** | `Sidebar` (área logada), header sticky da landing pública |
| `z-[60]` | Popover ancorado no chrome de navegação | Dropdown de perfil do `Sidebar` |
| `z-[95]`–`z-[120]` | Modais (`fixed inset-0`) — várias faixas para empilhar modal sobre modal quando um abre a partir do outro | `ConfirmModal`/`ProfileSettingsModal`/etc. (`100`), modais aninhados (`110`/`120`) |
| `z-[200]` | Modal bloqueante de prioridade máxima | `TermsAcceptanceModal` |
| `z-[9999]` | Sempre visível, acima de tudo | `Toast` |

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
│   ├── PricingPlans.tsx, PricingModal.tsx, PixPaymentModal.tsx  # planos + checkout Pix — usados por /planos E pelos overlays de bloqueio (StatementImport/CashBook)
│   └── Accordion.tsx                      # accordion genérico (usado hoje só pelo FAQ da Landing)
├── pages/           # Páginas/rotas principais (nomenclatura em inglês)
│   ├── Landing/Landing.tsx       + components/ (PricingSection, FaqSection, HeroCarousel)  # "/" pública — sem ProtectedRoute; PricingSection lê a RPC pública get_public_plans() (mesma fonte de /planos, sem dados bancários/Pix); HeroCarousel decide estático (1 imagem) vs. carrossel (2+) do Hero
│   ├── Login/Login.tsx           + components/ (SignupForm, ForgotPasswordModal)
│   ├── ResetPassword.tsx
│   ├── Dashboard/Dashboard.tsx   + components/ (MetricCard, ExploratoryChart)
│   ├── CashBook.tsx                       # Livro Caixa — sem componentes exclusivos
│   ├── StatementImport/StatementImport.tsx + components/ (UploadDropzone, SummaryCards, TransactionsPreviewTable, ImportHistoryTable, AiChatPanel, CategoryRulesModal)
│   ├── AuditLogs.tsx                      # Trilha de Auditoria — sem componentes exclusivos
│   ├── Users/Users.tsx           + components/ (MemberEditModal)         # gestão de usuários (por igreja, ou global p/ master)
│   ├── Governance/Governance.tsx + components/ (ChurchCreateModal, PaymentRequestsPanel, PlanManagementPanel, EditPlanModal, HeroImagesPanel, LandingImagesPanel, SocialLinksPanel)  # CRUD de igrejas + abas de assinaturas/planos/conteúdo da landing (carrossel do Hero + imagens 1:1 + redes sociais) (só `master`)
│   ├── PricingPlans/PricingPlans.tsx      # página /planos (usa o componente global PricingPlans)
│   └── ChurchDetails/ChurchDetails.tsx + components/ (AddChildChurchModal)  # própria igreja ou, p/ master, qualquer uma
├── context/
│   ├── AuthContext.tsx     # sessão Supabase Auth + profile + listeners Realtime
│   └── AppContext.tsx      # tema, dados compartilhados (transactions/usersList/etc.), navegação com guarda de não-salvos
├── hooks/
│   └── usePlanLimits.ts    # plano/uso mensal da igreja ativa — canUseAI/canDownloadPDF/canAddChurch
├── types/           # Interfaces TypeScript (Transaction, ChurchUser, Church, Plan, PaymentRequest, AuditLog, etc.)
├── services/        # supabase.ts (client + helper de erro de Edge Function), posthog.ts (analytics)
└── utils/           # format.ts, metrics.ts, cep.ts (ViaCEP), chartBuilders.ts, plans.ts (mapPlanRow/mapPublicPlanRow), homePath.ts (getHomePath — destino pós-login/landing conforme o papel, reaproveitado por ProtectedRoute/App/Landing), pendingPlan.ts (storePendingPlan — plano escolhido na landing antes do cadastro; capturado, ainda sem consumidor), landingImages.ts (mapLandingImageRow + metadados das seções 1:1 editáveis — hoje só `sobre_nos`), landingHeroImages.ts (mapLandingHeroImageRow — carrossel 1:N do Hero, usado por HeroImagesPanel e pela Landing/HeroCarousel), imageUpload.ts (uploadImageToBucket — validação de tipo/tamanho + upload a um bucket público de Storage, usado pelo LandingImagesPanel e pelo HeroImagesPanel), socialLinks.ts (mapSocialLinkRow + metadados/ícones das 4 redes pré-cadastradas + isValidSocialUrl, usado pelo SocialLinksPanel E pelo footer da Landing)

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
