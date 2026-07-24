---
name: nestjs-project-setup
description: Configura o tooling padrão de projetos NestJS novos — ESLint, Prettier, Husky, lint-staged, commitlint, .editorconfig, ajustes de tsconfig strict e scripts no package.json. Use este skill quando o usuário pedir para "configurar lint", "setar husky", "configurar commits", "padronizar o projeto", "rodar o setup", ou quando estiver criando um projeto NestJS do zero e ainda não tiver lint/hook/commitlint instalados. Não bootstrapa código NestJS (módulos, filtros globais, logger) — apenas tooling de qualidade de código.
---

# NestJS Project Setup — Tooling

Configura o tooling padrão de projetos NestJS novos. Roda uma vez por projeto, idempotente quando possível.

## Escopo

Este skill cuida **somente de tooling de qualidade de código**:

- ESLint (flat config, typescript-eslint v8+)
- Prettier
- Husky v9+ (git hooks)
- lint-staged (lint só nos arquivos alterados)
- commitlint (conventional commits)
- `.editorconfig`
- `tsconfig.json` com `strict: true` e flags adicionais
- Scripts no `package.json`

**Fora do escopo**: criar AppModule, registrar filtros globais, configurar Winston, criar pastas das camadas DDD. Para isso use `nestjs-ddd-feature` quando for criar a primeira feature.

## Pré-requisitos

- Projeto NestJS já criado (`nest new` ou template equivalente)
- `package.json` existe
- `git init` já rodou (Husky precisa de `.git/`)

Se algum pré-requisito falhar, parar e avisar o usuário antes de prosseguir.

## Ordem de execução

Executar nesta ordem — Husky depende de Git inicializado, lint-staged depende de Husky, commitlint depende de Husky.

### 1. Instalar dependências

```bash
# ESLint + Prettier + plugins TS
npm install -D \
  eslint \
  @eslint/js \
  typescript-eslint \
  eslint-config-prettier \
  eslint-plugin-prettier \
  prettier

# Husky + lint-staged
npm install -D husky lint-staged

# Commitlint
npm install -D @commitlint/cli @commitlint/config-conventional
```

### 2. ESLint — `eslint.config.mjs`

Flat config (ESLint 9+). Substitui qualquer `.eslintrc*` legado — se existir, remover.

```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.config.js', '*.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettierConfig,
);
```

### 3. Prettier — `.prettierrc.json` e `.prettierignore`

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

```
# .prettierignore
dist/
coverage/
node_modules/
*.md
```

### 4. EditorConfig — `.editorconfig`

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

### 5. `tsconfig.json` — strict + flags obrigatórias

Mesclar com o tsconfig já existente. Garantir que estas flags estejam ativas:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```

### 6. Husky — inicializar

```bash
npx husky init
```

Isso cria `.husky/pre-commit` e adiciona `"prepare": "husky"` no `package.json`.

### 7. Hook `pre-commit` — `.husky/pre-commit`

Substituir o conteúdo gerado pelo `husky init`:

```sh
npx lint-staged
```

### 8. Hook `commit-msg` — `.husky/commit-msg`

Criar manualmente:

```sh
npx --no -- commitlint --edit "$1"
```

Lembrar de garantir `chmod +x .husky/commit-msg` (o `husky init` já cuida do `pre-commit`).

### 9. lint-staged — `package.json`

Adicionar no `package.json`:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 10. commitlint — `commitlint.config.js`

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
  },
};
```

### 11. Scripts no `package.json`

Garantir estes scripts (mesclar com os existentes, não sobrescrever os do NestJS):

```json
{
  "scripts": {
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "lint:fix": "eslint \"{src,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "prepare": "husky"
  }
}
```

### 12. Validação final

Rodar para confirmar que está tudo amarrado:

```bash
npm run lint
npm run format:check
git add -A && git commit -m "chore: setup tooling" --dry-run   # apenas valida o commit-msg hook
```

Se o lint reportar erros em código pré-existente, **não tentar corrigir tudo automaticamente** — reportar ao usuário e perguntar se quer rodar `npm run lint:fix` ou tratar caso a caso.

## Checklist final

- [ ] Dependências instaladas (3 grupos)
- [ ] `eslint.config.mjs` criado
- [ ] `.prettierrc.json` e `.prettierignore` criados
- [ ] `.editorconfig` criado
- [ ] `tsconfig.json` com flags strict completas
- [ ] `npx husky init` rodado
- [ ] `.husky/pre-commit` apontando para `npx lint-staged`
- [ ] `.husky/commit-msg` criado e executável
- [ ] `lint-staged` configurado no `package.json`
- [ ] `commitlint.config.js` criado
- [ ] Scripts `lint`, `lint:fix`, `format`, `format:check`, `prepare` no `package.json`
- [ ] `npm run lint` roda sem erros de config
- [ ] Commit teste valida o hook de mensagem

## O que NÃO fazer

- Não criar `.eslintrc*` legado — usar só flat config
- Não rodar `lint:fix` em código pré-existente sem confirmar com o usuário
- Não adicionar regras de lint específicas de domínio (ex.: "proíbe import de NestJS em domain/") — isso é responsabilidade do `nestjs-ddd-patterns` como convenção, não de regra ESLint customizada
- Não tocar em `AppModule`, filtros globais, logger ou estrutura de pastas — fora do escopo
