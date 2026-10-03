import { BasePage } from './BasePage';
import { parseMoney } from './PropertyDetailsPage';

export interface BookingRequest {
  /** The listing's id (Alice) or slug (Firesky/GoodLife) - the last path segment of /listings/... */
  unitId: string;
  checkInISO: string;
  checkOutISO: string;
  adults: number;
}

export interface ReservationSummary {
  /** Grand total incl. taxes, e.g. 2832.39 */
  total: number;
  /** Every amount listed under the total (nights subtotal, fees, taxes). */
  lineItems: number[];
}

/**
 * The /booking?unitId=...&checkIn=...&checkOut=...&adults=... checkout page that Book Now hands
 * off to. Identical on all three sites (confirmed live): a "Reservation Details" summary with a
 * cents-precise total and its line items, then a 3-step accordion (Contact Information ->
 * Rental Agreement and Add-ons -> Payment Info) where later steps stay disabled until the
 * contact step validates. Nothing in this page object ever gets past the contact step - no
 * reservation is ever created.
 */
export class BookingPage extends BasePage {
  async goto(request: BookingRequest): Promise<void> {
    const query = new URLSearchParams({
      unitId: request.unitId,
      checkIn: request.checkInISO,
      checkOut: request.checkOutISO,
      adults: String(request.adults),
    });
    await this.open(`/booking?${query}`);
  }

  get reservationDetailsHeading() {
    return this.page.getByRole('heading', { name: 'Reservation Details' });
  }

  /** The summary card: nearest ancestor of the heading that also holds the "Total" line. */
  get reservationDetails() {
    return this.reservationDetailsHeading.locator(
      'xpath=ancestor::div[.//p[normalize-space()="Total"]][1]',
    );
  }

  get continueButton() {
    return this.page.getByRole('button', { name: 'Continue', exact: true });
  }

  get rentalAgreementStep() {
    return this.page.getByRole('button', { name: /Rental Agreement and Add-ons/ });
  }

  get paymentStep() {
    return this.page.getByRole('button', { name: /Payment Info/ });
  }

  get firstNameInput() {
    return this.page.getByRole('textbox', { name: 'First Name required' });
  }

  get lastNameInput() {
    return this.page.getByRole('textbox', { name: 'Last Name required' });
  }

  get emailInput() {
    return this.page.getByRole('textbox', { name: 'Email required' });
  }

  get phoneInput() {
    return this.page.getByRole('textbox', { name: 'Enter phone number' });
  }

  validationMessage(text: string | RegExp) {
    return this.page.getByText(text);
  }

  async getReservationSummary(): Promise<ReservationSummary> {
    await this.reservationDetailsHeading.waitFor({ state: 'visible', timeout: 30_000 });
    const texts = (await this.reservationDetails.locator('p').allTextContents()).map((t) =>
      t.trim(),
    );
    const totalIndex = texts.indexOf('Total');
    const money = /^\$[\d,]+\.\d{2}$/;
    return {
      total: parseMoney(texts[totalIndex + 1]),
      lineItems: texts
        .slice(totalIndex + 2)
        .filter((t) => money.test(t))
        .map(parseMoney),
    };
  }
}
