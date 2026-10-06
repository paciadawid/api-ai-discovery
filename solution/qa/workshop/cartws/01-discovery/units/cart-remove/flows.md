# Flows: cart-remove

All curl replays use jar `/tmp/qa-cart-remove.jar`, `-A qa-cart-remove`, no redirect following. `H=https://bearstore-testsite.smartbear.com`. Browser session: `qa-cartws-cart-remove` (headed). POSTs with empty body need `-d ""` (Content-Length: 0), else 411.

## F1: Add own product, read cart line id (precondition)
- Browser: opened /transocean-chronograph, clicked the add-to-cart anchor (`data-href=/cart/addproduct/1/1`, owned by cart-add unit), then /cart.
- Browser observed: POST /cart/addproduct/1/1, then POST /shoppingcart/offcanvasshoppingcart and /shoppingcart/cartsummary?cart=True (UI refreshes).
- Replay:
  `curl -s -A qa-cart-remove -c $J -b $J $H/cart` (creates guest visitor, empty cart)
  `curl -s -A qa-cart-remove -c $J -b $J -X POST -H "X-Requested-With: XMLHttpRequest" -d "addtocart_1.AddToCart.EnteredQuantity=1" $H/cart/addproduct/1/1` -> `{"success":true}`
  `curl -s -A qa-cart-remove -b $J $H/cart | grep -o -E 'deletecartitem\?cartItemId=[0-9]+'` -> line id (e.g. 168049)

## F2: Move line cart -> wishlist -> cart
- Browser: on /cart clicked the heart ("Move to wishlist", `a.ajax-action-link`); request 68 POST /shoppingcart/moveitembetweencartandwishlist?cartItemId=168045&cartType=ShoppingCart&isCartPage=True => 200 JSON, followed by POST cartsummary?cart=True and ?wishlist=True. Header badge for wishlist increments. Then on /wishlist clicked the move link (cartType=Wishlist) => 200.
- Replay:
  `curl -s -i -A qa-cart-remove -c $J -b $J -H "X-Requested-With: XMLHttpRequest" -X POST -d "" "$H/shoppingcart/moveitembetweencartandwishlist?cartItemId=<cartLineId>&cartType=ShoppingCart&isCartPage=True"` -> 200, `success:true, wasMoved:true, message "The product has been added to your wishlist"`
  `curl -s -A qa-cart-remove -b $J $H/wishlist | grep -o -E 'cartItemId=[0-9]+'` -> NEW id (168049 became 168052); cart is empty
  same POST with `<wishlistLineId>` and `cartType=Wishlist` -> 200, message "The product has been added to your shopping cart"; cart line id is NEW again (168053); wishlist empty
- Failures: unknown id -> 200 `success:false` "Product could not be added to the shopping cart."; GET -> 404; no Content-Length -> 411; missing cartItemId -> 502.

## F3: Remove line, empty-cart state
- Browser: the Remove "x" anchor markup was read from the DOM (`data-href=/shoppingcart/deletecartitem?cartItemId=<id>`, `data-action=remove`, `ajax-action-link`). The delete click itself was NOT performed in the browser (command budget); it was replayed with curl only.
- Replay:
  `curl -s -i -A qa-cart-remove -c $J -b $J -H "X-Requested-With: XMLHttpRequest" -X POST -d "" "$H/shoppingcart/deletecartitem?cartItemId=<cartLineId>"` -> 200 `{success:true, message:"The product has been removed.", cartItemCount:0, cartHtml:"...", totalsHtml, displayCheckoutButtons:true}`
  `curl -s -A qa-cart-remove -b $J $H/cart` -> no cartItemId links; body text "Your Shopping Cart is empty!" (rendered inside `order-summary-content cart-content`)
  `curl -s -i -A qa-cart-remove -b $J $H/checkout` -> `302 Location: /cart` while empty (read only)
- Failures: repeat delete of same id, unknown id 999999999, or another visitor's id (separate jar) -> 200 `success:false` "An error occurred during the removal of the product."; other visitor's line stayed in cart (ownership enforced). GET -> 404; `cartItemId=abc` or missing -> 502.
