# Flows: cart-update

Base: https://bearstore-testsite.smartbear.com. Replays use jar /tmp/qa-cart-update.jar and `-A qa-cart-update`.
Helper used below: `C(){ curl -s -A qa-cart-update -b /tmp/qa-cart-update.jar -c /tmp/qa-cart-update.jar "$@"; }`

## Flow 1: change a line quantity on /cart (valid)
Browser: opened /golf -> /supreme-golfball, clicked "Add to cart" (POST /cart/addproduct/8/1, then cartsummary/offcanvas refreshes), went to /cart, filled `#itemquantity168046` with 3 and pressed Tab. The UI fired:
1. POST /shoppingcart/updatecartitem?sciItemId=168046&isCartPage=True (XHR, body `newQuantity=3&isCartPage=true&isWishlist=false`) -> 200 JSON with cartHtml and SubTotal
2. POST /shoppingcart/cartsummary?cart=True and ?wishlist=True (header refresh; ignored)
Preconditions: a line in the cart; sciItemId read from GET /cart.
Result: line total = qty x unit price ($1.90 x 3 = $5.70, x5 = $9.50, x8563 = $16,269.70); SubTotal and Total equal the sum of lines (tax and shipping $0.00 here).
Replay:
```
C -X POST -H 'Content-Length: 0' -d '' $B/cart/addproduct/8/1
ID=$(C $B/cart | grep -oE 'itemquantity[0-9]+' | head -1 | tr -dc 0-9)
C -i -X POST -H 'X-Requested-With: XMLHttpRequest' -d 'newQuantity=5&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=$ID&isCartPage=True"
C $B/cart | grep -oE '\$[0-9,.]+ excl tax'
```

## Flow 2: boundary and invalid quantities (curl only, own cart)
| newQuantity | HTTP | result |
|---|---|---|
| 1, 2, 3, 5, 8563 | 200 | success:true, totals recalculated |
| 8564 | 200 | success:false, "exceeds stock on hand. The maximum quantity that can be added is 8563." (stock of product 8), cart unchanged |
| 10000 | 200 | success:false, stock message (stock 8563 < 10000) |
| 10001, 99999 | 200 | success:false, "The maximum quantity allowed for purchase is 10000." |
| 0 | 500 | line IS removed (cart empty afterwards); body {"error":true,...,"message":"Object reference not set to an instance of an object."} |
| -1 | 500 | same as 0: line removed, NRE body |
| abc, empty, 2.5, field missing | 502 | awselb "Bad Gateway" HTML; cart unchanged |
| newQuantity only in query string | 200 | works, quantity updated |
Replay: `C -X POST -d "newQuantity=$Q&isCartPage=true&isWishlist=false" -w '[HTTP %{http_code}]\n' "$B/shoppingcart/updatecartitem?sciItemId=$ID&isCartPage=True"` then check `C $B/cart`.
Note: after the line is removed, any further update of the same id returns 500 NRE (unknown id).

## Flow 3: access control / method
- Another visitor (other UA, no cookies) POST for my sciItemId with newQuantity=2 -> 500 NRE, my quantity stayed 1 (item is scoped to the visitor's cart).
- GET /shoppingcart/updatecartitem?... -> 404.
- Unknown sciItemId=1 -> 500 NRE.
