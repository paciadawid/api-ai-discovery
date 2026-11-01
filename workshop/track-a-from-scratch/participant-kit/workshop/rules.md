# Assertion rules: tests worth trusting

A green test that cannot fail is worse than no test. You get the rules in three steps, as the day goes on. Each step adds a few; nobody needs all nine at once.

## Step 1: say what you check (from block 4)
1. **Assert the business result, not just the status.** A failure is often HTTP 200 with an error inside, so `expect(status).toBe(200)` alone proves little.
2. **Compute expected values from your INPUT.** The email you sent, `3 * unitPrice`: never a value copied from the reply (that tests the server against itself).
3. **Messages say which business fact failed.** `expect(hits, 'search for "pliers" finds Combination Pliers').toContain(...)`.

## Step 2: prove the test can see (from block 5)
4. **Prove preconditions.** "Nothing there" only means something if you saw something a moment earlier.
5. **Assert the side effect.** Read the state AFTER the call (list, get), not only the reply. A reply and an effect can disagree.
6. **"Nothing happened" needs a positive control.** "Login is refused" is also true when login never works: show the real credentials work. (Refuse with an unknown e-mail, never a wrong password for your own user: it locks the account.)
7. **Cross-check two independent views of one fact.** The reply and a re-read, the total and the page count. One view alone can be wrong.

## Step 3: keep it honest (from the end of block 5)
8. **Pin known bugs on purpose.** Assert the exact answer the server gives today, tag the test `@known-issue`, explain in a comment. When the server is fixed, the test tells you.
9. **Every test owns its state.** Own request context, own token, own data created (and removed) by the test or its fixture. No order between tests, no shared variables. A fixture's teardown **checks the result of its own deletes**: a cleanup that fails silently leaks data for the whole room.

These rules apply to helpers and fixtures too: a fixture that does not check its login worked breaks rule 4 for every test that uses it.

## Then prove the tests can fail
Break one thing in `src/` (an endpoint path, a parsed field, a value you send), run the tests, confirm at least one goes red, and put it back. A break no test notices is a gap: add or strengthen the test that should have caught it.

## Secrets (always)

- Credentials live in `.env` (gitignored) on your machine and in **repository secrets** in CI. `.env.example` lists the names with empty values and is the only env file in git.
- Read secrets only in `src/config/`, from environment variables. A missing secret fails loudly with a hint, and it never has a default.
- Never write a password or token into `src/`, `tests/`, `scripts/`, `qa/`, `workshop/`, a prompt or a screenshot.
- Never log a password or token, and never put one in an assertion message. Log a name or a length instead.
- Never paste `.env` or a real password into an AI chat. If you did, say so and change the password.
- Postman: keep the password and token in a Postman **environment** as secret-type values; do not export the environment or share a workspace that contains it.
- Your Toolshop user is a throwaway test user on a public practice site. Treat it like a real one anyway: the habit is the point.
