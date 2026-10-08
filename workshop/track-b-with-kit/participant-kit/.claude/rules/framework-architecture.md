---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
  - "playwright.config.ts"
---

# Framework architecture (layers)

Dependencies point down only. `npm run verify` (typecheck + `npm run lint:framework`) enforces the checkable parts. Run `npm install` once first: a fresh hand-out has no `node_modules`.

```
tests/<area>/<capability>.api.spec.ts   behaviours, nothing else
        |
src/fixtures   (test, expect)   creates the actors, owns setup + teardown
src/matchers   (expect.extend)  domain assertions
src/actors     (one per role)   business language: Given / When / Then, each wrapped in test.step
        |
src/api        (client, one class per area, Reply<T>, types)   one method per endpoint, no assertions
src/domain     (parsers, constants, money, messages)           pure TypeScript, no I/O
src/config     (env.ts)         the ONLY place that reads process.env
```

- **api/** knows URLs, headers, request bodies and the quirks of the target (required headers, body-less POSTs, redirect handling). Every call returns `Reply<T>` (`status` + `body`). It never asserts and has no business wording. A new endpoint is one method on the area's API class (or a new `<area>.api.ts` registered in the root API object); its JSON body type goes in `api/types.ts`.
- **domain/** turns HTML/JSON into typed objects (parsers), holds the test-data constants of the target, money/format helpers and the exact server messages. No I/O: unit-testable without a network. At runtime it does not import `@playwright/test` (`import type` only).
- **actors/** compose api calls into intent. `has...` = Given (also proves its precondition), present-tense verbs = When (return the raw `Reply`), observation methods = Then (return typed objects). Every Given/When is a `test.step` with a readable sentence. Actors never import fixtures. One actor class per kind of user, not per endpoint.
- **matchers/** hold every reusable assertion, registered with `expect.extend` and exported as `expect`. A check that appears in two specs becomes a matcher. The failure message shows the actual reply or state, so nobody has to open the raw response.
- **fixtures/** are the only place that creates request contexts and disposes them. A fixture-provided actor is brand new (own context, own session, own data) and is cleaned up in the fixture's `finally`, so cleanup also runs when the test fails.
- **config/env.ts** is the only module that reads `process.env`. Everything else imports `env` from `@/config/env`.

## Imports
- Specs import `{ test, expect }` from `@/fixtures`, and constants from `@/domain/*`. Never `@playwright/test`, `@/api`, `@/actors` or `process.env` in a spec.
- Use the `@/` alias for `src/` everywhere. No relative `../../src` imports from specs. Inside one folder of `src/` a relative `./x` import is fine.
- Only `playwright.config.ts` may import `./src/config/env` relatively.

## Rules of the road
- `tests/` holds only `tests/<area>/<capability>.api.spec.ts`. Any helper, constant or parser goes to `src/`.
- Do not add a layer, class or abstraction that nothing uses yet. Add an actor, API class or fixture when a use case needs it.
- Playwright projects are defined in `playwright.config.ts`. Every spec is matched by exactly one project; a spec in a new area folder needs its own project entry. Specs that must not count towards the pass/fail gate (known defects, spikes) get their own spec file and project.
- The facts of the current target (quirks, isolation, credentials, how to set up projects) are in the root `CLAUDE.md`, not here. On the first run `src/` does not exist: create the layers in the order of the skill `writing-api-tests`, section Bootstrap.

## Sabotage and strengthening improve the kit, they do not add tests of framework classes
- Every test in this kit is a live use-case test (`tests/<area>/<capability>.api.spec.ts`). No offline or unit tests of matchers, parsers, actors or fixtures, no stubbed or in-memory guests, no builders of fake pages or replies, no Playwright project that runs without the network, no test-only code under `src/`.
- A sabotage survivor is closed in one of three ways: (1) strengthen a live test (a positive control, a plain `expect` next to a matcher, a value computed from the input); (2) improve the framework code (make a guard throw, make a teardown prove its result, simplify a matcher so it cannot ignore a field, or delete dead code); (3) accept it as DEFENSIVE when the mutated code is a guard no real reply can reach, and say so in the report.
- Never kill a mutation with a test written only for that mutation. "All mutations killed" must not be reached by tests that exist for the mutations, so an honest DEFENSIVE survivor is preferred.
