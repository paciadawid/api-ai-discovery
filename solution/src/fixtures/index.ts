import { test as base, type PlaywrightWorkerArgs } from '@playwright/test';
import { Shopper } from '@/actors/shopper';
import { Visitor } from '@/actors/visitor';
import { StoreApi } from '@/api/store-api';
import { env, type Credentials } from '@/config/env';
import { uniqueUserAgent, useCaseOf } from '@/domain/visitor-identity';

export interface ShopperOptions {
  /** Force an exact User-Agent (only the isolation probe needs this). */
  userAgent?: string;
  /** Skip the warm-up request, so the very first call is the one under test. */
  cookieless?: boolean;
}

interface Fixtures {
  /** Creates further independent shoppers; every one is emptied and disposed after the test. */
  newShopper: (options?: ShopperOptions) => Promise<Shopper>;
  /** A brand-new anonymous shopper with a private cart. */
  shopper: Shopper;
  /** A second, independent shopper (for "someone else's data" scenarios). */
  otherShopper: Shopper;
  /** A first-time visitor browsing the storefront. Signed out and disposed after the test. */
  visitor: Visitor;
  /** The QA customer account from .env. Only resolved by tests that ask for it. */
  customer: Credentials;
}

type PlaywrightRunner = PlaywrightWorkerArgs['playwright'];

const openStore = async (playwright: PlaywrightRunner, baseURL: string | undefined, userAgent: string) => {
  const context = await playwright.request.newContext({ baseURL, userAgent });
  return { context, store: new StoreApi(context) };
};

export const test = base.extend<Fixtures>({
  newShopper: async ({ playwright, baseURL }, use, testInfo) => {
    const opened: { shopper: Shopper; dispose: () => Promise<void> }[] = [];
    try {
      await use(async (options = {}) => {
        const { context, store } = await openStore(playwright, baseURL, options.userAgent ?? uniqueUserAgent(useCaseOf(testInfo.title)));
        const shopper = new Shopper(store);
        opened.push({ shopper, dispose: () => context.dispose() });
        if (!options.cookieless) await context.get('/', { maxRedirects: 0 }); // first request hands out the visitor cookie
        return shopper;
      });
    } finally {
      for (const { shopper, dispose } of opened) {
        await shopper.emptiesEverything();
        await dispose();
      }
    }
  },

  shopper: async ({ newShopper }, use) => use(await newShopper()),
  otherShopper: async ({ newShopper }, use) => use(await newShopper()),

  visitor: async ({ playwright, baseURL }, use, testInfo) => {
    const { context, store } = await openStore(playwright, baseURL, uniqueUserAgent(useCaseOf(testInfo.title)));
    const visitor = new Visitor(store);
    try {
      await use(visitor);
    } finally {
      await visitor.signsOut();
      await context.dispose();
    }
  },

  customer: async ({}, use) => use(env.customer()),
});

export { expect } from '@/matchers';
