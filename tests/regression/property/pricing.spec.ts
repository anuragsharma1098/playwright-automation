import { expect, test } from '@src/fixtures/base.fixture';
import { futureStayDates, nightsBetween, stayQuery } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-PDP-05..07 - Booking widget quote and promo codes.
 *
 * The quote is the number a guest commits to, so its arithmetic is checked rather than just its
 * presence. Confirmed live on all three sites: the widget lists "$<rate> X <n> nights", then each
 * fee, then "Total before taxes". Amounts are shown rounded to whole dollars (e.g. "$427 X 4
 * nights = $1706", because the true rate is ~$426.50), so sums are compared with a rounding
 * tolerance of half a dollar per rounded figure - enough for display rounding, far too small to
 * hide a missing or double-counted fee.
 */
test.describe('Regression - Property pricing', { tag: '@regression' }, () => {
  // Each test chains three slow live page loads (listings -> property/checkout -> async quote),
  // which was observed to overrun the 90s default when the sites are under load.
  test.describe.configure({ timeout: 150_000 });

  const stay = futureStayDates(30);
  const adults = 2;

  test.beforeEach(async ({ results, property }) => {
    await results.goto(stayQuery(stay, adults));
    const [href] = await results.getResultHrefs(1);
    test.skip(!href, 'No properties available for these dates right now');
    await property.openWithStay(href, stay, adults);
  });

  test('REG-PDP-05 the quote is for the number of nights searched', async ({
    property,
    page,
  }, testInfo) => {
    const quote = await property.getPriceBreakdown();
    testInfo.annotations.push({ type: 'quote', description: JSON.stringify(quote) });

    await withHighlight(page, testInfo, property.nightsLine.first(), 'nights line', async () => {
      expect(quote.nights, 'nights in the quote').toBe(
        nightsBetween(stay.checkInISO, stay.checkOutISO),
      );
      const subtotal = quote.lineItems[0].amount;
      expect(
        Math.abs(quote.nightlyRate * quote.nights - subtotal),
        `rate x nights ($${quote.nightlyRate} x ${quote.nights}) should match the $${subtotal} subtotal`,
      ).toBeLessThanOrEqual(quote.nights * 0.5 + 0.5);
    });
  });

  test('REG-PDP-06 quote line items add up to "Total before taxes"', async ({
    property,
    page,
  }, testInfo) => {
    const quote = await property.getPriceBreakdown();
    const sum = quote.lineItems.reduce((total, item) => total + item.amount, 0);
    testInfo.annotations.push({
      type: 'quote',
      description: `${quote.lineItems.map((i) => `${i.label}=${i.amount}`).join(', ')} -> ${quote.totalBeforeTaxes}`,
    });

    await withHighlight(
      page,
      testInfo,
      property.nightsLine.first(),
      'price breakdown',
      async () => {
        expect(quote.lineItems.length, 'quote should list the stay plus fees').toBeGreaterThan(1);
        expect(
          Math.abs(sum - quote.totalBeforeTaxes),
          `line items sum to $${sum} but total says $${quote.totalBeforeTaxes}`,
        ).toBeLessThanOrEqual((quote.lineItems.length + 1) * 0.5);
      },
    );
  });

  test('REG-PDP-07 an invalid promo code is rejected with a message and can be removed', async ({
    property,
    page,
  }, testInfo) => {
    const code = `QAINVALID${Date.now().toString().slice(-6)}`;
    await property.applyPromo(code);

    await withHighlight(page, testInfo, property.promoInput, 'promo code', async () => {
      await expect(property.promoError).toHaveText(`${code} is not a valid promo code`, {
        timeout: 20_000,
      });
    });

    await property.removePromoButton.click();
    await expect(property.promoError, 'message should clear after Remove').toBeHidden();
  });
});
