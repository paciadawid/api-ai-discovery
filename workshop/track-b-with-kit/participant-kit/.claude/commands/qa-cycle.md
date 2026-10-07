---
description: Run the API-only QA cycle (parallel headed discovery, use cases, prioritization, API tests, debugging) against a target site
argument-hint: <base-url> [scope]
---

Run the API QA cycle for: $ARGUMENTS

This framework contains API tests only (Playwright `request` fixture, no browser tests). Each stage is a subagent that reads the previous stage's files and writes its own under `qa/`. Do the work through the named agents; do not do it yourself. At every STOP, show the user the key content IN THE CHAT (tables and decisions, not just a file path) and wait.

**Visuals.** After every stage its agent renders a page to `<root>/visuals/` (`node scripts/visualize.mjs <stage> --root <root>`; `npm run visualize -- <stage> --root <root>`; default root `qa/`): scout `01-scout.html`, discovery `02-discovery.html`, usecases `03-usecases.html`, selected `04-selected.html`, tests `05-tests.html`, run `06-run.html`, sabotage `07-sabotage.html`, plus `index.html` linking them all (rebuilt on every render; the `index` stage rebuilds only it). The page must be OPENED for the user at the gates and at the end, with the OS opener when available (`open` on macOS, `xdg-open` on Linux, `start` on Windows). The page is an addition, not a replacement: the chat summary still shows the key content in text. If a render fails, say so in one line and carry on.

## 1. Discovery (headed, parallel)
Discovery browsers are always visible to the user: agents drive `npx playwright-cli -s=qa-<unit> open <url> --headed` (never headless). Each agent has its own named session (`qa-<unit>`), so several windows open at once; tell the user this before launching. After each agent returns, check its output for the `headed: true` evidence; if an agent reports it could not open a browser or used curl only, treat that area as NOT explored, tell the user, and re-run it once.

a. **Scout** - invoke `qa-scout` with the base URL and scope. Expected: `qa/01-discovery/areas.md` (areas, each split into 2-4 independent units, with state ownership and effort), and the scout page `qa/visuals/01-scout.html`.

b. **Ask the user what to explore.** If a scope was given and `areas.md` has a single area, do not ask which area: show its units table in chat and continue with all units (the user may drop some). Otherwise: discovery can take long, so before exploring show the "Areas" list from areas.md in chat (area, what it covers, units, effort) and ask which areas to explore. Use AskUserQuestion with `multiSelect: true`; options are the areas (put "All areas" first as the recommendation for a first run). The tool allows at most 4 options: if there are more than 3 areas, group the least important into "Everything else" or ask in plain chat with a numbered list instead. The user may also answer "Other" with a custom selection.

c. **Plan parallel work.** The parallel work items are UNITS, not areas:
   - Collect all units of the chosen areas.
   - Run at most 5 `qa-discoverer` agents at once. If there are more units, run them in waves of 5, longest (effort L) first.
   - If the user chose a single area, still run one agent per unit of that area (that is why every area is split into units). If that gives only one unit, tell the user it cannot be parallelized.
   - Skipped areas are recorded as "not explored (user's choice)" for the summary.

d. **Explore in parallel** - invoke one `qa-discoverer` per unit of the current wave, ALL in a single message so they run concurrently. Pass each: base URL, its unit key, its row from areas.md, and the credential env var names. Expected: `qa/01-discovery/units/<unit>/`.
   If an agent fails or returns nothing, re-run only that unit once; if it still fails, record the gap and continue.

e. **Consolidate** - invoke `qa-discovery-consolidator`. Expected: `qa/01-discovery/{endpoints.json,flows.md,auth.md,open-questions.md,SUMMARY.md}` and the discovery page `qa/visuals/02-discovery.html` (the discoverers render no page; the consolidator does).

**STOP - Gate 1.** Open the discovery page `qa/visuals/02-discovery.html` for the user. Present from SUMMARY.md: the at-a-glance numbers, the endpoint table, the auth model, risks/surprises, what was not explored, and the numbered "Decisions needed" with recommendations. Wait for answers; record them at the bottom of SUMMARY.md.

## 2. Design
Invoke `qa-usecase-designer`. Expected: `qa/02-use-cases.md` (starts with the area x type matrix). Show the matrix and counts in chat. Page: `qa/visuals/03-usecases.html`.

## 3. Prioritize
Invoke `qa-prioritizer`. Expected: `qa/03-selected.md` (starts with the Decision brief) and the page `qa/visuals/04-selected.html`.

**STOP - Gate 2.** Open the selected page `qa/visuals/04-selected.html` for the user. Present the Decision brief: recommendation, selected table, coverage per area, effort, and the numbered decisions. Wait for approval or edits.

## 4. Write
Invoke `qa-api-test-writer` ONCE with all selected UC IDs (one call per UC is much slower). Run `npm install` once first if `node_modules` is missing. The writer extends the layered framework, or on the first run creates it from scratch (see skill `writing-api-tests`, `.claude/rules/framework-architecture.md` and `.claude/rules/assertion-rules.md`) and runs `npm run verify`. Expected: new or changed files under `src/` (api, domain, actors, matchers) and one spec per capability, `tests/<area>/<capability>.api.spec.ts`, plus updated `qa/04-coverage.md` and the tests page `qa/visuals/05-tests.html`. After the write step, open the tests page for the user.

## 5. Debug and report
Invoke `qa-api-test-debugger`. It runs `npm run verify` first, then the suite, and fixes test and framework bugs only (max 3 attempts per test). Expected: `qa/05-run-report.md` (it is written after every debugging session, with an "improved" section) and the run page `qa/visuals/06-run.html`.

## 6. Sabotage
Invoke `qa-sabotage-tester` (default budget about 15 mutations). It breaks `src/` one thing at a time in a throw-away copy and reports which breaks the tests noticed. Expected: `qa/06-sabotage-report.md` and the sabotage page `qa/visuals/07-sabotage.html`. It edits nothing in the real kit.

## 7. Strengthen and finalize
If the sabotage report names REAL GAP survivors: invoke `qa-api-test-debugger` with the sabotage report (strengthening mode, one round), then `qa-sabotage-tester` again on the survivors only, then `qa-api-test-debugger` once more to update `qa/05-run-report.md` with the before/after numbers; both re-render their pages (run, sabotage). If there are no real gaps, skip the loop; the debugger still ends the report with what was improved (or "nothing changed").

**Final output.** Show in chat: the verdict, results by area, application bugs found (with their curl repro), what was improved (table plus before/after sabotage numbers), and coverage gaps from the report. Open the run page `qa/visuals/06-run.html` and the sabotage page `qa/visuals/07-sabotage.html` for the user, then `qa/visuals/index.html` once (the orchestrator opens it, not an agent).
