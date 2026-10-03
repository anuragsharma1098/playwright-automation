import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates, stayQuery } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * SMK-04 - Property page is bookable.
 *
 * Picks the first property /listings returns for a dated search (so it's actually available for
 * those dates), opens it with the same dates, and checks the page can take a booking: a name, a
 * booking widget pre-filled with the stay, a live price quote, and an enabled Book Now. A 30-day
 * lead time keeps clear of last-minute minimum-notice rules.
 */
test.describe('Smoke - Property details', { tag: '@smoke' }, () => {
  test('SMK-04 an available property shows its name, prefilled booking widget, quote and Book Now', async ({
    results,
    property,
    page,
  }, testInfo) => {
    const stay = futureStayDates(30);
    const adults = 2;

    await results.goto(stayQuery(stay, adults));
    const [href] = await results.getResultHrefs(1);
    test.skip(!href, 'No properties available for these dates right now');

    await property.openWithStay(href, stay, adults);
    const name = (await property.name.textContent())?.trim();
    testInfo.annotations.push({ type: 'property', description: `${name} (${href})` });
    expect(name, 'property should have a name').toBeTruthy();

    const widget = await property.getBookingWidgetSummary();
    expect(widget.arrivalISO, 'booking widget arrival').toBe(stay.checkInISO);
    expect(widget.departureISO, 'booking widget departure').toBe(stay.checkOutISO);
    expect(widget.adults, 'booking widget guests').toBe(adults);

    await withHighlight(page, testInfo, property.bookNowButton, 'Book Now', async () => {
      await expect(property.nightsLine.first(), 'price quote for the stay').toBeVisible({
        timeout: 20_000,
      });
      await expect(property.bookNowButton, 'Book Now should be enabled').toBeEnabled();
    });
  });
});
