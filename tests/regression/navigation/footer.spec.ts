import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-NAV-03/04/06 - Footer links and footer property search.
 *
 * Footer paths differ by site (/blog vs /blogs, three different rental-policy slugs, GoodLife's
 * relative "newsletters" href - all confirmed live), so internal links are discovered from the
 * DOM and each one is requested directly rather than listed per site. Sister-brand links (Good
 * Life Network) are cross-origin and out of scope here; social links are TC1's job.
 *
 * GoodLife was observed live to stall an occasional response for 30s+ (with or without browser
 * cookies) while the next request to the same URL returns in ~1s. A stall isn't a broken link -
 * a broken link answers 4xx/5xx - so links are checked a few at a time, and a request that times
 * out is retried once before it counts as broken.
 */
const LINK_BATCH_SIZE = 4;

async function linkStatus(
  get: (url: string) => Promise<{ status(): number }>,
  url: string,
): Promise<number | string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return (await get(url)).status();
    } catch (err) {
      if (attempt === 2) return `request failed: ${(err as Error).message.split('\n')[0]}`;
    }
  }
}

test.describe('Regression - Footer', { tag: '@regression' }, () => {
  test.beforeEach(async ({ home }) => {
    await home.goto();
  });

  test('REG-NAV-03 every internal footer link resolves without an error', async ({
    home,
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    const urls = await home.footerLinks.discoverInternalLinks();
    expect(urls.length, 'footer should contain internal links').toBeGreaterThan(0);

    const get = (url: string) => page.request.get(url, { timeout: 20_000 });
    const broken: string[] = [];
    for (let i = 0; i < urls.length; i += LINK_BATCH_SIZE) {
      const batch = urls.slice(i, i + LINK_BATCH_SIZE);
      const statuses = await Promise.all(batch.map((url) => linkStatus(get, url)));
      batch.forEach((url, j) => {
        const status = statuses[j];
        if (typeof status !== 'number' || status >= 400) broken.push(`${url} -> ${status}`);
      });
    }
    testInfo.annotations.push({ type: 'footer-links-checked', description: urls.join(', ') });

    await withHighlight(page, testInfo, home.footer, 'footer links', async () => {
      expect(broken, 'broken footer links').toEqual([]);
    });
  });

  test('REG-NAV-04 footer email and phone links are well-formed', async ({
    home,
    page,
  }, testInfo) => {
    const { mailto, tel } = await home.footerLinks.discoverContactLinks();
    testInfo.annotations.push({
      type: 'contact-links',
      description: [...mailto, ...tel].join(', '),
    });

    await withHighlight(page, testInfo, home.footer, 'footer contact links', async () => {
      expect(mailto.length, 'footer should offer an email address').toBeGreaterThan(0);
      expect(tel.length, 'footer should offer a phone number').toBeGreaterThan(0);
      for (const href of mailto) {
        expect(href, 'mailto link').toMatch(/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
      }
      for (const href of tel) {
        expect(
          href.replace(/\D/g, '').length,
          `${href} should have a full phone number`,
        ).toBeGreaterThanOrEqual(10);
      }
    });
  });
});

test.describe('Regression - Footer property search', { tag: '@regression' }, () => {
  // Decided from the fixture before any hook runs, so sites without the feature never load a page
  // (an in-test skip came after beforeEach's navigation and failed when that navigation timed out).
  test.skip(
    ({ siteConfig }) => !siteConfig.hasFooterPropertySearch,
    'This site has no footer property search',
  );

  test.beforeEach(async ({ home }) => {
    await home.goto();
  });

  test('REG-NAV-06 footer "Search By Property" finds a property and opens it', async ({
    home,
    property,
    page,
  }, testInfo) => {
    // "Desert" was confirmed live to match several Alice properties (e.g. "Desert Dream").
    const term = 'Desert';

    await home.footerLinks.propertySearchInput.fill(term);
    await expect(home.footerLinks.propertySearchOptions.first()).toBeVisible();
    const options = await home.footerLinks.propertySearchOptions.allTextContents();
    expect(
      options.filter((o) => !o.toLowerCase().includes(term.toLowerCase())),
      `every suggestion should contain "${term}"`,
    ).toEqual([]);

    const choice = options[0].trim();
    await home.footerLinks.propertySearchOption(choice).click();
    await withHighlight(page, testInfo, property.name, 'opened property', async () => {
      await expect(page).toHaveURL(/\/listings\//);
      await expect(property.name).toHaveText(choice);
    });
  });
});
