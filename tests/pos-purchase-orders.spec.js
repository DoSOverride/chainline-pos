// tests/pos-purchase-orders.spec.js — Purchase Orders screen tests
// Purchase Orders is a PlaceholderScreen in current build.
// Tests verify navigation and placeholder render.

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Purchase Orders — navigation and placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Purchase Orders")');
    await expect(page.locator('.page-title')).toContainText('Purchase Orders');
  });

  test('Purchase Orders page loads with correct title', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Purchase Orders');
  });

  test('breadcrumb shows Tools / Purchase Orders', async ({ page }) => {
    await expect(page.locator('.crumbs')).toContainText('Tools');
    await expect(page.locator('.crumbs')).toContainText('Purchase Orders');
  });

  test('Purchase Orders nav item is active', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Purchase Orders');
  });

  test('placeholder notice visible', async ({ page }) => {
    await expect(page.locator('.placeholder-screen')).toBeVisible();
  });

  test('can navigate back to Dashboard', async ({ page }) => {
    await page.click('.nav-item:has-text("Dashboard")');
    await expect(page.locator('.page-title')).toContainText('Dashboard');
  });

  test('can navigate to Purchase Orders from Customers', async ({ page }) => {
    await page.click('.nav-item:has-text("Customers")');
    await page.click('.nav-item:has-text("Purchase Orders")');
    await expect(page.locator('.page-title')).toContainText('Purchase Orders');
  });
});
