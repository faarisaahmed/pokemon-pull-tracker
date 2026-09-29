import { getDb } from "../../src/lib/db.server";
import { koCardName, koSetId, parseSpeciesCsv } from "../../src/lib/korean";
import { mapLimit, progress } from "./http";
import * as dex from "./tcgdex";

/**
 * Korean sets are the Japanese sets, card for card: same codes, numbering,
 * rarities and pack contents, printed in Korean a few weeks later. TCGdex
 * lists the Korean sets (names, release dates) but no cards, so each one is
 * built from its Japanese twin: Pokémon names are translated through the
 * Pokédex, pull rates come from the Japanese entry, and there are no prices
 * because no open marketplace data covers Korean cards.
 */

/**
 * Korean releases TCGdex hasn't listed yet, by Japanese twin, named as on
 * pokemoncard.co.kr's card search (checked 2026-09-29). Their release dates
 * are the Japanese ones; Korea usually follows within a few weeks.
 */
const KO_EXTRA: Record<string, string> = {
  SV6a: "나이트원더러",
  SV7: "스텔라미라클",
  SV7a: "낙원드래고나",
  SV8: "초전브레이커",
  SV8a: "테라스탈 페스타 ex",
  SV9: "배틀파트너즈",
  SV9a: "열풍의 아레나",
  SV10: "로켓단의 영광",
  SV11B: "블랙볼트",
  SV11W: "화이트플레어",
  M1L: "메가브레이브",
  M1S: "메가심포니아",
  M2: "인페르노X",
  M2a: "MEGA 드림 ex",
  M3: "니힐제로",
  M4: "닌자스피너",
  M5: "어비스아이",
  M6: "스톰에메랄다",
};

const SPECIES_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv";

export async function ingestKorean() {
  console.log("\n== KO ==");
  const db = getDb();
  const briefs = await dex.listSets("ko");
  const jaIds = new Map(
    (db.prepare(`SELECT id FROM sets WHERE region = 'ja'`).all() as { id: string }[]).map((r) => [r.id.toLowerCase(), r.id]),
  );
  // TCGdex's Korean list has placeholder rows (a dozen "CS…" ids all named
  // after one set); only sets with a Japanese twin are real.
  const nameCount = new Map<string, number>();
  for (const b of briefs) nameCount.set(b.name, (nameCount.get(b.name) ?? 0) + 1);
  const wanted = briefs.filter((b) => jaIds.has(b.id.toLowerCase()) && (nameCount.get(b.name) ?? 0) <= 2);

  const details = new Map<string, dex.DexSetDetail>();
  let done = 0;
  await mapLimit(wanted, 6, async (b) => {
    details.set(b.id, await dex.getSet("ko", b.id));
    progress("ko set details", ++done, wanted.length);
  });

  for (const [jaId, name] of Object.entries(KO_EXTRA)) {
    if (wanted.some((b) => b.id.toLowerCase() === jaId.toLowerCase()) || !jaIds.has(jaId.toLowerCase())) continue;
    const brief = { id: jaId, name, cardCount: { total: 0, official: 0 } };
    wanted.push(brief);
    details.set(jaId, { ...brief, cards: [] });
  }

  const species = await speciesNames();

  const jaSet = db.prepare(`SELECT * FROM sets WHERE id = ?`);
  const jaCards = db.prepare(`SELECT * FROM cards WHERE set_id = ? AND region = 'ja'`);
  const upsertSet = db.prepare(`
    INSERT INTO sets (id, region, name, local_name, series_id, series_name, release_date,
      card_count_official, card_count_total, logo, symbol, abbreviation, tile_image, tcgcsv_group_ids)
    VALUES (@id, 'ko', @name, @local_name, @series_id, @series_name, @release_date,
      @card_count_official, @card_count_total, NULL, NULL, @abbreviation, @tile_image, '')
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, local_name=excluded.local_name, series_id=excluded.series_id,
      series_name=excluded.series_name, release_date=excluded.release_date,
      card_count_official=excluded.card_count_official, card_count_total=excluded.card_count_total,
      abbreviation=excluded.abbreviation, tile_image=excluded.tile_image
  `);
  const upsertCard = db.prepare(`
    INSERT INTO cards (id, set_id, region, local_id, number_sort, name, rarity, rarity_key,
      rarity_rank, category, illustrator, image, types, hp, market_price, dex_ids)
    VALUES (@id, @set_id, 'ko', @local_id, @number_sort, @name, @rarity, @rarity_key,
      @rarity_rank, @category, @illustrator, @image, @types, @hp, NULL, @dex_ids)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, rarity=excluded.rarity, rarity_key=excluded.rarity_key,
      rarity_rank=excluded.rarity_rank, image=excluded.image, illustrator=excluded.illustrator,
      hp=excluded.hp, dex_ids=excluded.dex_ids, number_sort=excluded.number_sort
  `);

  const seen = new Set<string>();
  let cardCount = 0;
  db.transaction(() => {
    for (const b of wanted) {
      const d = details.get(b.id);
      const ja = jaSet.get(jaIds.get(b.id.toLowerCase())) as Record<string, unknown> | undefined;
      if (!d || !ja) continue;
      const id = koSetId(ja.id as string);
      const cards = jaCards.all(ja.id) as Record<string, unknown>[];
      // Subset copies ("<id>@<subset>") are views of a parent's cards; the
      // Korean set carries the parent's cards only.
      const own = cards.filter((c) => !(c.id as string).includes("@"));
      if (!own.length) continue;
      upsertSet.run({
        id,
        name: ja.name,
        local_name: d.name,
        series_id: ja.series_id,
        series_name: ja.series_name,
        release_date: d.releaseDate ?? ja.release_date,
        card_count_official: ja.card_count_official,
        card_count_total: own.length,
        abbreviation: ja.abbreviation,
        tile_image: ja.tile_image,
      });
      seen.add(id);
      for (const c of own) {
        upsertCard.run({
          id: `ko-${c.id as string}`,
          set_id: id,
          local_id: c.local_id,
          number_sort: c.number_sort,
          name: koCardName(c.name as string, species),
          rarity: c.rarity,
          rarity_key: c.rarity_key,
          rarity_rank: c.rarity_rank,
          category: c.category,
          illustrator: c.illustrator,
          // The Japanese printing's image: same artwork, Japanese text.
          image: c.image,
          types: c.types,
          hp: c.hp,
          dex_ids: c.dex_ids,
        });
        cardCount++;
      }
    }
  })();

  // Sets that vanished upstream (or lost their twin) go, with their cards.
  const stale = (db.prepare(`SELECT id FROM sets WHERE region = 'ko'`).all() as { id: string }[]).filter((r) => !seen.has(r.id));
  if (seen.size >= 20 && stale.length) {
    db.transaction(() => {
      for (const s of stale) {
        db.prepare(`DELETE FROM cards WHERE set_id = ?`).run(s.id);
        db.prepare(`DELETE FROM sets WHERE id = ?`).run(s.id);
      }
    })();
  }
  console.log(`  sets: ${seen.size}  cards: ${cardCount}  (from ${briefs.length} listed; the rest have no Japanese twin)`);
}

/** Japanese → Korean species names from PokeAPI. Empty (names stay Japanese) if unreachable. */
async function speciesNames(): Promise<Map<string, string>> {
  try {
    const res = await fetch(SPECIES_CSV, { headers: { "User-Agent": "Ripwise/0.1 (personal price + pull-rate reference)" } });
    if (!res.ok) throw new Error(`${res.status}`);
    const map = parseSpeciesCsv(await res.text());
    console.log(`  species names: ${map.size}`);
    return map;
  } catch (err) {
    console.warn(`  WARNING: Korean species names unavailable (${String(err)}); Korean cards keep Japanese names.`);
    return new Map();
  }
}
