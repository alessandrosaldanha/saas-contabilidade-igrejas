---
name: nestjs-ddd-patterns
description: Referência de padrões e convenções de código para projetos NestJS com DDD + Clean Architecture. Use este skill quando o usuário perguntar sobre como estruturar código, nomear arquivos ou classes, tratar erros, escrever testes, ou quando houver dúvida sobre qual camada deve conter determinada lógica. Também use para revisar código existente e verificar aderência às convenções do projeto.
---

# Padrões NestJS DDD — Referência rápida

## Regra das camadas (o que vai onde)

| Camada            | Contém                                              | Proibido                              |
|-------------------|-----------------------------------------------------|---------------------------------------|
| `shared/`         | Enums, guards, interceptors, utils, filtro de erros | Lógica de negócio, acesso ao banco    |
| `domain/`         | Entidades, interfaces de repo, exceções de domínio  | Decorators NestJS, ORM, HTTP          |
| `application/`    | Use cases, interfaces de serviço                    | Acesso direto ao banco, HttpException |
| `infrastructure/` | ORM entities, repositórios, serviços externos       | Lógica de negócio                     |
| `controllers/`    | Controllers, DTOs, guards locais                    | Repositórios, lógica de negócio       |

**Regra de ouro**: se você está importando algo do NestJS em `domain/`, algo está errado.

**Regra do shared**: se um enum, util ou guard é usado em mais de uma camada, vai em `shared/`. Se é específico de uma feature, fica na própria camada.

## TypeScript

- `strict: true` — sem `any`; usar `unknown` + type narrowing
- `readonly` em todas as propriedades de entidades e DTOs
- `interface` para contratos; `type` para unions/aliases
- Nomes expressivos dispensam comentários

## Convenções de nomenclatura

```
Arquivos:          kebab-case          create-plan.usecase.ts
Classes:           PascalCase          CreatePlanUseCase
Funções/variáveis: camelCase           monthlyPrice
ORM Entity:        {Name}OrmEntity     PlanOrmEntity
Repositório:       I{Name}Repository   IPlanRepository
String token:      'I{Name}Repository'
DTO request:       Create{Name}RequestDto
DTO response:      {Name}ResponseDto
```

**Sempre passar objeto** quando houver mais de um parâmetro:

```typescript
// ✅
updateDetails({ name, price }: { name?: string; price?: number }): void

// ❌
updateDetails(name: string, price: number): void
```

## Injeção de repositório — string token

```typescript
// Nunca usar Symbol — sempre string:
@Inject('IPlanRepository') private readonly planRepo: IPlanRepository
```

## Erros

- Domínio lança `Error` nativo (nunca `HttpException`)
- Controller faz `catch → throw new HttpException()`
- Exceções customizadas ficam em `domain/exceptions/`
- Resposta segue RFC 9457: `type`, `title`, `status`, `detail`, `instance`

## Dados de identidade/contexto

Nunca aceitar `tenantId`, `userId`, `partnerId` etc. **no body do request**.
Sempre extrair do JWT decodificado via guard/decorator.

## Módulos — checklist ao criar feature

- [ ] `TypeOrmModule.forFeature([XOrmEntity])` em `infrastructure.module.ts`
- [ ] `{ provide: 'IXRepository', useClass: XRepository }` em `infrastructure.module.ts`
- [ ] Use case em `providers` e `exports` de `application.module.ts`
- [ ] Controller em `controllers` de `controller.module.ts`

## Testes

- Mocks **sempre** via interface — nunca instanciar implementação real
- `jest.Mocked<IRepository>` para tipagem correta dos mocks
- Mockar `Date` se o use case depende de `new Date()`
- Testes unitários instanciam a classe diretamente (sem `Test.createTestingModule`)
- Testes E2E usam `E2eTestHelper.createTestingModule(mocks)`
