import { test, expect } from '@/fixtures';
import { products } from '@/domain/products';
import { serverMessages } from '@/domain/server-messages';

const { supremeGolfball: golfball, transoceanChronograph: chronograph } = products;

test.describe('Removing products from the cart', () => {
  test('UC-CARTWS-10: removing lines one by one leaves the others untouched until the cart is empty', async ({ shopper }) => {
    await shopper.hasInCart(golfball, 2);
    await shopper.hasInCart(chronograph, 1);

    const firstRemoval = await shopper.removes(await shopper.lineOf(golfball));

    expect(firstRemoval).toBeAccepted();
    expect(firstRemoval.body.message).toBe(serverMessages.lineRemoved);
    const cartWithOneLine = await shopper.cart();
    expect(cartWithOneLine).toHaveLineCount(1);
    expect(cartWithOneLine).toContainLine(chronograph, { quantity: 1 });
    expect((await shopper.counters()).CartItemsCount).toBe(1);

    const lastRemoval = await shopper.removes(await shopper.lineOf(chronograph));

    expect(lastRemoval).toBeAccepted();
    expect(lastRemoval.body.cartItemCount).toBe(0);
    expect(await shopper.cart()).toHaveNoLines();
    expect((await shopper.counters()).CartItemsCount).toBe(0);
    expect((await shopper.miniCart()).listsLines).toBe(false);
  });
});

test.describe('A shopper cannot remove or change lines that are not theirs', () => {
  test.beforeEach(async ({ shopper, otherShopper }) => {
    await shopper.hasInCart(golfball, 1);
    await otherShopper.hasInCart(golfball, 1);
  });

  test('UC-CARTWS-11: removing a line that does not exist is refused and the cart stays as it was', async ({ shopper }) => {
    const reply = await shopper.removesLineWithId('999999999');

    expect(reply).toBeRefused(serverMessages.lineRemovalFailed);
    expect(await shopper.cart()).toHaveLineCount(1);
  });

  test("UC-CARTWS-11: removing another shopper's line is refused and leaves their cart intact", async ({ shopper, otherShopper }) => {
    const theirLine = await otherShopper.lineOf(golfball);
    expect((await shopper.lineOf(golfball)).id, 'each shopper owns a different line').not.toBe(theirLine.id);

    const reply = await shopper.removesLineWithId(theirLine.id);

    expect(reply).toBeRefused(serverMessages.lineRemovalFailed);
    expect((await otherShopper.cart()).items).toEqual([theirLine]);
  });

  test('UC-CARTWS-11: removing the same line twice succeeds once and is refused the second time', async ({ shopper }) => {
    const line = await shopper.lineOf(golfball);

    expect(await shopper.removes(line)).toBeAccepted();
    const repeat = await shopper.removes(line);

    expect(repeat).toBeRefused(serverMessages.lineRemovalFailed);
    expect(await shopper.cart()).toHaveNoLines();
  });

  test(
    "UC-CARTWS-11: changing the quantity of another shopper's line fails with a server error",
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-3: HTTP 500 (NullReference) instead of a clean refusal' } },
    async ({ shopper, otherShopper }) => {
      const theirLine = await otherShopper.lineOf(golfball);

      const reply = await shopper.changesQuantityOfLineWithId(theirLine.id, 2);

      expect(reply).toFailWithServerError({ message: serverMessages.unhandledServerError });
      expect((await otherShopper.cart()).items, 'their quantity is unchanged').toEqual([theirLine]);
    },
  );

  test('UC-CARTWS-11: the remove endpoint does not exist for GET', async ({ shopper, otherShopper }) => {
    const theirLine = await otherShopper.lineOf(golfball);

    const reply = await shopper.removesLineWithIdUsingGet(theirLine.id);

    expect(reply.status).toBe(404);
    expect(await otherShopper.cart()).toHaveLineCount(1);
  });
});
