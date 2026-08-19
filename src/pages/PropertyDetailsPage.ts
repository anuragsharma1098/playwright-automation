import { BasePage } from './BasePage';

export interface BookingWidgetSummary {
  arrivalISO: string | null;
  departureISO: string | null;
  adults: number | null;
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
