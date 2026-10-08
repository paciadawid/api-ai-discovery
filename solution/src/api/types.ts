// JSON bodies of the cart endpoints (only the fields the tests read). Every body also has a `$type` field: never compare whole bodies.
export type AddProductBody = { success: boolean; message?: string[] | string };

export type CartCounters = { CartItemsCount: number; WishlistItemsCount: number; CompareItemsCount: number };

export type UpdateItemBody = {
  success: boolean;
  SubTotal: string; // whole-cart subtotal, e.g. "$494.85 excl tax"
  newItemPrice: string; // UNIT price of the changed line
  message: string[];
};

export type DeleteItemBody = {
  success: boolean;
  message: string;
  cartItemCount?: number; // number of LINES left (absent on a refusal), not the sum of quantities
};
