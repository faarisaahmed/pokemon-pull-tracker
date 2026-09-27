import type { CsvProduct } from "./tcgcsv";

/**
 * Loose card-name key, for joining sets whose TCGdex numbering has nothing to
 * do with TCGplayer's. "Gengar (Prime)", "Palkia LV.X" and "Umbreon Star" all
 * meet their TCGdex spellings ("Gengar", "Palkia", "Umbreon ☆").
 */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/☆/g, " star")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(lv\.?\s?x|legend|prime)\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

/** TCGplayer appends the collector number to some names: "Mew - R/RGB". */
export function productCardName(p: Pick<CsvProduct, "name">): string {
  return p.name.replace(/\s+-\s+\S+$/, "");
}

function leadingNumber(p: CsvProduct): number {
  const raw = p.extendedData?.find((e) => e.name === "Number")?.value ?? "";
  const m = raw.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Pairs cards with TCGplayer singles by name, returning a product id (or
 * undefined) per card. Duplicate names — the two halves of a LEGEND — are
 * paired in order: cards as given, products by collector number.
 */
export function pairByName(
  cards: { name: string }[],
  products: CsvProduct[],
): (number | undefined)[] {
  const queues = new Map<string, CsvProduct[]>();
  for (const p of [...products].sort((a, b) => leadingNumber(a) - leadingNumber(b))) {
    const key = nameKey(productCardName(p));
    const q = queues.get(key);
    if (q) q.push(p);
    else queues.set(key, [p]);
  }
  return cards.map((c) => queues.get(nameKey(c.name))?.shift()?.productId);
}
