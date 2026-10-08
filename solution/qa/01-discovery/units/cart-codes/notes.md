# cart-codes: notes

## Auth observations
- No login needed. No anti-forgery token in the cart form; POST /cart works with a plain cookie jar (SMARTSTORE.VISITOR + ASP.NET_SessionId).
- Every POST /cart response re-sends `Set-Cookie: SMARTSTORE.VISITOR=...` (same value, expiry refreshed).

## Surprises
1. Codes are applied by a full form POST to `/cart` (multipart, document navigation), not XHR/JSON; the whole cart HTML is returned. The action is chosen by the NAME of the submit button (`applydiscountcouponcode` / `applygiftcardcouponcode`), not by the code field.
2. Gift card failures use the coupon wording: "The coupon code you entered couldn't be applied to your order". Empty, whitespace-only, unknown, very long and special-character codes are indistinguishable (all 200 + alert-danger). No "enter a code" message for empty input.
3. Posting both apply buttons together gives HTTP 500 (default IIS runtime error page).
4. Failure is HTTP 200 (not 4xx) and there is no JSON signal: the test signal is the `alert-danger` span in the HTML.
5. Browser sessions are NOT isolated from each other: the headed Chrome sessions of the parallel units share the same User-Agent and IP, and the host keyed them to ONE guest cart (my browser cart showed qty 3 after I added 1, and later contained lines 169016 and 169025 that I never added; line 169014, which I added, vanished). Curl with a unique User-Agent got its own cart. To get an isolated cart you need a unique User-Agent (curl, or a browser context with a custom UA); the cookie alone (different SMARTSTORE.VISITOR per session) did not separate them.
6. POST /cart with an empty cart returns the empty-cart warning and no coupon alert.

## Open questions
- What does a SUCCESSFUL discount / gift card apply look like (message, totals row, applied-code markup, response shape)? No public valid code was found.
- How is an applied code removed (control name / request)? Not observable without an applied code. (In stock SmartStore/nopCommerce the applied code is shown with a remove checkbox/button, but this was not observed here.)
- Are there conditions (minimum order, product, gift-card type) that make a code valid? Unknown.
- Whether the gift card input is validated against purchased virtual gift cards' codes (they are generated only after an order) - not testable without orders.
- `itemquantity<id>` is sent with every code apply; whether a non-matching quantity in the same post also updates the line was not tested (belongs to cart-quantity).

## State changed
- Browser: added one "Certina DS Podium Big Size" via POST /cart/addproduct/4/1 in the (shared, see surprise 5) browser cart. The line later disappeared from that cart (removed or changed by another unit); I did not remove anything from it because the cart was shared with the other units' sessions and removing their lines would disturb them. I applied NO code in the browser that succeeded; failed attempts change nothing.
- Curl cart (UA qa-cart-codes): one Certina line seeded and removed again; cart verified empty.
- Not undone: nothing of mine known; the shared browser cart currently holds other units' lines.

## Browser evidence
`./node_modules/.bin/playwright-cli list` right after `open https://bearstore-testsite.smartbear.com/ --headed`:
```
- qa-cart-codes:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
