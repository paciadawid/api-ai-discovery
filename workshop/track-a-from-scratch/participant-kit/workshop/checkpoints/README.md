# Checkpoints

A working state to jump to when you are stuck or behind. They are safety nets, not the plan: try your own version first.

| Folder | State | Needs |
|---|---|---|
| `04-auth/` | layers, users and products clients, `guest` and `shopper` fixtures, login tests, a products search test | your `.env` user |
| `05-chaining/` | the above plus favorites (with cleanup in the fixture), filters and sorting | your `.env` user |

## Use one
```bash
mkdir -p ../my-work && cp -R src tests ../my-work/   # keep your own version first
rm -rf src tests
cp -R workshop/checkpoints/04-auth/. .
npm run verify && npm test
```
The `rm` matters: a checkpoint replaces some of your files, and the rest of your own tree no longer fits it (the type check fails). Your `.env`, `AGENTS.md` and `qa/` are not touched.

The cart is not here: it is part of the challenge.
