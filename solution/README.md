# Bearstore API tests (solution / demo)

The finished demo project for the workshop: API-only Playwright tests against Bearstore (SmartStore, https://bearstore-testsite.smartbear.com), built and driven by Claude Code agents. The workshop material lives in `../workshop/README.md`.

## Setup

```bash
cd solution
npm install
cp .env.example .env     # then fill BEARSTORE_EMAIL and BEARSTORE_PASSWORD
npm test                 # 5 live cart tests (guest, no login)
npm run verify           # typecheck + framework rules check
```

The cart slice needs no login; `.env` is only for account slices. Credentials are read only in `src/config/env.ts`. `.env` is gitignored; never commit or log it.

## Layout

| Path | What |
|---|---|
| `src/` | layered framework: `config`, `api`, `domain`, `actors`, `matchers`, `fixtures` |
| `tests/<area>/*.api.spec.ts` | behaviour specs only (now `cart`: adding, changing quantity, removing, isolation); no raw HTTP in specs |
| `qa/` | the cart run: `01-discovery/`, `02-use-cases.md`, `03-selected.md`, `04-coverage.md`, `05-run-report.md`, `06-sabotage-report.md`, `07-strengthen-report.md`, and `visuals/` (one page per stage, start at `index.html`). `qa/workshop/` holds older runs: `cart/fallback/` is the pre-baked cart data and Postbot-improved collection used as the workshop fallback; `cartws/` and `cartscout/` are earlier results that no longer match the current tests |
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

- `/qa-cycle`: the cycle as it stood before the master class: discover, design, prioritise, write, run and debug. The newer cycle (Scout and Scope gate, Map it, Sabotage, Strengthen, a visual page after each stage) lives in `../workshop/track-b-with-kit/participant-kit/`; `qa/06-sabotage-report.md`, `qa/07-strengthen-report.md` and `qa/visuals/` were produced by it.
- `/qa-workshop [scope]`: the workshop-sized variant of that earlier cycle, output under `qa/workshop/<slug>/`.

Conventions and framework rules are in `CLAUDE.md` and `.claude/rules/`.
