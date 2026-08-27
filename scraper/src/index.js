import fs from 'node:fs/promises';
import { PoliteFetcher } from './fetcher.js';

const BASE_URL = 'https://books.toscrape.com/';

async function main() {
  const fetcher = new PoliteFetcher({ cacheDir: new URL('../cache/', import.meta.url).pathname });
  const result = await fetcher.fetch(BASE_URL, { preferredName: 'catalogue-page-1.html' });
  console.log(`${result.fromCache ? 'CACHE HIT' : 'FETCH'} ${result.status} ${result.html.length} bytes`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
