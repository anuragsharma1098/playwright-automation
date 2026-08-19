import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * Deliberately failing test, kept separate from the real TC1-TC6 specs so its failure is never
 * mistaken for a genuine product bug. Exists solely to demonstrate the diagnostics pipeline
 * required by the assignment: a screenshot at the point of failure, clear failure detail in the
 * HTML report, and a visual highlight of the element the (intentionally wrong) assertion targeted.
 */
test.describe('Demo - intentional failure (diagnostics showcase)', () => {
  test('[INTENTIONAL FAILURE] homepage heading does not really say this', async ({
    home,
    page,
  }, testInfo) => {
    await home.goto();

    const heading = page.locator('h1').first();
    await withHighlight(page, testInfo, heading, 'homepage h1', async () => {
      await expect(
        heading,
        'this assertion is deliberately wrong to demonstrate failure diagnostics',
      ).toHaveText('This text will never match - demonstrating failure diagnostics');
    });
  });
});
