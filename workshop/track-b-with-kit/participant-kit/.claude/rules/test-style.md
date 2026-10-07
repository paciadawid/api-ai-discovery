---
paths:
  - "tests/**/*.ts"
---

# Test style: behaviours, not actions

A test reads as a short story a product owner could confirm. Anything mechanical is hidden in an actor, a matcher or a parser (see `framework-architecture.md`). `npm run lint:framework` enforces the checkable parts.

1. **Title states the behaviour and the outcome**, prefixed by the use-case ID:
   `UC-<AREA>-<NN>: repeating the same request twice updates the existing record instead of creating a second one`.
   Not `UC-<AREA>-<NN>: POST twice` and not `test create`. The lint requires `UC-<AREA>-<NN>: ` followed by text.
2. **`test.describe` names the situation or capability** ("A user with one saved item"), not the endpoint or the file.
3. **Arrange / Act / Assert, separated by blank lines.** Arrange = the actor's `has...` Given steps (in `test.beforeEach` when several tests share them). Act = one actor verb, then read the outcome through the actor's observation methods. Assert = `expect(...)` on the outcome.
4. **One behaviour per test.** If the title needs "and" twice, split it. Teardown is never written in a spec: no `try/finally`, no `afterEach` cleanup; the fixture cleans up.
5. **No raw HTTP, no parsing, no regex over HTML, no JSON plumbing, no `process.env`** in a spec. If you need one, add an actor method, a parser in `src/domain/` or a matcher first.
6. **Domain vocabulary and no magic values.** Ids, prices, limits and server messages come from `@/domain/*` constants, never as literals in a spec. Expected values are computed from the input, not copied from a response.
7. **Matchers over raw status checks**: assert the business outcome through a matcher, not `expect(reply.status).toBe(200)` alone. Add a message argument that names the business fact (`expect(state, 'the item is gone despite the error')`). The same assertion in two specs becomes a matcher in `src/matchers/index.ts`.
8. **Parametrise with data tables**, not copy-paste: an array of rows and a `for` loop generating one titled test per row (each title still starts with its UC id).
9. **Known application defects** keep the test asserting the OBSERVED behaviour (exact status and message) and carry `{ tag: '@known-issue', annotation: { type: 'issue', description: '<id>: ...' } }`. They live in their own spec file and Playwright project, outside the pass/fail gate. Never `test.skip`, `fixme` or a weakened assertion to get green.
10. **Independence**: no ordering, no shared mutable state, no fixed sleeps, no `.only`. Every test gets its own actor from a fixture.
11. **Short specs, kebab-case files**: `tests/<area>/<capability>.api.spec.ts`. One spec per capability, NOT one file per slice. If a file passes about 150 lines, split it by capability.
12. Import only `{ test, expect } from '@/fixtures'` plus `@/domain/*` constants. Never `@playwright/test`. Nothing but `*.api.spec.ts` files under `tests/`.

Quirks of the target (required headers, odd status codes, encoding) live in `src/api` and `src/domain`, never in specs.
