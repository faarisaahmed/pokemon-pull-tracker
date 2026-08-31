import type { PullRateEntry } from "../types";

/**
 * Curated pull-rate data.
 *
 * There is no API for pull rates. Every figure here comes from a published
 * large-sample opening study or a documented per-box guarantee, and each entry
 * carries its source and sample size so the UI can show how trustworthy a
 * number is.
 *
 * Two shapes of data exist, because the two markets work differently:
 *
 *  - English packs are pure random slots, so studies report a per-pack
 *    probability for each rarity tier (`odds[].perPack`).
 *  - Japanese boxes ship with per-box guarantees ("1 SR or better, 3 AR,
 *    4 RR per box"), so those are recorded as `odds[].perBox` and divided by
 *    the box size to get a per-pack figure.
 *
 * `scope: "era"` entries are the fallback used for any set without its own
 * measured data; they are marked `confidence: "estimated"` unless the era-wide
 * figure itself comes from a large sample.
 */

const TCGPLAYER_AUTH = {
  name: "TCGplayer Authentication Center (aggregated openings)",
  url: "https://pullrates.com/set/scarlet-and-violet",
  sampleSize: 8000,
};

/**
 * No published god-pack rate exists. Community estimates cluster at 1 in
 * 500-1,000 packs for sets that print them; the midpoint is used everywhere and
 * always shown as an estimate.
 */
const GOD_PACK_RATE = 1 / 600;

const TRAINER_COURT = {
  name: "The Trainer Court — Japanese box guarantees compiled from collector reports",
  url: "https://www.thetrainercourt.com/blogs/resources/japanese-booster-box-guaranteed-hit-rates-god-packs",
};

/** Modern English pack: 4 commons, 3 uncommons, 1 reverse holo, 1 rare slot, 1 hit slot. */
const MODERN_EN_SLOTS = [
  { rarityKeys: ["common"], count: 4 },
  { rarityKeys: ["uncommon"], count: 3 },
  { rarityKeys: ["common", "uncommon", "rare"], count: 1 }, // reverse holo slot
  { rarityKeys: ["rare", "holo"], count: 1 },
];

/** Vintage/WOTC pack: 5 commons, 3 uncommons, 1 rare (holo or not). */
const VINTAGE_EN_SLOTS = [
  { rarityKeys: ["common"], count: 5 },
  { rarityKeys: ["uncommon"], count: 3 },
  { rarityKeys: ["rare", "holo"], count: 1 },
];

/** Japanese expansion pack: 5 cards, 3 commons + 1 uncommon + 1 rare-or-better. */
const JA_SLOTS = [
  { rarityKeys: ["common"], count: 3 },
  { rarityKeys: ["uncommon"], count: 1 },
  { rarityKeys: ["rare", "holo"], count: 1 },
];

export const PULL_RATES: PullRateEntry[] = [
  // ---------------------------------------------------------------- English
  {
    region: "en",
    key: "en-sv",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "verified",
    source: TCGPLAYER_AUTH,
    odds: [
      { rarityKey: "double", perPack: 1 / 7 },
      { rarityKey: "illustration", perPack: 1 / 13 },
      { rarityKey: "ultra", perPack: 1 / 15 },
      { rarityKey: "acespec", perPack: 1 / 20, note: "ACE SPEC only appears in sets that print it." },
      { rarityKey: "special", perPack: 1 / 32 },
      { rarityKey: "hyper", perPack: 1 / 54 },
      { rarityKey: "shiny", perPack: 1 / 12 },
      { rarityKey: "shinyultra", perPack: 1 / 60 },
      { rarityKey: "blackwhite", perPack: 1 / 350 },
    ],
  },
  {
    region: "en",
    key: "sv01",
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "community",
    source: {
      name: "DigitalTQ — 676 Scarlet & Violet packs opened",
      url: "https://www.digitaltq.com/scarlet-violet-pull-rates-pokemon-tcg",
      sampleSize: 676,
    },
    odds: [
      { rarityKey: "double", perPack: 0.1405 },
      { rarityKey: "illustration", perPack: 0.0769 },
      { rarityKey: "ultra", perPack: 0.0651 },
      { rarityKey: "special", perPack: 0.0311 },
      { rarityKey: "hyper", perPack: 0.0192 },
    ],
  },
  {
    region: "en",
    key: "en-swsh",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Community box-opening consensus (6–10 ultra rares per 36-pack box)",
      url: "https://deltiasgaming.com/everything-you-need-to-know-about-pokemon-tcg-pull-rates/",
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 7 },       // V
      { rarityKey: "ultra", perPack: 1 / 12 },        // VMAX / VSTAR / full art
      { rarityKey: "character", perPack: 1 / 16 },    // Trainer Gallery
      { rarityKey: "radiant", perPack: 1 / 18 },
      { rarityKey: "amazing", perPack: 1 / 18 },
      { rarityKey: "shiny", perPack: 1 / 12 },
      { rarityKey: "secret", perPack: 1 / 36, note: "Roughly one secret rare per booster box." },
      { rarityKey: "hyper", perPack: 1 / 36 },
    ],
  },
  {
    region: "en",
    key: "en-sm",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Community box-opening consensus for the Sun & Moon era",
      url: "https://deltiasgaming.com/everything-you-need-to-know-about-pokemon-tcg-pull-rates/",
    },
    odds: [
      { rarityKey: "ultra", perPack: 1 / 9 },
      { rarityKey: "shiny", perPack: 1 / 12 },
      { rarityKey: "secret", perPack: 1 / 36 },
      { rarityKey: "hyper", perPack: 1 / 36 },
    ],
  },
  {
    region: "en",
    key: "en-xy",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Community box-opening consensus for the XY era",
      url: "https://deltiasgaming.com/everything-you-need-to-know-about-pokemon-tcg-pull-rates/",
    },
    odds: [
      { rarityKey: "ultra", perPack: 1 / 12 },
      { rarityKey: "secret", perPack: 1 / 36 },
      { rarityKey: "classic", perPack: 1 / 18 },
    ],
  },
  {
    region: "en",
    key: "en-bw",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Community box-opening consensus for the Black & White era",
      url: "https://deltiasgaming.com/everything-you-need-to-know-about-pokemon-tcg-pull-rates/",
    },
    odds: [
      { rarityKey: "ultra", perPack: 1 / 12 },
      { rarityKey: "secret", perPack: 1 / 36 },
    ],
  },
  {
    region: "en",
    key: "en-vintage",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 11,
    packSlots: VINTAGE_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "WOTC-era rare slot composition (roughly 1 in 3 rare slots is holo)",
      url: "https://bulbapedia.bulbagarden.net/wiki/Booster_pack",
    },
    odds: [
      { rarityKey: "holo", perPack: 1 / 3 },
      { rarityKey: "classic", perPack: 1 / 24 },
      { rarityKey: "secret", perPack: 1 / 36 },
    ],
  },
  {
    region: "en",
    key: "en-me",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Mega Evolution era — carried over from Scarlet & Violet slot structure pending large-sample data",
      url: "https://pullrates.com/set/scarlet-and-violet",
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 7 },
      { rarityKey: "illustration", perPack: 1 / 13 },
      { rarityKey: "ultra", perPack: 1 / 15 },
      { rarityKey: "special", perPack: 1 / 32 },
      { rarityKey: "hyper", perPack: 1 / 54 },
      { rarityKey: "megahyper", perPack: 1 / 90 },
      { rarityKey: "blackwhite", perPack: 1 / 350 },
    ],
  },

  // --------------------------------------------------------------- Japanese
  {
    region: "ja",
    key: "ja-sv",
    scope: "era",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4, note: "Per-box guarantee: 4 Double Rares." },
      { rarityKey: "illustration", perBox: 3, note: "Per-box guarantee: 3 Art Rares." },
      { rarityKey: "acespec", perBox: 1, note: "Sets that print ACE SPEC guarantee one per box." },
      { rarityKey: "ultra", perBox: 0.6 },
      { rarityKey: "special", perBox: 0.4, note: "Part of the single 'SR or better' box slot." },
      { rarityKey: "hyper", perBox: 0.2 },
      { rarityKey: "secret", perBox: 1, note: "Per-box guarantee: 1 Super Rare or better." },
    ],
  },
  {
    region: "ja",
    key: "ja-swsh",
    scope: "era",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4, note: "Per-box guarantee: 4 V." },
      { rarityKey: "ultra", perBox: 2, note: "Per-box guarantee: 2 VSTAR/VMAX." },
      { rarityKey: "character", perBox: 3, note: "Per-box guarantee: 3 Character Rares." },
      { rarityKey: "radiant", perBox: 1 },
      { rarityKey: "secret", perBox: 1, note: "Per-box guarantee: 1 Secret Rare." },
      { rarityKey: "charactersuper", perBox: 0.5 },
      { rarityKey: "hyper", perBox: 0.3 },
    ],
  },
  {
    region: "ja",
    key: "ja-me",
    scope: "era",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4, note: "Per-box guarantee: 4 Double Rares." },
      { rarityKey: "illustration", perBox: 3, note: "Per-box guarantee: 3 Art Rares." },
      { rarityKey: "secret", perBox: 2, note: "1 Super Rare or better plus 1 item-specific Super Rare." },
      { rarityKey: "special", perBox: 0.5 },
      { rarityKey: "megahyper", perBox: 0.25 },
      { rarityKey: "hyper", perBox: 0.2 },
    ],
  },
  {
    region: "ja",
    key: "ja-sm",
    scope: "era",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "estimated",
    source: {
      name: "Sun & Moon era Japanese box guarantees (collector consensus)",
      url: "https://www.elitefourum.com/t/japanese-swsh-s-v-booster-box-pull-rates/44762",
    },
    odds: [
      { rarityKey: "ultra", perBox: 2 },
      { rarityKey: "secret", perBox: 1 },
      { rarityKey: "hyper", perBox: 0.3 },
    ],
  },
  {
    region: "ja",
    key: "ja-vintage",
    scope: "era",
    packsPerBox: 20,
    cardsPerPack: 10,
    packSlots: [
      { rarityKeys: ["common"], count: 6 },
      { rarityKeys: ["uncommon"], count: 3 },
      { rarityKeys: ["rare", "holo"], count: 1 },
    ],
    confidence: "estimated",
    source: {
      name: "Vintage Japanese expansion pack composition",
      url: "https://bulbapedia.bulbagarden.net/wiki/Booster_pack",
    },
    odds: [{ rarityKey: "holo", perPack: 1 / 3 }],
  },
];

/**
 * Sets whose pull structure differs enough from their era that the era
 * fallback would be misleading. These are the "special" sets: every pack has a
 * guaranteed hit, so the tier odds are far higher than a main expansion.
 */
export const SPECIAL_SET_OVERRIDES: PullRateEntry[] = [
  {
    region: "en",
    key: "sv08.5", // Prismatic Evolutions
    scope: "set",
    packsPerBox: 18,
    cardsPerPack: 6,
    packSlots: [
      { rarityKeys: ["common"], count: 3 },
      { rarityKeys: ["uncommon"], count: 1 },
      { rarityKeys: ["rare", "holo"], count: 1 },
    ],
    confidence: "community",
    source: {
      name: "Prismatic Evolutions community opening data",
      url: "https://pullrates.com/set/prismatic-evolutions",
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 6 },
      { rarityKey: "illustration", perPack: 1 / 8 },
      { rarityKey: "ultra", perPack: 1 / 12 },
      { rarityKey: "special", perPack: 1 / 25 },
      { rarityKey: "hyper", perPack: 1 / 40 },
      { rarityKey: "shiny", perPack: 1 / 5 },
      { rarityKey: "shinyultra", perPack: 1 / 45 },
    ],
  },
  {
    region: "en",
    key: "sv04.5", // Paldean Fates
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 6,
    packSlots: [
      { rarityKeys: ["common"], count: 3 },
      { rarityKeys: ["uncommon"], count: 1 },
      { rarityKeys: ["rare", "holo"], count: 1 },
    ],
    confidence: "community",
    source: {
      name: "DigitalTQ — Paldean Fates opening data",
      url: "https://www.digitaltq.com/paldean-fates-pull-rates-pokemon-tcg",
    },
    odds: [
      { rarityKey: "shiny", perPack: 1 / 3 },
      { rarityKey: "double", perPack: 1 / 9 },
      { rarityKey: "ultra", perPack: 1 / 14 },
      { rarityKey: "shinyultra", perPack: 1 / 30 },
      { rarityKey: "special", perPack: 1 / 40 },
      { rarityKey: "hyper", perPack: 1 / 60 },
    ],
  },
  {
    region: "en",
    key: "swsh4.5", // Shining Fates
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "estimated",
    source: {
      name: "Shining Fates community opening data",
      url: "https://www.digitaltq.com/celebrations-booster-pull-rates-pokemon-tcg",
    },
    odds: [
      { rarityKey: "shiny", perPack: 1 / 3 },
      { rarityKey: "ultra", perPack: 1 / 10 },
      { rarityKey: "secret", perPack: 1 / 30 },
    ],
  },
  {
    region: "en",
    key: "cel25", // Celebrations
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 4,
    packSlots: [{ rarityKeys: ["common", "uncommon", "rare", "holo"], count: 3 }],
    confidence: "community",
    source: {
      name: "DigitalTQ — Celebrations opening data",
      url: "https://www.digitaltq.com/celebrations-booster-pull-rates-pokemon-tcg",
    },
    odds: [
      { rarityKey: "holo", perPack: 1 },
      { rarityKey: "classic", perPack: 1 / 4, note: "Classic Collection cards appear in roughly 1 in 4 packs." },
    ],
  },
  {
    region: "en",
    key: "sv03.5", // 151
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "community",
    source: {
      name: "DigitalTQ — Pokemon 151 opening data",
      url: "https://www.digitaltq.com/pokemon-151-pull-rates-pokemon-tcg",
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 7 },
      { rarityKey: "illustration", perPack: 1 / 6 },
      { rarityKey: "ultra", perPack: 1 / 15 },
      { rarityKey: "special", perPack: 1 / 28 },
      { rarityKey: "hyper", perPack: 1 / 50 },
    ],
  },
  {
    region: "en",
    key: "swsh12.5", // Crown Zenith
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: MODERN_EN_SLOTS,
    confidence: "community",
    source: {
      name: "DigitalTQ — Crown Zenith opening data",
      url: "https://www.digitaltq.com/crown-zenith-pull-rates-pokemon-tcg",
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 6 },
      { rarityKey: "ultra", perPack: 1 / 9 },
      { rarityKey: "character", perPack: 1 / 4 },
      { rarityKey: "radiant", perPack: 1 / 12 },
      { rarityKey: "secret", perPack: 1 / 30 },
      { rarityKey: "hyper", perPack: 1 / 30 },
    ],
  },
  {
    region: "ja",
    key: "SV8a", // Terastal Festival ex
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: [
        "7 reverse holos + 3 Eeveelution Special Art Rares",
        "1 Common + all 9 Eevee and Eeveelution Special Art Rares",
      ],
    },
    odds: [
      { rarityKey: "double", perBox: 9, note: "Per-box guarantee: 9 Double Rares." },
      { rarityKey: "special", perBox: 1, note: "Per-box guarantee: 1 Special Art Rare." },
      { rarityKey: "acespec", perBox: 1 },
      { rarityKey: "illustration", perBox: 3 },
    ],
  },
  {
    region: "ja",
    key: "SV4a", // Shiny Treasure ex
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["1 Art Rare + 6 baby shinies + 3 full-art shinies"],
    },
    odds: [
      { rarityKey: "double", perBox: 9, note: "Per-box guarantee: 9 Double Rares." },
      { rarityKey: "shiny", perBox: 3, note: "Per-box guarantee: 3 'baby' shinies." },
      { rarityKey: "shinyultra", perBox: 1, note: "Per-box guarantee: 1 full-art shiny." },
    ],
  },
  {
    region: "ja",
    key: "S4a", // Shiny Star V
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["3 full-art shinies + 7 baby shinies"],
    },
    odds: [
      { rarityKey: "shiny", perBox: 3, note: "Per-box guarantee: 3 'baby' shinies." },
      { rarityKey: "shinyultra", perBox: 1, note: "Per-box guarantee: 1 full-art shiny." },
      { rarityKey: "ultra", perBox: 2 },
      { rarityKey: "secret", perBox: 1 },
    ],
  },
  {
    region: "ja",
    key: "S12a", // VSTAR Universe
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["9 Art Rares", "5 Special Art Rares + 5 Art Rares"],
    },
    odds: [
      { rarityKey: "special", perBox: 1, note: "Per-box guarantee: 1 Special Art Rare." },
      { rarityKey: "radiant", perBox: 1 },
      { rarityKey: "illustration", perBox: 3, note: "Per-box guarantee: 3 Art Rares." },
      { rarityKey: "secret", perBox: 1 },
    ],
  },
  {
    region: "ja",
    key: "SV2a", // Pokemon Card 151 (JP)
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4.5, note: "Per-box guarantee: 4-5 Double Rares." },
      { rarityKey: "illustration", perBox: 3, note: "Per-box guarantee: 3 Art Rares." },
      { rarityKey: "secret", perBox: 1, note: "Per-box guarantee: 1 Super Rare or better." },
      { rarityKey: "special", perBox: 0.5 },
    ],
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["1 Common + the complete secret rare evolution lines of two starters"],
    },
  },
  {
    region: "ja",
    key: "M2a", // High Class Pack: MEGA Dream ex
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "megaattack", perBox: 1, note: "Per-box guarantee: 1 Mega Attack Rare." },
      { rarityKey: "illustration", perBox: 3, note: "Per-box guarantee: 3 Art Rares." },
      { rarityKey: "secret", perBox: 2, note: "1 Super Rare or better plus 1 item-specific Super Rare." },
      { rarityKey: "double", perBox: 30, note: "Every pack contains a guaranteed ex." },
    ],
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["5 Mega Attack Rares + 4 Special Art Rares + 1 Art Rare"],
    },
  },
  {
    region: "ja",
    key: "SV11B", // Black Bolt
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4 },
      { rarityKey: "illustration", perBox: 4, note: "Per-box guarantee: 4 Art Rares." },
      { rarityKey: "secret", perBox: 1, note: "Per-box guarantee: 1 Super Rare or better." },
      { rarityKey: "special", perBox: 0.5 },
    ],
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["1 Special Art Rare + 6 Art Rares"],
    },
  },
  {
    region: "ja",
    key: "SV11W", // White Flare
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 7,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    odds: [
      { rarityKey: "double", perBox: 4 },
      { rarityKey: "illustration", perBox: 4, note: "Per-box guarantee: 4 Art Rares." },
      { rarityKey: "secret", perBox: 1, note: "Per-box guarantee: 1 Super Rare or better." },
      { rarityKey: "special", perBox: 0.5 },
    ],
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: ["1 Special Art Rare + 6 Art Rares"],
    },
  },
  {
    region: "ja",
    key: "S8b", // VMAX Climax
    scope: "set",
    packsPerBox: 30,
    cardsPerPack: 5,
    packSlots: JA_SLOTS,
    confidence: "community",
    source: TRAINER_COURT,
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: [
        "10 Galar full-art trainers",
        "10 assorted Super Rares",
        "10 Character Rare / Character Super Rare mix",
      ],
    },
    odds: [
      { rarityKey: "charactersuper", perBox: 1, note: "Per-box guarantee: 1 Character Super Rare." },
      { rarityKey: "character", perBox: 3, note: "Per-box guarantee: 3 Character Rares." },
      { rarityKey: "secret", perBox: 1, note: "Strongly suggested but never confirmed by TPC." },
    ],
  },
];
