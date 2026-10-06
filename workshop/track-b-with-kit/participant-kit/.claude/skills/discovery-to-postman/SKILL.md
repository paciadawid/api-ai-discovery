---
name: discovery-to-postman
description: Convert the QA discovery findings (qa/01-discovery/endpoints.json) into an importable Postman collection v2.1 plus environment file, with per-request tests. Use when the user wants a Postman collection of the discovered Bearstore API.
---

# Discovery to Postman

Turns the consolidated discovery output into `exports/postman/`.

## Steps

1. Check that `qa/01-discovery/endpoints.json` exists. If not, tell the user discovery has not run yet and suggest `/qa-cycle`. Do not invent endpoints. A different file can be passed with `--input <path>`.
2. Run: `npm run export:postman`
   - `--input <path>`: alternative endpoints.json
   - `--out <dir>`: output folder (default `exports/postman`)
   - `--base-url <url>`: default `https://bearstore-testsite.smartbear.com`
   - `--with-secrets`: write `BEARSTORE_EMAIL` / `BEARSTORE_PASSWORD` from the environment into the environment file. Off by default; never do this unless the user asks, and remind them the file then contains a password.
3. Read the script output and report to the user:
   - the two file paths (`*.postman_collection.json`, `*.postman_environment.json`)
   - request count, folder count and how many requests are unverified
   - any warnings it printed
4. Tell the user how to use it:
   - Postman: Import both files, select the "... - local" environment, fill `email` and `password`, then run the AUTH folder first (Postman keeps the session cookie), then the other folders or the whole collection with the Runner.
   - CLI (optional): `npx -y newman run exports/postman/<collection>.json -e exports/postman/<environment>.json`

## What is generated

- One folder per area, AUTH first. Public requests before authenticated ones.
- URLs use `{{baseUrl}}`; credentials in bodies use `{{email}}` / `{{password}}`.
- Body per observed content type (urlencoded, JSON or multipart).
- `pm.test` checks from the discovery: success status, Location, Set-Cookie names, body signal. Redirect responses are not followed.
- The request description holds purpose, auth need, state-changing and verified flags, and the success and failure behaviour.

## Notes

- The collection is generated; edit the discovery data and regenerate instead of hand-editing the JSON.
- State-changing requests (cart, profile, ...) really change the target site's data. Mention this when handing over the collection.
