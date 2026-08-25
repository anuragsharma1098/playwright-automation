# Manual Test Specifications

Manual (human-executable) test cases mirroring the automated suite in [`tests/`](../../tests).
Each file below documents one test case (TC) as click-by-click steps with expected results, for
someone testing the sites by hand rather than running Playwright.

## Sites under test

| Site             | Base URL                        |
| ---------------- | ------------------------------- |
| Alice Lodging    | https://www.alicelodging.com    |
| Firesky Retreats | https://www.fireskyretreats.com |

Every test case runs against **both** sites unless a step says otherwise. Both sites run the same
underlying platform, so most steps are identical; where the two sites genuinely diverge (nav
style, form fields, selectors), the test case calls it out explicitly.

Browsers: Chrome, Firefox, Safari (WebKit), Edge — same steps, run once per browser.

## Test cases

| ID          | Title                          | File                                                   |
| ----------- | ------------------------------ | ------------------------------------------------------ |
| TC1         | Social media links             | [TC1-social-links.md](TC1-social-links.md)             |
| TC2         | Search, filtering, and sorting | [TC2-search-filter-sort.md](TC2-search-filter-sort.md) |
| TC3         | Property details validation    | [TC3-property-details.md](TC3-property-details.md)     |
| TC4         | Navigation                     | [TC4-navigation.md](TC4-navigation.md)                 |
| TC5         | Form validation                | [TC5-form-validation.md](TC5-form-validation.md)       |
| TC6 (Bonus) | Guest capacity consistency     | [TC6-guest-capacity.md](TC6-guest-capacity.md)         |

`demo-intentional-failure.spec.ts` is not included here — it's a deliberately-broken automated
test used only to demo the diagnostics pipeline (screenshots/highlight-on-failure) and has no
manual-testing equivalent.

## Known, confirmed differences between the two sites

These are referenced across the test cases below and are not bugs:

- **Property card name element**: `label.text-size-heading3` on Alice vs. `h3.text-size-body` on
  Firesky (presentational only).
- **Navigation style**: Alice uses a "Destinations" popover menu; Firesky uses a row of category
  pill tabs (For You / Pool / Group Homes / Pet Friendly / Premium Stays / Long Term Stay / Value
  Stay) directly on the homepage.
- **List With Us form**: Firesky's form has an extra required "Property Location" field that
  Alice's does not.
- **Social links**: Firesky Retreats currently shows zero social media links in the footer; Alice
  shows at least one. Both are valid outcomes for TC1.
- **Sort order is case-sensitive** (ASCII/code-unit order, not locale-aware) on both sites — e.g.
  a name starting with a capital letter can sort before one starting with a lowercase letter.

## Common setup for every test case

1. Open a supported browser (Chrome, Firefox, Safari, or Edge).
2. Navigate to the site's homepage.
3. A marketing popup ("Get 20% Off Summer Special") may appear a few seconds after load, plus a
   cookie-consent banner. Dismiss both (Close Announcement Popup / Close banner / Accept) before
   interacting with the page — either can block clicks on the search widget if left open.
