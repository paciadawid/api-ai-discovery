import type { Product } from './products';

/** The price the storefront shows for `quantity` units of a product, e.g. priced(golfball, 4) === '$7.60'. */
export function priced(product: Pick<Product, 'unitPrice'>, quantity: number): string {
  const cents = Math.round(Number(product.unitPrice.replace(/[$,]/g, '')) * 100) * quantity;
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
