# 🏛️ Diretrizes e Contexto do Projeto: Gestão Contábil de Igreja com IA

## 🔄 REGRA OBRIGATÓRIA DE FINALIZAÇÃO (AUTO-DOCUMENTAÇÃO)

Toda vez que você (Claude Code) finalizar qualquer tarefa ou alteração solicitada pelo usuário, você DEVE automaticamente:

1. Atualizar este arquivo (`CLAUDE.md`) registrando:
   - Novas páginas, componentes ou rotas criadas.
   - Mudanças na estrutura de dados ou novas dependências instaladas.
   - Decorações ou decisões técnicas tomadas durante a execução.
2. Informar ao usuário no terminal: _"Contexto atualizado em CLAUDE.md com sucesso!"_

Este arquivo serve como a fonte da verdade de contexto, arquitetura, regras de negócio e stack técnica para o Claude Code.

---

## 🚀 1. Visão Geral do Projeto

Plataforma web de **Gestão Financeira, Contábil e Governança (RBAC) para Igrejas Locais**, focada em simplicidade, auditabilidade total e automação via IA (processamento de extratos bancários PDF/OFX).

---

## 🛠️ 2. Stack Técnica & Arquitetura

- **Frontend:** React 18+ com TypeScript, Vite, Tailwind CSS e Lucide-React (ícones).
- **Roteamento:** React Router DOM (v6+).
- **Autenticação:** Keycloak SSO (ou Supabase Auth / Clerk) com controle de perfis RBAC.
- **Banco de Dados & Storage (Free Tier):** Supabase (PostgreSQL + Storage de comprovantes).
- **IA Integrada:** API do Google Gemini (Gemini 1.5 Flash) para leitura e categorização contábil de extratos.

---

## 📐 3. Estrutura de Pastas Esperada

```text
src/
├── assets/          # Imagens, logos e ícones estáticos
├── components/      # Componentes reutilizáveis (Sidebar, Header, Modais, Cards, Banners)
├── pages/           # Páginas principais da aplicação
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── LivroCaixa.tsx
│   ├── ImportacaoExtrato.tsx
│   ├── Auditoria.tsx
│   └── Usuarios.tsx
├── types/           # Interfaces e tipos TypeScript (User, Transaction, AuditLog)
├── services/        # Integrações de API (Supabase, Gemini API, Auth)
└── utils/           # Funções utilitárias (Formatadores de Moeda R$, Datas, Exportação PDF)
```

---

## 📝 4. Log de Implementação

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

## 🧠 7. SKILLS & PROTOCOLOS DE EXECUÇÃO

O Claude Code deve ler, carregar e seguir rigorosamente as skills definidas no arquivo `SKILLS.md` (ou na pasta `.claude/skills/`).

### Skills Ativas no Projeto:

1. **Skill de Auto-Documentação:** Registra alterações no `CLAUDE.md` ao finalizar cada tarefa.
2. **Skill de Solução de Problemas & QA:** Executa diagnósticos (`npx tsc --noEmit`), corrige falhas de tipagem/sintaxe e valida a compilação antes de declarar o projeto como "Pronto".

> **Instrução Permanente:** Antes de declarar qualquer comando ou tarefa como concluída, consulte o protocolo de qualidade em `SKILLS.md` para garantir que nenhuma dependência ou código esteja quebrado.
