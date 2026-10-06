# Discovery: functional areas (Stage 1a)

Target: https://bearstore-testsite.smartbear.com (SmartStore, ASP.NET MVC 5.2 on IIS 10). No documented API; the HTTP traffic behind the UI is the API (server-rendered pages, form posts, AJAX fragments).

## Areas

| area key | entry URLs | needs login | owns state | what to find out |
|---|---|---|---|---|
| auth | /login?returnUrl=, /register, /customer/passwordrecovery, /logout, /customer/info, /customer/addresses, /customer/orders | yes (account pages); login/register are anonymous | Customer session cookies, registered accounts, customer profile/addresses, order history (read only). Owns login/logout and any account it registers (must clean up or reuse BEARSTORE_EMAIL) | Login POST contract (fields, status, redirect, cookies set), invalid creds, returnUrl handling, logout, register validations, password recovery, account page access when anonymous vs logged in, profile/address update |
| catalog | /, /books, /furniture, /sports, /gaming, /watches, /gift-cards, /soccer, /basketball, /golf, /jackets, /shoes, /trousers, /sunglasses, product detail pages (slug URLs), /recentlyviewedproducts, /newproducts (What's New) | no | none (read only; anonymous sessions only. Recently viewed is per-visitor cookie state, written implicitly by product views) | Category listing contract (paging, sorting, filters, view modes via query string), product detail data, 404 behaviour for unknown slugs, recently viewed, what's new, currency switch (USD) |
| search | /search?q=, instant search endpoint behind the header box (GET form to /search) | no | none (anonymous only) | Search params (q, filters, price range, sorting, paging), empty/short/special-char queries, instant search endpoint and response format, injection/encoding edge cases |
| cart-compare-wishlist | /cart, /wishlist, /compareproducts, add-to-cart / add-to-wishlist / add-to-compare AJAX endpoints from product pages, /checkout (read only, do not place order) | no (cart, wishlist, compare and checkout entry all work anonymously; confirmed by discovery) | Shopping cart, wishlist, compare list (all three). Uses own anonymous session first; logs in within its own browser session when needed | Add / update quantity / remove contracts, cart totals, coupon and gift card fields, estimate shipping, quantity validation (0, negative, huge), compare limit, wishlist persistence, checkout entry gating |
| content-contact-newsletter | /contactus, /blog (404 though linked), /shippinginfo, /paymentinfo, /aboutus, /disclaimer, /privacyinfo, /conditionsofuse, newsletter form in footer (subscribe/unsubscribe, field NewsletterEmail, radios optionsRadios) | no | Contact form submissions (messages sent), newsletter subscription entries for test email addresses it invents (cleanup via unsubscribe) | Static page availability and status codes, contact form POST contract and validation, newsletter subscribe/unsubscribe contract and validation, blog list/detail, response headers |

Content page slugs were corrected after discovery to the real footer hrefs (the hyphenated guesses /shipping-returns, /payment-info, /about-us, /privacy, /conditions-of-use return 404).

## Observed auth behaviour

- Login form: GET /login?returnUrl=%2F (header "Log in" link carries returnUrl). Form is `POST /login`, fields `UsernameOrEmail`, `Password`, `RememberMe` (checkbox plus hidden false). No `__RequestVerificationToken` field was found in the raw login HTML (verify when probing the POST).
- Related links: Register at /register?returnUrl=%2f, Forgot password at /customer/passwordrecovery.
- Cookies on first anonymous visit: only `SMARTSTORE.VISITOR` (GUID, path /, domain bearstore-testsite.smartbear.com). Via `curl -i`: `Set-Cookie: SMARTSTORE.VISITOR=...; expires=+1 year; path=/; secure; HttpOnly; SameSite=Lax`. The browser `cookie-list` showed it, so it is the only cookie before login.
- Server headers: `Microsoft-IIS/10.0`, `X-AspNetMvc-Version: 5.2`, `X-AspNet-Version: 4.0.30319`, `X-Powered-By: ASP.NET` (version disclosure, worth a finding).
- Login was NOT performed in this scouting pass: `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` are not set in the scout's environment, and `tests/support/auth.ts` does not exist yet. Session cookie names after login are therefore unknown; the auth discoverer must record them.

## Excluded

- Placing a real order (checkout confirm/payment): destructive, creates orders that cannot be deleted. Checkout may be explored read-only up to the confirmation step.
- Deleting or deactivating accounts, changing the password of the shared BEARSTORE_EMAIL account: would break parallel agents and later test runs.
- Load / stress / DoS style testing and security scanning of the shared public demo host: out of scope for functional API QA.
- Admin back office (if any exists): no credentials, not linked from the storefront.
- Gift card purchase flows that trigger email delivery: side effects outside the system.

## Shared rules for discoverers

- Credentials only via env vars `BEARSTORE_EMAIL` and `BEARSTORE_PASSWORD` (defaults in `tests/support/auth.ts` once it exists). Never write secrets into artifacts.
- Browser: your own session `-s=qa-<area key>`, always `open ... --headed`, confirm `headed: true` with `npx playwright-cli list`, close the session when done.
- State ownership is strict: only the owning area mutates cart, wishlist, compare, profile, subscriptions, contact messages. Others use anonymous sessions and read only.
- Any session needing login logs in inside its own browser session; do not share cookies between areas.
- No destructive actions (no orders, no account deletion, no password changes on the shared account).
- Clean up what you create: remove cart/wishlist/compare items, unsubscribe test newsletter emails, delete or abandon test registrations only via supported UI.
- Use obviously fake data (e.g. `qa-<area>-<timestamp>@example.com`).
- Write nothing under `tests/`.

## Browser evidence

Output of `npx playwright-cli list` during scouting:

```
- qa-scout:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
