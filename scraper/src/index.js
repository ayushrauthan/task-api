import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { PoliteFetcher } from './fetcher.js';
import { parseBook, parseCatalogue } from './parser.js';
import { normalizeRecord, validateRecord } from './schema.js';

const BASE_URL = 'https://books.toscrape.com/';
const ROOT_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CACHE_DIR = path.join(ROOT_DIR, 'cache');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const detailCacheName = (url) => `detail-${crypto.createHash('sha256').update(url).digest('hex').slice(0, 24)}.html`;

async function writeJson(fileName, value) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function discoverBooks(fetcher) {
  const cataloguePages = [];
  const discovered = [];
  let pageUrl = BASE_URL;
  let pageNumber = 1;

  while (pageUrl && pageNumber <= 3) {
    const preferredName = `catalogue-page-${pageNumber}.html`;
    const result = await fetcher.fetch(pageUrl, { preferredName });
    const parsed = parseCatalogue(result.html, pageUrl);
    cataloguePages.push(pageUrl);
    discovered.push(...parsed.bookUrls.map((productUrl) => ({ productUrl, sourcePage: pageUrl })));
    pageUrl = parsed.nextUrl;
    pageNumber += 1;
  }

  const unique = new Map();
  for (const item of discovered) {
    if (!unique.has(item.productUrl)) unique.set(item.productUrl, item.sourcePage);
  }

  return { cataloguePages, discovered, unique };
}

export async function extractAndValidate(fetcher, uniqueBooks) {
  const validRecords = [];
  const errors = [];
  const failures = [];
  let invalidRecords = 0;

  for (const [productUrl, sourcePage] of uniqueBooks) {
    try {
      const result = await fetcher.fetch(productUrl, { preferredName: detailCacheName(productUrl) });
      const raw = parseBook(result.html, productUrl, sourcePage, result.fetchedAt);
      const normalized = normalizeRecord(raw);
      const validation = validateRecord(normalized);

      if (!validation.success) {
        invalidRecords += 1;
        errors.push({ product_url: productUrl, type: 'validation', reason: validation.error.issues.map((issue) => issue.message).join('; ') });
        continue;
      }
      validRecords.push(validation.data);
    } catch (error) {
      failures.push({ product_url: productUrl, reason: error.message });
      errors.push({ product_url: productUrl, type: 'fetch_or_parse', reason: error.message });
    }
  }

  return { validRecords, errors, failures, invalidRecords };
}

export async function run({ injectFailure = false } = {}) {
  const startedAt = new Date();
  const fetcher = new PoliteFetcher({ cacheDir: CACHE_DIR });
  let discovered = { cataloguePages: [], discovered: [], unique: new Map() };
  let validRecords = [];
  let errors = [];
  let failures = [];
  let invalidRecords = 0;
  let fatalError = null;

  try {
    discovered = await discoverBooks(fetcher);
    if (injectFailure) {
      discovered.unique.set('https://example.invalid/flyrank-a9-deliberate-failure', BASE_URL);
    }

    ({ validRecords, errors, failures, invalidRecords } = await extractAndValidate(fetcher, discovered.unique));
    const uniqueRecords = [...new Map(validRecords.map((record) => [record.product_url, record])).values()];
    await writeJson('books.json', uniqueRecords);
    await writeJson('errors.json', errors);

    const report = {
      start_time: startedAt.toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
      catalogue_pages: discovered.cataloguePages.length,
      discovered: discovered.discovered.length,
      unique_urls: discovered.unique.size,
      detail_pages: discovered.unique.size,
      pages_fetched: fetcher.stats.pagesFetched,
      cache_hits: fetcher.stats.cacheHits,
      valid_records: uniqueRecords.length,
      invalid_records: invalidRecords,
      failed_pages: failures.length,
    };
    await writeJson('run-report.json', report);
    return { report, records: uniqueRecords, errors, failures };
  } catch (error) {
    fatalError = error;
    const report = {
      start_time: startedAt.toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
      catalogue_pages: discovered.cataloguePages.length,
      discovered: discovered.discovered.length,
      unique_urls: discovered.unique.size,
      detail_pages: discovered.unique.size,
      pages_fetched: fetcher.stats.pagesFetched,
      cache_hits: fetcher.stats.cacheHits,
      valid_records: validRecords.length,
      invalid_records: invalidRecords,
      failed_pages: failures.length + 1,
      fatal_error: error.message,
    };
    await writeJson('run-report.json', report);
    throw fatalError;
  }
}

const injectFailure = process.argv.includes('--inject-failure');
run({ injectFailure })
  .then(({ report, records }) => {
    console.log(`catalogue_pages=${report.catalogue_pages}`);
    console.log(`discovered=${report.discovered}`);
    console.log(`unique_urls=${report.unique_urls}`);
    console.log(`detail_pages=${report.detail_pages}`);
    console.log(`valid_records=${records.length}`);
    console.log(`invalid_records=${report.invalid_records}`);
    console.log(`failed_pages=${report.failed_pages}`);
    console.log(`pages_fetched=${report.pages_fetched}`);
    console.log(`cache_hits=${report.cache_hits}`);
    if (records[0]) console.log(JSON.stringify(records[0], null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
