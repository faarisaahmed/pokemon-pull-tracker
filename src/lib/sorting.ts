/**
 * Sort definitions. Shared rather than living beside the queries, because the
 * Select controls render the labels in the browser while only the SQL builder
 * needs the column names.
 *
 * Column and direction are separate so every column gets both directions
 * rather than needing a "…Low" twin for each one.
 */
export const SET_SORTS = {
  release: { label: "Release date", column: "release_date", defaultDir: "desc" },
  name: { label: "Name", column: "name", defaultDir: "asc" },
  pack: { label: "Pack price", column: "pack_price", defaultDir: "desc" },
  bundle: { label: "Bundle price", column: "bundle_price", defaultDir: "desc" },
  box: { label: "Box price", column: "box_price", defaultDir: "desc" },
  etb: { label: "ETB price", column: "etb_price", defaultDir: "desc" },
  value: { label: "Total set value", column: "set_value", defaultDir: "desc" },
  ev: { label: "Expected value per pack", column: "expected_pack_value", defaultDir: "desc" },
  cards: { label: "Card count", column: "card_count_total", defaultDir: "desc" },
} as const;

export const CARD_SORTS = {
  number: { label: "Card number", column: "number_sort", defaultDir: "asc" },
  rarity: { label: "Rarity", column: "rarity_rank", defaultDir: "desc" },
  price: { label: "Market price", column: "market_price", defaultDir: "desc" },
  name: { label: "Name", column: "name", defaultDir: "asc" },
} as const;

export type SetSort = keyof typeof SET_SORTS;
export type CardSort = keyof typeof CARD_SORTS;
export type SortDir = "asc" | "desc";

export function resolveDir(sort: { defaultDir: string }, dir?: string): SortDir {
  return dir === "asc" || dir === "desc" ? dir : (sort.defaultDir as SortDir);
}
