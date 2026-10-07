import { test, expect } from '@/fixtures';
import { parseCartPage } from '@/domain/cart-page';
import { priced } from '@/domain/money';
import { BEETHOVEN, CONVERSE } from '@/domain/products';
import { CART_PAGE_EMPTY, CART_PAGE_WITH_ONE_LINE, ERROR_PAGE, SAMPLE_LINE_ID } from '@/domain/sample-pages';
import { serverMessages } from '@/domain/server-messages';

// Offline: every matcher is run on synthetic replies and sample pages, once where it must pass and where it must fail,
// so no matcher can be a constant. A failing case is written `expect(() => expect(x).toBeY()).toThrow()`.
const accepted = { status: 200, body: { success: true } };
const rejection = { status: 200, body: { success: false, message: [serverMessages.pickColor, serverMessages.pickSize] } };
const withLine = parseCartPage(CART_PAGE_WITH_ONE_LINE);
const emptyCart = parseCartPage(CART_PAGE_EMPTY);
const errorPage = parseCartPage(ERROR_PAGE);

test.describe('The domain matchers, on replies and pages built offline', () => {
  test('UC-UNIT-05: toBeAccepted passes on HTTP 200 + success:true and fails on a business refusal, HTTP 500 and a missing flag', () => {
    expect(accepted).toBeAccepted();
    expect(() => expect(rejection).toBeAccepted()).toThrow();
    expect(() => expect({ status: 500, body: { success: true } }).toBeAccepted()).toThrow();
    expect(() => expect({ status: 200, body: {} }).toBeAccepted()).toThrow();
    expect(rejection).not.toBeAccepted();
  });

  test('UC-UNIT-06: toBeAcceptedWithoutMessage passes on a silent acceptance and fails when a message comes along or the request is refused', () => {
    expect(accepted).toBeAcceptedWithoutMessage();
    expect({ status: 200, body: { success: true, message: [] } }).toBeAcceptedWithoutMessage();
    expect(() => expect({ status: 200, body: { success: true, message: [serverMessages.lineRemoved] } }).toBeAcceptedWithoutMessage()).toThrow();
    expect(() => expect({ status: 200, body: { success: true, message: serverMessages.lineRemoved } }).toBeAcceptedWithoutMessage()).toThrow();
    expect(() => expect(rejection).toBeAcceptedWithoutMessage()).toThrow();
    expect(() => expect({ status: 500, body: { success: true } }).toBeAcceptedWithoutMessage()).toThrow();
  });

  test('UC-UNIT-07: toBeRejectedWith passes only on HTTP 200 + success:false carrying exactly the expected messages, in order', () => {
    const both = [serverMessages.pickColor, serverMessages.pickSize];

    expect(rejection).toBeRejectedWith(both);
    expect(() => expect(accepted).toBeRejectedWith(both)).toThrow();
    expect(() => expect({ status: 200, body: { success: true, message: both } }).toBeRejectedWith(both)).toThrow();
    expect(() => expect({ status: 500, body: rejection.body }).toBeRejectedWith(both)).toThrow();
    expect(() => expect(rejection).toBeRejectedWith([serverMessages.maxQuantity])).toThrow();
    expect(() => expect(rejection).toBeRejectedWith([...both, serverMessages.maxQuantity])).toThrow();
    expect(() => expect({ status: 200, body: { success: false } }).toBeRejectedWith(both)).toThrow();
    expect(() => expect(rejection).toBeRejectedWith([serverMessages.pickColor])).toThrow(); // an extra message in the reply
    expect(() => expect(rejection).toBeRejectedWith([serverMessages.pickSize, serverMessages.pickColor])).toThrow(); // reordered
    expect(() => expect({ status: 200, body: { success: false, message: [...both, serverMessages.maxQuantity] } }).toBeRejectedWith(both)).toThrow();
    expect(() => expect({ status: 200, body: { success: false, message: [serverMessages.pickSize, serverMessages.pickColor] } }).toBeRejectedWith(both)).toThrow();
    expect({ status: 200, body: { success: false, message: serverMessages.maxQuantity } }).toBeRejectedWith([serverMessages.maxQuantity]);
  });

  test('UC-UNIT-08: toContainLine passes on the matching line and fails on a wrong product, id, quantity, unit price or line total', () => {
    const right = { id: SAMPLE_LINE_ID, quantity: 1, unitPrice: priced(BEETHOVEN, 1), lineTotal: priced(BEETHOVEN, 1) };

    expect(withLine).toContainLine(BEETHOVEN);
    expect(withLine).toContainLine(BEETHOVEN, right);
    expect(() => expect(withLine).toContainLine(CONVERSE)).toThrow();
    expect(() => expect(emptyCart).toContainLine(BEETHOVEN)).toThrow();
    expect(() => expect(withLine).toContainLine(BEETHOVEN, { ...right, id: SAMPLE_LINE_ID + 1 })).toThrow();
    expect(() => expect(withLine).toContainLine(BEETHOVEN, { ...right, quantity: 2 })).toThrow();
    expect(() => expect(withLine).toContainLine(BEETHOVEN, { ...right, unitPrice: priced(BEETHOVEN, 2) })).toThrow();
    expect(() => expect(withLine).toContainLine(BEETHOVEN, { ...right, lineTotal: priced(BEETHOVEN, 2) })).toThrow();
  });

  test('UC-UNIT-09: toContainLine works negated: .not passes on a mismatch and fails on a match', () => {
    expect(withLine).not.toContainLine(BEETHOVEN, { quantity: 2 });
    expect(withLine).not.toContainLine(CONVERSE);
    expect(() => expect(withLine).not.toContainLine(BEETHOVEN, { quantity: 1 })).toThrow();
    expect(() => expect(withLine).not.toContainLine(BEETHOVEN)).toThrow();
  });

  test('UC-UNIT-10: toBeAnEmptyCart passes on the real empty page and fails on a page with a line and on an error page', () => {
    expect(emptyCart).toBeAnEmptyCart();
    expect(() => expect(withLine).toBeAnEmptyCart()).toThrow();
    expect(() => expect(errorPage).toBeAnEmptyCart()).toThrow();
    expect(withLine).not.toBeAnEmptyCart();
  });

  test('UC-UNIT-12: the counter, line-count and subtotal matchers pass on the true value and fail on any other', () => {
    expect({ CartItemsCount: 1 }).toHaveCartCount(1);
    expect(() => expect({ CartItemsCount: 1 }).toHaveCartCount(2)).toThrow();
    expect(() => expect({}).toHaveCartCount(0)).toThrow();

    expect(withLine).toHaveLineCount(1);
    expect(emptyCart).toHaveLineCount(0);
    expect(() => expect(withLine).toHaveLineCount(0)).toThrow();
    expect(() => expect(withLine).toHaveLineCount(2)).toThrow();
    expect(() => expect(emptyCart).toHaveLineCount(1)).toThrow();

    expect(withLine).toHaveSubtotal(priced(BEETHOVEN, 1));
    expect(() => expect(withLine).toHaveSubtotal(priced(BEETHOVEN, 2))).toThrow();
    expect(() => expect(emptyCart).toHaveSubtotal(priced(BEETHOVEN, 1))).toThrow();
  });

  test('UC-UNIT-11: toReportSubTotal reads the amount inside "$5.67 excl tax" and fails on another amount or none', () => {
    const reply = { status: 200, body: { success: true, SubTotal: `${priced(BEETHOVEN, 3)} excl tax` } };

    expect(reply).toReportSubTotal(priced(BEETHOVEN, 3));
    expect(() => expect(reply).toReportSubTotal(priced(BEETHOVEN, 2))).toThrow();
    expect(() => expect(accepted).toReportSubTotal(priced(BEETHOVEN, 3))).toThrow();
  });
});
