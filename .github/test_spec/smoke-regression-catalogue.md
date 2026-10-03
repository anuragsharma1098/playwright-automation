# Smoke & Regression Catalogue

Every automated test in [`tests/`](../../tests), grouped by tier. Each test runs unmodified against
every site in `src/config/sites.ts` (Alice Lodging, Firesky Retreats, Good Life Vacations) and
every browser project in `playwright.config.ts`.

| Tier       | Tag           | Purpose                                                              | Run with                  |
| ---------- | ------------- | -------------------------------------------------------------------- | ------------------------- |
| Smoke      | `@smoke`      | "Is the site up and can a guest book?" Fast enough to gate a deploy. | `npm run test:smoke`      |
| Regression | `@regression` | Behaviour of each feature in depth, including TC1-TC6.               | `npm run test:regression` |

CI (`.github/workflows/playwright.yml`) runs the smoke tier only, on the Chromium and WebKit
projects. The regression tier is for local and on-demand runs.

Narrow a run with Playwright's usual flags, e.g.
`npx playwright test --grep @smoke --project=firesky-chromium`.

## Smoke (`tests/smoke/`)

| ID     | Test                                                                                                 | Spec                       |
| ------ | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| SMK-01 | Homepage loads with brand title, hero, search widget, header and footer                              | `homepage.spec.ts`         |
| SMK-02 | Destination + dates + guests search returns matching properties                                      | `search.spec.ts`           |
| SMK-03 | /listings shows property cards with Filters, Sort and Pagination                                     | `listings.spec.ts`         |
| SMK-04 | An available property shows its name, prefilled booking widget and quote                             | `property-details.spec.ts` |
| SMK-05 | Book Now opens checkout for the same property and stay                                               | `booking-handoff.spec.ts`  |
| SMK-06 | Key pages (/contact-us, /list-with-us, /about-us, /specials, /privacy-policy) respond with a heading | `key-pages.spec.ts`        |

## Regression (`tests/regression/` and `tests/tc*.spec.ts`)

### Search widget — `regression/search/search-widget.spec.ts`

| ID          | Test                                                    |
| ----------- | ------------------------------------------------------- |
| REG-SRCH-01 | Typing a destination suggests it as a selectable option |
| REG-SRCH-02 | The calendar blocks past dates and allows future ones   |
| REG-SRCH-03 | The guest steppers update the guests summary            |

### Listings — `regression/listings/`

| ID         | Test                                                           | Spec                      |
| ---------- | -------------------------------------------------------------- | ------------------------- |
| REG-LST-01 | Next Page shows a new, non-overlapping set of properties       | `pagination.spec.ts`      |
| REG-LST-02 | A `?page=2` deep link opens directly on page 2                 | `pagination.spec.ts`      |
| REG-LST-03 | "Highest Rated" orders rated properties by rating, high to low | `sorting.spec.ts`         |
| REG-LST-04 | "Most Reviews" orders properties by review count, high to low  | `sorting.spec.ts`         |
| REG-LST-05 | Bedrooms "3 or more" filter only returns 3+ bedroom properties | `filters-and-map.spec.ts` |
| REG-LST-06 | Show Map reveals the map; Hide Map removes it                  | `filters-and-map.spec.ts` |

### Property page — `regression/property/`

| ID         | Test                                                                | Spec                       |
| ---------- | ------------------------------------------------------------------- | -------------------------- |
| REG-PDP-01 | "Show all amenities" opens the amenities dialog, which closes again | `property-content.spec.ts` |
| REG-PDP-02 | Share options offer email, WhatsApp, Facebook and copy-link         | `property-content.spec.ts` |
| REG-PDP-03 | Review page 2 shows a different set of reviews                      | `property-content.spec.ts` |
| REG-PDP-04 | Structured data (JSON-LD) describes the same property as the page   | `property-content.spec.ts` |
| REG-PDP-05 | The quote is for the number of nights searched                      | `pricing.spec.ts`          |
| REG-PDP-06 | Quote line items add up to "Total before taxes"                     | `pricing.spec.ts`          |
| REG-PDP-07 | An invalid promo code is rejected with a message and can be removed | `pricing.spec.ts`          |

### Checkout — `regression/booking/checkout.spec.ts`

| ID         | Test                                                               |
| ---------- | ------------------------------------------------------------------ |
| REG-BKG-01 | Reservation summary matches the stay; total reconciles to the cent |
| REG-BKG-02 | Contact step blocks progress when required fields are blank        |
| REG-BKG-03 | Contact step rejects an invalid email and phone number             |

### Forms — `regression/forms/`

| ID         | Test                                                                 | Spec                   |
| ---------- | -------------------------------------------------------------------- | ---------------------- |
| REG-FRM-01 | Contact Us: each required field reports a message when left blank    | `contact-us.spec.ts`   |
| REG-FRM-02 | Contact Us: invalid email/phone are flagged and clear once corrected | `contact-us.spec.ts`   |
| REG-FRM-03 | Contact Us: "What best describes you?" offers Guest and HomeOwner    | `contact-us.spec.ts`   |
| REG-FRM-04 | List With Us shows the common required fields plus the site's extras | `list-with-us.spec.ts` |

### Navigation — `regression/navigation/`

| ID         | Test                                                                | Spec                |
| ---------- | ------------------------------------------------------------------- | ------------------- |
| REG-NAV-01 | The header logo returns to the homepage                             | `header.spec.ts`    |
| REG-NAV-02 | Header "Contact Us" and "Specials" links open their pages           | `header.spec.ts`    |
| REG-NAV-03 | Every internal footer link resolves without an error                | `footer.spec.ts`    |
| REG-NAV-04 | Footer email and phone links are well-formed                        | `footer.spec.ts`    |
| REG-NAV-05 | An unknown URL returns HTTP 404 with the branded not-found page     | `not-found.spec.ts` |
| REG-NAV-06 | Footer "Search By Property" finds and opens a property (Alice only) | `footer.spec.ts`    |

### Original test cases (TC1–TC6, tagged `@regression`)

Documented step by step in this folder — see [README.md](README.md#test-cases).

## Site differences the suite accounts for

Recorded in `src/config/sites.ts` and confirmed live in October 2026:

- **Header:** Alice shows links inline; Firesky and GoodLife hide them behind an "Open menu"
  hamburger (`headerNavStyle`).
- **Destination navigation (TC4):** Alice has a "Destinations" popover, GoodLife has category
  pills, and Firesky (since its redesign) has hero destination tiles (`navStyle`).
- **Search field name:** "Where" on Firesky, "Where to next?" on Alice and GoodLife.
- **Footer property search:** Alice only (`hasFooterPropertySearch`); REG-NAV-06 is skipped
  elsewhere.
- **Page size:** 12 cards per listings page on Alice, 30 on Firesky and GoodLife.

## Deliberately not automated

- **Submitting Contact Us, List With Us or the newsletter form.** Each is protected by
  Cloudflare Turnstile, which never passes in an automated browser, and a successful submit would
  send a real inquiry to the business. The tests cover validation and the disabled Submit button
  instead.
- **Checkout beyond the contact step.** Steps 2–3 would create a real reservation and take
  payment.
- **Favourites.** Clicking the heart as an anonymous visitor has no visible effect and stores
  nothing, so there is no outcome to assert.
- **Owner Login.** It links out to a separate owner portal.
