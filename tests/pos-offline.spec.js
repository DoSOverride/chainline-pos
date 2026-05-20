// tests/pos-offline.spec.js — Offline mode tests
// Intercepts all Worker requests and returns 503/network failure.
// App should still load from mock data and indicate offline state.

const { test, expect } = require('@playwright/test');
const helpers = require('./helpers');
const { BASE_URL } = require('./helpers');

const WORKER_URL = 'https://still-term-f1ec.taocaruso77.workers.dev';

// Helper: login and intercept worker to simulate offline
async function loginOffline(page, staffName = 'Jason') {
  // Intercept before navigating
  await page.route(`${WORKER_URL}/**`, route =>
    route.fulfill({ status: 503, body: 'Service Unavailable' })
  );
  await helpers.login(page, staffName);
}

test.describe('Offline mode — app still loads', () => {
  test('app loads and shows mock data when worker returns 503', async ({ page }) => {
    await loginOffline(page);
    await expect(page.locator('.app')).toBeVisible();
  });

  test('connection status indicator shows Offline', async ({ page }) => {
    await loginOffline(page);
    await expect(page.locator('.conn-status')).toContainText('Offline', { timeout: 5000 });
  });

  test('conn-dot has red class when offline', async ({ page }) => {
    await loginOffline(page);
    await expect(page.locator('.conn-dot.conn-red')).toBeVisible({ timeout: 5000 });
  });

  test('dashboard still renders stat cards offline', async ({ page }) => {
    await loginOffline(page);
    await expect(page.locator('.stat')).toHaveCount(4);
  });
});

test.describe('Offline mode — Work Orders', () => {
  test('work orders table still shows mock rows when worker returns 503', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    const rows = page.locator('.tbl tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    await expect(rows).toHaveCount(10);
  });

  test('WO status filter tabs still work offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.sub-tab:has-text("Open")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('WO search still filters offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.locator('.filters .input').fill('Devon');
    await page.waitForTimeout(200);
    await expect(page.locator('.tbl tbody tr').first()).toContainText('Devon');
  });

  test('creating WO offline shows toast with offline message', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');
    await expect(page.locator('.page-title')).toContainText('New Work Order');

    // Fill required bike field (customer has default, bike field is pre-filled)
    const bikeInput = page.locator('.input[placeholder*="Santa Cruz"]');
    await bikeInput.fill('Giant Trance 29 1');

    await page.click('.btn.primary:has-text("Create work order")');
    // Worker is offline so should show "offline" toast
    await expect(page.locator('.toast, [class*="toast"]').first()).toContainText('offline', { timeout: 6000 });
  });
});

test.describe('Offline mode — Sales Register', () => {
  test('sales register loads and shows pre-loaded cart items offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
    // Pre-loaded 4 items exist from component state (not from API)
    await expect(page.locator('.line-row:not(.head)')).not.toHaveCount(0);
  });

  test('adding to cart works offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    const beforeCount = await page.locator('.line-row:not(.head)').count();
    const searchInput = page.locator('.card input.input.lg');
    await searchInput.fill('tube');
    await page.waitForTimeout(300);
    await page.locator('.item-row').first().click();
    const afterCount = await page.locator('.line-row:not(.head)').count();
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  test('tax calculation still works offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.totals-row:has-text("GST")')).toBeVisible();
    await expect(page.locator('.totals-row:has-text("PST")')).toBeVisible();
    await expect(page.locator('.totals-row.grand')).toBeVisible();
  });

  test('sale payment offline shows toast', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await page.keyboard.press('F1');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 6000 });
  });
});

test.describe('Offline mode — navigation unaffected', () => {
  test('all nav items still work offline', async ({ page }) => {
    await loginOffline(page);
    const navScreens = [
      { label: 'Work Orders', title: 'Work Orders' },
      { label: 'Sales',       title: 'Sales Register' },
      { label: 'Customers',   title: 'Customers' },
      { label: 'Inventory',   title: 'Inventory' },
      { label: 'Reports',     title: 'Reports' },
    ];
    for (const { label, title } of navScreens) {
      await page.click(`.nav-item:has-text("${label}")`);
      await expect(page.locator('.page-title')).toContainText(title);
    }
  });
});
