/**
 * eBay aggressively blocks datacentre traffic — a bare request from a cloud
 * host gets a 403 on every path, including the homepage. So the fetch itself is
 * pluggable:
 *
 *   PPT_SCRAPER_URL   A URL template containing `{url}`, pointed at whatever
 *                     proxy/scraping service you use. The eBay URL is inserted
 *                     URL-encoded. Works with ScraperAPI, ScrapingBee, Zyte,
 *                     Bright Data and anything else with the same shape.
 *                     e.g. https://api.scraperapi.com?api_key=KEY&url={url}
 *
 *   (unset)           Direct request. Fine from a residential connection,
 *                     reliably blocked from a server.
 */

export class BlockedError extends Error {
  constructor(public status: number) {
    super(`eBay refused the request (HTTP ${status}).`);
    this.name = "BlockedError";
  }
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export function isProxied() {
  return Boolean(process.env.PPT_SCRAPER_URL);
}

export async function fetchHtml(url: string): Promise<string> {
  const template = process.env.PPT_SCRAPER_URL;
  const target = template ? template.replace("{url}", encodeURIComponent(url)) : url;

  const res = await fetch(target, {
    headers: template ? {} : BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 403 || res.status === 429 || res.status === 302) {
    throw new BlockedError(res.status);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching eBay`);

  const html = await res.text();
  // eBay serves a 200 interstitial when it suspects automation.
  if (/Pardon Our Interruption|Checking your browser|captcha/i.test(html)) {
    throw new BlockedError(200);
  }
  return html;
}

/** Serialises eBay requests so we never burst; eBay rate-limits hard. */
let chain: Promise<unknown> = Promise.resolve();
const MIN_GAP_MS = 1500;
let lastAt = 0;

export function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastAt + MIN_GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}
