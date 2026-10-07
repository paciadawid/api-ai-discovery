---
paths:
  - "tests/**/*.ts"
  - "src/**/*.ts"
---

# Assertion rules: tests worth trusting

A green test that cannot fail is worse than no test. Apply all nine, then prove the tests can fail.

1. **Assert the business result, not just the status.** Business failures are often HTTP 200 with an error flag in the body. `expect(status).toBe(200)` alone proves nothing.
2. **Cross-check two independent views of the same fact.** A detail view, a total and a counter must agree; one view alone can be wrong.
3. **Compute expected values from the INPUT.** `quantity * unitPrice`, never a string copied from the page or the response (that tests the page against itself).
4. **Prove preconditions.** "Nothing there" only means something if the parser saw something a moment earlier. Otherwise a blind parser makes every absence check pass.
5. **Assert the side effect.** Read the state AFTER the call, not only the reply. A reply and an effect can disagree.
6. **"Nothing happened" needs a positive control.** "Their data is untouched after someone else's delete" is also true when delete does nothing; show that delete works on data you own.
7. **Pin known bugs on purpose.** Assert the exact status and message the server gives today, tag the test `@known-issue` with an `issue` annotation, explain in a comment. When the target is fixed, the test tells you.
8. **Every test owns its state.** The actor comes from a fixture: own request context, own session, own data. No ordering between tests, no shared state.
9. **Messages say which business fact failed.** `expect(items, 'one item, not two').toHaveLength(1)`.

These rules apply to matchers and actors too: a matcher that cannot fail or an actor `Given` that does not prove its precondition breaks rules 1 and 4 for every spec that uses it.

Then **prove the tests can fail**: sabotage one thing in `src/` (an endpoint URL, a parser, a sent value, a matcher) in a throw-away copy of the kit, confirm a test goes red, and strengthen any survivor (see the `writing-api-tests` skill).
