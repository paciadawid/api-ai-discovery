---
name: discovery-to-swagger
description: Convert the QA discovery findings (qa/01-discovery/endpoints.json) into a readable OpenAPI 3 spec and start a local Swagger UI with a proxy so endpoints can be tried from the browser. Use when the user wants Swagger/OpenAPI docs of the discovered Bearstore API.
---

# Discovery to Swagger (OpenAPI)

Turns the consolidated discovery output into `exports/openapi/openapi.yaml` and serves it with Swagger UI locally.

## Steps

1. Check that `qa/01-discovery/endpoints.json` exists. If not, tell the user discovery has not run yet and suggest `/qa-cycle`. Do not invent endpoints. A different file can be passed with `--input <path>`.
2. Generate the spec: `npm run export:openapi`
   - `--input <path>`, `--out <file>` (default `exports/openapi/openapi.yaml`), `--base-url <url>`, `--title <text>`
3. Report the output: operation, path and tag counts, and any skipped duplicates it printed.
4. Start the UI: `npm run swagger` (add `-- --port 4000` to change the port, default 3000). Run it in the background so the session is not blocked, then confirm with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`.
5. Tell the user:
   - open http://localhost:3000
   - to try an authenticated endpoint: run the AUTH login operation first with "Try it out" (email and password in the form); the proxy keeps the session cookie in the browser, so later calls are authenticated
   - the spec is re-read on every page load, so regenerate and refresh
   - stop the server with Ctrl+C (or kill the background process)

## What is generated

- Tags per area, `operationId` = endpoint id, query parameters, form or JSON request bodies.
- Success and failure responses with Location and Set-Cookie headers; redirects have no body.
- A `cookieAuth` scheme (API key in cookie, named after the observed login cookie) on endpoints that need login.
- `x-verified` and `x-state-changing` extensions, also stated in each description.

## How the local server works

`scripts/swagger-server.mjs` serves `swagger-ui-dist`, the spec with `servers` rewritten to `/proxy`, and `/proxy/*` which forwards to the target. The proxy rewrites redirect Locations and strips Domain, Secure and SameSite from cookies so they work on localhost without CORS problems.

## Notes

- State-changing operations really change data on the target site.
- Credentials are never written into the spec.
