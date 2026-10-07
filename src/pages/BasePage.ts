import type { Page, Response } from '@playwright/test';
import type { SiteConfig } from '@src/config/sites';
import { settleOverlays } from '@src/utils/overlays';

export abstract class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly site: SiteConfig,
  ) {}

  /**
   * Navigates to a path on the current site and waits out the delayed marketing overlay.
   *
   * Confirmed live: `load` is the reliable "app has hydrated" signal - clicks fired before it
   * (pagination, Show Map) are silently dropped. But Alice's image-heavy pages were also observed
   * to take 13s to 30s+ to fire `load`, which used to fail whole tests at the 30s navigation
   * timeout. So navigation itself only waits for the DOM, and `load` is then awaited with a
   * bounded, non-fatal timeout before the overlay settle window.
   */
  async open(path = '/'): Promise<Response | null> {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
    await settleOverlays(this.page);
    return response;
  }

  get footer() {
    return this.page.locator('footer');
  }
}
