# TC3 — Property Details Validation

**Automated coverage:** [tests/tc3-property-details.spec.ts](../../tests/tc3-property-details.spec.ts)
**Priority:** High
**Applicable sites:** Alice Lodging, Firesky Retreats (run independently on each)

## Objective

Confirm that a property opened from filtered search results still matches the criteria used to
find it — its listed address matches the searched destination, its stated guest capacity can
accommodate the searched party size, and its booking widget carries over the exact dates and
guest count from the original search (not defaults).

## Preconditions

- None.

## Test data

- **Check-in**: 14 days from today
- **Check-out**: check-in + 4 nights
- **Adults**: 2
- **Destination**: "Palm Springs" (Alice) or "Scottsdale" (Firesky)

## Steps and expected results

| #   | Step                                                                                                                                                               | Expected result                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | Navigate to the homepage and perform a search for the destination, dates, and 2 adults (see TC2 steps 2–5 for the exact widget interaction).                       | Redirected to `/listings` with matching results.                                        |
| 2   | Open "Filters", toggle "Pet friendly" on, click "Apply".                                                                                                           | Filtered results are shown.                                                             |
| 3   | If the filtered result count is 0, stop here — this test is not applicable for this destination/date combination right now; try again with a different date range. | N/A outcome, not a failure.                                                             |
| 4   | Click the first property card in the filtered results.                                                                                                             | A property detail page opens (`/listings/{id}`).                                        |
| 5   | Wait for the property name (page heading) to appear.                                                                                                               | Property name is visible and non-empty.                                                 |
| 6   | Find the property's listed address/locality on the page.                                                                                                           | The address mentions the same destination that was searched (e.g. "Palm Springs").      |
| 7   | Find the property's stated guest capacity (e.g. "Sleeps N guests").                                                                                                | Capacity is **greater than or equal to** 2 (the searched adult count).                  |
| 8   | Locate the booking widget on the property page (Arrival / Departure / Guests controls).                                                                            | Booking widget is visible, pre-filled.                                                  |
| 9   | Check the Arrival date shown in the booking widget.                                                                                                                | Matches the check-in date used in the original search — not a default/placeholder date. |
| 10  | Check the Departure date shown in the booking widget.                                                                                                              | Matches the check-out date used in the original search.                                 |
| 11  | Check the Guests count shown in the booking widget.                                                                                                                | Shows 2 adults, matching the original search.                                           |

## Postconditions

None.

## Notes

- Read the address and capacity from what the page actually displays to a visitor; if the site
  also embeds structured data (schema.org), the visible page and that structured data should
  agree — a mismatch between what's shown and what's in the page's own metadata is itself worth
  flagging.
- This test complements TC6, which repeats a similar capacity check across multiple properties
  for a larger party size.
