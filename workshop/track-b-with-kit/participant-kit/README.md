# Bearstore API test kit (workshop)

A kit that takes you through the whole path on an undocumented API: discover it, design use cases, prioritise, write Playwright API tests, prove they can fail, debug them. Target: https://bearstore-testsite.smartbear.com (a shared public demo shop).

**Work in pairs, one laptop per pair; no laptop? Join a pair.** Two ways to drive, same stages and files:
- **Claude Code:** seven agents and `/qa-workshop <slice>` do the stages for you.
- **Any other AI** (a chat in the browser, Copilot, Gemini, a local model): follow `stage-cards.md`. You open the browser and paste, the AI organises and writes.

## Before the workshop (10 min)

Requirements: Node 20.12 or newer. Claude Code **or** any AI chat you already use.

```bash
npm ci
bash scripts/preflight.sh      # expect PASS lines and "Pre-flight OK"
npx playwright install chromium   # Claude Code path only: its agents open a headed browser
```

Claude Code path: open Claude Code **in this folder** and restart it once so the agents and commands load. `/agents` should list seven `qa-*` agents. Any-AI path: nothing more to install; you use your own browser's DevTools.

No login is needed for the cart slices. Only account slices need `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` in a `.env` (copy `.env.example`, never commit it, never paste it in a chat).

## During the workshop (Claude Code path; any other AI: see `stage-cards.md`)

1. Narrow your scope to a **slice** (3 to 5 endpoints, your own state, nothing irreversible).
2. `/qa-workshop <your slice>`: two headed browser windows open, then the agents report. At **Gate 1** read the summary and answer the decisions.
   Right after Gate 1 the command **maps it**: it exports Postman and OpenAPI, runs the raw collection in newman (expect red: it is a map, not a suite) and starts Swagger on http://localhost:3000. Read the Swagger page for your slice and the 10-line `qa/workshop/<slug>/01-discovery/ideas.md`.
3. At **Gate 2** read the selected use cases and edit them. **Do not answer yet.** Reply "approved" after the assertion lab, so the writer works with the nine rules fresh.
4. Review the tests in `tests/<slug>.api.spec.ts` against the checklist in `.claude/skills/writing-api-tests/SKILL.md`.
5. Prove they can fail: `bash scripts/sabotage.sh . tests/<slug>.api.spec.ts` (each mutant is CAUGHT, SURVIVED or NOT APPLICABLE).
6. Read `qa/workshop/<slug>/05-run-report.md` and classify each failure: test bug, app bug, flake.
7. Replay one failing call in Swagger (http://localhost:3000): open the shop in a fresh guest tab, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, click Authorize, paste `SMARTSTORE.VISITOR=<value>; ASP.NET_SessionId=<value>` into `browserCookie`, try the operation. The add body's field is `addtocart_<productId>.EnteredQuantity`: edit it to your product id.

Run the exports by hand with `npm run export:postman -- --input <endpoints.json> --out exports/postman`, `npm run export:openapi -- --input <endpoints.json> --out exports/openapi.yaml` and `npm run swagger -- --spec exports/openapi.yaml`.

## When something breaks

| Problem | Do |
|---|---|
| Browser window does not open | tell the facilitator; the command can use `qa/workshop/cart/fallback/` |
| Your AI stalls, hits a limit or is down | copy the facilitator's finished file for that stage and carry on with the next one; or borrow the other laptop in your pair |
| No laptop | join a pair; you decide at the gates |
| An agent ends without a report | rerun that stage once |
| No Postman account (Postbot) | use `qa/workshop/cart/fallback/postbot-improved.postman_collection.json` with `npx newman run` |
| Site is slow or down | wait, or work from the facilitator's finished artifacts |

## Be a good guest

The host is shared and public: 2 workers, no retries, a unique User-Agent per test, no orders, no new accounts. Do not hard-code or print credentials.
