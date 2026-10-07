import { stayQuery, type StayDates } from '@src/utils/dates';
import { BasePage } from './BasePage';

export interface BookingWidgetSummary {
  arrivalISO: string | null;
  departureISO: string | null;
  adults: number | null;
}

/** The booking widget's quote, e.g. "$427 X 4 nights  $1706 / Booking-Fee $237 / ... /
 * Total before taxes $2496". `lineItems` excludes the total itself. */
export interface PriceBreakdown {
  nightlyRate: number;
  nights: number;
  lineItems: { label: string; amount: number }[];
  totalBeforeTaxes: number;
}

/** "$1,706" / "$1706.00" -> 1706 */
export function parseMoney(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ''));
}

/** "/listings/abc?checkIn=...#unitReviews" -> "/listings/abc" */
export function listingPath(href: string): string {
  return href.split(/[?#]/)[0];
}

/** The id (Alice) or slug (Firesky/GoodLife) that /booking expects as `unitId`. */
export function unitIdFromHref(href: string): string {
  return listingPath(href).split('/').filter(Boolean).pop() ?? '';
}

interface VacationRentalSchema {
  name?: string;
  numberOfBedrooms?: number;
  numberOfBathroomsTotal?: number;
  maximumAttendeeCapacity?: number;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
  };
}

/**
 * The /listings/{id} property detail page.
 *
 * Confirmed live: the *presentational* markup around the title (address line position, guest
 * capacity badge casing/wrapper) differs between the two sites enough to make DOM-scraping
 * fragile. Both sites, however, publish an identical schema.org `VacationRental` JSON-LD block
 * (used for SEO) with the same fields on both - bedrooms, bathrooms, max capacity, and structured
 * address. Reading that instead of the visible DOM is both more robust (one shared shape, no
 * per-site selector branching) and arguably a *better* source of truth than parsing display text.
 */
export class PropertyDetailsPage extends BasePage {
  get name() {
    return this.page.locator('h1');
  }

  /** Opens a listing (any `/listings/...` href, query/hash ignored) for the given stay, so the
   * booking widget is pre-filled and quotes a price. */
  async openWithStay(listingHref: string, stay: StayDates, adults: number): Promise<void> {
    await this.open(`${listingPath(listingHref)}${stayQuery(stay, adults)}`);
    await this.name.waitFor({ state: 'visible' });
  }

  // --- Booking widget ---

  get bookNowButton() {
    return this.page.getByRole('button', { name: 'Book Now', exact: true });
  }

  get promoInput() {
    return this.page.getByRole('textbox', { name: 'Promo code' });
  }

  get promoError() {
    return this.page.getByText(/is not a valid promo code/);
  }

  get removePromoButton() {
    return this.page.getByRole('button', { name: 'Remove', exact: true });
  }

  /** The "$427 X 4 nights" line - only rendered once the quote for the selected dates loads. */
  get nightsLine() {
    return this.page.getByText(/^\$[\d,.]+ X \d+ nights?$/);
  }

  /** Waits for the quote first: an Apply clicked while the quote is still loading was observed
   * live (GoodLife) to produce no validation message at all. */
  async applyPromo(code: string): Promise<void> {
    await this.nightsLine.first().waitFor({ state: 'visible', timeout: 30_000 });
    await this.promoInput.fill(code);
    await this.page.getByRole('button', { name: 'Apply', exact: true }).click();
  }

  /** The quote is a flat run of label/amount `<p>` pairs between the nights line and "Total before
   * taxes" (same on all three sites, confirmed live), so it is read in document order rather
   * than through per-row selectors. */
  async getPriceBreakdown(): Promise<PriceBreakdown> {
    await this.nightsLine.first().waitFor({ state: 'visible', timeout: 30_000 });
    const texts = (await this.page.locator('p').allTextContents()).map((t) => t.trim());
    const start = texts.findIndex((t) => /^\$[\d,.]+ X \d+ nights?$/.test(t));
    const end = texts.indexOf('Total before taxes', start);
    if (start < 0 || end < 0) {
      throw new Error('Booking widget price breakdown not found on the property page');
    }
    const [, rate, nights] = texts[start].match(/^\$([\d,.]+) X (\d+) nights?$/)!;
    const lineItems: PriceBreakdown['lineItems'] = [];
    for (let i = start; i < end; i += 2) {
      lineItems.push({ label: texts[i], amount: parseMoney(texts[i + 1]) });
    }
    return {
      nightlyRate: parseMoney(rate),
      nights: Number(nights),
      lineItems,
      totalBeforeTaxes: parseMoney(texts[end + 1]),
    };
  }

  /** Clicks Book Now; the redirect to /booking is slow (~10s observed live). */
  async bookNow(): Promise<void> {
    await this.bookNowButton.click();
    await this.page.waitForURL(/\/booking\?/, { timeout: 45_000, waitUntil: 'domcontentloaded' });
  }

  // --- Content sections ---

  get showAllAmenitiesButton() {
    return this.page.getByRole('button', { name: 'Show all amenities' });
  }

  get amenitiesDialog() {
    return this.page.getByRole('dialog', { name: 'All Amenities' });
  }

  get closeAmenitiesButton() {
    return this.page.getByRole('button', { name: 'Close Amenities Window' });
  }

  get shareButton() {
    return this.page.getByRole('button', { name: 'Open share options' });
  }

  get shareDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: 'Close Share Window' }) });
  }

  get reviewPagination() {
    return this.page.getByRole('navigation', { name: 'Review pages' });
  }

  /** Alice's review pager uses buttons; Firesky/GoodLife use `<a href="?page=N">` links (confirmed
   * live), so either role is accepted. */
  reviewPageControl(pageNumber: number) {
    const name = `Page ${pageNumber}`;
    return this.reviewPagination
      .getByRole('button', { name, exact: true })
      .or(this.reviewPagination.getByRole('link', { name, exact: true }));
  }

  /** Reviewer names are the `<h4>`s inside the #unitReviews anchor section (confirmed live on all
   * three sites; scoping matters because "Cancellation Policy" is also an h4). */
  get reviewerNames() {
    return this.page.locator('#unitReviews h4');
  }

  async getStructuredData(): Promise<VacationRentalSchema | null> {
    const blocks = await this.page.locator('script[type="application/ld+json"]').allTextContents();
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
        const match = graph.find(
          (entry: { '@type'?: string }) => entry?.['@type'] === 'VacationRental',
        );
        if (match) return match as VacationRentalSchema;
      } catch {
        // not this block - keep looking
      }
    }
    return null;
  }

  async getGuestCapacity(): Promise<number> {
    const data = await this.getStructuredData();
    return data?.maximumAttendeeCapacity ?? Number.NaN;
  }

  async getLocality(): Promise<string | null> {
    const data = await this.getStructuredData();
    return data?.address?.addressLocality ?? null;
  }

  /** Reads the booking widget's Arrival/Departure/Guests controls, which are pre-filled from the
   * search query params - the single source of truth TC3 checks the search criteria against. */
  async getBookingWidgetSummary(): Promise<BookingWidgetSummary> {
    const dateTrigger = this.page.getByRole('button', { name: /Arrival on \d{4}-\d{2}-\d{2}/ });
    const dateAria = await dateTrigger.getAttribute('aria-label');
    const dateMatch = dateAria?.match(
      /Arrival on (\d{4}-\d{2}-\d{2}) Departure on (\d{4}-\d{2}-\d{2})/,
    );

    const guestsTrigger = this.page.getByRole('button', { name: /Select Guests: \d+ Adults/ });
    const guestsAria = await guestsTrigger.getAttribute('aria-label');
    const guestsMatch = guestsAria?.match(/Select Guests: (\d+) Adults/);

    return {
      arrivalISO: dateMatch?.[1] ?? null,
      departureISO: dateMatch?.[2] ?? null,
      adults: guestsMatch ? Number(guestsMatch[1]) : null,
    };
  }
}
