import { test, expect } from '@/fixtures';
import { subtotalOf, unitsIn } from '@/domain/pricing';
import { lineIn } from '@/domain/cart-page';
import { type CartEntry, TITLEIST_SM6 } from '@/domain/products';

test.describe('A guest with an empty cart adds a product from the product page', () => {
  test.beforeEach(async ({ guest }) => {
    await guest.hasAnEmptyCart();
  });

  test('UC-CART-02: adding three units from the product page puts one line of quantity 3 in the cart', async ({ guest }) => {
    const expected: CartEntry[] = [{ product: TITLEIST_SM6, quantity: 3 }];

    const reply = await guest.adds(TITLEIST_SM6, 3);
    const counter = await guest.cartItemsCount();
    const cart = await guest.cart();

    expect(reply, 'adding 3 units of the product').toBeAccepted();
    expect(counter, 'header counter = the 3 units added').toBe(unitsIn(expected));
    expect(cart, 'one line of quantity 3, line total = 3 x unit price').toHaveExactlyTheLines(expected);
    expect(cart, 'cart subtotal = 3 x unit price').toHaveSubtotal(subtotalOf(expected));
  });
});

test.describe('A guest who already has 2 units of a product in the cart', () => {
  const FIRST_ADD = 2;
  const SECOND_ADD = 3;

  test.beforeEach(async ({ guest }) => {
    await guest.hasAnEmptyCart();
    await guest.hasInCart(TITLEIST_SM6, FIRST_ADD);
  });

  test('UC-CART-03: adding the same product again merges into the same line instead of creating a second one', async ({ guest }) => {
    const merged: CartEntry[] = [{ product: TITLEIST_SM6, quantity: FIRST_ADD + SECOND_ADD }];
    const firstLine = await guest.lineOf(TITLEIST_SM6);

    const reply = await guest.adds(TITLEIST_SM6, SECOND_ADD);
    const cart = await guest.cart();
    const counter = await guest.cartItemsCount();

    expect(reply, 'adding the same product a second time').toBeAccepted();
    expect(cart, 'still ONE line, the same line id, quantity 2 + 3').toHaveExactlyTheLines([{ id: firstLine.id, ...merged[0] }]);
    expect(lineIn(cart, TITLEIST_SM6)?.id, 'the merged line keeps the id of the first line').toBe(firstLine.id);
    expect(cart, 'cart subtotal = 5 x unit price').toHaveSubtotal(subtotalOf(merged));
    expect(counter, 'header counter = 5 units').toBe(unitsIn(merged));
  });
});
