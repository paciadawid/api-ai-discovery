# Secrets and configuration (always on)

- Credentials and environment-specific values live in `.env` (gitignored) or CI secrets. `.env.example` documents the names with empty values and is the only tracked env file.
- `src/config/env.ts` is the only module that reads `process.env` / loads `.env`. Everything else imports `env` from `@/config/env`. A secret is resolved lazily (`env.customer()`), so suites that do not log in do not need it.
- Never hard-code a password, token, cookie value or API key in `src/`, `tests/`, `scripts/`, `qa/`, `exports/`, docs, or agent/skill files. Never put a default for a secret in code: missing secrets must fail loudly with the "copy .env.example" message.
- Never log, `console.log`, `testInfo.attach` or put into an assertion message: passwords, `Authorization`, `Cookie`/`Set-Cookie` values, `SMARTSTORE.AUTH`. Log names or lengths instead.
- Never read, print or echo `.env` contents into a conversation or a report. Do not commit `.env`; do not `git add -A` without checking `git status`.
- Exports (Postman/OpenAPI) must stay secret-free unless `--with-secrets` is explicitly requested.
- Test data that is not secret (product ids, prices, messages) belongs in `src/domain`, not in `.env`.
- If a secret is ever committed or pasted somewhere shared, say so immediately and recommend rotating it.
