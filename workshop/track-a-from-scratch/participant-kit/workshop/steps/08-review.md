# Block 8: architecture review

**Goal:** judge your own framework as a stranger would, and prove it can fail.

1. **Layer check (5 min).** Open one spec. Is there a raw URL, a `fetch`, a parser or a magic id in it? Each one is a leak: move it down a layer.
2. **Rules check (5 min).** Pick your best test and tick `workshop/rules.md` against it, row by row. Which rule does it miss?
3. **Break it, three times (15 min).** Change one thing in `src/` (a path, a field name, a value you send). Run **only the area you broke** (`npx playwright test tests/<area>`), not the whole suite. Did something go red? Put it back.
   A break in the fixture can leave a favorite behind. If your next run stops at "not a favorite yet", remove the leftover in Postman (`DELETE /favorites/<id>`).
   Try at least one break **inside a fixture or helper** (a cleanup that does nothing, a helper that changes what the caller sent). Those survive most often.
   A break nobody notices is a gap: write the test that would have caught it.
4. **Ask for a review (10 min).** Prompt 08. Then judge it: open three findings, are they real? Which of your breaks would the review **not** have found?
5. **Show one test (90 seconds):** what it protects, and which rule you are proudest of.
6. **Take home:** `AGENTS.md` and `workshop/rules.md` are the part you reuse on Monday. Which three facts about YOUR own API would you write into an `AGENTS.md`?

**Done when:** every break turned something red, or you wrote the test that makes it so.
