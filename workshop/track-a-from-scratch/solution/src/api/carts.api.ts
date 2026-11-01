import { Api, reply } from './reply';
import type { Cart } from '../domain/types';

/** Carts need no token: anyone holding the cart id can use it. */
export class CartsApi extends Api {
  create() {
    return this.http.post('/carts').then((r) => reply<{ id: string }>(r));
  }

  get(cartId: string) {
    return this.http.get(`/carts/${cartId}`).then((r) => reply<Cart>(r));
  }

  add(cartId: string, productId: string, quantity: number) {
    return this.http
      .post(`/carts/${cartId}`, { data: { product_id: productId, quantity } })
      .then((r) => reply<{ result: string }>(r));
  }

  setQuantity(cartId: string, productId: string, quantity: number) {
    return this.http
      .put(`/carts/${cartId}/product/quantity`, { data: { product_id: productId, quantity } })
      .then((r) => reply<{ result: string }>(r));
  }

  removeProduct(cartId: string, productId: string) {
    return this.http.delete(`/carts/${cartId}/product/${productId}`).then((r) => reply<void>(r));
  }

  delete(cartId: string) {
    return this.http.delete(`/carts/${cartId}`).then((r) => reply<void>(r));
  }
}
