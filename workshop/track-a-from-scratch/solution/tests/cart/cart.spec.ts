import { test, expect } from '../../src/fixtures';
import { productNamed } from '../../src/domain/catalog';
import { cents } from '../../src/domain/money';
import type { Cart } from '../../src/domain/types';
import type { Toolshop } from '../../src/fixtures';

const lineFor = (cart: Cart, productId: string) => cart.cart_items.find((l) => l.product_id === productId);
/** The API has no cart total; this is what a checkout would charge, from the cart's own lines. */
const cartTotalCents = (cart: Cart) => cart.cart_items.reduce((sum, l) => sum + l.quantity * cents(l.product.price), 0);

async function emptyCart(guest: Toolshop) {
  const created = await guest.carts.create();
  expect(created.status, 'a new cart can be created').toBe(201);
  const cart = await guest.carts.get(created.body.id);
  expect(cart.body.cart_items, 'precondition: a new cart is empty').toEqual([]);
  return created.body.id;
}

// Carts need no login (anyone holding the cart id can use it), so these run without an account.
test.describe('cart', () => {
  test('adding the same product twice adds up to one line with the summed quantity', async ({ guest }) => {
    const pliers = await productNamed(guest.products, 'Combination Pliers');
    const cartId = await emptyCart(guest);

    const first = await guest.carts.add(cartId, pliers.id, 2);
    const second = await guest.carts.add(cartId, pliers.id, 1);
    expect([first.status, second.status], 'both adds are accepted').toEqual([200, 200]);
    expect(second.body.result, 'the reply confirms the add').toBe('item added or updated');

    const cart = (await guest.carts.get(cartId)).body;
    expect(cart.cart_items, 'one product means one line').toHaveLength(1);
    expect(lineFor(cart, pliers.id)?.quantity, 'the line holds 2 + 1 units').toBe(3);
    // Two independent views of the price: the catalog entry and the cart line.
    expect(cartTotalCents(cart), 'cart value is 3 x the catalog unit price').toBe(3 * cents(pliers.price));
  });

  test('changing a quantity replaces it and leaves the other line alone', async ({ guest }) => {
    const cutters = await productNamed(guest.products, 'Bolt Cutters');
    const saw = await productNamed(guest.products, 'Wood Saw');
    const cartId = await emptyCart(guest);
    await guest.carts.add(cartId, cutters.id, 1);
    await guest.carts.add(cartId, saw.id, 2);

    const update = await guest.carts.setQuantity(cartId, cutters.id, 4);
    expect(update.status, 'the quantity update is accepted').toBe(200);

    const cart = (await guest.carts.get(cartId)).body;
    expect(lineFor(cart, cutters.id)?.quantity, 'the updated line now holds 4, not 1 + 4').toBe(4);
    expect(lineFor(cart, saw.id)?.quantity, 'the other line keeps its 2 units').toBe(2);
    expect(cartTotalCents(cart), 'cart value follows: 4 x cutters + 2 x saw').toBe(
      4 * cents(cutters.price) + 2 * cents(saw.price),
    );
  });

  test('removing a product drops its line and keeps the rest of the cart', async ({ guest }) => {
    const wrench = await productNamed(guest.products, 'Adjustable Wrench');
    const screwdriver = await productNamed(guest.products, 'Phillips Screwdriver');
    const cartId = await emptyCart(guest);
    await guest.carts.add(cartId, wrench.id, 1);
    await guest.carts.add(cartId, screwdriver.id, 3);
    expect((await guest.carts.get(cartId)).body.cart_items, 'precondition: two lines before removal').toHaveLength(2);

    const removal = await guest.carts.removeProduct(cartId, wrench.id);
    expect(removal.status, 'removal is accepted with no content').toBe(204);

    const cart = (await guest.carts.get(cartId)).body;
    expect(lineFor(cart, wrench.id), 'the removed product is gone from the cart').toBeUndefined();
    expect(lineFor(cart, screwdriver.id)?.quantity, 'the other line keeps its 3 units').toBe(3);
  });

  test('a zero quantity is rejected with a field error and the cart does not change', async ({ guest }) => {
    const pliers = await productNamed(guest.products, 'Slip Joint Pliers');
    const cartId = await emptyCart(guest);
    await guest.carts.add(cartId, pliers.id, 2);
    expect(lineFor((await guest.carts.get(cartId)).body, pliers.id)?.quantity, 'precondition: line holds 2').toBe(2);

    const rejected = await guest.carts.setQuantity(cartId, pliers.id, 0);
    expect(rejected.status, 'quantity 0 is a validation error').toBe(422);
    expect(rejected.body, 'the error names the quantity field').toMatchObject({
      errors: { quantity: ['The quantity field must be at least 1.'] },
    });
    expect(lineFor((await guest.carts.get(cartId)).body, pliers.id)?.quantity, 'the line still holds 2').toBe(2);
  });

  test(
    'KNOWN ISSUE: two adds push a line past the 99-unit limit that a single add enforces',
    { tag: '@known-issue' },
    async ({ guest }) => {
      // Not 'Thor Hammer': that one is a limited product, one per cart.
      const pliers = await productNamed(guest.products, 'Combination Pliers');
      const cartId = await emptyCart(guest);

      const single = await guest.carts.add(cartId, pliers.id, 100);
      expect(single.status, 'precondition: one add of 100 is refused').toBe(422);
      expect((await guest.carts.get(cartId)).body.cart_items, 'precondition: the refused add left no line').toEqual([]);

      await guest.carts.add(cartId, pliers.id, 99);
      const overflow = await guest.carts.add(cartId, pliers.id, 1);
      // Pinned bug: when this starts failing with 422, the limit is fixed; flip the test.
      expect(overflow.status, 'BUG: the add that crosses 99 is accepted').toBe(200);
      expect(lineFor((await guest.carts.get(cartId)).body, pliers.id)?.quantity, 'BUG: the line holds 100').toBe(100);
    },
  );

  test(
    'KNOWN ISSUE: setting the quantity of a product not in the cart reports success but adds nothing',
    { tag: '@known-issue' },
    async ({ guest }) => {
      const inCart = await productNamed(guest.products, 'Combination Pliers');
      const notInCart = await productNamed(guest.products, 'Claw Hammer');
      const cartId = await emptyCart(guest);
      await guest.carts.add(cartId, inCart.id, 1);

      // Positive control: the same call on a product that IS in the cart does change it.
      await guest.carts.setQuantity(cartId, inCart.id, 5);
      expect(lineFor((await guest.carts.get(cartId)).body, inCart.id)?.quantity, 'control: update works').toBe(5);

      const ghost = await guest.carts.setQuantity(cartId, notInCart.id, 3);
      expect(ghost.status, 'BUG: the update is answered with 200').toBe(200);
      expect(ghost.body.result, 'BUG: the reply claims an add or update').toBe('item added or updated');
      const cart = (await guest.carts.get(cartId)).body;
      expect(lineFor(cart, notInCart.id), 'nothing was added for the absent product').toBeUndefined();
      expect(cart.cart_items, 'the cart still has its one line').toHaveLength(1);
    },
  );
});
