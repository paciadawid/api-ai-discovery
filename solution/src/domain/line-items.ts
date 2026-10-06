import type { Product } from './products';

export interface LineItem {
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: string;
  readonly lineTotal: string;
}

/** The lines of a cart or wishlist page. Emptiness means "no quantity inputs": the page's "empty" text is always present. */
export class LineItems {
  constructor(readonly items: readonly LineItem[]) {}

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, line) => sum + line.quantity, 0);
  }

  lineFor(product: Product): LineItem | undefined {
    return this.items.find((line) => line.productName.toLowerCase() === product.name.toLowerCase());
  }

  describe(): string {
    return this.isEmpty ? 'no lines' : this.items.map((l) => `${l.quantity} x ${l.productName} (${l.lineTotal}, line ${l.id})`).join('; ');
  }
}

export class Cart extends LineItems {}
export class Wishlist extends LineItems {}

const ROW_START = '<a class="cart-item-link"';
const QUANTITY_INPUT = /<input\b[^>]*\bid="itemquantity(\d+)"[^>]*>/;
const PRICE = /class="price">\s*([^<]*?)\s*(?:excl tax|incl tax)?\s*</g;

/** Both pages render rows alike: name link, unit price, quantity input, line total. */
export function parseLineItems(html: string): LineItem[] {
  const items: LineItem[] = [];
  for (const row of html.split(ROW_START).slice(1)) {
    const input = QUANTITY_INPUT.exec(row);
    if (!input) continue;
    const productName = />([^<]+)<\/a>/.exec(row)?.[1].trim() ?? '';
    const quantity = Number(/\bvalue="(\d+)"/.exec(input[0])?.[1]);
    const prices = [...row.matchAll(PRICE)].map((m) => ({ text: m[1], at: m.index ?? 0 }));
    const unitPrice = prices.filter((p) => p.at < input.index).at(-1)?.text ?? '';
    const lineTotal = prices.find((p) => p.at > input.index)?.text ?? '';
    items.push({ id: input[1], productName, quantity, unitPrice, lineTotal });
  }
  return items;
}

export const parseCart = (html: string) => new Cart(parseLineItems(html));
export const parseWishlist = (html: string) => new Wishlist(parseLineItems(html));
