# Track B: participants already have the kit

Each pair has `participant-kit/` (seven agents, two commands, three skills, three rules, minimal Playwright config, exporters). `/qa-workshop` has a **Map it** step (Postman export, newman run, Swagger) between Gate 1 and design. They drive with `/qa-workshop <slice>`; you steer and run the gates as a group. The kit is a minimal-structure variant: one spec file per slice, the nine assertion rules, no layered `src/`.

| File / folder | What it is |
|---|---|
| `conspect.md` | facilitator script: prep, kit tour, run sheet, what to say per block, the Gate 2 hold, fallback ladder, facts |
| `slides.md` | Marp deck (28 short slides, speaker notes as HTML comments) |
| `participant-kit/` | the hand-out project; has its own `README.md` for participants, and `stage-cards.md` (the whole path with any AI) with `scripts/bundle.sh` (paste files into a chat) |
| `participant-invite.md` | the message to send a few days before (laptop optional, any AI) |
| `reference/` | the answer-key suite (`cart.spec.ts`, 6 tests) and its config; paste into `participant-kit/tests/cart.api.spec.ts` |
| `artifacts/` | finished outputs to show: `cartws-run/` (use cases, selection brief, run report, `test-map.html`) and `exports/` (raw Postman collection, `postbot-improved/` collection, `openapi.yaml`) |
| `scripts/` | `preflight.sh`, `sabotage.sh` (copies of the kit's own scripts, for rehearsing outside the kit) |

## Render the slides

```bash
npx @marp-team/marp-cli slides.md --html
```

## Hand out

Send `participant-invite.md` a few days before. The kit is in the public repo (`workshop/track-b-with-kit/participant-kit`) and can also be zipped (exclude `node_modules/`). Participants run `npm ci` and `bash scripts/preflight.sh` on their own; `npx playwright install chromium` is only for the Claude Code agents. Laptops are optional (pairs), and the AI is theirs: Claude Code agents or `stage-cards.md` with any chat AI.

## Rehearse (about 20 min plus the live run)

```bash
cp -R participant-kit /tmp/kit-rehearsal && cd /tmp/kit-rehearsal
npm ci && npx playwright install chromium
bash scripts/preflight.sh                                  # 3 PASS
cp ../path/to/track-b-with-kit/reference/cart.spec.ts tests/cart.api.spec.ts
npx playwright test                                        # 6 tests, about 20 s
bash scripts/sabotage.sh . tests/cart.api.spec.ts          # 3 caught + 1 survivor (mutant 4, on purpose)
rm tests/cart.api.spec.ts
```

Then open Claude Code in the folder (reload so the agents are visible) and run `/qa-workshop` with a cart slice for the real thing. Time it.

## Not here

- The demo project (layered framework, `qa/workshop/cartws/test-map.html`) is `../../solution/`.
- Timings are budgets from dry runs; nothing is measured end to end, and a participant laptop run has never been timed.
- `stage-cards.md` was checked mechanically (bundle, exports, newman, preflight without a browser download); its AI prompts have not been run with a non-Claude AI.
