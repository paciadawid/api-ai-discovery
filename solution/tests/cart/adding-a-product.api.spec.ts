import { test, expect } from '@/fixtures';
import { cookieNames } from '@/domain/cookies';
import { products } from '@/domain/products';

const { supremeGolfball: golfball } = products;

test.describe('A first-time shopper', () => {
  test('UC-CART-01: a simple product added to the cart appears as a single line of quantity one', async ({ newShopper }) => {
    const shopper = await newShopper({ cookieless: true });

    const reply = await shopper.addsToCart(golfball);

    expect(reply).toBeAccepted();
    expect(reply.setCookies.join('\n'), 'the first add starts the visit').toContain(cookieNames.visitor);
    expect((await shopper.counters()).CartItemsCount).toBe(1);
    const cart = await shopper.cart();
    expect(cart).toHaveLineCount(1);
    expect(cart).toContainLine(golfball, { quantity: 1 });
  });
});
