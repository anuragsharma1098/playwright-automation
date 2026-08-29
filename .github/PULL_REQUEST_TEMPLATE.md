## Summary

<!-- What does this PR change, and why? -->

## Type of change

- [ ] New test scenario (TC)
- [ ] Fix to an existing test / page object
- [ ] New site onboarded (`src/config/sites.ts`)
- [ ] Framework / infra (fixtures, config, CI, devcontainer)
- [ ] Docs only

## Scope

- Site(s) affected: <!-- alice / firesky / goodlife / all -->
- Test file(s): <!-- e.g. tests/tc1-social-links.spec.ts -->

## How this was tested

<!-- Commands run locally, e.g. -->
<!-- npm run test:chromium -->
<!-- npm run test:alice -->

- [ ] Ran the affected spec(s) locally against all three sites where relevant
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run format:check` passes
- [ ] New/changed selectors verified against the live site (not just a cached snapshot)

## Checklist

- [ ] New scenarios follow the `tc*.spec.ts` naming convention and are covered by CI's glob (or are deliberately excluded, like `demo-intentional-failure.spec.ts`, with a comment explaining why)
- [ ] Site-specific quirks live in `src/config/sites.ts` / page objects, not hardcoded in the test
- [ ] No `sample-report*`, `playwright-report/`, or `allure-report/` output committed
- [ ] Docs updated if behavior, structure, or setup changed (`README.md`, `docs/ARCHITECTURE.md`, `.github/test_spec/`)

## Related issues

<!-- Link any related issues or TC spec docs under .github/test_spec/ -->

## Screenshots / trace / report (if relevant)

<!-- Drop failure-highlight screenshots, a trace viewer link, or Allure/HTML report snippets here -->

## Notes for reviewers

<!-- Anything a reviewer should know: flaky steps, known limitations, follow-up work,
     assumptions/trade-offs made, or context that doesn't fit above -->
