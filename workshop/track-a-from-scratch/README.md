# Track A: start from nothing

You drive, the room follows. Participants arrive with a laptop and no kit; you build the project and four agents live, with paste-ready finals in `starter/` as the safety net. Treat it as a guided demo with participant decisions at the gates.

| File / folder | What it is |
|---|---|
| `conspect.md` | facilitator script: prep checklist, paste map, run sheet, what to say per block, fallback ladder, facts |
| `slides.md` | Marp deck (28 short slides, speaker notes as HTML comments) |
| `starter/` | the project in its final form: `CLAUDE.md`, `playwright.config.ts`, `package.json`, `.gitignore`, `.claude/agents/{explorer,designer,writer,debugger}.md`, `.claude/commands/cycle.md`, `scripts/` (exporters + Swagger server) |
| `reference/` | the answer-key suite (`cart.spec.ts`, 6 tests) with its own config and `package.json` |
| `fallback/` | pre-baked discovery (`endpoints.json`, `auth.md`) and the Postbot-improved Postman collection plus its environment |
| `artifacts/` | finished outputs to show: `cartws-run/` (use cases, selection brief, run report, `test-map.html`) and `exports/` (raw Postman collection, `postbot-improved/` collection, `openapi.yaml`) |
| `scripts/` | `preflight.sh` (3 checks), `sabotage.sh` (3 mutants against a spec) |

## Render the slides

```bash
npx @marp-team/marp-cli slides.md --html          # slides.html
npx @marp-team/marp-cli slides.md --html --pdf    # optional PDF
```

## Rehearse (about 30 min, no browser needed except for explore)

```bash
mkdir -p ~/bearstore-tests && cd ~/bearstore-tests
npm init -y && npm i -D @playwright/test @playwright/cli && npx playwright install chromium
cp <this-folder>/starter/playwright.config.ts <this-folder>/starter/CLAUDE.md .
mkdir -p .claude/agents .claude/commands
cp <this-folder>/starter/.claude/agents/explorer.md .claude/agents/     # or draft it live
bash <this-folder>/scripts/preflight.sh
```

Per stage, add what you need: `designer.md` before design, `writer.md` before writing, `debugger.md` before debugging, `cycle.md` at the recap. Everything at once: `cp -R <this-folder>/starter/. ~/bearstore-tests/`. Reload Claude Code after adding agents or commands.

## Check the answer key and the sabotage demo

```bash
cd reference && npm install && npx playwright install chromium && cd ..
npx playwright test -c reference                       # 6 tests, about 20 s
bash scripts/sabotage.sh reference cart.spec.ts        # expect 3 caught, 0 survivors
```

## Fallbacks in one line each

```bash
mkdir -p qa/cart && cp <this-folder>/fallback/{endpoints.json,auth.md} qa/cart/   # explore failed
npx newman run <this-folder>/fallback/postbot-improved.postman_collection.json -e <this-folder>/fallback/bearstore-api-discovered.postman_environment.json   # no Postbot: 31 of 31 pass
cp <this-folder>/reference/cart.spec.ts tests/                                                              # writer failed (the spec is self-contained)
```

Open `artifacts/cartws-run/test-map.html` in a browser for the "what does one finished slice look like" slide.

## What is not here

- The layered framework: it lives in the demo project `../../solution/`. The exporter scripts are in `starter/scripts/` so that the Map it block runs live.
- Timings are budgets from dry runs, not measurements.
