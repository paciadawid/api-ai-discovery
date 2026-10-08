import { test, expect } from '@/fixtures';
import { subtotalOf, unitsIn } from '@/domain/pricing';
import { lineIn } from '@/domain/cart-page';
import { BASKETBALL, type CartEntry, SEIKO_SRPA49K1, TITLEIST_SM6 } from '@/domain/products';

test.describe('A guest with three lines in the cart removes one of them', () => {
  // Basketball stays at quantity 1 per line: it has a tier price from quantity 6.
  const before: CartEntry[] = [
    { product: TITLEIST_SM6, quantity: 2 },
    { product: SEIKO_SRPA49K1, quantity: 1 },
    { product: BASKETBALL, quantity: 1 },
  ];

  test.beforeEach(async ({ guest }) => {
    await guest.hasAnEmptyCart();
    for (const { product, quantity } of before) await guest.hasInCart(product, quantity);
  });

  test('UC-CART-29: removing one of three lines removes only that line and updates the subtotal and the counters', async ({ guest }) => {
    const removed = SEIKO_SRPA49K1;
    const kept = before.filter((entry) => entry.product !== removed);
    const cartBefore = await guest.cart();
    const keptWithIds = kept.map((entry) => ({ id: lineIn(cartBefore, entry.product)!.id, ...entry }));

    expect(cartBefore, 'precondition: all three lines are in the cart').toHaveExactlyTheLines(before);

    const reply = await guest.removes(lineIn(cartBefore, removed)!.id);
    const cart = await guest.cart();
    const counter = await guest.cartItemsCount();

    expect(reply, 'delete reply: removed, and cartItemCount counts the LINES left').toConfirmRemoval(kept.length);
    expect(reply, 'a wrong count of lines left is not confirmed (negative control on the real reply)').not.toConfirmRemoval(kept.length + 1);
    expect(reply.body.cartItemCount, 'cartItemCount is the number of lines left (2), not the units (3)').toBe(kept.length);
    expect(cart, 'only the other two lines remain, with their old ids and quantities').toHaveExactlyTheLines(keptWithIds);
    expect(cart, 'subtotal = the two remaining lines (unit price x quantity)').toHaveSubtotal(subtotalOf(kept));
    expect(counter, 'header counter sums the QUANTITIES of the remaining lines').toBe(unitsIn(kept));
  });
});
