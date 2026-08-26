import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const CACHE_DIR = path.join(ROOT, 'cache');
const OUTPUT_DIR = path.join(ROOT, 'output');
const CATALOGUE_CACHE_DIR = path.join(CACHE_DIR, 'catalogue');
const DETAIL_CACHE_DIR = path.join(CACHE_DIR, 'details');

const BASE_URL = 'https://books.toscrape.com/';
const FIRST_CATALOGUE_URL = new URL('catalogue/page-1.html', BASE_URL).href;
const USER_AGENT = 'FlyRankInternship-A9/1.0 (https://github.com/ayushrauthan/task-api)';
const REQUEST_TIMEOUT_MS = 8000;
const REQUEST_DELAY_MS = 500;
const FAILURE_TEST_URL = 'https://books.toscrape.com/catalogue/__intentional-test-failure__.html';

const rawRecordSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url().startsWith('https://'),
  price_text: z.string().min(1),
  availability_text: z.string().min(1),
  rating_text: z.string().nullable(),
  description: z.string().nullable(),
  source_page: z.string().url().startsWith('https://'),
  fetched_at: z.string().datetime()
});

const recordSchema = rawRecordSchema.extend({
  price_gbp: z.number().finite().nonnegative()
});

const stats = {
  started_at: new Date().toISOString(),
  catalogue_pages: 0,
  discovered: 0,
  unique_urls: 0,
  detail_pages: 0,
  pages_fetched: 0,
  cache_hits: 0,
  valid_records: 0,
  invalid_records: 0,
  failed_pages: 0
};

let lastRealRequestAt = 0;

async function ensureDirs() {
  await Promise.all([
    fs.mkdir(CATALOGUE_CACHE_DIR, { recursive: true }),
    fs.mkdir(DETAIL_CACHE_DIR, { recursive: true }),
    fs.mkdir(OUTPUT_DIR, { recursive: true })
  ]);
}

function cacheNameForUrl(url) {
  const parsed = new URL(url);
  const safePath = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  return safePath || 'index';
}

function catalogueCachePath(url) {
  return path.join(CATALOGUE_CACHE_DIR, `${cacheNameForUrl(url)}.html`);
}

function detailCachePath(url) {
  return path.join(DETAIL_CACHE_DIR, `${cacheNameForUrl(url)}.html`);
}

async function readCache(cachePath) {
  try {
    return await fs.readFile(cachePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function politeDelay() {
  const wait = Math.max(0, REQUEST_DELAY_MS - (Date.now() - lastRealRequestAt));
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastRealRequestAt = Date.now();
}

async function fetchHtml(url, cachePath) {
  const cached = await readCache(cachePath);
  if (cached !== null) {
    stats.cache_hits += 1;
    return { html: cached, fromCache: true, status: 200 };
  }

  await politeDelay();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal
    });
    const body = await response.text();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    await fs.writeFile(cachePath, body, 'utf8');
    stats.pages_fetched += 1;
    return { html: body, fromCache: false, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, cachePath) {
  try {
    return await fetchHtml(url, cachePath);
  } catch (error) {
    const retryable = error.name === 'AbortError' || error.status >= 500 || error.code === 'ECONNRESET';
    if (!retryable) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchHtml(url, cachePath);
  }
}

function discoverBooksFromCatalogue(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('article.product_pod h3 a').each((_, element) => {
    const href = $(element).attr('href');
    if (href) links.add(new URL(href, pageUrl).href);
  });
  const nextHref = $('li.next a').attr('href');
  return { links: [...links], nextUrl: nextHref ? new URL(nextHref, pageUrl).href : null };
}

function textOrNull(value) {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text : null;
}

function extractRawRecord(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);
  if (!$('article.product_page').length) throw new Error('Product area not found');
  return {
    title: $('div.product_main h1').first().text().trim(),
    product_url: productUrl,
    price_text: $('div.product_main .price_color').first().text().trim(),
    availability_text: $('div.product_main .availability').first().text().replace(/\s+/g, ' ').trim(),
    rating_text: textOrNull($('div.product_main p.star-rating').first().attr('class')?.replace('star-rating', '').trim()),
    description: textOrNull($('#product_description').next('p').first().text()),
    source_page: sourcePage,
    fetched_at: new Date().toISOString()
  };
}

function normalizePrice(priceText) {
  const value = Number.parseFloat(priceText.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) throw new Error(`Invalid price: ${priceText}`);
  return value;
}

function normalizeRecord(raw) {
  const parsed = rawRecordSchema.parse(raw);
  return recordSchema.parse({ ...parsed, price_gbp: normalizePrice(parsed.price_text) });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function discoverThreeCataloguePages() {
  const pages = [];
  const allLinks = new Set();
  let currentUrl = FIRST_CATALOGUE_URL;

  while (pages.length < 3 && currentUrl) {
    const { html } = await fetchWithRetry(currentUrl, catalogueCachePath(currentUrl));
    const { links, nextUrl } = discoverBooksFromCatalogue(html, currentUrl);
    pages.push({ url: currentUrl, links });
    links.forEach(link => allLinks.add(link));
    currentUrl = nextUrl;
  }

  stats.catalogue_pages = pages.length;
  stats.discovered = allLinks.size;
  stats.unique_urls = allLinks.size;
  return pages;
}

async function scrapeDetails(cataloguePages, urls) {
  const recordsByUrl = new Map();
  const errors = [];
  const sourcePageByUrl = new Map();
  for (const page of cataloguePages) for (const url of page.links) sourcePageByUrl.set(url, page.url);

  const urlsToScrape = process.argv.includes('--with-failure-test') ? [...urls, FAILURE_TEST_URL] : urls;

  for (const productUrl of urlsToScrape) {
    stats.detail_pages += 1;
    try {
      const { html } = await fetchWithRetry(productUrl, detailCachePath(productUrl));
      const raw = extractRawRecord(html, productUrl, sourcePageByUrl.get(productUrl));
      const normalized = normalizeRecord(raw);
      recordsByUrl.set(productUrl, normalized);
      stats.valid_records += 1;
    } catch (error) {
      stats.failed_pages += 1;
      errors.push({ product_url: productUrl, reason: error.message, recorded_at: new Date().toISOString() });
    }
  }
  return { records: [...recordsByUrl.values()], errors };
}

async function run() {
  const started = Date.now();
  await ensureDirs();
  let cataloguePages = [];
  let records = [];
  let errors = [];

  try {
    cataloguePages = await discoverThreeCataloguePages();
    const urls = [...new Set(cataloguePages.flatMap(page => page.links))];
    ({ records, errors } = await scrapeDetails(cataloguePages, urls));
  } catch (error) {
    errors.push({ product_url: null, reason: error.message, recorded_at: new Date().toISOString() });
    stats.failed_pages += 1;
  }

  stats.invalid_records = errors.length;
  await writeJson(path.join(OUTPUT_DIR, 'books.json'), records);
  await writeJson(path.join(OUTPUT_DIR, 'errors.json'), errors);
  await writeJson(path.join(OUTPUT_DIR, 'run-report.json'), {
    ...stats,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - started
  });

  for (const key of ['catalogue_pages','discovered','unique_urls','detail_pages','valid_records','invalid_records','failed_pages','cache_hits','pages_fetched']) {
    console.log(`${key}=${stats[key]}`);
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
