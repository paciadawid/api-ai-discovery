# Track B: participants already have the kit

Each pair has `participant-kit/` (eight agents, two commands, three skills, four rules, exporters, and tooling only: `tsconfig.json`, framework lint, visual pages, a Playwright config without projects, empty `tests/`). The master class drives `/qa-cycle`, in the canonical order: Setup, 1 Discovery (scout, **Scope gate**, units explored in parallel, consolidate), Gate 1, **Map it** (Postman export, newman run, Swagger), 2 Use cases, 3 Prioritize, Gate 2, 4 Write, 5 Run and debug, then the optional 6 Sabotage and 7 Strengthen (cut first). They run `/qa-cycle https://bearstore-testsite.smartbear.com <slice> limits: workshop` (shorthand: `/qa-workshop <slice>`); the optional `limits: workshop` preset holds the room limits (time box, unit cap, caps on use cases, fallbacks, QA root `qa/workshop/<slug>/`), without it the cycle has none. You steer and run the three STOP gates (scope, Gate 1, Gate 2) as a group. The kit ships no `src/`: on the first write the AI builds a layered framework from scratch (`src/config`, `api`, `domain`, `actors`, `matchers`, `fixtures`, and `tests/<area>/<capability>.api.spec.ts`), guided by the rules and the `writing-api-tests` skill. After every stage a visual page is rendered to `<root>/visuals/`.

| File / folder | What it is |
|---|---|
| `conspect.md` | facilitator script: prep, kit tour, run sheet, what to say per block, the Gate 2 hold, fallback ladder, facts |
| `slides.md` | Marp deck (short slides, speaker notes as HTML comments); `slides.html` is the rendered, self-contained copy |
| `participant-kit/` | the hand-out project; has its own `README.md` for participants, and `stage-cards.md` (the whole path with any AI) with `scripts/bundle.sh` (paste files into a chat) |
| `participant-invite.md` | the message to send a few days before (laptop optional, any AI) |
| `reference/layered/` | **Track B answer key and fallback** (never for participants): a finished layered framework (`src/`, `tests/`, `playwright.config.ts`), copied over a kit when the writer is slow or wrong; see its `README.md` |
| `reference/` (flat files) | the OLD flat answer key (`cart.spec.ts`, 6 tests, its config, `cart-07-kills-mutant-4.snippet.txt`, `draft/`, `test-map.html`): Track A and rehearsals outside the kit only; it does not fit the layered kit |
| `artifacts/` | finished outputs to show: `cartws-run/` (use cases, selection brief, run report, `test-map.html`) and `exports/` (raw Postman collection, `postbot-improved/` collection, `openapi.yaml`) |
| `scripts/` | `preflight.sh` (copy of the kit's) and `sabotage.sh` (Track A and the flat answer key only; the kit no longer ships it) |

## Render the slides

```bash
npx @marp-team/marp-cli slides.md --html --allow-local-files
```

The title slide uses `img/` (the HUSTEF logo and a speaker photo). That folder is local and gitignored; the committed `slides.html` has the images embedded.

## Hand out

Send `participant-invite.md` a few days before. The kit is in the public repo (`workshop/track-b-with-kit/participant-kit`) and can also be zipped (exclude `node_modules/`). Participants run `npm ci`, `bash scripts/preflight.sh` and `npm run verify` on their own; `npx playwright install chromium` is only for the Claude Code agents. Laptops are optional (pairs), and the AI is theirs: Claude Code agents or `stage-cards.md` with any chat AI.

## Rehearse

```bash
cp -R participant-kit /tmp/kit-rehearsal && cd /tmp/kit-rehearsal
npm ci && npx playwright install chromium
bash scripts/preflight.sh                                  # 3 PASS
npm run verify                                             # green on the fresh kit (typecheck + framework lint)
cp -R ../path/to/track-b-with-kit/reference/layered/{src,tests,playwright.config.ts} .   # the fallback
npm run verify && npx playwright test                      # 1 gate + 9 cart + known-issue + spike + 16 unit
```

Then open Claude Code in a fresh copy (reload so the agents are visible) and run `/qa-cycle https://bearstore-testsite.smartbear.com cart limits: workshop` for the real thing: the first write builds the layers from scratch, so run it through Run and debug and then the sabotage steps 6 and 7. The old flat sabotage drill (`scripts/sabotage.sh` on `reference/cart.spec.ts`) is Track A only.

## Not here

- The demo project (layered framework, `qa/workshop/cartws/test-map.html`) is `../../solution/`.
- A full run on a participant laptop has not been rehearsed end to end.
- `stage-cards.md` was checked mechanically (bundle, exports, newman, preflight without a browser download); its AI prompts have not been run with a non-Claude AI.
