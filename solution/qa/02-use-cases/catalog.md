# AREA: CATALOG (part of qa/02-use-cases.md; conventions, field dictionary and matrix are in that file)

Meta line format: `Area | Type | Side-effect | Tags`. All catalog UCs are anonymous and read-only except currency and recently-viewed, which write per-visitor state (cleanup noted). Listing assertions use scoped product tiles only (see "Scoped selectors for article.art" in the main file). `LEAF` = a leaf category with at least 5 products, e.g. `/golf` (discovery lists products 5 to 8 and more); `LIST` = `/books`.

### UC-CATALOG-01: Home page renders product tiles
- Meta: catalog | happy path | Side-effect: no | @smoke
- Endpoints: EP-CATALOG-HOME
- Request: `GET /`, anonymous.
- Expected: 200 `text/html`; `div.home-page` present; at least one `article.art[data-id]` inside the home product grid; `Set-Cookie: SMARTSTORE.VISITOR`. Do not assert 22 tiles.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-HOME.

### UC-CATALOG-02: /home is an alias of the home page
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-HOME
- Request: `GET /home`.
- Expected: 200; same `div.home-page` marker as UC-CATALOG-01.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-HOME bodySignal.

### UC-CATALOG-03: Top-level category pages respond 200 with a category title
- Meta: catalog | happy path | Side-effect: no | @smoke
- Endpoints: EP-CATALOG-CATEGORY
- Request: one `GET` each for `/books`, `/furniture`, `/sports`, `/gaming`, `/watches`, `/gift-cards`.
- Expected: 200; `<title>` starts with `Shop.` and contains the category name (case-insensitive); at least one `article.art` in the main list.
- State/cleanup: none.
- Evidence: flows.md Catalog F1.

### UC-CATALOG-04: Catalog pages are public (no redirect to login)
- Meta: catalog | auth/access | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY, EP-CATALOG-PRODUCT, EP-CATALOG-NEWPRODUCTS, EP-CATALOG-RECENT
- Request: anonymous `GET /books`, a product slug read from it, `/newproducts`, `/recentlyviewedproducts`, `maxRedirects: 0`.
- Expected: each 200; none returns 302 to `/login`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 3.

### UC-CATALOG-05: Sort by name ascending and descending orders the listing
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET {LEAF}?o=5` and `GET {LEAF}?o=6`.
- Expected: 200; product tile names (excluding sub-category tiles and recently-viewed block) are sorted case-insensitively ascending for `o=5` and descending for `o=6`; both responses contain the same set of product ids.
- State/cleanup: none.
- Evidence: flows.md Catalog F2; endpoints.json EP-CATALOG-CATEGORY (param o).

### UC-CATALOG-06: Sort by price orders the listing
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET {LIST}?o=10` and `GET {LIST}?o=11`, fresh context in USD.
- Expected: 200; tile prices (parsed from the price text) are non-decreasing for `o=10` and non-increasing for `o=11`; same product id set.
- State/cleanup: none. Flakiness: tiles with tier or "from" prices; compare only parsed numeric first price.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-07: Unknown sort values fall back to the default order
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET {LEAF}`, `GET {LEAF}?o=999`, `GET {LEAF}?o=abc`.
- Expected: all 200; the product id sequence of the latter two equals that of the first.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-CATEGORY (o).

### UC-CATALOG-08: Small page size limits the page and shows a pager
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /sports?s=3` (sports has 10 products plus tiles).
- Expected: 200; at most 3 product tiles in the main list; text `Page 1 of N` with N greater than 1; `a.btn-pager-next` present. Natural paging does not occur at the default size (OQ-20), so `s=3` is how paging is tested.
- State/cleanup: `s` is stored server side for the visitor (session cookie); the context is disposed.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-09: Second page continues the list without overlap
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /sports?s=3&i=1` and `GET /sports?s=3&i=2`.
- Expected: 200 both; the product id sets are disjoint; page 2 has no sub-category tiles; text `Page 2 of N`.
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-10: Out-of-range page index is clamped
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /sports?s=3&i=99`, `?s=3&i=0`, `?s=3&i=-1`.
- Expected: all 200; `i=99` shows the last page (`Page N of N`); `i=0` and `i=-1` show page 1 (same ids as `i=1`).
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-11: Non-numeric or huge page size falls back to the default
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /sports?s=abc`, `GET /sports?s=1000`.
- Expected: 200; all products of the category on one page (no pager `next`); same product id set as the unpaged listing.
- State/cleanup: none.
- Evidence: flows.md Catalog F2; endpoints.json EP-CATALOG-CATEGORY (s).

### UC-CATALOG-12: Page size 0 must not crash the listing
- Meta: catalog | defect | Side-effect: no | @defect (defect #5)
- Endpoints: EP-CATALOG-CATEGORY
- Request: single `GET /sports?s=0`.
- Expected (correct): 4xx, or a 200 default-size listing like `s=abc` (human to choose, see conventions). Never 500. Observed: 500 "Internal Server Error". `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #5.

### UC-CATALOG-13: View mode list persists per visitor until switched back
- Meta: catalog | state/persistence | Side-effect: no (server-side session state) | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: in ONE context: `GET /books?v=list`; `GET /books`; `GET /books?v=grid`; `GET /books`. Then in a fresh context `GET /books`.
- Expected: responses 1 and 2 contain `artlist-lines`; responses 3 and 4 contain `artlist-grid` and not `artlist-lines`; the fresh context renders grid. Session cookie `ASP.NET_SessionId` appears after the first request.
- State/cleanup: ends in grid; dispose context.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-14: Price facet restricts prices to the range
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?p=10~25`, plus `GET /books?p=%7e25` and `GET /books?p=25~`.
- Expected: 200; every product price is in the range (`10 <= price <= 25`; `<= 25`; `>= 25`); each id set is a subset of the unfiltered `/books` ids. `%7e` and literal `~` give the same ids.
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-15: Non-numeric price facet is ignored
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?p=abc`.
- Expected: 200; same product ids as `GET /books`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-CATEGORY (p).

### UC-CATALOG-16: Rating facet narrows the listing
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?r=4`, `GET /books`.
- Expected: 200; ids of `r=4` are a subset of the unfiltered ids; count of `r=4` is less than or equal to the unfiltered count.
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-17: Rating facet 5 is empty and 0 is ignored
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?r=5`, `GET /books?r=0`.
- Expected: 200 both; `r=5` shows no products in the main list; `r=0` equals the unfiltered ids.
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-18: Delivery-time facet filters and combines as union
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?d=1`, `?d=2`, `?d=1,2`.
- Expected: 200; each id set is a subset of unfiltered; ids of `d=1,2` equal the union of `d=1` and `d=2`. Meaning of the ids is not asserted (OQ-21).
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-19: Unknown delivery id gives an empty list
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /books?d=99`.
- Expected: 200; no product tiles in the main list.
- State/cleanup: none.
- Evidence: flows.md Catalog F2.

### UC-CATALOG-20: Sub-category tiles are shown on page 1 and hidden by any filter
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CATEGORY
- Request: `GET /sports` and `GET /sports?r=1`.
- Expected: 200; the first has at least one tile inside `.artlist-sub-categories` whose href is a category slug; the second has none visible (container missing or hidden class `hide-on-active-filter`).
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-CATEGORY bodySignal.

### UC-CATALOG-21: Unknown slug returns the 404 page
- Meta: catalog | validation/negative | Side-effect: no | @smoke
- Endpoints: EP-CATALOG-NOTFOUND
- Request: `GET /no-such-product-<runId>`; `GET /books/spiegel-bestseller`.
- Expected: 404; `<title>` `Shop. 404`; `div.not-found-page` with text `Sorry! The page you were looking for could not be found.`
- State/cleanup: none.
- Evidence: flows.md Catalog F5.

### UC-CATALOG-22: Upper-case and trailing-slash slugs are redirected to the canonical form
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-NOTFOUND
- Request: `GET /BOOKS?o=5`, `GET /books/`, `maxRedirects: 0`.
- Expected: 301; `Location` path is `/books` (lower case, no trailing slash) and keeps `o=5`. The scheme is asserted separately in UC-CATALOG-23.
- State/cleanup: none.
- Evidence: flows.md Catalog F5.

### UC-CATALOG-23: Canonical redirect keeps https
- Meta: catalog | security | Side-effect: no | @security @known-issue (finding #19)
- Endpoints: EP-CATALOG-NOTFOUND
- Request: single `GET /BOOKS`, `maxRedirects: 0`.
- Expected (secure): `Location` begins `https://`. Observed: `http://bearstore-testsite.smartbear.com/books`. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #19.

### UC-CATALOG-24: Product page exposes price metadata and add-to-cart links
- Meta: catalog | happy path | Side-effect: no | @smoke
- Endpoints: EP-CATALOG-PRODUCT
- Request: pick the first product link from `GET /books`; `GET /<slug>`.
- Expected: 200; `<title>` starts `Shop.`; `h1.pd-name` non-empty; `meta[itemprop=price]` numeric and `meta[itemprop=priceCurrency]` = `USD`; an add-to-cart control with `data-href="/cart/addproduct/<id>/1"`, wishlist `/cart/addproduct/<id>/2`, compare `/catalog/addproducttocompare/<id>`; `Set-Cookie: SmartStore.RecentlyViewedProducts=RecentlyViewedProductIds=<id>` (HttpOnly).
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-PRODUCT.

### UC-CATALOG-25: Recently viewed lists products newest first
- Meta: catalog | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CATALOG-PRODUCT, EP-CATALOG-RECENT
- Request: one context; `GET` three different product slugs A, B, C in order; `GET /recentlyviewedproducts`.
- Expected: 200; the main list product ids are C, B, A in that order; cookie `SmartStore.RecentlyViewedProducts` holds the same ids.
- State/cleanup: cookie lives in the disposed context.
- Evidence: flows.md Catalog F3.

### UC-CATALOG-26: Recently viewed keeps at most 8 products
- Meta: catalog | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CATALOG-PRODUCT, EP-CATALOG-RECENT
- Request: one context; view 9 distinct product slugs taken from `/books`, `/sports`, `/watches`; `GET /recentlyviewedproducts`.
- Expected: 200; exactly 8 product tiles in the main list; the first-viewed product is absent; the cookie holds 8 ids. (Only 9 plain product GETs; not a loop over load.)
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-RECENT bodySignal (max 8).

### UC-CATALOG-27: Re-viewing a product moves it to the front without duplicate
- Meta: catalog | state/persistence | Side-effect: no | (none)
- Endpoints: EP-CATALOG-PRODUCT, EP-CATALOG-RECENT
- Request: view A, B, A again; `GET /recentlyviewedproducts`.
- Expected: ids are A, B (A once, first).
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-RECENT bodySignal.

### UC-CATALOG-28: Empty or bogus recently-viewed cookie shows an empty list
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-RECENT
- Request: `GET /recentlyviewedproducts` with no cookie; again with header `Cookie: SmartStore.RecentlyViewedProducts=RecentlyViewedProductIds=99999&RecentlyViewedProductIds=abc`.
- Expected: both 200; `div.alert-warning` text `The list is empty.`; no product tiles.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-RECENT failure.

### UC-CATALOG-29: What's New lists products and ignores list parameters
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-NEWPRODUCTS
- Request: `GET /newproducts` and `GET /newproducts?o=5&s=3&i=2&v=list`.
- Expected: 200; `<h1>` `What's New` (HTML-encoded apostrophe tolerated); at least one product tile; both responses have the same product id set. Do not assert 58.
- State/cleanup: `v=list` stores view mode for the visitor; dispose the context.
- Evidence: flows.md Catalog F6.

### UC-CATALOG-30: Currency switch changes displayed currency and can be reset
- Meta: catalog | state/persistence | Side-effect: no (server-side visitor state) | (none)
- Endpoints: EP-CATALOG-CURRENCY, EP-CATALOG-PRODUCT
- Request: one context; `GET /<product slug>` (record `priceCurrency` = USD); for id 2, 3, 4: `GET /changecurrency/{id}?returnUrl=%2Fbooks` then `GET /<product slug>`; finally `GET /changecurrency/1?returnUrl=%2F`.
- Expected: each switch 302 `Location: /books`; `priceCurrency` is `GBP`, `AUD`, `CAD` respectively and the numeric price differs from USD; no currency cookie is set; after the reset it is `USD` again.
- State/cleanup: reset to USD in `finally` (cookieless requests from the same IP and UA share state, OQ-01).
- Evidence: flows.md Catalog F7.

### UC-CATALOG-31: Currency switch does not redirect to an external returnUrl
- Meta: catalog | security | Side-effect: no | @security
- Endpoints: EP-CATALOG-CURRENCY
- Request: `GET /changecurrency/1?returnUrl=https%3A%2F%2Fevil.example.com%2F`; `GET /changecurrency/1` (no returnUrl), `maxRedirects: 0`.
- Expected: 302 `Location: /` for both.
- State/cleanup: id 1 is USD, so no net change.
- Evidence: endpoints.json EP-CATALOG-CURRENCY.

### UC-CATALOG-32: Invalid currency ids are not applied
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-CURRENCY
- Request: `GET /changecurrency/abc`, `GET /changecurrency/0`; `GET /changecurrency/99?returnUrl=%2Fbooks`, then a product page.
- Expected: first two 404 (`Shop. 404`); the third 302 and the product page still shows `USD`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-CURRENCY failure.

### UC-CATALOG-33: Currency must not be changed by a GET request
- Meta: catalog | security | Side-effect: no | @security @known-issue (finding #15)
- Endpoints: EP-CATALOG-CURRENCY
- Request: `GET /changecurrency/2?returnUrl=%2F`; then product page; reset to USD.
- Expected (secure): GET is rejected (405/404) or does not change state. Observed: 302 and currency changed. `test.fail()`.
- State/cleanup: reset to USD in `finally`.
- Evidence: SUMMARY.md section 4 #15; auth.md CSRF table.

### UC-CATALOG-34: Variant selection recalculates the price
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-UPDATEPRODUCTDETAILS
- Request: `POST /product/updateproductdetails?productId=65&bundleItemId=0`, urlencoded, AJAX, body `pvari65-0-21-34=168&addtocart_65.AddToCart.EnteredQuantity=1`, then the same with `169`.
- Expected: 200 `application/json`; keys `Partials` (with `Price`), `GalleryStartIndex`; the two `Price` partials differ (discovery: 2,599.00 vs 2,999.00 USD, assert only that they differ and parse as money). Precondition: product 65 exists (skip with a message if the pvari field is missing on `/cube-chair`).
- State/cleanup: none.
- Evidence: flows.md Catalog F4.

### UC-CATALOG-35: Higher quantity triggers a lower tier price
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-UPDATEPRODUCTDETAILS
- Request: same endpoint, `pvari65-0-21-34=168`, quantity `1` then `5`.
- Expected: 200 both; the unit price for quantity 5 is lower than for quantity 1 (tier 4+), `Partials.TierPrices` non-empty.
- State/cleanup: none.
- Evidence: flows.md Catalog F4.

### UC-CATALOG-36: Price update for an unknown product returns a client error
- Meta: catalog | defect | Side-effect: no | @defect (defect #7)
- Endpoints: EP-CATALOG-UPDATEPRODUCTDETAILS
- Request: single `POST /product/updateproductdetails?productId=99999&bundleItemId=0`, body `x=1`.
- Expected (correct): 404 (or 400). Observed: 500 JSON leaking `Object reference not set to an instance of an object.` Also assert the body does not contain that text. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #7.

### UC-CATALOG-37: Price update without productId returns a client error
- Meta: catalog | defect | Side-effect: no | @defect (defect #4)
- Endpoints: EP-CATALOG-UPDATEPRODUCTDETAILS
- Request: single `POST /product/updateproductdetails?bundleItemId=0`, body `x=1`.
- Expected (correct): 400 or 404. Observed: 502 Bad Gateway. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #4.

### UC-CATALOG-38: Price update is POST only
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-UPDATEPRODUCTDETAILS
- Request: `GET /product/updateproductdetails?productId=65&bundleItemId=0`.
- Expected: 404.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-UPDATEPRODUCTDETAILS failure.

### UC-CATALOG-39: Reviews page lists reviews with a rating form
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-REVIEWS
- Request: take a product id from a product page (`data-href` of add-to-cart); `GET /product/reviews/{id}`.
- Expected: 200; a form with `action` `/product/reviews/{id}` and inputs `Rating`, hidden `__RequestVerificationToken`. The form is never submitted (OQ-23). Do not assert a review count.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-REVIEWS.

### UC-CATALOG-40: Reviews page for an unknown product is 404
- Meta: catalog | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CATALOG-REVIEWS
- Request: `GET /product/reviews/99999`; `GET /product/reviews/0`.
- Expected: 404 both (`Shop. 404`).
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-REVIEWS failure.

### UC-CATALOG-41: Reviews page with a non-numeric id returns a client error
- Meta: catalog | defect | Side-effect: no | @defect (defect #4)
- Endpoints: EP-CATALOG-REVIEWS
- Request: single `GET /product/reviews/abc`.
- Expected (correct): 404 (or 400). Observed: 502 Bad Gateway. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #4.

### UC-CATALOG-42: Internal product details route returns a client error
- Meta: catalog | defect | Side-effect: no | @defect (defect #4)
- Endpoints: none (path not in endpoints.json; evidence only in SUMMARY.md)
- Request: single `GET /product/productdetails/24`.
- Expected (correct): 404. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #4.

### UC-CATALOG-43: Internal category route returns a client error
- Meta: catalog | defect | Side-effect: no | @defect (defect #4)
- Endpoints: none (path not in endpoints.json; evidence only in SUMMARY.md)
- Request: single `GET /catalog/category/14`.
- Expected (correct): 404. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #4.

### UC-CATALOG-44: Ask-a-question AJAX returns a redirect target
- Meta: catalog | happy path | Side-effect: no | (none)
- Endpoints: EP-CATALOG-ASKQUESTIONAJAX
- Request: `GET /product/askquestionajax/{id}` for a real product id, AJAX; then `GET` the returned path.
- Expected: 200 `application/json`; body `{"redirect":"/product/askquestion/<id>"}`; the follow-up GET returns 200. The form is never posted.
- State/cleanup: none.
- Evidence: endpoints.json EP-CATALOG-ASKQUESTIONAJAX.
