import { test, expect, request } from '@playwright/test';

const BASE = 'https://teamflow.codeapp.site';
const TEST_EMAIL = 'e2e_pw@test.com';
const TEST_PASS = 'E2ETestPass123!';

test.describe('TeamFlow App', () => {

  test('Login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log('Page title:', title);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const loginBtn = page.locator('button:has-text("Sign in")').first();

    await expect(emailInput).toBeVisible();
    await expect(passInput).toBeVisible();
    await expect(loginBtn).toBeVisible();

    await page.screenshot({ path: '/tmp/teamflow-login.png' });
  });

  test('User can login and reach dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '/tmp/teamflow-dashboard.png' });
    console.log('After login URL:', page.url());
  });

  test('Navigation sidebar is present on dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="layout"]').first();
    await expect(sidebar).toBeVisible();

    await page.screenshot({ path: '/tmp/teamflow-sidebar.png' });
    console.log('Sidebar visible:', await sidebar.isVisible());
  });

  test('Voice Agents page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

    await page.goto(`${BASE}/admin/voice-agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/teamflow-voiceagents.png' });

    const body = page.locator('body');
    const textContent = await body.textContent();
    console.log('Voice Agents page has content:', textContent!.length > 50);
  });

  test('Voice Call page loads with agent ID', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

    await page.goto(`${BASE}/admin/voice-call/test-agent`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/teamflow-voicecall.png' });

    const body = page.locator('body');
    const textContent = await body.textContent();
    console.log('Voice Call page text:', textContent);
  });

  test('Campaigns page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

    await page.goto(`${BASE}/admin/campaigns`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/teamflow-campaigns.png' });
  });

  test('Call Logs page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

    await page.goto(`${BASE}/admin/call-logs`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/teamflow-calllogs.png' });
  });

  test('Settings page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASS);
    await page.locator('button:has-text("Sign in")').first().click();
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

    await page.goto(`${BASE}/admin/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/tmp/teamflow-settings.png' });
  });
});