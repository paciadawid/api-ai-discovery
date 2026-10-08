# Notes - unit cart-totals-shipping

## Browser evidence

`./node_modules/.bin/playwright-cli list` right after `open https://bearstore-testsite.smartbear.com/ --headed` (also re-run before closing):

```
- qa-cart-totals-shipping:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```

## Auth observations
- No login anywhere; all endpoints worked anonymously. The cart is tied to cookies `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` (curl jar `/tmp/qa-cart-totals-shipping.jar`, UA `qa-cart-totals-shipping`; second jar `/tmp/qa-cart-totals-shipping-gc.jar`, UA `qa-cart-totals-shipping-gc`; one cookieless check with UA `qa-cart-totals-shipping-anon`).
- `Set-Cookie: SMARTSTORE.VISITOR` is re-sent on almost every response (1-year expiry refreshed).

## Surprises
1. Parallel browser sessions share a cart. All headed Chrome sessions send the identical User-Agent and come from the same IP; right after opening, my "fresh" session already showed a Certina line with quantity 3 that I did not create (another agent's cart), and the header showed Wish List 3. I isolated my browser with `run-code` (`context.setExtraHTTPHeaders({'User-Agent':'Mozilla/5.0 qa-cart-totals-shipping-browser'})`) plus `cookie-clear`; after that the cart was empty and my own. Orchestrator hint for next runs: give every browser session a unique User-Agent header right after `open`, otherwise units corrupt each other's cart. `navigator.userAgent` still reports the default, but the header sent on the wire is the override.
2. Shipping is $0.00 in every probed case (US, Germany, Canada, any zip, qty 1-1000, all currencies); "Estimate shipping" returns the same two options "In-Store Pickup ($0.00)" and "By Ground ($0.00)" for every country, even CountryId 0 or 99999. Tax is always $0.00 ("excl tax" prices). So Total == Subtotal in all observations; no non-zero shipping or tax case was found.
3. Estimate shipping is not a JSON/XHR call: it is the whole cart form posted to `POST /cart` and the answer is the full HTML page (200, no redirect); the estimate is not remembered by a following GET /cart.
4. Gift-card-only cart: Shipping row reads "Not required" (text, not a number) and the Estimate shipping panel disappears. The scout's "Free shipping" label is on the product page; the cart wording differs.
5. Quantity <= 0 deletes the line but answers HTTP 500 with "Object reference not set to an instance of an object." (verified for 0 and -1). Non-numeric or fractional quantity (`abc`, `2.5`) answers HTTP 502 Bad Gateway HTML and leaves the cart unchanged. `getstatesbycountryid` with a non-numeric or unknown country id also gives 502 HTML. Business limit message: qty 10001 -> 200 `success:false` "The maximum quantity allowed for purchase is 10000."
6. Volume (tier) price: High School Game Basketball is $29.95 up to qty 5 and $24.90 from qty 6; `newItemPrice` in the updatecartitem JSON carries the unit price for the new quantity, and the cart row shows an additional amount equal to the saving (qty 7: $35.35).
7. Currency rounding: converted unit price and converted line total are computed independently from USD, so displayed unit x qty can differ from the line total by one cent (GBP golf ball: unit £1.16, qty 7 line £8.11, not £8.12). Subtotal equals the sum of displayed line totals. In curl HTML the pound sign appears as `&#163;` in the totals table. AUD and CAD both print "$".
8. Currency is stored server side per visitor (no currency cookie; `/changecurrency/<id>` sets it, 302). Unknown numeric id is ignored (302), non-numeric id gives 404, external `returnUrl` is replaced by `/`.
9. The gift card quantity field in the body (`addtocart_21.AddToCart.EnteredQuantity=2`) overrides the `/1` in the add URL.

## Open questions
- Can shipping or tax ever be non-zero (heavy items, other products, logged-in customer with address, larger carts)? Not found on anonymous cart; checkout steps (Address, Shipping, Payment) were out of scope and might show costs.
- What does the Checkout gate do (hidden `startcheckout` submit of POST /cart)? Probably a login redirect for guests, but not observed because checkout must not be started.
- The exact tier-price rule (qty 6 boundary is observed, per product configuration) and which other products have tiers.
- `isCartPage`/`isWishlist` flags in updatecartitem: only the UI values were used.
- The browser POST /cart could not be seen in `requests` (page reload clears history); header/body evidence comes from the form metadata (`action`, `method`, `enctype`, FormData keys) and navigation timing, and the curl replay matched. The browser's multipart boundary/body was not captured.
- 502 pages look like a proxy in front of the app (plain "502 Bad Gateway" HTML); unclear whether the app crashed or the proxy rejected the request.

## State changed (all undone)
- Browser session cart (own, after the User-Agent override): added Certina x1 (quantity raised to 2 with "+") and one $25 gift card; both lines removed with the "x" link; /cart verified "Your Shopping Cart is empty!". Browser currency switched to GBP and back to USD.
- curl cart (jar `/tmp/qa-cart-totals-shipping.jar`): lines Certina, basketball, golf ball, Titleist, test lines with qty 7/1000/0/-1 - all removed; final `GET /cart` shows the empty-cart page; currency reset to USD (`/changecurrency/1`).
- gift-card jar: one gift card x2 added and deleted; cart empty.
- Not undone / outside my control: temporary files `/tmp/qa-cts-*.html|txt`, `/tmp/qa-cts-lib.sh`, the two cookie jars in /tmp, and `.playwright-cli/` snapshot/console files inside the kit directory (created by playwright-cli itself, not under `qa/`). The other agent's Certina qty 3 line seen at session start was not touched.

## Not explored
- Checkout button behaviour (observe only, by rule), discount/gift card code effects on totals (unit cart-codes), logged-in totals (no credentials), concurrency of two sessions on one cart, tax with different countries after login, whether the estimate affects any later checkout step.
