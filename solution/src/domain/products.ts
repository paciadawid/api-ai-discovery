export interface Product {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly unitPrice: string;
}

/** Catalogue entries the suites rely on. Names and prices are as the storefront renders them. */
export const products = {
  supremeGolfball: { id: 8, name: 'Supreme Golfball', slug: 'supreme-golfball', unitPrice: '$1.90' },
  transoceanChronograph: { id: 1, name: 'TRANSOCEAN CHRONOGRAPH', slug: 'transocean-chronograph', unitPrice: '$24,110.00' },
} as const satisfies Record<string, Product>;
