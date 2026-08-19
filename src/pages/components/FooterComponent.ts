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
