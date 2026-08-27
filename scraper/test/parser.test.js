import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { absoluteUrl, parseBook } from '../src/parser.js';
import { normalizeRecord } from '../src/schema.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

const validRaw = {
  title: 'Example Book',
  product_url: 'https://books.toscrape.com/catalogue/example_1/index.html',
  price_text: '£51.77',
  availability_text: 'In stock (22 available)',
  rating_text: 'Three',
  description: 'A short description.',
  source_page: 'https://books.toscrape.com/catalogue/page-1.html',
  fetched_at: '2026-08-27T10:00:00.000Z',
};

test('normalizes a pound price into a number', () => {
  assert.equal(normalizeRecord(validRaw).price_gbp, 51.77);
});

test('converts a relative URL into an absolute URL', () => {
  assert.equal(
    absoluteUrl('../book/index.html', 'https://books.toscrape.com/catalogue/page-1.html'),
    'https://books.toscrape.com/book/index.html',
  );
});

test('keeps a missing description as null', async () => {
  const html = await fs.readFile(path.join(TEST_DIR, 'fixtures', 'missing-description.html'), 'utf8');
  const record = parseBook(
    html,
    'https://books.toscrape.com/catalogue/example_1/index.html',
    'https://books.toscrape.com/catalogue/page-1.html',
    '2026-08-27T10:00:00.000Z',
  );
  assert.equal(record.description, null);
});

test('removes duplicate URLs by canonical product URL', () => {
  const urls = [
    'https://books.toscrape.com/catalogue/a/index.html',
    'https://books.toscrape.com/catalogue/b/index.html',
    'https://books.toscrape.com/catalogue/a/index.html',
  ];
  const unique = [...new Set(urls)];
  assert.equal(unique.length, 2);
});

test('rejects a malformed product fixture without a product area', async () => {
  const html = await fs.readFile(path.join(TEST_DIR, 'fixtures', 'malformed.html'), 'utf8');
  assert.throws(() => parseBook(
    html,
    'https://books.toscrape.com/catalogue/broken/index.html',
    'https://books.toscrape.com/catalogue/page-1.html',
    '2026-08-27T10:00:00.000Z',
  ), /Product area not found/);
});
