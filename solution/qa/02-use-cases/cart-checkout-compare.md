# AREA: CART (cart-compare-wishlist), part 2 of 2: UC-CART-56 to UC-CART-96 (coupon, gift card, shipping estimate, checkout entry, shared wishlist, compare). Part 1 is qa/02-use-cases/cart.md. Shorthands (`ADD`, `COUNTS`, `LINE`, `P1`, `P2`, `CLEAN`, `AJAX`) are defined at the top of part 1.

Additional shorthands:
- `FORM(action, extra)` = `POST /cart`, multipart (or urlencoded) form with the quantity field `itemquantity<LINE(P1)>=1` plus `extra` and the submit field named by `action`. Use `maxRedirects: 0`.
- Order placement, valid billing/shipping/payment/confirm POSTs and valid coupon or gift card codes are out of scope (decision f). Only failure paths and read-only pages are covered.

### UC-CART-56: Invalid discount coupon is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-COUPON
- Request: `ADD(P1,1,1)`; `FORM(applydiscountcouponcode, discountcouponcode=QACOUPON-<runId>)`.
- Expected: 200 HTML; `.alert-danger` contains `The coupon code you entered couldn't be applied to your order`; the cart line and quantity are unchanged.
- State/cleanup: CLEAN.
- Evidence: flows.md F8.

### UC-CART-57: Empty discount coupon is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-COUPON
- Request: `ADD(P1,1,1)`; `FORM(applydiscountcouponcode, discountcouponcode=)`.
- Expected: 200; the same `couldn't be applied` alert.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-COUPON failure.

### UC-CART-58: Invalid gift card code is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-GIFTCARD
- Request: `ADD(P1,1,1)`; `FORM(applygiftcardcouponcode, giftcardcouponcode=QAGIFT-<runId>)`.
- Expected: 200; alert inside `#cart-action-giftcard-body` with a rejection text. The text observed is the coupon message (finding #22, wording issue); assert only that an `.alert-danger` is present inside the gift card block and that no gift-card discount row appears in the totals.
- State/cleanup: CLEAN.
- Evidence: flows.md F8; SUMMARY.md section 4 #22.

### UC-CART-59: Empty gift card code is rejected
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-GIFTCARD
- Request: `ADD(P1,1,1)`; `FORM(applygiftcardcouponcode, giftcardcouponcode=)`.
- Expected: 200; `.alert-danger` inside the gift card block.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-GIFTCARD failure.

### UC-CART-60: Estimate shipping for a US address
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-ESTIMATE-SHIPPING
- Request: `ADD(P1,1,1)`; `FORM(estimateshipping, CountryId=1&StateProvinceId=0&ZipPostalCode=10001)` with `estimateshipping=Estimate shipping`.
- Expected: 200; `.alert-success` lists at least one option whose text matches `\(\$[0-9.,]+\)`. Option names (`In-Store Pickup`, `By Ground`) were seen at $0.00; assert the price pattern, not the names or amounts (OQ-41).
- State/cleanup: CLEAN.
- Evidence: flows.md F8.

### UC-CART-61: Estimate shipping accepts an empty zip code
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CART-ESTIMATE-SHIPPING
- Request: `ADD(P1,1,1)`; `FORM(estimateshipping, CountryId=1&ZipPostalCode=)`.
- Expected: 200; `.alert-success` with shipping options (observed: no validation of zip).
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CART-ESTIMATE-SHIPPING failure.

### UC-CART-62: Estimate shipping rejects an unknown country
- Meta: cart | defect | Side-effect: no | @defect (finding #22)
- Endpoints: EP-CART-ESTIMATE-SHIPPING
- Request: `ADD(P1,1,1)`; single `FORM(estimateshipping, CountryId=999999&ZipPostalCode=10001)`.
- Expected (correct): 4xx, or 200 without any shipping option list (no `.alert-success` with prices). Observed: 200 with the same options as a real country. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #22; endpoints.json EP-CART-ESTIMATE-SHIPPING.

### UC-CART-63: States of the United States
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-STATES
- Request: `GET /country/getstatesbycountryid?countryId=1&addEmptyStateIfRequired=true`.
- Expected: 200 `application/json`; a JSON array of objects with `id` and `name`; at least 50 entries is not asserted (data may change), only length at least 1 and every element has both keys.
- State/cleanup: none.
- Evidence: flows.md F8.

### UC-CART-64: States with a non-numeric country id return a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-CART-STATES
- Request: single `GET /country/getstatesbycountryid?countryId=abc&addEmptyStateIfRequired=true`.
- Expected (correct): 4xx, or 200 with an empty JSON array. Never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-65: Continue shopping redirects home
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CART-CONTINUE
- Request: `ADD(P1,1,1)`; `FORM(continueshopping, continueshopping=continueshopping)`, `maxRedirects: 0`.
- Expected: 302; `Location` is `/` (path `/`, scheme not asserted); the cart still has the line.
- State/cleanup: CLEAN.
- Evidence: flows.md F8; endpoints.json EP-CART-CONTINUE.

### UC-CART-66: Anonymous checkout start redirects to the login page
- Meta: cart | auth/access | Side-effect: no | @smoke
- Endpoints: EP-CART-STARTCHECKOUT
- Request: `ADD(P1,1,1)`; `FORM(startcheckout, startcheckout=startcheckout)`, `maxRedirects: 0`.
- Expected: 302; `Location` path `/login` with query `checkoutAsGuest=True` and `returnUrl=%2Fcart`.
- State/cleanup: CLEAN.
- Evidence: flows.md F9.

### UC-CART-67: Authenticated checkout start goes straight to checkout
- Meta: cart | auth/access | Side-effect: no | @needs-account
- Endpoints: EP-CART-STARTCHECKOUT, EP-AUTH-LOGIN
- Request: login with `$BEARSTORE_EMAIL` / `$BEARSTORE_PASSWORD`; `ADD(P1,1,1)`; `FORM(startcheckout, ...)`, `maxRedirects: 0`; then `GET /checkout` with `maxRedirects: 0`.
- Expected: first 302 `Location` path `/checkout`; second 302 `Location` path `/checkout/billingaddress`.
- State/cleanup: CLEAN, `GET /logout`. No address is saved and no order is placed.
- Evidence: flows.md F9; endpoints.json EP-CART-STARTCHECKOUT.

### UC-CART-68: Checkout-as-guest login page offers the guest option
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-AUTH-LOGIN-FORM, EP-CART-LOGIN-GUEST
- Request: `GET /login?checkoutAsGuest=True&returnUrl=%2Fcart`.
- Expected: 200 `text/html`; the form contains `UsernameOrEmail` and `Password` inputs; the page contains the text `Checkout as Guest` (case-insensitive match; exact selector to confirm in Stage 3).
- State/cleanup: none.
- Evidence: flows.md F9; areas.md "Observed auth behaviour".

### UC-CART-69: Checkout entry with an empty cart redirects to the cart
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-ENTRY
- Request: `GET /checkout` on a fresh context, `maxRedirects: 0`.
- Expected: 302; `Location` path `/cart`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CHECKOUT-ENTRY failure.

### UC-CART-70: Checkout entry with items redirects to the billing step
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-ENTRY
- Request: `ADD(P1,1,1)`; `GET /checkout`, `maxRedirects: 0`, anonymous.
- Expected: 302; `Location` path `/checkout/billingaddress`.
- State/cleanup: CLEAN.
- Evidence: flows.md F9; endpoints.json EP-CHECKOUT-ENTRY.

### UC-CART-71: Billing address step renders
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-STEPS
- Request: `ADD(P1,1,1)`; `GET /checkout/billingaddress`.
- Expected: 200 `text/html`; `h1` text `Billing address`; inputs `NewAddress.FirstName`, `NewAddress.LastName`, `NewAddress.Email`.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CHECKOUT-STEPS.

### UC-CART-72: Every checkout step redirects to the cart when the cart is empty
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-STEPS
- Request: on a fresh context, `GET` each of `/checkout/billingaddress`, `/checkout/shippingaddress`, `/checkout/shippingmethod`, `/checkout/paymentmethod`, `/checkout/confirm`, `maxRedirects: 0`.
- Expected: each 302 with `Location` path `/cart`. (Only billingaddress and confirm are documented as redirecting; the other three are an extrapolation, so treat a mismatch there as a Needs-more-discovery note rather than a defect.)
- State/cleanup: none.
- Evidence: flows.md F9 ("Empty cart: /checkout, /checkout/billingaddress, /checkout/confirm all 302 /cart"); endpoints.json EP-CHECKOUT-STEPS.

### UC-CART-73: Non-existent checkout pages are not found
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-STEPS
- Request: `ADD(P1,1,1)`; `GET /checkout/paymentinfo`; `GET /checkout/completed`.
- Expected: 404 both.
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-CHECKOUT-STEPS; flows.md F9.

### UC-CART-74: Invalid billing address is re-rendered with field errors
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CHECKOUT-BILLING-POST
- Request: `ADD(P1,1,1)`; `POST /checkout/billingaddress` urlencoded `NewAddress.Id=0&NewAddress.FirstName=&NewAddress.LastName=&NewAddress.Email=bad`.
- Expected: 200 `text/html` (no redirect); messages `'First name' should not be empty.`, `'Last name' should not be empty.`, `'Email' is not a valid email address.`
- State/cleanup: CLEAN. No valid submit is ever sent (it would create an address for the guest).
- Evidence: flows.md F9; endpoints.json EP-CHECKOUT-BILLING-POST.

### UC-CART-75: Later checkout steps are gated by the earlier ones
- Meta: cart | defect | Side-effect: no | @defect (finding #23)
- Endpoints: EP-CHECKOUT-STEPS
- Request: `ADD(P1,1,1)`; single `GET /checkout/confirm`, `maxRedirects: 0`, with no billing address saved.
- Expected (correct): a redirect (302) to an earlier step such as `/checkout/billingaddress`, or a 4xx. Observed: 200 with `Please confirm your order.` and a JS error list. `test.fail()`. The same applies to `shippingmethod` and `paymentmethod`; only `confirm` is exercised, to keep one request.
- State/cleanup: CLEAN. No POST is sent.
- Evidence: SUMMARY.md section 4 #23; flows.md F9.

### UC-CART-76: Shared wishlist page is readable anonymously by guid
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-WISHLIST-VIEW, EP-WISHLIST-SHARED
- Request: context A: `ADD(P1,2,1)`; read the sharing URL from `GET /wishlist`. Context B (no cookies, different User-Agent): `GET /wishlist/<guid>`, `maxRedirects: 0`.
- Expected: 200; text contains `Wishlist of`; contains a link to the P1 product slug.
- State/cleanup: CLEAN in A.
- Evidence: flows.md F6; endpoints.json EP-WISHLIST-SHARED.

### UC-CART-77: Unknown wishlist guid redirects home
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-WISHLIST-SHARED
- Request: `GET /wishlist/00000000-0000-0000-0000-000000000000`, `maxRedirects: 0`.
- Expected: 302; `Location` path `/`.
- State/cleanup: none.
- Evidence: endpoints.json EP-WISHLIST-SHARED failure.

### UC-CART-78: Non-guid wishlist path does not render the caller's own wishlist
- Meta: cart | defect | Side-effect: no | @defect (finding #27)
- Endpoints: EP-WISHLIST-SHARED
- Request: `ADD(P1,2,1)`; single `GET /wishlist/abc`, `maxRedirects: 0`.
- Expected (correct): 302 (as for an unknown guid) or 404; the response must not list the caller's own wishlist line. Observed: 200 rendering the caller's own wishlist. `test.fail()`.
- State/cleanup: CLEAN.
- Evidence: SUMMARY.md section 4 #27.

### UC-CART-79: Share link must not expose the session cookie value
- Meta: cart | security | Side-effect: no | @security @known-issue (finding #10)
- Endpoints: EP-WISHLIST-VIEW, EP-WISHLIST-SHARED
- Request: `ADD(P1,2,1)`; `GET /wishlist`; read the guid in the sharing URL; read the `SMARTSTORE.VISITOR` value from the context cookie jar (`storageState`).
- Expected (secure): the share guid differs from the `SMARTSTORE.VISITOR` value. Observed: they are equal, and the cookie is HttpOnly. `test.fail()`.
- State/cleanup: CLEAN. Read-only comparison; the value is never logged or written to disk.
- Evidence: SUMMARY.md section 4 #10; flows.md F6.

### UC-CART-80: A leaked share guid must not grant access to the owner's cart
- Meta: cart | security | Side-effect: no | @security @known-issue (finding #10)
- Endpoints: EP-CART-SUMMARY, EP-WISHLIST-SHARED
- Request: context A: `ADD(P1,1,2)`; `ADD(P1,2,1)`; read the share guid. Context B: no cookies, then a single `COUNTS` with header `Cookie: SMARTSTORE.VISITOR=<guid>`.
- Expected (secure): B sees `CartItemsCount` 0 and `WishlistItemsCount` 0. Observed: B receives A's counts. `test.fail()`. One request from B, no cart content is changed by B.
- State/cleanup: CLEAN in A.
- Evidence: SUMMARY.md section 4 #10 (repro line).

### UC-CART-81: Email-a-friend wishlist form opens anonymously
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-WISHLIST-EMAIL
- Request: `ADD(P1,2,1)`; `GET /shoppingcart/emailwishlist`, `maxRedirects: 0`.
- Expected: 200; a form with inputs `FriendEmail`, `YourEmailAddress`, `PersonalMessage` (names taken from the discovery note; `verified: false`, confirm in Stage 3). The POST is never sent (it sends mail).
- State/cleanup: CLEAN.
- Evidence: endpoints.json EP-WISHLIST-EMAIL.

### UC-CART-82: Add a product to the compare list
- Meta: cart | happy path | Side-effect: no | @smoke
- Endpoints: EP-COMPARE-ADD, EP-CART-SUMMARY
- Request: `POST /catalog/addproducttocompare/{P1}` (empty body, `Content-Length: 0`, AJAX); `COUNTS`.
- Expected: 200 JSON `success:true`, `message` matches `The product '.+' was added to the compare list.`; `Set-Cookie: sm.CompareProducts` whose value contains `CompareProductIds=<P1>`; `CompareItemsCount` 1.
- State/cleanup: `GET /catalog/clearcomparelist`.
- Evidence: flows.md F7.

### UC-CART-83: Compare add with an unknown id fails softly
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-COMPARE-ADD
- Request: `POST /catalog/addproducttocompare/999999` (empty body); `COUNTS`.
- Expected: 200 JSON `success:false`; the message text contains `Product could not be added.`; `CompareItemsCount` 0.
- State/cleanup: none.
- Evidence: flows.md F7.

### UC-CART-84: Compare add with a non-numeric id returns a client error
- Meta: cart | defect | Side-effect: no | @defect (defect #3)
- Endpoints: EP-COMPARE-ADD
- Request: single `POST /catalog/addproducttocompare/abc` (empty body).
- Expected (correct): 404 or other 4xx (as the cart add does for `abc`), or 200 `success:false`. Never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #3.

### UC-CART-85: Compare list holds at most four products, newest first
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-COMPARE-ADD, EP-COMPARE-VIEW, EP-CART-SUMMARY
- Request: read five distinct product ids from `GET /books` tiles (`article.art[data-id]` in the main list, excluding sub-category and recently-viewed blocks); add them in order p1..p5 with `POST /catalog/addproducttocompare/{id}`; `COUNTS`; `GET /compareproducts`.
- Expected: `CompareItemsCount` = 4; the final `sm.CompareProducts` cookie lists exactly p5, p4, p3, p2 in that order; p1 is absent; the compare page shows four columns.
- State/cleanup: `GET /catalog/clearcomparelist`. The five adds are one scenario, not a loop on a failing call.
- Evidence: flows.md F7 ("Limit 4... oldest evicted, newest first").

### UC-CART-86: Adding a product twice does not duplicate it
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-COMPARE-ADD, EP-CART-SUMMARY
- Request: `POST /catalog/addproducttocompare/{P1}` twice; `COUNTS`.
- Expected: `CompareItemsCount` 1; the cookie contains `CompareProductIds=<P1>` once.
- State/cleanup: clear compare list.
- Evidence: endpoints.json EP-COMPARE-ADD ("duplicates not repeated").

### UC-CART-87: Empty compare page
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-COMPARE-VIEW
- Request: `GET /compareproducts` on a fresh context.
- Expected: 200 `text/html`; text `The compare list is empty.`
- State/cleanup: none.
- Evidence: endpoints.json EP-COMPARE-VIEW.

### UC-CART-88: Compare page lists the added products
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-COMPARE-ADD, EP-COMPARE-VIEW
- Request: add P1 and P2 to compare; `GET /compareproducts`.
- Expected: 200; the page links to both product slugs; contains a `Clear list` link to `/catalog/clearcomparelist`; does not contain `The compare list is empty.`
- State/cleanup: clear compare list.
- Evidence: endpoints.json EP-COMPARE-VIEW.

### UC-CART-89: Compare mini-list fragment has remove links
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-COMPARE-OFFCANVAS
- Request: add P1 to compare; `POST /catalog/offcanvascompare` (empty body).
- Expected: 200 HTML fragment; contains a link `/catalog/removeproductfromcompare/<P1>`.
- State/cleanup: clear compare list.
- Evidence: endpoints.json EP-COMPARE-OFFCANVAS.

### UC-CART-90: Remove a product from the compare list (GET)
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-COMPARE-REMOVE, EP-CART-SUMMARY
- Request: add P1 and P2; `GET /catalog/removeproductfromcompare/{P1}`, `maxRedirects: 0`; `COUNTS`.
- Expected: 302; `Location` path `/compareproducts`; `CompareItemsCount` 1; the cookie no longer contains P1.
- State/cleanup: clear compare list.
- Evidence: endpoints.json EP-COMPARE-REMOVE.

### UC-CART-91: Removing a product that is not in the list returns 404
- Meta: cart | validation/negative | Side-effect: no | (none)
- Endpoints: EP-COMPARE-REMOVE
- Request: `GET /catalog/removeproductfromcompare/{P1}` on an empty compare list, `maxRedirects: 0`.
- Expected: 404.
- State/cleanup: none.
- Evidence: endpoints.json EP-COMPARE-REMOVE failure.

### UC-CART-92: Remove a product from the compare list (POST returns JSON)
- Meta: cart | happy path | Side-effect: no | (none)
- Endpoints: EP-COMPARE-REMOVE
- Request: add P1; `POST /catalog/removeproductfromcompare/{P1}` (empty body, AJAX); `COUNTS`.
- Expected: 200 JSON `success:true`, message matches `The product '.+' was removed from the compare list.`; `CompareItemsCount` 0.
- State/cleanup: clear compare list as safety.
- Evidence: endpoints.json EP-COMPARE-REMOVE (POST variant; seen via curl only).

### UC-CART-93: Clear the compare list
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-COMPARE-CLEAR, EP-CART-SUMMARY
- Request: add P1 and P2; `GET /catalog/clearcomparelist`, `maxRedirects: 0`; `COUNTS`; `GET /compareproducts`.
- Expected: 302; `Location` path `/compareproducts`; `CompareItemsCount` 0; page shows `The compare list is empty.`
- State/cleanup: none left.
- Evidence: endpoints.json EP-COMPARE-CLEAR.

### UC-CART-94: Compare add must not change state over GET
- Meta: cart | security | Side-effect: no | @security @known-issue (finding #15)
- Endpoints: EP-COMPARE-ADD
- Request: single `GET /catalog/addproducttocompare/{P1}`, `maxRedirects: 0`; `COUNTS`.
- Expected (secure): 404 or 405 and `CompareItemsCount` 0. Observed: 302 to `/compareproducts` and the product is added. `test.fail()`. The same applies to compare remove/clear, `/logout`, `/changecurrency/{id}` and `/customer/addressdelete/{id}`; those are covered by UC-AUTH-48 to UC-AUTH-53 and UC-CATALOG-33, so only compare add is exercised here.
- State/cleanup: clear compare list.
- Evidence: SUMMARY.md section 4 #15; endpoints.json EP-COMPARE-ADD.

### UC-CART-95: Compare list lives only in the cookie of its owner
- Meta: cart | state/persistence | Side-effect: no | (none)
- Endpoints: EP-COMPARE-ADD, EP-COMPARE-VIEW
- Request: context A: add P1 to compare. Context B (fresh, different User-Agent): `GET /compareproducts`; then context C created with A's `sm.CompareProducts` cookie only: `GET /compareproducts`.
- Expected: B shows `The compare list is empty.`; C shows P1 (the cookie alone carries the state; no server-side binding to VISITOR).
- State/cleanup: clear compare list in A and C.
- Evidence: flows.md "Identity model" (compare is stored ONLY in the cookie).

### UC-CART-96: Visitor isolation probe for cookieless requests with the same User-Agent
- Meta: cart | security | Side-effect: no | @probe (OQ-01)
- Endpoints: EP-CART-ADD-CART, EP-CART-SUMMARY
- Request: two fresh contexts A and B with identical User-Agent and no cookies. A: `ADD(P1,1,1)`. B: `COUNTS`. Then repeat the pair with different User-Agent suffixes.
- Expected: same User-Agent: B should report 0 (isolated). If B reports 1, the hypothesis of a shared visitor GUID per IP and User-Agent is confirmed; the test records an annotation with the result and fails with a message pointing to OQ-01. Different User-Agent: B reports 0 (this part is what the other UCs rely on and must pass).
- State/cleanup: CLEAN in A (and B if it shares state). Run this probe first in the suite (Gate 1 decision 5).
- Evidence: SUMMARY.md section 6 item 5; open-questions.md OQ-01.
