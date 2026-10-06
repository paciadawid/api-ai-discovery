# QA Stage 3 - Prioritised selection

Target: https://bearstore-testsite.smartbear.com (SmartStore 4.2). Inputs: `qa/02-use-cases.md` and its six part files (264 UCs), `qa/01-discovery/SUMMARY.md`, `qa/01-discovery/open-questions.md`. Layer: Playwright Test, `request` fixture only (no browser).

## Gate 2 decisions (recorded 2026-10-02, supersede the Wave 1 size below)

1. Wave 1 is cut to **10 tests** (56 was too many). Order: UC-CART-96 (gate, first), UC-CART-01, UC-AUTH-22, UC-AUTH-02, UC-AUTH-07, UC-CATALOG-01, UC-CATALOG-03, UC-SEARCH-01, UC-SEARCH-32, UC-CONTENT-16. The rest of the 56 and Wave 2 are deferred.
2. Credentials supplied by the user; they become defaults in `tests/support/auth.ts`, overridable by `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD`. Never written into `qa/` files.
3. The `test.fail()` known-issue / @defect tests are dropped for now. Only tests that pass today are in scope.
4. UC-CART-96 is a hard gate (Playwright project dependency); re-probe of thin UCs approved but not needed for these 10; quantity-10000 cases stay out.

## Decision brief

### Recommendation

Automate 56 use cases first (Wave 1; auth 15, catalog 9, search 6, cart 18, content 8), with UC-CART-96 (visitor-isolation probe, OQ-01) running first as a blocking prerequisite; this protects the gates that matter (anonymous-vs-authenticated access, session cookie handling, add/update/delete cart lines, checkout entry and gating, the public catalog and search entry points) plus 22 `test.fail()` known-issue tests that pin the 27 discovery findings we care about most. It deliberately leaves out order placement, change-password success, coupon/gift-card success and mail flows (out of scope), everything destructive or irreversible on the shared host (account registration per run, contact/newsletter submissions, huge quantities, repeated 5xx probing), data-dependent sort/filter/paging checks, and thin or curl-only specs until they are re-probed. A 31-UC optional Wave 2 (87 total) follows after the first stable run.

### Selected table (Wave 1, sorted by score; CART-96 forced first)

Types: HP happy path, VN validation/negative, AA authorisation, SP state/persistence, DF defect (known issue, `test.fail()`), SC security. Effort is the layer-specific cost (S/M/L) from the Cost factor (1-2 S, 3 M, 4-5 L).

| # | UC ID | Area | Type | What it proves | Score | Tags | Effort |
|---|---|---|---|---|---|---|---|
| 0 | UC-CART-96 | cart | SC | Cookieless requests with another User-Agent do not share a visitor (gate for every cart test) | 3.17 | @probe @prerequisite | M |
| 1 | UC-AUTH-21 | auth | DF | Register without anti-forgery token returns 4xx, not 500 | 8.00 | @defect | S |
| 2 | UC-AUTH-22 | auth | AA | Anonymous access to account pages redirects to login | 8.00 | @smoke | S |
| 3 | UC-AUTH-48 | auth | SC | Recovery/registration do not reveal whether an email exists | 7.00 | @security @known-issue | S |
| 4 | UC-SEARCH-32 | search | SC | Query text is HTML-encoded in results (reflected XSS guard) | 7.00 | @security | S |
| 5 | UC-AUTH-07 | auth | VN | Unknown user gets the same message as wrong password | 6.50 | @smoke | S |
| 6 | UC-CATALOG-01 | catalog | HP | Home page renders product tiles | 6.50 | @smoke | S |
| 7 | UC-CATALOG-03 | catalog | HP | Top-level category pages respond 200 with a title | 6.50 | @smoke | S |
| 8 | UC-CATALOG-12 | catalog | DF | Page size 0 does not crash the listing | 6.50 | @defect | S |
| 9 | UC-SEARCH-27 | search | DF | Page size -1 returns 4xx, not 502 | 6.50 | @defect | S |
| 10 | UC-CONTENT-26 | content | DF | Newsletter without subscribe flag returns 4xx | 6.50 | @defect | S |
| 11 | UC-AUTH-25 | auth | AA | Anonymous address add is redirected to login | 6.00 | - | S |
| 12 | UC-AUTH-39 | auth | SC | Back-in-stock page requires login like its siblings | 6.00 | @security @known-issue | S |
| 13 | UC-CATALOG-23 | catalog | SC | Canonical redirect keeps https (finding #19) | 6.00 | @security @known-issue | S |
| 14 | UC-CATALOG-36 | catalog | DF | Price update for unknown product returns 4xx | 6.00 | @defect | S |
| 15 | UC-CATALOG-41 | catalog | DF | Reviews page with non-numeric id returns 4xx | 6.00 | @defect | S |
| 16 | UC-SEARCH-28 | search | DF | Rating filter 9 returns 4xx, not 502 | 6.00 | @defect | S |
| 17 | UC-CART-27 | cart | HP | Empty cart page renders | 6.00 | - | S |
| 18 | UC-CART-43 | cart | DF | Delete with non-numeric id returns 4xx | 6.00 | @defect | S |
| 19 | UC-CART-69 | cart | VN | Checkout entry with empty cart redirects to cart | 6.00 | - | S |
| 20 | UC-CONTENT-14 | content | SC | No server/framework version disclosure | 6.00 | @security @known-issue | S |
| 21 | UC-CONTENT-15 | content | SC | Standard browser security headers present | 6.00 | @security @known-issue | S |
| 22 | UC-CONTENT-33 | content | SC | Newsletter JSON does not leak .NET type names | 6.00 | @security @known-issue | S |
| 23 | UC-CATALOG-24 | catalog | HP | Product page exposes price metadata and add-to-cart links | 5.67 | @smoke | S |
| 24 | UC-CATALOG-21 | catalog | VN | Unknown slug returns the 404 page | 5.50 | @smoke | S |
| 25 | UC-AUTH-51 | auth | SC | Visitor cookie is Secure, HttpOnly, SameSite=Lax | 5.00 | @security | S |
| 26 | UC-SEARCH-03 | search | VN | Blank query shows minimum-length message | 5.00 | @smoke | S |
| 27 | UC-CART-84 | cart | DF | Compare add with non-numeric id returns 4xx | 5.00 | @defect | S |
| 28 | UC-CONTENT-01 | content | HP | Static pages load | 5.00 | @smoke | S |
| 29 | UC-CONTENT-16 | content | VN | Contact form with all fields empty is rejected | 5.00 | @smoke | S |
| 30 | UC-CONTENT-22 | content | VN | Newsletter rejects malformed email | 5.00 | @smoke | S |
| 31 | UC-CART-39 | cart | DF | Update of unknown line id returns 4xx | 4.67 | @defect | S |
| 32 | UC-AUTH-01 | auth | HP | Login form served anonymously | 4.50 | @smoke | S |
| 33 | UC-AUTH-02 | auth | HP | Valid login redirects to returnUrl and sets AUTH cookie | 4.50 | @smoke @needs-account | S |
| 34 | UC-AUTH-13 | auth | HP | Registration form carries the anti-forgery token | 4.50 | @smoke | S |
| 35 | UC-CART-01 | cart | HP | Add a simple product to the cart | 4.50 | @smoke | S |
| 36 | UC-CONTENT-02 | content | HP | Contact form page loads | 4.50 | @smoke | S |
| 37 | UC-SEARCH-09 | search | HP | Instant search returns an HTML fragment of hits | 4.33 | @smoke | S |
| 38 | UC-CART-33 | cart | DF | Update to quantity 0 does not return 5xx | 4.25 | @defect | S |
| 39 | UC-CART-66 | cart | AA | Anonymous checkout start redirects to login | 4.25 | @smoke | S |
| 40 | UC-CART-75 | cart | DF | Later checkout steps are gated by earlier ones | 4.25 | @defect | S |
| 41 | UC-CART-30 | cart | HP | Update a line quantity | 4.00 | @smoke | S |
| 42 | UC-CART-40 | cart | HP | Delete a cart line | 4.00 | @smoke | S |
| 43 | UC-CART-70 | cart | HP | Checkout entry with items redirects to billing step | 4.00 | - | S |
| 44 | UC-AUTH-50 | auth | SC | AUTH cookie has HttpOnly/SameSite (pass) and Secure (`test.fail`) | 3.75 | @security @known-issue @needs-account | S |
| 45 | UC-CART-74 | cart | VN | Invalid billing address re-rendered with field errors | 3.75 | - | S |
| 46 | UC-AUTH-18 | auth | VN | 5-character password rejected at registration | 3.67 | - | S |
| 47 | UC-CART-79 | cart | SC | Share link must not expose the session cookie value (finding #10) | 3.60 | @security @known-issue | M |
| 48 | UC-AUTH-23 | auth | HP | Profile page renders for a logged-in customer | 3.50 | @smoke @needs-account | S |
| 49 | UC-SEARCH-01 | search | HP | Search returns hits for a known term | 3.50 | @smoke | S |
| 50 | UC-AUTH-49 | auth | SC | Old AUTH cookie stops working after logout | 3.40 | @security @known-issue @needs-account | M |
| 51 | UC-CART-80 | cart | SC | Leaked share guid must not grant cart access | 3.40 | @security @known-issue | M |
| 52 | UC-CATALOG-34 | catalog | AA | Variant selection recalculates price | 3.25 | - | S |
| 53 | UC-AUTH-34 | auth | AA | Editing another customer's address id changes nothing | 3.20 | @needs-account | M |
| 54 | UC-CART-02 | cart | HP | Add quantity 3 and verify line total | 3.20 | - | M |
| 55 | UC-CART-46 | cart | SC | Another visitor cannot delete my cart line | 3.00 | @security | M |

(Numbering 1-55 plus the forced-first UC-CART-96 gives 56.)

### Coverage per area (Wave 1)

| Area | Selected / total | Endpoints touched | Residual risk where thin |
|---|---|---|---|
| auth | 15 / 53 | 13 of 17 (9 exercised, 4 redirect-guard only) | Profile and address CRUD, change-password validation, order history rendering, lockout (OQ-14) are not exercised. Medium risk: the guards are tested, the behaviour behind them is not. |
| catalog | 9 / 44 | 6 of 10 (HOME, CATEGORY, PRODUCT, NOTFOUND, UPDATEPRODUCTDETAILS, REVIEWS) | Thin. Sort, filter, paging, recently viewed and currency state are deferred as data-dependent or state-dependent; NEWPRODUCTS, RECENT, CURRENCY, ASKQUESTIONAJAX untouched. A listing regression in sort/filter would go unnoticed. |
| search | 6 / 37 | 2 of 4 (PAGE, INSTANT) | Thin. Filter, sort and paging correctness untested; PAGE-POST and TRAILING-SLASH untouched (SEARCH-31 in Wave 2). |
| cart (incl. checkout, wishlist, compare) | 18 / 96 | 13 of 26 | Coupon, gift card, shipping estimate, move cart/wishlist, compare list management and wishlist email are uncovered (Wave 2 adds MOVE, COUPON, STATES). Highest remaining business risk, but mostly negative-path or state-heavy. |
| content | 8 / 34 | 9 of 17 (six static pages, CONTACT-FORM, CONTACT-SEND, NEWSLETTER-SUBSCRIBE) | BLOG-PAGE, PWRECOVERY-CONFIRM, three RSS feeds, SITEMAP, ROBOTS untouched (curl-only or low value). ACTIVATION has no UC at all. Low business risk. |
| Total | 56 / 264 | 43 of 74 (about 58%) | |

### Effort and prerequisites

- Tally: S = 49, M = 7, L = 0. M cases: AUTH-34, AUTH-49, CART-96, CART-02, CART-46, CART-79, CART-80.
- Estimate (rough, not measured): about 3.5-4 person-days including `tests/support/` helpers and stabilisation; about 150-200 requests per run.
- 22 of the 56 are `test.fail()` known-issue tests (they pass while the bug exists and fail when it is fixed); 34 pass today.
- 11 single requests per run provoke a 5xx on purpose: AUTH-21, CATALOG-12, 36, 41, SEARCH-27, 28, CART-33, 39, 43, 84, CONTENT-26. Each is sent once; none is looped.
- Prerequisites: (1) UC-CART-96 passes before any other cart test runs; (2) dedicated QA credentials in `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` for the 5 @needs-account cases (AUTH-02, 23, 34, 49, 50) - without them those 5 skip and 51 run; (3) known product ids (SIMPLE = 32, P2 = 33, VARIANT = 65); (4) outbound HTTPS to the host; nothing else.
- Not counted as default coverage: `@side-effect` UCs AUTH-14, CONTENT-20, 24, 25 (gated behind `BEARSTORE_ALLOW_SIDE_EFFECTS=1`).

### Decisions for the human

1. Approve Wave 1 (56 UCs) now, and Wave 2 (31 UCs, listed below) only after one stable run? Recommended: yes.
2. Account strategy: supply dedicated QA credentials via `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` so the 5 @needs-account cases run, rather than registering a fresh account per run (AUTH-14 stays off by default and creates irreversible accounts on a shared host). Recommended: yes, supply credentials.
3. Known-issue handling: approve the 22 `test.fail()` tests, set `retries: 0` for @defect tests (11 single 5xx probes per run), and accept the assertion "never 5xx; a 4xx is preferred; 200 with success:false is allowed where the UC says so" instead of a strict 4xx everywhere? Recommended: accept.
4. Gate and re-probe: make UC-CART-96 a blocking prerequisite (Playwright project dependency) and stop all cart tests if a different User-Agent still shares state; authorise a short headed re-probe of the thin UCs (CATALOG-42, 43, CONTENT-21, 30, 34, CART-72, 81, SEARCH-19) before any is promoted; keep destructive or huge cart cases (quantity 10000: CART-07, 31) out? Recommended: yes to all three.

---

## 1. Scoring method

Each factor is scored 1-5. Impact: business damage if it breaks (auth, cart, checkout, payment rank highest). Likelihood: chance of breaking (confirmed defects score 5). Coverage value: how much other functionality it implicitly proves. Cost: effort to automate and maintain including data and cleanup (5 = expensive). Stability risk: flakiness (5 = flaky); shared mutable data, 502s from the ELB, rate limits and non-determinism raise it.

Priority = (Impact x 2 + Likelihood + Coverage value) / (Cost + Stability risk).

Arithmetic is shown as N / D = score, where N = 2*Impact + Likelihood + Coverage and D = Cost + Stability. Example: UC-AUTH-02 = (2*5 + 3 + 5) / (2 + 2) = 18 / 4 = 4.50. (See "Issues for the human" item 1: per-factor values are not itemised for every row.)

Effort mapping: Cost 1-2 = S, 3 = M, 4-5 = L. Selection is a score cut with these deliberate deviations: every area gets coverage; duplicates of a selected sibling are dropped even at a high score (AUTH-08 5.00 and AUTH-44 5.00 are not selected, whereas CATALOG-34 3.25 and CART-46 3.00 are, to add endpoint and area coverage); UC-CART-96 is forced first as a gate; AUTH-01, AUTH-13 and CART-74 are included for unique endpoints.

Decision codes: W1 selected, W2 optional second wave, D-DUP duplicate of a selected sibling, D-ACCT needs account state or mutation, D-GATED side effect, opt-in only, D-DATA depends on catalog data, D-STATE depends on mutable state or is stateful across requests, D-DISC correct behaviour undefined, needs discovery, D-REPROBE thin/curl-only/extrapolated spec, re-probe first, D-FLAKY flaky or environment dependent, D-LOW low value.

## 2. Full scored list (264 UCs, sorted by priority; ties in area then UC order)

| Rank | UC | Type | N / D | Score | Decision |
|---|---|---|---|---|---|
| 1 | AUTH-21 | DF | 16 / 2 | 8.00 | W1 |
| 2 | AUTH-22 | AA | 16 / 2 | 8.00 | W1 |
| 3 | AUTH-48 | SC | 14 / 2 | 7.00 | W1 |
| 4 | SEARCH-32 | SC | 14 / 2 | 7.00 | W1 |
| 5 | AUTH-07 | VN | 13 / 2 | 6.50 | W1 |
| 6 | CATALOG-01 | HP | 13 / 2 | 6.50 | W1 |
| 7 | CATALOG-03 | HP | 13 / 2 | 6.50 | W1 |
| 8 | CATALOG-12 | DF | 13 / 2 | 6.50 | W1 |
| 9 | SEARCH-27 | DF | 13 / 2 | 6.50 | W1 |
| 10 | CONTENT-26 | DF | 13 / 2 | 6.50 | W1 |
| 11 | AUTH-25 | AA | 12 / 2 | 6.00 | W1 |
| 12 | AUTH-39 | SC | 12 / 2 | 6.00 | W1 |
| 13 | CATALOG-23 | SC | 12 / 2 | 6.00 | W1 |
| 14 | CATALOG-36 | DF | 12 / 2 | 6.00 | W1 |
| 15 | CATALOG-37 | DF | 12 / 2 | 6.00 | W2 |
| 16 | CATALOG-41 | DF | 12 / 2 | 6.00 | W1 |
| 17 | SEARCH-28 | DF | 12 / 2 | 6.00 | W1 |
| 18 | SEARCH-29 | DF | 12 / 2 | 6.00 | D-DUP |
| 19 | SEARCH-31 | SC | 12 / 2 | 6.00 | W2 |
| 20 | CART-15 | DF | 12 / 2 | 6.00 | W2 |
| 21 | CART-24 | HP | 12 / 2 | 6.00 | D-DUP |
| 22 | CART-27 | HP | 12 / 2 | 6.00 | W1 |
| 23 | CART-43 | DF | 12 / 2 | 6.00 | W1 |
| 24 | CART-44 | DF | 12 / 2 | 6.00 | W2 |
| 25 | CART-64 | DF | 12 / 2 | 6.00 | W2 |
| 26 | CART-69 | VN | 12 / 2 | 6.00 | W1 |
| 27 | CONTENT-12 | SC | 12 / 2 | 6.00 | D-DUP |
| 28 | CONTENT-14 | SC | 12 / 2 | 6.00 | W1 |
| 29 | CONTENT-15 | SC | 12 / 2 | 6.00 | W1 |
| 30 | CONTENT-27 | DF | 12 / 2 | 6.00 | D-DUP |
| 31 | CONTENT-28 | DF | 12 / 2 | 6.00 | D-DUP |
| 32 | CONTENT-33 | SC | 12 / 2 | 6.00 | W1 |
| 33 | CATALOG-24 | HP | 17 / 3 | 5.67 | W1 |
| 34 | CATALOG-21 | VN | 11 / 2 | 5.50 | W1 |
| 35 | AUTH-08 | VN | 10 / 2 | 5.00 | W2 |
| 36 | AUTH-44 | VN | 10 / 2 | 5.00 | D-DUP |
| 37 | AUTH-51 | SC | 10 / 2 | 5.00 | W1 |
| 38 | SEARCH-03 | VN | 10 / 2 | 5.00 | W1 |
| 39 | SEARCH-06 | VN | 10 / 2 | 5.00 | W2 |
| 40 | CART-68 | VN | 10 / 2 | 5.00 | W2 |
| 41 | CART-84 | DF | 10 / 2 | 5.00 | W1 |
| 42 | CONTENT-01 | HP | 10 / 2 | 5.00 | W1 |
| 43 | CONTENT-16 | VN | 10 / 2 | 5.00 | W1 |
| 44 | CONTENT-22 | VN | 10 / 2 | 5.00 | W1 |
| 45 | CART-39 | DF | 14 / 3 | 4.67 | W1 |
| 46 | AUTH-01 | HP | 9 / 2 | 4.50 | W1 |
| 47 | AUTH-02 | HP | 18 / 4 | 4.50 | W1 |
| 48 | AUTH-13 | HP | 9 / 2 | 4.50 | W1 |
| 49 | CART-01 | HP | 18 / 4 | 4.50 | W1 |
| 50 | CART-42 | VN | 9 / 2 | 4.50 | D-DUP |
| 51 | CONTENT-02 | HP | 9 / 2 | 4.50 | W1 |
| 52 | CONTENT-17 | VN | 9 / 2 | 4.50 | W2 |
| 53 | SEARCH-09 | HP | 13 / 3 | 4.33 | W1 |
| 54 | CART-33 | DF | 17 / 4 | 4.25 | W1 |
| 55 | CART-66 | AA | 17 / 4 | 4.25 | W1 |
| 56 | CART-75 | DF | 17 / 4 | 4.25 | W1 |
| 57 | CART-16 | AA | 12 / 3 | 4.00 | D-DUP |
| 58 | CART-30 | HP | 16 / 4 | 4.00 | W1 |
| 59 | CART-34 | DF | 16 / 4 | 4.00 | W2 |
| 60 | CART-40 | HP | 16 / 4 | 4.00 | W1 |
| 61 | CART-63 | VN | 8 / 2 | 4.00 | D-DUP |
| 62 | CART-70 | HP | 16 / 4 | 4.00 | W1 |
| 63 | CONTENT-05 | VN | 8 / 2 | 4.00 | D-LOW |
| 64 | CONTENT-18 | VN | 8 / 2 | 4.00 | W2 |
| 65 | CONTENT-29 | DF | 12 / 3 | 4.00 | W2 |
| 66 | AUTH-28 | DF | 15 / 4 | 3.75 | W2 |
| 67 | AUTH-50 | SC | 15 / 4 | 3.75 | W1 |
| 68 | AUTH-53 | SC | 15 / 4 | 3.75 | W2 |
| 69 | CART-74 | VN | 15 / 4 | 3.75 | W1 |
| 70 | AUTH-18 | VN | 11 / 3 | 3.67 | W1 |
| 71 | CART-79 | SC | 18 / 5 | 3.60 | W1 |
| 72 | AUTH-23 | HP | 14 / 4 | 3.50 | W1 |
| 73 | AUTH-45 | VN | 7 / 2 | 3.50 | D-LOW |
| 74 | AUTH-46 | VN | 7 / 2 | 3.50 | D-LOW |
| 75 | CATALOG-04 | AA | 7 / 2 | 3.50 | D-LOW |
| 76 | CATALOG-40 | VN | 7 / 2 | 3.50 | D-LOW |
| 77 | SEARCH-01 | HP | 14 / 4 | 3.50 | W1 |
| 78 | SEARCH-04 | VN | 7 / 2 | 3.50 | D-DUP |
| 79 | SEARCH-12 | VN | 7 / 2 | 3.50 | D-DUP |
| 80 | SEARCH-37 | AA | 7 / 2 | 3.50 | D-DUP |
| 81 | CART-06 | VN | 14 / 4 | 3.50 | W2 |
| 82 | CART-11 | VN | 7 / 2 | 3.50 | D-LOW |
| 83 | CART-13 | VN | 7 / 2 | 3.50 | D-LOW |
| 84 | CART-35 | DF | 14 / 4 | 3.50 | W2 |
| 85 | CART-36 | DF | 14 / 4 | 3.50 | D-DUP |
| 86 | CART-37 | DF | 14 / 4 | 3.50 | D-DUP |
| 87 | CART-38 | DF | 14 / 4 | 3.50 | D-DUP |
| 88 | CART-77 | VN | 7 / 2 | 3.50 | D-LOW |
| 89 | CONTENT-19 | VN | 7 / 2 | 3.50 | D-DUP |
| 90 | CONTENT-23 | VN | 7 / 2 | 3.50 | D-DUP |
| 91 | CONTENT-32 | VN | 7 / 2 | 3.50 | W2 |
| 92 | AUTH-49 | SC | 17 / 5 | 3.40 | W1 |
| 93 | CART-80 | SC | 17 / 5 | 3.40 | W1 |
| 94 | AUTH-17 | VN | 10 / 3 | 3.33 | W2 |
| 95 | AUTH-19 | VN | 10 / 3 | 3.33 | D-DUP |
| 96 | AUTH-20 | VN | 10 / 3 | 3.33 | D-DUP |
| 97 | CART-10 | VN | 10 / 3 | 3.33 | D-LOW |
| 98 | CATALOG-34 | HP | 13 / 4 | 3.25 | W1 |
| 99 | CART-03 | SP | 13 / 4 | 3.25 | W2 |
| 100 | AUTH-34 | AA | 16 / 5 | 3.20 | W1 |
| 101 | CART-02 | HP | 16 / 5 | 3.20 | W1 |
| 102 | CART-28 | HP | 16 / 5 | 3.20 | D-DUP |
| 103 | CART-96 | SC | 19 / 6 | 3.17 | W1 (forced first) |
| 104 | AUTH-09 | SC | 12 / 4 | 3.00 | W2 |
| 105 | AUTH-10 | SC | 12 / 4 | 3.00 | D-DUP |
| 106 | AUTH-42 | DF | 12 / 4 | 3.00 | W2 |
| 107 | AUTH-43 | HP | 6 / 2 | 3.00 | D-LOW |
| 108 | CATALOG-31 | SC | 9 / 3 | 3.00 | W2 |
| 109 | CATALOG-42 | DF | 12 / 4 | 3.00 | D-REPROBE |
| 110 | CATALOG-43 | DF | 12 / 4 | 3.00 | D-REPROBE |
| 111 | SEARCH-08 | VN | 6 / 2 | 3.00 | D-DUP |
| 112 | CART-04 | HP | 12 / 4 | 3.00 | D-DUP |
| 113 | CART-08 | VN | 12 / 4 | 3.00 | D-DUP |
| 114 | CART-12 | VN | 6 / 2 | 3.00 | D-LOW |
| 115 | CART-14 | VN | 6 / 2 | 3.00 | D-LOW |
| 116 | CART-32 | VN | 12 / 4 | 3.00 | D-DUP |
| 117 | CART-46 | SC | 15 / 5 | 3.00 | W1 |
| 118 | CART-47 | SC | 15 / 5 | 3.00 | W2 |
| 119 | CART-71 | HP | 12 / 4 | 3.00 | D-DUP |
| 120 | CART-78 | DF | 12 / 4 | 3.00 | D-LOW |
| 121 | CART-94 | SC | 12 / 4 | 3.00 | W2 |
| 122 | CONTENT-04 | VN | 6 / 2 | 3.00 | D-DUP |
| 123 | CONTENT-21 | DF | 12 / 4 | 3.00 | D-REPROBE |
| 124 | CONTENT-30 | DF | 12 / 4 | 3.00 | D-REPROBE |
| 125 | CART-55 | SP | 17 / 6 | 2.83 | W2 |
| 126 | AUTH-11 | SP | 14 / 5 | 2.80 | W2 |
| 127 | CART-25 | SP | 14 / 5 | 2.80 | D-STATE |
| 128 | SEARCH-14 | HP | 11 / 4 | 2.75 | D-LOW |
| 129 | CART-17 | HP | 11 / 4 | 2.75 | D-LOW |
| 130 | CART-48 | HP | 11 / 4 | 2.75 | W2 |
| 131 | CONTENT-13 | SC | 11 / 4 | 2.75 | D-FLAKY |
| 132 | AUTH-06 | VN | 13 / 5 | 2.60 | D-ACCT |
| 133 | AUTH-40 | VN | 13 / 5 | 2.60 | D-ACCT |
| 134 | CART-56 | VN | 13 / 5 | 2.60 | W2 |
| 135 | AUTH-29 | HP | 10 / 4 | 2.50 | D-ACCT |
| 136 | AUTH-31 | VN | 10 / 4 | 2.50 | D-ACCT |
| 137 | AUTH-32 | VN | 10 / 4 | 2.50 | D-ACCT |
| 138 | AUTH-37 | HP | 10 / 4 | 2.50 | D-ACCT |
| 139 | AUTH-47 | VN | 5 / 2 | 2.50 | D-LOW |
| 140 | CATALOG-35 | HP | 10 / 4 | 2.50 | D-DATA |
| 141 | SEARCH-24 | VN | 5 / 2 | 2.50 | D-LOW |
| 142 | SEARCH-33 | DF | 10 / 4 | 2.50 | D-LOW |
| 143 | SEARCH-34 | DF | 10 / 4 | 2.50 | D-LOW |
| 144 | CART-05 | VN | 10 / 4 | 2.50 | D-LOW |
| 145 | CART-83 | VN | 5 / 2 | 2.50 | D-LOW |
| 146 | CART-91 | VN | 5 / 2 | 2.50 | D-LOW |
| 147 | AUTH-14 | HP | 17 / 7 | 2.43 | D-GATED |
| 148 | CART-67 | AA | 17 / 7 | 2.43 | D-ACCT |
| 149 | CART-62 | DF | 12 / 5 | 2.40 | D-DISC |
| 150 | CATALOG-22 | HP | 7 / 3 | 2.33 | D-DUP |
| 151 | CATALOG-39 | HP | 7 / 3 | 2.33 | D-LOW |
| 152 | CATALOG-44 | HP | 7 / 3 | 2.33 | D-LOW |
| 153 | SEARCH-05 | VN | 7 / 3 | 2.33 | D-LOW |
| 154 | SEARCH-11 | VN | 7 / 3 | 2.33 | D-DUP |
| 155 | SEARCH-30 | HP | 7 / 3 | 2.33 | D-LOW |
| 156 | CONTENT-34 | HP | 7 / 3 | 2.33 | D-REPROBE |
| 157 | AUTH-36 | AA | 16 / 7 | 2.29 | D-DUP |
| 158 | AUTH-41 | VN | 9 / 4 | 2.25 | D-ACCT |
| 159 | CART-41 | VN | 9 / 4 | 2.25 | D-LOW |
| 160 | AUTH-05 | SP | 11 / 5 | 2.20 | D-LOW |
| 161 | CATALOG-05 | HP | 11 / 5 | 2.20 | W2 |
| 162 | CATALOG-08 | HP | 11 / 5 | 2.20 | W2 |
| 163 | CATALOG-09 | HP | 11 / 5 | 2.20 | D-DATA |
| 164 | SEARCH-17 | HP | 11 / 5 | 2.20 | W2 |
| 165 | CART-20 | SP | 11 / 5 | 2.20 | D-STATE |
| 166 | CART-49 | HP | 11 / 5 | 2.20 | D-DUP |
| 167 | CART-76 | HP | 11 / 5 | 2.20 | D-STATE |
| 168 | CART-29 | SP | 13 / 6 | 2.17 | D-STATE |
| 169 | CART-72 | VN | 13 / 6 | 2.17 | D-REPROBE |
| 170 | AUTH-52 | SC | 15 / 7 | 2.14 | D-ACCT |
| 171 | AUTH-03 | HP | 8 / 4 | 2.00 | D-LOW |
| 172 | AUTH-12 | VN | 4 / 2 | 2.00 | D-LOW |
| 173 | AUTH-15 | HP | 4 / 2 | 2.00 | D-LOW |
| 174 | AUTH-16 | VN | 10 / 5 | 2.00 | D-ACCT |
| 175 | AUTH-26 | VN | 10 / 5 | 2.00 | D-ACCT |
| 176 | AUTH-30 | SP | 14 / 7 | 2.00 | D-ACCT |
| 177 | CATALOG-02 | HP | 4 / 2 | 2.00 | D-LOW |
| 178 | CATALOG-33 | SC | 12 / 6 | 2.00 | D-STATE |
| 179 | CATALOG-38 | VN | 4 / 2 | 2.00 | D-LOW |
| 180 | SEARCH-10 | HP | 8 / 4 | 2.00 | D-DATA |
| 181 | SEARCH-13 | VN | 4 / 2 | 2.00 | D-LOW |
| 182 | SEARCH-19 | VN | 8 / 4 | 2.00 | D-REPROBE |
| 183 | CART-19 | SP | 8 / 4 | 2.00 | D-LOW |
| 184 | CART-21 | HP | 10 / 5 | 2.00 | D-LOW |
| 185 | CART-22 | HP | 4 / 2 | 2.00 | D-LOW |
| 186 | CART-26 | VN | 4 / 2 | 2.00 | D-LOW |
| 187 | CART-50 | SP | 10 / 5 | 2.00 | D-STATE |
| 188 | CART-53 | HP | 4 / 2 | 2.00 | D-LOW |
| 189 | CART-54 | HP | 8 / 4 | 2.00 | D-LOW |
| 190 | CART-57 | VN | 10 / 5 | 2.00 | D-DUP |
| 191 | CART-58 | VN | 10 / 5 | 2.00 | D-DISC |
| 192 | CART-82 | HP | 8 / 4 | 2.00 | D-LOW |
| 193 | CART-87 | HP | 4 / 2 | 2.00 | D-LOW |
| 194 | CONTENT-03 | VN | 4 / 2 | 2.00 | D-LOW |
| 195 | CONTENT-09 | HP | 6 / 3 | 2.00 | D-LOW |
| 196 | CONTENT-10 | HP | 4 / 2 | 2.00 | D-LOW |
| 197 | CONTENT-31 | VN | 4 / 2 | 2.00 | D-LOW |
| 198 | AUTH-24 | SP | 13 / 7 | 1.86 | D-ACCT |
| 199 | AUTH-27 | DF | 13 / 7 | 1.86 | D-ACCT |
| 200 | CATALOG-06 | HP | 11 / 6 | 1.83 | D-DATA |
| 201 | SEARCH-26 | HP | 11 / 6 | 1.83 | D-DATA |
| 202 | CART-60 | HP | 11 / 6 | 1.83 | D-DISC |
| 203 | AUTH-04 | HP | 7 / 4 | 1.75 | D-LOW |
| 204 | AUTH-38 | HP | 7 / 4 | 1.75 | D-LOW |
| 205 | CATALOG-07 | VN | 7 / 4 | 1.75 | D-LOW |
| 206 | CATALOG-29 | HP | 7 / 4 | 1.75 | D-LOW |
| 207 | SEARCH-02 | HP | 7 / 4 | 1.75 | D-LOW |
| 208 | SEARCH-07 | HP | 7 / 4 | 1.75 | D-LOW |
| 209 | SEARCH-36 | VN | 7 / 4 | 1.75 | D-FLAKY |
| 210 | CART-18 | SP | 7 / 4 | 1.75 | D-LOW |
| 211 | CART-23 | HP | 7 / 4 | 1.75 | D-LOW |
| 212 | CART-52 | VN | 7 / 4 | 1.75 | D-LOW |
| 213 | CATALOG-28 | VN | 5 / 3 | 1.67 | D-LOW |
| 214 | CART-09 | VN | 10 / 6 | 1.67 | D-STATE |
| 215 | CONTENT-11 | HP | 5 / 3 | 1.67 | D-LOW |
| 216 | CATALOG-10 | VN | 8 / 5 | 1.60 | D-DATA |
| 217 | CATALOG-13 | SP | 8 / 5 | 1.60 | D-STATE |
| 218 | CATALOG-25 | SP | 8 / 5 | 1.60 | D-STATE |
| 219 | SEARCH-15 | HP | 8 / 5 | 1.60 | D-DATA |
| 220 | SEARCH-18 | VN | 8 / 5 | 1.60 | D-DATA |
| 221 | CART-51 | HP | 8 / 5 | 1.60 | D-DISC |
| 222 | AUTH-33 | SP | 11 / 7 | 1.57 | D-ACCT |
| 223 | CATALOG-14 | HP | 11 / 7 | 1.57 | D-DATA |
| 224 | CART-07 | HP | 9 / 6 | 1.50 | D-STATE |
| 225 | CART-31 | HP | 9 / 6 | 1.50 | D-STATE |
| 226 | CART-45 | VN | 6 / 4 | 1.50 | D-LOW |
| 227 | CART-65 | HP | 6 / 4 | 1.50 | D-LOW |
| 228 | AUTH-35 | SP | 10 / 7 | 1.43 | D-ACCT |
| 229 | CONTENT-20 | HP | 10 / 7 | 1.43 | D-GATED |
| 230 | CATALOG-11 | VN | 7 / 5 | 1.40 | D-LOW |
| 231 | CATALOG-20 | HP | 7 / 5 | 1.40 | D-DATA |
| 232 | CATALOG-32 | VN | 7 / 5 | 1.40 | D-STATE |
| 233 | SEARCH-35 | HP | 7 / 5 | 1.40 | D-DATA |
| 234 | CART-59 | VN | 7 / 5 | 1.40 | D-DUP |
| 235 | CART-61 | HP | 7 / 5 | 1.40 | D-LOW |
| 236 | CART-81 | HP | 7 / 5 | 1.40 | D-REPROBE |
| 237 | CART-88 | HP | 7 / 5 | 1.40 | D-LOW |
| 238 | CATALOG-30 | SP | 11 / 8 | 1.38 | D-STATE |
| 239 | CONTENT-24 | SP | 11 / 8 | 1.38 | D-GATED |
| 240 | CATALOG-18 | HP | 8 / 6 | 1.33 | D-DATA |
| 241 | SEARCH-16 | HP | 8 / 6 | 1.33 | D-DATA |
| 242 | SEARCH-20 | SP | 8 / 6 | 1.33 | D-STATE |
| 243 | SEARCH-21 | SP | 8 / 6 | 1.33 | D-STATE |
| 244 | SEARCH-22 | HP | 8 / 6 | 1.33 | D-DATA |
| 245 | CONTENT-06 | HP | 4 / 3 | 1.33 | D-LOW |
| 246 | CONTENT-07 | HP | 4 / 3 | 1.33 | D-LOW |
| 247 | CONTENT-08 | HP | 4 / 3 | 1.33 | D-LOW |
| 248 | CATALOG-15 | VN | 5 / 4 | 1.25 | D-LOW |
| 249 | CATALOG-19 | VN | 5 / 4 | 1.25 | D-LOW |
| 250 | CART-86 | SP | 5 / 4 | 1.25 | D-LOW |
| 251 | CART-89 | HP | 5 / 4 | 1.25 | D-LOW |
| 252 | CART-92 | HP | 5 / 4 | 1.25 | D-LOW |
| 253 | CATALOG-27 | SP | 6 / 5 | 1.20 | D-STATE |
| 254 | CATALOG-16 | HP | 7 / 6 | 1.17 | D-DATA |
| 255 | SEARCH-25 | HP | 7 / 6 | 1.17 | D-DATA |
| 256 | SEARCH-23 | HP | 8 / 7 | 1.14 | D-DATA |
| 257 | CART-85 | SP | 8 / 7 | 1.14 | D-STATE |
| 258 | CART-95 | SP | 8 / 7 | 1.14 | D-STATE |
| 259 | CATALOG-26 | SP | 6 / 6 | 1.00 | D-STATE |
| 260 | CART-73 | VN | 4 / 4 | 1.00 | D-LOW |
| 261 | CART-90 | HP | 5 / 5 | 1.00 | D-LOW |
| 262 | CART-93 | SP | 5 / 5 | 1.00 | D-LOW |
| 263 | CONTENT-25 | SC | 7 / 7 | 1.00 | D-GATED |
| 264 | CATALOG-17 | HP | 5 / 6 | 0.83 | D-DATA |

Rank of CART-96 is by score (3.17); it is nevertheless executed first as a prerequisite.

## 3. Selected for automation (Wave 1, 56)

Coverage of high-impact areas: auth 15 (login, register, access guard, cookie hygiene, logout), cart 18 (add, update, delete, checkout gating, visitor isolation), catalog 9 (browse and product page), search 6, content 8 (public pages, contact and newsletter validation, headers).

### Prerequisite
- UC-CART-96: Decides whether any cart test can trust per-test isolation (OQ-01); run first as a Playwright project dependency, and skip all cart tests if it shows a shared visitor for a different User-Agent.

### Auth (15)
- UC-AUTH-01: Cheapest proof that the login endpoint is reachable anonymously; unique endpoint LOGIN-FORM.
- UC-AUTH-02: The only successful login; proves credentials, returnUrl handling and the AUTH cookie, and gates all account cases.
- UC-AUTH-07: Account-enumeration guard on login (unknown user and wrong password give the same message).
- UC-AUTH-13: Registration form serves the anti-forgery token that the other register tests depend on; unique endpoint REGISTER-FORM.
- UC-AUTH-18: Password-length boundary at registration (5 chars rejected) without creating an account.
- UC-AUTH-21: Confirmed defect #9 (missing token gives 500 instead of 4xx), single request, `test.fail()`.
- UC-AUTH-22: Highest-value access-control check: every account page redirects anonymous callers to login.
- UC-AUTH-23: Authenticated profile render proves the session cookie is accepted.
- UC-AUTH-25: Anonymous address add is guarded (write path), unique endpoint ADDRESS-ADD guard.
- UC-AUTH-34: Cross-customer address id cannot be edited (authorisation); needs account, medium effort for state restore.
- UC-AUTH-39: Known security defect: back-in-stock page is open to anonymous callers (`test.fail()`).
- UC-AUTH-48: Known security defect: recovery/registration reveal whether an email exists (`test.fail()`).
- UC-AUTH-49: Known security defect: AUTH cookie is not invalidated on logout (`test.fail()`), medium effort for login/logout.
- UC-AUTH-50: Split assertion: HttpOnly and SameSite pass, Secure flag is a known gap (`test.fail()`/`expect.soft`).
- UC-AUTH-51: Visitor cookie is Secure/HttpOnly/SameSite=Lax; passes today and guards the cookie the cart depends on.

### Catalog (9)
- UC-CATALOG-01: Home page renders product tiles; smoke for the whole storefront.
- UC-CATALOG-03: Top-level category pages respond 200; smoke for the category route.
- UC-CATALOG-12: Known defect: page size 0 crashes the listing (`test.fail()`).
- UC-CATALOG-21: Unknown slug yields a proper 404 page (not a 500).
- UC-CATALOG-23: Known security issue #19: redirects downgrade to http (`test.fail()`).
- UC-CATALOG-24: Product page exposes price and add-to-cart links; the contract the cart tests start from.
- UC-CATALOG-34: Variant price recalculation (UPDATEPRODUCTDETAILS) is the only dynamic pricing check; chosen over higher-scored duplicates for endpoint coverage.
- UC-CATALOG-36: Known defect: price update for unknown product errors (`test.fail()`).
- UC-CATALOG-41: Known defect: reviews page with non-numeric id errors (`test.fail()`).

### Search (6)
- UC-SEARCH-01: Search returns hits for a known term; the core happy path.
- UC-SEARCH-03: Blank query validation message; cheap and deterministic.
- UC-SEARCH-09: Instant search fragment is the second search endpoint (INSTANT).
- UC-SEARCH-27: Known defect: page size -1 yields 502 (`test.fail()`, assert status only).
- UC-SEARCH-28: Known defect: rating filter 9 yields 502 (`test.fail()`).
- UC-SEARCH-32: HTML-encoding of the reflected query (XSS guard), cheap and high impact.

### Cart, checkout, wishlist, compare (18)
- UC-CART-01: Add to cart is the core purchase-path action.
- UC-CART-02: Quantity and line total consistency; medium effort (cart parsing and cleanup).
- UC-CART-27: Empty cart renders; baseline for every cart assertion.
- UC-CART-30: Updating a line quantity is a primary cart mutation.
- UC-CART-33: Known defect: update to quantity 0 returns 5xx (`test.fail()`).
- UC-CART-39: Known defect: update of an unknown line id returns 5xx (`test.fail()`).
- UC-CART-40: Delete a cart line; completes the add/update/delete loop.
- UC-CART-43: Known defect: delete with non-numeric id returns 5xx (`test.fail()`).
- UC-CART-46: Another visitor cannot delete my line; the cart authorisation check (medium effort, two contexts).
- UC-CART-66: Anonymous checkout start redirects to login; proves the checkout gate.
- UC-CART-69: Checkout entry with an empty cart redirects to the cart.
- UC-CART-70: Checkout entry with items reaches the billing step; proves cart-to-checkout hand-off.
- UC-CART-74: Invalid billing address is re-rendered with errors; only checkout POST that does not place an order.
- UC-CART-75: Known defect: later checkout steps are not gated by earlier ones (`test.fail()`).
- UC-CART-79: Known security finding #10: share link exposes the session cookie value (`test.fail()`).
- UC-CART-80: Known security finding: a leaked share guid grants access to the owner's cart (`test.fail()`).
- UC-CART-84: Known defect: compare add with non-numeric id returns 5xx (`test.fail()`); only compare UC in Wave 1.
- UC-CART-96: See Prerequisite.

### Content (8)
- UC-CONTENT-01: Six static pages load; broad smoke at one request each.
- UC-CONTENT-02: Contact form page loads.
- UC-CONTENT-14: Known issue: server/framework version disclosure (`test.fail()`).
- UC-CONTENT-15: Known issue: missing standard security headers (`test.fail()`).
- UC-CONTENT-16: Contact form rejects empty submission (validation, no message is stored).
- UC-CONTENT-22: Newsletter rejects malformed email (validation, no entry stored).
- UC-CONTENT-26: Known defect: newsletter without flag returns 5xx (`test.fail()`).
- UC-CONTENT-33: Known issue: newsletter JSON leaks .NET type names (`test.fail()`).

### Wave 2 (optional, 31; not part of the recommendation until Wave 1 is stable)
- AUTH: 08, 09, 11, 17, 28, 42, 53
- CATALOG: 05, 08, 31, 37
- SEARCH: 06, 17, 31
- CART: 03, 06, 15, 34, 35, 44, 47, 48, 55, 56, 64, 68, 94
- CONTENT: 17, 18, 29, 32

Wave 1 + Wave 2 = 87.

## 4. Deferred (177 = 264 - 56 - 31)

Opt-in side-effect UCs (D-GATED, not counted as default coverage, run only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`): AUTH-14, CONTENT-20, 24, 25.

| Code | Count | UCs | Reason |
|---|---|---|---|
| D-DUP | 33 | AUTH 10, 19, 20, 36, 44; CATALOG 22; SEARCH 04, 08, 11, 12, 29, 37; CART 04, 08, 16, 24, 28, 32, 36, 37, 38, 42, 49, 57, 59, 63, 71; CONTENT 04, 12, 19, 23, 27, 28 | Same endpoint and rule as a selected sibling; adds requests, not coverage. Revisit if the sibling fails. |
| D-ACCT | 16 | AUTH 06, 16, 24, 26, 27, 29, 30, 31, 32, 33, 35, 37, 40, 41, 52; CART 67 | Needs a logged-in account and mutates profile/address data on a shared host, or needs a second account; restore is only best-effort. |
| D-GATED | 4 | AUTH-14; CONTENT 20, 24, 25 | Irreversible side effects (new account, stored contact message, newsletter entry); opt-in only. |
| D-DATA | 18 | CATALOG 06, 09, 10, 14, 16, 17, 18, 20, 35; SEARCH 10, 15, 16, 18, 22, 23, 25, 26, 35 | Sort/filter/paging results depend on live catalog contents; assertions would be brittle or need catalog snapshots. |
| D-STATE | 19 | CATALOG 13, 25, 26, 27, 30, 32, 33; SEARCH 20, 21; CART 07, 09, 20, 25, 29, 31, 50, 76, 85, 95 | Persistent per-visitor state (view mode, currency, recently viewed, compare cookie, huge quantities) with leakage risk to other tests. |
| D-DISC | 4 | CART 51, 58, 60, 62 | Correct behaviour undefined or not fully discovered (wishlist update, gift card, shipping estimate); needs discovery first. |
| D-REPROBE | 8 | CATALOG 42, 43; SEARCH 19; CART 72, 81; CONTENT 21, 30, 34 | Thin or curl-only evidence (CONF-01), extrapolated or unverified field names; re-probe in a headed session before promoting. |
| D-FLAKY | 2 | SEARCH-36; CONTENT-13 | Overlong URL depends on ELB/IIS limits; plain http may be blocked in the test environment. |
| D-LOW | 73 | AUTH 03, 04, 05, 12, 15, 38, 43, 45, 46, 47; CATALOG 02, 04, 07, 11, 15, 19, 28, 29, 38, 39, 40, 44; SEARCH 02, 05, 07, 13, 14, 24, 30, 33, 34; CART 05, 10, 11, 12, 13, 14, 17, 18, 19, 21, 22, 23, 26, 41, 45, 52, 53, 54, 61, 65, 73, 77, 78, 82, 83, 86, 87, 88, 89, 90, 91, 92, 93; CONTENT 03, 05, 06, 07, 08, 09, 10, 11, 31 | Low incremental value: aliases, POST-only/method checks, near-duplicate boundaries, empty-state pages, curl-only static feeds. |

Sum: 56 + 31 + 33 + 16 + 4 + 18 + 19 + 4 + 8 + 2 + 73 = 264.

## 5. Suite design notes

### Shared helpers in `tests/support/`
- `client.ts`: factory for a fresh `APIRequestContext` per test with `User-Agent: bearstore-qa/<runId>/<testId>`, base URL from `BASE_URL`, and helpers for `maxRedirects: 0` redirect assertions and bodyless POST (`data: ''` so `Content-Length: 0` is sent).
- `auth.ts`: `login()` helper; account fixture using `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` (defaults in the existing file), skipping @needs-account tests when absent. A worker-scoped fixture that registers a fresh account is allowed only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`; any generated password stays in memory and is never written to disk.
- `cart.ts`: `ADD(pid, qty)`, `COUNTS()`, `LINE(pid)` (reads `sciItemId` from `GET /cart`; line ids are never guessed) and `CLEAN()` (delete lines created by the test; delete is the only cleanup, nothing else is mutable).
- `html.ts`: DOM-parse helpers scoped to `article.art[data-id]`, price parsing, `Set-Cookie` parsing and a `storageState()` cookie reader (includes HttpOnly cookies; needed for the Share GUID == `SMARTSTORE.VISITOR` check).
- `known-issue.ts`: wrappers for @defect / @known-issue / @security tags with `test.fail()`, asserting the correct behaviour (never 5xx; 4xx preferred) and status only for ELB 502s.

### Test data requirements
- Products: SIMPLE = id 32 (`/fast-cars-image-calendar-2013`), P2 = 33, VARIANT = 65 (`/cube-chair`). Assert invariants, not counts or catalog order.
- Credentials via `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` for AUTH-02, 23, 34, 49, 50.
- Currency must stay USD; no Wave 1 test changes it.
- Nothing is created that cannot be undone: carts are per-test visitors, and no Wave 1 test submits a valid contact, newsletter or registration form.

### Spec files (one per area, titles start with the UC ID)
- `tests/auth.api.spec.ts` (15)
- `tests/catalog.api.spec.ts` (9)
- `tests/search.api.spec.ts` (6)
- `tests/cart.api.spec.ts` (17: cart, checkout, wishlist share, compare)
- `tests/cart-probe.api.spec.ts` (1: UC-CART-96, a Playwright project dependency of the cart project; config change belongs to the test-writing stage)
- `tests/content.api.spec.ts` (8)

Run settings to recommend: modest `workers`, `retries: 0` for @defect tests, one request per 5xx probe. Map every UC in `qa/04-coverage.md`.

## 6. Issues for the human

1. Scoring detail: per-factor values (Impact, Likelihood, Coverage, Cost, Stability) are not itemised in the full table; only N = 2I + L + C and D = Co + St are shown, so a reviewer cannot re-check individual factors without re-deriving them. The five factors for each selected UC should be recorded when `qa/04-coverage.md` is built, or on request.
2. UC-SEARCH-19 errata: it states that `s=0` is covered by UC-SEARCH-27, but UC-SEARCH-27 covers `s=-1` only; `s=0` on `/search` (the "did not match" page) has no UC.
3. UC-CART-94 errata: it cites "UC-AUTH-48 to 53"; it should read UC-AUTH-52 only. GET `/logout` and compare remove/clear over GET have no separate secure-expectation UC.
4. UC-CATALOG-42 and 43 have no endpoint id and rely on SUMMARY-only evidence (deferred, re-probe).
5. UC-CONTENT-21 and 30 rest on curl-only evidence (CONF-01); UC-CONTENT-34 is unverified and curl-only; UC-CONTENT-07, 08, 09, 10 are curl-only (low priority). UC-CART-72 is extrapolated (Stability raised to 4); UC-CART-81 field names are unverified.
6. UC-AUTH-44 asserts the current insecure text and contradicts UC-AUTH-48 by design; automate only one of them (AUTH-48 selected).
7. Finding #19 (http:// in 301) appears in UC-CATALOG-23, UC-SEARCH-31 and UC-CONTENT-12; only CATALOG-23 is in Wave 1. Finding #9 appears in UC-AUTH-21, 28, 42; only AUTH-21 is in Wave 1.
8. UC-AUTH-50 needs split assertions (HttpOnly and SameSite pass; Secure is `test.fail()` or `expect.soft`).
9. UC-CONTENT-13 (plain http) may be blocked in the environment; deferred as flaky.
10. UC-CART-96 should be a real gate (project dependency), not just an annotation.
11. UC-CART-47 deliberately does not assert B's status (observed 500). UC-CART-06 bundles 5 requests including `99999999999`. UC-CART-51 and 62 have undefined correct behaviour.
12. UC-CART-68 refers to `EP-CART-LOGIN-GUEST`, UC-CONTENT-11 to `EP-CCN-PAGE-CONTACT-GET`, and UC-CART-24/25 to `EP-CATALOG-CARTSUMMARY`. These ids are absent from the SUMMARY endpoint table but exist in the endpoints.json files (low priority).
13. Wave 1 deviates from a pure score cut (see section 1); AUTH-08 and AUTH-44 at 5.00 are not selected while CATALOG-34 (3.25) and CART-46 (3.00) are.
14. UC-CONTENT-34 (Password recovery confirm) and ACTIVATION: no UC for ACTIVATION; discovery gap.
15. UC-SEARCH-33 and 34 are typed DF in the source scoring but read as ordinary checks; type may need review.
