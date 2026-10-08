# Discovery summary: cart (Bearstore / SmartStore)

Base URL: https://bearstore-testsite.smartbear.com/ . Scope: `cart`. Written by the orchestrator from the consolidator's report (the consolidator could not write files as a subagent); counts checked against `endpoints.json`.

## At a glance
- 1 area (cart), 5 units explored, none skipped by the user's choice: cart-add, cart-quantity, cart-remove, cart-codes, cart-totals-shipping. Every unit reported `headed: true`.
- Endpoints: 15 distinct (merged from 27 per-unit records), 15 verified by curl replay, 0 unverified. Two are verified on the failure path only (apply discount code, apply gift card code).
- Flows: 25 (one NOT OBSERVED: successful code apply; one static look only: the Checkout button).
- Open questions: 28 (`open-questions.md`). Risks: 12. Decisions: 7.

## Endpoint table
All anonymous. "State" means it changes server state. "Verified" means replayed with curl under a unique User-Agent.

| id | method | path | purpose | state | verified |
|---|---|---|---|---|---|
| EP-CART-ADD-QUICK | POST | `/cart/addproductsimple/{productId}?forceredirection=` | Quick add of 1 unit from a listing; quantity is ignored | yes | yes |
| EP-CART-ADD-PRODUCT | POST | `/cart/addproduct/{productId}/{cartTypeId}` | Add with a quantity (type 1 = cart, 2 = wishlist); same product merges into one line | yes | yes |
| EP-CART-ADD-GIFTCARD | POST | `/cart/addproduct/{productId}/{cartTypeId}` | Gift card with recipient and sender fields (same path, other body) | yes | yes |
| EP-CART-SUMMARY | POST | `/shoppingcart/cartsummary?cart=&wishlist=&compare=` | Header counters; `CartItemsCount` is the sum of quantities | no | yes |
| EP-CART-OFFCANVAS | POST | `/shoppingcart/offcanvasshoppingcart` | Mini-cart HTML | no | yes |
| EP-CART-PRODUCT-DETAILS | POST | `/product/updateproductdetails` | Product page partials; no cart effect | no | yes |
| EP-CART-VIEW | GET | `/cart` | Cart HTML with line ids and the totals table | no | yes |
| EP-CART-REMOVE | POST | `/shoppingcart/deletecartitem?cartItemId=` | Remove a line; `cartItemCount` is a LINE count | yes | yes |
| EP-CART-UPDATE-ITEM | POST | `/shoppingcart/updatecartitem?sciItemId=` | Set quantity (1..10000) | yes | yes |
| EP-CART-APPLY-DISCOUNT | POST | `/cart` (button `applydiscountcouponcode`) | Apply a discount code; answers HTML | yes | failure path only |
| EP-CART-APPLY-GIFTCARD | POST | `/cart` (button `applygiftcardcouponcode`) | Apply a gift card code | yes | failure path only |
| EP-CART-APPLY-BOTH-BUTTONS | POST | `/cart` | Malformed variant, answers HTTP 500 | no | yes |
| EP-CART-ESTIMATE-SHIPPING | POST | `/cart` (button `estimateshipping`) | Shipping estimate; HTML page, not stored | no | yes |
| EP-CART-STATES | GET | `/country/getstatesbycountryid?countryId=` | States list | no | yes |
| EP-CART-CHANGE-CURRENCY | GET | `/changecurrency/{currencyId}?returnUrl=` | Switch currency (1 USD, 2 GBP, 3 AUD, 4 CAD); 302; kept per visitor | yes | yes |

## Auth model
- No login in scope. All 15 endpoints work anonymously with a cookie jar holding `SMARTSTORE.VISITOR` and `ASP.NET_SessionId`.
- The guest cart is keyed by IP + User-Agent, not by the cookie.
- No CSRF or anti-forgery token anywhere. `X-Requested-With` is not required for add, update and `POST /cart` (untested for delete).
- A body-less POST needs an empty body, otherwise HTTP 411.
- Line ids are global increasing integers, scoped to the caller's cart.

## Risks and surprises
1. Isolation by IP + User-Agent is broken by parallel headed browsers. cart-remove, cart-quantity and cart-totals-shipping reopened their browser with a unique User-Agent; cart-add and cart-codes stayed on the default one. cart-codes' browser cart held lines that cart-add lists as its own, and its own line vanished. Browser-side counts and lines from default-User-Agent sessions are unreliable; every endpoint shape was replayed by curl under a unique User-Agent, so the endpoint table does not depend on them.
2. Cookie versus User-Agent is unresolved (one unit saw identical `SMARTSTORE.VISITOR` values, another saw different values and still a shared cart). Both agree a unique User-Agent separates carts.
3. Counters disagree: the delete response `cartItemCount` counts lines, `cartsummary.CartItemsCount` sums quantities. `cartsummary` returns 0 unless `cart=True` is sent, so 0 can mean "empty" or "not asked".
4. Two add endpoints, two shapes: quick add returns `{success, message}` (object message on failure, `{redirect}` for gift cards and products with required attributes); the product-page add returns only `{success:true}`, string-array messages on failure, and `{redirect:"/"}` for an unknown product. The 10000 limit is cumulative per line.
5. Inconsistent error handling: `updatecartitem` with quantity <= 0 deletes the line but answers HTTP 500 (same as an unknown or foreign line id); `deletecartitem` with an unknown, removed or foreign id answers 200 `success:false`; non-numeric or out-of-range numbers give 502 HTML on `updatecartitem`, `deletecartitem` and `getstatesbycountryid`, while the add endpoint answers 200 `success:false`.
6. "Business failures are HTTP 200 + success:false" has exceptions: coupon and gift card failures are HTML (an `alert-danger` span); some add paths return `{redirect}`; estimate shipping with `CountryId=abc` returns 200 with a validation message; both apply buttons at once give 500.
7. Codes: the success path was never observed. One generic failure text for every input ("The coupon code you entered couldn't be applied to your order"), also for gift cards. No valid code is public; BEARSTORE, WELCOME10 and SAVE10 were rejected, with no brute force.
8. Shipping and tax were $0.00 in every case seen, so Total == Subtotal. Estimate shipping returns the same two options for every country (even 0, 99999 or missing) and the estimate is not stored. A gift-card-only cart shows Shipping "Not required".
9. `POST /cart` is one multiplexed form: the submit-button name selects apply discount, apply gift card, estimate shipping or checkout. Whether posted quantities also update lines is untested.
10. Data-dependent values: line ids change between runs; product 14 has a tier price ($29.95 up to quantity 5, $24.90 from 6); currency conversion rounds unit price and line total separately (can differ by one cent); AUD and CAD both print "$"; the currency persists per visitor and must be reset with `/changecurrency/1`.
11. Extreme quantities are accepted (10000 x Certina is $4,790,000.00) and Checkout stays enabled. Use cheap products when pushing quantities.
12. Gift cards and wishlist: identical recipient/sender/message details merge into one line, a different RecipientName makes a new line; names accept 500 characters, messages 5000; cart type 2 on the add endpoint adds to the wishlist, type 9 answers `success:true` with no visible effect.

## Not explored
- Excluded by scope: wishlist, compare, checkout, auth (login/registration), catalog browse and search, reviews, contact, newsletter, content pages.
- Reached but not completed: a successful code apply and its removal; the Checkout button (static look only); non-zero shipping or tax; logged-in totals; gift cards other than id 21; products with required attributes (failure only); stock limits below 10000 (3 products tried); tier prices beyond product 14; `X-Requested-With` on delete; the "-" button at quantity 1.

## Decisions needed from you
1. Give every headed discovery browser its own User-Agent? Recommend yes: make it an orchestration rule (a per-unit `--config` with `contextOptions.userAgent`, or `setExtraHTTPHeaders` right after `open`), and keep the kit rule of a unique User-Agent plus own cookie jar per test actor.
2. Accept this discovery as it stands, or re-run cart-add and cart-codes? Recommend accept: their shapes were confirmed by curl; only their browser-side counts are to be ignored.
3. What to do about the leftover default-User-Agent guest cart? Recommend leave it, make sure no test uses the default User-Agent, and optionally have a human check and clear `/cart` and `/wishlist` once.
4. Codes: get valid ones, or test the failure path only? Recommend asking the site owner for one test discount code and one gift card code; until then plan failure-path use cases only and mark the success path as not covered.
5. Treat the HTTP 500 and 502 behaviours as defects or as specified? Recommend known-issue characterization tests tagged `@known-issue`, in a project outside the pass/fail gate, asserting only what is stable (status 500 plus the line gone for quantity 0; any 5xx for malformed input, since the 502 may come from the proxy).
6. How to assert counters and totals? Recommend asserting each counter by its own endpoint's meaning, always with `cart=True`, and reporting the naming mismatch as a finding; assert Total = Subtotal + Shipping + Tax with `toMatchObject` (the `$type` field), without requiring shipping or tax to be zero.
7. Scope for the next stages? Recommend including currency/rounding and tier price as lower-priority use cases, gift card validation as a normal use case, keeping wishlist, compare and checkout excluded, and keeping quantities cheap.

## State left behind
- Shared default-User-Agent guest cart: contents unknown. Possibly a Certina line (last seen x3); cart-quantity added one it could not remove; a "Wish List 3" counter was seen once.
- Own carts (unique User-Agent: curl jars and reopened browsers): all empty at the end, per each unit. No code was ever applied. Currency reset to USD.
- On the host: visitor records cannot be undone. No orders, accounts, newsletter or checkout. Gift card details used placeholder addresses only.
- Local files: cookie jars and scratch files under `/tmp` (no secrets); `.playwright-cli/` in the kit directory; helper files inside the unit folders.

## Answers
General: all recommendations accepted ("proceed with your suggestions").
1. Yes: unique User-Agent per headed browser and per test actor.
2. Accept the discovery as it stands.
3. Leave the shared default-User-Agent cart; no test uses the default User-Agent.
4. Failure-path code use cases only for now; success path marked not covered.
5. Known-issue characterization tests (`@known-issue`), outside the pass/fail gate.
6. Each counter asserted by its own endpoint's meaning, with `cart=True`; Total = Subtotal + Shipping + Tax via `toMatchObject`.
7. Include currency/rounding and tier price at lower priority and gift card validation as a normal use case; wishlist, compare and checkout stay excluded; cheap quantities.
