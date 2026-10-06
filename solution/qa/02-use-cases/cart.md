# AREA: CART (cart-compare-wishlist), part 1 of 2: UC-CART-01 to UC-CART-55 (add, view, update, delete, move, wishlist, IDOR). Part 2 (coupon, shipping, checkout, shared wishlist, compare) is in qa/02-use-cases/cart-checkout-compare.md and continues at UC-CART-56.

Meta line format: `Area | Type | Side-effect | Tags`. Every UC runs in its own fresh context (unique User-Agent), anonymous unless `@needs-account`. Nothing here sends mail or creates accounts, so Side-effect is `no` throughout (cart, wishlist and compare state is per visitor and cleaned in afterEach).

Shorthands used below:
- `AJAX` = header `X-Requested-With: XMLHttpRequest`.
- `ADD(pid, type, qty)` = `POST /cart/addproduct/{pid}/{type}` (type 1 cart, 2 wishlist), urlencoded body `addtocart_{pid}.EnteredQuantity={qty}`, AJAX.
- `COUNTS` = `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True`, empty body, `Content-Length: 0`, AJAX. Returns `{CartItemsCount, WishlistItemsCount, CompareItemsCount}`.
- `LINE(pid)` = the cart line id (`sciItemId`) read from `GET /cart` (`input[name^=itemquantity]` suffix of the line that links to product `pid`). Wishlist line ids are read the same way from `GET /wishlist`. Line ids are never hard-coded.
- `P1` = SIMPLE product 32 (unit price parsed from its page, expected $16.95 but not asserted as a literal); `P2` = product 33 (a second simple product, verify 200 in setup).
- `CLEAN` = delete all cart and wishlist lines via `POST /shoppingcart/deletecartitem?cartItemId=<id>[&wishlistItem=True]`, `GET /catalog/clearcomparelist`.
- Defect UCs (`@defect`) are single requests asserting the correct behaviour with `test.fail()`. "Never 5xx" is the minimum; the preferred form is 4xx, or 200 with `success:false` where the endpoint's own convention is JSON validation (human to choose, see conventions).

### UC-CART-01: Add a simple product to the cart
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-CART-ADD-CART, EP-CART-SUMMARY, EP-CART-VIEW
- Request: `ADD(P1,1,1)`; `COUNTS`; `GET /cart`.
- Expected: add returns 200 JSON `success:true`; `Set-Cookie: SMARTSTORE.VISITOR`; `COUNTS.CartItemsCount` = 1; `/cart` has exactly one `input[name^=itemquantity]` with value 1 and does not show `Your Shopping Cart is empty!`.
- State/cleanup: CLEAN.
- Evidence: flows.md F1, F2.

### UC-CART-02: Add with quantity 3 and check the line total
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-VIEW
- Request: `ADD(P1,1,3)`; `GET /cart`.
- Expected: `success:true`; line quantity 3; `.cart-summary` Subtotal equals 3 x unit price (parse both amounts; compare in cents); Total equals Subtotal + Shipping + Tax.
- State/cleanup: CLEAN.
- Evidence: flows.md F1, F2 (3 x 16.95 = $50.85).

### UC-CART-03: Adding the same product twice merges into one line
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-SUMMARY, EP-CART-VIEW
- Request: `ADD(P1,1,2)`; `ADD(P1,1,3)`; `COUNTS`; `GET /cart`.
- Expected: both `success:true`; `/cart` has one line for P1 with quantity 5; `CartItemsCount` = 5.
- State/cleanup: CLEAN.
- Evidence: flows.md F1 ("Same product again merges").

### UC-CART-04: Two different products give two lines and a summed count
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-SUMMARY, EP-CART-VIEW
- Request: `ADD(P1,1,2)`; `ADD(P2,1,1)`; `COUNTS`; `GET /cart`.
- Expected: two `itemquantity` inputs; `CartItemsCount` = 3 (sum of quantities, not lines); the two line ids differ.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-SUMMARY (counts are sums of quantities).

### UC-CART-05: Missing body or wrong field name adds quantity 1
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `POST /cart/addproduct/{P1}/1` with `Content-Length: 0` (no body), then `POST` with body `foo=5`.
- Expected: 200 `success:true` both; cart line quantity 2 in total (1 + 1), not 5.
- State/cleanup: CLEAN.
- Evidence: flows.md F1 ("missing body / wrong field name -> adds 1"); endpoints.json EP-CART-ADD-CART.

### UC-CART-06: Non-positive or non-integer quantity is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: four requests in one context: `ADD(P1,1,0)`, `ADD(P1,1,-1)`, `ADD(P1,1,abc)`, `ADD(P1,1,1.5)`; also `ADD(P1,1,99999999999)`; then `COUNTS`.
- Expected: each 200 JSON `success:false` with `message` containing `Quantity should be positive`; `CartItemsCount` stays 0.
- State/cleanup: none expected; CLEAN as safety.
- Evidence: flows.md F1; endpoints.json EP-CART-ADD-CART failure.

### UC-CART-07: Quantity 10000 is accepted (upper boundary)
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-VIEW
- Request: `ADD(P1,1,10000)`; `GET /cart`.
- Expected: `success:true`; line quantity 10000; `CartItemsCount` = 10000; Subtotal = 10000 x unit.
- State/cleanup: CLEAN (delete the line; a 10000-unit line must not linger).
- Evidence: flows.md F2 ($169,500.00 accepted).

### UC-CART-08: Quantity 10001 exceeds the maximum
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `ADD(P1,1,10001)`; `COUNTS`.
- Expected: 200 `success:false`; message contains `The maximum quantity allowed for purchase is 10000.`; `CartItemsCount` = 0.
- State/cleanup: none.
- Evidence: flows.md F1.

### UC-CART-09: Existing plus new quantity above 10000 is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `ADD(P1,1,10000)`; `ADD(P1,1,1)`; `COUNTS`.
- Expected: second response `success:false` with the maximum-quantity message; `CartItemsCount` still 10000.
- State/cleanup: CLEAN.
- Evidence: flows.md F1 ("existing+new > 10000").

### UC-CART-10: Unknown product id answers a redirect hint
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `ADD(999999,1,1)`; `COUNTS`.
- Expected: 200 JSON `{"redirect":"/"}`; `CartItemsCount` = 0.
- State/cleanup: none.
- Evidence: flows.md F1.

### UC-CART-11: Non-numeric product id is not found
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `POST /cart/addproduct/abc/1` body `addtocart_abc.EnteredQuantity=1`.
- Expected: 404 (HTML error page); no cart change.
- State/cleanup: none.
- Evidence: flows.md F1.

### UC-CART-12: Add to cart is POST only
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `GET /cart/addproduct/{P1}/1`; then `COUNTS`.
- Expected: 404; `CartItemsCount` = 0.
- State/cleanup: none.
- Evidence: flows.md F1 ("GET -> 404").

### UC-CART-13: Cart type 0 and -1 are not found
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `POST /cart/addproduct/{P1}/0` and `POST /cart/addproduct/{P1}/-1`, body quantity 1.
- Expected: 404 both; counts stay 0.
- State/cleanup: none.
- Evidence: flows.md F1.

### UC-CART-14: Cart type 9 reports success but adds nothing
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART
- Request: `POST /cart/addproduct/{P1}/9`, body quantity 1; `COUNTS`.
- Expected: 200 `success:true` (observed behaviour); `CartItemsCount` = 0 and `WishlistItemsCount` = 0. Assert the unchanged counts; the `success:true` flag is documented as an oddity, not a requirement.
- State/cleanup: none.
- Evidence: flows.md F1.

### UC-CART-15: Cart type 99999999999 returns a client error, not 502
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-ADD-CART
- Request: single `POST /cart/addproduct/{P1}/99999999999`, body quantity 1.
- Expected (correct): 404 (as for types 0 and -1) or other 4xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-16: Cart operations need neither login nor anti-forgery token
- Meta: cart | auth/access | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-VIEW, EP-WISHLIST-VIEW
- Request: anonymous (no cookies) `ADD(P1,1,1)`, `GET /cart`, `GET /wishlist`, all with `maxRedirects: 0`.
- Expected: 200 each; none redirects to `/login`; no `__RequestVerificationToken` is sent.
- State/cleanup: CLEAN.
- Evidence: flows.md "Identity model"; auth.md CSRF table.

### UC-CART-17: Add a product to the wishlist
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-CART-ADD-WISHLIST, EP-CART-SUMMARY, EP-WISHLIST-VIEW
- Request: `ADD(P1,2,2)`; `COUNTS`; `GET /wishlist`.
- Expected: `success:true`; `WishlistItemsCount` = 2 and `CartItemsCount` = 0; `/wishlist` has one `itemquantity` input with value 2.
- State/cleanup: CLEAN.
- Evidence: flows.md F6.

### UC-CART-18: Wishlist add merges quantities
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-WISHLIST, EP-WISHLIST-VIEW
- Request: `ADD(P1,2,1)`; `ADD(P1,2,2)`; `GET /wishlist`.
- Expected: one line, quantity 3; `WishlistItemsCount` = 3.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-ADD-WISHLIST.

### UC-CART-19: Wishlist add rejects invalid quantities
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-WISHLIST
- Request: `ADD(P1,2,0)`, `ADD(P1,2,abc)`, `ADD(P1,2,10001)`.
- Expected: 200 `success:false`; first two contain `Quantity should be positive`, third contains `The maximum quantity allowed for purchase is 10000.`; `WishlistItemsCount` = 0.
- State/cleanup: none.
- Evidence: endpoints.json EP-CART-ADD-WISHLIST failure.

### UC-CART-20: Cart and wishlist hold independent lines for the same product
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-ADD-WISHLIST, EP-CART-SUMMARY
- Request: `ADD(P1,1,2)`; `ADD(P1,2,1)`; `COUNTS`; delete the wishlist line; `COUNTS`.
- Expected: counts cart 2 / wishlist 1; after the delete cart 2 / wishlist 0.
- State/cleanup: CLEAN.
- Evidence: flows.md F6.

### UC-CART-21: Mini-cart fragment lists the added line
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-OFFCANVAS-CART
- Request: `ADD(P1,1,1)`; `POST /shoppingcart/offcanvasshoppingcart` (empty body, `Content-Length: 0`).
- Expected: 200 HTML fragment; contains an element with `data-sci-id` equal to `LINE(P1)`; contains a link `/shoppingcart/deletecartitem?cartItemId=<id>`; anonymous checkout link targets `/login?checkoutAsGuest=True&returnUrl=%2Fcart`. Assert on these selectors, not on the whole fragment.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-OFFCANVAS-CART.

### UC-CART-22: Mini-cart fragment for an empty cart has no lines
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-OFFCANVAS-CART
- Request: `POST /shoppingcart/offcanvasshoppingcart` on a fresh context.
- Expected: 200; no `data-sci-id` in the fragment. Empty-cart wording was not observed in discovery, so it is not asserted.
- State/cleanup: none.
- Evidence: endpoints.json EP-CART-OFFCANVAS-CART (empty case not probed; see Needs more discovery).

### UC-CART-23: Mini-wishlist fragment lists the added line
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-OFFCANVAS-WISHLIST
- Request: `ADD(P1,2,1)`; `POST /shoppingcart/offcanvaswishlist` (empty body).
- Expected: 200 HTML fragment; contains a link to `/wishlist` and a link to the P1 product slug.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-OFFCANVAS-WISHLIST.

### UC-CART-24: Header counters are zero for a new visitor
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-CART-SUMMARY
- Request: `COUNTS` on a fresh context.
- Expected: 200 `application/json`; `{"CartItemsCount":0,"WishlistItemsCount":0,"CompareItemsCount":0}`; `Set-Cookie: SMARTSTORE.VISITOR`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-CARTSUMMARY.

### UC-CART-25: Header counters sum quantities for cart and wishlist, products for compare
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-SUMMARY, EP-CART-ADD-CART, EP-CART-ADD-WISHLIST, EP-COMPARE-ADD
- Request: `ADD(P1,1,3)`; `ADD(P2,2,2)`; `POST /catalog/addproducttocompare/{P1}`; `COUNTS`; also single-flag variants `.../cartsummary?cart=True`, `?wishlist=True`, `?compare=True`.
- Expected: combined: cart 3, wishlist 2, compare 1. Single-flag responses are 200 JSON and contain the requested counter; do not assert the absence of the others (not observed).
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-SUMMARY; SUMMARY.md section 4 hazards.

### UC-CART-26: Cart summary is POST only
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-SUMMARY
- Request: `GET /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True`.
- Expected: 404.
- State/cleanup: none.
- Evidence: endpoints.json EP-CART-SUMMARY.

### UC-CART-27: Empty cart page
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-VIEW
- Request: `GET /cart` on a fresh context.
- Expected: 200 `text/html`; text `Your Shopping Cart is empty!`; no `input[name^=itemquantity]`.
- State/cleanup: none.
- Evidence: flows.md F2.

### UC-CART-28: Cart page shows the line and a consistent totals table
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-VIEW
- Request: `ADD(P1,1,2)`; `GET /cart`.
- Expected: 200; one line with `data-href` starting `/shoppingcart/updatecartitem?sciItemId=` and ending `&isCartPage=True`; `.cart-summary` has Subtotal, Shipping, Tax, Total; Total = Subtotal + Shipping + Tax.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-VIEW.

### UC-CART-29: Cart persists across requests, a fresh visitor starts empty
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-ADD-CART, EP-CART-SUMMARY
- Request: context A: `ADD(P1,1,1)`, `GET /`, `GET /books`, `COUNTS`. Context B (new context, different User-Agent suffix, no cookies): `COUNTS`.
- Expected: A count 1 after navigation; B count 0.
- State/cleanup: CLEAN in A.
- Evidence: flows.md "Identity model"; OQ-01 (the unique User-Agent suffix is what keeps B separate).

### UC-CART-30: Update a line quantity
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-CART-UPDATE, EP-CART-VIEW
- Request: `ADD(P1,1,1)`; `POST /shoppingcart/updatecartitem?sciItemId=<LINE(P1)>&isCartPage=True`, urlencoded `newQuantity=3&isCartPage=true&isWishlist=false`, AJAX; `GET /cart`.
- Expected: 200 JSON `success:true`; `SubTotal` contains 3 x unit; `newItemPrice` present; `/cart` line quantity 3; `CartItemsCount` 3.
- State/cleanup: CLEAN.
- Evidence: flows.md F3.

### UC-CART-31: Update to 10000 is accepted (upper boundary)
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,1)`; update with `newQuantity=10000`.
- Expected: 200 `success:true`; `/cart` quantity 10000.
- State/cleanup: CLEAN (delete the line).
- Evidence: endpoints.json EP-CART-UPDATE.

### UC-CART-32: Update to 10001 is rejected and the line is unchanged
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,2)`; update with `newQuantity=10001`; `GET /cart`.
- Expected: 200 `success:false`, message contains `The maximum quantity allowed for purchase is 10000.`; `/cart` quantity still 2.
- State/cleanup: CLEAN.
- Evidence: flows.md F3.

### UC-CART-33: Update to quantity 0 does not return a server error
- Meta: cart | defect | Side-effect: no | @defect (defect #6)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,2)`; single update with `newQuantity=0`.
- Expected (correct): status below 500 and no `NullReference` text: either 200 with `success:true` (line removed, as the UI treats 0) or 4xx/200 `success:false` with the line unchanged. Observed: line DELETED and 500 JSON `Object reference not set to an instance of an object.` `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #6.

### UC-CART-34: Update to a negative quantity does not delete the line or return a server error
- Meta: cart | defect | Side-effect: no | @defect (defect #6)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,2)`; single update with `newQuantity=-1`; `GET /cart`.
- Expected (correct): status below 500; 4xx or 200 `success:false`; line still present with quantity 2. Observed: line deleted, 500. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #6.

### UC-CART-35: Update with a non-numeric quantity returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,1)`; single update with `newQuantity=abc`.
- Expected (correct): 4xx, or 200 `success:false` with a quantity message; never 5xx; line unchanged. Observed: 502. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-36: Update with a fractional quantity returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,1)`; single update with `newQuantity=1.5`.
- Expected (correct): 4xx or 200 `success:false`; never 5xx; line unchanged. Observed: 502. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-37: Update with an empty quantity returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,1)`; single update with `newQuantity=` (empty).
- Expected (correct): 4xx or 200 `success:false`; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-38: Update with an out-of-range integer returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-UPDATE
- Request: `ADD(P1,1,1)`; single update with `newQuantity=99999999999`.
- Expected (correct): 200 `success:false` with the maximum-quantity message (as the add endpoint does for large values) or 4xx; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-39: Update of an unknown line id returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #6)
- Endpoints: EP-CART-UPDATE
- Request: single `POST /shoppingcart/updatecartitem?sciItemId=999999999&isCartPage=True`, `newQuantity=2&isCartPage=true&isWishlist=false` on an empty cart.
- Expected (correct): 4xx or 200 `success:false`; never 5xx. Observed: 500 JSON NullReference. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #6; flows.md F3.

### UC-CART-40: Delete a cart line
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-CART-DELETE, EP-CART-VIEW
- Request: `ADD(P1,1,2)`; `POST /shoppingcart/deletecartitem?cartItemId=<LINE(P1)>` (empty body); `GET /cart`.
- Expected: 200 JSON `success:true`, `message` `The product has been removed.`, `cartItemCount` 0; `/cart` shows `Your Shopping Cart is empty!`.
- State/cleanup: none left.
- Evidence: flows.md F4.

### UC-CART-41: Deleting an already deleted line fails softly
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-DELETE
- Request: `ADD(P1,1,1)`; delete `LINE(P1)` twice.
- Expected: second response 200 `success:false`, message `An error occurred during the removal of the product.`
- State/cleanup: none left.
- Evidence: flows.md F4.

### UC-CART-42: Deleting an unknown line id fails softly
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-DELETE
- Request: `POST /shoppingcart/deletecartitem?cartItemId=999999999` on an empty cart.
- Expected: 200 `success:false`, message `An error occurred during the removal of the product.`
- State/cleanup: none.
- Evidence: flows.md F4.

### UC-CART-43: Delete with a non-numeric id returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-DELETE
- Request: single `POST /shoppingcart/deletecartitem?cartItemId=abc`.
- Expected (correct): 4xx or 200 `success:false`; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-44: Delete without an id returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-DELETE
- Request: single `POST /shoppingcart/deletecartitem` (no query, `Content-Length: 0`).
- Expected (correct): 4xx or 200 `success:false`; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-45: Delete is POST only
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-DELETE
- Request: `ADD(P1,1,1)`; `GET /shoppingcart/deletecartitem?cartItemId=<LINE(P1)>`; `COUNTS`.
- Expected: 404; `CartItemsCount` still 1.
- State/cleanup: CLEAN.
- Evidence: flows.md F4 ("GET -> 404").

### UC-CART-46: Another visitor cannot delete my cart line
- Meta: cart | security | Side-effect: no | @security
- Endpoints: EP-CART-DELETE, EP-CART-VIEW
- Request: context A: `ADD(P1,1,1)`, read `LINE(P1)`. Context B (own cookies, different User-Agent): `POST /shoppingcart/deletecartitem?cartItemId=<A's id>`. Context A: `COUNTS`.
- Expected: B response 200 `success:false`; A still has `CartItemsCount` 1.
- State/cleanup: CLEAN in A. One request from B only.
- Evidence: flows.md F3, F4 ("no IDOR"); SUMMARY.md hazards.

### UC-CART-47: Another visitor cannot change my cart line quantity
- Meta: cart | security | Side-effect: no | @security
- Endpoints: EP-CART-UPDATE, EP-CART-VIEW
- Request: context A: `ADD(P1,1,2)`, read the id. Context B: single update of A's id with `newQuantity=7`. Context A: `GET /cart`.
- Expected: A's quantity still 2. B's status is deliberately not asserted (observed 500, which is covered by UC-CART-39).
- State/cleanup: CLEAN in A.
- Evidence: flows.md F3 ("Another visitor's sciItemId cannot be updated").

### UC-CART-48: Move a line from the cart to the wishlist
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-MOVE, EP-CART-SUMMARY
- Request: `ADD(P1,1,3)`; `POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=<LINE(P1)>&cartType=ShoppingCart&isCartPage=True` (empty body); `COUNTS`.
- Expected: 200 JSON `success:true`, `wasMoved:true`, message `The product has been added to your wishlist`; counts cart 0, wishlist 3.
- State/cleanup: CLEAN.
- Evidence: flows.md F5.

### UC-CART-49: Move a line from the wishlist back to the cart
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-MOVE, EP-WISHLIST-VIEW
- Request: `ADD(P1,2,2)`; read the wishlist line id from `GET /wishlist`; `POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=<id>&cartType=Wishlist&isCartPage=True`; `COUNTS`.
- Expected: `success:true`, `wasMoved:true`, message `The product has been added to your shopping cart`; counts cart 2, wishlist 0.
- State/cleanup: CLEAN.
- Evidence: flows.md F5 ("Reverse uses cartType=Wishlist").

### UC-CART-50: Move merges quantities into an existing destination line
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CART-MOVE, EP-CART-SUMMARY
- Request: `ADD(P1,1,3)`; `ADD(P1,2,1)`; move the cart line to the wishlist; `COUNTS`; `GET /wishlist`.
- Expected: wishlist has one line for P1 with quantity 4; cart 0 / wishlist 4.
- State/cleanup: CLEAN.
- Evidence: flows.md F5 ("cart 3 + wishlist 1 = wishlist 4").

### UC-CART-51: Update a wishlist line quantity
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-UPDATE, EP-WISHLIST-VIEW
- Request: `ADD(P1,2,1)`; wishlist line id from `GET /wishlist`; `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, `newQuantity=4&isCartPage=true&isWishlist=true`; `GET /wishlist`.
- Expected: 200 `success:true`; `/wishlist` line quantity 4; `WishlistItemsCount` 4. The response `SubTotal` and `totalsHtml` are not asserted (finding #21, correct behaviour undefined; see Needs more discovery).
- State/cleanup: CLEAN.
- Evidence: flows.md F6; endpoints.json EP-CART-UPDATE.

### UC-CART-52: Delete a wishlist line
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-DELETE, EP-WISHLIST-VIEW
- Request: `ADD(P1,2,1)`; wishlist line id; `POST /shoppingcart/deletecartitem?cartItemId=<id>&wishlistItem=True`; `GET /wishlist`.
- Expected: 200 `success:true`, message `The product has been removed.`; `WishlistItemsCount` 0.
- State/cleanup: none left.
- Evidence: flows.md F6.

### UC-CART-53: Empty wishlist page
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-WISHLIST-VIEW
- Request: `GET /wishlist` on a fresh context.
- Expected: 200 `text/html`; no `input[name^=itemquantity]`. The empty-state wording was not recorded, so it is not asserted.
- State/cleanup: none.
- Evidence: endpoints.json EP-WISHLIST-VIEW.

### UC-CART-54: Wishlist page shows lines and the sharing URL
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-WISHLIST-VIEW
- Request: `ADD(P1,2,2)`; `GET /wishlist`.
- Expected: 200; one line quantity 2; a sharing URL of the form `/wishlist/<guid>` (guid pattern); an email-a-friend link to `/shoppingcart/emailwishlist`.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-WISHLIST-VIEW.

### UC-CART-55: Cart and wishlist survive login
- Meta: cart | state/persistence | Side-effect: no | @needs-account
- Endpoints: EP-CART-ADD-CART, EP-CART-ADD-WISHLIST, EP-AUTH-LOGIN, EP-CART-SUMMARY
- Request: `ADD(P1,1,2)`; `ADD(P2,2,1)`; `POST /login?returnUrl=%2F` with `$BEARSTORE_EMAIL` / `$BEARSTORE_PASSWORD` in the same context; `COUNTS`.
- Expected: login 302 (as in UC-AUTH-01); afterwards cart 2 / wishlist 1.
- State/cleanup: CLEAN, then `GET /logout`. Uses the shared account read-only; it does not change profile data.
- Evidence: flows.md F6 ("survived registration/login in the same browser session").
