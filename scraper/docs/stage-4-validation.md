# Stage 4 — Normalize, validate, store

Prices such as `£51.77` become numeric `price_gbp: 51.77` while the original `price_text` is retained.

Zod validates every normalized record before it reaches `output/books.json`. Validation failures are written to `output/errors.json` with a reason. Canonical HTTPS product URLs provide record identity, keeping reruns idempotent.
