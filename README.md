# Vacation Rental Automation

A Playwright + TypeScript UI automation framework validating booking workflows across two vacation
rental sites — [Alice Lodging](https://www.alicelodging.com/) and
[Firesky Retreats](https://www.fireskyretreats.com/) — built as a take-home QA automation
assignment. The same test specs run against both sites via Playwright projects; only a small
per-site config file and two confirmed markup differences are branched on.

> **These are live production sites.** Nothing here completes a real booking or payment.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the structural map (layered design, class
relationships, a sequence-diagrammed test run, the failure-diagnostics pipeline, CI, and
containerization) - this README covers setup, usage, and the reasoning behind each decision.

## Setup

Requirements: Node.js 22.22.1+, npm (the floor is set by `lint-staged`, used by the Husky
pre-commit hook - the test suite itself would run fine on Node 20). A JRE (Java 17+) is only
needed if you want to generate the **Allure** report locally
(`npm run allure:generate`/`allure:open`/`allure:serve`) - it's not required to run the tests
themselves. The dev container already includes both a current Node and a headless JRE.

```bash
npm install              # installs deps + Playwright browsers via postinstall, and sets up Husky
npx playwright install chromium   # if browsers weren't installed automatically
```

## Running the suite

```bash
npm test                     # both sites, all specs
npm run test:alice           # Alice Lodging only
npm run test:firesky         # Firesky Retreats only
npx playwright test -g "TC2" # filter by name
npm run test:headed          # watch it run
npm run test:ui              # Playwright's interactive UI mode
npm run test:debug           # step-through debugger
```

One spec, `tests/demo-intentional-failure.spec.ts`, **fails on purpose** on every run — it exists
solely to demonstrate the failure-diagnostics pipeline (see below) and is clearly labeled and
isolated from the real TC1–TC6 specs so it's never mistaken for a genuine product bug.

## Viewing the report

Two reporters are configured, writing side by side (`list` for console output too):

```bash
npm run report                # Playwright's own HTML report (playwright-report/)
npx playwright show-trace <path-to-trace.zip>   # inspect a specific failure's trace

npm run allure:generate       # build the Allure report (allure-report/) from allure-results/
npm run allure:open           # serve the already-generated report on :9000
npm run allure:serve          # generate + serve in one step (ephemeral, doesn't write allure-report/)
npm run report:allure         # generate then open, in one command
```

Allure's report adds history/trends across runs, suite/severity categorization, and a richer
timeline view on top of what Playwright's own HTML report gives - both read from the same
`testInfo.attach()` calls, so the custom highlighted-failure screenshots (see below) show up in
either one.

Reports from an actual run against both sites (12 passed, 2 intentionally failed) are committed,
both from the same run:

- [`sample-report/index.html`](sample-report/index.html) — Playwright's own HTML report
- [`sample-report-allure/index.html`](sample-report-allure/index.html) — the Allure report

Open either directly in a browser, or serve statically (`npx serve sample-report` /
`npx serve sample-report-allure`), since some browsers block a `file://` page from loading its own
JS assets.

## Failure diagnostics

Every test failure gets, without any extra code in the test itself:

- a **screenshot** at the point of failure (`screenshot: 'only-on-failure'`)
- a **trace** (`trace: 'retain-on-failure'`) — full DOM snapshots, network, and console per action,
  viewable with `show-trace` or directly in the HTML report
- a **video** of the whole test
- the assertion's **expected vs. received** diff in the report

On top of that, `src/utils/screenshot.ts` adds a **highlighted-element screenshot**: `withHighlight()`
wraps a test's key assertion, and on failure draws a red outline around the specific locator that
assertion cared about, screenshots it, and attaches it to the report as
`failure-highlight (<label>)` — so the report doesn't just say _what_ failed, it visually points at
_where_. See it in the sample report on either intentional-failure entry.

## Project structure

```
src/
  config/sites.ts         # the one file that encodes how the two sites differ
  fixtures/base.fixture.ts# wires siteConfig + page objects into `test`, keyed by Playwright project
  pages/                  # Page Object Model (BasePage, HomePage, SearchResultsPage, ...)
    components/           # reusable pieces embedded in multiple pages (nav, footer, search widget)
  utils/                  # dynamic dates, overlay dismissal, failure-highlight screenshots
tests/                    # one spec per test case, written once, run against every project
playwright.config.ts      # defines the two projects (sites) and global run settings
```

## Design decisions

**Why Playwright Test (not a separate runner).** It's the one choice that gives parallelization,
retries, the trace viewer, and an HTML reporter with screenshot/video capture for free — every
diagnostic the assignment asks for is either built in or a thin layer on top of what's built in.

**Multi-site strategy: Playwright `projects`, not duplicated specs.** `playwright.config.ts`
declares one project per site × browser combination (`alice-chromium`, `alice-firefox`,
`alice-webkit`, `alice-edge`, and the same four for `firesky`), each carrying a custom `site`
option. Every file in `tests/` is written once and runs under every project automatically. Adding a
third site is a new `SiteConfig` entry in `src/config/sites.ts`; adding a browser is a one-line
addition to the `browsers` array in `playwright.config.ts` — no new test files, and (per the
confirmed findings below) usually no new selectors either.

**Both sites turned out to run on the same platform.** Live inspection found both footers credit
"Powered by Flow One" — a shared white-label vacation-rental platform. Confirmed live: the search
widget, filters modal, sort dropdown, and List-With-Us form validation are **byte-for-byte
identical** DOM/behavior on both sites (only the brand theme differs), so almost none of the
framework needed per-site branching at all. The two confirmed exceptions are called out explicitly
in `src/config/sites.ts` rather than hidden in conditionals:

- **Property card name element**: `<label class="text-size-heading3">` on Alice vs.
  `<h3 class="text-size-body">` on Firesky → `SiteConfig.cardNameSelector`.
- **Destination/category navigation paradigm**: Alice has a "Destinations" nav popover listing
  cities and collections; Firesky has a row of category pill tabs in the hero that navigate
  straight to `/category/{slug}` — no popover at all. `NavComponent` branches once on
  `site.navStyle` (a Template Method via composition) rather than forking into two page objects.

**Property/booking-criteria checks read structured data, not scraped text.** The presentational
layout around a property's address and guest-capacity badge differs enough between the two sites
(confirmed live: Firesky's address line sits _before_ the `<h1>`, Alice's sits _after_; the capacity
badge is "12 Guests" vs. "11 guests") that scraping it would mean more site-specific selectors.
Both sites, however, publish an identical `schema.org VacationRental` JSON-LD block for SEO with the
same fields (`numberOfBedrooms`, `numberOfBathroomsTotal`, `maximumAttendeeCapacity`, structured
`address`). `PropertyDetailsPage.getStructuredData()` reads that instead — one code path for both
sites, and arguably a _more_ authoritative source of truth than display text.

**Resilience findings baked into the framework, not worked around per test.**

- Both sites show a delayed marketing popup ("Get 20% Off Summer Special", confirmed live to fire
  anywhere from ~1s to ~8s after load, non-deterministically) plus a cookie-consent bar. Either can
  intercept clicks on the search widget. `src/utils/overlays.ts` polls and dismisses both for a
  bounded window after every navigation, with a minimum floor wait long enough to reliably catch the
  popup even when it fires late — this replaced an earlier version that exited as soon as it _looked_
  clean and was observed live to return before a late popup had even appeared.
- Selecting a destination auto-opens the arrival calendar, and selecting a departure date
  auto-opens the guests popover; explicitly clicking an already-open trigger **closes** it (confirmed
  live, cost real debugging time). `SearchWidgetComponent` checks `aria-expanded` before ever
  clicking a trigger that might already be open.
- The two sites' sort algorithm is confirmed case-_sensitive_ (plain code-unit comparison, not
  locale-aware) — `"Casa Grande..."` sorts before `"Casa de Mayo"` because `'G' < 'd'` in character
  code. TC2 replicates that exact comparator rather than the more "correct" `localeCompare`, so the
  assertion checks the site's actual behavior instead of asserting against a stricter standard the
  site doesn't implement.
- `'networkidle'` never resolves on either site (both keep a background analytics/polling
  connection open) — confirmed by it hanging for its full timeout. Waits after sort/filter actions
  poll for an actual DOM signal (first result changing, card count changing, or the full name list
  reading identically twice in a row) instead.

## Test scenarios

| Spec                               | Covers | Notable choices                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tc1-social-links.spec.ts`         | TC1    | Discovers social links by matching footer `<a>` hrefs against known platform domains — necessary because the footer also lists sister-brand sites ("Good Life Network") that aren't social media, and because the two sites show a genuinely different number of links (see below). Verifies each link is a well-formed `https://` URL on the right domain and isn't a dead link, without asserting a strict 2xx (see Assumptions). |
| `tc2-search-filter-sort.spec.ts`   | TC2    | Dynamic dates (`futureStayDates()`), guest count, two filters (Bedrooms stepper, Pet Friendly toggle), and two sort options. Sort is verified two ways: each result list is checked against its own correctly-ordered copy (not against the other list), because the live site can return a marginally different result set between two separate network calls.                                                                     |
| `tc3-property-details.spec.ts`     | TC3    | Opens a property from _filtered_ results; checks address/capacity via structured data and the booking widget's carried-over dates/guests against the original search.                                                                                                                                                                                                                                                               |
| `tc4-navigation.spec.ts`           | TC4    | Drives each site's differently-implemented nav component through to an opened property.                                                                                                                                                                                                                                                                                                                                             |
| `tc5-form-validation.spec.ts`      | TC5    | List-With-Us form has no native `required` attributes — validation is fully custom. Checked two ways: the Submit button starts and stays disabled, and an invalid email/phone shows its own inline error text (confirmed exact copy: _"Please enter valid email address."_ / _"Not a valid phone number."_).                                                                                                                        |
| `tc6-guest-capacity.spec.ts`       | Bonus  | See below.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `demo-intentional-failure.spec.ts` | —      | Deliberately wrong assertion, to demonstrate the diagnostics pipeline.                                                                                                                                                                                                                                                                                                                                                              |

### Bonus: guest capacity consistency (TC6)

Searches for a deliberately large party (6 adults) and opens the first three results, checking each
property's _own_ stated capacity and booking-widget guest count against what was searched. The
single class of bug that most directly erodes trust in a booking flow is a property being surfaced
as bookable for a party it can't actually hold — a guest turning up to find the home sleeps fewer
people than the site implied during search. It complements TC3 (which checks one property) by
sampling several, since a capacity bug is more likely to show up on some listings than others.

## Notable differences between the two sites (documented, not just asserted around)

- **Social links**: Alice's footer lists Facebook/Instagram/LinkedIn; Firesky's footer currently
  lists **none** at all (confirmed live, checked across the whole page, not just the footer). Both
  are treated as valid outcomes — TC1 documents whichever it finds via a test annotation rather than
  assuming a fixed count.
- **List-With-Us form**: Firesky's form has one extra required field, "Property Location", that
  Alice's doesn't have (`siteConfig.listWithUsExtraFields`, logged as a TC5 annotation).
- **Navigation paradigm**: see Design decisions above.
- **Card-name markup and property-detail layout**: see Design decisions above.

## Assumptions, trade-offs, and limitations

- **TC1's "navigates to the expected destination" is checked structurally, not by a full page
  load.** A live HTTP round trip to `facebook.com` from Playwright's request context was confirmed
  to get bot-challenged (HTTP 400) even for a perfectly valid profile URL — asserting a 2xx there
  would be flaky against Facebook's bot defenses, not our own code. Instead the test asserts the
  link is a well-formed `https://` URL on the right domain (guaranteed by the domain-matching
  discovery step) plus a lenient reachability check that only fails on a genuine dead link.
- **Concurrency is capped** (`workers: 4` locally, `2` in CI) rather than left at Playwright's
  CPU-core default. Running all tests across both projects at full local parallelism was observed
  live to cause its own timeouts against the real sites — and it's simple courtesy not to hammer
  someone's production site like a load test.
- **Husky only runs lint-staged on `pre-commit`** (ESLint + Prettier on staged files), not the e2e
  suite. Running real browser tests against two live production sites on every commit would be slow
  and a poor commit-time gate for external systems we don't control; the suite is meant to be run
  explicitly or in CI instead.
- **Destination/date/guest values are pinned per-site constants** (`Palm Springs`, `Scottsdale`),
  not discovered dynamically, since the assignment scopes "dynamic" to _dates_ and guest counts
  specifically; a fully dynamic destination picker (e.g., picking a random option from the
  suggestion list each run) was considered out of scope for the time budget.
- **TC3/TC6 skip gracefully** (`test.skip`) if a particular filter/guest-count combination
  legitimately returns zero live results for that day's availability, rather than failing — that
  outcome depends on real-time inventory outside the test's control.

## Containerization

Everything lives under `.devcontainer/` - one setup covers both interactive development and
headless test execution, rather than maintaining a separate root-level image for each:

- **VS Code Dev Containers / GitHub Codespaces**: `devcontainer.json` points straight at the
  pinned Playwright image (`mcr.microsoft.com/playwright:v1.62.1-noble`), adding Git and Java 17
  devcontainer features, with the Playwright/ESLint/Prettier extensions, format-on-save, and port
  `9000` (Allure) preconfigured. Open the project → `F1` → `Dev Containers: Reopen in Container`.
- **Headless / CI, no VS Code**: build and run tests through the same `.devcontainer/Dockerfile` +
  `docker-compose.yml` via plain `docker compose`:

  ```bash
  docker compose -f .devcontainer/docker-compose.yml up -d --build
  docker compose -f .devcontainer/docker-compose.yml exec devcontainer bash -c "npm ci && npx playwright test"
  docker compose -f .devcontainer/docker-compose.yml down
  ```

  `docker-compose.yml` bind-mounts the whole workspace (`..:/workspace:cached`), so
  `playwright-report/`, `test-results/`, and `allure-results/` land directly on the host - no
  separate volume flags needed. `ipc: host` avoids Chromium crashing from Docker's small default
  `/dev/shm`. The image also installs a headless JRE (`openjdk-17-jre-headless`, no JDK/compiler) -
  just enough to run the `allure` CLI at runtime, since `allure-commandline` is a Java program.

See [`.devcontainer/DEVCONTAINER.md`](.devcontainer/DEVCONTAINER.md) for the full guide (prerequisites,
all three ways to open it, troubleshooting).

## Continuous Integration

`.github/workflows/playwright.yml` runs on every push and pull request targeting `main` or
`develop` (plus manual `workflow_dispatch`), against both live sites:

- Node 22 (matches `package.json`'s `engines.node`, driven by `lint-staged`) + Temurin JRE 17
  (for Allure) on `ubuntu-latest`, `npm ci`, `npx playwright install --with-deps chromium`.
- Runs `npx playwright test tests/tc*.spec.ts` - the glob deliberately excludes
  `demo-intentional-failure.spec.ts`, which fails on every run by design (see "Failure
  diagnostics" above) and would make the job permanently red if included; it's a local/manual
  diagnostics demo, not a CI gate.
- Uploads the Playwright HTML report and the generated Allure report as workflow artifacts on
  every run (`if: always()`), plus raw `test-results/` (screenshots/videos/traces) only on
  failure.
- A `concurrency` group cancels a superseded run (e.g. a second push to a branch with an open PR)
  rather than hitting both production sites twice at once - the same good-citizen reasoning as the
  capped local `workers` setting (see "Assumptions, trade-offs, and limitations" above).

## Husky

`npm install` runs `husky` via the `prepare` script, wiring `.husky/pre-commit` to run
`lint-staged` (ESLint `--fix` + Prettier on staged `*.ts`/`*.json`/`*.md`/`*.yml` files). Verified
live: a deliberately malformed `.ts` file is rejected at commit time; fixing it lets the commit
through.

## Playwright CLI

```bash
npx playwright test --project=alice-chromium
npx playwright test --project=alice-firefox --project=alice-webkit --project=alice-edge
npx playwright codegen https://www.alicelodging.com   # bootstrap locators interactively
npx playwright show-report
npx playwright show-trace test-results/<test>/trace.zip
```

## MCP configuration

`.mcp.json` registers the official Playwright MCP server as a **development aid**, not part of the
shipped suite:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```

It was used during development to drive a live browser against both sites and confirm real
selectors, ARIA labels, and page behavior (the search widget's auto-open/auto-close quirks, the
exact sort-option labels, the JSON-LD schema, the inline validation copy) before writing the page
objects — replacing guesswork with observed behavior for everything documented above.

## Claude Code skills

`.claude/skills/` holds two Claude Code skills, also development aids rather than part of the
shipped suite:

- **`add-test-scenario`** — project-specific: walks through adding a new test scenario following
  this repo's actual conventions (`SiteConfig`, the page-object/fixture split, `withHighlight`,
  dynamic dates, the known auto-open/popup/`networkidle` pitfalls) and the exact verification
  commands Husky's pre-commit hook enforces.
- **`playwright-cli`** — a general reference for Microsoft's `@playwright/cli` browser-automation
  CLI (`snapshot`/`click`/`eval`/`--debug=cli` attach, etc.), with a short section at the bottom
  tying it back to how this repo's selectors were actually confirmed live.
