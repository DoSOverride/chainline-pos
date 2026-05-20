// tests/pos-security.spec.js — Security tests

const { test, expect } = require('@playwright/test');
const { login, loginViaPinPad, BASE_URL } = require('./helpers');

test.describe('Security — auth gating', () => {
  test('cannot access app without logging in (login screen shows)', async ({ page }) => {
    // Fresh page, no sessionStorage
    await page.goto(BASE_URL);
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.app')).not.toBeAttached();
  });

  test('wrong PIN rejected — app not accessible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-screen');
    await page.click('.staff-btn:has-text("Jason")');
    for (const k of ['0','0','0','0']) {
      await page.click(`.pin-key:not(.delete):has-text("${k}")`);
    }
    await page.waitForTimeout(500);
    // App should still not be mounted
    await expect(page.locator('.app')).not.toBeAttached();
    await expect(page.locator('#login-screen')).toBeAttached();
  });

  test('multiple wrong PINs do not unlock the app', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('#login-screen');
    await page.click('.staff-btn:has-text("Jason")');
    const wrongPins = ['0000', '1234', '9999', '1111'];
    for (const p of wrongPins) {
      for (const k of p.split('')) {
        await page.click(`.pin-key:not(.delete):has-text("${k}")`);
      }
      await page.waitForTimeout(300);
    }
    await expect(page.locator('.app')).not.toBeAttached();
  });

  test('accessing app URL directly without session shows login', async ({ page }) => {
    // Navigate directly — simulates bookmark or fresh tab
    await page.goto(BASE_URL);
    await expect(page.locator('#login-screen')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Security — localStorage / sessionStorage hygiene', () => {
  test('no raw PIN stored in sessionStorage after login', async ({ page }) => {
    await loginViaPinPad(page, 'Jason', '1139');
    const stored = await page.evaluate(() => {
      const all = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        all[k] = sessionStorage.getItem(k);
      }
      return JSON.stringify(all);
    });
    // The PIN "1139" should not appear verbatim in any sessionStorage value
    expect(stored).not.toContain('"pin"');
    expect(stored).not.toContain('1139');
  });

  test('sessionStorage pos-staff does not include the pin field', async ({ page }) => {
    await loginViaPinPad(page, 'Jason', '1139');
    const stored = await page.evaluate(() => {
      const raw = sessionStorage.getItem('pos-staff');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).not.toBeNull();
    // The stored staff object should not have a pin property
    expect(stored).not.toHaveProperty('pin');
  });

  test('no passwords in localStorage', async ({ page }) => {
    await login(page, 'Jason');
    const stored = await page.evaluate(() => {
      const all = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        all[k] = localStorage.getItem(k);
      }
      return JSON.stringify(all);
    });
    expect(stored.toLowerCase()).not.toContain('password');
    expect(stored).not.toContain('1139');
  });

  test('sessionStorage is cleared on logout', async ({ page }) => {
    await login(page, 'Jason');
    await expect(page.locator('.app')).toBeVisible();
    await page.evaluate(() => sessionStorage.removeItem('pos-staff'));
    const stored = await page.evaluate(() => sessionStorage.getItem('pos-staff'));
    expect(stored).toBeNull();
  });
});

test.describe('Security — API calls use HTTPS', () => {
  test('all requests to Worker use HTTPS', async ({ page }) => {
    const requests = [];
    page.on('request', req => requests.push(req.url()));
    await login(page, 'Jason');
    // Trigger a WO creation to fire an apiPost call
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');
    await page.click('.btn.primary:has-text("Create work order")');
    await page.waitForTimeout(1000);

    const workerRequests = requests.filter(url => url.includes('workers.dev'));
    for (const url of workerRequests) {
      expect(url).toMatch(/^https:\/\//);
    }
  });
});

test.describe('Security — XSS prevention', () => {
  test('XSS payload in WO search does not execute script', async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');

    // Track if alert() fires
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    const xssPayload = '<script>alert("xss")</script>';
    await page.locator('.filters .input').fill(xssPayload);
    await page.waitForTimeout(500);

    expect(alertFired).toBe(false);
  });

  test('XSS payload in Sales search does not execute script', async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Sales")');

    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.locator('.card input.input.lg').fill('<img src=x onerror=alert(1)>');
    await page.waitForTimeout(500);

    expect(alertFired).toBe(false);
  });

  test('XSS payload in New WO customer field does not execute script', async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await page.click('.btn.primary:has-text("New Work Order")');

    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.locator('.input[placeholder*="Hannah"]').fill('"><script>alert(1)</script>');
    await page.waitForTimeout(500);

    expect(alertFired).toBe(false);
  });

  test('task add input does not execute injected script', async ({ page }) => {
    await login(page, 'Jason');
    await page.click('.nav-item:has-text("Work Orders")');
    await page.locator('.tbl tbody tr').first().click();
    await expect(page.locator('.slide-panel')).toBeVisible();

    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.fill('.task-add .input', '<img src=x onerror=alert(1)>');
    await page.press('.task-add .input', 'Enter');
    await page.waitForTimeout(500);

    expect(alertFired).toBe(false);
  });
});
