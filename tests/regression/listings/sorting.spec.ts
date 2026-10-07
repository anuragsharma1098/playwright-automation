import type { PropertyCardSummary } from '@src/pages/SearchResultsPage';
import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-LST-03/04 - Rating and review-count sorts.
 *
 * TC2 covers the two name sorts; these cover the other two that drive conversions. Confirmed live
 * on all three sites: "Highest Rated" writes `sort=rating-desc` and orders by rating (ties broken
 * by review count); "Most Reviews" writes `sort=most-reviewed` and orders by review count. Cards
 * with "No reviews yet" have no rating, so the rating check only compares rated cards. Assertions
 * list every out-of-order neighbour pair, so a failure says exactly where the order broke.
 */
function outOfOrder(
  cards: PropertyCardSummary[],
  value: (card: PropertyCardSummary) => number | null,
): string[] {
  const rated = cards.filter((card) => value(card) !== null);
  const problems: string[] = [];
  for (let i = 1; i < rated.length; i += 1) {
    const [prev, curr] = [value(rated[i - 1])!, value(rated[i])!];
    if (curr > prev) {
      problems.push(`"${rated[i].name}" (${curr}) after "${rated[i - 1].name}" (${prev})`);
    }
  }
  return problems;
}

test.describe('Regression - Listings sorting', { tag: '@regression' }, () => {
  test.beforeEach(async ({ results }) => {
    await results.goto();
  });

  const cases = [
    {
      id: 'REG-LST-03',
      option: 'Highest Rated',
      title: 'lists rated properties from highest to lowest rating',
      urlValue: 'rating-desc',
      value: (c: PropertyCardSummary) => c.rating,
    },
    {
      id: 'REG-LST-04',
      option: 'Most Reviews',
      title: 'lists properties from most to fewest reviews',
      urlValue: 'most-reviewed',
      value: (c: PropertyCardSummary) => c.reviewCount,
    },
  ];

  for (const { id, option, title, urlValue, value } of cases) {
    test(`${id} "${option}" ${title}`, async ({ results, page }, testInfo) => {
      await results.sortBy(option);
      await expect
        .poll(() => results.urlParam('sort'), {
          message: 'sort recorded in the URL',
          timeout: 20_000,
        })
        .toBe(urlValue);

      // The grid re-renders progressively after a sort, so the order is polled until it settles.
      await withHighlight(
        page,
        testInfo,
        results.propertyCards.first(),
        'sorted grid',
        async () => {
          await expect
            .poll(async () => outOfOrder(await results.getCardSummaries(), value), {
              message: `"${option}" order should never go up`,
              timeout: 20_000,
            })
            .toEqual([]);
        },
      );

      const cards = await results.getCardSummaries();
      testInfo.annotations.push({
        type: 'rating/reviews per card',
        description: cards.map((c) => `${c.rating ?? '-'}/${c.reviewCount}`).join(' '),
      });
      expect(
        cards.some((c) => value(c) !== null),
        'page should show properties with a value to sort on',
      ).toBe(true);
    });
  }
});
