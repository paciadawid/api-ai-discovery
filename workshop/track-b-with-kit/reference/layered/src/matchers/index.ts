import { expect as base } from '@playwright/test';
import type { Reply } from '@/api/http-client';
import { messagesOf, type CartActionBody, type Counters } from '@/api/types';
import type { CartPage } from '@/domain/cart-page';
import { amountIn } from '@/domain/money';
import type { Product } from '@/domain/products';

interface LineExpectation {
  id?: number;
  quantity?: number;
  unitPrice?: string;
  lineTotal?: string;
}

const verdict = (pass: boolean, expected: string, got: string) => ({
  pass,
  message: () => (pass ? `did not expect ${expected}, but got ${got}` : `expected ${expected}, got ${got}`),
});
const show = (reply: Reply<CartActionBody>) => `HTTP ${reply.status} ${JSON.stringify(reply.body).slice(0, 200)}`;

/**
 * Domain assertions. Failures print the actual reply or cart lines, so nobody has to open the HTML to see what was there.
 * The store reports business failures as HTTP 200 + success:false, so "accepted"/"rejected" look at both status and body.
 */
export const expect = base.extend({
  toBeAccepted(received: Reply<CartActionBody>) {
    return verdict(received.status === 200 && received.body.success === true, 'the store to accept the request (HTTP 200, success:true)', show(received));
  },

  /** Accepted although the store said nothing: no message at all. */
  toBeAcceptedWithoutMessage(received: Reply<CartActionBody>) {
    const accepted = received.status === 200 && received.body.success === true;
    return verdict(accepted && messagesOf(received.body).length === 0, 'the store to accept the request without any message', show(received));
  },

  /** An EXACT rejection: HTTP 200, success:false and exactly these messages, in this order (no extra, no missing). */
  toBeRejectedWith(received: Reply<CartActionBody>, messages: readonly string[]) {
    const actual = messagesOf(received.body);
    const rejected = received.status === 200 && received.body.success === false;
    const exact = actual.length === messages.length && actual.every((m, i) => m === messages[i]);
    return verdict(
      rejected && exact,
      `a business rejection (HTTP 200, success:false) with exactly ${JSON.stringify(messages)}`,
      `HTTP ${received.status}, success:${JSON.stringify(received.body.success)}, messages ${JSON.stringify(actual)}`,
    );
  },

  /** The amount in the SubTotal an update reply carries ("$5.67 excl tax" counts as "$5.67"). */
  toReportSubTotal(received: Reply<CartActionBody>, expected: string) {
    return verdict(amountIn(received.body.SubTotal) === expected, `the reply SubTotal to be ${expected}`, `SubTotal ${JSON.stringify(received.body.SubTotal)}`);
  },

  toHaveCartCount(received: Counters, expected: number) {
    return verdict(received.CartItemsCount === expected, `the cart counter to be ${expected}`, `CartItemsCount ${received.CartItemsCount}`);
  },

  toBeAnEmptyCart(received: CartPage) {
    return verdict(received.isEmpty, 'an empty cart (empty-cart text shown, no line, no quantity input)', received.describe());
  },

  toHaveLineCount(received: CartPage, count: number) {
    return verdict(received.lines.length === count, `${count} line(s) on the cart page`, `${received.lines.length}: ${received.describe()}`);
  },

  toContainLine(received: CartPage, product: Product, expected: LineExpectation = {}) {
    const line = received.lineFor(product);
    if (!line) return verdict(false, `a line for ${product.name}`, received.describe());
    const mismatches = (Object.keys(expected) as (keyof LineExpectation)[])
      .filter((key) => line[key] !== expected[key])
      .map((key) => `${key}: expected ${expected[key]}, got ${line[key]}`);
    return verdict(mismatches.length === 0, `the ${product.name} line to match ${JSON.stringify(expected)}`, mismatches.length ? mismatches.join('; ') : received.describe());
  },

  toHaveSubtotal(received: CartPage, expected: string) {
    return verdict(received.subtotal === expected, `the cart Subtotal row to be ${expected}`, `${received.subtotal}`);
  },
});
