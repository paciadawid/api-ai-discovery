# cart-remove: flows

Base: https://bearstore-testsite.smartbear.com. Anonymous, no login. Replay helper: `replay-helper.sh` (curl with `-A qa-cart-remove`, jar `/tmp/qa-cart-remove.jar`, `X-Requested-With: XMLHttpRequest`, no redirect following) and `summarize.py` (compact JSON printer). In the commands below `C=./replay-helper.sh`, `B=https://bearstore-testsite.smartbear.com`.

## Flow 1: remove one of several lines (browser, then curl)

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

## Flow 2: remove the last line (empty-cart state)

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

## Flow 3: removing an already-removed / unknown id (business failure)

```
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=<already removed id>"
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=999999999"      # also 0 and -1
```
All: `HTTP/2 200` JSON `{success:false, message:"An error occurred during the removal of the product.", displayCheckoutButtons:true}` (no cartItemCount/cartHtml/totalsHtml). Cart unchanged. Removing a line twice is therefore not idempotent in signal: first success:true, then success:false.

## Flow 4: malformed or wrong-method requests

| Request | Result |
|---|---|
| `cartItemId=abc` | 502 Bad Gateway (text/html) |
| no `cartItemId` at all | 502 |
| `cartItemId=` (empty) | 502 |
| `cartItemId=99999999999` (> int32) | 502 |
| `GET /shoppingcart/deletecartitem?cartItemId=<valid id>` | 404 HTML "The resource cannot be found."; line NOT removed |
| `POST` with no body and no `-d ''` (no Content-Length) | 411 Length Required |
| `POST` with body `cartItemId=<id>` and no query | 200 success:true, line removed (id binds from the form body too) |

## Flow 5: line ids are scoped to the caller's cart

The browser session's cart (own cookies, own UA) held lines 169019 and 169022. From the curl session (different visitor):
```
$C -i -X POST -d '' "$B/shoppingcart/deletecartitem?cartItemId=169019"                 # curl jar session
curl -si -A qa-cart-remove-anon -X POST -d '' -H 'X-Requested-With: XMLHttpRequest' "$B/shoppingcart/deletecartitem?cartItemId=169022"   # brand-new anonymous visitor
```
Both: 200 `success:false` "An error occurred during the removal...". The browser cart was re-read afterwards and still held both lines. No cross-cart deletion.

## Flow 6: effect on counters (lines vs quantity)

Cart: Certina qty 3 (added with form field `addtocart_4.EnteredQuantity=3`) + Tissot qty 1.
- `cartsummary?cart=True` -> `CartItemsCount: 4` (sum of quantities).
- Remove Tissot (qty 1) by form body: delete response `cartItemCount: 1` (lines left) while `cartsummary` -> `CartItemsCount: 3`.
- Remove Certina (qty 3): delete response `cartItemCount: 0`, `cartsummary` -> 0.
So `cartItemCount` (delete response) counts lines, `CartItemsCount` (cartsummary) sums quantities. Removing a line subtracts its whole quantity.
