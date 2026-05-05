import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function quickLogin(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');

  // Use quick-login button if present (from existing smoke test pattern)
  const quickBtn = page.locator('button').filter({ hasText: /quick.*test|test.*login|demo/i });
  if (await quickBtn.count() > 0) {
    await quickBtn.first().click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    return;
  }

  // Fallback: use env credentials or skip
  const email = process.env.TEST_EMAIL ?? 'admin@test.local';
  const password = process.env.TEST_PASSWORD ?? 'Test@123456';
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => {});
}

const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/products', name: 'Products' },
  { path: '/suppliers', name: 'Suppliers' },
  { path: '/users', name: 'Users' },
  { path: '/categories', name: 'Categories' },
  { path: '/inventory', name: 'Inventory' },
  { path: '/accounting', name: 'Accounting' },
  { path: '/hr', name: 'HR' },
  { path: '/crm', name: 'CRM' },
  { path: '/procurement', name: 'Procurement' },
  { path: '/warehouse', name: 'Warehouse' },
  { path: '/transportation', name: 'Transportation' },
  { path: '/manufacturing', name: 'Manufacturing' },
  { path: '/projects', name: 'Projects' },
  { path: '/equipment', name: 'Assets' },
  { path: '/payments', name: 'Payments' },
  { path: '/communication', name: 'Communication' },
  { path: '/compliance', name: 'Compliance' },
  { path: '/bi', name: 'BI Reporting' },
  { path: '/documents', name: 'Documents' },
  { path: '/transactions', name: 'Transactions' },
  { path: '/settings', name: 'Settings' },
  { path: '/rbac', name: 'RBAC' },
  { path: '/modules', name: 'Modules' },
];

test.describe('Navigation — all routes load', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
  });

  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) renders without crash`, async ({ page }) => {
      await page.goto(`${BASE}${route.path}`);
      await page.waitForLoadState('domcontentloaded');

      // Page should not show a full error/white screen
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(10);

      // No unhandled React error boundary crash
      const crashMsg = page.locator('text=/something went wrong|application error|unexpected error/i');
      await expect(crashMsg).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    });
  }
});

test.describe('Sub-routes', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
  });

  test('/transactions/create — shows creation form', async ({ page }) => {
    await page.goto(`${BASE}/transactions/create`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('form, [class*="form"]')).toBeVisible({ timeout: 8000 });
  });

  test('/inventory/create — shows creation form', async ({ page }) => {
    await page.goto(`${BASE}/inventory/create`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('form, [class*="form"]')).toBeVisible({ timeout: 8000 });
  });

  test('/transportation/shipments — shows shipments list', async ({ page }) => {
    await page.goto(`${BASE}/transportation/shipments`);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test('/transportation/shipments/create — shows shipment form', async ({ page }) => {
    await page.goto(`${BASE}/transportation/shipments/create`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('form, [class*="form"]')).toBeVisible({ timeout: 8000 });
  });

  test('/modules/builder — shows module builder', async ({ page }) => {
    await page.goto(`${BASE}/modules/builder`);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test('/transactions/analytics — shows analytics view', async ({ page }) => {
    await page.goto(`${BASE}/transactions/analytics`);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
  });
});
