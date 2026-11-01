# Hunt the hallucination

`flawed.spec.ts` was written by an AI from a good-looking prompt. It compiles, and it looks like something you would merge. **It has at least ten flaws** that this workshop's rules would catch. Run, two of its four tests fail and the other two pass for the wrong reason.

**Do not run it.** It prints a token, leaves a favorite on the host and sends a wrong password for your user, which is how you get locked out.

So find them by reading:
1. Read it top to bottom, alone, 7 minutes. Mark each flaw with the rule number from `workshop/rules.md` (or "invented", "leak", "secret").
2. Compare with your neighbour for 3 minutes. Did you find the same ones?
3. Then ask your own agent: `Review workshop/hallucination-hunt/flawed.spec.ts against AGENTS.md and workshop/rules.md. Quote each flaw.` How many did it find? Did it invent any?

Takeaway: the flaws that hurt most are the ones that look like normal code.
