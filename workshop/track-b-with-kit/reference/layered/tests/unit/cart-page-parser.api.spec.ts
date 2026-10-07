import { test, expect } from '@/fixtures';
import { parseCartPage } from '@/domain/cart-page';
import { priced } from '@/domain/money';
import { BEETHOVEN } from '@/domain/products';
import { CART_PAGE_EMPTY, CART_PAGE_WITH_ONE_LINE, CART_PAGE_WITH_THREE_UNITS, ERROR_PAGE, SAMPLE_LINE_ID, SAMPLE_LINE_ID_OF_THREE } from '@/domain/sample-pages';
import { serverMessages } from '@/domain/server-messages';

// Offline: the parser reads sample pages taken from the live store (src/domain/sample-pages.ts); no request is made.
test.describe('The cart page parser, reading sample pages', () => {
  test('UC-UNIT-01: a page with one line yields its id, quantity, name, unit price, line total and the Subtotal', () => {
    const cart = parseCartPage(CART_PAGE_WITH_ONE_LINE);

    expect(cart.lines, 'exactly one parsed line').toHaveLength(1);
    expect(cart.lines[0].id, 'line id').toBe(SAMPLE_LINE_ID);
    expect(cart.lines[0].quantity, 'line quantity').toBe(1);
    expect(cart.lines[0].name, 'line product name').toBe(BEETHOVEN.name);
    expect(cart.lines[0].unitPrice, 'line unit price').toBe(priced(BEETHOVEN, 1));
    expect(cart.lines[0].lineTotal, 'line total').toBe(priced(BEETHOVEN, 1));
    expect(cart.lines[0].text, 'product cell text names the product').toContain(BEETHOVEN.name);
    expect(cart.subtotal, 'Subtotal row').toBe(priced(BEETHOVEN, 1));
  });

  test('UC-UNIT-02: the real empty-cart page is empty: text shown, no line, no quantity input', () => {
    const cart = parseCartPage(CART_PAGE_EMPTY);

    expect(cart.emptyPage, 'the empty-cart text is visible').toBe(true);
    expect(cart.lines, 'no parsed line').toHaveLength(0);
    expect(cart.hasQuantityInput, 'no quantity input').toBe(false);
    expect(cart.isEmpty, 'all three views agree: empty').toBe(true);
  });

  test('UC-UNIT-03: a page with a line is not empty, although the empty-cart text sits in its data-empty-text attribute', () => {
    expect(CART_PAGE_WITH_ONE_LINE, 'precondition: the sample really carries the empty-cart text in the attribute').toContain(`data-empty-text="${serverMessages.cartEmpty}"`);
    const cart = parseCartPage(CART_PAGE_WITH_ONE_LINE);

    expect(cart.emptyPage, 'the attribute alone is not visible empty-cart text').toBe(false);
    expect(cart.hasQuantityInput, 'the quantity input is seen').toBe(true);
    expect(cart.isEmpty, 'a cart with a line is not empty').toBe(false);
  });

  test('UC-UNIT-04: an error page without lines and without the empty-cart text is not an empty cart', () => {
    const cart = parseCartPage(ERROR_PAGE);

    expect(cart.lines, 'no parsed line').toHaveLength(0);
    expect(cart.emptyPage, 'no empty-cart text on an error page').toBe(false);
    expect(cart.isEmpty, 'an unreadable page must not pass as an empty cart').toBe(false);
  });

  test('UC-UNIT-17: a line of three units yields quantity 3, unit price, line total and Subtotal as three different figures', () => {
    const cart = parseCartPage(CART_PAGE_WITH_THREE_UNITS);

    expect(cart.lines, 'exactly one parsed line').toHaveLength(1);
    expect(cart.lines[0].id, 'line id').toBe(SAMPLE_LINE_ID_OF_THREE);
    expect(cart.lines[0].quantity, 'line quantity').toBe(3);
    expect(cart.lines[0].unitPrice, 'unit price is the price of ONE unit').toBe(priced(BEETHOVEN, 1));
    expect(cart.lines[0].lineTotal, 'line total is the price of THREE units').toBe(priced(BEETHOVEN, 3));
    expect(cart.subtotal, 'Subtotal row').toBe(priced(BEETHOVEN, 3));
  });
});
