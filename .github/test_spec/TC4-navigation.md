# TC4 — Navigation

**Automated coverage:** [tests/tc4-navigation.spec.ts](../../tests/tc4-navigation.spec.ts)
**Priority:** Medium
**Applicable sites:** Alice Lodging, Firesky Retreats — **the two sites use different navigation
patterns; follow the matching set of steps for each.**

## Objective

Confirm that the site's primary destination/category navigation is populated with real options,
responds to interaction, and successfully leads to a real, viewable property.

## Preconditions

- None.

## Part A — Alice Lodging (destination dropdown)

| #   | Step                                                                                                                                                                                                            | Expected result                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Navigate to the Alice Lodging homepage. Dismiss overlays.                                                                                                                                                       | Homepage loads.                                                       |
| 2   | Click the "Destinations" button in the site navigation.                                                                                                                                                         | A popover/panel opens.                                                |
| 3   | Inspect the popover's contents.                                                                                                                                                                                 | It lists one or more destination links (e.g. city names) — not empty. |
| 4   | Within the popover, click the link for "Palm Springs". (If "Palm Springs" also appears elsewhere on the page, e.g. a homepage carousel caption, make sure you're clicking the one **inside the open popover**.) | Page navigates to a destination landing page.                         |
| 5   | Observe the landing page.                                                                                                                                                                                       | At least one property card is shown.                                  |
| 6   | Click the first property card.                                                                                                                                                                                  | Property detail page opens.                                           |
| 7   | Check the property name (page heading).                                                                                                                                                                         | A real, non-empty property name is displayed.                         |

## Part B — Firesky Retreats (category pills)

| #   | Step                                                         | Expected result                                                                                                                                |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to the Firesky Retreats homepage. Dismiss overlays. | Homepage loads.                                                                                                                                |
| 2   | Look at the hero section of the homepage.                    | A row of category pill tabs is visible (e.g. For You, Pool, Group Homes, Pet Friendly, Premium Stays, Long Term Stay, Value Stay) — not empty. |
| 3   | Click the "Pool" pill.                                       | Page navigates to a `/category/...` URL.                                                                                                       |
| 4   | Observe the landing page.                                    | At least one property card is shown.                                                                                                           |
| 5   | Click the first property card.                               | Property detail page opens.                                                                                                                    |
| 6   | Check the property name (page heading).                      | A real, non-empty property name is displayed.                                                                                                  |

## Postconditions

None.

## Notes

- This is the one workflow where the two sites' _interaction pattern_ genuinely differs (not just
  copy/labels): Alice uses a popover menu, Firesky uses inline pill tabs with no popover step.
  Both are valid implementations of "destination/category navigation" — do not treat the
  difference itself as a bug.
