# Your test framework, one block at a time

> **TestWarez 2026: "From prompt to pipeline".** This is a GitHub **template**. Click **Use this template → Create a new repository** (private is fine), then clone your own copy. Do not clone this one: you will push to yours in block 6.

You build a small API test framework today: Playwright + TypeScript, against the Toolshop practice API, with **your own user**. Postman and Postbot help you explore. Your IDE agent helps you code. You decide what is worth trusting.

## The two halves of this repository

| Half | What | You change it? |
|---|---|---|
| **The framework** | `src/` `tests/` `qa/` `scripts/` `AGENTS.md` `playwright.config.ts` `.env` | Yes. This is what you build and keep. |
| **The workshop** | everything in `workshop/` | No. Steps, prompts, rules, hints, exercises. Read it. |

## Where am I?

| Block | Open | You end with |
|---|---|---|
| 0 Setup | `workshop/steps/00-setup.md` | green smoke test, agent knows the rules |
| 1 API discovery | `workshop/steps/01-discovery.md` | your user, a token, five notes |
| 2 Gap analysis | `workshop/steps/02-gaps.md` | `qa/gaps.md` |
| 3 IDE handoff | `workshop/steps/03-handoff.md` | `.env`, host facts, `qa/test-plan.md` |
| 4 Test coding I | `workshop/steps/04-first-tests.md` | layers, a login test you trust |
| 5 Test coding II | `workshop/steps/05-chaining.md` | a chain with cleanup, your own tests |
| 6 CI/CD debugging | `workshop/steps/06-ci.md` | a green pipeline |
| 7 Challenge | `workshop/steps/07-challenge.md` | tests for an API you have not seen |
| 8 Architecture review | `workshop/steps/08-review.md` | a framework you can defend |

Prompts for your agent: `workshop/prompts.md`. The assertion rules: `workshop/rules.md`.

## Commands

```bash
npm ci                # once
npm run preflight     # is my machine ready?
npm test              # run the tests
npm run verify        # type check
npm run report        # open the HTML report
```

## Stuck or behind?
`workshop/checkpoints/` has a working state for blocks 4 and 5. Say so out loud first: it is usually a two-minute fix.

## Rules of this folder
- `.env` holds your password and stays on your machine. Never paste it into a chat, a log or a prompt.
- The host is public and shared by the whole room: stay at two workers, create little data, clean up.
