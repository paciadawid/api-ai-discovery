import { test as base, type APIRequestContext } from '@playwright/test';
import { FavoritesApi } from '../api/favorites.api';
import { ProductsApi } from '../api/products.api';
import { UsersApi } from '../api/users.api';
import { credentials } from '../config/env';

export type Toolshop = { users: UsersApi; products: ProductsApi; favorites: FavoritesApi };

/** Remember what a test created so the fixture can remove it afterwards. */
class OwnedFavorites extends FavoritesApi {
  readonly created: string[] = [];
  override async add(productId: string) {
    const res = await super.add(productId);
    if (res.status === 201) this.created.push(res.body.id);
    return res;
  }
}

/** Teardown must check its own result: a cleanup that fails silently leaks data forever. 404 = the test removed it already. */
async function removeAll(what: string, ids: string[], remove: (id: string) => Promise<{ status: number }>) {
  const left: string[] = [];
  for (const id of ids) {
    const { status } = await remove(id);
    if (![204, 404].includes(status)) left.push(`${id} (HTTP ${status})`);
  }
  if (left.length) throw new Error(`cleanup: ${what} left on the host: ${left.join(', ')}`);
}

function client(http: APIRequestContext, token?: string) {
  const favorites = new OwnedFavorites(http, token);
  const toolshop: Toolshop = { users: new UsersApi(http, token), products: new ProductsApi(http), favorites };
  return { toolshop, favorites };
}

type Account = { email: string; password: string };
type TestFixtures = {
  account: Account;
  /** No token: catalog lookups and negative auth checks. */
  guest: Toolshop;
  /** Logged in as this worker's own user, with a fresh token (tokens live 300 s). Cleans up after itself. */
  shopper: Toolshop;
};

export const test = base.extend<TestFixtures>({
  /** Your own user from .env. Fails loudly, with a hint, when it is missing. */
  account: async ({}, use) => {
    await use(credentials());
  },

  guest: async ({ request }, use) => {
    const { toolshop } = client(request);
    await use(toolshop);
  },

  shopper: async ({ request, account }, use) => {
    const login = await new UsersApi(request).login(account.email, account.password);
    if (login.status !== 200) {
      throw new Error(`precondition: login of the shopper failed: HTTP ${login.status}${login.status === 423 ? " (account locked: register a new user with a new nick)" : ""}`);
    }
    const { toolshop, favorites } = client(request, login.body.access_token);
    await use(toolshop);

    // Teardown runs even when the test failed. Remove only what this test created; a 404 means the test did it already.
    await removeAll('favorites', favorites.created, (id) => favorites.remove(id));
    await toolshop.users.logout(); // 401 if the test logged out already; harmless
  },
});

export { expect } from '@playwright/test';
