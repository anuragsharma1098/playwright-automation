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
 *
 * Re-confirmed live in October 2026: Firesky's homepage was redesigned (hamburger header, hero
 * destination tiles instead of category pills, search combobox renamed to "Where"), and Alice is
 * the only site with an inline header nav and a footer "Search By Property" box - see the
 * `headerNavStyle`, `navStyle`, and `hasFooterPropertySearch` fields below.
 */

export type SiteName = 'alice' | 'firesky' | 'goodlife';

/** How the site's primary destination/category navigation is shaped (TC4). */
export type NavStyle = 'destinationDropdown' | 'categoryPills' | 'destinationTiles';

/** Whether the header shows its links inline or behind an "Open menu" hamburger button. */
export type HeaderNavStyle = 'inline' | 'hamburger';

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
  /** For 'destinationTiles' sites: the heading of the homepage destination tile to click. */
  navDestinationTileLabel?: string;

  /** Header paradigm. Every site exposes "Contact Us" and "Specials" header links either way. */
  headerNavStyle: HeaderNavStyle;

  /** Whether the footer has a "Search By Property" typeahead (Alice only, confirmed live). */
  hasFooterPropertySearch: boolean;
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
    headerNavStyle: 'inline',
    hasFooterPropertySearch: true,
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
    // The category pills were removed in the redesign; the hero now has "Where Do You Want to Go?"
    // destination tiles linking to /{city}-vacation-rentals landing pages.
    navStyle: 'destinationTiles',
    navDestinationTileLabel: 'Scottsdale',
    headerNavStyle: 'hamburger',
    hasFooterPropertySearch: false,
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
    headerNavStyle: 'hamburger',
    hasFooterPropertySearch: false,
  },
};
