# Strengthen report: cart (Bearstore / SmartStore), stage 7

One strengthening round. Input: the 10 survivors of the first sabotage run (`06-sabotage-report.md`). Rule of the round: improve the framework code or the live tests; add no offline or unit tests of framework classes. A first attempt used offline tests and a stubbed guest; it was withdrawn and replaced by this round (its files were moved out of the kit). The debugger agent in strengthening mode changed the kit; an independent sabotage agent re-tested; the orchestrator added three small assertions and re-tested those. Written by the orchestrator from the agents' reports and checked against the working tree (agents cannot write under `qa/`).

## 1. Verdict

The round closed 6 of the 10 survivors (S16 to S20, S24) with live assertions and one stricter teardown, and left 4 as DEFENSIVE (S04, S05, S21, S22): guards no real reply can reach. 20 of 24 mutations are now killed (14 before). No test was added for a framework class; every new check runs in a live use-case test against the real host.

## 2. Before and after

| Metric | Before | After |
|---|---|---|
| Mutations killed (of 24) | 14 | 20 |
| Survivors, real gap | 10 | 0 |
| Survivors, accepted as defensive | 0 | 4 |
| Live tests | 5 | 5 |
| Live assertions added | 0 | 9 |
| Offline tests | 0 | 0 |
| Live suite | 5 of 5 | 5 of 5 |

## 3. Gaps closed

| Group | Mutations | Gap | Fix |
|---|---|---|---|
| Matcher always passes | S16 | With a correct server a matcher only ever sees values that should pass, so a matcher that always passes was invisible. | UC-CART-01 now also asserts `.not.toBeAccepted()` on the refusal the host really sends for a foreign line removal. |
| Matcher ignores a field | S17, S19, S20 | Each spec checked the value once through the matcher, or twice in a way that left the matcher's own check redundant, so dropping a field from the matcher changed nothing. | One live negative control per field on the real reply: a wrong line id (UC-CART-21), another message (UC-CART-01), a wrong count of lines left (UC-CART-29), each expected to be rejected. |
| List matcher checks only the length | S18 | A cart with the right number of lines but the wrong content would have passed. | UC-CART-21 asserts the real cart (1 line, quantity 3) does not match the old state (quantity 1). |
| Teardown no-op | S24 | A cart left behind after a test only produced a console warning and the test stayed green. | The fixture now proves the cart is empty after `emptiesCart`; a teardown that deletes nothing fails the test it belongs to. |
| Guards no real reply can reach | S04, S05, S21, S22 | `parseMoney` returning 0 on unreadable text, the rows-versus-lines guard, `hasAnEmptyCart` asserting nothing, `hasInCart` not reading back the quantity. | None, on purpose: DEFENSIVE (see section 5). |

## 4. What changed in the kit

Every change is in `src/` or in a live spec. Not changed: the parsers, the request layer (`src/api`) and the actors' preconditions.

### Test strength

| Weakness | Change | File | Evidence |
|---|---|---|---|
| A matcher that always passes was never shown to fail (S16) | Negative control: the real refusal is not accepted; the refusal message is also asserted with a plain `toBe` | `tests/cart/isolation.api.spec.ts` (UC-CART-01) | S16 killed by UC-CART-01 |
| The refusal message check hid a matcher that ignores the message (S19) | `.not.toBeRefusedWith` with another message on the real refusal | `tests/cart/isolation.api.spec.ts` (UC-CART-01) | S19 killed by UC-CART-01 |
| Line ids were compared only inside the matcher (S17) | Plain `expect` on the line id after an add-again (UC-CART-03) and after a quantity change (UC-CART-21), and a `.not` with a wrong id | `tests/cart/adding.api.spec.ts`, `tests/cart/changing-quantity.api.spec.ts` | S17 killed by UC-CART-21 |
| A matcher that only counts lines would pass (S18) | `.not.toHaveExactlyTheLines` with the old quantity 1 | `tests/cart/changing-quantity.api.spec.ts` (UC-CART-21) | S18 killed by UC-CART-21 |
| `cartItemCount` was compared only inside the matcher (S20) | Plain `expect` on `cartItemCount` (lines left, not units) and `.not.toConfirmRemoval` with a wrong count | `tests/cart/removing.api.spec.ts` (UC-CART-29) | S20 killed by UC-CART-29 |

### Framework

| Weakness | Change | File | Evidence |
|---|---|---|---|
| A cart left behind after a test only produced a console warning (S24) | `emptiesCart` only deletes every line; `withCleanup` then reads the cart again and asserts it holds no line. A failed cleanup fails a passing test; when the test body failed, the body's error is the one thrown and the cleanup failure is only logged. `withCleanup` is no longer exported | `src/actors/guest.ts`, `src/fixtures/index.ts` | S24 killed by UC-CART-02 at the teardown proof; the live suite is green after the change |
| A failed `.not` assertion printed a message written for the positive case | `toBeAccepted`, `toHaveExactlyTheLines`, `toBeRefusedWith` and `toConfirmRemoval` print "did not expect" or "not expected" when negated | `src/matchers/index.ts` | The messages seen in the mutation runs read correctly |

### Test infrastructure

Nothing changed. The offline project, the cart-page HTML builder and the in-memory guest of the withdrawn first attempt were removed from the kit; `playwright.config.ts` has the projects `gate` and `cart` only, and `npm run verify` is green (4 specs, 12 source files).

### Process

| Weakness | Change | File | Evidence |
|---|---|---|---|
| The strengthening and sabotage instructions steered towards offline tests (a matcher "that needs its own offline test", "a test with a stub or a spy") | Rewritten: strengthening improves the code or the live tests, never adds tests of framework classes; a survivor no real reply can reach is accepted as DEFENSIVE with a reason; the sabotage tester no longer proposes offline fixes and uses the verdicts REAL GAP, DEFENSIVE, EQUIVALENT | `.claude/agents/qa-api-test-debugger.md`, `.claude/agents/qa-sabotage-tester.md`, `.claude/rules/framework-architecture.md`, `CLAUDE.md`, `.claude/commands/qa-cycle.md`, `README.md`, `stage-cards.md` | The second round followed the rules without stubs |

## 5. Not fixed, risks and limits

- **S21, S22, S04, S05 stay uncovered (DEFENSIVE).** No real reply of the host can trigger them, and any test that does is a test of the framework class itself, which this kit does not allow. If the host ever changes its page or its replies, these guards are what would speak first.
- **The negative controls are checks of the matchers through real replies.** They stay meaningful only while UC-CART-01 keeps producing a refusal and UC-CART-21 a quantity-3 line. They are the closest thing to a test of a matcher that this kit allows; if that is still more than you want, the alternative is to drop the field from the matcher and keep only the plain assertions.
- **20 of 24 covers the known mutations only.** The new assertions were aimed at known mutations; a round with fresh mutation ideas is the honest next check.
- **S01 to S15 were not re-run** (their files were not changed); they stay counted from the first run.
- **S24 was proven on UC-CART-02 only.** Every test that leaves a line in a cart should fail the same way; not run for the others.
- **The teardown is stricter live.** A host hiccup during cleanup now fails the test where it used to print a warning, and each guest costs one extra `GET /cart`. No flakiness in the live runs after the change (5 of 5 three times), but the earlier one-in-five dropped-connection flake could now also show up at teardown.
- **The 53 use cases deferred by the 5-case limit** and the quantity-0 and malformed-number known issues are not part of this round.

## 6. How it was checked

- The strengthening agent ran `npm run verify` (green) and one live suite run (5 of 5 in 26.0 s). It did not run sabotage.
- An independent sabotage agent re-tested S04, S05, S16 to S24 and the extra variant S24b in a fresh throw-away copy: baseline 5 of 5 green, one live run per mutation, `src/` restored and diffed clean after each, hashes of `src/`, `tests/` and `playwright.config.ts` identical before and after. Result: S16, S18, S24 killed; S17, S19, S20 survived; S04, S05, S21, S22 survived.
- The orchestrator added the three negative controls for S17, S19, S20, ran `npm run verify` (green) and the live suite (5 of 5 in 26.1 s), and re-ran those three mutations in its own throw-away copy (baseline 5 of 5 first, one live run each, `src/` restored and diffed clean): S17 killed by UC-CART-21, S19 by UC-CART-01, S20 by UC-CART-29.
- The earlier offline attempt is backed up outside the kit (`/tmp/offline-backup-*`) and is not part of this report's numbers.
