import type { Region } from "./types";
import type { CardDetail } from "./tcgdex";

/**
 * Full card detail (attacks, HP, weaknesses, regulation mark) is fetched from
 * TCGdex when a card page is opened rather than stored. Ingesting it would mean
 * ~30,000 extra requests for data only ever read one card at a time.
 */

/**
 * Card detail barely changes, so it is cached in process for a day. Bounded so
 * a crawl over all 29,778 cards cannot grow the heap without limit.
 */
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map<string, { at: number; value: CardDetail | null }>();

export async function fetchCardDetail(region: Region, id: string): Promise<CardDetail | null> {
  const key = `${region}:${id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: CardDetail | null = null;
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/${region}/cards/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) value = (await res.json()) as CardDetail;
  } catch {
    // The page is still useful without it, so a failure here is not fatal.
  }

  // Cheapest sane eviction: drop the oldest insertion once the cap is hit.
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** "Standard" / "Expanded" / "Unlimited" from TCGdex's legality flags. */
export function formatLegality(legal: CardDetail["legal"]): string {
  if (!legal) return "—";
  if (legal.standard) return "Standard";
  if (legal.expanded) return "Expanded";
  return "Unlimited";
}
