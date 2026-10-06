# Stage 2: API use cases for Bearstore / SmartStore

## Overview matrix (area x type)

Types: HP = happy path, VN = validation/negative (invalid input, boundaries, not-found), AA = auth/access, SP = state/persistence, DF = defect (confirmed server error or functional defect, correct behaviour asserted, `test.fail()` later), SC = security (read-only, deterministic).

| Area | UC prefix | HP | VN | AA | SP | DF | SC | Total |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| auth | UC-AUTH | 12 | 18 | 4 | 6 | 4 | 9 | 53 |
| catalog | UC-CATALOG | 18 | 11 | 1 | 5 | 6 | 3 | 44 |
| search | UC-SEARCH | 15 | 12 | 1 | 2 | 5 | 2 | 37 |
| cart-compare-wishlist | UC-CART | 32 | 29 | 3 | 11 | 15 | 6 | 96 |
| content-contact-newsletter | UC-CONTENT | 10 | 11 | 0 | 1 | 6 | 6 | 34 |
| **Total** | | **87** | **81** | **9** | **25** | **36** | **26** | **264** |

Gated UCs: 4 are `@side-effect` (1 registration in auth, 1 valid contact POST, 1 newsletter subscribe+unsubscribe, 1 newsletter unsubscribe of an unknown address) and run only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`. UCs tagged `@needs-account` run only when `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` are set or a per-run account was registered.

### Endpoints with no use case yet

| Endpoint | Why |
|---|---|
| EP-CONTENT-NEWSLETTER-ACTIVATION | `GET /newsletter/subscriptionactivation` needs the emailed token; route shape unconfirmed (bare GET 502, other shapes 404). Mail-based flow is out of scope (decision f). |

Every other endpoint id in endpoints.json has at least one UC. Success-only paths of covered endpoints have no UC (decision f, out of scope or no observation): successful change-password, password recovery for an existing user, recovery-confirm POST, valid billing/shipping method/payment/confirm POSTs and order placement, valid coupon and gift card codes, email-a-friend wishlist POST, review and ask-a-question POSTs, newsletter activation. Checkout steps `shippingaddress`, `shippingmethod`, `paymentmethod` are only touched as part of UC-CART-72.

### Layout deviation

The Edit tool was disabled for this session, so the UCs live in one file per area and this file is the index, matrix and shared conventions. The UC blocks are unchanged otherwise (`### UC-<AREA>-NN: title`, then `Meta`, `Endpoints`, `Request`, `Expected`, `State/cleanup`, `Evidence`). Stage 3 should parse all files listed here.

| File | UCs |
|---|---|
| qa/02-use-cases/auth.md | UC-AUTH-01 to UC-AUTH-53 |
| qa/02-use-cases/catalog.md | UC-CATALOG-01 to UC-CATALOG-44 |
| qa/02-use-cases/search.md | UC-SEARCH-01 to UC-SEARCH-37 |
| qa/02-use-cases/cart.md | UC-CART-01 to UC-CART-55 |
| qa/02-use-cases/cart-checkout-compare.md | UC-CART-56 to UC-CART-96 |
| qa/02-use-cases/content.md | UC-CONTENT-01 to UC-CONTENT-34 |

Block field mapping to the requested layout: `Meta` carries Area, Type, Side-effect and tags; `Request` carries method, URL, headers and body; `Expected` carries status, redirect, cookies, body signal; `State/cleanup` carries preconditions, state and cleanup.

### Errata (cannot be edited in place)

- UC-SEARCH-19 says `s=0` is covered by UC-SEARCH-27. It is not: UC-SEARCH-27 covers `s=-1` only. `s=0` on `/search` returns the "did not match" page (SUMMARY section 4 #2) and has no UC.
- UC-CART-94 says changecurrency is covered by UC-CATALOG-33 and addressdelete by UC-AUTH-52 (correct), but its first clause cites "UC-AUTH-48 to UC-AUTH-53"; read it as UC-AUTH-52 only. GET `/logout` and compare remove/clear over GET have no separate secure-expectation UC.

## Needs more discovery

| Item | Missing fact | Effect |
|---|---|---|
| Newsletter activation (OQ-50) | route shape and token format | no UC (EP-CONTENT-NEWSLETTER-ACTIVATION) |
| Recovery confirm POST (OQ-16) | response for bad token, valid token | only the GET form is covered (UC-CONTENT-34) |
| Wishlist update totals (finding #21) | what the correct response should contain (wishlist subtotal, empty totals?) | UC-CART-51 does not assert `SubTotal` or `totalsHtml` |
| Product 24 availability (finding #26, OQ-24) | which of schema InStock and "Product is not available" is intended | no UC asserts product 24 availability |
| Currency effect on cart (OQ-47) | whether a currency switch changes cart totals or loses the cart | no UC |
| Valid coupon and gift card (OQ-40), non-zero shipping and tax (OQ-41) | known codes, shipping rates | only failure paths; shipping UC asserts price pattern only |
| Contact length limit (OQ-53) | maximum length; each valid POST mails the owner | no oversized-contact UC |
| Variant, bundle and minimum-quantity products (OQ-46) | product ids with those rules | only tier and variant checks listed in catalog.md |
| Instant search without Content-Length (411) | Playwright always sends a length | not testable with the `request` fixture |
| Cart summary without Content-Length (411) | same | not testable |
| Empty mini-cart wording, empty wishlist wording | not recorded | UC-CART-22 and UC-CART-53 assert absence of lines only |
| Move between cart and wishlist with unknown id | "not probed" (EP-CART-MOVE failure) | no negative UC for move |
| Other checkout steps with an empty cart | only billingaddress, confirm and `/checkout` documented | UC-CART-72 flags a mismatch as a discovery note |
| `<` in newsletter or contact fields (CONF-01) | evidence is curl-only | UC-CONTENT-21 and UC-CONTENT-30 need a re-probe |
| Order history rows (OQ-12), GdprConsent behaviour (OQ-55), askquestionajax for an unknown id (OQ-25) | not observed | no UC beyond what is in auth.md and catalog.md |
| Visitor isolation (OQ-01) | whether cookieless requests with the same IP and User-Agent share a GUID | UC-CART-96 is a probe; unique User-Agent per test is the mitigation |
| Exact selector of the main product list container | discovery names `.product-grid-home-page`, `.artlist`, `.search-hitcount` | confirm in Stage 3 from the HTML |

## Assumptions the human should confirm

1. Security UCs for confirmed findings assert the SECURE expectation and carry `@known-issue` with `test.fail()` (like defects). Those without the tag pass today.
2. Defect UCs assert "4xx, or where the endpoint's own convention is JSON validation, 200 with `success:false`; never 5xx". If you want strictly 4xx, tighten them in Stage 3.
3. UC-CATALOG-42 and UC-CATALOG-43 use paths that are not in endpoints.json (`/product/productdetails/24`, `/catalog/category/14`); they are marked `Endpoints: none`.
4. Wishlist, compare and cart state is per visitor; every UC uses a fresh context with a unique User-Agent suffix (see Conventions).

## Conventions used by every use case

**Block layout (parseable).** Each UC is `### UC-<AREA>-NN: title` followed by bullet lines: `Meta` (area, type, side-effect flag, tags), `Endpoints` (ids from endpoints.json; `none` where the path is not in endpoints.json), `Request`, `Expected`, `State/cleanup`, `Evidence`.

**Types.** `happy path`; `validation/negative` (invalid input, boundary values, not-found); `auth/access` (anonymous vs authenticated, ownership, redirects); `state/persistence` (a state transition and its reverse, per-visitor server state); `defect` (confirmed server-error or functional defect, correct behaviour asserted); `security` (read-only deterministic findings, items 10-16 of SUMMARY section 4).

**Isolation (decision d).** Every test builds its own `APIRequestContext` (no shared cookie jar) with `User-Agent: bearstore-qa/<runId>/<testId>`. Cookieless requests with equal IP and UA may share a visitor GUID (OQ-01), so UA suffixes must be unique per test. Cart line ids (`sciItemId`) are never hard-coded: read them from `GET /cart` (`input[name^=itemquantity]` suffix, or `data-sci-id` in the offcanvas fragment). Redirect assertions use `maxRedirects: 0`. A bodyless POST sends `Content-Length: 0` (use `data: ''`). `AJAX` means header `X-Requested-With: XMLHttpRequest` (sent as the UI does; not required, OQ-43).

**Cleanup (afterEach, best effort, own context only).** Delete every cart line (`POST /shoppingcart/deletecartitem?cartItemId=<id>`), every wishlist line (same with `&wishlistItem=True`), `GET /catalog/clearcomparelist`, `GET /changecurrency/1?returnUrl=/` (USD), `GET /<any category>?v=grid&s=24` when `v` or `s` were changed. Contexts are disposed afterwards, so cleanup matters mostly for server-side state tied to a GUID.

**Accounts (decision a).** `ACCT` = login of `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` when both are set; otherwise one account registered per run by a worker-scoped fixture (`qa-<ts>-<rand>@example.com`, password generated in memory, never written to disk). Registration is a side effect, so without credentials and without `BEARSTORE_ALLOW_SIDE_EFFECTS=1` every `@needs-account` UC is skipped. A new context logs in per test (`POST /login`) rather than sharing cookies. Tests that change profile or addresses restore the original values. No test changes the password successfully (decision f).

**Side effects (decision c).** `Side-effect: yes` UCs (valid contact POST, newsletter subscribe+unsubscribe pair, registration) run only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`; tag `@side-effect`. Validation-failure UCs always run. Out of scope (decision f, no UC): order placement, valid billing/shipping/payment/confirm POSTs, successful change-password, valid coupon or gift card, mail-based flows (recovery for a real user, newsletter activation, email-a-friend POST, review and ask-a-question POST).

**Defects (decision b).** `@defect` UCs are single requests (never looped) that assert the CORRECT behaviour, written as `test.fail()` with a defect id assigned later. The correct behaviour is a 4xx (400/404/422). Never assert 500/502 as expected. Several sibling endpoints report validation as HTTP 200 plus `{success:false}`; Stage 3 may accept that as an alternative to 4xx where a UC says "or 200 success:false". In all cases "never 5xx" is the minimum. 502 responses come from the ELB: assert on status only.

**Security UCs (decision e).** `@security` UCs are read-only, deterministic, one or two requests, no fuzzing, no load. They assert the SECURE expectation; where the finding is confirmed they are also tagged `@known-issue` and written with `test.fail()` like defects. Those without `@known-issue` pass today and guard a good property.

**Data stability.** Catalog data may change; assert invariants (ordering, subset relations, filter bounds, message texts, status), not counts. Product picks: `SIMPLE` = a product without variants and with a price (preferred id 32, `/fast-cars-image-calendar-2013`, $16.95; verify `200` and an `addtocart` link in setup, else take the first product of `GET /books` whose page has no `pvari` input). `VARIANT` = id 65, `/cube-chair` (attrs `pvari65-0-21-34` values 168/169, tiers at qty 4+). Product pool for multi-product tests: ids read from `GET /books` product tiles.

**Scoped selectors for `article.art`.** The class is reused by product tiles, sub-category tiles (`.artlist-sub-categories`, `data-id` = category id, href is a category slug) and the recently-viewed block (`.recently-viewed-product-grid`, appended to every page once the `SmartStore.RecentlyViewedProducts` cookie exists). Count and ordering assertions must select `article.art[data-id]` inside the main list container and exclude those two sub-blocks (exact container class to confirm in Stage 3 from the HTML; discovery names `.product-grid-home-page` for home, `.artlist` for listings, `.search-hitcount` for search). In HTTP-level tests parse the HTML string with a DOM parser; no rendering.

**Instant search.** Assert only presence or absence of `a.instasearch-hit` (no-hit bodies are either 0 bytes or 3 bytes of whitespace).

## Request field dictionary (bodyFields normalised, decision g)

Format `{name, example, required, description}`. Area files in discovery are not edited.

**POST /login?returnUrl={url}** (urlencoded)

| name | example | required | description |
|---|---|---|---|
| UsernameOrEmail | `$BEARSTORE_EMAIL` | yes | email (case-insensitive) or username |
| Password | `$BEARSTORE_PASSWORD` | yes | case-sensitive |
| RememberMe | `false` | no | `true` gives +30d cookie, `false` session cookie |

**POST /register?returnUrl={url}** (urlencoded; token from the `GET /register` form field AND the `__RequestVerificationToken` cookie)

| name | example | required | description |
|---|---|---|---|
| __RequestVerificationToken | (from form) | yes | missing gives 500 (defect #9) |
| FirstName / LastName | `QA` / `Bot` | no | optional |
| DateOfBirthDay/Month/Year | blank | no | not exercised |
| Email | `qa-<ts>-<rand>@example.com` | yes | email format |
| Username | `qa<ts><rand>` | yes (server side) | "Username is not provided" when missing |
| Password | generated in memory | yes | 6-500 chars |
| ConfirmPassword | same | yes | must equal Password |
| Company | `QA` | no | |
| register-button | `Register` | no | submit marker |

**POST /customer/info** (token required): `__RequestVerificationToken` (yes), `FirstName`, `LastName`, `DateOfBirthDay/Month/Year`, `Email` (yes, email format), `Company`, `save-info-button`. Omitted fields are blanked by the server, so always post the full set read from `GET /customer/info`.

**POST /customer/addressadd, /customer/addressedit/{id}** (urlencoded, no token)

| name | example | required | description |
|---|---|---|---|
| Address.Id | `0` / `{id}` | yes | 0 on add |
| Address.FirstName, Address.LastName | `QA`, `Addr` | yes | "'First name' should not be empty." |
| Address.Email | `qa-addr@example.com` | yes | email format |
| Address.Company, Address1, Address2, City, ZipPostalCode, PhoneNumber | free text | no | |
| Address.CountryId | `0` / `1` (US) / `62` (PL) | no | 0 = none |
| Address.StateProvinceId | `0` | no | |

**POST /customer/changepassword** (token required): `__RequestVerificationToken` (yes), `OldPassword` (yes), `NewPassword` (yes), `ConfirmNewPassword` (yes). Only failing variants are used.

**POST /customer/passwordrecovery**: `Email` (yes, email format), `send-email=Submit` (yes: without it the form is re-rendered silently).

**POST /cart/addproduct/{productId}/{type}** (type 1 cart, 2 wishlist): `addtocart_{productId}.EnteredQuantity` (example `1`, optional, integer 1..10000; wrong or missing field name adds 1).

**POST /shoppingcart/updatecartitem?sciItemId={id}&isCartPage=True**: `newQuantity` (example `3`, yes, integer 1..10000), `isCartPage` (`true`), `isWishlist` (`false` or `true`).

**POST /cart** (form; multipart or urlencoded; the submit field selects the action): `itemquantity{sciId}` (example `1`), plus one of `discountcouponcode` + `applydiscountcouponcode=applydiscountcouponcode`; `giftcardcouponcode` + `applygiftcardcouponcode=applygiftcardcouponcode`; `CountryId`, `StateProvinceId`, `ZipPostalCode` + `estimateshipping=Estimate shipping`; `continueshopping=continueshopping`; `startcheckout=startcheckout`.

**POST /checkout/billingaddress**: `NewAddress.Id=0`, `NewAddress.FirstName` (yes), `NewAddress.LastName` (yes), `NewAddress.Email` (yes), `NewAddress.CountryId`, `NewAddress.StateProvinceId`, optional company/address/city/zip/phone, `nextstep`. Only the invalid variant is used.

**POST /contactus** (urlencoded): `FullName` (optional), `Email` (yes), `Enquiry` (yes, whitespace-only rejected), `send-email` (optional marker).

**POST /newsletter/subscribe** (urlencoded): `subscribe` (`true` or `false`, yes; missing, empty or non-boolean gives 502 = defect), `email` (yes, valid email), `GdprConsent` (`''` on subscribe, `true` on unsubscribe, not enforced).

**POST /search, /instantsearch**: `q` (example `watch`, yes; min 2 chars). **GET /search** query: `q`, `c` (category id, repeatable), `p` (`from~to`), `r` (1..4), `d` (1..3), `a` (`True`), `o` (1, 5, 6, 10, 11, 15), `s` (page size, positive int), `i` (1-based page), `v` (`list` or `grid`).

**POST /product/updateproductdetails?productId={id}&bundleItemId=0**: `pvari{pid}-0-{attrId}-{n}` (example `pvari65-0-21-34=169`, optional variant value id), `addtocart_{pid}.AddToCart.EnteredQuantity` (example `5`, optional).

## Totals

| Area | Total | HP | VN | AA | SP | DF | SC |
|---|---:|---:|---:|---:|---:|---:|---:|
| auth | 53 | 12 | 18 | 4 | 6 | 4 | 9 |
| catalog | 44 | 18 | 11 | 1 | 5 | 6 | 3 |
| search | 37 | 15 | 12 | 1 | 2 | 5 | 2 |
| cart-compare-wishlist | 96 | 32 | 29 | 3 | 11 | 15 | 6 |
| content-contact-newsletter | 34 | 10 | 11 | 0 | 1 | 6 | 6 |
| **All** | **264** | **87** | **81** | **9** | **25** | **36** | **26** |
