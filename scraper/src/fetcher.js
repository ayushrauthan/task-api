import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_DELAY_MS = 500;
const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/ayushrauthan/task-api)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cachePathFor(url, cacheDir, preferredName = null) {
  if (preferredName) return path.join(cacheDir, preferredName);
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 20);
  return path.join(cacheDir, `${hash}.html`);
}

export class PoliteFetcher {
  constructor({ cacheDir = 'cache', timeoutMs = DEFAULT_TIMEOUT_MS, delayMs = DEFAULT_DELAY_MS } = {}) {
    this.cacheDir = cacheDir;
    this.timeoutMs = timeoutMs;
    this.delayMs = delayMs;
    this.lastNetworkRequestAt = 0;
    this.stats = { pagesFetched: 0, cacheHits: 0 };
  }

  async readCache(url, preferredName = null) {
    const file = cachePathFor(url, this.cacheDir, preferredName);
    try {
      const html = await fs.readFile(file, 'utf8');
      this.stats.cacheHits += 1;
      return { html, cachePath: file };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return null;
    }
  }

  async fetch(url, { preferredName = null, forceNetwork = false } = {}) {
    if (!forceNetwork) {
      const cached = await this.readCache(url, preferredName);
      if (cached) return { ...cached, fromCache: true, status: 200 };
    }

    await fs.mkdir(this.cacheDir, { recursive: true });
    const file = cachePathFor(url, this.cacheDir, preferredName);
    let attempt = 0;

    while (true) {
      const elapsed = Date.now() - this.lastNetworkRequestAt;
      if (elapsed < this.delayMs) await sleep(this.delayMs - elapsed);
      this.lastNetworkRequestAt = Date.now();
      attempt += 1;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
          signal: controller.signal,
        });

        if (response.status === 200) {
          const html = await response.text();
          await fs.writeFile(file, html, 'utf8');
          this.stats.pagesFetched += 1;
          return { html, cachePath: file, fromCache: false, status: 200 };
        }

        const retryable = response.status >= 500 && response.status <= 599;
        if (retryable && attempt === 1) {
          await sleep(1000);
          continue;
        }

        throw new Error(`HTTP ${response.status} for ${url}`);
      } catch (error) {
        const isTimeout = error.name === 'AbortError';
        if ((isTimeout || /HTTP 5\d\d/.test(error.message)) && attempt === 1) {
          await sleep(1000);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  }
}

export { USER_AGENT, sleep };
