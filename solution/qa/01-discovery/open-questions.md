# Open questions (consolidated, deduplicated)

Merged from the `notes.md` of every area folder. Each row is tagged with the area(s) that raised it and who or what could answer it. "Human" means the review-gate reader; "dev/ops" means whoever runs the SmartStore host. Rows marked [merged] combine the same question raised by more than one area. The row tagged [consolidator] is a hypothesis linking several observations; it is not a claim from any area file.

## Cross-cutting

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-01 | catalog, cart-compare-wishlist, auth, content [merged] [consolidator] | Why did a cart lose its item once when `SMARTSTORE.VISITOR` changed (51cb... to cd48...) and once when a line id changed with no delete, and why did the auth browser show "1 Shopping Basket" right after registering from an empty browser? Catalog and content found that cookieless requests from the same IP and User-Agent are handed the same visitor GUID. Hypothesis (not verified): parallel browsers and tests from one machine share one guest customer, so carts bleed between agents. | A controlled probe: two cookie-less contexts with identical and with different User-Agent, add to cart in one, read `/shoppingcart/cartsummary` in the other. Human to approve; no host knowledge needed. |
| OQ-02 | auth, cart-compare-wishlist | Test-account strategy: `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` are not set and `tests/support/auth.ts` does not exist. The three throwaway accounts have unsaved passwords and are not reusable. Register a fresh account per run, or will the human supply credentials? | Human (Decision 1 in SUMMARY.md). |
| OQ-03 | all | Why do malformed inputs yield 502 from the load balancer (app crash and connection reset, or an ELB/WAF rule)? Affects whether the tests can rely on a stable 502 status. | dev/ops of the host (not investigated to avoid harming the shared host). |
| OQ-04 | catalog, search, content [merged] | Is there rate limiting on search, instant search, contact, newsletter, login? None of the areas probed it (shared host). | Human decision whether limited probing is allowed; dev/ops for configuration. |
| OQ-05 | search, catalog [merged] | Is the dataset stable? Counts observed: 38 hits for `er`, 2 for `watch`, 58 products in What's New, 49 products reachable by category. Is the demo data reset or edited periodically? | dev/ops; or compare counts across Stage 2 runs. |

## auth

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-10 | auth | What does a successful `POST /customer/changepassword` return, and does it re-issue `SMARTSTORE.AUTH`? Not exercised (password changes excluded). | A fresh throwaway account created by the test run (needs Decision 1 and permission to change a throwaway password). |
| OQ-11 | auth | Is the 30-day persistent `SMARTSTORE.AUTH` cookie after registration (always persistent, independent of RememberMe) intentional? | SmartStore/product owner. |
| OQ-12 | auth | Order history row format and `/customer/orderdetails/{id}`: not observed (no orders; ordering excluded). | An account with history (human-supplied `BEARSTORE_EMAIL`), or accept as out of scope. |
| OQ-13 | auth | Date-of-birth fields, newsletter checkbox on `/customer/info`, and the US `StateProvinceId` dependency were not exercised. | Stage 2 probing with a throwaway account. |
| OQ-14 | auth | Lockout or throttling after repeated failed logins was not probed (few requests on the shared host). | Human decision (see OQ-04). |
| OQ-15 | auth | Is `/customer/backinstocksubscriptions` answering 200 anonymously intentional (all other `/customer/*` pages redirect to login)? | SmartStore/product owner. |
| OQ-16 | auth, content [merged] | Is the password-recovery token flow testable (`/passwordrecovery/confirm?token=&email=` per auth, `/customer/passwordrecoveryconfirm` per content)? Which route is real, what does the confirm POST return, and what do error messages look like? The mailbox of an example.com address is not accessible. Known-email success text ("Email with instructions has been sent to you.") IS observed by auth; content's "not observed" is superseded. | A mailbox the tests can read (human), or leave out of scope. |

## catalog

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-20 | catalog | At default page size 24 no category pages (max 13 items). Natural paging can only be tested with small `s`. Is that acceptable? | Human; Stage 2 uses `s=3`. |
| OQ-21 | catalog, search [merged] | Meaning of delivery filter `d` (1 ready to ship, 2 "2-5 woking days", 3 "7 working days") in terms of product data, and of `a=True` (no visible difference vs default in books and in search). Needs an out-of-stock product to prove. | dev/ops or product data; or a product flagged out of stock. |
| OQ-22 | catalog, search [merged] | `o=15` (Newest) returns the same order as default; is there any dataset where it differs? | Product data owner. |
| OQ-23 | catalog | Does `POST /product/reviews/{id}` need login? Not exercised (state owned elsewhere; would create reviews on a shared host). | Human decision; test with a throwaway account. |
| OQ-24 | catalog | Product 24 shows schema availability InStock but text "Product is not available"; the Attrs partial (SKU/EAN/weight) is empty. Which is authoritative? | Product data owner. |
| OQ-25 | catalog | `GET /product/askquestionajax/{id}` returns 200 JSON redirect even for unknown ids (99999). Intended? | SmartStore/product owner. |

## search

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-30 | search | What does search match beyond name and short description (full description, SKU, manufacturer, tags)? `bear` matches nothing, `watch` hit Tissot via description. | Systematic probing in Stage 2. |
| OQ-31 | search | Category id to name mapping for `c=` (3,4,5,7,8,10..16,22,23,24): not captured; `c=12` appears to be Basketball. | Read the facet markup of a result page. |
| OQ-32 | search | Rating filter: `r=5` returned 1 hit although the UI offers 1..4, and `r=0..3` all gave 37 of 38; do unrated products count? | Product data owner. |
| OQ-33 | search | Is `p` interpreted in the active currency, and what does a negative lower bound (`p=-5~10`, 1 hit) mean? Not tested (currency switch writes visitor state owned by catalog). | Stage 2 with isolated context. |
| OQ-34 | search | Is the query case-folded only for ASCII? `WATCH` works, `%C3%9Cberman` and `%C3%BCberman` both hit, `uberman` misses. | Stage 2 probing. |

## cart-compare-wishlist

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-40 | cart-compare-wishlist | Valid coupon and gift card codes are unknown, so the discount success path and totals with discount are unobserved. | Human or store owner supplies codes. |
| OQ-41 | cart-compare-wishlist | Shipping and tax stayed $0.00 for US/CA/DE estimates; are there any non-zero rules? | Store configuration owner. |
| OQ-42 | cart-compare-wishlist | `sciItemId` is a global sequence (168025...) shared across customers, so ids are not predictable per session. Confirmed only by observation. | Tests must read ids back from `/cart`. |
| OQ-43 | cart-compare-wishlist | Is `X-Requested-With` required by the AJAX endpoints? All curl calls sent it. | Stage 2 probing. |
| OQ-44 | cart-compare-wishlist | Valid `POST /checkout/billingaddress`, shipping method and payment selection, and `POST /checkout/confirm` were not exercised (order creation forbidden). | Human decision; recommended to stay excluded. |
| OQ-45 | cart-compare-wishlist | `POST /shoppingcart/emailwishlist` (sends email) not exercised. | Human decision. |
| OQ-46 | cart-compare-wishlist | Variant/attribute products, bundles, gift cards (recipient fields) and minimum order quantity were not explored. Gift card flows that email are excluded by areas.md. | Stage 2 selective probing. |
| OQ-47 | cart-compare-wishlist | Effect of `changecurrency` on cart contents and totals not explored. | Stage 2 with isolated context. |
| OQ-48 | cart-compare-wishlist | `/wishlist/{x}` with a non-guid string renders the caller's own wishlist (200) while an unknown all-zero guid redirects to `/`. Intended? | SmartStore/product owner. |

## content-contact-newsletter

| id | area | question | who / what could answer |
|---|---|---|---|
| OQ-50 | content-contact-newsletter | Real route and parameter names of newsletter activation (`/newsletter/subscriptionactivation`): bare GET gives 502; `/{guid}/true` and `?token=&active=` give 404. The final state of the test entries (pending or inactive) cannot be seen. | A mailbox or admin access (not available), or SmartStore source. |
| OQ-51 | content-contact-newsletter | Does an unsubscribe request for an unconfirmed address create any record? Same "verification email has been sent" reply for never-subscribed addresses. | Admin access; unknown. |
| OQ-52 | content-contact-newsletter | Is the newsletter 502 for long emails a length limit or a crash? Threshold lies between 100 chars (works) and about 250 chars (502). | Bisect in Stage 2 (a handful of requests) or dev/ops. |
| OQ-53 | content-contact-newsletter | Max length of contact FullName/Enquiry: 5000-char enquiry and 300-char name were accepted; larger sizes untried. | Stage 2 probing, with care: each valid POST mails the store owner. |
| OQ-54 | content-contact-newsletter | Blog detail URL pattern unknown; `/blog` is 404 but `/blog/rss` exists and robots.txt lists `/blog/tag/` and `/blog/month/`. Is the blog module disabled by configuration? | SmartStore/product owner. |
| OQ-55 | content-contact-newsletter | Does `GdprConsent` change behaviour? No GDPR checkbox exists in the footer HTML; the JS sends it empty on subscribe and `true` on unsubscribe. | Stage 2 probing. |
| OQ-56 | content-contact-newsletter | Conflict CONF-01: is `<` in the newsletter email a 500 (content, curl) or accepted (content-contact-newsletter notes, address written `bad<60 a>@example.com`)? | Re-probe once in Stage 2. |
| OQ-57 | content-contact-newsletter | Unit `content` ran without a browser (curl only). Its unique endpoints (recovery confirm, RSS feeds, sitemap, robots, activation) have no browser confirmation. | Accept as curl-verified, or re-run a short headed pass. |
