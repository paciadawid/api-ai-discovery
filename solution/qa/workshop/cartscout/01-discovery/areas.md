# Discovery partition: scope `cart`

Base URL: https://bearstore-testsite.smartbear.com (SmartStore). Scope: `cart` (one area). Anonymous visitor, no login, no checkout beyond reading.

What a visitor can do (seen in the browser, not deep-dived):
- Product listing and product page (`/books`, `/best-grilling-recipes`): quantity box (`-` / `+`), "Add to cart" link, price shown excl. tax.
- Cart page `/cart`: empty state "Your Shopping Cart is empty!"; with an item: quantity box with `-` / `+`, collapsible "I have a discount code", "I have a gift card", "Estimate shipping", "Continue shopping", "Checkout".

Each unit runs in its own browser session, which is its own anonymous cart. "Owns state" names the piece of cart state that unit alone writes; other units only read it.

## Units

| area | unit key | entry URLs | needs login | owns state | what to find out | effort |
|------|----------|------------|-------------|------------|------------------|--------|
| cart | cart-add | `/books`, `/best-grilling-recipes` (any product page), `/cart` (read) | no | cart lines created in session `qa-cart-add` (line creation, mini-cart/header counter) | Request behind "Add to cart" from product page and listing: method, path, body (product id, quantity), response (cart count, messages); adding the same product twice, quantity above 1, invalid/unknown product id | M |
| cart | cart-quantity | `/cart` (seed with its own add) | no | quantity of the lines in session `qa-cart-quantity` | Request behind `-` / `+` and typed quantity on `/cart`: payload, response (updated totals), quantity 0, negative, very large, non-numeric | M |
| cart | cart-remove | `/cart` (seed with its own add) | no | line removal and empty-cart state in session `qa-cart-remove` | Request behind removing a line (and clearing the cart): payload, response, removing a line that no longer exists, empty-cart response | S |
| cart | cart-promo | `/cart` (discount code and gift card panels) | no | applied discount code / gift card in session `qa-cart-promo` | Requests behind "I have a discount code" and "I have a gift card": payload, response for invalid, empty and repeated codes, how an applied code is removed | M |
| cart | cart-shipping-estimate | `/cart` ("Estimate shipping" panel) | no | shipping estimate inputs (country, zip) in session `qa-cart-shipping-estimate` | Request behind "Estimate shipping": payload, response (options, prices), missing/invalid country or zip | S |

## Areas

- **cart** (total effort about M+M+S+M+S = roughly 20 to 25 minutes if run one after another, 5 agents can run in parallel): everything a visitor can do with the shopping basket. Add products, change quantities, remove lines, apply a discount code or gift card, estimate shipping. Units: `cart-add`, `cart-quantity`, `cart-remove`, `cart-promo`, `cart-shipping-estimate`.

## Excluded (outside scope)

- Auth (`/login`, register, logout, password recovery): outside scope `cart`; not browsed.
- Catalog browse (category pages such as `/books`, `/sports`, filters, sorting, paging): outside scope; only used as an entry to reach "Add to cart".
- Search (header search box, `/search`): outside scope.
- Product detail (reviews, product variants, "ask a question"): outside scope.
- Wishlist (`/wishlist`, "Add to List"): outside scope; separate state, own area if wanted.
- Compare products (`/compareproducts`, "Compare"): outside scope; separate state, own area if wanted.
- Checkout and orders (`/checkout`, order history): outside scope, and placing real orders is destructive.
- Account / customer info: outside scope, needs login.
- Contact us (`/contactus`), newsletter subscription, blog, shipping/payment/about/legal content pages, currency switcher: outside scope; not browsed.

## Shared rules

- No credentials are needed for this scope; do not log in. If a later run needs them, read them from `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` via `.env` and never print them.
- One headed browser session per unit, named `-s=qa-<unit key>`, always `open --headed`; confirm `headed: true` with `list`.
- Use only the unit's own session/cart; never add to or change another unit's cart.
- No destructive actions: do not open checkout past reading, do not place orders, do not submit contact or newsletter forms.
- Clean up what you create: remove added lines or close the session (the cart of an anonymous in-memory session disappears with it).
- Write nothing under `tests/` during discovery.

## Browser evidence

```
### Browsers
- qa-scout:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
