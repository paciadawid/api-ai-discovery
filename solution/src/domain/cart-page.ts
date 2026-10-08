import { parseMoney } from './pricing';
import type { Product } from './products';

export type CartLine = { id: number; name: string; quantity: number; unitPriceCents: number; lineTotalCents: number };
export type CartPage = { lines: CartLine[]; subtotalCents: number | null };

// Cart page (EP-CART-VIEW): one row per line. The remove link carries the line id and the product name; the
// quantity input is id="itemquantity<lineId>"; the first two <span class="price"> of a row are unit price and line total.
const REMOVE_LINK = /data-href='\/shoppingcart\/deletecartitem\?cartItemId=(\d+)'\s+data-name="([^"]*)"/g;
const QUANTITY_INPUT = /id="itemquantity(\d+)"[^>]*?value="(\d+)"/;
const PRICE = /<span class="price">([^<]*)<\/span>/g;
const SUBTOTAL = /cart-summary-subtotal">\s*<td[^>]*>[^<]*<\/td>\s*<td class="cart-summary-value">([^<]*)<\/td>/;
// Body rows only: the header row ("Product(s)", "Price", ...) has no <div class="row sm-gutters"> inside its main column.
const ROW = /<div class="cart-row">\s*<div class="cart-col cart-col-main">\s*<div class="row sm-gutters">/g;

const decode = (s: string): string =>
  s.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');

export function parseCartPage(html: string): CartPage {
  const links = [...html.matchAll(REMOVE_LINK)];
  const lines = links.map((link, i): CartLine => {
    const id = Number(link[1]);
    const row = html.slice(link.index, links[i + 1]?.index ?? html.length);
    const quantity = QUANTITY_INPUT.exec(row);
    const prices = [...row.matchAll(PRICE)].slice(0, 2);
    if (!quantity || Number(quantity[1]) !== id || prices.length < 2) throw new Error(`cart row of line ${id} not understood`);
    return { id, name: decode(link[2]), quantity: Number(quantity[2]), unitPriceCents: parseMoney(prices[0][1]), lineTotalCents: parseMoney(prices[1][1]) };
  });
  const rows = [...html.matchAll(ROW)].length;
  if (rows !== lines.length) throw new Error(`cart page has ${rows} rows but the parser found ${lines.length} lines`);
  const subtotal = SUBTOTAL.exec(html);
  if (lines.length > 0 && !subtotal) throw new Error('cart page has lines but no subtotal row');
  return { lines, subtotalCents: subtotal ? parseMoney(subtotal[1]) : null };
}

/** The line of a product in a cart page (the product name is the only product marker the page shows). */
export function lineIn(cart: CartPage, product: Product): CartLine | undefined {
  return cart.lines.find((line) => line.name === product.name);
}
