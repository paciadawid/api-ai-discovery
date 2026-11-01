# Block 1: meet the API (Postman and Postbot)

**Goal:** you have your OWN Toolshop user, you can get a token, and you know what the API looks like.

1. **Import the spec.** Postman → Import → `workshop/toolshop-openapi.3.1.json`. (Or import from the link https://api.practicesoftwaretesting.com/docs.) Browse the folders: that is the map you were handed.
2. **Make an environment** called `toolshop` with `baseUrl` = `https://api.practicesoftwaretesting.com`, plus empty `email`, `password`, `token`. Mark `password` and `token` as **secret**. Select the environment.
3. **Add one header to the whole collection (or every request): `Accept: application/json`.** Postman sends `*/*` by default, and on this host a failed validation then answers with a `302` to an HTML page instead of JSON. You will hunt that in block 2; for now just add it.
4. **First call, no login.** `GET {{baseUrl}}/products/search?q=pliers`. Read the reply: which fields does a product have? Ask Postbot: *"Explain this response. Which fields would a test care about?"*
5. **Register YOUR user** (once; users cannot be deleted). `POST {{baseUrl}}/users/register`, JSON body:
   ```json
   { "first_name": "Ada", "last_name": "<your nick>", "email": "twz26-<nick>-<4 random chars>@example.com", "password": "<8+ chars: upper, lower, digit, symbol>" }
   ```
   Expect `201`. Put the e-mail and password in your environment. Do not reuse a real password. If the registration answers `422`, read the message: it lists the password rules.
6. **Log in.** `POST {{baseUrl}}/users/login` with `{ "email": "{{email}}", "password": "{{password}}" }`. You get `access_token` and `expires_in`.
   Ask Postbot: *"Add a post-response script that saves access_token into the environment variable token."* **Read the script before you run it.** You own what the AI writes.
7. **Use the token.** `GET {{baseUrl}}/users/me` with Authorization = Bearer Token `{{token}}`. It should return you. Now log out (`GET {{baseUrl}}/users/logout`) and send `/users/me` again. What happens? (Or wait until `expires_in` has passed.)
8. **Explore one feature that interests you** for 10 minutes: favorites, a product filter, brands, carts. Send real requests, change one thing at a time.
9. Fill `qa/notes.md`: five lines.

**Done when:** `/users/me` returns your e-mail, your environment holds `email`, `password`, `token`, and `qa/notes.md` has five lines.

**Careful:** a few failed logins in a row lock your account (HTTP `423`). Check your password in the environment before you retry. A locked user is gone: register another one with a new nick.

**Stuck?** `npm run user:create` registers a user for you and writes `.env`. Open `.env` yourself and copy the e-mail and password into your Postman environment (your own file: fine; into an AI chat: never).
