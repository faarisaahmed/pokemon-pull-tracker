import { BlockedError, NotConfiguredError, browseSearch, type BrowseItem } from "./browse.server";
import type { CardRow, SetRow } from "../types";

/** One graded listing, from a sold or a current eBay listing. */
export interface Sale {
  title: string;
  grade: string;
  price: number;
  soldAt: string | null;
}

export interface GradeSummary {
  grade: string;
  salesCount: number;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  lastSaleDate: string | null;
}

/** eBay's Pokémon Trading Card Singles category. Keeps sealed product out. */
const CATEGORY_SINGLES = "183454";

function searchTerms(card: CardRow, set: SetRow): string {
  // Japanese cards are listed in English on eBay, so search the set and number
  // rather than the Japanese card name, which returns almost nothing.
  const terms =
    card.region === "ja"
      ? [set.name.replace(/^[A-Za-z0-9]+:\s*/, ""), card.localId, "Japanese", "PSA"]
      : [card.name, set.name, card.localId, "PSA"];
  return terms.filter(Boolean).join(" ");
}

/** eBay's sold-listings search for this card, for people to open themselves. */
export function searchUrl(card: CardRow, set: SetRow): string {
  const params = new URLSearchParams({
    _nkw: searchTerms(card, set),
    _sacat: CATEGORY_SINGLES,
    LH_Sold: "1",
    LH_Complete: "1",
    _ipg: "120",
    _sop: "13", // newest sold first
  });
  return `https://www.ebay.com/sch/i.html?${params}`;
}

const GRADE_RE = /\bPSA\s*(10|9\.5|9|8\.5|8|7|6|5|4|3|2|1)\b/i;

/** Titles that quote a grade but are not a single graded card. */
const REJECT_RE = /\b(lot|bundle|proxy|custom|reprint|repack|choose|pick|read desc|damaged|coin|sticker|empty|case only|pack|box)\b/i;

/** Graded singles among Browse API results; lots, sealed and ungraded copies are dropped. */
export function parseListings(items: BrowseItem[]): Sale[] {
  const sales: Sale[] = [];
  for (const item of items) {
    const title = item.title?.replace(/\s+/g, " ").trim();
    if (!title || REJECT_RE.test(title)) continue;
    const gradeMatch = title.match(GRADE_RE);
    if (!gradeMatch) continue;
    if (item.price?.currency !== "USD") continue;
    const price = Number(item.price.value);
    if (!(price > 0)) continue;
    sales.push({ title, grade: gradeMatch[1], price, soldAt: null });
  }
  return sales;
}

/**
 * Outlier trim. A single mis-titled listing (a sealed box quoting "PSA 10" in
 * the description) can move an average by an order of magnitude, so drop
 * anything beyond 3x the median in either direction before averaging.
 */
function trimOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return sorted.filter((p) => p <= median * 3 && p >= median / 3);
}

export function summarise(sales: Sale[]): GradeSummary[] {
  const byGrade = new Map<string, Sale[]>();
  for (const s of sales) {
    const arr = byGrade.get(s.grade);
    if (arr) arr.push(s);
    else byGrade.set(s.grade, [s]);
  }

  const out: GradeSummary[] = [];
  for (const [grade, rows] of byGrade) {
    const prices = trimOutliers(rows.map((r) => r.price));
    if (!prices.length) continue;
    const dates = rows.map((r) => r.soldAt).filter((d): d is string => !!d).sort();
    out.push({
      grade,
      salesCount: prices.length,
      // Median, not mean: asking prices have a long tail of hopeful listings.
      avgPrice: round(median(prices)),
      lowPrice: round(Math.min(...prices)),
      highPrice: round(Math.max(...prices)),
      lastSaleDate: dates.at(-1) ?? null,
    });
  }

  return out.sort((a, b) => Number(b.grade) - Number(a.grade));
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export async function fetchPsaPrices(
  card: CardRow,
  set: SetRow,
): Promise<{ summaries: GradeSummary[]; sampled: number }> {
  const items = await browseSearch(searchTerms(card, set), CATEGORY_SINGLES);
  const sales = parseListings(items);
  return { summaries: summarise(sales), sampled: items.length };
}

export { BlockedError, NotConfiguredError };
