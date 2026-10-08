# Workshop: tests worth trusting (105 min)

An AI test crew that explores an undocumented API, writes and debugs tests, and a way to check that those tests deserve your trust. Target: the Bearstore demo shop (SmartStore). Postman (with Postbot) gives better flow and structure; Swagger UI gives a debugging console.

## Layout

| Folder | Use it when |
|---|---|
| `track-a-from-scratch/` | participants arrive with **nothing**; you build the project and the agents live (`starter/` is the safety net) |
| `track-b-with-kit/` | participants already have the **kit** (`participant-kit/`) and drive in pairs, one laptop per pair: Claude Code runs `/qa-cycle <url> <slice> limits: workshop`, any other AI follows `stage-cards.md` (open registration, laptops optional) |
| `_archive/` | the old combined slides and run sheet; safe to delete |
| `../solution/` | the finished **demo project**: layered framework, the cart slice (5 live tests), QA artifacts and visual pages, Postman and Swagger exporters; show it, do not hand it out |

Each track is a self-contained subproject: `conspect.md` (facilitator script), `slides.md` (Marp, short slides with speaker notes), `slides.html` (rendered, self-contained), `README.md`, reference suite, finished artifacts, scripts. Assets are duplicated on purpose.

## Shared agenda

1. Hook
2. Setup
3. Narrow (Track A) or Scout and **Scope gate** (Track B)
4. Explore or Discovery, with headed browsers
5. **Gate 1**
6. **Map it**: export, newman red, Postbot-improved green, Swagger, `ideas.md`
7. Design or Use cases and Prioritize, then **Gate 2**
8. Break
9. Assertion lab (real Postbot checks as exhibits)
10. Write
11. Run and debug (replay a failing call in Swagger)
12. Sabotage (and Strengthen in Track B)
13. Recap

Same nine assertion rules, cut order and fallback ladder in both tracks. Only setup and "who types" differ.

## How Postman and Swagger fit

- **Map it** (after Gate 1): one `endpoints.json`, two maps. The raw Postman export runs mostly red in newman (it is a map); the Postbot-improved collection chains the requests and runs green. Judge every Postbot check with the nine rules; adopted and rejected ideas go to `ideas.md`, which the designer reads.
- **Debug**: Swagger UI replays a failing call with a guest browser cookie (`browserCookie` Authorize). Logged-in mode: the proxy login is curl-verified, the Swagger UI click-through is not.
- No Postman account: the pre-baked Postbot collection is in each track (`fallback/` or the kit's `qa/workshop/cart/fallback/`).

## Demo click path (`../solution/`)

1. `qa/visuals/index.html`: the whole run, one page per stage.
2. `qa/visuals/05-tests.html`: what each test checks.
3. `cd ../solution && npx playwright test`: 5 live cart tests (needs network, no login for the cart).
4. `tests/cart/changing-quantity.api.spec.ts`: behaviour titles, no raw HTTP in the spec.
5. `src/` layers and `npm run verify`.
6. `qa/06-sabotage-report.md` and `qa/07-strengthen-report.md`, with `qa/visuals/07-sabotage.html`.

## Before either day

- One full rehearsal per track, end to end, on a participant-like laptop.
- Morning of: the reference suite, the sabotage script and the Map it check of the track you teach (in its conspect, section 1).
- Render slides: `npx @marp-team/marp-cli <track>/slides.md --html`. Images in the slides are embedded as base64, so there is no image folder.
- The repo is public: https://github.com/paciadawid/api-ai-discovery. Facilitator conspects, `slides.md` and `_archive/` are gitignored and stay local; the rendered `slides.html` is committed and contains the speaker notes (press P for the presenter view).
