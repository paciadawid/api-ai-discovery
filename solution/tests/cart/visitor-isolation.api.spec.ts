import { test, expect } from '@/fixtures';
import { products } from '@/domain/products';
import { uniqueUserAgent } from '@/domain/visitor-identity';

const { supremeGolfball: golfball } = products;

// Gate: runs in the `gate` project before every cart test (see playwright.config.ts).
test.describe('Cart isolation between cookieless visitors', () => {
  test('UC-CART-96: visitors with different User-Agents never share a cart', async ({ newShopper }) => {
    const ann = await newShopper({ cookieless: true });
    const bob = await newShopper({ cookieless: true });
    expect(await ann.counters()).toMatchObject({ CartItemsCount: 0 });
    expect(await bob.counters()).toMatchObject({ CartItemsCount: 0 });

    const reply = await ann.addsToCart(golfball);

    expect(reply).toBeAccepted();
    expect((await ann.counters()).CartItemsCount, 'Ann sees her own line').toBe(1);
    expect((await bob.counters()).CartItemsCount, "Bob's cart stays empty (gate for all cart tests)").toBe(0);
  });

  test('UC-CART-96: visitors with the same User-Agent are probed for a shared cart (OQ-01)', async ({ newShopper }) => {
    const userAgent = uniqueUserAgent('UC-CART-96-SAME');
    const ann = await newShopper({ cookieless: true, userAgent });
    const bob = await newShopper({ cookieless: true, userAgent });

    expect(await ann.addsToCart(golfball)).toBeAccepted();
    const bobSees = (await bob.counters()).CartItemsCount;

    expect([0, 1], 'the cart is either isolated (0) or shared (1)').toContain(bobSees);
    test.info().annotations.push({
      type: 'OQ-01',
      description:
        bobSees === 1
          ? 'CONFIRMED: cookieless contexts with an identical User-Agent share one visitor. A unique User-Agent per test is mandatory.'
          : 'NOT shared: cookieless contexts with an identical User-Agent are isolated.',
    });
  });
});
