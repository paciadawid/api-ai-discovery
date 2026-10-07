import { expect, test } from '@playwright/test';
import type { Reply } from '@/api/http-client';
import type { StoreApi } from '@/api/store-api';
import { messagesOf, type CartActionBody, type Counters } from '@/api/types';
import { parseCartPage, type CartLine, type CartPage } from '@/domain/cart-page';
import type { Product } from '@/domain/products';

/**
 * A guest of the store, described in business terms.
 *
 * - `has...` methods set the scene (Given) and fail the test loudly if the store refuses.
 * - verbs in the third person (`adds`, `setsQuantity`, `removes`) perform the behaviour under test (When)
 *   and return the store's reply for the test to judge.
 * - `cart()`, `counters()`, `onlyLine()` observe the outcome (Then).
 * Each Given/When is a report step, so the HTML report reads like the scenario.
 */
export class Shopper {
  constructor(private readonly store: StoreApi) {}

  // Given

  /** Proves the precondition of every test that changes state: the cart counter starts at 0. */
  async hasAnEmptyCart(): Promise<void> {
    await test.step('Given the shopper has an empty cart', async () => {
      const reply = await this.store.cart.counters();
      expect(reply.status, 'precondition: cartsummary HTTP status').toBe(200);
      expect(reply.body.CartItemsCount, 'precondition: the cart starts empty (CartItemsCount)').toBe(0);
    });
  }

  async hasInCart(product: Product, quantity = 1): Promise<void> {
    await test.step(`Given the shopper has ${quantity} x ${product.name} in the cart`, async () => {
      const reply = await this.store.cart.addProduct(product.id, quantity);
      expect(reply.status, `setup: add ${product.name}, HTTP status`).toBe(200);
      expect(reply.body.success, `setup: adding ${product.name} was refused: ${messagesOf(reply.body)}`).toBe(true);
    });
  }

  /** The first request of a guest; it hands out the guest cookie. */
  async opensProductPage(product: Product): Promise<void> {
    await test.step(`When the shopper opens the ${product.name} page`, async () => {
      const reply = await this.store.productPage(product.slug);
      expect(reply.status, 'warm-up: product page GET (guest cookie)').toBe(200);
    });
  }

  // When

  adds(product: Product, quantity = 1, choices: Record<string, string | number> = {}): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper adds ${quantity} x ${product.name} to the cart`, () => this.store.cart.addProduct(product.id, quantity, choices));
  }

  setsQuantity(line: CartLine, quantity: number): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper sets ${line.name} to quantity ${quantity}`, () => this.store.cart.updateQuantity(line.id, quantity));
  }

  removes(line: CartLine): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper removes ${line.name} from the cart`, () => this.store.cart.deleteLine(line.id));
  }

  // Then (observations)

  async cart(): Promise<CartPage> {
    const reply = await this.store.cart.cartPage();
    expect(reply.status, 'GET /cart: HTTP status').toBe(200);
    return parseCartPage(reply.body);
  }

  /** The mini-cart counter (cart only). */
  async counters(): Promise<Counters> {
    return this.readCounters(['cart']);
  }

  /** The cart, wishlist and compare counters. */
  async allCounters(): Promise<Counters> {
    return this.readCounters(['cart', 'wishlist', 'compare']);
  }

  /** The single line of a cart the test knows holds exactly one: also proves the cart page parser sees a line. */
  async onlyLine(): Promise<CartLine> {
    const cart = await this.cart();
    expect(cart.lines, `the cart page shows exactly one line (got: ${cart.describe()})`).toHaveLength(1);
    return cart.lines[0];
  }

  // Housekeeping (fixture teardown)

  /** Deletes every line the cart still holds. Throws when the cart cannot be read; the fixture turns that into an annotation. */
  async emptiesCart(): Promise<void> {
    const cart = await this.cart();
    for (const line of cart.lines) await this.store.cart.deleteLine(line.id);
  }

  private async readCounters(kinds: Parameters<StoreApi['cart']['counters']>[0]): Promise<Counters> {
    const reply = await this.store.cart.counters(kinds);
    expect(reply.status, 'cartsummary: HTTP status').toBe(200);
    return reply.body;
  }
}
