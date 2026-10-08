# Notes: cart-add

## Auth observations
- No login needed. Anonymous visitor gets `SMARTSTORE.VISITOR` (HttpOnly, Secure, SameSite=Lax, 1 year), re-issued on each add response. Curl jar `/tmp/qa-cart-add.jar` with User-Agent `qa-cart-add`.
- Guest cart isolation: the cart is keyed by IP + User-Agent, not by the cookie. A fresh jar with the same User-Agent saw my cart (count 16); a fresh jar with another User-Agent saw 0. The three headed browsers share the same real Chrome User-Agent from one IP, so parallel browser sessions may in principle share a cart; in this run my browser cart only ever held my own lines (counts 1, 4, 5 matched my actions), cause of the separation not determined.

## Surprises
- Two different body field names for the quantity both work on /cart/addproduct: `addtocart_4.EnteredQuantity` (sent by the UI) and `addtocart_4.AddToCart.EnteredQuantity` (form input name, sent by the gift card add and updateproductdetails).
- Success responses differ: quick add returns `{success:true,message:"The product has been added..."}`, the product-page add returns only `{success:true}`.
- Quick add failure message for an unknown id is an object (`{TextHint,Args,Text}`), the product-page add failure message is a string array. Unknown product on the product-page add gives `{redirect:"/"}` (no success flag).
- Add of the same product merges lines; CartItemsCount counts units, not lines. Gift cards merge only when all recipient/sender/message details are identical.
- Empty quantity field fails ("Quantity should be positive") while an absent field defaults to 1.
- Max quantity 10000 is cumulative per line (5 in cart + 10000 rejected).
- Gift card validation accepts a 500-char name and a 5000-char message (no length limit seen).
- Quick add `quantity` parameter is ignored; `forceredirection=True` changes the success body to `{redirect:"/cart"}` but still adds.
- Quick-add buttons exist only on hover of a product card (not in the plain accessibility snapshot until hovered).
- After a field blur on the gift card form the product details re-render; an old element ref made one click on "Add to cart" silently do nothing (no add request). Re-snapshot before clicking.
- `/cart/addproduct/4/2` adds to the wishlist (cart type 2) and `/cart/addproduct/4/9` answered success:true while no counter changed.
- No-X-Requested-With and body-less POST: the XHR header is not required for the add; a POST with no body (no `--data ''`) gives HTTP 411 as documented.
- Gift card cart row shows From/For names and emails; the Message text was not visible in the row text I extracted.

## Open questions
- Where does `/cart/addproduct/4/9` (unknown cart type) put the item? Cart and wishlist counters did not change; compare count untested.
- Does the gift card Message appear anywhere in the cart (hover, title attribute)?
- Does a different message alone (same recipient/sender) create a new line? Only RecipientName was varied.
- Other gift card ids ($10, $50, $100): not probed (field prefix presumably `giftcard<id>-0-.`).
- Stock limit per product (the 10000 maximum is a UI setting; no stock message encountered).
- Products with attributes: only the failure of id 63 was checked, a successful add with attributes was not (attribute field names not captured).
- `updateproductdetails` failure behaviour not explored.

## State changed
- Own guest cart only: added lines for Certina (id 4) and gift cards (id 21) via curl and the browser, one temporary wishlist line (id 4, type 2). All removed: curl cart and browser cart ended empty (count 0), wishlist count 0.
- The server-side guest visitor record/cookies remain (cannot be undone). The gift card line details (example names/emails `rec@example.com`, `send@example.com`) were placeholders, no real addresses.
- Cart item ids seen: 169016, 169025 (browser), 169026, 169033, 169041-169044 (curl); not stable across runs.

## Browser evidence
`./node_modules/.bin/playwright-cli list` (taken after the work, before `close`):

```
### Browsers
- qa-cart-add:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
(The same output right after `open ... --headed` also showed `headed: true` for qa-cart-add.)
