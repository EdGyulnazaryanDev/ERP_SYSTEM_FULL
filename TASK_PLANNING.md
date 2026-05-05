# ERP System — Task Planning

Generated: 2026-04-26  
Based on: ADR-0001, full codebase investigation

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked

---

## Phase 1 — Stabilize (Weeks 1–6)
> Goal: Make the system safe to run in production. No new features.

### P1.1 Database Safety

- [ ] Disable `synchronize: true` in `app.module.ts:69` → set `synchronize: false`
- [ ] Create a dedicated `data-source.ts` TypeORM DataSource file for CLI usage
- [ ] Fix `migration:run` npm script to point to `data-source.ts`
- [ ] Run `migration:generate` to capture current schema drift as a migration
- [ ] Add `migration:check` step to CI (fail if unapplied migrations exist)
- [ ] Configure DB connection pool: `max: 20`, `connectionTimeout: 3000`, `statement_timeout: 10s`
- [ ] Remove `.env` files from git history (use `git filter-repo` or BFG), add to `.gitignore`

### P1.2 Security Hardening

- [ ] Add `helmet()` to `main.ts` (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Add `compression()` middleware
- [ ] Set `app.use(bodyParser.json({ limit: '1mb' }))`
- [ ] Replace `origin: true` CORS with explicit allowlist (env var `ALLOWED_ORIGINS`)
- [ ] Install and wire `@nestjs/throttler` with Redis store — global 100 req/min default
- [ ] Add stricter rate limits on auth endpoints (10 req/min on `/api/auth/login`)
- [ ] Split JWT into separate access secret + refresh secret (env vars)
- [ ] Add refresh token revocation list in Redis (`SET token:<jti> blacklisted EX <ttl>`)
- [ ] Remove `TestAuthController` from production (gate behind `NODE_ENV !== production`)
- [ ] Audit and remove any console logs exposing sensitive data

### P1.3 Health & Observability

- [ ] Replace `Logger` with `nestjs-pino` (JSON output, request-id, correlation-id)
- [ ] Add `@nestjs/terminus` health module with `/health/ready` and `/health/live`
  - [ ] PostgreSQL indicator
  - [ ] Redis indicator
  - [ ] Kafka indicator
  - [ ] MinIO indicator
- [ ] Add `prom-client` + `/metrics` endpoint
  - [ ] HTTP request duration histogram (by route, method, status)
  - [ ] DB pool utilization gauge
  - [ ] Cache hit/miss counter
  - [ ] Active WebSocket connections gauge
- [ ] Remove 89× `console.log` calls in `src/` — replace with injected Logger

### P1.4 CI/CD

- [ ] Create `.github/workflows/ci.yml` with jobs:
  - [ ] `lint` — `npm run lint` for backend + frontend
  - [ ] `type-check` — `npm run type-check` for frontend, `tsc --noEmit` for backend
  - [ ] `test` — `npm run test:cov` for backend (fail below 20% coverage threshold)
  - [ ] `build` — Docker build for backend + frontend images
  - [ ] `migration-drift` — run `migration:check`, fail if drift detected
- [ ] Create `.github/workflows/deploy.yml` (placeholder, manual trigger)
- [ ] Add `Dockerfile` linting (hadolint)

### P1.5 Critical Bug Fixes

- [ ] Fix `socket.io-client` duplicate in `frontend/package.json` (remove older `^4.8.1` entry)
- [ ] Fix `react-is@19` mismatch — pin to `react-is@18.x` matching React version
- [ ] Remove hard-coded Koyeb fallback URL in `frontend/src/api/client.ts`
- [ ] Fix Redis `KEYS *` usage in `RedisService.delPattern` → replace with `SCAN` iterator

---

## Phase 2 — Harden (Weeks 7–12)
> Goal: Add transactional integrity, async processing, caching.

### P2.1 Transactional Boundaries

- [ ] Wrap AR creation + GL journal entry in `QueryRunner` transaction (accounting service)
- [ ] Wrap AP creation + inventory update on Goods Receipt approval (procurement service)
- [ ] Wrap payslip generation + salary component calculation in transaction (HR service)
- [ ] Wrap stock movement + ledger entry in transaction (warehouse service)
- [ ] Add global `AsyncLocalStorage` request context for transaction propagation
- [ ] Audit all `findOne` hot paths (728 call sites) — add `relations` only where needed

### P2.2 Async Offload via Kafka

- [ ] Implement Kafka consumer for audit logs (`erp.compliance.audit.logs`)
  - Move audit writes out of hot path; fire-and-forget via producer
- [ ] Implement Kafka consumer for email dispatch (`erp.communication.email.requests`)
  - Wire to Nodemailer or AWS SES
- [ ] Implement Kafka consumer for PDF rendering (`erp.documents.render.requests`)
  - Move Puppeteer out of HTTP handlers (transportation, HR, documents)
- [ ] Implement Kafka consumer for Brain RFPs (`erp.brains.requests`)
  - Remove synchronous LLM calls from HTTP handlers
  - Publish result to `erp.brains.plays`
- [ ] Implement Kafka consumer for BI reports (`erp.bi.reports.requests`)
- [ ] Add Dead Letter Queue (DLQ) for each consumer topic
- [ ] Add Kafka producer retry + idempotency key per event

### P2.3 Caching

- [ ] Add `@nestjs/cache-manager` with Redis store globally
- [ ] Cache COA (Chart of Accounts) lookups — 5-min TTL
- [ ] Cache user permissions per tenant — 1-min TTL, evict on role change
- [ ] Cache product/category lists — 10-min TTL
- [ ] Cache BI dashboard aggregations — 15-min TTL
- [ ] Cache subscription plan features per tenant — 5-min TTL

### P2.4 API Documentation

- [ ] Bootstrap `@nestjs/swagger` in `main.ts`
- [ ] Add `@ApiTags`, `@ApiOperation`, `@ApiResponse` to all controllers
- [ ] Generate OpenAPI JSON, publish at `/api/docs`
- [ ] Generate TypeScript frontend SDK from OpenAPI spec (replace manual `api/` files)

### P2.5 Testing

- [ ] Bring backend unit test coverage to 40%
  - [ ] accounting.service (currently god-service, priority)
  - [ ] auth.service
  - [ ] procurement.service
  - [ ] hr.service
  - [ ] warehouse.service
- [ ] Add Playwright e2e tests for top 5 user flows:
  - [ ] Register company + admin login
  - [ ] Create purchase requisition → approve → PO
  - [ ] Create employee → run payroll → download payslip
  - [ ] Create invoice → record payment → check AR balance
  - [ ] Create shipment → mark delivered → check inventory
- [ ] Add contract tests on Kafka producers (schema registry or manual schema check)

---

## Phase 3 — Modularize (Weeks 13–20)
> Goal: Clean bounded contexts, decompose god-services, fill functional gaps.

### P3.1 Decompose God-Services

- [ ] Split `accounting.service.ts` (1,211 LOC) into:
  - [ ] `gl.service.ts` — journal entries, ledger
  - [ ] `ar.service.ts` — accounts receivable
  - [ ] `ap.service.ts` — accounts payable
  - [ ] `reconciliation.service.ts` — matching, suggestions
  - [ ] `reporting.service.ts` — trial balance, P&L, balance sheet
- [ ] Split `auth.service.ts` (1,191 LOC):
  - [ ] Move Customer repo out → CRM module
  - [ ] Move Supplier repo out → Suppliers module
  - [ ] Move Shipment repo out → Transportation module
  - [ ] Move AR/AP repos out → Accounting module
  - [ ] Move Transaction repo out → Transactions module
  - [ ] Move Quote repo out → CRM module
  - [ ] Auth retains only: User, Role, UserRole, PortalAccount
- [ ] Split `warehouse.service.ts` (885 LOC):
  - [ ] `stock-movement.service.ts`
  - [ ] `bin.service.ts`
- [ ] Split `hr.service.ts` (831 LOC):
  - [ ] `payroll.service.ts`
  - [ ] `leave.service.ts`
  - [ ] `attendance.service.ts`
- [ ] Split `procurement.service.ts` (821 LOC):
  - [ ] `purchase-order.service.ts`
  - [ ] `rfq.service.ts`
  - [ ] `goods-receipt.service.ts`

### P3.2 Missing Module Implementations

- [ ] **Payments module** — implement fully:
  - [ ] Payment methods (card, bank transfer, cash)
  - [ ] Payment processing service
  - [ ] Link to AR/AP (mark invoices paid)
  - [ ] Payment history + receipts
  - [ ] Refunds + partial payments
- [ ] **Tenants module** — implement fully:
  - [ ] CRUD endpoints for tenants
  - [ ] Tenant onboarding flow (create tenant + seed data)
  - [ ] Tenant suspension / reactivation
  - [ ] Tenant settings (timezone, currency, locale)
- [ ] **Finance module** — decide: merge into accounting or define distinct scope
  - [ ] If keep: implement budgeting, forecasting, financial planning
  - [ ] If remove: delete module, migrate any used entities
- [ ] **RBAC** — expose public API surface:
  - [ ] `GET /api/rbac/check` — check permission for current user
  - [ ] `GET /api/rbac/matrix` — full permission matrix for tenant
- [ ] **Admin module** — replace mock integrations with real ones:
  - [ ] Slack webhook integration
  - [ ] Jira ticket creation
  - [ ] Email provider config (SMTP settings)

### P3.3 Missing Business Logic

- [ ] **Accounting**: Auto-post GL journal on payroll approval (debit salary expense, credit payable)
- [ ] **Accounting**: Auto-post GL journal on goods receipt approval (debit inventory, credit AP)
- [ ] **Manufacturing**: Add WIP cost accumulation (raw material → WIP → COGS)
- [ ] **Manufacturing**: Variance tracking (planned vs. actual qty + cost)
- [ ] **CRM**: Quote-to-Invoice conversion (quote → AR invoice in accounting)
- [ ] **HR**: Email dispatch on payslip generation (via Kafka consumer)
- [ ] **Inventory**: Stock reservation on PO creation (prevent over-commit)
- [ ] **Brains**: Wire plays to actions (approved play → auto-create purchase requisition)
- [ ] **Brains**: Populate GlobalGoal from tenant settings
- [ ] **Brains**: Wire MacroSignal ingestion (external market data feed)

### P3.4 Module Boundary Enforcement

- [ ] Add ESLint rule to prevent cross-module direct imports (enforce through index barrels)
- [ ] Document module dependency graph
- [ ] Add `@nestjs/swagger` tags matching bounded contexts

---

## Phase 4 — Extract & Scale (Weeks 21–28)
> Goal: Extract heavy workers, add read replicas, load test.

### P4.1 Extract Workers as Separate Services

- [ ] **documents-svc**: Kafka consumer for PDF/DOCX rendering (Puppeteer, pdfkit)
  - Remove Puppeteer dependency from main app
  - Expose via Kafka only (not HTTP)
- [ ] **brains-svc**: Kafka consumer for LLM strategy auctions
  - Remove OpenAI/Gemini deps from main app
  - Publish results back to Kafka
- [ ] **communication-svc**: Kafka consumer for email + in-app notifications
  - Handle Nodemailer, push notifications, SMS (Twilio)
- [ ] Update docker-compose to include new svc containers
- [ ] Add health checks for each new svc

### P4.2 Read Replicas

- [ ] Add read replica PostgreSQL in docker-compose (stream from primary)
- [ ] Add `@ReadOnly()` decorator for reporting/BI queries
- [ ] Route BI reports, trial balance, dashboard aggregations to replica

### P4.3 Load Testing

- [ ] Create `k6/` directory (referenced in Makefile but missing)
- [ ] Write `k6/platform.js` — baseline load (50 VUs, 5 min)
- [ ] Write `k6/stress.js` — ramp to 200 VUs
- [ ] Write `k6/spike.js` — sudden 500 VU spike
- [ ] Add Makefile targets (already defined, just need scripts):
  - `make k6-platform`
  - `make k6-stress`
  - `make k6-spike`
- [ ] Define SLOs: p95 < 300ms, error rate < 0.1%, availability > 99.9%

### P4.4 Frontend Performance

- [ ] Add per-domain code splitting in Vite config (separate chunks per ERP domain)
- [ ] Move JWT from localStorage to httpOnly cookie (requires backend `/auth/refresh` cookie endpoint)
- [ ] Add React Error Boundaries per page domain
- [ ] Add bundle size budget to CI (fail if chunk > 500KB)

---

## Backlog — Unscheduled / Future

- [ ] Multi-currency support (exchange rates, forex gain/loss accounting)
- [ ] Tax filing integration (VAT returns, e-invoicing standards)
- [ ] Mobile app (React Native or PWA)
- [ ] Webhook system (notify external apps on ERP events)
- [ ] AI: Populate CarbonLedger from actual transactions (ESG reporting)
- [ ] AI: Demand forecasting from historical inventory + seasonality signals
- [ ] Document engine: Digital signature support (DocuSign API or open-source)
- [ ] Document engine: Multi-language templates
- [ ] Document engine: Scheduled generation (e.g., monthly payslip batch)
- [ ] BI: Custom dashboard builder (drag-drop widgets)
- [ ] BI: Scheduled report email dispatch
- [ ] Subscriptions: Stripe/payment gateway integration for plan billing
- [ ] Kubernetes: Helm chart for production deployment
- [ ] Read replica: Elasticsearch for full-text search across ERP entities

---

## Quick Reference — Current Module Status

| Module | Backend | Frontend | Priority |
|---|---|---|---|
| accounting | Complete | Complete | Phase 1 harden |
| procurement | Complete | Complete | Phase 1 harden |
| hr | Complete | Complete | Phase 1 harden |
| crm | Complete | Complete | Phase 3 quote→invoice |
| inventory | Complete | Complete | Phase 3 reservation |
| warehouse | Complete | Complete | Phase 2 transactions |
| transportation | Complete | Complete | Phase 2 async PDF |
| manufacturing | Complete | Complete | Phase 3 cost/WIP |
| project-management | Complete | Complete | OK |
| service-management | Complete | Complete | OK |
| asset-management | Complete | Complete | OK |
| communication | Complete | Complete | Phase 2 email |
| workflow-automation | Complete | Complete | OK |
| transactions | Complete | Complete | OK |
| compliance-audit | Complete | Complete | Phase 2 async |
| documents | Partial | Partial | Phase 2 async, Phase 3 features |
| bi-reporting | Stub | Partial | Phase 3 |
| dashboard | Basic | Basic | Phase 3 |
| dynamic-modules | Advanced | Partial | Phase 3 |
| subscriptions | Complete | None | Phase 3 |
| settings | Basic | Complete | OK |
| users | Complete | Complete | OK |
| roles | Complete | Complete | OK |
| permissions | Complete | Complete | OK |
| suppliers | Complete | Complete | OK |
| products | Complete | Complete | OK |
| categories | Complete | Complete | OK |
| system-admin | Complete | Complete | OK |
| auth | Complete (risky) | Complete | Phase 1 + Phase 3 |
| rbac | Stub | Partial | Phase 3 |
| **payments** | **Empty** | Partial | **Phase 3 — implement** |
| **tenants** | **Empty** | None | **Phase 3 — implement** |
| **finance** | Redundant | None | **Phase 3 — decide scope** |
| admin | Mock | Partial | Phase 3 |
| brains | Experimental | None | Phase 2 async + Phase 3 wire |
| chat | Complete | Partial | OK |
