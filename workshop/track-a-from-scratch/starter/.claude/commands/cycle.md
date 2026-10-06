---
description: Run the API test cycle for ONE narrow slice (explorer, designer, writer, debugger) with two human gates
argument-hint: <narrow slice, e.g. "cart: change quantity">
---

Run the cycle for the slice: $ARGUMENTS. Use the named agents; do not do their work yourself. At each STOP show the key content in the chat and wait for me.

1. Split the slice into 2 independent units (one owner per piece of mutable state). Launch one `explorer` per unit in a single message so the browsers run in parallel. Require `headed: true` evidence; re-run a unit that lacks it once.
2. **STOP, Gate 1.** Show the endpoints table, the surprises, and the open questions. Ask what is in or out.
3. Map it (no gate): `npm run export:postman -- --input qa/<slice>/endpoints.json --out exports/postman`, `npm run export:openapi -- --input qa/<slice>/endpoints.json --out exports/openapi.yaml`, then `npx newman run` on the collection: expect most checks RED (unset placeholders, prose checks); say why. Optionally let Postbot chain the requests and add tests (fallback: `fallback/postbot-improved.postman_collection.json`) and run that too. Start `npm run swagger -- --spec exports/openapi.yaml` in the background. Write `qa/<slice>/ideas.md` (10 lines max): the call flow worth keeping, checks worth keeping, suggestions rejected and why. Ideas are input to design, never oracles.
4. Run `designer` (it reads `ideas.md`). **STOP, Gate 2.** Show the decision brief; wait for approval or edits.
5. Run `writer` ONCE with all selected use case IDs.
6. Run `debugger`. Show the verdict, app bugs with curl repro, and what was left out.
Every agent must end by delivering its report as text.
