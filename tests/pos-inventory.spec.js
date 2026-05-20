// tests/pos-inventory.spec.js — Inventory screen tests
// Note: Customers/Inventory/Reports/POs/Settings are PlaceholderScreen in current build.
// Tests verify the placeholder renders correctly and the module is accessible.

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Inventory — placeholder screen', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Inventory")');
    await expect(page.locator('.page-title')).toContainText('Inventory');
  });

  test('page loads with Inventory title', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Inventory');
  });

  test('breadcrumb shows Stock / Inventory', async ({ page }) => {
    await expect(page.locator('.crumbs')).toContainText('Stock');
    await expect(page.locator('.crumbs')).toContainText('Inventory');
  });

  test('placeholder notice renders', async ({ page }) => {
    await expect(page.locator('.placeholder-screen')).toBeVisible();
  });

  test('can navigate back to Dashboard from Inventory', async ({ page }) => {
    await page.click('.nav-item:has-text("Dashboard")');
    await expect(page.locator('.page-title')).toContainText('Dashboard');
  });

  test('can navigate to Inventory from Sales', async ({ page }) => {
    await page.click('.nav-item:has-text("Sales")');
    await page.click('.nav-item:has-text("Inventory")');
    await expect(page.locator('.page-title')).toContainText('Inventory');
  });

  test('Inventory nav item has active class when on Inventory screen', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Inventory');
  });
});
