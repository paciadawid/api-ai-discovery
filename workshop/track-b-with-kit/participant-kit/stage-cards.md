# Stage cards: run the whole path with ANY AI

Claude Code users can run `/qa-cycle https://bearstore-testsite.smartbear.com <slice> limits: workshop` instead (shorthand `/qa-workshop <slice>`). Everyone else (Claude or ChatGPT in a browser, Copilot, Gemini, a local model) follows these cards. Same stages, same files, same gates; only the driver changes. **You** decide at the gates, whatever the AI says.

## How a card works

1. Each stage reads files and writes ONE file (card 4, Write, writes the framework and spec files it names). The files are the handoff, so a stalled pair can pick up the next stage from the facilitator's copy.
2. To give an AI your files, paste them with `bash scripts/bundle.sh <file>... | pbcopy` (Windows: `| clip`, Linux: `| xclip -selection clipboard`), then paste into the chat. An AI that reads files itself can just be pointed at the paths.
3. Save the AI's answer in the file named on the card, then run the **Check**. A card is done when the check passes, not when the AI sounds sure.
4. Optional, one second: render the stage as a page with `node scripts/visualize.mjs <stage> --root <root>` (or `npm run visualize -- <stage> --root <root>`) and open the file it prints in `<root>/visuals/`. Stages: after Gate 1 `discovery` (`02-discovery.html`), card 2 `usecases` (`03-usecases.html`), card 3 `selected` (`04-selected.html`), card 4 `tests` (`05-tests.html`), card 5 `run` (`06-run.html`), card 6 `sabotage` (`07-sabotage.html`); `index.html` links them all.
5. Card numbers are the step numbers of `/qa-cycle`, in its order: 1 Discovery, 2 Use cases, 3 Prioritize, 4 Write, 5 Run and debug, 6 Sabotage, 7 Strengthen. Gate 1, Map it and Gate 2 sit between them without a number, as in the command. The command's Scope gate (after its scout, before any discovery browser opens) corresponds to the narrowing you do before card 1: pick your slice and the one or two units you will explore, then start card 1.

Setup once: pick a slice slug (for example `qty`) and run `mkdir -p qa/workshop/qty/01-discovery`. Below, `<root>` means `qa/workshop/qty`.

**First message to your AI** (paste once per chat):

```text
You help me build API-only Playwright tests (the `request` fixture, no browser, no page) for
https://bearstore-testsite.smartbear.com, a public demo shop with no documented API.
Rules: record only what was observed, never invent endpoints; every expected value needs an
oracle (how we know it without trusting the system); answer with the file I ask for in one
code block and nothing else; ask me before assuming anything.
```

## 1. Discovery (explore: you drive the browser, the AI organises)

1. Open the shop in a private window. DevTools > Network, filter Fetch/XHR and Doc.
2. Do ONE action at a time for your slice (for example: add a product, change its quantity, remove it). After each, right-click the new request > Copy > **Copy as cURL**. Paste every cURL into `<root>/01-discovery/curls.txt`.
3. Before pasting anything to an AI: delete cookie values from the cURLs. A guest cart holds no secret, but build the habit.

```text
Below are curl commands copied from a browser. Write endpoints.json: a JSON array, one object
per distinct endpoint: {id (EP-CART-<NAME>), purpose (one sentence), method, path (no query),
query, bodyFields [{name, example, required}], success {status, bodySignal}, failure {status,
bodySignal}, verified: false, stateChanging}. Use placeholders for cookies and tokens. Anything
you are unsure about goes into a "questions" list after the JSON, not into the JSON.
```

4. Verify by replaying each call yourself: `curl -i -A "pair-<yourname>"`, your own cookie jar (`-c jar -b jar`), no redirects. A body-less POST needs `-d ''` (otherwise 411) and the header `X-Requested-With: XMLHttpRequest`. Set `"verified": true` only when the replay matched.

**Check:** `<root>/01-discovery/endpoints.json` is valid JSON with 3 or more endpoints and at least 2 verified.
**Short on time or the site is slow:** copy `qa/workshop/cart/fallback/endpoints.json` and `auth.md` into `<root>/01-discovery/` and say so.

## Gate 1: what is true?

```text
From endpoints.json write SUMMARY.md: a table (id, method, path, purpose, verified), surprises,
what was NOT explored, and at most 3 numbered decisions for me, each with your recommendation.
```

Read it. Fix every wrong fact before moving on: a wrong fact becomes a confidently wrong test.
**Check:** you can say aloud which endpoint was never replayed.

## Map it (no AI needed for the first four lines)

```bash
npm run export:postman -- --input <root>/01-discovery/endpoints.json --out exports/postman
npm run export:openapi -- --input <root>/01-discovery/endpoints.json --out exports/openapi.yaml
npx newman run exports/postman/*collection.json -e exports/postman/*environment.json   # expect mostly red
npm run swagger -- --spec exports/openapi.yaml                                         # http://localhost:3000
```

Then write `<root>/01-discovery/ideas.md`, 10 lines at most: flow worth keeping, checks worth keeping, rejected checks and why. An AI can help judge:

```text
Attached: .claude/rules/assertion-rules.md and the newman output. For each generated check say
KEEP or REJECT against the nine rules, one line each with the rule number. Status-only checks,
checks against prose and either-or checks are rejected.
```

**Check:** `ideas.md` names at least one rejected check and the rule it breaks.

## 2. Use cases (design: every use case needs an ORACLE)

Attach `endpoints.json`, `SUMMARY.md`, `ideas.md`.

```text
Write 02-use-cases.md: at most 12 API-level use cases for my slice (happy path, negative,
boundary, state). Each block exactly:
### UC-<SLUG>-<NN>: <title>
- Type: <happy-path | negative | boundary | state>
- Endpoints: <EP ids>
- Preconditions: <state, set up through the API>
- Steps: <numbered requests>
- Expected: <status, business result, side effect, counters>
- Oracle: <how the expected value is known WITHOUT trusting the system, e.g. 5 x unit price>
- Notes: <isolation, flakiness risk>
Drop any idea that has no oracle. Do not write code.
```

**Check:** every block has an Oracle line that is not "what the page shows".

## 3. Prioritize, then Gate 2

```text
Score each use case 1-5: Impact, Likelihood, Coverage value, Cost, Stability risk.
Priority = (2*Impact + Likelihood + Coverage value) / (Cost + Stability risk); show the sums.
Write 03-selected.md: a Decision brief first (what the selection protects and leaves out),
then a table of the best 5, one per capability (add, update, remove) before a second in the
same one, then Deferred with reasons.
```

**Gate 2 is yours:** swap or drop one use case and write one sentence why. **Do not generate tests yet.** The facilitator says when.
**Check:** 5 or fewer selected, each with a reason.

## 4. Write (after the assertion lab)

Attach `.claude/rules/assertion-rules.md`, `.claude/rules/framework-architecture.md`, `.claude/rules/test-style.md`, `.claude/skills/writing-api-tests/SKILL.md`, `02-use-cases.md`, `03-selected.md`, `endpoints.json`, `playwright.config.ts`, and, if they already exist, the framework files the AI must extend (the files under `src/` and one example spec from `tests/<area>/`). On the first run there are none: the AI builds the layers from scratch, following the skill's section Bootstrap, so keep the first use cases small.

```text
For the selected use cases, in ONE answer, give me only the files to add or change, each in its
own code block headed by its path: first the framework parts that are missing (on the first run all of them: src/config/env.ts, the client and an API class in src/api,
parsers and constants in src/domain, an actor in src/actors, matchers in src/matchers, fixtures in src/fixtures; later only
what a use case needs), then the Playwright projects to add to playwright.config.ts, then ONE spec per capability, tests/<area>/<capability>.api.spec.ts, behaviours
only (import { test, expect } from '@/fixtures'; no raw HTTP, regex or process.env in a spec).
Playwright `request` fixture only. Titles start with the UC id and state a behaviour. Every test gets
its own actor from a fixture: a fresh guest with a unique User-Agent and its own cookie jar (the host keys a guest cart by IP +
User-Agent). Add nothing no use case needs. Follow the nine rules; expected values computed from the
input; prove preconditions; read state AFTER the call. Business failures can be HTTP 200 with success:false. A body-less POST needs data: ''.
```

Run: `npm install` (once), `npm run verify`, then `npx playwright test tests/<area>`. If one fails, paste the output back ONCE and ask for a fix.
**Check:** `npm run verify` is green, the specs run, 5 or more tests, titles start with a UC id. Change one expectation by hand ($9.50 to $9.60), read the failure, put it back.

## 5. Run and debug

Run the whole suite once (`npx playwright test`). Everything green: write the verdict in `<root>/05-run-report.md` and go on. A green suite is the baseline card 6 needs.

```text
Attached: the failing output, the use-case block and endpoints.json. Classify each failure as
TEST BUG (fix it), APP BUG (do not change the test; give a curl -i reproduction) or FLAKE
(rerun twice). At most 2 fix attempts per test. Never weaken an assertion to get green.
```

Replay one failing call in Swagger (http://localhost:3000): fresh guest tab, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, Authorize > `browserCookie`. Save the result as `<root>/05-run-report.md`: verdict in one line, bugs with curl, fixes made.
**Check:** every failure has a class and evidence.

## 6 and 7. Sabotage, then Strengthen: can the tests fail?

Start from the green suite of card 5. Never break your real files. Copy the kit, break ONE thing in the copy's `src/`, run, expect red:

```bash
rsync -a --exclude node_modules --exclude .env --exclude test-results --exclude playwright-report ./ /tmp/kit-mut/ && ln -s "$PWD/node_modules" /tmp/kit-mut/node_modules
# edit one thing in /tmp/kit-mut/src, for example the URL of one endpoint call in src/api, changed to a wrong path
(cd /tmp/kit-mut && npx playwright test --reporter=line)
rm -rf /tmp/kit-mut
```

Red (a test fails) is good. Green means a survivor: a test that protects nothing. More ideas: the field a parser in `src/domain` reads (a typo, so it finds nothing), a value an API call in `src/api` sends (always the same one), a matcher in `src/matchers` that always passes.

**7. Strengthen** (only for a survivor):

```text
Attached: my spec and this sabotage: <what you broke>. It SURVIVED (the tests stayed green). Which assertion is the
weakest link, and what is missing (a positive control? a precondition? a second view)? Show
the smallest change that makes a test fail under this sabotage.
```

**Check:** every sabotage turns at least one test red, or you can explain in one sentence why a survivor is acceptable.

## Recap

In one line each, say the verbs: narrow, explore, gate, map, design with oracles, write with the nine rules, classify and replay, prove they can fail. **Check:** you can name the one test you would add after a survivor.

## Be a good guest

The host is shared and public: modest volume, a unique User-Agent per test, no orders, no new accounts. Never paste credentials into an AI chat.
