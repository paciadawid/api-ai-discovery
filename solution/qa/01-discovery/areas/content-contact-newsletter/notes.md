# Notes: content-contact-newsletter

## Browser evidence
`npx playwright-cli list` right after open:
```
- qa-content-contact-newsletter:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```

## Auth observations
No login used (BEARSTORE_EMAIL/PASSWORD not set). All endpoints are anonymous. Only cookie: SMARTSTORE.VISITOR (secure; HttpOnly; SameSite=Lax; 1 year), re-issued on every response. No antiforgery token on contact or newsletter.

## Surprises
- Real slugs differ from areas.md: /shippinginfo, /paymentinfo, /aboutus, /privacyinfo, /conditionsofuse. Hyphenated slugs 404.
- /blog is 404 although linked from header menu and footer; /blog/rss exists but has no items.
- Contact form success is a 200 re-render, no redirect (re-submitting via refresh would resend).
- Newsletter endpoint returns 502 (not a handled 4xx) for missing/non-boolean `subscribe` and very long email; likely unhandled server exception behind a proxy.
- Newsletter responses leak .NET type name in `$type`.
- Same success message for unsubscribing an email that was never subscribed.
- 301 from /contactus/ redirects to http:// (scheme downgrade).
- Version-disclosure headers (IIS 10, ASP.NET MVC 5.2); no security headers seen.

## Open questions
- Does subscription need email verification (messages say "verification email has been sent")? The final state of the test entries (pending/inactive) cannot be seen without a mailbox or admin access.
- Is the 502 for long emails a length limit or a crash? Exact threshold between 100 and 250 chars not determined.
- Is there a rate limit on contact/newsletter? Not tested (kept submissions minimal).
- Blog detail URL pattern unknown (no posts). Max length of Enquiry/FullName not tested.
- Whether GdprConsent changes behavior is unknown (value not enforced in tests).

## State changed
- Contact messages sent to the store owner: 2 (qa-content-1790932917@example.com, "QA Content Bot"). Cannot be undone.
- Newsletter: subscribed then unsubscribed (each got "verification email sent" reply, which is the same reply as subscribe flow): qa-content-1790932917@example.com, qa-content-1790932917-b@example.com, bad<60 a>@example.com (accidentally subscribed during a length probe, unsubscribed immediately). Unsub requests returned Success true, but I cannot confirm entries are actually removed; they may remain as unverified/inactive records. Also qa-content-1790932917-never@example.com and -c variants were only submitted as unsubscribe/failed requests.
