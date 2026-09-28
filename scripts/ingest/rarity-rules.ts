import { hasRarity, rarityKeyOf } from "../../src/lib/rarity";

/**
 * Which rarity a card gets, and from which source.
 *
 * English: TCGdex is authoritative and consistent; TCGplayer fills gaps.
 *
 * Japanese: the two sources use the same words for different things. TCGdex
 * writes Japanese rarities in English-style words where "Ultra Rare" means
 * SR (full art), while TCGplayer spells out the official Japanese codes where
 * "Ultra Rare" means UR (gold). TCGdex is also inconsistent between eras
 * ("Holo Rare" is HR in S10P-S11a, "Mega Hyper Rare" is gold UR in most SV
 * sets). TCGplayer's field matched the official rarity in every card audited,
 * so for Japanese cards it comes first and TCGdex is the fallback.
 */

type JaEra = "sm" | "s" | "sv" | "m" | "vintage";

export function jaEra(setId: string): JaEra {
  if (/^SM/i.test(setId)) return "sm";
  if (/^SV/i.test(setId)) return "sv";
  if (/^M\d/i.test(setId)) return "m";
  if (/^S\d/i.test(setId)) return "s";
  return "vintage";
}

/** TCGplayer's Japanese vocabulary (official codes spelled out). */
function jaTcgplayerKey(raw: string, era: JaEra): string | null {
  switch (raw.trim().toLowerCase()) {
    case "art rare":
      return "illustration";
    case "special art rare":
      return "special";
    case "super rare":
      return "ultra"; // SR full art = English SV/ME "Ultra Rare"
    case "ultra rare":
      // UR gold: a Hyper Rare in SV terms, a gold Secret Rare before that.
      return era === "sv" || era === "m" ? "hyper" : "secret";
    case "hyper rare":
      return "hyper";
    case "mega ultra rare":
      return "megahyper";
    case "mega attack rare":
      return "megaattack";
    case "trainer rare":
      return "holo";
    case "prism rare":
      return "prism";
    default:
      return null; // shared vocabulary below
  }
}

/** TCGdex's Japanese labels, where they differ from their English meaning. */
function jaTcgdexKey(raw: string, era: JaEra, setId: string): string | null {
  const v = raw.trim().toLowerCase();
  const hrAsHolo = ["S10P", "S10a", "S11", "S11a"].includes(setId);
  if (hrAsHolo && v === "holo rare") return "hyper";
  if (hrAsHolo && v === "mega hyper rare") return "secret";
  if (era === "sv" && (v === "mega hyper rare" || v === "secret rare")) return "hyper";
  if (era === "m" && v === "secret rare") return "ultra";
  if (v === "ultra rare") return "ultra"; // TCGdex "Ultra Rare" = SR
  return null;
}

/**
 * Cards neither source gets right, checked by hand against the printed card.
 * Keyed by TCGdex card id.
 */
const JA_OVERRIDES: Record<string, { raw: string; key: string }> = {
  "SV4a-350": { raw: "Special Art Rare", key: "special" }, // Iono SAR (347-354)
  "SV4a-358": { raw: "Ultra Rare", key: "hyper" }, // Miraidon ex UR (355-360)
  "SV4a-359": { raw: "Ultra Rare", key: "hyper" }, // Ting-Lu ex UR
  "M2-102": { raw: "Super Rare", key: "ultra" }, // Switch SR; TCGplayer says "Promo"
};

/**
 * English sets before Scarlet & Violet. TCGdex gives regular GX/EX cards,
 * full arts and alternate arts the same "Ultra Rare", and rainbow and gold
 * the same "Secret Rare", but the opening studies measure them separately.
 * TCGplayer's product names carry the distinction: "(Full Art)",
 * "(Alternate Full Art)", "(Secret)", "(Alternate Art Secret)".
 */
function enLegacyKey(i: RarityInput, dexKey: string): string {
  const swsh = /^(swsh|cel25)/.test(i.setId);
  const name = i.productName ?? "";
  const dex = (i.dex ?? "").trim().toLowerCase();

  // Trainer Gallery / Galarian Gallery: pulled in their own slot. The
  // Pokemon V/VMAX and trainer cards are far rarer than the rest, like the
  // Japanese Character Rare / Character Super Rare split.
  if (/^(TG|GG)\d/.test(i.localId)) {
    if (dex === "secret rare") return "secret";
    return dex === "holo rare" || dex === "rare holo" || dex === "rare" ? "character" : "charactersuper";
  }
  if ((i.tcgplayer ?? "").toLowerCase() === "rare break") return "break";
  // Vintage: TCGdex files Base Set's holos and every EX-era "ex" card as
  // plain "Rare"; TCGplayer has the real rarity.
  const csv = (i.tcgplayer ?? "").trim().toLowerCase();
  if (!dex || dex === "rare") {
    if (csv === "holo rare") return "holo";
    if (csv === "secret rare") return "secret";
    if (csv === "ultra rare" && /^ex\d/.test(i.setId)) {
      return /\bStar\b|★/.test(name) ? "goldstar" : "double";
    }
  }
  if (/\(Alternate Art Secret\)/.test(name)) return swsh ? "altsecret" : "secret";
  if (/\(Alternate Full Art\)/.test(name)) return swsh ? "altart" : "ultra";
  if (dex === "ultra rare" && !swsh && !/^hgss/.test(i.setId)) {
    // Before Sword & Shield, TCGdex's "Ultra Rare" also covers the regular
    // (non-full-art) GX and EX cards.
    if (/\(Full Art\)/.test(name)) return "ultra";
    if (/\(Secret\)/.test(name)) return "secret";
    if (name) return "double";
  }
  // Hidden Fates' Shiny Vault GX are measured apart from its baby shinies.
  if (dex === "shiny rare" && /\b(GX|EX|V|VMAX)\b/.test(i.cardName ?? "")) return "shinyultra";
  return dexKey;
}

export interface RarityInput {
  region: "en" | "ja";
  setId: string;
  cardId: string;
  /** Printed number as TCGdex stores it ("TG05", "215"). */
  localId: string;
  cardName?: string;
  /** The matched TCGplayer product's name, which carries art markers. */
  productName?: string;
  /** Card number and the set's official count, for unmarked filler. */
  number: number;
  officialCount: number;
  dex: string | null | undefined;
  tcgplayer: string | null | undefined;
}

export function resolveRarity(i: RarityInput): { raw: string | null; key: string } {
  if (i.region === "en") {
    const raw = hasRarity(i.dex) ? i.dex! : hasRarity(i.tcgplayer) ? i.tcgplayer! : null;
    const key = rarityKeyOf(raw);
    if (/^(sv|me|30th)/.test(i.setId)) return { raw, key };
    const legacy = enLegacyKey(i, key);
    // Show TCGplayer's label when it was the one that decided.
    const fromCsv = legacy !== key && (!raw || raw.toLowerCase() === "rare") && hasRarity(i.tcgplayer);
    return { raw: fromCsv ? i.tcgplayer! : raw, key: legacy };
  }

  const override = JA_OVERRIDES[i.cardId];
  if (override) return override;

  const era = jaEra(i.setId);
  // For plain Common/Uncommon/Rare the sources disagree on a handful of cards
  // and neither is proven better, so TCGdex keeps those as before.
  const BASE = ["common", "uncommon", "rare"];
  if (
    hasRarity(i.dex) &&
    hasRarity(i.tcgplayer) &&
    BASE.includes(i.dex!.trim().toLowerCase()) &&
    BASE.includes(i.tcgplayer!.trim().toLowerCase())
  ) {
    return { raw: i.dex!, key: rarityKeyOf(i.dex) };
  }
  if (hasRarity(i.tcgplayer) && i.tcgplayer!.toLowerCase() !== "promo") {
    const raw = i.tcgplayer!;
    return { raw, key: jaTcgplayerKey(raw, era) ?? rarityKeyOf(raw) };
  }
  if (hasRarity(i.dex)) {
    const raw = i.dex!;
    return { raw, key: jaTcgdexKey(raw, era, i.setId) ?? rarityKeyOf(raw) };
  }
  // High-class packs print their main-set cards with no rarity mark at all;
  // they are the pack's filler, so they pool with the commons.
  if (i.officialCount > 0 && i.number > 0 && i.number <= i.officialCount) {
    return { raw: "No rarity mark", key: "common" };
  }
  return { raw: null, key: "unknown" };
}
