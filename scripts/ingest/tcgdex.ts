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
  attacks?: { name: string }[];
  abilities?: { name: string }[];
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
  for (const [id, values] of await sweep(region, "rarity", rarities, "rarities")) {
    map.set(id, values[0]);
  }
  return map;
}

/**
 * The same trick for the fields the master-set builder needs: Pokedex numbers
 * (to find every card of a species, "Dark Charizard" and tag teams included),
 * HP and illustrator (to spot straight reprints). One list query per distinct
 * value — about 1,400 small requests a region, against ~15,000 for fetching
 * every card.
 */
export interface CardFacts {
  dexIds: Map<string, number[]>;
  hp: Map<string, number>;
  illustrator: Map<string, string>;
}

export async function cardFacts(region: Region): Promise<CardFacts> {
  const [dexValues, hpValues, illustrators] = await Promise.all([
    getJson<number[]>(`${BASE}/${region}/dex-ids`),
    getJson<number[]>(`${BASE}/${region}/hp`),
    getJson<string[]>(`${BASE}/${region}/illustrators`),
  ]);
  // Tolerant: a value TCGdex chokes on (some illustrator strings carry stray
  // quotes) costs a few cards their facts, not the whole build.
  const dex = await sweep(region, "dexId", dexValues.map(String), "pokedex numbers", true);
  const hp = await sweep(region, "hp", hpValues.map(String), "hp", true);
  const ill = await sweep(region, "illustrator", illustrators, "illustrators", true);
  return {
    dexIds: new Map([...dex].map(([id, v]) => [id, v.map(Number).sort((a, b) => a - b)])),
    hp: new Map([...hp].map(([id, v]) => [id, Number(v[0])])),
    illustrator: new Map([...ill].map(([id, v]) => [id, v[0]])),
  };
}

/** cardId -> every value of `field` it matched, from one exact-match list query per value. */
async function sweep(
  region: Region,
  field: string,
  values: string[],
  label: string,
  tolerant = false,
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  let done = 0;
  await mapLimit(values, 8, async (value) => {
    for (let page = 1; ; page++) {
      const url =
        `${BASE}/${region}/cards?${field}=${encodeURIComponent(`eq:${value}`)}` +
        `&pagination:page=${page}&pagination:itemsPerPage=500`;
      let rows: { id: string }[];
      try {
        rows = await getJson<{ id: string }[]>(url);
      } catch (err) {
        if (err instanceof NotFound || tolerant) break;
        throw err;
      }
      if (!rows.length) break;
      for (const r of rows) {
        const list = map.get(r.id);
        if (list) list.push(value);
        else map.set(r.id, [value]);
      }
      if (rows.length < 500) break;
    }
    progress(`${region} ${label}`, ++done, values.length);
  });
  return map;
}
