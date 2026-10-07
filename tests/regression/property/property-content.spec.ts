import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-PDP-01..04 - Property page content and interactive sections.
 *
 * Uses the most-reviewed property on the site (`/listings?sort=most-reviewed`), which guarantees
 * the reviews section has more than one page. Confirmed live on all three sites: amenities open in
 * an "All Amenities" dialog headed by a "Popular Amenities" group; the share dialog offers at least
 * Email, WhatsApp, Facebook and Copy Link (Alice adds SMS and X); reviews paginate through a
 * "Review pages" nav; and the page's schema.org VacationRental JSON-LD names the same property as
 * its <h1>.
 */
test.describe('Regression - Property content', { tag: '@regression' }, () => {
  // Each test chains three slow live page loads (listings -> property/checkout -> async quote),
  // which was observed to overrun the 90s default when the sites are under load.
  test.describe.configure({ timeout: 150_000 });

  test.beforeEach(async ({ results, property }) => {
    await results.goto('?sort=most-reviewed');
    const [href] = await results.getResultHrefs(1);
    await property.open(href);
    await property.name.waitFor({ state: 'visible' });
  });

  test('REG-PDP-01 "Show all amenities" opens the amenities dialog, which closes again', async ({
    property,
    page,
  }, testInfo) => {
    // Headless UI's role="dialog" root is a zero-size wrapper around fixed-position panels
    // (confirmed live), so visibility is asserted on the dialog's content, never on the root.
    const popular = property.amenitiesDialog.getByText('Popular Amenities');

    await property.showAllAmenitiesButton.click();
    await withHighlight(
      page,
      testInfo,
      property.closeAmenitiesButton,
      'amenities dialog',
      async () => {
        await expect(popular, 'amenities dialog content').toBeVisible();
        await expect(property.closeAmenitiesButton, 'dialog close button').toBeVisible();
      },
    );

    await property.closeAmenitiesButton.click();
    await expect(property.amenitiesDialog, 'dialog should be removed').toHaveCount(0);
  });

  test('REG-PDP-02 share options offer email, WhatsApp, Facebook and copy-link', async ({
    property,
    page,
  }, testInfo) => {
    await property.shareButton.click();

    // As with amenities, the dialog root has no box of its own - its buttons are what's visible.
    await withHighlight(page, testInfo, property.shareButton, 'share dialog', async () => {
      for (const channel of [/Email/, /WhatsApp/, /Facebook/, /Copy Link/]) {
        await expect(
          property.shareDialog.getByRole('button', { name: channel }),
          `share channel ${channel}`,
        ).toBeVisible();
      }
    });
  });

  test('REG-PDP-03 review page 2 shows a different set of reviews', async ({
    property,
    page,
  }, testInfo) => {
    await expect(property.reviewPagination).toBeVisible({ timeout: 20_000 });
    const pageOne = await property.reviewerNames.allTextContents();
    expect(pageOne.length, 'page 1 should list reviews').toBeGreaterThan(0);

    await property.reviewPageControl(2).click();

    await withHighlight(
      page,
      testInfo,
      property.reviewPagination,
      'review pagination',
      async () => {
        await expect
          .poll(() => property.reviewerNames.allTextContents(), {
            message: 'reviews should change on page 2',
            timeout: 15_000,
          })
          .not.toEqual(pageOne);
      },
    );
  });

  test('REG-PDP-04 structured data describes the same property as the page', async ({
    property,
    page,
  }, testInfo) => {
    const heading = (await property.name.textContent())?.trim();
    const data = await property.getStructuredData();
    testInfo.annotations.push({
      type: 'structured-data',
      description: JSON.stringify({
        name: data?.name,
        bedrooms: data?.numberOfBedrooms,
        capacity: data?.maximumAttendeeCapacity,
      }),
    });

    await withHighlight(page, testInfo, property.name, 'property name', async () => {
      expect(data, 'page should publish a VacationRental JSON-LD block').not.toBeNull();
      expect(data?.name?.trim(), 'JSON-LD name should match the <h1>').toBe(heading);
      expect(data?.numberOfBedrooms, 'JSON-LD bedrooms').toBeGreaterThan(0);
      expect(data?.maximumAttendeeCapacity, 'JSON-LD guest capacity').toBeGreaterThan(0);
    });
  });
});
