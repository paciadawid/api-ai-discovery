# Flows - cart-add

Base: https://bearstore-testsite.smartbear.com. Anonymous; cookie jar /tmp/qa-cart-add.jar; every curl uses `-A qa-cartws-cart-add`.
Helper used below:
`C() { curl -s -i -A qa-cartws-cart-add -b /tmp/qa-cart-add.jar -c /tmp/qa-cart-add.jar -H "X-Requested-With: XMLHttpRequest" "$@"; }` and `U=https://bearstore-testsite.smartbear.com`.

## Flow 1 - Add a product from the product page (valid)
Browser: open /transocean-chronograph, click "Add to cart" (link with href '#', JS driven).
Requests triggered (all XHR, in order):
1. POST /cart/addproduct/1/1, body `addtocart_1.EnteredQuantity=1` -> 200 JSON `{"success":true}`
2. POST /shoppingcart/offcanvasshoppingcart -> 200 HTML fragment (mini-cart opens, success alert)
3. POST /shoppingcart/cartsummary?cart=True -> 200 JSON `CartItemsCount:1`
On page load the UI also calls POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True; the header badge (`.label-cart-amount`, hidden with value 0 in server HTML) is filled by JS from this response.
Replay:
```
curl -s -i -A qa-cartws-cart-add -c /tmp/qa-cart-add.jar $U/          # obtains SMARTSTORE.VISITOR
C -X POST -d "addtocart_1.EnteredQuantity=1" $U/cart/addproduct/1/1   # 200 {"success":true}
C -X POST -d "" "$U/shoppingcart/cartsummary?cart=True"               # CartItemsCount 1
```
Result: matched (curl count went 0 -> 1 -> 2 after the repeat).

## Flow 2 - Repeat add
Same POST again: 200 success:true, quantity accumulates on the same line (offcanvas shows one item input value="2", data-sci-id 168047 in my jar cart). CartItemsCount = sum of quantities (2). Adding quantity 3 -> 5. A body without the quantity field adds 1. Omitting X-Requested-With still works.

## Flow 3 - Invalid input
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

## Flow 4 - Mini-cart fragment and header counters
```
C -X POST -d "" $U/shoppingcart/offcanvasshoppingcart      # 200 text/html fragment
C $U/shoppingcart/offcanvasshoppingcart                    # GET also 200
C -X POST -d "" "$U/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True"  # JSON counters
C "$U/shoppingcart/cartsummary?cart=True"                  # GET -> 404
```
Note: bodyless POSTs need `-d ""` (Content-Length: 0) or IIS answers 411.
