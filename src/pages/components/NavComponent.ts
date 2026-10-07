import type { Page } from '@playwright/test';
import type { SiteConfig } from '@src/config/sites';
import { settleOverlays } from '@src/utils/overlays';

/**
 * TC4 must drive "a destination or category navigation component" on every site even though the
 * sites implement it completely differently (confirmed live):
 *  - Alice: a "Destinations" nav button opens a popover listing both cities and collections.
 *  - GoodLife: destinations/categories are a row of pill tabs directly in the hero
 *    (Beach Front / Pool / Group Homes / ...) that navigate straight to /category/{slug} - there
 *    is no popover to open. (Firesky had the same pills until its Oct 2026 redesign.)
 *  - Firesky: "Where Do You Want to Go?" destination tiles linking to city landing pages.
 * Rather than duplicating whole page objects per site, this single component branches on
 * `site.navStyle` (Template Method via composition): the public API is one method per site,
 * shared code lives in the property-link helper.
 */
export class NavComponent {
  constructor(
    private readonly page: Page,
    private readonly site: SiteConfig,
  ) {}

  private get propertyCardLink() {
    return this.page.locator('a[href*="/listings/"]').first();
  }

  /** Opens the destination/category navigation, confirms it is populated, follows it to a
   * landing page, then opens the first property found there. Returns the destination/category
   * label that was clicked, for the caller to assert against. */
  async browseToPropertyViaDestinationNav(): Promise<string> {
    switch (this.site.navStyle) {
      case 'destinationDropdown':
        return this.browseViaDestinationDropdown();
      case 'destinationTiles':
        return this.browseViaDestinationTiles();
      default:
        return this.browseViaCategoryPills();
    }
  }

  /** Firesky (since its Oct 2026 redesign): "Where Do You Want to Go?" hero tiles, each an `<a>`
   * wrapping an image and an `<h3>` city name, linking to a /{city}-vacation-rentals landing page
   * of property cards. Matched by the tile's heading - a plain link-name lookup also hits property
   * cards whose text contains "Scottsdale, Arizona" (confirmed live). */
  private async browseViaDestinationTiles(): Promise<string> {
    const label = this.site.navDestinationTileLabel!;
    const tile = this.page
      .locator('a')
      .filter({ has: this.page.getByRole('heading', { name: label, exact: true, level: 3 }) })
      .first();
    if (!(await tile.count())) {
      throw new Error(`Destination tile "${label}" was not found on the homepage`);
    }

    // The tiles sit in an auto-scrolling carousel (confirmed live: Playwright reports the tile as
    // "not stable" / "outside of the viewport" while it moves), so a coordinate-based click can't
    // land reliably. Dispatching the click on the <a> itself still runs the link's own navigation.
    await tile.dispatchEvent('click');
    await this.page.waitForURL((url) => url.pathname !== '/', {
      timeout: 15000,
      waitUntil: 'domcontentloaded',
    });
    await settleOverlays(this.page);

    await this.propertyCardLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.propertyCardLink.click();
    return label;
  }

  private async browseViaDestinationDropdown(): Promise<string> {
    const menuButtonLabel = this.site.navMenuButtonLabel!;
    await this.page.getByRole('button', { name: menuButtonLabel }).click();

    const links = this.page.locator('[id^="headlessui-popover-panel"] a, [role="dialog"] a');
    const linkCount = await links.count();
    if (linkCount === 0) {
      throw new Error(`"${menuButtonLabel}" nav opened but revealed no destination links`);
    }

    // Scoped to the open popover panel specifically - "Palm Springs" etc. also appear as
    // decorative homepage carousel captions elsewhere on the page, which an unscoped page-wide
    // locator could match instead of the actual nav link.
    const target = links.filter({ hasText: this.site.validDestination }).first();
    await target.click();
    await this.page.waitForLoadState('load');
    await settleOverlays(this.page);

    await this.propertyCardLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.propertyCardLink.click();
    return this.site.validDestination;
  }

  private async browseViaCategoryPills(): Promise<string> {
    const categoryLabel = this.site.navCategoryLabel!;
    const pills = this.page.locator('a, button').filter({
      hasText: /^(For You|Pool|Group Homes|Pet Friendly|Premium Stays|Long Term Stay|Value Stay)$/,
    });
    const pillCount = await pills.count();
    if (pillCount === 0) {
      throw new Error('Category navigation pills were not found on the homepage');
    }

    await this.page.getByText(categoryLabel, { exact: true }).click();
    await this.page.waitForURL(/\/category\//, { timeout: 10000 });
    await settleOverlays(this.page);

    await this.propertyCardLink.waitFor({ state: 'visible', timeout: 20000 });
    await this.propertyCardLink.click();
    return categoryLabel;
  }
}
