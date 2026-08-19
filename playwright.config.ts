import { defineConfig } from '@playwright/test';
import { siteConfigs } from './src/config/sites';
import type { TestOptions } from './src/fixtures/base.fixture';

export default defineConfig<TestOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Capped deliberately (not left to Playwright's CPU-core default): these are two live
  // production sites we don't control, not a local server - too much concurrency was observed
  // live to cause its own timeouts/rate-limit-style slowdowns rather than exercising real bugs.
  // Also simple courtesy - this suite shouldn't behave like a load test against someone's site.
  workers: process.env.CI ? 2 : 4,
  // Real production sites over the open internet, plus a deliberate settle-and-dismiss window for
  // the marketing popup on every navigation - generous headroom keeps that from reading as flake.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results', suiteTitle: false }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'alice-lodging',
      use: { baseURL: siteConfigs.alice.baseURL, site: 'alice' },
    },
    {
      name: 'firesky-retreats',
      use: { baseURL: siteConfigs.firesky.baseURL, site: 'firesky' },
    },
  ],
});
