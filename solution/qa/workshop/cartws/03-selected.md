# Selected use cases - cart manipulation (workshop run cartws)

Input: `qa/workshop/cartws/02-use-cases.md` (12 UCs) and `qa/workshop/cartws/01-discovery/`. Limit: at most 6 tests (workshop: about 15 min to write, 10 min to debug).

## Decision brief

**Recommendation.** The six selected cases protect the core of guest cart manipulation: adding a product, quantity accumulation on one line, recalculated totals after an update, removing lines down to an empty cart, and ownership of line ids. Two of them pin known issues together with their side effect (KI-1 and KI-3). The selection deliberately leaves out the live-stock boundary (UC-CARTWS-05), the 10000 maximum, invalid-add validation, the 502 cases, the two-product mini-cart view and the wishlist move.

### Selected table
| UC ID | Area | What it proves | Priority score | Layer-specific cost |
|---|---|---|---|---|
| UC-CARTWS-01 | cart / add | Guest cookie, add endpoint, header counter and cart page agree on one line (qty 1, $1.90) | 8.00 | S |
| UC-CARTWS-04 | cart / update | Update recalculates line total, SubTotal and counter (qty 5, $9.50); line id stays stable | 5.67 | S |
| UC-CARTWS-02 | cart / add | Repeat adds accumulate on ONE line; counter is a quantity sum (4), not a line count | 4.67 | S |
| UC-CARTWS-10 | cart / remove | Delete one line at a time down to an empty cart (cart page, counter, mini-cart) | 3.75 | M |
| UC-CARTWS-08 | cart / update | KI-1 pinned: qty 0 or -1 answers 500 but the line IS removed; side effect asserted | 2.60 | M |
| UC-CARTWS-11 | cart / remove | Unknown, repeated and foreign line ids are rejected, a foreign cart is untouched; KI-3 pinned (update 500) | 2.33 | L (M if trimmed, see risks) |

Spread: add 2 (01, 02), update 2 (04, 08), remove 2 (10, 11). Types: happy-path 2, state 2, boundary 1, negative 1.

### Scoring criteria
Each factor is scored 1-5. Priority = (Impact * 2 + Likelihood + Coverage value) / (Cost + Stability risk).
- Impact: business damage if this breaks (cart add, totals and remove outrank peripheral views).
- Likelihood: chance of breaking (validation logic, buggy endpoints, live data).
- Coverage value: how much else it implicitly proves.
- Cost: effort to automate and maintain, including data and cleanup (5 = expensive).
- Stability risk: flakiness chance (live stock, 502s, shared state) (5 = flaky).
- Tie-break: lower stability risk first, then higher impact. Workshop preferences applied on top of the score: spread across add / update / remove, and known issues with a pinned side effect.

### Coverage per area
| Area | Selected / total | Residual risk |
|---|---|---|
| cart | 6 / 12 | Thin spots: stock boundary 8563/8564 and 10000/10001 messages (UC-05, UC-06) unprotected; invalid add input, unknown product and cartType 99 (UC-07) unprotected; the 502 behaviour for garbage quantity (UC-09, KI-2) unprotected; two-product mini-cart and totals agreement (UC-03) only partly covered through UC-01, 02, 10; wishlist move and back (UC-12) not covered at all. |

Only one area exists in this run, so the "every high-impact area has a case" rule is met by add, update and remove all being represented.

### Effort and prerequisites
- Tally: 3 x S + 2 x M + 1 x L (about 2 min per S, 3 per M, 5 per L, so roughly 15 min, which is the full writing budget). If time runs short, trim UC-11 to M by dropping step 6 and the repeated delete in step 4.
- Test data: none to create; anonymous guest carts, no credentials. Products 8 (Supreme Golfball, $1.90) and, for UC-10 only, product 1 (price read from `/cart`, not hardcoded).
- Environment: network access to https://bearstore-testsite.smartbear.com. Every test needs its own `request.newContext` with a unique User-Agent (decision 1 in discovery), otherwise guest carts are shared.
- No orders, no checkout, no accounts.

### Flakiness risks
- UC-CARTWS-05 (deferred) depends on live stock of product 8 (8563) and could drift; that is the main reason it is not selected. UC-04 and UC-02 use only small quantities (up to 5), so they do not depend on stock.
- UC-CARTWS-11 needs two contexts with different User-Agents; if the site keys the guest cart by IP + User-Agent only, a collision would make the ownership check meaningless (open-questions Q14). Mitigation: assert idA != idB and that A's cart page never lists idB.
- UC-CARTWS-10 uses product 1 (about $24,110); do not assert its price, only line ids and counters. Do not assert `cartItemCount` after the first delete (undocumented).
- UC-CARTWS-08 and UC-11 pin 500 responses; the app is a shared test site, so a deploy that fixes KI-1 or KI-3 will fail them by design (that is the point, but do not "relax" silently).
- Shared test site: all calls hit the live host; occasional network or ALB errors are possible. No 502 cases are selected, which avoids the known ALB instability (Q5).

### Decisions for the human
1. Swap UC-CARTWS-05 (stock boundary, listed P1 in the use-case file) for UC-CARTWS-08 (KI-1, listed P2)? Recommend yes (keep 08). Score 2.60 vs 2.33, no dependence on live stock, and it pins a real defect with its side effect. If you prefer the original P1 list, replace 08 with 05 and use the probe fallback (send 10000, read the stock from the message, then assert N accepted / N+1 rejected).
2. Keep UC-CARTWS-11 (largest, L) in the six or replace it with UC-CARTWS-05? Recommend keep, trimmed to M if the clock is tight; it is the only test for removal failures and ownership, and it is deterministic if the two User-Agents differ.
3. Put the tests in `tests/cart.api.spec.ts` (convention) or `tests/cartws.api.spec.ts` to avoid colliding with the other QA run that uses the default root? Recommend `tests/cartws.api.spec.ts` for the workshop, merge later.
4. Assert the exact buggy status (500) for KI-1 and KI-3, as use cases already state (discovery decision 2)? Recommend yes, with a `KI-1` / `KI-3` tag in the test title.

---

## 1. Scoring table (all 12 use cases, sorted by priority)

Priority = (Impact * 2 + Likelihood + Coverage) / (Cost + Stability).

| Rank | UC | Title (short) | I | L | C | Cost | Stab | Arithmetic | Priority |
|---|---|---|---|---|---|---|---|---|---|
| 1 | UC-CARTWS-01 | Add one product to empty cart | 5 | 2 | 4 | 1 | 1 | (5*2 + 2 + 4) / (1 + 1) = 16 / 2 | 8.00 |
| 2 | UC-CARTWS-04 | Change quantity, totals recalculated | 5 | 3 | 4 | 2 | 1 | (5*2 + 3 + 4) / (2 + 1) = 17 / 3 | 5.67 |
| 3 | UC-CARTWS-02 | Repeat adds accumulate on one line | 4 | 3 | 3 | 2 | 1 | (4*2 + 3 + 3) / (2 + 1) = 14 / 3 | 4.67 |
| 4 | UC-CARTWS-10 | Remove lines one by one to empty | 5 | 2 | 3 | 3 | 1 | (5*2 + 2 + 3) / (3 + 1) = 15 / 4 | 3.75 |
| 5 | UC-CARTWS-08 | Update to qty 0/negative: 500, line removed (KI-1) | 3 | 5 | 2 | 3 | 2 | (3*2 + 5 + 2) / (3 + 2) = 13 / 5 | 2.60 |
| 6 | UC-CARTWS-11 | Unknown/repeated/foreign line id (KI-3) | 4 | 4 | 2 | 4 | 2 | (4*2 + 4 + 2) / (4 + 2) = 14 / 6 | 2.33 |
| 7 | UC-CARTWS-05 | Update at stock boundary 8563/8564 | 4 | 4 | 2 | 2 | 4 | (4*2 + 4 + 2) / (2 + 4) = 14 / 6 | 2.33 |
| 8 | UC-CARTWS-07 | Add rejects invalid qty/product/cartType | 3 | 3 | 1 | 3 | 2 | (3*2 + 3 + 1) / (3 + 2) = 10 / 5 | 2.00 |
| 9 | UC-CARTWS-06 | Update above max 10000/10001 | 3 | 3 | 1 | 2 | 3 | (3*2 + 3 + 1) / (2 + 3) = 10 / 5 | 2.00 |
| 10 | UC-CARTWS-03 | Two lines: mini-cart, counter, totals agree | 3 | 3 | 3 | 3 | 3 | (3*2 + 3 + 3) / (3 + 3) = 12 / 6 | 2.00 |
| 11 | UC-CARTWS-09 | Update garbage qty: 502, unchanged (KI-2) | 2 | 4 | 1 | 2 | 4 | (2*2 + 4 + 1) / (2 + 4) = 9 / 6 | 1.50 |
| 12 | UC-CARTWS-12 | Move to wishlist and back | 2 | 3 | 1 | 4 | 2 | (2*2 + 3 + 1) / (4 + 2) = 8 / 6 | 1.33 |

Ties: ranks 6/7 (2.33) and 8/9/10 (2.00) resolved by lower stability risk, then higher impact.

Rationale for the less obvious scores:
- UC-01/04: the add and update calls gate every other cart test and money display, so Impact 5 and Coverage 4. Both are one context, one product, small data, deterministic.
- UC-05: Stability 4 because stock 8563 is live inventory; Likelihood 4 because it is a validation rule with two different messages.
- UC-08: Likelihood 5 because the endpoint is demonstrably buggy (500 although the line is removed).
- UC-09: Stability 4 because the 502 comes from the AWS load balancer (unhandled exception) and may affect other visitors (Q5); Impact 2 because no state is damaged.
- UC-11: Cost 4 because it needs two contexts and about six calls with line-id bookkeeping.
- UC-03: Stability 3 because it relies on product 1's price (about $24,110, read at runtime) and on tax/shipping staying at $0.00.

## 2. Selected for automation (6)

1. UC-CARTWS-01 - Cheapest and highest score: proves the guest cookie, add endpoint, header counter and cart page all agree, and every other cart test builds on it.
2. UC-CARTWS-04 - The only happy-path update: proves quantity change recalculates line total, SubTotal and counter (qty 5, $9.50) with a stable line id.
3. UC-CARTWS-02 - Pins the key add rule that repeat adds merge into ONE line and that the counter is a quantity sum, a likely regression point.
4. UC-CARTWS-10 - The happy-path removal flow: deleting two lines one by one ends in a consistent empty cart on page, counter and mini-cart.
5. UC-CARTWS-08 - Known issue KI-1 pinned with its side effect (HTTP 500 while the line is removed); deterministic and exposes real behaviour.
6. UC-CARTWS-11 - Covers removal failures and ownership (foreign cart untouched), with KI-3 pinned (update answers 500); the only negative case in the set.

## 3. Deferred

| UC | Reason |
|---|---|
| UC-CARTWS-05 | Needs stock of product 8 to stay at 8563 (live inventory, Stab 4). First reserve; use the probe fallback if promoted. |
| UC-CARTWS-07 | Low coverage value, many calls (nine-plus requests incl. 404s); step 5 (cartType 99) pins an undocumented behaviour. Good next test if time remains. |
| UC-CARTWS-06 | Also depends on product 8 stock (the 10000 step returns the stock message); only partial value beyond UC-05. |
| UC-CARTWS-03 | Mostly redundant with UC-01/02/10 for counters; adds product 1 price dependency and the Total == Subtotal assumption. |
| UC-CARTWS-09 | KI-2 502s come from the load balancer, flaky risk and possible effect on other visitors (Q5); low impact because nothing changes. |
| UC-CARTWS-12 | LOW priority bonus; wishlist move is peripheral, line ids change on every move, qty > 1 behaviour unknown (Q10). |

## 4. Suite design notes

Spec file: `tests/cartws.api.spec.ts` (workshop run; `tests/cart.api.spec.ts` if the human prefers the convention, see decision 3). Test titles start with the UC id, for example `UC-CARTWS-08: update to quantity 0 returns 500 but removes the line (KI-1)`. Add the mapping to `qa/workshop/cartws/04-coverage.md` later.

Shared helpers in `tests/support/` (suggest one file, `tests/support/guest-cart.ts`):
- `newGuestContext(playwright, uc)`: `request.newContext({ baseURL, userAgent: 'qa-cartws-<uc>-<random>' })` and `GET /` to obtain `SMARTSTORE.VISITOR`; returns the context. Disposed at the end of each test.
- `addProduct(ctx, productId, qty)`: `POST /cart/addproduct/<id>/1` with form `addtocart_<id>.EnteredQuantity=<qty>` and header `X-Requested-With: XMLHttpRequest`; returns parsed JSON.
- `readCartLines(ctx)`: `GET /cart`, parse `itemquantity<id>` inputs (value) and `cartItemId=<id>` links into `{id, quantity}[]`; plus `lineTotal`/subtotal parsing of `$X excl tax` text into numbers. Never assert the text "Your Shopping Cart is empty!".
- `cartCount(ctx)`: `POST /shoppingcart/cartsummary?cart=True` with `data: ''`, returns `CartItemsCount`.
- `updateQuantity(ctx, id, qty)`: `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True`, form `newQuantity=<qty>&isCartPage=true&isWishlist=false`, with the XHR header; returns `{status, json}`.
- `deleteLine(ctx, id)`: `POST /shoppingcart/deletecartitem?cartItemId=<id>`, `data: ''`.
- `cleanupCart(ctx)`: best-effort delete of remaining lines then `ctx.dispose()`; swallows errors so a failed cleanup never fails a test.
- `parseMoney(text)`: `"$1,234.50 excl tax"` to number.

Test-data requirements:
- Product 8 (Supreme Golfball, $1.90) for all six; product 1 only in UC-10 (price read at runtime). No credentials, no orders, no seeded data.
- One context per test; UC-11 uses two contexts with different User-Agents.
- Line ids are never hardcoded; always read from `/cart`.
- Every mutating POST without a body sends `data: ''` (otherwise IIS answers 411) and the `X-Requested-With: XMLHttpRequest` header.

Execution notes:
- Run the six tests in parallel-safe mode (independent contexts), single worker is also fine for the demo.
- For KI tests, assert both the status (500) and the side effect (line gone / cart unchanged); on a status change the failure message should point at the known issue rather than relax the assertion.

## Issues for the human
- UC-CARTWS-08 is P2 and UC-CARTWS-05 is P1 in `02-use-cases.md`; this selection promotes 08 over 05 on score and stability grounds (decision 1). The use-case file itself is unchanged.
- UC-CARTWS-11 is labelled P1 but is the most expensive case (two contexts); decision 2 covers trimming.
- UC-CARTWS-11 depends on open question Q14 (guest cart keying by User-Agent); the discovery evidence only shows that unique User-Agents with curl jars were deterministic, not that two Playwright contexts on the same IP are always separated.
- UC-CARTWS-10 step 1 expects the message "The product has been removed." while UC-11 step 4 expects a generic error text; both were taken from discovery and not re-verified here.
- The 12 use cases include no case for the product page `EP-CART-PRODUCT-PAGE` by design (as stated in the file).
