import { test, expect } from '@/fixtures';
import { REMOVAL_REFUSED_MESSAGE } from '@/domain/messages';
import { SEIKO_SRPA49K1, TITLEIST_SM6 } from '@/domain/products';

test.describe('Two guest shoppers on the same host, each with an empty cart', () => {
  const GUEST_UNITS = 2;

  test.beforeEach(async ({ guest, otherGuest }) => {
    await guest.hasAnEmptyCart();
    await otherGuest.hasAnEmptyCart();
  });

  test("UC-CART-01: two guests never see each other's cart and one cannot remove the other's line", async ({ guest, otherGuest }) => {
    await guest.hasInCart(TITLEIST_SM6, GUEST_UNITS);
    const guestsLine = await guest.lineOf(TITLEIST_SM6);

    const guestCount = await guest.cartItemsCount();
    const otherCount = await otherGuest.cartItemsCount();
    const otherCart = await otherGuest.cart();
    const refused = await otherGuest.removes(guestsLine.id);
    const guestCartAfter = await guest.cart();
    const guestCountAfter = await guest.cartItemsCount();

    expect(guestCount, "positive control: the first guest's own counter shows their units").toBe(GUEST_UNITS);
    expect(otherCount, "the second guest's counter does not include the first guest's units").toBe(0);
    expect(otherCart, "the second guest's cart page shows none of the first guest's lines").toHaveExactlyTheLines([]);
    expect(refused, "removing the first guest's line id from the second guest's session is refused").toBeRefusedWith(REMOVAL_REFUSED_MESSAGE);
    expect(refused, 'the refusal is a refusal, not a success (negative control on the real reply)').not.toBeAccepted();
    expect(refused, 'a different message is not this refusal (negative control on the real reply)').not.toBeRefusedWith(`${REMOVAL_REFUSED_MESSAGE} (another message)`);
    expect(refused.body.message, 'the refusal carries the exact server message').toBe(REMOVAL_REFUSED_MESSAGE);
    expect(guestCartAfter, "the first guest's line is untouched after the foreign removal attempt").toHaveExactlyTheLines([
      { id: guestsLine.id, product: TITLEIST_SM6, quantity: GUEST_UNITS },
    ]);
    expect(guestCountAfter, "the first guest's counter is untouched after the foreign removal attempt").toBe(GUEST_UNITS);

    // Positive control (rule 6): the same removal call works on a line the second guest owns, so the refusal above is not a dead endpoint.
    await otherGuest.hasInCart(SEIKO_SRPA49K1, 1);
    const ownLine = await otherGuest.lineOf(SEIKO_SRPA49K1);
    const removed = await otherGuest.removes(ownLine.id);
    const otherCartAfter = await otherGuest.cart();

    expect(removed, 'positive control: the second guest removes their own line with the same call').toBeAccepted();
    expect(otherCartAfter, "the second guest's own line is gone").toHaveExactlyTheLines([]);
  });
});
