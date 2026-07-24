---
name: nestjs-ddd-tests
description: Gera testes unitários e E2E para projetos NestJS com DDD + Clean Architecture. Use este skill sempre que o usuário pedir para criar, completar ou revisar testes — unitários de use cases, unitários de controllers, ou testes E2E com supertest. Também use quando o usuário disser "cria os testes para X", "adiciona o spec do use case Y", "faz o e2e do controller Z", ou quando gerar uma feature nova que ainda não tem cobertura de testes.
---

# NestJS DDD Test Generator

Gera testes unitários e E2E seguindo os padrões do projeto. Sempre escolha o tipo de teste correto e siga a estrutura de pastas obrigatória.

## Onde cada teste vive

```
test/
├── application/
│   └── usecases/{feature}/
│       └── {action}-{feature}.usecase.spec.ts   ← unitário do use case
├── controllers/
│   └── {feature}/v1/
│       ├── {feature}.controller.spec.ts          ← unitário do controller
│       └── {feature}.e2e-spec.ts                 ← E2E via supertest
├── infrastructure/
│   └── services/
│       └── {service}.spec.ts
└── helpers/
    └── e2e-test.helper.ts
```

## Regras gerais

- Mocks **sempre** via interface — nunca instanciar implementação real (`ExampleRepository`, `TypeORM`, etc.)
- `jest.Mocked<IRepository>` para tipagem correta
- Testes unitários instanciam a classe **diretamente** — sem `Test.createTestingModule`
- `describe` e `it` em português ou inglês — ser consistente dentro do arquivo
- Cobrir: caminho feliz + erros esperados + edge cases relevantes

---

## 1. Teste unitário de Use Case

Instancia diretamente. Mocka apenas as interfaces injetadas.

```typescript
// test/application/usecases/examples/create-example.usecase.spec.ts
import { NotFoundException } from '@nestjs/common';
import { CreateExampleUseCase } from '../../../../src/application/usecases/examples/create-example/create-example.usecase';
import { IExampleRepository } from '../../../../src/domain/repositories/example.repository.interface';

describe('CreateExampleUseCase', () => {
  let useCase: CreateExampleUseCase;
  let repo: jest.Mocked<IExampleRepository>;

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByTenantId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IExampleRepository>;

    useCase = new CreateExampleUseCase(repo);
  });

  it('deve criar um exemplo e retornar o output', async () => {
    repo.save.mockResolvedValue(undefined);

    const output = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'Meu Exemplo',
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(output.name).toBe('Meu Exemplo');
    expect(output.id).toBeDefined();
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('deve lançar erro quando name está vazio', async () => {
    await expect(
      useCase.execute({ tenantId: 'tenant-1', name: '' })
    ).rejects.toThrow('name is required');

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundException quando entidade não é encontrada', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ tenantId: 'tenant-1', name: 'x' })
    ).rejects.toThrow(NotFoundException);
  });
});
```

**Padrão para mockar `Date`** (quando o use case depende de `new Date()`):

```typescript
const fixedDate = new Date('2024-01-15T10:00:00Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(fixedDate);
});

afterEach(() => {
  jest.useRealTimers();
});
```

---

## 2. Teste unitário de Controller

Usa `Test.createTestingModule` mas mocka o use case como provider.

```typescript
// test/controllers/examples/v1/examples.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExamplesController } from '../../../../src/controllers/examples/v1/examples.controller';
import { CreateExampleUseCase } from '../../../../src/application/usecases/examples/create-example/create-example.usecase';

describe('ExamplesController', () => {
  let controller: ExamplesController;
  let createExampleUseCase: jest.Mocked<CreateExampleUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamplesController],
      providers: [
        { provide: CreateExampleUseCase, useValue: mockUseCase },
      ],
    }).compile();

    controller = module.get(ExamplesController);
    createExampleUseCase = module.get(CreateExampleUseCase);
  });

  describe('POST /v1/examples', () => {
    it('deve retornar 201 com o output do use case', async () => {
      const useCaseOutput = {
        id: 'uuid-1',
        name: 'Meu Exemplo',
        createdAt: new Date('2024-01-15'),
      };
      createExampleUseCase.execute.mockResolvedValue(useCaseOutput);

      const result = await controller.create({ name: 'Meu Exemplo' });

      expect(createExampleUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Meu Exemplo' }),
      );
      expect(result).toEqual(useCaseOutput);
    });

    it('deve propagar exceção do use case', async () => {
      createExampleUseCase.execute.mockRejectedValue(
        new Error('something failed'),
      );

      await expect(
        controller.create({ name: 'Meu Exemplo' })
      ).rejects.toThrow('something failed');
    });
  });
});
```

---

## 3. Teste E2E

Usa `E2eTestHelper.createTestingModule` com mocks dos repositórios. Faz requests HTTP reais via `supertest`.

```typescript
// test/controllers/examples/v1/examples.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { E2eTestHelper } from '../../../helpers/e2e-test.helper';
import { IExampleRepository } from '../../../../src/domain/repositories/example.repository.interface';

describe('ExamplesController (E2E)', () => {
  let app: INestApplication;
  let exampleRepo: jest.Mocked<IExampleRepository>;

  beforeAll(async () => {
    exampleRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByTenantId: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IExampleRepository>;

    app = await E2eTestHelper.createTestingModule({
      exampleRepository: exampleRepo,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/examples', () => {
    it('deve criar um exemplo e retornar 201', async () => {
      exampleRepo.save.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/v1/examples')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Meu Exemplo' })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Meu Exemplo',
        createdAt: expect.any(String),
      });
      expect(exampleRepo.save).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 quando name está ausente', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/examples')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(exampleRepo.save).not.toHaveBeenCalled();
    });

    it('deve retornar 401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/v1/examples')
        .send({ name: 'Meu Exemplo' })
        .expect(401);
    });
  });

  describe('GET /v1/examples/:id', () => {
    it('deve retornar 404 quando não encontrado', async () => {
      exampleRepo.findById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/v1/examples/id-inexistente')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.type).toBe('ExampleNotFoundException');
    });
  });
});
```

---

## 4. E2eTestHelper

Ao adicionar um novo repositório ao projeto, expanda o helper:

```typescript
// test/helpers/e2e-test.helper.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { ProblemDetailsExceptionFilter } from '../../src/shared/problem-details.filter';
import { IExampleRepository } from '../../src/domain/repositories/example.repository.interface';

interface TestMocks {
  exampleRepository?: jest.Mocked<IExampleRepository>;
  // adicionar novos repositórios aqui conforme o projeto cresce
}

export class E2eTestHelper {
  static async createTestingModule(mocks: TestMocks): Promise<INestApplication> {
    const overrides = Test.createTestingModule({ imports: [AppModule] });

    if (mocks.exampleRepository) {
      overrides.overrideProvider('IExampleRepository').useValue(mocks.exampleRepository);
    }

    const module = await overrides.compile();

    const app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ProblemDetailsExceptionFilter());

    await app.init();
    return app;
  }
}
```

---

## Checklist antes de entregar os testes

- [ ] Use case: caminho feliz coberto
- [ ] Use case: todos os erros de domínio cobertos
- [ ] Use case: `repo.save` não chamado quando há erro de validação
- [ ] Controller unitário: mapeamento input → use case verificado
- [ ] Controller unitário: exceção do use case propagada
- [ ] E2E: status HTTP correto para cada cenário
- [ ] E2E: shape do response body validado com `toMatchObject`
- [ ] E2E: `jest.clearAllMocks()` no `afterEach`
- [ ] Nenhum teste depende de banco real ou clock real sem mock explícito
