import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-NAV-05 - Unknown URLs.
 *
 * Confirmed live on all three sites: an unknown path returns a real HTTP 404 (not a soft 404 with
 * status 200, which search engines would index) and renders a branded "404 Page not Found" page
 * that keeps the site header, so the visitor can navigate back.
 */
test.describe('Regression - Not found page', { tag: '@regression' }, () => {
  test('REG-NAV-05 an unknown URL returns HTTP 404 with the branded not-found page', async ({
    staticPage,
    home,
    siteConfig,
    page,
  }, testInfo) => {
    const response = await staticPage.visit(`/qa-missing-page-${Date.now()}`);

    expect(response?.status(), 'unknown URLs should return HTTP 404').toBe(404);
    await expect(page).toHaveTitle(new RegExp(`404.*${siteConfig.displayName}`));
    await withHighlight(page, testInfo, staticPage.heading, '404 heading', async () => {
      await expect(staticPage.heading).toHaveText('404 Page not Found');
      await expect(home.header.logoLink, 'header stays available').toBeVisible();
    });
  });
});
