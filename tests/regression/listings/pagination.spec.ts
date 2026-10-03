import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-LST-01/02 - Results pagination.
 *
 * Confirmed live: paging is URL-driven (`?page=N`) and the current page is announced through the
 * button's aria-label ("Page 2, current page"). Re-rendering after "Next Page" is slow (several
 * seconds on Alice), so `goToNextPage()` waits for both the URL and the first card to change
 * before anything is read. Every site has more than one page of unfiltered inventory (Alice 8,
 * Firesky 2, GoodLife 19 at time of writing).
 */
test.describe('Regression - Listings pagination', { tag: '@regression' }, () => {
  test('REG-LST-01 Next Page shows a new, non-overlapping set of properties', async ({
    results,
    page,
  }, testInfo) => {
    await results.goto();
    const pageOne = (await results.getCardSummaries()).map((c) => c.name);
    expect(pageOne.length, 'page 1 should have properties').toBeGreaterThan(0);

    await results.goToNextPage();
    await withHighlight(page, testInfo, results.pagination, 'pagination', async () => {
      expect(results.urlParam('page'), 'URL should record page 2').toBe('2');
      await expect(results.currentPageButton).toHaveAttribute('aria-label', 'Page 2, current page');
    });

    const pageTwo = (await results.getCardSummaries()).map((c) => c.name);
    testInfo.annotations.push({
      type: 'pages',
      description: `page 1: ${pageOne.length} cards, page 2: ${pageTwo.length} cards`,
    });
    expect(pageTwo.length, 'page 2 should have properties').toBeGreaterThan(0);
    expect(
      pageTwo.filter((name) => pageOne.includes(name)),
      'no property should appear on both page 1 and page 2',
    ).toEqual([]);
  });

  test('REG-LST-02 a ?page=2 deep link opens directly on page 2', async ({
    results,
    page,
  }, testInfo) => {
    await results.goto('?page=2');

    await withHighlight(page, testInfo, results.pagination, 'pagination', async () => {
      await expect(results.propertyCards.first()).toBeVisible({ timeout: 20_000 });
      await expect(results.currentPageButton).toHaveAttribute('aria-label', 'Page 2, current page');
    });
  });
});
