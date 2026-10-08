# Open questions (merged, deduplicated)

Each item: area / unit, then who or what could answer it. Duplicates across units are merged and list every unit that raised them. "curl probe" = answerable by a small replay under a unique User-Agent; "host owner" = whoever runs the SmartStore test site or has its source; "out of scope" = needs checkout, orders, accounts or login.

## cart / cart-add

1. Where does `POST /cart/addproduct/4/9` (unknown cart type) put the item? It answers `success:true` but cart and wishlist counters did not change (compare counter untested). Answer: curl probe (compare counter) or host owner.
2. Does the gift card Message text appear anywhere in the cart (hover, title attribute)? Only From/For names and emails were visible in the row text. Answer: curl probe of the cart HTML.
3. Does a different Message alone (same recipient and sender) create a new gift card line? Only RecipientName was varied. Answer: curl probe.
4. Gift cards $10 (id 20), $50 and $100 were not probed; the field prefix `giftcard<id>-0-.` is presumed. Answer: curl probe.
5. Is there a stock limit per product? 10000 is a UI setting; no stock message was met. Answer: host owner or probe of other products.
6. How does a successful add of a product with required attributes (e.g. id 63 Ball Chair: Material, Color, Leather color) look, and what are the attribute field names? Only the failure was checked. Answer: curl probe from the product page markup.
7. How does `POST /product/updateproductdetails` fail (bad product id, bad body)? Not explored. Answer: curl probe.

## cart / cart-quantity

8. What does the "-" button do at quantity 1? Not clicked; inferred from `data-min=1` that it does nothing. Answer: one UI click (unique User-Agent browser).
9. Does any product have a stock or max-per-order limit below 10000? Only Certina, Titleist SM6 and Transocean were tried; gift cards were not. Answer: host owner or probe.
10. How are USD line totals and subtotals rounded for prices with cents? Titleist $164.95 x 3 was only seen as part of a subtotal. (Currency-conversion rounding was examined by cart-totals-shipping, see Flow 4.) Answer: curl probe.

## cart / cart-remove

11. Does `deletecartitem` also delete wishlist lines (an id from the wishlist)? Out of cart scope, not tried. Answer: curl probe, wishlist unit.
12. Is `X-Requested-With` required by `deletecartitem`? Not tested without it. Answer: curl probe.
13. Does a gift card line or a line with attributes remove the same way? Only regular products were removed. Answer: curl probe.
14. Do `cartsummary` with `wishlist=True` or `compare=True` alone return `CartItemsCount: 0`? Seen in the browser for `wishlist=True`; with curl only `cart=True` and the full variant were replayed. Answer: curl probe.

## cart / cart-codes

15. What does a SUCCESSFUL discount code or gift card apply look like (message, totals row, applied-code markup, response shape)? No valid code is public; three conventional guesses (BEARSTORE, WELCOME10, SAVE10) were rejected and no brute forcing was done. Answer: host owner (a test code) or the site's source.
16. How is an applied code removed (control name, request)? Not observable without an applied code. Answer: host owner / a valid code.
17. Which conditions make a code valid (minimum order, product, gift card type)? Answer: host owner.
18. Is the gift card input validated against the codes of purchased virtual gift cards? Those are generated only after an order. Answer: out of scope (orders).
19. Does a non-matching `itemquantity<id>` posted together with a code apply or an estimate also update the line quantity? Raised by cart-codes; cart-totals-shipping only noted the server did not require the field. Answer: curl probe.

## cart / cart-totals-shipping

20. Can shipping or tax ever be non-zero (other products, heavy items, a logged-in customer with an address, larger carts)? Always $0.00 in every case seen. Answer: host owner; checkout steps are out of scope.
21. What does the Checkout gate do (hidden `startcheckout` submit of `POST /cart`; probably a login/guest redirect)? Not clicked, by rule. Answer: out of scope (checkout).
22. What is the exact tier-price rule and which products have tiers? Observed for product 14 only: $29.95 up to qty 5, $24.90 from qty 6. Answer: host owner or probe of other products.
23. What did the browser's `POST /cart` (estimate shipping) body look like on the wire? The request list does not show it after the page reload; shape comes from form metadata and the matching curl replay. Answer: not needed for tests.

## cart / cross-unit

24. Do `isCartPage=false` or `isWishlist=true` on `updatecartitem` change behaviour? Raised by cart-quantity and cart-totals-shipping; only the UI values were used. Answer: curl probe (wishlist side effects, so only with an own cart).
25. Are the 502 Bad Gateway answers (updatecartitem and deletecartitem with non-numeric or out-of-range values, `getstatesbycountryid` with bad ids) produced by the proxy or by the app (unhandled exception)? Raised by cart-quantity, cart-remove and cart-totals-shipping. Answer: host owner.
26. Is the guest cart keyed by IP + User-Agent only, or does the cookie take part? cart-remove and cart-codes disagree on whether the shared sessions had the same `SMARTSTORE.VISITOR` value. Answer: curl probe (two jars, same UA; one jar, two UAs) before the framework relies on the cookie.
27. What is in the shared default-User-Agent guest cart and wishlist now, and where did the "Wish List 3" seen by cart-totals-shipping come from? Answer: one default-UA browser check by a human; see SUMMARY.md, state left behind.
28. Is it intended that the delete response `cartItemCount` counts lines while `cartsummary.CartItemsCount` sums quantities (and `cartsummary` returns 0 for the cart unless `cart=True`)? Answer: host owner / product owner.
