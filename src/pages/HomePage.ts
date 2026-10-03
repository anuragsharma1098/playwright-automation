import type { Page } from '@playwright/test';
import type { SiteConfig } from '@src/config/sites';
import { BasePage } from './BasePage';
import { FooterComponent } from './components/FooterComponent';
import { HeaderComponent } from './components/HeaderComponent';
import { NavComponent } from './components/NavComponent';
import { SearchWidgetComponent } from './components/SearchWidgetComponent';

export class HomePage extends BasePage {
  readonly search: SearchWidgetComponent;
  readonly nav: NavComponent;
  readonly header: HeaderComponent;
  readonly footerLinks: FooterComponent;

  constructor(page: Page, site: SiteConfig) {
    super(page, site);
    this.search = new SearchWidgetComponent(page);
    this.nav = new NavComponent(page, site);
    this.header = new HeaderComponent(page, site);
    this.footerLinks = new FooterComponent(this.footer);
  }

  async goto(): Promise<void> {
    await this.open('/');
  }

  get heroHeading() {
    return this.page.locator('h1').first();
  }
}
