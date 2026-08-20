---
name: add-test-scenario
description: Add a new end-to-end test scenario to the vacation-rental-automation Playwright suite, following this repo's Page Object Model, SiteConfig, fixture, and diagnostics conventions, then run its quality gates. Use whenever asked to add, extend, or automate a new test case, user flow, or page coverage in tests/ for alicelodging.com / fireskyretreats.com.
argument-hint: <scenario or flow to cover, e.g. "add a test that verifies the newsletter signup form">
---

You are adding test coverage to the vacation-rental-automation framework (Playwright + TypeScript,
Page Object Model, dual-site via Playwright projects). Don't freelance a structure — this repo has
a fixed shape (see `README.md` → "Design decisions" and "Project structure"). Work through these
steps in order.

## 1. Scope the scenario

Both sites (`alicelodging.com`, `fireskyretreats.com`) run on the same underlying platform ("Flow
One") - confirmed live that the search widget, filters modal, sort dropdown, and List-With-Us
validation are byte-for-byte identical between them. **Default assumption: one spec, no site
branching.** Only reach for a site-specific code path if you've actually confirmed (live, not
guessed) that the markup or flow genuinely differs — the two known exceptions
(`SiteConfig.cardNameSelector`, `SiteConfig.navStyle`) exist for exactly that reason and are
documented in `README.md` → "Notable differences between the two sites".

Identify:

- Which numbered test case this is or extends (`TC1`…`TC6`), or whether it's a new bonus scenario.
- Which spec file it belongs in (`tests/tcN-*.spec.ts`) or whether it needs a new
  `tests/tcN-<short-name>.spec.ts`.
- Whether it needs a destination/date/guest search first (reuse `home.search.search(...)`, never
  hardcode a date - see step 4).

## 2. Page objects and components first

Check `src/pages/` (page objects: `HomePage`, `SearchResultsPage`, `PropertyDetailsPage`,
`ListWithUsPage`) and `src/pages/components/` (`SearchWidgetComponent`, `NavComponent`,
`FooterComponent`) for locators/actions that don't exist yet.

- New locators/methods go on the relevant page object or component class, extending `BasePage`
  (`src/pages/BasePage.ts`) - never inline a raw locator directly inside a test file.
- Prefer role/label/text-based locators (`getByRole`, `getByLabel`, `getByText`) over CSS, and
  confirm them live before committing to them - see the `playwright-cli` skill for how selectors
  in this repo were actually discovered (not guessed) against both production sites.
- If a genuine per-site difference is required, add a field to `SiteConfig` in
  `src/config/sites.ts` (with a comment explaining what was confirmed live and why) rather than
  branching on `site.name === 'alice'` inline in a page object.
- If the scenario needs a page object that doesn't exist yet, model it on the existing ones:
  constructor takes `(page, site)` via `BasePage`, exposes locator getters and small async action
  methods, no test-framework `expect()` calls inside page objects - assertions belong in the spec.

## 3. Fixtures

Specs get pre-wired page objects from `src/fixtures/base.fixture.ts` - destructure `home`,
`results`, `property`, `listWithUs`, and `siteConfig` from the test args rather than constructing
page objects manually. If a new page object class was added in step 2, wire it into
`base.fixture.ts`'s `Fixtures` interface and `test.extend(...)` the same way the existing ones are.

## 4. Write the spec

Match the shape of `tests/tc1-social-links.spec.ts` through `tests/tc6-guest-capacity.spec.ts`:

- Import `{ expect, test }` from `@src/fixtures/base.fixture` (never `@playwright/test` directly -
  that fixture is what supplies `siteConfig` and the page objects).
- A `/** ... */` block comment above `test.describe` explaining _why_ the test is shaped the way it
  is, especially anything confirmed live that isn't obvious from the code (see existing specs for
  the tone/level of detail expected).
- Dynamic dates via `futureStayDates()` from `@src/utils/dates` - never a hardcoded date string.
- Wrap the test's key assertion(s) in `withHighlight(page, testInfo, locator, label, async () => {
...})` from `@src/utils/screenshot` so a failure gets the custom highlighted-element screenshot on
  top of Playwright's own trace/screenshot/video - see `README.md` → "Failure diagnostics".
- Use `testInfo.annotations.push({ type, description })` to record discovered values (a property
  name, a validation message, a count) in the report - don't just `console.log`.
- `test.skip(condition, reason)` for a legitimate "no live inventory matches this search" case
  (see `tc3`/`tc6`), never a bare early `return`.
- No `waitForTimeout` as a fix for flakiness and no `'networkidle'` - both are known dead ends
  against these two sites (persistent analytics/polling connections keep `networkidle` from ever
  resolving; see `README.md` → "Design decisions" for the actual waiting strategies used instead:
  polling for a DOM signal, or `src/utils/overlays.ts`'s bounded settle window for the delayed
  marketing popup).
- If the flow needs to select a destination/dates/guests, call `home.search.search({ destination:
siteConfig.validDestination, checkInISO, checkOutISO, adults })` - don't reimplement the
  auto-opening-calendar/guests-popover dance directly in the spec (see `SearchWidgetComponent` for
  why: selecting a destination auto-opens the arrival calendar, selecting a departure date
  auto-opens the guests popover, and clicking an already-open trigger closes it).

## 5. Verify

Run, in order, and fix anything that fails before considering the task done:

```bash
npm run typecheck
npm run lint
npm run format:check
```

These are exactly what Husky's `pre-commit` hook enforces via `lint-staged` - a change that fails
one of them will be rejected at commit time.

Then run the new/changed spec directly against **both** projects to confirm it passes live (not
just one site - see step 1 on why the same spec should work for both):

```bash
npx playwright test <path/to/spec.ts> --project=alice-chromium
npx playwright test <path/to/spec.ts> --project=firesky-chromium
```

If a locator or flow needs live verification first, use the `playwright-cli` skill to confirm it
against the real site before writing it into the page object - this repo's existing locators were
all confirmed this way, and guessing has repeatedly cost real debugging time (documented in
`README.md`).

## 6. Report back

Summarize what was added: files touched, which `SiteConfig` fields (if any) were added and why,
whether a new page object/fixture was introduced, and whether `README.md`'s "Test scenarios" table
needs a corresponding row (flag it, don't edit it unless asked).
