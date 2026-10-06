/** JSON returned by the cart endpoints. Every field is optional: failures return different shapes (success:false, or a 500 error body). */
export interface CartActionBody {
  success?: boolean;
  message?: string;
  wasMoved?: boolean;
  redirect?: string;
  cartItemCount?: number;
  SubTotal?: string;
  newItemPrice?: string;
  cartHtml?: string;
  error?: boolean;
  controller?: string;
  action?: string;
}

export interface Counters {
  CartItemsCount: number;
  WishlistItemsCount: number;
  CompareItemsCount: number;
}
