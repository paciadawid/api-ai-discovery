import { test, expect } from '@/fixtures';
import { BEETHOVEN } from '@/domain/products';
import { serverMessages } from '@/domain/server-messages';

test.describe('A shopper with one Beethoven in the cart', () => {
  test.beforeEach(async ({ shopper }) => {
    await shopper.hasAnEmptyCart();
    await shopper.hasInCart(BEETHOVEN, 1);
  });

  test('UC-CART-23: removing the only line empties the cart (reply, counter and cart page agree)', async ({ shopper }) => {
    const line = await shopper.onlyLine(); // positive control: the parser sees the line before it is removed

    const reply = await shopper.removes(line);
    const counters = await shopper.counters();
    const cart = await shopper.cart();

    expect(reply, 'remove the line').toBeAccepted();
    expect(reply.body.message, 'removal reply: message').toBe(serverMessages.lineRemoved);
    expect(reply.body.cartItemCount, 'removal reply: cartItemCount').toBe(0);
    expect(counters, 'counter after the removal').toHaveCartCount(0);
    expect(cart, 'cart page says the cart is empty').toBeAnEmptyCart();
    expect(cart, 'the removed line id is gone from the cart page').not.toContainLine(BEETHOVEN, { id: line.id });
  });
});
