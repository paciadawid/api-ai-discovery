---
description: Workshop-sized variant of /qa-cycle for ONE narrow feature (default - cart manipulation) on the Bearstore test site, with the `limits: workshop` preset
argument-hint: [narrow scope, default "cart manipulation"]
---

Run the workshop version of the API QA cycle for: $ARGUMENTS

This is a thin wrapper. Read `.claude/commands/qa-cycle.md` and follow it exactly as written (every step, gate, visual and the section "Limits: workshop"), with:
- base URL: https://bearstore-testsite.smartbear.com
- scope: `$ARGUMENTS`; if empty: "cart manipulation: add to cart, change quantity, remove from cart, mini-cart and cart totals"
- `limits: workshop`

That is the same as `/qa-cycle https://bearstore-testsite.smartbear.com <scope> limits: workshop`. Only the cart-specific extras below are added; do not duplicate or override anything else.

## Cart extras (for the default cart scope)
- No login is needed for the cart scope (the cart works anonymously). Tests must not require credentials.
- Units hint: pass this table to the scout as the starting hint (units must stay independent, one owner per mutable state). Each unit uses its OWN browser session and curl jar, starts with its own anonymous cart and adds its own product, so nothing is shared. If the scout fails or runs over, use it as the plan: write the same `<root>/01-discovery/areas.md` yourself (one area, these units), render the scout page with `node scripts/visualize.mjs scout --root <root>`, and still hold the scope gate.

| unit key | what it explores | entry |
|---|---|---|
| cart-add | add a product to the cart (valid, invalid product id, repeat add), mini-cart fragment, header counters | a product page, `/cart/addproduct/{productId}/1`, `/shoppingcart/offcanvasshoppingcart`, `/shoppingcart/cartsummary` |
| cart-update | change a line quantity (valid, 0, negative, huge, non-numeric), line and order totals on `/cart` | `/cart`, `/shoppingcart/updatecartitem` |
| cart-remove | remove a line, empty-cart state, move line to wishlist and back | `/cart`, `/shoppingcart/deletecartitem`, `/shoppingcart/moveitembetweencartandwishlist` |

For another scope the scout derives the units from the scope text; the table does not apply.

- Map it, raw collection: the red checks include unset placeholders such as `{productId}` and `{{cartItemId}}`; a chained Postbot flow (add, capture the line id, update, move, delete) is typically green.
- Swagger replay at debug time (Bearstore specific): open the Bearstore tab as a fresh guest, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, click Authorize and paste `SMARTSTORE.VISITOR=<value>; ASP.NET_SessionId=<value>`, run the failing operation and compare the raw reply and the effect in your own cart tab with what the test expected. The spec's example add body uses a fixed product id in the field name (`addtocart_1.EnteredQuantity`): change it to match the product id.
