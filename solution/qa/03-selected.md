# Selected use cases: cart (Bearstore / SmartStore), stage 3

Input: `qa/02-use-cases.md` (58 use cases, UC-CART-01 .. 58), `qa/01-discovery/SUMMARY.md` (incl. Answers), `qa/01-discovery/ideas.md`. At Gate 2 the user cut the earlier proposal of 33 use cases down to exactly 5: "limit our use cases to the 5 most critical ones, and make sure cart manipulation is covered". The selection below is that final decision; the scores of all 58 use cases are kept unchanged as evidence, so more cases can be added later.

## Decision brief

**Recommendation.** Automate exactly 5 of the 58 use cases: the isolation gate (UC-CART-01) and the three cart manipulations, each with state and cross-view checks: add (UC-CART-02) and merge (UC-CART-03), change quantity (UC-CART-21) and remove (UC-CART-29). Together they protect the core money path (a visitor puts products in the cart, changes a quantity, removes a line, and the line, subtotal and counters agree each time) and make the actor isolation provable; they deliberately leave out all input validation and limits, the 5xx known issues, line ownership beyond the gate, discount and gift card codes, the totals formula with shipping and tax, shipping estimate, currency and reference data (53 use cases, deferred by user decision: limit to 5).

### Selected use cases

Cost = layer-specific effort to automate and maintain (S: one API call plus an actor verb and one matcher; M: needs parsing of the cart page or several steps; L: two or more actors with positive controls). Priority = (2 x Impact + Likelihood + Coverage value) / (Cost + Stability risk), arithmetic in the scoring table below. The five were chosen by the user at Gate 2 (they are not simply the top five by score: UC-CART-01 ranks 13th and UC-CART-29 ranks 9th, and are kept because of the gate and because remove must be covered).

| UC ID | Area / unit | What it proves | Priority | Cost |
|---|---|---|---|---|
| UC-CART-01 | cart-isolation | Two guest actors (own User-Agent and jar) never see or delete each other's cart: the GATE, runs first, prerequisite for every other test | 3.80 | M |
| UC-CART-02 | cart-add | Adding 3 units from the product page gives one line of quantity 3, line total and subtotal 3 x unit price, counter 3 | 8.00 | S |
| UC-CART-03 | cart-add | Adding the same product twice merges into one line (same line id, quantity 5, counter 5, subtotal 5 x unit price) | 5.67 | S |
| UC-CART-21 | cart-quantity | Setting a quantity updates the line, the subtotal and the counter together (three views agree, same line id) | 6.00 | S |
| UC-CART-29 | cart-remove | Removing one of three lines removes only that line; the other two keep id and quantity, subtotal and counters follow | 4.25 | M |

Why these five: add, change quantity and remove are all covered (cart manipulation), each with a state check after the call and a cross-check of two or three independent views (rules 2, 3 and 5 of `.claude/rules/assertion-rules.md`: counter against cart page against computed subtotal, expected values computed from the input, state read after the call). UC-CART-01 makes the actor isolation provable (rules 4, 6 and 8): without it no result on a shared host is trustworthy.

### Coverage per area and unit

All use cases share the area `cart`; the units are its capabilities. Selected 5 of 58 (9 percent).

| Area / unit | Selected / total | Residual risk of what is left out |
|---|---|---|
| cart-isolation | 1 / 1 | None: it is the gate. Step 3 also proves that B cannot delete A's line, so the delete half of line ownership has one test. |
| cart-add | 2 / 16 | MEDIUM to HIGH for edge cases: the happy path and the merge are proven for one product (5) only. Not asserted: invalid quantities (UC-06), the 10000 maximum (UC-07), trimming (UC-08), quick add (UC-04), several products (UC-05), unknown ids and GET (UC-09), required attributes (UC-10), gift cards (UC-12 to 15), the response shapes (UC-16). A regression in validation would pass unnoticed. |
| cart-view | 0 / 3 | Medium: the empty cart, the mini-cart and the `cart=True` counter semantics have no test of their own; the cart page and counter are used as views inside the selected cases, so a break would show up there, but not as a targeted failure. |
| cart-quantity | 1 / 8 | MEDIUM to HIGH: only the successful update of a single line is proven. Not asserted: update in a multi-line cart (UC-22), limit above 10000 (UC-24), quantity 0 or malformed (UC-26, 27: HTTP 500 known issues), foreign or unknown line id (UC-28), trimming (UC-25). |
| cart-remove | 1 / 9 | MEDIUM to HIGH: the removal of one of three lines is proven. Not asserted: removing the last line (UC-30), the line-vs-quantity counter naming as a rule of its own (UC-31, partly seen in UC-29), twice (UC-32), refused ids (UC-33), foreign line (UC-34, only the gate covers one case), malformed ids (UC-35, known issue), GET methods (UC-36). |
| cart-codes | 0 / 6 | HIGH: no discount or gift card code behaviour is tested, neither the failure path nor the success path (the latter is also a gap: no valid code is known). |
| cart-totals-shipping | 0 / 10 | HIGH for the formula: the subtotal is asserted from the input in all four manipulation cases, but Total = Subtotal + Shipping + Tax (UC-44), totals after a change (UC-45), shipping estimate, gift-card-only shipping, states and tier price are not. Shipping and tax were always $0.00 in discovery, so a non-zero value would not be seen anyway. |
| cart-currency | 0 / 5 | HIGH: conversion, rounding, invalid ids and the external `returnUrl` redirect (UC-57, the one security check of the unit) are not tested. All tests run in the default currency. |

### Estimated effort

- Tally of the selection: 3 x S (UC-CART-02, 03, 21), 2 x M (UC-CART-01, 29), 0 x L (5 use cases). One test each, so about 5 Playwright tests and about 50 HTTP requests per full run on the shared host, 2 workers and no retries.
- Plus the one-off bootstrap of the layered framework, small for this selection: `src/config/env.ts`, `src/api` (add product, cart summary, cart view, update item, delete item), `src/domain` (product ids and prices of 5, 3 and 14, the cart page parser, the money parser, `userAgentFor`), `src/actors` (one `GuestActor` with `adds`, `updatesQuantity`, `removes`, `seesLines`, `seesCounter`, `seesTotals`), `src/matchers` (`toHaveLine`, `toHaveNoLine`, `toHaveCounter`, `toBeRejectedWith`), `src/fixtures`. Two Playwright projects: `gate` for UC-01 and `cart` (`dependencies: ['gate']`) for the other four. No `known-issue` project is needed: no `@known-issue` case is selected.
- Prerequisites: `npm install` once; no credentials, no `.env` needed (guest only); network access to the host; products 5, 3 and 14 exist with the prices of discovery (164.95, 269.00, 29.95) kept as constants in `src/domain`; every actor has its own unique User-Agent, own jar, own cart, emptied in the fixture's `finally`. No test data needs to be created on the host (no orders, no accounts).

### Decisions for the human

1. **Is a selection of exactly 5 use cases (about 5 tests, one small writer call) final?** Recommend: yes for the first run. It is the cheapest set that proves isolation, add, change and remove. If the bootstrap proves cheap, add the next five by score (UC-CART-06, 24, 30, 04, 05, about 16 tests once the data tables are expanded), see "Next five to add" below.
2. **Keep UC-CART-01 (score 3.80, rank 13) as one of the 5?** Recommend: yes. It is the gate: it costs M but makes the other four results trustworthy on a shared host (every actor keyed by IP + User-Agent). Say no only if you accept that a failing result might be the host mixing carts. Replacing it by the next-best case (UC-CART-30, 4.67) is the alternative.
3. **Accept the known-issue 5xx behaviours (UC-CART-26 quantity 0 deletes the line but answers HTTP 500; UC-CART-27 and 35 malformed input) as untested, so no `known-issue` project is created now?** Recommend: yes. They are characterizations outside the pass/fail gate; add UC-CART-26 first (score 3.00) if you want one pinned, at the cost of a third Playwright project and an `@known-issue` spec.

## 1. Scoring table (all 58 use cases, sorted by priority)

Factors: I = Impact, L = Likelihood, C = Coverage value, K = Cost (5 = expensive), S = Stability risk (5 = flaky). Priority = (2 x I + L + C) / (K + S). Ties are ordered by UC id. "Gate" = counts towards the pass/fail gate (`no` = `@known-issue`). The scores are unchanged from the earlier 33-case selection. The Result column is the final decision: the 5 use cases chosen by the user at Gate 2 are "Selected", the other 53 are "Deferred" by user decision (limit to 5), not by their score: 5 of the top 8 scores are among the deferred.

| Rank | UC ID | Title (short) | I | L | C | K | S | Arithmetic | Priority | Gate | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | UC-CART-02 | 3 units from product page = one line of 3 | 5 | 2 | 4 | 1 | 1 | (10+2+4)/(1+1) = 16/2 | 8.00 | yes | Selected |
| 2 | UC-CART-21 | Set quantity updates line, subtotal, counter | 5 | 4 | 4 | 2 | 1 | (10+4+4)/(2+1) = 18/3 | 6.00 | yes | Selected |
| 3 | UC-CART-03 | Same product twice merges into one line | 5 | 4 | 3 | 2 | 1 | (10+4+3)/(2+1) = 17/3 | 5.67 | yes | Selected |
| 4 | UC-CART-06 | Invalid add quantities rejected | 4 | 4 | 2 | 2 | 1 | (8+4+2)/(2+1) = 14/3 | 4.67 | yes | Deferred (user decision: limit to 5) |
| 5 | UC-CART-24 | Update above 10000 refused | 4 | 4 | 2 | 2 | 1 | (8+4+2)/(2+1) = 14/3 | 4.67 | yes | Deferred (user decision: limit to 5) |
| 6 | UC-CART-30 | Removing last line leaves empty cart | 4 | 3 | 3 | 2 | 1 | (8+3+3)/(2+1) = 14/3 | 4.67 | yes | Deferred (user decision: limit to 5) |
| 7 | UC-CART-04 | Quick add adds one unit | 4 | 3 | 2 | 2 | 1 | (8+3+2)/(2+1) = 13/3 | 4.33 | yes | Deferred (user decision: limit to 5) |
| 8 | UC-CART-05 | Two products, counter sums quantities | 4 | 2 | 3 | 2 | 1 | (8+2+3)/(2+1) = 13/3 | 4.33 | yes | Deferred (user decision: limit to 5) |
| 9 | UC-CART-29 | Remove one of three lines | 5 | 3 | 4 | 3 | 1 | (10+3+4)/(3+1) = 17/4 | 4.25 | yes | Selected |
| 10 | UC-CART-44 | Subtotal and Total arithmetic | 5 | 3 | 4 | 3 | 1 | (10+3+4)/(3+1) = 17/4 | 4.25 | yes | Deferred (user decision: limit to 5) |
| 11 | UC-CART-08 | Leading-space quantity accepted | 2 | 3 | 1 | 1 | 1 | (4+3+1)/(1+1) = 8/2 | 4.00 | yes | Deferred (user decision: limit to 5) |
| 12 | UC-CART-19 | Counter only filled with cart=True | 3 | 3 | 3 | 2 | 1 | (6+3+3)/(2+1) = 12/3 | 4.00 | yes | Deferred (user decision: limit to 5) |
| 13 | UC-CART-01 | Two guests never see each other's cart | 5 | 4 | 5 | 3 | 2 | (10+4+5)/(3+2) = 19/5 | 3.80 | yes | Selected |
| 14 | UC-CART-22 | Update one line, others intact | 4 | 4 | 3 | 3 | 1 | (8+4+3)/(3+1) = 15/4 | 3.75 | yes | Deferred (user decision: limit to 5) |
| 15 | UC-CART-45 | Totals follow update and removal | 4 | 4 | 3 | 3 | 1 | (8+4+3)/(3+1) = 15/4 | 3.75 | yes | Deferred (user decision: limit to 5) |
| 16 | UC-CART-07 | 10000 maximum cumulative per line | 3 | 4 | 1 | 2 | 1 | (6+4+1)/(2+1) = 11/3 | 3.67 | yes | Deferred (user decision: limit to 5) |
| 17 | UC-CART-16 | Two add endpoints, two shapes | 3 | 3 | 2 | 2 | 1 | (6+3+2)/(2+1) = 11/3 | 3.67 | yes | Deferred (user decision: limit to 5) |
| 18 | UC-CART-18 | Fresh visitor sees empty cart | 3 | 2 | 3 | 2 | 1 | (6+2+3)/(2+1) = 11/3 | 3.67 | yes | Deferred (user decision: limit to 5) |
| 19 | UC-CART-09 | Unknown id and GET add nothing | 3 | 3 | 1 | 2 | 1 | (6+3+1)/(2+1) = 10/3 | 3.33 | yes | Deferred (user decision: limit to 5) |
| 20 | UC-CART-10 | Required attributes block the add | 3 | 3 | 1 | 2 | 1 | (6+3+1)/(2+1) = 10/3 | 3.33 | yes | Deferred (user decision: limit to 5) |
| 21 | UC-CART-32 | Remove twice, second fails with message | 3 | 3 | 1 | 2 | 1 | (6+3+1)/(2+1) = 10/3 | 3.33 | yes | Deferred (user decision: limit to 5) |
| 22 | UC-CART-33 | Unknown, 0, negative delete ids refused | 3 | 3 | 1 | 2 | 1 | (6+3+1)/(2+1) = 10/3 | 3.33 | yes | Deferred (user decision: limit to 5) |
| 23 | UC-CART-26 | Quantity 0 deletes line, HTTP 500 | 3 | 4 | 2 | 2 | 2 | (6+4+2)/(2+2) = 12/4 | 3.00 | no | Deferred (user decision: limit to 5) |
| 24 | UC-CART-31 | Delete counts lines, counter sums quantities | 3 | 4 | 2 | 3 | 1 | (6+4+2)/(3+1) = 12/4 | 3.00 | yes | Deferred (user decision: limit to 5) |
| 25 | UC-CART-36 | GET on state-changing endpoints 404 | 3 | 2 | 1 | 2 | 1 | (6+2+1)/(2+1) = 9/3 | 3.00 | yes | Deferred (user decision: limit to 5) |
| 26 | UC-CART-57 | No external returnUrl redirect | 3 | 2 | 1 | 2 | 1 | (6+2+1)/(2+1) = 9/3 | 3.00 | yes | Deferred (user decision: limit to 5) |
| 27 | UC-CART-12 | Gift card with valid details added | 3 | 3 | 2 | 3 | 1 | (6+3+2)/(3+1) = 11/4 | 2.75 | yes | Deferred (user decision: limit to 5) |
| 28 | UC-CART-13 | Gift card merge vs new line | 3 | 4 | 1 | 3 | 1 | (6+4+1)/(3+1) = 11/4 | 2.75 | yes | Deferred (user decision: limit to 5) |
| 29 | UC-CART-14 | Gift card per-field validation | 3 | 4 | 1 | 3 | 1 | (6+4+1)/(3+1) = 11/4 | 2.75 | yes | Deferred (user decision: limit to 5) |
| 30 | UC-CART-53 | Mixed cart still shows shipping and estimate panel | 3 | 3 | 2 | 3 | 1 | (6+3+2)/(3+1) = 11/4 | 2.75 | yes | Deferred (user decision: limit to 5) |
| 31 | UC-CART-25 | Space-padded update trimmed | 2 | 3 | 1 | 2 | 1 | (4+3+1)/(2+1) = 8/3 | 2.67 | yes | Deferred (user decision: limit to 5) |
| 32 | UC-CART-38 | Invalid discount codes refused | 4 | 3 | 2 | 3 | 2 | (8+3+2)/(3+2) = 13/5 | 2.60 | yes | Deferred (user decision: limit to 5) |
| 33 | UC-CART-28 | Update of foreign or unknown line id | 5 | 3 | 2 | 4 | 2 | (10+3+2)/(4+2) = 15/6 | 2.50 | yes | Deferred (user decision: limit to 5) |
| 34 | UC-CART-34 | Cannot remove another visitor's line | 5 | 3 | 2 | 4 | 2 | (10+3+2)/(4+2) = 15/6 | 2.50 | yes | Deferred (user decision: limit to 5) |
| 35 | UC-CART-52 | Gift-card-only cart needs no shipping | 3 | 3 | 1 | 3 | 1 | (6+3+1)/(3+1) = 10/4 | 2.50 | yes | Deferred (user decision: limit to 5) |
| 36 | UC-CART-11 | Quick add unknown or gift card adds nothing | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 37 | UC-CART-15 | Long gift card names and messages | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 38 | UC-CART-17 | Product-page partials do not touch cart | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 39 | UC-CART-20 | Mini-cart shows product and empty text | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 40 | UC-CART-41 | Discount on empty cart shows warning | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 41 | UC-CART-49 | Non-numeric country validation message | 2 | 2 | 1 | 2 | 1 | (4+2+1)/(2+1) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 42 | UC-CART-50 | States endpoint US and Germany | 2 | 2 | 1 | 1 | 2 | (4+2+1)/(1+2) = 7/3 | 2.33 | yes | Deferred (user decision: limit to 5) |
| 43 | UC-CART-46 | Shipping estimate lists options | 3 | 3 | 2 | 3 | 2 | (6+3+2)/(3+2) = 11/5 | 2.20 | yes | Deferred (user decision: limit to 5) |
| 44 | UC-CART-39 | Invalid gift card codes refused | 3 | 3 | 1 | 3 | 2 | (6+3+1)/(3+2) = 10/5 | 2.00 | yes | Deferred (user decision: limit to 5) |
| 45 | UC-CART-40 | Code fields without button do nothing | 3 | 3 | 1 | 3 | 2 | (6+3+1)/(3+2) = 10/5 | 2.00 | yes | Deferred (user decision: limit to 5) |
| 46 | UC-CART-47 | Shipping estimate not stored | 2 | 3 | 1 | 2 | 2 | (4+3+1)/(2+2) = 8/4 | 2.00 | yes | Deferred (user decision: limit to 5) |
| 47 | UC-CART-27 | Malformed update quantity 5xx | 3 | 4 | 1 | 3 | 3 | (6+4+1)/(3+3) = 11/6 | 1.83 | no | Deferred (user decision: limit to 5) |
| 48 | UC-CART-35 | Malformed delete id 5xx | 2 | 4 | 1 | 2 | 3 | (4+4+1)/(2+3) = 9/5 | 1.80 | no | Deferred (user decision: limit to 5) |
| 49 | UC-CART-23 | Line set to exactly 10000 | 2 | 2 | 1 | 2 | 2 | (4+2+1)/(2+2) = 7/4 | 1.75 | yes | Deferred (user decision: limit to 5) |
| 50 | UC-CART-51 | States endpoint 5xx | 1 | 4 | 1 | 1 | 3 | (2+4+1)/(1+3) = 7/4 | 1.75 | no | Deferred (user decision: limit to 5) |
| 51 | UC-CART-37 | Delete id in form body | 1 | 2 | 1 | 2 | 1 | (2+2+1)/(2+1) = 5/3 | 1.67 | yes | Deferred (user decision: limit to 5) |
| 52 | UC-CART-42 | Both apply buttons, HTTP 500 | 2 | 3 | 1 | 3 | 2 | (4+3+1)/(3+2) = 8/5 | 1.60 | no | Deferred (user decision: limit to 5) |
| 53 | UC-CART-48 | Shipping estimate does not validate | 2 | 3 | 1 | 3 | 2 | (4+3+1)/(3+2) = 8/5 | 1.60 | yes | Deferred (user decision: limit to 5) |
| 54 | UC-CART-58 | Tier price on product 14 | 2 | 3 | 1 | 3 | 2 | (4+3+1)/(3+2) = 8/5 | 1.60 | yes | Deferred (user decision: limit to 5) |
| 55 | UC-CART-54 | GBP switch and back | 2 | 2 | 1 | 3 | 2 | (4+2+1)/(3+2) = 7/5 | 1.40 | yes | Deferred (user decision: limit to 5) |
| 56 | UC-CART-43 | Query-string codes on GET ignored | 1 | 1 | 1 | 2 | 1 | (2+1+1)/(2+1) = 4/3 | 1.33 | yes | Deferred (user decision: limit to 5) |
| 57 | UC-CART-55 | Currency rounding of subtotal | 2 | 3 | 1 | 4 | 2 | (4+3+1)/(4+2) = 8/6 | 1.33 | yes | Deferred (user decision: limit to 5) |
| 58 | UC-CART-56 | Unknown currency id | 1 | 2 | 1 | 3 | 2 | (2+2+1)/(3+2) = 5/5 | 1.00 | yes | Deferred (user decision: limit to 5) |

Scoring notes: Impact 5 for add, merge, quantity update, removal, isolation and arithmetic (the cart is the money path before checkout); Impact 1 to 2 for reference data, curiosities and currency. Stability 3 for the 5xx characterizations (the 502 may come from the proxy) and for the states list (reference data may grow); Stability 2 for multi-actor and code cases (shared host, cookie and User-Agent keyed carts). Coverage value 5 only for the isolation gate (every other test relies on it).

## 2. Selected for automation (5)

Final decision of the user at Gate 2: "limit our use cases to the 5 most critical ones, and make sure cart manipulation is covered". Execution order: UC-CART-01 first in the `gate` project; the other four depend on it.

| UC ID | Reason |
|---|---|
| UC-CART-01 | Gate: proves per-actor isolation (positive control: A's counter is 2, so B's 0 means "separate", not "blind"); without it no other result is trustworthy on a shared host. |
| UC-CART-02 | Add: highest score; three views (add reply, counter, cart page) and the line total computed from the input. |
| UC-CART-03 | Add, state: merge of the same product is the most likely state bug of the add (same line id, quantity 5). |
| UC-CART-21 | Change quantity: update agrees across reply, cart page and counter, with the same line id. |
| UC-CART-29 | Remove: one of three lines goes, the other two keep id and quantity; subtotal, line count and counter each by their own meaning. |

## 3. Deferred (53)

All 53 are deferred by user decision: limit to 5. The previous score is kept so they can be added later. "Earlier" shows the reason they were already deferred in the 33-case proposal; the others were in that proposal.

| UC ID | Score | Reason |
|---|---|---|
| UC-CART-06 | 4.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-24 | 4.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-30 | 4.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-04 | 4.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-05 | 4.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-44 | 4.25 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-08 | 4.00 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-19 | 4.00 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-22 | 3.75 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-45 | 3.75 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-07 | 3.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-16 | 3.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-18 | 3.67 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-09 | 3.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-10 | 3.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-32 | 3.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-33 | 3.33 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-26 | 3.00 | By user decision: limit to 5 (was in the 33-case selection, `@known-issue`). |
| UC-CART-31 | 3.00 | By user decision: limit to 5. Earlier: overlap, `cartItemCount` (lines) and counter (quantities) are asserted inside UC-CART-29 and UC-CART-30. |
| UC-CART-36 | 3.00 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-57 | 3.00 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-12 | 2.75 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-13 | 2.75 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-14 | 2.75 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-53 | 2.75 | By user decision: limit to 5. Earlier: only meaningful together with UC-CART-52. |
| UC-CART-25 | 2.67 | By user decision: limit to 5. Earlier: same trimming rule as UC-CART-08. |
| UC-CART-38 | 2.60 | By user decision: limit to 5 (was in the 33-case selection). |
| UC-CART-28 | 2.50 | By user decision: limit to 5 (was in the 33-case selection, security of line ownership). |
| UC-CART-34 | 2.50 | By user decision: limit to 5 (was in the 33-case selection, security of line ownership). |
| UC-CART-52 | 2.50 | By user decision: limit to 5. Earlier: below the cut; first candidate to add of the shipping cases. |
| UC-CART-11 | 2.33 | By user decision: limit to 5. Earlier: low value, quick-add failures overlap UC-CART-10 and UC-CART-16. |
| UC-CART-15 | 2.33 | By user decision: limit to 5. Earlier: low value, asserts accepted lengths only. |
| UC-CART-17 | 2.33 | By user decision: limit to 5. Earlier: low value, the partials endpoint has no cart effect. |
| UC-CART-20 | 2.33 | By user decision: limit to 5. Earlier: low value, HTML fragment, empty state covered in UC-CART-18. |
| UC-CART-41 | 2.33 | By user decision: limit to 5. Earlier: low impact warning text. |
| UC-CART-49 | 2.33 | By user decision: limit to 5. Earlier: low impact validation text. |
| UC-CART-50 | 2.33 | By user decision: limit to 5. Earlier: reference data that may grow. |
| UC-CART-46 | 2.20 | By user decision: limit to 5. Earlier: estimate not stored, amounts always $0.00. |
| UC-CART-39 | 2.00 | By user decision: limit to 5. Earlier: failure path only; the success path needs a valid code (gap). |
| UC-CART-40 | 2.00 | By user decision: limit to 5. Earlier: needs a control against the discount alert; low impact. |
| UC-CART-47 | 2.00 | By user decision: limit to 5. Earlier: derived from UC-CART-46. |
| UC-CART-27 | 1.83 | By user decision: limit to 5 (was in the 33-case selection, `@known-issue`). |
| UC-CART-35 | 1.80 | By user decision: limit to 5 (was in the 33-case selection, `@known-issue`). |
| UC-CART-23 | 1.75 | By user decision: limit to 5. Earlier: lowest priority, the only case that accepts a large quantity on a shared host. |
| UC-CART-51 | 1.75 | By user decision: limit to 5. Earlier: known issue on the states endpoint, impact 1. |
| UC-CART-37 | 1.67 | By user decision: limit to 5. Earlier: lowest priority, model-binding curiosity. |
| UC-CART-42 | 1.60 | By user decision: limit to 5. Earlier: known issue from a hand-made request no browser can send. |
| UC-CART-48 | 1.60 | By user decision: limit to 5. Earlier: characterization of a missing validation. |
| UC-CART-58 | 1.60 | By user decision: limit to 5. Earlier: tier price, data dependent (product 14 only). |
| UC-CART-54 | 1.40 | By user decision: limit to 5. Earlier: currency, lower priority. |
| UC-CART-43 | 1.33 | By user decision: limit to 5. Earlier: lowest priority, ignored query parameters. |
| UC-CART-55 | 1.33 | By user decision: limit to 5. Earlier: currency rounding, highest cost and stability risk of the currency cases. |
| UC-CART-56 | 1.00 | By user decision: limit to 5. Earlier: currency, lowest impact. |

### Next five to add (by score), if you want more

In this order, computed from the scoring table (ties by UC id): UC-CART-06 (4.67, invalid add quantities), UC-CART-24 (4.67, update above 10000), UC-CART-30 (4.67, removing the last line), UC-CART-04 (4.33, quick add), UC-CART-05 (4.33, two products, counter sums quantities). Next after those: UC-CART-44 (4.25, subtotal and total arithmetic). They harden add, quantity and remove (validation, limits, empty cart) and fit the same `cart` project; with the data tables they add about 11 tests (UC-06 6 rows, UC-24 3 rows). For the security side (ownership of lines) pick UC-CART-28 and 34 instead (2.50 each, cost L).

## 4. Suite design notes

Layers (the writer creates them on the first run; `npm run verify` stays green). Only what the five use cases need is built; the rest of the framework grows with later additions.

**`src/config`**: `env.ts` with the lazily read `BASE_URL` (default the Bearstore host). No credentials needed.

**`src/domain`** (pure TypeScript):
- Constants: product ids and prices (`5` 164.95, `3` 269.00, `14` 29.95; quantities kept at 5 or below), and the exact server messages that the five cases touch ("The product has been removed.", "An error occurred during the removal of the product." for UC-01 step 3).
- Parsers: the cart page (lines with line id, product, quantity, unit price, line total; totals table Subtotal, Shipping, Tax, Total); a money parser/formatter (`$1,270.90` to cents, rounding to cents; "excl tax" suffix tolerated) and a `userAgentFor(useCaseId)` helper producing a unique User-Agent.

**`src/api`** (one method per endpoint, `Reply<T>`, no assertions; quirks handled here: `data: ''` on body-less POSTs, `X-Requested-With`, no redirect following where needed): `cart.api.ts` with `addProduct(productId, quantity)`, `summary({cart: true})`, `view()`, `updateItem(lineId, quantity)` (`isCartPage=True`), `deleteItem(lineId)`. Types for the JSON bodies (`AddReply`, `SummaryReply` with `$type`, `UpdateReply`, `DeleteReply`) in `api/types.ts`.

**`src/actors`**: one `GuestActor` (a guest with its own context): Given `hasInCart(product, quantity)` (proves the line by reading the cart page and returns the line id), `hasEmptyCart()`; When `adds`, `updatesQuantity`, `removes`; Then `seesLines()`, `seesCounter()` (always with `cart=True`), `seesTotals()`. UC-01 uses a second `GuestActor` from the same fixture.

**`src/matchers`** (`expect.extend`): `toBeRejectedWith(message)` (business failure: 200 plus `success:false` plus the exact message, failure text shows the whole reply), `toHaveLine(product, quantity)`, `toHaveNoLine(product)`, `toHaveCounter(n)`.

**`src/fixtures`**: `test` provides `guest` and a factory `guestFactory` for the extra actor of UC-01. Each actor has a unique User-Agent, its own request context and cookie jar, proves an empty cart in `Given`, and its `finally` empties the cart (delete each line read from `GET /cart`). Contexts are disposed there only. No test uses the default User-Agent.

**Playwright projects** (in `playwright.config.ts`, every spec matched by exactly one):
- `gate`: `tests/isolation/` (UC-CART-01), runs first.
- `cart`: `tests/cart/`, `dependencies: ['gate']`, 2 workers, no retries.
- No `known-issue` project: no `@known-issue` case is selected.

**Spec files** (one per capability, kebab-case, under 150 lines each):
- `tests/isolation/guest-isolation.api.spec.ts`: UC-01.
- `tests/cart/add-product.api.spec.ts`: UC-02, 03.
- `tests/cart/update-quantity.api.spec.ts`: UC-21.
- `tests/cart/remove-item.api.spec.ts`: UC-29.

**Test-data notes.** Unit prices of products 5, 3, 14 feed all four cart expectations: they live in ONE constants file, so a catalog price change is a one-line fix and shows up as a cluster of reds, not as flakiness. Line ids are never hard-coded (read from `GET /cart` after the setup add). Expected totals are computed from the input (quantity x constant unit price), never copied from a reply. The "nothing happened" assertions (UC-01 step 2 and 3: B's empty cart and B's refused delete; UC-29: the other lines unchanged) have their positive control (A's counter is 2; the delete of one's own line works). Volume stays modest: quantities 1 to 5.

## Issues for the human

- UC-CART-01 step 3 is worded confusingly ("B: `GET /cart` and read A's line id from A's own `GET /cart` first"); the writer should read A's line id from A's cart, then use it from B's actor. The expected results are clear.
- UC-CART-01 is now the only test of line ownership (B cannot delete A's line). The update of a foreign or unknown line (UC-CART-28) and the second ownership check (UC-CART-34) are deferred; this is a conscious security gap of the selection.
- UC-CART-29 expects `cartItemCount` 2 (lines left) next to a counter of 3 (quantities): two names for two different numbers. The writer should assert each by its meaning; the naming mismatch itself is the finding of the deferred UC-CART-31.
- UC-CART-29 needs three lines (products 5 x2, 3 x1, 14 x1) set up through the API; product 14 has a tier price (UC-CART-58, deferred), so keep its quantity at 1 and assert its line total from the plain unit price only if the discovery confirms it applies at quantity 1.
- UC-CART-21 must not send quantity 0 or malformed values (known issues UC-CART-26, 27 answer HTTP 500 and are not selected); it sets quantity 3 only.
- Gap that cannot be fixed by selection: the success path of discount and gift card codes (needs one valid code of each from the site owner); out of scope for the 5 cases anyway.

## Gate 2 answers

- User decision: limit to 5 use cases (UC-CART-01, 02, 03, 21, 29), cart manipulation covered.
