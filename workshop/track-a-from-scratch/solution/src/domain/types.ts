// Shapes as observed live (2026-11-01), not as the spec claims. See ../../../gaps-answer-key.md.
export type Token = { access_token: string; token_type: string; expires_in: number };

export type User = { id: string; email: string; first_name: string; last_name: string };

/** Laravel pagination wrapper used by every list endpoint. */
export type Page<T> = { current_page: number; data: T[]; per_page: number; last_page: number; total: number };

export type Brand = { id: string; name: string; slug: string };

export type Product = {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  brand: { id: string; name: string };
  category: { id: string; name: string };
};

export type CartLine = { id: string; product_id: string; quantity: number; product: Product };

// The spec documents only { id }; the live reply also carries the lines. There is no total field.
export type Cart = { id: string; cart_items: CartLine[] };

export type Favorite = { id: string; user_id: string; product_id: string; product?: Product };

/** Laravel validation reply on carts: { message, errors: { field: [text] } }. */
export type ValidationError = { message: string; errors: Record<string, string[]> };
