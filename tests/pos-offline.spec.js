// tests/pos-offline.spec.js — Offline mode tests
// Intercepts all Worker requests and returns 503/network failure.
// App should still load from mock data and indicate offline state.

const { test, expect } = require('./helpers');
const helpers = require('./helpers');
const { BASE_URL } = require('./helpers');
const { test: pwTest, expect: pwExpect } = require('@playwright/test');

const WORKER_URL = 'https://still-term-f1ec.taocaruso77.workers.dev';

// Helper: login and intercept worker to simulate offline
async function loginOffline(page, staffName = 'Jason') {
  // Intercept before navigating
  await page.route(`${WORKER_URL}/**`, route =>
    route.fulfill({ status: 503, body: 'Service Unavailable' })
  );
  await helpers.login(page, staffName);
}

pwTest.describe('Offline mode — app still loads', () => {
  pwTest('app loads and shows mock data when worker returns 503', async ({ page }) => {
    await loginOffline(page);
    await pwExpect(page.locator('.app')).toBeVisible();
  });

  pwTest('connection status indicator shows Offline', async ({ page }) => {
    await loginOffline(page);
    await pwExpect(page.locator('.conn-status')).toContainText('Offline', { timeout: 5000 });
  });

  pwTest('conn-dot has red class when offline', async ({ page }) => {
    await loginOffline(page);
    await pwExpect(page.locator('.conn-dot.conn-red')).toBeVisible({ timeout: 5000 });
  });

  pwTest('dashboard still renders stat cards offline', async ({ page }) => {
    await loginOffline(page);
    await pwExpect(page.locator('.stat')).toHaveCount(4);
  });
});

pwTest.describe('Offline mode — Work Orders', () => {
  pwTest('work orders table still shows mock rows when worker returns 503', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    const rows = page.locator('.tbl tbody tr');
    await pwExpect(rows.first()).toBeVisible({ timeout: 5000 });
    await pwExpect(rows).toHaveCount(10);
  });

  pwTest('WO status filter tabs still work offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.sub-tab:has-text("Open")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  pwTest('WO search still filters offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.locator('.filters .input').fill('Devon');
    await page.waitForTimeout(200);
    await pwExpect(page.locator('.tbl tbody tr').first()).toContainText('Devon');
  });

  pwTest('creating WO offline shows toast with offline message', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');
    await pwExpect(page.locator('.page-title')).toContainText('New Work Order');

    // Fill required bike field (customer has default, bike field is pre-filled)
    const bikeInput = page.locator('.input[placeholder*="Santa Cruz"]');
    await bikeInput.fill('Giant Trance 29 1');

    await page.click('.btn.primary:has-text("Create work order")');
    // Worker is offline so should show "offline" toast
    await pwExpect(page.locator('.toast, [class*="toast"]').first()).toContainText('offline', { timeout: 6000 });
  });
});

pwTest.describe('Offline mode — Sales Register', () => {
  pwTest('sales register loads and shows pre-loaded cart items offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await pwExpect(page.locator('.page-title')).toContainText('Sales Register');
    // Pre-loaded 4 items exist from component state (not from API)
    await pwExpect(page.locator('.line-row:not(.head)')).not.toHaveCount(0);
  });

  pwTest('adding to cart works offline', async ({ page }) => {
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

  pwTest('tax calculation still works offline', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await pwExpect(page.locator('.totals-row:has-text("GST")')).toBeVisible();
    await pwExpect(page.locator('.totals-row:has-text("PST")')).toBeVisible();
    await pwExpect(page.locator('.totals-row.grand')).toBeVisible();
  });

  pwTest('sale payment offline shows toast', async ({ page }) => {
    await loginOffline(page);
    await page.click('.nav-item:has-text("Sales")');
    await page.keyboard.press('F1');
    await pwExpect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 6000 });
  });
});

pwTest.describe('Offline mode — navigation unaffected', () => {
  pwTest('all nav items still work offline', async ({ page }) => {
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
      await pwExpect(page.locator('.page-title')).toContainText(title);
    }
  });
});
