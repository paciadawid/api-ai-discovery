import type { HttpClient, Reply } from './http-client';
import type { AddProductBody, CartCounters, DeleteItemBody, UpdateItemBody } from './types';

const CART_TYPE_SHOPPING_CART = 1;

export class CartApi {
  constructor(private readonly http: HttpClient) {}

  /** EP-CART-ADD-PRODUCT: add from the product page. Field name is addtocart_<id>.EnteredQuantity. */
  addProduct(productId: number, quantity: number): Promise<Reply<AddProductBody>> {
    return this.http.postForm(`/cart/addproduct/${productId}/${CART_TYPE_SHOPPING_CART}`, {
      [`addtocart_${productId}.EnteredQuantity`]: quantity,
    });
  }

  /** EP-CART-SUMMARY: header counters. Without cart=True the cart counter is always 0. */
  counters(): Promise<Reply<CartCounters>> {
    return this.http.postEmpty('/shoppingcart/cartsummary?cart=True');
  }

  /** EP-CART-VIEW: the cart page (HTML). */
  view(): Promise<Reply<string>> {
    return this.http.get('/cart');
  }

  /** EP-CART-UPDATE-ITEM: sciItemId in the query, newQuantity in a form body. */
  updateItem(lineId: number, newQuantity: number): Promise<Reply<UpdateItemBody>> {
    return this.http.postForm(`/shoppingcart/updatecartitem?sciItemId=${lineId}&isCartPage=True`, {
      newQuantity,
      isCartPage: true,
      isWishlist: false,
    });
  }

  /** EP-CART-REMOVE: cartItemId in the query, empty body. */
  deleteItem(lineId: number): Promise<Reply<DeleteItemBody>> {
    return this.http.postEmpty(`/shoppingcart/deletecartitem?cartItemId=${lineId}`);
  }
}
