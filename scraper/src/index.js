import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PoliteFetcher } from './fetcher.js';
import { parseBook, parseCatalogue } from './parser.js';

const BASE_URL = 'https://books.toscrape.com/';
const ROOT_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CACHE_DIR = path.join(ROOT_DIR, 'cache');

async function discoverBooks(fetcher) {
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

async function extractBooks(fetcher, uniqueBooks) {
  const records = [];
  for (const [productUrl, sourcePage] of uniqueBooks) {
    const cacheKey = `detail-${Buffer.from(productUrl).toString('base64url').slice(0, 50)}.html`;
    const result = await fetcher.fetch(productUrl, { preferredName: cacheKey });
    records.push(parseBook(result.html, productUrl, sourcePage, result.fetchedAt));
  }
  return records;
}

async function main() {
  const fetcher = new PoliteFetcher({ cacheDir: CACHE_DIR });
  const result = await discoverBooks(fetcher);
  const records = await extractBooks(fetcher, result.unique);

  console.log(`catalogue_pages=${result.cataloguePages.length}`);
  console.log(`discovered=${result.discovered.length}`);
  console.log(`unique_urls=${result.unique.size}`);
  console.log(`detail_pages=${records.length}`);
  console.log(JSON.stringify(records[0], null, 2));
  console.log(`pages_fetched=${fetcher.stats.pagesFetched}`);
  console.log(`cache_hits=${fetcher.stats.cacheHits}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
