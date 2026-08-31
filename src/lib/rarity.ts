/**
 * TCGdex exposes ~40 free-text rarity strings across EN and JA. Pull-rate data,
 * on the other hand, is published per rarity *tier*. This module collapses the
 * raw strings into a small set of stable keys that both the sort order and the
 * pull-rate tables key off.
 */

export interface RarityMeta {
  key: string;
  label: string;
  /** Higher = rarer. Used for "sort by rarity". */
  rank: number;
  short: string;
}

export const RARITIES: RarityMeta[] = [
  { key: "common", label: "Common", rank: 10, short: "C" },
  { key: "uncommon", label: "Uncommon", rank: 20, short: "U" },
  { key: "rare", label: "Rare", rank: 30, short: "R" },
  { key: "holo", label: "Holo Rare", rank: 40, short: "RH" },
  { key: "double", label: "Double Rare", rank: 50, short: "RR" },
  { key: "triple", label: "Triple Rare", rank: 55, short: "RRR" },
  { key: "acespec", label: "ACE SPEC Rare", rank: 58, short: "ACE" },
  { key: "shiny", label: "Shiny Rare", rank: 60, short: "S" },
  { key: "radiant", label: "Radiant Rare", rank: 62, short: "K" },
  { key: "prism", label: "Prism Star", rank: 63, short: "◇" },
  { key: "amazing", label: "Amazing Rare", rank: 64, short: "A" },
  { key: "classic", label: "Prime / LV.X / LEGEND", rank: 66, short: "★" },
  { key: "break", label: "BREAK Rare", rank: 68, short: "BRK" },
  { key: "ultra", label: "Ultra Rare", rank: 70, short: "UR" },
  { key: "character", label: "Character Rare", rank: 72, short: "CHR" },
  { key: "illustration", label: "Illustration Rare", rank: 80, short: "AR" },
  { key: "shinyultra", label: "Shiny Ultra Rare", rank: 85, short: "SSR" },
  { key: "charactersuper", label: "Character Super Rare", rank: 88, short: "CSR" },
  { key: "special", label: "Special Illustration Rare", rank: 90, short: "SAR" },
  { key: "hyper", label: "Hyper Rare", rank: 95, short: "UR" },
  { key: "megaattack", label: "Mega Attack Rare", rank: 92, short: "MAR" },
  { key: "megaultra", label: "Mega Ultra Rare", rank: 93, short: "MUR" },
  { key: "megahyper", label: "Mega Hyper Rare", rank: 96, short: "MHR" },
  { key: "secret", label: "Secret Rare", rank: 97, short: "SR" },
  { key: "blackwhite", label: "Black White Rare", rank: 99, short: "BWR" },
  { key: "promo", label: "Promo", rank: 5, short: "P" },
  { key: "unknown", label: "Unknown", rank: 0, short: "?" },
];

const BY_KEY = new Map(RARITIES.map((r) => [r.key, r]));

const RAW_TO_KEY: Record<string, string> = {
  "common": "common",
  "uncommon": "uncommon",
  "rare": "rare",
  "rare holo": "holo",
  "holo rare": "holo",
  "double rare": "double",
  "holo rare v": "double",
  "triple rare": "triple",
  "holo rare vmax": "ultra",
  "holo rare vstar": "ultra",
  "ace spec rare": "acespec",
  "shiny rare": "shiny",
  "shiny rare v": "shiny",
  "shiny rare vmax": "shiny",
  "radiant rare": "radiant",
  "amazing rare": "amazing",
  "rare prime": "classic",
  "rare holo lv.x": "classic",
  "legend": "classic",
  "classic collection": "classic",
  "ultra rare": "ultra",
  "full art trainer": "ultra",
  "character rare": "character",
  "illustration rare": "illustration",
  "shiny ultra rare": "shinyultra",
  "character super rare": "charactersuper",
  "special illustration rare": "special",
  "hyper rare": "hyper",
  "mega hyper rare": "megahyper",
  "secret rare": "secret",
  "black white rare": "blackwhite",
  "promo": "promo",
  "none": "unknown",
  "unconfirmed": "unknown",

  // TCGplayer uses its own vocabulary, which the ingest falls back to whenever
  // TCGdex has no rarity for a card (common for Japanese sets).
  "shiny holo rare": "shiny",
  "shining": "shiny",
  "rainbow rare": "hyper",
  "prism rare": "prism",
  "rare break": "break",
  "rare ace": "acespec",
  "ace rare": "acespec",
  "futuristic rare": "ultra",
  "mega attack rare": "megaattack",
  "mega ultra rare": "megaultra",
  "super rare": "secret",
  "super rare holo": "secret",
  "art rare": "illustration",
  "special art rare": "special",
  "shiny secret rare": "shinyultra",
  "trainer rare": "ultra",
  "kagayaku": "radiant",
  "rare holo legend": "classic",
  "common holo": "holo",
  "ultra-rare common": "ultra",
  "ultra-rare uncommon": "ultra",
};

/** TCGdex stores "None" rather than null when it has no rarity for a card. */
export function hasRarity(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v !== "none" && v !== "unconfirmed" && v !== "";
}

export function rarityKeyOf(raw: string | null | undefined): string {
  if (!raw) return "unknown";
  return RAW_TO_KEY[raw.trim().toLowerCase()] ?? "unknown";
}

export function rarityMeta(key: string | null | undefined): RarityMeta {
  return BY_KEY.get(key ?? "unknown") ?? BY_KEY.get("unknown")!;
}

export function rarityRank(raw: string | null | undefined): number {
  return rarityMeta(rarityKeyOf(raw)).rank;
}

/** Rarities that are "hits" — the ones pull-rate tables actually track. */
export function isHitRarity(key: string): boolean {
  return rarityMeta(key).rank >= 50;
}
