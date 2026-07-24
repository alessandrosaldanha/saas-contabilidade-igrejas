# 🏛️ Gestão Contábil de Igreja com IA

> Sistema completo de gestão financeira, contabilidade e governança (RBAC) para igrejas locais, integrado com IA para leitura automática de extratos bancários.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📌 Sobre o Projeto

A plataforma foi desenvolvida para simplificar a gestão financeira e garantir **transparência e prestação de contas** em igrejas locais.

O diferencial da plataforma é a utilização de **Inteligência Artificial (Google Gemini API)** para processar extratos bancários em PDF/OFX, identificando automaticamente entradas (dízimos, ofertas) e saídas (manutenção, ação social, salários) e reduzindo o trabalho manual da tesouraria.

---

## ✨ Principais Funcionalidades

- 🔐 **Autenticação & Controlo de Acesso (RBAC):** Níveis de permissão bem definidos via Keycloak SSO / Supabase Auth (Administrador/Pastor, Tesoureiro, Auditor/Conselho Fiscal).
- 📊 **Dashboard Executivo:** Indicadores do mês, balanço em tempo real, fluxo de caixa e **Modo Apresentação** para assembleias de prestação de contas.
- 📑 **Livro Caixa Geral:** Registo minucioso de entradas e saídas com filtragem obrigatória por Mês/Ano.
- 🤖 **Importação Inteligente com IA:** Leitura automática de extratos bancários com categorização sugerida antes da confirmação.
- 🔍 **Trilha de Auditoria (Audit Logs):** Registo imutável de todas as ações feitas no sistema com busca e filtros por mês.
- 👥 **Gestão de Utilizadores:** Gestão de equipa, convites de novos membros e revogação de acessos.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Ícones)
- **Base de Dados:** [Supabase](https://supabase.com/) (PostgreSQL - Free Tier)
- **Autenticação:** [Keycloak SSO](https://www.keycloak.org/) / [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Inteligência Artificial:** [Google Gemini API](https://ai.google.dev/) (Gemini 3.5 Flash)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos

Certifica-te de ter o **Node.js** (versão 18 ou superior) instalado na tua máquina.

### Passo a Passo

1. **Clona o repositório:**
   ```bash
   git clone [https://github.com/teu-usuario/contabilidade-igreja.git](https://github.com/teu-usuario/contabilidade-igreja.git)
   cd contabilidade-igreja
   ```
