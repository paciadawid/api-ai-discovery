# Toolshop API tests: rules for the AI agent

Any AI coding agent working in this repo (Copilot, Cursor, Cline, Augment, Claude Code, ...) follows these rules. Humans too. This file is the handoff: what you learn about the API goes in here, so the agent does not have to guess.

## What we test
- Target: https://api.practicesoftwaretesting.com (Toolshop), a public practice shop with a JSON API.
- `workshop/toolshop-openapi.3.1.json` is the spec we were handed. It is **incomplete and partly wrong**. The live server wins: when they disagree, record it in `qa/gaps.md` (one file per API: `qa/<api>-gaps.md` for a second API) and test what the server really does.
- Never invent an endpoint, field, status code or message. Every one must come from the spec, from `qa/gaps.md`, or from a request you replayed. If you do not know, say so and ask for an exploration step.

## How we test
- Playwright Test, TypeScript, the `request` fixture only. No browser, no UI tests.
- Layout (create it when you first need it, keep it afterwards):
  - `src/config/` base URL and credentials, read from environment variables only
  - `src/api/` one class per endpoint group; sends requests, returns `{ status, body }`, **asserts nothing**
  - `src/domain/` types, test data builders, small helpers (money in cents, product lookup by name)
  - `src/fixtures/` Playwright fixtures: `guest` (no token) and `shopper` (my user, logged in, fresh token), with cleanup in teardown
  - `tests/<area>/<capability>.spec.ts` behaviours only: no raw URLs, no `fetch`
- Test titles say what the user can do or what must hold: `a favorite can be added, is listed, and is gone after removal`.
- Follow `workshop/rules.md`. They matter more than the code structure.

## My user and my data
- I have my OWN Toolshop user. Credentials live in `.env` (`TOOLSHOP_EMAIL`, `TOOLSHOP_PASSWORD`), gitignored, and in CI in repository secrets. Never print them, never write them into a file, a log, a test or a chat.
- A token is short-lived (the login reply says how long in `expires_in`). Log in again in the fixture for every test; never store a token in a file.
- A test touches only data it created itself and removes it in fixture teardown (it runs even when the test fails). Never count or delete "all" favorites.
- No new users from tests and no password changes: users cannot be deleted on this host.
- **Never send a wrong password for MY user.** A few failed logins lock the account (HTTP 423) and nothing here can unlock it. For "login is refused" tests use an e-mail that does not exist (it answers 401 too) and keep a positive control with my real credentials. If a login answers 423, stop and tell me; do not retry.
- Never put my e-mail into an error message or a log line.

## Host facts (verified; keep them in `src/api` and `src/domain`, never in a spec)
- Auth: `POST /users/login` with JSON `{ email, password }` returns `{ access_token, token_type, expires_in }`. Send it as `Authorization: Bearer <token>`.
- Send `Accept: application/json` on every request. Without it a failed cart validation answers with a 302 to an HTML page instead of 422 (carts only: favorites and login are not affected).
- <!-- Block 3: add only the 3 to 5 facts from qa/gaps.md that change how test code is written (a status the spec gets wrong, a bug to pin), one line each: what the spec says, what the server does. The full table stays in qa/gaps.md. -->

## Be a good guest
- The host is public and shared by the whole room: `workers: 2`, `retries: 0`, small data, and clean up.

## Working agreement
- `AGENTS.md` and `workshop/rules.md` are mine. Never edit them; if you think one needs a change, say so and I will make it.
- Before a large change, say what you will change and why; then change it.
- After writing tests, run them. Report real results, not expected ones.
- Commands: `npm test` (all), `npm run verify` (type check), `npm run report` (HTML report).
