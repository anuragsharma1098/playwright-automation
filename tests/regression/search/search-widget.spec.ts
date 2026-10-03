import { expect, test } from '@src/fixtures/base.fixture';
import { isoDaysFromToday } from '@src/utils/dates';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-SRCH - Search widget behaviour, piece by piece.
 *
 * TC2 and SMK-02 drive the widget end to end; these isolate each control so a regression points at
 * the exact part that broke. Confirmed live on all three sites (same Headless UI widget):
 *  - typing a destination opens a listbox whose options are the known locations;
 *  - the calendar opens on the current month with "Previous month" disabled, and past days have
 *    no `Select YYYY-MM-DD` label at all (they're inert), while future days are enabled buttons;
 *  - the guests trigger's aria-label tracks the steppers ("Select Guests: 2 Adults 1 Children").
 */
test.describe('Regression - Search widget', { tag: '@regression' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.goto();
  });

  test('REG-SRCH-01 typing a destination suggests it as a selectable option', async ({
    home,
    siteConfig,
    page,
  }, testInfo) => {
    await home.search.typeDestination(siteConfig.validDestination);

    const option = home.search.destinationOption(siteConfig.validDestination);
    await withHighlight(
      page,
      testInfo,
      home.search.destinationInput,
      'destination typeahead',
      async () => {
        await expect(option, `"${siteConfig.validDestination}" should be suggested`).toBeVisible();
      },
    );
  });

  test('REG-SRCH-02 the calendar blocks past dates and allows future ones', async ({
    home,
    page,
  }, testInfo) => {
    await home.search.openCalendar();

    await withHighlight(page, testInfo, home.search.previousMonthButton, 'calendar', async () => {
      await expect(
        home.search.previousMonthButton,
        'cannot page back before the current month',
      ).toBeDisabled();
      // Two days back rather than one so a local/UTC date boundary can never make it "today".
      await expect(
        home.search.dayButton(isoDaysFromToday(-2)),
        'a past date should not be selectable',
      ).toHaveCount(0);
      await expect(
        home.search.dayButton(isoDaysFromToday(3)),
        'a near-future date should be selectable',
      ).toBeEnabled();
    });
  });

  test('REG-SRCH-03 the guest steppers update the guests summary', async ({
    home,
    page,
  }, testInfo) => {
    await home.search.adjustGuests('adults', 2);
    await home.search.adjustGuests('children', 1);
    expect(await home.search.guestsSummary(), 'after +2 adults, +1 child').toBe(
      'Select Guests: 2 Adults 1 Children',
    );

    await home.search.adjustGuests('adults', -1);
    await withHighlight(page, testInfo, home.search.guestsTrigger, 'guests', async () => {
      expect(await home.search.guestsSummary(), 'after -1 adult').toBe(
        'Select Guests: 1 Adults 1 Children',
      );
    });
  });
});
