const path = require('node:path');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

module.exports = {
  testDir: __dirname,
  testMatch: '**/*.spec.cjs',
  workers: 1,
  reporter: 'list',
  outputDir: '../work/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4174/skaf/',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: executablePath ? { executablePath } : {}
  },
  webServer: {
    cwd: path.resolve(__dirname, '..'),
    command: 'node scripts/serve.cjs --port 4174',
    url: 'http://127.0.0.1:4174/skaf/',
    reuseExistingServer: !process.env.CI,
    timeout: 10000
  }
};
