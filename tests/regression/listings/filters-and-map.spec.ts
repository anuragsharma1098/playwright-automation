import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-LST-05/06 - Bedrooms filter and map view.
 *
 * TC2 checks that filters never *increase* the result count; REG-LST-05 checks the stronger
 * property that the filter is actually honoured. Confirmed live: three "Increase bedrooms" clicks
 * set the stepper to "3 or more", Apply writes `bedrooms=3` to the URL, and every resulting card
 * shows at least 3 bedrooms. The grid re-renders progressively after Apply, so the card check is
 * polled until it settles rather than read once.
 */
test.describe('Regression - Listings filters and map', { tag: '@regression' }, () => {
  test.beforeEach(async ({ results }) => {
    await results.goto();
  });

  test('REG-LST-05 the Bedrooms "3 or more" filter only returns properties with 3+ bedrooms', async ({
    results,
    page,
  }, testInfo) => {
    await results.openFilters();
    await results.incrementBedrooms(3);
    await results.applyFilters();

    expect(results.urlParam('bedrooms'), 'filter recorded in the URL').toBe('3');
    await withHighlight(
      page,
      testInfo,
      results.propertyCards.first(),
      'filtered grid',
      async () => {
        await expect
          .poll(
            async () =>
              (await results.getCardSummaries())
                .filter((c) => c.bedrooms === null || c.bedrooms < 3)
                .map((c) => `${c.name} (${c.bedrooms ?? 'unknown'} bedrooms)`),
            { message: 'every result should have at least 3 bedrooms', timeout: 20_000 },
          )
          .toEqual([]);
        expect(
          await results.propertyCards.count(),
          'filter should still return results',
        ).toBeGreaterThan(0);
      },
    );
  });

  test('REG-LST-06 Show Map reveals the map and Hide Map removes it again', async ({
    results,
    page,
  }, testInfo) => {
    await results.showMap();
    await withHighlight(page, testInfo, results.map, 'map', async () => {
      await expect(results.map, 'map should render').toBeVisible({ timeout: 15_000 });
      await expect(results.hideMapButton, 'toggle should now read Hide Map').toBeVisible();
    });

    await results.hideMapButton.click();
    await expect(results.map, 'map should be removed').toBeHidden();
    await expect(results.showMapButton, 'toggle should read Show Map again').toBeVisible();
  });
});
