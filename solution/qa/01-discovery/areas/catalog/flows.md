# Catalog flows (anonymous, read only)

Base: `https://bearstore-testsite.smartbear.com`. Browser session `qa-catalog` (headed). All replays use curl, no redirect following, jar `/tmp/qa-catalog.jar` where cookies matter.

Every page load in the browser also fires `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True` (JSON counters) and a failing `s7.addthis.com` script (not reachable from the sandbox). No other XHR on catalog pages.

## F1 Navigation hrefs (real, from header nav and footer)
Top: /books /furniture /sports /gaming /watches /gift-cards. Sub: /spiegel-bestseller /cook-and-enjoy (books), /chairs /sofas /tables (furniture), /basketball /golf /soccer (sports), /gaming-accessories (gaming). /jackets /shoes /trousers (label "Pants") /sunglasses exist as links on the home page (sports/fashion tiles) and return 200. All slugs from the area row are confirmed 200.
Footer/service (other areas but confirmed): /newproducts /recentlyviewedproducts /compareproducts /contactus /blog /aboutus /disclaimer /shippinginfo /paymentinfo /privacyinfo /conditionsofuse (NOT /about-us, /shipping-returns, /payment-info, /privacy, /conditions-of-use).
Currency links: /changecurrency/1..4?returnUrl=<path>.

## F2 Category listing: sort, page size, paging, view, facets
Browser: open /books, change "Sort by" select -> full page navigation to `/books?o=11`; page size select -> `/books?o=11&s=12`; price radio -> `/books?p=%7e25`; custom From 10 To 20 + arrow button -> `/books?p=10~20`; rating radio -> `?r=4`; delivery check -> `?r=4&d=1`; availability check -> `?r=4&d=1&a=True`; view toggle -> `?v=list`; pager next -> `/sports?s=3&i=3`. All plain GETs returning the full HTML page (no XHR). Filters accumulate in the query string.
Preconditions: none.
Observed results (replayed with curl, product ids in document order):
- `/sports` 13 article.art = 3 sub-category tiles (ids 11,12,13) + 10 products (5..14).
- `?o=5` Name A-Z: 13,7,14,12,11,9,8,6,5,10 (after tiles); `?o=6` reverse-ish; `?o=10`/`o=11` price asc/desc; `o=15`, `o=1`, `o=999`, `o=abc` -> default order.
- `?s=3&i=2` -> products 8,9,10 only (tiles only on page 1), pager "Page 2 of 4"; `i=3` -> 11,12,13; `i=99` -> last page (14); `i=0`, `i=-1` -> page 1; `s=abc`, `s=1000` -> everything; `s=0` -> HTTP 500.
- `/books?p=10~25` -> 24,25,29,30,32,33; `p=25~` -> 26,27,31; `p=~25` same as `p=%7e25`; `p=~0` -> none; `p=abc` ignored.
- `/books?r=4` -> 8 products; `r=5` -> none; `r=0` ignored. `d=1` -> 25,26,30,31,32; `d=2` -> 27,33; `d=1,2` union; `d=99` -> none. `a=True` -> same set as default minus sub-category tiles.
- Any active filter hides the sub-category tiles (`hide-on-active-filter`).
- `?v=list` -> response contains `class='artlist artlist-lines'`; the next request WITHOUT v (same cookie jar) is still list; `?v=grid` switches back. Server sets `ASP.NET_SessionId` on the first v= request. Fresh jar -> grid.
Replay:
```
curl -i 'https://bearstore-testsite.smartbear.com/sports?o=5&s=3&i=2'
curl -s 'https://bearstore-testsite.smartbear.com/books?p=10~25&r=3' | grep -o '<article class="art" data-id="[0-9]*"'
curl -i 'https://bearstore-testsite.smartbear.com/sports?s=0'   # 500
curl -s -c /tmp/qa-catalog.jar -b /tmp/qa-catalog.jar 'https://bearstore-testsite.smartbear.com/books?v=list' >/dev/null; curl -s -b /tmp/qa-catalog.jar https://bearstore-testsite.smartbear.com/books | grep -c artlist-lines
```
No category has more than 13 items (largest sports 10 products + 3 tiles), so natural paging never appears at default page size 24; use small `s` to test.

## F3 Product detail + recently viewed
Browser: /ueberman-the-novel, /cube-chair, /tissot-t-touch-expert-solar in order, then /recentlyviewedproducts.
Each product GET sets/extends cookie `SmartStore.RecentlyViewedProducts=RecentlyViewedProductIds=<id>&RecentlyViewedProductIds=<id>...` (newest first, max 8, 10 days). After the three views the browser showed ids 2,65,24 on /recentlyviewedproducts.
Replay (hand made cookie works, no server state):
```
curl -s -H 'Cookie: SmartStore.RecentlyViewedProducts=RecentlyViewedProductIds=2&RecentlyViewedProductIds=65&RecentlyViewedProductIds=24' https://bearstore-testsite.smartbear.com/recentlyviewedproducts | grep -o '<article class="art" data-id="[0-9]*"'
curl -s https://bearstore-testsite.smartbear.com/recentlyviewedproducts | grep 'The list is empty'
curl -i https://bearstore-testsite.smartbear.com/ueberman-the-novel | grep -i set-cookie
```
Product 24 data: title "Shop. Überman: The novel", price meta 16.99 USD, availability InStock, rating 4.8 from 671 reviews, "Delivery time: Product is not available" text (contradicts InStock). With the cookie present, every page also renders `.recently-viewed-product-grid` (more article.art).

## F4 Product variant / quantity price update (XHR)
Browser: /cube-chair, change "Leather color" select2 (jQuery change) -> `POST /product/updateproductdetails?productId=65&bundleItemId=0`, body `pvari65-0-21-34=169&pvari65-0-18-35=170&addtocart_65.AddToCart.EnteredQuantity=1`, JSON with HTML partials, price $2,599.00 -> $2,999.00.
Replay:
```
curl -s -X POST -H 'X-Requested-With: XMLHttpRequest' --data 'pvari65-0-21-34=169&addtocart_65.AddToCart.EnteredQuantity=1' 'https://bearstore-testsite.smartbear.com/product/updateproductdetails?productId=65&bundleItemId=0'
curl -s -X POST --data 'pvari65-0-21-34=168&addtocart_65.AddToCart.EnteredQuantity=5' '...same url...'    # tier price 1,899.05
curl -s -X POST --data x=1 '...?productId=99999&bundleItemId=0'     # 500 JSON NRE message
```

## F5 Unknown slug / URL normalisation
Browser: /no-such-product-xyz -> `GET [404]`, title "Shop. 404". Replays: `/Books`, `/BOOKS?o=5`, `/books/`, `/ueberman-the-novel/`, `/Ueberman-The-Novel` -> 301 with `Location: http://bearstore-testsite.smartbear.com/<lowercase>` (scheme http). `/books/spiegel-bestseller`, `/catalog/product/24`, `/p/24/x`, `/index.php`, `/homepage`, unknown `/product/reviews/99999` -> 404. `/home` -> 200.
```
curl -i https://bearstore-testsite.smartbear.com/no-such-product-xyz
curl -i https://bearstore-testsite.smartbear.com/BOOKS?o=5
```

## F6 What's New
Browser /newproducts: h1 "What's New", 58 products, no sort/size/pager controls. Params o/s/i/v do not change the result (verified with curl).

## F7 Currency switch
Browser: on /ueberman-the-novel clicked GBP link `/changecurrency/2?returnUrl=%2Fueberman-the-novel` -> 302 back; price meta became GBP 10.36; no currency cookie (cookie-list unchanged). Then reset with `/changecurrency/1`.
```
curl -i -c /tmp/qa-catalog-cur.jar -b /tmp/qa-catalog-cur.jar 'https://bearstore-testsite.smartbear.com/changecurrency/2?returnUrl=%2Fbooks'
curl -s -b /tmp/qa-catalog-cur.jar https://bearstore-testsite.smartbear.com/ueberman-the-novel | grep -o 'priceCurrency" content="[^"]*"'
```
Rates: 16.99 USD = 10.36 GBP = 15.97 AUD = 16.65 CAD.

## F8 Product reviews page (read)
`GET /product/reviews/24` -> 200, form with antiforgery token and `Rating` radios; 671 reviews on one page. Not posted.
