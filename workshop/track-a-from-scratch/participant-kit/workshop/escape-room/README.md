# Escape room: a pipeline that will not go green

`api-tests.yml` in this folder is your workflow with a few things broken, the way real pipelines break. Your job: make it green again, **one cause at a time, one commit per fix**.

How:
1. `cp workshop/escape-room/api-tests.yml .github/workflows/api-tests.yml`, commit, push.
2. Open the failing run. Find the **first** real error, not the last line and not the loudest.
3. Before you change anything, name the cause: *config*, *environment*, *test* or *application*. Use prompt 06 in `workshop/prompts.md`.
4. Prove the diagnosis if you can reproduce it on your laptop (unset a variable, run the same command).
5. Smallest fix, push, read the next failure.

Rules of the room:
- Do not look at the answer key and do not diff against `workshop/pipeline.yml`: that is a copy, not a diagnosis.
- Redact secrets before pasting a log anywhere.
- Fixing the symptom (for example making a step `continue-on-error`) does not count.

When you are done: how many separate causes did you find, and which ones could ONLY have been found in CI?
