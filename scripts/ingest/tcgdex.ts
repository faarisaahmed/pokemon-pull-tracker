import { getJson, mapLimit, progress, NotFound } from "./http";
import type { Region } from "../../src/lib/types";

const BASE = "https://api.tcgdex.net/v2";

export interface DexSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: { total: number; official: number };
}

export interface DexSetDetail extends DexSetBrief {
  releaseDate?: string;
  serie?: { id: string; name: string };
  cards: { id: string; localId: string; name: string; image?: string }[];
}

export interface DexCardDetail {
  id: string;
  localId: string;
  name: string;
  rarity?: string;
  category?: string;
  illustrator?: string;
  image?: string;
  types?: string[];
  hp?: number;
  variants?: Record<string, boolean>;
  variants_detailed?: {
    type: string;
    variantId: string;
    pricing?: {
      tcgplayer?: Record<string, unknown> | null;
      cardmarket?: Record<string, unknown> | null;
    };
  }[];
}

export function listSets(region: Region) {
  return getJson<DexSetBrief[]>(`${BASE}/${region}/sets`);
}

export function listRarities(region: Region) {
  return getJson<string[]>(`${BASE}/${region}/rarities`);
}

export function getSet(region: Region, id: string) {
  return getJson<DexSetDetail>(`${BASE}/${region}/sets/${encodeURIComponent(id)}`);
}

export function getCard(region: Region, id: string) {
  return getJson<DexCardDetail>(`${BASE}/${region}/cards/${encodeURIComponent(id)}`);
}

/**
 * TCGdex's set endpoint returns card *briefs*, which omit rarity. The list
 * endpoint does support filtering by rarity though, so one sweep per rarity
 * value gives us a cardId -> rarity map for the whole region in ~40 paginated
 * requests instead of one request per card.
 *
 * The `eq:` prefix matters: TCGdex string filters default to substring
 * matching, so a bare `rarity=Rare` also returns every "Rare Holo",
 * "Ultra Rare" and "Double rare" card.
 */
export async function rarityMap(region: Region): Promise<Map<string, string>> {
  const rarities = await listRarities(region);
  const map = new Map<string, string>();
  let done = 0;
  await mapLimit(rarities, 6, async (rarity) => {
    for (let page = 1; ; page++) {
      const url =
        `${BASE}/${region}/cards?rarity=${encodeURIComponent(`eq:${rarity}`)}` +
        `&pagination:page=${page}&pagination:itemsPerPage=500`;
      let rows: { id: string }[];
      try {
        rows = await getJson<{ id: string }[]>(url);
      } catch (err) {
        if (err instanceof NotFound) break;
        throw err;
      }
      if (!rows.length) break;
      for (const r of rows) map.set(r.id, rarity);
      if (rows.length < 500) break;
    }
    progress(`${region} rarities`, ++done, rarities.length);
  });
  return map;
}
