import { test, expect } from '@/fixtures';
import { subtotalOf, unitsIn } from '@/domain/pricing';
import { lineIn } from '@/domain/cart-page';
import { type CartEntry, TITLEIST_SM6 } from '@/domain/products';

test.describe('A guest with one unit of a product in the cart changes its quantity', () => {
  test.beforeEach(async ({ guest }) => {
    await guest.hasAnEmptyCart();
    await guest.hasInCart(TITLEIST_SM6, 1);
  });

  test('UC-CART-21: setting a line to quantity 3 updates the line, the subtotal and the counter together', async ({ guest }) => {
    const expected: CartEntry[] = [{ product: TITLEIST_SM6, quantity: 3 }];
    const line = await guest.lineOf(TITLEIST_SM6);

    const reply = await guest.setsQuantity(line, 3);
    const cart = await guest.cart();
    const counter = await guest.cartItemsCount();

    expect(reply, 'setting the quantity to 3').toBeAccepted();
    expect(reply, 'update reply: SubTotal = 3 x unit price').toReportSubtotal(subtotalOf(expected));
    expect(reply, 'update reply: newItemPrice is the UNIT price, not the line total').toReportUnitPrice(TITLEIST_SM6.unitPriceCents);
    expect(cart, 'cart page: the same line id (not renumbered), now quantity 3 with line total 3 x unit price').toHaveExactlyTheLines([{ id: line.id, ...expected[0] }]);
    expect(lineIn(cart, TITLEIST_SM6)?.id, 'the line keeps its id when the quantity changes').toBe(line.id);
    expect(cart, 'a wrong line id does not match the real line (negative control)').not.toHaveExactlyTheLines([{ id: line.id + 1, ...expected[0] }]);
    expect(cart, 'the old quantity 1 is gone from the cart page').not.toHaveExactlyTheLines([{ id: line.id, product: TITLEIST_SM6, quantity: 1 }]);
    expect(cart, 'cart page subtotal = 3 x unit price').toHaveSubtotal(subtotalOf(expected));
    expect(counter, 'header counter = 3 units').toBe(unitsIn(expected));
  });
});
