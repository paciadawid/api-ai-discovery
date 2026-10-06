# Flows: content

Base: `B=https://bearstore-testsite.smartbear.com`. Jar: `/tmp/qa-content.jar`. All replays use curl without redirect following. Test address pattern: `qa-content-<ts>@example.com`.

## FLOW-CONTENT-01 Contact form

Preconditions: none (anonymous, no antiforgery token, no captcha).
Endpoints: EP-CONTENT-CONTACT-FORM, EP-CONTENT-CONTACT-SEND.

Observed:
- Empty POST: 200 HTML with `validation-summary-errors` listing `'Your email' should not be empty.` and `'Enquiry' should not be empty.`.
- Email `notanemail`: 200, `'Your email' is not a valid email address.`.
- Whitespace-only Enquiry: 200, `'Enquiry' should not be empty.`.
- Valid: 200 HTML with `alert-success` "Your enquiry has been successfully sent to the store owner." (no redirect, form gone).
- 5000-char Enquiry and 300-char FullName: both accepted (no length limit observed).
- `<` or `>` in any field: 500 (ASP.NET request validation).
- Success needs no `send-email` field.

```
curl -i -X POST $B/contactus --data "FullName=&Email=&Enquiry="
curl -i -X POST $B/contactus --data "Email=notanemail&Enquiry=x"
curl -i -X POST $B/contactus --data-urlencode "FullName=qa-content-<ts>" --data-urlencode "Email=qa-content-<ts>@example.com" --data-urlencode "Enquiry=qa-content-<ts> test"
curl -i -X POST $B/contactus --data-urlencode "FullName=a<b" --data-urlencode "Email=qa-content-x@example.com" --data-urlencode "Enquiry=x"   # 500
```

## FLOW-CONTENT-02 Newsletter subscribe / unsubscribe (footer AJAX)

Found in `/Scripts/public.common.js` (footer click handler on `#newsletter-subscribe-button`) and the `data-subscription-url="/newsletter/subscribe"` attribute. No network capture in a browser was done (see notes).
Endpoint: EP-CONTENT-NEWSLETTER-SUBSCRIBE. Double opt-in: the JSON says a verification email was sent; activation happens only through the emailed link.

```
curl -i -X POST $B/newsletter/subscribe --data-urlencode "subscribe=true" --data-urlencode "email=qa-content-<ts>@example.com" --data-urlencode "GdprConsent="
  -> 200 application/json {"Success":true,"Result":"Thank you for signing up! A verification email has been sent. We appreciate your interest."}
curl -i -X POST $B/newsletter/subscribe --data-urlencode "subscribe=false" --data-urlencode "email=qa-content-<ts>@example.com" --data-urlencode "GdprConsent=true"
  -> 200 {"Success":true,"Result":"A verification email has been sent. Thank you!"}
curl -i -X POST $B/newsletter/subscribe --data "subscribe=true&email=notanemail"
  -> 200 {"Success":false,"Result":"Enter valid email"}
curl -i -X POST $B/newsletter/subscribe --data "email=a@example.com"      # 502 (missing subscribe)
curl -i $B/newsletter/subscribe                                          # 404 (POST only)
```

Duplicate subscribe, repeated unsubscribe, and unsubscribe of an address that never subscribed all return the same Success response as the first call.

## FLOW-CONTENT-03 Password recovery

Real path: `/customer/passwordrecovery` (linked from `/login`), not `/passwordrecovery`.
Endpoints: EP-CONTENT-PWRECOVERY-FORM, EP-CONTENT-PWRECOVERY-SEND, EP-CONTENT-PWRECOVERY-CONFIRM.

```
curl -i $B/customer/passwordrecovery
curl -i -X POST $B/customer/passwordrecovery --data "Email=qa-content-<ts>-nouser%40example.com&send-email=Submit"
  -> 200, <div class="alert alert-danger">Email not found.</div>
curl -i -X POST $B/customer/passwordrecovery --data "Email=bad&send-email=Submit"   # field-validation-error, invalid address
curl -i -X POST $B/customer/passwordrecovery --data "Email=a%40example.com"          # no send-email: form re-rendered, no message
```

The success path (existing account) was not exercised, to avoid emailing a real user.

## FLOW-CONTENT-04 Static content pages

`/aboutus`, `/shippinginfo`, `/paymentinfo`, `/privacyinfo`, `/conditionsofuse`, `/disclaimer`: all 200 `text/html; charset=utf-8`, `cache-control: private`, server headers `Microsoft-IIS/10.0`, `x-aspnetmvc-version: 5.2`, `x-aspnet-version`, `x-powered-by: ASP.NET`; `Set-Cookie: SMARTSTORE.VISITOR` on every response. Titles are `Shop. <Name>` (About Us, Shipping & Returns, Payment info, Privacy policy, Conditions of use, Disclaimer). Case/trailing slash: `/AboutUs` and `/aboutus/` return 301 to `http://.../aboutus` (http scheme). `http://` requests 301 to https.

`/blog` (footer link) is 404; there is no news or blog page, only empty RSS feeds.

```
for p in aboutus shippinginfo paymentinfo privacyinfo conditionsofuse disclaimer blog; do curl -s -o /dev/null -w "$p %{http_code}\n" $B/$p; done
```

## FLOW-CONTENT-05 Feeds and crawler files

`/news/rss/1` (and `/news/rss`): 200 RSS, no items. `/blog/rss`: 200 RSS, no items. `/newproducts/rss`: 200 RSS with items. `/sitemap.xml`: 200 text/xml. `/robots.txt`: 200 text/plain.

```
curl -i $B/news/rss/1 ; curl -i $B/blog/rss ; curl -i $B/newproducts/rss ; curl -i $B/sitemap.xml ; curl -i $B/robots.txt
```
