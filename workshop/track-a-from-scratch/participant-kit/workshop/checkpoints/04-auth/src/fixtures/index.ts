import { test as base } from '@playwright/test';
import { ProductsApi } from '../api/products.api';
import { UsersApi } from '../api/users.api';
import { credentials } from '../config/env';

export type Toolshop = { users: UsersApi; products: ProductsApi };

type Account = { email: string; password: string };
type TestFixtures = {
  account: Account;
  /** No token: catalog lookups and negative auth checks. */
  guest: Toolshop;
  /** Logged in as your own user, with a fresh token (tokens live about 300 s). */
  shopper: Toolshop;
};

export const test = base.extend<TestFixtures>({
  /** Your own user from .env. Fails loudly, with a hint, when it is missing. */
  account: async ({}, use) => {
    await use(credentials());
  },

  guest: async ({ request }, use) => {
    await use({ users: new UsersApi(request), products: new ProductsApi(request) });
  },

  shopper: async ({ request, account }, use) => {
    const login = await new UsersApi(request).login(account.email, account.password);
    if (login.status !== 200) {
      throw new Error(`precondition: login of the shopper failed: HTTP ${login.status}${login.status === 423 ? " (account locked: register a new user with a new nick)" : ""}`);
    }
    const users = new UsersApi(request, login.body.access_token);
    await use({ users, products: new ProductsApi(request) });
    await users.logout(); // 401 if the test logged out already; harmless
  },
});

export { expect } from '@playwright/test';
