# Microservices Migration Plan

Generated: 2026-04-29
Strategy: **Strangler Fig** — monolith stays running, services extracted one at a time.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | Schema-per-service on 1 PostgreSQL | Isolation without ops overhead of multiple DB servers. Split later if needed. |
| Gateway | Nginx reverse proxy | Zero code, routes by URL prefix. Upgrade to NestJS gateway when auth/aggregation needed. |
| Sync comms | HTTP between services | For reads that need an immediate response (e.g. procurement asks inventory for stock level) |
| Async comms | Kafka events | For writes that trigger side effects (goods receipt → inventory update → accounting entry) |
| Shared code | npm workspace package `@erp/shared` | Types, enums, interfaces, base classes shared across all services |
| Repo structure | Monorepo (npm workspaces) | Solo dev + small team — one repo, one CI, shared tooling |
| Migration pattern | Strangler Fig | Monolith continues serving all other modules, extracted services take over one domain at a time |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Nginx API Gateway                   │
│  /api/inventory  → inventory-service:3001           │
│  /api/procurement→ procurement-service:3002          │
│  /api/accounting → accounting-service:3003           │
│  /api/*          → monolith:3100 (everything else)  │
└───────────────┬─────────────────────────────────────┘
                │ Docker network: erp-net
    ┌───────────┼──────────────┬──────────────────┐
    ▼           ▼              ▼                  ▼
inventory   procurement    accounting          monolith
 :3001        :3002           :3003             :3100
    │           │              │
    └───────────┴──────────────┘
              Kafka (events)
              Redis (cache, shared)
              PostgreSQL (schemas: inventory, procurement, accounting, public)
```

**Kafka topics (Phase 2+):**
| Topic | Producer | Consumers |
|---|---|---|
| `erp.inventory.stock-changed` | inventory-svc | procurement-svc, accounting-svc |
| `erp.procurement.goods-received` | procurement-svc | inventory-svc, accounting-svc |
| `erp.procurement.po-approved` | procurement-svc | accounting-svc |
| `erp.accounting.payment-recorded` | accounting-svc | procurement-svc |

---

## Monorepo Structure (target)

```
ERP_SYSTEM_FULL/
  packages/
    shared/                     ← @erp/shared npm package
      src/
        types/                  ← shared TypeScript types
        enums/                  ← status enums used across services
        interfaces/             ← service-to-service contracts
        events/                 ← Kafka event payload types
        dto/                    ← base DTO classes (pagination, filters)
      package.json
      tsconfig.json

  services/
    inventory-service/          ← extracted NestJS app
    procurement-service/        ← extracted NestJS app
    accounting-service/         ← extracted NestJS app

  backend/                      ← existing monolith (shrinks over time)
  frontend/                     ← unchanged
  nginx/
    nginx.conf                  ← API gateway routing config
  docker-compose.yml            ← updated to include all services
  docker-compose.dev.yml
  package.json                  ← workspace root
```

---

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done
- [!] Blocked

---

## Phase 0 — Monorepo & Shared Package Setup
> **Goal**: Set up the workspace structure. No services extracted yet. No risk to monolith.
> **Duration**: ~1 week

### P0.1 Workspace Setup ✅
- [x] Convert root `package.json` to npm workspace root
- [x] Create `packages/shared/` with `package.json` (`name: "@erp/shared"`)
- [x] Create `packages/shared/tsconfig.json`
- [x] Add build script: `tsc --declaration --outDir dist`

### P0.2 Shared Package — Types & Enums ✅
- [x] All enums (common, payment, inventory, procurement, accounting, hr, crm, transportation)
- [x] Types: `PaginatedResult<T>`, `PaginationQuery`, `TenantContext`, `JwtPayload`, `ApiResponse<T>`
- [x] Interfaces: `IKafkaEvent<T>`, `IServiceClient`
- [x] Events: inventory, procurement, accounting
- [x] Constants: `KAFKA_TOPICS`, `SERVICE_URLS`
- [x] DTO: `BasePaginationDto`
- [x] Package builds cleanly with `@types/node` installed

### P0.3 Nginx Gateway Setup ✅
- [x] Create `nginx/nginx.conf` with upstream blocks and location routing
- [x] Add nginx service to `docker-compose.dev.yml` (port 80 → internal routing)
- [ ] Test that monolith still works through nginx on port 80 (no extraction yet)

### P0.4 PostgreSQL Schema Isolation ✅
- [x] Created `1775400000000-CreateServiceSchemas.ts` migration (inventory, procurement, accounting, hr, crm schemas)
- [x] Created `src/core/database/data-source.ts` — proper TypeORM DataSource for CLI
- [x] Fixed `migration:run` / `migration:revert` scripts to point to `data-source.ts`
- [x] Added `migration:generate` and `migration:create` scripts
- [ ] Run `npm run migration:run` inside backend container to apply (monolith stays on `public` schema)

---

## Phase 1 — Extract Inventory Service
> **Goal**: Inventory runs as its own service. Monolith reads inventory via HTTP.
> **Why first**: Fewest cross-module write dependencies. Other modules read inventory but rarely write to it directly.
> **Duration**: ~2 weeks

### P1.1 Scaffold inventory-service
- [ ] Create `services/inventory-service/` as new NestJS app:
  ```bash
  nest new inventory-service --package-manager npm
  ```
- [ ] Add to `docker-compose.yml`:
  ```yaml
  inventory-service:
    build: ./services/inventory-service
    ports: ["3001:3001"]
    environment:
      DB_SCHEMA: inventory
      PORT: 3001
    networks: [erp-net]
  ```
- [ ] Add `@erp/shared` as dependency
- [ ] Configure TypeORM to use `schema: 'inventory'` in connection options
- [ ] Copy entities from `backend/src/modules/inventory/entities/` → `inventory-service/src/entities/`
- [ ] Copy service, controller, DTOs — then clean up cross-module imports

### P1.2 Migrate inventory data
- [ ] Write migration: `ALTER TABLE inventory SET SCHEMA inventory;`
- [ ] Update inventory-service TypeORM config to point at `inventory` schema
- [ ] Verify data is accessible from inventory-service
- [ ] Verify monolith's other modules that reference inventory still work (update their queries to use `inventory.inventory` fully-qualified table name or switch to HTTP calls)

### P1.3 Implement inventory-service HTTP API
All existing inventory endpoints must work identically:
- [ ] `GET  /api/inventory` — list with pagination, search, filters
- [ ] `GET  /api/inventory/summary` — stock summary aggregation
- [ ] `GET  /api/inventory/low-stock` — items below reorder point
- [ ] `GET  /api/inventory/:id` — single item
- [ ] `POST /api/inventory` — create item (validate SKU uniqueness within tenant)
- [ ] `PUT  /api/inventory/:id` — update
- [ ] `DELETE /api/inventory/:id` — delete
- [ ] `POST /api/inventory/:id/adjust` — stock adjustment (new endpoint, replaces direct DB write)
- [ ] Auth: forward JWT from nginx, validate in inventory-service (use shared JWT secret)

### P1.4 Inventory Kafka Producer
- [ ] Add KafkaModule to inventory-service
- [ ] Publish `erp.inventory.stock-changed` after any quantity change:
  ```typescript
  { tenantId, inventoryId, sku, previousQty, newQty, changeType, reference }
  ```
- [ ] Publish `erp.inventory.low-stock-alert` when quantity drops below reorder_point

### P1.5 Update monolith to call inventory-service
- [ ] Create `InventoryHttpClient` in monolith (`backend/src/clients/inventory.client.ts`)
  - Wraps Axios calls to `http://inventory-service:3001`
  - Forwards tenant JWT from request context
- [ ] Replace all `inventoryRepo` direct DB calls in:
  - `warehouse.service.ts` — update stock on movement
  - `procurement.service.ts` — update stock on goods receipt
  - `manufacturing.service.ts` — consume components on work order
- [ ] Remove InventoryEntity from monolith's TypeORM autoLoadEntities
- [ ] Update nginx to route `/api/inventory/*` → inventory-service

### P1.6 Test inventory extraction
- [ ] Run `./test-inventory.sh` — all tests pass through nginx gateway
- [ ] Run `./test-procurement.sh` — goods receipt still updates inventory via HTTP
- [ ] Run `./test-warehouse.sh` — stock movements still work
- [ ] Run `./test-all.sh` — no regressions

---

## Phase 2 — Extract Procurement Service
> **Goal**: Procurement runs as its own service, publishes Kafka events consumed by inventory and accounting.
> **Why second**: Natural next step — procurement triggers inventory updates and AP entries.
> **Duration**: ~2–3 weeks

### P2.1 Scaffold procurement-service
- [ ] Create `services/procurement-service/` NestJS app
- [ ] Add to docker-compose, port 3002
- [ ] Configure TypeORM schema: `procurement`
- [ ] Copy entities: PurchaseRequisition, RFQ, VendorQuote, PurchaseOrder, GoodsReceipt + items
- [ ] Add `@erp/shared` dependency

### P2.2 Implement procurement-service HTTP API
- [ ] `GET/POST /api/procurement/requisitions`
- [ ] `GET/PUT /api/procurement/requisitions/:id`
- [ ] `POST /api/procurement/requisitions/:id/approve`
- [ ] `POST /api/procurement/requisitions/:id/reject`
- [ ] `GET/POST /api/procurement/rfqs`
- [ ] `GET/POST /api/procurement/vendor-quotes`
- [ ] `GET/POST /api/procurement/purchase-orders`
- [ ] `PUT /api/procurement/purchase-orders/:id`
- [ ] `GET/POST /api/procurement/goods-receipts`
- [ ] `POST /api/procurement/goods-receipts/:id/approve`
- [ ] `GET /api/procurement/pending-approvals`

### P2.3 Procurement → Inventory via HTTP (sync)
When creating a GoodsReceipt (stock arrives), procurement-service calls inventory-service:
- [ ] Add `InventoryHttpClient` in procurement-service (same as monolith client)
- [ ] On GoodsReceipt approval: `POST /api/inventory/:id/adjust` with `{ quantity: +received, reference: grId }`
- [ ] Handle failure: if inventory call fails, rollback GR approval (saga pattern — manual for now)

### P2.4 Procurement → Accounting via Kafka (async)
- [ ] On PO approved: publish `erp.procurement.po-approved`
- [ ] On GoodsReceipt approved: publish `erp.procurement.goods-received`
  ```typescript
  {
    tenantId, grId, poId, supplierId,
    items: [{ productId, qty, unitCost }],
    totalAmount
  }
  ```
- [ ] Monolith accounting module consumes `erp.procurement.goods-received` → creates AP entry
  (accounting not yet extracted — monolith consumer is fine for Phase 2)

### P2.5 Update monolith & nginx
- [ ] Add `ProcurementHttpClient` to monolith for any modules that reference procurement
- [ ] Remove procurement entities from monolith autoLoadEntities
- [ ] Update nginx: `/api/procurement/*` → procurement-service

### P2.6 Test procurement extraction
- [ ] Run `./test-procurement.sh` — full flow passes
- [ ] Run `./test-accounting.sh` — AP entries created from Kafka events
- [ ] Run `./test-all.sh` — no regressions

---

## Phase 3 — Extract Accounting Service
> **Goal**: Accounting runs as its own service, consumes Kafka events from procurement and inventory.
> **Why third**: Most complex (12 entities, cross-module events) — extract after upstream services are stable.
> **Duration**: ~3 weeks

### P3.1 Scaffold accounting-service
- [ ] Create `services/accounting-service/` NestJS app
- [ ] Add to docker-compose, port 3003
- [ ] Configure TypeORM schema: `accounting`
- [ ] Copy entities: ChartOfAccount, JournalEntry, JournalEntryLine, AccountReceivable, AccountPayable, Payment, BankAccount, BankTransaction, BankReconciliation, TaxCode, FiscalYear, FiscalPeriod
- [ ] Add `@erp/shared` dependency

### P3.2 Implement accounting-service HTTP API
- [ ] Chart of Accounts: full CRUD
- [ ] Journal Entries: create, list, get, post, reverse
- [ ] Bank Accounts: full CRUD
- [ ] AR (invoices): create, list, get, record-payment, approve/sign
- [ ] AP (bills): create, list, get, record-payment
- [ ] Reports: trial-balance, balance-sheet, profit-and-loss

### P3.3 Accounting Kafka Consumers
- [ ] Consume `erp.procurement.goods-received` → create AP bill automatically
- [ ] Consume `erp.procurement.po-approved` → create AP provision
- [ ] Consume `erp.inventory.stock-changed` → create GL adjustment entry
- [ ] All consumers: idempotency key on event ID (skip if already processed)
- [ ] Dead letter topic: `erp.accounting.dlq` for failed events

### P3.4 Update monolith & nginx
- [ ] Remove accounting entities from monolith autoLoadEntities
- [ ] Monolith modules that create AR/AP entries → call accounting-service via HTTP
- [ ] Update nginx: `/api/accounting/*` → accounting-service

### P3.5 Test accounting extraction
- [ ] Run `./test-accounting.sh` — all 30+ assertions pass
- [ ] Run business flow: procurement → goods-received event → AP bill auto-created in accounting
- [ ] Run `./test-all.sh` — no regressions

---

## Phase 4 — Harden All Three Services
> **Goal**: Make extracted services production-safe before extracting more.
> **Duration**: ~2 weeks

### P4.1 Auth & Security (per service)
- [ ] Each service validates JWT using shared secret (not proxy to monolith)
- [ ] Each service enforces tenant isolation (`tenant_id` on every query)
- [ ] Add `@nestjs/throttler` to each service (100 req/min default)
- [ ] Add Helmet to each service main.ts
- [ ] Add request timeout (10s) via `axios-timeout` on all HTTP clients

### P4.2 Observability (per service)
- [ ] Add `nestjs-pino` JSON logging with `request-id` header propagation
- [ ] Add `@nestjs/terminus` health endpoint: `GET /health`
  - DB connection check
  - Kafka connection check
  - Redis connection check
- [ ] Add prom-client `/metrics`:
  - HTTP request histogram per route
  - Kafka consumer lag gauge
  - DB pool utilization
- [ ] Update nginx to expose `/metrics` per service (or aggregate via Prometheus scrape)

### P4.3 Resilience
- [ ] Add retry logic on HTTP clients (3 retries, exponential backoff, `axios-retry`)
- [ ] Add circuit breaker on HTTP clients (open after 5 failures in 10s)
- [ ] Kafka consumers: implement DLQ routing on 3rd retry failure
- [ ] Add DB connection pool config to each service: `max: 10, connectionTimeout: 3000`

### P4.4 Inter-service Contract Tests
- [ ] Write contract test for `InventoryHttpClient.adjust()` — verifies request/response shape
- [ ] Write contract test for each Kafka event — verifies payload schema matches consumer expectation
- [ ] Add contract tests to CI

---

## Phase B — Brain Engine: Approval-Gated Event-Driven Automation
> **Goal**: When domain events fire, the brain proposes an action chain. Each step in the chain requires human approval before executing the next step. The full cross-module flow (stock out → procurement → JE → transaction) runs automatically but never without a human sign-off at each gate.
> **Lives in**: monolith (`backend/src/brains/`) — stays here through Phase 3, extracted later as `brains-service`
> **Duration**: ~2 weeks

### Why this design

The brain never executes directly. It only **proposes**. A human approves each gate. This means:
- No runaway automation (bad data → bad auto-PO for 10,000 units)
- Full audit trail per step
- Configurable: high-trust tenants can auto-approve below a cost threshold
- Each step's output (e.g. created requisition ID) feeds into the next step as input

---

### PB.1 Core Entities

**`BrainPlayExecution`** — a proposed action chain, created when a trigger event fires
```
id, tenant_id
simulation_run_id (FK → brains_simulation_runs)
trigger_event      — e.g. 'INVENTORY_LOW_STOCK_ALERT'
chain_template     — e.g. 'REPLENISHMENT_CHAIN'
status             — PENDING_APPROVAL | APPROVED | REJECTED | IN_PROGRESS | COMPLETED | FAILED | CANCELLED
trigger_payload    — jsonb (original event data)
proposed_by        — 'BRAIN' (always)
approved_by        — user_id of approver (nullable until approved)
approved_at        — nullable
rejection_reason   — nullable
created_at, updated_at
```

**`BrainPlayStep`** — each discrete action in the chain
```
id, tenant_id
execution_id (FK → brain_play_executions)
step_number        — 1, 2, 3, ...
step_type          — see enum below
status             — PENDING | PENDING_APPROVAL | APPROVED | REJECTED | EXECUTING | COMPLETED | FAILED | SKIPPED
requires_approval  — boolean (configurable per step per chain)
approved_by        — user_id (nullable)
approved_at        — nullable
rejection_reason   — nullable
input_data         — jsonb (what the executor receives)
output_data        — jsonb (result after execution: created entity IDs, amounts, etc.)
error_message      — nullable
executed_at        — nullable
created_at, updated_at
```

**`BrainTriggerRule`** — tenant-configurable: which events activate which chain templates
```
id, tenant_id
trigger_event       — Kafka topic key (e.g. 'INVENTORY_LOW_STOCK_ALERT')
chain_template      — chain to instantiate
is_active           — boolean
auto_approve_threshold — decimal (auto-approve entire chain if total cost < this value, null = always require approval)
notify_role         — which role to notify for approval (e.g. 'procurement_manager')
created_at, updated_at
```

Tasks:
- [ ] Create `BrainPlayExecution` entity in `backend/src/brains/entities/`
- [ ] Create `BrainPlayStep` entity
- [ ] Create `BrainTriggerRule` entity
- [ ] TypeORM picks them up via `synchronize: true` (no migration needed yet)

---

### PB.2 Step Type Enum & Chain Templates

**Step types** (`BrainStepType` enum in `@erp/shared`):
```
CREATE_REQUISITION
CREATE_RFQ
SELECT_SUPPLIER_QUOTE
APPROVE_PURCHASE_ORDER
RECEIVE_GOODS
CREATE_AP_BILL
POST_JOURNAL_ENTRY
CREATE_TRANSACTION
CREATE_AR_INVOICE
RECORD_PAYMENT
SEND_NOTIFICATION
```

**Chain templates** (static config in `brains/chains/`):

`REPLENISHMENT_CHAIN` (trigger: LOW_STOCK_ALERT):
```
Step 1: CREATE_REQUISITION        requires_approval: true  (approver: procurement manager)
Step 2: CREATE_RFQ                requires_approval: false (auto, unless configured)
Step 3: SELECT_SUPPLIER_QUOTE     requires_approval: true  (approver: procurement manager)
Step 4: APPROVE_PURCHASE_ORDER    requires_approval: true  (approver: finance manager)
Step 5: RECEIVE_GOODS             requires_approval: true  (approver: warehouse manager — manual trigger when goods arrive)
Step 6: CREATE_AP_BILL            requires_approval: false (auto)
Step 7: POST_JOURNAL_ENTRY        requires_approval: true  (approver: accountant)
Step 8: CREATE_TRANSACTION        requires_approval: false (auto)
```

`PAYMENT_CHAIN` (trigger: AP_BILL_DUE or PAYMENT_INITIATED):
```
Step 1: RECORD_PAYMENT            requires_approval: true  (approver: finance manager)
Step 2: POST_JOURNAL_ENTRY        requires_approval: false (auto)
Step 3: CREATE_TRANSACTION        requires_approval: false (auto)
```

`INVOICE_CHAIN` (trigger: SHIPMENT_DELIVERED):
```
Step 1: CREATE_AR_INVOICE         requires_approval: true  (approver: accountant)
Step 2: POST_JOURNAL_ENTRY        requires_approval: false (auto)
Step 3: CREATE_TRANSACTION        requires_approval: false (auto)
```

Tasks:
- [ ] Add `BrainStepType` to `@erp/shared/src/enums/brain.enum.ts`
- [ ] Add `BrainChainTemplate` enum to `@erp/shared`
- [ ] Create `backend/src/brains/chains/replenishment.chain.ts` — returns step definitions array
- [ ] Create `backend/src/brains/chains/payment.chain.ts`
- [ ] Create `backend/src/brains/chains/invoice.chain.ts`
- [ ] Create `backend/src/brains/chains/index.ts` — map: `chainTemplate → stepDefinitions[]`

---

### PB.3 Kafka Trigger Consumers

The brain listens to domain events and creates a `BrainPlayExecution` when a matching `BrainTriggerRule` exists for the tenant.

**Kafka flow:**
```
erp.inventory.low-stock-alert  →  BrainsTriggerConsumer
  → look up BrainTriggerRule for tenant + event
  → if active rule found:
      → runStrategyAuction() to score the chain (existing logic)
      → create BrainPlayExecution (status: PENDING_APPROVAL)
      → create BrainPlayStep[] from chain template
      → publish erp.brains.approval-required
  → if auto_approve_threshold and cost < threshold:
      → set status: APPROVED, start step 1 immediately
```

**New Kafka topics** (add to `@erp/shared/constants/kafka-topics.ts`):
```
BRAINS_APPROVAL_REQUIRED: 'erp.brains.approval-required'
BRAINS_STEP_APPROVED:     'erp.brains.step-approved'
BRAINS_STEP_COMPLETED:    'erp.brains.step-completed'
BRAINS_STEP_FAILED:       'erp.brains.step-failed'
BRAINS_CHAIN_COMPLETED:   'erp.brains.chain-completed'
BRAINS_REQUESTS:          'erp.brains.requests'
BRAINS_PLAYS:             'erp.brains.plays'
```

Tasks:
- [ ] Add brain Kafka topics to `@erp/shared/src/constants/kafka-topics.ts`
- [ ] Add brain event payload types to `@erp/shared/src/events/brain.events.ts`
- [ ] Create `backend/src/brains/consumers/brain-trigger.consumer.ts` — subscribes to all trigger events
- [ ] `BrainsTriggerConsumer` injects `BrainTriggerRule` repo and `BrainPlayExecution` repo
- [ ] Move `runStrategyAuction()` call into the consumer (async, off HTTP thread)
- [ ] Publish `BRAINS_APPROVAL_REQUIRED` after creating execution

---

### PB.4 Approval API

HTTP endpoints (controller: `backend/src/brains/brains.controller.ts`):

```
GET  /api/brains/executions              — list all executions for tenant (filter by status)
GET  /api/brains/executions/:id          — full detail with all steps
POST /api/brains/executions/:id/approve  — approve entire execution (starts step 1)
POST /api/brains/executions/:id/reject   — reject with reason
GET  /api/brains/executions/:id/steps    — list steps with status
POST /api/brains/executions/:id/steps/:stepId/approve  — approve individual step
POST /api/brains/executions/:id/steps/:stepId/reject   — reject individual step
GET  /api/brains/trigger-rules           — list tenant's trigger rules
POST /api/brains/trigger-rules           — create/update a trigger rule
PATCH /api/brains/trigger-rules/:id      — enable/disable, change threshold
```

On `POST /approve`:
1. Set `execution.status = APPROVED`, record `approved_by`, `approved_at`
2. Find step 1 (step_number = 1)
3. If step 1 `requires_approval = false`: execute immediately → `BrainsExecutorService.executeStep(step)`
4. If step 1 `requires_approval = true`: set step status to `PENDING_APPROVAL`, notify approver

On `POST /steps/:stepId/approve`:
1. Set step status = APPROVED
2. Execute step → `BrainsExecutorService.executeStep(step)`
3. After success: advance to next step (same logic — auto or pending approval)

Tasks:
- [ ] Create `BrainsController` with all endpoints above
- [ ] Create `ApproveExecutionDto`, `RejectExecutionDto`, `ApproveStepDto`
- [ ] Create `BrainsApprovalService` — handles approve/reject state transitions
- [ ] Guard all endpoints with `JwtAuthGuard` + role check (only relevant roles can approve)

---

### PB.5 Step Executor Service

`BrainsExecutorService` — knows how to execute each `BrainStepType`. Calls the relevant service method directly (still in monolith, so direct service injection is fine).

```typescript
async executeStep(step: BrainPlayStep): Promise<void> {
  step.status = 'EXECUTING';
  await this.stepRepo.save(step);
  try {
    const result = await this.dispatchStep(step);
    step.output_data = result;
    step.status = 'COMPLETED';
    step.executed_at = new Date();
    await this.stepRepo.save(step);
    await this.advanceChain(step);  // move to next step
  } catch (e) {
    step.status = 'FAILED';
    step.error_message = e.message;
    await this.stepRepo.save(step);
    // publish BRAINS_STEP_FAILED to Kafka
  }
}
```

`dispatchStep()` — switch on `step.step_type`:
- `CREATE_REQUISITION` → call `ProcurementService.createRequisition(step.input_data)`
- `CREATE_RFQ` → call `ProcurementService.createRfq(...)`
- `SELECT_SUPPLIER_QUOTE` → call `ProcurementService.selectQuote(...)`
- `APPROVE_PURCHASE_ORDER` → call `ProcurementService.approvePO(...)`
- `RECEIVE_GOODS` → call `ProcurementService.receiveGoods(...)`
- `CREATE_AP_BILL` → call `AccountingService.createApBill(...)`
- `POST_JOURNAL_ENTRY` → call `AccountingService.postJournalEntry(...)`
- `CREATE_TRANSACTION` → call `TransactionService.create(...)`
- `CREATE_AR_INVOICE` → call `AccountingService.createInvoice(...)`
- `RECORD_PAYMENT` → call `AccountingService.recordPayment(...)`

`advanceChain()` — after a step completes:
1. Find next step (step_number + 1)
2. If no next step: mark execution as `COMPLETED`, publish `BRAINS_CHAIN_COMPLETED`
3. If next step `requires_approval = false`: execute it immediately
4. If next step `requires_approval = true`: set to `PENDING_APPROVAL`, publish `BRAINS_APPROVAL_REQUIRED`

Tasks:
- [ ] Create `backend/src/brains/executor/brains-executor.service.ts`
- [ ] Implement `dispatchStep()` with all step types
- [ ] Implement `advanceChain()` logic
- [ ] Inject: `ProcurementService`, `AccountingService`, `TransactionService` (or their repos)
- [ ] Publish Kafka events after each step state change

---

### PB.6 Frontend — Brain Approval Dashboard

New page: `frontend/src/pages/brains/BrainExecutionsPage.tsx`

**Dashboard view:**
- Table of all `BrainPlayExecution` records, grouped by status
- Each row: trigger event, chain template, proposed cost, status badge, "View" button
- Status filter tabs: Pending Approval | In Progress | Completed | Failed

**Execution detail view:** `BrainExecutionDetailPage.tsx`
- Header: trigger event, proposed cost, confidence score, status
- Step timeline (vertical): each step with icon, type, status badge
  - `COMPLETED` → green checkmark + output summary (e.g. "Requisition #REQ-001 created")
  - `PENDING_APPROVAL` → yellow clock + "Approve / Reject" buttons
  - `EXECUTING` → spinning indicator
  - `FAILED` → red × + error message + "Retry" button
  - `PENDING` → grey (waiting for prior steps)
- Approve/Reject the overall execution at the top
- Approve/Reject individual steps inline

**Trigger Rules page:** `BrainTriggerRulesPage.tsx`
- Per-tenant config: which events are active, auto-approve thresholds, notification roles

Tasks:
- [ ] Create `BrainExecutionsPage` with status tabs and execution table
- [ ] Create `BrainExecutionDetailPage` with step timeline
- [ ] Create `BrainTriggerRulesPage` with CRUD table
- [ ] Add API hooks: `useExecutions()`, `useExecution(id)`, `useApproveExecution()`, `useApproveStep()`
- [ ] Add to router and sidebar navigation under "AI Brains"
- [ ] `PermissionGuard` wrapping approve buttons (only `brain:approve` permission)

---

### PB.7 Integration: Wire trigger events to existing Kafka consumers

Connect the existing domain events to the brain trigger consumer:

| Trigger | Source module | Brain chain |
|---|---|---|
| `erp.inventory.low-stock-alert` | inventory | REPLENISHMENT_CHAIN |
| `erp.transportation.shipment-delivered` | transportation | INVOICE_CHAIN |
| `erp.accounting.ap-bill-created` | accounting | PAYMENT_CHAIN (optional, manual trigger) |
| `erp.procurement.po-approved` | procurement | (brain monitors, no chain — just logs) |

Tasks:
- [ ] In `BrainsTriggerConsumer`, subscribe to: `low-stock-alert`, `shipment-delivered`, `ap-bill-created`
- [ ] Verify existing Kafka producers in inventory/transportation/accounting modules publish these events
- [ ] If any publisher is missing: implement it in the relevant module's service
- [ ] Write e2e test: publish synthetic `low-stock-alert` event → verify `BrainPlayExecution` created with correct steps

---

## Phase 5 — Future Services (plan only, implement later)
> Extract when monolith becomes a bottleneck or team grows to 2+ people.

| Service | Port | Key entities | Main trigger to extract |
|---|---|---|---|
| hr-service | 3004 | Employee, Attendance, Leave, Payroll | Payroll calc is CPU-heavy |
| crm-service | 3005 | Customer, Lead, Opportunity, Quote | CRM team wants independent deploys |
| warehouse-service | 3006 | Warehouse, Bin, StockMovement | High write volume from shipments |
| transportation-service | 3007 | Shipment, Courier, Route | Real-time tracking needs WebSocket isolation |
| manufacturing-service | 3008 | BOM, WorkOrder, ProductionPlan | Complex calc, may need separate scaling |
| notification-service | 3009 | — (stateless) | Email/SMS/push — already Kafka-ready |
| document-service | 3010 | Template, GeneratedDoc | Puppeteer is CPU/memory heavy, must isolate |

---

## Docker Compose (target state after Phase 3)

```yaml
# High-level structure — fill in full config during implementation
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx/nginx.conf:/etc/nginx/nginx.conf"]
    depends_on: [backend, inventory-service, procurement-service, accounting-service]

  backend:          # monolith — shrinks over time
    build: ./backend/Dockerfile.dev
    ports: ["3100:3100"]

  inventory-service:
    build: ./services/inventory-service
    ports: ["3001:3001"]
    environment:
      DB_SCHEMA: inventory
      PORT: 3001

  procurement-service:
    build: ./services/procurement-service
    ports: ["3002:3002"]
    environment:
      DB_SCHEMA: procurement
      PORT: 3002

  accounting-service:
    build: ./services/accounting-service
    ports: ["3003:3003"]
    environment:
      DB_SCHEMA: accounting
      PORT: 3003

  postgres:     # shared, schemas isolate ownership
  redis:        # shared
  kafka:        # shared
  zookeeper:    # shared

networks:
  erp-net:
    driver: bridge
```

---

## Shared Package Structure (`packages/shared`)

```
packages/shared/src/
  enums/
    status.enum.ts          — CommonStatus, ApprovalStatus
    priority.enum.ts        — Priority (low/medium/high/critical)
    payment-method.enum.ts  — PaymentMethod
    actor-type.enum.ts      — ActorType (staff/customer/supplier)

  types/
    pagination.types.ts     — PaginatedResult<T>, PaginationQuery
    tenant-context.types.ts — TenantContext { tenantId, userId, role }
    api-response.types.ts   — ApiResponse<T>, ApiError

  interfaces/
    base-service.interface.ts   — IBaseService<T, CreateDto, UpdateDto>
    kafka-event.interface.ts    — IKafkaEvent<T> { eventId, tenantId, timestamp, payload }
    http-client.interface.ts    — IServiceClient (retry, circuit-breaker wrapper)

  events/
    inventory.events.ts     — StockChangedEvent, LowStockAlertEvent
    procurement.events.ts   — GoodsReceivedEvent, POApprovedEvent, POCancelledEvent
    accounting.events.ts    — PaymentRecordedEvent, InvoiceCreatedEvent

  dto/
    pagination.dto.ts       — BasePaginationDto { page, limit, search, sortBy, sortOrder }
    tenant-query.dto.ts     — TenantQueryDto extends BasePaginationDto

  constants/
    kafka-topics.ts         — KAFKA_TOPICS enum (single source of truth for all topic names)
    service-urls.ts         — SERVICE_URLS (reads from env, used by HTTP clients)
```

---

## Rules for All Extracted Services

1. **Each service owns its schema** — never query another service's DB tables directly
2. **No shared ORM entities** — each service has its own copy of entities it needs
3. **Cross-service reads** → HTTP call to the owning service
4. **Cross-service writes** → Kafka event (fire-and-forget) or HTTP with retry
5. **Every HTTP client** must have: timeout (10s), retry (3x), circuit breaker
6. **Every Kafka consumer** must have: idempotency check, DLQ on failure
7. **Every service** must expose `/health` and forward `x-request-id` header
8. **JWT validation** happens in each service — never trust a header without verifying the signature
9. **`tenant_id` filter on every DB query** — never skip, even on admin endpoints
10. **No circular HTTP calls** — if A calls B and B calls A, use Kafka instead

---

## Migration Checklist (per service)

Use this when extracting any future service:

- [ ] Scaffold new NestJS app in `services/<name>-service/`
- [ ] Add `@erp/shared` dependency
- [ ] Copy entities, update schema name
- [ ] Write migration to move tables to new schema
- [ ] Implement all HTTP endpoints (same contract as monolith)
- [ ] Add Kafka producers for write events
- [ ] Add Kafka consumers for incoming events
- [ ] Add `InventoryHttpClient` / other clients needed
- [ ] Update monolith: add HTTP client, remove entities from autoLoadEntities
- [ ] Update nginx routing
- [ ] Add health endpoint + metrics
- [ ] Run full test suite — zero regressions
- [ ] Update `docker-compose.yml`
- [ ] Update `CLAUDE.md` with new service
