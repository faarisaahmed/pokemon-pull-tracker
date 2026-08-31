import { getDb } from "./db.server";
import { cardOdds, entryFor, tierOdds, PULL_RATES, SPECIAL_SET_OVERRIDES, type SetRarityCounts } from "./pullrates";
import type {
  CardPriceRow,
  CardRow,
  ChaseRow,
  GodPackSet,
  PsaPriceRow,
  Region,
  SealedRow,
  SetRow,
} from "./types";

import {
  CARD_SORTS,
  SET_SORTS,
  resolveDir,
  type CardSort,
  type SetSort,
  type SortDir,
} from "./sorting";

export { CARD_SORTS, SET_SORTS, resolveDir };
export type { CardSort, SetSort, SortDir };

const ALL_PULL_RATES = [...PULL_RATES, ...SPECIAL_SET_OVERRIDES];

/* ------------------------------------------------------------------ sets */

export interface SetListOptions {
  region?: Region | "all";
  sort?: SetSort;
  dir?: string;
  search?: string;
  /** Only sets that actually have a price for this product type. */
  hasProduct?: "pack" | "bundle" | "box" | "etb";
  seriesId?: string;
}

/** NULLs sort last whichever direction is asked for. */
function orderBy(column: string, dir: SortDir, tiebreak = "name ASC") {
  return `${column} IS NULL, ${column} ${dir.toUpperCase()}, ${tiebreak}`;
}

export interface SetListOptions {
  region?: Region | "all";
  sort?: SetSort;
  dir?: string;
  search?: string;
  /** Only sets that actually have a price for this product type. */
  hasProduct?: "pack" | "bundle" | "box" | "etb";
  seriesId?: string;
}

function rowToSet(r: Record<string, unknown>): SetRow {
  return {
    id: r.id as string,
    region: r.region as Region,
    name: r.name as string,
    localName: (r.local_name as string) ?? null,
    seriesId: (r.series_id as string) ?? null,
    seriesName: (r.series_name as string) ?? null,
    releaseDate: (r.release_date as string) ?? null,
    cardCountOfficial: r.card_count_official as number,
    cardCountTotal: r.card_count_total as number,
    logo: (r.logo as string) ?? null,
    symbol: (r.symbol as string) ?? null,
    abbreviation: (r.abbreviation as string) ?? null,
    tileImage: (r.tile_image as string) ?? null,
    tcgcsvGroupIds: (r.tcgcsv_group_ids as string) ?? "",
    packPrice: (r.pack_price as number) ?? null,
    bundlePrice: (r.bundle_price as number) ?? null,
    boxPrice: (r.box_price as number) ?? null,
    etbPrice: (r.etb_price as number) ?? null,
    setValue: (r.set_value as number) ?? null,
    expectedPackValue: (r.expected_pack_value as number) ?? null,
  };
}

export function listSets(opts: SetListOptions = {}): SetRow[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.region && opts.region !== "all") {
    where.push("region = @region");
    params.region = opts.region;
  }
  if (opts.search?.trim()) {
    where.push("(name LIKE @q COLLATE NOCASE OR local_name LIKE @q OR id LIKE @q COLLATE NOCASE)");
    params.q = `%${opts.search.trim()}%`;
  }
  if (opts.hasProduct) {
    where.push(`${opts.hasProduct}_price IS NOT NULL`);
  }
  if (opts.seriesId && opts.seriesId !== "all") {
    where.push("series_id = @seriesId");
    params.seriesId = opts.seriesId;
  }

  const sort = SET_SORTS[opts.sort ?? "release"] ?? SET_SORTS.release;
  const dir = resolveDir(sort, opts.dir);
  const sql =
    `SELECT * FROM sets ${where.length ? "WHERE " + where.join(" AND ") : ""} ` +
    `ORDER BY ${orderBy(sort.column, dir)}`;
  return (db.prepare(sql).all(params) as Record<string, unknown>[]).map(rowToSet);
}

export function getSet(id: string): SetRow | null {
  const r = getDb().prepare("SELECT * FROM sets WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return r ? rowToSet(r) : null;
}

export function listSeries(
  region: Region | "all",
): { id: string; name: string; region: Region; count: number; latest: string | null }[] {
  const db = getDb();
  const sql =
    `SELECT series_id id, series_name name, region, COUNT(*) count, MAX(release_date) latest
     FROM sets WHERE series_id IS NOT NULL ${region !== "all" ? "AND region = @region" : ""}
     GROUP BY series_id, region ORDER BY latest DESC`;
  return db.prepare(sql).all({ region }) as {
    id: string;
    name: string;
    region: Region;
    count: number;
    latest: string | null;
  }[];
}

/* ----------------------------------------------------------------- cards */

function rowToCard(r: Record<string, unknown>): CardRow {
  return {
    id: r.id as string,
    setId: r.set_id as string,
    region: r.region as Region,
    localId: r.local_id as string,
    numberSort: r.number_sort as number,
    name: r.name as string,
    rarity: (r.rarity as string) ?? null,
    rarityKey: (r.rarity_key as string) ?? null,
    rarityRank: r.rarity_rank as number,
    category: (r.category as string) ?? null,
    illustrator: (r.illustrator as string) ?? null,
    image: (r.image as string) ?? null,
    types: (r.types as string) ?? null,
    hp: (r.hp as number) ?? null,
    marketPrice: (r.market_price as number) ?? null,
  };
}

export interface CardListOptions {
  setId?: string;
  region?: Region | "all";
  sort?: CardSort;
  dir?: string;
  rarityKey?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function listCards(opts: CardListOptions): { cards: CardRow[]; total: number } {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.setId) {
    where.push("set_id = @setId");
    params.setId = opts.setId;
  }
  if (opts.region && opts.region !== "all") {
    where.push("region = @region");
    params.region = opts.region;
  }
  if (opts.rarityKey && opts.rarityKey !== "all") {
    where.push("rarity_key = @rarityKey");
    params.rarityKey = opts.rarityKey;
  }
  if (opts.search?.trim()) {
    where.push("(name LIKE @q COLLATE NOCASE OR local_id LIKE @q COLLATE NOCASE)");
    params.q = `%${opts.search.trim()}%`;
  }

  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  const sort = CARD_SORTS[opts.sort ?? "number"] ?? CARD_SORTS.number;
  const dir = resolveDir(sort, opts.dir);

  const total = (db.prepare(`SELECT COUNT(*) n FROM cards ${clause}`).get(params) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT * FROM cards ${clause}
       ORDER BY ${orderBy(sort.column, dir, "number_sort ASC, local_id ASC")}
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: opts.limit ?? 500, offset: opts.offset ?? 0 }) as Record<string, unknown>[];

  return { cards: rows.map(rowToCard), total };
}

export function getCard(id: string): CardRow | null {
  const r = getDb().prepare("SELECT * FROM cards WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return r ? rowToCard(r) : null;
}

export function cardPrices(cardId: string): CardPriceRow[] {
  return (getDb()
    .prepare("SELECT * FROM card_prices WHERE card_id = ? ORDER BY market DESC")
    .all(cardId) as Record<string, unknown>[]).map((r) => ({
    cardId: r.card_id as string,
    variant: r.variant as string,
    tcgplayerProductId: (r.tcgplayer_product_id as number) ?? null,
    low: (r.low as number) ?? null,
    mid: (r.mid as number) ?? null,
    high: (r.high as number) ?? null,
    market: (r.market as number) ?? null,
    directLow: (r.direct_low as number) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  }));
}

/** rarityKey -> number of distinct cards in the set. Drives per-card odds. */
export function setRarityCounts(setId: string): SetRarityCounts {
  const rows = getDb()
    .prepare(
      `SELECT rarity_key, COUNT(*) n FROM cards
       WHERE set_id = ? AND rarity_key IS NOT NULL GROUP BY rarity_key`,
    )
    .all(setId) as { rarity_key: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.rarity_key, r.n]));
}

export function setRarityBreakdown(setId: string) {
  return getDb()
    .prepare(
      `SELECT rarity_key, rarity, COUNT(*) n, ROUND(AVG(market_price), 2) avg_price,
              ROUND(MAX(market_price), 2) max_price, MIN(rarity_rank) rank
       FROM cards WHERE set_id = ? AND rarity_key IS NOT NULL
       GROUP BY rarity_key ORDER BY rank DESC`,
    )
    .all(setId) as {
    rarity_key: string;
    rarity: string | null;
    n: number;
    avg_price: number | null;
    max_price: number | null;
    rank: number;
  }[];
}

/** Odds for one specific card, resolved against its set's rarity composition. */
export function oddsForCard(card: CardRow, set: SetRow) {
  const counts = setRarityCounts(card.setId);
  const entry = entryFor(set.region, set.id, set.releaseDate);
  return { entry, odds: cardOdds(entry, card.rarityKey, counts) };
}

/* ---------------------------------------------------------------- sealed */

export function sealedForSet(setId: string): SealedRow[] {
  return (getDb()
    .prepare(
      `SELECT * FROM sealed WHERE set_id = ?
       ORDER BY CASE kind WHEN 'pack' THEN 0 WHEN 'bundle' THEN 1 WHEN 'etb' THEN 2
                          WHEN 'box' THEN 3 ELSE 4 END, market ASC`,
    )
    .all(setId) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    setId: r.set_id as string,
    region: r.region as Region,
    kind: r.kind as SealedRow["kind"],
    name: r.name as string,
    tcgplayerProductId: r.tcgplayer_product_id as number,
    url: (r.url as string) ?? null,
    image: (r.image as string) ?? null,
    market: (r.market as number) ?? null,
    low: (r.low as number) ?? null,
    mid: (r.mid as number) ?? null,
    high: (r.high as number) ?? null,
    packCount: (r.pack_count as number) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  }));
}

/* ------------------------------------------------------------------- psa */

export function psaPrices(cardId: string): PsaPriceRow[] {
  return (getDb()
    .prepare("SELECT * FROM psa_prices WHERE card_id = ? ORDER BY grade DESC")
    .all(cardId) as Record<string, unknown>[]).map((r) => ({
    cardId: r.card_id as string,
    grade: r.grade as string,
    salesCount: r.sales_count as number,
    avgPrice: r.avg_price as number,
    lowPrice: r.low_price as number,
    highPrice: r.high_price as number,
    lastSaleDate: (r.last_sale_date as string) ?? null,
    fetchedAt: r.fetched_at as string,
  }));
}

export function psaFetchStatus(cardId: string) {
  return getDb().prepare("SELECT * FROM psa_fetch_log WHERE card_id = ?").get(cardId) as
    | { card_id: string; fetched_at: string; status: string; note: string | null }
    | undefined;
}

/* ----------------------------------------------------------------- chase */

/**
 * Ranks every set that prints a given rarity by how efficiently you can chase
 * it. `costPerHit` is the headline: pack price divided by the odds of the pack
 * containing that rarity at all.
 */
export function chaseRows(rarityKey: string, region: Region | "all"): ChaseRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.set_id,
              COUNT(*) pool,
              ROUND(AVG(c.market_price), 2) avg_price,
              ROUND(MAX(c.market_price), 2) max_price
       FROM cards c
       WHERE c.rarity_key = @rarityKey ${region !== "all" ? "AND c.region = @region" : ""}
       GROUP BY c.set_id`,
    )
    .all({ rarityKey, region }) as {
    set_id: string;
    pool: number;
    avg_price: number | null;
    max_price: number | null;
  }[];

  const topCard = db.prepare(
    `SELECT id, name, image FROM cards
     WHERE set_id = ? AND rarity_key = ? AND market_price IS NOT NULL
     ORDER BY market_price DESC LIMIT 1`,
  );

  const out: ChaseRow[] = [];
  for (const r of rows) {
    const set = getSet(r.set_id);
    if (!set) continue;
    const entry = entryFor(set.region, set.id, set.releaseDate);
    const tier = tierOdds(entry, rarityKey);
    if (tier == null || tier <= 0) continue;

    const top = topCard.get(r.set_id, rarityKey) as
      | { id: string; name: string; image: string | null }
      | undefined;

    out.push({
      set,
      poolSize: r.pool,
      avgPrice: r.avg_price,
      maxPrice: r.max_price,
      topCardId: top?.id ?? null,
      topCardName: top?.name ?? null,
      topCardImage: top?.image ?? null,
      tierPerPack: tier,
      perCardPerPack: tier / r.pool,
      costPerHit: set.packPrice != null ? set.packPrice / tier : null,
      valueRatio:
        set.packPrice != null && r.avg_price != null
          ? (tier * r.avg_price) / set.packPrice
          : null,
      confidence: entry.confidence,
      scope: entry.scope,
      source: entry.source,
    });
  }
  return out;
}

/** Every set with a documented god pack, newest first. */
export function godPackSets(region: Region | "all"): GodPackSet[] {
  const out: GodPackSet[] = [];
  for (const entry of ALL_PULL_RATES) {
    if (!entry.godPack || entry.scope !== "set") continue;
    if (region !== "all" && entry.region !== region) continue;
    const set = getSet(entry.key);
    if (set) out.push({ set, entry });
  }
  return out.sort((a, b) => (b.set.releaseDate ?? "").localeCompare(a.set.releaseDate ?? ""));
}

/** Rarities that at least one set actually prints, rarest first. */
export function availableRarities(region: Region | "all") {
  const db = getDb();
  return db
    .prepare(
      `SELECT rarity_key, COUNT(*) cards, COUNT(DISTINCT set_id) sets, MIN(rarity_rank) rank
       FROM cards
       WHERE rarity_key IS NOT NULL AND rarity_key NOT IN ('unknown', 'promo')
         ${region !== "all" ? "AND region = @region" : ""}
       GROUP BY rarity_key ORDER BY rank DESC`,
    )
    .all({ region }) as { rarity_key: string; cards: number; sets: number; rank: number }[];
}

/* ------------------------------------------------------------------ meta */

export function lastIngest(): string | null {
  const r = getDb().prepare("SELECT value FROM meta WHERE key = 'last_ingest'").get() as
    | { value: string }
    | undefined;
  return r?.value ?? null;
}

export function globalStats() {
  return getDb()
    .prepare(
      `SELECT (SELECT COUNT(*) FROM sets WHERE region='en') en_sets,
              (SELECT COUNT(*) FROM sets WHERE region='ja') ja_sets,
              (SELECT COUNT(*) FROM cards WHERE region='en') en_cards,
              (SELECT COUNT(*) FROM cards WHERE region='ja') ja_cards`,
    )
    .get() as { en_sets: number; ja_sets: number; en_cards: number; ja_cards: number };
}
