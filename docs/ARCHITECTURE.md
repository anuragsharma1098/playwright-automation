# Architecture

This document explains how `vacation-rental-automation` is put together: the layered framework
design, why the two sites need almost no per-site branching, how a test run flows from `npx
playwright test` to a diagnosable failure, and how the surrounding tooling (CI, containers,
reporting) fits around it. For _why_ each decision was made, see `README.md` → "Design decisions" —
this document is the structural map; the README carries the reasoning and the confirmed live-site
findings behind it.

## 1. Layered overview

Four layers, each only aware of the one below it. Tests never touch a `Locator` directly; page
objects never touch `expect()`; only `src/config/sites.ts` knows the two sites are actually
different.

```mermaid
flowchart TB
    subgraph L1["tests/ — what to verify"]
        TC1[tc1-social-links.spec.ts]
        TC2[tc2-search-filter-sort.spec.ts]
        TC3[tc3-property-details.spec.ts]
        TC4[tc4-navigation.spec.ts]
        TC5[tc5-form-validation.spec.ts]
        TC6[tc6-guest-capacity.spec.ts]
        DEMO[demo-intentional-failure.spec.ts]
    end

    subgraph L2["src/fixtures — wiring"]
        FIX["base.fixture.ts<br/>test.extend: siteConfig, home, results, property, listWithUs"]
    end

    subgraph L3["src/pages — how to verify it (Page Object Model)"]
        BASE["BasePage<br/>open(), settleOverlays(), footer"]
        HOME[HomePage]
        RESULTS[SearchResultsPage]
        PROPERTY[PropertyDetailsPage]
        LISTWITHUS[ListWithUsPage]
        SEARCHW[SearchWidgetComponent]
        NAV[NavComponent]
        FOOTER[FooterComponent]

        BASE --> HOME
        BASE --> RESULTS
        BASE --> PROPERTY
        BASE --> LISTWITHUS
        HOME -.has-a.-> SEARCHW
        HOME -.has-a.-> NAV
        HOME -.has-a.-> FOOTER
    end

    subgraph L4["src/config + src/utils — shared knowledge"]
        SITES["sites.ts<br/>SiteConfig: validDestination, sortOptions,<br/>cardNameSelector, navStyle, ..."]
        DATES[dates.ts]
        OVERLAYS[overlays.ts]
        SCREENSHOT["screenshot.ts<br/>withHighlight / attachFailureHighlight"]
    end

    L1 --> FIX
    FIX --> L3
    L3 --> SITES
    L3 --> DATES
    L3 --> OVERLAYS
    L1 --> SCREENSHOT

    SITE1[("alicelodging.com")]
    SITE2[("fireskyretreats.com")]
    L3 -.Playwright actions.-> SITE1
    L3 -.Playwright actions.-> SITE2
```

**Why this shape:** every spec in `tests/` is written once and runs against both sites because
Playwright `projects` (see §3) inject a different `siteConfig` + `baseURL` per run - the spec
itself never branches on which site it's talking to.

## 2. Page objects and components (class relationships)

```mermaid
classDiagram
    class BasePage {
        <<abstract>>
        #page: Page
        #site: SiteConfig
        +open(path) Promise~void~
        +footer Locator
    }

    class HomePage {
        +search: SearchWidgetComponent
        +nav: NavComponent
        +footerLinks: FooterComponent
        +goto() Promise~void~
    }

    class SearchResultsPage {
        +getResultNames() Promise~string[]~
        +getResultCount() Promise~number~
        +criteriaFromUrl() SearchCriteriaFromUrl
        +openFilters() Promise~void~
        +incrementBedrooms(times) Promise~void~
        +togglePetFriendly() Promise~void~
        +applyFilters() Promise~void~
        +sortBy(optionLabel) Promise~void~
        +openFirstResult() Promise~void~
        +getResultHrefs(limit) Promise~string[]~
    }

    class PropertyDetailsPage {
        +name Locator
        +getStructuredData() Promise~VacationRentalSchema~
        +getGuestCapacity() Promise~number~
        +getLocality() Promise~string~
        +getBookingWidgetSummary() Promise~BookingWidgetSummary~
    }

    class ListWithUsPage {
        +nameInput/emailInput/phoneInput/messageTextarea Locator
        +submitButton Locator
        +errorFor(field) Locator
        +isSubmitDisabled() Promise~boolean~
        +fillWithInvalidContactDetails() Promise~void~
    }

    class SearchWidgetComponent {
        +selectDestination(destination) Promise~void~
        +selectDates(checkInISO, checkOutISO) Promise~void~
        +setAdults(count) Promise~void~
        +submit() Promise~void~
        +search(criteria) Promise~void~
    }

    class NavComponent {
        +browseToPropertyViaDestinationNav() Promise~string~
        -browseViaDestinationDropdown() Promise~string~
        -browseViaCategoryPills() Promise~string~
    }

    class FooterComponent {
        +discoverSocialLinks() Promise~SocialLink[]~
    }

    class SiteConfig {
        <<interface>>
        name: SiteName
        validDestination: string
        sortOptions: [string, string]
        cardNameSelector: string
        navStyle: NavStyle
        listWithUsExtraFields: string[]
    }

    BasePage <|-- HomePage
    BasePage <|-- SearchResultsPage
    BasePage <|-- PropertyDetailsPage
    BasePage <|-- ListWithUsPage
    HomePage *-- SearchWidgetComponent
    HomePage *-- NavComponent
    HomePage *-- FooterComponent
    BasePage --> SiteConfig : reads
    NavComponent --> SiteConfig : branches on navStyle
    SearchResultsPage --> SiteConfig : reads cardNameSelector, sortOptions
```

`NavComponent` is the one class with an internal branch (`site.navStyle === 'destinationDropdown'
? ... : ...`) - a Template Method via composition rather than two subclassed page objects, because
it's the only place the two sites' _interaction pattern_ (not just copy) genuinely diverges: a
"Destinations" popover on Alice vs. category pill tabs on Firesky.

## 3. Multi-site strategy: one spec, a site × browser grid of Playwright projects

```mermaid
flowchart LR
    CONFIG["playwright.config.ts<br/>siteConfigs × browsers"]
    P1["alice-chromium / -firefox / -webkit / -edge<br/>use: { baseURL: alicelodging.com, site: 'alice', ...device }"]
    P2["firesky-chromium / -firefox / -webkit / -edge<br/>use: { baseURL: fireskyretreats.com, site: 'firesky', ...device }"]
    SPEC["tests/tc2-search-filter-sort.spec.ts<br/>(written once)"]
    FIXTURE["base.fixture.ts<br/>siteConfig = siteConfigs[site]"]
    SITES["sites.ts<br/>siteConfigs.alice / siteConfigs.firesky"]

    CONFIG --> P1
    CONFIG --> P2
    P1 -- "site option" --> FIXTURE
    P2 -- "site option" --> FIXTURE
    FIXTURE --> SITES
    SPEC -- "runs under all 8" --> P1
    SPEC -- "runs under all 8" --> P2
```

Adding a third site is a new `SiteConfig` entry in `sites.ts`; adding a browser is a one-line
addition to the `browsers` array - no new test files, and (per the confirmed platform-parity
findings in the README) usually no new selectors either.

## 4. A test run, end to end (TC2 example)

```mermaid
sequenceDiagram
    participant T as tc2-search-filter-sort.spec.ts
    participant F as base.fixture.ts
    participant H as HomePage
    participant SW as SearchWidgetComponent
    participant R as SearchResultsPage
    participant Site as alicelodging.com / fireskyretreats.com

    T->>F: destructure { home, results, siteConfig }
    F-->>T: page objects pre-wired with this project's SiteConfig
    T->>H: home.goto()
    H->>Site: page.goto('/')
    H->>H: settleOverlays() (dismiss delayed marketing popup + cookie bar)
    T->>SW: home.search.search({ destination, checkInISO, checkOutISO, adults })
    SW->>Site: select destination -> calendar auto-opens -> pick dates -> guests auto-opens -> submit
    Site-->>SW: navigates to /listings?checkIn=...&checkOut=...&adults=...
    T->>R: results.getResultCount() / sortBy() / openFilters()
    R->>Site: read DOM via siteConfig.cardNameSelector, interact with filters/sort
    Site-->>R: result names, counts
    T->>T: expect(...) against site's own confirmed sort order (case-sensitive)
    alt assertion fails
        T->>T: withHighlight() catches it
        T->>Site: draw red outline around the locator, screenshot
        T->>T: testInfo.attach('failure-highlight (...)')
        Note over T: rethrows - Playwright's own trace/screenshot/video capture still fires
    end
```

## 5. Failure diagnostics pipeline

```mermaid
flowchart TD
    FAIL["A test assertion fails"]

    subgraph Builtin["Playwright built-ins (playwright.config.ts)"]
        SS["screenshot: only-on-failure"]
        VID["video: retain-on-failure"]
        TRACE["trace: retain-on-failure"]
    end

    subgraph Custom["src/utils/screenshot.ts"]
        WH["withHighlight() wraps the test's key assertion"]
        AFH["attachFailureHighlight()<br/>draws a red outline around the locator,<br/>screenshots, testInfo.attach('failure-highlight (label)')"]
        WH -->|on catch| AFH
    end

    FAIL --> Builtin
    FAIL --> WH

    subgraph Reporters["playwright.config.ts reporter[]"]
        LIST["list (console)"]
        HTML["html -> playwright-report/"]
        ALLURE["allure-playwright -> allure-results/"]
    end

    Builtin --> Reporters
    AFH --> Reporters

    ALLURE --> GEN["npm run allure:generate"]
    GEN --> AREPORT["allure-report/"]

    HTML --> LOCAL1["playwright-report/ (local, gitignored)"]
    AREPORT --> LOCAL2["allure-report/ (local, gitignored)"]
```

`demo-intentional-failure.spec.ts` exists solely to exercise this whole pipeline on demand - it's
excluded from CI (see §6) and kept out of the `tc*` naming so it's never mistaken for a real
product bug.

## 6. CI pipeline (`.github/workflows/playwright.yml`)

```mermaid
flowchart LR
    TRIGGER["push or pull_request<br/>-> main or develop<br/>(+ workflow_dispatch)"] --> CONC["concurrency group<br/>cancels a superseded run"]
    CONC --> JOB["job runs inside container:<br/>mcr.microsoft.com/playwright:v1.62.1-noble"]
    JOB --> CHECKOUT["actions/checkout"]
    CHECKOUT --> NODE["setup-node 22<br/>(lint-staged floor)"]
    NODE --> JAVA["setup-java 17 Temurin<br/>(for allure generate)"]
    JAVA --> CI["npm ci"]
    CI --> ALLUREPRE["allure:clean"]
    ALLUREPRE --> RUN["npx playwright test tests/tc*.spec.ts<br/>--project='*-chromium' --project='*-webkit'<br/>(glob excludes demo-intentional-failure.spec.ts;<br/>edge projects skipped - not in this image)"]
    RUN --> ALLUREGEN["allure generate (always)"]
    ALLUREGEN --> ART1["upload playwright-report/ (always)"]
    ALLUREGEN --> ART2["upload allure-report/ (always)"]
    ALLUREGEN --> ART3["upload junit-report.xml (always)"]
    RUN -.on failure.-> ART4["upload test-results/ (failure only)"]
```

## 7. Containerization

Two entry points into the same `.devcontainer/` image, one image definition:

```mermaid
flowchart TB
    IMG["mcr.microsoft.com/playwright:v1.62.1-noble<br/>(Chromium + Firefox + WebKit preinstalled)"]

    IMG --> DCJSON["devcontainer.json<br/>references IMG directly (no build step)<br/>+ Git & Java 17 devcontainer features"]
    IMG --> DCFILE["Dockerfile (.devcontainer/)<br/>+ git, curl, sudo, openjdk-17-jre-headless<br/>+ node_modules ownership fix + git safe.directory fix"]

    DCJSON --> VSCODE["VS Code Dev Containers /<br/>GitHub Codespaces<br/>'Reopen in Container'"]
    DCFILE --> COMPOSE["docker-compose.yml (.devcontainer/)<br/>bind-mounts workspace,<br/>named volume for node_modules"]
    COMPOSE --> MANUAL["docker compose up -d --build<br/>+ exec ... npm ci && npx playwright test"]

    VSCODE --> DEV["Interactive development"]
    MANUAL --> HEADLESS["Headless test runs outside VS Code"]
```

Both paths pin the same base image tag on purpose - "works in the dev container" and "works in
CI" (§6 runs the job in that same image via `container:`, installing Node/Java into it) mean the
same Node/browser/OS-dependency versions where it matters (the browsers), with no separate
image-build step in CI beyond `npm ci`.

## 8. Directory reference

```
vacation-rental-automation/
├── src/
│   ├── config/
│   │   └── sites.ts                    # SiteConfig type + the two site entries - the only place
│   │                                    # the sites' known differences live
│   ├── fixtures/
│   │   └── base.fixture.ts             # test.extend(): siteConfig + pre-wired page objects,
│   │                                    # keyed by the Playwright project's `site` option
│   ├── pages/
│   │   ├── BasePage.ts                 # shared open() / settleOverlays() / footer
│   │   ├── HomePage.ts                 # + SearchWidgetComponent, NavComponent, FooterComponent
│   │   ├── SearchResultsPage.ts        # /listings: filters, sort, result grid
│   │   ├── PropertyDetailsPage.ts      # /listings/{id}: schema.org JSON-LD + booking widget
│   │   ├── ListWithUsPage.ts           # /list-with-us: form + inline validation
│   │   └── components/
│   │       ├── SearchWidgetComponent.ts  # destination -> dates -> guests -> submit,
│   │       │                              # handles the auto-open/close quirks
│   │       ├── NavComponent.ts           # destinationDropdown vs. categoryPills branch
│   │       └── FooterComponent.ts        # social-link discovery by domain match
│   └── utils/
│       ├── dates.ts                    # futureStayDates() - dynamic check-in/out
│       ├── overlays.ts                 # settleOverlays() - dismiss the marketing popup + cookies
│       └── screenshot.ts               # withHighlight() / attachFailureHighlight()
│
├── tests/
│   ├── tc1-social-links.spec.ts        # TC1
│   ├── tc2-search-filter-sort.spec.ts  # TC2
│   ├── tc3-property-details.spec.ts    # TC3
│   ├── tc4-navigation.spec.ts          # TC4
│   ├── tc5-form-validation.spec.ts     # TC5
│   ├── tc6-guest-capacity.spec.ts      # bonus - run against both projects, same as TC1-5
│   └── demo-intentional-failure.spec.ts  # deliberate failure - excluded from CI (see §6)
│
├── .claude/skills/
│   ├── add-test-scenario/SKILL.md      # project-specific: how to add a new TC here
│   └── playwright-cli/SKILL.md         # generic @playwright/cli reference + references/
│
├── .devcontainer/                      # devcontainer.json + Dockerfile + docker-compose.yml
│                                        # (see §7 and DEVCONTAINER.md)
├── .github/
│   ├── workflows/
│   │   └── playwright.yml              # CI (see §6)
│   ├── test_spec/                      # TC1-TC6 written specs (manual test-case docs)
│   └── PULL_REQUEST_TEMPLATE.md        # PR checklist: scope, local test runs, docs updated
│
├── docs/
│   ├── ARCHITECTURE.md                 # this file
│   └── adding-new-sites/README.md      # step-by-step guide for adding a new site
│
├── playwright.config.ts                # the site × browser project grid, reporters, timeouts/retries/workers
├── package.json / package-lock.json    # scripts, pinned devDependency versions
├── tsconfig.json                       # strict TS, `@src/*` / `@tests/*` path aliases
├── eslint.config.js / .prettierrc.json # lint/format rules enforced by Husky's pre-commit hook
├── .mcp.json                           # Playwright MCP server (dev aid, not part of the suite)
└── README.md                           # setup, usage, design rationale, assumptions/trade-offs
```
