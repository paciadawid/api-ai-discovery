import type { APIRequestContext } from '@playwright/test';
import { CartApi } from './cart.api';
import { HttpClient, type Reply } from './http-client';

/** Everything one guest can call. One instance = one cookie jar = one cart. */
export class StoreApi {
  readonly cart: CartApi;
  private readonly http: HttpClient;

  constructor(context: APIRequestContext) {
    this.http = new HttpClient(context);
    this.cart = new CartApi(this.http);
  }

  /** The first page a guest opens: the response hands out the guest cookie that identifies the cart. */
  productPage(slug: string): Promise<Reply<string>> {
    return this.http.get(`/${slug}`);
  }
}
