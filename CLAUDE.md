# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A **dynamic ERP platform** — not a single-purpose ERP, but a platform that any type of company (logistics, retail, SaaS, manufacturing, services) can use. Each company onboards as a **tenant** with its own data, users, roles, and configuration. The platform owner controls the whole system as a superadmin.

The current deployment is a test/demo server. The goal is a production-grade multi-tenant SaaS ERP.

---

## Three-Tier Access Model

This is the most important architectural concept. Every feature must respect all three levels:

| Level | Who | Scope |
|---|---|---|
| **Superadmin** | Platform owner | Sees all tenants, manages plans, global settings, system health |
| **Tenant Admin** | Company owner/admin | Manages their own company — users, roles, settings, data |
| **Tenant User** | Company employee | Access gated by RBAC permissions assigned by their admin |

- Superadmin routes: `/admin/*` (AdminLayout)
- Tenant routes: all other routes (MainLayout), scoped by `tenant_id` on every entity
- Portal routes: `/portal/*` for external actors (customers, suppliers) with limited access
- Every database query **must** include `tenant_id` in the WHERE clause — never return cross-tenant data

---

## Core Domain (Highest Priority)

These modules are the functional heart of the platform. When in doubt, prioritize correctness here over all other modules:

1. **Accounting** — Chart of Accounts, Journal Entries, AR (invoices), AP (bills), Bank Accounts, payments, trial balance, P&L, balance sheet. Every financial event must produce a balanced journal entry.
2. **Transactions** — The central sales/purchase transaction record that links CRM quotes, inventory, shipments, and accounting entries.
3. **Inventory** — Stock levels, reorder points, stock adjustments. Must stay consistent with warehouse movements and procurement receipts.
4. **Supply Chain** — Procurement (requisition → RFQ → PO → goods receipt), Warehouse (bins, stock movements), Transportation (shipments, couriers, delivery). These must flow into accounting automatically: goods receipt → AP entry, shipment → AR entry.

**The critical cross-module chain:**
```
CRM Quote → Transaction → Shipment → Warehouse stock out → AR Invoice → Payment → GL Journal
Purchase Requisition → PO → Goods Receipt → Inventory stock in → AP Bill → Payment → GL Journal
```

Each step must produce consistent DB state. If a step fails, the whole chain should roll back (use `QueryRunner` transactions — currently missing, needs implementation).

---

## Coding Rules

### No Comments
**Never write comments.** If existing code has comments, remove them when touching that file. Names should be self-documenting. The only exception is a `// TODO:` when something is intentionally deferred with a specific reason.

### Module Structure
Every module follows exactly this pattern:
```
modules/<name>/
  <name>.module.ts
  <name>.controller.ts      (HTTP layer only — no business logic)
  <name>.service.ts         (all business logic here)
  entities/
    <entity>.entity.ts
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
```

Controllers must only: validate input (via DTOs + ValidationPipe), call service methods, return responses. No repository calls, no business logic in controllers.

### Services
Services own all business logic. Never inject a repository from a different module's entity directly — communicate cross-module via the other module's service or events. The auth module is an exception to this (legacy), but do not add more cross-module repository injections.

### DTOs
All DTOs use `class-validator` decorators. All fields must be explicitly marked `@IsOptional()` or required. Use `@Type(() => NestedClass)` for nested objects and arrays. The global `ValidationPipe` has `whitelist: true` and `forbidNonWhitelisted: true` — unknown fields are rejected.

### Entities
Every entity must have `tenant_id: string` (UUID) column unless it is a platform-level entity (e.g. `Tenant`, `Plan`, `SystemAdmin`). All entities have `created_at` and `updated_at` with `@CreateDateColumn` / `@UpdateDateColumn`.

### Database Writes
Any operation that writes to more than one table must use a `QueryRunner` transaction:
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  // all writes use queryRunner.manager
  await queryRunner.commitTransaction();
} catch (e) {
  await queryRunner.rollbackTransaction();
  throw e;
} finally {
  await queryRunner.release();
}
```

### Error Handling
Throw NestJS built-in exceptions from services: `NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`. The global exception filter handles formatting. Never catch and swallow errors silently.

### No Blocking Async in HTTP Handlers
Never call LLM APIs (OpenAI, Gemini), PDF rendering (Puppeteer), or any operation that can take >500ms directly inside an HTTP handler. These must be published to Kafka and handled by a consumer. The current `brains/` module violates this — it is a known issue to fix.

### TypeScript
- Strict mode is on — no `any` unless absolutely unavoidable, and if used, add `// TODO: type this`
- Prefer explicit return types on service methods
- Use `Promise<void>` not `Promise<undefined>`

### Frontend
- Components in `pages/` are page-level only — no business logic, only composition of hooks and components
- All API calls go through `src/api/client.ts` Axios instance — never use `fetch` directly
- Server state: TanStack Query. Client/UI state: Zustand. Form state: Ant Design Form. Never mix these.
- Path alias `@` = `src/` — always use it for imports, never relative `../../`
- No inline styles — use Tailwind classes or Ant Design props

---

## Development Setup (Docker)

Everything runs in Docker. Do not run services natively.

```bash
make dev           # Start full dev environment
make dev-build     # Rebuild + start (use after package.json changes)
make logs          # All logs
make logs-backend  # Backend only
make logs-frontend # Frontend only
make down-volumes  # Full reset — destroys all data
make ps            # Container status
```

Backend hot-reloads on file save. Frontend Vite dev server does the same.

### Ports (dev)

| Service | Port |
|---|---|
| Frontend (Vite) | 5173 |
| Backend (NestJS) | 3100 |
| PostgreSQL | 5433 |
| Redis | 6380 |
| MinIO API | 9100 |
| MinIO Console | 9101 |
| Kafka | 9092 |

### Backend scripts (run inside container or with Docker exec)

```bash
npm run test:e2e              # All e2e tests
npm run test:e2e:flows        # Business flow tests only
npm run test:e2e:accounting   # Accounting module tests
npm run lint
npm run format
npm run seed
```

### Frontend scripts

```bash
npm run test          # Playwright e2e
npm run test:flows    # Business flow UI tests
npm run type-check
npm run lint
```

---

## Architecture

### Backend (`backend/src/`)

```
main.ts               — bootstrap, global prefix /api, ValidationPipe, exception filter
app.module.ts         — root module, TypeORM config, all 39 feature modules
modules/              — 39 feature modules
core/                 — DB config, exception filter, guards, middleware
infrastructure/       — Redis client, Kafka producer/consumer, MinIO client
brains/               — AI strategy orchestrator (needs async refactor)
common/               — shared decorators, guards (JwtAuthGuard, RolesGuard), interceptors
database/
  migrations/         — TypeORM migration files (9 files)
  seeders/            — default RBAC, COA, workflow seeders
```

### Frontend (`frontend/src/`)

```
main.tsx              — bootstrap, Zustand hydration
App.tsx               — React Router v6, lazy-loaded routes, three layouts
api/client.ts         — Axios instance, JWT interceptor, 401 → redirect
components/common/    — DataTable, PermissionGuard, SearchBar
components/forms/     — DynamicForm, FilterBuilder, BulkImport
hooks/                — useDataTable, useCrudOperations, usePermissions
pages/                — 33 domain directories, one per ERP module
services/             — BaseService and domain-specific service wrappers
store/authStore.ts    — Zustand auth (JWT in localStorage)
types/                — global TypeScript types
```

---

## Module Status

### Working — do not break these
accounting, procurement, inventory, warehouse, transportation, hr, manufacturing, crm, transactions, compliance-audit, communication, workflow-automation, project-management, service-management, asset-management, subscriptions, roles, permissions, users, products, suppliers, categories, settings, system-admin, dynamic-modules, documents (partial)

### Broken / Empty — need implementation
- `payments` — module exists but has zero implementation. Needs: payment methods, link to AR/AP, receipts, refunds.
- `tenants` — no controller, empty service. Needs: tenant CRUD for superadmin, onboarding flow, suspension.
- `finance` — appears redundant with `accounting`. Decide: implement as budgeting/forecasting module or delete.
- `rbac` — service logic exists but no public API. Needs: `GET /api/rbac/check` and `GET /api/rbac/matrix`.
- `admin` — only mock integration toggles (Slack, Jira are fake). Needs real webhook implementations.

### Known Issues (do not work around — fix the root cause)
- `synchronize: true` in `app.module.ts:69` — schema auto-syncs on start. Must be `false` before production.
- Migration runner broken — `npm run migration:run` points to empty file `core/database/database.module.ts`. Fix: create `src/database/data-source.ts` with actual DataSource config.
- No transactional boundaries on multi-step writes — AR creation + journal entry, goods receipt + inventory update, payroll + GL posting all need `QueryRunner` wrapping.
- `brains/` module calls LLM synchronously in HTTP handlers — blocks threads for 5–30s. Must move to Kafka consumers.
- Redis `delPattern` uses `KEYS *` (O(N) scan) — replace with `SCAN` cursor-based iteration.
- JWT stored in `localStorage` — XSS-exfiltratable. Future: move to httpOnly cookies.
- Hard-coded Koyeb fallback URL in `frontend/src/api/client.ts` — must be removed.
- `socket.io-client` listed twice in `frontend/package.json` — remove duplicate.
- `react-is@19` installed with `react@18` — causes warnings, pin to `react-is@18.x`.

---

## Performance: Monolith First, Microservices Later

**Do not migrate to microservices now.** It would take 2–3 months and adds deployment complexity that doesn't make sense for a demo/test stage. The correct order:

**Phase 1 — fix these for immediate gains:**
1. Move Puppeteer PDF rendering and LLM calls out of HTTP handlers → Kafka consumers (10x latency improvement on those endpoints)
2. Add Redis caching for: COA lists, permission matrices, product/category lists, dashboard aggregates (5-min TTL)
3. Fix N+1 queries — 728 `findOne` call sites need review; use `relations` or `QueryBuilder` with JOINs
4. Set DB connection pool: `max: 20, connectionTimeout: 3000`
5. Add `compression()` middleware to reduce response size

**Phase 2 — after Phase 1 is stable:**
Extract only the truly async heavy workers as separate Node processes (not separate APIs):
- `brains-worker` — Kafka consumer for LLM strategy
- `documents-worker` — Kafka consumer for PDF/DOCX rendering
- `email-worker` — Kafka consumer for email dispatch

These share the same DB and Redis, just run as separate processes. This is not microservices — it's worker extraction, much simpler and achieves the same performance benefit for the actual bottlenecks.

**Microservices** (if ever needed): only after the platform has paying tenants and you've identified specific modules that need independent scaling. Not now.

---

## AI Brains Module

Located in `backend/src/brains/`. Implements a strategy auction: RFP event → multiple AI sub-brains propose plays → cheapest play wins → logged to `SimulationRun`.

Current state: architecturally sound but **not production-ready**:
- LLM calls are synchronous (blocking HTTP) — must move to Kafka
- Plays are proposed but never executed (no auto-reorder, no auto-action)
- GlobalGoal entity exists but is never read
- MacroSignal entity exists but is never populated

When implementing: treat brains as a background worker that consumes events from `erp.brains.requests` topic and publishes results to `erp.brains.plays`. The HTTP layer should only trigger an event and return `202 Accepted`, never wait for the LLM response.
