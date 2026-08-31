import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { BlockedError, fetchHtml, queued } from "./fetcher";
import type { CardRow, SetRow } from "../types";

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

export function searchUrl(card: CardRow, set: SetRow): string {
  // Japanese cards are listed in English on eBay, so search the set and number
  // rather than the Japanese card name, which returns almost nothing.
  const terms =
    card.region === "ja"
      ? [set.name.replace(/^[A-Za-z0-9]+:\s*/, ""), card.localId, "Japanese", "PSA"]
      : [card.name, set.name, card.localId, "PSA"];

  const params = new URLSearchParams({
    _nkw: terms.filter(Boolean).join(" "),
    _sacat: CATEGORY_SINGLES,
    LH_Sold: "1",
    LH_Complete: "1",
    _ipg: "120",
    _sop: "13", // newest sold first
  });
  return `https://www.ebay.com/sch/i.html?${params}`;
}

const PRICE_RE = /\$\s*([\d,]+(?:\.\d{2})?)/;
const GRADE_RE = /\bPSA\s*(10|9\.5|9|8\.5|8|7|6|5|4|3|2|1)\b/i;
const DATE_RE = /Sold\s+(\w{3}\s+\d{1,2},?\s+\d{4})/i;

/** Titles that quote a grade but are not a single graded card. */
const REJECT_RE = /\b(lot|bundle|proxy|custom|reprint|repack|choose|pick|read desc|damaged|coin|sticker|empty|case only|pack|box)\b/i;

export function parseSales(html: string): Sale[] {
  const $ = cheerio.load(html);
  const sales: Sale[] = [];

  // eBay runs two markups concurrently; support both.
  const items = $("li.s-item, li.s-card, .s-item__wrapper, .s-card__wrapper");

  items.each((_, el) => {
    const node = $(el);
    const title = text(node, ".s-item__title, .s-card__title, .su-styled-text.primary");
    if (!title || /Shop on eBay/i.test(title)) return;
    if (REJECT_RE.test(title)) return;

    const gradeMatch = title.match(GRADE_RE);
    if (!gradeMatch) return;

    const priceText = text(node, ".s-item__price, .s-card__price");
    const priceMatch = priceText.match(PRICE_RE);
    if (!priceMatch) return;
    // Ranges like "$10.00 to $30.00" are auction estimates, not a sale.
    if (/\bto\b/i.test(priceText)) return;

    const caption = text(node, ".s-item__caption, .s-card__caption, .s-item__title--tagblock");
    const dateMatch = caption.match(DATE_RE) ?? priceText.match(DATE_RE);

    sales.push({
      title,
      grade: gradeMatch[1],
      price: Number(priceMatch[1].replace(/,/g, "")),
      soldAt: dateMatch ? isoDate(dateMatch[1]) : null,
    });
  });

  return sales;
}

function text(node: cheerio.Cheerio<AnyNode>, selector: string): string {
  return node.find(selector).first().text().trim().replace(/\s+/g, " ");
}

function isoDate(raw: string): string | null {
  const d = new Date(raw.replace(",", ""));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
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
      avgPrice: round(prices.reduce((a, b) => a + b, 0) / prices.length),
      lowPrice: round(Math.min(...prices)),
      highPrice: round(Math.max(...prices)),
      lastSaleDate: dates.at(-1) ?? null,
    });
  }

  return out.sort((a, b) => Number(b.grade) - Number(a.grade));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export async function fetchPsaPrices(
  card: CardRow,
  set: SetRow,
): Promise<{ summaries: GradeSummary[]; sampled: number }> {
  const html = await queued(() => fetchHtml(searchUrl(card, set)));
  const sales = parseSales(html);
  return { summaries: summarise(sales), sampled: sales.length };
}

export { BlockedError };
