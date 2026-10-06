import type { HttpClient, Reply } from './http-client';
import type { CartActionBody, Counters } from './types';

/** One method per cart endpoint. No assertions, no business wording: that belongs to the Shopper. */
export class CartApi {
  constructor(private readonly http: HttpClient) {}

  add(productId: number, quantity: number): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/cart/addproduct/${productId}/1`, { [`addtocart_${productId}.EnteredQuantity`]: String(quantity) });
  }

  page(): Promise<Reply<string>> {
    return this.http.get('/cart');
  }

  miniCart(): Promise<Reply<string>> {
    return this.http.postHtml('/shoppingcart/offcanvasshoppingcart');
  }

  counters(): Promise<Reply<Counters>> {
    return this.http.postJson('/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True');
  }

  updateQuantity(lineId: string, quantity: number): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/shoppingcart/updatecartitem?sciItemId=${lineId}&isCartPage=True`, {
      newQuantity: String(quantity),
      isCartPage: 'true',
      isWishlist: 'false',
    });
  }

  remove(lineId: string, from: 'cart' | 'wishlist' = 'cart'): Promise<Reply<CartActionBody>> {
    const wishlistFlag = from === 'wishlist' ? '&wishlistItem=True' : '';
    return this.http.postJson(`/shoppingcart/deletecartitem?cartItemId=${lineId}${wishlistFlag}`);
  }

  removeUsingGet(lineId: string): Promise<Reply<string>> {
    return this.http.get(`/shoppingcart/deletecartitem?cartItemId=${lineId}`);
  }

  move(lineId: string, from: 'ShoppingCart' | 'Wishlist'): Promise<Reply<CartActionBody>> {
    return this.http.postJson(`/shoppingcart/moveitembetweencartandwishlist?cartItemId=${lineId}&cartType=${from}&isCartPage=True`);
  }
}
