/**
 * Which TCGdex sets we ingest, and how they line up with TCGplayer groups.
 *
 * The user-facing rule is "every English and Japanese set, no promos, no
 * McDonald's / blister oddities". That maps to three lists below:
 *
 *  - EXCLUDED_*      sets we drop entirely
 *  - MERGE_INTO      subsets that TCGplayer splits out but that are physically
 *                    pulled from the parent set's packs (Trainer Gallery,
 *                    Shiny Vault, Galarian Gallery, ...). Their cards are
 *                    folded into the parent so pull rates stay coherent.
 *  - GROUP_ALIASES   TCGdex set id -> TCGplayer group names, for the cases the
 *                    name normaliser cannot resolve on its own.
 */

/** Digital-only Pokemon TCG Pocket sets: no physical packs, no market price. */
const POCKET_SET = /^(A\d|B\d|P-A)/;
/** Trainer kits are fixed 30-card decks, not packs. */
const TRAINER_KIT = /^tk-/;
const MCDONALDS = /^\d{4}(bw|xy|sm|swsh|sv)$/;
const POP_SERIES = /^pop\d$/;

export const EXCLUDED_EN = new Set([
  // Promo sets
  "miscp", "basep", "wp", "sp", "np", "bog", "dpp", "hgssp", "bwp", "xyp",
  "smp", "swshp", "svp", "mep", "jumbo",
  // Energy-only "sets"
  "sve", "mee",
  // Blister / tin / deck exclusives, not booster products
  "ex5.5",   // Poke Card Creator Pack
  "ru1",     // Pokemon Rumble (promo distribution)
  "fut2020", // Pokemon Futsal promos
  "xya",     // Yellow A Alternate (promo reprints)
  "xy0",     // Kalos Starter Set (deck)
  "dc1",     // Double Crisis (blister-exclusive mini set)
  "mfb",     // My First Battle (deck)
  "det1",    // Detective Pikachu (blister/tin exclusive)
  "si1",     // Southern Islands (mail-away promo set)
]);

export const EXCLUDED_JA = new Set([
  // Promo sets
  "SV-P", "M-P",
  // TCGdex duplicates of the "+" high-class packs, filed as promo variants
  "SM1p", "SM2p", "SM3p", "SM4p", "SM5p",
  // Deck / starter / boxed products rather than booster packs
  "MC",    // Start Deck 100 Battle Collection
  "SVLS", "SVLN", "SVK",
]);

/** Pokemon Card Game Classic (CS*) is a sealed boxed product with fixed decks. */
const JA_CLASSIC = /^CS/;

export const MERGE_INTO: Record<string, string> = {
  rc: "bw11",             // Radiant Collection -> Legendary Treasures
  exu: "ex10",            // Unown Collection -> Unseen Forces
  sma: "sm115",           // Shiny Vault -> Hidden Fates
  "swsh4.5sv": "swsh4.5", // Shiny Vault -> Shining Fates
  swsh9tg: "swsh9",
  swsh10tg: "swsh10",
  swsh11tg: "swsh11",
  swsh12tg: "swsh12",
  "swsh12.5gg": "swsh12.5",
  cel25cc: "cel25",
};

export function isExcludedSet(region: "en" | "ja", id: string, name: string): boolean {
  if (/promo/i.test(name) || /black star/i.test(name)) return true;
  if (/mcdonald/i.test(name)) return true;
  if (/trainer kit/i.test(name)) return true;
  if (region === "en") {
    return (
      EXCLUDED_EN.has(id) ||
      POCKET_SET.test(id) ||
      TRAINER_KIT.test(id) ||
      MCDONALDS.test(id) ||
      POP_SERIES.test(id)
    );
  }
  return EXCLUDED_JA.has(id) || JA_CLASSIC.test(id);
}

/**
 * TCGplayer groups that are not real expansions. Used when matching, so a
 * stray "Blister Exclusives" group never gets attached to a set.
 */
export const EXCLUDED_GROUP_PATTERNS = [
  /promo/i, /mcdonald/i, /trainer kit/i, /training kit/i, /burger king/i,
  /kids wb/i, /jumbo/i, /blister/i, /world championship/i, /prize pack/i,
  /league & championship/i, /deck exclusives/i, /^pop series/i,
  /miscellaneous/i, /sample/i, /best of/i, /battle academy/i, /my first battle/i,
  /player placement/i, /^first partner/i, /countdown calendar/i,
  /trick or trade/i, /energies$/i, /^jumbo/i,
];

export function isExcludedGroup(name: string): boolean {
  return EXCLUDED_GROUP_PATTERNS.some((re) => re.test(name));
}

/** TCGdex set id -> exact TCGplayer group names it should absorb. */
export const GROUP_ALIASES: Record<string, string[]> = {
  base1: ["Base Set", "Base Set (Shadowless)"],
  ecard1: ["Expedition"],
  ex1: ["EX Ruby and Sapphire"],
  dp1: ["Diamond and Pearl"],
  bw1: ["Black and White"],
  bw11: ["Legendary Treasures", "Legendary Treasures: Radiant Collection"],
  g1: ["Generations", "Generations: Radiant Collection"],
  xy1: ["XY Base Set"],
  sm1: ["SM Base Set"],
  sm115: ["Hidden Fates", "Hidden Fates: Shiny Vault"],
  "swsh4.5": ["SWSH: Shining Fates", "Shining Fates", "Shining Fates: Shiny Vault"],
  cel25: ["Celebrations", "Celebrations: Classic Collection"],
  swsh9: ["SWSH09: Brilliant Stars", "SWSH09: Brilliant Stars Trainer Gallery"],
  swsh10: ["SWSH10: Astral Radiance", "SWSH10: Astral Radiance Trainer Gallery"],
  swsh11: ["SWSH11: Lost Origin", "SWSH11: Lost Origin Trainer Gallery"],
  swsh12: ["SWSH12: Silver Tempest", "SWSH12: Silver Tempest Trainer Gallery"],
  "swsh12.5": ["SWSH: Crown Zenith", "SWSH: Crown Zenith: Galarian Gallery"],
  "swsh10.5": ["Pokemon GO"],
  sv01: ["SV01: Scarlet & Violet Base Set"],
  "sv03.5": ["SV: Scarlet & Violet 151"],
  "sv10.5b": ["SV: Black Bolt"],
  "sv10.5w": ["SV: White Flare"],
  "me02.5": ["ME: Ascended Heroes"],
};

/**
 * Japanese aliases. TCGdex only carries the Japanese set name while TCGplayer
 * only carries an English one, so name matching is impossible here and the
 * abbreviation match covers roughly two thirds of the sets. These are the rest,
 * resolved by release date and card count.
 */
export const GROUP_ALIASES_JA: Record<string, string[]> = {
  PMCG1: ["Expansion Pack", "Expansion Pack (No Rarity)"],
  PMCG6: ["Challenge from the Darkness"],
  neo2: ["Crossing the Ruins..."],
  neo3: ["Awakening Legends"],
  VS1: ["Pokemon VS"],
  E1: ["Base Expansion Pack"],
  ADV1: ["ADV Expansion Pack"],
  ADV3: ["Rulers of the Heavens"],
  ADV4: ["Magma VS Aqua: Two Ambitions"],
  ADV5: ["Undone Seal"],
  PCG2: ["Clash of the Blue Sky"],
  PCG5: ["Mirage Forest"],
  PCG9: ["Offense and Defense of the Furthest Ends"],
  PCG10: ["World Champions Pack"],
  L1a: ["L1: HeartGold Collection"],
  L1b: ["L1: SoulSilver Collection"],
  XY1a: ["XY-Bx: Collection X"],
  XY1b: ["XY-By: Collection Y"],
  XY5a: ["XY5-Bg: Gaia Volcano"],
  XY5b: ["XY5-Bt: Tidal Storm"],
  XY8a: ["XY8-Bb: Blue Shock"],
  XY8b: ["XY8-Br: Red Flash"],
  XY11a: ["XY11-Bb: Fever-Burst Fighter"],
  XY11b: ["XY11-Br: Cruel Traitor"],
};

/**
 * Normalises a set/group name to a comparable key. Strips the era prefixes
 * TCGplayer uses ("SV08: ", "XY - ", "SM - ", "EX ", "SWSH: ") and all
 * punctuation.
 */
export function normaliseSetName(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.replace(/^[a-z]{1,6}\d{0,2}[a-z]?:\s*/, ""); // "SV08: ", "SWSH: ", "ME01: "
  s = s.replace(/^(xy|sm|swsh|bw)\s*-\s*/, "");      // "XY - Flashfire"
  s = s.replace(/^ex\s+/, "");                        // "EX Sandstorm"
  s = s.replace(/\bbase set$/, "");                   // "XY Base Set"
  s = s.replace(/&/g, "and");
  s = s.replace(/[^a-z0-9]+/g, "");
  return s;
}
