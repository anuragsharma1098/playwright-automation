import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC1 - Social Media Links.
 *
 * Links are discovered dynamically (never hardcoded) by matching footer hrefs against known
 * social platform domains - required because the footer also contains "Good Life Network"
 * sister-brand links that must not be mistaken for social media, and because the two sites show a
 * different number of social links (confirmed live: Firesky Retreats currently shows none). Both
 * outcomes are valid; the test documents whichever it finds rather than assuming a fixed count.
 *
 * Destination check: confirmed live that a real HTTP round trip to facebook.com from
 * `page.request` gets bot-challenged (HTTP 400) even for a perfectly valid profile URL, which
 * would make asserting on a 2xx response flaky against nothing our own code controls. Instead
 * "navigates to the expected destination" is verified structurally (a well-formed https URL whose
 * host matches the discovered platform - already guaranteed by the domain-matching discovery
 * step) plus a lenient reachability check that only fails on a genuine dead link (DNS/connection
 * failure or a definitive 404), tolerating bot-defense 4xx challenge responses.
 */
test.describe('TC1 - Social media links', () => {
  test('footer social links are discovered dynamically and each points to a live, well-formed destination', async ({
    home,
    page,
  }, testInfo) => {
    await home.goto();

    const links = await home.footerLinks.discoverSocialLinks();
    testInfo.annotations.push({
      type: 'social-links-found',
      description: links.length
        ? links.map((l) => `${l.platform} -> ${l.href}`).join('; ')
        : '(none found on this site)',
    });

    for (const link of links) {
      await withHighlight(page, testInfo, home.footer, `${link.platform} social link`, async () => {
        const url = new URL(link.href);
        expect(url.protocol, `${link.platform} link should use https`).toBe('https:');
        expect(
          url.hostname,
          `${link.platform} link should point to a ${link.domain} URL`,
        ).toContain(link.domain);

        const response = await page.request
          .get(link.href, { timeout: 15000 })
          .catch((err: Error) => {
            throw new Error(
              `Request to ${link.platform} link (${link.href}) failed: ${err.message}`,
            );
          });
        expect(
          response.status(),
          `${link.platform} link (${link.href}) should not be a dead link (got ${response.status()})`,
        ).toBeLessThan(500);
        expect(response.status(), `${link.platform} link should not 404`).not.toBe(404);
      });
    }
  });
});
