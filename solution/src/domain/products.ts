export type Product = { id: number; name: string; unitPriceCents: number };

// Cheap products known from discovery. Unit prices are the INPUT of every computed expectation.
export const TITLEIST_SM6: Product = { id: 5, name: 'Titleist SM6 Tour Chrome', unitPriceCents: 16495 };
export const SEIKO_SRPA49K1: Product = { id: 3, name: 'Seiko Mechanical Automatic SRPA49K1', unitPriceCents: 26900 };
// Tier price: $29.95 up to quantity 5, $24.90 from 6. Tests keep this product at quantity 1 per line.
export const BASKETBALL: Product = { id: 14, name: 'High School Game Basketball', unitPriceCents: 2995 };

export type CartEntry = { product: Product; quantity: number };
