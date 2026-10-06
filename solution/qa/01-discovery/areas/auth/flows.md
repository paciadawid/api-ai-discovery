# Auth flows (discovered via headed browser session qa-auth, replayed with curl)

Base: https://bearstore-testsite.smartbear.com. Jar: /tmp/qa-auth.jar. Credentials below are placeholders; use $BEARSTORE_EMAIL / $BEARSTORE_PASSWORD or a throwaway account.

## F1 Login (valid)
Browser: GET /login?returnUrl=%2F, filled UsernameOrEmail/Password, clicked Log in.
Endpoints: GET /login?returnUrl=... (200) then POST /login?returnUrl=... (302 -> returnUrl).
Preconditions: none. No anti-forgery token is needed or present on the login form.
Body: `UsernameOrEmail=<email or username>&Password=<pw>&RememberMe=false` (browser sends RememberMe=false when unchecked; RememberMe=true&RememberMe=false when checked).
Result: 302, `Location` = returnUrl (local path) else `/`. Cookies: `SMARTSTORE.AUTH` (HttpOnly; SameSite=Lax; no Secure flag; session cookie when RememberMe=false, `expires` +30 days when true), `SMARTSTORE.VISITOR` (unchanged). Login by email or username both work; email match is case-insensitive; password case-sensitive.
```
curl -s -o /dev/null -c /tmp/qa-auth.jar "$B/login?returnUrl=%2Fcustomer%2Finfo"
curl -i -b /tmp/qa-auth.jar -c /tmp/qa-auth.jar -X POST "$B/login?returnUrl=%2Fcustomer%2Finfo" \
  --data-urlencode "UsernameOrEmail=$BEARSTORE_EMAIL" --data-urlencode "Password=$BEARSTORE_PASSWORD" -d RememberMe=false
```

## F2 Login invalid
Wrong password, unknown user and empty fields all return 200 with the login form re-rendered (UsernameOrEmail echoed back) and
`<div class="validation-summary-errors alert alert-danger"><span>Login was unsuccessful. Please correct the errors and try again.</span><ul><li>The credentials provided are incorrect</li></ul></div>`.
No AUTH cookie. Same message for all cases (no user enumeration on login).
`curl -i -X POST "$B/login" -d "UsernameOrEmail=nobody@example.com&Password=bad&RememberMe=false"` -> 200.

## F3 returnUrl handling
- `returnUrl=/customer/info` -> Location `/customer/info`; `/cart` -> `/cart`; none -> `/`.
- `returnUrl=https://evil.example.com/` and `//evil.example.com` -> Location `/` (no open redirect).
- Protected pages redirect anonymous users to `/login?ReturnUrl=%2fcustomer%2finfo` (capital R, lowercase encoding).

## F4 Logout
GET /logout -> 302 `/`, `Set-Cookie: SMARTSTORE.AUTH=; expires=1999`. Also works anonymously and with a stale cookie. POST /logout without body -> 411 (not used).
Surprise: replaying the old SMARTSTORE.AUTH value after logout still returns 200 on /customer/info (ticket not invalidated server-side).

## F5 Register
Browser: GET /register?returnUrl=%2f, empty submit (client-side jQuery validation, no request), then valid submit.
Endpoints: GET /register (token in form + `__RequestVerificationToken` cookie) -> POST /register?returnUrl=%2F (302 -> /registerresult/1?returnUrl=%2f) -> GET /registerresult/1 (200 "Your registration completed").
Body: `__RequestVerificationToken, FirstName, LastName, DateOfBirthDay, DateOfBirthMonth, DateOfBirthYear, Email, Username, Password, ConfirmPassword, Company, register-button`.
Requires the token (form value AND cookie): without token or without cookie -> 500 "The required anti-forgery form field ... is not present."
Success auto-logs in: `SMARTSTORE.AUTH` persistent (+30d) in the 302. Header then shows the username.
Server validation (200, form re-rendered): duplicate email "The specified email already exists"; duplicate username "The specified username already exists"; missing Username "Username is not provided"; invalid email; Password length 6-500 ("You entered N characters."); ConfirmPassword mismatch. Username is required by the server although FirstName/LastName/Company are optional.
```
curl -s -c j -b j "$B/register" -o r.html; TOK=$(grep -o 'name="__RequestVerificationToken" type="hidden" value="[^"]*' r.html | head -1 | sed 's/.*value="//')
curl -i -b j -c j -X POST "$B/register?returnUrl=%2F" --data-urlencode "__RequestVerificationToken=$TOK" -d "FirstName=QA&LastName=X" \
  --data-urlencode "Email=qa-auth-$(date +%s)@example.com" --data-urlencode "Username=qaauth$(date +%s)" --data-urlencode "Password=<pw>" --data-urlencode "ConfirmPassword=<pw>"
```

## F6 Password recovery
GET /customer/passwordrecovery -> POST /customer/passwordrecovery `Email=<e>&send-email=Submit` (no token needed) -> 200 with message.
Known email: "Email with instructions has been sent to you." Unknown: "Email not found." (user enumeration). Invalid/empty email: field validation messages. Sends a real email to the address given; only throwaway example.com address used.

## F7 Account page access
Anonymous: /customer/info, /customer/addresses, /customer/orders, /customer/addressadd, /customer/addressedit/{id}, /customer/addressdelete/{id}, /customer/changepassword, /customer/downloadableproducts -> 302 `/login?ReturnUrl=<lowercase-encoded path>`.
Exception: /customer/backinstocksubscriptions answers 200 anonymously (empty list shell). `/customer` -> 404. `/customer/orders/` -> 301.
Authenticated: all return 200, title "Shop. Account". Fresh account: Orders "No orders", Addresses "No addresses". Logged-in GET /login and /register still return 200 (no redirect).

## F8 Profile update
POST /customer/info (token required) fields FirstName, LastName, DateOfBirth*, Email, Company, save-info-button -> 302 `/customer/info`; change visible on re-GET. Invalid email -> 200 with error. Empty LastName accepted (302) although UI marks it required. Fields omitted from the POST are blanked. Missing token -> 500 (also anonymous).

## F9 Address CRUD
- GET /customer/addressadd (200) -> POST /customer/addressadd (NO token) -> 302 /customer/addresses. Fields `Address.Id=0, Address.Company, Address.FirstName*, Address.LastName*, Address.Address1, Address.Address2, Address.City, Address.ZipPostalCode, Address.CountryId (0 none, 1 US, 62 PL), Address.StateProvinceId, Address.Email*, Address.PhoneNumber`. Validation errors -> 200. Browser create produced id 38633; curl create 38634.
- GET /customer/addressedit/{id} -> POST /customer/addressedit/{id} (Address.Id={id}) -> 302 /customer/addresses.
- GET /customer/addressdelete/{id} -> 302 /customer/addresses (delete over GET; the UI only guards with a JS confirm).
- Ownership: another account (or unknown id like 1) touching my id gets 302 /customer/addresses, address untouched.
Browser quirk: selecting country "Poland" via playwright-cli select did not change the value (posted CountryId=0); irrelevant to the contract.

## F10 Change password (not exercised to success)
GET /customer/changepassword (token + OldPassword, NewPassword, ConfirmNewPassword). POST with wrong old password -> 200 "Old password doesn't match"; mismatch -> field error. No successful change made (password changes are excluded).

## F11 Orders
GET /customer/orders -> 200 "No orders" for fresh accounts. Order rows could not be observed (no order placed; excluded). Shared BEARSTORE_EMAIL account might have history; not checked since no creds.
