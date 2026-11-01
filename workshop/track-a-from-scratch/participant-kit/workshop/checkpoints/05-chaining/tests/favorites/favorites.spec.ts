import { test, expect } from '../../src/fixtures';
import { productNamed } from '../../src/domain/catalog';
import type { Toolshop } from '../../src/fixtures';

/** Precondition: the product is not a favorite yet. A leftover from a crashed run is reported, never deleted silently. */
async function notAFavorite(shopper: Toolshop, productId: string) {
  const list = await shopper.favorites.list();
  expect(list.status, 'favorites list needs and accepts the token').toBe(200);
  expect(
    list.body.map((f) => f.product_id),
    'precondition: not a favorite yet (a crashed earlier run left it? remove it in Postman: DELETE /favorites/<id>)',
  ).not.toContain(productId);
}

// Tests in parallel share one user, so each test owns a different product.
test.describe('favorites', () => {
  test('a favorite can be added, is listed with its product, and is gone after removal', async ({ shopper }) => {
    const spanner = await productNamed(shopper.products, 'Angled Spanner');
    await notAFavorite(shopper, spanner.id);

    const added = await shopper.favorites.add(spanner.id);
    expect(added.status, 'adding a favorite creates it (live 201; spec says 200)').toBe(201);
    expect(added.body.product_id, 'the favorite points at the chosen product').toBe(spanner.id);

    const listed = (await shopper.favorites.list()).body.find((f) => f.id === added.body.id);
    expect(listed?.product?.name, 'the list shows the favorite with the catalog product name').toBe(spanner.name);

    const removal = await shopper.favorites.remove(added.body.id);
    expect(removal.status, 'removal is accepted with no content').toBe(204);
    expect((await shopper.favorites.get(added.body.id)).status, 'the removed favorite is not found').toBe(404);
    expect((await shopper.favorites.list()).body.map((f) => f.product_id), 'and it left the list').not.toContain(spanner.id);
  });

  test('the same product cannot be a favorite twice', async ({ shopper }) => {
    const screwdriver = await productNamed(shopper.products, 'Mini Screwdriver');
    await notAFavorite(shopper, screwdriver.id);
    const first = await shopper.favorites.add(screwdriver.id);
    expect(first.status, 'precondition: the first add works').toBe(201);

    const second = await shopper.favorites.add(screwdriver.id);
    expect(second.status, 'the second add is a conflict').toBe(409);
    expect(second.body, 'the conflict says it is a duplicate').toEqual({ message: 'Duplicate Entry' });

    const entries = (await shopper.favorites.list()).body.filter((f) => f.product_id === screwdriver.id);
    expect(entries, 'the list holds the product exactly once').toHaveLength(1);
  });

  test('favorites are refused without a token', async ({ guest }) => {
    const res = await guest.favorites.list();
    expect(res.status, 'no token, no favorites').toBe(401);
    expect(res.body, 'the refusal uses the documented shape').toEqual({ message: 'Unauthorized' });
  });
});
