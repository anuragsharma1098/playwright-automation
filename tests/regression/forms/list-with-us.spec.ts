import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-FRM-04 - List With Us field set.
 *
 * TC5 covers this form's email/phone validation and only *documents* the per-site field
 * difference. This test asserts it, so a field silently disappearing from (or appearing on) an
 * owner-lead form is caught. Confirmed live: all three sites share Name, Email, Phone Number and
 * Message (all required); Firesky and GoodLife add a required "Property Location"
 * (`siteConfig.listWithUsExtraFields`), Alice does not.
 */
test.describe('Regression - List With Us form', { tag: '@regression' }, () => {
  test("REG-FRM-04 the form shows the common required fields plus this site's extra fields", async ({
    listWithUs,
    siteConfig,
    page,
  }, testInfo) => {
    await listWithUs.goto();
    const labels = await listWithUs.fieldLabels();
    testInfo.annotations.push({ type: 'fields', description: labels.join(' | ') });

    await withHighlight(page, testInfo, listWithUs.emailInput, 'List With Us form', async () => {
      const expected = [
        'Name',
        'Email',
        'Phone Number',
        'Message',
        ...siteConfig.listWithUsExtraFields,
      ];
      expect(labels, 'required fields').toEqual(
        expect.arrayContaining(expected.map((f) => `${f}*`)),
      );
      if (!siteConfig.listWithUsExtraFields.includes('Property Location')) {
        expect(labels, 'no Property Location on this site').not.toContain('Property Location*');
      }
    });
  });
});
