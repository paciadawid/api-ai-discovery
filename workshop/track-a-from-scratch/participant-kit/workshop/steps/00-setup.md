# Block 0: setup

**Goal:** the tools work, one tiny test is green, and your AI agent has seen the project.

1. Get the kit: open the template link the facilitator shows, click **Use this template → Create a new repository** (private is fine), clone **your** repository and open that folder in a terminal. (Node 20.12 or newer; check with `node -v`. No GitHub account? Use *Code → Download ZIP*; you will need one in block 6.)
2. `npm ci`, then `npm run preflight`. You want `Pre-flight OK`.
3. `npx playwright test` shows `1 passed`. That is the smoke test: it proves the toolchain, and it checks almost nothing. You will replace it.
4. Open the folder in your IDE with your AI agent (Copilot, Cursor, Cline, Claude Code, ...).
   Ask: `Read AGENTS.md and workshop/rules.md and tell me in three lines what this repo is for and what you must never do. Change nothing.`
5. Postman is installed and you are signed in (free account is fine).
6. Choose a short nick (letters and digits). It goes into your test user's e-mail so the host owner can tell whose it is.
7. Open `README.md` in the kit: it says where each block lives.

**What you should see:** `Pre-flight OK` with a Node, npm and network line, then `1 passed`. If preflight prints a red line, read it: it says what is missing.

**Done when:** preflight is OK, the smoke test is green, and the agent repeated the rules back correctly.

**Stuck?** Say so now: installs are a team sport. No Postman account? Use the browsable docs at https://api.practicesoftwaretesting.com/api/documentation and a REST client of your choice for block 1.
