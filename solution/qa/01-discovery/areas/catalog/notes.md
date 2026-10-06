# Catalog notes

## Browser evidence
`npx playwright-cli list` (taken after open, my session):
```
- qa-catalog:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
Session closed at the end (`Browser 'qa-catalog' closed`).

## Auth observations
No login needed or used. BEARSTORE_* not touched. All catalog pages are public.

## Surprises / findings
1. `GET /{category}?s=0` returns HTTP 500 (Internal Server Error HTML). Other junk (`s=abc`, `s=1000`, `o=999`, `i=-1`) is tolerated.
2. `POST /product/updateproductdetails?productId=99999` returns 500 JSON that leaks the exception text "Object reference not set to an instance of an object." A missing productId, `/product/reviews/abc`, `/product/productdetails/24`, `/catalog/category/14` return 502 Bad Gateway from `awselb/2.0` (backend seems to reset the connection) instead of 404/400. Treat as risk: avoid hammering these.
3. Visitor identity: requests WITHOUT the cookie jar share one visitor GUID (the server hands out the same SMARTSTORE.VISITOR value to repeated cookieless requests from the same IP + User-Agent; a different User-Agent gets a different GUID; a forged GUID is replaced). Currency is stored server side against that GUID, so a cookieless `changecurrency/2` changed the price currency for all later cookieless requests until reset. Tests must use a cookie jar (Playwright request context) and reset currency to USD.
4. Slug canonicalisation 301s redirect to `http://` (not https) lowercase, no trailing slash.
5. View mode (`v=list|grid`) persists in the ASP.NET session (cookie ASP.NET_SessionId, set only after v= is used), not in a URL-only way.
6. Sub-category tiles are rendered as `<article class="art" data-id=<categoryId>>`, the same markup as products; they only appear on page 1 with no active filter. With the RecentlyViewed cookie an extra recently-viewed product grid (more `article.art`) is appended to every page. Parsers must scope selectors (e.g. `.artlist article.art` per block) or compare hrefs.
7. Product 24 shows schema availability InStock but text "Delivery time: Product is not available". Delivery facet label typo "2-5 woking days".
8. Currency link on `changecurrency/{id}`: unknown valid-int id (99) redirects without change; non-numeric/0 -> 404; external returnUrl is ignored (redirect to `/`), missing returnUrl -> `/`; POST without body -> 411.
9. Recently viewed: cookie capped at 8 ids; cookie is HttpOnly/Secure but trivially forgeable; unknown ids are silently dropped; the page uses no server state.
10. Pager on /newproducts does not exist: always 58 products, params ignored.
11. Server headers leak `Microsoft-IIS/10.0`, `X-AspNetMvc-Version: 5.2`, `X-AspNet-Version`, `X-Powered-By`, `generator: Smartstore 4.2.0.0` meta.
12. Footer hrefs differ from inferred labels: /aboutus, /shippinginfo, /paymentinfo, /privacyinfo, /conditionsofuse (for the content area).

## Open questions
- Category listing at default size 24 never paginates (max 13 items); no way found to test natural paging except small `s`.
- How is `d` (delivery id) mapped (1 ready to ship, 2 2-5 days, 3 7 days) in terms of product data, and what does `a=True` actually change (same product set as default in books)?
- `o=15` (Newest Arrivals) returned the same order as default; unclear whether any product has differing creation dates.
- Whether `/product/reviews/{id}` POST needs login (not exercised, state owned elsewhere).
- Cause of 502 from awselb for non-numeric ids (app crash vs ELB rule): not investigated further to avoid hurting the shared host.
- Product detail `Attrs` partial (SKU/EAN/weight) is empty for product 24 in the initial HTML; the `Stock` partial shows "Product is not available".
- `GET /product/askquestionajax/{id}` returns 200 JSON redirect even for unknown ids (99999); not further checked.

## State changed
- Server side: only my own visitor sessions. Currency was switched to GBP/AUD/CAD on three visitors (browser visitor, curl jar `qa-catalog-cur.jar`, and the shared cookieless visitor) and was reset to USD on all three (verified by price meta USD).
- ASP.NET session view mode `list` was set for the browser session and curl jars, then reset with `v=grid` in the browser.
- Mistake to report: while probing URL shapes I sent a cookieless `GET /catalog/addproducttocompare/24` (cart-compare-wishlist area endpoint). It returned 302 to /compareproducts. This was without any cookie jar; the later cartsummary for the cookieless visitor shows CompareItemsCount 0, so no item is retained, but this endpoint appears to accept GET (state-changing GET, worth a finding for that area).
- Local files only: /tmp/qa-catalog*.jar, /tmp/qa-*.html. Nothing could not be undone.

## Data
`products.json` lists 49 products reachable via category pages (id, slug, name, categories). /newproducts has 58 article ids (includes ids not in any category listing).
