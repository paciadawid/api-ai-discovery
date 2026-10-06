# Bearstore API tests (workshop starter)

- Target: https://bearstore-testsite.smartbear.com (SmartStore). No documented API: the HTTP traffic behind the UI is the API.
- API tests only: Playwright Test with the `request` fixture. No `page`, no UI tests.
- Discovery uses a VISIBLE browser through `playwright-cli` (`open --headed`), then replays requests with curl. Never headless, never curl-only.
- Shared public host: modest volume, a unique User-Agent per test (the host keys a guest cart by IP + User-Agent), no orders, no new accounts.
- Test titles start with a use-case ID (`CART-01: ...`). Secrets only from env vars, never in files.
- Run: `npx playwright test`
- Exports: `npm run export:postman -- --input <endpoints.json>`, `npm run export:openapi -- --input <endpoints.json>`, `npm run swagger`. Never export secrets.
