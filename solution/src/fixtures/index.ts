import { test as base, request as pw } from '@playwright/test';
import { CartApi } from '@/api/cart.api';
import { HttpClient } from '@/api/http-client';
import { Guest } from '@/actors/guest';
import { env } from '@/config/env';
import { userAgentFor } from '@/domain/identity';
import { expect } from '@/matchers';
export { expect };

// Every guest is brand new: own request context (own cookie jar), unique User-Agent (the host keys the cart by IP + User-Agent), own cart.
// The cart is emptied (and proven empty) after the test, also when the test body threw. If the body threw, that error is the one
// that surfaces and a cleanup failure is only logged; if the body passed, a cleanup failure fails the test (a cart left behind is a defect of the suite).
async function withCleanup(guest: Guest, role: string, dispose: () => Promise<void>, use: (guest: Guest) => Promise<void>): Promise<void> {
  let bodyFailure: { error: unknown } | undefined;
  let cleanupFailure: { error: unknown } | undefined;
  try {
    await use(guest);
  } catch (error) {
    bodyFailure = { error };
  }
  try {
    await guest.emptiesCart();
    // The proof lives here, outside emptiesCart: a teardown that deletes nothing leaves lines and fails this check.
    expect(await guest.cart(), `teardown: the cart of guest ${role} is empty after removing every line`).toHaveExactlyTheLines([]);
  } catch (error) {
    cleanupFailure = { error };
  }
  await dispose();
  if (bodyFailure) {
    if (cleanupFailure) console.warn(`cleanup of the cart of guest ${role} failed: ${String(cleanupFailure.error)}`);
    throw bodyFailure.error;
  }
  if (cleanupFailure) throw cleanupFailure.error;
}

async function provideGuest(role: string, testId: string, use: (guest: Guest) => Promise<void>): Promise<void> {
  const ctx = await pw.newContext({ baseURL: env.baseUrl, userAgent: userAgentFor(testId, role) });
  await withCleanup(new Guest(new CartApi(new HttpClient(ctx))), role, () => ctx.dispose(), use);
}

export const test = base.extend<{ guest: Guest; otherGuest: Guest }>({
  guest: async ({}, use, testInfo) => provideGuest('a', testInfo.testId, use),
  otherGuest: async ({}, use, testInfo) => provideGuest('b', testInfo.testId, use),
});
