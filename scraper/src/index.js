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

  for (const [productUrl, sourcePage] of uniqueBooks) {
    try {
      const result = await fetcher.fetch(productUrl, { preferredName: detailCacheName(productUrl) });
      const raw = parseBook(result.html, productUrl, sourcePage, result.fetchedAt);
      const normalized = normalizeRecord(raw);
      const validation = validateRecord(normalized);

      if (!validation.success) {
        errors.push({ product_url: productUrl, reason: validation.error.issues.map((issue) => issue.message).join('; ') });
        continue;
      }
      validRecords.push(validation.data);
    } catch (error) {
      errors.push({ product_url: productUrl, reason: error.message });
    }
  }

  return { validRecords, errors };
}

async function main() {
  const fetcher = new PoliteFetcher({ cacheDir: CACHE_DIR });
  const discovered = await discoverBooks(fetcher);
  const { validRecords, errors } = await extractAndValidate(fetcher, discovered.unique);

  const uniqueRecords = [...new Map(validRecords.map((record) => [record.product_url, record])).values()];
  await writeJson('books.json', uniqueRecords);
  await writeJson('errors.json', errors);

  console.log(`catalogue_pages=${discovered.cataloguePages.length}`);
  console.log(`discovered=${discovered.discovered.length}`);
  console.log(`unique_urls=${discovered.unique.size}`);
  console.log(`detail_pages=${discovered.unique.size}`);
  console.log(`valid_records=${uniqueRecords.length}`);
  console.log(`invalid_records=${errors.length}`);
  console.log(`pages_fetched=${fetcher.stats.pagesFetched}`);
  console.log(`cache_hits=${fetcher.stats.cacheHits}`);
  if (uniqueRecords[0]) console.log(JSON.stringify(uniqueRecords[0], null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
