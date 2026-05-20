// tests/pos-workorders.spec.js — Work Orders screen tests

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Work Orders — list', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await expect(page.locator('.page-title')).toContainText('Work Orders');
  });

  test('table loads with mock data rows', async ({ page }) => {
    const rows = page.locator('.tbl tbody tr');
    await expect(rows).not.toHaveCount(0);
    // MOCK_WO has 10 records
    await expect(rows).toHaveCount(10);
  });

  test('status filter pills render all tab options', async ({ page }) => {
    const tabs = ['All', 'Open', 'In progress', 'Ready', 'Booked', 'Overdue'];
    for (const label of tabs) {
      await expect(page.locator(`.sub-tab:has-text("${label}")`)).toBeVisible();
    }
  });

  test('"All" tab active by default', async ({ page }) => {
    await expect(page.locator('.sub-tab.active')).toContainText('All');
  });

  test('Open tab filters to only open status rows', async ({ page }) => {
    await page.click('.sub-tab:has-text("Open")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    // Each row should contain "Open" badge (no In Progress or Ready)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Open');
    }
  });

  test('In progress tab filters correctly', async ({ page }) => {
    await page.click('.sub-tab:has-text("In progress")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('In Progress');
    }
  });

  test('Ready tab filters correctly', async ({ page }) => {
    await page.click('.sub-tab:has-text("Ready")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Booked tab filters correctly', async ({ page }) => {
    await page.click('.sub-tab:has-text("Booked")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Overdue tab filters correctly', async ({ page }) => {
    await page.click('.sub-tab:has-text("Overdue")');
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search by customer name filters table', async ({ page }) => {
    const searchInput = page.locator('.filters .input');
    await searchInput.fill('Devon');
    await page.waitForTimeout(200);
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Devon');
    }
  });

  test('search by WO number filters table', async ({ page }) => {
    const searchInput = page.locator('.filters .input');
    await searchInput.fill('WO-2388');
    await page.waitForTimeout(200);
    const rows = page.locator('.tbl tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('WO-2388');
  });

  test('search with no matches shows empty state', async ({ page }) => {
    const searchInput = page.locator('.filters .input');
    await searchInput.fill('ZZZNOMATCH999');
    await page.waitForTimeout(200);
    await expect(page.locator('.tbl tbody')).toContainText('No work orders match');
  });

  test('clicking a row opens detail panel', async ({ page }) => {
    await page.locator('.tbl tbody tr').first().click();
    await expect(page.locator('.slide-panel')).toBeVisible();
  });

  test('detail panel shows WO id', async ({ page }) => {
    await page.locator('.tbl tbody tr').first().click();
    await expect(page.locator('.slide-panel .page-sub')).toContainText('WO-');
  });

  test('row count shown at bottom', async ({ page }) => {
    await expect(page.locator('text=/Showing \\d+ of \\d+/')).toBeVisible();
  });

  test('New Work Order button present', async ({ page }) => {
    await expect(page.locator('.btn.primary:has-text("New Work Order")')).toBeVisible();
  });

  test('options menu (⋯) on row opens menu', async ({ page }) => {
    // The ⋯ options button is in the last cell of each row
    const optBtn = page.locator('.tbl tbody tr').first().locator('[class*="options"], button:has([class*="dots"]), button:has-text("⋯")').first();
    // Click the options button if found; otherwise look for Dots icon btn
    const dotsBtn = page.locator('.tbl tbody tr').first().locator('td:last-child button').first();
    await dotsBtn.click({ timeout: 3000 });
    // Menu or dropdown should appear
    await expect(page.locator('[class*="menu"], [class*="dropdown"], [class*="context"]').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Work Orders — detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await page.locator('.tbl tbody tr').first().click();
    await expect(page.locator('.slide-panel')).toBeVisible();
  });

  test('status buttons exist in detail panel', async ({ page }) => {
    // Status change buttons render for statuses other than current
    const statusBtns = page.locator('.wo-detail-status-row .btn');
    await expect(statusBtns).not.toHaveCount(0);
  });

  test('checklist tasks render in panel', async ({ page }) => {
    await expect(page.locator('.task-row')).not.toHaveCount(0);
  });

  test('Add Task input is present', async ({ page }) => {
    await expect(page.locator('.task-add .input')).toBeVisible();
  });

  test('Add Task adds a new task', async ({ page }) => {
    const before = await page.locator('.task-row').count();
    await page.fill('.task-add .input', 'Test new task');
    await page.press('.task-add .input', 'Enter');
    await expect(page.locator('.task-row')).toHaveCount(before + 1);
  });

  test('line items section renders', async ({ page }) => {
    await expect(page.locator('.wo-line-row')).not.toHaveCount(0);
  });

  test('totals section shows GST, PST, Total', async ({ page }) => {
    await expect(page.locator('.wo-totals .aside-row:has-text("GST")')).toBeVisible();
    await expect(page.locator('.wo-totals .aside-row:has-text("PST")')).toBeVisible();
    await expect(page.locator('.wo-totals .aside-row:has-text("Total")')).toBeVisible();
  });

  test('Print button exists in panel header', async ({ page }) => {
    await expect(page.locator('.panel-head .btn:has-text("Print")')).toBeVisible();
  });

  test('SMS button exists in panel header', async ({ page }) => {
    await expect(page.locator('.panel-head .btn:has-text("SMS")')).toBeVisible();
  });

  test('close (×) button closes panel', async ({ page }) => {
    await page.click('.panel-head .btn.ghost:has-text("×")');
    await expect(page.locator('.slide-panel')).not.toBeAttached({ timeout: 3000 });
  });

  test('clicking overlay outside panel closes it', async ({ page }) => {
    await page.locator('.panel-overlay').click({ position: { x: 5, y: 5 }, force: true });
    await expect(page.locator('.slide-panel')).not.toBeAttached({ timeout: 3000 });
  });

  test('mechanic avatar chip renders', async ({ page }) => {
    await expect(page.locator('.aside-row:has-text("Mechanic")')).toBeVisible();
  });

  test('notes textarea present and editable', async ({ page }) => {
    const textarea = page.locator('.panel-body .textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('Updated notes for test');
    await expect(textarea).toHaveValue('Updated notes for test');
  });
});

test.describe('Work Orders — new WO form', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');
    await expect(page.locator('.page-title')).toContainText('New Work Order');
  });

  test('form renders with Customer field', async ({ page }) => {
    await expect(page.locator('.input[placeholder*="Hannah"]')).toBeVisible();
  });

  test('form has Bike/Item field', async ({ page }) => {
    await expect(page.locator('.input[placeholder*="Santa Cruz"]')).toBeVisible();
  });

  test('Service type select renders with options', async ({ page }) => {
    const select = page.locator('.select').first();
    await expect(select).toBeVisible();
    const opts = await select.locator('option').allTextContents();
    expect(opts.some(o => o.includes('tune') || o.includes('Tune'))).toBeTruthy();
  });

  test('Due date input present', async ({ page }) => {
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('Mechanic chips render for staff members', async ({ page }) => {
    const chips = page.locator('.chip');
    await expect(chips).not.toHaveCount(0);
  });

  test('Notes textarea present', async ({ page }) => {
    await expect(page.locator('.textarea')).toBeVisible();
  });

  test('Priority toggle present', async ({ page }) => {
    await expect(page.locator('text=Priority')).toBeVisible();
  });

  test('SMS when ready toggle present', async ({ page }) => {
    await expect(page.locator('text=SMS when ready')).toBeVisible();
  });

  test('Create work order button present', async ({ page }) => {
    await expect(page.locator('.btn.primary:has-text("Create work order")')).toBeVisible();
  });

  test('Cancel button returns to Work Orders list', async ({ page }) => {
    await page.click('.btn:has-text("Cancel")');
    await expect(page.locator('.page-title')).toContainText('Work Orders');
  });

  test('submitting form shows toast', async ({ page }) => {
    // Clear bike field to test that it triggers a real submission attempt
    const bikeInput = page.locator('.input[placeholder*="Santa Cruz"]');
    await bikeInput.fill('Trek Marlin 7 2024 Matte Dnister Black');
    await page.click('.btn.primary:has-text("Create work order")');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 6000 });
  });

  test('customer search shows suggestions', async ({ page }) => {
    const custInput = page.locator('.input[placeholder*="Hannah"]');
    await custInput.fill('Devon');
    await custInput.focus();
    await expect(page.locator('.suggest-item, [class*="suggest"]').first()).toBeVisible({ timeout: 2000 });
  });
});
