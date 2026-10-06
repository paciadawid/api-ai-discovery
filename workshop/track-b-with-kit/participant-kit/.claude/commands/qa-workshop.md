---
description: Workshop-sized API QA cycle for ONE narrow feature (default - cart manipulation). Fits the 105-minute workshop agenda (about 70 minutes of agent work), 2-3 parallel headed discovery agents, max 5 use cases.
argument-hint: [narrow scope, default "cart manipulation"]
---

Run the workshop version of the API QA cycle for: $ARGUMENTS (if empty: "cart manipulation: add to cart, change quantity, remove from cart, mini-cart and cart totals").

Target: https://bearstore-testsite.smartbear.com. Same agents as `/qa-cycle`, but a narrow scope, no scout, and hard limits so it fits the 105-minute workshop (the rest of the time is teaching, breaks and buffer). Every agent must END by delivering its final report as text, even when its files are written. At every STOP, show the key content IN THE CHAT and wait. Do the work through the named agents.

## Setup
- Slug = short kebab-case of the scope (default `cart`). **QA root = `qa/workshop/<slug>/`**. Pass this root to every agent ("QA root: ..."); nothing is written to the default `qa/` root. Tests go to ONE file `tests/<slug>.api.spec.ts`, UC ids are `UC-<SLUG>-NN`.
- No login is needed for the default cart scope (the cart works anonymously). Tests must not require credentials.
- Pre-flight, run these and report one line: `./node_modules/.bin/playwright-cli list` works; `curl -s -o /dev/null -w "%{http_code}" https://bearstore-testsite.smartbear.com/` returns 200; `npx playwright test --list` loads the config (the answer "No tests found" is fine before any test exists). If one fails, say what and offer the fallback (below).
- Show this time box to the user and keep to it:

| Step | Budget |
|---|---|
| 1 Discovery (2-3 headed browsers in parallel) + consolidation | 17 min |
| Gate 1 (read the summary, 3 decisions) | 5 min |
| Map it: export, run the collection, read Swagger | 8 min |
| 2 Use cases + 3 Prioritize + Gate 2 | 8 min |
| 4 Write tests (max 5 use cases) | 20 min |
| 5 Run and debug | 12 min |

If a step overruns by more than 3 minutes, say so and cut in this order: the Postbot step in Map it, then the lowest-scored selected use case, then the debug attempts. Use the fallback for discovery before cutting anything else.

## 1. Discovery (headed, parallel, no scout)
Tell the user how many browser windows will open. Define 2-3 UNITS (participants running on their own laptops use 2, to keep the shared host and their machines calm; the facilitator's projector run uses 3). For the default cart scope use exactly these (each unit uses its OWN browser session and curl jar, starts with its own anonymous cart and adds its own product, so nothing is shared):

| unit key | what it explores | entry |
|---|---|---|
| cart-add | add a product to the cart (valid, invalid product id, repeat add), mini-cart fragment, header counters | a product page, `/cart/addproduct/{productId}/1`, `/shoppingcart/offcanvasshoppingcart`, `/shoppingcart/cartsummary` |
| cart-update | change a line quantity (valid, 0, negative, huge, non-numeric), line and order totals on `/cart` | `/cart`, `/shoppingcart/updatecartitem` |
| cart-remove | remove a line, empty-cart state, move line to wishlist and back | `/cart`, `/shoppingcart/deletecartitem`, `/shoppingcart/moveitembetweencartandwishlist` |

For another scope: derive 2-3 independent units yourself from the scope text, with one owner per mutable state; briefly say what each does.

Launch one `qa-discoverer` per unit **in a single message**. Pass: base URL, unit key, the table row above as the scope brief (there is no areas.md), the QA root, and these limits: at most about 12 browser commands, do NOT place orders or touch checkout beyond reading, record curl replays for every endpoint, write only inside `<root>/01-discovery/units/<unit>/`. After each returns, require the `headed: true` evidence; a unit without it is re-run once, then recorded as a gap.

Then invoke `qa-discovery-consolidator` (QA root passed). Expected: `<root>/01-discovery/{endpoints.json,flows.md,auth.md,open-questions.md,SUMMARY.md}`.

**Fallback (if a browser cannot open, the site is down, or discovery runs over time):** if `<root>/fallback/endpoints.json` exists, tell the user and use it: copy it and `auth.md` into `<root>/01-discovery/`, skip the consolidator, and from step 2 on tell the agents that the endpoint catalogue is the only discovery input (no SUMMARY.md). Say clearly in the final output that the fallback data was used.

**STOP - Gate 1.** Keep it short: endpoints table (id, method, path, purpose, verified), surprises, and at most 3 numbered decisions with a recommendation. Wait.

## Map it (Postman + Swagger, no gate, about 8 minutes)
The discovery file becomes two maps. Run, in this order, and show the key lines in chat:
1. Export: `npm run export:postman -- --input <root>/01-discovery/endpoints.json --out exports/<slug>/postman` and `npm run export:openapi -- --input <root>/01-discovery/endpoints.json --out exports/<slug>/openapi.yaml`.
2. Run the raw collection without installing Postman: `npx newman run exports/<slug>/postman/*collection.json -e exports/<slug>/postman/*environment.json`. **Expect most checks RED**: the raw export is a map, not a suite (path placeholders such as `{productId}` and `{{cartItemId}}` are unset, and the generated "body contains expected signal" checks compare against prose). Say why each group is red; that is the lesson.
3. Optional, needs a Postman account: import both files into Postman and ask Postbot to chain the requests and add tests. Save the result next to the raw one in `exports/<slug>/postman/improved/`. Without a Postman account use `<root>/fallback/postbot-improved.postman_collection.json` if it exists, and say so. Run it with `npx newman run` as well: a chained flow (add, capture the line id, update, move, delete) is typically green.
4. Start Swagger in the background: `npm run swagger -- --spec exports/<slug>/openapi.yaml` (http://localhost:3000). It is the readable map now and the replay tool at debug time.
Then write `<root>/01-discovery/ideas.md`, 10 lines at most: the call FLOW worth keeping (order, ids to capture), checks worth keeping, suggestions rejected and why. Judge every Postman or Postbot check with the nine rules in `.claude/rules/assertion-rules.md`: a status-only check, a prose-signal check, or a field name the server ignores is rejected. Ideas are input to design, never oracles.

## 2. Use cases
Invoke `qa-usecase-designer` with the QA root (it also reads `<root>/01-discovery/ideas.md` if present) and the limit: at most 12 use cases, API-level, covering happy path, negative, boundary and state for the scope. Cap: at most 5 use cases to automate (a parametrised use case may produce 2 `test()` blocks, keep the total at 8 or fewer). Show the type matrix and the UC list (id, title, type) in chat.

## 3. Prioritize
Invoke `qa-prioritizer` with the QA root and the limit: select at most 5 use cases, the ones with the best value for the time, one per capability first (add, update, remove) before a second case in the same capability.

**STOP - Gate 2.** Show the Decision brief (selected table with scores, what is deferred and why). Wait for approval or edits.

## 4. Write (one call, max 5 use cases)
Invoke `qa-api-test-writer` ONCE with all selected UC ids (not one call per UC), the QA root, and a style brief: follow the `writing-api-tests` skill and the rules in `.claude/rules/` (above all `assertion-rules.md`): one spec file `tests/<slug>.api.spec.ts` with small helpers at its top, behaviour-style titles starting with the UC id, each test gets its own request context with a unique User-Agent (private cart, no shared cookies). The writer runs the file, then proves the tests can fail with temporary sabotaged copies, and records coverage in `<root>/04-coverage.md`.

## 5. Run and debug
When a failure is not obvious from the curl repro, replay the call in Swagger UI (http://localhost:3000): open the Bearstore tab as a fresh guest, copy `SMARTSTORE.VISITOR` and `ASP.NET_SessionId` from DevTools > Application > Cookies, click Authorize and paste `SMARTSTORE.VISITOR=<value>; ASP.NET_SessionId=<value>`, run the failing operation and compare the raw reply and the effect in your own cart tab with what the test expected. Note that the spec's example add body uses a fixed product id in the field name (`addtocart_1.EnteredQuantity`): change it to match the product id.

Invoke `qa-api-test-debugger` (QA root passed). Time box 10 minutes, at most 2 fix attempts per test; anything unresolved is reported, not chased. Expected: `<root>/05-run-report.md`.

## Final output (chat)
Verdict (passed/failed counts), the tests by UC id, application bugs with curl repro, and what was deferred. The exports from Map it are already in `exports/<slug>/`; Swagger keeps running for replays.