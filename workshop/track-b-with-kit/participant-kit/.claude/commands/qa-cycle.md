---
description: Run the API-only QA cycle (parallel headed discovery, use cases, prioritization, API tests, debugging) against a target site
argument-hint: <base-url> [scope]
---

Run the API QA cycle for: $ARGUMENTS

This framework contains API tests only (Playwright `request` fixture, no browser tests). Each stage is a subagent that reads the previous stage's files and writes its own under `qa/`. Do the work through the named agents; do not do it yourself. At every STOP, show the user the key content IN THE CHAT (tables and decisions, not just a file path) and wait.

## 1. Discovery (headed, parallel)
Discovery browsers are always visible to the user: agents drive `npx playwright-cli -s=qa-<unit> open <url> --headed` (never headless). Each agent has its own named session (`qa-<unit>`), so several windows open at once; tell the user this before launching. After each agent returns, check its output for the `headed: true` evidence; if an agent reports it could not open a browser or used curl only, treat that area as NOT explored, tell the user, and re-run it once.

a. **Scout** - invoke `qa-scout` with the base URL and scope. Expected: `qa/01-discovery/areas.md` (areas, each split into 2-4 independent units, with state ownership and effort).

b. **Ask the user what to explore.** If a scope was given and `areas.md` has a single area, do not ask which area: show its units table in chat and continue with all units (the user may drop some). Otherwise: discovery can take long, so before exploring show the "Areas" list from areas.md in chat (area, what it covers, units, effort) and ask which areas to explore. Use AskUserQuestion with `multiSelect: true`; options are the areas (put "All areas" first as the recommendation for a first run). The tool allows at most 4 options: if there are more than 3 areas, group the least important into "Everything else" or ask in plain chat with a numbered list instead. The user may also answer "Other" with a custom selection.

c. **Plan parallel work.** The parallel work items are UNITS, not areas:
   - Collect all units of the chosen areas.
   - Run at most 5 `qa-discoverer` agents at once. If there are more units, run them in waves of 5, longest (effort L) first.
   - If the user chose a single area, still run one agent per unit of that area (that is why every area is split into units). If that gives only one unit, tell the user it cannot be parallelized.
   - Skipped areas are recorded as "not explored (user's choice)" for the summary.

d. **Explore in parallel** - invoke one `qa-discoverer` per unit of the current wave, ALL in a single message so they run concurrently. Pass each: base URL, its unit key, its row from areas.md, and the credential env var names. Expected: `qa/01-discovery/units/<unit>/`.
   If an agent fails or returns nothing, re-run only that unit once; if it still fails, record the gap and continue.

e. **Consolidate** - invoke `qa-discovery-consolidator`. Expected: `qa/01-discovery/{endpoints.json,flows.md,auth.md,open-questions.md,SUMMARY.md}`.

**STOP - Gate 1.** Present from SUMMARY.md: the at-a-glance numbers, the endpoint table, the auth model, risks/surprises, what was not explored, and the numbered "Decisions needed" with recommendations. Wait for answers; record them at the bottom of SUMMARY.md.

## 2. Design
Invoke `qa-usecase-designer`. Expected: `qa/02-use-cases.md` (starts with the area x type matrix). Show the matrix and counts in chat.

## 3. Prioritize
Invoke `qa-prioritizer`. Expected: `qa/03-selected.md` (starts with the Decision brief).

**STOP - Gate 2.** Present the Decision brief: recommendation, selected table, coverage per area, effort, and the numbered decisions. Wait for approval or edits.

## 4. Write
Invoke `qa-api-test-writer` ONCE with all selected UC IDs (one call per UC is much slower). Expected: `tests/<slug>.api.spec.ts` (see skill `writing-api-tests` and `.claude/rules/assertion-rules.md`), updated `qa/04-coverage.md`.

## 5. Debug and report
Invoke `qa-api-test-debugger`. It fixes test bugs only (max 3 attempts per test). Expected: `qa/05-run-report.md`.

**Final output.** Show in chat: the verdict, results by area, application bugs found (with their curl repro), and coverage gaps from the report.
