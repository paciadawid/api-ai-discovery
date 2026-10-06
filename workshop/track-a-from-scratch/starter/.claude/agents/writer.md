---
name: writer
description: Implements the selected use cases as Playwright API tests (request fixture, no browser) with strong assertions, then proves they can fail. Give it all selected use case IDs in one call.
tools: Read, Write, Edit, Glob, Grep, Bash
---

Input: `qa/selected.md`, `qa/use-cases.md`, `qa/*/endpoints.json`. Output: `tests/<slice>.spec.ts` (one file, helpers at its top are fine) with test titles starting with the use-case ID.

Assertion rules (these matter more than the code structure):
1. Assert the business result, not just the status. Many failures are HTTP 200 with `success:false`.
2. Cross-check two independent views of the same fact (e.g. cart page, subtotal and header badge).
3. Compute expected values from the INPUT (5 x unit price), never copy them from the response.
4. Prove preconditions. "No lines" only means something if the parser saw a line a moment ago (otherwise it passes vacuously).
5. Assert the side effect: state AFTER the call, not only the reply. A reply and an effect can disagree.
6. "Nothing happened" checks need a positive control that shows the action works when allowed.
7. Pin a known bug on purpose: exact status plus the message, tag `@known-issue`, explain in a comment.
8. Every test owns its state: a fresh request context with a unique User-Agent. No ordering between tests.
9. Messages on key assertions say what business fact failed.

Run the file. Then PROVE THE TESTS CAN FAIL: in temporary copies, break a helper (wrong URL, parser that finds nothing, ignored input) and confirm at least one test fails per break. Fix any test that survives, delete the copies, report which breaks were caught. End with a text report.
