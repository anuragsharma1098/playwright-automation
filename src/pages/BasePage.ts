import type { Page } from '@playwright/test';
import type { SiteConfig } from '@src/config/sites';
import { settleOverlays } from '@src/utils/overlays';

export abstract class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly site: SiteConfig,
  ) {}

  /** Navigates to a path on the current site and waits out the delayed marketing overlay. */
  async open(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'load' });
    await settleOverlays(this.page);
  }

  get footer() {
    return this.page.locator('footer');
  }
}
