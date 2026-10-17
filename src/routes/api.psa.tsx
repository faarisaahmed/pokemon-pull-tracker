import type { Route } from "./+types/api.psa";
import { canWrite, getDb } from "@/lib/db.server";
import { getCard, getSet, psaFetchStatus, psaPrices } from "@/lib/queries.server";
import { BlockedError, fetchPsaPrices, searchUrl } from "@/lib/ebay/psa.server";
import { isConfigured } from "@/lib/ebay/browse.server";

/** Graded prices move slowly; a week-old lookup is still useful. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function loader({ params }: Route.LoaderArgs) {
  const cardId = decodeURIComponent(params.cardId);

  const card = getCard(cardId);
  if (!card) return Response.json({ error: "Unknown card" }, { status: 404 });
  const set = getSet(card.setId);
  if (!set) return Response.json({ error: "Unknown set" }, { status: 404 });

  if (!isConfigured()) {
    return Response.json({
      status: "unconfigured",
      fetchedAt: new Date().toISOString(),
      grades: [],
      searchUrl: searchUrl(card, set),
    });
  }

  const log = psaFetchStatus(cardId);
  // Only answers are cached; a failed lookup is retried on the next visit.
  const fresh =
    log && (log.status === "ok" || log.status === "empty") && Date.now() - new Date(log.fetched_at).getTime() < TTL_MS;

  if (fresh) {
    return Response.json({
      status: log.status,
      note: log.note,
      fetchedAt: log.fetched_at,
      grades: psaPrices(cardId),
      searchUrl: searchUrl(card, set),
      cached: true,
    });
  }

  const db = getDb();
  const now = new Date().toISOString();
  // Read-only deployments still fetch live, they just cannot cache the result.
  const persist = canWrite();
  const writeLog = db.prepare(
    `INSERT INTO psa_fetch_log (card_id, fetched_at, status, note) VALUES (?, ?, ?, ?)
     ON CONFLICT(card_id) DO UPDATE SET fetched_at=excluded.fetched_at, status=excluded.status, note=excluded.note`,
  );

  try {
    const { summaries, sampled } = await fetchPsaPrices(card, set);

    const replace = db.transaction(() => {
      if (!persist) return;
      db.prepare("DELETE FROM psa_prices WHERE card_id = ?").run(cardId);
      const ins = db.prepare(
        `INSERT INTO psa_prices (card_id, grade, sales_count, avg_price, low_price, high_price, last_sale_date, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const s of summaries) {
        ins.run(cardId, s.grade, s.salesCount, s.avgPrice, s.lowPrice, s.highPrice, s.lastSaleDate, now);
      }
      writeLog.run(
        cardId,
        now,
        summaries.length ? "ok" : "empty",
        summaries.length ? null : `No PSA-graded listings matched (${sampled} listings scanned).`,
      );
    });
    replace();

    return Response.json({
      status: summaries.length ? "ok" : "empty",
      fetchedAt: now,
      // A read-only deployment cannot re-read what it did not store.
      grades: persist ? psaPrices(cardId) : summaries.map((s) => ({
        cardId,
        grade: s.grade,
        salesCount: s.salesCount,
        avgPrice: s.avgPrice,
        lowPrice: s.lowPrice,
        highPrice: s.highPrice,
        lastSaleDate: s.lastSaleDate,
        fetchedAt: now,
      })),
      searchUrl: searchUrl(card, set),
      cached: false,
    });
  } catch (err) {
    const blocked = err instanceof BlockedError;
    const note = blocked
      ? "eBay's API refused the request: check EBAY_CLIENT_ID and EBAY_CLIENT_SECRET, or the daily call limit."
      : String(err instanceof Error ? err.message : err);

    if (persist) writeLog.run(cardId, now, blocked ? "blocked" : "error", note);
    return Response.json(
      {
        status: blocked ? "blocked" : "error",
        note,
        fetchedAt: now,
        grades: psaPrices(cardId),
        searchUrl: searchUrl(card, set),
      },
      { status: 200 },
    );
  }
}
