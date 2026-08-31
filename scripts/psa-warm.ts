/**
 * Bulk-warms the PSA cache. Scraping all 29k cards is neither realistic nor
 * polite, so this walks the most valuable cards first — those are the ones
 * anyone actually wants graded comps for — and stops as soon as eBay starts
 * refusing, rather than hammering a blocked endpoint.
 *
 *   npx tsx scripts/psa-warm.ts --limit=200 --min-price=50
 */
import { getDb } from "../src/lib/db.server";
import { getCard, getSet } from "../src/lib/queries.server";
import { fetchPsaPrices, BlockedError } from "../src/lib/ebay/psa.server";
import { isProxied } from "../src/lib/ebay/fetcher.server";

const arg = (name: string, fallback: number) =>
  Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);

async function main() {
  const limit = arg("limit", 100);
  const minPrice = arg("min-price", 25);
  const db = getDb();

  console.log(
    isProxied()
      ? "Routing eBay requests through PPT_SCRAPER_URL."
      : "No PPT_SCRAPER_URL set — requesting eBay directly. This is blocked from most servers.",
  );

  const targets = db
    .prepare(
      `SELECT c.id FROM cards c
       LEFT JOIN psa_fetch_log l ON l.card_id = c.id
       WHERE c.market_price >= ? AND l.card_id IS NULL
       ORDER BY c.market_price DESC LIMIT ?`,
    )
    .all(minPrice, limit) as { id: string }[];

  console.log(`${targets.length} cards to warm (market price >= $${minPrice}).`);

  const writeLog = db.prepare(
    `INSERT INTO psa_fetch_log (card_id, fetched_at, status, note) VALUES (?, ?, ?, ?)
     ON CONFLICT(card_id) DO UPDATE SET fetched_at=excluded.fetched_at, status=excluded.status, note=excluded.note`,
  );
  const insert = db.prepare(
    `INSERT INTO psa_prices (card_id, grade, sales_count, avg_price, low_price, high_price, last_sale_date, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(card_id, grade) DO UPDATE SET
       sales_count=excluded.sales_count, avg_price=excluded.avg_price, low_price=excluded.low_price,
       high_price=excluded.high_price, last_sale_date=excluded.last_sale_date, fetched_at=excluded.fetched_at`,
  );

  let ok = 0;
  let empty = 0;
  let consecutiveBlocks = 0;

  for (const [i, t] of targets.entries()) {
    const card = getCard(t.id);
    const set = card && getSet(card.setId);
    if (!card || !set) continue;
    const now = new Date().toISOString();

    try {
      const { summaries } = await fetchPsaPrices(card, set);
      for (const s of summaries) {
        insert.run(card.id, s.grade, s.salesCount, s.avgPrice, s.lowPrice, s.highPrice, s.lastSaleDate, now);
      }
      writeLog.run(card.id, now, summaries.length ? "ok" : "empty", null);
      if (summaries.length) ok++;
      else empty++;
      consecutiveBlocks = 0;
      console.log(`  [${i + 1}/${targets.length}] ${card.name} (${card.id}) — ${summaries.length} grades`);
    } catch (err) {
      const blocked = err instanceof BlockedError;
      writeLog.run(card.id, now, blocked ? "blocked" : "error", String(err));
      if (!blocked) {
        console.log(`  [${i + 1}] ${card.id} — ${String(err)}`);
        continue;
      }
      if (++consecutiveBlocks >= 3) {
        console.error(
          "\neBay refused three requests in a row. Stopping.\n" +
            "Set PPT_SCRAPER_URL to a proxy template, e.g.\n" +
            "  PPT_SCRAPER_URL='https://api.scraperapi.com?api_key=KEY&url={url}'",
        );
        break;
      }
    }
  }

  console.log(`\nDone. ${ok} cards with comps, ${empty} with no graded sales.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
