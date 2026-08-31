export type Region = "en" | "ja";

export type SealedKind = "pack" | "bundle" | "box" | "etb" | "collection";

export interface SetRow {
  id: string;
  region: Region;
  name: string;
  localName: string | null;
  seriesId: string | null;
  seriesName: string | null;
  releaseDate: string | null;
  cardCountOfficial: number;
  cardCountTotal: number;
  logo: string | null;
  symbol: string | null;
  abbreviation: string | null;
  tileImage: string | null;
  tcgcsvGroupIds: string;
  /** Cheapest current market price of a single booster pack, USD. */
  packPrice: number | null;
  bundlePrice: number | null;
  boxPrice: number | null;
  etbPrice: number | null;
  /** Sum of every card's market price in the set, USD. */
  setValue: number | null;
  /** Expected USD of singles per pack opened, from pull rates x card prices. */
  expectedPackValue: number | null;
}

export interface CardRow {
  id: string;
  setId: string;
  region: Region;
  localId: string;
  /** Numeric part of localId, for natural sorting. */
  numberSort: number;
  name: string;
  rarity: string | null;
  /** Normalised rarity bucket used for sorting and pull-rate lookup. */
  rarityKey: string | null;
  rarityRank: number;
  category: string | null;
  illustrator: string | null;
  image: string | null;
  types: string | null;
  hp: number | null;
  /** Best (highest) market price across all printings of this card, USD. */
  marketPrice: number | null;
}

export interface CardPriceRow {
  cardId: string;
  variant: string;
  tcgplayerProductId: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
  updatedAt: string | null;
}

export interface SealedRow {
  id: number;
  setId: string;
  region: Region;
  kind: SealedKind;
  name: string;
  tcgplayerProductId: number;
  url: string | null;
  image: string | null;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  /** Number of booster packs this product contains, when known. */
  packCount: number | null;
  updatedAt: string | null;
}

export interface PsaPriceRow {
  cardId: string;
  grade: string;
  salesCount: number;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  lastSaleDate: string | null;
  fetchedAt: string;
}

export type Confidence = "verified" | "community" | "estimated";

export interface RarityOdds {
  /** Normalised rarity key (see rarity.ts). */
  rarityKey: string;
  /** Probability that a single pack contains >= 1 card of this rarity. */
  perPack?: number;
  /** Expected number of cards of this rarity per sealed booster box. */
  perBox?: number;
  note?: string;
}

/**
 * A guaranteed slot in a booster pack, e.g. "4 commons". The slot's odds are
 * shared across every card whose rarity is listed in `rarityKeys`.
 */
export interface PackSlot {
  rarityKeys: string[];
  count: number;
}

/**
 * A "god pack" — a booster whose every slot is replaced with hits. Japanese
 * only, never acknowledged by The Pokémon Company, and the rate is community
 * estimate rather than measurement.
 */
export interface GodPack {
  /** Probability a given pack is a god pack. */
  perPack: number;
  /** What the pack contains, per collector reports. */
  contents: string[];
}

export interface PullRateEntry {
  region: Region;
  /** Set id (TCGdex) for a set-specific entry, or an era key for a fallback. */
  key: string;
  scope: "set" | "era";
  packsPerBox: number;
  cardsPerPack: number;
  /** Guaranteed slots (commons, uncommons, reverse holo, rare slot). */
  packSlots: PackSlot[];
  /** Per-pack probabilities for the "hit" tiers that pull-rate studies track. */
  odds: RarityOdds[];
  godPack?: GodPack;
  confidence: Confidence;
  source: { name: string; url: string; sampleSize?: number };
}

export interface ResolvedCardOdds {
  rarityKey: string;
  /** Probability this specific card appears in a given pack. */
  perPack: number;
  /** Expected packs to open before pulling this specific card. */
  packsPerCopy: number;
  /** Expected boxes to open before pulling this specific card. */
  boxesPerCopy: number;
  /** How many cards share this rarity in the set (the odds are split across them). */
  poolSize: number;
  confidence: Confidence;
  source: PullRateEntry["source"];
  scope: "set" | "era";
  /** Expected copies of this card per sealed booster box. */
  perBox: number;
}

/** One ranked row on the "what to open" page. */
export interface ChaseRow {
  set: SetRow;
  /** Cards in this set at the target rarity. */
  poolSize: number;
  avgPrice: number | null;
  maxPrice: number | null;
  topCardId: string | null;
  topCardName: string | null;
  topCardImage: string | null;
  /** Chance a pack contains at least one card of this rarity. */
  tierPerPack: number;
  /** Chance a pack contains one *specific* card of this rarity. */
  perCardPerPack: number;
  /** Pack price divided by the tier's per-pack odds. */
  costPerHit: number | null;
  /** Expected value of the tier per pack, against the pack price. */
  valueRatio: number | null;
  confidence: Confidence;
  scope: "set" | "era";
  source: PullRateEntry["source"];
}

export interface GodPackSet {
  set: SetRow;
  entry: PullRateEntry;
}
