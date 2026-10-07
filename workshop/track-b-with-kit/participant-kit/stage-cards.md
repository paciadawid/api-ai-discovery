# Stage cards: run the whole path with ANY AI

Claude Code users can run `/qa-workshop <slice>` instead. Everyone else (Claude or ChatGPT in a browser, Copilot, Gemini, a local model) follows these cards. Same stages, same files, same gates; only the driver changes. **You** decide at the gates, whatever the AI says.

## How a card works

1. Each stage reads files and writes ONE file. The files are the handoff, so a stalled pair can pick up the next stage from the facilitator's copy.
2. To give an AI your files, paste them with `bash scripts/bundle.sh <file>... | pbcopy` (Windows: `| clip`, Linux: `| xclip -selection clipboard`), then paste into the chat. An AI that reads files itself can just be pointed at the paths.
3. Save the AI's answer in the file named on the card, then run the **Check**. A card is done when the check passes, not when the AI sounds sure.

Setup once: pick a slice slug (for example `qty`) and run `mkdir -p qa/workshop/qty/01-discovery`. Below, `<root>` means `qa/workshop/qty`.

**First message to your AI** (paste once per chat):

```text
You help me build API-only Playwright tests (the `request` fixture, no browser, no page) for
https://bearstore-testsite.smartbear.com, a public demo shop with no documented API.
Rules: record only what was observed, never invent endpoints; every expected value needs an
oracle (how we know it without trusting the system); answer with the file I ask for in one
code block and nothing else; ask me before assuming anything.
```

## 1. Explore (you drive the browser, the AI organises)

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

## 2. Gate 1: what is true?

```text
From endpoints.json write SUMMARY.md: a table (id, method, path, purpose, verified), surprises,
what was NOT explored, and at most 3 numbered decisions for me, each with your recommendation.
```

Read it. Fix every wrong fact before moving on: a wrong fact becomes a confidently wrong test.
**Check:** you can say aloud which endpoint was never replayed.

## 3. Map it (no AI needed for the first four lines)

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

## 4. Design (every use case needs an ORACLE)

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

## 5. Prioritize, then Gate 2

```text
Score each use case 1-5: Impact, Likelihood, Coverage value, Cost, Stability risk.
Priority = (2*Impact + Likelihood + Coverage value) / (Cost + Stability risk); show the sums.
Write 03-selected.md: a Decision brief first (what the selection protects and leaves out),
then a table of the best 5, one per capability (add, update, remove) before a second in the
same one, then Deferred with reasons.
```

**Gate 2 is yours:** swap or drop one use case and write one sentence why. **Do not generate tests yet.** The facilitator says when.
**Check:** 5 or fewer selected, each with a reason.

## 6. Write (after the assertion lab)

Attach `.claude/rules/assertion-rules.md`, `.claude/rules/test-style.md`, `.claude/skills/writing-api-tests/SKILL.md`, `02-use-cases.md`, `03-selected.md`, `endpoints.json`.

```text
Write ONE file tests/<slug>.api.spec.ts for the selected use cases, in ONE answer. Playwright
`request` fixture only. Small helpers (a Shopper class over APIRequestContext, a price parser)
at the top. Titles start with the UC id and state a behaviour. Every test gets a fresh request
context with a unique User-Agent (the host keys a guest cart by IP + User-Agent). Follow the
nine rules; expected values computed from the input; prove preconditions; read state AFTER the
call. Business failures can be HTTP 200 with success:false. A body-less POST needs data: ''.
```

Run: `npx playwright test tests/<slug>.api.spec.ts`. If it fails, paste the output back ONCE and ask for a fix.
**Check:** runs, 5 or more tests, titles start with a UC id. Change one expectation by hand ($9.50 to $9.60), read the failure, put it back.

## 7. Sabotage: can the tests fail?

```bash
bash scripts/sabotage.sh . tests/<slug>.api.spec.ts
```

CAUGHT is good. SURVIVED means a test that protects nothing. NOT APPLICABLE means your spec is shaped differently: break the equivalent by hand in a copy.

```text
Attached: my spec and this mutant: <what you broke>. It SURVIVED. Which assertion is the
weakest link, and what is missing (a positive control? a precondition? a second view)? Show
the smallest change that makes a test fail under this mutant.
```

**Check:** every mutant is CAUGHT, or you can explain in one sentence why a survivor is acceptable.

## 8. Debug and recap

```text
Attached: the failing output, the use-case block and endpoints.json. Classify each failure as
TEST BUG (fix it), APP BUG (do not change the test; give a curl -i reproduction) or FLAKE
(rerun twice). At most 2 fix attempts per test. Never weaken an assertion to get green.
```

Replay one failing call in Swagger (http://localhost:3000): fresh guest tab, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, Authorize > `browserCookie`. Save the result as `<root>/05-run-report.md`: verdict in one line, bugs with curl, fixes made.
**Check:** every failure has a class and evidence.

## Be a good guest

The host is shared and public: modest volume, a unique User-Agent per test, no orders, no new accounts. Never paste credentials into an AI chat.
