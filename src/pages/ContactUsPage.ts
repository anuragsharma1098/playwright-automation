import { BasePage } from './BasePage';

/** Required fields on the /contact-us form - identical labels on all three sites (confirmed live). */
export type ContactField =
  'Name' | 'Email' | 'Phone Number' | 'What best describes you?' | 'Subject' | 'Your Message';

/**
 * The /contact-us inquiry form. Like List With Us, its labels aren't programmatically associated
 * with their inputs (no for/id), and validation is fully custom. Confirmed live structure per
 * field: `div.flex-col > [div "Label*"] + [div > input|select|textarea + p.text-red-500]`, so each
 * field is located from its visible label text.
 *
 * The form is also gated by Cloudflare Turnstile, which never issues a token to an automated
 * browser - Submit stays disabled even with every field valid. Tests can therefore assert
 * validation feedback and the disabled gate, but must never expect Submit to enable (and must
 * never submit a real inquiry anyway).
 */
export class ContactUsPage extends BasePage {
  async goto(): Promise<void> {
    await this.open('/contact-us');
  }

  private fieldRow(label: ContactField) {
    return this.page
      .getByText(`${label}*`, { exact: true })
      .locator('xpath=following-sibling::div[1]');
  }

  input(label: ContactField) {
    if (label === 'Phone Number') {
      return this.fieldRow(label).getByRole('textbox', { name: 'Enter phone number' });
    }
    return this.fieldRow(label).locator('input, textarea, select').first();
  }

  errorFor(label: ContactField) {
    return this.fieldRow(label).locator('p.text-red-500').first();
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'Submit', exact: true });
  }

  /** Types then clears a field and blurs it - how a user "touches" a required field. */
  async touchAndLeaveEmpty(label: ContactField): Promise<void> {
    const field = this.input(label);
    await field.fill('x');
    await field.fill('');
    await field.blur();
  }

  async fillAndBlur(label: ContactField, value: string): Promise<void> {
    const field = this.input(label);
    await field.fill(value);
    await field.blur();
  }
}
