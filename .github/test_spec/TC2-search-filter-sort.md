# TC2 — Search, Filtering, and Sorting

**Automated coverage:** [tests/tc2-search-filter-sort.spec.ts](../../tests/tc2-search-filter-sort.spec.ts)
**Priority:** High
**Applicable sites:** Alice Lodging, Firesky Retreats (run independently on each)

## Objective

Confirm that a dynamic search actually takes effect (URL and results reflect what was entered),
that sorting by name produces a correctly ordered list in both directions, and that applying
filters never _increases_ the result count versus the unfiltered baseline.

## Preconditions

- None.

## Test data

Use dynamically generated dates so the test never depends on a hardcoded calendar date:

- **Check-in**: 14 days from today
- **Check-out**: check-in + 4 nights
- **Adults**: 2
- **Destination**: "Palm Springs" (Alice Lodging) or "Scottsdale" (Firesky Retreats)
- **Sort options to try, in order**: "Name - A to Z", then "Name - Z to A"

## Steps and expected results

| #   | Step                                                                                                                                                                                                                                             | Expected result                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to the homepage. Dismiss overlays.                                                                                                                                                                                                      | Homepage loads with the search widget visible.                                                                                                                  |
| 2   | Click the "Where to next?" field and type the destination (see Test data). Select the matching option from the dropdown that appears.                                                                                                            | Destination is selected; the arrival-date calendar opens automatically.                                                                                         |
| 3   | In the calendar, select the check-in date, then the check-out date. (If the target month isn't shown yet, click "Next month" until it is.)                                                                                                       | Both dates are selected; the Guests popover opens automatically.                                                                                                |
| 4   | In the Guests popover, click the "+" (increment adults) control twice, to reach 2 adults.                                                                                                                                                        | Adults count shows 2.                                                                                                                                           |
| 5   | Click "Search".                                                                                                                                                                                                                                  | Page navigates to a `/listings?...` URL.                                                                                                                        |
| 6   | Inspect the resulting URL's query parameters.                                                                                                                                                                                                    | `checkIn` equals the check-in date from step 3, `checkOut` equals the check-out date, and `adults=2` — all matching what was entered, not stale/default values. |
| 7   | Count the property cards shown in the results grid. Record this as the **baseline count**.                                                                                                                                                       | Baseline count is greater than 0 for the chosen destination.                                                                                                    |
| 8   | Open the Sort control and choose "Name - A to Z". Wait for the list to refresh. Record the list of property names in order.                                                                                                                      | List re-renders with a new order.                                                                                                                               |
| 9   | Compare the recorded name list against itself sorted alphabetically ascending, **case-sensitive** (i.e. plain character/ASCII order — a capital letter sorts before any lowercase letter, so e.g. "Casa Grande..." sorts before "Casa de Mayo"). | The displayed order already matches this exact ascending order.                                                                                                 |
| 10  | Open the Sort control and choose "Name - Z to A". Wait for the list to refresh. Record the list of property names in order.                                                                                                                      | List re-renders with a different order than step 8's list.                                                                                                      |
| 11  | Compare this list against itself sorted the same way but descending.                                                                                                                                                                             | The displayed order matches descending case-sensitive order.                                                                                                    |
| 12  | Click "Filters".                                                                                                                                                                                                                                 | Filters panel opens, showing a "Bedrooms" stepper and a "Pet friendly" toggle (among others).                                                                   |
| 13  | Click the bedrooms "+" control once to require at least 1 bedroom.                                                                                                                                                                               | Bedroom requirement increases by 1.                                                                                                                             |
| 14  | Toggle "Pet friendly" on.                                                                                                                                                                                                                        | Toggle switches to the on state.                                                                                                                                |
| 15  | Click "Apply".                                                                                                                                                                                                                                   | Results list refreshes.                                                                                                                                         |
| 16  | Count the property cards now shown.                                                                                                                                                                                                              | This filtered count is **less than or equal to** the baseline count from step 7 — filtering must never increase the number of results.                          |

## Postconditions

None — leaves no persistent state (no account, no booking made).

## Notes

- Because these are live production sites with real-time availability, the exact set of results
  can shift slightly between requests. Each sort direction should be checked against its own
  correctly-sorted copy, not against the other list directly.
- If the destination legitimately returns 0 results at time of testing, treat this as a
  test-environment/data issue, not a product bug — re-run with a different date range if this
  happens.
