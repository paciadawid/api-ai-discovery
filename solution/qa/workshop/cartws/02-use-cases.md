# Use cases - cart manipulation (workshop run cartws)

Base URL: https://bearstore-testsite.smartbear.com. Input: `qa/workshop/cartws/01-discovery/` only. API level, anonymous guest cart, no credentials, no orders.

## Overview

### Matrix (area x type)
| Area | happy-path (HP) | negative (VN) | boundary (BD) | state (SP) | Total |
|---|---|---|---|---|---|
| cart | 3 (UC-CARTWS-01, 03, 04) | 3 (UC-CARTWS-07, 09, 11) | 3 (UC-CARTWS-05, 06, 08) | 3 (UC-CARTWS-02, 10, 12) | 12 |

Security and contract are not used as primary types. The ownership check (foreign line id) is covered inside UC-CARTWS-11 as a negative step. Cookie flags are not asserted: discovery recorded flags only for `SMARTSTORE.VISITOR` (HttpOnly, secure, 1 year), and no workshop UC depends on them.

Priority: P1 = in the first selection (max 6 tests), P2 = next, LOW = bonus. Known-issue tag = current buggy behaviour is pinned and the side effect asserted (user decision 2).

| UC | Title | Type | Priority | Known issue |
|---|---|---|---|---|
| UC-CARTWS-01 | Add one product to an empty guest cart | HP | P1 | no |
| UC-CARTWS-02 | Repeat adds accumulate on one line | SP | P1 | no |
| UC-CARTWS-03 | Two lines: mini-cart, header counter and totals agree | HP | P2 | no |
| UC-CARTWS-04 | Change a line quantity and see recalculated totals | HP | P1 | no |
| UC-CARTWS-05 | Update at the stock boundary (8563 ok, 8564 rejected) | BD | P1 | no |
| UC-CARTWS-06 | Update above the site-wide maximum (10000 / 10001) | BD | P2 | no |
| UC-CARTWS-07 | Add rejects invalid quantity, unknown product and unsupported cartType | VN | P2 | no |
| UC-CARTWS-08 | Update to quantity 0 or negative returns 500 but removes the line | BD | P2 | KI-1 |
| UC-CARTWS-09 | Update with non-numeric, empty or missing quantity returns 502, cart unchanged | VN | P2 | KI-2 |
| UC-CARTWS-10 | Remove lines one by one until the cart is empty | SP | P1 | no |
| UC-CARTWS-11 | Delete/update with unknown, repeated or foreign line id is rejected | VN | P1 | KI-3 (update 500) |
| UC-CARTWS-12 | Move a line to the wishlist and back (new line ids) | SP | LOW | no |

### Known issues pinned
- KI-1: `updatecartitem` with newQuantity 0 or negative answers HTTP 500 (`Object reference not set...`) although the line IS removed.
- KI-2: `updatecartitem` with non-numeric, empty, decimal or missing newQuantity answers HTTP 502 (ALB "Bad Gateway"); cart unchanged.
- KI-3: `updatecartitem` with an unknown or foreign sciItemId answers HTTP 500 with the NullReference body instead of a 4xx or success:false; nothing changes.

These pass today and should flag a change in behaviour. See endpoints.json (EP-CART-UPDATE-ITEM) and open-questions.md Q5, Q6.

### Endpoints with no use case
| Endpoint | Why |
|---|---|
| EP-CART-PRODUCT-PAGE | Only hosts the add form in the browser; the add contract is tested directly through EP-CART-ADD-PRODUCT. The page itself is not cart manipulation. |

All other endpoints are used (EP-CART-MOVE-TO-CART and EP-CART-MOVE-TO-WISHLIST only in the LOW-priority UC-CARTWS-12). `/checkout` is not exercised (out of scope; no orders).

### Common conventions (apply to every UC)
- Isolation (decision 1): each test creates its own `request.newContext({ baseURL, userAgent: 'qa-cartws-<uc>-<random>' })` so it gets its own guest cart; it asserts only on that context and disposes it at the end. Step 0 of every UC is `GET /` (obtains the `SMARTSTORE.VISITOR` cookie, kept by the context).
- Line ids: never hardcoded. After setup, read them from `GET /cart` (links `deletecartitem?cartItemId=<id>`, inputs `itemquantity<id>`) or `GET /wishlist` (`cartItemId=<id>`).
- POST without body: send `data: ''` or a form so Content-Length is present (else IIS 411). Always send `X-Requested-With: XMLHttpRequest` on mutating calls (what the UI sends; behaviour without it is only known for add).
- Business failures are HTTP 200 + `success:false`: assert on the JSON body.
- Emptiness: assert absence of `cartItemId=` / `itemquantity<id>` markers on `/cart`, never the text "Your Shopping Cart is empty!" (always in the HTML).
- Products: 8 = Supreme Golfball ($1.90, stock 8563, max 10000); 1 = Transocean Chronograph (about $24,110.00, price read from `/cart`, not hardcoded). Tax and shipping observed at $0.00, so Total == Subtotal (re-check, do not assume for other data).
- Cleanup: guest carts are throwaway and isolated by User-Agent; best-effort cleanup is deleting remaining lines via `deletecartitem`, then disposing the context. A failed cleanup must not fail the test.
- Money assertions: parse `$X excl tax` text into numbers and compare to the expected value; do not compare whole HTML.
- Evidence paths below are relative to `qa/workshop/cartws/01-discovery/`.
- In each UC, "Type" uses the long names (happy-path, negative, boundary, state); HP/VN/BD/SP are the short codes used in the matrix.

---

## Use cases

### UC-CARTWS-01: Add one product to an empty guest cart
- Area: cart
- Type: happy-path (HP)
- Priority: P1
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: fresh context with unique User-Agent; `GET /` done; cart empty.
- Data: productId 8, cartType 1, quantity 1. No credentials.
- Steps:
  1. `POST /cart/addproduct/8/1`, form body `addtocart_8.EnteredQuantity=1`
  2. `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
  3. `GET /cart`
- Expected:
  1. HTTP 200, JSON `success:true`.
  2. HTTP 200, JSON `CartItemsCount == 1`.
  3. HTTP 200; exactly one `itemquantity<id>` input with value 1; a `$1.90 excl tax` unit price and line total.
- Evidence: flows.md "Unit: cart-add / Flow 1"; endpoints.json EP-CART-ADD-PRODUCT, EP-CART-SUMMARY.
- State/cleanup: creates one line in the context's own guest cart. Delete the line (id from step 3) and dispose the context.
- Notes: field name `addtocart_8.EnteredQuantity` is the UI-confirmed one (open-questions Q4); do not use the `AddToCart.` variant.

### UC-CARTWS-02: Repeat adds accumulate on one line
- Area: cart
- Type: state (SP)
- Priority: P1
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: fresh context; cart empty.
- Data: productId 8, cartType 1; quantities 1, then 3.
- Steps:
  1. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=1`
  2. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=3`
  3. `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
  4. `GET /cart`
- Expected:
  1. 200, `success:true`.
  2. 200, `success:true`.
  3. `CartItemsCount == 4` (sum of quantities).
  4. Exactly ONE line (one `itemquantity<id>`), value 4; line total `$7.60 excl tax`.
- Evidence: flows.md "Unit: cart-add / Flow 2"; SUMMARY.md section 4 (CartItemsCount is a sum of quantities).
- State/cleanup: one line with qty 4 in own cart. Delete the line, dispose context.
- Notes: the counter is a sum of quantities, not a line count; this is the key assertion.

### UC-CARTWS-03: Two lines - mini-cart, header counter and totals agree
- Area: cart
- Type: happy-path (HP)
- Priority: P2
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-OFFCANVAS, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: fresh context; cart empty.
- Data: product 8 quantity 3; product 1 quantity 1.
- Steps:
  1. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=3`
  2. `POST /cart/addproduct/1/1`, `addtocart_1.EnteredQuantity=1`
  3. `GET /cart` - read both line ids, line totals, Subtotal, Total.
  4. `POST /shoppingcart/offcanvasshoppingcart`, `data: ''`
  5. `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True`, `data: ''`
- Expected:
  1-2. 200, `success:true`.
  3. Two lines; product 8 line total `$5.70`; Subtotal == sum of the two line totals; Total == Subtotal (tax and shipping $0.00 as observed).
  4. 200 HTML fragment containing `data-sci-id` for both line ids from step 3 and quantity inputs 3 and 1.
  5. `CartItemsCount == 4` (not 2), `WishlistItemsCount == 0`, `CompareItemsCount == 0`.
- Evidence: flows.md "Unit: cart-add / Flow 4", "Unit: cart-update / Flow 1"; endpoints.json EP-CART-OFFCANVAS, EP-CART-SUMMARY.
- State/cleanup: two lines in own cart. Delete both lines, dispose context.
- Notes: product 1 price is read from step 3 (about $24,110.00), not hardcoded. If tax or shipping becomes non-zero, assert Total >= Subtotal instead. The offcanvas "successfully added" alert is browser-only and must not be asserted (open-questions Q3).

### UC-CARTWS-04: Change a line quantity and see recalculated totals
- Area: cart
- Type: happy-path (HP)
- Priority: P1
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-UPDATE-ITEM, EP-CART-SUMMARY
- Preconditions: fresh context; one line of product 8 qty 1 added via API; line id read from `GET /cart`.
- Data: sciItemId (read), newQuantity 5.
- Steps:
  1. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=1`
  2. `GET /cart` - read sciItemId.
  3. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, form body `newQuantity=5&isCartPage=true&isWishlist=false`
  4. `GET /cart`
  5. `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
- Expected:
  3. 200, JSON `success:true`, `SubTotal` contains `$9.50`, `newItemPrice` contains `$1.90`, `cartHtml` present.
  4. `itemquantity<id>` value 5; line total `$9.50 excl tax`; Subtotal and Total `$9.50`.
  5. `CartItemsCount == 5`.
- Evidence: flows.md "Unit: cart-update / Flow 1"; endpoints.json EP-CART-UPDATE-ITEM.
- State/cleanup: own line goes to qty 5. Delete the line, dispose context.
- Notes: the line id stays the same across an update (only moves change ids).

### UC-CARTWS-05: Update at the stock boundary (8563 accepted, 8564 rejected)
- Area: cart
- Type: boundary (BD)
- Priority: P1
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-UPDATE-ITEM
- Preconditions: fresh context; one line of product 8 qty 1; sciItemId read from `/cart`.
- Data: newQuantity 1, 8563, 8564.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, `newQuantity=1&isCartPage=true&isWishlist=false`
  2. Same call with `newQuantity=8563`
  3. Same call with `newQuantity=8564`
  4. `GET /cart`
- Expected:
  1. 200, `success:true` (lower valid boundary), SubTotal `$1.90`.
  2. 200, `success:true`, SubTotal `$16,269.70`.
  3. 200, `success:false`, `message[0]` = "Your quantity exceeds stock on hand. The maximum quantity that can be added is 8563."
  4. `itemquantity<id>` still 8563; Subtotal `$16,269.70`.
- Evidence: flows.md "Unit: cart-update / Flow 2" table; SUMMARY.md section 4 "Quantity limits".
- State/cleanup: line holds a very large quantity in own cart; delete the line, dispose context. Nothing is ordered.
- Notes: stock 8563 is live inventory and could drift. If it flakes, derive the stock from the message of a probe (10000) and assert N ok / N+1 rejected. Open-questions Q15.

### UC-CARTWS-06: Update above the site-wide maximum (10000 / 10001)
- Area: cart
- Type: boundary (BD)
- Priority: P2
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW
- Preconditions: fresh context; one line of product 8 qty 2 (add `addtocart_8.EnteredQuantity=2`); sciItemId read from `/cart`.
- Data: newQuantity 10000, 10001, 99999.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, `newQuantity=10000&isCartPage=true&isWishlist=false`
  2. Same with `newQuantity=10001`
  3. Same with `newQuantity=99999`
  4. `GET /cart`
- Expected:
  1. 200, `success:false`, message = the stock message ("...maximum quantity that can be added is 8563.") because stock 8563 < 10000.
  2. 200, `success:false`, message "The maximum quantity allowed for purchase is 10000."
  3. Same as step 2.
  4. `itemquantity<id>` still 2; Subtotal `$3.80`.
- Evidence: flows.md "Unit: cart-update / Flow 2"; SUMMARY.md section 4 (two different messages).
- State/cleanup: cart unchanged by the rejected calls. Delete the line, dispose context.
- Notes: pins the two-message behaviour for product 8; whether 10000 applies site-wide to other products is unknown (Q15).

### UC-CARTWS-07: Add rejects invalid quantity, unknown product and unsupported cartType
- Area: cart
- Type: negative (VN)
- Priority: P2
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY
- Preconditions: fresh context; cart empty.
- Data: quantities 0, -1, abc for product 8; productId 999999, 0, abc; cartType 99.
- Steps:
  1. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=0` (repeat for `-1` and `abc`)
  2. `POST /cart/addproduct/999999/1`, `addtocart_999999.EnteredQuantity=1`
  3. `POST /cart/addproduct/0/1`, `x=1` (repeat with `abc` as id)
  4. `GET /cart/addproduct/8/1`
  5. `POST /cart/addproduct/8/99`, `addtocart_8.EnteredQuantity=1`
  6. `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
- Expected:
  1. 200, `success:false`, `message[0]` = "Quantity should be positive" (each of the three values).
  2. 200, body `{"redirect":"/"}`.
  3. 404 (both).
  4. 404 (GET not supported).
  5. 200, `success:true` but the cart is not changed (pinned current behaviour; cartType 99 is undocumented).
  6. `CartItemsCount == 0` after all of the above.
- Evidence: flows.md "Unit: cart-add / Flow 3"; endpoints.json EP-CART-ADD-PRODUCT failure.
- State/cleanup: none expected; the cart must stay empty. Dispose context. If step 5 ever adds something, delete it.
- Notes: step 5 pins a surprising behaviour (success:true with no effect), not a requirement; meaning of cartType is open (Q1). Drop step 5 if time-boxed.

### UC-CARTWS-08: Update to quantity 0 or negative returns 500 but removes the line
- Area: cart
- Type: boundary (BD)
- Priority: P2
- Known issue: KI-1 (HTTP 500 although the line is removed)
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-UPDATE-ITEM, EP-CART-SUMMARY
- Preconditions: fresh context; one line of product 8 qty 1; sciItemId read from `/cart`.
- Data: newQuantity 0, then (after re-adding) -1.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, `newQuantity=0&isCartPage=true&isWishlist=false`
  2. `GET /cart`; `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
  3. `POST /cart/addproduct/8/1`, `addtocart_8.EnteredQuantity=1`; read the NEW sciItemId from `/cart`
  4. `POST /shoppingcart/updatecartitem?sciItemId=<new id>&isCartPage=True`, `newQuantity=-1&isCartPage=true&isWishlist=false`
  5. `GET /cart`
- Expected:
  1. HTTP 500, JSON `error:true`, `controller:'shoppingcart'`, `action:'updatecartitem'`, message "Object reference not set to an instance of an object."
  2. No `itemquantity<id>` or `cartItemId=` markers (line removed); `CartItemsCount == 0`.
  3. Add returns `success:true`; a line exists again.
  4. Same 500 body as step 1.
  5. Cart empty again.
- Evidence: flows.md "Unit: cart-update / Flow 2" (rows 0 and -1); SUMMARY.md section 4; open-questions Q6.
- State/cleanup: cart ends empty; no deletes needed. Dispose context.
- Notes: known issue; if the status becomes 200 the test should be revisited, not silently relaxed. Behaviour with two lines in the cart is unknown (Q6), so keep the cart to a single line here.

### UC-CARTWS-09: Update with non-numeric, empty or missing quantity returns 502, cart unchanged
- Area: cart
- Type: negative (VN)
- Priority: P2
- Known issue: KI-2 (502 from the load balancer instead of a 4xx)
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-UPDATE-ITEM
- Preconditions: fresh context; one line of product 8 qty 3 (add `addtocart_8.EnteredQuantity=3`); sciItemId read from `/cart`.
- Data: newQuantity `abc`, empty string, `2.5`, field omitted.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, `newQuantity=abc&isCartPage=true&isWishlist=false`
  2. Same with `newQuantity=` (empty)
  3. Same with `newQuantity=2.5`
  4. Same with body `isCartPage=true&isWishlist=false` (no newQuantity)
  5. `GET /cart`
  6. `GET /shoppingcart/updatecartitem?sciItemId=<id>&newQuantity=2`
- Expected:
  1-4. HTTP 502, HTML body containing "Bad Gateway" (do not assert the full body).
  5. `itemquantity<id>` still 3 (cart unchanged).
  6. HTTP 404.
- Evidence: flows.md "Unit: cart-update / Flow 2" (abc, empty, 2.5, missing) and "Flow 3" (GET 404); open-questions Q5.
- State/cleanup: unchanged line qty 3; delete the line, dispose context.
- Notes: 502 comes from the AWS ALB (an unhandled exception); flakiness risk is moderate, and repeated 502s might affect other visitors (Q5), so keep the number of 502 calls low (drop step 3 if needed). Pinning status 502 is deliberate (decision 2).

### UC-CARTWS-10: Remove lines one by one until the cart is empty
- Area: cart
- Type: state (SP)
- Priority: P1
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-DELETE-ITEM, EP-CART-SUMMARY, EP-CART-OFFCANVAS
- Preconditions: fresh context; two lines in the cart (product 8 qty 2, product 1 qty 1); both line ids read from `/cart` (note which id belongs to which product).
- Data: cartItemId of the product 8 line (id8) and the product 1 line (id1).
- Steps:
  1. `POST /shoppingcart/deletecartitem?cartItemId=<id8>`, `data: ''`
  2. `GET /cart`; `POST /shoppingcart/cartsummary?cart=True`, `data: ''`
  3. `POST /shoppingcart/deletecartitem?cartItemId=<id1>`, `data: ''`
  4. `GET /cart`; `POST /shoppingcart/cartsummary?cart=True`, `data: ''`; `POST /shoppingcart/offcanvasshoppingcart`, `data: ''`
- Expected:
  1. 200, `success:true`, message "The product has been removed.".
  2. `/cart` has `cartItemId=<id1>` and no `<id8>`; `CartItemsCount == 1`.
  3. 200, `success:true`, `cartItemCount == 0`.
  4. `/cart` has no `cartItemId=` or `itemquantity` markers; `CartItemsCount == 0`; offcanvas fragment has no `data-sci-id`.
- Evidence: flows.md "Unit: cart-remove / F3"; endpoints.json EP-CART-DELETE-ITEM.
- State/cleanup: cart ends empty by design; just dispose the context.
- Notes: `cartItemCount` in the response after the FIRST delete of two lines is not documented (line count vs quantity sum), so it is NOT asserted; only the last-line value 0 is. The browser delete click was never performed (Q11); a small risk remains that the UI sends something extra.

### UC-CARTWS-11: Delete/update with unknown, repeated or foreign line id is rejected
- Area: cart
- Type: negative (VN)
- Priority: P1
- Known issue: KI-3 (update answers HTTP 500 for unknown/foreign id)
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-DELETE-ITEM, EP-CART-UPDATE-ITEM
- Preconditions: two fresh contexts, A and B, each with a different unique User-Agent. Context A has a line (product 8 qty 1; idA read from A's `/cart`). Context B has a line (product 8 qty 1; idB read from B's `/cart`).
- Data: idA, idB (read), unknown id `999999999`.
- Steps:
  1. In A: `POST /shoppingcart/deletecartitem?cartItemId=999999999`, `data: ''`
  2. In A: `POST /shoppingcart/deletecartitem?cartItemId=<idB>`, `data: ''` (B's line)
  3. In A: `POST /shoppingcart/updatecartitem?sciItemId=<idB>&isCartPage=True`, `newQuantity=2&isCartPage=true&isWishlist=false`
  4. In A: `POST /shoppingcart/deletecartitem?cartItemId=<idA>` (valid), then repeat the same call
  5. In B: `GET /cart`
  6. In A: `GET /shoppingcart/deletecartitem?cartItemId=<idB>`
- Expected:
  1. 200, `success:false`, message "An error occurred during the removal of the product.".
  2. Same as 1.
  3. HTTP 500, NullReference body (`error:true`, "Object reference not set to an instance of an object."), pinned (KI-3).
  4. First call 200 `success:true`; repeat call 200 `success:false` with the same error message.
  5. B's cart still has `itemquantity<idB>` with value 1 (ownership enforced, nothing changed by A).
  6. HTTP 404.
- Evidence: flows.md "Unit: cart-remove / F3" failures, "Unit: cart-update / Flow 3"; auth.md "Object-level access".
- State/cleanup: A's line is deleted by step 4; delete B's line at the end; dispose both contexts.
- Notes: unknown/foreign id handling differs between delete (200 success:false) and update (500); both are pinned. The two contexts must use different User-Agents or they may share a cart (open-questions Q14).

### UC-CARTWS-12: Move a line to the wishlist and back (new line ids)
- Area: cart
- Type: state (SP)
- Priority: LOW (bonus, not part of the first selection)
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-MOVE-TO-WISHLIST, EP-CART-WISHLIST-VIEW, EP-CART-MOVE-TO-CART, EP-CART-SUMMARY
- Preconditions: fresh context; one line of product 8 qty 1; cart line id (c1) read from `/cart`.
- Data: c1 (read); wishlist id w1 (read from `/wishlist`); cart id c2 (read from `/cart` again).
- Steps:
  1. `POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=<c1>&cartType=ShoppingCart&isCartPage=True`, `data: ''`
  2. `GET /cart`; `GET /wishlist`; `POST /shoppingcart/cartsummary?cart=True&wishlist=True`, `data: ''`
  3. `POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=<w1>&cartType=Wishlist&isCartPage=True`, `data: ''`
  4. `GET /cart`; `GET /wishlist`; `POST /shoppingcart/cartsummary?cart=True&wishlist=True`, `data: ''`
- Expected:
  1. 200, `success:true`, `wasMoved:true`, message "The product has been added to your wishlist".
  2. `/cart` has no line markers; `/wishlist` has `cartItemId=<w1>` with `w1 != c1`; `CartItemsCount == 0`, `WishlistItemsCount == 1`.
  3. 200, `success:true`, `wasMoved:true`, message "The product has been added to your shopping cart".
  4. `/cart` has a line `c2` with `c2 != w1`, quantity 1; `/wishlist` has no line markers; counters 1 and 0.
- Evidence: flows.md "Unit: cart-remove / F2"; endpoints.json EP-CART-MOVE-TO-WISHLIST, EP-CART-MOVE-TO-CART; SUMMARY.md section 4.
- State/cleanup: ends with one cart line (c2) and an empty wishlist; delete c2 and dispose context.
- Notes: wishlist emptiness is detected by absence of `cartItemId=` markers, not the text "The wishlist is empty!". Only qty 1 is used because move behaviour for qty > 1 is unknown (Q10). The failure text for unknown ids is misleading and direction-ambiguous (Q13), so it is not asserted.

---

## Needs more discovery
Scenarios not written because facts are missing:
- Valid cartType values other than 1 (and meaning of 99): Q1. Only a pin in UC-CARTWS-07 step 5.
- Whether `addtocart_{id}.AddToCart.EnteredQuantity` binds: Q4 (UCs use the confirmed name only).
- Update to quantity 0 with two lines in the cart (is the 500 only an empty-cart rendering bug?): Q6.
- Move behaviour with qty > 1, omitted `isCartPage`, or wrong `cartType` for a line: Q9, Q10.
- Wishlist-side quantity update (`isWishlist=true`), wishlist delete endpoint: Q8, Q12.
- Products with required attributes, other products' stock limits, whether 10000 applies site-wide: Q2, Q15.
- Discounts, gift cards, tax and shipping variation in totals (UC-CARTWS-03 assumes Total == Subtotal as observed): Q8.
- Browser delete click equals the curl replay: Q11.
- Whether `X-Requested-With` is required by update, delete and move (tests always send it).

## Counts
| Area | happy-path | negative | boundary | state | Total |
|---|---|---|---|---|---|
| cart | 3 | 3 | 3 | 3 | 12 |

Priorities: P1 = 6 (UC-CARTWS-01, 02, 04, 05, 10, 11), P2 = 5 (UC-CARTWS-03, 06, 07, 08, 09), LOW = 1 (UC-CARTWS-12). Known-issue tagged: UC-CARTWS-08 (KI-1), UC-CARTWS-09 (KI-2), UC-CARTWS-11 (KI-3).
