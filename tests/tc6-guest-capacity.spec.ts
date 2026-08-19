import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC6 (Bonus) - Guest capacity consistency.
 *
 * Why this workflow: the single class of bug that most directly erodes booking trust is a
 * property being surfaced as bookable for a party it cannot actually hold - a guest turning up to
 * find the home sleeps fewer people than the site implied during search. This test searches for a
 * deliberately large party (6 adults) and then opens several of the returned properties to confirm
 * each one's own stated capacity, and its booking widget's carried-over guest count, both meet or
 * exceed what was searched. It complements TC3 (which checks one property) by sampling multiple
 * results, since a capacity bug is more likely to show up on some listings than others.
 */
test.describe('TC6 (Bonus) - Guest capacity consistency', () => {
  test('every sampled result respects the searched guest count on its own detail page', async ({
    home,
    results,
    property,
    siteConfig,
    page,
  }, testInfo) => {
    test.setTimeout(150_000); // multiple full property-page loads on top of the search flow

    const { checkInISO, checkOutISO } = futureStayDates();
    const adults = 6;

    await home.goto();
    await home.search.search({
      destination: siteConfig.validDestination,
      checkInISO,
      checkOutISO,
      adults,
    });

    const hrefs = await results.getResultHrefs(3);
    test.skip(hrefs.length === 0, `No results for a party of ${adults} at this destination/date`);

    for (const href of hrefs) {
      await page.goto(href, { waitUntil: 'load' });
      await property.name.waitFor({ state: 'visible' });
      const name = await property.name.textContent();

      await withHighlight(page, testInfo, property.name, `guest capacity - ${name}`, async () => {
        const capacity = await property.getGuestCapacity();
        expect(
          capacity,
          `"${name}" stated capacity should meet the searched party of ${adults}`,
        ).toBeGreaterThanOrEqual(adults);
      });

      const booking = await property.getBookingWidgetSummary();
      expect(
        booking.adults,
        `"${name}" booking widget should carry over the searched guest count`,
      ).toBe(adults);
    }

    testInfo.annotations.push({
      type: 'sampled-properties',
      description: `${hrefs.length} propert${hrefs.length === 1 ? 'y' : 'ies'} checked for ${adults}-guest capacity`,
    });
  });
});
