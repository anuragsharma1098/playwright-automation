import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC2 - Search, Filtering, and Sorting.
 *
 * Filters (Bedrooms stepper, Pet friendly toggle) and the Sort dropdown are byte-for-byte
 * identical widgets on both sites (same platform, confirmed live) - this spec needs no site
 * branching for that part at all. Only the destination typed into search and the check that the
 * URL's locationId reflects it are site-specific, and that comes entirely from `siteConfig`.
 */
test.describe('TC2 - Search, filtering, and sorting', () => {
  test('dynamic search, filters, and sort all take effect and stay consistent with each other', async ({
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

    // The search actually took effect: URL params reflect what was configured in the widget.
    const criteria = results.criteriaFromUrl();
    expect(criteria.checkIn, 'checkIn should reflect the dynamically generated date').toBe(
      checkInISO,
    );
    expect(criteria.checkOut, 'checkOut should reflect the dynamically generated date').toBe(
      checkOutISO,
    );
    expect(criteria.adults, 'adults should reflect the configured guest count').toBe('2');

    const baselineCount = await results.getResultCount();
    expect(
      baselineCount,
      `search for "${siteConfig.validDestination}" should return at least one property`,
    ).toBeGreaterThan(0);

    // --- Sorting: each option should independently produce a correctly ordered list, and the
    // two options together should produce a different order. Names are compared per-call
    // (each list checked against its own sorted copy) rather than against each other, since the
    // live site can return a marginally different result set between two separate network calls
    // (real-time availability/pricing) - the two lists are not guaranteed to be an exact mirror
    // of each other even when both are individually sorted correctly.
    const [sortA, sortB] = siteConfig.sortOptions;

    await results.sortBy(sortA);
    const namesAscending = await results.getResultNames();

    await results.sortBy(sortB);
    const namesDescending = await results.getResultNames();

    await withHighlight(
      page,
      testInfo,
      page.locator(siteConfig.cardNameSelector).first(),
      'first result after sorting',
      async () => {
        // Plain code-unit comparison (not localeCompare) to match the site's own sort, which is
        // case-sensitive - confirmed live: "Casa Grande..." sorts before "Casa de Mayo" because
        // the site compares raw character codes, where 'G' < 'd'.
        const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
        expect(namesAscending, `"${sortA}" should list results alphabetically ascending`).toEqual(
          [...namesAscending].sort(byCodeUnit),
        );
        expect(namesDescending, `"${sortB}" should list results alphabetically descending`).toEqual(
          [...namesDescending].sort((a, b) => byCodeUnit(b, a)),
        );
        expect(
          namesDescending,
          `sorting by "${sortA}" then "${sortB}" should change the displayed order`,
        ).not.toEqual(namesAscending);
      },
    );

    // --- Filters: applying meaningful filters must never increase the result count ---
    await results.openFilters();
    await results.incrementBedrooms(1);
    await results.togglePetFriendly();
    await results.applyFilters();

    const filteredCount = await results.getResultCount();
    testInfo.annotations.push({
      type: 'filter-effect',
      description: `${baselineCount} unfiltered -> ${filteredCount} after Bedrooms>=1 + Pet friendly`,
    });
    expect(
      filteredCount,
      'filtered results should never exceed the unfiltered baseline',
    ).toBeLessThanOrEqual(baselineCount);
  });
});
