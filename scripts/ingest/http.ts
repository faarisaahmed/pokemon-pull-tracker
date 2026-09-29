const UA = "Ripwise/0.1 (personal price + pull-rate reference)";

/**
 * Retry delays for server errors, rate limits and network failures: about
 * three and a half minutes in all, so a short outage at TCGdex or TCGCSV (a
 * 503 during a deploy, say) waits it out instead of failing the build.
 */
const RETRY_MS = [1_000, 3_000, 8_000, 20_000, 45_000, 60_000, 75_000];

export async function getJson<T>(url: string, attempt = 0): Promise<T> {
  let retryAfter: number | null = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 404) throw new NotFound(url);
    if (!res.ok) {
      const ra = Number(res.headers.get("retry-after"));
      if (Number.isFinite(ra) && ra > 0) retryAfter = Math.min(ra * 1000, 120_000);
      // Other client errors won't fix themselves; don't wait on them.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw Object.assign(new Error(`${res.status} ${res.statusText}`), { permanent: true });
      }
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    const permanent = (err as { permanent?: boolean }).permanent;
    if (permanent || attempt >= RETRY_MS.length) {
      throw new Error(`GET ${url} failed after ${attempt + 1} attempts: ${String(err)}`);
    }
    const wait = retryAfter ?? RETRY_MS[attempt] + Math.random() * 500;
    if (attempt >= 2) console.warn(`  ${String(err)} from ${new URL(url).host}; retrying in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    return getJson<T>(url, attempt + 1);
  }
}

export class NotFound extends Error {
  constructor(url: string) {
    super(`404 ${url}`);
    this.name = "NotFound";
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Runs `worker` over `items` with a bounded number of in-flight requests. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
      done++;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(runners);
  return out;
}

let lastLine = 0;
export function progress(label: string, done: number, total: number) {
  const now = Date.now();
  if (done !== total && now - lastLine < 250) return;
  lastLine = now;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  process.stdout.write(`\r  ${label}: ${done}/${total} (${pct}%)${done === total ? "\n" : "   "}`);
}
