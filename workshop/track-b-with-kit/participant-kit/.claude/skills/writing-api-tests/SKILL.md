---
name: writing-api-tests
description: Use when writing or reviewing the Playwright API tests of any feature slice in this project. Gives the procedure for the layered framework (src/api, src/domain, actors, matchers, fixtures, tests/<area>/), how to prove the tests can fail, how to bootstrap the framework when src/ does not exist yet, generic review and smell checklists, and one annotated worked example from a fictional library app (the pattern applies to any area).
---

# Writing API tests (layered framework)

Rules: `.claude/rules/assertion-rules.md` (read first), `framework-architecture.md` (the layers), `test-style.md`, `secrets.md`.

Anything specific to the current target (quirks, how to set up Playwright projects, credentials, how actors are isolated) is in the "Target-specific facts" section of the root `CLAUDE.md`. If `src/` already has layers, extend them and copy their shape. If it does not (the first run in a fresh kit), build them following "Bootstrap" below. Add nothing a use case does not need yet.

## Bootstrap (when `src/` does not exist yet)
The first writer run builds the layers from scratch, small and only for the selected use cases. Create things in this order, so each step typechecks on its own (`npx tsc --noEmit`); the `@/` alias to `src/` is already configured in `tsconfig.json` and Playwright honours it. Keep the first use cases few and small: the layers grow with the use cases, never ahead of them.

1. `src/config/env.ts`: the ONLY reader of `process.env`. Exports `env` with `baseUrl` (default from the target, overridable by `BASE_URL`) and credentials as lazy getters that throw "copy .env.example to .env" when missing (never a default for a secret; a slice that needs none never touches them).
2. `src/api/http-client.ts`: `Reply<T> = { status: number; body: T }` (add headers only if a use case needs them) and a small client over an `APIRequestContext` (`import type`, no runtime Playwright import). It applies the target quirks in one place (required headers, body-less POSTs, redirect handling), parses the body into `body` and NEVER asserts.
3. `src/api/<area>.api.ts` and `src/api/types.ts`: one class per area, one method per endpoint the selected use cases need, each returning `Reply<ThatBodyType>`; body types in `types.ts`. A root API object (`src/api/index.ts`) can hold the area classes once there is more than one.
4. `src/domain/`: pure TypeScript, no I/O. Parsers that turn HTML/JSON into typed objects (a parser that finds nothing must be loud or provably tested, never silently empty), named test-data constants (ids, prices), a money/format helper, and the exact server messages.
5. `src/actors/<role>.ts`: one class per kind of user. `has...` = Given (also proves its precondition), a present-tense verb = When (returns the raw `Reply`), an observation returning a typed object = Then. Wrap Given and When in `test.step('<readable sentence>')`. The actor receives the API object; it never imports fixtures.
6. `src/matchers/index.ts`: `expect.extend({...})`, exports the extended `expect`. Exact semantics: a matcher that compares a list compares the WHOLE list (order and extras included), not "contains"; a matcher that checks one field checks that field and its name says so. The failure message prints expected versus actual (the reply or the state), so nobody opens the raw response. Start with the few matchers the first specs need.
7. `src/fixtures/index.ts`: exports `test` (from `base.extend`) and `expect`. The fixture-provided actor is brand new: its own `request.newContext` with a unique User-Agent and its own cookie jar, a warm-up request if the target needs one before it accepts state-changing calls, and cleanup in `finally` after `use(actor)` that never hides the test's error (swallow and log cleanup failures; the original failure must stay visible). The fixture is the only place that creates and disposes contexts.
8. The first spec `tests/<area>/<capability>.api.spec.ts` (behaviours only), starting with the isolation check if the target needs one (two actors must not see each other's state).
9. `playwright.config.ts`: add the projects the specs need (see Target-specific facts). Every spec must be matched by exactly one project.
10. `npm run verify`, then `npx playwright test tests/<area>`.

Minimal shape of the two pieces most often got wrong (fictional names, see the worked example below):
```ts
// src/fixtures/index.ts
import { test as base, request as pw } from '@playwright/test';
import { env } from '@/config/env';
import { Api } from '@/api';
import { LibraryMember } from '@/actors/library-member';
export { expect } from '@/matchers';

export const test = base.extend<{ member: LibraryMember }>({
  member: async ({}, use, testInfo) => {
    const ctx = await pw.newContext({ baseURL: env.baseUrl, userAgent: `qa-${testInfo.testId}` }); // own cookie jar, unique identity
    const member = new LibraryMember(new Api(ctx));
    try {
      await member.opensASession();                      // warm-up, only if the target needs one
      await use(member);
    } finally {
      await member.clearsEverything().catch(() => {});   // cleanup must not hide the test's error
      await ctx.dispose();
    }
  },
});
```
```ts
// src/matchers/index.ts (whole-list semantics, the message shows both sides)
import { expect as base } from '@playwright/test';
export const expect = base.extend({
  toHaveExactlyTheReservations(received: Reservation[], expected: Reservation[]) {
    const pass = JSON.stringify(received) === JSON.stringify(expected); // order and extras count
    return { pass, message: () => `reservations\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(received)}` };
  },
});
```

## Procedure
0. Once per checkout: `npm install` (a fresh hand-out has no `node_modules`; this also makes `npx playwright-cli` resolve to the right package).
1. Read each selected UC in `<root>/02-use-cases.md`, especially its ORACLE (how the expected value is known without trusting the system under test), and its endpoints in `<root>/01-discovery/endpoints.json`. Read the existing `src/` first: if it already has an API class, parsers, an actor or matchers, reuse them; if `src/` does not exist yet, do the Bootstrap above first.
2. Missing endpoint call? Add ONE method to the area's API class in `src/api/` (or a new `src/api/<area>.api.ts` registered in the root API object). It returns `Reply<T>`, asserts nothing. Add its body type to `src/api/types.ts`.
3. Missing understanding of a response, or a constant? A pure parser, money/format helper, test-data constant or exact server message goes to `src/domain/`.
4. Missing business verb? Add it to the actor in `src/actors/`: `has...` = Given (proves its precondition), a present-tense verb = When (returns the `Reply`), an observation returning a typed object = Then. Wrap Given/When in `test.step('<readable sentence>')`.
5. Same assertion needed twice? Add a matcher to `src/matchers/index.ts`. Its failure message prints the actual reply or state.
6. Write the spec `tests/<area>/<capability>.api.spec.ts` (one spec per capability, about 150 lines at most): `test.describe` = the situation, `beforeEach` = Given, one behaviour per test, title `UC-<AREA>-<NN>: <behaviour and outcome>`. Known defect observed? It goes in the area's separate spec for known defects with `@known-issue` and an `issue` annotation, asserting the observed behaviour. A new spec must be matched by exactly one project of `playwright.config.ts` (the kit's config has no projects at first: add the ones the cycle needs, see Target-specific facts; a new area folder needs its own project entry).
7. Verify: `npm run verify` (typecheck + framework lint, fix every violation), then `npx playwright test tests/<area>/<capability>.api.spec.ts`.
8. PROVE THE TESTS CAN FAIL. In the QA cycle the `qa-sabotage-tester` agent does this (stage 6, report in `<root>/06-sabotage-report.md`); do it by hand like below when you work without the cycle. Never sabotage the real files. Make a throw-away copy of the kit, break one thing per run in the COPY's `src/`, run, expect red, delete the copy:
   ```bash
   rsync -a --exclude node_modules --exclude .env --exclude test-results --exclude playwright-report --exclude .playwright-cli --exclude qa ./ /tmp/kit-mut/ && ln -s "$PWD/node_modules" /tmp/kit-mut/node_modules
   # in /tmp/kit-mut: edit ONE thing, then:
   (cd /tmp/kit-mut && npx playwright test --reporter=line)   # at least one test must fail
   rm -rf /tmp/kit-mut                                       # when done
   ```
   Sabotage ideas, one per run, by class (the full list is in `qa-sabotage-tester`): a parser that reads the wrong field or finds nothing; a request value altered or sent to the wrong id or URL; a reply flag forced; a derived amount off by one; a matcher that always passes, ignores one field or checks only the first list element; a Given that does nothing; two actors sharing one identity; a no-op teardown; a test-data constant changed. Every sabotage a test cannot see is a survivor: strengthen the test (usually a missing positive control, a vacuous precondition or a status-only check), re-run, repeat.
9. Record each UC, its test title, status and the sabotage results in `<root>/04-coverage.md`.

## Review checklist
- [ ] Title is a behaviour and starts with the use-case ID; `describe` names the situation
- [ ] Every expected value has an oracle (computed from the input, e.g. `priced(ITEM, 3)`, or a second independent view)
- [ ] Preconditions proven before any "absence" check (a Given that proves its precondition, a read that shows the thing existed)
- [ ] State read after the call, not only the reply
- [ ] "Untouched" checks have a positive control (a positive control for every "nothing happened")
- [ ] A Given proves its precondition (it reads back what it set up; it is not a vacuous no-op)
- [ ] Matchers that compare lists compare the whole list (order and extras), and their failure message prints expected versus actual
- [ ] A stranger could read the failure message (matchers print the actual state, assertions carry a message)
- [ ] The test owns its state (the fixture-provided actor; no shared state, no order dependency)
- [ ] The spec holds behaviours only: HTTP, parsing and constants live in `src/`
- [ ] `npm run verify` is green and the sabotage runs went red

## Worked example (fictional library app); the pattern applies to any area
Invented domain, for the shape only: a member reserves books. Read it for the structure (Given in `beforeEach`, one When, state read independently, three views of one fact, oracle computed from the input). In your area the actor, the constants and the matchers are different, the structure is the same.
```ts
import { test, expect } from '@/fixtures';
import { dueDate } from '@/domain/loans';
import { BOOK_DUNE, LOAN_DAYS } from '@/domain/books';

test.describe('A library member with one reserved book', () => {
  test.beforeEach(async ({ member }) => {
    await member.hasNoReservations();         // Given, with a proven precondition (reads the list back, expects empty)
    await member.hasReserved(BOOK_DUNE);      // Given, proves the book is now on the list
  });

  test('UC-LIB-03: extending a loan updates the reply, the member summary and the reservation list consistently', async ({ member }) => {
    const reservation = await member.onlyReservation();       // state BEFORE

    const reply = await member.extendsLoan(reservation, 7);   // When
    const summary = await member.summary();                   // state AFTER, read independently
    const reservations = await member.reservations();

    expect(reply, 'extend the loan by 7 days').toBeAccepted();
    expect(reply, 'reply: due date = original loan period + 7 days').toReportDueDate(dueDate(LOAN_DAYS + 7)); // oracle: constant + input
    expect(summary, 'member summary after the extension').toHaveActiveLoans(1);                                // second view
    expect(reservations, 'the same reservation, with the later due date').toHaveExactlyTheReservations([       // third view, whole list
      { id: reservation.id, bookId: BOOK_DUNE.id, dueDate: dueDate(LOAN_DAYS + 7) },
    ]);
  });
});
```
No `request`, no regex, no `process.env`, no cleanup: the fixture owns the actor's session and cleans up in its `finally`.

## Worked example (fictional library app): sabotage by hand
The same procedure as step 8, with concrete mutations in the invented library code, one per run in the copy: the cancel URL in `src/api/reservations.api.ts` (`/reservations/{id}` -> `/reservation/{id}`, wrong target); the list finder in `src/domain/reservation-list.ts` (`data-book-id` -> `data-bookid`, parser finds nothing: the list always looks empty); `extendLoan` always sending `days: 1` (request value altered); a matcher in `src/matchers/index.ts` that always passes; the `LOAN_DAYS` constant in `src/domain/books.ts` (test-data constant changed). Each must turn at least one test red; one that stays green points at a missing positive control or a vacuous Given.

## Smell checklist (reject in review)
- `expect(res.status()).toBe(200)` as the only check
- an expected value copied from the response or the page
- `toHaveLength(0)` / an "empty" check with no proof the parser saw something before
- shared state or an order dependency between tests
- `waitForTimeout`, `.only`, `skip`/`fixme`, a hard-coded secret
- raw HTTP (`request.get/post`, `fetch`), `JSON.parse` or a regex in a spec
- a spec over about 150 lines (split by capability), or one file per slice instead of per capability
- manual `try/finally` or cleanup code in a spec (teardown belongs to the fixture)
- an import from `@playwright/test` in a spec (use `@/fixtures`)
- any non-spec file under `tests/` (helpers belong in `src/`)
- a literal id, price, limit or server message in a spec (use `@/domain`)
- an unused layer, actor or class added "for later"
