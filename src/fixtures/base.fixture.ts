import { test as base } from '@playwright/test';
import { siteConfigs, type SiteConfig, type SiteName } from '@src/config/sites';
import { HomePage } from '@src/pages/HomePage';
import { ListWithUsPage } from '@src/pages/ListWithUsPage';
import { PropertyDetailsPage } from '@src/pages/PropertyDetailsPage';
import { SearchResultsPage } from '@src/pages/SearchResultsPage';

/** Custom Playwright config option, set per-project in playwright.config.ts (`use: { site: ... }`). */
export interface TestOptions {
  site: SiteName;
}

interface Fixtures {
  siteConfig: SiteConfig;
  home: HomePage;
  results: SearchResultsPage;
  property: PropertyDetailsPage;
  listWithUs: ListWithUsPage;
}

/**
 * Every spec file imports `test`/`expect` from here instead of '@playwright/test'. The `site`
 * project option determines which SiteConfig and pre-wired page objects a test receives, so the
 * same spec runs unmodified against every project (site) declared in playwright.config.ts.
 */
export const test = base.extend<TestOptions & Fixtures>({
  site: ['alice', { option: true }],

  siteConfig: async ({ site }, use) => {
    await use(siteConfigs[site]);
  },

  home: async ({ page, siteConfig }, use) => {
    await use(new HomePage(page, siteConfig));
  },

  results: async ({ page, siteConfig }, use) => {
    await use(new SearchResultsPage(page, siteConfig));
  },

  property: async ({ page, siteConfig }, use) => {
    await use(new PropertyDetailsPage(page, siteConfig));
  },

  listWithUs: async ({ page, siteConfig }, use) => {
    await use(new ListWithUsPage(page, siteConfig));
  },
});

export { expect } from '@playwright/test';
