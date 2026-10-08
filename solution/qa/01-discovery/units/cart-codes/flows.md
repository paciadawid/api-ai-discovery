# cart-codes: flows

Unit: cart-codes (area cart). Browser session `-s=qa-cart-codes` (headed). Curl: `-A "qa-cart-codes"`, jar `/tmp/qa-cart-codes.jar`.
Variables used below: `B=https://bearstore-testsite.smartbear.com`, `J=/tmp/qa-cart-codes.jar`, `UA=qa-cart-codes`, `ID=<cartItemId of the seeded line>`.

## Common precondition: a cart line to apply codes to
Browser: product page /certina-ds-podium-big-size -> click "Add to cart" -> `POST /cart/addproduct/4/1` (200, then offcanvasshoppingcart + cartsummary refresh). Then `goto /cart`.
Curl seed (owned by cart-add, only used to seed my own cart):
```
curl -s -i -A "$UA" -b $J -c $J -X POST -H "X-Requested-With: XMLHttpRequest" -d '' "$B/cart/addproduct/4/1"
# -> 200 {"$type":"...","success":true}
curl -s -A "$UA" -b $J -c $J "$B/cart" | grep -o 'name="itemquantity[0-9]*"'   # -> itemquantity169023
```
The cart page has ONE ordinary HTML form (`method=post`, `action=/cart`, `enctype=multipart/form-data`, no anti-forgery token field) that holds the qty boxes (`itemquantity<id>`), both code panels, the estimate-shipping selects and the checkout buttons. The panels "I have a discount code" / "I have a gift card" are collapsed (Bootstrap collapse) until their heading is clicked.

## Flow 1: Apply discount code (fails)
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

## Flow 2: Add gift card code (fails)
Browser: expand "I have a gift card", leave empty or type NOSUCH-GIFT-123, click "Add gift card".
1. `POST /cart` same form, with `giftcardcouponcode=<text>` and `applygiftcardcouponcode=applygiftcardcouponcode` (browser also sends `discountcouponcode=` empty).
Result (empty and unknown): 200 HTML, alert-danger with the SAME text "The coupon code you entered couldn't be applied to your order" (wording says coupon, not gift card). Totals unchanged.
Replay:
```
curl -s -i -A "$UA" -b $J -c $J -X POST "$B/cart" -H "X-Requested-With: XMLHttpRequest" \
  -F "itemquantity$ID=1" -F giftcardcouponcode=NOSUCH-GIFT-123 -F applygiftcardcouponcode=applygiftcardcouponcode
```

## Flow 3: Request variants (curl only, own cart)
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

## Flow 4: Successful apply / remove an applied code - NOT OBSERVED
No valid discount or gift card code is published on the site (home, /aboutus, /shippinginfo, /newproducts, /gift-cards, /blog and search for "coupon"/"discount" searched; nothing). Only 3 conventional guesses were tried (BEARSTORE, WELCOME10, SAVE10), all rejected; no brute forcing. Buying a Virtual Gift Card would need an order, which is out of scope. So the success state, the effect on totals, the markup of an applied code and the "remove" control/request are unknown.

## Cleanup
My curl line (cartItemId 169023) removed with `curl -s -i -A "$UA" -b $J -c $J -X POST -H "X-Requested-With: XMLHttpRequest" -d '' "$B/shoppingcart/deletecartitem?cartItemId=169023"` -> 200 JSON `{"cartItemCount":0,"success":true,"message":"The product has been removed.",...}`; /cart then showed no lines. No code was ever applied.
