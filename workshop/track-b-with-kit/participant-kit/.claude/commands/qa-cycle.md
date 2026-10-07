---
description: Run the API-only QA cycle (parallel headed discovery, map it, use cases, prioritization, API tests, debugging, sabotage) against a target site
argument-hint: <base-url> [scope]
---

Run the API QA cycle for: $ARGUMENTS

This framework contains API tests only (Playwright `request` fixture, no browser tests). Each stage is a subagent that reads the previous stage's files and writes its own under `<root>/`. Do the work through the named agents; do not do it yourself. Every agent must END by delivering its final report as text, even when its files are written. At every STOP, show the user the key content IN THE CHAT (tables and decisions, not just a file path) and wait.

`/qa-workshop` runs the same steps for ONE narrow feature with hard limits and time boxes. The step names and numbers below are identical in both commands; only the scope, the limits and a few shortcuts differ.

**Visuals.** After every stage its agent renders a page to `<root>/visuals/` (`node scripts/visualize.mjs <stage> --root <root>`; `npm run visualize -- <stage> --root <root>`): scout `01-scout.html`, discovery `02-discovery.html`, usecases `03-usecases.html`, selected `04-selected.html`, tests `05-tests.html`, run `06-run.html`, sabotage `07-sabotage.html`, plus `index.html` linking them all (rebuilt on every render; the `index` stage rebuilds only it). Open the page for the user at the gates and at the end, with the OS opener when available (`open` on macOS, `xdg-open` on Linux, `start` on Windows). The page is an addition, not a replacement: the chat summary still shows the key content in text. Rendering takes about a second. If a render fails, say so in one line and carry on.

## Setup
- **QA root = `qa/`** by default; a focused run may pass another root such as `qa/<slug>/`. Pass the root to every agent ("QA root: ..."); everything below writes under `<root>/`. Slug = short kebab-case of the scope (of the host when there is no scope); it names `exports/<slug>/` and the UC ids `UC-<SLUG>-NN`.
- Credentials, if the scope needs a login: the env var names are passed to the discoverers; secrets never go into files.
- Pre-flight: run `npm install` once if `node_modules` is missing (a fresh hand-out has none; it also makes `npx playwright-cli` resolve to the right package). Then report one line each: `./node_modules/.bin/playwright-cli list` works; `curl -s -o /dev/null -w "%{http_code}"` on the base URL returns 200; `npm run verify` is green (on an empty kit it checks 0 specs). If one fails, say what and ask before going on.
- No time box: the cycle runs until done. `/qa-workshop` adds one.

## 1. Discovery (headed, parallel)
Discovery browsers are always visible to the user: agents drive `npx playwright-cli -s=qa-<unit> open <url> --headed` (never headless). Each agent has its own named session (`qa-<unit>`), so several windows open at once; tell the user this before launching. After each agent returns, check its output for the `headed: true` evidence; if an agent reports it could not open a browser or used curl only, treat that area as NOT explored, tell the user, and re-run it once.

a. **Scout** - invoke `qa-scout` with the base URL, the scope and the QA root. Expected: `<root>/01-discovery/areas.md` (areas, each split into 2-4 independent units, with state ownership and effort) and the scout page `<root>/visuals/01-scout.html`.

b. **STOP - Scope gate (narrow after the scout).** The scope given at the start may be broad (everything, or one area such as "cart"); this gate is where the user narrows it before any discovery browser opens, for example to "cart manipulation only" or "cart calculation only". Open the scout page `<root>/visuals/01-scout.html` for the user and show in chat: the "Areas" list (area, what it covers, units, effort) and the units table (unit, what it explores, owns state, effort). Ask what to explore. Use AskUserQuestion with `multiSelect: true`; options are the units (put "All units" first as the recommendation for a first run). The tool allows at most 4 options: if there are more than 3 units, group the least important into "Everything else" or ask in plain chat with a numbered list instead. The user may also answer "Other" with a narrower scope in words. Then:
   - the answer picks units that exist: continue with exactly those units;
   - the answer describes a slice that maps onto existing units: continue with those units and say which;
   - the answer describes a slice the units do not cover or that cuts across them (for example "cart calculation" when the scout split the area by user action): re-run `qa-scout` once with the narrower scope text and the current `areas.md` as context (scope mode, about 8 browser commands), show the new units table and ask again. At most 2 refinements.
   Record the decision: append a section `## Scope decision` to `<root>/01-discovery/areas.md` with the lines `- Asked: <the user's words>`, `- Explored units: <unit keys, comma separated>`, `- Not explored (user's choice): <unit keys, comma separated>` and `- Refinements: <n>`, then re-render the scout page (`node scripts/visualize.mjs scout --root <root>`; it marks each unit EXPLORED or not explored). Skipped units are recorded as "not explored (user's choice)" in the summaries.

c. **Plan parallel work.** The parallel work items are UNITS, not areas:
   - Collect the units chosen at the scope gate.
   - Run at most 5 `qa-discoverer` agents at once. If there are more units, run them in waves of 5, longest (effort L) first.
   - Run one agent per chosen unit (that is why every area is split into units). If that gives only one unit, tell the user it cannot be parallelized.

d. **Explore in parallel** - invoke one `qa-discoverer` per unit of the current wave, ALL in a single message so they run concurrently. Pass each: base URL, its unit key, its row from areas.md, the QA root, and the credential env var names. Expected: `<root>/01-discovery/units/<unit>/`.
   If an agent fails or returns nothing, re-run only that unit once; if it still fails, record the gap and continue.

e. **Consolidate** - invoke `qa-discovery-consolidator` (QA root passed). Expected: `<root>/01-discovery/{endpoints.json,flows.md,auth.md,open-questions.md,SUMMARY.md}` and the discovery page `<root>/visuals/02-discovery.html` (the discoverers render no page; the consolidator does).

**STOP - Gate 1.** Open `<root>/visuals/02-discovery.html` for the user. Present from SUMMARY.md: the at-a-glance numbers, the endpoint table, the auth model, risks/surprises, what was not explored, and the numbered "Decisions needed" with recommendations. Wait for answers; record them at the bottom of SUMMARY.md.

## Map it (Postman + Swagger, no gate)
The discovery file becomes two maps. Run, in this order, and show the key lines in chat:
1. Export: `npm run export:postman -- --input <root>/01-discovery/endpoints.json --out exports/<slug>/postman` and `npm run export:openapi -- --input <root>/01-discovery/endpoints.json --out exports/<slug>/openapi.yaml`.
2. Run the raw collection without installing Postman: `npx newman run exports/<slug>/postman/*collection.json -e exports/<slug>/postman/*environment.json`. **Expect most checks RED**: the raw export is a map, not a suite (path placeholders are unset and the generated "body contains expected signal" checks compare against prose). Say why each group is red; that is the lesson.
3. Optional, needs a Postman account: import both files into Postman and ask Postbot to chain the requests and add tests. Save the result next to the raw one in `exports/<slug>/postman/improved/`. Run it with `npx newman run` as well: a chained flow is typically green. Skip this step without an account.
4. Start Swagger in the background: `npm run swagger -- --spec exports/<slug>/openapi.yaml` (http://localhost:3000). It is the readable map now and the replay tool at debug time.
Then write `<root>/01-discovery/ideas.md`, 10 lines at most: the call FLOW worth keeping (order, ids to capture), checks worth keeping, suggestions rejected and why. Judge every Postman or Postbot check with the nine rules in `.claude/rules/assertion-rules.md`: a status-only check, a prose-signal check, or a field name the server ignores is rejected. Ideas are input to design, never oracles.

## 2. Use cases (design)
Invoke `qa-usecase-designer` with the QA root (it also reads `<root>/01-discovery/ideas.md` if present). Expected: `<root>/02-use-cases.md` (starts with the area x type matrix) and the page `<root>/visuals/03-usecases.html`. Show the matrix and counts in chat.

## 3. Prioritize
Invoke `qa-prioritizer` with the QA root. Expected: `<root>/03-selected.md` (starts with the Decision brief) and the page `<root>/visuals/04-selected.html`.

**STOP - Gate 2.** Open `<root>/visuals/04-selected.html` for the user. Present the Decision brief: recommendation, selected table with scores, coverage per area, effort, what is deferred and why, and the numbered decisions. Wait for approval or edits.

## 4. Write
Invoke `qa-api-test-writer` ONCE with all selected UC IDs (one call per UC is much slower), the QA root, and a style brief: follow the `writing-api-tests` skill and the rules in `.claude/rules/` (above all `assertion-rules.md` and `framework-architecture.md`). If `src/` already has the layers, the writer extends them; otherwise it bootstraps them from scratch (config, client, API class, domain, actor, matchers, fixtures, `playwright.config.ts` projects). It runs `npm run verify`, runs the specs, and records coverage in `<root>/04-coverage.md`. Expected: new or changed files under `src/` and one spec per capability, `tests/<area>/<capability>.api.spec.ts` (behaviour-style titles starting with the UC id; each test uses the fixture-provided actor with its own isolated session), plus the tests page `<root>/visuals/05-tests.html`. Open the tests page for the user after the write.

## 5. Run and debug
Invoke `qa-api-test-debugger` (QA root passed; it starts with `npm run verify`). It fixes test and framework bugs only, at most 3 attempts per test; anything unresolved is reported, not chased. When a failure is not obvious from the curl repro, replay the call in Swagger UI (http://localhost:3000). Expected: `<root>/05-run-report.md` (always written, with a "what was improved" section) and the run page `<root>/visuals/06-run.html`.

## 6. Sabotage
Invoke `qa-sabotage-tester` with the QA root (default budget about 25 mutations). It breaks `src/` one thing at a time in a throw-away copy and reports which breaks the tests noticed. It edits nothing in the real kit. Expected: `<root>/06-sabotage-report.md`, `<root>/06-sabotage.json` and the sabotage page `<root>/visuals/07-sabotage.html`.

## 7. Strengthen and finalize
If the sabotage report names REAL GAP survivors: invoke `qa-api-test-debugger` with the sabotage report (strengthening mode, one round), then `qa-sabotage-tester` again on the survivors only, then `qa-api-test-debugger` once more to update `<root>/05-run-report.md` with the before/after numbers; the run and sabotage pages are re-rendered. If there are no real gaps, skip the loop; the debugger still ends the report with what was improved (or "nothing changed").

## Final output (chat)
Verdict (passed/failed counts), the tests by UC id, application bugs with curl repro, what was improved in the session (from `<root>/05-run-report.md`, with the sabotage before/after numbers), and what was deferred or left uncovered. Open the run page `<root>/visuals/06-run.html` and the sabotage page `<root>/visuals/07-sabotage.html` for the user, then `<root>/visuals/index.html` once (the orchestrator opens it, not an agent). The exports from Map it are in `exports/<slug>/`; Swagger keeps running for replays.
