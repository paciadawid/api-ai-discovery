import { test, expect } from '@/fixtures';
import { serverMessages } from '@/domain/server-messages';

test.describe('A brand-new shopper who has not added anything', () => {
  test('UC-CART-28: an empty cart shows all counters 0 and the empty cart page', async ({ shopper }) => {
    const counters = await shopper.allCounters();
    const cart = await shopper.cart();

    expect(counters, 'all three counters are 0').toMatchObject({
      CartItemsCount: 0,
      WishlistItemsCount: 0,
      CompareItemsCount: 0,
    });
    expect(cart, `cart page says "${serverMessages.cartEmpty}", has no line and no quantity input`).toBeAnEmptyCart();
  });
});
