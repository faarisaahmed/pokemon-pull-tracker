import { getDb } from "../../src/lib/db.server";
import { hasRarity, rarityKeyOf, rarityMeta } from "../../src/lib/rarity";
import { cardOdds, entryFor } from "../../src/lib/pullrates";
import type { Region, SealedKind } from "../../src/lib/types";
import { mapLimit, progress } from "./http";
import * as dex from "./tcgdex";
import * as csv from "./tcgcsv";
import {
  GROUP_ALIASES,
  GROUP_ALIASES_JA,
  MERGE_INTO,
  isExcludedGroup,
  isExcludedSet,
  normaliseSetName,
} from "./set-config";

const REGIONS: Region[] = ["en", "ja"];
const CONCURRENCY = 8;

/** "001" and "1" and "SV045" must all collapse to the same join key. */
function numberKey(raw: string): string {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^([A-Z]*)0*(\d+)([A-Z]*)$/);
  return m ? `${m[1]}${Number(m[2])}${m[3]}` : s;
}

function numericPart(localId: string): number {
  const m = localId.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Which TCGplayer printing to treat as the card's headline market price. */
const VARIANT_PREFERENCE = [
  "Normal",
  "Holofoil",
  "Reverse Holofoil",
  "1st Edition Holofoil",
  "1st Edition Normal",
  "1st Edition",
  "Unlimited Holofoil",
  "Unlimited",
];

function headlinePrice(rows: csv.CsvPrice[]): number | null {
  for (const want of VARIANT_PREFERENCE) {
    const hit = rows.find((r) => r.subTypeName === want && r.marketPrice != null);
    if (hit) return hit.marketPrice;
  }
  const any = rows.find((r) => r.marketPrice != null);
  return any?.marketPrice ?? null;
}

interface MatchedSet {
  id: string;
  region: Region;
  detail: dex.DexSetDetail;
  /** Includes the parent's own cards plus any merged subset's cards. */
  cards: { id: string; localId: string; name: string; image?: string }[];
  groups: csv.CsvGroup[];
}

async function matchSets(region: Region): Promise<{ sets: MatchedSet[]; unmatched: string[] }> {
  const category = csv.CATEGORY[region];
  const [briefs, groups] = await Promise.all([dex.listSets(region), csv.listGroups(category)]);

  const kept = briefs.filter((s) => !isExcludedSet(region, s.id, s.name));
  const parents = kept.filter((s) => !(s.id in MERGE_INTO));
  const children = kept.filter((s) => s.id in MERGE_INTO);
  console.log(`  ${region}: ${briefs.length} sets -> ${parents.length} kept (+${children.length} merged subsets)`);

  let fetched = 0;
  const details = new Map<string, dex.DexSetDetail>();
  await mapLimit([...parents, ...children], CONCURRENCY, async (s) => {
    details.set(s.id, await dex.getSet(region, s.id));
    progress(`${region} set details`, ++fetched, parents.length + children.length);
  });

  const usable = groups.filter((g) => !isExcludedGroup(g.name));
  const byName = new Map<string, csv.CsvGroup[]>();
  const byAbbr = new Map<string, csv.CsvGroup[]>();
  for (const g of usable) {
    push(byName, normaliseSetName(g.name), g);
    if (g.abbreviation) push(byAbbr, g.abbreviation.toLowerCase(), g);
  }
  const byExactName = new Map(usable.map((g) => [g.name, g] as const));

  const sets: MatchedSet[] = [];
  const unmatched: string[] = [];

  for (const parent of parents) {
    const detail = details.get(parent.id)!;
    const cards = [...(detail.cards ?? [])];
    for (const child of children) {
      if (MERGE_INTO[child.id] !== parent.id) continue;
      cards.push(...(details.get(child.id)?.cards ?? []));
    }

    let matched: csv.CsvGroup[] = [];
    const alias = (region === "ja" ? GROUP_ALIASES_JA : GROUP_ALIASES)[parent.id];
    if (alias) {
      matched = alias.map((n) => byExactName.get(n)).filter((g): g is csv.CsvGroup => !!g);
    }
    if (!matched.length) matched = byName.get(normaliseSetName(parent.name)) ?? [];
    if (!matched.length) matched = byAbbr.get(parent.id.toLowerCase()) ?? [];
    if (!matched.length && detail.releaseDate) {
      // Last resort for Japanese sets, whose names are not in English on
      // TCGdex: same release day and same official card count.
      matched = usable.filter(
        (g) =>
          g.publishedOn.slice(0, 10) === detail.releaseDate &&
          !sets.some((s) => s.groups.some((sg) => sg.groupId === g.groupId)),
      );
      if (matched.length > 1) matched = [];
    }

    if (!matched.length) unmatched.push(`${parent.id} (${parent.name})`);
    sets.push({ id: parent.id, region, detail, cards, groups: matched });
  }

  return { sets, unmatched };
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

async function ingestRegion(region: Region) {
  console.log(`\n== ${region.toUpperCase()} ==`);
  const db = getDb();
  const category = csv.CATEGORY[region];
  const { sets, unmatched } = await matchSets(region);

  // Pull every card's rarity in one sweep of rarity-filtered list queries.
  const rarities = await dex.rarityMap(region);

  const groupIds = [...new Set(sets.flatMap((s) => s.groups.map((g) => g.groupId)))];
  const products = new Map<number, csv.CsvProduct[]>();
  const prices = new Map<number, csv.CsvPrice[]>();
  let done = 0;
  await mapLimit(groupIds, CONCURRENCY, async (gid) => {
    const [p, pr] = await Promise.all([
      csv.listProducts(category, gid),
      csv.listPrices(category, gid),
    ]);
    products.set(gid, p);
    prices.set(gid, pr);
    progress(`${region} tcgplayer groups`, ++done, groupIds.length);
  });

  const pricesByProduct = new Map<number, csv.CsvPrice[]>();
  for (const rows of prices.values()) {
    for (const r of rows) push(pricesByProduct, r.productId, r);
  }

  const insertSet = db.prepare(`
    INSERT INTO sets (id, region, name, local_name, series_id, series_name, release_date,
      card_count_official, card_count_total, logo, symbol, abbreviation, tcgcsv_group_ids)
    VALUES (@id, @region, @name, @local_name, @series_id, @series_name, @release_date,
      @card_count_official, @card_count_total, @logo, @symbol, @abbreviation, @tcgcsv_group_ids)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, local_name=excluded.local_name, series_name=excluded.series_name,
      release_date=excluded.release_date, logo=excluded.logo, symbol=excluded.symbol,
      abbreviation=excluded.abbreviation, tcgcsv_group_ids=excluded.tcgcsv_group_ids
  `);
  const insertCard = db.prepare(`
    INSERT INTO cards (id, set_id, region, local_id, number_sort, name, rarity, rarity_key,
      rarity_rank, category, illustrator, image, types, hp, market_price)
    VALUES (@id, @set_id, @region, @local_id, @number_sort, @name, @rarity, @rarity_key,
      @rarity_rank, @category, @illustrator, @image, @types, @hp, @market_price)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, rarity=excluded.rarity, rarity_key=excluded.rarity_key,
      rarity_rank=excluded.rarity_rank, image=excluded.image, market_price=excluded.market_price
  `);
  const insertPrice = db.prepare(`
    INSERT INTO card_prices (card_id, variant, tcgplayer_product_id, low, mid, high, market, direct_low, updated_at)
    VALUES (@card_id, @variant, @pid, @low, @mid, @high, @market, @direct_low, @updated_at)
    ON CONFLICT(card_id, variant) DO UPDATE SET
      low=excluded.low, mid=excluded.mid, high=excluded.high, market=excluded.market,
      direct_low=excluded.direct_low, updated_at=excluded.updated_at
  `);
  const insertSealed = db.prepare(`
    INSERT INTO sealed (set_id, region, kind, name, tcgplayer_product_id, url, image,
      market, low, mid, high, pack_count, updated_at)
    VALUES (@set_id, @region, @kind, @name, @pid, @url, @image,
      @market, @low, @mid, @high, @pack_count, @updated_at)
    ON CONFLICT(tcgplayer_product_id) DO UPDATE SET
      market=excluded.market, low=excluded.low, mid=excluded.mid, high=excluded.high,
      set_id=excluded.set_id, kind=excluded.kind, updated_at=excluded.updated_at
  `);

  const now = new Date().toISOString();
  let cardCount = 0;
  let pricedCount = 0;
  let sealedCount = 0;
  const missingRarity: string[] = [];

  const run = db.transaction(() => {
    for (const s of sets) {
      const d = s.detail;
      // TCGplayer supplies the English name for Japanese sets, which TCGdex
      // only has in Japanese.
      const englishName = region === "ja" ? s.groups[0]?.name ?? d.name : d.name;

      insertSet.run({
        id: s.id,
        region,
        name: englishName,
        local_name: region === "ja" ? d.name : null,
        series_id: d.serie?.id ?? null,
        series_name: d.serie?.name ?? null,
        release_date: d.releaseDate ?? null,
        card_count_official: d.cardCount?.official ?? 0,
        card_count_total: s.cards.length,
        logo: d.logo ? `${d.logo}.png` : null,
        symbol: d.symbol ? `${d.symbol}.png` : null,
        abbreviation: s.groups[0]?.abbreviation?.toUpperCase() || s.id.toUpperCase(),
        tcgcsv_group_ids: s.groups.map((g) => g.groupId).join(","),
      });

      // Join key -> TCGplayer single. Earlier groups win, so a set's primary
      // printing is never overwritten by a reprint group (e.g. Shadowless).
      const singles = new Map<string, csv.CsvProduct>();
      const csvRarity = new Map<string, string>();
      for (const g of s.groups) {
        for (const p of products.get(g.groupId) ?? []) {
          if (!csv.isSingle(p)) continue;
          const num = csv.cardNumberOf(p);
          if (!num) continue;
          const key = numberKey(num);
          if (!singles.has(key)) {
            singles.set(key, p);
            const r = csv.extended(p).Rarity;
            if (r) csvRarity.set(key, r);
          }
        }
      }

      for (const c of s.cards) {
        const key = numberKey(c.localId);
        const product = singles.get(key);
        const priceRows = product ? pricesByProduct.get(product.productId) ?? [] : [];
        const market = headlinePrice(priceRows);
        // TCGdex is authoritative for rarity; TCGplayer fills the gaps. TCGdex
        // records a literal "None" for cards it has no rarity for, which is
        // most of the Japanese high-class sets.
        const dexRarity = rarities.get(c.id);
        const csvR = csvRarity.get(key);
        const rawRarity = hasRarity(dexRarity)
          ? dexRarity!
          : hasRarity(csvR)
            ? csvR!
            : null;
        const rKey = rarityKeyOf(rawRarity);
        if (rKey === "unknown") missingRarity.push(c.id);

        // TCGdex has no artwork for roughly two thirds of the Japanese pool, so
        // fall back to TCGplayer's product image where one is matched.
        const image = c.image
          ? `${c.image}/high.webp`
          : product
            ? `https://tcgplayer-cdn.tcgplayer.com/product/${product.productId}_in_1000x1000.jpg`
            : null;

        insertCard.run({
          id: c.id,
          set_id: s.id,
          region,
          local_id: c.localId,
          number_sort: numericPart(c.localId),
          name: c.name,
          rarity: rawRarity,
          rarity_key: rKey,
          rarity_rank: rarityMeta(rKey).rank,
          category: null,
          illustrator: null,
          image,
          types: null,
          hp: null,
          market_price: market,
        });
        cardCount++;
        if (market != null) pricedCount++;

        for (const row of priceRows) {
          insertPrice.run({
            card_id: c.id,
            variant: row.subTypeName,
            pid: row.productId,
            low: row.lowPrice,
            mid: row.midPrice,
            high: row.highPrice,
            market: row.marketPrice,
            direct_low: row.directLowPrice,
            updated_at: now,
          });
        }
      }

      for (const g of s.groups) {
        for (const p of products.get(g.groupId) ?? []) {
          if (csv.isSingle(p)) continue;
          const cls = csv.classifySealed(region, p.name);
          if (!cls) continue;
          const rows = pricesByProduct.get(p.productId) ?? [];
          const row = rows.find((r) => r.marketPrice != null) ?? rows[0];
          if (!row) continue;
          insertSealed.run({
            set_id: s.id,
            region,
            kind: cls.kind as SealedKind,
            name: p.name,
            pid: p.productId,
            url: p.url,
            image: p.imageUrl,
            market: row.marketPrice,
            low: row.lowPrice,
            mid: row.midPrice,
            high: row.highPrice,
            pack_count: cls.packCount,
            updated_at: now,
          });
          sealedCount++;
        }
      }
    }
  });
  run();

  console.log(`  sets: ${sets.length}  cards: ${cardCount}  priced: ${pricedCount} (${Math.round((pricedCount / cardCount) * 100)}%)  sealed: ${sealedCount}`);
  if (missingRarity.length) {
    console.log(`  cards with no rarity: ${missingRarity.length} (e.g. ${missingRarity.slice(0, 5).join(", ")})`);
  }
  if (unmatched.length) {
    console.log(`  no TCGplayer group matched (${unmatched.length}):`);
    for (const u of unmatched) console.log(`    - ${u}`);
  }
}

/** Roll card and sealed data up into the per-set columns the index page sorts on. */
function computeAggregates() {
  const db = getDb();
  console.log("\n== aggregates ==");

  db.exec(`
    UPDATE sets SET
      pack_price   = (SELECT MIN(market) FROM sealed WHERE sealed.set_id = sets.id AND kind='pack'   AND market IS NOT NULL),
      bundle_price = (SELECT MIN(market) FROM sealed WHERE sealed.set_id = sets.id AND kind='bundle' AND market IS NOT NULL),
      box_price    = (SELECT MIN(market) FROM sealed WHERE sealed.set_id = sets.id AND kind='box'    AND market IS NOT NULL),
      etb_price    = (SELECT MIN(market) FROM sealed WHERE sealed.set_id = sets.id AND kind='etb'    AND market IS NOT NULL),
      set_value    = (SELECT ROUND(SUM(market_price), 2) FROM cards WHERE cards.set_id = sets.id),
      tile_image   = (SELECT image FROM cards WHERE cards.set_id = sets.id AND image IS NOT NULL
                      ORDER BY market_price DESC LIMIT 1)
  `);

  const setRows = db
    .prepare(`SELECT id, region, release_date FROM sets`)
    .all() as { id: string; region: Region; release_date: string | null }[];
  const cardsStmt = db.prepare(
    `SELECT rarity_key, COUNT(*) n, AVG(market_price) avg_price
     FROM cards WHERE set_id = ? AND rarity_key IS NOT NULL GROUP BY rarity_key`,
  );
  const update = db.prepare(`UPDATE sets SET expected_pack_value = ? WHERE id = ?`);

  const tx = db.transaction(() => {
    for (const s of setRows) {
      const rows = cardsStmt.all(s.id) as { rarity_key: string; n: number; avg_price: number | null }[];
      const counts = Object.fromEntries(rows.map((r) => [r.rarity_key, r.n]));
      const entry = entryFor(s.region, s.id, s.release_date);
      let ev = 0;
      let sawPrice = false;
      for (const r of rows) {
        if (r.avg_price == null) continue;
        const odds = cardOdds(entry, r.rarity_key, counts);
        if (!odds) continue;
        // Expected value contributed by this tier = (cards in tier) x (per-card
        // odds) x (average price of a card in the tier).
        ev += r.n * odds.perPack * r.avg_price;
        sawPrice = true;
      }
      update.run(sawPrice ? Math.round(ev * 100) / 100 : null, s.id);
    }
  });
  tx();

  const stats = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM sets) sets,
         (SELECT COUNT(*) FROM cards) cards,
         (SELECT COUNT(*) FROM cards WHERE market_price IS NOT NULL) priced,
         (SELECT COUNT(*) FROM sealed) sealed,
         (SELECT COUNT(*) FROM sets WHERE pack_price IS NOT NULL) sets_with_pack,
         (SELECT COUNT(*) FROM sets WHERE box_price IS NOT NULL) sets_with_box,
         (SELECT COUNT(*) FROM sets WHERE etb_price IS NOT NULL) sets_with_etb`,
    )
    .get() as Record<string, number>;
  console.log("  " + JSON.stringify(stats, null, 0));

  db.prepare(`INSERT INTO meta (key, value) VALUES ('last_ingest', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(new Date().toISOString());

  assertPlausible(stats);
}

/**
 * Guard for unattended runs. A total upstream failure already throws, but a
 * partial one — an API returning empty lists, a schema change that silently
 * matches nothing — would otherwise produce a thin database and get deployed
 * over a good one. Exiting non-zero here fails the build, and the host keeps
 * the previous deploy serving.
 */
function assertPlausible(stats: Record<string, number>) {
  const floors: Record<string, number> = {
    sets: 250,
    cards: 27_000,
    priced: 24_000,
    sealed: 600,
    sets_with_pack: 150,
  };
  const short = Object.entries(floors).filter(([k, min]) => (stats[k] ?? 0) < min);
  if (short.length === 0) return;

  console.error("\nIngest produced implausibly little data — refusing to continue:");
  for (const [k, min] of short) {
    console.error(`  ${k}: got ${stats[k] ?? 0}, expected at least ${min}`);
  }
  console.error("\nThis usually means an upstream API changed shape or returned empty.");
  process.exit(1);
}

async function main() {
  const only = process.argv.find((a) => a.startsWith("--region="))?.split("=")[1] as Region | undefined;
  const t0 = Date.now();
  for (const region of REGIONS) {
    if (only && region !== only) continue;
    await ingestRegion(region);
  }
  computeAggregates();
  console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)}s -> data/pokemon.db`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
