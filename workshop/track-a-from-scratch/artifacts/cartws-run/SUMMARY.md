# Discovery summary - cart manipulation (workshop run cartws)

Target: https://bearstore-testsite.smartbear.com (anonymous, no login). Scope: add to cart, change quantity, remove from cart, mini-cart and cart totals. No areas.md or scout; scope split into three units by the orchestrator.

## 1. At a glance
- Area: cart. Units explored: cart-add, cart-update, cart-remove (all three). Skipped by choice: none.
- Endpoints: 10 unique (after merging duplicates), 10 verified, 0 unverified. EP-CART-ADD-PRODUCT was reported by all three units, EP-CART-VIEW by two.
- Verification detail: by curl replay with a headed browser session alongside. The delete click was not performed in the browser (markup only), so EP-CART-DELETE-ITEM is verified by curl only.
- Flows: 4 (cart-add) + 3 (cart-update) + 3 (cart-remove) = 10, see flows.md.
- Open questions: 15, see open-questions.md.

## 2. Endpoint table
| id | method | path | purpose | state-changing | verified |
|---|---|---|---|---|---|
| EP-CART-PRODUCT-PAGE | GET | /transocean-chronograph | Product page hosting the add form (product 1) | no | yes |
| EP-CART-ADD-PRODUCT | POST | /cart/addproduct/{productId}/{cartType} | Add product to cart; repeat adds accumulate on one line | yes | yes |
| EP-CART-OFFCANVAS | POST (GET also works) | /shoppingcart/offcanvasshoppingcart | Mini-cart HTML fragment (lines, quantities, subtotal) | no | yes |
| EP-CART-SUMMARY | POST (GET is 404) | /shoppingcart/cartsummary?cart=&wishlist=&compare= | Header counters JSON; CartItemsCount is the sum of quantities | no | yes |
| EP-CART-VIEW | GET | /cart | Cart page: lines, line totals, subtotal and total, line ids | no | yes |
| EP-CART-UPDATE-ITEM | POST | /shoppingcart/updatecartitem?sciItemId= | Set a line's quantity; returns recalculated totals and cart HTML | yes | yes |
| EP-CART-DELETE-ITEM | POST | /shoppingcart/deletecartitem?cartItemId= | Remove one line | yes | yes (curl only) |
| EP-CART-MOVE-TO-WISHLIST | POST | /shoppingcart/moveitembetweencartandwishlist?cartItemId=&cartType=ShoppingCart | Move cart line to wishlist (new line id) | yes | yes |
| EP-CART-MOVE-TO-CART | POST | /shoppingcart/moveitembetweencartandwishlist?cartItemId=&cartType=Wishlist | Move wishlist line to cart (new line id) | yes | yes |
| EP-CART-WISHLIST-VIEW | GET | /wishlist | Wishlist page, to read wishlist line ids | no | yes |

All: auth not required. Details, conflicts and per-field data: endpoints.json.

## 3. Auth model
- No login; cart and wishlist belong to a guest visitor identified by cookie SMARTSTORE.VISITOR (HttpOnly, secure, 1 year), created on the first request. ASP.NET_SessionId appears on first /cart or offcanvas call.
- No CSRF/anti-forgery token needed in any replay. No logout exercised.
- A line can only be changed or removed by its owner. Foreign or unknown ids: 500 on update, 200 success:false on delete/move.
- Full model: auth.md.

## 4. Risks and surprises
- Error contract is inconsistent. Business failures mostly return HTTP 200 with success:false (add with bad quantity, unknown product id gives {"redirect":"/"}, delete/move of an unknown or foreign line). Assert on the body, not the status.
- updatecartitem with quantity 0 or negative returns HTTP 500 (NullReference body) although the line IS removed. Unknown or foreign sciItemId also gives 500 and changes nothing.
- Non-numeric, empty, decimal or missing newQuantity (update) and missing or non-numeric cartItemId (delete/move) return 502 Bad Gateway from the AWS load balancer, not 400. Cart unchanged.
- POST endpoints with no body need a Content-Length (curl -d ""), else IIS answers 411. GET on add/update/delete/move/cartsummary is 404 (not 405); GET on offcanvas works.
- Cart isolation: the three headed browsers appeared to share one guest cart (same IP + User-Agent probably keys the guest visitor); lines and counts changed under each unit. curl jars with a UNIQUE User-Agent each were deterministic. Tests should use a fresh request context with its own unique User-Agent.
- Line ids (sciItemId / cartItemId) are global counters and change on every move (cart <-> wishlist, e.g. 168049 -> 168052 -> 168053). Always read them from /cart or /wishlist.
- Emptiness: "Your Shopping Cart is empty!" (and "The wishlist is empty!") appear in the HTML even for non-empty lists (data-empty-text). Detect emptiness by absence of cartItemId / itemquantity<id> links.
- Quantity limits: product 8 (Supreme Golfball, $1.90 each) has stock 8563 against a site-wide max of 10000, giving two different messages: above stock "Your quantity exceeds stock on hand. The maximum quantity that can be added is 8563." (8564 and 10000), above 10000 "The maximum quantity allowed for purchase is 10000." (10001+). Product 1 is the Transocean Chronograph (/transocean-chronograph), about $24,110.00. Tax and shipping were $0.00 in the observed carts, so Total == Subtotal.
- Add with cartType 99 returns success:true but does not change the cart. CartItemsCount is a sum of quantities, not a line count. The move failure text "Product could not be added to the shopping cart." is misleading for the wishlist direction.
- Reconciled contradiction, add body field: cart-add and the UI use addtocart_{productId}.EnteredQuantity; cart-remove used addtocart_1.AddToCart.EnteredQuantity and also got success:true. The first is the confirmed name (UI-sent, quantity 3 honored, 0/-1/abc rejected with "Quantity should be positive"). The second is probably ignored and falls back to the default quantity 1, which is all cart-remove sent (inference; open question 4). Use the first.
- Minor: unit files differ in area casing ("cart" vs "CART"), and failure.status of EP-CART-UPDATE-ITEM is recorded as 200 while its body signal documents 500 and 502 too; normalized/noted in endpoints.json.

## 5. Not explored
- Checkout, login/account, order placement (only a read-only GET /checkout -> 302 to /cart on an empty cart).
- cartType values other than 1 (and 99), wishlist-side quantity update (isWishlist=true), products with attributes, discounts/gift cards, tax and shipping variation, other products' stock limits.
- Move behavior for lines with quantity > 1; omitting isCartPage; wrong cartType for a line.
- Browser-side delete click (curl only); wishlist delete endpoint (none seen).
- Browser-side counters are unreliable because of the shared guest cart; assertions were made through unique-UA curl jars.

## 6. Decisions needed from you
1. Test isolation: use a fresh Playwright request context per test (or per spec file) with its own unique User-Agent, and assert on that context only. Recommendation: yes; it is the only approach shown to be deterministic.
2. Expected status for the buggy responses (quantity 0/negative gives 500 with the line removed; garbage quantity gives 502): pin current behavior in tests, or mark as expected-fail/bug. Recommendation: pin current behavior and assert the side effect (line gone / cart unchanged), tagged as known issues, so the suite passes today and flags a change.
3. Which max-6 tests: recommended set is add (valid + repeat accumulation), update (valid + stock/10000 boundary), remove (valid + foreign/unknown id with success:false). Recommendation: keep wishlist move out of the first 6 and treat it as a bonus.

## 7. State left behind
- Application (guest carts, all throwaway):
  - cart-add: curl jar cart (/tmp/qa-cart-add.jar) holds 7 x product 1 on one line, not removed. Browser cart got 1 x product 1, not removed.
  - cart-update: curl cart empty (all lines removed with qty 0). Browser cart: its own product 8 line was removed; a Transocean Chronograph line created by another unit remains, untouched.
  - cart-remove: curl cart and wishlist empty. Browser cart: net contents unchanged but line ids changed; a Supreme Golfball line it did not add remains, not emptied because the cart is shared.
  - Since the browser carts are shared, the guest cart used by the headed browsers holds leftover lines from several units.
- Local: curl jars in /tmp (qa-cart-add.jar, qa-cart-update.jar, qa-cart-remove.jar). Browser sessions of cart-update and cart-remove were closed; cart-add's session closure was not reported.
- No orders placed, no checkout touched, no accounts created.
