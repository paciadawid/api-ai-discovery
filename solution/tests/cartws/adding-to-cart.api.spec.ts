import { test, expect } from '@/fixtures';
import { priced } from '@/domain/money';
import { products } from '@/domain/products';

const { supremeGolfball: golfball } = products;

test.describe('Adding products to the cart', () => {
  test('UC-CARTWS-01: a first product lands in the cart as one line at its unit price', async ({ shopper }) => {
    expect(await shopper.cart(), 'a new visitor starts with an empty cart').toHaveNoLines();

    const reply = await shopper.addsToCart(golfball);

    expect(reply).toBeAccepted();
    expect(reply.setCookies.join(';'), 'the visitor keeps their identity').toContain('SMARTSTORE.VISITOR=');

    const cart = await shopper.cart();
    expect(cart).toHaveLineCount(1);
    expect(cart).toContainLine(golfball, { quantity: 1, unitPrice: golfball.unitPrice, lineTotal: priced(golfball, 1) });
    expect(await shopper.counters()).toMatchObject({ CartItemsCount: 1, WishlistItemsCount: 0, CompareItemsCount: 0 });

    const miniCart = await shopper.miniCart();
    expect(miniCart.contentType).toContain('text/html');
    expect(miniCart.listsLines, 'the header mini-cart shows the new line').toBe(true);
  });

  test('UC-CARTWS-02: adding the same product again grows the existing line instead of adding a second one', async ({ shopper }) => {
    await shopper.hasInCart(golfball, 1);

    const reply = await shopper.addsToCart(golfball, 3);

    expect(reply).toBeAccepted();
    const cart = await shopper.cart();
    expect(cart).toHaveLineCount(1);
    expect(cart).toContainLine(golfball, { quantity: 4, lineTotal: priced(golfball, 4) });
    expect((await shopper.counters()).CartItemsCount, 'the header counts units, not lines').toBe(4);
  });
});
