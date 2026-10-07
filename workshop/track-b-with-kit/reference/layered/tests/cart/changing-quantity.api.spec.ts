import { test, expect } from '@/fixtures';
import { priced } from '@/domain/money';
import { BEETHOVEN } from '@/domain/products';

test.describe('A shopper with one Beethoven in the cart', () => {
  test.beforeEach(async ({ shopper }) => {
    await shopper.hasAnEmptyCart();
    await shopper.hasInCart(BEETHOVEN, 1);
  });

  test('UC-CART-16: setting an absolute quantity updates the reply, the counter and the cart page consistently', async ({ shopper }) => {
    const line = await shopper.onlyLine();

    const reply = await shopper.setsQuantity(line, 3);
    const counters = await shopper.counters();
    const cart = await shopper.cart();

    expect(reply, 'update quantity to 3').toBeAccepted();
    expect(reply.body.message, 'update reply: message is a list').toEqual(expect.any(Array));
    expect(reply, 'update reply: SubTotal = 3 x unit price').toReportSubTotal(priced(BEETHOVEN, 3));
    expect(counters, 'counter after the update').toHaveCartCount(3);
    expect(cart, 'cart page: still exactly one line').toHaveLineCount(1);
    expect(cart, 'the line keeps its id and shows 3 x unit price').toContainLine(BEETHOVEN, {
      id: line.id,
      quantity: 3,
      lineTotal: priced(BEETHOVEN, 3),
    });
    expect(cart, 'cart page: Subtotal = 3 x unit price').toHaveSubtotal(priced(BEETHOVEN, 3));
  });

  test('UC-CART-17: quantity is absolute, not a delta (2, then back to 1) and the line id stays the same', async ({ shopper }) => {
    const line = await shopper.onlyLine();

    const up = await shopper.setsQuantity(line, 2);
    const countersUp = await shopper.counters();
    const cartUp = await shopper.cart();

    expect(up, 'update to 2').toBeAccepted();
    expect(countersUp, 'counter after update to 2').toHaveCartCount(2);
    expect(cartUp, 'cart page after update to 2: one line, same id').toHaveLineCount(1);
    expect(cartUp, 'cart page after update to 2').toContainLine(BEETHOVEN, { id: line.id, quantity: 2 });

    const down = await shopper.setsQuantity(line, 1);
    const countersDown = await shopper.counters();
    const cartDown = await shopper.cart();

    expect(down, 'update back to 1').toBeAccepted();
    expect(down, 'update reply: SubTotal = 1 x unit price').toReportSubTotal(priced(BEETHOVEN, 1));
    expect(countersDown, 'counter after update back to 1 (absolute, not 3)').toHaveCartCount(1);
    expect(cartDown, 'cart page after update back to 1: one line, same id').toHaveLineCount(1);
    expect(cartDown, 'cart page after update back to 1').toContainLine(BEETHOVEN, { id: line.id, quantity: 1 });
    expect(cartDown, 'Subtotal row after update back to 1').toHaveSubtotal(priced(BEETHOVEN, 1));
  });
});
