import { test } from '@playwright/test';
import type { ContactFormFields } from '@/api/content.api';
import type { StoreApi } from '@/api/store-api';
import type { Credentials } from '@/config/env';
import { parseCategoryPage, parseHomePage, type Category, type CategoryPage, type HomePage } from '@/domain/catalog-pages';
import { parseContactFormResult, parseLoginResult, type ContactFormResult, type LoginResult } from '@/domain/forms';
import { Page } from '@/domain/page';
import { parseSearchResultsPage, type SearchResultsPage } from '@/domain/search-page';

/**
 * Someone browsing the storefront without buying anything: catalogue, search, contact form, sign-in.
 * Every method is a report step. Pages come back parsed, ready for the test to judge.
 */
export class Visitor {
  constructor(private readonly store: StoreApi) {}

  opensHomePage(): Promise<HomePage> {
    return test.step('When the visitor opens the home page', async () => parseHomePage(new Page(await this.store.catalog.home())));
  }

  opensCategory(category: Category): Promise<CategoryPage> {
    return test.step(`When the visitor opens the ${category.name} category`, async () =>
      parseCategoryPage(new Page(await this.store.catalog.category(category.slug))));
  }

  searchesFor(term: string): Promise<SearchResultsPage> {
    return test.step(`When the visitor searches for "${term}"`, async () =>
      parseSearchResultsPage(new Page(await this.store.search.results(term))));
  }

  opensAccountPage(path: string): Promise<Page> {
    return test.step(`When the visitor opens ${path}`, async () => new Page(await this.store.account.page(path)));
  }

  signsIn(credentials: Credentials, options: { thenGoTo?: string } = {}): Promise<LoginResult> {
    return test.step('When the visitor signs in', async () =>
      parseLoginResult(new Page(await this.store.account.login(credentials.email, credentials.password, options.thenGoTo))));
  }

  sendsContactForm(fields: ContactFormFields): Promise<ContactFormResult> {
    return test.step('When the visitor sends the contact form', async () =>
      parseContactFormResult(new Page(await this.store.content.sendContactForm(fields))));
  }

  // Housekeeping (fixture teardown; never fails a test)

  async signsOut(): Promise<void> {
    await this.store.account.logout().catch(() => undefined);
  }
}
