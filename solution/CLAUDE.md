# Bearstore API test framework

- API tests only: Playwright Test with the `request` fixture. No `page`/`browser`, no UI tests.
- Target: https://bearstore-testsite.smartbear.com (SmartStore). It has no documented API; the HTTP traffic behind the UI is the API.
- Layout: layered framework in `src/` (`config`, `api`, `domain`, `actors`, `matchers`, `fixtures`), behaviour specs in `tests/<area>/<capability>.api.spec.ts`, QA artifacts in `qa/` (see `/qa-cycle`), exporters in `scripts/`, generated docs in `exports/` (regenerable, do not hand-edit). There is no `tests/support/`: anything reusable belongs in `src/`, and `tests/` holds only spec files (enforced by `npm run lint:framework`).
- Framework rules: `.claude/rules/` (architecture, test style, secrets) and skill `api-test-framework`. Specs import `{ test, expect } from '@/fixtures'`, contain behaviours only (no raw HTTP/parsing), and use fixture teardown instead of manual cleanup. `npm run verify` (typecheck + `scripts/check-framework.mjs`) must pass.
- Test titles start with a use-case ID (`UC-AUTH-01: ...`); map them in `qa/04-coverage.md`.
- Credentials come from `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` via `.env` (gitignored; copy `.env.example`), read only in `src/config/env.ts`; never hard-code or log them.
- Run: `npm test`; checks: `npm run verify`.
- Discovery drives a visible browser via `playwright-cli` (dev dependency) through Bash, one named session per agent (`-s=qa-<unit>`), always `open --headed`. Never run discovery headless or with curl alone.
- Discovery output (`qa/01-discovery/endpoints.json`) feeds two exporters (skills `discovery-to-postman`, `discovery-to-swagger`):
  - `npm run export:postman` -> `exports/postman/` (collection v2.1 + environment)
  - `npm run export:openapi` -> `exports/openapi/openapi.yaml`; `npm run swagger` serves it with Swagger UI and a proxy on http://localhost:3000
  - Both accept `--input <endpoints.json>`; secrets are never written unless `--with-secrets` (Postman).
- Workshop mode: `/qa-workshop [narrow scope]` (default: cart manipulation) runs a time-boxed cycle under `qa/workshop/<slug>/` (2-3 parallel headed units, max 12 use cases designed, max 5 automated; fits the 105-minute workshop, two tracks plus overview in `../workshop/README.md`; this `solution/` project is the demo). Pre-baked cart data for a live-demo fallback: `qa/workshop/cart/fallback/` (made with `node scripts/extract-scope.mjs --match '^EP-CART-' --out <dir>`).
