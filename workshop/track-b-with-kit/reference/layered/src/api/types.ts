/** JSON returned by the cart action endpoints. Every field is optional: failures return other shapes. */
export interface CartActionBody {
  success?: boolean;
  /** A list on add/update replies, a plain string on the removal reply. */
  message?: string | string[];
  redirect?: string;
  SubTotal?: string;
  cartItemCount?: number;
}

/** cartsummary JSON; only the counters asked for are guaranteed. */
export interface Counters {
  CartItemsCount?: number;
  WishlistItemsCount?: number;
  CompareItemsCount?: number;
}

export type CounterKind = 'cart' | 'wishlist' | 'compare';

export function messagesOf(body: CartActionBody): string[] {
  const message = body.message;
  return message === undefined ? [] : Array.isArray(message) ? message : [message];
}
