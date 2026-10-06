# Notes: cart-update

## Browser evidence
`npx playwright-cli list` (session qa-cartws-cart-update):
```
- qa-cartws-cart-update:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
(Session closed at the end; only my own session was closed.)

## Auth observations
- No login needed. Cart is bound to the SMARTSTORE.VISITOR cookie (HttpOnly) and updatecartitem re-issues it on each response.

## Surprises
1. The BROWSER cart was not clean: after my first /cart visit there was a second line (Transocean Chronograph, $24,110.00) that I did not add, and its quantity changed during my session (SubTotal after my update was $48,225.70 = 2 x 24,110 + 5.70). Different headed sessions on this machine appear to share one guest cart (same IP and User-Agent). curl with a unique UA got a truly separate cart. Recommendation: tests should use a unique User-Agent and own cookie jar.
2. Quantity 0 and negative remove the line but answer HTTP 500 with a NullReference message (the removal succeeds, the response rendering fails on an empty cart, presumably). A client cannot tell from the status code that the removal worked.
3. Non-numeric, empty, decimal or missing newQuantity gives 502 Bad Gateway from the AWS load balancer (awselb/2.0), not a validation message.
4. Max quantity 10000 per the site, but product 8 stock caps at 8563; message differs for the two limits.
5. POSTs without a body need Content-Length (411 otherwise).
6. Failure responses carry totalsHtml in some cases and cartHtml in others (observed totalsHtml when the cart had 1 item and qty 99999/10000/10001; cartHtml for 8564 with qty 8563). Not investigated further.
7. Unit price is $1.90; tax and shipping were $0.00 for this cart, so Total == Subtotal.

## Open questions
- Is the 502 caused by an unhandled exception that kills the request at the ELB, or a deliberate rule? Does it affect other visitors?
- Is the shared-cart effect between browser sessions by IP+UA, or by something else?
- Does 0 really mean remove by design (SmartStore does this) and is the 500 only an empty-cart rendering bug? Not checked with 2 lines in the cart.
- Not checked: wishlist variant (isWishlist=true), products with attributes, discount/gift-card interaction on totals.

## State changed
- Anonymous curl cart (jar /tmp/qa-cart-update.jar): added product 8 several times (items 168050, 168054, 168055, 168056, 168058), all removed via newQuantity=0; the cart is empty.
- Browser cart: added product 8 (item 168046), set qty 3, then removed it with qty 0 via fetch. Left behind: another unit's Transocean Chronograph line (I did not create it, did not touch it).
- No orders placed, no checkout touched. Temp files in /tmp/qa-cu-* deleted; jar /tmp/qa-cart-update.jar remains.
