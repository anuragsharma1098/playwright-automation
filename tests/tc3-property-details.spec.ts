import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC3 - Property Details Validation.
 *
 * Opens a property from filtered results and checks that everything the detail page shows -
 * address, stated guest capacity, and the booking widget's prefilled dates/guests - is still
 * consistent with the original search criteria. Address and capacity are read from the page's
 * schema.org VacationRental JSON-LD block rather than scraped from visible text, since the two
 * sites' presentational markup around those values differs (confirmed live) while the structured
 * data does not. The booking widget check is the strongest signal of all: both sites carry
 * checkIn/checkOut/adults through as URL query params onto the property page, so any drift there
 * would indicate a real booking-integrity bug, not a UI quirk.
 */
test.describe('TC3 - Property details validation', () => {
  test('a property opened from filtered results matches the search criteria used to find it', async ({
    home,
    results,
    property,
    siteConfig,
    page,
  }, testInfo) => {
    const { checkInISO, checkOutISO } = futureStayDates();
    const adults = 2;

    await home.goto();
    await home.search.search({
      destination: siteConfig.validDestination,
      checkInISO,
      checkOutISO,
      adults,
    });

    await results.openFilters();
    await results.togglePetFriendly();
    await results.applyFilters();

    const filteredCount = await results.getResultCount();
    test.skip(
      filteredCount === 0,
      'No pet-friendly results for this destination/date combination right now',
    );

    await results.openFirstResult();
    await property.name.waitFor({ state: 'visible' });

    const name = await property.name.textContent();
    testInfo.annotations.push({ type: 'property-name', description: name ?? '(unknown)' });

    await withHighlight(page, testInfo, property.name, 'property address/capacity', async () => {
      const locality = await property.getLocality();
      expect(locality, 'property address should mention the searched destination').toBe(
        siteConfig.validDestination,
      );

      const capacity = await property.getGuestCapacity();
      expect(
        capacity,
        'stated guest capacity should meet or exceed the searched guest count',
      ).toBeGreaterThanOrEqual(adults);
    });

    const booking = await property.getBookingWidgetSummary();
    expect(booking.arrivalISO, 'booking widget arrival date should match the original search').toBe(
      checkInISO,
    );
    expect(
      booking.departureISO,
      'booking widget departure date should match the original search',
    ).toBe(checkOutISO);
    expect(booking.adults, 'booking widget guest count should match the original search').toBe(
      adults,
    );
  });
});
