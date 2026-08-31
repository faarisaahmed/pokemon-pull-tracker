import type { Confidence, PullRateEntry, Region, ResolvedCardOdds } from "../types";
import { PULL_RATES, SPECIAL_SET_OVERRIDES } from "./data";

const BY_KEY = new Map<string, PullRateEntry>();
for (const e of [...PULL_RATES, ...SPECIAL_SET_OVERRIDES]) {
  BY_KEY.set(`${e.region}:${e.key}`, e);
}

/** Maps a TCGdex set id onto the era whose pull-rate table applies to it. */
export function eraKeyFor(region: Region, setId: string, releaseDate: string | null): string {
  if (region === "en") {
    if (/^me\d/.test(setId)) return "en-me";
    if (/^sv\d/.test(setId)) return "en-sv";
    if (/^swsh/.test(setId) || setId === "cel25") return "en-swsh";
    if (/^(sm|det)/.test(setId)) return "en-sm";
    if (/^(xy|g1|dc1)/.test(setId)) return "en-xy";
    if (/^(bw|dv1|rc)/.test(setId)) return "en-bw";
    return "en-vintage";
  }
  if (/^M\d|^M-/.test(setId)) return "ja-me";
  if (/^SV/.test(setId)) return "ja-sv";
  if (/^(S\d|CS)/.test(setId)) return "ja-swsh";
  if (/^SM/i.test(setId)) return "ja-sm";
  // Everything before Sun & Moon, plus anything undated, falls back to vintage.
  if (releaseDate && releaseDate >= "2017-01-01") return "ja-sm";
  return "ja-vintage";
}

export function entryFor(region: Region, setId: string, releaseDate: string | null): PullRateEntry {
  return (
    BY_KEY.get(`${region}:${setId}`) ??
    BY_KEY.get(`${region}:${eraKeyFor(region, setId, releaseDate)}`) ??
    BY_KEY.get(`${region}:${region === "en" ? "en-vintage" : "ja-vintage"}`)!
  );
}

export interface SetRarityCounts {
  /** rarityKey -> how many distinct cards in the set carry it. */
  [rarityKey: string]: number;
}

/**
 * Odds that one *specific* card shows up in a pack.
 *
 * A tier's published rate is the chance of hitting *any* card at that tier, so
 * it gets divided by however many cards share the tier in this set. For the
 * guaranteed slots (commons, uncommons, the rare slot) there is no published
 * rate, so the odds come from the slot count against the pooled card count.
 */
export function cardOdds(
  entry: PullRateEntry,
  rarityKey: string | null,
  counts: SetRarityCounts,
): ResolvedCardOdds | null {
  if (!rarityKey) return null;
  const poolSize = counts[rarityKey] ?? 0;
  if (poolSize === 0) return null;

  const tier = entry.odds.find((o) => o.rarityKey === rarityKey);
  let tierPerPack: number | null = null;
  const confidence: Confidence = entry.confidence;

  if (tier) {
    if (tier.perPack != null) tierPerPack = tier.perPack;
    else if (tier.perBox != null) tierPerPack = tier.perBox / entry.packsPerBox;
  } else {
    const slot = entry.packSlots.find((s) => s.rarityKeys.includes(rarityKey));
    if (!slot) return null;
    const pooled = slot.rarityKeys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    if (pooled === 0) return null;
    // Probability of at least one copy across `slot.count` independent draws.
    const perPack = 1 - Math.pow(1 - 1 / pooled, slot.count);
    return {
      rarityKey,
      perPack,
      packsPerCopy: 1 / perPack,
      boxesPerCopy: 1 / (perPack * entry.packsPerBox),
      perBox: perPack * entry.packsPerBox,
      poolSize: pooled,
      confidence: "estimated",
      source: entry.source,
      scope: entry.scope,
    };
  }

  if (tierPerPack == null || tierPerPack <= 0) return null;
  const perPack = tierPerPack / poolSize;
  return {
    rarityKey,
    perPack,
    packsPerCopy: 1 / perPack,
    boxesPerCopy: 1 / (perPack * entry.packsPerBox),
    perBox: perPack * entry.packsPerBox,
    poolSize,
    confidence,
    source: entry.source,
    scope: entry.scope,
  };
}

/** Chance a single pack contains at least one card of the given tier. */
export function tierOdds(entry: PullRateEntry, rarityKey: string): number | null {
  const tier = entry.odds.find((o) => o.rarityKey === rarityKey);
  if (!tier) return null;
  if (tier.perPack != null) return tier.perPack;
  if (tier.perBox != null) return Math.min(1, tier.perBox / entry.packsPerBox);
  return null;
}

export function formatOdds(perPack: number): string {
  if (perPack <= 0) return "—";
  const oneIn = 1 / perPack;
  if (oneIn < 10) return `1 in ${oneIn.toFixed(1)}`;
  if (oneIn < 10_000) return `1 in ${Math.round(oneIn).toLocaleString()}`;
  return `1 in ${Math.round(oneIn / 100) * 100 / 1000}k`;
}

export { PULL_RATES, SPECIAL_SET_OVERRIDES };
