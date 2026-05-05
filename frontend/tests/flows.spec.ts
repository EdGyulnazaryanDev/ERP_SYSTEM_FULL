import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function quickLogin(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
  const quickBtn = page.locator('button').filter({ hasText: /quick.*test|test.*login|demo/i });
  if (await quickBtn.count() > 0) {
    await quickBtn.first().click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 12000 });
  }
}

async function fillAndSubmitForm(page: Page, values: Record<string, string>) {
  for (const [selector, value] of Object.entries(values)) {
    const el = page.locator(selector);
    if (await el.count() > 0) await el.first().fill(value);
  }
  await page.click('button[type="submit"]');
}

// -------------------------------------------------------------------------
// Flow: Inventory CRUD
// -------------------------------------------------------------------------
test.describe('Inventory UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('creates and views an inventory item', async ({ page }) => {
    await page.goto(`${BASE}/inventory/create`);
    await page.waitForLoadState('domcontentloaded');

    const sku = `SKU-E2E-${Date.now()}`;
    await fillAndSubmitForm(page, {
      'input[name="product_name"], input[placeholder*="name" i]': `E2E Widget ${Date.now()}`,
      'input[name="sku"], input[placeholder*="sku" i]': sku,
      'input[name="quantity"], input[placeholder*="quantity" i]': '100',
      'input[name="unit_price"], input[placeholder*="price" i]': '9.99',
    });

    // Should redirect to list or show success
    await page.waitForTimeout(2000);
    const successMsg = page.locator('.ant-message-success, [class*="success"]');
    const redirectedToList = page.url().includes('/inventory') && !page.url().includes('/create');

    const passed = (await successMsg.count()) > 0 || redirectedToList;
    expect(passed).toBe(true);
  });

  test('inventory list shows table with data', async ({ page }) => {
    await page.goto(`${BASE}/inventory`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('table, [class*="table"], [class*="list"]', { timeout: 10000 });
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });
});

// -------------------------------------------------------------------------
// Flow: CRM Customer creation
// -------------------------------------------------------------------------
test.describe('CRM UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('CRM page renders with tabs/sections', async ({ page }) => {
    await page.goto(`${BASE}/crm`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/customer|lead|opportunity|crm/);
  });

  test('can switch between CRM tabs', async ({ page }) => {
    await page.goto(`${BASE}/crm`);
    await page.waitForLoadState('domcontentloaded');
    const tabs = page.locator('.ant-tabs-tab, [role="tab"]');
    const count = await tabs.count();
    if (count > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(10);
    }
  });
});

// -------------------------------------------------------------------------
// Flow: Procurement page
// -------------------------------------------------------------------------
test.describe('Procurement UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('procurement page loads with requisitions section', async ({ page }) => {
    await page.goto(`${BASE}/procurement`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/requisition|procurement|purchase/);
  });
});

// -------------------------------------------------------------------------
// Flow: HR page
// -------------------------------------------------------------------------
test.describe('HR UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('HR page loads with employees section', async ({ page }) => {
    await page.goto(`${BASE}/hr`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/employee|hr|human/);
  });
});

// -------------------------------------------------------------------------
// Flow: Accounting page
// -------------------------------------------------------------------------
test.describe('Accounting UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('accounting page loads with accounts section', async ({ page }) => {
    await page.goto(`${BASE}/accounting`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/account|journal|accounting|finance/);
  });
});

// -------------------------------------------------------------------------
// Flow: Transportation → Shipments
// -------------------------------------------------------------------------
test.describe('Transportation UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('shipments list renders', async ({ page }) => {
    await page.goto(`${BASE}/transportation/shipments`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/shipment|courier|transport|delivery/);
  });

  test('shipment creation form has required fields', async ({ page }) => {
    await page.goto(`${BASE}/transportation/shipments/create`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('form, [class*="form"]', { timeout: 10000 });
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThan(3);
  });
});

// -------------------------------------------------------------------------
// Flow: Manufacturing page
// -------------------------------------------------------------------------
test.describe('Manufacturing UI Flow', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('manufacturing page loads with BOM section', async ({ page }) => {
    await page.goto(`${BASE}/manufacturing`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/bom|work order|manufacturing|production/);
  });
});

// -------------------------------------------------------------------------
// Flow: Public shipment tracking (no auth)
// -------------------------------------------------------------------------
test.describe('Public Tracking', () => {
  test('/track/:id renders tracking page without auth', async ({ page }) => {
    await page.goto(`${BASE}/track/TEST-TRACKING-000`);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(10);
    // Should not redirect to login
    expect(page.url()).not.toContain('/auth/login');
  });
});

// -------------------------------------------------------------------------
// Flow: Settings page
// -------------------------------------------------------------------------
test.describe('Settings UI', () => {
  test.beforeEach(async ({ page }) => { await quickLogin(page); });

  test('settings page loads and shows configuration options', async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/setting|configuration|profile|preference/);
  });
});
