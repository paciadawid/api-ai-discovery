# Escape room: answer key (facilitator only)

`participant-kit/workshop/escape-room/api-tests.yml` has four planted breaks. Each one is a different class of cause, which is the point of the exercise.

| # | Break | First symptom in the log | Class | Fix | Only in CI? |
|---|---|---|---|---|---|
| 1 | `TOOLSHOP_EMAIL: ${{ secrets.TOOLSHOP_USER }}` | `TOOLSHOP_EMAIL / TOOLSHOP_PASSWORD are not set` in tests that need the account | config | use the secret that exists: `secrets.TOOLSHOP_EMAIL` | yes: the secret is only in GitHub |
| 2 | `TOOLSHOP_BASE_URL: ...practicesoftwaretesting.co` | `getaddrinfo ENOTFOUND` / connection errors, also in tests that need no login | environment | remove the override or fix the host (`.com`) | partly: a typo you can reproduce with `TOOLSHOP_BASE_URL=... npx playwright test` |
| 3 | `npx playwright test --project=prod` | `Project(s) "prod" not found` | config | remove the flag: the config has no `prod` project | no: reproduce locally with the same command |
| 4 | upload path `playwright-reports/` and no `if: ${{ !cancelled() }}` | "No files were found with the provided path" and no report after a red run | config | `path: playwright-report/` plus `if: ${{ !cancelled() }}` | yes (not reproduced locally; verify on the first real run) |

Order they surface in: 3 first (nothing runs at all), then 2 (every request fails), then 1 (account tests fail while guest tests pass), then 4 (the report is missing exactly when you need it).

Coaching:
- "Which of these is the application's fault?" None. If a pair blames the host, ask for the request that proves it.
- Redact the log before pasting it into an AI chat. Passwords are not printed by the kit, but the email and URL are.
- A fix such as `continue-on-error: true` does not count; say so out loud once.
- Reproduced locally: breaks 1, 2, 3. Break 4 was only read from the workflow, so treat it as untested until you run it once.
