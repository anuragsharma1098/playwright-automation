import type { Page } from '@playwright/test';
import type { SiteConfig } from '@src/config/sites';

/**
 * The site header ("Header Navigation Bar"). Confirmed live: Alice shows its links inline, while
 * Firesky and GoodLife hide them behind an "Open menu" hamburger whose panel is a Headless UI
 * popover (the button's `aria-controls` names the panel). Links are always looked up inside the
 * header or that panel - never page-wide, because the footer repeats several of them
 * (e.g. GoodLife's footer also has "Contact Us").
 */
export class HeaderComponent {
  constructor(
    private readonly page: Page,
    private readonly site: SiteConfig,
  ) {}

  get bar() {
    return this.page.getByRole('navigation', { name: 'Header Navigation Bar' });
  }

  /** Firesky/GoodLife render two home links in the bar, the first a hidden mobile logo (confirmed
   * live), so only the visible one counts. */
  get logoLink() {
    return this.bar.locator('a[href="/"]').filter({ visible: true }).first();
  }

  private get menuButton() {
    return this.bar.getByRole('button', { name: 'Open menu' });
  }

  /** Opens the hamburger panel on sites that have one; a no-op on inline-nav sites. */
  async revealLinks(): Promise<void> {
    if (
      this.site.headerNavStyle === 'hamburger' &&
      (await this.menuButton.getAttribute('aria-expanded')) !== 'true'
    ) {
      await this.menuButton.click();
    }
  }

  async link(name: string) {
    if (this.site.headerNavStyle === 'inline') {
      return this.bar.getByRole('link', { name, exact: true });
    }
    const panelId = await this.menuButton.getAttribute('aria-controls');
    return this.page.locator(`[id="${panelId}"]`).getByRole('link', { name, exact: true });
  }
}
