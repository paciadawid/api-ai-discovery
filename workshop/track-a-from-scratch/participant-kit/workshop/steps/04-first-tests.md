# Block 4: your first real tests (login and token)

**Goal:** the layered framework exists, and one test you can trust: log in, get a token, prove it identifies you.

1. **Layers.** **prompt 02** (`workshop/prompts.md`): the agent turns the smoke test into the layout from `AGENTS.md` (config, api, domain, fixtures, tests). Run `npm test` and `npm run verify`.
2. **Login test.** **prompt 03** (`workshop/prompts.md`). The agent writes the users client, a `shopper` fixture that logs in per test, and AUTH-01 from your plan.
3. **Review with the checklist** (rules step 1): the business result and not only the status? expected values from your input? does every message say which fact failed?
   Fix the one thing you like least by hand, without the agent.
4. **Can it fail?** Break two things, one at a time, and put each back:
   - Change `/users/login` in `src/api/users.api.ts` to `/users/log1n`. Run: it goes red, but in the fixture (the login precondition), not in AUTH-01.
   - Stop sending the `Authorization` header in `me()`. Run: now AUTH-01's own assertion must go red.
   Restore each line in your editor. (If you prefer `sed -i`: macOS needs `sed -i ''`, Linux `sed -i`.)
5. Check that `tests/smoke.spec.ts` is gone (prompt 02 moved it). `tests/products/search.spec.ts` still checks only a status: leave it, block 5 strengthens it.

**Done when:** AUTH-01 is green, goes red for both breaks, and the smoke test is gone.

**Stuck?** `workshop/checkpoints/04-auth/` holds a working state: copy `src` and `tests` somewhere safe first, then `rm -rf src tests && cp -R workshop/checkpoints/04-auth/. .` and `npm run verify && npm test`. (Without the `rm`, leftovers of your own tree break the type check.)
