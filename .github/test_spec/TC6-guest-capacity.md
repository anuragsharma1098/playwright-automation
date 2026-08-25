# TC6 (Bonus) — Guest Capacity Consistency

**Automated coverage:** [tests/tc6-guest-capacity.spec.ts](../../tests/tc6-guest-capacity.spec.ts)
**Priority:** High
**Applicable sites:** Alice Lodging, Firesky Retreats (run independently on each)

## Objective

Confirm that properties returned for a large party size actually accommodate that many guests —
both in their own stated capacity and in the booking widget's carried-over guest count — across
**multiple** sampled listings, not just one. This is the class of bug most damaging to booking
trust: a guest arriving to find the property sleeps fewer people than the site implied at search
time.

## Preconditions

- None.

## Test data

- **Check-in**: 14 days from today
- **Check-out**: check-in + 4 nights
- **Adults**: 6 (deliberately large party)
- **Destination**: "Palm Springs" (Alice) or "Scottsdale" (Firesky)
- **Sample size**: up to 3 distinct properties from the results

## Steps and expected results

| #   | Step                                                                                                                                                              | Expected result                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Navigate to the homepage and search for the destination, dates, and **6 adults** (see TC2 steps 2–5 for the widget interaction, using 6 instead of 2).            | Redirected to `/listings` with matching results.                             |
| 2   | Collect up to 3 distinct property links from the results. If there are 0 results for a party of 6 at this destination/date, stop here — not applicable right now. | N/A outcome, not a failure.                                                  |
| 3   | Open the first sampled property's detail page.                                                                                                                    | Property name (page heading) is visible.                                     |
| 4   | Check the property's stated guest capacity.                                                                                                                       | Capacity is **greater than or equal to** 6.                                  |
| 5   | Check the booking widget's Guests control on this property page.                                                                                                  | Shows 6 Adults, carried over from the original search (not a default value). |
| 6   | Repeat steps 3–5 for the second sampled property.                                                                                                                 | Same expected results.                                                       |
| 7   | Repeat steps 3–5 for the third sampled property (if a third result exists).                                                                                       | Same expected results.                                                       |

## Postconditions

None.

## Notes

- This test intentionally samples multiple listings rather than just one (unlike TC3), since a
  capacity-display bug is more likely to affect some listings than others — checking only the
  first result could miss it.
- Because this involves loading several full property pages, allow extra time per run compared to
  the other test cases.
