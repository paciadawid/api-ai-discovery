import type { ProductsApi } from '../api/products.api';
import type { Product } from './types';

/**
 * Product ids are ULIDs minted when the public database is reseeded, so never hard-code them.
 * Names are stable seed data; look the product up by exact name on every run.
 */
export async function productNamed(products: ProductsApi, name: string): Promise<Product> {
  const res = await products.search(name);
  const product = res.body?.data?.find((p) => p.name === name);
  if (res.status !== 200 || !product) {
    throw new Error(`precondition: product "${name}" not found in the catalog (HTTP ${res.status})`);
  }
  return product;
}
