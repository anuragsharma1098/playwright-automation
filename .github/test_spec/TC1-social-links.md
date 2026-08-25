# TC1 — Social Media Links

**Automated coverage:** [tests/tc1-social-links.spec.ts](../../tests/tc1-social-links.spec.ts)
**Priority:** Medium
**Applicable sites:** Alice Lodging, Firesky Retreats (run independently on each)

## Objective

Confirm that any social media links shown in the site footer are genuine (not confused with the
"Good Life Network" sister-brand links that also live in the footer), well-formed, and point to a
live, reachable destination.

## Preconditions

- None. Fresh homepage load.

## Test data

- Known social platform domains to look for: facebook.com, instagram.com, linkedin.com,
  twitter.com / x.com, youtube.com, tiktok.com, pinterest.com.

## Steps and expected results

| #   | Step                                                                                                                                                                                                 | Expected result                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to the site's homepage. Dismiss the marketing popup and cookie banner if shown.                                                                                                             | Homepage loads.                                                                                                                                                                                                                                                        |
| 2   | Scroll to the footer.                                                                                                                                                                                | Footer is visible, containing a mix of links: legal/utility links, sister-brand ("Good Life Network") links, and possibly social media icons/links.                                                                                                                    |
| 3   | Visually identify which footer links point to a known social platform domain (see Test data above). Do **not** count sister-brand or partner-network links as social links even if styled similarly. | A list of 0 or more social links is identified, each tagged with its platform (e.g. Facebook, Instagram).                                                                                                                                                              |
| 4   | Record how many social links were found and which platforms.                                                                                                                                         | Zero is an acceptable, valid result on Firesky Retreats (confirmed: it currently shows none) — this is not a failure. Alice Lodging is expected to show at least one.                                                                                                  |
| 5   | For each social link found: hover/inspect the link's URL (or right-click → copy link address).                                                                                                       | The URL uses `https://` (not `http://`).                                                                                                                                                                                                                               |
| 6   | For the same link, confirm the URL's domain matches the platform it claims to be (e.g. the Facebook icon points to a `facebook.com` URL, not some other domain).                                     | Domain matches the claimed platform.                                                                                                                                                                                                                                   |
| 7   | Click the link (or open it in a new tab) and observe the result.                                                                                                                                     | The page loads to the claimed platform — it should **not** be a dead link (DNS failure, connection error) or a definitive 404/"page not found". A generic bot-verification/login-wall page from the social platform itself is an acceptable outcome and not a failure. |
| 8   | Repeat steps 5–7 for every social link found in step 3.                                                                                                                                              | All discovered social links pass the same checks.                                                                                                                                                                                                                      |

## Postconditions

None — read-only test, no state changes.

## Notes

- Treat "no social links found" and "N social links found, all valid" as equally passing outcomes
  — the point of this test is that whatever is shown must be correct, not that a specific count
  must appear.
