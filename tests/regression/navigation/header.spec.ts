import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-NAV-01/02 - Header navigation.
 *
 * Alice shows header links inline; Firesky and GoodLife hide them behind an "Open menu" hamburger
 * (confirmed live, `siteConfig.headerNavStyle`). HeaderComponent hides that difference, so these
 * tests just ask for a link by name. "Contact Us" and "Specials" are the two links confirmed
 * present in every site's header.
 *
 * The sites navigate client-side and only change the URL once the server has returned the next
 * page, which was observed to take over 10s when a site is under load - so URL checks get the same
 * 30s budget as a navigation.
 */
const NAVIGATION_TIMEOUT = 30_000;

const HEADER_LINKS = [
  { name: 'Contact Us', path: '/contact-us' },
  { name: 'Specials', path: '/specials' },
];

test.describe('Regression - Header navigation', { tag: '@regression' }, () => {
  test('REG-NAV-01 the header logo returns to the homepage', async ({
    home,
    siteConfig,
    page,
  }, testInfo) => {
    await home.open('/contact-us');

    await withHighlight(page, testInfo, home.header.logoLink, 'header logo', async () => {
      await home.header.logoLink.click();
      await expect(page).toHaveURL(`${siteConfig.baseURL}/`, { timeout: NAVIGATION_TIMEOUT });
    });
  });

  for (const { name, path } of HEADER_LINKS) {
    test(`REG-NAV-02 the header "${name}" link opens ${path}`, async ({ home, page }, testInfo) => {
      await home.goto();
      await home.header.revealLinks();
      const link = await home.header.link(name);

      await withHighlight(page, testInfo, link, `header ${name} link`, async () => {
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${path}/?$`), { timeout: NAVIGATION_TIMEOUT });
      });
    });
  }
});
