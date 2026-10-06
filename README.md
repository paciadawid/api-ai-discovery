# Bearstore API tests: workshop and solution

| Folder | What |
|---|---|
| `workshop/` | everything to teach the 105-minute workshop: two tracks (A from scratch, B with the kit), each with conspect, slides, starter or kit, reference suite, fallbacks. Start at `workshop/README.md`. |
| `solution/` | the finished demo project: layered Playwright API framework, 33 tests, QA artifacts, Postman and Swagger exports, `.claude` agents. Run it from inside: `cd solution && npm test` (needs `.env`, see `solution/.env.example`). |

Target: https://bearstore-testsite.smartbear.com (SmartStore). Credentials only in `solution/.env` (gitignored), never in files.
