import type { Locator } from '@playwright/test';

export interface SocialLink {
  platform: string;
  href: string;
  domain: string;
}

/** Known social platform domains, used to distinguish real social links from sibling-brand /
 * partner-network links that also live in the footer (both sites belong to a "Good Life Network"
 * of sister brands whose footer links must NOT be mistaken for social media). */
const SOCIAL_DOMAINS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  'youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'pinterest.com': 'Pinterest',
};

export class FooterComponent {
  constructor(private readonly footer: Locator) {}

  private async hrefs(): Promise<string[]> {
    return this.footer
      .locator('a')
      .evaluateAll((anchors) =>
        anchors.map((a) => a.getAttribute('href')).filter((h): h is string => !!h),
      );
  }

  /** Same-origin footer links, resolved to absolute URLs and deduplicated. Paths differ by site
   * (e.g. /blog vs /blogs, three different rental-policy slugs - confirmed live), so they're
   * discovered rather than listed in SiteConfig. GoodLife even has a relative "newsletters" href,
   * which is why each href is resolved against the current page. */
  async discoverInternalLinks(): Promise<string[]> {
    const pageUrl = this.footer.page().url();
    const origin = new URL(pageUrl).origin;
    const urls = (await this.hrefs())
      .filter((href) => !/^(mailto|tel|javascript):/i.test(href) && !href.startsWith('#'))
      .map((href) => new URL(href, pageUrl))
      .filter((url) => url.origin === origin)
      .map((url) => `${url.origin}${url.pathname}${url.search}`);
    return [...new Set(urls)];
  }

  async discoverContactLinks(): Promise<{ mailto: string[]; tel: string[] }> {
    const hrefs = await this.hrefs();
    return {
      mailto: [...new Set(hrefs.filter((h) => h.startsWith('mailto:')))],
      tel: [...new Set(hrefs.filter((h) => h.startsWith('tel:')))],
    };
  }

  /** Alice-only "Search By Property" typeahead (see SiteConfig.hasFooterPropertySearch). */
  get propertySearchInput() {
    return this.footer.getByRole('combobox', { name: 'Search By Property' });
  }

  propertySearchOption(name: string) {
    return this.footer.page().getByRole('option', { name, exact: true });
  }

  get propertySearchOptions() {
    return this.footer.page().getByRole('option');
  }

  /** Dynamically discovers social media links by matching footer hrefs against known platform
   * domains, rather than assuming a fixed count/position - required by TC1, and necessary because
   * the two sites show a different (including zero) number of social links. */
  async discoverSocialLinks(): Promise<SocialLink[]> {
    const hrefs = await this.footer
      .locator('a')
      .evaluateAll((anchors) =>
        anchors.map((a) => a.getAttribute('href')).filter((h): h is string => !!h),
      );

    const seen = new Set<string>();
    const links: SocialLink[] = [];
    for (const href of hrefs) {
      const match = Object.entries(SOCIAL_DOMAINS).find(([domain]) => href.includes(domain));
      if (match && !seen.has(href)) {
        seen.add(href);
        links.push({ platform: match[1], href, domain: match[0] });
      }
    }
    return links;
  }
}
