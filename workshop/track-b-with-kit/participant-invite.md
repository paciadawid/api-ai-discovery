# Invitation message (OPTIONAL: only if the organizer can forward it; the workshop works without it, setup then happens in the room)

**Subject: Tests worth trusting: what to bring (10 minutes, all optional)**

Hi,

In the workshop we go through the whole path of building API tests with AI help: narrow a feature, explore an API nobody documented, design and prioritise use cases, have the AI build the tests in a clean layered framework, run and debug them, then prove they can fail. You do it yourself, in pairs.

**You do not need a laptop.** If you have none, join a pair; the decisions at each step are yours and that is the point of the workshop.

**If you bring a laptop** (about 10 minutes of preparation):

1. Install Node 20.12 or newer (https://nodejs.org).
2. Get the kit: `git clone https://github.com/paciadawid/api-ai-discovery` and `cd api-ai-discovery/workshop/track-b-with-kit/participant-kit` (or download the zip from the same page).
3. Run `npm ci`, then `bash scripts/preflight.sh` (PASS lines and "Pre-flight OK") and `npm run verify` (should end green). On Windows use Git Bash. If it fails, bring it anyway: we fix installs in the first 10 minutes, or you pair with someone whose laptop works.
4. Bring **any AI you already use**: Claude Code, a chat in the browser, Copilot, Gemini, a local model. The kit has a step-by-step card per stage (`stage-cards.md`), so the tool does not matter. With Claude Code you can also run the ready-made agents (`npx playwright install chromium` once).

No account on the shop is needed and nothing is ordered. Please do not put passwords or tokens into an AI chat.

[Date, time, room, wifi note]

See you there,
[Name]
