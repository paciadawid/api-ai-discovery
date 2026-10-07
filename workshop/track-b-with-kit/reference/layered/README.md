# Layered answer key and fallback (facilitator only)

A finished example of the framework that the participants' AI builds from scratch in Track B: `src/` (config, api, domain, actors, matchers, fixtures) and `tests/` for the cart slice. It was produced by the agentic flow itself (`/qa-workshop` on the cart, then the writer, debugger and sabotage agents), so it is what a good run looks like, not a hand-made ideal.

**Never hand this folder to participants.** They get `participant-kit/`, which ships tooling only (no `src/`, empty `tests/`). Show this one only as the facilitator, or use it as the fallback below.

## Use it as the fallback

On a kit (a participant's, or your own fresh copy) after `npm ci`:

```bash
cp -R /path/to/track-b-with-kit/reference/layered/src .
cp -R /path/to/track-b-with-kit/reference/layered/tests .
cp /path/to/track-b-with-kit/reference/layered/playwright.config.ts .
npm run verify          # typecheck + framework lint: green, offline
npx playwright test     # live: gate, cart, known-issues, spikes, unit
```

Copy over a kit whose `tests/` is empty (or delete what the pair wrote first); the config is replaced too, because it defines the projects below. The `@/` import alias comes from the kit's own `tsconfig.json`. Needs the shared host for everything except `unit`.

## Layout

| Path | What | Project |
|---|---|---|
| `src/config/env.ts` | base URL and credentials, read lazily | |
| `src/api/` | endpoint calls (`cart.api.ts`, `store-api.ts`), `http-client.ts`, reply types; assert nothing | |
| `src/domain/` | parsers (`cart-page.ts`), money, products, server messages, sample pages | |
| `src/actors/shopper.ts` | business verbs: Given (`has...`), When, Then (observations) | |
| `src/matchers/index.ts` | custom matchers that print the actual reply or state | |
| `src/fixtures/` | the `shopper` fixture (own User-Agent, cookie jar and cart, emptied in `finally`) and a stub store for the unit tests | |
| `tests/cart/visitor-isolation.api.spec.ts` | gate: two guests must not see each other's cart (1 test) | `gate` |
| `tests/cart/{adding-to-cart,cart-counters,changing-quantity,removing-from-cart}.api.spec.ts` | the cart behaviours (9 tests), skipped when the gate fails | `cart` |
| `tests/cart/known-issues.api.spec.ts` | `@known-issue`, observed defects pinned (1 test) | `known-issues` |
| `tests/cart/voucher-precondition-spike.api.spec.ts` | a spike, outside the gate (1 test) | `spikes` |
| `tests/unit/*.api.spec.ts` | offline tests of the framework itself: cart-page parser, matchers, actor preconditions (16 tests) | `unit` |

## Commands

```bash
npm run verify                          # offline, about 5 s
npx playwright test --project=unit      # offline, 16 passed, under 1 s
npx playwright test                     # everything, live host, shared: 2 workers
npx playwright test --project=gate --project=cart   # the pass/fail gate only
```

Last verified: `npm run verify` green and the 16 unit tests pass on a fresh kit with this folder copied over (checked offline when this README was written). The live projects were green when the reference was produced; re-run them on the day.
