# Auth model (consolidated)

Target: https://bearstore-testsite.smartbear.com (SmartStore, ASP.NET MVC 5.2 on IIS 10, behind an AWS load balancer). Sources: auth area (primary), plus auth observations from catalog, search, cart-compare-wishlist and content-contact-newsletter. No statement below is new; contradictions are listed at the end.

## Identity layers

1. Anonymous visitor: every response sets/re-sends `SMARTSTORE.VISITOR` (a GUID). Cart, wishlist, currency choice, and the guest customer hang off this GUID.
2. Authenticated customer: `SMARTSTORE.AUTH` forms-auth ticket, created by login or registration.
3. Cart, wishlist and compare work for visitors without any login; checkout is reachable as a guest ("Checkout as Guest").

## Session creation

| action | request | result |
|---|---|---|
| Login | `POST /login?returnUrl=<local path>`, urlencoded `UsernameOrEmail` (email or username; email case-insensitive), `Password` (case-sensitive), `RememberMe` (`false`; checkbox sends `true&false`) | 302 to the local returnUrl, else `/`. Sets `SMARTSTORE.AUTH`. |
| Login failure | wrong password, unknown user, empty fields | 200, form re-rendered, uniform message "Login was unsuccessful ... The credentials provided are incorrect". No cookie. |
| Register | `GET /register` then `POST /register?returnUrl=` with `__RequestVerificationToken` (form value and cookie), FirstName, LastName, DateOfBirthDay/Month/Year, Email, Username (required server-side), Password (6-500), ConfirmPassword, Company, `register-button` | 302 to `/registerresult/1?returnUrl=...` and the user is logged in (persistent AUTH cookie). Validation errors: 200. Missing token: 500. |
| returnUrl | local paths are honoured; `https://evil.example.com/` and `//evil.example.com` fall back to `/` | No open redirect. Protected pages redirect with `ReturnUrl` (capital R); both spellings accepted. |
| Guest checkout | `/login?checkoutAsGuest=True&returnUrl=%2Fcart`, then `GET /checkout` | works without account; `GET /checkout` with a non-empty cart goes straight to `/checkout/billingaddress`. |

## Session destruction

`GET /logout` (also works anonymously and with a stale cookie) returns 302 `/` and `Set-Cookie: SMARTSTORE.AUTH=; expires=1999`. `POST /logout` without body gives 411. Logout is state-changing over GET. The old `SMARTSTORE.AUTH` value still authenticates after logout (`/customer/info` returns 200): no server-side invalidation.

## Cookies

| cookie | set by | flags observed | lifetime |
|---|---|---|---|
| `SMARTSTORE.VISITOR` | first response of any page, re-sent on every response | Secure, HttpOnly, SameSite=Lax, path /, domain bearstore-testsite.smartbear.com | 1 year (sliding). Same value is returned to cookieless clients with same IP + User-Agent (catalog, content). A forged value is replaced. |
| `SMARTSTORE.AUTH` | login, register | HttpOnly, SameSite=Lax, NOT Secure | session cookie when RememberMe=false; +30 days when RememberMe=true; always +30 days after register |
| `__RequestVerificationToken` | most GETs (cookie half of anti-forgery) | Secure, HttpOnly | not stated |
| `ASP.NET_SessionId` | lazily: first use of `v=` or `s=` (catalog, search), `/logout`, browser cart flow | HttpOnly, SameSite=Lax (Secure not stated) | not stated. Holds view mode and page size. |
| `sm.CompareProducts` | `addproducttocompare` | Secure, HttpOnly | +10 days. Compare list lives only in this cookie. |
| `SmartStore.RecentlyViewedProducts` | product page views | Secure, HttpOnly, SameSite=Lax | +10 days; max 8 ids; forgeable by hand. |

No currency cookie: currency is stored server side per visitor GUID.

## CSRF / anti-forgery

| endpoint | token | note |
|---|---|---|
| `POST /login` | none (not in form, not required) | confirmed by posting without any |
| `POST /register`, `POST /customer/info`, `POST /customer/changepassword` | required (form field and cookie) | missing token returns 500, not 400/403; applies to anonymous callers too |
| `POST /customer/addressadd`, `/customer/addressedit/{id}`, `GET /customer/addressdelete/{id}` | none | delete is a GET |
| `POST /customer/passwordrecovery` | none | needs the `send-email` marker field or it silently re-renders |
| `POST /contactus`, `POST /newsletter/subscribe`, `POST /search`, `POST /instantsearch` | none | no captcha either |
| cart, wishlist, compare AJAX (`/cart/addproduct`, `/shoppingcart/*`, `/catalog/*compare*`) | none | compare add/remove/clear also work via GET |
| `POST /product/reviews/{id}` | token present in form | not exercised |
| `GET /logout`, `GET /changecurrency/{id}` | n/a | state changes over GET |

## Protected and open paths

Protected (anonymous gets 302 `/login?ReturnUrl=<lowercase-encoded path>`): `/customer/info`, `/customer/addresses`, `/customer/orders`, `/customer/addressadd`, `/customer/addressedit/{id}`, `/customer/addressdelete/{id}`, `/customer/changepassword`, `/customer/downloadableproducts`. Authenticated, these return 200 with title "Shop. Account". Address ownership is enforced (foreign or unknown id: 302 `/customer/addresses`, nothing changed). Another visitor's cart item ids cannot be updated or deleted (no IDOR found).

Not protected (by design or by omission): `/customer/backinstocksubscriptions` (200 anonymously, inconsistent with its siblings), `/customer` (404), `/registerresult/1`, `/login` and `/register` while logged in (200, no redirect), all catalog, search, content, cart, wishlist, compare and checkout-entry pages. Public wishlist `/wishlist/{guid}` is readable without auth, and the GUID is the `SMARTSTORE.VISITOR` value, so the link leaks the HttpOnly identity cookie (see SUMMARY.md, risks).

## Enumeration and disclosure

Login is uniform. Password recovery ("Email not found.") and registration ("The specified email already exists", "The specified username already exists") allow account enumeration. Newsletter replies do not distinguish known addresses. Headers disclose `Microsoft-IIS/10.0`, `X-AspNetMvc-Version: 5.2`, `X-AspNet-Version: 4.0.30319`, `X-Powered-By: ASP.NET`, meta `generator: Smartstore 4.2.0.0`; no HSTS, CSP or X-Frame-Options observed (content-contact-newsletter). The 502/414 pages come from another layer without these headers.

## Credentials and test accounts

`BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` were not set and `tests/support/auth.ts` does not exist. Discoverers therefore registered throwaway @example.com accounts (`qa-auth-1790932958@example.com`, `qa-auth-1790932958b@example.com`, `qa-cart-1790933638@example.com`). Their passwords were not saved to artifacts (the auth discoverer kept its passwords in /tmp scratch files); the accounts cannot be deleted through the UI and are not reusable by tests.

## Contradictions and corrections to areas.md

- areas.md: wishlist and checkout "login likely required". Observed: both work anonymously (cart-compare-wishlist).
- areas.md: session cookie names after login unknown. Now known (table above).
- areas.md: only `SMARTSTORE.VISITOR` exists before login. Confirmed for a first visit; `ASP.NET_SessionId`, `sm.CompareProducts`, `SmartStore.RecentlyViewedProducts` appear later with use.
- Visitor GUID: auth says the cookie is unchanged by login; cart-compare-wishlist recorded one GUID change between two page loads with a lost cart. Unresolved (open-questions OQ-01).
