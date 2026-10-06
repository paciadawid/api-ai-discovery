# Coverage (Wave 1, 10 tests per Gate 2 decisions in qa/03-selected.md)

Status values: planned, written, passing, failing.

Migrated to the layered framework (`src/`, `tests/<area>/<capability>.api.spec.ts`); 21 tests, all passing. `tests/support/` no longer exists. UC-CART-96 is now two tests (different User-Agent = the gate; same User-Agent = the OQ-01 probe), UC-AUTH-22 and UC-CATALOG-03 run one test per page/category. UC-CART-01 now uses the Supreme Golfball (product 8) instead of product 32.

| UC ID | Title | Test file | Test title | Endpoints | Status |
|---|---|---|---|---|---|
| UC-CART-96 | Visitor isolation probe for cookieless requests with the same User-Agent | tests/cart/visitor-isolation.api.spec.ts | UC-CART-96: visitors with different User-Agents never share a cart; UC-CART-96: visitors with the same User-Agent are probed for a shared cart (OQ-01) | EP-CART-ADD-CART, EP-CART-SUMMARY | passing |
| UC-CART-01 | Add a simple product to the cart | tests/cart/adding-a-product.api.spec.ts | UC-CART-01: a simple product added to the cart appears as a single line of quantity one | EP-CART-ADD-CART, EP-CART-SUMMARY, EP-CART-VIEW | passing |
| UC-AUTH-22 | Anonymous access to account pages redirects to login | tests/auth/account-pages-access.api.spec.ts | UC-AUTH-22: opening <page> sends them to the login page and back afterwards (6 tests) | EP-AUTH-INFO-GET, EP-AUTH-ADDRESSES, EP-AUTH-ORDERS, EP-AUTH-ACCOUNT-MISC | passing |
| UC-AUTH-02 | Valid login redirects to returnUrl and sets the AUTH cookie | tests/auth/signing-in.api.spec.ts | UC-AUTH-02: signing in with valid credentials lands on the requested page with a protected session cookie @needs-account | EP-AUTH-LOGIN, EP-AUTH-INFO-GET | passing |
| UC-AUTH-07 | Unknown user gets the same message as a wrong password | tests/auth/signing-in.api.spec.ts | UC-AUTH-07: an unknown user and a wrong password are refused with the same message @needs-account | EP-AUTH-LOGIN | passing |
| UC-CATALOG-01 | Home page renders product tiles | tests/catalog/browsing.api.spec.ts | UC-CATALOG-01: the home page greets them with product tiles and a visit cookie | EP-CATALOG-HOME | passing |
| UC-CATALOG-03 | Top-level category pages respond 200 with a category title | tests/catalog/browsing.api.spec.ts | UC-CATALOG-03: the <category> category lists products under its own title (6 tests) | EP-CATALOG-CATEGORY | passing |
| UC-SEARCH-01 | Search returns hits for a known term | tests/search/searching.api.spec.ts | UC-SEARCH-01: a known term returns a result page with hits linking to products | EP-SEARCH-PAGE | passing |
| UC-SEARCH-32 | Query text is HTML-encoded in the result page | tests/search/searching.api.spec.ts | UC-SEARCH-32: markup typed into the search box is shown encoded, never executed | EP-SEARCH-PAGE | passing |
| UC-CONTENT-16 | Contact form with all fields empty | tests/content/contact-form.api.spec.ts | UC-CONTENT-16: sending it with every field empty is refused and names the required fields | EP-CONTENT-CONTACT-SEND | passing |
