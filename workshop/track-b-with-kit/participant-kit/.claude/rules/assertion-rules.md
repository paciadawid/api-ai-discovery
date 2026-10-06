---
paths:
  - "tests/**/*.ts"
---

# Assertion rules: tests worth trusting

A green test that cannot fail is worse than no test. Apply all nine, then prove the tests can fail.

1. **Assert the business result, not just the status.** Business failures are often HTTP 200 with `success:false`. `expect(status).toBe(200)` alone proves nothing.
2. **Cross-check two independent views of the same fact.** Cart page lines, cart subtotal and the header badge must agree; one view alone can be wrong.
3. **Compute expected values from the INPUT.** `5 * unitPrice`, never a string copied from the page or the response (that tests the page against itself).
4. **Prove preconditions.** "No lines" only means something if the parser saw a line a moment earlier. Otherwise a blind parser makes every absence check pass.
5. **Assert the side effect.** Read the state AFTER the call, not only the reply. A reply and an effect can disagree.
6. **"Nothing happened" needs a positive control.** "Their cart is untouched after someone else's delete" is also true when delete does nothing; show that delete works on a line you own.
7. **Pin known bugs on purpose.** Assert the exact status and message the server gives today, tag the test `@known-issue`, explain in a comment. When the host fixes it, the test tells you.
8. **Every test owns its state.** A fresh request context with a unique User-Agent. No ordering between tests, no shared cart.
9. **Messages say which business fact failed.** `expect(lines, 'one line, not two').toHaveLength(1)`.

Then check the others: **prove the tests can fail** (sabotage a helper in a throw-away copy and confirm a test goes red; a survivor must be strengthened).
