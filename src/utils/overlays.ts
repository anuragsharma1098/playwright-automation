import type { Page } from '@playwright/test';

/**
 * Both sites show a delayed marketing modal ("Get 20% Off Summer Special", aria-label
 * "Close Announcement Popup") that appears a few seconds after page load, plus a cookie-consent
 * bar. Either can intercept clicks on the search widget if not dismissed first. The popup is a
 * one-time delayed trigger (confirmed by polling), so a short poll-and-dismiss window right after
 * navigation is enough - no need to re-check before every later action.
 */
const OVERLAY_BUTTON_NAMES = ['Close Announcement Popup', 'Close banner'] as const;

async function dismissOnce(page: Page): Promise<void> {
  for (const name of OVERLAY_BUTTON_NAMES) {
    const btn = page.getByRole('button', { name });
    if (
      await btn
        .first()
        .isVisible({ timeout: 250 })
        .catch(() => false)
    ) {
      await btn
        .first()
        .click({ timeout: 1000 })
        .catch(() => {});
    }
  }
  const acceptCookies = page.getByRole('button', { name: /accept/i });
  if (
    await acceptCookies
      .first()
      .isVisible({ timeout: 250 })
      .catch(() => false)
  ) {
    await acceptCookies
      .first()
      .click({ timeout: 1000 })
      .catch(() => {});
  }
}

/**
 * Polls for and dismisses known overlays for up to `windowMs`. Confirmed live: the marketing
 * popup's delayed trigger can fire anywhere from ~1s to ~8s after load (non-deterministic), so
 * this always polls for at least `minFloorMs` before it's allowed to exit early, even if every
 * check up to that point has been clean - exiting early purely on "no popup yet" was observed to
 * return before a late-firing popup had appeared, leaving it to intercept the next click instead.
 * Call once right after navigation.
 */
export async function settleOverlays(
  page: Page,
  windowMs = 8000,
  minFloorMs = 5000,
): Promise<void> {
  const step = 500;
  const requiredCleanChecks = 3;
  let dismissedSomething = false;
  let cleanChecks = 0;

  for (let elapsed = 0; elapsed < windowMs; elapsed += step) {
    const before = await page
      .getByRole('button', { name: /Close Announcement Popup|Close banner|accept/i })
      .count();
    await dismissOnce(page);
    if (before > 0) dismissedSomething = true;

    cleanChecks = before === 0 ? cleanChecks + 1 : 0;
    if (elapsed >= minFloorMs && dismissedSomething && cleanChecks >= requiredCleanChecks) return;

    await page.waitForTimeout(step);
  }
}
