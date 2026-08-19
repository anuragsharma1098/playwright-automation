import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface SearchCriteriaFromUrl {
  checkIn: string | null;
  checkOut: string | null;
  adults: string | null;
  locationId: string | null;
}

/** The /listings results page: filters, sort, and the property card grid. Filters, sort, and the
 * grid itself are identical DOM/behavior on both sites (same Flow One platform); the one
 * confirmed exception is the property-name element, which differs by site (see
 * `SiteConfig.cardNameSelector`). */
export class SearchResultsPage extends BasePage {
  private get cardNames() {
    return this.page.locator(this.site.cardNameSelector);
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
    await this.page.getByRole('button', { name: 'Apply', exact: true }).click();
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

    await this.page.getByLabel('Sort').click();
    await this.page.getByText(optionLabel, { exact: true }).click();

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
