---
name: api-test-framework
description: Use when adding or changing API tests, actors, matchers, parsers or fixtures in this repo. Explains the layered Playwright API framework (src/ + tests/<area>/), the behaviour-style test conventions, and the checklist for adding a new area or use case.
---

# Layered API test framework

Rules live in `.claude/rules/` (`framework-architecture.md`, `test-style.md`, `secrets.md`). Read them first; this skill is the procedure.
Reference implementation: cart (`src/api/cart.api.ts`, `src/actors/shopper.ts`, `tests/cartws/`) and browsing/auth (`src/actors/visitor.ts`, `tests/auth/`).

Actors: `Shopper` (cart, wishlist) and `Visitor` (catalogue, search, contact, sign-in). Fixtures: `shopper`, `otherShopper`, `newShopper({ userAgent?, cookieless? })`, `visitor`, `customer` (credentials from `.env`).

## Adding a use case to an existing area
1. Read the UC in the QA root's `02-use-cases.md` and its endpoints in `01-discovery/endpoints.json`.
2. Missing endpoint call? Add one method to the area's `src/api/<area>.api.ts` (no assertions). Add its body type to `src/api/types.ts`.
3. Missing response understanding? Add a parser to `src/domain/` (pure function: `string -> typed object`). Constants (product ids, prices, server messages) go in `src/domain/products.ts` / `server-messages.ts`.
4. Add the business verb to the actor (`src/actors/shopper.ts`): `Given` = `has...`, `When` = present-tense action (`removes`, `movesToWishlist`), `Then` = question returning a typed object. Wrap in `test.step('<readable sentence>')`.
5. Repeated assertion? Add a matcher to `src/matchers/index.ts` (returns `{ pass, message }` with a helpful diff).
6. Write the spec in `tests/<area>/<capability>.api.spec.ts` following `test-style.md`: describe = situation, `beforeEach` = Given, one behaviour per test, title `UC-<AREA>-<NN>: <behaviour and outcome>`.
7. Known defect observed? Tag it `@known-issue` with an `issue` annotation and assert the observed behaviour.
8. Verify: `npm run verify` (typecheck + framework rules), then `npx playwright test tests/<area> -g "<UC-ID>"`.
9. Record the UC, file and result in the QA root's `04-coverage.md`.

## Adding a whole new area (e.g. checkout)
1. `src/api/<area>.api.ts` + register it in `src/api/store-api.ts`.
2. Parsers/constants in `src/domain/`.
3. If it needs a new kind of visitor (logged-in customer, admin), add a fixture in `src/fixtures/index.ts` (create + `use` + cleanup in `finally`) and, if the vocabulary differs, a new actor class in `src/actors/`. Credentials only via `env.customer()`.
4. Specs under `tests/<area>/`.

## Hooks and state
- Setup that every test of a group needs: `test.beforeEach` in the spec calling actor `Given` methods.
- Teardown: never in specs. Put it in the fixture's `finally` (runs on failure too).
- Use per-test isolation (unique User-Agent per visitor) instead of cleanup-order tricks.

## Smell checklist (reject in review)
- `request.get/post`, `JSON.parse`, regex on HTML, `process.env` in a spec.
- A title that says *how* (`POST ... twice`) instead of *what happens*.
- Literal ids/prices/messages in a spec; `waitForTimeout`; `test.only/skip/fixme`.
- Any non-spec file under `tests/`. Reusable code goes to `src/`.
