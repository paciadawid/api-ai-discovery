# Flows - area: cart (cart manipulation)

Base: https://bearstore-testsite.smartbear.com. All flows anonymous. Unit texts below are copied from the per-unit files, with the unit helper/jar names kept as the units wrote them. Endpoint ids are given in brackets where the unit text uses paths only.

Reconciliation notes (not in the unit texts):
- The add-to-cart body field is `addtocart_{productId}.EnteredQuantity` (cart-add, from the UI). cart-remove's replay used `addtocart_1.AddToCart.EnteredQuantity` and also got success:true; see `endpoints.json` EP-CART-ADD-PRODUCT conflicts. Use the first form.
- Browser cart state was shared between the three headed sessions; only curl jars with a unique User-Agent were isolated.

## Unit: cart-add

(source: units/cart-add/flows.md)

Base: https://bearstore-testsite.smartbear.com. Anonymous; cookie jar /tmp/qa-cart-add.jar; every curl uses `-A qa-cartws-cart-add`.
Helper used below:
`C() { curl -s -i -A qa-cartws-cart-add -b /tmp/qa-cart-add.jar -c /tmp/qa-cart-add.jar -H "X-Requested-With: XMLHttpRequest" "$@"; }` and `U=https://bearstore-testsite.smartbear.com`.

### Flow 1 - Add a product from the product page (valid)
Browser: open /transocean-chronograph, click "Add to cart" (link with href '#', JS driven).
Requests triggered (all XHR, in order):
1. POST /cart/addproduct/1/1, body `addtocart_1.EnteredQuantity=1` -> 200 JSON `{"success":true}` [EP-CART-ADD-PRODUCT]
2. POST /shoppingcart/offcanvasshoppingcart -> 200 HTML fragment (mini-cart opens, success alert) [EP-CART-OFFCANVAS]
3. POST /shoppingcart/cartsummary?cart=True -> 200 JSON `CartItemsCount:1` [EP-CART-SUMMARY]
On page load the UI also calls POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True; the header badge (`.label-cart-amount`, hidden with value 0 in server HTML) is filled by JS from this response.
Replay:
```
curl -s -i -A qa-cartws-cart-add -c /tmp/qa-cart-add.jar $U/          # obtains SMARTSTORE.VISITOR
C -X POST -d "addtocart_1.EnteredQuantity=1" $U/cart/addproduct/1/1   # 200 {"success":true}
C -X POST -d "" "$U/shoppingcart/cartsummary?cart=True"               # CartItemsCount 1
```
Result: matched (curl count went 0 -> 1 -> 2 after the repeat).

### Flow 2 - Repeat add
Same POST again: 200 success:true, quantity accumulates on the same line (offcanvas shows one item input value="2", data-sci-id 168047 in my jar cart). CartItemsCount = sum of quantities (2). Adding quantity 3 -> 5. A body without the quantity field adds 1. Omitting X-Requested-With still works.

### Flow 3 - Invalid input
```
C -X POST -d "addtocart_999999.EnteredQuantity=1" $U/cart/addproduct/999999/1  # 200 {"redirect":"/"}
C -X POST -d "x=1" $U/cart/addproduct/abc/1                                      # 404 HTML
C -X POST -d "x=1" $U/cart/addproduct/0/1                                        # 404 HTML
C -X POST -d "addtocart_1.EnteredQuantity=0" $U/cart/addproduct/1/1              # 200 {"success":false,"message":["Quantity should be positive"]}
(same for abc and -1)                                                             # cart count unchanged
C $U/cart/addproduct/1/1                                                         # GET -> 404
C -X POST -d "addtocart_1.EnteredQuantity=1" $U/cart/addproduct/1/99             # 200 success:true, cart count unchanged
```
All observed by curl.

### Flow 4 - Mini-cart fragment and header counters
```
C -X POST -d "" $U/shoppingcart/offcanvasshoppingcart      # 200 text/html fragment
C $U/shoppingcart/offcanvasshoppingcart                    # GET also 200
C -X POST -d "" "$U/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True"  # JSON counters
C "$U/shoppingcart/cartsummary?cart=True"                  # GET -> 404
```
Note: bodyless POSTs need `-d ""` (Content-Length: 0) or IIS answers 411.

## Unit: cart-update

(source: units/cart-update/flows.md)

Base: https://bearstore-testsite.smartbear.com. Replays use jar /tmp/qa-cart-update.jar and `-A qa-cart-update`.
Helper used below: `C(){ curl -s -A qa-cart-update -b /tmp/qa-cart-update.jar -c /tmp/qa-cart-update.jar "$@"; }`

### Flow 1: change a line quantity on /cart (valid)
Browser: opened /golf -> /supreme-golfball, clicked "Add to cart" (POST /cart/addproduct/8/1, then cartsummary/offcanvas refreshes), went to /cart, filled `#itemquantity168046` with 3 and pressed Tab. The UI fired:
1. POST /shoppingcart/updatecartitem?sciItemId=168046&isCartPage=True (XHR, body `newQuantity=3&isCartPage=true&isWishlist=false`) -> 200 JSON with cartHtml and SubTotal [EP-CART-UPDATE-ITEM]
2. POST /shoppingcart/cartsummary?cart=True and ?wishlist=True (header refresh; ignored)
Preconditions: a line in the cart; sciItemId read from GET /cart [EP-CART-VIEW].
Result: line total = qty x unit price ($1.90 x 3 = $5.70, x5 = $9.50, x8563 = $16,269.70); SubTotal and Total equal the sum of lines (tax and shipping $0.00 here).
Replay:
```
C -X POST -H 'Content-Length: 0' -d '' $B/cart/addproduct/8/1
ID=$(C $B/cart | grep -oE 'itemquantity[0-9]+' | head -1 | tr -dc 0-9)
C -i -X POST -H 'X-Requested-With: XMLHttpRequest' -d 'newQuantity=5&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=$ID&isCartPage=True"
C $B/cart | grep -oE '\$[0-9,.]+ excl tax'
```

### Flow 2: boundary and invalid quantities (curl only, own cart)
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

### Flow 3: access control / method
- Another visitor (other UA, no cookies) POST for my sciItemId with newQuantity=2 -> 500 NRE, my quantity stayed 1 (item is scoped to the visitor's cart).
- GET /shoppingcart/updatecartitem?... -> 404.
- Unknown sciItemId=1 -> 500 NRE.

## Unit: cart-remove

(source: units/cart-remove/flows.md)

All curl replays use jar `/tmp/qa-cart-remove.jar`, `-A qa-cart-remove`, no redirect following. `H=https://bearstore-testsite.smartbear.com`. Browser session: `qa-cartws-cart-remove` (headed). POSTs with empty body need `-d ""` (Content-Length: 0), else 411.

### F1: Add own product, read cart line id (precondition)
- Browser: opened /transocean-chronograph, clicked the add-to-cart anchor (`data-href=/cart/addproduct/1/1`, owned by cart-add unit), then /cart.
- Browser observed: POST /cart/addproduct/1/1, then POST /shoppingcart/offcanvasshoppingcart and /shoppingcart/cartsummary?cart=True (UI refreshes).
- Replay:
  `curl -s -A qa-cart-remove -c $J -b $J $H/cart` (creates guest visitor, empty cart)
  `curl -s -A qa-cart-remove -c $J -b $J -X POST -H "X-Requested-With: XMLHttpRequest" -d "addtocart_1.AddToCart.EnteredQuantity=1" $H/cart/addproduct/1/1` -> `{"success":true}` (field name differs from cart-add's; see reconciliation note at the top)
  `curl -s -A qa-cart-remove -b $J $H/cart | grep -o -E 'deletecartitem\?cartItemId=[0-9]+'` -> line id (e.g. 168049)

### F2: Move line cart -> wishlist -> cart
- Browser: on /cart clicked the heart ("Move to wishlist", `a.ajax-action-link`); request 68 POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=168045&cartType=ShoppingCart&isCartPage=True => 200 JSON, followed by POST cartsummary?cart=True and ?wishlist=True. Header badge for wishlist increments. Then on /wishlist clicked the move link (cartType=Wishlist) => 200. [EP-CART-MOVE-TO-WISHLIST, EP-CART-WISHLIST-VIEW, EP-CART-MOVE-TO-CART]
- Replay:
  `curl -s -i -A qa-cart-remove -c $J -b $J -H "X-Requested-With: XMLHttpRequest" -X POST -d "" "$H/shoppingcart/moveitembetweencartandwishlist?cartItemId=<cartLineId>&cartType=ShoppingCart&isCartPage=True"` -> 200, `success:true, wasMoved:true, message "The product has been added to your wishlist"`
  `curl -s -A qa-cart-remove -b $J $H/wishlist | grep -o -E 'cartItemId=[0-9]+'` -> NEW id (168049 became 168052); cart is empty
  same POST with `<wishlistLineId>` and `cartType=Wishlist` -> 200, message "The product has been added to your shopping cart"; cart line id is NEW again (168053); wishlist empty
- Failures: unknown id -> 200 `success:false` "Product could not be added to the shopping cart."; GET -> 404; no Content-Length -> 411; missing cartItemId -> 502.

### F3: Remove line, empty-cart state
- Browser: the Remove "x" anchor markup was read from the DOM (`data-href=/shoppingcart/deletecartitem?cartItemId=<id>`, `data-action=remove`, `ajax-action-link`). The delete click itself was NOT performed in the browser (command budget); it was replayed with curl only. [EP-CART-DELETE-ITEM]
- Replay:
  `curl -s -i -A qa-cart-remove -c $J -b $J -H "X-Requested-With: XMLHttpRequest" -X POST -d "" "$H/shoppingcart/deletecartitem?cartItemId=<cartLineId>"` -> 200 `{success:true, message:"The product has been removed.", cartItemCount:0, cartHtml:"...", totalsHtml, displayCheckoutButtons:true}`
  `curl -s -A qa-cart-remove -b $J $H/cart` -> no cartItemId links; body text "Your Shopping Cart is empty!" (rendered inside `order-summary-content cart-content`)
  `curl -s -i -A qa-cart-remove -b $J $H/checkout` -> `302 Location: /cart` while empty (read only)
- Failures: repeat delete of same id, unknown id 999999999, or another visitor's id (separate jar) -> 200 `success:false` "An error occurred during the removal of the product."; other visitor's line stayed in cart (ownership enforced). GET -> 404; `cartItemId=abc` or missing -> 502.
