import { randomUUID } from 'node:crypto';
import { test as base, type PlaywrightWorkerArgs, type TestInfo } from '@playwright/test';
import { Shopper } from '@/actors/shopper';
import { StoreApi } from '@/api/store-api';
import { BEETHOVEN } from '@/domain/products';
import { shopperSeeing, type CounterReply, type StubScene } from './stub-store';

interface Fixtures {
  /** A brand-new guest with a private cart. Emptied and disposed after the test, also when it fails. */
  shopper: Shopper;
  /** A second, independent guest (for "someone else's cart" scenarios). */
  otherShopper: Shopper;
  /** Offline: builds a Shopper whose store answers the cart counter with `reply`, plus the cart page and a recording deleteLine from `scene` (unit project). */
  shopperSeeing: (reply: CounterReply, scene?: StubScene) => Shopper;
}

/** The host keys a guest cart by IP + User-Agent, so every shopper gets a unique User-Agent that names its use case. */
const uniqueUserAgent = (title: string) => `qa-cart-${/^UC-[A-Z0-9]+-\d+/.exec(title)?.[0] ?? 'adhoc'}-${randomUUID().slice(0, 8)}`;

/** Own request context (own cookie jar), the product-page warm-up, then the test; teardown always runs. */
async function provideShopper(
  playwright: PlaywrightWorkerArgs['playwright'],
  baseURL: string | undefined,
  testInfo: TestInfo,
  use: (shopper: Shopper) => Promise<void>,
): Promise<void> {
  const context = await playwright.request.newContext({ baseURL, userAgent: uniqueUserAgent(testInfo.title) });
  const shopper = new Shopper(new StoreApi(context));
  try {
    await shopper.opensProductPage(BEETHOVEN);
    await use(shopper);
  } finally {
    try {
      await shopper.emptiesCart();
    } catch (error) {
      // Never hides the test's own failure: it only leaves a note in the report.
      testInfo.annotations.push({ type: 'cleanup-failed', description: String(error).slice(0, 200) });
    }
    await context.dispose();
  }
}

export const test = base.extend<Fixtures>({
  shopper: async ({ playwright, baseURL }, use, testInfo) => provideShopper(playwright, baseURL, testInfo, use),
  otherShopper: async ({ playwright, baseURL }, use, testInfo) => provideShopper(playwright, baseURL, testInfo, use),
  shopperSeeing: async ({}, use) => use(shopperSeeing),
});

export { expect } from '@/matchers';
