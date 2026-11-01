# The challenge: an API you have not seen

Everything from the day, once more, on your own. There is no card to lead you: **explore, find gaps, plan, code, prove it can fail**. Work alone or in pairs.

## Pick a tier

| Tier | API | Login | What makes it interesting |
|---|---|---|---|
| **A: Pokémon** | https://pokeapi.co/api/v2/ ([docs](https://pokeapi.co/docs/v2)) | none | Read-only. The replies hand you URLs to follow: chaining without a token. |
| **B: The cart** | Toolshop `/carts` (you know the host) | none | State. One cart, several lines, quantities, limits, a "success" that may not mean success. |

If you finish early: do the other tier, or bring a public API from your own work (read-only or one you may write to).

## The rules of the challenge
1. You may use any AI help and the prompts in `workshop/prompts.md` (start with prompt 07).
2. Nothing counts that you have not run. Show real output.
3. Same layout as the rest of your project: new area, new `src/api/<name>.api.ts` and `tests/<name>/`. A second host is easiest as a **Playwright project** with its own `baseURL` (see the hints). Keep one gaps file per API: `qa/pokeapi-gaps.md`, `qa/cart-gaps.md`.
4. Cleanup: anything you create, you remove in a fixture, and the fixture checks that the removal worked.
5. Time box: about 50 minutes. 10 explore, 10 plan, 20 code, 10 break and score. **One tier, three or four tests.** Tier A is quicker; start there if this is your first API. More time? Add tests, or take the other tier.

## Hints (read only when you are stuck)
- *A second project:* give **both** projects a `testMatch` or `testIgnore`, or the Toolshop tests run against Pokémon (404s) and the other way round. Check with `npx playwright test --list`.
  ```ts
  projects: [
    { name: 'toolshop', testIgnore: '**/tests/pokemon/**' },
    { name: 'pokeapi', testMatch: '**/tests/pokemon/**', use: { baseURL: 'https://pokeapi.co/api/v2/' } },
  ],
  ```
- *PokeAPI base URL:* if `baseURL` is `https://pokeapi.co/api/v2/`, keep the trailing slash and request paths WITHOUT a leading slash (`pokemon/eevee`), or the `/api/v2` part is dropped.
- *Chaining:* do not build ids yourself; take the next URL from the previous reply, and check from the other end too (rule 7: a deliberate cross-check of two endpoints is allowed to use a value from a reply).
- *The cart:* start by writing down what **you expect** a cart to do, then try to disprove it. Guess a limit: per request, and per cart? Guess what happens to a line you did not add. The spec file `workshop/toolshop-openapi.3.1.json` is all the documentation there is.

## How it is judged (by you and a neighbour, 10 minutes)
Give one point each:
1. A test list with sources (spec, docs, or a replayed request) before any code.
2. At least one gap or surprise written down with evidence.
3. Every test has a business assertion, not only a status.
4. Expected values come from your input (or from a deliberate cross-check of two endpoints).
5. A positive control for every "nothing happened" check.
6. State read back after every state change.
7. Cleanup in a fixture that checks the result of the delete (a cart has no list endpoint: prove it with one more `GET` that now answers 404).
8. A known issue pinned on purpose. In tier A a surprise counts (for example `limit=0` returns 20 results).
9. You broke something in `src/` and a test went red, **and** you tried one break that no test noticed and wrote the test that now catches it (or say that every break was caught).
10. `npm test` and `npm run verify` pass from a fresh clone plus your own `.env`. The test list was committed before the first test file.

**8 or more: you trust it. 5 to 7: you almost trust it. Below: you found out what to do next.**
