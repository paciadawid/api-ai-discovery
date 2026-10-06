# AREA: AUTH (part of qa/02-use-cases.md; conventions, field dictionary and matrix are in that file)

Meta line format: `Area | Type | Side-effect | Tags`. `ACCT` = test account (see conventions). `B` = base URL. Every test uses a fresh request context with a unique User-Agent suffix.

### UC-AUTH-01: Login form is served anonymously
- Meta: auth | happy path | Side-effect: no | @smoke
- Endpoints: EP-AUTH-LOGIN-FORM
- Request: `GET /login?returnUrl=%2F`
- Expected: 200 text/html; `form[action^="/login"][method=post]` with inputs `UsernameOrEmail`, `Password`, `RememberMe`; NO `__RequestVerificationToken`; `Set-Cookie: SMARTSTORE.VISITOR`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-LOGIN-FORM; flows.md Auth F1.

### UC-AUTH-02: Valid login redirects to returnUrl and sets the AUTH cookie
- Meta: auth | happy path | Side-effect: no | @smoke @needs-account
- Endpoints: EP-AUTH-LOGIN, EP-AUTH-INFO-GET
- Request: `POST /login?returnUrl=%2Fcustomer%2Finfo`, urlencoded `UsernameOrEmail=$BEARSTORE_EMAIL&Password=$BEARSTORE_PASSWORD&RememberMe=false`, `maxRedirects: 0`; then `GET /customer/info` in the same context.
- Expected: 302 `Location: /customer/info`; `Set-Cookie: SMARTSTORE.AUTH` (HttpOnly, SameSite=Lax, no `expires`); follow-up 200 with `<title>` containing `Account`.
- State/cleanup: none.
- Evidence: flows.md Auth F1.

### UC-AUTH-03: Login accepts the email in another letter case
- Meta: auth | happy path | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login?returnUrl=%2F` with `UsernameOrEmail=<ACCT email uppercased>`, correct password.
- Expected: 302 `Location: /`; `SMARTSTORE.AUTH` set.
- State/cleanup: none.
- Evidence: flows.md Auth F1.

### UC-AUTH-04: Login without returnUrl redirects to the home page
- Meta: auth | happy path | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login` (no query), valid credentials, `RememberMe=false`.
- Expected: 302 `Location: /`; AUTH cookie set.
- State/cleanup: none.
- Evidence: flows.md Auth F3.

### UC-AUTH-05: RememberMe=true gives a persistent AUTH cookie, false a session cookie
- Meta: auth | state/persistence | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: two logins in two contexts: body `RememberMe=true&RememberMe=false` (checked checkbox) and `RememberMe=false`.
- Expected: first `Set-Cookie: SMARTSTORE.AUTH` has `expires` more than 20 days ahead (do not assert an exact date); second has no `expires`/`max-age`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-LOGIN setCookies.

### UC-AUTH-06: Wrong password re-renders the form with the uniform error
- Meta: auth | validation/negative | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login`, `UsernameOrEmail=$BEARSTORE_EMAIL&Password=<correct + "x">&RememberMe=false`.
- Expected: 200 (not 302); `.validation-summary-errors` contains `Login was unsuccessful` and `The credentials provided are incorrect`; no `SMARTSTORE.AUTH` in Set-Cookie.
- State/cleanup: one failed login; never repeated (lockout unknown, OQ-14).
- Evidence: flows.md Auth F2.

### UC-AUTH-07: Unknown user gets the same message as a wrong password
- Meta: auth | validation/negative | Side-effect: no | @smoke
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login`, `UsernameOrEmail=qa-nouser-<runId>@example.com&Password=NotARealPassw0rd&RememberMe=false`.
- Expected: 200; same two strings as UC-AUTH-06; no AUTH cookie.
- State/cleanup: none.
- Evidence: flows.md Auth F2.

### UC-AUTH-08: Login with empty fields is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login`, `UsernameOrEmail=&Password=&RememberMe=false`.
- Expected: 200; `Login was unsuccessful`; no AUTH cookie.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-LOGIN failure.

### UC-AUTH-09: External absolute returnUrl is not followed after login
- Meta: auth | security | Side-effect: no | @security @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login?returnUrl=https%3A%2F%2Fevil.example.com%2F`, valid credentials.
- Expected: 302 `Location: /`; the host never equals `evil.example.com`.
- State/cleanup: none.
- Evidence: flows.md Auth F3.

### UC-AUTH-10: Protocol-relative returnUrl is not followed after login
- Meta: auth | security | Side-effect: no | @security @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: `POST /login?returnUrl=%2F%2Fevil.example.com`, valid credentials.
- Expected: 302 `Location: /`.
- State/cleanup: none.
- Evidence: flows.md Auth F3.

### UC-AUTH-11: Logout expires the AUTH cookie and re-protects account pages
- Meta: auth | state/persistence | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-LOGOUT, EP-AUTH-INFO-GET
- Request: login; `GET /customer/info` (200); `GET /logout`; `GET /customer/info` in the SAME context.
- Expected: logout 302 `Location: /` with `Set-Cookie: SMARTSTORE.AUTH=` expiring in the past; last request 302 to `/login?ReturnUrl=%2fcustomer%2finfo` (match `ReturnUrl` and hex case-insensitively).
- State/cleanup: none.
- Evidence: flows.md Auth F4, F7.

### UC-AUTH-12: Logout without a session is harmless
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-LOGOUT
- Request: `GET /logout`, anonymous, `maxRedirects: 0`.
- Expected: 302 `Location: /`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-LOGOUT failure.

### UC-AUTH-13: Registration form carries the anti-forgery token
- Meta: auth | happy path | Side-effect: no | @smoke
- Endpoints: EP-AUTH-REGISTER-FORM
- Request: `GET /register?returnUrl=%2F`
- Expected: 200; hidden `__RequestVerificationToken` with non-empty value; `Set-Cookie: __RequestVerificationToken`; inputs `FirstName`, `LastName`, `Email`, `Username`, `Password`, `ConfirmPassword`, `Company`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-REGISTER-FORM.

### UC-AUTH-14: Register a new account logs the user in
- Meta: auth | happy path | Side-effect: yes (creates an undeletable account) | @side-effect
- Endpoints: EP-AUTH-REGISTER-FORM, EP-AUTH-REGISTER, EP-AUTH-INFO-GET
- Request: `GET /register`, read token; `POST /register?returnUrl=%2F` urlencoded: token, `FirstName=QA`, `LastName=Bot`, `Email=qa-<ts>-<rand>@example.com`, `Username=qa<ts><rand>`, `Password=<generated>`, `ConfirmPassword=<same>`, `Company=QA`, `register-button=Register`; then `GET /customer/info`.
- Expected: 302 `Location` starts with `/registerresult/1`; `SMARTSTORE.AUTH` with expiry about +30 days; follow-up 200. Runs only with `BEARSTORE_ALLOW_SIDE_EFFECTS=1`. This is the same registration the run-scoped `ACCT` fixture performs when no credentials are set (do not register twice).
- State/cleanup: account cannot be deleted; password only in memory.
- Evidence: flows.md Auth F5.

### UC-AUTH-15: Registration result page is public
- Meta: auth | happy path | Side-effect: no | (none)
- Endpoints: EP-AUTH-REGISTERRESULT
- Request: `GET /registerresult/1?returnUrl=%2F`, anonymous.
- Expected: 200; text `Your registration completed`; Continue link to `/`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-REGISTERRESULT.

### UC-AUTH-16: Register with an already used email is rejected
- Meta: auth | validation/negative | Side-effect: no (nothing is created) | @needs-account
- Endpoints: EP-AUTH-REGISTER-FORM, EP-AUTH-REGISTER
- Request: `GET /register` (token); `POST /register` with the ACCT email, a new unique `Username`, valid matching passwords.
- Expected: 200; contains `The specified email already exists`; no AUTH cookie.
- State/cleanup: none.
- Evidence: flows.md Auth F5.

### UC-AUTH-17: Register with a malformed email is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-REGISTER
- Request: token as in UC-AUTH-14; `Email=notanemail`, unique `Username`, equal 8+ char passwords.
- Expected: 200; contains `is not a valid email address`; no AUTH cookie.
- State/cleanup: none (validation failure).
- Evidence: endpoints.json EP-AUTH-REGISTER failure.

### UC-AUTH-18: Register with a 5-character password is rejected (boundary below minimum 6)
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-REGISTER
- Request: token; unique valid email/username; `Password=12345`, `ConfirmPassword=12345`. The valid boundary (6 chars) is not posted because it would create an account.
- Expected: 200; message matches `must be between 6 and 500 characters` and `You entered 5 characters`.
- State/cleanup: none.
- Evidence: flows.md Auth F5.

### UC-AUTH-19: Register with a mismatching confirmation is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-REGISTER
- Request: token; unique valid email/username; `Password=Abcdef1!x`, `ConfirmPassword=Different1!x`.
- Expected: 200; `The password and confirmation password do not match.`
- State/cleanup: none.
- Evidence: flows.md Auth F5.

### UC-AUTH-20: Register without a username is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-REGISTER
- Request: token; unique valid email; `Username=` empty; valid passwords.
- Expected: 200; contains `Username is not provided`.
- State/cleanup: none.
- Evidence: flows.md Auth F5.

### UC-AUTH-21: Register without the anti-forgery token returns a client error
- Meta: auth | defect | Side-effect: no | @defect (defect #9)
- Endpoints: EP-AUTH-REGISTER
- Request: single `POST /register` with only `Email=qa-notoken-<runId>@example.com` (no token field, no token cookie).
- Expected (correct): 400 or 403, never 500. Observed: 500 "The required anti-forgery form field ... is not present." `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #9; auth.md CSRF table.

### UC-AUTH-22: Anonymous access to account pages redirects to login
- Meta: auth | auth/access | Side-effect: no | @smoke
- Endpoints: EP-AUTH-INFO-GET, EP-AUTH-ADDRESSES, EP-AUTH-ORDERS, EP-AUTH-ACCOUNT-MISC
- Request: anonymous `GET`, one request each, `maxRedirects: 0`: `/customer/info`, `/customer/addresses`, `/customer/orders`, `/customer/addressadd`, `/customer/changepassword`, `/customer/downloadableproducts`.
- Expected: each 302 with `Location` matching `/^\/login\?ReturnUrl=/i` and the lowercase-encoded request path.
- State/cleanup: none.
- Evidence: auth.md "Protected and open paths"; flows.md Auth F7.

### UC-AUTH-23: Profile page renders for a logged-in customer
- Meta: auth | happy path | Side-effect: no | @smoke @needs-account
- Endpoints: EP-AUTH-INFO-GET
- Request: login; `GET /customer/info`.
- Expected: 200; `<title>` contains `Account`; inputs `FirstName`, `LastName`, `Email`, `Company`, hidden `__RequestVerificationToken`; `Email` equals the account email (case-insensitive).
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-INFO-GET.

### UC-AUTH-24: Profile update persists and is restored
- Meta: auth | state/persistence | Side-effect: no (changes only the test account) | @needs-account
- Endpoints: EP-AUTH-INFO-GET, EP-AUTH-INFO-POST
- Request: login; `GET /customer/info`, read all fields and token; `POST /customer/info` with ALL fields as read except `Company=qa-<runId>`, plus `save-info-button`; `GET /customer/info`; POST again with the original `Company`.
- Expected: POST 302 `Location: /customer/info`; re-GET shows the new Company; after restore equals the original.
- State/cleanup: restore in `finally`; always post the full field set (omitted fields are blanked).
- Evidence: flows.md Auth F8.

### UC-AUTH-25: Anonymous address add is redirected to login
- Meta: auth | auth/access | Side-effect: no | (none)
- Endpoints: EP-AUTH-ADDRESS-ADD
- Request: anonymous `POST /customer/addressadd` with `Address.Id=0&Address.FirstName=QA&Address.LastName=Anon&Address.Email=qa@example.com`, `maxRedirects: 0`.
- Expected: 302 `Location` starting `/login?ReturnUrl=`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-ADDRESS-ADD failure.

### UC-AUTH-26: Profile update with an invalid email is rejected
- Meta: auth | validation/negative | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-INFO-POST
- Request: login; token from `GET /customer/info`; `POST /customer/info` full field set but `Email=notanemail`.
- Expected: 200; `'Email' is not a valid email address.`; a later `GET /customer/info` still shows the original email.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-INFO-POST failure.

### UC-AUTH-27: Profile update with an empty required LastName is rejected
- Meta: auth | defect | Side-effect: no (restore afterwards) | @defect (defect #24) @needs-account
- Endpoints: EP-AUTH-INFO-POST
- Request: login; token; `POST /customer/info` full field set with `LastName=` empty.
- Expected (correct): 200 with a validation message for last name and the stored LastName unchanged. Observed: 302 and LastName blanked. `test.fail()`.
- State/cleanup: always restore the original LastName in `finally`.
- Evidence: SUMMARY.md section 4 #24; flows.md Auth F8.

### UC-AUTH-28: Profile update without token returns a client error
- Meta: auth | defect | Side-effect: no | @defect (defect #9) @needs-account
- Endpoints: EP-AUTH-INFO-POST
- Request: login; single `POST /customer/info` with `FirstName=QA&Email=<ACCT email>` and no token.
- Expected (correct): 400 or 403. Observed: 500. `test.fail()`.
- State/cleanup: request is rejected before any change.
- Evidence: SUMMARY.md section 4 #9.

### UC-AUTH-29: Address list renders for a logged-in customer
- Meta: auth | happy path | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESSES
- Request: login; `GET /customer/addresses`.
- Expected: 200; contains either `No addresses` or links matching `/customer/addressedit/\d+` and `/customer/addressdelete/\d+`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-ADDRESSES.

### UC-AUTH-30: Add an address and see it in the list
- Meta: auth | state/persistence | Side-effect: no (own account) | @needs-account
- Endpoints: EP-AUTH-ADDRESS-ADD, EP-AUTH-ADDRESSES, EP-AUTH-ADDRESS-DELETE
- Request: login; record ids in `GET /customer/addresses`; `POST /customer/addressadd` urlencoded `Address.Id=0&Address.FirstName=QA&Address.LastName=Addr<runId>&Address.Email=qa-addr@example.com&Address.City=Test&Address.CountryId=1`; `GET /customer/addresses`.
- Expected: POST 302 `Location: /customer/addresses`; the list gains exactly one new edit-link id, and the card contains `Addr<runId>`.
- State/cleanup: delete the new id with `GET /customer/addressdelete/{id}` in `finally`.
- Evidence: flows.md Auth F9.

### UC-AUTH-31: Add address with missing required fields is rejected
- Meta: auth | validation/negative | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-ADD
- Request: login; `POST /customer/addressadd` with `Address.Id=0` and empty FirstName, LastName, Email.
- Expected: 200 (no redirect); messages `'First name' should not be empty.`, `'Last name' ...`, `'Email' should not be empty.`; address list unchanged.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-ADDRESS-ADD failure.

### UC-AUTH-32: Add address with an invalid email is rejected
- Meta: auth | validation/negative | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-ADD
- Request: login; `POST /customer/addressadd` with valid names and `Address.Email=bad`.
- Expected: 200; `'Email' is not a valid email address.`; list unchanged.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-ADDRESS-ADD failure.

### UC-AUTH-33: Edit an own address persists the change
- Meta: auth | state/persistence | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-ADD, EP-AUTH-ADDRESS-EDIT, EP-AUTH-ADDRESSES
- Request: login; create an address as in UC-AUTH-30; `GET /customer/addressedit/{id}` (200, prefilled); `POST /customer/addressedit/{id}` with `Address.Id={id}` and `Address.City=Edited`; `GET /customer/addressedit/{id}`.
- Expected: POST 302 `Location: /customer/addresses`; re-GET shows `Edited` in the City input.
- State/cleanup: delete the address in `finally`.
- Evidence: flows.md Auth F9.

### UC-AUTH-34: Editing an address id that is not yours changes nothing
- Meta: auth | auth/access | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-EDIT
- Request: login; snapshot of `GET /customer/addresses`; `POST /customer/addressedit/1` (id of another customer or non-existent) with `Address.Id=1&Address.FirstName=Hacked&Address.LastName=X&Address.Email=x@example.com`; snapshot again.
- Expected: 302 `Location: /customer/addresses`; the list is identical and contains no `Hacked`.
- State/cleanup: none.
- Evidence: flows.md Auth F9 (ownership).

### UC-AUTH-35: Delete an own address
- Meta: auth | state/persistence | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-ADD, EP-AUTH-ADDRESS-DELETE, EP-AUTH-ADDRESSES
- Request: login; create an address; `GET /customer/addressdelete/{id}`; `GET /customer/addresses`.
- Expected: delete 302 `Location: /customer/addresses`; the id is gone from the list.
- State/cleanup: this is the cleanup path itself; nothing left behind.
- Evidence: flows.md Auth F9.

### UC-AUTH-36: Deleting an address id that is not yours changes nothing
- Meta: auth | auth/access | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ADDRESS-DELETE
- Request: login; create own address; `GET /customer/addressdelete/1`; `GET /customer/addresses`.
- Expected: 302 `Location: /customer/addresses`; own address still listed.
- State/cleanup: delete own address in `finally`.
- Evidence: flows.md Auth F9 (ownership).

### UC-AUTH-37: Order history page renders
- Meta: auth | happy path | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ORDERS
- Request: login; `GET /customer/orders`.
- Expected: 200; `<title>` contains `Account`. For a freshly registered account the text `No orders` is present; with supplied credentials assert only status and title (history may exist, OQ-12).
- State/cleanup: none.
- Evidence: flows.md Auth F11.

### UC-AUTH-38: Downloadable products and change-password form render for a customer
- Meta: auth | happy path | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-ACCOUNT-MISC
- Request: login; `GET /customer/downloadableproducts`, `GET /customer/changepassword`.
- Expected: both 200; change-password page has inputs `OldPassword`, `NewPassword`, `ConfirmNewPassword` and a token.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-ACCOUNT-MISC; flows.md Auth F10.

### UC-AUTH-39: Back-in-stock subscriptions page requires login like its siblings
- Meta: auth | security | Side-effect: no | @security @known-issue (finding #16)
- Endpoints: EP-AUTH-ACCOUNT-MISC
- Request: anonymous `GET /customer/backinstocksubscriptions`, `maxRedirects: 0`.
- Expected (secure): 302 to `/login?ReturnUrl=...`. Observed: 200. `test.fail()`.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #16; OQ-15.

### UC-AUTH-40: Change password with a wrong old password is rejected
- Meta: auth | validation/negative | Side-effect: no (password stays unchanged) | @needs-account
- Endpoints: EP-AUTH-CHANGEPW
- Request: login; token from `GET /customer/changepassword`; `POST /customer/changepassword` with `OldPassword=<wrong>`, `NewPassword=Newpass1!x`, `ConfirmNewPassword=Newpass1!x`.
- Expected: 200; contains `Old password doesn't match`; the original password still logs in (verify with a new context).
- State/cleanup: none; the success path is out of scope.
- Evidence: flows.md Auth F10.

### UC-AUTH-41: Change password with a mismatching confirmation is rejected
- Meta: auth | validation/negative | Side-effect: no | @needs-account
- Endpoints: EP-AUTH-CHANGEPW
- Request: login; token; `OldPassword=<wrong>`, `NewPassword=Newpass1!x`, `ConfirmNewPassword=Other1!x`. The old password is deliberately wrong so a server that skips the field check still cannot change the password.
- Expected: 200; contains `The new password and confirmation password do not match.`
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-CHANGEPW failure.

### UC-AUTH-42: Change password without token returns a client error
- Meta: auth | defect | Side-effect: no | @defect (defect #9) @needs-account
- Endpoints: EP-AUTH-CHANGEPW
- Request: login; single `POST /customer/changepassword` with `OldPassword=<wrong>&NewPassword=Newpass1!x&ConfirmNewPassword=Newpass1!x`, no token.
- Expected (correct): 400 or 403. Observed: 500. `test.fail()`. A wrong old password guarantees no change even if the server misbehaves.
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #9.

### UC-AUTH-43: Password recovery form is served
- Meta: auth | happy path | Side-effect: no | (none)
- Endpoints: EP-AUTH-PWRECOVERY-FORM
- Request: `GET /customer/passwordrecovery`
- Expected: 200; `<h1>` `Reset password`; form posting to `/customer/passwordrecovery` with `Email` and submit named `send-email`; no token.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-PWRECOVERY-FORM (content record).

### UC-AUTH-44: Recovery for an unknown email reports "Email not found."
- Meta: auth | validation/negative | Side-effect: no (no mail is sent for unknown addresses) | (none)
- Endpoints: EP-AUTH-PWRECOVERY
- Request: `POST /customer/passwordrecovery`, `Email=qa-nouser-<runId>@example.com&send-email=Submit`.
- Expected: 200; `.alert-danger` text `Email not found.`
- State/cleanup: none.
- Evidence: flows.md Auth F6; flows.md Content FLOW-CONTENT-03.

### UC-AUTH-45: Recovery with a malformed email is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-PWRECOVERY
- Request: `POST /customer/passwordrecovery`, `Email=bad&send-email=Submit`.
- Expected: 200; `is not a valid email address`; no success text.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-PWRECOVERY failure.

### UC-AUTH-46: Recovery with an empty email is rejected
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-PWRECOVERY
- Request: `POST /customer/passwordrecovery`, `Email=&send-email=Submit`.
- Expected: 200; `should not be empty`.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-PWRECOVERY failure.

### UC-AUTH-47: Recovery POST without the send-email marker silently re-renders the form
- Meta: auth | validation/negative | Side-effect: no | (none)
- Endpoints: EP-AUTH-PWRECOVERY
- Request: `POST /customer/passwordrecovery`, `Email=qa-nouser-<runId>@example.com` only.
- Expected: 200; the form is rendered again; neither `Email not found.` nor `Email with instructions` appears.
- State/cleanup: none.
- Evidence: endpoints.json EP-AUTH-PWRECOVERY otherObservations (CONF-03).

### UC-AUTH-48: Recovery and registration do not reveal whether an email exists
- Meta: auth | security | Side-effect: no | @security @known-issue (finding #14)
- Endpoints: EP-AUTH-PWRECOVERY
- Request: single `POST /customer/passwordrecovery` for an unknown address (as UC-AUTH-44).
- Expected (secure): a response that does not distinguish known from unknown addresses, i.e. NOT the text `Email not found.`. Observed: `Email not found.` `test.fail()`. A known address is never submitted (would send mail).
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #14; auth.md "Enumeration".

### UC-AUTH-49: Old AUTH cookie stops working after logout
- Meta: auth | security | Side-effect: no | @security @known-issue (finding #11) @needs-account
- Endpoints: EP-AUTH-LOGIN, EP-AUTH-LOGOUT, EP-AUTH-INFO-GET
- Request: context A: login, capture the `SMARTSTORE.AUTH` value, `GET /logout`. Fresh context B: `GET /customer/info` with header `Cookie: SMARTSTORE.AUTH=<captured>`, `maxRedirects: 0`.
- Expected (secure): 302 to `/login?ReturnUrl=...`. Observed: 200. `test.fail()`.
- State/cleanup: the captured value is never logged or written to disk.
- Evidence: SUMMARY.md section 4 #11; flows.md Auth F4.

### UC-AUTH-50: AUTH cookie has the Secure flag
- Meta: auth | security | Side-effect: no | @security @known-issue (finding #12) @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: valid `POST /login`; inspect the `Set-Cookie` header for `SMARTSTORE.AUTH`.
- Expected (secure): attributes include `secure`, `HttpOnly`, `SameSite=Lax`. Observed: HttpOnly and SameSite=Lax present, `secure` missing. Split into two assertions so the passing ones are kept: HttpOnly and SameSite pass, Secure uses `test.fail()` (or `expect.soft`).
- State/cleanup: none.
- Evidence: SUMMARY.md section 4 #12; auth.md Cookies.

### UC-AUTH-51: Visitor cookie is Secure, HttpOnly and SameSite=Lax
- Meta: auth | security | Side-effect: no | @security
- Endpoints: EP-AUTH-LOGIN-FORM
- Request: `GET /login` anonymous; inspect `Set-Cookie: SMARTSTORE.VISITOR`.
- Expected: contains `secure`, `HttpOnly`, `SameSite=Lax`, `path=/`, and an `expires` about one year out (assert more than 300 days).
- State/cleanup: none.
- Evidence: auth.md Cookies.

### UC-AUTH-52: Address deletion must not be possible through GET
- Meta: auth | security | Side-effect: no (own address only) | @security @known-issue (finding #15) @needs-account
- Endpoints: EP-AUTH-ADDRESS-DELETE
- Request: login; create own address; `GET /customer/addressdelete/{id}`; list addresses.
- Expected (secure): the GET does not delete (405/404, or address still listed). Observed: deleted via GET. `test.fail()`.
- State/cleanup: delete the address in `finally` (if it survives).
- Evidence: SUMMARY.md section 4 #15.

### UC-AUTH-53: Login rejects a cross-site POST without a token
- Meta: auth | security | Side-effect: no | @security @known-issue (finding #15) @needs-account
- Endpoints: EP-AUTH-LOGIN
- Request: fresh context; `POST /login` valid credentials with headers `Origin: https://evil.example.com`, `Referer: https://evil.example.com/`, no anti-forgery token.
- Expected (secure): not a 302 with `SMARTSTORE.AUTH`. Observed: 302 and cookie set (no CSRF protection on login). `test.fail()`.
- State/cleanup: none (context disposed).
- Evidence: auth.md CSRF table; SUMMARY.md section 4 #15.
