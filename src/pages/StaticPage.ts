import type { Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Any content page reached by path (About, Specials, Privacy Policy, the 404 page, ...). Used for
 * read-only availability checks, so `visit()` skips the overlay settle window - nothing here
 * clicks anything the marketing popup could intercept.
 */
export class StaticPage extends BasePage {
  async visit(path: string): Promise<Response | null> {
    return this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  get heading() {
    return this.page.locator('h1').first();
  }
}
