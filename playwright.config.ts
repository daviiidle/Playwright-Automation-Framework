import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : 1,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
    ['./src/reporters/ErrorOnlyReporter.ts', { outputDir: 'test-results/error-logs' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://demowebshop.tricentis.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20000,
    navigationTimeout: 60000,
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    launchOptions: {
      slowMo: 100,
    },
    contextOptions: {
      permissions: [],
      geolocation: undefined,
      locale: 'en-US',
      timezoneId: 'America/New_York',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile browsers (uncomment if needed for your test scenarios)
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'echo "Using external demo site"',
    port: 3000,
    reuseExistingServer: true,
  },
});