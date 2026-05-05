# ADR-0001: ERP_SYSTEM Architecture Review & Improvement Roadmap

**Status:** Proposed
**Date:** 2026-04-26
**Deciders:** Tech lead / platform architect (Ed)
**Scope:** Repo-wide review of `ERP_SYSTEM_FULL` (NestJS 11 backend, React 18 + Vite frontend, Postgres / Redis / Kafka / MinIO infra) and a prioritized roadmap for hardening it for production multi-tenant load.

---

## 1. Context

`ERP_SYSTEM_FULL` is a multi-tenant ERP built as a single NestJS modular monolith with a React/Ant Design SPA in front of it.

Material I inspected:

- `backend/` — NestJS 11, TypeORM 0.3, ~427 TS files, ~51.6k LOC, **39 feature modules** wired into `app.module.ts`, **134 entities**, **42 controllers**, **59 services**, **22 `*.spec.ts`** files (test/code ratio ≈ 5%).
- `frontend/` — React 18, Vite 7, Ant Design, Zustand, React Query, ~168 files, ~33.9k LOC, lazy-loaded routes in `App.tsx`.
- `infrastructure/` — Postgres 16, Redis 7, MinIO, Kafka 7.6 + Zookeeper, all wired via `docker-compose.yml`. A `Dockerfile` builder + slim runtime is in place; `node --max-old-space-size=400` is hard-coded.
- `.kiro/specs/high-load-scaling-system/` — already-written design + acceptance criteria for rate limiting, caching, pooling, async offload, circuit breaking, and observability. Most of it is **specified but not implemented**.
- `.kiro/specs/tenant-integrations-management/` — a second in-flight spec for plan-aware tenant integration management.
- `DOCUMENT_GENERATION_ENGINE_PLAN.md` — design for a generic template-driven document engine; partially in code (`modules/documents`, `puppeteer`, `pdfkit`).
- `brains/` — an "AI orchestrator" (Operator / Controller / Forecaster / Sustainability sub-brains) that runs strategy auctions and proposes plays; uses `@google/genai`, `@langchain/openai`.

The system is feature-rich (accounting, AR/AP, CRM, HR, procurement, inventory, warehouse, manufacturing, transportation, project management, asset management, BI, workflow automation, compliance audit, communication, chat, subscriptions, system admin, brains) but **has not yet been hardened for production**. Several critical safety nets — schema migrations, rate limiting, observability, secrets hygiene, circuit breakers — are either missing or partially built.

---

## 2. Decision

Adopt a **modular-monolith-first** strategy and execute a four-phase improvement roadmap (Stabilize → Scale → Modularize → Extract). Do **not** prematurely extract microservices; instead, harden the existing NestJS modules into clean bounded contexts that *can* be extracted later if and only if a specific module's load profile warrants it.

This decision keeps operational complexity proportional to current team size while removing the sharp-edge production risks today.

---

## 3. Findings (what the code actually shows)

### 3.1 Critical / production-blocking

| # | Finding | Evidence | Risk |
|---|---|---|---|
| C1 | **TypeORM `synchronize: true` is on globally** | `backend/src/app.module.ts:69` | Schema drift, accidental table drops on restart, silent destructive migrations in prod. |
| C2 | **`autoLoadEntities: true` + no migration runner wired** | `app.module.ts:66`; `backend/src/core/database/database.module.ts` is an empty `@Module({})`. Migrations exist under `src/database/migrations/` but the `migration:run` npm script points at the *empty* `core/database/database.module.ts` as the data source. | Migrations cannot actually be applied; environments diverge. |
| C3 | **No rate limiting / throttling anywhere** | `grep Throttler\|RateLimit` returns 0 matches in `src/`. | Single tenant or scraper can DOS the API. The kiro spec already requires per-tenant + per-IP limits but it isn't wired. |
| C4 | **CORS allows all origins with credentials** | `main.ts:11–14` — `origin: true, credentials: true`. | CSRF + credential exfiltration risk for any authenticated origin. |
| C5 | **No security middleware (Helmet, CSRF, body-size limit)** | `grep helmet` → 0 matches. | Default Express posture: no HSTS, no CSP, no clickjacking protection. |
| C6 | **No real readiness/liveness probes** | `app.controller.ts` exposes `GET /health` returning `{status:'ok'}`. No DB / Redis / Kafka / MinIO checks. | Kubernetes will keep traffic flowing to a backend that has lost its DB. |
| C7 | **JWT refresh-token strategy is single-secret, single-token** | `auth.module.ts` only registers `JWT_ACCESS_SECRET`; refresh tokens are bcrypt-hashed at rest (good) but **stored on the `users` table** and rotated in-place — no separate `JWT_REFRESH_SECRET`, no key rotation, no revocation list. | Compromised access secret = total takeover; no way to invalidate sessions globally. |
| C8 | **`.env` files committed to repo** | `ls` shows `.env`, `backend/.env`, `backend/.env.local` tracked by git history (file mode 600). | Real secret leakage if any of these were ever pushed; even if scrubbed, history needs verifying. |
| C9 | **`test-auth.controller.ts` is registered alongside the real auth controller** | `auth.module.ts` imports both `AuthController` and `TestAuthController`. | Test endpoints reachable in production. |
| C10 | **No central observability stack** | No Prometheus/OTel/structured logger wiring; backend uses default Nest `Logger`. `console.log` appears 89× in src. | No way to debug a production incident. |

### 3.2 High-priority structural issues

| # | Finding | Evidence | Impact |
|---|---|---|---|
| H1 | **God-services** — `accounting.service.ts` 1,211 lines, `auth.service.ts` 1,191 lines, `warehouse.service.ts` 885, `hr.service.ts` 831, `procurement.service.ts` 821. | wc -l output. | Untestable, change-risk concentrated in single files, merge conflicts. |
| H2 | **Auth module owns 14+ entity repositories** including `Customer`, `Quote`, `Activity`, `Shipment`, `AR/AP`, `Transaction`. | `auth.module.ts` `TypeOrmModule.forFeature([...])`. | Bounded-context violation; auth is now coupled to half the ERP. |
| H3 | **DB connection pool is unconfigured** | TypeORM `useFactory` in `app.module.ts` does not set `extra: { max, min, idleTimeoutMillis }`. | Default pool will become the throughput bottleneck under load. |
| H4 | **No transactional boundaries on multi-step writes** | Only 57 occurrences of `manager.transaction|queryRunner` across 5,800+ DB-touching call sites; many service methods do 3–5 sequential `.save()` calls without a transaction. | Partial writes on failure → inconsistent ledgers (especially in `accounting`, `transactions`, `procurement`). |
| H5 | **N+1 risk** | 728 `findOne` call sites; many are inside `.map(async ...)` patterns inferred from service sizes. | Latency cliffs on list endpoints. |
| H6 | **Redis cache invalidation uses `KEYS *` pattern scans** | `RedisService.delPattern` runs `client.keys(pattern)`. | `KEYS` is O(N) and blocks the Redis event loop on large keyspaces — a known production foot-gun. Use `SCAN` + pipelined `DEL`. |
| H7 | **`autoLoadEntities` + no entity scan boundary** | `app.module.ts:65`. | Unrelated modules can leak entities into one another's repositories. |
| H8 | **No global Swagger/OpenAPI** | `grep SwaggerModule` → 0 matches; `@nestjs/swagger` is in `package.json` but not bootstrapped. | Frontend integrates by trial-and-error; no generated SDK; no contract test surface. |
| H9 | **Mixed naming + duplicate spec files** | `auth/auth.service.spec.ts` *and* `auth/services/auth.service.spec.ts` differ; `pages/accounting/AccountsReceivableTab.tsx.bak` left in tree. | Drift, dead code, contradictory tests. |
| H10 | **Brain modules call OpenAI/Gemini synchronously inside HTTP handlers** (inferred from `OrchestratorService.runStrategyAuction` doing `await operator.proposePlay(rfp)` etc.) | `brains/orchestrator/orchestrator.service.ts`. | LLM latency (5–30s) blocks request threads — must move behind Kafka. |

### 3.3 Frontend / DX

| # | Finding | Evidence |
|---|---|---|
| F1 | Hard-coded fallback API URL pointing at a Koyeb preview env. | `frontend/src/api/client.ts:7`. |
| F2 | `socket.io-client` listed twice in `package.json` (`^4.8.1` and `^4.8.3`). | `frontend/package.json`. |
| F3 | JWT stored in localStorage via Zustand `persist` (XSS-exfiltratable). | `store/authStore.ts`. |
| F4 | No e2e test coverage beyond a single `smoke.spec.ts`. | `frontend/tests/`. |
| F5 | Lazy-loaded routes are good, but bundle splitting per module isn't enforced — vendor chunk strategy not configured in `vite.config.ts`. | `vite.config.ts`. |
| F6 | `react@18` + `react-is@19` mismatch; will produce subtle render-tree mismatches. | `package.json`. |

### 3.4 Operations / DevOps

| # | Finding | Evidence |
|---|---|---|
| O1 | `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"` and replication factor 1. | `docker-compose.yml`. |
| O2 | Backend container is launched with `--max-old-space-size=400` — extremely low for a 39-module monolith. | `backend/Dockerfile` last line. |
| O3 | No CI config in repo (no `.github/workflows`, no `.gitlab-ci.yml`). | `find` returns nothing. |
| O4 | No structured logging, no log shipping, no APM. | grep `winston|pino` → 0. |
| O5 | k6 tests referenced in `Makefile` but `backend/k6-tests/` directory does not exist. | `ls k6-tests` empty. |

---

## 4. Options Considered (architectural direction)

### Option A — Stabilize the modular monolith (recommended)

Keep one deployable. Enforce module boundaries (no cross-module repository imports), add real migrations, security middleware, observability, async offload via Kafka, and a real cache layer. The kiro `high-load-scaling-system` spec is already written for exactly this — execute it.

| Dimension | Assessment |
|---|---|
| Complexity | Low–Medium — incremental on existing stack |
| Cost | Low — no new infra beyond what's running |
| Scalability | Sufficient to ~10k req/min per tenant with horizontal replicas |
| Team familiarity | High — NestJS/TypeORM/Postgres already in use |
| Time to value | 4–6 weeks for the "Stabilize" phase |

**Pros:** Fastest path to a production-safe state; preserves all current work; matches existing kiro design docs; modular-monolith is the right scale for a sub-50k-LOC codebase.
**Cons:** Doesn't solve "one bad module taking down all of ERP"; LLM/brain workloads still co-resident.

### Option B — Decompose into microservices now

Split along business contexts (auth-and-tenancy, finance/accounting, supply-chain {inventory+procurement+warehouse+transportation}, hr-and-crm, brains, documents).

| Dimension | Assessment |
|---|---|
| Complexity | High — service mesh, distributed tx, contract testing, deploy-of-N |
| Cost | High — N× CI pipelines, shared infra, tracing |
| Scalability | Excellent per-service |
| Team familiarity | Likely Low — no current k8s manifests, no sidecars |
| Time to value | 6+ months before parity |

**Pros:** Each domain scales / fails / deploys independently; clear ownership; LLM/brain workloads cleanly isolated.
**Cons:** Distributed-transaction problem in finance is real (debits/credits crossing AR ↔ AP ↔ GL); current tooling absent; would block product work for a quarter.

### Option C — Strangler-fig: keep monolith, extract only "brains" + "documents" + "communication"

Pull the three async-heavy, latency-tolerant subsystems into separate workers behind Kafka. Leave the synchronous transactional core (accounting/inventory/procurement/transportation/HR/CRM) in the monolith.

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Medium |
| Scalability | Solves the LLM-blocking-API problem; finance core stays cohesive |
| Team familiarity | Medium |
| Time to value | 2–3 months after Phase 1 stabilization |

**Pros:** Best of both — finance stays a monolith with strong invariants; latency-tolerant work is isolated; minimal protocol surface (Kafka topics already exist).
**Cons:** Two deployables instead of one; need contract for "play submission" and "document render request".

### Trade-off analysis

The right path is **A first, then C**. Microservices (Option B) is rejected because the codebase is not yet boundary-clean; extracting today would only relocate the coupling. Option A creates the *preconditions* (clean modules, observability, Kafka/Redis maturity) that make Option C cheap when we want it. Option C is then a near-zero-risk follow-up because the brains/documents/communication subsystems are already async-shaped.

---

## 5. Roadmap (full plan)

The roadmap has four phases. Each phase has explicit exit criteria; do not start phase N+1 until phase N's criteria are green.

### Phase 1 — Stabilize (weeks 1–6) — production-safety floor

Goal: make the system safe to put real customer data on. Nothing here adds features.

1. Database safety
   - Set `synchronize: false` and `autoLoadEntities: false` in production (`app.module.ts`); explicitly list entities per module via `TypeOrmModule.forFeature`.
   - Move data-source config out of `app.module.ts` into a real `data-source.ts` and point `migration:run` / `migration:revert` at it; restore `core/database/database.module.ts`.
   - Squash existing migrations into a baseline; add CI step `migration:check` that fails if entities drift from migrations.
   - Configure pool: `extra: { max: 20, min: 5, idleTimeoutMillis: 30000, statement_timeout: 10000 }`.

2. AuthN / AuthZ hardening
   - Split secrets: `JWT_ACCESS_SECRET` (5–15 min TTL) + `JWT_REFRESH_SECRET` (7–30 d TTL, rotated). Use `RS256` with a JWK if you want cross-service verification later.
   - Refresh-token revocation list in Redis (`auth:revoked:<jti>`) honored by the strategy.
   - Remove `TestAuthController` from `AuthModule` or guard it with `NODE_ENV !== 'production'`.
   - Drop the 14 cross-domain repositories from `AuthModule` — auth needs `User`, `Tenant`, `UserRole`, `Role`, `PortalAccount`, `SystemAdmin`. Move the customer/quote/shipment/AR/AP touches into a `LoginContextService` consumed by `AuthService`.

3. Network surface
   - `helmet()` global; `compression()`; `express.json({ limit: '1mb' })`; cookie/CSRF for portal flows.
   - CORS: explicit allow-list from `CORS_ORIGINS` env var; reject `*` in production.
   - Add `@nestjs/throttler` with the Redis storage adapter from the kiro spec; per-tenant 1000 req/min, per-IP 300 req/min.

4. Observability baseline
   - Replace built-in `Logger` with `nestjs-pino` — JSON logs, request id, tenant id in every line.
   - `@nestjs/terminus` health endpoints: `/health/live` and `/health/ready` (DB ping, Redis ping, Kafka admin ping, MinIO bucket-list).
   - `prom-client` `/metrics` with HTTP histogram, DB pool gauges, Kafka lag, cache hit/miss.
   - OpenTelemetry SDK with OTLP exporter — even if you start with `console`, the hook is in place.

5. Secrets / config hygiene
   - Audit git history for `.env` and `backend/.env`; if present, rotate all credentials and add to `.gitignore`.
   - Move runtime secrets to Doppler/Vault/AWS SM/SOPS — `.env.example` stays in repo; real `.env` does not.

6. CI/CD
   - `.github/workflows/ci.yml`: lint, type-check, jest, frontend build, docker build, migration drift check.
   - Codecov / coverage gate at the current baseline (raise it later).
   - Pin Node to 20.x in both Dockerfiles (the `dev` Dockerfile drifts to `node:24-alpine`).

7. Quick wins
   - Delete `pages/accounting/AccountsReceivableTab.tsx.bak`.
   - De-dupe `socket.io-client` in `frontend/package.json`.
   - Remove duplicate `auth.service.spec.ts` (keep the one beside the real service).
   - Raise `--max-old-space-size` from 400 → 1024 (or rely on cgroup limit and remove the flag).

**Exit criteria for Phase 1:** `synchronize` off, migrations applied in CI, throttler live, helmet live, `/health/ready` green checks all four deps, structured logs and `/metrics` scraped by a local Prometheus, all `.env*` files gitignored, CI passing on every PR.

### Phase 2 — Scale (weeks 7–12) — execute the kiro high-load spec

Goal: meet the kiro acceptance criteria — 300+ concurrent VUs, p95 < 500 ms, < 1% error, full security at load.

1. Caching layer
   - Promote `RedisService.cached()` into a `@Cacheable(resource, ttl)` / `@CacheEvict(resource)` decorator pair.
   - Convert `delPattern` from `KEYS` to `SCAN` (cursor-based, non-blocking).
   - Cache key format `cache:{tenantId}:{resource}:{queryHash}` — tenant prefix mandatory.
   - Add cache hit/miss + cache-key cardinality to `/metrics`.

2. Async offload via Kafka
   - Move all of these from sync HTTP path to Kafka producers + consumers:
     - audit-log writes (`compliance-audit`)
     - email/SMS dispatch (`communication`)
     - PDF / DOCX rendering (`documents`, `transportation/shipment-document`)
     - LLM "brain" calls (`brains/*` — `OrchestratorService`)
     - report generation (`bi-reporting`)
   - DLQ topic `erp.<domain>.dlq` on 3 retries.
   - Idempotency keys on every producer; consumer Redis-NX dedupe is already there for financial events — generalize.

3. Circuit breakers
   - Wrap external calls (`pg`, Redis, Kafka, MinIO, OpenAI/Gemini) in `cockatiel` policies.
   - Trip thresholds: 50% failure over 30 s window, half-open after 60 s.
   - Per-dependency `/metrics` gauge for breaker state.

4. Connection pool + statement timeouts
   - Postgres: `max: 20`, `statement_timeout: 10s`, `lock_timeout: 5s`, `idle_in_transaction_session_timeout: 30s`.
   - Per-replica pool, so total pool = replicas × 20 — verify against PG `max_connections`.

5. Graceful shutdown
   - `app.enableShutdownHooks()` is already on; add explicit handlers in `RedisService.onModuleDestroy`, `KafkaService.onModuleDestroy`, drain in-flight HTTP via `terminus`.
   - Kubernetes `preStop` sleeps 10 s before SIGTERM to let LB drain.

6. Load testing
   - Restore the missing `backend/k6-tests/` directory (Makefile references it). Three baseline scripts: platform, stress, spike. Wire to CI nightly.
   - Define SLOs: p95 < 500 ms on read, < 1 s on write, 99.9% availability.

**Exit criteria for Phase 2:** k6 platform run hits 300 VUs with p95 < 500 ms; cache hit ratio > 60% on read traffic; circuit breakers visible on the metrics dashboard; one chaos test (kill Redis, kill Kafka) shows graceful degradation, not 5xx storms.

### Phase 3 — Modularize (weeks 13–20) — bounded contexts as code

Goal: turn 39 NestJS modules into properly-isolated bounded contexts with explicit public APIs, so any one of them could later be extracted without surgery.

1. Define context boundaries (initial cut)
   - **identity** — `auth`, `tenants`, `users`, `roles`, `permissions`, `rbac`, `system-admin`, `subscriptions`
   - **finance** — `accounting`, `transactions`, `payments`, `finance`
   - **commerce** — `crm`, `procurement`, `suppliers`, `categories`, `products`
   - **supply** — `inventory`, `warehouse`, `transportation`, `manufacturing`, `asset-management`
   - **work** — `hr`, `project-management`, `service-management`, `workflow-automation`
   - **platform** — `documents`, `communication`, `chat`, `bi-reporting`, `compliance-audit`, `dashboard`, `dynamic-modules`, `settings`
   - **brains** — `brains/*`

2. Enforce boundaries
   - Per-context barrel file (`<context>/public-api.ts`) — only types/services exported here may be imported across contexts.
   - ESLint rule `no-restricted-imports` disallowing deep imports across contexts.
   - Move the 14 cross-domain repositories out of `AuthModule` (issue H2).

3. Refactor god-services
   - Split `accounting.service.ts` (1,211 lines) into ChartOfAccounts, JournalEntries, AR, AP, Reconciliation services + a small facade.
   - Same for `auth.service.ts`, `warehouse.service.ts`, `hr.service.ts`, `procurement.service.ts`.

4. Transactional integrity
   - Audit every multi-write service method; wrap in `dataSource.transaction(async (m) => …)`.
   - Add a Jest matcher / lint rule that flags `.save()` chains without a surrounding transaction in known-financial files.

5. API contract
   - Bootstrap `@nestjs/swagger` in `main.ts`; `/api/docs` per env, protected in prod.
   - Generate a typed SDK for the frontend (`openapi-typescript` or `orval`) to replace hand-rolled `frontend/src/api/*`.

6. Test pyramid
   - Today: 22 spec files for ~427 source files. Aim 1:1 for service logic by end of phase.
   - Add contract tests on Kafka producers/consumers using a test-container.
   - Add Playwright e2e for the top 10 user flows (the single `smoke.spec.ts` is not enough).

**Exit criteria for Phase 3:** lint-enforced context boundaries; no service file > 400 lines; every multi-write path is in a DB transaction; Swagger published; FE uses generated SDK; coverage ≥ 60% on backend, ≥ 40% on frontend.

### Phase 4 — Extract async edges (weeks 21–28)

Goal: peel off the three async-heavy contexts (Option C above) into separate deployables.

1. **brains-svc** — own deployable, own Postgres schema (or its own DB), consumes `erp.brains.requests`, produces `erp.brains.plays`. Lets you scale GPUs / set memory limits independently.
2. **documents-svc** — Puppeteer + PDFKit memory profile is hostile; isolate it. Consumes `erp.documents.render.requests`, writes to MinIO, emits `erp.documents.render.completed`.
3. **communication-svc** — email/SMS/webhook dispatch; ideal isolation candidate (low coupling, high failure variance).

Each extraction follows the same pattern: (a) introduce a clean Kafka contract, (b) ship the consumer in-process behind a feature flag, (c) move the consumer to its own deployable, (d) remove the in-process implementation.

**Exit criteria for Phase 4:** monolith no longer imports `puppeteer`, `@google/genai`, `@langchain/openai`, or any email transport; three new services in CI; failure of any one causes graceful degradation, not API errors.

### Phase 5+ — Optional / deferred

- Tenant-aware sharding (Postgres logical replication or Citus) — only if a single instance hits write-IOPS ceiling.
- Read replicas + a `@ReadOnly()` decorator that routes queries to them.
- Event sourcing on the accounting ledger if audit / restate-able-history becomes a hard requirement.
- gRPC between extracted services if HTTP overhead becomes meaningful.

---

## 6. Consequences

**What becomes easier**
- Onboarding: a single roadmap doc plus enforced module boundaries makes the codebase comprehensible.
- Incident response: real probes, real metrics, real logs.
- Compliance: tenant-prefixed cache keys and audited Kafka events give you the paper trail.

**What becomes harder**
- Day-to-day dev velocity *temporarily* drops in Phase 1 while you add CI gates and migrations.
- More moving parts in observability — someone needs to own the Prometheus/Grafana/Loki stack.

**What we'll need to revisit**
- Modular-monolith vs. microservices decision after Phase 4 — re-evaluate once the three async edges are extracted.
- LLM cost / quota strategy when `brains-svc` stands on its own.
- Multi-region story (none today) — both data residency and latency.

---

## 7. Action items (sequenced, owners TBD)

### Phase 1 (P0 — stop-the-bleed)
1. [ ] Set `synchronize: false`, restore real data-source / migration runner, add CI drift check. _(`app.module.ts`, `core/database/database.module.ts`, `package.json` migration scripts)_
2. [ ] Configure DB pool (`max`, `min`, `statement_timeout`).
3. [ ] Enable `helmet`, `compression`, body-size limit; CORS allow-list from env.
4. [ ] Wire `@nestjs/throttler` + Redis storage (use the design from `.kiro/specs/high-load-scaling-system/design.md`).
5. [ ] Split `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`; add Redis revocation list; gate `TestAuthController` behind env.
6. [ ] Replace built-in Logger with `nestjs-pino`; wire `request-id` + `tenant-id`.
7. [ ] Add `@nestjs/terminus` `/health/live` and `/health/ready` (DB, Redis, Kafka, MinIO).
8. [ ] Add `prom-client` `/metrics`.
9. [ ] Audit git history for `.env`; rotate any leaked secrets; ensure `.gitignore` covers all `.env*`.
10. [ ] Add `.github/workflows/ci.yml` (lint / type-check / test / build / migration-drift).
11. [ ] Trim `AuthModule`'s 14 cross-domain repositories down to identity-only.
12. [ ] Repo cleanup: delete `*.bak`, dedupe `socket.io-client`, remove duplicate `auth.service.spec.ts`, normalize Node 20 in both Dockerfiles, raise `--max-old-space-size` to 1024.

### Phase 2
13. [ ] Implement `@Cacheable` / `@CacheEvict` decorators; switch `delPattern` to `SCAN`.
14. [ ] Move audit-log, email, PDF, LLM, BI-report from sync to Kafka with DLQ.
15. [ ] Add `cockatiel` circuit breakers around PG / Redis / Kafka / MinIO / LLM.
16. [ ] Restore `backend/k6-tests/` (platform / stress / spike) and run nightly in CI.
17. [ ] Define SLOs and Prometheus alerts for them.

### Phase 3
18. [ ] Define and lint-enforce 7 bounded-context boundaries.
19. [ ] Decompose 5 god-services (accounting, auth, warehouse, hr, procurement).
20. [ ] Wrap every multi-write path in `dataSource.transaction`; add lint rule for AR/AP/JE files.
21. [ ] Bootstrap Swagger; generate FE SDK; replace `frontend/src/api/*` hand-written clients.
22. [ ] Raise test coverage to 60% backend / 40% frontend; Playwright e2e for top 10 flows.

### Phase 4
23. [ ] Extract `brains-svc`.
24. [ ] Extract `documents-svc`.
25. [ ] Extract `communication-svc`.

---

## 8. Open questions for you

1. **Production target** — single region, single Postgres, or multi-region? This changes Phase 5 priorities.
2. **Compliance regime** — SOC2 / ISO 27001 / GDPR / HIPAA? Affects audit-log retention, encryption-at-rest decisions, and how aggressive the secrets remediation must be.
3. **Team size** — the roadmap as written assumes ~2–3 backend engineers. Halve the team and Phase 3 stretches to 16 weeks.
4. **Brains/LLM commitment** — are the AI sub-brains a product commitment or an experiment? If experiment, demote `brains/*` to feature-flagged Phase 4 and stop carrying its dependencies in the monolith.
5. **Existing customer data** — is there production data we'd be migrating, or is this still pre-launch? Pre-launch makes the `synchronize: false` cutover trivial; post-launch requires a careful baseline migration.

---

*Inputs to this ADR: every file under `backend/src/` (sampled), `frontend/src/api`, `frontend/src/store`, `docker-compose.yml`, `.kiro/specs/high-load-scaling-system/{design,requirements}.md`, `.kiro/specs/tenant-integrations-management/requirements.md`, `DOCUMENT_GENERATION_ENGINE_PLAN.md`, `Dockerfile(s)`, `Makefile`, `package.json` (both).*
