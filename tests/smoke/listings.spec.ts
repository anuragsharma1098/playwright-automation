import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * SMK-03 - Listings page availability.
 *
 * /listings with no criteria is the browse-everything entry point (linked from "See All
 * Properties" / "Explore ..." on every homepage). Checks the grid renders and that the Filters,
 * Sort and Pagination controls the regression suite exercises are all present. Page size differs
 * by site (12 on Alice, 30 on Firesky/GoodLife - confirmed live), so only "at least one card" is
 * asserted.
 */
test.describe('Smoke - Listings', { tag: '@smoke' }, () => {
  test('SMK-03 listings page shows property cards with filter, sort and pagination controls', async ({
    results,
    page,
  }, testInfo) => {
    await results.goto();

    await withHighlight(
      page,
      testInfo,
      results.propertyCards.first(),
      'listings grid',
      async () => {
        await expect(results.propertyCards.first(), 'at least one property card').toBeVisible({
          timeout: 20_000,
        });
      },
    );
    await expect(results.filtersButton, 'Filters button').toBeVisible();
    await expect(results.sortControl, 'Sort control').toBeVisible();
    await expect(results.pagination, 'Pagination').toBeVisible();
    await expect(results.currentPageButton, 'first page is current').toHaveAttribute(
      'aria-label',
      'Page 1, current page',
    );

    testInfo.annotations.push({
      type: 'page-size',
      description: `${await results.propertyCards.count()} cards on page 1`,
    });
  });
});
