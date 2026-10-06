# Stage 1c Discovery Summary: Bearstore / SmartStore API QA

Target: https://bearstore-testsite.smartbear.com (SmartStore 4.2, ASP.NET MVC 5.2, IIS 10, behind an AWS load balancer). No documented API; the HTTP traffic behind the UI is the API. Companion files: `endpoints.json`, `flows.md`, `auth.md`, `open-questions.md`, `areas.md`, `areas/<area>/`.

Text produced by the qa-discovery-consolidator agent (its Write was refused, so the main session saved it on the user's approval). Gate 1 answers are at the bottom.

## 1. At a glance

| item | value |
|---|---|
| Areas in areas.md | 5 |
| Areas explored | 5 of 5 (auth, catalog, search, cart-compare-wishlist, content-contact-newsletter). None skipped. |
| Unit folders merged | 6 (the content area has two folders, see Section 5) |
| Endpoint records | 89 raw, **74 unique** after dedup (15 duplicates merged) |
| Verified / unverified | **70 verified, 4 unverified** (change-password success, email-wishlist form, newsletter activation, recovery confirm). "Verified" means replayed with curl and matching the browser, except records marked "curl only". |
| Flows | 42 unit flows (auth 11, catalog 8, search 5, cart-compare-wishlist 9, content-contact-newsletter 4, content 5). |
| Open questions | 40 after dedup |
| Candidate application defects | 27 (Section 4) |
| Conflicts between area files | 10 logged (CONF-01 to CONF-10) |
| Auth | everything is anonymous except `/customer/*` account pages |

Method: all five area units used headed Chrome via playwright-cli, then curl replays. Search used the browser only for the instant POST and `GET /search` with q, o, i, s, p. The extra `content` folder (predates this run, 11:17 vs areas.md 11:20) used curl only.

### Discrepancies reconciled against areas.md
1. **Content hrefs.** Real hrefs are `/shippinginfo`, `/paymentinfo`, `/aboutus`, `/privacyinfo`, `/conditionsofuse` (plus `/disclaimer`, `/contactus`). The hyphenated slugs in the original areas.md return 404.
2. **Anonymous cart, wishlist, compare, checkout entry.** All work anonymously; checkout offers "Checkout as Guest". Only `/customer/*` needs login.
3. **Credentials.** `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` are not set and `tests/support/auth.ts` does not exist. Discoverers registered three throwaway accounts (`qa-auth-1790932958@example.com`, `qa-auth-1790932958b@example.com`, `qa-cart-1790933638@example.com`). They cannot be deleted and are **not reusable**.
4. **Irreversible state on the shared host:** 5 contact messages, several newsletter entries, 3 accounts (Section 7).
5. **Newsletter field names.** `NewsletterEmail` and `optionsRadios` are DOM names. The wire contract is `POST /newsletter/subscribe` with `subscribe`, `email`, `GdprConsent`.
6. **Session cookie names** are now known (Section 3).

### Overlaps and contradictions between area files
- Merged overlaps: `/shoppingcart/cartsummary` (catalog + cart), `GET /login` with `checkoutAsGuest`, password recovery (auth + content), contact/newsletter/static pages/blog/RSS (content vs content-contact-newsletter, 11 pairs).
- GET vs POST: no area contradicts another on cartsummary (POST only; GET 404; 411 without Content-Length). Compare mutations accept GET as well as POST; recorded as a defect (state-changing GET).
- Unresolved: CONF-01 (is `<` in a newsletter email a 500 or accepted?), CONF-02 (502 layer described three ways; assert status only), CONF-03 (password recovery `stateChanging` true in auth, false in content; kept true).
- Consolidator hypothesis (OQ-01): cookieless requests with the same IP and User-Agent share one visitor GUID. A cart vanished once when the GUID changed, a line id changed once with no delete, and "1 Shopping Basket" appeared right after registering from an empty session. Parallel workers on one machine may share a guest customer. Needs a controlled probe.

## 2. Endpoint table
Full records in `endpoints.json`. Columns: id | method | path | purpose | auth | state-changing | verified.

**auth**

| id | method | path | purpose | auth | state-changing | verified |
|---|---|---|---|---|---|---|
| EP-AUTH-LOGIN-FORM | GET | /login?returnUrl={url} | Login form (also checkout-as-guest entry) | no | no | yes |
| EP-AUTH-LOGIN | POST | /login?returnUrl={url} | Log in, sets SMARTSTORE.AUTH | no | yes | yes |
| EP-AUTH-LOGOUT | GET | /logout | Log out (GET) | no | yes | yes |
| EP-AUTH-REGISTER-FORM | GET | /register?returnUrl={url} | Registration form with token | no | no | yes |
| EP-AUTH-REGISTER | POST | /register?returnUrl={url} | Register, auto login | no | yes | yes |
| EP-AUTH-REGISTERRESULT | GET | /registerresult/1?returnUrl={url} | Registration completed | no | no | yes |
| EP-AUTH-PWRECOVERY-FORM | GET | /customer/passwordrecovery | Recovery form | no | no | yes |
| EP-AUTH-PWRECOVERY | POST | /customer/passwordrecovery | Request recovery email | no | yes | yes |
| EP-AUTH-INFO-GET | GET | /customer/info | Profile page | yes | no | yes |
| EP-AUTH-INFO-POST | POST | /customer/info | Update profile | yes | yes | yes |
| EP-AUTH-ADDRESSES | GET | /customer/addresses | List addresses | yes | no | yes |
| EP-AUTH-ADDRESS-ADD | POST | /customer/addressadd | Add address | yes | yes | yes |
| EP-AUTH-ADDRESS-EDIT | POST | /customer/addressedit/{id} | Edit own address | yes | yes | yes |
| EP-AUTH-ADDRESS-DELETE | GET | /customer/addressdelete/{id} | Delete own address via GET | yes | yes | yes |
| EP-AUTH-ORDERS | GET | /customer/orders | Order history | yes | no | yes |
| EP-AUTH-CHANGEPW | POST | /customer/changepassword | Change password (success not exercised) | yes | yes | no |
| EP-AUTH-ACCOUNT-MISC | GET | /customer/downloadableproducts, /customer/backinstocksubscriptions, /customer/changepassword | 3 account pages | mixed | no | yes |

**catalog**

| id | method | path | purpose | auth | state-changing | verified |
|---|---|---|---|---|---|---|
| EP-CATALOG-HOME | GET | / | Home page | no | no | yes |
| EP-CATALOG-CATEGORY | GET | /{categorySlug} | Listing with o, s, i, v, p, r, d, a | no | no | yes |
| EP-CATALOG-PRODUCT | GET | /{productSlug} | Product page (sets recently-viewed cookie) | no | no | yes |
| EP-CATALOG-NOTFOUND | GET | /{unknownSlug} | Catch-all 404 and canonical redirects | no | no | yes |
| EP-CATALOG-NEWPRODUCTS | GET | /newproducts | What's New (params ignored) | no | no | yes |
| EP-CATALOG-RECENT | GET | /recentlyviewedproducts | Recently viewed (cookie) | no | no | yes |
| EP-CATALOG-CURRENCY | GET | /changecurrency/{id}?returnUrl= | Switch currency (per visitor GUID) | no | yes | yes |
| EP-CATALOG-UPDATEPRODUCTDETAILS | POST | /product/updateproductdetails?productId={id}&bundleItemId=0 | Variant/qty price recalculation | no | no | yes |
| EP-CATALOG-REVIEWS | GET | /product/reviews/{productId} | Reviews page | no | no | yes |
| EP-CATALOG-ASKQUESTIONAJAX | GET | /product/askquestionajax/{productId} | Ask-a-question redirect JSON | no | no | yes |

**search**

| id | method | path | purpose | auth | state-changing | verified |
|---|---|---|---|---|---|---|
| EP-SEARCH-PAGE | GET | /search | Results with q, c, p, r, d, a, o, s, i, v | no | no | yes |
| EP-SEARCH-PAGE-POST | POST | /search | Search via POST (not used by UI) | no | no | yes |
| EP-SEARCH-INSTANT | POST | /instantsearch | Instant search HTML fragment (max 10) | no | no | yes |
| EP-SEARCH-TRAILING-SLASH | GET | /search/ and /Search | 301 to http:// URL | no | no | yes |

**cart-compare-wishlist**

| id | method | path | purpose | auth | state-changing | verified |
|---|---|---|---|---|---|---|
| EP-CART-ADD-CART | POST | /cart/addproduct/{productId}/1 | Add to cart | no | yes | yes |
| EP-CART-ADD-WISHLIST | POST | /cart/addproduct/{productId}/2 | Add to wishlist | no | yes | yes |
| EP-CART-OFFCANVAS-CART | POST | /shoppingcart/offcanvasshoppingcart | Mini-cart fragment | no | no | yes |
| EP-CART-OFFCANVAS-WISHLIST | POST | /shoppingcart/offcanvaswishlist | Mini-wishlist fragment | no | no | yes |
| EP-CART-SUMMARY | POST | /shoppingcart/cartsummary?cart=True&wishlist=True&compare=True | Header counters JSON | no | no | yes |
| EP-CART-VIEW | GET | /cart | Cart page and totals | no | no | yes |
| EP-CART-UPDATE | POST | /shoppingcart/updatecartitem?sciItemId={id}&isCartPage=True | Update line quantity | no | yes | yes |
| EP-CART-DELETE | POST | /shoppingcart/deletecartitem?cartItemId={id}[&wishlistItem=True] | Remove line | no | yes | yes |
| EP-CART-MOVE | POST | /shoppingcart/moveitembetweencartandwishlist?cartItemId={id}&cartType= | Move cart/wishlist | no | yes | yes |
| EP-CART-COUPON | POST | /cart | Apply coupon (submit-button field selects action) | no | yes | yes |
| EP-CART-GIFTCARD | POST | /cart | Apply gift card | no | yes | yes |
| EP-CART-ESTIMATE-SHIPPING | POST | /cart | Estimate shipping | no | no | yes |
| EP-CART-STATES | GET | /country/getstatesbycountryid?countryId={id} | States JSON | no | no | yes |
| EP-CART-CONTINUE | POST | /cart | Continue shopping (302 /) | no | no | yes |
| EP-CART-STARTCHECKOUT | POST | /cart | Start checkout (302) | no | no | yes |
| EP-CHECKOUT-ENTRY | GET | /checkout | Entry redirect | no | no | yes |
| EP-CHECKOUT-STEPS | GET | /checkout/billingaddress, shippingaddress, shippingmethod, paymentmethod, confirm | Step pages, read only | no | no | yes |
| EP-CHECKOUT-BILLING-POST | POST | /checkout/billingaddress | Billing (only invalid probe done) | no | no | yes |
| EP-WISHLIST-VIEW | GET | /wishlist | Wishlist page | no | no | yes |
| EP-WISHLIST-SHARED | GET | /wishlist/{customerGuid} | Public shared wishlist | no | no | yes |
| EP-WISHLIST-EMAIL | GET | /shoppingcart/emailwishlist | Email-a-friend form (POST not done) | no | no | no |
| EP-COMPARE-ADD | POST | /catalog/addproducttocompare/{productId} | Add to compare (GET also works) | no | yes | yes |
| EP-COMPARE-OFFCANVAS | POST | /catalog/offcanvascompare | Compare fragment | no | no | yes |
| EP-COMPARE-VIEW | GET | /compareproducts | Compare page | no | no | yes |
| EP-COMPARE-REMOVE | GET | /catalog/removeproductfromcompare/{productId} | Remove from compare | no | yes | yes |
| EP-COMPARE-CLEAR | GET | /catalog/clearcomparelist | Clear compare | no | yes | yes |

**content-contact-newsletter**

| id | method | path | purpose | auth | state-changing | verified |
|---|---|---|---|---|---|---|
| EP-CONTENT-ABOUTUS | GET | /aboutus | Static page | no | no | yes |
| EP-CONTENT-SHIPPINGINFO | GET | /shippinginfo | Static page | no | no | yes |
| EP-CONTENT-PAYMENTINFO | GET | /paymentinfo | Static page | no | no | yes |
| EP-CONTENT-PRIVACYINFO | GET | /privacyinfo | Static page | no | no | yes |
| EP-CONTENT-CONDITIONSOFUSE | GET | /conditionsofuse | Static page | no | no | yes |
| EP-CONTENT-DISCLAIMER | GET | /disclaimer | Static page | no | no | yes |
| EP-CONTENT-BLOG-PAGE | GET | /blog | Linked, always 404 | no | no | yes |
| EP-CONTENT-CONTACT-FORM | GET | /contactus | Contact form page | no | no | yes |
| EP-CONTENT-CONTACT-SEND | POST | /contactus | Send enquiry (mails store owner) | no | yes | yes |
| EP-CONTENT-NEWSLETTER-SUBSCRIBE | POST | /newsletter/subscribe | Subscribe/unsubscribe, double opt-in JSON | no | yes | yes |
| EP-CONTENT-NEWSLETTER-ACTIVATION | GET | /newsletter/subscriptionactivation | Activation link (route unconfirmed) | no | yes | no |
| EP-CONTENT-PWRECOVERY-CONFIRM | GET | /customer/passwordrecoveryconfirm | Recovery confirm form | no | no | no |
| EP-CONTENT-RSS-NEWS | GET | /news/rss/1 | Empty news feed | no | no | yes (curl only) |
| EP-CONTENT-RSS-BLOG | GET | /blog/rss | Empty blog feed | no | no | yes |
| EP-CONTENT-RSS-NEWPRODUCTS | GET | /newproducts/rss | New products feed | no | no | yes (curl only) |
| EP-CONTENT-SITEMAP-XML | GET | /sitemap.xml | Sitemap | no | no | yes (curl only) |
| EP-CONTENT-ROBOTS | GET | /robots.txt | robots.txt | no | no | yes (curl only) |

Notes: five `POST /cart` records share method and path and differ by the submit-button field. `EP-AUTH-ACCOUNT-MISC` is a composite of three paths. `EP-CATALOG-CATEGORY` and `EP-CATALOG-PRODUCT` are slug patterns.

## 3. Auth model
- Anonymous visitors carry `SMARTSTORE.VISITOR` (GUID; Secure, HttpOnly, SameSite=Lax, 1 year, re-sent on every response). Cart, wishlist and currency hang off it. Compare lives only in cookie `sm.CompareProducts`.
- `POST /login` (`UsernameOrEmail`, `Password`, `RememberMe`) and `POST /register` set `SMARTSTORE.AUTH`: HttpOnly, SameSite=Lax, **not Secure**; session cookie, or +30 days with RememberMe and always after register. `GET /logout` expires it, but the old value still works afterwards.
- Anti-forgery tokens required only on register, `/customer/info` and change password; a missing token gives 500. Login, address add/edit/delete, recovery, contact, newsletter, search and every cart/wishlist/compare call have none.
- Protected: `/customer/info|addresses|orders|addressadd|addressedit|addressdelete|changepassword|downloadableproducts` (302 to `/login?ReturnUrl=`). `/customer/backinstocksubscriptions` is open. Address ownership is enforced; returnUrl has no open redirect.
- Cart, wishlist, compare, checkout steps, search, catalog and content are anonymous. Detail in `auth.md`.

## 4. Risks and surprises (candidate defects)
`B=https://bearstore-testsite.smartbear.com`. Each repro is a single request; do not loop them on the shared host.

**Server errors on malformed input**

| # | area | finding | repro |
|---|---|---|---|
| 1 | content | 502 on `/newsletter/subscribe` for missing, empty or non-boolean `subscribe`, or email about 250+ chars | `curl -i -d "email=a@example.com" $B/newsletter/subscribe` |
| 2 | search | 502 on `/search` with `s=-1`, `r=9`, `r=-1` (`s=0` returns "did not match") | `curl -i "$B/search?q=er&s=-1"` |
| 3 | cart | 502 on updatecartitem `newQuantity` abc, 1.5, empty, 99999999999; also deletecartitem `cartItemId=abc`/missing, `addproduct/{id}/99999999999`, `addproducttocompare/abc`, `getstatesbycountryid?countryId=abc` | `curl -i -X POST -d "newQuantity=abc&isCartPage=true&isWishlist=false" "$B/shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True"` |
| 4 | catalog | 502 on `/product/reviews/abc`, `/product/productdetails/24`, `/catalog/category/14`, `updateproductdetails` without productId | `curl -i $B/product/reviews/abc` |
| 5 | catalog | 500 on `/{category}?s=0` | `curl -i "$B/sports?s=0"` |
| 6 | cart | updatecartitem with `newQuantity` 0 or negative DELETES the line and returns 500 JSON NullReference; unknown id also 500 | `curl -i -X POST -d "newQuantity=0&isCartPage=true&isWishlist=false" "$B/shoppingcart/updatecartitem?sciItemId=<id>&isCartPage=True"` |
| 7 | catalog | 500 JSON on `updateproductdetails?productId=99999` leaks "Object reference not set to an instance of an object." | `curl -i -X POST -d x=1 "$B/product/updateproductdetails?productId=99999&bundleItemId=0"` |
| 8 | content | 500 (request validation) on `<` or `>` in contact or newsletter fields (curl-only unit; see CONF-01) | `curl -i -X POST --data-urlencode "FullName=a<b" -d "Email=x@example.com&Enquiry=x" $B/contactus` |
| 9 | auth | 500 instead of 400/403 when the anti-forgery token is missing on register, `/customer/info`, change password | `curl -i -X POST -d "Email=a@example.com" $B/register` |

**Security and session**

| # | area | finding | repro |
|---|---|---|---|
| 10 | cart | Wishlist share link `/wishlist/{guid}` exposes the HttpOnly `SMARTSTORE.VISITOR` value; replaying it as a cookie returned the owner's cart and wishlist counts (anonymous session takeover) | read the guid from `GET /wishlist`; `curl -X POST -d "" -H "Cookie: SMARTSTORE.VISITOR=<guid>" "$B/shoppingcart/cartsummary?cart=True&wishlist=True&compare=True"` |
| 11 | auth | `SMARTSTORE.AUTH` not invalidated by logout; old value still returns 200 on `/customer/info` | log in, save cookie, `GET /logout`, replay cookie on `/customer/info` |
| 12 | auth | `SMARTSTORE.AUTH` lacks the Secure flag (VISITOR has it) | inspect `Set-Cookie` of `POST /login` |
| 13 | all | Version-disclosure headers `Microsoft-IIS/10.0`, `X-AspNetMvc-Version: 5.2`, `X-AspNet-Version`, `X-Powered-By: ASP.NET`, meta generator Smartstore 4.2.0.0; no HSTS, CSP or X-Frame-Options | `curl -sI $B/` |
| 14 | auth, content | Account enumeration: recovery says "Email not found."; register says "The specified email/username already exists". Login and newsletter are uniform. | `curl -s -d "Email=nobody@example.com&send-email=Submit" $B/customer/passwordrecovery` |
| 15 | auth, cart, catalog | No CSRF protection on login, address add/edit, recovery, contact, newsletter, or any cart/wishlist/compare call. State changes over GET: `/customer/addressdelete/{id}`, `/logout`, `/changecurrency/{id}`, compare add/remove/clear | `GET /catalog/addproducttocompare/24` returns 302 and adds |
| 16 | auth | `/customer/backinstocksubscriptions` answers 200 anonymously while siblings redirect to login | `curl -i $B/customer/backinstocksubscriptions` |
| 17 | content | Contact form: no captcha, no rate limit seen, no length limit (5000 chars accepted), success is a 200 page not a redirect | not run (each valid POST mails the store owner) |
| 18 | content, cart | .NET type names leak in JSON `$type` | `POST /newsletter/subscribe` with a malformed email |

**Functional and consistency**

| # | area | finding | repro |
|---|---|---|---|
| 19 | catalog, search, content | 301 redirects go to `http://` (scheme downgrade): `/Books`, `/books/`, `/search/`, `/AboutUs`, `/contactus/` | `curl -i $B/BOOKS` |
| 20 | content | `/blog` is 404 although linked in header and footer; only empty RSS feeds exist | `curl -i $B/blog` |
| 21 | cart | Wishlist `updatecartitem` returns the CART subtotal and empty totalsHtml | update a wishlist line with `isWishlist=true` |
| 22 | cart | Invalid gift card code shows the coupon message; estimate shipping accepts `CountryId=999999`; qty 10000 x $16.95 accepted | form POST `/cart` with `giftcardcouponcode=BAD` |
| 23 | cart | Checkout step pages return 200 for a non-empty anonymous cart without the earlier steps | `GET /checkout/confirm` with a non-empty cart |
| 24 | auth | `/customer/info` accepts an empty LastName though marked required; omitted fields are blanked | POST `/customer/info` without LastName |
| 25 | search | Facet links keep `q` HTML-encoded but not URL-encoded, so `&` and `#` break navigation; trailing space not trimmed (`watch ` 1 hit, `watch` 2); duplicate `q` comma-joined | `curl -s "$B/search?q=a%26b%23c"` and read facet `data-href` |
| 26 | catalog | Product 24 has schema availability InStock but text "Product is not available"; facet typo "2-5 woking days" | `curl -s $B/ueberman-the-novel` |
| 27 | cart | `/wishlist/{non-guid text}` renders the caller's own wishlist (200) | `curl -i $B/wishlist/abc` |

**Test-design hazards**
- State is per visitor and server side: currency, page size `s` and view mode `v` persist. Use a fresh `APIRequestContext` per test and reset currency to USD. A cookieless `changecurrency/2` changed prices for all later cookieless requests from the same IP and User-Agent.
- Cart line ids (`sciItemId`) come from a global sequence; read them back from `/cart`. Cart counts are sums of quantities; the compare count is a product count.
- Cart loss was seen twice and not reproduced (OQ-01).
- Register needs the form token plus the `__RequestVerificationToken` cookie.
- Data may change (38 hits for `er`, 58 new products, 49 category products). Assert invariants, not counts.
- Instant-search "no hit" shapes differ (0 bytes vs 3 bytes of whitespace); assert only the absence of `instasearch-hit`.
- Recently-viewed grids and sub-category tiles reuse `article.art`; scope selectors.
- A bodyless POST needs `Content-Length: 0`, otherwise 411.
- Newsletter is double opt-in; the final state is invisible.
- `o=15` and `a=True` showed no visible effect on this dataset.

## 5. Not explored
| what | why |
|---|---|
| Placing an order (confirm POST, shipping/payment selection, valid billing POST) | excluded by areas.md; orders cannot be deleted |
| Order history rows, `/customer/orderdetails/{id}` | no orders; ordering excluded; no shared credentials |
| Successful change password | password changes excluded; no reusable account |
| Valid coupon and gift card codes, non-zero tax and shipping | no codes known |
| Recovery for a real user, recovery confirm POST, newsletter activation link | needs a readable mailbox; would email a real user |
| Email-a-friend POST, ask-a-question POST, review POST | send mail or create content on the shared host |
| Variant, bundle, gift card and minimum-quantity products; currency effect on cart | not reached |
| Natural category paging | no category exceeds 13 items at page size 24 |
| Lockout, rate limiting, load, DoS, scanning | out of scope on a shared public host |
| Admin back office | no credentials; not linked |
| Date of birth, newsletter checkbox, US StateProvinceId on `/customer/info` | not exercised |
| Browser confirmation of the `content` unit and most search params | `content` was curl only; search used the browser for a few flows only |
| Unit layout | actual output is `areas/<area>/`, not `units/<unit>/`; nothing lost |

## 6. Decisions needed
1. **Test-account strategy.** Recommended: `auth.ts` uses `BEARSTORE_EMAIL`/`BEARSTORE_PASSWORD` when set; otherwise registers one fresh `qa-<ts>-<rand>@example.com` account per run (worker-scoped fixture, password generated in memory, never written to disk). Cost: about one undeletable account per run.
2. **Confirmed server errors (items 1-9).** Recommended: single-request tests asserting the correct 4xx, tagged `@defect`, `test.fail()` with a defect id. Never assert 502/500 as expected, never loop.
3. **Side effects on the shared host.** Recommended: validation-failure cases always run; one valid contact POST, one newsletter subscribe/unsubscribe pair and registration only behind `BEARSTORE_ALLOW_SIDE_EFFECTS=1`, off by default in CI.
4. **Correct areas.md.** Recommended: yes (real slugs, no login assumption).
5. **Visitor isolation.** Recommended: run the OQ-01 probe first; until then every test gets a fresh request context and a unique User-Agent suffix; tests read cart ids from `/cart`, clean their own cart, reset currency to USD.
6. **Security findings as tests (items 10-16).** Recommended: include the read-only, deterministic ones tagged `@security` (logout vs AUTH cookie, share-link GUID == VISITOR cookie, no Secure flag, version headers, enumeration messages, http:// in 301 Location, state-changing GET). Exclude fuzzing, scanning, load.
7. **Duplicate `areas/content` folder.** Recommended: `content-contact-newsletter` is authoritative; keep `content` only for what it alone covers (recovery confirm, RSS, sitemap, robots, activation), accepting curl-only evidence.
8. **Out-of-scope success paths** (orders, change password on a shared account, coupons, recovery by mail, activation). Recommended: keep out of scope.
9. **Stage 2 schema.** Recommended: Stage 2 normalises `bodyFields` to `{name, example, required, description}` while writing use cases; do not edit area files. Also: delete local /tmp scratch files holding a password and cookies.

## 7. State left behind in the application
Cannot be undone:
- **Accounts (3):** `qa-auth-1790932958@example.com` (username qaauth1790932958; Company changed), `qa-auth-1790932958b@example.com`, `qa-cart-1790933638@example.com`.
- **Contact messages mailed to the store owner (5):** 3 from the content unit (tag `qa-content-1790932380`, one with a 5000-char enquiry, one with a 300-char name); 2 from content-contact-newsletter (`qa-content-1790932917@example.com`).
- **Newsletter requests:** `qa-content-1790932380@example.com` (subscribe, duplicate, resubscribe, several unsubscribes), `-never`, `qa-content-1790932917@example.com`, `qa-content-1790932917-b@example.com`, `-c` variants, and one accidentally subscribed address `bad<60 a>@example.com` (unsubscribed). Double opt-in means entries should be unconfirmed, but their state is invisible.
- **Password-recovery email** triggered for the main auth account (undeliverable). No password was changed.

Cleaned up or reverted: auth addresses 38633/38634 deleted, browser logged out; cart/wishlist/compare back to 0/0/0, no orders; currency reset to USD, view mode reset to grid; sessions `qa-auth`, `qa-catalog`, `qa-search`, `qa-cart-compare-wishlist` closed (the content-contact-newsletter report did not state its session was closed). Local only: /tmp scratch files (see Gate 1 answers).

---

## Gate 1 answers (recorded 2026-10-02)

User reply: "all" — accept every recommendation above, including saving this SUMMARY.md.

1. Test accounts: `BEARSTORE_*` when set, else one fresh in-memory-password account per run. **Accepted.**
2. Server-error defects: single-request `@defect` tests, `test.fail()`, correct 4xx asserted, no loops. **Accepted.**
3. Side effects: validation cases always run; valid contact/newsletter/registration only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`. **Accepted.**
4. Correct areas.md: **Accepted** (done).
5. Visitor isolation: OQ-01 probe first; fresh context + unique User-Agent suffix per test meanwhile. **Accepted.**
6. Security findings as read-only `@security` tests; no fuzzing/load. **Accepted.**
7. `content-contact-newsletter` authoritative; `content` kept for unique records. **Accepted.**
8. Order/change-password/coupon/mail success paths stay out of scope. **Accepted.**
9. Stage 2 normalises `bodyFields`; /tmp scratch files deleted. **Accepted.**
