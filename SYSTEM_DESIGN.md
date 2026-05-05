# ERP Platform — System Design

Modern multi-tenant ERP. Scope of this document: the **operational backbone** — Products, Inventory & Stock, Warehouse, Transactions, and Accounting — plus the end-to-end flows that bind them. All other modules (CRM, Procurement, HR, Manufacturing) plug into the same backbone via the same contracts.

The design respects the rules already defined in `CLAUDE.md` (three-tier access, NestJS modular structure, `tenant_id` on every entity, transactional multi-table writes, monolith-first with worker extraction).

---

## 1. Requirements

### 1.1 Functional

The backbone must support:

- **Products & catalog** — items with SKU, variants, units of measure, categories, costing method (FIFO / WAC), pricing, multi-currency support per tenant.
- **Inventory & stock** — real-time per-warehouse, per-bin, per-lot/serial quantity. Reservations vs. on-hand vs. available. Reorder points and replenishment triggers.
- **Warehouse operations** — receive, putaway, pick, pack, ship, internal transfer, cycle count, adjustment.
- **Transactions** — the central sales/purchase document that ties together a customer or supplier, ordered lines, fulfillment state, billing state, and the resulting financial postings.
- **Accounting** — Chart of Accounts, double-entry Journal Entries, AR, AP, Bank, payments, period close, trial balance, P&L, balance sheet. Every operational event that has financial meaning must produce a balanced journal entry — automatically and idempotently.
- **Multi-tenant isolation** — every read and every write must be scoped by `tenant_id`. Cross-tenant leakage is the highest-severity bug class.

### 1.2 Non-functional

| Concern | Target |
|---|---|
| p99 read latency (cached) | < 150 ms |
| p99 write latency (single-table) | < 250 ms |
| p99 write latency (cross-module txn, e.g. invoice + journal) | < 800 ms |
| Throughput (peak per tenant) | 50 RPS sustained, 500 RPS burst |
| Availability | 99.9% (≈ 8.7 h/yr downtime) |
| RPO | 15 min |
| RTO | 1 h |
| Tenant isolation | Hard — guarded at query layer, verified by integration tests |
| Audit | Every financial mutation must be reconstructible from immutable journal + append-only event log |

### 1.3 Constraints (from CLAUDE.md)

- Stack is fixed: NestJS, TypeORM, PostgreSQL 15, Redis, Kafka, MinIO, React + Vite + AntD.
- Single deployable monolith, with workers extracted as separate processes (not separate services).
- No comments in code; modular layout; DTO validation strict; controllers thin.
- All multi-table writes wrapped in a `QueryRunner` transaction.
- LLM and PDF rendering must run as Kafka consumers, never inside HTTP handlers.

---

## 2. High-Level Architecture

```
                 ┌────────────────────────────────────────────┐
                 │            React SPA (Vite, AntD)          │
                 │  AdminLayout │ MainLayout │ PortalLayout    │
                 └────────────────────┬───────────────────────┘
                                      │ HTTPS, JWT
                                      ▼
                          ┌─────────────────────┐
                          │   API Gateway / LB  │  (NGINX / Cloud LB)
                          └──────────┬──────────┘
                                     ▼
              ┌────────────────────────────────────────────┐
              │              NestJS Monolith               │
              │                                            │
              │  HTTP layer (controllers, validation)      │
              │  ────────────────────────────────────────  │
              │  Domain services                           │
              │   ├── Products            ├── Accounting   │
              │   ├── Inventory           ├── AR / AP      │
              │   ├── Warehouse           ├── Payments     │
              │   ├── Transactions        ├── GL / Posting │
              │  ────────────────────────────────────────  │
              │  Cross-cutting: Auth, RBAC, Tenant guard,  │
              │  Audit interceptor, Outbox publisher       │
              └───────┬───────────────┬──────────────┬─────┘
                      │               │              │
                      ▼               ▼              ▼
              ┌──────────────┐ ┌────────────┐ ┌─────────────┐
              │  PostgreSQL  │ │   Redis    │ │    Kafka    │
              │  (primary +  │ │  (cache,   │ │  (events,   │
              │   read repl) │ │   locks,   │ │   outbox    │
              │              │ │   queues)  │ │   delivery) │
              └──────────────┘ └────────────┘ └──────┬──────┘
                                                     │
                          ┌──────────────────────────┴───────────────┐
                          ▼                ▼                          ▼
                 ┌───────────────┐ ┌───────────────┐  ┌────────────────────┐
                 │ posting-      │ │ documents-    │  │ brains-worker      │
                 │ worker        │ │ worker        │  │ (LLM strategies)   │
                 │ (idempotent   │ │ (PDF / DOCX   │  │                    │
                 │  GL writer)   │ │  rendering)   │  │                    │
                 └───────┬───────┘ └───────┬───────┘  └────────┬───────────┘
                         ▼                 ▼                   ▼
                  PostgreSQL         MinIO (objects)     PostgreSQL + LLM API
```

### 2.1 Component responsibilities

| Component | Responsibility |
|---|---|
| **NestJS API** | All synchronous HTTP. Owns business rules. Writes to Postgres in `QueryRunner` transactions. Publishes domain events via the outbox pattern. |
| **PostgreSQL** | Single source of truth for all tenant data. Logical schema partitioning by domain. Read replica for reports. |
| **Redis** | Hot cache (COA, permission matrix, product lists, dashboard aggregates), distributed locks (stock reservations, document numbering), short-lived rate-limit counters. |
| **Kafka** | Domain event bus. Topics are namespaced by domain: `erp.inventory.movements`, `erp.accounting.journal`, `erp.transactions.lifecycle`, etc. |
| **MinIO** | Object storage for invoices, packing slips, attachments, signed URLs for portal users. |
| **posting-worker** | Consumes operational events (`erp.inventory.movements`, `erp.transactions.shipped`, `erp.ap.bill_received`) and writes balanced journal entries. Idempotent on `event_id`. |
| **documents-worker** | Consumes `erp.documents.render` and produces PDFs/DOCX in MinIO. |
| **brains-worker** | Consumes `erp.brains.requests`, runs LLM strategy auctions, publishes `erp.brains.plays`. |

### 2.2 Why this shape

Three forces drive the shape:

1. **Financial correctness is non-negotiable.** Therefore the GL is the system of record and is written by a single component (the posting-worker) reading from an event log. Operational modules don't reach into the GL directly.
2. **Operational throughput must not be capped by financial bookkeeping.** Therefore the GL write is asynchronous, but the operational write and the event publication are atomic (transactional outbox), which guarantees the journal entry will eventually exist exactly once.
3. **Multi-tenancy is structural, not optional.** Therefore every entity carries `tenant_id`, every query is forced through a tenant-aware base repository, and integration tests assert isolation.

---

## 3. Data Model

PostgreSQL schemas (logical grouping; one database, one schema per domain to keep migrations independent):

```
catalog        — products, variants, categories, units of measure, prices
inventory      — warehouses, bins, lots, stock_levels, stock_movements, reservations
sales          — transactions (sales orders), shipments, customer
purchasing     — purchase_orders, goods_receipts, supplier
accounting     — accounts (COA), journal_entries, journal_lines, fiscal_periods
ar             — invoices, customer_balances
ap             — bills, supplier_balances
payments       — payment_methods, payments, payment_allocations
core           — tenants, users, roles, permissions, audit_log, outbox_events
```

### 3.1 Core entities (truncated DDL)

```sql
-- Every operational table follows this template
-- tenant_id is NOT NULL and indexed. Composite indexes always lead with tenant_id.

-- ─── catalog.products ─────────────────────────────────────
CREATE TABLE catalog.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  sku             VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  category_id     UUID REFERENCES catalog.categories(id),
  uom_id          UUID NOT NULL REFERENCES catalog.units_of_measure(id),
  costing_method  VARCHAR(8)  NOT NULL CHECK (costing_method IN ('FIFO','WAC')),
  is_serialized   BOOLEAN NOT NULL DEFAULT FALSE,
  is_lot_tracked  BOOLEAN NOT NULL DEFAULT FALSE,
  default_price   NUMERIC(18,4),
  default_cost    NUMERIC(18,4),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE INDEX ix_products_tenant_active ON catalog.products(tenant_id, is_active);

-- ─── inventory.warehouses ─────────────────────────────────
CREATE TABLE inventory.warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  code        VARCHAR(32) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  address     JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, code)
);

CREATE TABLE inventory.bins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  warehouse_id  UUID NOT NULL REFERENCES inventory.warehouses(id),
  code          VARCHAR(32) NOT NULL,
  zone          VARCHAR(32),
  UNIQUE (tenant_id, warehouse_id, code)
);

-- ─── inventory.stock_levels ───────────────────────────────
-- Aggregate: current quantity per (product, bin, lot/serial). Updated by stock_movements only.
CREATE TABLE inventory.stock_levels (
  tenant_id     UUID NOT NULL,
  product_id    UUID NOT NULL REFERENCES catalog.products(id),
  bin_id        UUID NOT NULL REFERENCES inventory.bins(id),
  lot_code      VARCHAR(64) NOT NULL DEFAULT '',
  on_hand_qty   NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
  reserved_qty  NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  unit_cost     NUMERIC(18,6) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, product_id, bin_id, lot_code)
);
-- available_qty = on_hand_qty - reserved_qty (computed in service layer)

-- ─── inventory.stock_movements ────────────────────────────
-- Append-only ledger. Every change to stock_levels MUST go through here.
CREATE TABLE inventory.stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  product_id      UUID NOT NULL,
  bin_id          UUID NOT NULL,
  lot_code        VARCHAR(64) NOT NULL DEFAULT '',
  movement_type   VARCHAR(24) NOT NULL,
  quantity        NUMERIC(18,4) NOT NULL,
  unit_cost       NUMERIC(18,6) NOT NULL,
  source_doc_type VARCHAR(32) NOT NULL,
  source_doc_id   UUID NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  UNIQUE (tenant_id, source_doc_type, source_doc_id, product_id, bin_id, lot_code)
);
CREATE INDEX ix_movements_tenant_product_time
  ON inventory.stock_movements(tenant_id, product_id, occurred_at DESC);
-- movement_type ∈ {RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, RESERVE, UNRESERVE}

-- ─── sales.transactions ───────────────────────────────────
CREATE TABLE sales.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  number          VARCHAR(32) NOT NULL,
  type            VARCHAR(16) NOT NULL,
  customer_id     UUID,
  status          VARCHAR(24) NOT NULL,
  fulfillment     VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  billing         VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  currency        CHAR(3) NOT NULL,
  subtotal        NUMERIC(18,4) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(18,4) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(18,4) NOT NULL DEFAULT 0,
  ordered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  UNIQUE (tenant_id, number)
);
-- status      ∈ {DRAFT, CONFIRMED, IN_FULFILLMENT, FULFILLED, INVOICED, CLOSED, CANCELLED}
-- fulfillment ∈ {PENDING, PARTIAL, COMPLETE}
-- billing     ∈ {PENDING, PARTIAL, INVOICED, PAID}

CREATE TABLE sales.transaction_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  transaction_id  UUID NOT NULL REFERENCES sales.transactions(id) ON DELETE CASCADE,
  line_no         INT  NOT NULL,
  product_id      UUID NOT NULL REFERENCES catalog.products(id),
  warehouse_id    UUID,
  quantity        NUMERIC(18,4) NOT NULL,
  qty_reserved    NUMERIC(18,4) NOT NULL DEFAULT 0,
  qty_shipped     NUMERIC(18,4) NOT NULL DEFAULT 0,
  qty_invoiced    NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_price      NUMERIC(18,4) NOT NULL,
  tax_rate        NUMERIC(7,4)  NOT NULL DEFAULT 0,
  UNIQUE (transaction_id, line_no)
);

-- ─── accounting.accounts (Chart of Accounts) ──────────────
CREATE TABLE accounting.accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  code        VARCHAR(16) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(16) NOT NULL,
  parent_id   UUID REFERENCES accounting.accounts(id),
  is_postable BOOLEAN NOT NULL DEFAULT TRUE,
  currency    CHAR(3) NOT NULL,
  UNIQUE (tenant_id, code)
);
-- type ∈ {ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE}

-- ─── accounting.journal_entries ───────────────────────────
CREATE TABLE accounting.journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  number          VARCHAR(32) NOT NULL,
  posted_at       TIMESTAMPTZ NOT NULL,
  fiscal_period   VARCHAR(7)  NOT NULL,
  source_event_id UUID NOT NULL,
  source_doc_type VARCHAR(32) NOT NULL,
  source_doc_id   UUID NOT NULL,
  memo            TEXT,
  is_reversal_of  UUID REFERENCES accounting.journal_entries(id),
  UNIQUE (tenant_id, number),
  UNIQUE (tenant_id, source_event_id)
);

CREATE TABLE accounting.journal_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  entry_id     UUID NOT NULL REFERENCES accounting.journal_entries(id) ON DELETE CASCADE,
  account_id   UUID NOT NULL REFERENCES accounting.accounts(id),
  debit        NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
  credit       NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency     CHAR(3) NOT NULL,
  fx_rate      NUMERIC(18,8) NOT NULL DEFAULT 1,
  CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX ix_lines_account_time ON accounting.journal_lines(tenant_id, account_id);

-- Enforce balanced entries via deferred constraint trigger:
-- AFTER COMMIT: SUM(debit) = SUM(credit) per entry, else RAISE.

-- ─── core.outbox_events ───────────────────────────────────
CREATE TABLE core.outbox_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  topic         VARCHAR(64) NOT NULL,
  aggregate_id  UUID NOT NULL,
  event_type    VARCHAR(64) NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX ix_outbox_unpublished ON core.outbox_events(published_at) WHERE published_at IS NULL;
```

### 3.2 Why these choices

- **`stock_movements` is the source of truth, `stock_levels` is the materialized aggregate.** This makes audit trivial (sum the ledger), enables time-travel inventory queries, and gives the posting-worker a clean event stream to consume.
- **Journal entries reference the source event by id** (`source_event_id` UNIQUE per tenant). This is the idempotency key — the posting-worker can replay the topic from the beginning without producing duplicate entries.
- **Composite uniqueness on stock_movements** (`tenant_id, source_doc_type, source_doc_id, product_id, bin_id, lot_code`) makes the receipt/shipment processors idempotent on retry.
- **Numerics are 18,4 for money and 18,4 for quantity, 18,6 for unit cost.** Avoids float drift; the extra precision on cost handles WAC calculations without rounding loss until persisted to GL.
- **Deferred trigger for balanced entries** instead of application-level checks. The DB refuses to commit an unbalanced journal — this is the last line of defense.

---

## 4. API Design

REST under `/api`, JWT in `Authorization: Bearer …` header. The tenant scope is derived from the JWT — never accepted as a request parameter.

```
# Catalog
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id

# Inventory & Warehouse
GET    /api/inventory/stock?productId=&warehouseId=&bin=
POST   /api/inventory/adjustments
POST   /api/inventory/transfers
GET    /api/warehouses
POST   /api/warehouses/:id/bins

# Transactions
POST   /api/transactions                       # create draft
POST   /api/transactions/:id/confirm           # reserve stock
POST   /api/transactions/:id/ship              # decrement stock, emit shipment
POST   /api/transactions/:id/invoice           # create AR invoice
POST   /api/transactions/:id/cancel            # release reservation, reverse postings if any

# Accounting
GET    /api/accounting/accounts
POST   /api/accounting/journal-entries          # manual entry only
GET    /api/accounting/journal-entries/:id
GET    /api/accounting/trial-balance?asOf=
GET    /api/accounting/reports/pnl?from=&to=
GET    /api/accounting/reports/balance-sheet?asOf=

# AR / AP / Payments
GET    /api/ar/invoices
POST   /api/ar/invoices/:id/send
POST   /api/payments                            # record payment
POST   /api/payments/:id/allocate               # allocate to invoices/bills
```

Conventions:

- Pagination: `?page=&pageSize=` with response envelope `{ data, total, page, pageSize }`.
- Filtering: `?filter[field]=value`, parsed via a shared filter pipe.
- Sorting: `?sort=field,-otherField`.
- Idempotency: state-changing endpoints accept an `Idempotency-Key` header; the gateway stores it in Redis with a 24 h TTL.
- Errors: RFC 7807 problem+json shape via the global exception filter.

---

## 5. The Critical Cross-Module Flow

This is the chain `CLAUDE.md` highlights as the heart of the platform. It is implemented as an **event-driven saga over a transactional outbox**, so every operational write is atomic with the event that drives the next step.

### 5.1 Sales chain — order to cash

```
┌──────────────┐
│  CRM Quote   │  (out of scope here; produces a CreateTransactionDTO)
└──────┬───────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ POST /api/transactions                                                        │
│   TX1 (single Postgres transaction):                                          │
│     INSERT sales.transactions (status=DRAFT)                                  │
│     INSERT sales.transaction_lines                                            │
│   → no events, no stock impact yet                                            │
└──────┬───────────────────────────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ POST /api/transactions/:id/confirm                                            │
│   TX2 (QueryRunner):                                                          │
│     SELECT … FOR UPDATE on stock_levels rows                                  │
│     For each line:                                                            │
│       UPDATE stock_levels SET reserved_qty = reserved_qty + qty               │
│       INSERT stock_movements (RESERVE)                                        │
│     UPDATE sales.transactions SET status='CONFIRMED'                          │
│     INSERT core.outbox_events('erp.transactions.confirmed')                   │
│   COMMIT                                                                      │
│   ──────                                                                      │
│   Outbox publisher polls and pushes to Kafka.                                 │
│   Reservations are NOT yet a financial event — no journal entry.              │
└──────┬───────────────────────────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ POST /api/transactions/:id/ship  (warehouse picks & packs)                    │
│   TX3:                                                                        │
│     For each shipped line:                                                    │
│       UPDATE stock_levels                                                     │
│         SET on_hand_qty  = on_hand_qty  - qty_shipped,                        │
│             reserved_qty = reserved_qty - qty_shipped                         │
│       INSERT stock_movements (ISSUE, unit_cost = WAC or FIFO layer cost)      │
│       UPDATE sales.transaction_lines SET qty_shipped = qty_shipped + ...     │
│     UPDATE sales.transactions SET fulfillment='COMPLETE' (if all done)        │
│     INSERT shipment record                                                    │
│     INSERT core.outbox_events('erp.transactions.shipped')                     │
│   COMMIT                                                                      │
│   ──────                                                                      │
│   posting-worker consumes 'erp.transactions.shipped':                         │
│     INSERT accounting.journal_entries (idempotent on source_event_id)         │
│       Dr  COGS                  cost × qty                                    │
│         Cr  Inventory           cost × qty                                    │
└──────┬───────────────────────────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ POST /api/transactions/:id/invoice                                            │
│   TX4:                                                                        │
│     INSERT ar.invoices                                                        │
│     UPDATE sales.transactions SET billing='INVOICED'                          │
│     INSERT core.outbox_events('erp.ar.invoice_issued')                        │
│   COMMIT                                                                      │
│   ──────                                                                      │
│   posting-worker:                                                             │
│       Dr  AR (Customer subledger)   grand_total                               │
│         Cr  Revenue                  subtotal                                 │
│         Cr  Tax payable              tax_total                                │
│   documents-worker renders invoice PDF → MinIO → email queue                  │
└──────┬───────────────────────────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ POST /api/payments  (customer pays)                                           │
│   TX5:                                                                        │
│     INSERT payments.payments                                                  │
│     INSERT payments.payment_allocations (link to invoice)                     │
│     UPDATE ar.invoices SET amount_paid = ..., status='PAID' (if full)         │
│     INSERT core.outbox_events('erp.payments.received')                        │
│   COMMIT                                                                      │
│   ──────                                                                      │
│   posting-worker:                                                             │
│       Dr  Bank                     amount                                     │
│         Cr  AR (Customer)          amount                                     │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Purchase chain — procure to pay

```
Requisition → RFQ → PO  (procurement)
   ▼
POST /api/procurement/po/:id/receive
  TX:
    For each received line:
      UPDATE stock_levels  on_hand_qty += qty,
                           unit_cost   = WAC( old, qty, po_unit_cost )
      INSERT stock_movements (RECEIPT, unit_cost = po_unit_cost)
    INSERT goods_receipts
    UPDATE purchase_orders.fulfillment
    INSERT outbox 'erp.procurement.receipt'
  COMMIT
  ──────
  posting-worker:
      Dr  Inventory              qty × po_unit_cost
        Cr  GR/IR clearing       qty × po_unit_cost

POST /api/ap/bills (3-way match against PO + GR)
  TX:
    INSERT ap.bills
    INSERT outbox 'erp.ap.bill_received'
  COMMIT
  ──────
  posting-worker:
      Dr  GR/IR clearing         bill_subtotal
      Dr  Tax recoverable        bill_tax
        Cr  AP (Supplier)        bill_grand_total

POST /api/payments  (pay supplier)
  posting-worker:
      Dr  AP (Supplier)          amount
        Cr  Bank                 amount
```

### 5.3 Why event-driven instead of synchronous

Posting the GL synchronously inside the operational transaction is tempting and simpler to reason about, but it has three problems:

1. **Latency** — invoice POST would wait for journal computation, account lookup, FX conversion, period validation. Easily blows past 800 ms p99.
2. **Coupling** — every operational module needs to know the COA layout. Changing a posting rule requires touching every controller.
3. **Lock contention** — many concurrent shipments would all want to write to the same Inventory and COGS rows. The posting-worker serializes those writes per partition.

The transactional outbox gives us **exactly-once effective delivery**: the operational write and the event are committed together, the posting-worker's idempotency key (`source_event_id`) prevents double-posting on replay, and the GL stays authoritative.

### 5.4 Failure handling

| Failure | Behavior |
|---|---|
| TX2 (confirm) fails mid-write | DB rollback, no reservation, no event. User sees 4xx/5xx. Safe to retry. |
| Outbox publisher down | Events accumulate in `core.outbox_events`. On restart, publisher drains in order. No data loss. |
| posting-worker crashes mid-batch | Kafka offset not committed. On restart, replays from last commit. `UNIQUE (tenant_id, source_event_id)` makes the journal insert idempotent. |
| posting-worker fails permanently on an event (e.g. account missing) | Move to dead-letter topic `erp.posting.dlq`. Alert on DLQ depth > 0. Operator fixes COA, replays. |
| User cancels a shipped transaction | New event `erp.transactions.cancelled` triggers a **reversing journal entry** with `is_reversal_of` set. Stock movements get a counter-entry. Original entries are never deleted. |
| Period closed when event arrives | posting-worker books to next open period and tags `posted_at` with original `occurred_at` for reporting. |

---

## 6. Caching Strategy

Redis tier with explicit ownership and TTLs. **Cache invalidation is event-driven**, not TTL-driven, so changes propagate immediately.

| Cache key | Owner | TTL | Invalidated by |
|---|---|---|---|
| `tenant:{tid}:coa` | accounting | 1 h | `erp.accounting.account_changed` |
| `tenant:{tid}:permissions:{role}` | rbac | 1 h | role change events |
| `tenant:{tid}:product:{sku}` | catalog | 15 min | product update event |
| `tenant:{tid}:product-list:{filterHash}` | catalog | 5 min | any product write (pattern delete via SCAN, not KEYS) |
| `tenant:{tid}:dashboard:agg` | reporting | 5 min | TTL only |
| `tenant:{tid}:fx:{date}` | accounting | 24 h | none (immutable per day) |

Stock levels are **not cached** — they change too often and stale reads cause overselling. They live in Postgres with an index on `(tenant_id, product_id, bin_id)` and a covering index for the available-qty query.

**Distributed locks** (Redis SETNX with TTL):

- `lock:tenant:{tid}:doc-number:{type}` — protect document number generation against gaps.
- `lock:tenant:{tid}:reserve:{productId}` — short-held; FOR UPDATE row locks are usually enough, this is a fallback for very hot SKUs.
- `lock:tenant:{tid}:period-close:{period}` — held for the duration of close; rejects new postings into closed period.

Replace any existing `KEYS *` pattern usage (called out in `CLAUDE.md` as a known issue) with `SCAN`-based cursor iteration.

---

## 7. Event / Topic Design

```
erp.transactions.confirmed     keyed by transaction_id    payload: {tenantId, txId, lines[], reservedAt}
erp.transactions.shipped       keyed by transaction_id    payload: {tenantId, txId, shipmentId, lines[]}
erp.transactions.invoiced      keyed by transaction_id    payload: {tenantId, txId, invoiceId, totals}
erp.transactions.cancelled     keyed by transaction_id

erp.inventory.movement         keyed by product_id        payload: {tenantId, movement (full row)}
erp.inventory.low_stock        keyed by product_id        payload: {tenantId, productId, available, reorderPoint}

erp.procurement.po_issued      keyed by po_id
erp.procurement.receipt        keyed by po_id
erp.ap.bill_received           keyed by bill_id
erp.ap.bill_3way_matched       keyed by bill_id

erp.ar.invoice_issued          keyed by invoice_id
erp.payments.received          keyed by payment_id
erp.payments.disbursed         keyed by payment_id

erp.accounting.posted          keyed by entry_id          payload: {tenantId, entryId, sourceEventId}
erp.documents.render           keyed by doc_id            payload: {tenantId, template, variables, outputBucket}
erp.brains.requests            keyed by tenant_id
erp.brains.plays               keyed by tenant_id
```

Topic conventions:

- **Partitioning key** is chosen to keep all events for a single aggregate ordered (transaction id for transaction events, product id for inventory).
- **Replay-safe** — every consumer must be idempotent on `event.id` (UUID stamped by the outbox publisher).
- **Compact retention** is OFF — events are append-only history, not state. Retention is 30 d for ops topics, 7 d for documents/brains.
- **Schema** — JSON for now (Postgres `JSONB` payload mirrors the wire shape). Add an Avro/Schema Registry later when external consumers need contract guarantees.

---

## 8. Tenant Isolation

Three layers, defense in depth:

1. **Application layer.** A `TenantContextInterceptor` reads the JWT, extracts `tenantId`, and stores it in an `AsyncLocalStorage` continuation. A `TenantAwareRepository` base class injects `WHERE tenant_id = :tenantId` into every query. Repositories that don't extend it are forbidden by an ESLint rule.
2. **Database layer.** Every table has `tenant_id NOT NULL`. The hot indexes lead with `tenant_id`. A separate **superadmin connection** (different role, different pool) is used for `/admin/*` routes; the tenant role has RLS policies that reject any query missing the `tenant_id` predicate.
3. **Test layer.** A dedicated Playwright + Jest suite spins up two tenants and asserts that every list endpoint, every detail endpoint, and every aggregate excludes cross-tenant data. CI blocks merges that fail this suite.

Why three layers and not one: a single layer is one bug away from leaking the entire customer base. Cross-tenant leakage is the highest-severity bug class in any multi-tenant SaaS.

---

## 9. Scale & Reliability

### 9.1 Capacity model

Assume target steady-state: **1,000 tenants × avg 20 transactions/day = 20 k transactions/day**, peak 5× = 100 k/day, peak hour ≈ 12 k/h ≈ 3.3 RPS sustained, 30 RPS at burst per tenant cluster. Each transaction triggers ~6 DB writes and 4 events. Math:

- DB writes peak ≈ 200 RPS ≈ ~17 M writes/day. PostgreSQL on a c-class instance handles this comfortably with one writer + one read replica.
- Kafka peak ≈ 120 events/s. One broker is enough for the demo stage; three for prod (RF=3).
- Outbox publisher loop runs every 200 ms, batches up to 500 events. Budget < 50 ms per batch.

### 9.2 Scaling levers

| Bottleneck | Lever |
|---|---|
| Read-heavy reports (P&L, trial balance) | Route to read replica via separate TypeORM connection. Materialized views for trial balance refreshed on `erp.accounting.posted`. |
| Hot SKU stock contention | `SELECT ... FOR UPDATE SKIP LOCKED` for picking workflows; alternative bin selection on conflict. |
| Outbox poll lag | Switch from poll to `LISTEN/NOTIFY` once volume justifies. Gives sub-50 ms publish lag. |
| posting-worker single-instance | Horizontal scale by Kafka consumer group; partition by tenant_id keeps tenant ordering intact. |
| PDF rendering CPU spikes | Already isolated as documents-worker; scale workers independently behind the same topic. |
| Cross-tenant noisy-neighbor | Per-tenant token bucket in Redis. Plan tier sets the bucket size. |

### 9.3 Failure modes & responses

- **Postgres primary down** — automatic failover to standby (managed Postgres or Patroni). RPO 15 min via continuous WAL shipping. RTO 1 h covered by failover automation + smoke tests.
- **Kafka cluster down** — outbox events accumulate in Postgres. No data loss. Operational APIs continue. GL falls behind until Kafka recovers, then catches up.
- **posting-worker down** — same as Kafka down, plus DLQ growth. Alert on `outbox unpublished depth > 10k` and `posting DLQ depth > 0`.
- **Redis down** — caches degrade to direct DB hits, reservations fall back to `FOR UPDATE`. Throughput drops, system stays correct.
- **Region outage** — out of scope for v1; design assumes single-region with multi-AZ.

### 9.4 Observability

- **Metrics (Prometheus)**: per-endpoint p50/p95/p99 latency, DB connection pool utilization, outbox depth, Kafka consumer lag per topic, posting-worker DLQ depth, cache hit rate per key family.
- **Tracing (OpenTelemetry)**: trace ID propagated from HTTP through outbox payload through worker. A single shipment is one trace from API call through GL posting.
- **Logs (structured JSON)**: tenant_id, user_id, request_id, trace_id on every line. Centralized in Loki/CloudWatch.
- **Audit log (append-only Postgres table)**: every mutation captured with user, tenant, before/after diff. Never deleted.
- **Alerts**: tenant-aware — a noisy tenant doesn't trigger a global page; a global metric breach does.

---

## 10. Security

| Concern | Approach |
|---|---|
| Auth | JWT short-lived (15 min) + refresh token (httpOnly cookie). Migrate from `localStorage` per `CLAUDE.md` known issue. |
| RBAC | Role → permission matrix cached in Redis. `@RequirePermission('inventory.write')` decorator enforces at handler level. |
| Tenant guard | Section 8. |
| Secrets | Per-environment via SOPS or a secrets manager. Never in repo. |
| PII | Customer/supplier contact data flagged in entity metadata; export endpoints honor GDPR data subject requests. |
| Input | DTOs with `class-validator`, `whitelist + forbidNonWhitelisted` already enforced. |
| Output | RFC 7807 errors hide stack traces in prod. |
| Rate limit | Per-IP and per-tenant token bucket in Redis. |
| Audit | Section 9.4. |
| Backups | Daily logical + continuous WAL. Restore drills monthly. |

---

## 11. Trade-offs & Things to Revisit

| Decision | Why now | Revisit when |
|---|---|---|
| Monolith with worker extraction | Team size and stage make microservices premature. | A single module's deploy cadence or scaling profile diverges sharply from the rest. |
| Synchronous reservation, async GL posting | Reservation needs immediate user feedback; GL doesn't. | Never — this split is structurally correct. |
| Single Postgres database, schemas per domain | Cross-domain joins are still cheap, single backup, single failover. | Per-tenant data exceeds ~500 GB or per-domain schema migrations start blocking each other. |
| Outbox pattern (poll-based) | Simple, no extra infra, works at our scale. | Outbox publish lag p99 > 500 ms — switch to LISTEN/NOTIFY or CDC (Debezium). |
| WAC + FIFO costing both supported | Different industries need different methods. | If WAC alone covers all signed customers, drop FIFO complexity. |
| Per-tenant logical isolation, not physical DB-per-tenant | Lower cost, faster onboarding. | A regulated tenant (healthcare, defense) requires data residency or dedicated DB. Then introduce a "premium isolation" plan tier. |
| JSON event payloads | Fast iteration, no schema registry to operate. | External consumers exist, or internal contract drift causes incidents. Then introduce Avro + Schema Registry. |
| Event-sourced inventory ledger, snapshot stock_levels | Correctness + auditability, with fast reads. | Movement table grows past ~1B rows — partition by month and archive cold partitions to S3/MinIO. |
| Single posting-worker codebase per event type | One place to maintain posting rules. | Posting rules become tenant-customizable — then introduce a rules engine (DSL or table-driven). |

---

## 12. What This Replaces & What It Fixes

Mapping back to the known issues in `CLAUDE.md`:

- **`synchronize: true`** → migrations-only schema management; Section 3 DDL is the migration baseline.
- **Migration runner broken** → new `src/database/data-source.ts` with explicit `DataSource` config used by both runtime and CLI.
- **Missing transactional boundaries** → every cross-module write in Section 5 is a single `QueryRunner` transaction, ending with the outbox insert.
- **`brains/` synchronous LLM calls** → moved to brains-worker, Section 2.
- **`KEYS *` in Redis** → SCAN-based pattern delete in the cache invalidation hooks, Section 6.
- **`payments` module empty** → Section 5.1 step 5 and Section 5.2 final step define the contract; implementation is straightforward CRUD plus the outbox event.
- **`tenants` module empty** → covered by superadmin endpoints under `/admin/tenants` (out of detailed scope here, but slot in cleanly).

---

## 13. Implementation Order

If building from today, ship in this order. Each step is independently demoable.

1. **Foundation** — fix migration runner, turn off `synchronize`, add `TenantAwareRepository`, outbox table + publisher loop, posting-worker skeleton with DLQ.
2. **Catalog + Warehouse + stock_movements ledger** — products, warehouses, bins, manual adjustments. No transactions yet.
3. **Sales transaction + reservation + shipment** (no GL yet) — exercise the outbox without depending on the worker.
4. **Accounting (COA, manual journals, trial balance)** — independent module, useful on its own.
5. **posting-worker live** — start consuming `erp.transactions.shipped` and `erp.transactions.invoiced`. Suddenly the GL is auto-populated.
6. **AR + AP + Payments** — close the order-to-cash and procure-to-pay loops.
7. **Reports** — P&L, balance sheet, aged receivables, inventory valuation.
8. **Phase 1 perf items** from `CLAUDE.md` (caching, connection pool, compression, N+1 sweep).
9. **Brains-worker extraction** — last, because it depends on a stable event bus.

---

*Document owner: platform engineering. Update whenever the cross-module flow in Section 5 changes — that section is the contract every new module must satisfy.*
