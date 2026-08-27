import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PoliteFetcher } from './fetcher.js';
import { parseCatalogue } from './parser.js';

const BASE_URL = 'https://books.toscrape.com/';
const ROOT_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CACHE_DIR = path.join(ROOT_DIR, 'cache');

async function discoverBooks(fetcher) {
  const cataloguePages = [];
  const discovered = [];
  let pageUrl = BASE_URL;
  let pageNumber = 1;

  while (pageUrl && pageNumber <= 3) {
    const preferredName = pageNumber === 1 ? 'catalogue-page-1.html' : `catalogue-page-${pageNumber}.html`;
    const result = await fetcher.fetch(pageUrl, { preferredName });
    const parsed = parseCatalogue(result.html, pageUrl);
    cataloguePages.push(pageUrl);
    discovered.push(...parsed.bookUrls);
    pageUrl = parsed.nextUrl;
    pageNumber += 1;
  }

  return {
    cataloguePages,
    discovered,
    uniqueUrls: [...new Set(discovered)],
  };
}

async function main() {
  const fetcher = new PoliteFetcher({ cacheDir: CACHE_DIR });
  const result = await discoverBooks(fetcher);

  console.log(`catalogue_pages=${result.cataloguePages.length}`);
  console.log(`discovered=${result.discovered.length}`);
  console.log(`unique_urls=${result.uniqueUrls.length}`);
  console.log(`pages_fetched=${fetcher.stats.pagesFetched}`);
  console.log(`cache_hits=${fetcher.stats.cacheHits}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
