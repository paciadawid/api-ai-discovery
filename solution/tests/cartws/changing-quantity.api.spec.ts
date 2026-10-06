import { test, expect } from '@/fixtures';
import { priced } from '@/domain/money';
import { products } from '@/domain/products';
import { serverMessages } from '@/domain/server-messages';

const { supremeGolfball: golfball } = products;

test.describe('A shopper with one golfball in the cart', () => {
  test.beforeEach(async ({ shopper }) => {
    await shopper.hasInCart(golfball, 1);
  });

  test('UC-CARTWS-04: raising the quantity reprices the same line and the cart totals', async ({ shopper }) => {
    const line = await shopper.lineOf(golfball);

    const reply = await shopper.changesQuantity(line, 5);

    expect(reply).toBeAccepted();
    expect(reply.body).not.toHaveProperty('error');
    expect(reply.body.SubTotal).toContain(priced(golfball, 5));
    expect(reply.body.newItemPrice).toContain(golfball.unitPrice);
    expect(reply.body.cartHtml, 'the reply carries the re-rendered cart').toBeTruthy();

    const cart = await shopper.cart();
    expect(cart.items.map((l) => l.id), 'still the same line').toEqual([line.id]);
    expect(cart).toContainLine(golfball, { quantity: 5, lineTotal: priced(golfball, 5) });
    expect((await shopper.counters()).CartItemsCount).toBe(5);
  });

  const invalidQuantities = [
    { described: 'zero', quantity: 0 },
    { described: 'a negative number', quantity: -1 },
  ];

  for (const { described, quantity } of invalidQuantities) {
    test(
      `UC-CARTWS-08: setting the quantity to ${described} removes the line but the store answers with a server error`,
      { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-1: HTTP 500 (NullReference) although the line is removed' } },
      async ({ shopper }) => {
        const line = await shopper.lineOf(golfball);

        const reply = await shopper.changesQuantity(line, quantity);

        expect(reply).toFailWithServerError({
          controller: 'shoppingcart',
          action: 'updatecartitem',
          message: serverMessages.unhandledServerError,
        });
        expect(await shopper.cart(), 'the line is gone despite the error').toHaveNoLines();
        expect((await shopper.counters()).CartItemsCount).toBe(0);
      },
    );
  }
});
