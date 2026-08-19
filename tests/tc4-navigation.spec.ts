import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC4 - Navigation.
 *
 * Drives each site's primary destination/category navigation component through to an opened
 * property. Alice Lodging and Firesky Retreats implement this completely differently (a
 * "Destinations" popover with city links vs. a row of category pill tabs that navigate directly)
 * - NavComponent picks the right flow via `siteConfig.navStyle` so this spec stays identical for
 * both. See NavComponent for the implementation split.
 */
test.describe('TC4 - Navigation', () => {
  test('destination/category navigation is populated, responds to interaction, and leads to a real property', async ({
    home,
    property,
    page,
  }, testInfo) => {
    await home.goto();

    const clickedLabel = await home.nav.browseToPropertyViaDestinationNav();
    await property.name.waitFor({ state: 'visible' });

    const name = await property.name.textContent();
    testInfo.annotations.push({
      type: 'nav-path',
      description: `via "${clickedLabel}" -> ${name}`,
    });

    await withHighlight(
      page,
      testInfo,
      property.name,
      'property opened via destination/category navigation',
      async () => {
        expect(
          name?.trim(),
          'opening a property via destination/category navigation should show a real name',
        ).toBeTruthy();
      },
    );
  });
});
