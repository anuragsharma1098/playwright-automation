# Adding a New Site

How to bring any new site — the 3rd, the 10th, the N-th — into this framework. Read this before
touching code; it exists so a new site is a config change, not a new code path.

## Why this is cheap: the existing design

The framework already treats "how many sites" as an open question:

- **`playwright.config.ts`** builds `projects` as `Object.values(siteConfigs).flatMap(...)` — a
  cross product of every entry in `siteConfigs` × every entry in `browsers`. It does not enumerate
  sites by name. Add a `SiteConfig` entry and its projects (`<site>-chromium`, `<site>-firefox`,
  `<site>-webkit`, `<site>-edge`) exist automatically.
- **Every spec in `tests/`** imports `{ test, expect }` from `src/fixtures/base.fixture.ts` and only
  ever reads `siteConfig`/`site` off the fixture. Zero spec files reference `'alice'` or `'firesky'`
  by name (verified: `grep`ing `tests/` for either string returns nothing). The same spec runs
  unmodified under any number of site projects.
- **Page objects and components** (`src/pages/**`) take `(page, site: SiteConfig)` and branch only
  on _behavior traits_ of `SiteConfig` (`site.navStyle`, `site.cardNameSelector`, …), never on
  `site.name`. `NavComponent` is the one Template Method example — see Step 5.

So the shape of this doc is: one mandatory step (register the site), one required verification
pass (confirm its markup live), and everything else is either automatic or optional polish.

## File map

| File                                      | Touch for a new site?                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/config/sites.ts`                     | **Yes — the only mandatory change.** New `SiteName` union member + `SiteConfig` entry.                                       |
| `playwright.config.ts`                    | No. Projects are generated from `siteConfigs` automatically.                                                                 |
| `src/fixtures/base.fixture.ts`            | No, unless you want the new site as the default when a spec is run without `--project` (rare).                               |
| `src/pages/**`, `src/pages/components/**` | Only if the new site has a genuine behavioral difference not already covered by an existing `SiteConfig` field (see Step 5). |
| `tests/**`                                | No. Specs are already site-agnostic.                                                                                         |
| `package.json` scripts                    | Optional convenience (`test:<newsite>`), not required.                                                                       |
| `.github/workflows/playwright.yml`        | No. It filters projects by browser wildcard (`--project='*-chromium'`), which sweeps up any site automatically.              |
| `README.md` / `docs/ARCHITECTURE.md`      | Optional, recommended for accuracy.                                                                                          |

## Prerequisites: confirm before you code

Alice Lodging and Firesky Retreats happen to run on the same white-label "Flow One" platform, which
is _why_ almost nothing branches per site today — it was confirmed live, not assumed. A third (or
Nth) site is not guaranteed to share that platform. Before writing a single `SiteConfig` field:

1. Open the new site's homepage, `/listings` results page, and `/list-with-us`-equivalent form live
   in a browser (or via `npx playwright codegen <url>` — see the `playwright-cli` skill).
2. Compare its DOM against the confirmed exceptions this framework already tracks: the property
   card name element (`cardNameSelector`), the destination/category nav pattern (`navStyle`), and
   any extra inquiry-form fields (`listWithUsExtraFields`).
3. Do not guess a selector or assume parity. Guessing has previously cost real debugging time in
   this repo (see `README.md`); every existing locator was confirmed live first.

## Step-by-step

### Step 1 — Register the site in `src/config/sites.ts` (mandatory)

Add the site to the `SiteName` union and add a matching entry to `siteConfigs`. Worked example,
adding a fictitious third site "Sedona Stays":

```ts
// before
export type SiteName = 'alice' | 'firesky';

// after
export type SiteName = 'alice' | 'firesky' | 'sedona';
```

```ts
export const siteConfigs: Record<SiteName, SiteConfig> = {
  alice: {/* ...unchanged... */},
  firesky: {/* ...unchanged... */},
  sedona: {
    name: 'sedona',
    displayName: 'Sedona Stays',
    baseURL: 'https://www.sedonastays.com',
    validDestination: 'Sedona', // confirmed live: returns results
    sortOptions: ['Name - A to Z', 'Name - Z to A'],
    cardNameSelector: 'h3.text-size-body', // confirmed live against the real DOM
    listWithUsPath: '/list-with-us',
    listWithUsExtraFields: [], // confirmed live: no extra fields on this form
    navStyle: 'categoryPills', // confirmed live: matches Firesky's pattern
    navCategoryLabel: 'Pool',
  },
};
```

Every field here must be confirmed against the live site (Step 4/Prerequisites), not copied from
Alice/Firesky on the assumption it matches.

### Step 2 — `playwright.config.ts`: nothing to do

`projects: Object.values(siteConfigs).flatMap((site) => browsers.map((browser) => ({ name:
\`${site.name}-${browser.name}\`, ... })))`picks up the new`sedona`entry automatically. Adding
Sedona to a 2-site, 4-browser matrix produces four new projects for free:`sedona-chromium`,
`sedona-firefox`, `sedona-webkit`, `sedona-edge` — no edit needed here.

### Step 3 — `base.fixture.ts` default (optional, usually skip)

```ts
site: ['alice', { option: true }],
```

This is only the fallback used when a spec file is run directly without a `--project` flag (rare —
normally you always pass `--project`). Leave it pointing at `'alice'` unless you have a specific
reason to change the default.

### Step 4 — Confirm the new site's behavior live

Using the `playwright-cli` skill or `npx playwright codegen <baseURL>`, verify:

- The `/listings` results grid renders property names under the selector you put in
  `cardNameSelector`.
- The destination/category navigation matches one of the existing `NavStyle` values
  (`'destinationDropdown'` or `'categoryPills'`) — or doesn't, see Step 5.
- The inquiry form's field set vs. `listWithUsExtraFields`.
- The footer social-link discovery (`FooterComponent.discoverSocialLinks()`) already works by
  domain-matching hrefs, not hardcoded counts — this typically needs no changes at all for a new
  site, but confirm the footer markup is a real `<footer>` element (`BasePage.footer`).

### Step 5 — Only add site-specific code for a _confirmed_ genuine difference

The rule enforced throughout this codebase: **extend `SiteConfig`, never branch on `site.name`.**

- If the new site's card name element uses a selector already covered by `cardNameSelector`, or its
  nav matches an existing `NavStyle`, Step 1's config entry is the entire change — no code in
  `src/pages/**` needs to move.
- If the new site's nav pattern is a **third, genuinely distinct** interaction (not a dropdown, not
  pills), extend the `NavStyle` union and add a matching branch — this is the one place in the repo
  built as a Template Method for exactly this scenario:

  ```ts
  // src/config/sites.ts
  export type NavStyle = 'destinationDropdown' | 'categoryPills' | 'searchOnlyNav';
  ```

  ```ts
  // src/pages/components/NavComponent.ts
  async browseToPropertyViaDestinationNav(): Promise<string> {
    switch (this.site.navStyle) {
      case 'destinationDropdown': return this.browseViaDestinationDropdown();
      case 'categoryPills': return this.browseViaCategoryPills();
      case 'searchOnlyNav': return this.browseViaSearchOnlyNav();
    }
  }

  private async browseViaSearchOnlyNav(): Promise<string> {
    // new site-specific interaction, confirmed live
  }
  ```

  Never write `if (this.site.name === 'sedona')` inline — that reintroduces per-site branching the
  `SiteConfig` design exists to avoid, and it won't generalize to site #4.

### Step 6 — Run the suite against the new site

```bash
# one browser, quick check
npx playwright test --project=sedona-chromium

# every browser for just this site
npx playwright test --project='sedona-*'

# a single spec, to iterate fast while wiring up the config
npx playwright test tests/tc1-social-links.spec.ts --project=sedona-chromium
```

### Step 7 — (Optional) convenience npm script

Mirrors the existing per-site scripts in `package.json`:

```json
"test:sedona": "playwright test --project=sedona-chromium --project=sedona-firefox --project=sedona-webkit --project=sedona-edge"
```

Not required — `--project='sedona-*'` does the same thing without touching `package.json`.

### Step 8 — CI: nothing to do

`.github/workflows/playwright.yml` already runs:

```bash
npx playwright test tests/tc*.spec.ts --project='*-chromium' --project='*-firefox' --project='*-webkit'
```

The `*` wildcard matches any site prefix, so `sedona-chromium`/`sedona-firefox`/`sedona-webkit` are
included the next time CI runs — no workflow edit needed. `*-edge` projects are excluded for every
site (existing sites included), because the CI container image doesn't bundle real Microsoft Edge;
that's a browser-tooling limitation, not something that varies per site.

### Step 9 — Quality gates (mandatory before committing)

```bash
npm run typecheck
npm run lint
npm run format:check
```

These are exactly what Husky's `pre-commit` hook enforces via `lint-staged` — a change that fails
one of them is rejected at commit time regardless.

### Step 10 — Update docs (recommended, not required)

- `README.md` — if the new site needed a new `SiteConfig` field or `NavStyle` variant, add it to
  "Notable differences between sites" the same way `cardNameSelector`/`navStyle` are documented.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — its multi-site diagram currently names Alice/Firesky
  explicitly; consider adding the new site's node if you want the diagram to stay literal (not
  required for the framework to function — the diagram is documentation, not code).

## Scaling to N sites

Nothing above is site-count-specific. Site #4, #5, ... #N is Steps 1–5 repeated once per site:

- **Projects scale automatically.** Total projects = (number of sites) × (number of browsers).
  5 sites × 4 browsers = 20 projects, generated with zero `playwright.config.ts` changes beyond
  what Step 1 already produces.
- **No file grows per site** except `siteConfigs` itself (one object literal entry) and,
  occasionally, `NavStyle`/`NavComponent` if a genuinely new interaction pattern shows up — that
  growth is bounded by the number of _distinct behaviors_, not the number of sites, since sites
  sharing a pattern (e.g. three sites all using `'categoryPills'`) need zero new code.
- **Test files never grow.** `tests/tcN-*.spec.ts` count stays fixed; each spec simply runs under
  more projects.

## Checklist

- [ ] `SiteName` union updated in `src/config/sites.ts`
- [ ] `siteConfigs` entry added, every field confirmed against the live site (not copied/guessed)
- [ ] If nav pattern doesn't match an existing `NavStyle`: union extended + `NavComponent` branch
      added (no `site.name === '...'` branches anywhere)
- [ ] `npm run typecheck && npm run lint && npm run format:check` all pass
- [ ] Full spec suite passes live: `npx playwright test --project='<newsite>-*'`
- [ ] (Optional) `package.json` convenience script added
- [ ] (Optional) `README.md` / `docs/ARCHITECTURE.md` updated if new `SiteConfig` fields were
      introduced

## Common pitfalls

- **Assuming platform parity without confirming live.** The existing two sites match closely
  because that was verified, not because it's guaranteed. A new site could look identical and still
  differ in one selector — confirm before writing.
- **Branching on `site.name` inside a page object or component.** Always add/extend a `SiteConfig`
  field or a `NavStyle` variant instead — that's what keeps `tests/**` and `src/pages/**` from
  needing a per-site fork.
- **Hardcoded dates, `waitForTimeout`, or `'networkidle'`** when wiring up a new site's page-object
  code. Same anti-patterns called out for existing sites apply identically to new ones — use
  `futureStayDates()` from `src/utils/dates.ts` and the DOM-signal/`settleOverlays` waiting
  strategies already used throughout `src/pages/**`.
- **Forgetting Edge is CI-excluded for every site, not just the original two.** If Edge coverage
  for the new site matters, run it locally/manually (`npx playwright test --project='<newsite>-edge'`)
  rather than expecting CI to cover it.
