import type { Region } from "./types";

/**
 * Full card detail (attacks, HP, weaknesses, regulation mark) is fetched from
 * TCGdex when a card page is opened rather than stored. Ingesting it would mean
 * ~30,000 extra requests for data only ever read one card at a time, and Next's
 * fetch cache makes the repeat cost zero.
 */
export interface CardDetail {
  id: string;
  name: string;
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  suffix?: string;
  dexId?: number[];
  retreat?: number;
  regulationMark?: string;
  description?: string;
  evolveFrom?: string;
  abilities?: { type: string; name: string; effect: string }[];
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  legal?: { standard: boolean; expanded: boolean };
  trainerType?: string;
  energyType?: string;
}

export async function fetchCardDetail(region: Region, id: string): Promise<CardDetail | null> {
  try {
    const res = await fetch(
      `https://api.tcgdex.net/v2/${region}/cards/${encodeURIComponent(id)}`,
      { next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    return (await res.json()) as CardDetail;
  } catch {
    // The page is still useful without it, so a failure here is not fatal.
    return null;
  }
}

/** "Standard" / "Expanded" / "Unlimited" from TCGdex's legality flags. */
export function formatLegality(legal: CardDetail["legal"]): string {
  if (!legal) return "—";
  if (legal.standard) return "Standard";
  if (legal.expanded) return "Expanded";
  return "Unlimited";
}
