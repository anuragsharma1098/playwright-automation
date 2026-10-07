import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface SearchCriteriaFromUrl {
  checkIn: string | null;
  checkOut: string | null;
  adults: string | null;
  locationId: string | null;
}

/** What a results card shows, read from its visible text. `rating` is null for "No reviews yet". */
export interface PropertyCardSummary {
  name: string;
  rating: number | null;
  reviewCount: number;
  bedrooms: number | null;
}

/** The /listings results page: filters, sort, and the property card grid. Filters, sort, and the
 * grid itself are identical DOM/behavior on both sites (same Flow One platform); the one
 * confirmed exception is the property-name element, which differs by site (see
 * `SiteConfig.cardNameSelector`). */
export class SearchResultsPage extends BasePage {
  private get cardNames() {
    return this.page.locator(this.site.cardNameSelector);
  }

  async goto(query = ''): Promise<void> {
    await this.open(`/listings${query}`);
  }

  /** Every card on every site carries `aria-label="Property card <name>"` (confirmed live). */
  get propertyCards() {
    return this.page.locator('[aria-label^="Property card "]');
  }

  get filtersButton() {
    return this.page.getByRole('button', { name: 'Filters', exact: true });
  }

  /** Exact match matters: a plain `getByLabel('Sort')` substring-matches GoodLife cards such as
   * "Property card Bahama Bay Resort 34407" (confirmed live - strict-mode violation). */
  get sortControl() {
    return this.page.getByLabel('Sort', { exact: true });
  }

  get pagination() {
    return this.page.getByRole('navigation', { name: 'Pagination' });
  }

  get nextPageButton() {
    return this.pagination.getByRole('button', { name: 'Next Page' });
  }

  get currentPageButton() {
    return this.pagination.getByRole('button', { name: /current page/ });
  }

  get showMapButton() {
    return this.page.getByRole('button', { name: 'Show Map' });
  }

  get hideMapButton() {
    return this.page.getByRole('button', { name: 'Hide Map' });
  }

  get map() {
    return this.page.getByRole('region', { name: 'Map' });
  }

  /** A Show Map click that lands before the page hydrates is silently dropped (confirmed live on
   * Alice and GoodLife), so this re-clicks until the toggle actually flips to "Hide Map". */
  async showMap(): Promise<void> {
    await expect(async () => {
      if (await this.showMapButton.isVisible()) {
        await this.showMapButton.click({ timeout: 5000 });
      }
      await expect(this.hideMapButton).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 30_000 });
  }

  urlParam(name: string): string | null {
    return new URL(this.page.url()).searchParams.get(name);
  }

  /** Reads name/rating/review count/bedrooms off each card. Bedroom markup differs by site
   * (confirmed live): Alice puts it in an icon's `aria-label="3 Beds"`; Firesky writes
   * "3 bedrooms"; GoodLife shows a bare "3" beside a `role="img" aria-label="Bedrooms"` icon.
   * Ratings read "5.0 (8 reviews)" on Alice and "4.9 (26)" elsewhere. */
  async getCardSummaries(): Promise<PropertyCardSummary[]> {
    await this.waitForResultsToSettle();
    return this.propertyCards.evaluateAll((cards) =>
      cards.map((card) => {
        const text = (card as HTMLElement).innerText.replace(/\s+/g, ' ');
        const rating = text.match(/(\d\.\d)\s*\(\s*(\d+)/);
        const bedsLabel = [...card.querySelectorAll('[aria-label]')]
          .map((el) => el.getAttribute('aria-label') ?? '')
          .find((label) => /^\d+(\.\d+)? Beds$/.test(label));
        const bedsIconHolder =
          card.querySelector('[aria-label="Bedrooms"]')?.parentElement?.parentElement;
        const beds =
          bedsLabel?.match(/^(\d+)/) ??
          text.match(/(\d+) bedrooms?/i) ??
          bedsIconHolder?.textContent?.trim().match(/^(\d+)/);
        return {
          name: (card.getAttribute('aria-label') ?? '').replace(/^Property card /, ''),
          rating: rating ? Number(rating[1]) : null,
          reviewCount: rating ? Number(rating[2]) : 0,
          bedrooms: beds ? Number(beds[1]) : null,
        };
      }),
    );
  }

  /** Clicks "Next Page" and waits until the URL and the first card have both moved on. */
  async goToNextPage(): Promise<void> {
    const firstBefore = await this.propertyCards.first().getAttribute('aria-label');
    const nextPage = Number(this.urlParam('page') ?? '1') + 1;
    await this.nextPageButton.click();
    await this.page.waitForURL(new RegExp(`[?&]page=${nextPage}\\b`), { timeout: 15_000 });
    await expect(this.propertyCards.first())
      .not.toHaveAttribute('aria-label', firstBefore ?? '', { timeout: 20_000 })
      .catch(() => {});
  }

  /** Waits for the results grid to finish its initial async load. A brand-new /listings
   * navigation renders 0 cards for a moment while the search request is in flight, so callers
   * must not read the count until either a card or nothing (0 results) has settled. */
  private async waitForResultsToSettle(): Promise<void> {
    await this.cardNames
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => {});
  }

  async getResultNames(): Promise<string[]> {
    await this.waitForResultsToSettle();
    return this.cardNames.allTextContents();
  }

  async getResultCount(): Promise<number> {
    await this.waitForResultsToSettle();
    return this.cardNames.count();
  }

  /** Parses the criteria the results page was loaded with, straight from the URL, so tests can
   * assert search inputs actually took effect without re-deriving them from the UI. */
  criteriaFromUrl(): SearchCriteriaFromUrl {
    const url = new URL(this.page.url());
    return {
      checkIn: url.searchParams.get('checkIn'),
      checkOut: url.searchParams.get('checkOut'),
      adults: url.searchParams.get('adults'),
      locationId: url.searchParams.get('locationId'),
    };
  }

  // --- Filters ---

  async openFilters(): Promise<void> {
    await this.page.getByRole('button', { name: 'Filters' }).click();
    await this.page.getByText('Bedrooms', { exact: true }).waitFor({ state: 'visible' });
  }

  async incrementBedrooms(times = 1): Promise<void> {
    const increment = this.page.getByRole('button', { name: 'Increase bedrooms' });
    for (let i = 0; i < times; i += 1) {
      await increment.click();
    }
  }

  async togglePetFriendly(): Promise<void> {
    await this.page.getByRole('switch').click();
  }

  async applyFilters(): Promise<void> {
    // Both sites keep at least one background connection open (analytics/polling), so
    // 'networkidle' never resolves here - a bounded settle wait is used instead.
    const countBefore = await this.cardNames.count();
    const urlBefore = this.page.url();
    await this.page.getByRole('button', { name: 'Apply', exact: true }).click();
    // Applied filters are written to the URL (e.g. `bedrooms=3`, confirmed live) - the earliest
    // signal that the new search has been issued, even when the card count doesn't change.
    await this.page
      .waitForURL((url) => url.toString() !== urlBefore, { timeout: 8000 })
      .catch(() => {});
    await this.page
      .waitForFunction(
        ({ selector, prev }) => document.querySelectorAll(selector).length !== prev,
        { selector: this.site.cardNameSelector, prev: countBefore },
        { timeout: 8000 },
      )
      .catch(() => {});
    await this.waitForResultsToSettle();
  }

  // --- Sort ---

  async sortBy(optionLabel: string): Promise<void> {
    const firstNameBefore = await this.cardNames
      .first()
      .textContent()
      .catch(() => null);

    const urlBefore = this.page.url();
    await this.sortControl.click();
    await this.page.getByText(optionLabel, { exact: true }).click();
    // The chosen sort lands in the URL (e.g. `sort=most-reviewed`, confirmed live) - on Alice only
    // after 10s+ at times, by which point the dropdown already shows the new choice.
    await this.page
      .waitForURL((url) => url.toString() !== urlBefore, { timeout: 20_000 })
      .catch(() => {});

    // The list re-fetches and re-renders after choosing a sort option; wait for that to actually
    // finish (not just a fixed delay) before any caller reads result names/order. A changed first
    // item is the strongest available signal; if it stays the same (a legitimately possible
    // outcome), fall back to a short bounded settle instead of hanging.
    if (firstNameBefore) {
      await expect(this.cardNames.first())
        .not.toHaveText(firstNameBefore, { timeout: 6000 })
        .catch(() => {});
    }
    await this.waitForResultsToSettle();
    await this.waitForNameListToStabilize();
  }

  /** The grid can still be mid-render for a moment right after the first card updates (cards swap
   * progressively, not all at once) - polls the full name list until two reads in a row agree. */
  private async waitForNameListToStabilize(maxWaitMs = 4000): Promise<void> {
    const step = 200;
    let previous = await this.cardNames.allTextContents();
    for (let elapsed = 0; elapsed < maxWaitMs; elapsed += step) {
      await this.page.waitForTimeout(step);
      const current = await this.cardNames.allTextContents();
      if (JSON.stringify(current) === JSON.stringify(previous)) return;
      previous = current;
    }
  }

  async openFirstResult(): Promise<void> {
    await this.page.locator('a[href*="/listings/"]').first().click();
  }

  /** Deduplicated property detail links (each card renders 2-3 anchors to the same href). */
  async getResultHrefs(limit?: number): Promise<string[]> {
    await this.waitForResultsToSettle();
    const hrefs = await this.page
      .locator('a[href*="/listings/"]')
      .evaluateAll((anchors) =>
        anchors.map((a) => a.getAttribute('href')).filter((h): h is string => !!h),
      );
    const unique = [...new Set(hrefs.map((h) => h.split('#')[0]))];
    return limit ? unique.slice(0, limit) : unique;
  }
}
