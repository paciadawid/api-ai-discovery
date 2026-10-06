---
paths:
  - "tests/**/*.api.spec.ts"
---

# Test style: behaviours, not actions

A test reads as a short story a product owner could confirm. Anything mechanical is hidden in an actor, matcher or parser.

1. **Title states the behaviour and the outcome**, prefixed by the use-case ID:
   `UC-CARTWS-02: adding the same product again grows the existing line instead of adding a second one`.
   Not `UC-CARTWS-02: POST addproduct twice` and not `test cart`.
2. **`test.describe` names the situation or capability** ("A shopper with one golfball in the cart"), not the endpoint or the file.
3. **Arrange / Act / Assert, separated by blank lines.** Arrange = `shopper.hasInCart(...)` (or `beforeEach` when several tests share it). Act = one `shopper.<verb>s(...)`. Assert = `expect(...)` on the outcome.
4. **One behaviour per test.** If the title needs "and" twice, split it. Shared setup goes in `test.beforeEach`; teardown is never written in a spec (the fixture does it).
5. **No raw HTTP, no parsing, no regex over HTML, no JSON plumbing** in a spec. If you need it, add an actor method, a parser, or a matcher first.
6. **Use domain vocabulary**: `golfball`, `line`, `cart`, `wishlist`, `shopper`, `priced(golfball, 5)`. No magic numbers or strings: product ids, prices and server messages come from `@/domain/*`.
7. **Assertions say what they mean**: prefer `expect(reply).toBeAccepted()` / `expect(cart).toContainLine(golfball, { quantity: 5 })` over `expect(reply.status).toBe(200)`. Add a message argument when the reason is not obvious (`expect(x, 'the line is gone despite the error')`).
8. **Parametrise with data tables**, not copy-paste: an array of `{ described, quantity }` and a `for` loop generating one titled test each.
9. **Known application defects** keep the test asserting the *observed* behaviour and carry `{ tag: '@known-issue', annotation: { type: 'issue', description: 'KI-n: ...' } }`. Never `test.skip`, `fixme` or weaken the assertion.
10. **Independence**: no ordering, no shared mutable state between tests, no fixed sleeps. Each test gets its own `shopper` (private guest cart).
11. Keep specs short: if a file passes ~150 lines, split by capability (`adding-to-cart`, `changing-quantity`, ...). File names are kebab-case behaviours: `tests/<area>/<capability>.api.spec.ts`.
