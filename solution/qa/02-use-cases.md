# Use cases: cart (Bearstore / SmartStore), stage 2

Source: `qa/01-discovery/` (SUMMARY.md with the Answers, endpoints.json, flows.md, auth.md, open-questions.md, ideas.md). Default mode, no workshop limits. 58 use cases, ids `UC-CART-01` .. `UC-CART-58`. Every use case is an HTTP-level scenario.

## Overview: area x type matrix

Rows are the capability units of the cart area (the use-case ids all share the slug CART). Counts are use cases.

| Area / unit | happy-path | negative | boundary | security | state | contract | Total |
|---|---|---|---|---|---|---|---|
| cart-isolation | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| cart-add | 3 | 5 | 3 | 0 | 4 | 1 | 16 |
| cart-view | 1 | 0 | 0 | 0 | 1 | 1 | 3 |
| cart-quantity | 1 | 2 | 3 | 1 | 1 | 0 | 8 |
| cart-remove | 1 | 4 | 0 | 1 | 1 | 2 | 9 |
| cart-codes | 0 | 5 | 0 | 0 | 0 | 1 | 6 |
| cart-totals-shipping | 2 | 2 | 1 | 0 | 4 | 1 | 10 |
| cart-currency | 1 | 1 | 2 | 1 | 0 | 0 | 5 |
| Total | 9 | 19 | 9 | 4 | 11 | 6 | 58 |

Counts per type: happy-path 9, negative 19, boundary 9, security 4, state 11, contract 6. Outside the pass/fail gate (`@known-issue`, `Gate: no`): UC-CART-26, 27, 35, 42, 51 (HTTP 500/502 characterizations). Lower priority (`Priority: low`): UC-CART-23, 37, 43, 54, 55, 56, 57, 58 (currency, rounding, tier price, and a few contract curiosities).

## Endpoints with no use case (or only partial coverage)

| Endpoint | Status | Why |
|---|---|---|
| EP-CART-APPLY-DISCOUNT | partial: failure path only | No valid discount code is known (decision 4). The success path and removal of an applied code are NOT covered: a gap, see "Needs more discovery". |
| EP-CART-APPLY-GIFTCARD | partial: failure path only | Same: no valid gift card code is known; success path not covered. |
| EP-CART-ADD-PRODUCT with `cartTypeId` 2 (wishlist) and 9 | not covered | Wishlist is excluded by scope (decision 7); type 9 has an unknown effect (open question 1). Only type 1 is used. |
| EP-CART-ADD-QUICK with `forceredirection=True` | partial | The `{redirect:"/cart"}` variant adds the product like the default; covered only inside UC-CART-04. |
| Checkout (`startcheckout` submit of `POST /cart`) | not covered | Excluded by scope: no checkout, no orders. |
| Wishlist, compare (counters `wishlist=`, `compare=`) | not covered | Excluded by scope. |
| Logged-in cart, non-zero shipping or tax | not covered | Not explored in discovery (no login in scope; shipping and tax were always $0.00). The totals use cases assert Total = Subtotal + Shipping + Tax without requiring zero. |

Every other endpoint of `endpoints.json` (EP-CART-ADD-QUICK, ADD-PRODUCT, ADD-GIFTCARD, SUMMARY, OFFCANVAS, PRODUCT-DETAILS, VIEW, REMOVE, UPDATE-ITEM, APPLY-BOTH-BUTTONS, ESTIMATE-SHIPPING, STATES, CHANGE-CURRENCY) has at least one use case.

## Conventions that apply to every case

- **Actor**: every use case gets its own guest actor: a unique User-Agent, its own cookie jar and its own cart (the host keys a guest cart by IP + User-Agent). The default User-Agent is never used. The actor is created by a fixture, which empties the cart and, where touched, resets the currency to USD (`/changecurrency/1`) in its `finally`. No use case depends on another.
- **Products** (cheap and known from discovery; prices are the INPUT constants for computed expectations): `5` Titleist SM6 $164.95, `14` High School Game Basketball $29.95 (tier price: keep quantity <= 5 unless the case is about tiers), `3` Seiko $269.00, `4` Certina $479.00 (only where a case names it), `21` $25 Virtual Gift Card, `63` Ball Chair (required attributes, never added). Quantities stay small (1 to 5); the only large quantities are the boundary cases UC-CART-07, 23, 24.
- **Counters**: always read `cartsummary` with `cart=True` (without it the cart counter is 0). `CartItemsCount` is the SUM of quantities; the delete response `cartItemCount` is the number of LINES. Each is asserted by its own endpoint's meaning. The counters JSON has a `$type` field: use `toMatchObject`.
- **Totals**: parsed from the totals table of `GET /cart`; Subtotal = sum of (unit price x quantity) computed from the input; Total = Subtotal + Shipping + Tax, parsed, never requiring shipping or tax to be zero.
- **Line ids** are never hard-coded: they are read from `GET /cart` (`itemquantity<id>` / `data-href`) after the setup add.
- **Business failures** are HTTP 200 with `success:false`; the exceptions (HTML alerts, `{redirect}`, 500/502) are named per case. Status alone is never the assertion.
- **Request quirks** (empty body on a body-less POST, `X-Requested-With`) live in the API layer, not in the cases below.
- **Positive controls**: "nothing happened" is only asserted after the setup has been proven (the parser saw the line, or the same call succeeds on data the actor owns).
- **Known issues**: assert only the stable facts named in the case; tag `@known-issue`; separate Playwright project outside the gate.

## Use cases: cart-isolation

### UC-CART-01: two guest actors never see each other's cart
- Area: cart
- Type: security
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY, EP-CART-VIEW, EP-CART-REMOVE
- Preconditions: actors A and B, each with a unique User-Agent and its own jar; both carts empty (proven by `cartsummary?cart=True` = 0 for each).
- Data: product 5.
- Steps:
  1. A: `POST /cart/addproduct/5/1` with `addtocart_5.EnteredQuantity=2`.
  2. A: `POST /shoppingcart/cartsummary?cart=True`; B: the same.
  3. B: `GET /cart` and read A's line id from A's own `GET /cart` first; B: `POST /shoppingcart/deletecartitem?cartItemId=<A's line id>`.
  4. A: `GET /cart` and `cartsummary?cart=True` again.
- Expected: step 2: A `CartItemsCount` 2, B `CartItemsCount` 0 (positive control: A's count is 2, so the 0 of B means "separate", not "blind"). Step 3: B's `GET /cart` shows no line; B's delete answers 200 `success:false`. Step 4: A still has one line of quantity 2.
- Evidence: qa/01-discovery/flows.md (cart-add Flow F4; cart-remove Flow 5); auth.md (Identity, item 3 and 4).
- Notes: this is the gate check of the framework: run first, other specs depend on it. Gate: yes. Both actors cleaned up by fixtures.

## Use cases: cart-add

### UC-CART-02: adding three units from the product page puts one line of quantity 3 in the cart
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: empty cart, proven by `cartsummary?cart=True` = 0.
- Data: product 5, quantity 3 (field `addtocart_5.EnteredQuantity`).
- Steps:
  1. `POST /cart/addproduct/5/1`, body `addtocart_5.EnteredQuantity=3`.
  2. `POST /shoppingcart/cartsummary?cart=True`.
  3. `GET /cart`.
- Expected: step 1: 200, `success:true`. Step 2: `CartItemsCount` = 3. Step 3: exactly one line for product 5 with quantity 3; line total = 3 x 164.95 = $494.85; Subtotal = $494.85 (both computed from input).
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2.
- Notes: Gate: yes. Setup is the call itself; fixture empties the cart.

### UC-CART-03: adding the same product twice merges into one line instead of creating a second
- Area: cart
- Type: state
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: empty cart.
- Data: product 5; quantities 2 then 3.
- Steps:
  1. `POST /cart/addproduct/5/1` with quantity 2; read the line id from `GET /cart`.
  2. `POST /cart/addproduct/5/1` with quantity 3.
  3. `GET /cart`; `cartsummary?cart=True`.
- Expected: after step 1 one line (id captured, quantity 2: the precondition). After step 3: still ONE line, the same line id, quantity 5; `CartItemsCount` 5; Subtotal = 5 x 164.95 = $824.75.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F1 (replay results) and F2.
- Notes: Gate: yes.

### UC-CART-04: quick add from a listing adds exactly one unit and ignores a quantity parameter
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-ADD-QUICK, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: empty cart.
- Data: product 5; extra parameter `quantity=3` in the query and in the body.
- Steps:
  1. `POST /cart/addproductsimple/5?forceredirection=False` (empty body).
  2. `POST /cart/addproductsimple/5?forceredirection=False&quantity=3`, body `quantity=3`.
  3. `cartsummary?cart=True`; `GET /cart`.
  4. In a second actor: `POST /cart/addproductsimple/5?forceredirection=True`.
- Expected: step 1: 200 `success:true`, message "The product has been added to your shopping cart". After step 2 the counter is 2 (1 + 1, not 1 + 3) and one line of quantity 2 (merge). Step 4: 200 `{redirect:"/cart"}` and that actor's counter is 1 (the product is added).
- Evidence: qa/01-discovery/flows.md, cart-add Flow F1 (Variants).
- Notes: the second actor of step 4 is its own fixture actor; keep as a separate test if it makes the case longer. Gate: yes.

### UC-CART-05: adding two different products creates two lines and the counter sums their quantities
- Area: cart
- Type: state
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: empty cart.
- Data: product 5 quantity 2; product 3 quantity 1.
- Steps:
  1. `POST /cart/addproduct/5/1` (quantity 2); `POST /cart/addproduct/3/1` (quantity 1).
  2. `cartsummary?cart=True`; `GET /cart`.
- Expected: two lines (5 x2, 3 x1); `CartItemsCount` = 3 (quantities, not lines); Subtotal = 2 x 164.95 + 269.00 = $598.90.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F1 (merge only for the same product), cart-quantity Flow 1.
- Notes: Gate: yes.

### UC-CART-06: invalid quantities are rejected with "Quantity should be positive" and add nothing
- Area: cart
- Type: negative
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY
- Preconditions: empty cart (proven: counter 0); positive control in the same test: a valid add of quantity 1 succeeds.
- Data: table of `addtocart_5.EnteredQuantity` values: `0`, `-1`, `abc`, `1.5`, empty string, `99999999999`.
- Steps:
  1. For each row: `POST /cart/addproduct/5/1` with the value; then `cartsummary?cart=True`.
- Expected: each row: 200, `success:false`, message list contains "Quantity should be positive"; counter stays 0. Positive control: quantity 1 gives `success:true` and counter 1.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2b.
- Notes: one test per row (parametrised). Gate: yes.

### UC-CART-07: the maximum quantity of 10000 is enforced per line, cumulatively
- Area: cart
- Type: boundary
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY
- Preconditions: empty cart.
- Data: product 5; quantities 10001; 5 then 9996.
- Steps:
  1. `POST /cart/addproduct/5/1` with quantity 10001; `cartsummary?cart=True`.
  2. `POST /cart/addproduct/5/1` with quantity 5 (succeeds: positive control).
  3. `POST /cart/addproduct/5/1` with quantity 9996 (5 + 9996 = 10001); `cartsummary?cart=True`; `GET /cart`.
- Expected: step 1: `success:false`, message "The maximum quantity allowed for purchase is 10000."; counter 0. Step 3: the same message; counter stays 5 and the line quantity stays 5.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2b (10001; "10000 when 5 already in cart").
- Notes: nothing large is ever put in the cart (cheap), only the rejections are tested. Accepting exactly 10000 is UC-CART-23. Gate: yes.

### UC-CART-08: a quantity with a leading space is accepted as the number
- Area: cart
- Type: boundary
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-SUMMARY
- Preconditions: empty cart.
- Data: `addtocart_5.EnteredQuantity=%205` (a space and 5).
- Steps:
  1. `POST /cart/addproduct/5/1` with the value; `cartsummary?cart=True`.
- Expected: `success:true`; `CartItemsCount` 5; one line of quantity 5.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2b (" 5").
- Notes: characterization of input trimming; if the host changes it, the case reports it. Gate: yes.

### UC-CART-09: an unknown product id or a GET on the add endpoint adds nothing
- Area: cart
- Type: negative
- Endpoints: EP-CART-ADD-PRODUCT
- Preconditions: empty cart; control add of product 5 quantity 1 succeeds first, then counter is 1.
- Data: table: `POST /cart/addproduct/99999999/1` ; `POST /cart/addproduct/abc/1` ; `POST /cart/addproduct/0/1` ; `GET /cart/addproduct/5/1`.
- Steps:
  1. Control add; `cartsummary?cart=True` = 1.
  2. For each row send the request; `cartsummary?cart=True`.
- Expected: unknown id 99999999: 200 `{redirect:"/"}`; `abc` and `0`: 404; GET: 404. After every row the counter is still 1.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2b (product id lines) and F1 (GET -> 404); auth.md (GET answers 404, not 405).
- Notes: Gate: yes.

### UC-CART-10: a product with required attributes cannot be added without choosing them
- Area: cart
- Type: negative
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-ADD-QUICK
- Preconditions: empty cart.
- Data: product 63 (Ball Chair), quantity only.
- Steps:
  1. `POST /cart/addproduct/63/1` with `addtocart_63.EnteredQuantity=1`.
  2. `POST /cart/addproductsimple/63?forceredirection=False`.
  3. `cartsummary?cart=True`.
- Expected: step 1: `success:false`, messages "Please select 'Material'.", "Please select 'Color'.", "Please select 'Leather color'.". Step 2: a `{redirect:"/<slug>"}` answer, nothing added. Step 3: counter 0.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2b and F1 (Variants).
- Notes: a successful add with attributes is not covered (field names unknown, open question 6). Gate: yes.

### UC-CART-11: quick add of an unknown product or of a gift card adds nothing
- Area: cart
- Type: negative
- Endpoints: EP-CART-ADD-QUICK
- Preconditions: empty cart.
- Data: product 99999999; gift card 21.
- Steps:
  1. `POST /cart/addproductsimple/99999999?forceredirection=False`.
  2. `POST /cart/addproductsimple/21?forceredirection=False`.
  3. `cartsummary?cart=True`; also `GET /cart/addproductsimple/5`.
- Expected: step 1: 200 `success:false`, message object whose `Text` is "The product with ID 99999999 was not found". Step 2: `{redirect:"/<slug>"}`, nothing added. Counter 0 after each; the GET answers 404.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F1 (Variants).
- Notes: the quick-add failure message is an OBJECT, the product-page one a list (see UC-CART-16). Gate: yes.

### UC-CART-12: a gift card with valid recipient and sender details is added as a cart line
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-ADD-GIFTCARD, EP-CART-SUMMARY, EP-CART-VIEW
- Preconditions: empty cart.
- Data: product 21; recipient name/email, sender name/email from the domain constants (placeholder `example.com` addresses), Message "hi", quantity 1.
- Steps:
  1. `POST /cart/addproduct/21/1` with the five `giftcard21-0-.*` fields and `addtocart_21.AddToCart.EnteredQuantity=1`.
  2. `cartsummary?cart=True`; `GET /cart`.
- Expected: `success:true`; counter 1; one gift card line showing the sender and recipient emails that were sent; Subtotal = $25.00.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F3.
- Notes: gift card is never ordered. Gate: yes.

### UC-CART-13: identical gift card details merge, a different recipient creates a new line
- Area: cart
- Type: state
- Endpoints: EP-CART-ADD-GIFTCARD, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: empty cart.
- Data: product 21; details set 1; the same details; details set 2 (only `RecipientName` changed).
- Steps:
  1. Add with details set 1; read lines. Add the same again; read lines (merge).
  2. Add with details set 2; read lines.
- Expected: after the repeat: ONE gift card line, quantity 2, Subtotal $50.00. After set 2: TWO lines (quantities 2 and 1) with different line ids; `CartItemsCount` 3; Subtotal $75.00.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F3 (replay results); open-questions.md 3 (a different Message alone is untested, so it is not asserted).
- Notes: Gate: yes.

### UC-CART-14: each missing or malformed gift card field is rejected with its own message
- Area: cart
- Type: negative
- Endpoints: EP-CART-ADD-GIFTCARD
- Preconditions: empty cart; control: a fully valid add succeeds in the same test.
- Data: table (one valid base, one field changed per row): RecipientName empty -> "Enter valid recipient name"; RecipientEmail empty -> "Enter valid recipient email"; SenderName empty -> "Enter valid sender name"; SenderEmail empty -> "Enter valid sender email"; emails `notanemail`, `a@b`, `a b@example.com` -> the matching email message; a name of only spaces -> the matching name message. Plus: a body-less request lists all four messages.
- Steps:
  1. For each row: `POST /cart/addproduct/21/1`; then `cartsummary?cart=True` (counter 0, besides the control).
- Expected: `success:false`; the message list contains ONLY the message(s) of the changed field; nothing is added.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F3 (per-field failures).
- Notes: one test per row. Gate: yes.

### UC-CART-15: long gift card names and messages are accepted, an empty message is allowed
- Area: cart
- Type: boundary
- Endpoints: EP-CART-ADD-GIFTCARD, EP-CART-SUMMARY
- Preconditions: empty cart.
- Data: variants: 500-character RecipientName; 5000-character Message; empty Message.
- Steps:
  1. For each variant: `POST /cart/addproduct/21/1` with otherwise valid details, then `cartsummary?cart=True`.
- Expected: `success:true`; the counter grows by 1 each time (each variant has different details, so the lines do not merge, except that the empty-message variant equals none of the others).
- Evidence: qa/01-discovery/flows.md, cart-add Flow F3 (500-char name and 5000-char message accepted; Message empty OK).
- Notes: limits above 500 / 5000 were not probed: not asserted. Gate: yes.

### UC-CART-16: the two add endpoints answer in their own documented shapes
- Area: cart
- Type: contract
- Endpoints: EP-CART-ADD-PRODUCT, EP-CART-ADD-QUICK
- Preconditions: empty cart.
- Data: product 5 valid; quantity 0 (failure of the product-page add); product 99999999 (failure of the quick add).
- Steps:
  1. `POST /cart/addproduct/5/1` valid; `POST /cart/addproduct/5/1` with quantity 0.
  2. `POST /cart/addproductsimple/5?forceredirection=False`; `POST /cart/addproductsimple/99999999?forceredirection=False`.
- Expected: product-page add: success `{success:true}` (no `message`), failure `success:false` with `message` an ARRAY of strings. Quick add: success `{success:true, message:<string>}`, failure `success:false` with `message` an OBJECT with a `Text` field. `toMatchObject` (the body also has `$type`).
- Evidence: qa/01-discovery/SUMMARY.md, risk 4; flows.md cart-add Flow F1 and F2b.
- Notes: pins the inconsistency so a client that mixes the two notices it. Gate: yes.

### UC-CART-17: loading the product-page partials for a quantity does not change the cart
- Area: cart
- Type: state
- Endpoints: EP-CART-PRODUCT-DETAILS, EP-CART-SUMMARY
- Preconditions: empty cart (counter 0).
- Data: `productId=5`, `bundleItemId=0`, body `addtocart_5.AddToCart.EnteredQuantity=3`.
- Steps:
  1. `POST /product/updateproductdetails?productId=5&bundleItemId=0` with the body.
  2. `cartsummary?cart=True`; `GET /cart`.
  3. Control: `POST /cart/addproduct/5/1` quantity 1, `cartsummary?cart=True`.
- Expected: step 1: 200 with a JSON body; step 2: counter 0 and no lines; step 3: counter 1 (the control shows the counter is not blind).
- Evidence: qa/01-discovery/flows.md, cart-add Flow F2 (step 1 "no cart effect").
- Notes: bad product ids or bodies on this endpoint were not explored (open question 7). Gate: yes.

## Use cases: cart-view

### UC-CART-18: a fresh visitor sees an empty cart on every cart view
- Area: cart
- Type: state
- Endpoints: EP-CART-VIEW, EP-CART-OFFCANVAS, EP-CART-SUMMARY
- Preconditions: a new actor (new User-Agent, new jar).
- Data: none.
- Steps:
  1. `GET /cart`; `POST /shoppingcart/offcanvasshoppingcart`; `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True`.
  2. Control: add product 5, then `GET /cart` again.
- Expected: `GET /cart` contains "Your Shopping Cart is empty!" and no line; mini-cart contains "Shopping cart empty"; `CartItemsCount` 0. After the control add the cart page lists one line (so the empty text was not a blind parser).
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 2.
- Notes: Gate: yes.

### UC-CART-19: the cart counter is only filled when the request asks for it with cart=True
- Area: cart
- Type: contract
- Endpoints: EP-CART-SUMMARY
- Preconditions: cart with product 5 x2 (counter by `cart=True` is 2: positive control).
- Data: the three query variants.
- Steps:
  1. `POST /shoppingcart/cartsummary?cart=True`.
  2. `POST /shoppingcart/cartsummary` (no flags).
  3. `POST /shoppingcart/cartsummary?wishlist=True`.
  4. `GET /shoppingcart/cartsummary?cart=True`.
- Expected: step 1: `CartItemsCount` 2. Steps 2 and 3: `CartItemsCount` 0 although the cart is not empty (0 can mean "not asked"). Step 4: 404. Fields `CartItemsCount`, `WishlistItemsCount`, `CompareItemsCount` present (`toMatchObject`).
- Evidence: qa/01-discovery/SUMMARY.md, risk 3; flows.md cart-add Flow F4, cart-remove Flow 1 (step 3).
- Notes: finding: the naming/semantic of this counter is surprising (open question 28). Gate: yes.

### UC-CART-20: the mini-cart shows the added product and, when empty, says so
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-OFFCANVAS, EP-CART-ADD-PRODUCT
- Preconditions: empty cart.
- Data: product 4 (its name "Certina DS Podium Big Size" is the stable signal) or product 5 by name from the constants.
- Steps:
  1. `POST /shoppingcart/offcanvasshoppingcart`.
  2. `POST /cart/addproduct/4/1`; `POST /shoppingcart/offcanvasshoppingcart`.
- Expected: step 1: HTML containing "Shopping cart empty". Step 2: HTML containing the product name; no longer the empty text.
- Evidence: qa/01-discovery/flows.md, cart-add Flow F1 (step 2) and cart-remove Flow 2.
- Notes: assert on the name and the empty text only, not the whole fragment. Gate: yes.

## Use cases: cart-quantity

### UC-CART-21: setting a line to quantity 3 updates the line, the subtotal and the counter together
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: one line of product 5, quantity 1 (line id read from `GET /cart`; the parser saw the line).
- Data: `newQuantity=3&isCartPage=true&isWishlist=false`.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True` with the body.
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected: step 1: 200 `success:true`; `SubTotal` = 3 x 164.95 = $494.85 (computed from input, "excl tax" suffix tolerated); `newItemPrice` is the UNIT price $164.95. Step 2: the line has quantity 3, Subtotal $494.85, counter 3, the same line id (not renumbered).
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 2, Flow 4, Flow 5; cart-totals-shipping Flow 1.
- Notes: three independent views (update reply, cart page, counter) must agree (rule 2). Gate: yes.

### UC-CART-22: updating one line of a multi-line cart leaves the other lines intact and totals the whole cart
- Area: cart
- Type: state
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: lines: product 5 x1, product 3 x1, product 14 x1 (all three seen on `GET /cart`).
- Data: set product 3 to quantity 4.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id of product 3>` with `newQuantity=4`.
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected: `SubTotal` in the update reply = 164.95 + 4 x 269.00 + 29.95 = $1,270.90; the cart page agrees; the other two lines still have quantity 1; counter = 6 (sum of quantities).
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 5; cart-totals-shipping Flow 1 (mixed cart).
- Notes: Gate: yes.

### UC-CART-23: a line can be set to exactly 10000 units
- Area: cart
- Type: boundary
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-SUMMARY
- Preconditions: one line of the cheapest available product, quantity 1.
- Data: `newQuantity=10000`; product 5 until a cheaper id is known (see Needs more discovery).
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>` with `newQuantity=10000`.
  2. `cartsummary?cart=True`; `GET /cart`.
- Expected: `success:true`; `SubTotal` = 10000 x unit price (computed from the input); counter 10000; the line quantity 10000.
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4 (10000 -> success); SUMMARY.md, risk 11.
- Notes: Priority: low (only case with a large quantity that is accepted; the cart is never turned into an order). Fixture empties the cart. Gate: yes.

### UC-CART-24: quantities above 10000 are refused and the line keeps its quantity
- Area: cart
- Type: boundary
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: one line of product 5 with quantity 3 (proven: cart page and counter show 3).
- Data: table of `newQuantity`: `10001`, `100000`, `2147483647`.
- Steps:
  1. For each row: `POST /shoppingcart/updatecartitem?sciItemId=<id>` with the value.
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected: 200 `success:false`, message list contains "The maximum quantity allowed for purchase is 10000."; `SubTotal` in the reply still equals the old cart (3 x 164.95 = $494.85); line quantity 3 and counter 3 afterwards.
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4; cart-totals-shipping Flow 1 (failure replays).
- Notes: the 502 for `2147483648` and above is UC-CART-27. Gate: yes.

### UC-CART-25: a quantity padded with spaces is trimmed to the number
- Area: cart
- Type: boundary
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-SUMMARY
- Preconditions: one line of product 5, quantity 1.
- Data: `newQuantity=%204%20` (" 4 ").
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>` with the body.
  2. `cartsummary?cart=True`.
- Expected: `success:true`; counter 4; `SubTotal` = 4 x 164.95 = $659.80.
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4.
- Notes: Gate: yes.

### UC-CART-26: setting the quantity to zero or below deletes the line but answers HTTP 500 @known-issue
- Area: cart
- Type: negative
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: one line of product 5, quantity 2 (proven by the cart page).
- Data: table of `newQuantity`: `0`, `-2`.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>` with the value.
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected (stable facts only): the status is 500; the line is gone (no line on the cart page, counter 0, "Your Shopping Cart is empty!"). The error body text is not asserted.
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4; SUMMARY.md, risk 5 and Answer 5; ideas.md ("pin as @known-issue").
- Notes: tag `@known-issue`, annotation `issue`, own spec and project, outside the gate. Gate: no. The defect: a deletion that answers a server error. When the host fixes it (e.g. 200 or 400) the test goes red and tells us.

### UC-CART-27: malformed quantities on update answer a server error and leave the line unchanged @known-issue
- Area: cart
- Type: negative
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW
- Preconditions: one line of product 5, quantity 3.
- Data: table of `newQuantity`: `abc`, `2.5`, `1e2`, empty string, `2147483648`, and the parameter missing.
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>` with the value.
  2. `GET /cart`.
- Expected (stable facts only): the status is any 5xx (observed 502 HTML; it may come from the proxy); the line still has quantity 3 afterwards. The body and the exact 502 are not asserted.
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4; SUMMARY.md, risk 5 and Answer 5; open-questions.md 25.
- Notes: tag `@known-issue`; Gate: no. Same pattern as UC-CART-35 and UC-CART-51.

### UC-CART-28: updating a line id that is unknown or belongs to another visitor changes nothing
- Area: cart
- Type: security
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW
- Preconditions: actor A with one line of product 5 x2 (line id read from A's cart); actor B with one line of product 3 x1. Positive control: B's own update of its line to 3 succeeds.
- Data: A's line id used by B; unknown id `999999999`.
- Steps:
  1. B: `POST /shoppingcart/updatecartitem?sciItemId=<B's id>` with `newQuantity=3` (control).
  2. B: the same with A's line id and `newQuantity=9`.
  3. B: the same with `999999999`.
  4. A: `GET /cart`.
- Expected: step 1: `success:true`. Steps 2 and 3: the reply is NOT `success:true` (observed HTTP 500 with a JSON error; the status is not pinned here, see UC-CART-26 for the same defect family). A's line still has quantity 2 and B's line quantity 3 (the foreign id did not touch it either).
- Evidence: qa/01-discovery/flows.md, cart-quantity Flow 4 (unknown and foreign `sciItemId`); auth.md (Identity, item 4).
- Notes: Gate: yes (asserts the security fact, not the status code).

## Use cases: cart-remove

### UC-CART-29: removing one of three lines removes only that line and updates the subtotal
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW, EP-CART-SUMMARY
- Preconditions: lines product 5 x2, product 3 x1, product 14 x1 (line ids read from `GET /cart`).
- Data: remove the product 3 line.
- Steps:
  1. `POST /shoppingcart/deletecartitem?cartItemId=<id of product 3>` (empty body).
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected: step 1: 200, `success:true`, message "The product has been removed.", `cartItemCount` 2 (lines left). Step 2: two lines remain with their old ids and quantities; Subtotal = 2 x 164.95 + 29.95 = $359.85; counter 3 (quantities).
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 1.
- Notes: Gate: yes.

### UC-CART-30: removing the last line leaves a consistent empty cart
- Area: cart
- Type: state
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW, EP-CART-OFFCANVAS, EP-CART-SUMMARY
- Preconditions: one line of product 5 x1 (seen on the cart page).
- Data: none.
- Steps:
  1. `POST /shoppingcart/deletecartitem?cartItemId=<id>`.
  2. `GET /cart`; `POST /shoppingcart/offcanvasshoppingcart`; `cartsummary?cart=True`.
- Expected: step 1: `success:true`, `cartItemCount` 0. Step 2: "Your Shopping Cart is empty!", mini-cart "Shopping cart empty", counter 0 (three views agree).
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 2.
- Notes: Gate: yes.

### UC-CART-31: the delete reply counts lines while the cart counter sums quantities
- Area: cart
- Type: contract
- Endpoints: EP-CART-REMOVE, EP-CART-SUMMARY
- Preconditions: line product 5 x3 and line product 3 x1 (`cartsummary?cart=True` = 4: the quantities are summed).
- Data: remove the product 3 line, then the product 5 line.
- Steps:
  1. Delete the product 3 line; `cartsummary?cart=True`.
  2. Delete the product 5 line; `cartsummary?cart=True`.
- Expected: step 1: reply `cartItemCount` = 1 (lines left), counter `CartItemsCount` = 3 (quantities). Step 2: `cartItemCount` = 0, counter 0. Each number asserted by its own meaning.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 6; SUMMARY.md, risk 3 and Answer 6.
- Notes: the naming mismatch (`cartItemCount` vs `CartItemsCount`) is reported as a finding, not as a failure (open question 28). Gate: yes.

### UC-CART-32: removing a line twice succeeds the first time and fails with a message the second
- Area: cart
- Type: negative
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: lines product 5 and product 3 (ids known).
- Data: the product 5 line id removed twice.
- Steps:
  1. Delete the product 5 line (positive control: `success:true`).
  2. Delete the same id again.
  3. `GET /cart`.
- Expected: step 2: HTTP 200, `success:false`, message "An error occurred during the removal of the product.", no `cartItemCount`. Step 3: the product 3 line is untouched.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 3.
- Notes: Gate: yes.

### UC-CART-33: unknown, zero and negative line ids are refused and the cart is unchanged
- Area: cart
- Type: negative
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: one line of product 5 x1 (seen).
- Data: table of `cartItemId`: `999999999`, `0`, `-1`.
- Steps:
  1. For each row: `POST /shoppingcart/deletecartitem?cartItemId=<value>`.
  2. `GET /cart`.
- Expected: 200 `success:false`, message "An error occurred during the removal of the product."; the line still there. Positive control: a delete of the real id afterwards succeeds.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 3.
- Notes: Gate: yes.

### UC-CART-34: a visitor cannot remove a line that belongs to another visitor
- Area: cart
- Type: security
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: actor A with a line of product 5 x1; actor B with a line of product 3 x1; both ids read from their own cart.
- Data: A's line id sent by B; and by a brand-new third actor C (no line).
- Steps:
  1. B deletes its own line id (positive control: `success:true`); B adds it back.
  2. B: `POST /shoppingcart/deletecartitem?cartItemId=<A's id>`; C does the same.
  3. A: `GET /cart`.
- Expected: step 2: 200 `success:false`, "An error occurred during the removal of the product." for both B and C. Step 3: A's line is still there with quantity 1.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 5; auth.md (Identity, item 4).
- Notes: the control (rule 6) proves delete works on owned data. Gate: yes.

### UC-CART-35: a non-numeric or out-of-range line id on delete answers a server error and removes nothing @known-issue
- Area: cart
- Type: negative
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: one line of product 5 x1 (seen).
- Data: table of `cartItemId`: `abc`, empty, parameter missing, `99999999999`.
- Steps:
  1. For each row: `POST /shoppingcart/deletecartitem` with the value (empty body).
  2. `GET /cart`.
- Expected (stable facts only): the status is any 5xx (observed 502 text/html); the line is still on the cart page.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 4; SUMMARY.md, risk 5 and Answer 5.
- Notes: tag `@known-issue`; Gate: no.

### UC-CART-36: GET on the state-changing cart endpoints answers 404 and changes nothing
- Area: cart
- Type: negative
- Endpoints: EP-CART-REMOVE, EP-CART-UPDATE-ITEM, EP-CART-ADD-PRODUCT
- Preconditions: one line of product 5 x2 (seen).
- Data: table: `GET /shoppingcart/deletecartitem?cartItemId=<id>`; `GET /shoppingcart/updatecartitem?sciItemId=<id>&newQuantity=5`; `GET /cart/addproduct/3/1?addtocart_3.EnteredQuantity=1`.
- Steps:
  1. For each row send the GET.
  2. `GET /cart`; `cartsummary?cart=True`.
- Expected: 404 (not 405) for each; the cart is unchanged: one line, quantity 2, counter 2.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 4 (GET row), cart-quantity Flow 4 ("GET -> 404"), cart-add Flow F1; auth.md (CSRF / headers).
- Notes: Gate: yes.

### UC-CART-37: the line id may also be sent in the form body instead of the query
- Area: cart
- Type: contract
- Endpoints: EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: one line of product 5 x1 (seen).
- Data: body `cartItemId=<id>`, no query.
- Steps:
  1. `POST /shoppingcart/deletecartitem` with the body.
  2. `GET /cart`.
- Expected: `success:true`, "The product has been removed."; the line is gone.
- Evidence: qa/01-discovery/flows.md, cart-remove Flow 4 (last row), Flow 6.
- Notes: Priority: low (a characterization of model binding). Gate: yes.

## Use cases: cart-codes

Failure path only (decision 4). No valid discount or gift card code is known: the success path, the effect on totals and the removal of an applied code are NOT covered (see Needs more discovery). `POST /cart` is one multipart form; the button field selects the action. These answer HTTP 200 HTML with an `alert-danger` span, not JSON.

### UC-CART-38: invalid discount codes are refused with one generic message and the totals do not move
- Area: cart
- Type: negative
- Endpoints: EP-CART-APPLY-DISCOUNT, EP-CART-VIEW
- Preconditions: one line of product 5 x1 (id read from `GET /cart`); totals before: Subtotal $164.95, Total = Subtotal + Shipping + Tax (parsed).
- Data: table of `discountcouponcode`: empty, `NOSUCHCODE`, spaces only, a 300-character string with `<b>'"%;`, `BEARSTORE`, `WELCOME10`, `SAVE10`; fields `itemquantity<id>=1`, `applydiscountcouponcode=applydiscountcouponcode` (multipart).
- Steps:
  1. `POST /cart` with the fields.
  2. Read the totals table of the reply; `GET /cart`.
- Expected: 200 HTML containing the alert text "The coupon code you entered couldn't be applied to your order"; Subtotal still $164.95 (computed from input) and Total = Subtotal + Shipping + Tax; the line still has quantity 1.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 1.
- Notes: do not try codes beyond the table (no brute force). The three conventional codes are in the table as known rejections; if one ever becomes valid the case goes red and the success path can then be designed. Gate: yes.

### UC-CART-39: invalid gift card codes are refused with the same message and the totals do not move
- Area: cart
- Type: negative
- Endpoints: EP-CART-APPLY-GIFTCARD, EP-CART-VIEW
- Preconditions: one line of product 5 x1.
- Data: table of `giftcardcouponcode`: empty, `NOSUCH-GIFT-123`; button `applygiftcardcouponcode=applygiftcardcouponcode`.
- Steps:
  1. `POST /cart` (multipart) with the fields.
  2. Read the totals; `GET /cart`.
- Expected: 200 HTML with the alert "The coupon code you entered couldn't be applied to your order" (the text says coupon, not gift card: reported as a finding, still asserted as observed); totals unchanged; line unchanged.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 2; SUMMARY.md, risk 7.
- Notes: Gate: yes.

### UC-CART-40: posting code fields without any apply button does nothing
- Area: cart
- Type: negative
- Endpoints: EP-CART-APPLY-DISCOUNT, EP-CART-APPLY-GIFTCARD
- Preconditions: one line of product 5 x1. Control in the same test: the same request WITH the discount button yields the coupon alert (UC-CART-38), so "no alert" means "nothing was processed".
- Data: `giftcardcouponcode=X`, `discountcouponcode=Y`, no apply button field.
- Steps:
  1. `POST /cart` (multipart) with the fields.
  2. Read the totals.
- Expected: 200; the HTML has no `alert-danger` coupon text; totals unchanged. Control: with `applydiscountcouponcode` the alert text appears.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 3.
- Notes: Gate: yes.

### UC-CART-41: applying a discount code to an empty cart shows the empty-cart warning, not a coupon alert
- Area: cart
- Type: negative
- Endpoints: EP-CART-APPLY-DISCOUNT
- Preconditions: new actor, empty cart (proven: counter 0).
- Data: `discountcouponcode=NOSUCHCODE`, `applydiscountcouponcode=applydiscountcouponcode`.
- Steps:
  1. `POST /cart` (multipart).
- Expected: 200; the page contains "Your Shopping Cart is empty!" and does not contain the coupon alert text.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 3 (last row).
- Notes: Gate: yes.

### UC-CART-42: posting both apply buttons in one request answers HTTP 500 @known-issue
- Area: cart
- Type: negative
- Endpoints: EP-CART-APPLY-BOTH-BUTTONS
- Preconditions: one line of product 5 x1.
- Data: `discountcouponcode=A`, `giftcardcouponcode=B`, both `applydiscountcouponcode` and `applygiftcardcouponcode` buttons.
- Steps:
  1. `POST /cart` (multipart) with all fields.
  2. `GET /cart`.
- Expected (stable facts only): the status is 500 (observed: the default IIS runtime error page; body not asserted); the cart still has its line and its quantity.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 3; SUMMARY.md, risk 6 and Answer 5.
- Notes: tag `@known-issue`; Gate: no. A browser cannot send both buttons; this is a hand-made request.

### UC-CART-43: query-string code parameters on GET /cart are ignored
- Area: cart
- Type: contract
- Endpoints: EP-CART-VIEW
- Preconditions: one line of product 5 x1.
- Data: `GET /cart?discountcouponcode=X&applydiscountcouponcode=1`.
- Steps:
  1. The request; read the page.
- Expected: 200; no coupon alert; totals as before.
- Evidence: qa/01-discovery/flows.md, cart-codes Flow 3.
- Notes: Priority: low. Gate: yes.

## Use cases: cart-totals-shipping

### UC-CART-44: Subtotal is the sum of line totals and Total is Subtotal + Shipping + Tax
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-VIEW, EP-CART-ADD-PRODUCT
- Preconditions: lines product 5 x2, product 3 x1, product 14 x3 (all seen on the cart page).
- Data: unit prices from the constants: 164.95, 269.00, 29.95.
- Steps:
  1. `GET /cart`; parse each line total and the totals table (Subtotal, Shipping, Tax, Total).
- Expected: each line total = quantity x unit price (329.90, 269.00, 89.85); Subtotal = 688.75 (sum of the inputs, not copied from the page); Total = Subtotal + Shipping + Tax using the parsed Shipping and Tax values, whatever they are (no requirement that they are zero).
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 1 (observed arithmetic); SUMMARY.md, Answer 6.
- Notes: Gate: yes.

### UC-CART-45: the totals follow a quantity change and a removal
- Area: cart
- Type: state
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-REMOVE, EP-CART-VIEW
- Preconditions: lines product 5 x1 and product 3 x1; Subtotal $433.95 proven first.
- Data: set product 5 to 3; then remove product 3.
- Steps:
  1. Update, then `GET /cart` and read the totals.
  2. Delete the product 3 line, then `GET /cart` and read the totals.
- Expected: after step 1: Subtotal = 3 x 164.95 + 269.00 = $763.85 and Total = Subtotal + Shipping + Tax. After step 2: Subtotal = $494.85 and Total = Subtotal + Shipping + Tax.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 1 and Flow 6; cart-quantity Flow 5.
- Notes: Gate: yes.

### UC-CART-46: estimating shipping for a US destination lists the shipping options and leaves the totals consistent
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-ESTIMATE-SHIPPING, EP-CART-VIEW
- Preconditions: one line of product 5 x2.
- Data: `CountryId=1`, `StateProvinceId=0`, `ZipPostalCode=10001`, button `estimateshipping=Estimate shipping`, `itemquantity<id>=2` (multipart).
- Steps:
  1. `POST /cart` with the fields.
  2. Read the shipping block and the totals of the reply.
- Expected: 200 HTML; the success block lists the options "In-Store Pickup" and "By Ground" (names only; the amounts are read, not required to be zero); Total = Subtotal + Shipping + Tax; Subtotal $329.90.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2.
- Notes: Gate: yes.

### UC-CART-47: a shipping estimate is not stored
- Area: cart
- Type: state
- Endpoints: EP-CART-ESTIMATE-SHIPPING, EP-CART-VIEW
- Preconditions: one line of product 5 x1. Control: the estimate reply lists the options (UC-CART-46 signals).
- Data: `CountryId=1`, `ZipPostalCode=10001`.
- Steps:
  1. `POST /cart` with the estimate; confirm the options are listed.
  2. `GET /cart`.
- Expected: the second page shows "Enter your destination to get a shipping estimate" again and no option list.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2 (item 4).
- Notes: Gate: yes.

### UC-CART-48: the shipping estimate does not validate the destination fields (characterization)
- Area: cart
- Type: boundary
- Endpoints: EP-CART-ESTIMATE-SHIPPING
- Preconditions: one line of product 5 x1.
- Data: table: `CountryId` `0`, `99999`, missing; `ZipPostalCode` empty, `abc`; urlencoded instead of multipart.
- Steps:
  1. `POST /cart` with each variant (button `estimateshipping`).
- Expected: HTTP 200 and the same two options ("In-Store Pickup", "By Ground") for every row; Total = Subtotal + Shipping + Tax.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2 (replay).
- Notes: this pins what the host does today; no judgement whether it is right. Gate: yes.

### UC-CART-49: a non-numeric country is reported with a validation message
- Area: cart
- Type: negative
- Endpoints: EP-CART-ESTIMATE-SHIPPING
- Preconditions: one line of product 5 x1.
- Data: `CountryId=abc`, button `estimateshipping`.
- Steps:
  1. `POST /cart` (multipart).
- Expected: 200 HTML containing "The value 'abc' is not valid for 'Country'."
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2 (last sentence of the replay paragraph).
- Notes: Gate: yes.

### UC-CART-50: the states endpoint lists states for the US and a single "Other" entry for Germany
- Area: cart
- Type: contract
- Endpoints: EP-CART-STATES
- Preconditions: none (the endpoint does not need a cart).
- Data: `countryId=1` and `countryId=3`, `addEmptyStateIfRequired=true`.
- Steps:
  1. `GET /country/getstatesbycountryid?countryId=1&addEmptyStateIfRequired=true`.
  2. The same with `countryId=3`.
- Expected: step 1: 200 JSON array with more than one entry, each `{id, name}`, and an entry named "AA (Armed Forces Americas)" (the exact length 62 is not asserted). Step 2: exactly `[{id:0, name:"Other (Non US)"}]`.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2 (States endpoint replay).
- Notes: the US list is reference data and may grow; only its shape and one known entry are asserted. Gate: yes.

### UC-CART-51: the states endpoint answers a server error for non-numeric, unknown or missing country ids @known-issue
- Area: cart
- Type: negative
- Endpoints: EP-CART-STATES
- Preconditions: none.
- Data: table of `countryId`: `abc`, `99999`, parameter missing.
- Steps:
  1. `GET /country/getstatesbycountryid?countryId=<value>`.
- Expected (stable facts only): the status is any 5xx (observed 502 HTML).
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 2; SUMMARY.md, risk 5 and Answer 5.
- Notes: tag `@known-issue`; Gate: no.

### UC-CART-52: a gift-card-only cart needs no shipping and offers no estimate panel
- Area: cart
- Type: state
- Endpoints: EP-CART-ADD-GIFTCARD, EP-CART-VIEW, EP-CART-ESTIMATE-SHIPPING
- Preconditions: empty cart; add gift card 21 with quantity 2 and valid details.
- Data: product 21, quantity 2.
- Steps:
  1. Add the gift card; `GET /cart`; read the totals and look for the estimate panel.
  2. `POST /cart` with `estimateshipping` and `CountryId=1`.
- Expected: Shipping row text "Not required"; Subtotal $50.00 (2 x 25); Total = Subtotal + Tax (parsed); no "Estimate shipping" panel on the page. Step 2: still 200, the same page, still no panel and no option list.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 3.
- Notes: Gate: yes.

### UC-CART-53: a cart with a shippable product still shows the shipping row and the estimate panel
- Area: cart
- Type: state
- Endpoints: EP-CART-ADD-GIFTCARD, EP-CART-ADD-PRODUCT, EP-CART-VIEW
- Preconditions: lines gift card 21 x1 and product 5 x1.
- Data: none.
- Steps:
  1. `GET /cart`; read the totals and look for the estimate panel.
- Expected: the Shipping row is not "Not required" (it shows an amount; the value is not asserted); the "Estimate shipping" panel is present; Subtotal = 25.00 + 164.95 = $189.95; Total = Subtotal + Shipping + Tax. Contrast with UC-CART-52 shows that the gift card alone triggers "Not required".
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 3 (mixed cart).
- Notes: Gate: yes.

## Use cases: cart-currency

Lower priority (decision 7). The currency is kept per visitor on the server; the actor fixture resets it with `/changecurrency/1` in its `finally`. Conversion factors (GBP 0.61 and so on) are data and are NOT asserted.

### UC-CART-54: switching to GBP re-renders the cart in pounds and back to USD restores it
- Area: cart
- Type: happy-path
- Endpoints: EP-CART-CHANGE-CURRENCY, EP-CART-VIEW
- Preconditions: one line of product 5 x2, Subtotal $329.90 read first (USD).
- Data: `/changecurrency/2?returnUrl=%2fcart` (GBP), then `/changecurrency/1?returnUrl=%2fcart`; the request is sent without following redirects.
- Steps:
  1. `GET /changecurrency/2?returnUrl=%2fcart`.
  2. `GET /cart`.
  3. `GET /changecurrency/1?returnUrl=%2fcart`; `GET /cart`.
- Expected: step 1: 302 with `Location` `/cart`. Step 2: the totals carry the pound sign, the Subtotal is not the USD string, and Total = Subtotal + Shipping + Tax in the same currency. Step 3: 302; the totals are back to $329.90.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 4.
- Notes: Priority: low. Gate: yes.

### UC-CART-55: in a converted currency the subtotal equals the sum of the displayed line totals
- Area: cart
- Type: boundary
- Endpoints: EP-CART-CHANGE-CURRENCY, EP-CART-VIEW
- Preconditions: GBP selected; lines product 14 x1, product 5 x7 (quantity 7 to reach a cent difference), seen on the cart page.
- Data: displayed unit prices and line totals in GBP read from the page.
- Steps:
  1. Switch to GBP; `GET /cart`; read displayed unit prices, line totals and Subtotal.
- Expected: Subtotal = sum of the displayed line totals (exact, in cents); each displayed line total is within one cent of quantity x displayed unit price (unit price and line total are converted and rounded separately, so an exact match is NOT required); Total = Subtotal + Shipping + Tax.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 4 (Rounding).
- Notes: Priority: low. Computed from the displayed values, never from a conversion factor. Gate: yes.

### UC-CART-56: an unknown currency id leaves the currency unchanged and a non-numeric one is a 404
- Area: cart
- Type: negative
- Endpoints: EP-CART-CHANGE-CURRENCY, EP-CART-VIEW
- Preconditions: one line of product 5 x1; USD read first (proven).
- Data: `/changecurrency/99?returnUrl=%2fcart`; `/changecurrency/abc`.
- Steps:
  1. Request `/changecurrency/99?returnUrl=%2fcart` without following redirects; `GET /cart`.
  2. Request `/changecurrency/abc`.
- Expected: step 1: 302 to `/cart`, totals still in USD. Step 2: 404.
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 4 (Failure replays).
- Notes: Priority: low. Gate: yes.

### UC-CART-57: the currency switch does not redirect to an external returnUrl
- Area: cart
- Type: security
- Endpoints: EP-CART-CHANGE-CURRENCY
- Preconditions: none.
- Data: table: `returnUrl=https%3a%2f%2fexample.org%2f`; no `returnUrl`.
- Steps:
  1. `GET /changecurrency/1?returnUrl=...` without following redirects.
- Expected: 302 and the `Location` is `/` (relative), never the external URL (positive control: UC-CART-54 shows a local `returnUrl` is honoured).
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 4 (Failure replays).
- Notes: Priority: low. Currency 1 is used so no state needs resetting. Gate: yes.

### UC-CART-58: tier pricing on the basketball drops the unit price from the sixth unit
- Area: cart
- Type: boundary
- Endpoints: EP-CART-UPDATE-ITEM, EP-CART-VIEW
- Preconditions: one line of product 14 x1.
- Data: table of quantities and expected unit price: 5 -> $29.95, 6 -> $24.90, 7 -> $24.90 (tier constants live in the domain layer).
- Steps:
  1. `POST /shoppingcart/updatecartitem?sciItemId=<id>` with `newQuantity=<q>`.
  2. `GET /cart`.
- Expected: the reply's `newItemPrice` is the expected UNIT price; Subtotal = q x that unit price (149.75, 149.40, 174.30).
- Evidence: qa/01-discovery/flows.md, cart-totals-shipping Flow 1 (tier price); SUMMARY.md, risk 10.
- Notes: Priority: low. Data-dependent: the tier is seen for product 14 only (open question 22); if the catalog changes, update the constants. Gate: yes.

## Needs more discovery

- **Successful discount code and gift card code** (open questions 15, 16, 17): no valid code is known, so the success path, its effect on Subtotal/Total, the markup of an applied code and the control to remove it are NOT covered. The cases UC-CART-38 to 40 only cover failures. Needed: one test discount code and one test gift card code from the site owner.
- **Cheapest product id**: discovery saw a golf ball at $1.90 but not its product id. UC-CART-23 (quantity 10000) uses product 5 until it is known.
- **Non-zero shipping and tax**: all totals cases are written as Total = Subtotal + Shipping + Tax; no case drives a non-zero value (open question 20).
- **Mixed-case behaviours not observed**: whether posted `itemquantity<id>` also updates a line during apply/estimate (open question 19), the "-" button at quantity 1 (8), removal of a gift-card line or a line with attributes (13), a successful add with attributes (6), a different gift card Message alone (3), `X-Requested-With` on delete (12), and `updateproductdetails` failures (7).
- **Cart type 9, wishlist, compare**: out of scope; their effect on the cart counter is unknown (open question 1).
