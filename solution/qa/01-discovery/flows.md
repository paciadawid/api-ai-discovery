# Flows (consolidated)

Unit flows concatenated under one heading per area, then unit. Text is copied from `qa/01-discovery/units/<unit>/flows.md` (heading levels shifted; flow headings of cart-add renamed from "F1" to "Flow F1"). Nothing was added. Caveat for the whole file: browser steps of cart-add and cart-codes were recorded in default-User-Agent headed browsers that shared one guest cart, so cart counts and line ids seen in those browsers are unreliable; every request/response shape below was replayed with curl under a unique User-Agent (see SUMMARY.md, risk 1).

# Area: cart

## Unit: cart-add

Source: `qa/01-discovery/units/cart-add/flows.md`

Replay prelude (every curl): own jar, unique User-Agent, XHR header.

```
H=https://bearstore-testsite.smartbear.com
c() { curl -s -i -A "qa-cart-add" -b /tmp/qa-cart-add.jar -c /tmp/qa-cart-add.jar -H "X-Requested-With: XMLHttpRequest" "$@"; }
count() { c -X POST --data '' "$H/shoppingcart/cartsummary?cart=True" | grep -o '"CartItemsCount":[0-9]*'; }
```

### Flow F1: Quick add from category listing (/watches)

Browser: open /watches, hover the Certina card (the buttons appear on hover), click the cart icon.
Endpoints in order:
1. POST /cart/addproductsimple/4?forceredirection=False (XHR, empty body) -> `{"success":true,"message":"The product has been added to your shopping cart"}`
2. POST /shoppingcart/offcanvasshoppingcart -> HTML mini-cart with alert "The product Certina DS Podium Big Size has been successfully added to your cart"
3. POST /shoppingcart/cartsummary?cart=True -> `{"CartItemsCount":1,"WishlistItemsCount":0,"CompareItemsCount":0}`

Preconditions: none (anonymous). Quantity is always 1. Product ids on /watches: 1 Transocean, 2 Tissot, 3 Seiko, 4 Certina.
Replay: `c -X POST --data '' "$H/cart/addproductsimple/4?forceredirection=False"; count`
Replay results: 200 + success:true, count +1 per call; second call for the same product merges (count 2, one cart line, line total $958.00).
Variants: `?forceredirection=True` -> `{"redirect":"/cart"}` and the product is added. `quantity=3` in query or body is ignored (+1 only). Gift card id 21 and a product with required attributes (id 63) -> `{"redirect":"/<slug>"}`, nothing added. Unknown id 99999999 -> `success:false`, message object `{TextHint:"Products.NotFound",...,Text:"The product with ID 99999999 was not found"}`. GET -> 404.

### Flow F2: Add from product page with quantity (/certina-ds-podium-big-size)

Browser: open the product page, set the quantity box to 3, click "Add to cart".
Endpoints in order:
1. POST /product/updateproductdetails?productId=4&bundleItemId=0 (body `addtocart_4.AddToCart.EnteredQuantity=3`) -> JSON partials (fires on quantity change; no cart effect)
2. POST /cart/addproduct/4/1 (body `addtocart_4.EnteredQuantity=3`) -> `{"success":true}`
3. POST /shoppingcart/offcanvasshoppingcart -> mini-cart HTML
4. POST /shoppingcart/cartsummary?cart=True -> CartItemsCount 4 (1 from F1 + 3)

Result on /cart: ONE line, qty 4, line total $1,916.00 (merge, not a new line).
Replay: `c -X POST -d "addtocart_4.EnteredQuantity=3" "$H/cart/addproduct/4/1"; count`
Replay results: 200 `{"success":true}`; count +3; same product again sums into the same cart item id (169026 stayed one line, qty 8, $3,832.00 after 3+2+... adds). Absent body field defaults to 1 (POST needs `--data ''`, bare POST gives 411). `addtocart_4.AddToCart.EnteredQuantity=2` also works. Missing X-Requested-With still works. Cart type 2 in the path (/cart/addproduct/4/2) adds to the WISHLIST instead (counter WishlistItemsCount 1); type 9 answers success:true but nothing showed in cart or wishlist counters.

#### F2b (part of Flow F2): Quantity validation (replays, empty cart)
| qty sent | result |
|---|---|
| 0, -1, abc, 1.5, empty string, 99999999999 | `success:false`, `["Quantity should be positive"]` |
| 10001 | `success:false`, `["The maximum quantity allowed for purchase is 10000."]` |
| ` 5` (leading space) | success, 5 added |
| 10000 when 5 already in cart | `success:false`, maximum quantity message (limit is cumulative per line) |
Product id: 99999999 -> 200 `{"redirect":"/"}`; `abc` or `0` -> 404 HTML; GET -> 404; product with required attributes (63 Ball Chair, qty only) -> `["Please select 'Material'.","Please select 'Color'.","Please select 'Leather color'."]`.

### Flow F3: Gift card (/25-virtual-gift-card, product id 21)

Browser: open the page. Fields: Recipient's Name, Recipient's Email, Your Name, Your Email, Message (textarea), quantity.
Step A (invalid): click "Add to cart" with the form empty.
- POST /cart/addproduct/21/1, body `giftcard21-0-.RecipientName=&giftcard21-0-.RecipientEmail=&giftcard21-0-.SenderName=&giftcard21-0-.SenderEmail=&giftcard21-0-.Message=&addtocart_21.AddToCart.EnteredQuantity=1` -> `{"success":false,"message":["Enter valid recipient name","Enter valid recipient email","Enter valid sender name","Enter valid sender email"]}`; no offcanvas/cartsummary calls follow.
Step B (valid): fill all fields (message "Happy bear day"), click "Add to cart".
- Each field blur fires POST /product/updateproductdetails?productId=21&bundleItemId=0; the page re-renders, so a snapshot ref taken before can go stale and a click on it silently does nothing (re-snapshot before clicking).
- POST /cart/addproduct/21/1 -> `{"success":true}`, then offcanvasshoppingcart, then cartsummary (CartItemsCount went 4 -> 5).
- /cart shows "$25 Virtual Gift Card ... From: Send Er <send@example.com> For: Rec Ipient <rec@example.com>" as a separate line (the message text was not shown in the cart row text).
Replay results (curl): valid add -> success:true; identical add again -> MERGED (qty 2, $50.00); change of any detail (RecipientName=Other) -> new line (cart item id differs). Per-field failures: each of the four required fields alone gives only its own message ("Enter valid recipient name" / "recipient email" / "sender name" / "sender email"); Message empty is OK; emails `notanemail`, `a@b`, `a b@example.com` rejected; name of only spaces rejected; 500-char name and 5000-char message accepted. Body-less POST (`--data ''`) lists all four messages. Quantity 0 and 10001 fail like regular products. Replay: `c -X POST --data-urlencode "giftcard21-0-.RecipientName=Rec Ipient" --data-urlencode "giftcard21-0-.RecipientEmail=rec@example.com" --data-urlencode "giftcard21-0-.SenderName=Send Er" --data-urlencode "giftcard21-0-.SenderEmail=send@example.com" --data-urlencode "giftcard21-0-.Message=hi" --data-urlencode "addtocart_21.AddToCart.EnteredQuantity=1" "$H/cart/addproduct/21/1"`.

### Flow F4: Counters and mini-cart after add

- POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True -> three counters. CartItemsCount = sum of quantities over all lines (a line of qty 4 counts 4). Without `cart=True` it returns 0 for the cart. GET -> 404.
- POST /shoppingcart/offcanvasshoppingcart -> HTML fragment; GET also 200.
- The cart is keyed by IP + User-Agent as well as by cookie: a request with a fresh jar and the SAME User-Agent saw my full cart (16 units); a fresh jar with another User-Agent saw 0.
- Replay: `count`.

### Cleanup
POST /shoppingcart/deletecartitem?cartItemId=<id> (empty body) per line (owned by cart-remove; used only to clean up): 200 each. Browser lines removed with the "x" link (UI sent the same request). Final: cart count 0, wishlist 0.

## Unit: cart-quantity

Source: `qa/01-discovery/units/cart-quantity/flows.md`

Base URL https://bearstore-testsite.smartbear.com. Browser session `qa-cart-quantity` (headed, own User-Agent, see notes.md). Curl: `-A qa-cart-quantity`, jar `/tmp/qa-cart-quantity.jar`, header `X-Requested-With: XMLHttpRequest`. Full replay: `./replay.sh` (this folder).

### Flow 1: seed a line (precondition for all flows)
Browser: open /certina-ds-podium-big-size, click "Add to cart" -> `POST /cart/addproduct/4/1` (200 `{"success":true}`), then `POST /shoppingcart/offcanvasshoppingcart`, `POST /shoppingcart/cartsummary?cart=True`. Open /cart: the qty input has `data-sci-item=<lineId>`, `data-min=1`, `data-max=10000`, `data-step=1`, `data-href=/shoppingcart/updatecartitem?sciItemId=<lineId>&isCartPage=True`.
Curl: `curl -A qa-cart-quantity -b J -c J -X POST --data '' $B/cart/addproduct/4/1`. Adding the same product again merges into the existing line (quantity +1, same line id); a different line id appears only for a different product. Quick add `POST /cart/addproductsimple/{1,5}` works the same; for gift card id 20 it answers `{"redirect":"/10-virtual-gift-card"}` and adds nothing.

### Flow 2: "+" button
Browser: on /cart click "+" (touchspin up). Requests, in order: `POST /shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True` (body `newQuantity=2&isCartPage=true&isWishlist=false`, XHR, 200 JSON), then `POST /shoppingcart/cartsummary?cart=True` and `?wishlist=True` (counters). The page replaces the line and totals from `cartHtml` / `totalsHtml` in the update response. The "-" button sends the same request with quantity-1; at 1 the client does not go lower (data-min=1; the "-" at 1 was not clicked, only inferred).
Result: line total 2 x $479.00 = `$958.00 excl tax`, SubTotal `$958.00 excl tax`, Total `$958.00` (Shipping and Tax `$0.00` for an anonymous visitor without a shipping estimate).

### Flow 3: typed value
Browser: fill the qty textbox with 5 and Tab (change event) -> same endpoint, `newQuantity=5`; line `$2,395.00 excl tax`; `cartsummary` returns `CartItemsCount:5` (sum of quantities).
Client-side clamping (browser only, the server never sees these values): typing `abc`, `0` or `-3` sends `newQuantity=1`; typing `10001` sends `newQuantity=10000`.

### Flow 4: server behaviour for values the UI never sends (curl, line with qty 1)
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

### Flow 5: multi-line cart and counters
Curl cart with 3 lines: Certina qty 2 ($479.00), Transocean Chronograph (id 1, $24,110.00 each) set to 10000, Titleist SM6 (id 5, $164.95) qty 1. The update response covers the whole cart: `SubTotal` `$241,101,122.95 excl tax` (= 10000 x 24,110 + 958 + 164.95), `cartHtml` holds all lines, `totalsHtml` the totals table, `newItemPrice` is the UNIT price of the updated line (`$24,110.00`), not its line total. `cartsummary?cart=True` -> `CartItemsCount:10005` (Titleist 3 + Transocean 10000 + Certina 2). Shipping and Tax stayed `$0.00`.

### Cleanup
Browser: click "x" -> `POST /shoppingcart/deletecartitem?cartItemId=<id>`. Curl: same POST with `--data ''`. Both carts empty at the end (`CartItemsCount:0`, /cart shows 0 rows).

## Unit: cart-remove

Source: `qa/01-discovery/units/cart-remove/flows.md`

Base: https://bearstore-testsite.smartbear.com. Anonymous, no login. Replay helper: `replay-helper.sh` (curl with `-A qa-cart-remove`, jar `/tmp/qa-cart-remove.jar`, `X-Requested-With: XMLHttpRequest`, no redirect following) and `summarize.py` (compact JSON printer). In the commands below `C=./replay-helper.sh`, `B=https://bearstore-testsite.smartbear.com`.

### Flow 1: remove one of several lines (browser, then curl)

Preconditions: cart seeded with 3 lines (Certina 4, Tissot 2, Seiko 3), reachable by `POST /cart/addproduct/<productId>/1` (cart-add's endpoint, used here only for seeding).

Browser: /cart, click the "x" of the Tissot line (snapshot ref of link "x"). Requests triggered, in order:
1. `POST /shoppingcart/deletecartitem?cartItemId=169021` -> 200, JSON `{success:true, message:"The product has been removed.", cartItemCount:2, cartHtml, totalsHtml, displayCheckoutButtons:true}`
2. `POST /shoppingcart/cartsummary?cart=True` -> 200 `{CartItemsCount:2,...}`
3. `POST /shoppingcart/cartsummary?wishlist=True` -> 200 (CartItemsCount 0 because cart flag not set; WishlistItemsCount 0)
The page patches rows/totals from cartHtml/totalsHtml (rows 3 -> 2, Subtotal $1,717.00 -> $748.00) without a reload.

Replay:
```
$C $B/cart                                   # find ids: data-href='/shoppingcart/deletecartitem?cartItemId=<id>' + data-name
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=<id>" | python3 summarize.py
```
Observed: `HTTP/2 200`, `cartItemCount` 3 -> 2, remaining lines listed in cartHtml, subtotal in totalsHtml updated ($748.00 for Seiko 269 + Certina 479). Other lines untouched. Line ids are not renumbered.

### Flow 2: remove the last line (empty-cart state)

Browser: click "x" of the only remaining line. Requests: `deletecartitem` + `cartsummary?cart=True` + `cartsummary?wishlist=True`. Page shows "Your Shopping Cart is empty!" (screenshot `empty-cart-after-last-remove.png`), no Checkout button, all header badges 0.

Replay (second-last then last):
```
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=<id>"   # cartItemCount 1, subtotal $479.00
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=<last id>"
```
Last removal: `{success:true, message:"The product has been removed.", cartItemCount:0, cartHtml:"\n\n\n", totalsHtml:<table with an EMPTY Subtotal cell>, displayCheckoutButtons:true}`. Then:
```
$C -X POST -d '' "$B/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True"   # CartItemsCount 0
$C $B/cart                                   # "Your Shopping Cart is empty!"
$C -X POST -d '' $B/shoppingcart/offcanvasshoppingcart   # "Shopping cart empty"
```

### Flow 3: removing an already-removed / unknown id (business failure)

```
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=<already removed id>"
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=999999999"      # also 0 and -1
```
All: `HTTP/2 200` JSON `{success:false, message:"An error occurred during the removal of the product.", displayCheckoutButtons:true}` (no cartItemCount/cartHtml/totalsHtml). Cart unchanged. Removing a line twice is therefore not idempotent in signal: first success:true, then success:false.

### Flow 4: malformed or wrong-method requests

| Request | Result |
|---|---|
| `cartItemId=abc` | 502 Bad Gateway (text/html) |
| no `cartItemId` at all | 502 |
| `cartItemId=` (empty) | 502 |
| `cartItemId=99999999999` (> int32) | 502 |
| `GET /shoppingcart/deletecartitem?cartItemId=<valid id>` | 404 HTML "The resource cannot be found."; line NOT removed |
| `POST` with no body and no `-d ''` (no Content-Length) | 411 Length Required |
| `POST` with body `cartItemId=<id>` and no query | 200 success:true, line removed (id binds from the form body too) |

### Flow 5: line ids are scoped to the caller's cart

The browser session's cart (own cookies, own UA) held lines 169019 and 169022. From the curl session (different visitor):
```
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=169019"                 # curl jar session
curl -si -A qa-cart-remove-anon -X POST -d '' -H 'X-Requested-With: XMLHttpRequest' "$B/shoppingcart/deletecartitem?cartItemId=169022"   # brand-new anonymous visitor
```
Both: 200 `success:false` "An error occurred during the removal...". The browser cart was re-read afterwards and still held both lines. No cross-cart deletion.

### Flow 6: effect on counters (lines vs quantity)

Cart: Certina qty 3 (added with form field `addtocart_4.EnteredQuantity=3`) + Tissot qty 1.
- `cartsummary?cart=True` -> `CartItemsCount: 4` (sum of quantities).
- Remove Tissot (qty 1) by form body: delete response `cartItemCount: 1` (lines left) while `cartsummary` -> `CartItemsCount: 3`.
- Remove Certina (qty 3): delete response `cartItemCount: 0`, `cartsummary` -> 0.
So `cartItemCount` (delete response) counts lines, `CartItemsCount` (cartsummary) sums quantities. Removing a line subtracts its whole quantity.

## Unit: cart-codes

Source: `qa/01-discovery/units/cart-codes/flows.md`

Unit: cart-codes (area cart). Browser session `-s=qa-cart-codes` (headed). Curl: `-A "qa-cart-codes"`, jar `/tmp/qa-cart-codes.jar`.
Variables used below: `B=https://bearstore-testsite.smartbear.com`, `J=/tmp/qa-cart-codes.jar`, `UA=qa-cart-codes`, `ID=<cartItemId of the seeded line>`.

### Common precondition: a cart line to apply codes to
Browser: product page /certina-ds-podium-big-size -> click "Add to cart" -> `POST /cart/addproduct/4/1` (200, then offcanvasshoppingcart + cartsummary refresh). Then `goto /cart`.
Curl seed (owned by cart-add, only used to seed my own cart):
```
curl -s -i -A "$UA" -b $J -c $J -X POST -H "X-Requested-With: XMLHttpRequest" -d '' "$B/cart/addproduct/4/1"
# -> 200 {"$type":"...","success":true}
curl -s -A "$UA" -b $J -c $J "$B/cart" | grep -o 'name="itemquantity[0-9]*"'   # -> itemquantity169023
```
The cart page has ONE ordinary HTML form (`method=post`, `action=/cart`, `enctype=multipart/form-data`, no anti-forgery token field) that holds the qty boxes (`itemquantity<id>`), both code panels, the estimate-shipping selects and the checkout buttons. The panels "I have a discount code" / "I have a gift card" are collapsed (Bootstrap collapse) until their heading is clicked.

### Flow 1: Apply discount code (fails)
Browser: expand "I have a discount code", leave empty (or type NOSUCHCODE), click "Apply coupon".
1. `POST /cart` (document request, multipart) -> `200 text/html`, the full cart page re-rendered (no redirect, no JSON).
   Body (browser): `itemquantity169014=3`, `discountcouponcode=<text>`, `applydiscountcouponcode=applydiscountcouponcode`, `giftcardcouponcode=` (empty), `CountryId=3`, `StateProvinceId=0`, `ZipPostalCode=` (empty).
2. Page then fires `POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True` (shop bar refresh).
Result for empty, unknown (NOSUCHCODE), spaces-only, 300 chars + `<b>'"%;`, BEARSTORE, WELCOME10, SAVE10: always the same -> `<div class="alert d-flex justify-content-between alert-danger fade show"><span>The coupon code you entered couldn't be applied to your order</span>`; Subtotal/Shipping/Tax/Total unchanged ($479.00 / $0.00 / $0.00 / $479.00 for one Certina).
Replay:
```
curl -s -i -A "$UA" -b $J -c $J -X POST "$B/cart" -H "X-Requested-With: XMLHttpRequest" \
  -F "itemquantity$ID=1" -F discountcouponcode=NOSUCHCODE -F applydiscountcouponcode=applydiscountcouponcode
# -> HTTP/2 200, text/html, no Location, alert-danger "The coupon code you entered couldn't be applied to your order"
```

### Flow 2: Add gift card code (fails)
Browser: expand "I have a gift card", leave empty or type NOSUCH-GIFT-123, click "Add gift card".
1. `POST /cart` same form, with `giftcardcouponcode=<text>` and `applygiftcardcouponcode=applygiftcardcouponcode` (browser also sends `discountcouponcode=` empty).
Result (empty and unknown): 200 HTML, alert-danger with the SAME text "The coupon code you entered couldn't be applied to your order" (wording says coupon, not gift card). Totals unchanged.
Replay:
```
curl -s -i -A "$UA" -b $J -c $J -X POST "$B/cart" -H "X-Requested-With: XMLHttpRequest" \
  -F "itemquantity$ID=1" -F giftcardcouponcode=NOSUCH-GIFT-123 -F applygiftcardcouponcode=applygiftcardcouponcode
```

### Flow 3: Request variants (curl only, own cart)
| variant | result |
|---|---|
| urlencoded body `-d "itemquantity$ID=1&discountcouponcode=NOSUCHCODE&applydiscountcouponcode=applydiscountcouponcode"` | 200, same alert-danger |
| no `itemquantity<id>` field at all | 200, same alert-danger, line untouched |
| no `X-Requested-With` header | 200, same alert-danger (page 57064 B vs 54722 B with the header; layout difference only) |
| code fields but NO apply button field (`-F giftcardcouponcode=X -F discountcouponcode=Y`) | 200, no alert at all, nothing happens |
| BOTH apply buttons in one request | **HTTP 500** default IIS "Runtime Error" page |
| `GET /cart?discountcouponcode=X&applydiscountcouponcode=1` | 200, query ignored, no alert |
| apply discount with an EMPTY cart (fresh UA/jar, no lines) | 200, page shows the empty-cart warning "Your Shopping Cart is empty!", no coupon alert |

Both-buttons replay (500):
```
curl -s -i -A "$UA" -b $J -c $J -X POST "$B/cart" -H "X-Requested-With: XMLHttpRequest" \
  -F "itemquantity$ID=1" -F discountcouponcode=A -F giftcardcouponcode=B \
  -F applydiscountcouponcode=applydiscountcouponcode -F applygiftcardcouponcode=applygiftcardcouponcode
```

### Flow 4: Successful apply / remove an applied code - NOT OBSERVED
No valid discount or gift card code is published on the site (home, /aboutus, /shippinginfo, /newproducts, /gift-cards, /blog and search for "coupon"/"discount" searched; nothing). Only 3 conventional guesses were tried (BEARSTORE, WELCOME10, SAVE10), all rejected; no brute forcing. Buying a Virtual Gift Card would need an order, which is out of scope. So the success state, the effect on totals, the markup of an applied code and the "remove" control/request are unknown.

### Cleanup
My curl line (cartItemId 169023) removed with `curl -s -i -A "$UA" -b $J -c $J -X POST -H "X-Requested-With: XMLHttpRequest" -d '' "$B/shoppingcart/deletecartitem?cartItemId=169023"` -> 200 JSON `{"cartItemCount":0,"success":true,"message":"The product has been removed.",...}`; /cart then showed no lines. No code was ever applied.

## Unit: cart-totals-shipping

Source: `qa/01-discovery/units/cart-totals-shipping/flows.md`

Base URL: https://bearstore-testsite.smartbear.com . All flows anonymous. Replay setup (own jar, unique User-Agent, no redirect following):

```
B=https://bearstore-testsite.smartbear.com; J=/tmp/qa-cart-totals-shipping.jar
c(){ curl -s -i -A "qa-cart-totals-shipping" -b $J -c $J -H 'X-Requested-With: XMLHttpRequest' "$@"; }
```

### Flow 1 - Totals after add and quantity change

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

### Flow 2 - Estimate shipping

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

### Flow 3 - Free shipping (gift cards)

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

### Flow 4 - Currency switch and rounding

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

### Flow 5 - Checkout button gate (observed only, not executed)

Static observation of /cart HTML: `<button type="button" id="checkout" name="checkout" class="btn btn-danger btn-lg btn-block btn-checkout" onclick="$('#startcheckout').trigger('click')">` and a hidden `<input type="submit" name="startcheckout" value="startcheckout" id="startcheckout" class="d-none">` inside the same cart form (so checkout is another submit of `POST /cart`, field `startcheckout`). No terms-of-service checkbox exists on the page. `displayCheckoutButtons:true` is returned by updatecartitem/deletecartitem whenever lines remain. Not clicked or replayed (rule: no checkout).

### Flow 6 - Cleanup

Browser: click the "x" on each line -> `POST /shoppingcart/deletecartitem?cartItemId=<id>` -> JSON `{cartItemCount, success:true, message:"The product has been removed.", cartHtml, totalsHtml, ...}` then `POST /shoppingcart/cartsummary?cart=True` and `?wishlist=True`. curl carts emptied the same way. Final state: all three carts empty (see notes.md).
