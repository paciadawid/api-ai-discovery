# Bearstore API tests (solution / demo)

The finished demo project for the workshop: API-only Playwright tests against Bearstore (SmartStore, https://bearstore-testsite.smartbear.com), built and driven by Claude Code agents. The workshop material lives in `../workshop/README.md`.

## Setup

```bash
cd solution
npm install
cp .env.example .env     # then fill BEARSTORE_EMAIL and BEARSTORE_PASSWORD
npm test                 # 33 tests
npm run verify           # typecheck + framework rules check
```

Credentials are read only in `src/config/env.ts`. `.env` is gitignored; never commit or log it.

## Layout

| Path | What |
|---|---|
| `src/` | layered framework: `config`, `api`, `domain`, `actors`, `matchers`, `fixtures` |
| `tests/<area>/*.api.spec.ts` | behaviour specs only (`auth`, `cart`, `cartws`, `catalog`, `content`, `search`); no raw HTTP in specs |
| `qa/` | QA artifacts: discovery, use cases, selection, coverage, run report; `qa/workshop/cart/fallback/` holds pre-baked cart data and the Postbot-improved collection |
| `scripts/` | exporters (Postman, OpenAPI), Swagger server, scope extractor, framework check |
| `exports/` | generated Postman and OpenAPI files (regenerable, gitignored) |
| `.claude/` | agents, commands (`/qa-cycle`, `/qa-workshop`), rules and skills that drive the cycle |

## Commands

| Command | Does |
|---|---|
| `npm test` | run all API tests |
| `npm run verify` | typecheck and enforce the framework rules |
| `npm run export:postman` | write a Postman collection and environment to `exports/postman/` (no secrets) |
| `npm run export:openapi` | write `exports/openapi/openapi.yaml` |
| `npm run swagger` | serve the spec with Swagger UI and a proxy on http://localhost:3000 |

## Claude Code

- `/qa-cycle`: the full cycle (discover, design, prioritise, write, run, debug).
- `/qa-workshop [scope]`: the time-boxed workshop cycle, default scope cart manipulation, output under `qa/workshop/<slug>/`.

Conventions and framework rules are in `CLAUDE.md` and `.claude/rules/`.
