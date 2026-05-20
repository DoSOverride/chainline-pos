// tests/pos-reports.spec.js — Reports screen tests
// Reports is a PlaceholderScreen in current build; tests verify navigation
// and the End of Day modal (accessible from Dashboard).

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Reports — placeholder screen', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Reports")');
    await expect(page.locator('.page-title')).toContainText('Reports');
  });

  test('Reports page loads with correct title', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Reports');
  });

  test('breadcrumb shows Tools / Reports', async ({ page }) => {
    await expect(page.locator('.crumbs')).toContainText('Tools');
    await expect(page.locator('.crumbs')).toContainText('Reports');
  });

  test('Reports nav item is active', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Reports');
  });

  test('placeholder module notice renders', async ({ page }) => {
    await expect(page.locator('.placeholder-screen')).toBeVisible();
  });
});

test.describe('Reports — End of Day modal (Dashboard)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    // EOD modal is triggered from Dashboard quick actions
  });

  test('End of Day button in quick actions opens EOD modal', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    // Modal with "End of Day" heading
    await expect(page.locator('text=/End of Day/').first()).toBeVisible({ timeout: 3000 });
  });

  test('EOD modal shows denomination inputs', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await expect(page.locator('.eod-row').first()).toBeVisible({ timeout: 3000 });
  });

  test('EOD modal shows $100, $50, $20 denominations', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await expect(page.locator('.eod-denom:has-text("$100")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.eod-denom:has-text("$50")')).toBeVisible();
    await expect(page.locator('.eod-denom:has-text("$20")')).toBeVisible();
  });

  test('EOD modal shows variance calculation area', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await expect(page.locator('.eod-summary, .aside-row:has-text("Variance")').first()).toBeVisible({ timeout: 3000 });
  });

  test('EOD modal Print Z-Report button present', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await expect(page.locator('.btn:has-text("Print Z-Report")')).toBeVisible({ timeout: 3000 });
  });

  test('Print Z-Report fires toast', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await page.waitForTimeout(500);
    await page.click('.btn:has-text("Print Z-Report")');
    await expect(page.locator('.toast, [class*="toast"]').first()).toContainText('Z-report', { timeout: 4000 });
  });

  test('EOD modal Cancel button closes modal', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await page.waitForTimeout(500);
    await page.click('.btn:has-text("Cancel")');
    await expect(page.locator('.eod-row').first()).not.toBeAttached({ timeout: 3000 });
  });

  test('entering denomination counts updates counted total', async ({ page }) => {
    await page.click('.qa:has-text("End of Day")');
    await page.waitForTimeout(500);
    // Enter 4 × $100 bills
    const hundredInput = page.locator('.eod-row:has(.eod-denom:has-text("$100")) input');
    await hundredInput.fill('4');
    await expect(page.locator('.eod-summary .aside-row:has-text("Counted") .mono')).toContainText('400', { timeout: 1000 });
  });

  test('Dashboard shows cash/card/net revenue summary', async ({ page }) => {
    // End of day summary card always visible on dashboard
    await expect(page.locator('.aside-row:has-text("Cash sales")')).toBeVisible();
    await expect(page.locator('.aside-row:has-text("Card sales")')).toBeVisible();
    await expect(page.locator('.aside-row:has-text("Net")')).toBeVisible();
  });
});
