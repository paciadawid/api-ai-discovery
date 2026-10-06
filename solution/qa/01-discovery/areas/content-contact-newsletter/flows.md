# Flows: content-contact-newsletter

Base: https://bearstore-testsite.smartbear.com. All anonymous. No CSRF token or captcha on any form. Cookie jar for replays: /tmp/qa-content-contact-newsletter.jar.
Real hrefs (from footer): /contactus, /blog, /shippinginfo, /paymentinfo, /aboutus, /disclaimer, /privacyinfo, /conditionsofuse. The inferred slugs /shipping-returns, /payment-info, /about-us, /privacy, /conditions-of-use all return 404.

## F1 Static pages
Browser: opened home, read footer hrefs, opened /blog and /contactus.
Replay:
    for u in contactus shippinginfo paymentinfo aboutus disclaimer privacyinfo conditionsofuse; do curl -s -o /dev/null -w "$u %{http_code}\n" https://bearstore-testsite.smartbear.com/$u; done
Result: all 200 text/html; charset=utf-8, ~33.7-35.6 KB, h1 matches label. Set-Cookie SMARTSTORE.VISITOR on first hit. /contactus/ and /CONTACTUS -> 301 to http://bearstore-testsite.smartbear.com/contactus. Unknown path -> 404 HTML (title "Shop. 404"). POST /aboutus (with empty body) -> 200; PUT /contactus -> 411 (no content-length, not meaningful).
Response headers: Server Microsoft-IIS/10.0, X-AspNetMvc-Version 5.2, X-AspNet-Version 4.0.30319, X-Powered-By ASP.NET, Cache-Control private. No HSTS/CSP/X-Frame-Options observed.

## F2 Blog
Browser: GET /blog -> 404 page. curl: /blog 404, /blog/ 301, /blogs 404, /blog/rss 200 application/rss+xml with an empty channel (no items).
    curl -i https://bearstore-testsite.smartbear.com/blog
    curl -i https://bearstore-testsite.smartbear.com/blog/rss
No blog list or detail page exists in this deployment. Detail URL pattern unknown.

## F3 Contact form
Browser: /contactus, submitted empty (client-side validation blocked, no request), then valid. Valid request captured:
    POST /contactus  Content-Type: application/x-www-form-urlencoded
    FullName=QA+Content+Bot&Email=qa-content-<ts>%40example.com&Enquiry=...&send-email=
Response: 200 text/html (no redirect), contains `<div class="alert alert-success">Your enquiry has been successfully sent to the store owner.</div>`.
Server-side validation (curl, no client JS): 200 with `validation-summary-errors` and per-field `field-validation-error` spans:
- Email empty: 'Your email' should not be empty.
- Email malformed: 'Your email' is not a valid email address.
- Enquiry empty or whitespace: 'Enquiry' should not be empty.
- FullName optional.
Replays:
    curl -i -c /tmp/qa-content-contact-newsletter.jar --data-urlencode "FullName=QA" --data-urlencode "Email=qa-content-1@example.com" --data-urlencode "Enquiry=ignore" -d "send-email=" https://bearstore-testsite.smartbear.com/contactus
    curl -i -d "FullName=&Email=notanemail&Enquiry=hello" https://bearstore-testsite.smartbear.com/contactus
Valid replay returned the success text (verified). Total real messages sent: 2 (1 browser, 1 curl).

## F4 Newsletter subscribe / unsubscribe
Footer block is NOT a <form>; JS reads #newsletter-email (name NewsletterEmail) and radios optionsRadios (newsletter-subscribe | newsletter-unsubscribe), then does an XHR (data-subscription-url="/newsletter/subscribe"):
    POST /newsletter/subscribe  X-Requested-With: XMLHttpRequest  Content-Type: application/x-www-form-urlencoded; charset=UTF-8
    subscribe=true&email=<addr>&GdprConsent=            (UI subscribe)
    subscribe=false&email=<addr>&GdprConsent=true       (UI unsubscribe)
Response 200 application/json; charset=utf-8:
    {"$type":"<>f__AnonymousType24`2[[System.Boolean, mscorlib],[System.String, mscorlib]], SmartStore.Web","Success":true,"Result":"Thank you for signing up! A verification email has been sent. We appreciate your interest."}
Unsubscribe: Success true, Result "A verification email has been sent. Thank you!" (identical for emails never subscribed, so no enumeration signal). Duplicate subscribe: same success message.
Failures (HTTP 200): {"Success":false,"Result":"Enter valid email"} for empty, missing, or malformed email.
Failures (HTTP 502 Bad Gateway, text/html, tiny nginx-style page): subscribe missing, subscribe= empty, subscribe=banana, or email ~250+ chars. subscribe=True (capitalised) works. A 100-char email works. GET /newsletter/subscribe -> 404. X-Requested-With header not required. JSON body {"subscribe":true,"email":"bad"} is parsed (validation response, not 502).
Replays:
    curl -i -d "subscribe=true&email=qa-content-1@example.com&GdprConsent=" https://bearstore-testsite.smartbear.com/newsletter/subscribe
    curl -i -d "subscribe=false&email=qa-content-1@example.com&GdprConsent=true" https://bearstore-testsite.smartbear.com/newsletter/subscribe
    curl -i -d "subscribe=true&email=bad" https://bearstore-testsite.smartbear.com/newsletter/subscribe
    curl -i -d "email=a@example.com" https://bearstore-testsite.smartbear.com/newsletter/subscribe   # 502
UI note: after a successful subscribe the footer block is replaced; reload the page before using it again (stale snapshot refs).
