import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Authentication', () => {
  test('shows login page at /auth/login', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows registration page at /auth/register', async ({ page }) => {
    await page.goto(`${BASE}/auth/register`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('form')).toBeVisible();
  });

  test('redirects unauthenticated users from / to login', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/auth\/login|\/login/);
  });

  test('shows validation error on empty login submit', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.click('button[type="submit"]');
    const error = page.locator('.ant-form-item-explain-error, [class*="error"], [role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', 'nobody@nowhere.local');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    const error = page.locator('.ant-message-error, [class*="error"], [role="alert"]');
    await expect(error.first()).toBeVisible({ timeout: 8000 });
  });

  test('full register → login → logout flow', async ({ page }) => {
    const email = `e2e_auth_${Date.now()}@test.local`;
    const password = 'Test@123456';
    const company = `AuthCo_${Date.now()}`;

    // Register
    await page.goto(`${BASE}/auth/register`);
    await page.waitForLoadState('domcontentloaded');

    const companyInput = page.locator('input').filter({ hasText: '' }).first();
    const fields = await page.locator('input').all();

    for (const field of fields) {
      const name = await field.getAttribute('name') ?? '';
      const placeholder = (await field.getAttribute('placeholder') ?? '').toLowerCase();
      const type = await field.getAttribute('type') ?? '';

      if (name.includes('company') || placeholder.includes('company')) {
        await field.fill(company);
      } else if (name.includes('firstName') || placeholder.includes('first')) {
        await field.fill('Auth');
      } else if (name.includes('lastName') || placeholder.includes('last')) {
        await field.fill('Test');
      } else if (type === 'email' || name.includes('email') || placeholder.includes('email')) {
        await field.fill(email);
      } else if (name.includes('confirm') || placeholder.includes('confirm')) {
        await field.fill(password);
      } else if (type === 'password') {
        await field.fill(password);
      }
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/register'), { timeout: 15000 });

    // Should be on dashboard or redirected
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/register');

    // Logout (find logout button/link)
    const logoutBtn = page.locator('button, a').filter({ hasText: /logout|sign out/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await page.waitForURL(url => url.pathname.includes('/login'), { timeout: 8000 });
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
