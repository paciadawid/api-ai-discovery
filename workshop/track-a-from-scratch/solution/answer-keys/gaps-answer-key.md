# Gap analysis: answer key (facilitator only)

Observed live on https://api.practicesoftwaretesting.com on 2026-11-01. The host is reseeded now and then: re-run the hunts the evening before. Ids are ULIDs and change; names are stable.

| Hunt | What the spec says | What the server does | Verdict |
|---|---|---|---|
| H1 wrong password | lists 401 with a message | 401 `{"error":"Unauthorized"}`. Key is `error`, the rest of the API uses `message`. | undocumented shape. **Lockout:** a few wrong passwords in a row lock the account (423, `Account locked, too many failed attempts`); nothing unlocks it. Participants then register a new nick. |
| H2 favorite add | `POST /favorites` answers 200 | 201. A duplicate gives 409 `{"message":"Duplicate Entry"}` (the spec has no 409). | docs wrong, undocumented |
| H3 `Accept` header | validation errors are JSON | Without `Accept: application/json` a failed validation is a **302 to the host root** (HTML). Your HTTP client follows it and "sees" a 200 page. | trap for tests: set the header in config |
| H4 tokens | not stated | Logout revokes the token (401 after). Refresh revokes the OLD token. Lifetime is about 300 s (`expires_in`); the spec example says 120. | undocumented, docs wrong |
| H5 carts | quantity limits not stated | No login needed. Add 99, then 1 more: one line of 100. A single add of 100: 422. Setting the quantity of a product that is not in the cart answers 200 "item added or updated" and adds nothing. | bug (limit bypass), bug (false success) |
| H6 `Claw Hammer` | search is by text | 3 hits. A lookup by name must match the exact name or it picks the wrong product. | undocumented |

Extras to mention if the room is fast:
- Unknown `by_brand` gives 200 and an empty list; the spec lists 404.
- "Thor Hammer" is a limited product: one per cart, 400 "You can only have one Thor Hammer in the cart."
- Users cannot delete themselves (403). That is why the kit has no cleanup of users and every participant keeps one account.
- Deleting a cart answers 204.

What good pairs write down: the exact request, the status and body, the spec line they compare to, and a verdict. Push back on rows with no evidence.

## Postbot check to expect
Typical generated checks: `status code is 200`, `response time is below 200ms`, `body is an array`. Keep none as they are. Delete the response-time check (the public host will fail it at random). Fix the status check by adding a business assertion.
