import { getDb } from "../../src/lib/db.server";
import { hasRarity, isHitRarity, rarityKeyOf, rarityMeta } from "../../src/lib/rarity";
import { cardOdds, entryFor } from "../../src/lib/pullrates";
import type { Region, SealedKind } from "../../src/lib/types";
import { mapLimit, progress } from "./http";
import * as dex from "./tcgdex";
import * as csv from "./tcgcsv";
import { pairByName, productCardName } from "./names";
import {
  ALSO_STANDALONE,
  GROUP_ALIASES,
  GROUP_ALIASES_JA,
  JOIN_BY_NAME,
  MERGE_INTO,
  TCGPLAYER_ONLY_CARDS,
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

interface IngestCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  /** TCGdex id, when `id` carries a standalone-copy suffix. */
  dexId?: string;
  /** Groups to join by name instead of collector number (see JOIN_BY_NAME). */
  nameJoinGroups?: csv.CsvGroup[];
  /** Pre-resolved TCGplayer single, for cards that only exist on TCGplayer. */
  productId?: number;
  numberSort?: number;
}

interface MatchedSet {
  id: string;
  region: Region;
  detail: dex.DexSetDetail;
  /** Includes the parent's own cards plus any merged subset's cards. */
  cards: IngestCard[];
  groups: csv.CsvGroup[];
}


async function matchSets(region: Region): Promise<{ sets: MatchedSet[]; unmatched: string[] }> {
  const category = csv.CATEGORY[region];
  const [briefs, groups] = await Promise.all([dex.listSets(region), csv.listGroups(category)]);

  const kept = briefs.filter((s) => !isExcludedSet(region, s.id, s.name));
  const parents = kept.filter((s) => !(s.id in MERGE_INTO) || ALSO_STANDALONE.has(s.id));
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

  const groupsFor = (id: string, name: string, detail: dex.DexSetDetail): csv.CsvGroup[] => {
    let matched: csv.CsvGroup[] = [];
    const alias = (region === "ja" ? GROUP_ALIASES_JA : GROUP_ALIASES)[id];
    if (alias) {
      matched = alias.map((n) => byExactName.get(n)).filter((g): g is csv.CsvGroup => !!g);
    }
    if (!matched.length) matched = byName.get(normaliseSetName(name)) ?? [];
    if (!matched.length) matched = byAbbr.get(id.toLowerCase()) ?? [];
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
    return matched;
  };

  /** A dex set's cards, flagged for name-joining when its numbering is unusable. */
  const cardsOf = (s: dex.DexSetBrief): IngestCard[] => {
    const detail = details.get(s.id);
    const cards: IngestCard[] = detail?.cards ?? [];
    if (!detail || !JOIN_BY_NAME.has(s.id)) return cards;
    const nameJoinGroups = groupsFor(s.id, s.name, detail);
    return cards.map((c) => ({ ...c, nameJoinGroups }));
  };

  for (const parent of parents) {
    const detail = details.get(parent.id)!;
    // The parent owns every card it pulls under the plain ids; a standalone
    // subset page gets "@<subset>" copies (see src/lib/subsets.ts).
    const cards = ALSO_STANDALONE.has(parent.id)
      ? cardsOf(parent).map((c) => ({ ...c, id: `${c.id}@${parent.id}`, dexId: c.id }))
      : cardsOf(parent);
    for (const child of children) {
      if (MERGE_INTO[child.id] !== parent.id) continue;
      cards.push(...cardsOf(child));
    }

    const matched = groupsFor(parent.id, parent.name, detail);
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

  const groupIds = [
    ...new Set(
      sets.flatMap((s) => [
        ...s.groups.map((g) => g.groupId),
        ...s.cards.flatMap((c) => c.nameJoinGroups?.map((g) => g.groupId) ?? []),
      ]),
    ),
  ];
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
  const productById = new Map<number, csv.CsvProduct>();
  for (const rows of products.values()) {
    for (const p of rows) productById.set(p.productId, p);
  }

  for (const s of sets) {
    resolveNameJoins(s, products);
    addTcgplayerOnlyCards(s, products);
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
      set_id=excluded.set_id, local_id=excluded.local_id, number_sort=excluded.number_sort,
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
  const seenCards = new Set<string>();
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
      for (const g of s.groups) {
        for (const p of products.get(g.groupId) ?? []) {
          if (!csv.isSingle(p)) continue;
          const num = csv.cardNumberOf(p);
          if (!num) continue;
          const key = numberKey(num);
          if (!singles.has(key)) singles.set(key, p);
        }
      }

      for (const c of s.cards) {
        const key = numberKey(c.localId);
        const product =
          c.productId != null
            ? productById.get(c.productId)
            : c.nameJoinGroups
              ? undefined
              : singles.get(key);
        const priceRows = product ? pricesByProduct.get(product.productId) ?? [] : [];
        const market = headlinePrice(priceRows);
        // TCGdex is authoritative for rarity; TCGplayer fills the gaps. TCGdex
        // records a literal "None" for cards it has no rarity for, which is
        // most of the Japanese high-class sets.
        const dexRarity = rarities.get(c.dexId ?? c.id);
        const csvR = product ? csv.extended(product).Rarity : undefined;
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
          number_sort: c.numberSort ?? numericPart(c.localId),
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
        seenCards.add(c.id);
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

      // Sealed product belongs to the parent, which shares these groups.
      for (const g of ALSO_STANDALONE.has(s.id) ? [] : s.groups) {
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
  pruneStaleCards(region, seenCards);

  console.log(`  sets: ${sets.length}  cards: ${cardCount}  priced: ${pricedCount} (${Math.round((pricedCount / cardCount) * 100)}%)  sealed: ${sealedCount}`);
  if (missingRarity.length) {
    console.log(`  cards with no rarity: ${missingRarity.length} (e.g. ${missingRarity.slice(0, 5).join(", ")})`);
  }
  if (unmatched.length) {
    console.log(`  no TCGplayer group matched (${unmatched.length}):`);
    for (const u of unmatched) console.log(`    - ${u}`);
  }
}

/**
 * Drops cards this run no longer produced (a subset moved, ids changed), so a
 * reused database does not keep stale rows that inflate set totals. Only runs
 * when the region clearly ingested, never on a thin run.
 */
function pruneStaleCards(region: Region, seen: Set<string>) {
  const db = getDb();
  if (seen.size < 1000) return;
  const existing = db.prepare(`SELECT id FROM cards WHERE region = ?`).all(region) as { id: string }[];
  const stale = existing.map((r) => r.id).filter((id) => !seen.has(id));
  if (!stale.length) return;
  const delPrices = db.prepare(`DELETE FROM card_prices WHERE card_id = ?`);
  const delCard = db.prepare(`DELETE FROM cards WHERE id = ?`);
  db.transaction(() => {
    for (const id of stale) {
      delPrices.run(id);
      delCard.run(id);
    }
  })();
  console.log(`  removed ${stale.length} stale card(s)`);
}

/** Pairs name-joined cards with their TCGplayer singles (see names.ts). */
function resolveNameJoins(s: MatchedSet, products: Map<number, csv.CsvProduct[]>) {
  const byGroups = new Map<string, IngestCard[]>();
  for (const c of s.cards) {
    if (!c.nameJoinGroups) continue;
    push(byGroups, c.nameJoinGroups.map((g) => g.groupId).join(","), c);
  }
  for (const cards of byGroups.values()) {
    const singles = cards[0]
      .nameJoinGroups!.flatMap((g) => products.get(g.groupId) ?? [])
      .filter(csv.isSingle);
    pairByName(cards, singles).forEach((pid, i) => (cards[i].productId = pid));
  }
}

/** Appends the TCGplayer-only cards listed in TCGPLAYER_ONLY_CARDS. */
function addTcgplayerOnlyCards(s: MatchedSet, products: Map<number, csv.CsvProduct[]>) {
  const pattern = TCGPLAYER_ONLY_CARDS[s.id];
  if (!pattern) return;
  const extras = s.groups
    .flatMap((g) => products.get(g.groupId) ?? [])
    .filter((p) => pattern.test(csv.extended(p).Number ?? ""));
  extras.forEach((p, i) => {
    // "R/RGB" -> "RGB-R": slashes cannot go in a card URL.
    const [head, tail] = csv.extended(p).Number.split("/");
    const localId = `${tail}-${head}`;
    s.cards.push({
      id: `${s.id}-${localId}`,
      localId,
      name: productCardName(p),
      productId: p.productId,
      // After the numbered cards, in TCGplayer's order.
      numberSort: 10_000 + i,
    });
  });
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
    `SELECT rarity_key, COUNT(*) n, COUNT(market_price) priced,
            AVG(market_price) avg_price, SUM(market_price) sum_price
     FROM cards WHERE set_id = ? AND rarity_key IS NOT NULL GROUP BY rarity_key`,
  );
  const update = db.prepare(
    `UPDATE sets SET expected_pack_value = ?, hit_pack_value = ? WHERE id = ?`,
  );
  const onVintageFallback: string[] = [];
  const round = (v: number) => Math.round(v * 100) / 100;

  const tx = db.transaction(() => {
    for (const s of setRows) {
      // A standalone subset has no packs of its own; its parent carries the EV.
      if (ALSO_STANDALONE.has(s.id)) {
        update.run(null, null, s.id);
        continue;
      }
      const rows = cardsStmt.all(s.id) as {
        rarity_key: string;
        n: number;
        priced: number;
        avg_price: number | null;
        sum_price: number | null;
      }[];
      const counts = Object.fromEntries(rows.map((r) => [r.rarity_key, r.n]));
      const entry = entryFor(s.region, s.id, s.release_date);
      // Black & White (Apr 2011) and Japanese Sun & Moon (2017) are the first
      // eras with their own tables; anything newer on vintage is a miss.
      const modernFrom = s.region === "en" ? "2011-04-01" : "2017-01-01";
      if (entry.key.endsWith("-vintage") && (s.release_date ?? "") >= modernFrom) {
        onVintageFallback.push(`${s.id} (${s.release_date})`);
      }
      let ev = 0;
      let hitEv = 0;
      let sawPrice = false;
      for (const r of rows) {
        if (r.avg_price == null || r.sum_price == null) continue;
        const odds = cardOdds(entry, r.rarity_key, counts);
        if (!odds) continue;
        // Expected value contributed by this tier = (cards in tier) x (per-card
        // odds) x (average price of a card in the tier). When most of a tier
        // has no price yet (fresh chase cards like the RGB Mews), the few
        // priced ones say nothing about the rest, so only they are counted.
        const tierValue =
          r.priced * 2 >= r.n ? r.n * r.avg_price : r.sum_price;
        const value = odds.perPack * tierValue;
        ev += value;
        if (isHitRarity(r.rarity_key)) hitEv += value;
        sawPrice = true;
      }
      update.run(sawPrice ? round(ev) : null, sawPrice ? round(hitEv) : null, s.id);
    }
  });
  tx();

  // A new set whose id misses every era pattern silently gets vintage pull
  // rates (this is how 30th Celebration's EV ended up at $1.70). Surface it in
  // the build log instead.
  if (onVintageFallback.length) {
    console.warn(
      `  WARNING: ${onVintageFallback.length} modern set(s) fell back to vintage pull rates — ` +
        `add an era pattern or set entry in src/lib/pullrates:`,
    );
    for (const id of onVintageFallback) console.warn(`    - ${id}`);
  }

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
