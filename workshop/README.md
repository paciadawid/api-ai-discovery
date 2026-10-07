# Workshop: tests worth trusting (105 min)

An AI test crew that explores an undocumented API, writes and debugs tests, and a way to check that those tests deserve your trust. Target: the Bearstore demo shop (SmartStore). Postman (with Postbot) gives better flow and structure; Swagger UI gives a debugging console.

## Layout

| Folder | Use it when |
|---|---|
| `track-a-from-scratch/` | participants arrive with **nothing**; you build the project and the agents live (`starter/` is the safety net) |
| `track-b-with-kit/` | participants already have the **kit** (`participant-kit/`) and drive in pairs with `/qa-workshop <slice>` |
| `_archive/` | the old combined slides and run sheet; safe to delete |
| `../solution/` | the finished **demo project**: layered framework, 33 tests, Postman and Swagger exports; show it, do not hand it out |

Each track is a self-contained subproject: `conspect.md` (facilitator script), `slides.md` (Marp, 28 short slides), `README.md`, reference suite, finished artifacts, scripts. Assets are duplicated on purpose.

## Shared agenda

| Time | Min | Block |
|---|---|---|
| 0:00 | 5 | Hook |
| 0:05 | 10 | Setup |
| 0:15 | 6 | Narrow |
| 0:21 | 14 | Explore (2 headed browsers) |
| 0:35 | 4 | Gate 1 |
| 0:39 | 10 | **Map it**: export, newman red, Postbot-improved green, Swagger, `ideas.md` |
| 0:49 | 8 | Design + Gate 2 |
| 0:57 | 5 | Break |
| 1:02 | 7 | Assertion lab (real Postbot checks as exhibits) |
| 1:09 | 14 | Write |
| 1:23 | 7 | Sabotage |
| 1:30 | 9 | **Debug with Swagger** (replay a failing call) |
| 1:39 | 4 | Recap |
| 1:43 | 2 | Buffer |

Same nine assertion rules, cut order and fallback ladder in both tracks. Only setup and "who types" differ.

## How Postman and Swagger fit

- **Map it** (after Gate 1): one `endpoints.json`, two maps. The raw Postman export runs mostly red in newman (it is a map); the Postbot-improved collection chains the requests and runs green. Judge every Postbot check with the nine rules; adopted and rejected ideas go to `ideas.md`, which the designer reads.
- **Debug**: Swagger UI replays a failing call with a guest browser cookie (`browserCookie` Authorize). Logged-in mode: the proxy login is curl-verified, the Swagger UI click-through is not.
- No Postman account: the pre-baked Postbot collection is in each track (`fallback/` or the kit's `qa/workshop/cart/fallback/`).

## Demo click path (`../solution/`)

1. `qa/workshop/cartws/test-map.html`: what each test checks.
2. `cd ../solution && npx playwright test tests/cartws`: 12 tests green.
3. `tests/cartws/changing-quantity.api.spec.ts`: behaviour titles, no HTTP in the spec, `@known-issue` for KI-1.
4. `src/` layers and `npm run verify`.
5. `qa/workshop/cartws/04-coverage.md`, section "Adopted from the Postbot collection".

## Before either day

- One timed rehearsal per track; replace the budgets with real minutes.
- Morning of: the reference suite, the sabotage script and the Map it check of the track you teach (in its conspect, section 1).
- Render slides: `npx @marp-team/marp-cli <track>/slides.md --html`.
- The repo is public: https://github.com/paciadawid/api-ai-discovery. Facilitator conspects, slides and `_archive/` are gitignored and stay local.
