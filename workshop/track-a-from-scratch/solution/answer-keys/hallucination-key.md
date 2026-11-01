# Hallucination hunt: answer key (facilitator only)

`participant-kit/workshop/hallucination-hunt/flawed.spec.ts`. There are eleven rows below and a careful reader finds about fourteen (also: `process.env` read in the spec, no `Accept` header, no read-back after removal, titles that say nothing); accept any a pair can defend. Run live, tests 1 and 2 fail (`product_name` is undefined; TypeError on `listed`) and tests 3 and 4 pass for the wrong reason. Do not run it with a real user.

| # | Where | Flaw | Rule |
|---|---|---|---|
| 1 | `login()` | `console.log` prints the access token | secrets |
| 2 | `BASE` and raw URLs everywhere | no config, no api layer | layers |
| 3 | `product_id: '01M6BPJRSMHW9H3YQAFR20CECD'` | hard-coded ULID, changes when the host is reseeded; the name in the next line is also assumed | rule 4 (preconditions) |
| 4 | `favorite.product_name` | invented field: the reply has `product_id` | `AGENTS.md`: fields come from the spec or a real reply |
| 5 | `let favoriteId` shared by two tests | tests depend on order and run in parallel; nothing cleans the favorite up | rule 9 |
| 6 | `expect(listed.product_id).toBe(listed.product_id)` | tautology: compares the reply with itself, cannot fail | rule 2 |
| 7 | `expect([200, 401]).toContain(status)` | tolerant: passes for a broken login that lets anyone in | rules 1, 3 |
| 8 | `.not.toBe(200)` | passes for 500 and for a dead host; no positive control | rule 6 |
| 9 | `any` and a login on every test | no types; a login per test also reuses 300 s tokens badly | layers |
| 10 | `listed.product_id` when `listed` is undefined | crashes with a TypeError instead of a clear failure | rule 4 |
| 11 | `a wrong password is refused` with the real `TOOLSHOP_EMAIL` | a few runs lock the participant's own account (HTTP 423) for good; `[200, 401]` also accepts a login that works | `AGENTS.md`, rule 6 |

Prompt for the debrief: "Which of these would the agent have made if you had not given it `AGENTS.md`?" (Most of them. That is the argument for the rules file.)
