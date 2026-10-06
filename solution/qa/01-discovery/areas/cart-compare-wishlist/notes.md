# Notes: cart-compare-wishlist

## Browser evidence
`npx playwright-cli list` (session for this area):
```
- qa-cart-compare-wishlist:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
(Closed at the end of the run.)

## Auth observations
- Cart, wishlist and compare all work for anonymous visitors. areas.md guess "wishlist and checkout need login" is wrong: wishlist works anonymously and checkout is reachable as guest.
- Cookies (anonymous): SMARTSTORE.VISITOR (guid, refreshed on every response), ASP.NET_SessionId (set by the browser flow; curl got it later), SmartStore.RecentlyViewedProducts, sm.CompareProducts (compare list, +10 days). After register/login also SMARTSTORE.AUTH and __RequestVerificationToken. XHR needs no CSRF token.
- Throwaway account registered in my browser session: qa-cart-1790933638@example.com (fake data, first/last name QA / Cart). It cannot be deleted by rules; register took effect immediately (302 /registerresult/1 and logged in). Password not recorded. Anonymous cart (2 x product 32) and wishlist (1 x 33) were kept after register.

## Surprises / possible defects
1. Share-wishlist URL /wishlist/{guid} exposes the SMARTSTORE.VISITOR cookie value; replaying that cookie value (curl -H 'Cookie: SMARTSTORE.VISITOR=<guid>') returned the owner's cart/wishlist counts. The identity cookie is HttpOnly but leaked through a public link (session takeover of anonymous visitor state).
2. /shoppingcart/updatecartitem: quantity <= 0 deletes the line and returns HTTP 500 JSON NullReference; unknown id also 500.
3. Several endpoints return 502 Bad Gateway (proxy) for non-numeric or overflow input: updatecartitem newQuantity=abc|1.5|empty|99999999999, deletecartitem cartItemId=abc or missing, addproduct/{id}/99999999999, addproducttocompare/abc, getstatesbycountryid?countryId=abc.
4. Add-to-cart ignores the field name and body completely (adds 1); shoppingCartType 9 returns success:true but adds nothing; type 3 returns success:true (effect not checked precisely).
5. Wishlist update response returns cart SubTotal (not wishlist) and empty totalsHtml.
6. Gift card invalid code shows the generic "coupon code" error text.
7. Estimate shipping accepts unknown CountryId (999999) and returns options.
8. CartItemsCount / WishlistItemsCount are sums of quantities, CompareItemsCount is a product count.
9. Checkout steps (shippingaddress ... confirm) return 200 for a non-empty anonymous cart without completing earlier steps (confirm GET only; no POST done).
10. Server headers disclose IIS 10, ASP.NET MVC 5.2 (already known).
11. 10000 x $16.95 = $169,500.00 accepted in the cart (no stock/order cap), cart quantity max 10000 per line (sum across adds).

## Open questions
- Cart loss: twice an item vanished or the line id changed with no explicit delete (browser cart lost when SMARTSTORE.VISITOR changed from 51cb... to cd48... between two page loads; curl line 168026 became 168029 during my error-path loop). Could not reproduce deliberately in a later controlled run (ids stable). Possibly parallel agents / shared host resets guest data, or a visitor-cookie rotation. Tests should not assume cart survives long idle time; always read back ids from /cart.
- Valid coupon/gift card codes unknown, so discount success path, totals with discount not observed.
- Tax/shipping totals: Shipping and Tax stayed $0.00 for US/CA/DE estimates.
- sciItemId appears in global sequence (168025... shared across customers and carts/wishlists), so ids are not predictable per session.
- Whether X-Requested-With is required by the AJAX endpoints (all my curl calls sent it; not tested without it).
- POST /checkout/billingaddress valid, shipping method/payment selection and POST /checkout/confirm not exercised (order creation forbidden).
- Emailwishlist POST (sends email) not exercised.
- Product pages with variants/attributes, bundles, gift cards (recipient fields), minimum order quantity not explored.
- Mobile/other currencies (changecurrency) effect on cart not explored.

## State changed / left behind
- Anonymous carts, wishlists, compare lists created in the browser and curl jar were all removed (final cartsummary: 0/0/0 for both).
- Browser session logged out (/logout 302) before close.
- Leftover that cannot be undone: registered account qa-cart-1790933638@example.com (no address saved). No orders, no billing address saved (only invalid POST), no emails sent.
- Temporary files outside repo: /tmp/qa-cart-compare-wishlist.jar and helper scripts in /tmp.
