import { expect, test } from '@playwright/test';
import type { Reply } from '@/api/http-client';
import type { StoreApi } from '@/api/store-api';
import type { CartActionBody, Counters } from '@/api/types';
import { Cart, parseCart, parseWishlist, type LineItem, type Wishlist } from '@/domain/line-items';
import type { Product } from '@/domain/products';
import { parseProductPage, type ProductPage } from '@/domain/product-page';

export interface MiniCart {
  readonly status: number;
  readonly contentType: string;
  readonly listsLines: boolean;
}

/**
 * A visitor of the store, described in business terms.
 *
 * - `has...` methods set the scene (Given). They fail the test loudly if the store refuses.
 * - verbs in the third person (`adds...`, `changes...`, `removes...`) perform the behaviour under test (When)
 *   and return the store's reply for the test to judge.
 * - `cart()`, `wishlist()`, `counters()`, `miniCart()` observe the outcome (Then).
 * Each public method is a report step, so the HTML report reads like the scenario.
 */
export class Shopper {
  constructor(private readonly store: StoreApi) {}

  // Given

  async hasInCart(product: Product, quantity = 1): Promise<void> {
    await test.step(`Given the shopper has ${quantity} x ${product.name} in the cart`, async () => {
      const reply = await this.store.cart.add(product.id, quantity);
      expect(reply.body.success, `setup: adding ${product.name} was refused: ${reply.body.message}`).toBe(true);
    });
  }

  // When

  addsToCart(product: Product, quantity = 1): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper adds ${quantity} x ${product.name} to the cart`, () => this.store.cart.add(product.id, quantity));
  }

  changesQuantity(line: LineItem, quantity: number): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper sets ${line.productName} to quantity ${quantity}`, () => this.store.cart.updateQuantity(line.id, quantity));
  }

  changesQuantityOfLineWithId(lineId: string, quantity: number): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper sets line ${lineId} to quantity ${quantity}`, () => this.store.cart.updateQuantity(lineId, quantity));
  }

  removes(line: LineItem): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper removes ${line.productName} from the cart`, () => this.store.cart.remove(line.id));
  }

  removesLineWithId(lineId: string): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper removes line ${lineId}`, () => this.store.cart.remove(lineId));
  }

  movesToWishlist(line: LineItem): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper moves ${line.productName} to the wishlist`, () => this.store.cart.move(line.id, 'ShoppingCart'));
  }

  movesBackToCart(line: LineItem): Promise<Reply<CartActionBody>> {
    return test.step(`When the shopper moves ${line.productName} from the wishlist back to the cart`, () => this.store.cart.move(line.id, 'Wishlist'));
  }

  removesLineWithIdUsingGet(lineId: string): Promise<Reply<string>> {
    return test.step(`When the shopper calls the remove endpoint for line ${lineId} with GET`, () => this.store.cart.removeUsingGet(lineId));
  }

  viewsProductPage(product: Product): Promise<ProductPage> {
    return test.step(`When the shopper opens the ${product.name} page`, async () => {
      const reply = await this.store.catalog.productPage(product.slug);
      return parseProductPage(reply.status, reply.body);
    });
  }

  // Then (observations)

  async cart(): Promise<Cart> {
    const reply = await this.store.cart.page();
    expect(reply.status, 'cart page status').toBe(200);
    return parseCart(reply.body);
  }

  async wishlist(): Promise<Wishlist> {
    const reply = await this.store.wishlist.page();
    expect(reply.status, 'wishlist page status').toBe(200);
    return parseWishlist(reply.body);
  }

  async counters(): Promise<Counters> {
    const reply = await this.store.cart.counters();
    expect(reply.status, 'cartsummary status').toBe(200);
    return reply.body;
  }

  async miniCart(): Promise<MiniCart> {
    const reply = await this.store.cart.miniCart();
    return { status: reply.status, contentType: reply.contentType, listsLines: reply.body.includes('data-sci-id') };
  }

  /** The line of a product the test already knows is in the cart. */
  async lineOf(product: Product): Promise<LineItem> {
    const line = (await this.cart()).lineFor(product);
    expect(line, `expected ${product.name} to be in the cart`).toBeDefined();
    return line!;
  }

  async wishlistLineOf(product: Product): Promise<LineItem> {
    const line = (await this.wishlist()).lineFor(product);
    expect(line, `expected ${product.name} to be on the wishlist`).toBeDefined();
    return line!;
  }

  // Housekeeping (fixture teardown; never fails a test)

  async emptiesEverything(): Promise<void> {
    try {
      for (const line of (await this.cart()).items) await this.store.cart.remove(line.id);
      for (const line of (await this.wishlist()).items) await this.store.cart.remove(line.id, 'wishlist');
    } catch {
      // The context is private and throwaway; a failed cleanup must not mask the test result.
    }
  }
}
