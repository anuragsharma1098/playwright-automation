/**
 * Per-site configuration. This is the single place that captures how AliceLodging, FireskyRetreats,
 * and GoodLifeVacations differ (copy, valid search terms, filter/sort vocabulary, nav paradigm, and
 * a couple of confirmed markup differences). Page objects read from this config instead of
 * branching on site name, so adding another site is normally just a new entry here plus a new
 * Playwright project in playwright.config.ts.
 *
 * Values below were confirmed by live inspection of all three sites - all run on the same
 * "Flow One" white-label platform (goodlifevacations.com is the network hub that Alice/Firesky
 * link to as a "Good Life Network" sister brand) and share almost all markup and behavior (search
 * widget, filters modal, sort dropdown, list-with-us form validation are byte-for-byte identical)
 * - the property card name element is the one confirmed exception (`<label
 * class="text-size-heading3">` on Alice vs. `<h3 class="text-size-body">` on Firesky and
 * GoodLifeVacations), captured below as `cardNameSelector`.
 */

export type SiteName = 'alice' | 'firesky' | 'goodlife';

/** How the site's primary destination/category navigation is shaped (TC4). */
export type NavStyle = 'destinationDropdown' | 'categoryPills';

export interface SiteConfig {
  name: SiteName;
  displayName: string;
  baseURL: string;

  /** A destination name known to return results (typed into the "Where to next?" search field). */
  validDestination: string;

  /** Sort option labels to exercise in TC2, in the order they should be tried (identical on both sites). */
  sortOptions: [string, string];

  /** CSS selector for a property card's name element on the /listings results grid - the one
   * confirmed markup difference between the two sites. */
  cardNameSelector: string;

  /** Path to the property-owner inquiry form. */
  listWithUsPath: string;

  /** Field labels present on this site's inquiry form beyond the common Name/Email/Phone/Country/
   * Message set - documented per TC5's "notable differences" requirement. */
  listWithUsExtraFields: string[];

  /** Navigation paradigm used for TC4 (see NavComponent for the Template Method split). */
  navStyle: NavStyle;

  /** For 'destinationDropdown' sites: the nav button that opens the destinations popover. */
  navMenuButtonLabel?: string;
  /** For 'categoryPills' sites: the label of a pill/tab to click. */
  navCategoryLabel?: string;
}

export const siteConfigs: Record<SiteName, SiteConfig> = {
  alice: {
    name: 'alice',
    displayName: 'Alice Lodging',
    baseURL: 'https://www.alicelodging.com',
    validDestination: 'Palm Springs',
    sortOptions: ['Name - A to Z', 'Name - Z to A'],
    cardNameSelector: 'label.text-size-heading3',
    listWithUsPath: '/list-with-us',
    listWithUsExtraFields: [],
    navStyle: 'destinationDropdown',
    navMenuButtonLabel: 'Destinations',
  },
  firesky: {
    name: 'firesky',
    displayName: 'Firesky Retreats',
    baseURL: 'https://www.fireskyretreats.com',
    validDestination: 'Scottsdale',
    sortOptions: ['Name - A to Z', 'Name - Z to A'],
    cardNameSelector: 'h3.text-size-body',
    listWithUsPath: '/list-with-us',
    listWithUsExtraFields: ['Property Location'],
    navStyle: 'categoryPills',
    navCategoryLabel: 'Pool',
  },
  goodlife: {
    name: 'goodlife',
    displayName: 'Good Life Vacations',
    baseURL: 'https://www.goodlifevacations.com',
    validDestination: 'Palm Springs',
    sortOptions: ['Name - A to Z', 'Name - Z to A'],
    cardNameSelector: 'h3.text-size-body',
    listWithUsPath: '/list-with-us',
    listWithUsExtraFields: ['Property Location'],
    navStyle: 'categoryPills',
    navCategoryLabel: 'Group Homes',
  },
};
