# Secrets and configuration (always on)

- Credentials live in `.env` (gitignored) or CI secrets. `.env.example` documents the names with empty values and is the only tracked env file. The default cart scope needs no credentials at all.
- Read secrets from environment variables only (`process.env.BEARSTORE_EMAIL`, `process.env.BEARSTORE_PASSWORD`). Never put a default for a secret in code: a missing secret must fail loudly ("copy .env.example to .env").
- Never hard-code a password, token, cookie value or API key in `tests/`, `scripts/`, `qa/`, `exports/`, docs, or agent/skill files.
- Never log or put into an assertion message: passwords, `Authorization`, `Cookie`/`Set-Cookie` values, `SMARTSTORE.AUTH`. Log names or lengths instead.
- Never read, print or echo `.env` contents into a conversation or a report.
- Exports (Postman/OpenAPI) stay secret-free unless `--with-secrets` is explicitly requested.
- Test data that is not secret (product ids, prices, messages) is fine in the spec as named constants.
- If a secret is ever pasted somewhere shared, say so immediately and recommend rotating it.
