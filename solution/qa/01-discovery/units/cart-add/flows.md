# Flows: cart-add

Replay prelude (every curl): own jar, unique User-Agent, XHR header.

```
H=https://bearstore-testsite.smartbear.com
c() { curl -s -i -A "qa-cart-add" -b /tmp/qa-cart-add.jar -c /tmp/qa-cart-add.jar -H "X-Requested-With: XMLHttpRequest" "$@"; }
count() { c -X POST --data '' "$H/shoppingcart/cartsummary?cart=True" | grep -o '"CartItemsCount":[0-9]*'; }
```

## F1 Quick add from category listing (/watches)

Browser: open /watches, hover the Certina card (the buttons appear on hover), click the cart icon.
Endpoints in order:
1. POST /cart/addproductsimple/4?forceredirection=False (XHR, empty body) -> `{"success":true,"message":"The product has been added to your shopping cart"}`
2. POST /shoppingcart/offcanvasshoppingcart -> HTML mini-cart with alert "The product Certina DS Podium Big Size has been successfully added to your cart"
3. POST /shoppingcart/cartsummary?cart=True -> `{"CartItemsCount":1,"WishlistItemsCount":0,"CompareItemsCount":0}`

Preconditions: none (anonymous). Quantity is always 1. Product ids on /watches: 1 Transocean, 2 Tissot, 3 Seiko, 4 Certina.
Replay: `c -X POST --data '' "$H/cart/addproductsimple/4?forceredirection=False"; count`
Replay results: 200 + success:true, count +1 per call; second call for the same product merges (count 2, one cart line, line total $958.00).
Variants: `?forceredirection=True` -> `{"redirect":"/cart"}` and the product is added. `quantity=3` in query or body is ignored (+1 only). Gift card id 21 and a product with required attributes (id 63) -> `{"redirect":"/<slug>"}`, nothing added. Unknown id 99999999 -> `success:false`, message object `{TextHint:"Products.NotFound",...,Text:"The product with ID 99999999 was not found"}`. GET -> 404.

## F2 Add from product page with quantity (/certina-ds-podium-big-size)

Browser: open the product page, set the quantity box to 3, click "Add to cart".
Endpoints in order:
1. POST /product/updateproductdetails?productId=4&bundleItemId=0 (body `addtocart_4.AddToCart.EnteredQuantity=3`) -> JSON partials (fires on quantity change; no cart effect)
2. POST /cart/addproduct/4/1 (body `addtocart_4.EnteredQuantity=3`) -> `{"success":true}`
3. POST /shoppingcart/offcanvasshoppingcart -> mini-cart HTML
4. POST /shoppingcart/cartsummary?cart=True -> CartItemsCount 4 (1 from F1 + 3)

Result on /cart: ONE line, qty 4, line total $1,916.00 (merge, not a new line).
Replay: `c -X POST -d "addtocart_4.EnteredQuantity=3" "$H/cart/addproduct/4/1"; count`
Replay results: 200 `{"success":true}`; count +3; same product again sums into the same cart item id (169026 stayed one line, qty 8, $3,832.00 after 3+2+... adds). Absent body field defaults to 1 (POST needs `--data ''`, bare POST gives 411). `addtocart_4.AddToCart.EnteredQuantity=2` also works. Missing X-Requested-With still works. Cart type 2 in the path (/cart/addproduct/4/2) adds to the WISHLIST instead (counter WishlistItemsCount 1); type 9 answers success:true but nothing showed in cart or wishlist counters.

### F2b Quantity validation (replays, empty cart)
| qty sent | result |
|---|---|
| 0, -1, abc, 1.5, empty string, 99999999999 | `success:false`, `["Quantity should be positive"]` |
| 10001 | `success:false`, `["The maximum quantity allowed for purchase is 10000."]` |
| ` 5` (leading space) | success, 5 added |
| 10000 when 5 already in cart | `success:false`, maximum quantity message (limit is cumulative per line) |
Product id: 99999999 -> 200 `{"redirect":"/"}`; `abc` or `0` -> 404 HTML; GET -> 404; product with required attributes (63 Ball Chair, qty only) -> `["Please select 'Material'.","Please select 'Color'.","Please select 'Leather color'."]`.

## F3 Gift card (/25-virtual-gift-card, product id 21)

Browser: open the page. Fields: Recipient's Name, Recipient's Email, Your Name, Your Email, Message (textarea), quantity.
Step A (invalid): click "Add to cart" with the form empty.
- POST /cart/addproduct/21/1, body `giftcard21-0-.RecipientName=&giftcard21-0-.RecipientEmail=&giftcard21-0-.SenderName=&giftcard21-0-.SenderEmail=&giftcard21-0-.Message=&addtocart_21.AddToCart.EnteredQuantity=1` -> `{"success":false,"message":["Enter valid recipient name","Enter valid recipient email","Enter valid sender name","Enter valid sender email"]}`; no offcanvas/cartsummary calls follow.
Step B (valid): fill all fields (message "Happy bear day"), click "Add to cart".
- Each field blur fires POST /product/updateproductdetails?productId=21&bundleItemId=0; the page re-renders, so a snapshot ref taken before can go stale and a click on it silently does nothing (re-snapshot before clicking).
- POST /cart/addproduct/21/1 -> `{"success":true}`, then offcanvasshoppingcart, then cartsummary (CartItemsCount went 4 -> 5).
- /cart shows "$25 Virtual Gift Card ... From: Send Er <send@example.com> For: Rec Ipient <rec@example.com>" as a separate line (the message text was not shown in the cart row text).
Replay results (curl): valid add -> success:true; identical add again -> MERGED (qty 2, $50.00); change of any detail (RecipientName=Other) -> new line (cart item id differs). Per-field failures: each of the four required fields alone gives only its own message ("Enter valid recipient name" / "recipient email" / "sender name" / "sender email"); Message empty is OK; emails `notanemail`, `a@b`, `a b@example.com` rejected; name of only spaces rejected; 500-char name and 5000-char message accepted. Body-less POST (`--data ''`) lists all four messages. Quantity 0 and 10001 fail like regular products. Replay: `c -X POST --data-urlencode "giftcard21-0-.RecipientName=Rec Ipient" --data-urlencode "giftcard21-0-.RecipientEmail=rec@example.com" --data-urlencode "giftcard21-0-.SenderName=Send Er" --data-urlencode "giftcard21-0-.SenderEmail=send@example.com" --data-urlencode "giftcard21-0-.Message=hi" --data-urlencode "addtocart_21.AddToCart.EnteredQuantity=1" "$H/cart/addproduct/21/1"`.

## F4 Counters and mini-cart after add

- POST /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True -> three counters. CartItemsCount = sum of quantities over all lines (a line of qty 4 counts 4). Without `cart=True` it returns 0 for the cart. GET -> 404.
- POST /shoppingcart/offcanvasshoppingcart -> HTML fragment; GET also 200.
- The cart is keyed by IP + User-Agent as well as by cookie: a request with a fresh jar and the SAME User-Agent saw my full cart (16 units); a fresh jar with another User-Agent saw 0.
- Replay: `count`.

## Cleanup
POST /shoppingcart/deletecartitem?cartItemId=<id> (empty body) per line (owned by cart-remove; used only to clean up): 200 each. Browser lines removed with the "x" link (UI sent the same request). Final: cart count 0, wishlist 0.
