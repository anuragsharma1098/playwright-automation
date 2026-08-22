import { defineConfig, devices } from '@playwright/test';
import { siteConfigs } from './src/config/sites';
import type { TestOptions } from './src/fixtures/base.fixture';

// One entry per browser to cross with every site below. Edge is Chromium-based but needs the
// 'msedge' channel explicitly - devices['Desktop Edge'] alone only changes the UA string.
const browsers = [
  { name: 'chromium', use: devices['Desktop Chrome'] },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  { name: 'webkit', use: devices['Desktop Safari'] },
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
];

export default defineConfig<TestOptions>({
  testDir: './tests',
  testIgnore: ['**/demo-intentional-failure.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // These are live production sites we do not control. Firefox is especially sensitive to
  // parallel load here, and the intentional demo failure should never run in the normal suite.
  workers: process.env.CI ? 1 : 1,
  // Real production sites over the open internet, plus a deliberate settle-and-dismiss window for
  // the marketing popup on every navigation - generous headroom keeps that from reading as flake.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: false }],
    ['junit', { outputFile: 'test-results/junit-report.xml' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  // Cross product of every site in siteConfigs with every browser above, e.g. 'alice-firefox'.
  // Adding a third site or browser is a one-line change to siteConfigs or `browsers`, not a new
  // block here.
  projects: Object.values(siteConfigs).flatMap((site) =>
    browsers.map((browser) => ({
      name: `${site.name}-${browser.name}`,
      use: { ...browser.use, baseURL: site.baseURL, site: site.name },
    })),
  ),
});
