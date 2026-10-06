# Notes: content

## Method limitation (important)
This discoverer session had no browser tool (only Bash/Read/Write). The requirement of a headed browser and `browser_network_requests` could not be met. Everything was found with curl, plus reading the served HTML and `/Scripts/public.common.js` (which holds the newsletter AJAX code). The newsletter request shape (POST `/newsletter/subscribe`, fields `subscribe`, `email`, `GdprConsent`) comes from that JS and was then confirmed by curl. A browser run could still be done to double check, but nothing observed contradicts the curl results.

## Auth observations
No login needed for anything in this area. No antiforgery tokens on contact, newsletter or password-recovery forms. No captcha anywhere.

## Surprises
- Contact: no length limits (5000-char enquiry accepted), no captcha, no antiforgery, no rate limiting seen in a handful of requests. Success is a 200 page, not a redirect.
- Contact, newsletter and other fields containing `<` give 500 (ASP.NET dangerous request value). Not handled as a validation error.
- Newsletter POST without the `subscribe` field (or with empty body) returns 502 from the load balancer (`awselb/2.0`), meaning an unhandled backend failure.
- `/newsletter/subscriptionactivation` with no token returns 502; with a guid path it is 404.
- Newsletter JSON leaks the .NET type name (`$type: "<>f__AnonymousType24`2[...]"`).
- Newsletter responses do not reveal whether an address is already subscribed (good), but password recovery does (`Email not found.`).
- Password recovery POST silently does nothing without the `send-email` field.
- Footer link `/blog` is a 404 on every page. Blog and news HTML pages do not exist; their RSS feeds do (empty).
- `/AboutUs` and `/aboutus/` redirect to an `http://` URL (scheme downgrade; the next hop redirects to https).
- `SMARTSTORE.VISITOR` is re-sent in every response (sliding expiry), and an anonymous client without a cookie received the same GUID on repeated fresh requests in this session (b2ef..., from the same IP/UA), so it may be derived from client data rather than random.
- Static pages return no cache headers beyond `cache-control: private` and expose server version headers.

## Open questions
- Does a browser-captured request differ (extra headers, GdprConsent behaviour)? No GDPR checkbox appears in the footer HTML, so `GdprConsent` is sent empty/undefined by the JS.
- Real route for newsletter activation (token/active parameter names), could not be determined without the email.
- Is there any length limit on contact fields at larger sizes (not tried beyond 5000 chars)?
- `/customer/passwordrecoveryconfirm` POST behaviour and error messages (needs a real token).
- Success response of password recovery for an existing account (not probed on purpose).
- Whether the `Success:true` unsubscribe on an unconfirmed address creates any record.

## State changed
- Contact form: 3 submissions were accepted (messages emailed to the store owner), identifiable by `qa-content-1790932380` in FullName/Enquiry/Email (valid one, 5000-char enquiry `...-long`, 300-char name). Cannot be removed.
- Newsletter: address `qa-content-1790932380@example.com` was sent subscribe, duplicate subscribe, resubscribe, and several unsubscribe requests. Since the flow is double opt-in and no link was clicked, it should not be active; the last request for it was an unsubscribe. A possible leftover is an unconfirmed subscription record, not removable by us. `qa-content-1790932380-never@example.com` received one unsubscribe request.
- Password recovery: probes used only nonexistent `qa-content-...-nouser@example.com`, invalid and empty values. No emails expected.
- Other probes: `qa-content-ws@example.com` (whitespace enquiry, rejected), and a few `qa-content-x@example.com` rejected requests. Nothing created.
