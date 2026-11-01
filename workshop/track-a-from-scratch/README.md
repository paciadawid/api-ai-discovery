# Track A: the full-day workshop (8 h)

**From prompt to pipeline: building an AI-assisted API test framework.** Participants build a small, trustworthy Playwright API test framework against a public shop API (Toolshop), each with their own user, using Postman and Postbot for discovery and any AI agent in their IDE for coding. You teach, demo with Claude Code, and let them do their own part at every step.

Track B (`../track-b-with-kit/`) is the 105-minute version on the harder Bearstore API; this track targets a more basic audience and takes the time to explain.

| Folder / file | What it is |
|---|---|
| `participant-kit/` | the hand-out, in two halves. **Framework** (root): `src/` `tests/` `qa/` `scripts/` `AGENTS.md` `playwright.config.ts`. **Workshop** (`workshop/`): `steps/` (one card per block), `prompts.md`, `rules.md`, `challenge.md`, `checkpoints/`, `escape-room/`, `hallucination-hunt/`, the spec and the pipeline. |
| `facilitator/` | never hand out. Answer keys for the gap hunts, the escape room and the hallucination hunt, plus `solution/`: the finished layered framework (Toolshop and PokeAPI) that verifies everything and feeds the sabotage demo |
| `publish-kit.sh` | syncs `participant-kit/` into the public template repo `paciadawid/prompt-to-pipeline-kit` (guards against answer keys and `.env`); participants use that (https://github.com/paciadawid/prompt-to-pipeline-kit), never this repo |
| `build-kit.sh` | offline fallback: builds `dist/participant-kit.zip` (no answer keys, no `.env`, no `node_modules`) |
| `scripts/sabotage.sh` | breaks `src/` one way at a time to show which tests notice |
| `theme.css`, `render.sh` | the Marp theme `twz` and the render command for the deck |
| `slides.html` | the rendered deck (agenda blocks, no timings); `slides.md` is the Marp source (local) |
| `conspect.md` | (local, gitignored) run sheet: prep checklist, schedule, what to demo and say per block, fallbacks |

## The day (blocks, in order)

| Block | Card (in `participant-kit/workshop/steps/`) | Tool | Output |
|---|---|---|---|
| 0 Setup | `00-setup.md` | npm, IDE, agent | green smoke test, agent repeats the rules |
| 1 API discovery | `01-discovery.md` | Postman, Postbot | own user, token, notes |
| 2 Gap analysis | `02-gaps.md` | Postman | `qa/gaps.md` with evidence |
| 3 IDE handoff | `03-handoff.md` | IDE agent | `.env`, host facts, a test plan |
| 4 Test coding I | `04-first-tests.md` | IDE agent | layers, login test, token handling |
| 5 Test coding II | `05-chaining.md` | IDE agent | chaining with cleanup, own pick, hallucination hunt |
| 6 CI/CD debugging | `06-ci.md` | GitHub Actions | green pipeline, escape room |
| 7 Hands-on challenge | `07-challenge.md` | all of it | an unseen API (PokeAPI, or the Toolshop cart) |
| 8 Architecture review | `08-review.md` | sabotage | break it, judge it, take home |

The nine assertion rules are taught in three steps (`participant-kit/workshop/rules.md`): rules 1-3 in block 4, 4-7 in block 5, 8-9 at the end of block 5, then "prove it can fail" (sabotage) in block 8.

## Prepare (about 1 hour, the day before)

```bash
cd participant-kit && npm ci && npm run preflight        # Pre-flight OK
cd ../facilitator/solution && npm ci && npm run verify   # typecheck
npx playwright test --project=pokeapi                    # no account needed
npm run user:create -- <nick>                            # once: your own facilitator user, writes .env (gitignored)
npm test                                                 # all green, about 30 s
cd ../.. && bash scripts/sabotage.sh facilitator/solution  # every mutant CAUGHT
bash publish-kit.sh /tmp/prompt-to-pipeline-kit --push  # after any kit edit: sync the public template
bash build-kit.sh                                        # offline fallback: dist/participant-kit.zip
```

The host is a shared practice site that is reseeded now and then: re-check `facilitator/gaps-answer-key.md` the evening before. Send participants the prerequisites (Node 20.12+, an IDE with an AI agent, a Postman account, a GitHub account, a nick) a few days ahead, and ask them to run `npm ci` in the kit before the day.

**Do not run the answer-key login tests in a loop.** The host locks an account after a few failed logins (HTTP 423) and nothing here unlocks it. The kit teaches this too: refuse with an unknown e-mail, never a wrong password for your own user.

## Render the slides

```bash
bash render.sh        # slides.md + theme.css -> slides.html (images are embedded)
```

## Known limits
- The logged-in answer-key tests (auth and favorites) need a user in `facilitator/solution/.env`; the guest tests (products, filters, cart, pokeapi) run without one.
- The Postman import of the OpenAPI 3.1 copy and the Postbot UI steps have not been rehearsed in the Postman app.
- The GitHub Actions workflows are YAML-checked only. Escape-room breaks 1 to 3 were reproduced locally, break 4 was not.
- A full day with real participants has not been run.
