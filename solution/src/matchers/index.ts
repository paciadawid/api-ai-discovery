import { expect as base, type ExpectMatcherState } from '@playwright/test';
import type { Reply } from '@/api/http-client';
import type { DeleteItemBody, UpdateItemBody } from '@/api/types';
import type { CartPage } from '@/domain/cart-page';
import { formatMoney, lineTotalCents, parseMoney } from '@/domain/pricing';
import { REMOVED_MESSAGE } from '@/domain/messages';
import type { Product } from '@/domain/products';

export type ExpectedLine = { id?: number; product: Product; quantity: number };

// Failure messages print the reply or the cart, long HTML fields shortened, so nobody opens the raw response.
const show = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => (typeof v === 'string' && v.length > 80 ? `${v.slice(0, 60)}...(${v.length} chars)` : v));

const describeLines = (cart: CartPage): string =>
  cart.lines.map((l) => `#${l.id} ${l.name} x${l.quantity} (unit ${formatMoney(l.unitPriceCents)}, total ${formatMoney(l.lineTotalCents)})`).join('; ') || '(no lines)';

export const expect = base.extend({
  /** Business success: HTTP 200 and success:true (a 200 alone proves nothing on this host). */
  toBeAccepted(this: ExpectMatcherState, reply: Reply<{ success: boolean }>) {
    const pass = reply.status === 200 && reply.body.success === true;
    return { pass, message: () => `${this.isNot ? 'did not expect' : 'expected'} the call to succeed (HTTP 200 + success:true)\n  actual: HTTP ${reply.status} ${show(reply.body)}` };
  },

  /** Business refusal: HTTP 200, success:false and this exact message. */
  toBeRefusedWith(this: ExpectMatcherState, reply: Reply<{ success: boolean; message?: unknown }>, message: string) {
    const pass = reply.status === 200 && reply.body.success === false && reply.body.message === message;
    return { pass, message: () => `${this.isNot ? 'did not expect' : 'expected'} a refusal (HTTP 200, success:false, message "${message}")\n  actual: HTTP ${reply.status} ${show(reply.body)}` };
  },

  /** A removal: success, the exact message, and cartItemCount = number of LINES left (not units). */
  toConfirmRemoval(this: ExpectMatcherState, reply: Reply<DeleteItemBody>, linesLeft: number) {
    const pass = reply.status === 200 && reply.body.success === true && reply.body.message === REMOVED_MESSAGE && reply.body.cartItemCount === linesLeft;
    return { pass, message: () => `${this.isNot ? 'did not expect' : 'expected'} a removal confirmation with ${linesLeft} line(s) left, message "${REMOVED_MESSAGE}"\n  actual: HTTP ${reply.status} ${show(reply.body)}` };
  },

  /** Update reply: the whole-cart SubTotal field only. */
  toReportSubtotal(reply: Reply<UpdateItemBody>, cents: number) {
    const actual = reply.body.SubTotal === undefined ? undefined : parseMoney(reply.body.SubTotal);
    return { pass: actual === cents, message: () => `update reply SubTotal\n  expected: ${formatMoney(cents)}\n  actual:   ${show(reply.body.SubTotal)}` };
  },

  /** Update reply: the newItemPrice field only, which is the UNIT price of the line. */
  toReportUnitPrice(reply: Reply<UpdateItemBody>, cents: number) {
    const actual = reply.body.newItemPrice === undefined ? undefined : parseMoney(reply.body.newItemPrice);
    return { pass: actual === cents, message: () => `update reply newItemPrice (unit price)\n  expected: ${formatMoney(cents)}\n  actual:   ${show(reply.body.newItemPrice)}` };
  },

  /** The cart page shows EXACTLY these lines (extras and missing ones fail; page order is not part of the contract).
   *  Each line: product name, quantity, unit price = the product's, line total = unit price x quantity; id only when given. */
  toHaveExactlyTheLines(this: ExpectMatcherState, cart: CartPage, expected: ExpectedLine[]) {
    const wanted = expected
      .map((e) => ({ id: e.id, name: e.product.name, quantity: e.quantity, unitPriceCents: e.product.unitPriceCents, lineTotalCents: lineTotalCents(e.product, e.quantity) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const actual = [...cart.lines].sort((a, b) => a.name.localeCompare(b.name));
    const pass =
      wanted.length === actual.length &&
      wanted.every((w, i) => {
        const a = actual[i];
        return (w.id === undefined || w.id === a.id) && w.name === a.name && w.quantity === a.quantity && w.unitPriceCents === a.unitPriceCents && w.lineTotalCents === a.lineTotalCents;
      });
    const wantedText = wanted.map((w) => `${w.id === undefined ? '#?' : `#${w.id}`} ${w.name} x${w.quantity} (unit ${formatMoney(w.unitPriceCents)}, total ${formatMoney(w.lineTotalCents)})`).join('; ') || '(no lines)';
    return { pass, message: () => `cart lines\n  ${this.isNot ? 'not expected' : 'expected'}: ${wantedText}\n  actual:   ${describeLines(cart)}` };
  },

  /** The Subtotal row of the cart page. */
  toHaveSubtotal(cart: CartPage, cents: number) {
    return {
      pass: cart.subtotalCents === cents,
      message: () => `cart page Subtotal\n  expected: ${formatMoney(cents)}\n  actual:   ${cart.subtotalCents === null ? '(no totals table)' : formatMoney(cart.subtotalCents)}\n  lines:    ${describeLines(cart)}`,
    };
  },
});
