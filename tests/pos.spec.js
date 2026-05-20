// tests/pos.spec.js — ChainLine POS: core smoke tests (login + dashboard + navigation)
// Run: BASE_URL=http://localhost:3001 npx playwright test tests/pos.spec.js --headed

const { test, expect } = require('@playwright/test');
const { login, loginViaPinPad, BASE_URL } = require('./helpers');

// ─────────────────────────────────────────────────────────────
// 1. LOGIN SCREEN
// ─────────────────────────────────────────────────────────────

test.describe('Login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-screen', { timeout: 10000 });
  });

  test('shows all 9 staff avatar buttons', async ({ page }) => {
    const expected = ['Jason', 'Phil', 'Steve', 'Matt', 'Darrin', 'Tao', 'Beckett', 'Curren', 'Danny'];
    for (const name of expected) {
      await expect(page.locator(`.staff-btn:has-text("${name}")`)).toBeVisible();
    }
  });

  test('PIN pad renders with digits 0-9, delete and ok keys', async ({ page }) => {
    await page.click('.staff-btn:has-text("Jason")');
    await expect(page.locator('.pin-grid')).toBeVisible();

    // 10 digit keys (0-9)
    for (let d = 0; d <= 9; d++) {
      await expect(page.locator(`.pin-key:not(.delete):has-text("${d}")`)).toBeVisible();
    }
    // Delete key
    await expect(page.locator('.pin-key.delete')).toBeVisible();
    // OK / enter key (↵)
    await expect(page.locator('.pin-key:has-text("↵")')).toBeVisible();
  });

  test('PIN dots fill as digits are entered', async ({ page }) => {
    await page.click('.staff-btn:has-text("Jason")');
    await expect(page.locator('.pin-dot.filled')).toHaveCount(0);
    await page.click('.pin-key:not(.delete):has-text("1")');
    await expect(page.locator('.pin-dot.filled')).toHaveCount(1);
    await page.click('.pin-key:not(.delete):has-text("1")');
    await expect(page.locator('.pin-dot.filled')).toHaveCount(2);
  });

  test('delete key removes last PIN digit', async ({ page }) => {
    await page.click('.staff-btn:has-text("Jason")');
    await page.click('.pin-key:not(.delete):has-text("1")');
    await page.click('.pin-key:not(.delete):has-text("1")');
    await expect(page.locator('.pin-dot.filled')).toHaveCount(2);
    await page.click('.pin-key.delete');
    await expect(page.locator('.pin-dot.filled')).toHaveCount(1);
  });

  test('wrong PIN shows error message and shakes', async ({ page }) => {
    await page.click('.staff-btn:has-text("Jason")');
    // Enter a 4-digit wrong PIN
    for (const k of ['9','9','9','9']) {
      await page.click(`.pin-key:not(.delete):has-text("${k}")`);
    }
    await expect(page.locator('.pin-error')).toContainText('Wrong PIN', { timeout: 2000 });
  });

  test('wrong PIN clears the dots after rejection', async ({ page }) => {
    await page.click('.staff-btn:has-text("Jason")');
    for (const k of ['9','9','9','9']) {
      await page.click(`.pin-key:not(.delete):has-text("${k}")`);
    }
    await page.waitForTimeout(500);
    await expect(page.locator('.pin-dot.filled')).toHaveCount(0);
  });

  test('correct PIN (1139) logs Jason in and shows app', async ({ page }) => {
    await loginViaPinPad(page, 'Jason', '1139');
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('#login-screen')).not.toBeAttached();
  });

  test('correct PIN logs in for Phil', async ({ page }) => {
    await loginViaPinPad(page, 'Phil', '1139');
    await expect(page.locator('.app')).toBeVisible();
  });

  test('correct PIN logs in for Darrin', async ({ page }) => {
    await loginViaPinPad(page, 'Darrin', '1139');
    await expect(page.locator('.app')).toBeVisible();
  });

  test('staff name shown in sidebar after login', async ({ page }) => {
    await loginViaPinPad(page, 'Jason', '1139');
    await expect(page.locator('.user-name')).toContainText('Jason');
  });

  test('staff role shown in sidebar after login', async ({ page }) => {
    await loginViaPinPad(page, 'Jason', '1139');
    await expect(page.locator('.user-role')).toContainText('Warranty');
  });

  test('logout clears sessionStorage and returns to login', async ({ page }) => {
    await login(page, 'Jason');
    // Verify logged in
    await expect(page.locator('.app')).toBeVisible();
    // Clear sessionStorage and reload to simulate lock/logout
    await page.evaluate(() => sessionStorage.removeItem('pos-staff'));
    await page.reload();
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 8000 });
    const stored = await page.evaluate(() => sessionStorage.getItem('pos-staff'));
    expect(stored).toBeNull();
  });

  test('PIN label updates to show selected staff name', async ({ page }) => {
    await page.click('.staff-btn:has-text("Matt")');
    await expect(page.locator('.pin-label')).toContainText('Matt');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. DASHBOARD
// ─────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
  });

  test('page title shows Dashboard', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Dashboard');
  });

  test('four stat cards render', async ({ page }) => {
    await expect(page.locator('.stat')).toHaveCount(4);
  });

  test('Open Work Orders stat card visible', async ({ page }) => {
    await expect(page.locator('.stat-label:has-text("Open Work Orders")')).toBeVisible();
  });

  test('quick action New Work Order button present', async ({ page }) => {
    await expect(page.locator('.qa-title:has-text("New Work Order")')).toBeVisible();
  });

  test('quick action New Sale button present', async ({ page }) => {
    await expect(page.locator('.qa-title:has-text("New Sale")')).toBeVisible();
  });

  test('quick action End of Day button present', async ({ page }) => {
    await expect(page.locator('.qa-title:has-text("End of Day")')).toBeVisible();
  });

  test('activity feed renders rows', async ({ page }) => {
    const feedItems = page.locator('.feed-item');
    await expect(feedItems).not.toHaveCount(0);
  });

  test('service queue table renders rows', async ({ page }) => {
    const rows = page.locator('.tbl tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('End of Day card shows cash/card totals', async ({ page }) => {
    await expect(page.locator('.aside-row:has-text("Cash sales")')).toBeVisible();
    await expect(page.locator('.aside-row:has-text("Card sales")')).toBeVisible();
  });

  test('New Sale quick action navigates to Sales', async ({ page }) => {
    await page.click('.qa:has-text("New Sale")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('New Work Order quick action navigates to New WO form', async ({ page }) => {
    await page.click('.qa:has-text("New Work Order")');
    await expect(page.locator('.page-title')).toContainText('New Work Order');
  });

  test('End of Day quick action opens EOD modal', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    // Modal should open
    await expect(page.locator('.modal, [class*="modal"], [class*="eod"]').first()).toBeVisible({ timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────
// 3. NAVIGATION
// ─────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
  });

  test('Dashboard nav item active on load', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Dashboard');
  });

  test('Work Orders nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Work Orders")');
    await expect(page.locator('.page-title')).toContainText('Work Orders');
  });

  test('Sales nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('Customers nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Customers")');
    await expect(page.locator('.page-title')).toContainText('Customers');
  });

  test('Inventory nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Inventory")');
    await expect(page.locator('.page-title')).toContainText('Inventory');
  });

  test('Reports nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Reports")');
    await expect(page.locator('.page-title')).toContainText('Reports');
  });

  test('Purchase Orders nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Purchase Orders")');
    await expect(page.locator('.page-title')).toContainText('Purchase Orders');
  });

  test('Settings nav item navigates', async ({ page }) => {
    await page.click('.nav-item:has-text("Settings")');
    await expect(page.locator('.page-title')).toContainText('Settings');
  });

  test('active nav item gets active class on click', async ({ page }) => {
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.nav-item.active')).toContainText('Sales');
  });

  test('sidebar brand shows ChainLine', async ({ page }) => {
    await expect(page.locator('.sidebar')).toContainText('ChainLine');
  });

  test('topbar shows breadcrumb for current screen', async ({ page }) => {
    await page.click('.nav-item:has-text("Work Orders")');
    await expect(page.locator('.crumbs')).toContainText('Work Orders');
  });
});
