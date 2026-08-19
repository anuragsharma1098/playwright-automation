import type { Locator, Page, TestInfo } from '@playwright/test';

/**
 * Draws a red outline around `locator`'s bounding box, screenshots the page, and attaches it to
 * the HTML report. This gives failure reports a visual pointer to the element involved, on top of
 * Playwright's own trace/screenshot/video capture. Best-effort: a locator that can't be found
 * (the actual reason many failures happen) simply falls back to an unannotated screenshot.
 */
export async function attachFailureHighlight(
  page: Page,
  testInfo: TestInfo,
  locator: Locator | null,
  label: string,
): Promise<void> {
  try {
    if (locator) {
      const box = await locator.boundingBox({ timeout: 2000 }).catch(() => null);
      if (box) {
        await page.evaluate(({ x, y, width, height }) => {
          const marker = document.createElement('div');
          marker.dataset.testHighlight = 'true';
          Object.assign(marker.style, {
            position: 'absolute',
            left: `${x - 4}px`,
            top: `${y - 4}px`,
            width: `${width + 8}px`,
            height: `${height + 8}px`,
            border: '3px solid #ff0033',
            boxShadow: '0 0 0 2px rgba(255,0,51,0.35)',
            zIndex: '2147483647',
            pointerEvents: 'none',
          });
          document.body.appendChild(marker);
        }, box);
      }
    }

    const screenshot = await page.screenshot({ fullPage: false });
    await testInfo.attach(`failure-highlight (${label})`, {
      body: screenshot,
      contentType: 'image/png',
    });
  } catch {
    // Diagnostics must never mask the original test failure.
  }
}

/**
 * Runs `action`; on failure, attaches a screenshot with `locator` highlighted before rethrowing,
 * so the HTML report points visually at the element the failing assertion cared about.
 */
export async function withHighlight<T>(
  page: Page,
  testInfo: TestInfo,
  locator: Locator,
  label: string,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (err) {
    await attachFailureHighlight(page, testInfo, locator, label);
    throw err;
  }
}
