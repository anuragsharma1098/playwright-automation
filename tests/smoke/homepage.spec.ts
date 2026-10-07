import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * SMK-01 - Homepage availability.
 *
 * The cheapest possible "is the site up and is it the right site" check: the document responds,
 * the tab title carries the brand, and the four building blocks every other test depends on
 * (header, hero heading, search widget, footer) are all rendered. Brand comes from
 * `siteConfig.displayName` - confirmed live that every site's homepage <title> contains it
 * ("Alice Lodging™", "Firesky Retreats", "Good Life Vacations").
 */
test.describe('Smoke - Homepage', { tag: '@smoke' }, () => {
  test('SMK-01 homepage loads with brand title, hero, search widget, header and footer', async ({
    home,
    siteConfig,
    page,
  }, testInfo) => {
    const response = await home.open('/');

    expect(response?.status(), 'homepage document should not be an error response').toBeLessThan(
      400,
    );
    await expect(page, 'tab title should carry the brand name').toHaveTitle(
      new RegExp(siteConfig.displayName),
    );

    await withHighlight(page, testInfo, home.search.destinationInput, 'search widget', async () => {
      await expect(home.header.bar, 'header navigation bar').toBeVisible();
      await expect(home.header.logoLink, 'header logo link').toBeVisible();
      await expect(home.heroHeading, 'hero heading').not.toBeEmpty();
      await expect(home.search.destinationInput, 'destination field').toBeVisible();
      await expect(home.search.searchButton, 'Search button').toBeVisible();
      await expect(home.footer, 'footer').toBeVisible();
    });
  });
});
