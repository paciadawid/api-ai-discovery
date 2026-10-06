# Flows: cart-compare-wishlist

Base: https://bearstore-testsite.smartbear.com. Replay setup (all anonymous unless stated):
```
B=https://bearstore-testsite.smartbear.com; J=/tmp/qa-cart-compare-wishlist.jar
AJAX='X-Requested-With: XMLHttpRequest'
curl -si -c $J -b $J $B/ -o /dev/null          # gets SMARTSTORE.VISITOR
count() { curl -s -c $J -b $J -X POST -H "$AJAX" -d '' "$B/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True"; }
```
Product IDs seen: 32 = "Fast Cars, Image Calendar 2013" ($16.95, slug /fast-cars-image-calendar-2013), 33 = "Motorcycle Adventures..." ($24.90), 24,25,26,27,29,30,31 books (/books lists /catalog/addproducttocompare/{id}).

Identity model: cart, wishlist are keyed to the anonymous visitor (SMARTSTORE.VISITOR guid cookie + ASP.NET_SessionId). Compare is stored ONLY in cookie `sm.CompareProducts`. No login is needed for any of cart, wishlist, compare, nor to enter checkout.

## F1 Add to cart (product page)
Browser: open /fast-cars-image-calendar-2013, click "Add to cart" (qty 1). Requests: `POST /cart/addproduct/32/1` (body `addtocart_32.EnteredQuantity=1`, header X-Requested-With) -> `POST /shoppingcart/offcanvasshoppingcart` (HTML) -> `POST /shoppingcart/cartsummary?cart=True` (JSON counts).
```
curl -si -c $J -b $J -X POST -H "$AJAX" -d 'addtocart_32.EnteredQuantity=1' $B/cart/addproduct/32/1
# 200 {"$type":"...","success":true}
```
Same product again merges into the existing line (qty adds). Validation (all HTTP 200 JSON, success:false):
- qty 0, -1, abc, 1.5, 99999999999 -> `"message":["Quantity should be positive"]`
- qty 10001 or existing+new > 10000 -> `"message":["The maximum quantity allowed for purchase is 10000."]`
- missing body / wrong field name -> adds 1 (success:true)
- productId 999999 -> 200 `{"redirect":"/"}`; productId abc -> 404 HTML; GET -> 404; type 0 or -1 -> 404; type 9 -> success:true but nothing added; type 99999999999 -> 502.

## F2 View cart, totals
`GET /cart` -> HTML. Empty: "Your Shopping Cart is empty!". Totals table `.cart-summary`: Subtotal $16.95 excl tax, Shipping $0.00, Tax $0.00, Total $16.95. 3 x 16.95 = $50.85; 10000 x 16.95 = $169,500.00 accepted.

## F3 Update quantity (cart page, field itemquantity{id} change)
Browser: change qty textbox to 3, Tab. Request: `POST /shoppingcart/updatecartitem?sciItemId=168027&isCartPage=True`, body `newQuantity=3&isCartPage=true&isWishlist=false` -> JSON `{success,SubTotal,message,cartHtml,totalsHtml,displayCheckoutButtons,newItemPrice}` then cartsummary POSTs.
```
curl -s -c $J -b $J -X POST -H "$AJAX" -d 'newQuantity=3&isCartPage=true&isWishlist=false' "$B/shoppingcart/updatecartitem?sciItemId=<ID>&isCartPage=True"
```
Edge cases (item exists): 10001 -> 200 success:false max-quantity message, line unchanged; 0 / -1 / -3 -> line DELETED and 500 JSON NullReference error; abc, 1.5, empty, 99999999999 -> 502 Bad Gateway. Unknown/foreign id -> 500 JSON NRE. Another visitor's sciItemId cannot be updated or deleted (500 / success:false) - no IDOR.

## F4 Remove item
Browser: click x on the cart line. `POST /shoppingcart/deletecartitem?cartItemId=168035` (empty body) -> 200 `{cartItemCount:0,success:true,message:"The product has been removed.",cartHtml,totalsHtml,displayCheckoutButtons}`. Repeat/unknown id -> 200 success:false "An error occurred during the removal of the product."; non-numeric/missing id -> 502; GET -> 404.

## F5 Move cart <-> wishlist
Browser: heart icon on cart line. `POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=168027&cartType=ShoppingCart&isCartPage=True` -> 200 `{success:true,wasMoved:true,message:"The product has been added to your wishlist",...}`. Reverse uses `cartType=Wishlist`. Quantities merge (cart 3 + wishlist 1 = wishlist 4).

## F6 Wishlist
Anonymous works. Browser: "Add to List" on product page -> `POST /cart/addproduct/32/2` (same body as add to cart) -> `POST /shoppingcart/offcanvaswishlist` -> `POST /shoppingcart/cartsummary?wishlist=True`. `GET /wishlist` lists lines (itemquantity{id}); update uses updatecartitem with `isWishlist=true` (response SubTotal is the CART subtotal, totalsHtml empty); remove uses `deletecartitem?cartItemId=ID&wishlistItem=True`. Share URL `/wishlist/{guid}` (guid == SMARTSTORE.VISITOR cookie value) is readable anonymously. Persistence: survived navigation, and survived registration/login in the same browser session (cart 2, wishlist 1 preserved).

## F7 Compare
Browser: "Compare" on product page -> `POST /catalog/addproducttocompare/32` -> JSON `{"success":true,"message":"The product '...' was added to the compare list."}` -> `POST /catalog/offcanvascompare` -> `POST /shoppingcart/cartsummary?compare=True`. State in cookie `sm.CompareProducts=CompareProductIds=25&CompareProductIds=24` (+10 days). Limit 4: adding 7 products leaves the last 4 (oldest evicted), newest first. Remove: `GET /catalog/removeproductfromcompare/{id}` (302 /compareproducts; POST returns JSON). Clear: `GET /catalog/clearcomparelist` (302). GET on addproducttocompare also adds and 302s to /compareproducts. Unknown id -> 200 success:false "Product could not be added."; non-numeric -> 502.

## F8 Coupon / gift card / estimate shipping (form POST /cart, multipart, whole form is posted)
Browser: expand "I have a discount code", enter QACOUPON-FAKE, "Apply coupon" -> `POST /cart` (200 HTML) with fields itemquantity{id}, discountcouponcode, applydiscountcouponcode, giftcardcouponcode, CountryId, StateProvinceId, ZipPostalCode. Result: alert-danger "The coupon code you entered couldn't be applied to your order". Gift card invalid/empty: same text in the gift card block. Estimate shipping (CountryId=1 US, zip 10001): alert-success with "In-Store Pickup ($0.00)" and "By Ground ($0.00)". Unknown CountryId still lists options. States dropdown fetches `GET /country/getstatesbycountryid?countryId=1&addEmptyStateIfRequired=true` (JSON array).
```
curl -s -c $J -b $J -F itemquantity<ID>=3 -F discountcouponcode=BAD -F applydiscountcouponcode=applydiscountcouponcode $B/cart
curl -s -c $J -b $J -F itemquantity<ID>=3 -F CountryId=1 -F ZipPostalCode=10001 -F 'estimateshipping=Estimate shipping' $B/cart
```
Valid coupon / gift card success paths NOT observed (no codes known).

## F9 Checkout entry (READ ONLY, no order placed)
Anonymous browser: cart "Checkout" -> `POST /cart` (startcheckout) 302 -> `/login?checkoutAsGuest=True&returnUrl=%2Fcart` (page offers Log in / Register / "Checkout as Guest") -> Checkout as Guest -> `GET /checkout` 302 -> `GET /checkout/billingaddress` 200. Via curl, `GET /checkout` with a non-empty cart goes straight to /checkout/billingaddress (200) without guest click. Empty cart: /checkout, /checkout/billingaddress, /checkout/confirm all 302 /cart. Logged-in: POST /cart 302 /checkout 302 /checkout/billingaddress. Steps shippingaddress, shippingmethod, paymentmethod, confirm each returned 200 for a non-empty anonymous cart without prior steps (confirm page = "Please confirm your order." with JS error list). `/checkout/paymentinfo` and `/checkout/completed` are 404. Invalid billing POST (`NewAddress.FirstName=&NewAddress.LastName=&NewAddress.Email=bad`) -> 200 with field errors. Confirm POST was never sent.
