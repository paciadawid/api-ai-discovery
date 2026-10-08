import type { CartEntry, Product } from './products';

/** "$1,234.50 excl tax" -> 123450. Loud on anything else: a blind parser must not return 0. */
export function parseMoney(text: string): number {
  const found = /\$\s*([0-9][0-9,]*)\.([0-9]{2})/.exec(text);
  if (!found) throw new Error(`not a money amount: "${text}"`);
  return Number(found[1].replaceAll(',', '')) * 100 + Number(found[2]);
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const lineTotalCents = (product: Product, quantity: number): number => product.unitPriceCents * quantity;

export const subtotalOf = (entries: CartEntry[]): number =>
  entries.reduce((sum, e) => sum + lineTotalCents(e.product, e.quantity), 0);

/** Sum of quantities: what the header counter (CartItemsCount) means. */
export const unitsIn = (entries: CartEntry[]): number => entries.reduce((sum, e) => sum + e.quantity, 0);
