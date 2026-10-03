import type { Locator, Page } from '@playwright/test';

export interface SearchCriteria {
  destination: string;
  checkInISO: string;
  checkOutISO: string;
  adults: number;
}

/**
 * The search widget (destination -> dates -> guests -> submit) is byte-for-byte identical between
 * the two sites (same Headless UI-based combobox/calendar/popover components) - only the theme
 * differs. Confirmed quirks this component works around:
 *  - Selecting a destination auto-opens the arrival calendar; selecting a departure date
 *    auto-opens the guests popover. Explicitly clicking an already-open trigger toggles it
 *    *closed*, so every open call checks `aria-expanded` first.
 *  - Calendar day buttons expose their date as `Select YYYY-MM-DD, Weekday` in aria-label. If the
 *    target date isn't in the two-month view yet, "Next month" is clicked until it is.
 */
export class SearchWidgetComponent {
  constructor(private readonly page: Page) {}

  /** Confirmed live (Oct 2026): Firesky's redesigned hero names this combobox "Where", while Alice
   * and GoodLife still use "Where to next?". The only other combobox on any page (Alice's footer
   * "Search By Property") doesn't start with "Where", so one anchored pattern covers every site. */
  get destinationInput() {
    return this.page.getByRole('combobox', { name: /^Where/ });
  }

  private get arrivalTrigger() {
    return this.page.getByRole('button', { name: /Select Arrival Date/ });
  }

  get guestsTrigger() {
    return this.page.getByRole('button', { name: /Select Guests/ });
  }

  get searchButton() {
    return this.page.getByRole('button', { name: 'Search', exact: true });
  }

  get previousMonthButton() {
    return this.page.getByRole('button', { name: 'Previous month' });
  }

  /** Selectable calendar days are labelled `Select YYYY-MM-DD, Weekday`; past days carry no such
   * label at all (confirmed live), so a past date's locator resolves to zero elements. */
  dayButton(iso: string) {
    return this.page.getByRole('button', { name: `Select ${iso}` });
  }

  destinationOption(name: string) {
    return this.page.getByRole('option', { name, exact: true });
  }

  async typeDestination(text: string): Promise<void> {
    await this.destinationInput.click();
    await this.destinationInput.fill(text);
  }

  async selectDestination(destination: string): Promise<void> {
    await this.typeDestination(destination);
    await this.destinationOption(destination).click();
  }

  async openCalendar(): Promise<void> {
    await this.openIfClosed(this.arrivalTrigger);
  }

  async openGuests(): Promise<void> {
    await this.openIfClosed(this.guestsTrigger);
  }

  /** Clicks a guests-popover stepper; `delta` > 0 increments, < 0 decrements. */
  async adjustGuests(kind: 'adults' | 'children', delta: number): Promise<void> {
    await this.openGuests();
    const verb = delta > 0 ? 'Increment' : 'Decrement';
    const button = this.page.getByRole('button', { name: `${verb} ${kind}` });
    for (let i = 0; i < Math.abs(delta); i += 1) {
      await button.click();
    }
  }

  /** The guests trigger's aria-label, e.g. "Select Guests: 2 Adults 1 Children". */
  async guestsSummary(): Promise<string> {
    return ((await this.guestsTrigger.getAttribute('aria-label')) ?? '').trim();
  }

  private async openIfClosed(trigger: Locator): Promise<void> {
    const expanded = await trigger.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await trigger.click();
    }
  }

  async selectDates(checkInISO: string, checkOutISO: string): Promise<void> {
    await this.openIfClosed(this.arrivalTrigger);
    await this.clickCalendarDate(checkInISO);
    await this.clickCalendarDate(checkOutISO);
  }

  private async clickCalendarDate(iso: string): Promise<void> {
    const dayButton = this.page.getByRole('button', { name: `Select ${iso}` });
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await dayButton.count()) {
        await dayButton.click();
        return;
      }
      await this.page.getByRole('button', { name: 'Next month' }).click();
      await this.page.waitForTimeout(200);
    }
    throw new Error(`Calendar date ${iso} not reachable within 6 months of navigation`);
  }

  async setAdults(count: number): Promise<void> {
    await this.openIfClosed(this.guestsTrigger);
    const increment = this.page.getByRole('button', { name: 'Increment adults' });
    for (let i = 0; i < count; i += 1) {
      await increment.click();
    }
  }

  async submit(): Promise<void> {
    await this.searchButton.click();
  }

  /** Runs the full search flow end to end and waits for the listings page to load. */
  async search(criteria: SearchCriteria): Promise<void> {
    await this.selectDestination(criteria.destination);
    await this.selectDates(criteria.checkInISO, criteria.checkOutISO);
    if (criteria.adults > 0) {
      await this.setAdults(criteria.adults);
    }
    await this.submit();
    // waitForURL waits for `load` by default, which Alice's /listings was observed taking 15s+ to
    // fire; wait for the URL on DOM ready, then give `load` (hydration) a bounded, non-fatal window.
    await this.page.waitForURL(/\/listings\?/, { timeout: 30_000, waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
  }
}
