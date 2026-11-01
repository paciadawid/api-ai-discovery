# Block 5: chaining, and your own pick

**Goal:** tests that follow a chain (product → favorite → list → remove) and clean up after themselves, plus tests you choose yourself.

**Part 1: the chain.** **prompt 04** (`workshop/prompts.md`). It builds the products and favorites clients and a test of the whole chain. Read the fixture: where does the cleanup run, and why is it not at the end of the test body?

**Part 2: hunt the hallucination (10 minutes).** Open `workshop/hallucination-hunt/README.md`. An AI wrote `flawed.spec.ts`. Find the flaws before you run anything (do not run it). Compare with your neighbour.

**Part 3: your own pick.** Choose ONE area and cover it with the agent (**prompt 05** (`workshop/prompts.md`)), using rules step 2:
- **A. Search and paging:** search finds what it should, no hits is an empty list, pages do not overlap.
- **B. Filters and sorting:** filter by brand returns only that brand, sorting by price really sorts, an unknown brand id and a nonsense sort key (the spec lists a 404 for the list: check what the server does, that is gap H7). Brands come from `GET /brands`, by name.
- **C. Favorites edge cases (the only pick that needs your login):** the same product twice, favorites without a token, a favorite that does not exist.

**Done when:** the chain test and at least two tests from your pick are green, each shows a precondition or a positive control, and nothing leaves data behind (check your favorites list in Postman). Areas A and B only read, so for them the cleanup is "none". The rest of your test plan is homework.

**Stuck?** `workshop/checkpoints/05-chaining/`: save your work, then `rm -rf src tests && cp -R workshop/checkpoints/05-chaining/. .`.
