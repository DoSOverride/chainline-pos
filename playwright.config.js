module.exports = {
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'https://chainline-pos.pages.dev',
    headless: true,
  },
  reporter: 'list',
};
