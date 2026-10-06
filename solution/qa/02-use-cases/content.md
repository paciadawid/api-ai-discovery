# AREA: CONTENT (content-contact-newsletter): UC-CONTENT-01 to UC-CONTENT-34

Meta line format: `Area | Type | Side-effect | Tags`. All requests are anonymous. `Side-effect: yes` UCs (UC-CONTENT-20, 24, 25) run only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1` and are tagged `@side-effect`. Every valid contact POST mails the store owner, so exactly one is sent per run. Fresh context and unique User-Agent per test. Test addresses: `qa-content-<runId>@example.com` (never a real mailbox).

Shorthands: `PAGES` = the six static pages `/aboutus` (title `Shop. About Us`), `/shippinginfo` (`Shop. Shipping & Returns`), `/paymentinfo` (`Shop. Payment info`), `/privacyinfo` (`Shop. Privacy policy`), `/conditionsofuse` (`Shop. Conditions of use`), `/disclaimer` (`Shop. Disclaimer`). `NL` = `POST /newsletter/subscribe`, urlencoded.

### UC-CONTENT-01: Static pages load
- Meta: content | happy path | Side-effect: no | @smoke
- Endpoints: EP-CONTENT-ABOUTUS, EP-CONTENT-SHIPPINGINFO, EP-CONTENT-PAYMENTINFO, EP-CONTENT-PRIVACYINFO, EP-CONTENT-CONDITIONSOFUSE, EP-CONTENT-DISCLAIMER
- Request: `GET` each path in `PAGES` (six separate requests, parameterised).
- Expected: 200; `Content-Type: text/html; charset=utf-8`; `<title>` equals the title listed for that page; `Set-Cookie: SMARTSTORE.VISITOR` on the first response. Assert on the title only (the `h1` is documented inconsistently for `/aboutus`).
- State/cleanup: none.
- Evidence: flows.md F1; endpoints.json EP-CONTENT-* records.

### UC-CONTENT-02: Contact form page loads
- Meta: content | happy path | Side-effect: no | @smoke
- Endpoints: EP-CONTENT-CONTACT-FORM
- Request: `GET /contactus`.
- Expected: 200; `<title>` `Shop. Contact Us`; `form.contact-form` with `action=/contactus`, `method=post`; inputs `FullName`, `Email`, `Enquiry`; submit button `send-email`; no `__RequestVerificationToken` input.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-CONTACT-FORM.

### UC-CONTENT-03: Hyphenated page slugs do not exist
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-ABOUTUS, EP-CONTENT-SHIPPINGINFO, EP-CONTENT-PAYMENTINFO, EP-CONTENT-PRIVACYINFO, EP-CONTENT-CONDITIONSOFUSE
- Request: `GET /about-us`, `/shipping-returns`, `/payment-info`, `/privacy`, `/conditions-of-use`.
- Expected: 404 each; `<title>` `Shop. 404`.
- State/cleanup: none.
- Evidence: SUMMARY.md "Discrepancies reconciled" item 1.

### UC-CONTENT-04: Unknown path returns the 404 page
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: none (generic: EP-CATALOG-NOTFOUND)
- Request: `GET /qa-no-such-page-<runId>`.
- Expected: 404; HTML with `<title>` `Shop. 404`.
- State/cleanup: none.
- Evidence: flows.md F1 ("Unknown path -> 404 HTML (title 'Shop. 404')").

### UC-CONTENT-05: The linked /blog page is 404
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-BLOG-PAGE
- Request: `GET /blog`, `maxRedirects: 0`; `GET /home` (read the footer) to confirm the link is present.
- Expected: `/blog` 404 with title `Shop. 404`; the footer still contains `a[href="/blog"]` (finding #20: broken link). The test documents the current behaviour; if the module is enabled later it must be updated.
- State/cleanup: none.
- Evidence: flows.md F2; SUMMARY.md section 4 #20.

### UC-CONTENT-06: Blog RSS feed is valid and empty
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-RSS-BLOG
- Request: `GET /blog/rss`.
- Expected: 200; `Content-Type` contains `application/rss+xml`; XML parses; root `rss` version 2.0 with one `channel` whose title contains `Blog`. The zero-item count is not asserted (data may change).
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-RSS-BLOG.

### UC-CONTENT-07: News RSS feed is valid
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-RSS-NEWS
- Request: `GET /news/rss/1`; `GET /news/rss`.
- Expected: 200 both; `Content-Type` contains `application/rss+xml`; XML parses; channel title contains `News`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-RSS-NEWS.

### UC-CONTENT-08: New-products RSS lists product links
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-RSS-NEWPRODUCTS
- Request: `GET /newproducts/rss`.
- Expected: 200; `application/rss+xml`; XML parses; channel title contains `Recently added products`; at least one `item` with a `link` or `guid` on the store host.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-RSS-NEWPRODUCTS.

### UC-CONTENT-09: Sitemap is well-formed XML
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-SITEMAP-XML
- Request: `GET /sitemap.xml`.
- Expected: 200; `Content-Type` contains `xml`; root element `urlset` with at least one `url/loc`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-SITEMAP-XML.

### UC-CONTENT-10: robots.txt is served and lists the sitemap
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-ROBOTS
- Request: `GET /robots.txt`.
- Expected: 200; `Content-Type` contains `text/plain`; contains `User-agent: *` and a `Sitemap:` line.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-ROBOTS.

### UC-CONTENT-11: Case and trailing-slash variants redirect to the canonical path
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-ABOUTUS, EP-CONTENT-CONTACT-FORM
- Request: `GET /AboutUs`, `/aboutus/`, `/contactus/`, `/CONTACTUS`, each with `maxRedirects: 0`.
- Expected: 301 each; `Location` path is `/aboutus` or `/contactus`.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-ABOUTUS failure; EP-CCN-PAGE-CONTACT-GET failure.

### UC-CONTENT-12: Canonical redirects keep https
- Meta: content | security | Side-effect: no | @security @known-issue (finding #19)
- Endpoints: EP-CONTENT-ABOUTUS
- Request: single `GET /AboutUs`, `maxRedirects: 0`.
- Expected (secure): `Location` begins `https://`. Observed: `http://`. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #19.

### UC-CONTENT-13: Plain http requests are redirected to https
- Meta: content | security | Side-effect: no | @security
- Endpoints: EP-CONTENT-ABOUTUS
- Request: single `GET http://bearstore-testsite.smartbear.com/aboutus`, `maxRedirects: 0`.
- Expected: 301; `Location` begins `https://`. If the environment blocks plain http, skip with a message.
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-ABOUTUS failure ("http:// 301 to https://").

### UC-CONTENT-14: Responses do not disclose server and framework versions
- Meta: content | security | Side-effect: no | @security @known-issue (finding #13)
- Endpoints: EP-CONTENT-ABOUTUS
- Request: single `GET /aboutus`; inspect headers.
- Expected (secure): none of `X-AspNetMvc-Version`, `X-AspNet-Version`, `X-Powered-By` is present and `Server` has no version number. Observed: `Microsoft-IIS/10.0`, `5.2`, `4.0.30319`, `ASP.NET`. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #13; flows.md F1.

### UC-CONTENT-15: Responses carry the standard browser security headers
- Meta: content | security | Side-effect: no | @security @known-issue (finding #13)
- Endpoints: EP-CONTENT-ABOUTUS
- Request: single `GET /aboutus` (headers shared with all pages).
- Expected (secure): `Strict-Transport-Security`, `Content-Security-Policy` and `X-Frame-Options` (or CSP `frame-ancestors`) are present. Observed: none present. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #13; flows.md F1.

### UC-CONTENT-16: Contact form with all fields empty
- Meta: content | validation/negative | Side-effect: no | @smoke
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: `POST /contactus` urlencoded `FullName=&Email=&Enquiry=`.
- Expected: 200 `text/html`; `div.validation-summary-errors` contains `'Your email' should not be empty.` and `'Enquiry' should not be empty.`; no `alert-success`; the form is re-rendered (`form.contact-form` present).
- State/cleanup: none; nothing is sent.
- Evidence: flows.md FLOW-CONTENT-01.

### UC-CONTENT-17: Contact form with a malformed email
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: `POST /contactus` `FullName=&Email=notanemail&Enquiry=hello`.
- Expected: 200; error `'Your email' is not a valid email address.`; no `alert-success`.
- State/cleanup: none.
- Evidence: flows.md F3.

### UC-CONTENT-18: Contact form with a whitespace-only enquiry
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: `POST /contactus` `Email=qa-content-<runId>@example.com&Enquiry=%20%20%20`.
- Expected: 200; error `'Enquiry' should not be empty.`; no `alert-success`.
- State/cleanup: none.
- Evidence: flows.md F3, FLOW-CONTENT-01.

### UC-CONTENT-19: Contact form with a missing email only
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: `POST /contactus` `FullName=QA&Email=&Enquiry=hello`.
- Expected: 200; error `'Your email' should not be empty.`; the `'Enquiry'` error is absent; no `alert-success`.
- State/cleanup: none.
- Evidence: flows.md F3.

### UC-CONTENT-20: Valid contact enquiry is accepted
- Meta: content | happy path | Side-effect: yes | @side-effect @smoke
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: `POST /contactus` `FullName=QA Content Bot&Email=qa-content-<runId>@example.com&Enquiry=qa-content-<runId> automated test, please ignore&send-email=`.
- Expected: 200 (no redirect); `div.alert.alert-success` text `Your enquiry has been successfully sent to the store owner.`; `form.contact-form` absent. Run once per suite.
- State/cleanup: cannot be undone (the store owner receives mail). Gated by `BEARSTORE_ALLOW_SIDE_EFFECTS=1`.
- Evidence: flows.md F3; SUMMARY.md section 7.

### UC-CONTENT-21: Angle bracket in the contact name does not cause a server error
- Meta: content | defect | Side-effect: no | @defect (defect #8)
- Endpoints: EP-CONTENT-CONTACT-SEND
- Request: single `POST /contactus` with `FullName=a<b` (URL-encoded), `Email=notanemail`, `Enquiry=x`. The invalid email guarantees that nothing is mailed even if the server accepts the name.
- Expected (correct): status below 500; 200 with a validation message, or a 400. Observed: 500 (request validation). `test.fail()`. Re-probe condition: CONF-01 (curl-only evidence).
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #8; flows.md FLOW-CONTENT-01.

### UC-CONTENT-22: Newsletter rejects a malformed email
- Meta: content | validation/negative | Side-effect: no | @smoke
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: `NL` `subscribe=true&email=notanemail&GdprConsent=`; `NL` `subscribe=false&email=notanemail&GdprConsent=true`.
- Expected: 200 `application/json`; `Success` false; `Result` `Enter valid email`.
- State/cleanup: none; no mail is triggered.
- Evidence: flows.md F4; endpoints.json EP-CONTENT-NEWSLETTER-SUBSCRIBE failure.

### UC-CONTENT-23: Newsletter rejects an empty or missing email
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: `NL` `subscribe=true&email=&GdprConsent=`; `NL` `subscribe=true` (no email field).
- Expected: 200 JSON `Success` false, `Result` `Enter valid email`, both.
- State/cleanup: none.
- Evidence: flows.md F4 ("empty, missing, or malformed email").

### UC-CONTENT-24: Subscribe and unsubscribe a test address
- Meta: content | state/persistence | Side-effect: yes | @side-effect
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: 1. `NL` `subscribe=true&email=qa-content-<runId>@example.com&GdprConsent=`. 2. `NL` `subscribe=false&email=<same>&GdprConsent=true`.
- Expected: step 1 200 JSON `Success` true, `Result` `Thank you for signing up! A verification email has been sent. We appreciate your interest.`; step 2 200 JSON `Success` true, `Result` `A verification email has been sent. Thank you!` (double opt-in: the final state is invisible and not asserted).
- State/cleanup: the unsubscribe request is the reverse transition and is always sent, even if step 1 fails its assertion (`finally`).
- Evidence: flows.md F4, FLOW-CONTENT-02.

### UC-CONTENT-25: Unsubscribing an address that never subscribed gives the same answer
- Meta: content | security | Side-effect: yes | @security @side-effect
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: `NL` `subscribe=false&email=qa-content-never-<runId>@example.com&GdprConsent=true`.
- Expected: 200 JSON `Success` true, `Result` `A verification email has been sent. Thank you!`, identical to the unsubscribe result of a subscribed address (no account enumeration; guards a good property).
- State/cleanup: none to undo; mail is sent to an `example.com` address.
- Evidence: flows.md F4; endpoints.json EP-CONTENT-NEWSLETTER-SUBSCRIBE ("no account enumeration").

### UC-CONTENT-26: Newsletter without a subscribe flag returns a client error
- Meta: content | defect | Side-effect: no | @defect (defect #1)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `POST /newsletter/subscribe` urlencoded `email=qa-content-<runId>@example.com`.
- Expected (correct): 4xx, or 200 JSON `Success` false. Never 5xx. Observed: 502 Bad Gateway (ELB; assert on the status only). `test.fail()`.
- State/cleanup: none expected (a fix that defaults to subscribe would send mail to an `example.com` address; accepted risk).
- Evidence: SUMMARY.md section 4 #1.

### UC-CONTENT-27: Newsletter with an empty subscribe flag returns a client error
- Meta: content | defect | Side-effect: no | @defect (defect #1)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `NL` `subscribe=&email=qa-content-<runId>@example.com`.
- Expected (correct): 4xx or 200 `Success` false; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #1; flows.md F4.

### UC-CONTENT-28: Newsletter with a non-boolean subscribe flag returns a client error
- Meta: content | defect | Side-effect: no | @defect (defect #1)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `NL` `subscribe=banana&email=qa-content-<runId>@example.com`.
- Expected (correct): 4xx or 200 `Success` false; never 5xx. Observed: 502. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #1; flows.md F4.

### UC-CONTENT-29: Newsletter with a 250+ character email returns a client error
- Meta: content | defect | Side-effect: no | @defect (defect #1)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `NL` `subscribe=false&email=<250 x a>@example.com`. `subscribe=false` is used so that, if it were accepted, it would be an unsubscribe request, not a subscription.
- Expected (correct): 200 JSON `Success` false (`Enter valid email`) or a 4xx; never 5xx. Observed: 502. `test.fail()`. The 100-character email boundary that works is not exercised (it would send mail).
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #1; flows.md F4.

### UC-CONTENT-30: Angle bracket in the newsletter email does not cause a server error
- Meta: content | defect | Side-effect: no | @defect (defect #8)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `NL` `subscribe=true&email=a<b@example.com` (URL-encoded).
- Expected (correct): status below 500; 200 JSON `Success` false or a 400. Observed: 500 (request validation). `test.fail()`. Marked for re-probe (CONF-01; the evidence is curl-only).
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-NEWSLETTER-SUBSCRIBE failure; SUMMARY.md section 4 #8.

### UC-CONTENT-31: Newsletter subscribe is POST only
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: `GET /newsletter/subscribe?subscribe=true&email=qa-content-<runId>@example.com`.
- Expected: 404; no mail is triggered.
- State/cleanup: none.
- Evidence: flows.md F4 ("GET -> 404").

### UC-CONTENT-32: Newsletter accepts a JSON body and validates it
- Meta: content | validation/negative | Side-effect: no | (none)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: `POST /newsletter/subscribe` with `Content-Type: application/json`, body `{"subscribe":true,"email":"bad"}`.
- Expected: 200 JSON `Success` false, `Result` `Enter valid email` (parsed, not a 502).
- State/cleanup: none.
- Evidence: flows.md F4 ("JSON body ... is parsed").

### UC-CONTENT-33: Newsletter JSON does not leak .NET type names
- Meta: content | security | Side-effect: no | @security @known-issue (finding #18)
- Endpoints: EP-CONTENT-NEWSLETTER-SUBSCRIBE
- Request: single `NL` `subscribe=true&email=notanemail`.
- Expected (secure): the JSON has only `Success` and `Result`; no `$type` key. Observed: `$type` such as `<>f__AnonymousType24`2[...], SmartStore.Web`. `test.fail()`. (The `$type` leak is visible on failure responses, so no mail is triggered.)
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #18; endpoints.json EP-CONTENT-NEWSLETTER-SUBSCRIBE.

### UC-CONTENT-34: Password recovery confirm form renders without a token
- Meta: content | happy path | Side-effect: no | (none)
- Endpoints: EP-CONTENT-PWRECOVERY-CONFIRM
- Request: `GET /customer/passwordrecoveryconfirm`; `GET /customer/passwordrecoveryconfirm?token=<random guid>&email=nobody-<runId>%40example.com`.
- Expected: 200 each; the page contains the labels `New password` and `Confirm password`. The second request shows no visible error text at GET time; that is the observed behaviour and is not asserted. The POST is never sent (unverified, OQ-16).
- State/cleanup: none.
- Evidence: endpoints.json EP-CONTENT-PWRECOVERY-CONFIRM (curl-only, `verified: false`).
