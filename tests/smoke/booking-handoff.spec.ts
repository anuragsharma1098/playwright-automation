import { unitIdFromHref } from '@src/pages/PropertyDetailsPage';
import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates, stayQuery, toLongDate } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * SMK-05 - Book Now hands off to checkout.
 *
 * The revenue path: Book Now must land on /booking for the same property and stay. Confirmed live
 * on all three sites that the hand-off is a slow (~10s) redirect to
 * `/booking?unitId=<id or slug>&checkIn=...&checkOut=...&adults=...`, whose "Reservation Details"
 * card repeats the property name and spells the dates out long-form ("Saturday, October 17,
 * 2026"). Stops on the checkout page - nothing is ever submitted.
 */
test.describe('Smoke - Booking hand-off', { tag: '@smoke' }, () => {
  test('SMK-05 Book Now opens checkout for the same property and stay', async ({
    results,
    property,
    booking,
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const stay = futureStayDates(30);
    const adults = 2;

    await results.goto(stayQuery(stay, adults));
    const [href] = await results.getResultHrefs(1);
    test.skip(!href, 'No properties available for these dates right now');

    await property.openWithStay(href, stay, adults);
    const name = (await property.name.textContent())?.trim() ?? '';
    await expect(property.nightsLine.first()).toBeVisible({ timeout: 20_000 });
    await property.bookNow();

    const params = new URL(page.url()).searchParams;
    expect(params.get('unitId'), 'checkout should be for the same property').toBe(
      unitIdFromHref(href),
    );
    expect(params.get('checkIn'), 'checkout arrival').toBe(stay.checkInISO);
    expect(params.get('checkOut'), 'checkout departure').toBe(stay.checkOutISO);
    expect(params.get('adults'), 'checkout guests').toBe(String(adults));

    await withHighlight(
      page,
      testInfo,
      booking.reservationDetails,
      'reservation details',
      async () => {
        await expect(booking.reservationDetailsHeading).toBeVisible({ timeout: 30_000 });
        await expect(booking.reservationDetails, 'summary names the property').toContainText(name);
        await expect(booking.reservationDetails, 'summary arrival date').toContainText(
          toLongDate(stay.checkInISO),
        );
        await expect(booking.reservationDetails, 'summary departure date').toContainText(
          toLongDate(stay.checkOutISO),
        );
      },
    );
  });
});
