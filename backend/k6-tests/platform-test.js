/**
 * Full Platform k6 Test
 * Covers: auth → categories → products → inventory → procurement → shipments → accounting
 *
 * Usage:
 *   k6 run platform-test.js
 *   k6 run platform-test.js -e BASE_URL=https://your-koyeb-app.koyeb.app
 *   k6 run platform-test.js -e BASE_URL=http://localhost:3000 -e TENANT_ID=your-tenant-id
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate      = new Rate('errors');
const authDuration   = new Trend('auth_duration',   true);
const readDuration   = new Trend('read_duration',   true);
const writeDuration  = new Trend('write_duration',  true);
const totalRequests  = new Counter('total_requests');

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:3000';
const TENANT_ID = __ENV.TENANT_ID || '';   // optional — sent as header if provided
const EMAIL     = __ENV.EMAIL     || 'admin@platform.local';
const PASSWORD  = __ENV.PASSWORD  || 'Admin@123456';

// ── Test options ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Smoke: quick sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    // Load: realistic concurrent users
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20  },
        { duration: '1m',  target: 50  },
        { duration: '2m',  target: 50  },
        { duration: '30s', target: 0   },
      ],
      startTime: '35s',   // starts after smoke finishes
      tags: { scenario: 'load' },
    },
  },
  thresholds: {
    http_req_duration:        ['p(95)<800', 'p(99)<1500'],
    http_req_failed:          ['rate<0.05'],
    errors:                   ['rate<0.05'],
    auth_duration:            ['p(95)<500'],
    read_duration:            ['p(95)<600'],
    write_duration:           ['p(95)<800'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token)     h['Authorization'] = `Bearer ${token}`;
  if (TENANT_ID) h['x-tenant-id']   = TENANT_ID;
  return h;
}

function ok(res, label) {
  totalRequests.add(1);
  const passed = check(res, {
    [`${label} — status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${label} — no timeout`]: (r) => r.timings.duration < 5000,
  });
  if (!passed) errorRate.add(1);
  return passed;
}

function get(url, token, label) {
  const res = http.get(url, { headers: headers(token) });
  readDuration.add(res.timings.duration);
  ok(res, label);
  return res;
}

function post(url, body, token, label) {
  const res = http.post(url, JSON.stringify(body), { headers: headers(token) });
  writeDuration.add(res.timings.duration);
  ok(res, label);
  return res;
}

function tryParse(res) {
  try { return JSON.parse(res.body); } catch { return null; }
}

// ── Setup: runs once, returns shared data to VUs ──────────────────────────────
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const body = tryParse(res);
  if (res.status !== 200 || !body?.accessToken) {
    console.error(`Login failed (${res.status}): ${res.body}`);
    return { token: null };
  }

  console.log(`✅ Login OK — token acquired`);
  return { token: body.accessToken };
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function (data) {
  const { token } = data;
  if (!token) { fail('No auth token — check credentials'); }

  // ── 1. Health ──────────────────────────────────────────────────────────────
  group('health', () => {
    const res = http.get(`${BASE_URL}/health`);
    authDuration.add(res.timings.duration);
    check(res, { 'health 200': (r) => r.status === 200 });
    totalRequests.add(1);
  });

  sleep(0.3);

  // ── 2. Dashboard ───────────────────────────────────────────────────────────
  group('dashboard', () => {
    get(`${BASE_URL}/api/dashboard`, token, 'dashboard');
  });

  sleep(0.3);

  // ── 3. Categories ──────────────────────────────────────────────────────────
  group('categories', () => {
    const list = get(`${BASE_URL}/api/categories`, token, 'categories list');
    const body = tryParse(list);

    // Create a category
    const created = post(
      `${BASE_URL}/api/categories`,
      {
        name:        `K6 Category ${Date.now()}`,
        description: 'Created by k6 load test',
        color:       '#ff4d4f',
        icon:        '🧪',
        sort_order:  99,
      },
      token,
      'category create',
    );

    const cat = tryParse(created);
    if (cat?.id) {
      // Read it back
      get(`${BASE_URL}/api/categories/${cat.id}`, token, 'category get');
    }
  });

  sleep(0.3);

  // ── 4. Products ────────────────────────────────────────────────────────────
  group('products', () => {
    get(`${BASE_URL}/api/products`, token, 'products list');
    get(`${BASE_URL}/api/products?page=1&limit=10`, token, 'products paginated');

    const created = post(
      `${BASE_URL}/api/products`,
      {
        name:             `K6 Product ${Date.now()}`,
        sku:              `K6-SKU-${Date.now()}`,
        cost_price:       50.00,
        selling_price:    85.00,
        quantity_in_stock: 100,
        reorder_level:    10,
        unit_of_measure:  'pcs',
        is_active:        true,
      },
      token,
      'product create',
    );

    const prod = tryParse(created);
    if (prod?.id) {
      get(`${BASE_URL}/api/products/${prod.id}`, token, 'product get');
    }
  });

  sleep(0.3);

  // ── 5. Inventory ───────────────────────────────────────────────────────────
  group('inventory', () => {
    get(`${BASE_URL}/api/inventory`,            token, 'inventory list');
    get(`${BASE_URL}/api/inventory/low-stock`,  token, 'inventory low-stock');
    get(`${BASE_URL}/api/inventory/summary`,    token, 'inventory summary');
  });

  sleep(0.3);

  // ── 6. Procurement ─────────────────────────────────────────────────────────
  group('procurement', () => {
    // Requisitions
    get(`${BASE_URL}/api/procurement/requisitions`,          token, 'requisitions list');
    get(`${BASE_URL}/api/procurement/requisitions?status=pending_approval`, token, 'requisitions open');
    get(`${BASE_URL}/api/procurement/requisitions?status=approved`,         token, 'requisitions approved');

    // Create a requisition
    const pr = post(
      `${BASE_URL}/api/procurement/requisitions`,
      {
        requisition_number: `K6-PR-${Date.now()}`,
        requisition_date:   new Date().toISOString().split('T')[0],
        requested_by:       '00000000-0000-0000-0000-000000000001',
        department:         'K6 Test',
        priority:           'medium',
        purpose:            'k6 load test requisition',
        items: [
          { product_name: 'Test Item', quantity: 5, estimated_price: 100, unit: 'pcs' },
        ],
      },
      token,
      'requisition create',
    );

    // Purchase Orders
    get(`${BASE_URL}/api/procurement/purchase-orders`,                    token, 'PO list');
    get(`${BASE_URL}/api/procurement/purchase-orders?status=approved`,    token, 'PO approved');
    get(`${BASE_URL}/api/procurement/purchase-orders?status=received`,    token, 'PO received');

    // RFQs
    get(`${BASE_URL}/api/procurement/rfqs`, token, 'RFQ list');
  });

  sleep(0.3);

  // ── 7. Suppliers ───────────────────────────────────────────────────────────
  group('suppliers', () => {
    get(`${BASE_URL}/api/suppliers`, token, 'suppliers list');
  });

  sleep(0.3);

  // ── 8. Transportation / Shipments ──────────────────────────────────────────
  group('transportation', () => {
    get(`${BASE_URL}/api/transportation/shipments`,                       token, 'shipments list');
    get(`${BASE_URL}/api/transportation/shipments?status=pending`,        token, 'shipments pending');
    get(`${BASE_URL}/api/transportation/shipments?status=in_transit`,     token, 'shipments in_transit');
    get(`${BASE_URL}/api/transportation/shipments?status=delivered`,      token, 'shipments delivered');
    get(`${BASE_URL}/api/transportation/couriers`,                        token, 'couriers list');
  });

  sleep(0.3);

  // ── 9. Accounting ──────────────────────────────────────────────────────────
  group('accounting', () => {
    get(`${BASE_URL}/api/accounting/chart-of-accounts`,   token, 'COA list');
    get(`${BASE_URL}/api/accounting/journal-entries`,     token, 'journal entries');
    get(`${BASE_URL}/api/accounting/accounts-payable`,    token, 'AP list');
    get(`${BASE_URL}/api/accounting/accounts-receivable`, token, 'AR list');
    get(`${BASE_URL}/api/accounting/reports/trial-balance`, token, 'trial balance');
  });

  sleep(0.3);

  // ── 10. HR ─────────────────────────────────────────────────────────────────
  group('hr', () => {
    get(`${BASE_URL}/api/hr/employees`, token, 'employees list');
  });

  sleep(0.3);

  // ── 11. CRM ────────────────────────────────────────────────────────────────
  group('crm', () => {
    get(`${BASE_URL}/api/crm/customers`, token, 'customers list');
    get(`${BASE_URL}/api/crm/leads`,     token, 'leads list');
  });

  sleep(1);
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const m = data.metrics;
  const fmt = (v) => (v !== undefined ? v.toFixed(2) : 'N/A');

  const lines = [
    '',
    '╔══════════════════════════════════════════════════════╗',
    '║           ERP Platform — k6 Test Summary             ║',
    '╚══════════════════════════════════════════════════════╝',
    '',
    `  Total requests   : ${m.total_requests?.values?.count ?? m.http_reqs?.values?.count}`,
    `  Request rate     : ${fmt(m.http_reqs?.values?.rate)}/s`,
    `  Failed requests  : ${fmt(m.http_req_failed?.values?.rate * 100)}%`,
    `  Error rate       : ${fmt(m.errors?.values?.rate * 100)}%`,
    '',
    '  Response times (all):',
    `    avg  : ${fmt(m.http_req_duration?.values?.avg)}ms`,
    `    p(50): ${fmt(m.http_req_duration?.values?.['p(50)'])}ms`,
    `    p(95): ${fmt(m.http_req_duration?.values?.['p(95)'])}ms`,
    `    p(99): ${fmt(m.http_req_duration?.values?.['p(99)'])}ms`,
    `    max  : ${fmt(m.http_req_duration?.values?.max)}ms`,
    '',
    '  By operation type:',
    `    auth  p(95): ${fmt(m.auth_duration?.values?.['p(95)'])}ms`,
    `    read  p(95): ${fmt(m.read_duration?.values?.['p(95)'])}ms`,
    `    write p(95): ${fmt(m.write_duration?.values?.['p(95)'])}ms`,
    '',
    '  Virtual users:',
    `    max  : ${m.vus_max?.values?.max}`,
    '',
  ];

  console.log(lines.join('\n'));

  return {
    'k6-results/platform-summary.json': JSON.stringify(data, null, 2),
    stdout: lines.join('\n'),
  };
}
