---
paths:
  - "tests/**/*.ts"
---

# Test style (minimal structure)

- One spec file per slice: `tests/<slug>.api.spec.ts`. Small helpers (a shopper class over `APIRequestContext`, a price parser) sit at the top of the same file. If the file grows past about 250 lines, say so in the report instead of inventing layers.
- `test.describe` names the situation ("Cart manipulation (anonymous shopper)").
- Titles start with the use-case ID and state a behaviour and its outcome: `UC-CART-02: adding the same product again grows the existing line instead of adding a second one`. Not `POST addproduct twice`.
- Arrange / Act / Assert, separated by blank lines. One behaviour per test.
- Named constants for product ids, prices and messages (`GOLFBALL = { id: 8, unitCents: 190 }`), no magic numbers in assertions.
- Disable redirect following in the request context when the redirect itself is the behaviour.
- No `waitForTimeout`, no `test.only`, no `test.skip`/`fixme`, no weakened assertion to get green.
- Known application defects: keep asserting the observed behaviour, tag `@known-issue`, comment why.
- SmartStore quirks to respect: a body-less POST needs `data: ''` (else HTTP 411); send `X-Requested-With: XMLHttpRequest`; business failures are HTTP 200 + `success:false`; cart line ids change when a line moves between cart and wishlist; counters JSON has a `$type` field, so use `toMatchObject`.
