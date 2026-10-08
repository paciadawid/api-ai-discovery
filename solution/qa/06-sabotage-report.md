# Sabotage report: cart (Bearstore / SmartStore), stage 6

Input: the 5 automated use cases (UC-CART-01, 02, 03, 21, 29) over the layered `src/`. Two passes: the first on all 24 mutations (14 killed, 10 survivors), the second on the 10 survivors plus the mutation of a changed file that was a first-run kill (S23). All mutations were made in a throw-away copy of the kit (`/tmp/kit-sabotage-*`, deleted); the real `src/` and `tests/` were never edited. Every test in the kit is a live use-case test: the strengthening round improved framework code and live tests only, and added no offline tests of framework classes.

## 1. Verdict

20 of 24 mutations killed after the strengthening round (14 of 24 on the first run). Four survivors remain and are accepted as DEFENSIVE: guards that no real reply of the host can trigger (S04, S05, S21, S22). Limit: the 6 newly killed mutations (S16 to S20, S24) were aimed at by assertions added after the first run, so 20 of 24 shows that the known gaps are closed, not that no other weakness exists.

## 2. Metrics

| Metric | First run | After strengthening | History |
|---|---|---|---|
| Mutations run | 24 | 24 (13 re-run) | same 24 |
| Killed | 14 | 20 | +6 |
| Survived, real gap | 10 | 0 | -10 |
| Survived, defensive | 0 | 4 | +4 |
| Survived, equivalent | 0 | 0 | 0 |

- The first run found 10 survivors and classed them all as real gaps. The second pass judged four of them DEFENSIVE (see section 4).
- The first-run kills in files the strengthening did not change (S01 to S15 in `src/domain` and `src/api`) were not re-run; they rest on the first run.
- No mutation was partly killed.

Score: 14 / 24 = 58 % first run, 20 / 24 = 83 % after. By layer after: domain 5 of 7 (S04, S05 accepted), api 8 of 8, matchers 5 of 5, actors 0 of 2 (S21, S22 accepted), fixtures 2 of 2.

## 3. Mutation table

Baseline in the copy: `npm run verify` green, suite 5 of 5 green. Each mutation: `src/` restored from a pristine backup and `diff -r` clean before the next one. Live runs: `--workers=2 --retries=0 --no-deps -g "<UC id>"`, one run per mutation.

| id | mutation class | what was broken | file and layer | result | killed by |
|---|---|---|---|---|---|
| S01 | parser field misread | cart parser reads the quantity from the line-id capture | `src/domain/cart-page.ts` (domain) | KILLED | UC-CART-02 |
| S02 | parser field misread | cart parser swaps unit price and line total | `src/domain/cart-page.ts` (domain) | KILLED | UC-CART-02 |
| S03 | parser finds nothing | cart parser finds no remove links, so no lines | `src/domain/cart-page.ts` (domain) | KILLED | UC-CART-02 |
| S04 | sample/test-data guard removed | `parseMoney` returns 0 on an unparsable amount instead of throwing | `src/domain/pricing.ts` (domain) | SURVIVED (defensive) | none |
| S05 | sample/test-data guard removed | the "rows on the page = lines parsed" guard in `parseCartPage` disabled | `src/domain/cart-page.ts` (domain) | SURVIVED (defensive) | none |
| S06 | derived amount off | `unitsIn` (sum of quantities) off by one | `src/domain/pricing.ts` (domain) | KILLED | UC-CART-02 |
| S07 | derived amount off | `subtotalOf` off by one cent | `src/domain/pricing.ts` (domain) | KILLED | UC-CART-02 |
| S08 | request value altered | add-to-cart sends quantity + 1 | `src/api/cart.api.ts` (api) | KILLED | UC-CART-02 |
| S09 | request value altered | update-item always sends newQuantity = 1 | `src/api/cart.api.ts` (api) | KILLED | UC-CART-21 |
| S10 | wrong target/id | delete-item sends cartItemId = line id + 1 | `src/api/cart.api.ts` (api) | KILLED | UC-CART-29 |
| S11 | wrong target/id | add-to-cart posts to cart type 2 (wishlist) instead of 1 | `src/api/cart.api.ts` (api) | KILLED | UC-CART-02 |
| S12 | wrong target/id | counters call drops `?cart=True` | `src/api/cart.api.ts` (api) | KILLED | UC-CART-02 |
| S13 | reply flag forced | every JSON reply parsed with `success: true` | `src/api/http-client.ts` (api) | KILLED | UC-CART-01 |
| S14 | reply content altered | `cartItemCount` dropped from every JSON reply | `src/api/http-client.ts` (api) | KILLED | UC-CART-29 |
| S15 | reply content altered | `newItemPrice` replaced by the `SubTotal` value | `src/api/http-client.ts` (api) | KILLED | UC-CART-21 |
| S16 | matcher constant-true | `toBeAccepted` always passes | `src/matchers/index.ts` (matchers) | KILLED (first run: SURVIVED) | UC-CART-01 (`.not.toBeAccepted()` on the real refusal) |
| S17 | matcher ignores one field | `toHaveExactlyTheLines` stops comparing the line id | `src/matchers/index.ts` (matchers) | KILLED (first run: SURVIVED) | UC-CART-21 (`.not.toHaveExactlyTheLines` with a wrong line id) |
| S18 | list matcher checks only part | `toHaveExactlyTheLines` checks only the number of lines | `src/matchers/index.ts` (matchers) | KILLED (first run: SURVIVED) | UC-CART-21 (`.not.toHaveExactlyTheLines` with the old quantity) |
| S19 | matcher ignores one field | `toBeRefusedWith` stops comparing the message | `src/matchers/index.ts` (matchers) | KILLED (first run: SURVIVED) | UC-CART-01 (`.not.toBeRefusedWith` with another message) |
| S20 | matcher ignores one field | `toConfirmRemoval` stops comparing `cartItemCount` | `src/matchers/index.ts` (matchers) | KILLED (first run: SURVIVED) | UC-CART-29 (`.not.toConfirmRemoval` with a wrong count) |
| S21 | precondition no-op or weakened | `Guest.hasAnEmptyCart` reads counter and cart but asserts nothing | `src/actors/guest.ts` (actors) | SURVIVED (defensive) | none |
| S22 | precondition no-op or weakened | `Guest.hasInCart` stops asserting the read-back quantity | `src/actors/guest.ts` (actors) | SURVIVED (defensive) | none |
| S23 | shared identity between actors | `userAgentFor` returns one User-Agent per test, so both guests share a cart | `src/domain/identity.ts` (fixtures) | KILLED | UC-CART-01 |
| S24 | teardown no-op | `Guest.emptiesCart` (called by the fixture's `finally`) does nothing | `src/actors/guest.ts` (fixtures) | KILLED (first run: SURVIVED) | UC-CART-02, at the teardown proof in `withCleanup` |

Notes on individual runs
- S16, S18, S23, S24 were run by an independent agent; S17, S19, S20 survived that run (the specs asserted the same value twice, so the matcher's own check was redundant) and were killed in a re-run by the orchestrator after one `.not` negative control each was added to the specs. Between the agent's run and the re-run only the failure messages of `toBeRefusedWith` and `toConfirmRemoval` and those three assertions changed; the full suite was green (5 of 5) after that change.
- S24 was run on UC-CART-02 only (the lightest test). Every live test that leaves a line in a cart should fail the same way; that was not run for the others.
- Extra variant S24b (not counted in the 24): `emptiesCart` works, the proof in `withCleanup` is deleted. It survives, and rightly: the end state of the host is identical, and the proof only matters when `emptiesCart` itself is broken, which S24 shows is caught.

## 4. Survivors

- **S21 (`hasAnEmptyCart` asserts nothing): DEFENSIVE.** Every actor has its own unique User-Agent, so its cart is empty by construction. The guard protects against an isolation break, which UC-CART-01 and S23 already catch. A live test cannot reach it; feeding it a non-empty cart would be an offline test of an actor, which is not allowed.
- **S22 (`hasInCart` does not read back the quantity): DEFENSIVE.** On a fresh cart the host creates the line with exactly the quantity sent, and every spec that uses the Given asserts the same quantities again afterwards.
- **S04 (`parseMoney` returns 0 instead of throwing): DEFENSIVE.** No real reply carries an unparsable amount. Any amount parsed as 0 against a non-zero expected price is caught by the matchers.
- **S05 (rows-versus-lines guard off): DEFENSIVE.** The guard fires only on a cart row without a remove link, which this host does not render for these products. It stays as the loud failure for a changed page layout.

If the host ever changes its page or replies, these four guards are the ones that would speak first. They are not covered by any test, and the report says so rather than adding a test whose only purpose is to kill the mutation.

## 5. Before/after

| Metric | First run | Second pass |
|---|---|---|
| Killed of 24 | 14 | 20 |
| Survivors | 10 (S04, S05, S16 to S22, S24) | 4 (S04, S05, S21, S22), all DEFENSIVE |
| Live tests | 5 | 5 (extra assertions in 4 of them) |
| Offline tests | 0 | 0 (none allowed) |

Moved from SURVIVED to KILLED: S16, S17, S18, S19, S20, S24.

## 6. Housekeeping

- Copies deleted (`node_modules` symlink unlinked first); the real `node_modules` is intact. `git status --short` and a hash listing of `src/`, `tests/` and `playwright.config.ts` were identical before and after the independent agent's run; the orchestrator's re-run of S17, S19, S20 used its own copy, deleted afterwards.
- Live runs in the second pass: 13 by the agent (1 baseline of 5 tests and 12 mutation runs) and 4 by the orchestrator (1 baseline, 3 mutation runs); 2 workers, no retries, no loops; roughly 400 HTTP requests to the shared host (estimate).
- Left behind on the host: S24 left one line (3 x Titleist SM6 Tour Chrome) in the cart of one test guest, under a random one-use User-Agent that cannot be reused; the host expires guest carts by itself. The other mutations left nothing that was seen (the host was not read afterwards).
- First-run leftovers (S03, S10, S11, S24) are in the same kind of one-use guest carts.
