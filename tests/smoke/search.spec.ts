import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * SMK-02 - Core search path.
 *
 * The one journey every booking starts with: destination -> dates -> guests -> Search lands on
 * /listings with those criteria in the URL and at least one property. Deliberately shallower than
 * TC2 (no sort/filter) so it stays fast enough to gate a deploy.
 */
test.describe('Smoke - Search', { tag: '@smoke' }, () => {
  test('SMK-02 searching a destination with dates and guests returns matching properties', async ({
    home,
    results,
    siteConfig,
    page,
  }, testInfo) => {
    const { checkInISO, checkOutISO } = futureStayDates();

    await home.goto();
    await home.search.search({
      destination: siteConfig.validDestination,
      checkInISO,
      checkOutISO,
      adults: 2,
    });

    const criteria = results.criteriaFromUrl();
    expect(criteria.checkIn, 'checkIn carried into the results URL').toBe(checkInISO);
    expect(criteria.checkOut, 'checkOut carried into the results URL').toBe(checkOutISO);
    expect(criteria.adults, 'adults carried into the results URL').toBe('2');
    expect(criteria.locationId, 'destination carried into the results URL').toBeTruthy();

    await withHighlight(page, testInfo, results.propertyCards.first(), 'first result', async () => {
      await expect(
        results.propertyCards.first(),
        `"${siteConfig.validDestination}" should return at least one property`,
      ).toBeVisible({ timeout: 20_000 });
    });
    testInfo.annotations.push({
      type: 'result-count',
      description: `${await results.propertyCards.count()} properties on page 1`,
    });
  });
});
