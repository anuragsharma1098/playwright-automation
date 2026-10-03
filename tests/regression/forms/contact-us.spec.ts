import { expect, test } from '@src/fixtures/base.fixture';
import { withHighlight } from '@src/utils/screenshot';

/**
 * REG-FRM-01..03 - Contact Us form validation.
 *
 * Same form on all three sites (confirmed live: identical labels, messages and behaviour). Every
 * required field reports its own message once touched and left blank, and email/phone are
 * format-checked on blur. Submit is additionally gated by Cloudflare Turnstile, which never
 * issues a token to an automated browser - so these tests assert that invalid input keeps Submit
 * disabled, never that valid input enables it, and nothing is ever submitted.
 */
test.describe('Regression - Contact Us form', { tag: '@regression' }, () => {
  test.beforeEach(async ({ contactUs }) => {
    await contactUs.goto();
  });

  test('REG-FRM-01 each required field reports a message when left blank', async ({
    contactUs,
    page,
  }, testInfo) => {
    await expect(contactUs.submitButton, 'Submit starts disabled').toBeDisabled();

    const expected = {
      Name: 'Name cannot be blank',
      Email: 'Email cannot be empty.',
      Subject: 'Subject cannot be blank',
      'Your Message': 'Message cannot be blank',
    } as const;
    for (const field of Object.keys(expected) as (keyof typeof expected)[]) {
      await contactUs.touchAndLeaveEmpty(field);
    }

    for (const [field, message] of Object.entries(expected) as [keyof typeof expected, string][]) {
      await withHighlight(page, testInfo, contactUs.input(field), `${field} field`, async () => {
        await expect(contactUs.errorFor(field), `${field} blank message`).toHaveText(message);
      });
    }
    await expect(contactUs.submitButton, 'Submit stays disabled').toBeDisabled();
  });

  test('REG-FRM-02 invalid email and phone are flagged, and the flags clear once corrected', async ({
    contactUs,
    page,
  }, testInfo) => {
    await contactUs.fillAndBlur('Email', 'not-an-email');
    await contactUs.fillAndBlur('Phone Number', '+1 555');

    await withHighlight(
      page,
      testInfo,
      contactUs.input('Email'),
      'email/phone validation',
      async () => {
        await expect(contactUs.errorFor('Email')).toHaveText('Please enter valid email address.');
        await expect(contactUs.errorFor('Phone Number')).toHaveText('Not a valid phone number.');
      },
    );
    await expect(contactUs.submitButton, 'Submit stays disabled').toBeDisabled();

    await contactUs.fillAndBlur('Email', 'qa.automation@example.com');
    await contactUs.fillAndBlur('Phone Number', '+1 760 345 5695');
    await expect(contactUs.errorFor('Email'), 'email message clears').toBeEmpty();
    await expect(contactUs.errorFor('Phone Number'), 'phone message clears').toBeEmpty();
  });

  test('REG-FRM-03 "What best describes you?" offers Guest and HomeOwner', async ({
    contactUs,
  }) => {
    const options = await contactUs
      .input('What best describes you?')
      .locator('option')
      .allTextContents();

    expect(options, 'audience options').toEqual(expect.arrayContaining(['Guest', 'HomeOwner']));
  });
});
