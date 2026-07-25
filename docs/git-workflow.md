# Git Workflow, CI/CD e Releases

## Branches

| Branch | Papel |
|---|---|
| `hmg` | **Homologação/desenvolvimento.** Todo novo trabalho (features, correções, ajustes) entra aqui primeiro. |
| `main` | **Produção.** Só recebe merge de `hmg` depois de validado. Toda subida em `main` gera uma tag/release. |

## Fluxo de trabalho

1. **Todo novo desenvolvimento entra em `hmg`** — commits diretos ou branches de feature (`feature/x`) que fazem merge/PR de volta para `hmg`, nunca direto em `main`.
2. **Vercel faz deploy automático de `hmg`** como ambiente de homologação (Preview Deployment do próprio Git integration da Vercel — qualquer push em `hmg` gera uma URL de preview automaticamente, sem configuração extra necessária). Use essa URL para validar antes de promover para produção.
3. **Após validar em `hmg`**, abra o merge para `main`:
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff hmg
   git push origin main
   ```
4. **Ao subir em `main`, cria-se uma tag + Release no GitHub:**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z - <título curto>"
   git push origin vX.Y.Z
   gh release create vX.Y.Z --title "Release vX.Y.Z - <título>" --notes-file <arquivo-com-changelog.md>
   ```
   Convenção de versão: [SemVer](https://semver.org/lang/pt-BR/) (`MAJOR.MINOR.PATCH`) — `MAJOR` para mudanças incompatíveis, `MINOR` para novas funcionalidades retrocompatíveis, `PATCH` para correções.

## Notas práticas

- **`gh` CLI:** se não estiver autenticado na sessão (`gh auth status`), rode `gh auth login` interativamente (fora de sessões não-interativas), ou passe um Personal Access Token pontual via `GH_TOKEN=<token> gh release create ...` — nunca cole o token literal dentro do comando em texto puro num histórico persistido; prefira uma variável de ambiente já populada por um passo anterior.
- **Migrations do Supabase** aplicadas via MCP (`apply_migration`) ou `supabase db push` devem ser aplicadas no ambiente de homologação primeiro (se houver um projeto Supabase separado para `hmg`) antes de ir para produção — hoje o projeto usa um único banco de produção (`fumabywngmjfzsobmbjr`) para ambos; considerar um projeto Supabase de homologação separado (ou branch de banco via `create_branch`) se o volume de mudanças de schema aumentar.
- **Nunca force-push** em `main` nem em `hmg` sem confirmação explícita — reescrever histórico de uma branch compartilhada quebra qualquer checkout local de outra pessoa.
- Antes de qualquer commit, revisar `.claude/settings.json`/`.claude/settings.local.json` — nenhum dos dois deve conter segredos literais no allowlist de permissões (ver incidentes documentados em [`changelog.md`](./changelog.md)).

## Deploy

- **Frontend:** Vercel, conectado ao repositório GitHub — deploy automático a cada push (produção a partir de `main`, preview a partir de `hmg`/outras branches).
- **Backend:** Supabase (migrations + Edge Functions), aplicado manualmente via CLI/MCP — não há pipeline de CI/CD automatizado para o banco ainda (sem `.github/workflows` configurado nesta fase).
