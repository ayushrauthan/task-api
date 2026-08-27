# FlyRank W5 A9 — The Polite Scraper

A small, deterministic Node.js scraper for the **Books to Scrape** practice sandbox. It downloads the first three catalogue pages, discovers 60 unique books, fetches each detail page politely, extracts raw fields, normalizes and validates records, caches responses, survives one broken page, and writes an honest run report.

## Stage 0 — Target classification

**Target:** https://books.toscrape.com/

Books to Scrape is explicitly a demo/practice website for web scraping. The homepage says “We love being scraped!” and describes itself as a demo website for web scraping purposes. It is therefore an appropriate sandbox for this assignment.

**Scope:** only the first 3 catalogue pages and the 60 book detail pages linked from them.

**Data collected:** title, product URL, price text, availability text, rating text, description, source catalogue page, and fetch timestamp. A numeric `price_gbp` is added during normalization.

**Robots check:** `https://books.toscrape.com/robots.txt` returned HTTP 404 when checked. I recorded this as **no robots file found**; a missing file is not treated as permission for other sites.

I will not reuse this code on another site without checking its rules and terms first.

## Lane

JavaScript / Node.js 20+, using:

- Node built-in `fetch` for HTTP
- Cheerio for HTML parsing
- Zod for schema validation
- Node built-in filesystem APIs for cache and JSON output
- Node built-in test runner for parser/normalization tests

## Install and run

```bash
cd scraper
npm install
npm start
```

The first run makes real requests and caches HTML. Later development runs reuse cached HTML and therefore do not repeatedly hit the site.

Failure demonstration:

```bash
npm run failure-test
```

This adds a deliberately fake URL locally, without making any additional request to the real site beyond the normal run.

Tests:

```bash
npm test
```

## Politeness rules

- Identifying user-agent: `FlyRankInternshipA9/1.0 (+https://github.com/ayushrauthan/task-api)`
- 10 second request timeout
- HTTP status checked before parsing
- At least 500 ms between real network requests
- Successful responses are cached under `cache/`
- Development reruns use cached responses
- A timeout or 5xx response is retried once after a short delay
- 403 and 404 responses are not retried
- No browser, proxy, login bypass, paywall bypass, or block bypass is used

## Raw record schema

Each detail page produces all eight raw fields:

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "...",
  "source_page": "https://books.toscrape.com/catalogue/page-1.html",
  "fetched_at": "2026-08-27T00:00:00.000Z"
}
```

After normalization and validation, `books.json` contains the same facts plus:

```json
"price_gbp": 51.77
```

The canonical absolute `product_url` is the record identity, so duplicate URLs are stored only once.

## Output

- `output/books.json` — validated, normalized records
- `output/errors.json` — records that could not be validated
- `output/run-report.json` — run timing, cache/network counts, valid/invalid records, and failed pages

Generated output is ignored by Git except for an optional `.gitkeep`; cached HTML is always ignored.

## Checkpoints

A clean run should report:

- `catalogue_pages=3`
- `discovered=60`
- `unique_urls=60`
- `detail_pages=60`
- `valid_records=60`
- `failed_pages=0`

A rerun should still produce exactly 60 records and should mostly use the cache.

`npm run failure-test` deliberately adds one fake detail URL. The run must finish, retain the 60 valid records, and report `failed_pages: 1`.

## Why no browser?

The core assignment does not need a browser because Books to Scrape sends the relevant book data in the HTML response itself. A browser would add startup time and memory without adding information for this target.

## Ethics note

Use an official API when one exists. Never bypass logins, paywalls, rate limits, robots restrictions, or other blocks. Collect only the data needed for the stated task, identify the client, cache during development, and keep request frequency low.

## Honest limitation

The scraper is intentionally scoped to this practice sandbox and the first three catalogue pages. It is not a general-purpose crawler and should not be pointed at another site without a fresh review of that site's terms, robots guidance, rate limits, and technical structure.
