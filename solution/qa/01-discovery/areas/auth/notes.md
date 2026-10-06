# Auth notes

## Browser evidence
`npx playwright-cli list` right after open (and again at end of run):
```
- qa-auth:
  - status: open
  - browser-type: chrome
  - user-data-dir: <in-memory>
  - headed: true
```
Flows driven in the browser: invalid login, register validation (client-side) and valid register, profile update, address add, orders, addresses, password recovery. Everything else was derived from those and replayed/extended with curl (jar /tmp/qa-auth.jar and scratch jars in /tmp).

## Auth observations
- Cookies: anonymous `SMARTSTORE.VISITOR` (secure, HttpOnly, +1y). After login/register `SMARTSTORE.AUTH` (HttpOnly, SameSite=Lax, NOT Secure; session-only unless RememberMe=true, or after register, then +30d). `__RequestVerificationToken` cookie (secure, HttpOnly) is issued on most GETs. `ASP.NET_SessionId` appears on /logout.
- Login form has NO anti-forgery token (confirmed: POST without any works). Register, customer/info, changepassword DO require it (missing -> 500, not 400/403). Password recovery and address add/edit have no token.
- The old AUTH cookie value still authenticates after /logout (no server-side invalidation).
- Login errors are uniform; password recovery ("Email not found.") and register (duplicate email/username) allow account enumeration.
- Open redirect not present: external returnUrl falls back to `/`.
- Delete address is a GET (CSRF-able state change).
- /customer/backinstocksubscriptions is reachable anonymously (inconsistent gating).
- Version disclosure headers: Microsoft-IIS/10.0, X-AspNetMvc-Version 5.2, X-AspNet-Version, X-Powered-By.
- Redirect for protected pages uses `ReturnUrl` (capital R) while the login link uses `returnUrl`; both are accepted.

## Test-account (state created)
- BEARSTORE_EMAIL/PASSWORD not set, so two throwaway accounts were registered: `qa-auth-1790932958@example.com` (username qaauth1790932958; main) and `qa-auth-1790932958b@example.com` (username qaauth1790932958b; created only to verify the register success contract via curl). Passwords were generated and kept only in /tmp scratch files, never in artifacts. Accounts cannot be deleted via UI, so they remain on the server. Company field of main account was changed during tests; first name QA, last name AuthBot.
- Both addresses created on the main account (ids 38633, 38634) were deleted. A password-recovery email was triggered for the main account (example.com, undeliverable). No password was changed.
- Browser session was logged out; cookie jars/scratch files in /tmp (qa-auth*.{jar,html,pw,ts}, a.jar, r.jar, pr.jar) contain a password and cookies: delete them (rm /tmp/qa-auth.pw ...).

## Open questions
- Successful change-password contract (response, whether it re-issues AUTH) not observed.
- Whether the 30-day persistent cookie after registration is intentional vs RememberMe (register always persistent).
- Order history row format and /customer/orderdetails/{id} not observed (no orders; ordering excluded).
- Date of birth fields, newsletter checkbox on /customer/info not exercised. Country/state dependency (StateProvinceId) for US not exercised.
- Account page header showed "1 Shopping Basket" right after registering from an empty browser; is a cart item merged/created on registration? Belongs to cart area to confirm.
- Behaviour on rate limiting / lockout after repeated failed logins was not probed (kept requests few on the shared host).
- Whether password recovery token link (/passwordrecovery/confirm?token=&email=) is testable: email not accessible.
