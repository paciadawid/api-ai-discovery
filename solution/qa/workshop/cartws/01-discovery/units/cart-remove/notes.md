# Notes: cart-remove

## Browser evidence
`playwright-cli list` output for my session: `qa-cartws-cart-remove: status: open, browser-type: chrome, headed: true` (confirmed after open and again before close). Session closed at the end.

## Auth observations
- Everything works anonymously. Cart is bound to the `SMARTSTORE.VISITOR` cookie (HttpOnly, secure, 1 year) plus `ASP.NET_SessionId`. Cart/wishlist line ids are only operable by the owning visitor (cross-visitor delete returned success:false and left the line).

## Surprises
- Mutating endpoints are POST-only and need `Content-Length: 0`; GET returns 404 (not 405), a bodyless POST without Content-Length returns 411.
- Business failures return HTTP 200 with `success:false`; malformed input (missing or non-numeric cartItemId) returns 502 Bad Gateway from the front proxy, not 400.
- Moving between cart and wishlist re-creates the line: the cartItemId changes each way (168049 -> 168052 -> 168053). Tests must re-read ids from /cart or /wishlist.
- Failure message of move-to-wishlist for unknown id says "Product could not be added to the shopping cart." (misleading for wishlist direction; direction tested was Wishlist->Cart for the unknown-id case).
- The first /cart in the browser already held 2 lines (Supreme Golfball, and Transocean with qty 2) although I added Transocean once: the browser visitor cookie (a91b2e1f...) appears shared with a parallel unit's activity, or the same-UA/IP guest sharing described in the rules applies to browsers too. Browser cart state is therefore not isolated; only the curl jar (visitor 00540cad...) was fully mine.
- "Your Shopping Cart is empty!" and "The wishlist is empty!" appear in the HTML even when non-empty (data-empty-text attribute and JS); detect emptiness via absence of cartItemId links, not by text count.

## Open questions
- Effect of omitting `isCartPage` or sending `cartType` inconsistent with the line's real list (e.g. ShoppingCart for a wishlist id) not tested.
- Quantity handling when moving a line with qty > 1 not tested.
- Delete click was not performed in the browser; the UI triggers presumably the same POST (markup `data-action=remove`), unconfirmed by network capture.
- Does wishlist have its own delete endpoint? Not seen (only move link observed on /wishlist).

## State changed
- Curl visitor 00540cad-...: added product 1, moved to wishlist and back, deleted. Cart and wishlist empty at the end. Nothing left.
- Browser visitor a91b2e1f-...: added product 1 once (Transocean), moved line 168045 to wishlist (became 168048) and moved it back to the cart (new id). Net: cart contents equal to before, but ids changed; a Supreme Golfball line (not added by me) is in that cart and untouched. Browser cart not emptied because it may be shared with other units.
