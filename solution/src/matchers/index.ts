import { expect as base } from '@playwright/test';
import type { Reply } from '@/api/http-client';
import type { LoginResult } from '@/domain/forms';
import type { Page } from '@/domain/page';
import { serverMessages } from '@/domain/server-messages';
import type { CartActionBody } from '@/api/types';
import { LineItems } from '@/domain/line-items';
import type { Product } from '@/domain/products';

interface LineExpectation {
  quantity?: number;
  unitPrice?: string;
  lineTotal?: string;
}

interface ServerErrorExpectation {
  message?: string;
  controller?: string;
  action?: string;
}

const result = (pass: boolean, message: string) => ({ pass, message: () => message });
const show = (reply: Reply<CartActionBody>) => `HTTP ${reply.status} ${JSON.stringify(reply.body).slice(0, 200)}`;

/**
 * Domain assertions. Failures print the actual lines or reply, so nobody has to open the HTML to see what was there.
 * The store reports business failures as HTTP 200 + success:false, so "accepted"/"refused" look at both status and body.
 */
export const expect = base.extend({
  toHaveNoLines(received: LineItems) {
    return result(received.isEmpty, `expected no lines, got: ${received.describe()}`);
  },

  toHaveLineCount(received: LineItems, count: number) {
    return result(received.items.length === count, `expected ${count} line(s), got ${received.items.length}: ${received.describe()}`);
  },

  toContainLine(received: LineItems, product: Product, expected: LineExpectation = {}) {
    const line = received.lineFor(product);
    if (!line) return result(false, `expected a line for ${product.name}, got: ${received.describe()}`);
    const mismatches = (Object.keys(expected) as (keyof LineExpectation)[])
      .filter((key) => line[key] !== expected[key])
      .map((key) => `${key}: expected ${expected[key]}, got ${line[key]}`);
    return result(mismatches.length === 0, `${product.name} line differs: ${mismatches.join('; ')}`);
  },

  toBeAccepted(received: Reply<CartActionBody>) {
    return result(received.status === 200 && received.body.success === true, `expected the store to accept the request, got ${show(received)}`);
  },

  toBeRefused(received: Reply<CartActionBody>, message?: string) {
    const refused = received.status === 200 && received.body.success === false;
    const sameMessage = message === undefined || received.body.message === message;
    return result(refused && sameMessage, `expected the store to refuse the request${message ? ` with "${message}"` : ''}, got ${show(received)}`);
  },

  toFailWithServerError(received: Reply<CartActionBody>, expected: ServerErrorExpectation = {}) {
    const crashed = received.status === 500 && received.body.error === true;
    const matches = (Object.keys(expected) as (keyof ServerErrorExpectation)[]).every((key) => received.body[key] === expected[key]);
    return result(crashed && matches, `expected an HTTP 500 server error ${JSON.stringify(expected)}, got ${show(received)}`);
  },

  toBeAnHtmlPage(received: Page) {
    return result(received.status === 200 && received.isHtml, `expected an HTML page with HTTP 200, got HTTP ${received.status}${received.isHtml ? '' : ' (not HTML)'}`);
  },

  toRedirectToLoginThenBackTo(received: Page, path: string) {
    const location = received.location ?? '';
    const returnUrl = decodeURIComponent(location.replace(/^[^=]*=/, '')).toLowerCase();
    const redirects = received.status === 302 && /^\/login\?returnurl=/i.test(location);
    return result(redirects && returnUrl === path, `expected a 302 to /login?returnUrl=${path}, got HTTP ${received.status} Location: ${location || '(none)'}`);
  },

  toHaveSignedIn(received: LoginResult) {
    const signedIn = received.page.status === 302 && received.sessionCookie !== undefined;
    return result(
      signedIn,
      `login not accepted: HTTP ${received.page.status}, Location: ${received.page.location ?? '(none)'}, ` +
        `session cookie issued: ${received.sessionCookie !== undefined}, ` +
        `"${serverMessages.loginUnsuccessful}" shown: ${received.errors.includes(serverMessages.loginUnsuccessful)}. ` +
        'The QA account may not exist or the credentials in .env are wrong.',
    );
  },

  toBeRejectedLogin(received: LoginResult) {
    const rejected =
      received.page.status === 200 &&
      received.sessionCookie === undefined &&
      received.errors.includes(serverMessages.loginUnsuccessful) &&
      received.errors.includes(serverMessages.credentialsIncorrect);
    return result(
      rejected,
      `expected a refused login (HTTP 200, no session cookie, "${serverMessages.credentialsIncorrect}"), got HTTP ${received.page.status}, ` +
        `session cookie issued: ${received.sessionCookie !== undefined}, summary: "${received.errors}"`,
    );
  },
});
