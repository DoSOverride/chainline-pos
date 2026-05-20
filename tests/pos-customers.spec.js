// tests/pos-customers.spec.js — Customers screen tests
// Note: Customers screen is PlaceholderScreen in current build.
// Tests verify navigation, accessibility and placeholder render.
// When the full module ships, replace placeholder assertions with real ones.

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Customers — navigation and placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Customers")');
    await expect(page.locator('.page-title')).toContainText('Customers');
  });

  test('Customers page loads with correct title', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Customers');
  });

  test('breadcrumb shows CRM / Customers', async ({ page }) => {
    await expect(page.locator('.crumbs')).toContainText('CRM');
    await expect(page.locator('.crumbs')).toContainText('Customers');
  });

  test('Customers nav item is active', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Customers');
  });

  test('placeholder notice visible', async ({ page }) => {
    await expect(page.locator('.placeholder-screen')).toBeVisible();
  });

  test('can navigate to Customers from Work Orders', async ({ page }) => {
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.nav-item:has-text("Customers")');
    await expect(page.locator('.page-title')).toContainText('Customers');
  });

  test('can navigate back to Dashboard', async ({ page }) => {
    await page.click('.nav-item:has-text("Dashboard")');
    await expect(page.locator('.page-title')).toContainText('Dashboard');
  });
});

test.describe('Customers — New WO searches mock customers', () => {
  // The New WO form has a customer combobox backed by MOCK_CUSTOMERS
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');
    await expect(page.locator('.page-title')).toContainText('New Work Order');
  });

  test('customer list renders in new WO form suggestions', async ({ page }) => {
    const custInput = page.locator('.input[placeholder*="Hannah"]');
    await custInput.fill('');
    await custInput.focus();
    await expect(page.locator('.suggest-item').first()).toBeVisible({ timeout: 2000 });
  });

  test('search filters customers by name', async ({ page }) => {
    const custInput = page.locator('.input[placeholder*="Hannah"]');
    await custInput.fill('Priya');
    await expect(page.locator('.suggest-item:has-text("Priya")')).toBeVisible({ timeout: 2000 });
  });

  test('clicking a suggestion fills the customer field', async ({ page }) => {
    const custInput = page.locator('.input[placeholder*="Hannah"]');
    await custInput.fill('Devon');
    await custInput.focus();
    await page.click('.suggest-item:has-text("Devon")');
    await expect(custInput).toHaveValue('Devon Tran');
  });

  test('mock customers include names from MOCK_CUSTOMERS', async ({ page }) => {
    const custInput = page.locator('.input[placeholder*="Hannah"]');
    await custInput.fill('');
    await custInput.focus();
    const names = ['Hannah Riise', 'Devon Tran', 'Marc Lefebvre', 'Hannah Kowalski', 'Priya Sharma'];
    for (const name of names) {
      await expect(page.locator(`.suggest-item:has-text("${name.split(' ')[0]}")`).first()).toBeVisible({ timeout: 2000 });
    }
  });
});
