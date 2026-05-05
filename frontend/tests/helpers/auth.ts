import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export async function registerAndLogin(page: Page): Promise<{ email: string; password: string }> {
  const email = `e2e_${Date.now()}@test.local`;
  const password = 'Test@123456';

  await page.goto(`${BASE_URL}/auth/register`);
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[name="companyName"], input[placeholder*="company" i]', `E2ECo_${Date.now()}`);
  await page.fill('input[name="firstName"], input[placeholder*="first" i]', 'E2E');
  await page.fill('input[name="lastName"], input[placeholder*="last" i]', 'Test');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);

  const confirmInput = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]');
  if (await confirmInput.count() > 0) {
    await confirmInput.fill(password);
  }

  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/register'), { timeout: 15000 });

  return { email, password };
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
}

export async function ensureLoggedIn(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/register')) {
    await registerAndLogin(page);
  }
}
