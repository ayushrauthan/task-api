# FlyRank A9 — The Polite Scraper

A Node.js 20 scraper for the Week 5 A9 assignment. It discovers the first three Books to Scrape catalogue pages, collects 60 unique book URLs, fetches each detail page politely, normalizes prices, validates records with Zod, caches HTML, survives a broken page, and writes a run report.

## Target classification

**Target:** Books to Scrape — https://books.toscrape.com/

Books to Scrape is a public practice sandbox made for scraping exercises. The assignment limits this project to the first three catalogue pages and their 60 books.

**Robots check:** `https://books.toscrape.com/robots.txt` was checked and returned HTTP 404 / no robots file found. A missing robots file is not treated as permission for unrelated sites.

**Scope:** first three catalogue pages only. Pagination follows the site's own `next` link; 60 product URLs are not hardcoded.

**Collected data:** title, product URL, price text, availability text, rating text, description, source catalogue page, fetch timestamp, and normalized `price_gbp`.

> I will not reuse this code on another site without checking its rules and terms first.

## Run

Requirements: Node.js 20+ and npm. No browser, database, proxy, paid API, or cloud account is required.

```bash
cd scraper
npm install
npm start
```

For the deliberate failure-path test:

```bash
npm start -- --with-failure-test
```

That flag adds one made-up product URL. The run should finish and record the failed page in `output/errors.json` without deleting the good records.

## Output

- `cache/catalogue/` — cached catalogue HTML
- `cache/details/` — cached book HTML
- `output/books.json` — schema-validated normalized records
- `output/errors.json` — skipped/invalid pages and reasons
- `output/run-report.json` — run counts, cache hits, failures, and duration

Cache and generated JSON are ignored by Git so the public repository does not contain dozens of HTML files or a misleading generated run.

## Record schema

Each stored record contains:

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "price_gbp": 51.77,
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "...",
  "source_page": "https://books.toscrape.com/catalogue/page-1.html",
  "fetched_at": "2026-08-26T00:00:00.000Z"
}
```

`description` and `rating_text` may be `null`. The URL is the canonical record identity, so duplicate links cannot create duplicate stored records.

## Politeness rules

1. Identify the scraper with a descriptive `User-Agent`.
2. Use an 8-second timeout.
3. Wait at least 500 ms between real network requests.
4. Cache successful HTML and use the cache during development.
5. Check the HTTP status before parsing HTML.
6. Retry once only for timeouts and 5xx responses; do not retry 403/404 responses.
7. Keep the scope to the three required catalogue pages.

## Failure handling

Each detail page is isolated. A timeout, server failure, missing product area, or validation error is captured in `errors.json` and does not stop the other 60 records. The optional failure-test flag proves this path without repeatedly requesting the real site.

## Why no browser?

The required book fields are already present in the HTML sent by the server, so a browser would add cost and complexity without adding information for the core assignment.

## Ethics

Use an official API when one exists. Never bypass logins, paywalls, access controls, or blocks. Collect only the data required for the stated purpose and keep request volume low.

## Limitation

This is deliberately a small assignment scraper, not a general-purpose crawler. Its selectors depend on the Books to Scrape HTML structure and should be reviewed if that structure changes.

## Verification note

The implementation is published with the assignment checkpoint logic, but the live 60-page run is intentionally not claimed here until it is executed in a normal networked Node.js environment. That keeps the repository honest rather than inventing a run report.
