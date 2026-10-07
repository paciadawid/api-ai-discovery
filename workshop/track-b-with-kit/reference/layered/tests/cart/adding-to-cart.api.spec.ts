import { test, expect } from '@/fixtures';
import { priced } from '@/domain/money';
import { BEETHOVEN, CONVERSE, MAX_QUANTITY } from '@/domain/products';
import { serverMessages } from '@/domain/server-messages';

test.describe('A shopper with an empty cart', () => {
  test.beforeEach(async ({ shopper }) => {
    await shopper.hasAnEmptyCart();
  });

  test('UC-CART-01: adding a simple product creates one line of quantity 1 priced at 1 x unit price (reply, counter and cart page agree)', async ({ shopper }) => {
    const reply = await shopper.adds(BEETHOVEN);
    const counters = await shopper.allCounters();
    const cart = await shopper.cart();

    expect(reply, 'add product 35').toBeAccepted();
    expect(counters, 'mini-cart counter after one add').toHaveCartCount(1);
    expect(cart, 'cart page: exactly one line').toHaveLineCount(1);
    expect(cart, 'the line is the product that was added, at 1 x unit price').toContainLine(BEETHOVEN, {
      quantity: 1,
      unitPrice: priced(BEETHOVEN, 1),
      lineTotal: priced(BEETHOVEN, 1),
    });
    expect(cart, 'Subtotal row = 1 x unit price').toHaveSubtotal(priced(BEETHOVEN, 1));
  });

  test('UC-CART-04: adding the same product twice merges into one line with the summed quantity', async ({ shopper }) => {
    const first = await shopper.adds(BEETHOVEN, 1);
    const second = await shopper.adds(BEETHOVEN, 3);
    const counters = await shopper.counters();
    const cart = await shopper.cart();

    expect(first, 'first add (quantity 1)').toBeAccepted();
    expect(second, 'second add (quantity 3)').toBeAccepted();
    expect(counters, 'counter = summed quantity 1 + 3').toHaveCartCount(4);
    expect(cart, 'one merged line, not two').toHaveLineCount(1);
    expect(cart, 'merged line quantity').toContainLine(BEETHOVEN, { quantity: 4 });
    expect(cart, 'Subtotal row = 4 x unit price').toHaveSubtotal(priced(BEETHOVEN, 4));
  });

  test('UC-CART-07: a variant product without Color and Size is rejected with both messages and nothing is added', async ({ shopper }) => {
    const reply = await shopper.adds(CONVERSE); // no Color and Size choice
    const counters = await shopper.counters();
    const cart = await shopper.cart();

    expect(reply, 'add the variant product without choices').toBeRejectedWith([serverMessages.pickColor, serverMessages.pickSize]);
    expect(counters, 'side effect: nothing was added (counter)').toHaveCartCount(0);
    expect(cart, 'side effect: the cart page is empty').toBeAnEmptyCart();

    // positive control: the counter and the parser do see a valid add in this very cart
    expect(await shopper.adds(BEETHOVEN), 'control add of product 35').toBeAccepted();
    expect(await shopper.counters(), 'control: counter sees a valid add').toHaveCartCount(1);
    expect(await shopper.cart(), 'control: parser sees the valid line').toHaveLineCount(1);
  });

  test('UC-CART-10: adding quantity 10001 is rejected with the maximum-quantity message and nothing is added', async ({ shopper }) => {
    const reply = await shopper.adds(BEETHOVEN, MAX_QUANTITY + 1);
    const counters = await shopper.counters();
    const cart = await shopper.cart();

    expect(reply, 'add quantity 10001').toBeRejectedWith([serverMessages.maxQuantity]);
    expect(counters, 'side effect: nothing was added (counter)').toHaveCartCount(0);
    expect(cart, 'side effect: the cart page is empty').toBeAnEmptyCart();

    // positive control: a valid add in the same cart is counted
    expect(await shopper.adds(BEETHOVEN), 'control add of product 35').toBeAccepted();
    expect(await shopper.counters(), 'control: counter sees a valid add').toHaveCartCount(1);
  });
});
