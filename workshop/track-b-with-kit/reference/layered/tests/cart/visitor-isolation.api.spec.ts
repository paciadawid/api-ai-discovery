import { test, expect } from '@/fixtures';
import { BEETHOVEN } from '@/domain/products';

// Gate: runs in the `gate` project before every other cart test (see playwright.config.ts).
test.describe('Two shoppers, each with an own User-Agent and cookie jar', () => {
  test.beforeEach(async ({ shopper, otherShopper }) => {
    await shopper.hasAnEmptyCart();
    await otherShopper.hasAnEmptyCart();
  });

  test('UC-CART-15: two guest carts (own User-Agent, own cookie jar) stay separate', async ({ shopper, otherShopper }) => {
    const reply = await shopper.adds(BEETHOVEN, 2);
    const cart = await shopper.cart(); // positive control: the line is visible to its owner
    const counters = await shopper.counters();
    const otherCounters = await otherShopper.counters();
    const otherCart = await otherShopper.cart();

    expect(reply, 'add to cart A').toBeAccepted();
    expect(cart, 'control: cart A shows its line').toHaveLineCount(1);
    expect(cart, 'control: cart A line quantity').toContainLine(BEETHOVEN, { quantity: 2 });
    expect(counters, 'control: cart A counter').toHaveCartCount(2);
    expect(otherCounters, 'cart B counter must not see the line of cart A').toHaveCartCount(0);
    expect(otherCart, 'cart B page must not show the line of cart A').toBeAnEmptyCart();
  });
});
