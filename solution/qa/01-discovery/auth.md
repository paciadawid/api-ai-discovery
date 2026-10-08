# Auth model (consolidated, scope: cart)

Target: https://bearstore-testsite.smartbear.com (SmartStore). Sources: the auth probe and scout notes in `areas.md`, plus the "Auth observations" of the five cart units. No login was needed or attempted; no credentials were used. Nothing below is new; contradictions are listed at the end.

## Identity: an anonymous visitor, nothing else observed

1. Every visitor is anonymous. The first request (even a cookieless `GET /cart`) creates the visitor; no sign-in step exists in the cart scope.
2. The visitor owns the cart, the wishlist (cart type 2 of the add endpoint), the compare list counter and the chosen display currency. Currency is stored server side per visitor: there is no currency cookie (`/changecurrency/<id>` sets it).
3. **The guest cart is keyed by IP + User-Agent, not by the cookie.** A request with a fresh cookie jar and the same User-Agent from the same IP sees the same cart (cart-add: 16 units seen); a fresh jar with another User-Agent sees an empty cart. Parallel headed Chrome sessions with the default User-Agent from one machine therefore share ONE cart. See "Conflicts" for what the units disagree on.
4. Cart line ids (`cartItemId` / `sciItemId`) are global increasing integers shared by all visitors (169014 ... 169044 seen), not stable between runs, and scoped to the caller's cart: another visitor's id is refused (`deletecartitem`: 200 `success:false` generic message; `updatecartitem`: HTTP 500 JSON error), the other cart is untouched.

## Session creation and destruction

| action | observed |
|---|---|
| Creation | Implicit on the first request: `SMARTSTORE.VISITOR` is issued, `ASP.NET_SessionId` on the first response only. No login, no token exchange. |
| Re-issue | `SMARTSTORE.VISITOR` is re-sent with a refreshed 1-year expiry on almost every response (add, update, delete, `POST /cart`, `GET /cart`, currency change). cartsummary, offcanvasshoppingcart and states responses were recorded with and without it (see Conflicts). |
| Destruction | None observed in the cart scope. A cart is emptied only by removing its lines (`deletecartitem`) or by `updatecartitem` with quantity 0 or negative (which also answers HTTP 500). Applied codes: removal unobserved. |
| Login / logout / registration | Not explored. The cart page links to `/login?returnUrl=%2Fcart`; the form exists but was not used. |

## Cookies (anonymous visitor)

| cookie | flags observed | note |
|---|---|---|
| `SMARTSTORE.VISITOR` | HttpOnly, Secure, SameSite=Lax, 1 year (cart-add, scout) | carries the visitor identity; replays with a plain cookie jar (this cookie + `ASP.NET_SessionId`) work, no token needed |
| `ASP.NET_SessionId` | HttpOnly, SameSite=Lax | first response only |
| `SmartStore.RecentlyViewedProducts` | not HttpOnly (scout) | irrelevant for the cart |

## CSRF / anti-forgery and headers

- No anti-forgery token anywhere in the cart scope: the cart form (`POST /cart`, multipart, one form holding quantity boxes, both code panels, estimate-shipping fields and the checkout submit) has no token field; the XHR mutations (`addproduct`, `addproductsimple`, `updatecartitem`, `deletecartitem`) send none. A plain cookie jar is enough.
- `X-Requested-With: XMLHttpRequest` is sent by the page. Verified NOT required for add (cart-add), `updatecartitem` (cart-quantity) and `POST /cart` (cart-codes). Not tested for `deletecartitem` (cart-remove).
- A body-less POST needs an empty body (`data: ''` / `-d ''`), otherwise HTTP 411 Length Required (add, cartsummary, deletecartitem, updatecartitem).
- GET on the POST-only endpoints answers 404 (not 405) and does not change state (verified for delete, update, add, cartsummary).

## Protected paths

All 15 consolidated endpoints are `authRequired: false` and were used anonymously. Nothing in the cart scope is protected. Not reached: checkout (the Checkout button triggers a hidden `startcheckout` submit of `POST /cart`, seen statically only; excluded by scope), `/login`, registration, customer pages.

## Conflicts between units

- Cookie vs User-Agent: cart-remove saw an identical `SMARTSTORE.VISITOR` value in the sessions that shared a cart; cart-codes states the sessions had different `SMARTSTORE.VISITOR` values and still shared one cart, so "the cookie alone did not separate them". Both agree the unique User-Agent separates carts; whether the server also hands the same visitor GUID to cookieless clients with the same IP + User-Agent is unresolved.
- cart-add reported that its default-User-Agent browser cart held only its own lines; cart-codes' browser cart contained lines 169016 and 169025, which cart-add lists as its own browser lines. cart-add's browser observations are therefore unreliable (see SUMMARY.md, risk 1).
- Set-Cookie on cartsummary / offcanvasshoppingcart: cart-remove recorded `SMARTSTORE.VISITOR` re-issued; cart-add, cart-quantity and cart-totals-shipping recorded none. Not relevant for tests.
