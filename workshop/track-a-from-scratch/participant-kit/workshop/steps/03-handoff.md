# Block 3: IDE handoff

**Goal:** hand what you learned to your AI agent through files, then stay in charge of the plan.

1. **Your user into the project.** Copy `.env.example` to `.env`, fill `TOOLSHOP_EMAIL` and `TOOLSHOP_PASSWORD` from your Postman environment. (A second user is cheap insurance: `npm run user:create` registers one with a new nick. Keep it as a spare.) Type or copy them yourself: **never** paste them into an AI chat. `git status` must not list `.env`.
2. **Teach the agent what you found.** In `AGENTS.md`, under "Host facts", add only the three to five facts from `qa/gaps.md` that change how test code is written (a wrong status, a bug to pin): what the server really does. `qa/gaps.md` stays the full table; `AGENTS.md` is the short list the agent reads every time. That is the handoff. The agent only knows what is written down.
3. **Plan before code.** **prompt 01** (`workshop/prompts.md`). The agent proposes a test plan and writes it into `qa/test-plan.md`, replacing the example rows. It writes **no code**.
4. **Gate: you decide.** Cut the plan to six to eight rows. Every row must come from the spec or a gap. Keep at least one auth row and one row that pins a bug on purpose. Delete anything you cannot explain, and write what you cut under "Cut list" in the same file.

**Done when:** `.env` works (no one else has seen it), `AGENTS.md` has your facts, and `qa/test-plan.md` is a plan you would defend. The next blocks build only part of it (AUTH-01, the favorites chain, your own pick). The rest of the plan is homework.

**Think:** which of your agent's proposals did you cut, and why?
