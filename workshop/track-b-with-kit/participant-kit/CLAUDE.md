# Bearstore API tests (workshop kit)

- Target: https://bearstore-testsite.smartbear.com (SmartStore). No documented API: the HTTP traffic behind the UI is the API.
- API tests only: Playwright Test with the `request` fixture. No `page`, no UI tests.
- Layout: agents, commands, skills and rules under `.claude/`; QA artifacts under `qa/workshop/<slug>/`; tests in `tests/<slug>.api.spec.ts` (one file per slice, helpers at its top).
- Discovery uses a VISIBLE browser through `playwright-cli` (`open --headed`, one named session per agent `-s=qa-<unit>`), then replays requests with curl. Never headless, never curl-only.
- Shared public host: modest volume (2 workers, no retries), a unique User-Agent per test (the host keys a guest cart by IP + User-Agent), no orders, no new accounts.
- Test titles start with a use-case ID (`UC-CART-01: ...`). Assertion rules: `.claude/rules/assertion-rules.md`. Secrets only from env vars (`.env`, copy `.env.example`), never in files.
- Run: `npx playwright test`. Workshop cycle: `/qa-workshop <narrow slice>` (default: cart manipulation). Fallback discovery data: `qa/workshop/cart/fallback/`.
- Map it: `/qa-workshop` has a Map it step after Gate 1: it exports, runs newman and starts Swagger; ideas go to `qa/workshop/<slug>/01-discovery/ideas.md`.
- Exports: `npm run export:postman -- --input <endpoints.json>`, `npm run export:openapi -- --input <endpoints.json>`, `npm run swagger`.
