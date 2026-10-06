const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BACKEND_ENV } = require('./env.cjs');

const BACKEND = path.join(__dirname, '..', 'backend');
const FRONTEND = path.join(__dirname, '..', 'frontend');

// The backend runs with offline.cjs preloaded (same stub the DB tests use):
// outbound fetch is blocked, so geocoding falls back to the offline postal-
// code centroids and the delivery-fee calc is deterministic.
module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup.cjs'),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node --require ${JSON.stringify(path.join(BACKEND, 'tests', 'integration', 'offline.cjs'))} server.js`,
      cwd: BACKEND,
      env: { ...process.env, ...BACKEND_ENV },
      url: 'http://localhost:5000/api/health',
      timeout: 60_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: FRONTEND,
      env: { ...process.env, VITE_API_URL: 'http://localhost:5000' },
      url: 'http://localhost:5173',
      timeout: 60_000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
