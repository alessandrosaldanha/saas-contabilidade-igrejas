---
name: clean-architecture
description: Clean Architecture & SOLID design principles expert guide for building scalable, maintainable, and testable software systems based on Robert C. Martin's principles and industry best practices.
---

# Clean Architecture & Enterprise Software Engineering Skill

## Overview

This skill provides comprehensive guidelines, architectural patterns, and practical execution rules for designing, refactoring, and maintaining software applications following **Clean Architecture** (Robert C. Martin / Uncle Bob) combined with modern enterprise best practices (Domain-Driven Design, SOLID principles, Hexagonal/Ports & Adapters).

---

## Core Philosophical Principles

1. **The Primary Directive of Software Architecture**: Minimze the human resources required to build and maintain the system over time.
2. **Behavior vs. Architecture**: Software has two values: *behavior* (what it does today) and *architecture* (how easy it is to change tomorrow). Architecture is the primary value; software must remain *soft*.
3. **The Dependency Rule**: Source code dependencies MUST point strictly inwards, towards higher-level policy and domain business rules.
4. **Frameworks & Infrastructure as Plug-ins**: Databases, UI, Web frameworks, Messaging Queues, and 3rd-party APIs are low-level details. The core application logic must not know or care about these details.

---

## Architectural Concentric Layers

```
+--------------------------------------------------------------+
| [ Frameworks & Drivers ]                                     |
|  Web, DB, UI, External Interfaces, Devices, Devices          |
|  +--------------------------------------------------------+  |
|  | [ Interface Adapters / Presenters ]                    |  |
|  |  Controllers, Gateways, Presenters, Mappers          |  |
|  |  +--------------------------------------------------+  |  |
|  |  | [ Application Business Rules / Use Cases ]       |  |  |
|  |  |  Use Case Interactors, DTOs, Boundary Ports      |  |  |
|  |  |  +--------------------------------------------+  |  |  |
|  |  |  | [ Enterprise Business Rules / Entities ]   |  |  |  |
|  |  |  |  Domain Entities, Value Objects, Rules     |  |  |  |
|  |  |  +--------------------------------------------+  |  |  |
|  |  +--------------------------------------------------+  |  |
|  +--------------------------------------------------------+  |
+--------------------------------------------------------------+
```

### Layer 1: Enterprise Business Rules (Entities)
* **Responsibility**: Pure domain logic, business rules, entities, and value objects.
* **Rules**:
  * Purest layer of the system. ZERO framework dependencies, zero UI imports, zero DB imports.
  * Encapsulates the most general, high-level business rules that remain true whether an app is web-based, CLI, or mobile.
  * Mutated only through domain methods that enforce internal invariants.

### Layer 2: Application Business Rules (Use Cases)
* **Responsibility**: Orchestrates domain entities to achieve specific user goals (e.g., `RegisterUser`, `ProcessPayment`).
* **Rules**:
  * Defines Input and Output Data Transfer Objects (DTOs) or boundaries.
  * Defines Output Interfaces (Ports/Repositories/Gateways) that lower layers must implement.
  * Does NOT handle HTTP requests, SQL queries, or UI formatting directly.

### Layer 3: Interface Adapters (Controllers, Presenters, Gateways)
* **Responsibility**: Translates data between Use Cases and external formats (e.g., HTTP JSON to DTO, DTO to DB Record).
* **Components**:
  * **Controllers**: Receives user input, parses requests, invokes Use Cases.
  * **Presenters / View Models**: Converts Use Case output into presentation-friendly formats.
  * **Repositories / Gateways (Implementations)**: Executes database queries or external API calls implementing the Interfaces defined by the Use Case layer.

### Layer 4: Frameworks & Drivers (Infrastructure)
* **Responsibility**: External tools, database drivers, web frameworks (Express, NestJS, React, Fastify, Spring), ORM tools (Prisma, TypeORM, Hibernate), and cloud SDKs.
* **Rules**:
  * Glue code only. Kept as thin as possible.

---

## The SOLID Principles Checklist

### 1. Single Responsibility Principle (SRP)
* *A module should be responsible to one, and only one, actor.*
* Separate code that changes for different business stakeholders (e.g., Accounting vs. HR vs. Operations).

### 2. Open/Closed Principle (OCP)
* *A software artifact should be open for extension, but closed for modification.*
* Achieve this using interfaces, abstract classes, and dependency injection (Polymorphism) so that adding new features requires writing new code, not editing existing code.

### 3. Liskov Substitution Principle (LSP)
* *Subtypes must be substitutable for their base types without altering system correctness.*
* Avoid throwing `NotImplementedException` in overridden methods or altering precondition assumptions.

### 4. Interface Segregation Principle (ISP)
* *Clients should not be forced to depend on methods they do not use.*
* Prefer small, role-specific interfaces (`Reader`, `Writer`) over monolithic interfaces (`DatabaseManager`).

### 5. Dependency Inversion Principle (DIP)
* *High-level modules should not depend on low-level modules. Both should depend on abstractions.*
* Core Domain/Use Cases declare interfaces; Infrastructure implements them.

---

## Design Patterns & Tactical Implementation Rules

### Dependency Injection & Boundaries
* Use Inversion of Control (IoC) containers or manual dependency injection at entry points.
* Never instantiate concrete infrastructure implementations (e.g., `new PostgresUserRepository()`) inside Use Cases or Domain logic. Pass interfaces.

### Data Flow & Boundary Crossing
* Use Cases receive raw primitive DTOs (or request commands) and return output DTOs.
* Never return raw ORM entities or DB models from Use Cases or Controllers to the presentation layer. Use Mappers.

### Testing Strategy (Testing Pyramid)
1. **Domain & Unit Tests**: Fast, high-coverage tests without DB or network calls. Test Entities and Use Cases using Mock/Fake Repositories.
2. **Integration Tests**: Test Adapters, Repositories, and SQL queries against real/test DB instances.
3. **End-to-End (E2E) Tests**: Small set of full system tests.

---

## Practical Example Layout (TypeScript / Clean Architecture)

```
src/
├── domain/                    # Layer 1: Enterprise Rules
│   ├── entities/              # Domain entities (e.g., User.ts)
│   ├── value-objects/         # Immutables (e.g., Email.ts)
│   └── errors/                # Custom business domain errors
│
├── use-cases/                 # Layer 2: Application Rules
│   ├── ports/                 # Input/Output interfaces (Repositories)
│   ├── dtos/                  # Request/Response payloads
│   └── create-user/           # Feature-based Use Case interactors
│
├── adapters/                  # Layer 3: Interface Adapters
│   ├── controllers/           # REST / GraphQL / CLI Controllers
│   ├── presenters/            # Response mappers / ViewModels
│   └── repositories/          # Concrete DB repository implementations
│
└── infrastructure/            # Layer 4: Frameworks & Drivers
    ├── http/                  # Express/Fastify/Nest server setup
    ├── database/              # ORM setup (Prisma, TypeORM, Knex)
    └── config/                # Environment variables & DI Container
```

---

## Decision Matrix & Code Review Checklist

When writing or reviewing code, verify:

- [ ] Does the domain layer import *anything* from `express`, `typeorm`, `axios`, or outer layers? **(If yes, break the dependency)**
- [ ] Are business rules encapsulated inside domain entities rather than scattered across controllers?
- [ ] Can you run unit tests for the Use Case without touching a database or running a server?
- [ ] Are database models separated from domain entities using a mapper/adapter?
- [ ] Is error handling uniform, mapping domain exceptions to HTTP status codes at the controller layer?
