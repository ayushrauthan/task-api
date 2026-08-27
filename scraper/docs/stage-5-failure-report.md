# Stage 5 — Failure survival and run report

Book pages are handled independently. A failed detail page is logged and skipped so good records survive.

Timeouts and 5xx responses get one retry; 403 and 404 responses are not retried. Every run writes `output/run-report.json` with timing, fetch/cache counts, valid and invalid records, and failed pages.

The CI checkpoint deliberately adds an `.invalid` URL and verifies that 60 good records survive with `failed_pages: 1`.
