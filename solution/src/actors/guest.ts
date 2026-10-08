import { test } from '@playwright/test';
import type { CartApi } from '@/api/cart.api';
import type { Reply } from '@/api/http-client';
import type { DeleteItemBody, UpdateItemBody, AddProductBody } from '@/api/types';
import { expect } from '@/matchers';
import { type CartLine, type CartPage, lineIn, parseCartPage } from '@/domain/cart-page';
import type { Product } from '@/domain/products';

/** An anonymous visitor with their own session and their own cart. */
export class Guest {
  constructor(private readonly api: CartApi) {}

  // Given

  async hasAnEmptyCart(): Promise<void> {
    await test.step('Given the guest has an empty cart', async () => {
      const count = await this.cartItemsCount();
      const cart = await this.cart();
      expect(count, 'the header counter (cart=True) starts at 0').toBe(0);
      expect(cart, 'the cart page starts with no lines').toHaveExactlyTheLines([]);
    });
  }

  /** Puts a product in a cart that does not hold it yet, then proves the line exists with exactly that quantity. */
  async hasInCart(product: Product, quantity: number): Promise<void> {
    await test.step(`Given the guest has ${quantity} x ${product.name} in the cart`, async () => {
      const reply = await this.api.addProduct(product.id, quantity);
      expect(reply, `setup: add ${quantity} x ${product.name}`).toBeAccepted();
      const line = lineIn(await this.cart(), product);
      expect(line?.quantity, `setup: the cart page shows ${quantity} x ${product.name}`).toBe(quantity);
    });
  }

  // When

  async adds(product: Product, quantity: number): Promise<Reply<AddProductBody>> {
    return test.step(`When the guest adds ${quantity} x ${product.name} from the product page`, () => this.api.addProduct(product.id, quantity));
  }

  async setsQuantity(line: CartLine, quantity: number): Promise<Reply<UpdateItemBody>> {
    return test.step(`When the guest sets ${line.name} to quantity ${quantity}`, () => this.api.updateItem(line.id, quantity));
  }

  /** By raw line id, so a test can also try a line id that is not this guest's. */
  async removes(lineId: number): Promise<Reply<DeleteItemBody>> {
    return test.step(`When the guest removes cart line ${lineId}`, () => this.api.deleteItem(lineId));
  }

  // Then (observations)

  /** The cart page, parsed. */
  async cart(): Promise<CartPage> {
    return parseCartPage((await this.api.view()).body);
  }

  /** The header counter: the SUM of quantities (always asked with cart=True, else the server answers 0). */
  async cartItemsCount(): Promise<number> {
    return (await this.api.counters()).body.CartItemsCount;
  }

  /** The cart line of a product; fails loudly when the cart has none. */
  async lineOf(product: Product): Promise<CartLine> {
    const line = lineIn(await this.cart(), product);
    if (!line) throw new Error(`the cart has no line for ${product.name}`);
    return line;
  }

  // Cleanup (called by the fixture)

  /** Removes every line. The fixture then proves the cart is empty (see `withCleanup`), so a teardown that does nothing cannot pass unnoticed. */
  async emptiesCart(): Promise<void> {
    for (const line of (await this.cart()).lines) await this.api.deleteItem(line.id);
  }
}
