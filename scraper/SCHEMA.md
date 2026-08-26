# A9 record contract

## Raw fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Product title |
| `product_url` | URL string | yes | Absolute HTTPS canonical identity |
| `price_text` | string | yes | Original price text from HTML |
| `availability_text` | string | yes | Original availability text |
| `rating_text` | string/null | yes | Rating class text when present |
| `description` | string/null | yes | Null when the page has no description |
| `source_page` | URL string | yes | Catalogue page that discovered the book |
| `fetched_at` | ISO datetime string | yes | Provenance timestamp |

## Normalized field

`price_gbp` is a finite non-negative JavaScript number derived from `price_text`. The raw `price_text` is retained alongside it so the transformation is auditable.

Zod validates the raw shape first and the normalized shape second. Invalid records are not written to `books.json`; they are reported in `errors.json`.
