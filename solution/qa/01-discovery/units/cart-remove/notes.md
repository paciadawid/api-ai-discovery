# cart-remove: notes

## Auth observations
- No login needed. Anonymous visitor identified by cookies `SMARTSTORE.VISITOR` (re-issued with a new expiry on every response) and `ASP.NET_SessionId`. `deletecartitem` needs no token/anti-forgery value; only `X-Requested-With: XMLHttpRequest` is sent by the page (the endpoint also worked in replays with it set; I did not test without it).

## Surprises
1. Delete response `cartItemCount` counts LINES, while `cartsummary.CartItemsCount` is the SUM of QUANTITIES (e.g. after removing the Tissot line from Certina x3 + Tissot x1 the delete response says 1, cartsummary says 3; see flows.md Flow 6).
2. Removing an already-removed, unknown, 0 or negative id is a business failure: HTTP 200 `success:false` with one generic message; but a non-numeric, empty, missing or > int32 id is a 502 Bad Gateway (an unhandled exception behind a proxy, no JSON). Same generic message for "not found" and "belongs to someone else".
3. `cartItemId` binds from the query string AND from a form-urlencoded body.
4. GET on the delete URL is 404 (not 405) and does not delete.
5. Empty cart: `cartHtml` is `"\n\n\n"` and `totalsHtml` still contains the totals table with an empty Subtotal cell; Checkout button and totals disappear on the page only because the page re-renders the empty state.
6. Guest-cart sharing (important for the test framework): the first browser I opened (default Chrome user agent) shared ONE visitor/cart with the parallel sessions of cart-add and cart-codes (identical `SMARTSTORE.VISITOR` value; cart showed Certina x3 although I had added it once). Browser sessions of different agents share IP + User-Agent, so they get the same guest cart. I closed that session and reopened with a unique user agent via `--config /tmp/qa-cart-remove.config.json` (`{"browser":{"contextOptions":{"userAgent":"... qa-cart-remove"}}}`); the cart was then empty and isolated. Orchestrators should give each headed browser its own user agent.
7. Line ids are global, increasing integers shared by all visitors (169019, 169021, ...), with gaps from other visitors; they are not reusable across carts (see Flow 5).

## Open questions
- Does `deletecartitem` also delete wishlist lines (a wishlist line id from `moveitembetweencartandwishlist` / wishlist add)? Wishlist is out of scope, not tried.
- Is `X-Requested-With` required by this endpoint? Not tested without it.
- Why 502 for bad input (reverse proxy converting a 500)? Not investigated.
- Does a line with product attributes or gift-card fields remove the same way? Only regular products were removed here.
- The `cartsummary` flags: `wishlist=True` alone returned `CartItemsCount: 0` in the browser (request 71), and `cart=True` alone replayed with curl returned the real count. Not replayed individually: `wishlist=True`/`compare=True` alone with curl.

## State changed
- Own browser cart: added Certina, Tissot, Seiko (ids 169019, 169021, 169022) and removed all three through the UI. Final: empty.
- Own curl cart (UA `qa-cart-remove`, jar `/tmp/qa-cart-remove.jar`): added products 4, 2, 3 (lines 169027-169029), later 4 x3 and 2 (169036, 169037); all removed. Final: `CartItemsCount: 0`, empty-cart page and mini-cart confirmed.
- The curl cart and browser cart are two different visitors.
- Not undone (cannot be): before the user agent fix, my first browser session shared the default-UA guest cart with the cart-add / cart-codes sessions. In that session I clicked "Add to cart" on the Certina, then ran three clicks (Tissot, Seiko page loads) whose effect I cannot attribute: the shared cart showed one line Certina x3 ($1,437.00). I did not remove anything from that shared cart and closed the session. Any leftover line in the default-UA guest cart may include my one Certina add; the other agents may have seen an unexpected line. No removal of any foreign line was done.
- Files: `/tmp/qa-cart-remove.jar`, `/tmp/qa-cart-remove*.txt`, `/tmp/qa-cart-remove.config.json` (outside the repo, no secrets).

## Volume
About 45 requests with curl and 12 `playwright-cli` page actions on the shared host. No orders, no checkout, no accounts, no code panels touched.

## Browser evidence
`./node_modules/.bin/playwright-cli list` (after reopening with the unique user agent):
```
- qa-cart-remove:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
Screenshot of the empty state after the last removal: `empty-cart-after-last-remove.png`.
