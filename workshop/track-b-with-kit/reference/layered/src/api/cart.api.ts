import type { HttpClient, Reply } from './http-client';
import type { CartActionBody, CounterKind, Counters } from './types';

/** One method per cart endpoint. No assertions, no business wording: that belongs to the Shopper. */
export class CartApi {
  constructor(private readonly http: HttpClient) {}

  /** cartTypeId 1 = shopping cart. `choices` are the browser's variant fields (pvari...), by form field name. */
  addProduct(productId: number, quantity: number, choices: Record<string, string | number> = {}): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/cart/addproduct/${productId}/1`, { ...choices, [`addtocart_${productId}.EnteredQuantity`]: quantity });
  }

  /** `newQuantity` is the ABSOLUTE quantity of the line, not a delta. */
  updateQuantity(lineId: number, newQuantity: number): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/shoppingcart/updatecartitem?sciItemId=${lineId}&isCartPage=True`, {
      newQuantity,
      isCartPage: 'true',
      isWishlist: 'false',
    });
  }

  deleteLine(lineId: number): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/shoppingcart/deletecartitem?cartItemId=${lineId}`);
  }

  counters(kinds: readonly CounterKind[] = ['cart']): Promise<Reply<Counters>> {
    return this.http.postJson(`/shoppingcart/cartsummary?${kinds.map((kind) => `${kind}=True`).join('&')}`);
  }

  cartPage(): Promise<Reply<string>> {
    return this.http.get('/cart');
  }
}
