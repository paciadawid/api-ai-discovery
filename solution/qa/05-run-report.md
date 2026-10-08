# Run report: cart (Bearstore / SmartStore), stages 5 to 7

Input: 5 automated use cases under `tests/cart/` with the bootstrapped `src/` framework (2 workers, no retries, default QA root `qa/`). Written by the API test debugger, updated by the orchestrator after sabotage and strengthening (subagents cannot write under `qa/`). Every test in the kit is a live use-case test; the strengthening round added assertions and a stricter teardown, and no offline tests.

## 1. Verdict

All 5 of 5 live gate tests pass and none of the 5 selected use cases is red; no application bugs found. Sabotage killed 14 of 24 mutations on the first run; after strengthening 20 of 24 are killed and the 4 survivors are accepted as defensive guards no real reply can reach. One of five early suite runs started with 4 of 5 tests failing on a network-level error that did not come back in any later run (host-side flake, cause not confirmed).

## 2. Metrics

| Metric | Before | After |
|---|---|---|
| Gate tests passing (live `gate` + `cart` projects) | 1 / 5 (first run, host-side flake) | 5 / 5 |
| Use cases automated of selected | 5 / 5 | 5 / 5 |
| Application bugs (confirmed / candidates) | 0 / 0 | 0 / 0 |
| Sabotage mutations killed / survived | 14 / 10 (first run) | 20 / 4 |
| Sabotage survivors accepted as defensive | 0 | 4 |

Suite runs: stage 5, run 1: 1 passed, 4 failed; runs 2 to 5: 5 passed. After strengthening: 5 of 5 in 26.0 s (agent), 5 of 5 in 26.1 s and 27.8 s (orchestrator, before and after the last three assertions). `npm run verify` green: typecheck and framework check, 4 specs, 12 source files.

## 3. Results by area

| Area | Use cases selected | Automated | Passing | Failing | UC IDs |
|---|---|---|---|---|---|
| Isolation gate | 1 | 1 | 1 | 0 | UC-CART-01 |
| Cart manipulation | 4 | 4 | 4 | 0 | UC-CART-02, UC-CART-03, UC-CART-21, UC-CART-29 |

## 4. What was improved in this session

### Framework

| Weakness | Change | Layer/file | Evidence it is protected |
|---|---|---|---|
| Teardown could silently leave lines in the cart (S24): the fixture's `finally` only logged a failed cleanup | `emptiesCart` deletes every line; `withCleanup` re-reads the cart and asserts it is empty, fails a passing test if cleanup fails, and when the test body failed the body's error is the one thrown (cleanup failure only logged) | `src/actors/guest.ts`, `src/fixtures/index.ts` | S24 killed by UC-CART-02 at the teardown proof |
| A failed `.not` matcher printed the message of the positive case | Four matchers print "did not expect" / "not expected" when negated | `src/matchers/index.ts` | Messages read correctly in the mutation runs |

### Test strength

| Weakness | Change | Layer/file | Evidence it is protected |
|---|---|---|---|
| The isolation spec repeated the number of units (2) as a bare literal in four places | One constant `GUEST_UNITS` feeds the setup and every expectation | `tests/cart/isolation.api.spec.ts` | `npm run verify` green; UC-CART-01 green in every later run |
| Matchers never shown to fail (S16 to S20) | Live negative controls on real replies (`.not.toBeAccepted`, `.not.toBeRefusedWith` with another message, `.not.toHaveExactlyTheLines` with a wrong id and with the old quantity, `.not.toConfirmRemoval` with a wrong count) and plain `expect`s on the line id, the refusal message and `cartItemCount` | `tests/cart/isolation.api.spec.ts`, `adding.api.spec.ts`, `changing-quantity.api.spec.ts`, `removing.api.spec.ts` | S16 killed by UC-CART-01; S17, S18 by UC-CART-21; S19 by UC-CART-01; S20 by UC-CART-29 |

No assertion was weakened, removed or skipped; no retries or sleeps were added.

### Test infrastructure

Nothing changed (projects `gate` and `cart`).

### Process

| Weakness | Change | Layer/file | Evidence it is protected |
|---|---|---|---|
| The first suite run failed 4 tests with a network-level error and only the tail was captured | Every later run was saved to a file so a failure can be read from its head | Session practice, no code | Later runs all passed; the next failure will leave the full error |
| The first debugging attempt and the first strengthening attempt each ended without a report | Re-run with an explicit "final message must be the report" requirement and an instruction to inspect partial state first | Orchestration | The re-runs delivered reports that matched the working tree |
| The strengthening and sabotage instructions steered towards offline tests of framework classes | Rewritten: strengthening improves the code or the live tests; a guard no real reply can reach is accepted as defensive | `.claude/agents/`, `.claude/rules/framework-architecture.md`, `CLAUDE.md`, `.claude/commands/qa-cycle.md` | The second round used no stubs |

## 5. Application bugs

No application bug found. A direct `curl` replay of the header counter call returned HTTP 200 three times in a row (0.7 to 0.8 s each). Known-issue candidates (quantity 0 deletes the line but answers HTTP 500; malformed numbers answer 502 HTML) are in the discovery notes and are not yet tests.

## 6. Flaky or unresolved

- **One flaky suite run (host-side, not reproduced).** Stage 5, run 1: the isolation test passed, then all 4 cart tests failed at their first request (the body-less POST for the header counter, `src/api/http-client.ts:15`, reached through `Guest.hasAnEmptyCart`). The call log shows the request and no response, which points at a dropped or reset connection to the shared host. Not seen in later runs (4 in stage 5, 4 after strengthening, plus the mutation runs). Do not add retries or sleeps; a fixture-level single reconnect for setup calls only is the first option, and only after the cause is confirmed.
- **New risk from the stricter teardown.** A host hiccup while emptying the cart now fails the test where it used to print a warning, and each guest costs one extra `GET /cart`. No flakiness in the live runs after the change, but the earlier dropped-connection flake could now also show up at teardown.
- **Four sabotage survivors accepted as defensive (S04, S05, S21, S22).** Guards no real reply can reach; no test covers them, by decision (no tests of framework classes).
- **Sabotage is a closed set.** The new assertions were aimed at the known mutations; a fresh mutation round would be the honest next check. S01 to S15 were not re-run after strengthening.

## 7. Coverage gaps

- 53 of the 58 use cases are deferred by user decision (limit to 5): add validation and limits (UC-CART-04 to 17), cart view and counter semantics (UC-CART-18 to 20), update in a multi-line cart and limits (UC-CART-22 to 28), removal edge cases (UC-CART-30 to 36), codes, totals and shipping, currency (UC-CART-37 to 58). Known-issue candidates (UC-CART-26, 27, 35) have no test and no `known-issue` project yet.
- Line ownership is covered only by the delete half inside UC-CART-01; the update of a foreign or unknown line (UC-CART-28) and UC-CART-34 are deferred.
- Every live test uses one product (Titleist SM6) for the cart arithmetic; the tier price of product 14 is avoided on purpose (quantity 1 only).
- Discount and gift card success paths were never observed (no valid code), so they are not covered.

## Appendix A: bug reproductions

None: no application bug found.

## Appendix B: per-failure details

**Stage 5, run 1, UC-CART-02, 03, 21, 29 (4 tests).** Classification: ENVIRONMENT/FLAKE. All four failed at the first call of `Guest.hasAnEmptyCart`, `POST /shoppingcart/cartsummary?cart=True` with an empty body, from `src/api/http-client.ts:15`. Evidence: the request (content-length 0, content-type application/octet-stream) is in the call log, no response is; the same call replayed with `curl -i` returns 200; later runs pass unchanged. Root cause not confirmed. No code was changed for it.

## Appendix C: feature-specific observations

- The host keys a guest cart by IP plus User-Agent; every test gets a fresh User-Agent from `userAgentFor`, so the 5 live tests run in parallel with 2 workers without sharing a cart.
- A full run of the 5 live tests takes about 26 seconds.
- The delete reply `cartItemCount` counts lines, the header counter `CartItemsCount` counts units; UC-CART-29 asserts each by its own meaning.
