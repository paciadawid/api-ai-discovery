# Coverage - cart manipulation (workshop run cartws)

Files: `tests/cartws/{adding-to-cart,changing-quantity,removing-from-cart,wishlist}.api.spec.ts` (framework layers in `src/`, see `.claude/skills/api-test-framework/SKILL.md`). Run: `npx playwright test tests/cartws` - 12 tests (7 use cases; UC-08 runs for 0 and -1, UC-11 is split into 5 tests), 0 failed.

| UC ID | Spec | Behaviour under test | Status |
|---|---|---|---|
| UC-CARTWS-01 | adding-to-cart | a first product lands in the cart as one line at its unit price | passed |
| UC-CARTWS-02 | adding-to-cart | adding the same product again grows the existing line | passed |
| UC-CARTWS-04 | changing-quantity | raising the quantity reprices the same line and the totals | passed |
| UC-CARTWS-08 | changing-quantity | quantity 0 / -1 removes the line but answers 500 (`@known-issue` KI-1) | passed (2 tests) |
| UC-CARTWS-10 | removing-from-cart | removing lines one by one until the cart is empty | passed |
| UC-CARTWS-11 | removing-from-cart | unknown / foreign / repeated line id refused; foreign update 500 (`@known-issue` KI-3); GET 404 | passed (5 tests) |
| UC-CARTWS-12 | wishlist | move to the wishlist and back under new line ids | passed (added after the Postbot review) |

Not automated (not selected): UC-CARTWS-03, 05, 06, 07, 09.

## Adopted from the Postbot collection (`exports/workshop/postman/updated/`)
- UC-CARTWS-01: add response is JSON, has no `error` property and keeps `SMARTSTORE.VISITOR`; `cartsummary` returns all three counters (cart 1, wishlist 0, compare 0); the mini-cart lists the new line and is `text/html`.
- UC-CARTWS-04: the update response carries no `error` property.
- UC-CARTWS-12 (new, was the LOW bonus): product page has `pd-form` and a price, the product id comes from the `data-href` add link, then the wishlist round trip with new line ids and counter checks.

Not adopted, because they contradict verified behaviour or are too weak to catch a regression: the `AddToCart.EnteredQuantity` field name (the server ignores it and adds 1; the real field is `addtocart_<id>.EnteredQuantity`), `sciItemId=` as the line-id source (the cart page exposes `itemquantity<id>` / `cartItemId=`), the "cart-empty" / "empty-cart" markup checks (the empty text appears even for non-empty carts), the "response contains Total" substring check, and the `sendRequest` chains that share one `cartItemId` variable across requests (order dependent; the Playwright tests give each test its own guest cart).
