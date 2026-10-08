# Coverage: cart (Bearstore / SmartStore), stage 4

Input: `qa/03-selected.md` (5 selected of 58). Written by the test writer. Run result: `npm run verify` green, `npx playwright test` 5 passed, 0 failed (2 workers, no retries). Sabotage (stage 6) not run yet.

## Automated use cases

| UC ID | Gate | Spec file | Test title | Project | Status | Sabotage |
|---|---|---|---|---|---|---|
| UC-CART-01 | yes | `tests/cart/isolation.api.spec.ts` | UC-CART-01: two guests never see each other's cart and one cannot remove the other's line | gate | pass | not run (stage 6) |
| UC-CART-02 | yes | `tests/cart/adding.api.spec.ts` | UC-CART-02: adding three units from the product page puts one line of quantity 3 in the cart | cart | pass | not run (stage 6) |
| UC-CART-03 | yes | `tests/cart/adding.api.spec.ts` | UC-CART-03: adding the same product again merges into the same line instead of creating a second one | cart | pass | not run (stage 6) |
| UC-CART-21 | yes | `tests/cart/changing-quantity.api.spec.ts` | UC-CART-21: setting a line to quantity 3 updates the line, the subtotal and the counter together | cart | pass | not run (stage 6) |
| UC-CART-29 | yes | `tests/cart/removing.api.spec.ts` | UC-CART-29: removing one of three lines removes only that line and updates the subtotal and the counters | cart | pass | not run (stage 6) |

Notes
- Projects: `gate` (UC-CART-01) and `cart` (`dependencies: ['gate']`). Every spec is matched by exactly one project. No known-issue project: no `@known-issue` case selected.
- Every test gets its own guest actor from a fixture (own request context and cookie jar, unique User-Agent, own cart emptied in the fixture's `finally`). UC-CART-01 uses two actors.
- Expected values come from the input: unit prices are constants in `src/domain/products.ts`; subtotal and counter are computed with `subtotalOf` / `unitsIn`. The delete reply `cartItemCount` (lines) and the counter `CartItemsCount` (units, always `cart=True`) are each asserted by their own meaning in UC-CART-29.
- UC-CART-01 positive controls: the first guest's counter is 2 (so the second guest's 0 means "separate", not "blind"); the same delete call succeeds on the second guest's own line.
- Quantities 0, negative or malformed are never sent (known HTTP 500/502 behaviours).

## Use cases not automated yet

| UC IDs | Reason |
|---|---|
| UC-CART-04 .. 17 | Deferred by user decision (limit to 5): cart-add validation, limits, quick add, gift cards, response shapes |
| UC-CART-18 .. 20 | Deferred by user decision (limit to 5): cart-view (empty cart, counter semantics, mini-cart) |
| UC-CART-22 .. 28 | Deferred by user decision (limit to 5): cart-quantity (multi-line update, limits, trimming, foreign or unknown line); 26 and 27 are `@known-issue` candidates |
| UC-CART-30 .. 36 | Deferred by user decision (limit to 5): cart-remove (last line, twice, refused ids, GET); 35 is a `@known-issue` candidate |
| UC-CART-37 .. 58 | Deferred by user decision (limit to 5): codes, totals and shipping, currency |
