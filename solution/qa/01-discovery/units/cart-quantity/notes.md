# cart-quantity notes

## Auth
None needed; anonymous guest. Cookies: `SMARTSTORE.VISITOR` (re-sent in Set-Cookie on every update response), `ASP.NET_SessionId`, `SmartStore.RecentlyViewedProducts`. The mutation requests work with the curl jar only; no CSRF token / antiforgery field in the body. `X-Requested-With` is not required for updatecartitem (200 without it), but the page sends it.

## Surprises
1. quantity 0 and negative: the server answers HTTP 500 `{"error":true,...,"message":"Object reference not set to an instance of an object."}` AND silently deletes the line. The same 500 body is returned for unknown/foreign line ids (where nothing is deleted), so a client cannot tell "removed" from "failed" from the response; the cart page itself never sends 0 (the client clamps to 1).
2. Non-numeric, empty, decimal ("2.5"), exponent ("1e2"), missing parameter, and values above 2147483647 give a bare `502 Bad Gateway` text/html (an unhandled exception behind the proxy), not JSON; line unchanged. 2147483647 itself gives the normal max-quantity message.
3. Business limit failure is HTTP 200 + `success:false` + `message:["The maximum quantity allowed for purchase is 10000."]`; the response still contains the refreshed (unchanged) cartHtml/totals.
4. Max 10000 per line (`data-max=10000`), min 1; at 10000 x $479 the subtotal is $4,790,000.00 and Checkout stays enabled (`displayCheckoutButtons:true`). No stock limit found on the 3 products tried.
5. `CartItemsCount` is the SUM of quantities, not the number of lines.
6. Surrounding `updatecartitem` the page fires three more POSTs: `cartsummary?cart=True` and `cartsummary?wishlist=True`; the headline counter is refreshed from those.
7. A line id of another cart returns 500 (not 403/404) and is not modified: no cross-cart write observed.
8. Response JSON has a `$type` field (.NET anonymous type), so tests should use toMatchObject.
9. The server trims whitespace in `newQuantity` (" 4 " accepted).
10. Guest cart isolation: the two default-UA headed Chrome browsers of parallel agents shared one cart (qty 2 after one add by me). I reopened my session with a unique User-Agent via `cli.config.json` in this folder (`--config`) and then had my own empty cart.

## Open questions
- Client "-" button at quantity 1 was not clicked; inferred (data-min=1) that it does nothing.
- Whether any product has a stock/max-per-order below 10000 (only 3 products tried: Transocean, Titleist, Certina; gift cards not tested, they cannot be quick-added).
- Is the 502 from the proxy or from the app (response has no Server header, body is a plain nginx-style page)?
- Line total/subtotal rounding not examined (prices are whole-cent; Titleist $164.95 x 3 only seen as subtotal).
- Whether `isCartPage=false` / `isWishlist=true` changes behaviour (wishlist lines are another unit's state): not tried.

## State changed / left behind
- Own session lines all removed; curl cart (`/tmp/qa-cart-quantity.jar`) and browser cart both end at 0 lines (verified `CartItemsCount:0`, /cart 0 rows).
- Before reopening with a unique UA, my first browser (default UA) added 1 x Certina Podium to the cart shared with other agents' default-UA browsers; I could not remove that single unit without risking their lines, so it may remain in that shared guest cart (owned by whoever cleans it up; cart-add very likely added the same product too).
- Anything else: none. No orders, no accounts, no checkout.

## Browser evidence
`./node_modules/.bin/playwright-cli list` (after `open ... --headed --config qa/01-discovery/units/cart-quantity/cli.config.json`):

```
- qa-cart-quantity:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
User-Agent in that browser: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 qa-cart-quantity-browser`.
