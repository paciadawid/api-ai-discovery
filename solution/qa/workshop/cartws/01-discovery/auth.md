# Auth model - cart area

Sources: the three unit notes.md and endpoints.json files. No claims beyond them.

## Summary
No login is involved. All ten cart endpoints worked anonymously (authRequired false everywhere). The cart (and wishlist) belongs to a guest visitor identified by cookie.

## Session creation
- First request without cookies (any page, e.g. GET / or GET /cart or the product page) creates a guest visitor and sets `SMARTSTORE.VISITOR`.
- `ASP.NET_SessionId` appears on the first `/shoppingcart/offcanvasshoppingcart` call or the first `GET /cart`.
- Add-to-cart (`POST /cart/addproduct/...`) and `POST /shoppingcart/updatecartitem` re-issue `SMARTSTORE.VISITOR` on each response; delete/move responses set no cookie.

## Session destruction
No logout or session end was exercised or observed. The visitor cookie lives one year. Emptying the cart does not end the visitor.

## Cookies and flags
| Cookie | Flags observed | Notes |
|---|---|---|
| `SMARTSTORE.VISITOR` | HttpOnly, secure, 1 year | Binds cart and wishlist to the visitor. Re-set on add and update responses. |
| `ASP.NET_SessionId` | flags not recorded by the units | Set on the first offcanvas or /cart call. |

## CSRF / anti-forgery
No anti-forgery token was seen or needed: every curl replay (add, update, delete, move) succeeded with only the visitor cookie. cart-add observed that omitting `X-Requested-With` still works for add. Whether the other mutating endpoints require it was not tested (cart-update and cart-remove replays sent it for some calls). No Origin/Referer checks were tested.

## Object-level access (ownership)
- A cart or wishlist line can only be changed or removed by its owner (the visitor whose cookie created it).
- updatecartitem with another visitor's or an unknown id: HTTP 500, nothing changed.
- deletecartitem and moveitembetweencartandwishlist with another visitor's or an unknown id: HTTP 200 `success:false`, line stays.

## Visitor identity in practice (testability)
- The three parallel headed browsers appeared to share one guest cart (same IP and User-Agent probably key the guest visitor). Each unit saw lines it had not created, and counters moved on their own.
- curl jars with a unique User-Agent each behaved deterministically and were fully isolated.
- Tests should use a fresh request context with its own unique User-Agent. Cause of the sharing is unconfirmed (see open questions).

## Protected paths
None of the explored paths require authentication. `GET /checkout` with an empty cart answered `302 Location: /cart` (read-only check by cart-remove; it is an empty-cart redirect, not a login redirect). Checkout, account and login were not explored in this scope.

## Transport requirements related to auth-less POSTs
POST endpoints without a body need `Content-Length: 0` (curl `-d ""`), otherwise IIS answers 411.
