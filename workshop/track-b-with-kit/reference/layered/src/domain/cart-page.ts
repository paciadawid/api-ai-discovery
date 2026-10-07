import { amountIn } from './money';
import type { Product } from './products';
import { serverMessages } from './server-messages';

export interface CartLine {
  /** sciItemId / cartItemId, read from the itemquantity<id> input. */
  readonly id: number;
  readonly quantity: number;
  readonly name: string;
  /** Visible text of the product cell: name, description, chosen attributes ("Size: 42"). */
  readonly text: string;
  readonly unitPrice: string | undefined;
  readonly lineTotal: string | undefined;
}

/** What GET /cart shows: the lines, the Subtotal row and whether the page says the cart is empty. */
export class CartPage {
  constructor(
    readonly lines: readonly CartLine[],
    /** "$3.78" from the cart-summary-subtotal row. */
    readonly subtotal: string | undefined,
    /** The page says "Your Shopping Cart is empty!" as visible text (the data-empty-text attribute does not count). */
    readonly emptyPage: boolean,
    readonly hasQuantityInput: boolean,
  ) {}

  /** All three views agree: empty-cart text, no parsed line, no quantity input left in the HTML. */
  get isEmpty(): boolean {
    return this.emptyPage && this.lines.length === 0 && !this.hasQuantityInput;
  }

  lineFor(product: Pick<Product, 'name'>): CartLine | undefined {
    return this.lines.find((line) => line.name === product.name);
  }

  describe(): string {
    const lines = this.lines.length === 0 ? 'no lines' : this.lines.map((l) => `${l.quantity} x ${l.name} (${l.lineTotal}, line ${l.id})`).join('; ');
    return `${lines}; subtotal ${this.subtotal}; empty-cart text ${this.emptyPage ? 'shown' : 'not shown'}; quantity input ${this.hasQuantityInput ? 'present' : 'absent'}`;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** A row is only a line when it holds the quantity input. The input is found by its `id` (its `Name` attribute is capitalised). */
const QUANTITY_INPUT = /<input\b[^>]*\sid="itemquantity(\d+)"[^>]*>/;

export function parseCartPage(html: string): CartPage {
  const bodyStart = html.indexOf('class="cart-body"');
  const rows = bodyStart >= 0 ? html.slice(bodyStart).split('<div class="cart-row">').slice(1) : [];

  const lines: CartLine[] = [];
  for (const row of rows) {
    const input = QUANTITY_INPUT.exec(row);
    if (!input) continue;
    const priceColumn = row.indexOf('cart-col-price');
    const productCell = priceColumn >= 0 ? row.slice(0, row.lastIndexOf('<', priceColumn)) : row;
    lines.push({
      id: Number(input[1]),
      quantity: Number(/\svalue="([^"]*)"/.exec(input[0])?.[1]),
      name: stripTags(/class="cart-item-link"[^>]*>([^<]*)</.exec(row)?.[1] ?? ''),
      text: stripTags(productCell),
      unitPrice: amountIn(/data-caption="Price">\s*<span class="price">([^<]*)</.exec(row)?.[1]),
      lineTotal: amountIn(/data-caption="Total">\s*<span class="price">([^<]*)</.exec(row)?.[1]),
    });
  }

  const subtotalRow = /<tr class="cart-summary-subtotal">([\s\S]*?)<\/tr>/.exec(html)?.[1];
  // The empty-cart text also sits in a data-empty-text attribute on every page: only visible text counts.
  const visibleHtml = html.replace(/data-empty-text="[^"]*"/g, '');
  return new CartPage(
    lines,
    amountIn(subtotalRow ? stripTags(subtotalRow) : undefined),
    visibleHtml.includes(serverMessages.cartEmpty),
    /itemquantity\d+/.test(html),
  );
}
