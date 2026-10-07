# Bearstore API tests (workshop kit)

- Target: https://bearstore-testsite.smartbear.com (SmartStore). No documented API: the HTTP traffic behind the UI is the API.
- API tests only: Playwright Test with the `request` fixture. No `page`, no UI tests.
- Layout: agents, commands, skills and rules under `.claude/`; QA artifacts under `qa/workshop/<slug>/`; a layered Playwright framework that the test writer CREATES on the first run: `src/` (`api` endpoint calls, `domain` parsers/constants, `actors` one per kind of user, `matchers`, `fixtures`, `config/env.ts`) and one spec per capability in `tests/<area>/<capability>.api.spec.ts` (behaviours only). Rules: `.claude/rules/framework-architecture.md`, `test-style.md`.
- Discovery uses a VISIBLE browser through `playwright-cli` (`open --headed`, one named session per agent `-s=qa-<unit>`), then replays requests with curl. Never headless, never curl-only.
- Shared public host: modest volume (2 workers, no retries), a unique User-Agent per test (the host keys a guest cart by IP + User-Agent), no orders, no new accounts.
- Test titles start with a use-case ID (`UC-CART-01: ...`). Assertion rules: `.claude/rules/assertion-rules.md`. Secrets only from env vars (`.env`, copy `.env.example`), never in files.
- Run: `npm install` once first (a fresh hand-out has no `node_modules`), then `npm run verify` (typecheck + framework lint) and `npx playwright test`. Workshop cycle: `/qa-cycle https://bearstore-testsite.smartbear.com <slice> limits: workshop` (default slice: cart manipulation; `/qa-workshop <slice>` is shorthand). Fallback discovery data: `qa/workshop/cart/fallback/`.
- Map it: `/qa-cycle` has a Map it step after Gate 1: it exports, runs newman and starts Swagger; ideas go to `qa/workshop/<slug>/01-discovery/ideas.md`.
- After every stage a page is rendered to `<root>/visuals/` with `node scripts/visualize.mjs <stage> --root <root>`; `index.html` links them all.
- Exports: `npm run export:postman -- --input <endpoints.json>`, `npm run export:openapi -- --input <endpoints.json>`, `npm run swagger`.

## Target-specific facts (the rules in `.claude/rules/` are target-independent; these are not)
- On the first run `src/` and `tests/<area>/` do not exist: the writer creates the layers (see the skill `writing-api-tests`, section Bootstrap). `npm run verify` is green on the empty kit.
- Quirks of the target, handled in `src/api` and `src/domain` only, never in a spec: a body-less POST needs `data: ''` (else HTTP 411); send `X-Requested-With: XMLHttpRequest`; business failures are HTTP 200 + `success:false`; cart line ids change when a line moves between cart and wishlist; the counters JSON has a `$type` field, so use `toMatchObject`. Anything else about the endpoints (parameters, units, limits, messages) is discovered in stage 1, not assumed.
- Guest isolation: the host keys a guest cart by IP + User-Agent. Every test therefore needs its own actor: a unique User-Agent, its own cookie jar and its own cart, created by a fixture and emptied in the fixture's `finally`. Prove this isolation first (two actors must not see each other's cart).
- Playwright projects: the kit's `playwright.config.ts` has none (`testDir ./tests`, `baseURL` from `BASE_URL`). When the cycle needs them, add them there: a `gate` project for the isolation check that the other projects depend on; separate projects for known-issue specs (`@known-issue`) and spikes, both outside the pass/fail gate; optionally an offline project for tests of the parser and matchers. Every spec must be matched by exactly one project.
- Credentials: `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` in `.env` (read only in `src/config/env.ts`, lazily). The default cart scope needs none.
