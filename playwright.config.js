module.exports = {
  testDir: './tests',
  testMatch: [
    'pos.spec.js',
    'pos-login.spec.js',
    'pos-workorders.spec.js',
    'pos-sales.spec.js',
    'pos-inventory.spec.js',
    'pos-customers.spec.js',
    'pos-reports.spec.js',
    'pos-purchase-orders.spec.js',
    'pos-settings.spec.js',
    'pos-keyboard.spec.js',
    'pos-offline.spec.js',
    'pos-mobile.spec.js',
    'pos-security.spec.js',
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    headless: true,
    // Retry network-dependent tests on flakiness
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  reporter: 'list',
  // Retry once on CI
  retries: process.env.CI ? 1 : 0,
  // Run spec files in parallel; tests within a file run serially
  workers: process.env.CI ? 2 : undefined,
};
