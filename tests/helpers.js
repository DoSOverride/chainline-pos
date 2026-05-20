// tests/helpers.js — shared login helper for ChainLine POS tests
// PIN 1139 is shared by all 9 staff members.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

/**
 * Seed sessionStorage directly so tests skip the PIN UI.
 * Faster and more reliable than clicking through the PIN pad every test.
 */
async function login(page, staffName = 'Jason', pin = '1139') {
  // Navigate first so we have a page context to set sessionStorage on
  await page.goto(BASE_URL);

  // Inject staff session directly — mirrors what LoginScreen does on success
  await page.evaluate((name) => {
    const STAFF = [
      { id: 1,  name: 'Jason',   initials: 'JA', pin: '1139', role: 'Warranty', tone: 'ja' },
      { id: 5,  name: 'Phil',    initials: 'PH', pin: '1139', role: 'Mechanic', tone: 'ph' },
      { id: 6,  name: 'Steve',   initials: 'ST', pin: '1139', role: 'Mechanic', tone: 'st' },
      { id: 7,  name: 'Matt',    initials: 'MA', pin: '1139', role: 'Manager',  tone: 'ma' },
      { id: 8,  name: 'Darrin',  initials: 'DA', pin: '1139', role: 'Owner',    tone: 'da' },
      { id: 9,  name: 'Tao',     initials: 'TC', pin: '1139', role: 'Manager',  tone: 'tc' },
      { id: 10, name: 'Beckett', initials: 'BE', pin: '1139', role: 'Mechanic', tone: 'be' },
      { id: 11, name: 'Curren',  initials: 'CU', pin: '1139', role: 'Mechanic', tone: 'cu' },
      { id: 12, name: 'Danny',   initials: 'DN', pin: '1139', role: 'Mechanic', tone: 'dn' },
    ];
    const match = STAFF.find(s => s.name === name) || STAFF[0];
    sessionStorage.setItem('pos-staff', JSON.stringify(match));
  }, staffName);

  // Reload so React reads the seeded sessionStorage and skips login screen
  await page.reload();
  await page.waitForSelector('.app', { timeout: 8000 });
}

/**
 * Use the actual PIN pad UI — for tests that specifically test auth flow.
 */
async function loginViaPinPad(page, staffName = 'Jason', pin = '1139') {
  await page.goto(BASE_URL);
  await page.waitForSelector('#login-screen', { timeout: 10000 });
  await page.click(`.staff-btn:has-text("${staffName}")`);
  for (const digit of pin.split('')) {
    await page.click(`.pin-key:not(.delete):has-text("${digit}")`);
  }
  await page.waitForSelector('.app', { timeout: 8000 });
}

module.exports = { login, loginViaPinPad, BASE_URL };
