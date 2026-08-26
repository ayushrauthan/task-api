# A9 checkpoints

Run these in order in a normal networked Node.js environment.

## Stage 1 — fetch and cache

First run should create catalogue cache HTML and report a real fetch. A second run should report cache hits and avoid re-downloading the same catalogue HTML.

## Stage 2 — discover

The script follows `next` links for exactly three catalogue pages and de-duplicates the discovered product URLs. Expected target: `catalogue_pages=3`, `discovered=60`, `unique_urls=60`.

## Stage 3 — extract

Each detail page produces the eight raw fields required by the assignment. Missing descriptions remain `null`.

## Stage 4 — normalize and validate

`price_text` remains unchanged and `price_gbp` is numeric. `output/books.json` must contain 60 unique HTTPS product URLs after a clean run and remain 60 after a rerun.

## Stage 5 — failure path

Run:

```bash
npm start -- --with-failure-test
```

The intentional non-existent URL should be recorded in `output/errors.json`; the good records must survive.

## Stage 6 — publish

The repository should contain a reproducible command, the target classification, robots result, schema, politeness rules, limitation, and evidence from a real local run. Do not manufacture run-report numbers when the networked run has not actually happened.
