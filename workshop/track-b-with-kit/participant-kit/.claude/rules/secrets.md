# Secrets and configuration (always on)

- Credentials live in `.env` (gitignored) or CI secrets. `.env.example` documents the variable names with empty values and is the only tracked env file.
- Read secrets from environment variables only, and only inside `src/config/env.ts`, the one module of the framework allowed to touch `process.env`. Fixtures, actors and specs import `env` from `@/config/env`; a `process.env` anywhere else under `src/` or `tests/` fails `npm run verify`. Never put a default for a secret in code: a missing secret must fail loudly ("copy .env.example to .env"). Non-secret settings such as the base URL may have a default there.
- Never hard-code a password, token, cookie value or API key in `src/`, `tests/`, `scripts/`, `qa/`, `exports/`, docs, or agent/skill files.
- Never log or put into an assertion message: passwords, `Authorization` headers, `Cookie`/`Set-Cookie` values, session or auth tokens. Log names or lengths instead.
- Never read, print or echo `.env` contents into a conversation or a report.
- Exports (Postman/OpenAPI) stay secret-free unless `--with-secrets` is explicitly requested.
- Test data that is not secret (ids, prices, messages) is fine as named constants in `src/domain/`.
- If a secret is ever pasted somewhere shared, say so immediately and recommend rotating it.
