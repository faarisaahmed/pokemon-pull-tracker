const UA = "PokemonPullTracker/0.1 (personal price + pull-rate reference)";

export async function getJson<T>(url: string, attempt = 0): Promise<T> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 404) throw new NotFound(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof NotFound) throw err;
    if (attempt >= 4) throw new Error(`GET ${url} failed after 5 attempts: ${String(err)}`);
    await sleep(500 * 2 ** attempt + Math.random() * 300);
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
