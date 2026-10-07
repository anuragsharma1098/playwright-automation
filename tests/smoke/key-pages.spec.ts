import { expect, test } from '@src/fixtures/base.fixture';

/**
 * SMK-06 - Key content pages respond.
 *
 * Paths confirmed live to exist on all three sites (header/footer links). Pages whose slug differs
 * per site (blog: /blog vs /blogs; rental policies: three different slugs) are covered instead by
 * REG-NAV-03, which discovers and checks every footer link dynamically. One test per path so a
 * single broken page is reported on its own.
 */
const KEY_PAGES = ['/contact-us', '/list-with-us', '/about-us', '/specials', '/privacy-policy'];

test.describe('Smoke - Key pages', { tag: '@smoke' }, () => {
  for (const path of KEY_PAGES) {
    test(`SMK-06 ${path} responds and renders a page heading`, async ({ staticPage }) => {
      const response = await staticPage.visit(path);

      expect(response?.status(), `${path} should not be an error response`).toBeLessThan(400);
      await expect(staticPage.heading, `${path} should render an <h1>`).toBeVisible();
      await expect(staticPage.heading, `${path} should not be the 404 page`).not.toHaveText(/404/);
    });
  }
});
