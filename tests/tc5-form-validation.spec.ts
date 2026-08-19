import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * TC5 - Form Validation.
 *
 * The List With Us form (confirmed live) has no native HTML `required` attributes - validation is
 * fully custom: the Submit button starts disabled, and inline per-field error text appears next
 * to a field once it's touched with an invalid value. So "appropriate validation is displayed" is
 * checked two ways: the disabled Submit button (form-level gate) and the inline message text
 * associated with the specific invalid field (field-level feedback).
 *
 * Notable difference between the sites (documented via annotation, not asserted): Firesky's form
 * has an extra required "Property Location" field that Alice's does not.
 */
test.describe('TC5 - Form validation', () => {
  test('invalid contact details are rejected with field-level validation messages', async ({
    listWithUs,
    siteConfig,
    page,
  }, testInfo) => {
    await listWithUs.goto();

    testInfo.annotations.push({
      type: 'site-difference',
      description: siteConfig.listWithUsExtraFields.length
        ? `Extra required field(s) on this site: ${siteConfig.listWithUsExtraFields.join(', ')}`
        : 'No extra fields beyond the common set on this site',
    });

    expect(
      await listWithUs.isSubmitDisabled(),
      'Submit should start disabled before any input is provided',
    ).toBe(true);

    await listWithUs.fillWithInvalidContactDetails();

    await withHighlight(
      page,
      testInfo,
      listWithUs.emailInput,
      'email field validation',
      async () => {
        const emailError = await listWithUs.errorFor('email').textContent();
        testInfo.annotations.push({
          type: 'email-validation-message',
          description: emailError ?? '(none)',
        });
        expect(
          emailError,
          'an invalid email should show a validation message next to the Email field',
        ).toMatch(/valid email/i);
      },
    );

    await withHighlight(
      page,
      testInfo,
      listWithUs.phoneInput,
      'phone field validation',
      async () => {
        const phoneError = await listWithUs.errorFor('phone').textContent();
        testInfo.annotations.push({
          type: 'phone-validation-message',
          description: phoneError ?? '(none)',
        });
        expect(
          phoneError,
          'an invalid phone number should show a validation message next to the Phone field',
        ).toMatch(/valid phone/i);
      },
    );

    expect(
      await listWithUs.isSubmitDisabled(),
      'Submit should remain disabled while the form still has invalid fields',
    ).toBe(true);
  });
});
