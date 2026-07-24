---
name: nestjs-ddd-feature
description: Gera features completas em NestJS com DDD + Clean Architecture. Use este skill sempre que o usuário pedir para criar uma feature, endpoint, entidade, use case, repositório, controller ou qualquer combinação deles em um projeto NestJS com DDD. Também use quando o usuário disser "cria a feature X", "adiciona o endpoint de Y", "implementa o caso de uso Z", ou quando for necessário gerar vários arquivos coordenados seguindo a arquitetura em camadas (domain → application → infrastructure → controllers).
---

# NestJS DDD Feature Generator

Gera features completas seguindo DDD + Clean Architecture em NestJS. Sempre gera todos os arquivos necessários nas camadas corretas, registra nos módulos e cria os testes.

## Checklist obrigatório por feature

```
1. Domain
   ├── src/domain/entities/{feature}.entity.ts
   ├── src/domain/repositories/{feature}.repository.interface.ts
   └── src/domain/exceptions/{feature}-not-found.exception.ts   (se aplicável)

2. Application
   └── src/application/usecases/{feature}/{action}-{feature}/
       ├── {action}-{feature}.input.ts
       ├── {action}-{feature}.output.ts
       └── {action}-{feature}.usecase.ts

3. Infrastructure
   ├── src/infrastructure/entities/{feature}.orm-entity.ts
   └── src/infrastructure/repositories/{feature}.repository.ts

4. Controllers
   └── src/controllers/{feature}/v1/
       ├── dto/create-{feature}.request.dto.ts
       ├── dto/{feature}.response.dto.ts
       └── {feature}.controller.ts

5. Módulos (atualizar)
   ├── src/infrastructure/infrastructure.module.ts
   ├── src/application/application.module.ts
   └── src/controllers/controller.module.ts

6. Testes
   ├── test/application/usecases/{feature}/{action}-{feature}.usecase.spec.ts
   └── test/controllers/{feature}/v1/{feature}.controller.spec.ts
```

## Regras de camada

- `shared/` → código transversal reutilizável entre camadas: enums, guards, interceptors, utils, filtro de erros. Pode ser importado por qualquer camada.
- `domain/` → zero decorators NestJS. Apenas TypeScript puro.
- `application/` → `@Injectable()` permitido. Sem acesso direto ao banco.
- `infrastructure/` → TypeORM + implementações de repositório.
- `controllers/` → HTTP + DTOs + class-validator. Nunca acessa repositório diretamente.

## O que vai em shared/

```
src/shared/
├── enums/                        # Enums usados em mais de uma camada
├── guards/
│   └── jwt-auth.guard.ts         # Guard JWT global
├── interceptors/
│   └── request-logging.interceptor.ts
├── utils/
│   ├── uuid.util.ts              # generateUuid() — única fonte de UUIDs
│   └── package.utils.ts          # getPackageInfo()
└── problem-details.filter.ts     # @Catch() global — RFC 9457
```

Regra: se um enum, util ou guard é usado em mais de uma camada → vai em `shared/`. Se é específico de uma feature → fica na própria camada.

## Entidades de domínio

- Construtora recebe `Props` interface com todos os campos `readonly`
- Invariantes validadas na construtora — lançar `Error` nativo, nunca `HttpException`
- Campos mutáveis como `private _field` com getter público
- Métodos expressivos: `entity.deactivate()`, não setters genéricos

## Repositórios

- Interface em `domain/repositories/` — apenas o contrato, sem implementação
- Injeção sempre com **string token**: `@Inject('IExampleRepository')`
- Nunca usar `Symbol` como token
- Implementação em `infrastructure/repositories/` com métodos privados `toOrm()` e `toDomain()`

## Use Cases

- Um use case = uma intenção de negócio
- Método único: `execute(input): Promise<output>`
- Input e output em arquivos separados (`.input.ts` e `.output.ts`)
- Sem lógica de infraestrutura, sem acesso direto ao banco
- UUID gerado via `generateUuid()` de `shared/utils/uuid.util.ts` — nunca `crypto.randomUUID()` diretamente

## Controllers e DTOs

- Validação de request com `class-validator`
- Dados de identidade/contexto (tenantId, partnerId etc.) extraídos do JWT — **nunca do body**
- Controller nunca acessa repositório diretamente
- **Toda rota e todo DTO já nascem documentados com `@nestjs/swagger`** — ver seção "Documentação OpenAPI" abaixo. Não gerar controller/DTO sem os decorators.

## Infraestrutura (TypeORM)

- Nome da ORM entity: `{Name}OrmEntity` — evitar conflito com entidade de domínio
- Colunas em `snake_case`; propriedades TS em `camelCase`
- UUID gerado na aplicação via `uuidv7`, nunca pelo banco
- `@CreateDateColumn` → `created_at TIMESTAMPTZ`
- `@UpdateDateColumn` → `updated_at TIMESTAMPTZ NULL`
- `@DeleteDateColumn` → `deleted_at TIMESTAMPTZ NULL` (soft delete obrigatório)

## Documentação OpenAPI (Swagger)

O setup do `SwaggerModule` no `main.ts` é feito **uma vez por projeto** (fora do escopo desta skill). Aqui a regra é: **toda feature nova já nasce documentada**. Sem isso, a doc fica eternamente atrasada.

Dependência: `@nestjs/swagger` (já deve estar instalada no projeto).

### Request DTO

`@ApiProperty` em todo campo, junto com os validators do `class-validator`. Opcionais usam `@ApiPropertyOptional`.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Corpo de POST /api/v1/auth/login. */
export class LoginAuthRequestDto {
  @ApiProperty({ description: 'Usuário do admin', example: 'joao.silva' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'Senha do admin', example: 'S3nh@Forte' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
```

### Response DTO

Para o Swagger gerar o schema da resposta, o response DTO **precisa ser uma classe concreta com `@ApiProperty`** — não uma interface, e não importado com `import type`. Cada campo recebe `@ApiProperty`.

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class LoginAuthResponseDto {
  @ApiProperty({ description: 'Token de acesso JWT' })
  accessToken!: string;

  @ApiProperty({ description: 'Token de renovação' })
  refreshToken!: string;
}
```

### Controller

- `@ApiTags('{feature}')` na classe — agrupa as rotas na UI.
- `@ApiOperation({ summary })` em cada handler (a mesma frase do JSDoc).
- Resposta de sucesso tipada: `@ApiOkResponse`, `@ApiCreatedResponse` ou `@ApiNoContentResponse` com `type` quando houver corpo.
- Rotas protegidas levam `@ApiBearerAuth()`. Rotas com `@Public()` **não** levam.
- Erros relevantes documentados com `@ApiResponse({ status, description })` (ex.: 401, 404). O corpo segue o RFC 9457 do `ProblemDetailsExceptionFilter`.

```typescript
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  /** Login por usuário e senha. Devolve tokens + perfil do admin. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login por usuário e senha' })
  @ApiOkResponse({ type: LoginAuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginAuthRequestDto): Promise<LoginAuthResponseDto> {
    return this.loginAuthUseCase.execute(dto);
  }

  /** Logout: encerra a sessão no provedor de identidade. Exige estar autenticado. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerra a sessão do usuário autenticado' })
  @ApiNoContentResponse()
  logout(@Body() dto: LogoutAuthRequestDto): Promise<void> {
    return this.logoutAuthUseCase.execute(dto);
  }
}
```

## Registro nos módulos

**infrastructure.module.ts:**

```typescript
TypeOrmModule.forFeature([ExampleOrmEntity])          // imports
{ provide: 'IExampleRepository', useClass: ExampleRepository }  // providers + exports
```

**application.module.ts:**

```typescript
CreateExampleUseCase   // providers + exports
```

**controller.module.ts:**

```typescript
ExampleController      // controllers
```

## Nomeação

| Artefato              | Padrão                   | Exemplo                  |
|-----------------------|--------------------------|--------------------------|
| Arquivo               | kebab-case               | `create-plan.usecase.ts` |
| Classe                | PascalCase               | `CreatePlanUseCase`      |
| ORM Entity            | `{Name}OrmEntity`        | `PlanOrmEntity`          |
| Interface repositório | `I{Name}Repository`      | `IPlanRepository`        |
| String token          | `'I{Name}Repository'`    | `'IPlanRepository'`      |
| DTO request           | `Create{Name}RequestDto` | `CreatePlanRequestDto`   |
| DTO response          | `{Name}ResponseDto`      | `PlanResponseDto`        |
