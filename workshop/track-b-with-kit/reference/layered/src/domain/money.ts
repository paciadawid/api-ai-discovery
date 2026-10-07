import type { Product } from './products';

/** The price the storefront shows for `quantity` units of a product, e.g. priced(BEETHOVEN, 3) === '$5.67'. */
export function priced(product: Pick<Product, 'unitPrice'>, quantity: number): string {
  const cents = Math.round(Number(product.unitPrice.replace(/[$,]/g, '')) * 100) * quantity;
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** First "$1,234.56" amount inside a text such as "$5.67 excl tax"; undefined when there is none. */
export function amountIn(text: string | undefined): string | undefined {
  return /\$[\d,]+\.\d{2}/.exec(text ?? '')?.[0];
}
