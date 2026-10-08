# Bearstore API test kit (workshop)

A kit that takes you through the whole path on an undocumented API: discover it, design use cases, prioritise, have the AI build a layered Playwright API test framework, run and debug the tests, then prove they can fail. The kit ships tooling only (type check, framework lint, visual pages); `src/` and the tests are created by the AI on the first write. Target: https://bearstore-testsite.smartbear.com (a shared public demo shop).

**Work in pairs, one laptop per pair; no laptop? Join a pair.** Two ways to drive, same stages and files:
- **Claude Code:** eight agents and `/qa-cycle https://bearstore-testsite.smartbear.com <slice> limits: workshop` do the stages for you (shorthand: `/qa-workshop <slice>`; the `limits: workshop` preset keeps the run workshop-sized).
- **Any other AI** (a chat in the browser, Copilot, Gemini, a local model): follow `stage-cards.md`. You open the browser and paste, the AI organises and writes.

## Before the workshop (10 min)

Requirements: Node 20.12 or newer. Claude Code **or** any AI chat you already use.

```bash
npm install                    # once: a fresh hand-out has no node_modules
bash scripts/preflight.sh      # expect PASS lines and "Pre-flight OK"
npm run verify                 # typecheck + framework lint: green on the empty kit
# later, after a test run:  npm run report   (opens the Playwright HTML report from playwright-report/)
npx playwright install chromium   # Claude Code path only: its agents open a headed browser
```

Claude Code path: open Claude Code **in this folder** and restart it once so the agents and commands load. `/agents` should list eight `qa-*` agents. Any-AI path: nothing more to install; you use your own browser's DevTools.

No login is needed for the cart slices. Only account slices need `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` in a `.env` (copy `.env.example`, never commit it, never paste it in a chat).

## During the workshop (Claude Code path; any other AI: see `stage-cards.md`)

1. Narrow your scope to a **slice** (3 to 5 endpoints, your own state, nothing irreversible).
2. `/qa-cycle https://bearstore-testsite.smartbear.com <your slice> limits: workshop` (for example slice `cart`): a short scout maps your slice into a menu of units (you see the scout page); at the **Scope gate** you narrow it to two units (say it in words, for example "cart manipulation only"), then two headed browser windows open and the agents report. At **Gate 1** read the summary and answer the decisions.
   Right after Gate 1 the command **maps it**: it exports Postman and OpenAPI, runs the raw collection in newman (expect red: it is a map, not a suite) and starts Swagger on http://localhost:3000. Read the Swagger page for your slice and the 10-line `qa/workshop/<slug>/01-discovery/ideas.md`.
3. At **Gate 2** read the selected use cases and edit them. **Do not answer yet.** Reply "approved" after the assertion lab, so the writer works with the nine rules fresh.
4. On the first write the AI builds the framework from scratch, so expect a few minutes more than on later runs. Review the result against the checklist in `.claude/skills/writing-api-tests/SKILL.md`. The tests are layered: endpoint calls in `src/api`, parsers and constants in `src/domain`, business verbs in `src/actors`, assertions in `src/matchers`, and one spec per capability in `tests/<area>/<capability>.api.spec.ts` (for the cart: `tests/cart/`). `npm run verify` (typecheck + framework lint) must be green.
5. Run and debug: read `qa/workshop/<slug>/05-run-report.md` (the debugger ran inside the command) and classify each failure: test bug, app bug, flake.
6. Replay one failing call in Swagger (http://localhost:3000): open the shop in a fresh guest tab, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, click Authorize, paste `SMARTSTORE.VISITOR=<value>; ASP.NET_SessionId=<value>` into `browserCookie`, try the operation. The add body's field is `addtocart_<productId>.EnteredQuantity`: edit it to your product id.
7. Prove they can fail, on the green suite that debugging left you (optional steps 6 Sabotage and 7 Strengthen of `/qa-cycle`): the `qa-sabotage-tester` agent breaks `src/` one thing at a time in a throw-away copy and writes `qa/workshop/<slug>/06-sabotage-report.md` plus a heatmap page. By hand: in a throw-away copy of the kit break one thing in `src/` (for example the delete URL in `src/api/cart.api.ts`), run `npx playwright test` there and expect red; step 8 of the skill has the copy-paste commands. A sabotage no test notices is a survivor: strengthen a live test or improve the code itself (never add offline tests of framework classes); a guard no real reply can reach may stay as an accepted, documented survivor. `/qa-cycle` writes what changed to `07-strengthen-report.md` and a page `08-strengthen.html`.

Run the exports by hand with `npm run export:postman -- --input <endpoints.json> --out exports/postman`, `npm run export:openapi -- --input <endpoints.json> --out exports/openapi.yaml` and `npm run swagger -- --spec exports/openapi.yaml`.

## Visuals

After every stage a self-contained HTML page is rendered to `<root>/visuals/` from the files that stage wrote: scout `01-scout.html`, discovery `02-discovery.html`, usecases `03-usecases.html`, selected `04-selected.html`, tests `05-tests.html`, run `06-run.html`, sabotage `07-sabotage.html`, strengthen `08-strengthen.html`, plus `index.html` linking them all. The agents do this as their last step and `/qa-cycle` opens the pages for you at the gates and at the end (the chat still shows the key content in text). By hand, from the kit root: `node scripts/visualize.mjs <stage> --root qa/workshop/<slug>/` or `npm run visualize -- <stage> --root qa/workshop/<slug>/` (`--root` defaults to `qa/`; the `index` stage rebuilds only `index.html`). It prints the page path, takes about a second, and renders partial input with a visible note.

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
