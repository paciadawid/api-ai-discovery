# cart-quantity flows

Base URL https://bearstore-testsite.smartbear.com. Browser session `qa-cart-quantity` (headed, own User-Agent, see notes.md). Curl: `-A qa-cart-quantity`, jar `/tmp/qa-cart-quantity.jar`, header `X-Requested-With: XMLHttpRequest`. Full replay: `./replay.sh` (this folder).

## Flow 1: seed a line (precondition for all flows)
Browser: open /certina-ds-podium-big-size, click "Add to cart" -> `POST /cart/addproduct/4/1` (200 `{"success":true}`), then `POST /shoppingcart/offcanvasshoppingcart`, `POST /shoppingcart/cartsummary?cart=True`. Open /cart: the qty input has `data-sci-item=<lineId>`, `data-min=1`, `data-max=10000`, `data-step=1`, `data-href=/shoppingcart/updatecartitem?sciItemId=<lineId>&isCartPage=True`.
Curl: `curl -A qa-cart-quantity -b J -c J -X POST --data '' $B/cart/addproduct/4/1`. Adding the same product again merges into the existing line (quantity +1, same line id); a different line id appears only for a different product. Quick add `POST /cart/addproductsimple/{1,5}` works the same; for gift card id 20 it answers `{"redirect":"/10-virtual-gift-card"}` and adds nothing.

## Flow 2: "+" button
Browser: on /cart click "+" (touchspin up). Requests, in order: `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True` (body `newQuantity=2&isCartPage=true&isWishlist=false`, XHR, 200 JSON), then `POST /shoppingcart/cartsummary?cart=True` and `?wishlist=True` (counters). The page replaces the line and totals from `cartHtml` / `totalsHtml` in the update response. The "-" button sends the same request with quantity-1; at 1 the client does not go lower (data-min=1; the "-" at 1 was not clicked, only inferred).
Result: line total 2 x $479.00 = `$958.00 excl tax`, SubTotal `$958.00 excl tax`, Total `$958.00` (Shipping and Tax `$0.00` for an anonymous visitor without a shipping estimate).

## Flow 3: typed value
Browser: fill the qty textbox with 5 and Tab (change event) -> same endpoint, `newQuantity=5`; line `$2,395.00 excl tax`; `cartsummary` returns `CartItemsCount:5` (sum of quantities).
Client-side clamping (browser only, the server never sees these values): typing `abc`, `0` or `-3` sends `newQuantity=1`; typing `10001` sends `newQuantity=10000`.

## Flow 4: server behaviour for values the UI never sends (curl, line with qty 1)
| newQuantity | status | answer | cart afterwards |
|---|---|---|---|
| 3 | 200 | success:true, SubTotal $1,437.00 | qty 3 |
| " 4 " (url-encoded spaces) | 200 | success:true (trimmed) | qty 4 |
| 10000 | 200 | success:true, SubTotal $4,790,000.00 | qty 10000 |
| 10001, 100000, 2147483647 | 200 | success:false, message ["The maximum quantity allowed for purchase is 10000."], SubTotal of the old cart | unchanged |
| 0 | 500 | JSON error "Object reference not set to an instance of an object." | line DELETED |
| -2 | 500 | same JSON error | line DELETED |
| abc, 2.5, 1e2, empty, 2147483648, parameter missing | 502 | text/html "502 Bad Gateway" | unchanged |
Other requests: unknown `sciItemId` (999999999) and a line id of another cart (the browser's line, sent with the curl jar) -> 500 same JSON error, other cart untouched; GET -> 404; POST without body -> 411; POST without `X-Requested-With` -> 200 normal answer (header not required). Max 10000 is the same on three products tested (Certina, Titleist SM6, Transocean); no lower stock limit was found.

## Flow 5: multi-line cart and counters
Curl cart with 3 lines: Certina qty 2 ($479.00), Transocean Chronograph (id 1, $24,110.00 each) set to 10000, Titleist SM6 (id 5, $164.95) qty 1. The update response covers the whole cart: `SubTotal` `$241,101,122.95 excl tax` (= 10000 x 24,110 + 958 + 164.95), `cartHtml` holds all lines, `totalsHtml` the totals table, `newItemPrice` is the UNIT price of the updated line (`$24,110.00`), not its line total. `cartsummary?cart=True` -> `CartItemsCount:10005` (Titleist 3 + Transocean 10000 + Certina 2). Shipping and Tax stayed `$0.00`.

## Cleanup
Browser: click "x" -> `POST /shoppingcart/deletecartitem?cartItemId=<id>`. Curl: same POST with `--data ''`. Both carts empty at the end (`CartItemsCount:0`, /cart shows 0 rows).
