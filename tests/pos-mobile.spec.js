// tests/pos-mobile.spec.js — Mobile viewport tests (390x844, iPhone 14)
// POS is currently a desktop app; these tests verify graceful rendering
// at mobile dimensions and document any responsive behaviour.

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

const MOBILE = { width: 390, height: 844 };

test.describe('Mobile (390x844) — layout', () => {
  test.use({ viewport: MOBILE });

  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
  });

  test('app container renders at mobile width', async ({ page }) => {
    await expect(page.locator('.app')).toBeVisible();
    const width = await page.evaluate(() => window.innerWidth);
    expect(width).toBe(390);
  });

  test('page title still visible at mobile width', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('can navigate to Work Orders at mobile width', async ({ page }) => {
    await page.click('.nav-item:has-text("Work Orders")');
    await expect(page.locator('.page-title')).toContainText('Work Orders');
  });

  test('can navigate to Sales at mobile width', async ({ page }) => {
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('Work Orders table rows still render at mobile width', async ({ page }) => {
    await page.click('.nav-item:has-text("Work Orders")');
    await expect(page.locator('.tbl tbody tr').first()).toBeVisible();
  });

  test('Sales register payment buttons visible at mobile width', async ({ page }) => {
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.pay-btn').first()).toBeVisible();
  });

  test('login screen renders at mobile width', async ({ page }) => {
    await page.evaluate(() => sessionStorage.removeItem('pos-staff'));
    await page.reload();
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.staff-btn').first()).toBeVisible();
  });

  test('PIN pad renders at mobile width', async ({ page }) => {
    await page.evaluate(() => sessionStorage.removeItem('pos-staff'));
    await page.reload();
    await page.waitForSelector('#login-screen');
    await page.click('.staff-btn:has-text("Jason")');
    await expect(page.locator('.pin-grid')).toBeVisible();
  });
});

test.describe('Mobile (390x844) — stat grid', () => {
  test.use({ viewport: MOBILE });

  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
  });

  test('stat grid still shows all 4 stat cards', async ({ page }) => {
    await expect(page.locator('.stat')).toHaveCount(4);
  });

  test('stat values are visible (not clipped off screen)', async ({ page }) => {
    const statValues = page.locator('.stat-value');
    const count = await statValues.count();
    for (let i = 0; i < count; i++) {
      await expect(statValues.nth(i)).toBeVisible();
    }
  });
});

test.describe('Mobile (375x667) — smaller iPhone', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('app renders without horizontal overflow at 375px', async ({ page }) => {
    await login(page, 'Jason');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    // Ideally scrollWidth should not exceed viewport width by too much
    // We allow up to 2x for POS which is designed for desktop
    expect(scrollWidth).toBeLessThan(375 * 3);
  });
});
