import { BasePage } from './BasePage';

/**
 * The property-owner inquiry form at /list-with-us. Confirmed live: fields have no name/id
 * attributes (React-controlled), so locators go by input type/role. Validation is fully custom
 * (no native `required` attributes) - the Submit button starts disabled and inline per-field
 * error text appears once a field is touched with an invalid value.
 */
export class ListWithUsPage extends BasePage {
  async goto(): Promise<void> {
    await this.open(this.site.listWithUsPath);
  }

  get nameInput() {
    return this.page.locator('input[type="text"]').first();
  }

  get emailInput() {
    return this.page.locator('input[type="email"]');
  }

  get phoneInput() {
    return this.page.locator('input[type="tel"]');
  }

  get messageTextarea() {
    return this.page.locator('textarea');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /submit/i });
  }

  /** The inline error message (a `<p class="text-red-500 ...">`) lives inside the same field-row
   * wrapper (`div.flex.flex-col...`) as its input - confirmed live via DOM inspection. */
  errorFor(field: 'email' | 'phone') {
    const fieldLocator = field === 'email' ? this.emailInput : this.phoneInput;
    return fieldLocator
      .locator(
        'xpath=ancestor::div[contains(@class,"flex-col")][1]//p[contains(@class,"text-red-500")]',
      )
      .first();
  }

  async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  /** Fills the form with a deliberately invalid email and phone number, then blurs each field to
   * trigger inline validation - used by TC5. */
  async fillWithInvalidContactDetails(): Promise<void> {
    await this.nameInput.fill('QA Test Owner');
    await this.emailInput.fill('not-an-email');
    await this.emailInput.blur();
    await this.phoneInput.fill('123');
    await this.phoneInput.blur();
    await this.messageTextarea.fill('Automated validation test - please ignore.');
  }
}
