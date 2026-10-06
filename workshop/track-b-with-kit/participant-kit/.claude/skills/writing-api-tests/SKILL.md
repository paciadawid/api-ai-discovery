---
name: writing-api-tests
description: Use when writing or reviewing the Playwright API tests of a slice in this project. Gives the procedure, the review checklist and one annotated example test for the one-file, minimal-structure setup.
---

# Writing API tests (minimal structure)

Rules: `.claude/rules/assertion-rules.md` (read first), `test-style.md`, `secrets.md`.

## Procedure
1. Read each selected UC in `<root>/02-use-cases.md`, especially its ORACLE (how the expected value is known without trusting the system under test), and its endpoints in `<root>/01-discovery/endpoints.json`.
2. Write `tests/<slug>.api.spec.ts`: a few helpers at the top (a `Shopper` class whose methods return status plus parsed body, `newShopper()` creating a request context with a unique User-Agent and a warm-up `GET /`), then `test.describe` with one `test` per behaviour.
3. Run it: `npx playwright test tests/<slug>.api.spec.ts`.
4. Prove it can fail: copy the file, break one thing (endpoint URL, parser, ignored input), run the copy, expect red, delete the copy. A test that survives needs a stronger assertion.

## Review checklist
- [ ] Title is a behaviour and starts with the use-case ID
- [ ] Every expected value has an oracle (computed from the input, or a second independent view)
- [ ] Preconditions proven before any "absence" check
- [ ] State read after the call, not only the reply
- [ ] "Untouched" checks have a positive control
- [ ] A stranger could read the failure message
- [ ] The test owns its state (unique User-Agent)

## One annotated test
```ts
test('UC-CART-03: changing the quantity reprices the SAME line and the subtotal', async ({ shopper }) => {
  await shopper.add(GOLFBALL.id, 1);
  const [before] = (await shopper.cart()).lines;      // state BEFORE

  await shopper.update(before.id, 5);

  const cart = await shopper.cart();                  // state AFTER, read independently
  expect(cart.lines, 'still one line').toHaveLength(1);
  expect(cart.lines[0].id, 'the line keeps its identity').toBe(before.id);
  expect(cart.lines[0].totalCents).toBe(5 * GOLFBALL.unitCents);   // oracle: input x price
  expect(cart.subtotalCents).toBe(5 * GOLFBALL.unitCents);         // second view
  expect(await shopper.badge()).toBe(5);                           // third view
});
```

## Smell checklist (reject in review)
- `expect(res.status()).toBe(200)` as the only check
- an expected value copied from the response or the page
- `toHaveLength(0)` with no proof the parser saw a line before
- a shared cart or an order dependency between tests
- `waitForTimeout`, `.only`, `skip`, a hard-coded secret
