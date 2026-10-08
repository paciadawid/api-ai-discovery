# Flows - unit cart-totals-shipping

Base URL: https://bearstore-testsite.smartbear.com . All flows anonymous. Replay setup (own jar, unique User-Agent, no redirect following):

```
B=https://bearstore-testsite.smartbear.com; J=/tmp/qa-cart-totals-shipping.jar
c(){ curl -s -i -A "qa-cart-totals-shipping" -b $J -c $J -H 'X-Requested-With: XMLHttpRequest' "$@"; }
```

## Flow 1 - Totals after add and quantity change

Browser: open /certina-ds-podium-big-size, click "Add to cart", go to /cart, click the "+" button of the line.
1. `POST /cart/addproduct/4/1` (empty body) -> `{"success":true}` (EP-CART-ADD-PRODUCT)
2. `POST /shoppingcart/offcanvasshoppingcart`, `POST /shoppingcart/cartsummary?cart=True` (counters, EP-CART-SUMMARY)
3. `GET /cart` (EP-CART-VIEW): table Subtotal $479.00 excl tax / Shipping $0.00 / Tax $0.00 / Total $479.00
4. `POST /shoppingcart/updatecartitem?sciItemId=169017&isCartPage=True` body `newQuantity=2&isCartPage=true&isWishlist=false` (EP-CART-UPDATE-ITEM) -> JSON with `SubTotal:"$958.00 excl tax"`, `totalsHtml`, `newItemPrice:"$479.00 excl tax"`; the page then shows Subtotal $958.00.

Observed arithmetic (USD):
- line total = unit price x qty (479 x 3 = 1,437.00); Subtotal = sum of line totals; Total = Subtotal + Shipping + Tax; Shipping and Tax were $0.00 in every case; prices are "excl tax", thousands separator "," and 2 decimals.
- Mixed cart: Certina x3 + basketball $29.95 + golf ball $1.90 + Titleist $2.10 = $1,470.95 (matched).
- Tier price (volume discount) on High School Game Basketball (product 14): unit $29.95 for qty 1-5, $24.90 from qty 6 (newItemPrice in the JSON; the cart row then shows an extra amount equal to the saving, e.g. qty 7: $174.30 and $35.35).

Replay:
```
c -X POST --data '' $B/cart/addproduct/4/1
c $B/cart | grep -o 'itemquantity[0-9]*'           # learn the cart line id, e.g. 169030
c -X POST --data "newQuantity=3&isCartPage=true&isWishlist=false" "$B/shoppingcart/updatecartitem?sciItemId=169030&isCartPage=True"
c $B/cart                                          # Subtotal: $1,437.00 excl tax
```
Failure replays on the same endpoint (all matched): `newQuantity=10001` -> 200 `success:false`, message "The maximum quantity allowed for purchase is 10000.", SubTotal unchanged; `newQuantity=1000` ok (Subtotal follows); `0` and `-1` -> line deleted but HTTP 500 `{"error":true,...,"message":"Object reference not set to an instance of an object."}`; `abc` and `2.5` -> HTTP 502 HTML.

## Flow 2 - Estimate shipping

Browser: /cart -> click heading "Estimate shipping" -> fill "Zip / postal code" 10001 -> click "Estimate shipping" (Country default Germany; later US via select).
1. Changing Country triggers `GET /country/getstatesbycountryid?countryId=1&addEmptyStateIfRequired=true&_=<ts>` -> JSON list (EP-CART-STATES).
2. The button submits the single cart form: `POST /cart` (form id none, `enctype=multipart/form-data`, fields `itemquantity<id>`, `discountcouponcode`, `giftcardcouponcode`, `CountryId`, `StateProvinceId`, `ZipPostalCode`, plus the button name `estimateshipping=Estimate shipping`) (EP-CART-ESTIMATE-SHIPPING). The browser's navigation entry for the answer shows `responseStatus 200`, `redirectCount 0`, referrer /cart: the answer is the re-rendered HTML page, there is no XHR (the request list of the new page load only shows cartsummary, so the POST itself was captured from the form metadata and the navigation timing, not from `requests`).
3. Result block: alert-success listing "In-Store Pickup ($0.00)  Pick up your items at the store" and "By Ground ($0.00)  Compared to other shipping methods ..." and the chosen country/state/zip stay selected. Totals unchanged (Shipping $0.00).
4. A later `GET /cart` forgets the estimate (panel shows "Enter your destination to get a shipping estimate" again).

Replay (own cart, Certina line 169030 x3):
```
c -X POST -F itemquantity169030=3 -F discountcouponcode= -F giftcardcouponcode= -F CountryId=1 -F StateProvinceId=0 -F ZipPostalCode=10001 -F "estimateshipping=Estimate shipping" $B/cart
```
Matched for CountryId 1 (US), 3 (Germany), 2 (Canada): always HTTP 200, same two options at $0.00, totals Subtotal $1,437.00 / Shipping $0.00 / Tax $0.00 / Total $1,437.00. Also 200 with the same options when `CountryId` is 0, 99999 or missing, `ZipPostalCode` is empty or "abc", or when sent url-encoded instead of multipart. `CountryId=abc` adds the validation message "The value 'abc' is not valid for 'Country'.".

States endpoint replay: `c "$B/country/getstatesbycountryid?countryId=1&addEmptyStateIfRequired=true"` -> 200, 62 entries (first "AA (Armed Forces Americas)"); `countryId=3` -> `[{"id":0,"name":"Other (Non US)"}]`; `countryId=abc`, `99999` or no parameter -> HTTP 502 HTML.

## Flow 3 - Free shipping (gift cards)

Browser: /25-virtual-gift-card -> fill recipient name/email and sender name/email -> "Add to cart" (`POST /cart/addproduct/21/1`, body `giftcard21-0-.RecipientName=...&giftcard21-0-.RecipientEmail=...&giftcard21-0-.SenderName=...&giftcard21-0-.SenderEmail=...&giftcard21-0-.Message=&addtocart_21.AddToCart.EnteredQuantity=1`) -> /cart.
- Mixed cart (gift card $25 + Certina x2): Subtotal $983.00, Shipping $0.00 (value shown, panel "Estimate shipping" still present).
- Gift-card-only cart (curl, second jar `/tmp/qa-cart-totals-shipping-gc.jar`, UA `qa-cart-totals-shipping-gc`, quantity 2 in `EnteredQuantity`): Subtotal $50.00, Shipping row text "Not required", Tax $0.00, Total $50.00, and the whole "Estimate shipping" panel is absent. POST /cart with `estimateshipping` on that cart is still 200 with the same HTML and no panel.

Replay:
```
G=/tmp/qa-cart-totals-shipping-gc.jar
g(){ curl -s -i -A "qa-cart-totals-shipping-gc" -b $G -c $G -H 'X-Requested-With: XMLHttpRequest' "$@"; }
g -X POST --data 'giftcard21-0-.RecipientName=QA+R&giftcard21-0-.RecipientEmail=qa-r%40example.com&giftcard21-0-.SenderName=QA+S&giftcard21-0-.SenderEmail=qa-s%40example.com&giftcard21-0-.Message=&addtocart_21.AddToCart.EnteredQuantity=2' $B/cart/addproduct/21/1
g $B/cart    # Shipping: Not required
```

## Flow 4 - Currency switch and rounding

Browser: on /cart open the "USD ($)" menu and pick "Pound Sterling - GBP"; the item link is `GET /changecurrency/2?returnUrl=%2fcart` (EP-CART-CHANGE-CURRENCY) -> 302 to /cart (navigation redirectCount 1, final 200). The cart then shows `£599.63` for what was $983.00 (Certina $479 x2 + gift card $25). Switched back to USD with `/changecurrency/1`.

Observed conversion factors (replay with the Certina x3 cart): GBP 0.61 (unit £292.19, x3 = £876.57), AUD 0.94 ($1,350.78 for $1,437.00), CAD 0.98 ($1,408.26). Shipping/Tax rows follow the currency symbol (£0.00); AUD and CAD both print "$" so the symbol does not identify them.

Rounding (GBP, mixed cart): unit prices and line totals are converted separately from USD, not multiplied: Golfball unit £1.16, qty 7 line £8.11 (USD line $13.30 x 0.61 = 8.113) although 7 x £1.16 = £8.12; Titleist unit £1.28, line £8.97 (7 x 1.28 = 8.96); Basketball line £106.32. The Subtotal £999.97 equals the sum of the displayed line totals and equals $1,639.30 x 0.61.

Replay:
```
c "$B/changecurrency/2?returnUrl=%2fcart"    # 302 location: /cart
c $B/cart                                    # amounts in &#163; (HTML entity in curl output)
c "$B/changecurrency/1?returnUrl=%2fcart"    # back to USD
```
Failure replays: `/changecurrency/99?returnUrl=%2fcart` -> 302 /cart, currency unchanged; `/changecurrency/abc` -> 404; `returnUrl=https%3a%2f%2fexample.org%2f` -> 302 to `/`; no `returnUrl` -> 302 to `/`.

## Flow 5 - Checkout button gate (observed only, not executed)

Static observation of /cart HTML: `<button type="button" id="checkout" name="checkout" class="btn btn-danger btn-lg btn-block btn-checkout" onclick="$('#startcheckout').trigger('click')">` and a hidden `<input type="submit" name="startcheckout" value="startcheckout" id="startcheckout" class="d-none">` inside the same cart form (so checkout is another submit of `POST /cart`, field `startcheckout`). No terms-of-service checkbox exists on the page. `displayCheckoutButtons:true` is returned by updatecartitem/deletecartitem whenever lines remain. Not clicked or replayed (rule: no checkout).

## Flow 6 - Cleanup

Browser: click the "x" on each line -> `POST /shoppingcart/deletecartitem?cartItemId=<id>` -> JSON `{cartItemCount, success:true, message:"The product has been removed.", cartHtml, totalsHtml, ...}` then `POST /shoppingcart/cartsummary?cart=True` and `?wishlist=True`. curl carts emptied the same way. Final state: all three carts empty (see notes.md).
