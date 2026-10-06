import type { APIRequestContext } from '@playwright/test';
import { AccountApi } from './account.api';
import { CartApi } from './cart.api';
import { CatalogApi } from './catalog.api';
import { ContentApi } from './content.api';
import { HttpClient } from './http-client';
import { SearchApi } from './search.api';
import { WishlistApi } from './wishlist.api';

/** Everything one visitor can call. One instance = one cookie jar = one cart. */
export class StoreApi {
  readonly account: AccountApi;
  readonly cart: CartApi;
  readonly catalog: CatalogApi;
  readonly content: ContentApi;
  readonly search: SearchApi;
  readonly wishlist: WishlistApi;

  constructor(context: APIRequestContext) {
    const http = new HttpClient(context);
    this.account = new AccountApi(http);
    this.cart = new CartApi(http);
    this.catalog = new CatalogApi(http);
    this.content = new ContentApi(http);
    this.search = new SearchApi(http);
    this.wishlist = new WishlistApi(http);
  }
}
