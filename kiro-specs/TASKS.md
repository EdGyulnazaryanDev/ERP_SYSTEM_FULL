# Tasks

A running list of bugs, improvements, and features to implement.

---

## Bugs

*(none yet)*

---

## System Admin

- [x] **System monitoring dashboard** — superadmin dashboard showing:
  - Infrastructure health: CPU usage, memory usage, disk usage, DB connection pool status, Redis status, uptime
  - Business metrics: total tenants, active tenants, total users, MRR/revenue, active subscriptions by plan
  - API usage per tenant — request counts, error rates, slow endpoints
  - Real-time updates (poll every 30s or WebSocket)
  - Backend: expose a `/system-admin/health` endpoint using Node.js `os` module + DB/Redis ping checks

---

## Features

- [x] **Shipment document generation + vendor/customer notification**
  - When admin confirms/signs a shipment, generate a PDF document (packing slip / delivery order) with item details, quantities, and prices
  - Both the supplier and the customer receive their respective document in their portal (HTML view + PDF download button)
  - Triggered on shipment sign-off, before delivery

- [x] **Delivery confirmation document**
  - When a shipment is marked as delivered, generate a delivery confirmation / proof of delivery PDF
  - Before delivery: supplier and customer portals show only shipment status tracking
  - After delivery: both portals show the delivery confirmation document with PDF download

- [x] **Employment contract with e-signature**
  - When a new employee is created, auto-generate an employment contract / offer letter PDF (job title, salary, start date, terms)
  - Employee receives it in their portal and signs digitally (e-signature) in the app
  - Signed document is stored and visible to HR/admin

---

## Improvements

- [x] Generate a contract automatically after creating an employee → merged into Feature 3 (employment contract with e-signature)

---

## Powerful Features (Roadmap)

- [ ] **AI demand forecasting** — predict stock depletion based on sales history, auto-suggest reorder quantities
- [ ] **Smart cash flow forecasting** — project next 30/60/90 days based on open AR, AP, and recurring expenses
- [ ] **Anomaly detection** — flag unusual transactions, duplicate invoices, suspicious expense patterns
- [ ] **Workflow automation engine** — configurable if/then rules (e.g. invoice overdue 30 days → send reminder, stock below reorder → auto-create PO)
  - Architecture: rule engine runs as Kafka consumer / BullMQ worker, evaluates conditions async
- [ ] **Recurring transactions** — auto-generate monthly invoices, bills, or journal entries on a schedule
  - Architecture: cron job pushes jobs to BullMQ queue → worker processes them async (retry on failure built-in)
- [ ] **Auto bank reconciliation** — automatically match bank statement lines to recorded payments
- [ ] **Real-time notifications center** — in-app alerts for approvals needed, overdue payments, low stock, shipment updates
  - Architecture: Kafka consumer writes to `notifications` table, frontend uses WebSocket/SSE for real-time delivery
- [ ] **Full audit trail** — complete history of who changed what and when, across all modules
  - Architecture: single NestJS interceptor captures all mutating requests → writes to `audit_logs` table
- [ ] **Document comments & approval threads** — comment on invoices, POs, contracts before approving
- [ ] **Custom report builder** — drag-and-drop report designer, export to PDF/Excel
- [ ] **Per-module KPI dashboards** — procurement spend, HR headcount, inventory turnover, etc.
- [ ] **Period benchmarking** — compare current month vs last month vs same period last year

---

## Performance & Optimization

### Backend (highest impact first)

- [x] **Redis caching layer** — cache CoA accounts, roles/permissions, tenant settings on every request hit
  - These are queried on almost every API call but rarely change
  - TTL-based invalidation when data changes
- [x] **Database indexes** — add composite indexes on `(tenant_id, status)`, `(tenant_id, created_at)` across all major tables
  - Currently doing full table scans filtered by tenant_id
- [x] **Pagination on all list endpoints** — all list APIs currently return full datasets
  - Add `page` / `limit` query params, return `{ data, total, page, limit }`
- [ ] **Fix N+1 query problems** — audit TypeORM relations, replace lazy loads with proper JOINs / query builders
- [x] **Add Kafka to docker-compose** — Kafka module exists in code but not running in infrastructure
  - Move JE creation, notifications, audit logs off the synchronous request thread
- [ ] **Elasticsearch integration** — replace PostgreSQL `LIKE '%query%'` with Elasticsearch full-text search
  - Module folder exists (`infrastructure/elasticsearch`) but is empty

### Frontend (highest impact first)

- [ ] **Route-level code splitting** — wrap all page components in `React.lazy` + `Suspense`
  - Reduces initial bundle from loading everything upfront
- [ ] **Virtualize large tables** — use Ant Design virtual scroll or `react-virtual` for tables with 100+ rows
- [ ] **React Query cache tuning** — set `staleTime` and `gcTime` to avoid redundant refetches on tab switch
- [ ] **Compress static assets** — enable gzip/brotli in Nginx for JS/CSS bundles

### Infrastructure

- [ ] **Nginx cache headers** — add `Cache-Control` headers for static assets (JS, CSS, images)
- [ ] **Read replica for reporting** — heavy queries (trial balance, BI reports, dashboards) should hit a read replica, not the primary DB

---

## Discussing (Resolved)

- [x] **Payments module**
  - Unified Payments page — all pending AR (incoming) and AP (outgoing) in one view
  - Payment recording UI — method (bank transfer, cash, card), reference, date, amount
  - Payment scheduling — mark bills/invoices with a due date, filter upcoming/overdue
  - Bank reconciliation — match recorded payments to bank statement lines (needs new BankStatement entity)

- [x] **Assets module**
  - Register fixed assets (equipment, vehicles, furniture, etc.) with purchase date and cost
  - Depreciation calculation (straight-line / declining balance) with auto JE posting
  - Asset lifecycle tracking: purchase → in use → maintenance → disposal
  - Maintenance scheduling and history log
  - Asset assignment to employees or departments
  - Integration with accounting (depreciation and disposal journal entries)

- [x] **Manufacturing module**
  - Bill of Materials (BOM) — define raw materials and quantities per finished product
  - Production Orders — create work orders to produce X units, reserve raw materials
  - Production execution — in-progress → completed, consumes raw materials (stock OUT), adds finished goods (stock IN)
  - Cost tracking — production cost from raw materials + labor
  - Integration with inventory and accounting (WIP JEs, COGS on completion)
  - Optional module — tenants enable it only if they manufacture goods

- [x] **Performance strategy** — see Performance & Optimization section above
