import { unitIdFromHref } from '@src/pages/PropertyDetailsPage';
import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates, stayQuery, toLongDate } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-BKG-01..03 - Checkout page (/booking) summary and contact-step validation.
 *
 * Opens /booking directly with the same query Book Now produces (SMK-05 covers the hand-off
 * itself), for the first property available on the stay's dates. Confirmed live on all three
 * sites: the Reservation Details total (incl. taxes) equals the sum of its listed line items to
 * the cent, and the Contact Information step shows its own message per blank/invalid field while
 * "Rental Agreement and Add-ons" and "Payment Info" stay disabled. These tests never get past the
 * contact step, so no reservation is ever created.
 */
test.describe('Regression - Checkout', { tag: '@regression' }, () => {
  // Each test chains three slow live page loads (listings -> property/checkout -> async quote),
  // which was observed to overrun the 90s default when the sites are under load.
  test.describe.configure({ timeout: 150_000 });

  const stay = futureStayDates(30);
  const adults = 2;
  let propertyName = '';

  test.beforeEach(async ({ results, booking }) => {
    await results.goto(stayQuery(stay, adults));
    const [href] = await results.getResultHrefs(1);
    test.skip(!href, 'No properties available for these dates right now');
    [{ name: propertyName }] = await results.getCardSummaries();

    await booking.goto({
      unitId: unitIdFromHref(href),
      checkInISO: stay.checkInISO,
      checkOutISO: stay.checkOutISO,
      adults,
    });
    await booking.reservationDetailsHeading.waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('REG-BKG-01 the reservation summary matches the stay and its total reconciles', async ({
    booking,
    page,
  }, testInfo) => {
    const summary = await booking.getReservationSummary();
    const sum = summary.lineItems.reduce((total, amount) => total + amount, 0);
    testInfo.annotations.push({
      type: 'reservation',
      description: `${propertyName}: ${summary.lineItems.join(' + ')} = ${sum.toFixed(2)} vs total ${summary.total}`,
    });

    await withHighlight(
      page,
      testInfo,
      booking.reservationDetails,
      'reservation details',
      async () => {
        await expect(booking.reservationDetails).toContainText(propertyName);
        await expect(booking.reservationDetails).toContainText(toLongDate(stay.checkInISO));
        await expect(booking.reservationDetails).toContainText(toLongDate(stay.checkOutISO));
        expect(summary.lineItems.length, 'summary should itemise the total').toBeGreaterThan(1);
        expect(sum, 'line items should add up to the total, to the cent').toBeCloseTo(
          summary.total,
          2,
        );
      },
    );
  });

  test('REG-BKG-02 the contact step blocks progress when required fields are blank', async ({
    booking,
    page,
  }, testInfo) => {
    await booking.continueButton.click();

    await withHighlight(page, testInfo, booking.firstNameInput, 'contact step', async () => {
      for (const message of [
        'First name cannot be blank',
        'Last name cannot be blank',
        'Email cannot be empty.',
        'Phone number cannot be blank.',
      ]) {
        await expect(booking.validationMessage(message), message).toBeVisible();
      }
    });
    await expect(booking.rentalAgreementStep, 'step 2 stays locked').toBeDisabled();
    await expect(booking.paymentStep, 'step 3 stays locked').toBeDisabled();
  });

  test('REG-BKG-03 the contact step rejects an invalid email and phone number', async ({
    booking,
    page,
  }, testInfo) => {
    await booking.firstNameInput.fill('QA');
    await booking.lastNameInput.fill('Automation');
    await booking.emailInput.fill('not-an-email');
    await booking.phoneInput.fill('+1 12');
    await booking.continueButton.click();

    await withHighlight(page, testInfo, booking.emailInput, 'contact step', async () => {
      await expect(booking.validationMessage('Please enter valid email address.')).toBeVisible();
      await expect(booking.validationMessage('Not a valid phone number.')).toBeVisible();
    });
    await expect(booking.rentalAgreementStep, 'step 2 stays locked').toBeDisabled();
  });
});
