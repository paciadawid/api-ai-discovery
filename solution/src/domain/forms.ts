import { cookieNames, type Cookie } from './cookies';
import { validationSummary, type Page } from './page';

export interface LoginResult {
  readonly page: Page;
  /** Set only when the store started a session. */
  readonly sessionCookie: Cookie | undefined;
  /** Text of the validation summary shown on a refused login ('' when none). */
  readonly errors: string;
}

export const parseLoginResult = (page: Page): LoginResult => ({
  page,
  sessionCookie: page.cookie(cookieNames.session),
  errors: validationSummary(page.html),
});

export interface ContactFormResult {
  readonly page: Page;
  readonly errors: string;
  readonly formShownAgain: boolean;
  /** A visible success alert or the "sent to the store owner" text. */
  readonly confirmsDelivery: boolean;
}

export function parseContactFormResult(page: Page): ContactFormResult {
  // The footer newsletter block always carries a hidden (d-none) alert-success, so only visible alerts count.
  const visibleSuccessAlerts = (page.html.match(/<div[^>]*class="[^"]*alert-success[^"]*"[^>]*>/g) ?? []).filter(
    (tag) => !/\bd-none\b/.test(tag),
  );
  return {
    page,
    errors: validationSummary(page.html),
    formShownAgain: /<form[^>]*class="[^"]*contact-form/i.test(page.html),
    confirmsDelivery: visibleSuccessAlerts.length > 0 || page.contains('successfully sent to the store owner'),
  };
}
