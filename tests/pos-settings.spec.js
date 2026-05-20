// tests/pos-settings.spec.js — Settings screen tests
// Settings is a PlaceholderScreen in current build.

const { test, expect } = require('@playwright/test');
const { login, BASE_URL } = require('./helpers');

test.describe('Settings — navigation and placeholder', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Settings")');
    await expect(page.locator('.page-title')).toContainText('Settings');
  });

  test('Settings page accessible from sidebar', async ({ page }) => {
    await expect(page.locator('.page-title')).toContainText('Settings');
  });

  test('breadcrumb shows Tools / Settings', async ({ page }) => {
    await expect(page.locator('.crumbs')).toContainText('Tools');
    await expect(page.locator('.crumbs')).toContainText('Settings');
  });

  test('Settings nav item is active', async ({ page }) => {
    await expect(page.locator('.nav-item.active')).toContainText('Settings');
  });

  test('placeholder module notice renders', async ({ page }) => {
    await expect(page.locator('.placeholder-screen')).toBeVisible();
  });

  test('can navigate from Settings back to Dashboard', async ({ page }) => {
    await page.click('.nav-item:has-text("Dashboard")');
    await expect(page.locator('.page-title')).toContainText('Dashboard');
  });
});

test.describe('Settings — sidebar user meta (all staff)', () => {
  // Verify all 9 staff show their correct info in sidebar after login
  const cases = [
    { name: 'Jason',   role: 'Warranty' },
    { name: 'Matt',    role: 'Manager'  },
    { name: 'Darrin',  role: 'Owner'    },
    { name: 'Tao',     role: 'Manager'  },
    { name: 'Beckett', role: 'Mechanic' },
  ];

  for (const { name, role } of cases) {
    test(`${name} login shows name and role in sidebar`, async ({ page }) => {
      const { login: loginFn } = require('./helpers');
      await loginFn(page, name);
      await expect(page.locator('.user-name')).toContainText(name);
      await expect(page.locator('.user-role')).toContainText(role);
    });
  }
});
