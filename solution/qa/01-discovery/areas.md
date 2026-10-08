# Areas (scope mode: cart)

Base URL: https://bearstore-testsite.smartbear.com/ (SmartStore). Scope: `cart` only. One area, 5 units.

## Units

| area | unit key | entry URLs | needs login | owns state | what to find out | effort |
|---|---|---|---|---|---|---|
| cart | cart-add | /watches, /certina-ds-podium-big-size (regular product), /25-virtual-gift-card (gift card with recipient fields), /cart | no | cart lines created by add (own session cart) | How "Add to cart" works from a product page (and category quick add if present): request, quantity at add, adding the same product twice (merge vs new line), gift card form fields and their validation, failure messages (HTTP 200 + success:false), cart counter/mini-cart after add | M |
| cart-quantity | cart-quantity | /cart (qty +/- buttons and qty textbox per line) | no | quantity of lines in its own session cart (seeded by adding 1-2 products) | How a quantity change is sent and answered: +/-, typed value, 0, negative, non-numeric, very large, stock/max-per-order limits; line total and subtotal refresh; messages | M |
| cart-remove | cart-remove | /cart (the "x" remove link per line) | no | removal of lines in its own session cart (seeded by adding products) | How a line is removed: request/response, removing one of several lines, removing the last line (empty-cart state), removing an already-removed or unknown line id, effect on counters | S |
| cart-codes | cart-codes | /cart (panels "I have a discount code" and "I have a gift card") | no | applied discount/gift-card code on its own session cart | How a discount code and a gift card code are applied and removed: request shape, messages for empty/invalid/unknown codes, whether valid codes exist publicly (do not guess at scale), effect on totals | M |
| cart-totals-shipping | cart-totals-shipping | /cart (totals table: Subtotal, Shipping, Tax, Total; "Estimate shipping" panel) | no | estimated shipping selection / country-zip in its own session cart | How totals are computed after add/qty changes (subtotal x qty, shipping, tax, total, rounding, currency switch USD), how "Estimate shipping" is requested and answered, free-shipping behaviour (e.g. gift cards), the Checkout button gate (observe only) | M |

## Areas

- **cart** - Everything a visitor can do on the shopping basket: add products, change quantities, remove lines, apply discount / gift-card codes, and check totals and shipping estimates. Units: `cart-add`, `cart-quantity`, `cart-remove`, `cart-codes`, `cart-totals-shipping`. Total effort: L.

## Excluded (outside scope)

- wishlist (/wishlist, "Add to List"): keeps its own state (per visitor/user list); not browsed.
- compare (/compareproducts, "Compare"): keeps its own state; not browsed.
- checkout (Checkout button, steps Address, Shipping, Payment, Confirm, Complete): would place real orders and requires address/payment data; destructive on a shared public host.
- auth (/login, registration): no new accounts on the shared host; the cart is fully usable anonymously, so no login is needed for the cart scope.
- catalog browse/search, product reviews, contact, newsletter, content pages (/aboutus, /blog, /shippinginfo, ...): other areas, not part of the cart scope.

## Shared rules

- No credentials are needed for this scope. If ever needed, only via env var names `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD`; never read or print `.env`.
- Every unit runs in its OWN headed browser session (`-s=qa-<unit-key>`, `open ... --headed`); each session is its own anonymous cart (the host keys a guest cart by IP + User-Agent, so replays with curl must use a unique User-Agent and their own cookie jar).
- No destructive actions: do not click Checkout past the cart, place no orders, create no accounts, do not subscribe to the newsletter.
- Clean up what you create: remove cart lines and applied codes before closing the session.
- Modest volume on a shared public host; business failures arrive as HTTP 200 + `success:false`; body-less POST needs `data: ''`; send `X-Requested-With: XMLHttpRequest`.

## Auth probe

- Login form: /login (cart page links to `/login?returnUrl=%2Fcart`). Not needed for the cart.
- Cookies seen for an anonymous visitor: `SMARTSTORE.VISITOR` (HttpOnly, Secure, SameSite=Lax, 1-year), `ASP.NET_SessionId` (HttpOnly, SameSite=Lax), `SmartStore.RecentlyViewedProducts` (not HttpOnly). The guest cart is tied to these cookies.

## Scout observations

- Empty /cart shows heading "Shopping cart" and a step bar (Cart, Address, Shipping, Payment, Confirm, Complete).
- With one line (Certina DS Podium Big Size, $479.00): per line image, SKU, "Arrives" date, "x" remove link, a second icon link, price, qty box with -/+ buttons, line total; collapsible panels "I have a discount code", "I have a gift card", "Estimate shipping"; totals Subtotal / Shipping / Tax / Total; buttons "Continue shopping" and "Checkout".
- Gift card products ($10/$25/$50/$100 Virtual Gift Card) have extra recipient/sender fields before Add to cart and show "Free shipping".
- The scout added one line and removed it again; its cart was left empty and the session closed.

## Browser evidence

Command: `./node_modules/.bin/playwright-cli list` (right after `open https://bearstore-testsite.smartbear.com/ --headed`):

```
### Browsers
- qa-scout:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```

## Scope decision
- Asked: All units
- Explored units: cart-add, cart-quantity, cart-remove, cart-codes, cart-totals-shipping
- Not explored (user's choice): none
- Refinements: 0
