# Bearstore API tests: workshop and solution

| Folder | What |
|---|---|
| `workshop/` | everything to teach the workshops: Track A (8-hour TestWarez day on the Toolshop API, participant kit) and Track B (105 minutes on Bearstore, with the kit), each with slides (rendered `slides.html` included), reference suite, fallbacks. Facilitator conspects and `slides.md` stay local. Start at `workshop/README.md`. |
| `solution/` | the finished demo project: layered Playwright API framework, the cart slice (5 live tests), QA artifacts and visual pages (`qa/visuals/index.html`), Postman and OpenAPI exporters, `.claude` agents. Run it from inside: `cd solution && npm test` (needs `.env`, see `solution/.env.example`). |

Target: https://bearstore-testsite.smartbear.com (SmartStore). Credentials only in `solution/.env` (gitignored), never in files.

## Start here

- Teaching the workshop: `workshop/README.md` (tracks, shared agenda, demo click path).
- Looking at the finished result: `solution/README.md`, then `solution/qa/visuals/index.html`.
- Handing participants a kit: `workshop/track-b-with-kit/participant-kit/README.md`.
- Working with Claude Code in this repo: `CLAUDE.md` (root), then the `CLAUDE.md` of the folder you work in.
