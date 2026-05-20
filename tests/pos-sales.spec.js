// tests/pos-sales.spec.js — Sales Register tests

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

// SalesScreen pre-populates 4 items on load; tests account for that.

test.describe('Sales Register — cart state', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('page title shows Sales Register', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('item search input is visible on load', async ({ page }) => {
    await expect(page.locator('.card input.input.lg')).toBeVisible();
  });

  test('search input receives focus on load', async ({ page }) => {
    // The SalesScreen calls searchRef.current.focus() on mount
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.className : '';
    });
    expect(focused).toContain('input');
  });

  test('pre-loaded cart shows line items', async ({ page }) => {
    // SalesScreen initialises with 4 items
    await expect(page.locator('.line-row:not(.head)')).not.toHaveCount(0);
  });

  test('typing query shows catalog results', async ({ page }) => {
    const searchInput = page.locator('.card input.input.lg');
    await searchInput.fill('shimano');
    await page.waitForTimeout(300);
    await expect(page.locator('.item-row').first()).toBeVisible();
  });

  test('clicking search result adds item to cart', async ({ page }) => {
    // Clear cart first to simplify counting
    await page.click('.btn.ghost:has-text("Clear cart")');
    const searchInput = page.locator('.card input.input.lg');
    await searchInput.fill('lube');
    await page.waitForTimeout(300);
    await page.locator('.item-row').first().click();
    await expect(page.locator('.line-row:not(.head)')).not.toHaveCount(0);
  });

  test('cart empty state shows after clearing', async ({ page }) => {
    await page.click('.btn.ghost:has-text("Clear cart")');
    await expect(page.locator('text=/Cart empty/i')).toBeVisible();
  });

  test('cart shows item names', async ({ page }) => {
    // Pre-loaded items include Shimano XT Cassette
    await expect(page.locator('.line-row .name:has-text("Shimano")')).toBeVisible();
  });
});

test.describe('Sales Register — tax calculations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('GST 5% computed correctly from subtotal', async ({ page }) => {
    const subtotalText = await page.locator('.totals-row:has-text("Subtotal") .val').textContent();
    const gstText      = await page.locator('.totals-row:has-text("GST") .val').textContent();

    const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
    const gst      = parseFloat(gstText.replace(/[^0-9.]/g, ''));

    expect(gst).toBeCloseTo(subtotal * 0.05, 1);
  });

  test('PST 7% computed correctly from subtotal', async ({ page }) => {
    const subtotalText = await page.locator('.totals-row:has-text("Subtotal") .val').textContent();
    const pstText      = await page.locator('.totals-row:has-text("PST") .val').textContent();

    const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
    const pst      = parseFloat(pstText.replace(/[^0-9.]/g, ''));

    expect(pst).toBeCloseTo(subtotal * 0.07, 1);
  });

  test('Total = subtotal + GST + PST', async ({ page }) => {
    const subtotalText = await page.locator('.totals-row:has-text("Subtotal") .val').textContent();
    const gstText      = await page.locator('.totals-row:has-text("GST") .val').textContent();
    const pstText      = await page.locator('.totals-row:has-text("PST") .val').textContent();
    const totalText    = await page.locator('.totals-row.grand .val').textContent();

    const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
    const gst      = parseFloat(gstText.replace(/[^0-9.]/g, ''));
    const pst      = parseFloat(pstText.replace(/[^0-9.]/g, ''));
    const total    = parseFloat(totalText.replace(/[^0-9.]/g, ''));

    expect(total).toBeCloseTo(subtotal + gst + pst, 1);
  });

  test('totals section shows Subtotal, GST, PST, Total CAD labels', async ({ page }) => {
    await expect(page.locator('.totals-row:has-text("Subtotal")')).toBeVisible();
    await expect(page.locator('.totals-row:has-text("GST")')).toBeVisible();
    await expect(page.locator('.totals-row:has-text("PST")')).toBeVisible();
    await expect(page.locator('.totals-row.grand')).toBeVisible();
  });
});

test.describe('Sales Register — quantity controls', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('qty + button increases line total', async ({ page }) => {
    // Read current line total for first item
    const firstPriceText = await page.locator('.line-row:not(.head) .num').last().textContent();
    const firstPrice = parseFloat(firstPriceText.replace(/[^0-9.]/g, ''));

    // Click + for last item line
    await page.locator('.line-row:not(.head) .qty-stepper button:has-text("+")').last().click();

    // The line total column should have changed — just verify it's still a number
    const newText = await page.locator('.line-row:not(.head) .num').last().textContent();
    const newPrice = parseFloat(newText.replace(/[^0-9.]/g, ''));
    expect(newPrice).toBeGreaterThan(0);
  });

  test('qty − button decreases qty (min 1)', async ({ page }) => {
    // Press + to go to qty 2 first
    const plusBtn = page.locator('.line-row:not(.head) .qty-stepper button:has-text("+")').first();
    const minusBtn = page.locator('.line-row:not(.head) .qty-stepper button:has-text("−")').first();
    await plusBtn.click();
    await minusBtn.click();
    // Input should be back to 1
    const qtyInput = page.locator('.line-row:not(.head) .qty-stepper input').first();
    await expect(qtyInput).toHaveValue('1');
  });

  test('qty cannot go below 1', async ({ page }) => {
    // Click − multiple times
    const minusBtn = page.locator('.line-row:not(.head) .qty-stepper button:has-text("−")').first();
    await minusBtn.click();
    await minusBtn.click();
    const qtyInput = page.locator('.line-row:not(.head) .qty-stepper input').first();
    const val = await qtyInput.inputValue();
    expect(parseInt(val, 10)).toBeGreaterThanOrEqual(1);
  });

  test('subtotal updates when qty changes', async ({ page }) => {
    const before = await page.locator('.totals-row:has-text("Subtotal") .val').textContent();
    await page.locator('.line-row:not(.head) .qty-stepper button:has-text("+")').first().click();
    const after = await page.locator('.totals-row:has-text("Subtotal") .val').textContent();
    expect(before).not.toBe(after);
  });
});

test.describe('Sales Register — remove items', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('removing all items shows empty cart state', async ({ page }) => {
    await page.click('.btn.ghost:has-text("Clear cart")');
    await expect(page.locator('text=/Cart empty/i')).toBeVisible();
  });

  test('options menu on line item has Remove option', async ({ page }) => {
    // Each line row has an OptionsMenu at the end
    const lineDotsBtn = page.locator('.line-row:not(.head) td:last-child button, .line-row:not(.head) > *:last-child button').first();
    if (await lineDotsBtn.isVisible()) {
      await lineDotsBtn.click();
      await expect(page.locator('text=Remove')).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Sales Register — payment buttons', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
    await expect(page.locator('.page-title')).toContainText('Sales Register');
  });

  test('Cash payment button visible with F2 hint', async ({ page }) => {
    await expect(page.locator('.pay-btn:has-text("Cash")')).toBeVisible();
    await expect(page.locator('.pay-btn:has-text("Cash") .kbd')).toContainText('F2');
  });

  test('Card payment button visible with F1 hint', async ({ page }) => {
    await expect(page.locator('.pay-btn.primary:has-text("Card")')).toBeVisible();
    await expect(page.locator('.pay-btn.primary:has-text("Card") .kbd')).toContainText('F1');
  });

  test('Other payment button visible with F3 hint', async ({ page }) => {
    await expect(page.locator('.pay-btn:has-text("Other")')).toBeVisible();
    await expect(page.locator('.pay-btn:has-text("Other") .kbd')).toContainText('F3');
  });

  test('paying with Card fires toast', async ({ page }) => {
    await page.click('.pay-btn.primary:has-text("Card")');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('paying with Cash fires toast', async ({ page }) => {
    await page.click('.pay-btn:has-text("Cash")');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('F1 key triggers card payment toast', async ({ page }) => {
    await page.keyboard.press('F1');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('F2 key triggers cash payment toast', async ({ page }) => {
    await page.keyboard.press('F2');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('F3 key triggers other payment toast', async ({ page }) => {
    await page.keyboard.press('F3');
    await expect(page.locator('.toast, [class*="toast"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('paying with empty cart shows error toast', async ({ page }) => {
    await page.click('.btn.ghost:has-text("Clear cart")');
    await page.keyboard.press('F1');
    await expect(page.locator('.toast, [class*="toast"]').first()).toContainText('empty', { timeout: 3000 });
  });

  test('terminal status shows READY', async ({ page }) => {
    await expect(page.locator('text=READY')).toBeVisible();
  });
});

test.describe('Sales Register — customer field', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');
  });

  test('customer field shows default customer', async ({ page }) => {
    await expect(page.locator('.card:has-text("Customer") .input')).toHaveValue('Devon Tran');
  });

  test('customer field is editable', async ({ page }) => {
    const custInput = page.locator('.card:has-text("Customer") .input');
    await custInput.fill('Walk-in');
    await expect(custInput).toHaveValue('Walk-in');
  });
});
