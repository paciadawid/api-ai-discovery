import { test, expect } from '@/fixtures';
import { CART_PAGE_EMPTY, CART_PAGE_WITH_ONE_LINE, SAMPLE_LINE_ID } from '@/domain/sample-pages';

// Offline: the Shopper runs against a stub store that only answers the cart counter (src/fixtures/stub-store.ts).
test.describe('The Given step "the shopper has an empty cart"', () => {
  test('UC-UNIT-13: it passes when the cart counter reads 0', async ({ shopperSeeing }) => {
    const shopper = shopperSeeing({ status: 200, body: { CartItemsCount: 0 } });

    await expect(shopper.hasAnEmptyCart(), 'counter 0 is an empty cart').resolves.toBeUndefined();
  });

  test('UC-UNIT-14: it fails when the cart counter reads 1, so a test never starts on a used cart', async ({ shopperSeeing }) => {
    const shopper = shopperSeeing({ status: 200, body: { CartItemsCount: 1 } });

    await expect(shopper.hasAnEmptyCart(), 'counter 1 is not an empty cart').rejects.toThrow();
  });

  test('UC-UNIT-15: it fails when the counter call answers HTTP 500, so an unreadable cart is not taken as empty', async ({ shopperSeeing }) => {
    const shopper = shopperSeeing({ status: 500, body: { CartItemsCount: 0 } });

    await expect(shopper.hasAnEmptyCart(), 'HTTP 500 proves nothing').rejects.toThrow();
  });

  test('UC-UNIT-16: it fails when the counter reply carries no cart count at all', async ({ shopperSeeing }) => {
    const shopper = shopperSeeing({ status: 200, body: {} });

    await expect(shopper.hasAnEmptyCart(), 'a missing count proves nothing').rejects.toThrow();
  });
});

// Offline: the same stub also serves the cart page and records which lines the Shopper asks the store to delete.
const noCounter = { status: 200, body: {} };

test.describe('The Shopper reading and emptying the cart', () => {
  test('UC-UNIT-18: emptying a cart that holds one line asks the store to delete exactly that line, once', async ({ shopperSeeing }) => {
    const deletedLines: number[] = [];
    const shopper = shopperSeeing(noCounter, { cartPage: { status: 200, body: CART_PAGE_WITH_ONE_LINE }, deletedLines });

    await shopper.emptiesCart();

    expect(deletedLines, 'the one line was deleted, once').toEqual([SAMPLE_LINE_ID]);
  });

  test('UC-UNIT-19: emptying an already empty cart deletes nothing', async ({ shopperSeeing }) => {
    const deletedLines: number[] = [];
    const shopper = shopperSeeing(noCounter, { cartPage: { status: 200, body: CART_PAGE_EMPTY }, deletedLines });

    await shopper.emptiesCart();

    expect(deletedLines, 'nothing to delete').toEqual([]);
  });

  test('UC-UNIT-20: reading the cart fails when the cart page answers HTTP 500, even with a readable body', async ({ shopperSeeing }) => {
    const shopper = shopperSeeing(noCounter, { cartPage: { status: 500, body: CART_PAGE_EMPTY } });

    await expect(shopper.cart(), 'HTTP 500 must not pass as an empty cart').rejects.toThrow();
  });
});
