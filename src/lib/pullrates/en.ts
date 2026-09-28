import type { BoxUnit, PackSlot, PullRateEntry, RarityOdds } from "../types";

/**
 * English pull rates.
 *
 * Every figure comes from a published opening study; each entry names its
 * source and sample size. Where no sourced figure exists for a tier it is
 * left out (the card then shows "no data") or, for an era fallback, marked
 * as an estimate. Rates are the share of packs holding at least one card of
 * the tier.
 *
 * Research log (Sept 2026): TCGplayer's articles were read through their
 * content API (infinite-api.tcgplayer.com/content/article/<id>/); summary
 * tables were preferred where an article contradicts itself. Elite Fourum
 * figures are from the "Pull rates in modern sets" dataset (stream openings,
 * 95% intervals) and the "English Pokemon card rarity guide" box tallies.
 */

// ------------------------------------------------------------------ helpers

const tcgplayer = (set: string, slug: string, id: string, sampleSize: number) => ({
  name: `TCGplayer — ${set} pull rates`,
  url: `https://www.tcgplayer.com/content/article/${slug}/${id}/`,
  sampleSize,
});

const E4_MODERN = (set: string, sampleSize: number) => ({
  name: `Elite Fourum — ${set} stream-opening tally`,
  url: "https://www.elitefourum.com/t/pull-rates-in-modern-sets/25220",
  sampleSize,
});

const E4_GUIDE = (what: string) => ({
  name: `Elite Fourum rarity guide — ${what}`,
  url: "https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762",
});

const ETB: BoxUnit = {
  short: "ETB",
  plural: "ETBs",
  long: "Elite Trainer Box",
  longPlural: "Elite Trainer Boxes",
};

// -------------------------------------------------------------- pack shapes

/**
 * Scarlet & Violet / Mega Evolution: 10 cards plus a Basic Energy. Double,
 * Ultra and Hyper Rares take the rare slot; Illustration and Special
 * Illustration Rares take the second reverse holo; ACE SPECs and shinies take
 * the first (TCGplayer, "How Pokémon booster packs are changing in Scarlet &
 * Violet").
 */
const SV_SLOTS: PackSlot[] = [
  { rarityKeys: ["common"], count: 4 },
  { rarityKeys: ["uncommon"], count: 3 },
  { rarityKeys: ["common", "uncommon", "rare"], count: 1, name: "reverse1" },
  { rarityKeys: ["common", "uncommon", "rare"], count: 1, name: "reverse2" },
  { rarityKeys: ["rare"], count: 1, name: "rare" },
];

/** Sword & Shield and earlier modern packs: one reverse holo and one rare. */
const LEGACY_SLOTS: PackSlot[] = [
  { rarityKeys: ["common"], count: 4 },
  { rarityKeys: ["uncommon"], count: 3 },
  { rarityKeys: ["common", "uncommon", "rare"], count: 1, name: "reverse" },
  { rarityKeys: ["rare", "holo"], count: 1, name: "rare" },
];

/** WOTC and EX era: the rare slot is holo about one pack in three. */
const VINTAGE_SLOTS: PackSlot[] = [
  { rarityKeys: ["common"], count: 5 },
  { rarityKeys: ["uncommon"], count: 3 },
  { rarityKeys: ["rare"], count: 1, name: "rare" },
];

/** Which slot each Scarlet & Violet / Mega Evolution tier takes over. */
const SV_SLOT_OF: Record<string, string> = {
  illustration: "reverse2",
  special: "reverse2",
  acespec: "reverse1",
  shiny: "reverse1",
  shinyultra: "reverse1",
};

function sv(
  key: string,
  source: PullRateEntry["source"],
  rates: Record<string, number>,
  opts: {
    confidence?: PullRateEntry["confidence"];
    box?: "etb";
    notes?: Record<string, string>;
  } = {},
): PullRateEntry {
  const odds: RarityOdds[] = Object.entries(rates).map(([rarityKey, perPack]) => ({
    rarityKey,
    perPack,
    slot: SV_SLOT_OF[rarityKey] ?? "rare",
    ...(opts.notes?.[rarityKey] ? { note: opts.notes[rarityKey] } : {}),
  }));
  return {
    region: "en",
    key,
    scope: "set",
    packsPerBox: opts.box === "etb" ? 9 : 36,
    cardsPerPack: 10,
    packSlots: SV_SLOTS,
    confidence: opts.confidence ?? "verified",
    source,
    odds,
    ...(opts.box === "etb" ? { box: ETB } : {}),
  };
}

function legacy(
  key: string,
  source: PullRateEntry["source"],
  confidence: PullRateEntry["confidence"],
  odds: RarityOdds[],
  extra: Partial<PullRateEntry> = {},
): PullRateEntry {
  return {
    region: "en",
    key,
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: LEGACY_SLOTS,
    confidence,
    source,
    odds,
    ...extra,
  };
}

// ------------------------------------------------------ Scarlet & Violet

const SV_SETS: PullRateEntry[] = [
  sv("sv01", tcgplayer("Scarlet & Violet", "Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates", "a7702fce-dd64-4a58-beb1-0f871c853215", 8000),
    { double: 0.1376, ultra: 0.0657, illustration: 0.0767, special: 0.0315, hyper: 0.0185 }),
  sv("sv02", tcgplayer("Paldea Evolved", "Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates", "1b7d3e70-9542-4a50-8692-1661e2316521", 8000),
    { double: 0.1372, ultra: 0.0664, illustration: 0.077, special: 0.0317, hyper: 0.0176 }),
  sv("sv03", tcgplayer("Obsidian Flames", "Pok%C3%A9mon-TCG-Obsidian-Flames-Pull-Rates", "e2a66999-a7b5-4621-9765-c9a132e04bd2", 8000),
    { double: 0.1361, ultra: 0.0663, illustration: 0.076, special: 0.0313, hyper: 0.0192 }),
  sv("sv03.5", tcgplayer("151", "Pok%C3%A9mon-TCG-Scarlet-Violet%E2%80%94151-Pull-Rates", "b237df74-fbb0-40d0-9e13-d69ee6e804d9", 1500),
    { double: 0.1328, ultra: 0.0644, illustration: 0.085, special: 0.0311, hyper: 0.0194 }, { box: "etb" }),
  sv("sv04", tcgplayer("Paradox Rift", "Pok%C3%A9mon-TCG-Paradox-Rift-Pull-Rates", "0b5fb648-38fc-4f61-a6af-57c2737b4a48", 8000),
    { double: 0.1557, ultra: 0.0664, illustration: 0.077, special: 0.0211, hyper: 0.0122 }),
  sv("sv04.5", tcgplayer("Paldean Fates", "Pok%C3%A9mon-TCG-Paldean-Fates-Pull-Rates", "23de3e93-0d0f-4ae0-abc4-13664f3001a3", 1500),
    { double: 0.1589, ultra: 0.0661, shiny: 0.2544, shinyultra: 0.0772, illustration: 0.0722, special: 0.0172, hyper: 0.0161 },
    { box: "etb" }),
  sv("sv05", tcgplayer("Temporal Forces", "Pok%C3%A9mon-TCG-Temporal-Forces-Pull-Rates", "28c0ad22-00a4-428f-b22d-e7fee9ec50bc", 8000),
    { double: 0.1683, ultra: 0.0667, acespec: 0.05, illustration: 0.0772, special: 0.0117, hyper: 0.0072 }),
  sv("sv06", tcgplayer("Twilight Masquerade", "Pok%C3%A9mon-TCG-Twilight-Masquerade-Pull-Rates", "f3eea967-e5fb-4108-8655-bb1c89587628", 8000),
    { double: 0.1693, ultra: 0.0661, acespec: 0.0506, illustration: 0.0773, special: 0.0117, hyper: 0.0068 }),
  // No TCGplayer study exists for Shrouded Fable; the largest public tally is
  // one collector's 2,354 packs, which does not count Double Rares or ACE
  // SPECs — those two use the neighbouring sets' measured rate.
  sv("sv06.5",
    {
      name: "Community tally — Shrouded Fable openings",
      url: "https://www.skool.com/pokemon/shrouded-fable-pull-rates",
      sampleSize: 2354,
    },
    { double: 0.169, acespec: 0.05, illustration: 0.0807, ultra: 0.0692, special: 0.0157, hyper: 0.0085 },
    {
      confidence: "community",
      box: "etb",
      notes: {
        double: "Not in the Shrouded Fable tally; the rate measured in neighbouring sets.",
        acespec: "Not in the Shrouded Fable tally; the rate measured in neighbouring sets.",
      },
    }),
  sv("sv07", tcgplayer("Stellar Crown", "Pok%C3%A9mon-TCG-Stellar-Crown-Pull-Rates", "2c0743dd-dbd0-4504-9ff8-be5a72dd04d1", 8000),
    { double: 0.169, ultra: 0.0675, acespec: 0.0494, illustration: 0.0779, special: 0.0111, hyper: 0.0073 }),
  sv("sv08", tcgplayer("Surging Sparks", "Pok%C3%A9mon-TCG-Surging-Sparks-Pull-Rates", "6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e", 8000),
    { double: 0.1694, ultra: 0.0674, acespec: 0.0503, illustration: 0.0767, special: 0.0115, hyper: 0.0053 }),
  // Prismatic has no Illustration Rares. Its Poké Ball (1 in 3) and Master
  // Ball (1 in 20) reverse holos are print variants of the same cards and are
  // not priced separately here.
  sv("sv08.5", tcgplayer("Prismatic Evolutions", "Pok%C3%A9mon-TCG-Prismatic-Evolutions-Pull-Rates", "d94889ea-f76a-4a13-b74d-5b0b071220a7", 1200),
    { double: 0.1651, ultra: 0.0746, acespec: 0.0468, special: 0.0222, hyper: 0.0056 },
    {
      box: "etb",
      notes: { special: "TCGplayer gives this as SIRs per pack (1 per 45), not the share of packs holding one." },
    }),
  sv("sv09", tcgplayer("Journey Together", "Pok%C3%A9mon-TCG-Journey-Together-Pull-Rates", "1b9f379f-97cb-45cc-b6f6-a1a070a422cd", 8000),
    { double: 0.2029, ultra: 0.0654, illustration: 0.085, special: 0.0116, hyper: 0.0073 }),
  sv("sv10", tcgplayer("Destined Rivals", "Pok%C3%A9mon-TCG-Destined-Rivals-Pull-Rates", "43ba832e-44c9-45a4-ae2e-594df2defdda", 8000),
    { double: 0.1983, ultra: 0.0639, illustration: 0.0829, special: 0.0106, hyper: 0.0067 }),
  // One study covers both halves (350+ packs each). No Black White Rare turned
  // up in it and no other count is traceable, so that tier has no figure.
  ...(["sv10.5b", "sv10.5w"] as const).map((key) =>
    sv(key, tcgplayer("Black Bolt & White Flare", "Pok%C3%A9mon-TCG-Black-Bolt-and-White-Flare-Pull-Rates", "bac92199-a2a7-4668-b4a4-2647a111776f", 700),
      { double: 0.2111, ultra: 0.0583, illustration: 0.1639, special: 0.0125 },
      { confidence: "community", box: "etb" })),
];

// ------------------------------------------------------- Mega Evolution

const ME_SETS: PullRateEntry[] = [
  sv("me01", tcgplayer("Mega Evolution", "Pok%C3%A9mon-TCG-Mega-Evolution-Pull-Rates", "40cbeedc-21ce-473b-aef1-74e3969d9f91", 5000),
    { double: 0.2091, ultra: 0.0823, illustration: 0.1089, special: 0.0099, megahyper: 0.0008 }),
  sv("me02", tcgplayer("Phantasmal Flames", "Pok%C3%A9mon-TCG-Phantasmal-Flames-Pull-Rates", "9abae60d-b7fb-448f-874e-176f78d6a6ca", 5000),
    { double: 0.2077, ultra: 0.0806, illustration: 0.1097, special: 0.0125, megahyper: 0.0008 }),
  sv("me02.5", tcgplayer("Ascended Heroes", "Pok%C3%A9mon-TCG-Ascended-Heroes-Pull-Rates", "60143d94-88a7-42ce-8e73-babd7b3fabd6", 2000),
    { double: 0.2037, ultra: 0.0481, megaattack: 0.0347, illustration: 0.1125, special: 0.0144, megahyper: 0.0019 },
    { box: "etb" }),
  sv("me03", tcgplayer("Perfect Order", "Pok%C3%A9mon-TCG-Perfect-Order-Pull-Rates", "73148119-ebcb-40b7-84b6-52b3a6d0c631", 3500),
    { double: 0.2097, ultra: 0.0854, illustration: 0.112, special: 0.0123, megahyper: 1 / 1786 }),
  sv("me04", tcgplayer("Chaos Rising", "Pok%C3%A9mon-TCG-Chaos-Rising-Pull-Rates", "304e8bfc-175a-4d31-93fe-5bb1be11e5d2", 8500),
    { double: 0.203, ultra: 0.0829, illustration: 0.1066, special: 0.0121, megahyper: 1 / 956 }),
  sv("me05", tcgplayer("Pitch Black", "Pok%C3%A9mon-TCG-Pitch-Black-Pull-Rates", "069a5fda-2d1f-44a1-97de-b6dcdc5abfb8", 4000),
    { double: 0.2102, ultra: 0.083, illustration: 0.1101, special: 0.0125, megahyper: 1 / 1081 }),
  // 5 game cards (plus a Basic Energy). Slots 1-3 commons, where slot 3 can
  // be an Illustration Rare or Classic Collection card; slot 4 the rare, which
  // Double, Special Illustration, Futuristic and RGB Rares replace; slot 5 is
  // always a Pikachu Rare.
  {
    region: "en",
    key: "30th",
    scope: "set",
    packsPerBox: 6,
    box: { short: "bundle", plural: "bundles", long: "booster bundle", longPlural: "booster bundles" },
    cardsPerPack: 5,
    packSlots: [
      { rarityKeys: ["common"], count: 2 },
      { rarityKeys: ["common"], count: 1, name: "slot3" },
      { rarityKeys: ["rare"], count: 1, name: "rare" },
      { rarityKeys: ["pikachu"], count: 1 },
    ],
    confidence: "community",
    source: {
      name: "Wargamer — 30th Celebration openings (TCGplayer's 3,000-pack study agrees within a pack or two)",
      url: "https://www.wargamer.com/pokemon-trading-card-game/30th-celebration-pull-rates",
      sampleSize: 4063,
    },
    odds: [
      { rarityKey: "double", perPack: 1 / 4, note: "TCGplayer measured 1 in 5." },
      { rarityKey: "illustration", perPack: 1 / 5, slot: "slot3" },
      { rarityKey: "classic", perPack: 1 / 10, slot: "slot3", note: "Classic Collection reprints." },
      { rarityKey: "special", perPack: 1 / 20, note: "TCGplayer measured 1 in 21." },
      { rarityKey: "ultra", perPack: 1 / 100, note: "The two Futuristic Rares. TCGplayer measured 1 in 120." },
      {
        rarityKey: "rgb",
        perPack: 1 / 4063,
        note: "One RGB Mew in 4,063 packs (none in TCGplayer's 3,000); the true rate could be anywhere from about 1 in 700 to 1 in 23,000.",
      },
    ],
  },
];

// ------------------------------------------------------- Sword & Shield
//
// Keys: double = V, triple = VMAX/VSTAR, ultra = full-art V and trainers,
// altart / altsecret = alternate-art V / VMAX-VSTAR, secret = rainbow + gold,
// character / charactersuper = Trainer or Galarian Gallery (non-V / V, VMAX,
// trainer). Where a study reports rainbow and gold separately they are added.

const SWSH_SETS: PullRateEntry[] = [
  legacy("swsh1", E4_MODERN("Sword & Shield", 4628), "community", [
    { rarityKey: "double", perPack: 0.142 },
    { rarityKey: "triple", perPack: 0.022 },
    { rarityKey: "ultra", perPack: 0.0285 + 0.0089 },
    { rarityKey: "secret", perPack: 0.0123 + 0.0091 },
  ]),
  legacy("swsh2", E4_MODERN("Rebel Clash", 2736), "community", [
    { rarityKey: "double", perPack: 0.1265 },
    { rarityKey: "triple", perPack: 0.034 },
    { rarityKey: "ultra", perPack: 0.0303 + 0.0073 },
    { rarityKey: "secret", perPack: 0.015 + 0.0095 },
  ]),
  legacy("swsh3", E4_MODERN("Darkness Ablaze", 5040), "community", [
    { rarityKey: "double", perPack: 0.1258 },
    { rarityKey: "triple", perPack: 0.0385 },
    { rarityKey: "ultra", perPack: 0.0272 + 0.0113 },
    { rarityKey: "secret", perPack: 0.0119 + 0.0087 },
  ]),
  legacy("swsh3.5", E4_MODERN("Champion's Path", 3192), "community", [
    { rarityKey: "double", perPack: 0.1573 },
    { rarityKey: "triple", perPack: 0.0355 },
    { rarityKey: "ultra", perPack: 0.0376 + 0.0163 },
    { rarityKey: "secret", perPack: 0.0157 + 0.0132 },
  ]),
  legacy(
    "swsh4",
    {
      name: "DigitalTQ — Vivid Voltage openings",
      url: "https://www.digitaltq.com/vivid-voltage-booster-pull-rates-pokemon-tcg",
      sampleSize: 630,
    },
    "community",
    [
      { rarityKey: "double", perPack: 0.127 },
      { rarityKey: "triple", perPack: 0.0429 },
      { rarityKey: "ultra", perPack: 0.0397 },
      { rarityKey: "amazing", perPack: 0.0571 },
      { rarityKey: "secret", perPack: 0.0127 + 0.0111 },
    ],
  ),
  legacy("swsh4.5", E4_MODERN("Shining Fates", 2187), "community", [
    { rarityKey: "shiny", perPack: 0.2273, slot: "reverse", note: "Shiny Vault baby shinies." },
    { rarityKey: "shinyultra", perPack: 0.0896, slot: "reverse", note: "Shiny Vault V and VMAX." },
    { rarityKey: "double", perPack: 0.1084 },
    { rarityKey: "triple", perPack: 0.0544 },
    { rarityKey: "ultra", perPack: 0.005 + 0.0274 },
    { rarityKey: "amazing", perPack: 0.0576 },
    { rarityKey: "secret", perPack: 0.0119 + 0.0091 },
  ]),
  legacy(
    "swsh7",
    tcgplayer("Evolving Skies", "Pok%C3%A9mon-TCG-Evolving-Skies-Pull-Rates", "6a743d7b-e5ee-4fd6-9d18-64a636990e8c", 8000),
    "verified",
    [
      { rarityKey: "double", perPack: 0.1056 },
      { rarityKey: "triple", perPack: 0.056 },
      { rarityKey: "ultra", perPack: 0.0278 },
      { rarityKey: "altart", perPack: 0.011 },
      { rarityKey: "altsecret", perPack: 0.003, note: "About 1 in 2,000 packs for one specific alt-art VMAX." },
      { rarityKey: "secret", perPack: 0.0084 + 0.0091 },
    ],
  ),
  legacy(
    "swsh8",
    {
      name: "TCGplayer — Fusion Strike pull-rate infographic",
      url: "https://www.elitefourum.com/t/lost-origin-silver-tempest-fusion-strike-and-more-pull-rates/38824",
      sampleSize: 4000,
    },
    "verified",
    [
      {
        rarityKey: "double",
        perPack: 4.59 / 36,
        note: "Not in TCGplayer's study; Elite Fourum box tallies (4.59 V per box).",
      },
      { rarityKey: "triple", perPack: 1 / 30 },
      { rarityKey: "ultra", perPack: 1 / 58 + 1 / 64 },
      { rarityKey: "altart", perPack: 1 / 180 },
      { rarityKey: "altsecret", perPack: 1 / 332 },
      { rarityKey: "secret", perPack: 1 / 127 + 1 / 120 },
    ],
  ),
  legacy(
    "swsh10",
    tcgplayer("Astral Radiance", "Pok%C3%A9mon-TCG-Astral-Radiance-Pull-Rates", "10da749f-9c8b-45c0-b80a-dbd86ca5dcde", 8000),
    "verified",
    [
      { rarityKey: "double", perPack: 0.1277 },
      { rarityKey: "triple", perPack: 0.0347 },
      { rarityKey: "ultra", perPack: 0.0213 + 0.0108 },
      { rarityKey: "altart", perPack: 0.0074 },
      { rarityKey: "character", perPack: 1 / 12, slot: "reverse", note: "Trainer Gallery, non-V." },
      { rarityKey: "charactersuper", perPack: 1 / 24, slot: "reverse", note: "Trainer Gallery V, VMAX and trainers." },
      {
        rarityKey: "radiant",
        perPack: 0.048,
        note: "Not in TCGplayer's Astral Radiance study; the rate it measured in Lost Origin and Silver Tempest.",
      },
      { rarityKey: "secret", perPack: 0.0128 + 0.0076 },
    ],
  ),
  legacy(
    "swsh11",
    tcgplayer("Lost Origin", "Pok%C3%A9mon-TCG-Lost-Origin-Pull-Rates", "ba20ac4d-9448-45ce-b919-d856d107c744", 8000),
    "verified",
    [
      { rarityKey: "double", perPack: 0.1163 },
      { rarityKey: "triple", perPack: 0.0442 },
      { rarityKey: "ultra", perPack: 0.0198 + 0.0142 },
      { rarityKey: "altart", perPack: 0.005 },
      { rarityKey: "character", perPack: 1 / 12, slot: "reverse", note: "Trainer Gallery, non-V." },
      { rarityKey: "charactersuper", perPack: 1 / 32, slot: "reverse", note: "Trainer Gallery V, VMAX and trainers." },
      { rarityKey: "radiant", perPack: 0.0501 },
      {
        rarityKey: "secret",
        perPack: 0.0128 + 0.0076 + 0.0086,
        note: "Rainbow, gold, and the Trainer Gallery gold-and-black VMAX.",
      },
    ],
  ),
  legacy(
    "swsh12",
    {
      ...tcgplayer("Silver Tempest", "Pok%C3%A9mon-TCG-Silver-Tempest-Pull-Rates", "6490d591-e582-4930-8446-00e190876d30", 8000),
      url: "https://infinite.tcgplayer.com/article/Pok%C3%A9mon-TCG-Silver-Tempest-Pull-Rates/6490d591-e582-4930-8446-00e190876d30/",
    },
    "verified",
    [
      { rarityKey: "double", perPack: 0.1155 },
      { rarityKey: "triple", perPack: 0.0372 },
      { rarityKey: "ultra", perPack: 0.021 + 0.0101 },
      { rarityKey: "altart", perPack: 0.006 },
      { rarityKey: "character", perPack: 1 / 12, slot: "reverse", note: "Trainer Gallery, non-V." },
      { rarityKey: "charactersuper", perPack: 1 / 32, slot: "reverse", note: "Trainer Gallery V, VMAX and trainers." },
      { rarityKey: "radiant", perPack: 0.0455 },
      {
        rarityKey: "secret",
        perPack: 0.0126 + 0.0094 + 0.009,
        note: "Rainbow, gold, and the Trainer Gallery gold-and-black VMAX.",
      },
    ],
  ),
  legacy(
    "swsh12.5",
    tcgplayer("Crown Zenith", "Pok%C3%A9mon-TCG-Crown-Zenith-Pull-Rates", "56af3032-cb34-4da1-92fb-9cf206d10c0f", 1900),
    "verified",
    [
      { rarityKey: "character", perPack: 0.224, slot: "reverse", note: "Galarian Gallery, non-V." },
      { rarityKey: "charactersuper", perPack: 0.12, slot: "reverse", note: "Galarian Gallery V and trainers." },
      { rarityKey: "double", perPack: 0.1235 },
      { rarityKey: "triple", perPack: 0.053 },
      { rarityKey: "ultra", perPack: 0.0095 },
      { rarityKey: "radiant", perPack: 0.0455 },
      { rarityKey: "secret", perPack: 0.008 + 0.0075, note: "Galarian Gallery gold VSTARs and the Pikachu secret." },
    ],
  ),
  // Celebrations: 4 cards, no booster box. Small sample.
  {
    region: "en",
    key: "cel25",
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 4,
    packSlots: [{ rarityKeys: ["common", "uncommon", "rare", "holo"], count: 3 }],
    confidence: "community",
    source: {
      name: "DigitalTQ — Celebrations openings",
      url: "https://www.digitaltq.com/celebrations-booster-pull-rates-pokemon-tcg",
      sampleSize: 541,
    },
    odds: [
      { rarityKey: "classic", perPack: 217 / 541, note: "Classic Collection reprints." },
      { rarityKey: "double", perPack: 132 / 541 },
      { rarityKey: "triple", perPack: 50 / 541 },
      { rarityKey: "ultra", perPack: 21 / 541, note: "Full-art Professor's Research." },
      { rarityKey: "secret", perPack: 2 / 541, note: "Gold Mew — only 2 in the sample, so very rough." },
    ],
  },
  legacy(
    "swsh10.5",
    {
      name: "DigitalTQ — Pokémon GO openings",
      url: "https://www.digitaltq.com/pokemon-go-pull-rates-pokemon-tcg",
      sampleSize: 371,
    },
    "community",
    [
      { rarityKey: "double", perPack: 0.159 },
      { rarityKey: "triple", perPack: 0.0377 + 0.0216 },
      { rarityKey: "ultra", perPack: 0.0539 },
      { rarityKey: "radiant", perPack: 0.0539 },
      { rarityKey: "secret", perPack: 0.0323 + 0.0054 },
    ],
  ),
];

// ----------------------------------------------------- Sun & Moon and older

const OLDER_SETS: PullRateEntry[] = [
  legacy("sm10", E4_MODERN("Unbroken Bonds", 3888), "community", [
    { rarityKey: "double", perPack: 0.0988, note: "Regular (non-full-art) GX." },
    { rarityKey: "ultra", perPack: 0.0311 + 0.01, note: "Full-art GX (alternate arts included) and full-art trainers." },
    { rarityKey: "secret", perPack: 0.0139 + 0.009 },
  ]),
  legacy("sm115", E4_MODERN("Hidden Fates", 1580), "community", [
    { rarityKey: "shiny", perPack: 0.212, slot: "reverse", note: "Shiny Vault baby shinies." },
    { rarityKey: "shinyultra", perPack: 0.1019, slot: "reverse", note: "Shiny Vault GX." },
    { rarityKey: "double", perPack: 0.1506 },
    {
      rarityKey: "ultra",
      perPack: 0.0411,
      note: "Not measured for Hidden Fates; the Sun & Moon rate from Unbroken Bonds.",
    },
    { rarityKey: "secret", perPack: 0.0076 + 0.0171 },
  ]),
  // Secret Wonders' single LV.X figure is 4 in 8 boxes; Supreme Victors and
  // Arceus were counted over roughly 28 boxes each.
  ...(
    [
      ["dp1", 1 / 36, "1 per box"],
      ["dp3", 1 / 72, "4 in 8 boxes"],
      ["pl3", 3.75 / 36, "3.75 per box"],
      ["pl4", 3 / 36, "3 per box"],
    ] as const
  ).map(([key, lvx, how]) => ({
    region: "en" as const,
    key,
    scope: "set" as const,
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: LEGACY_SLOTS,
    confidence: "community" as const,
    source: E4_GUIDE("LV.X per box from YouTube box openings"),
    odds: [
      { rarityKey: "holo", perPack: 1 / 3, slot: "rare" },
      { rarityKey: "classic", perPack: lvx, slot: "reverse", note: `LV.X: ${how}.` },
    ],
  })),
  {
    region: "en",
    key: "hgss1",
    scope: "set",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: LEGACY_SLOTS,
    confidence: "community",
    source: E4_GUIDE("HeartGold SoulSilver, 25 boxes"),
    odds: [
      { rarityKey: "classic", perPack: 5.92 / 36, slot: "reverse", note: "Pokémon Prime, which come in the reverse slot." },
      { rarityKey: "legend", perPack: 3.2 / 36, note: "Each LEGEND half." },
      { rarityKey: "holo", perPack: 8.36 / 36 },
      { rarityKey: "ultra", perPack: 1 / 72, note: "Alph Lithograph ONE: 1 in 2 boxes." },
    ],
  },
];

// ---------------------------------------------------------- era fallbacks
//
// Used only for sets with no study of their own. Modern eras average the
// measured sets; older eras use the Elite Fourum box tallies.

const ERAS: PullRateEntry[] = [
  {
    ...sv("en-sv", { name: "Average of TCGplayer's measured Scarlet & Violet sets (2024–2025)", url: "https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/" },
      { double: 0.17, ultra: 0.066, acespec: 0.05, illustration: 0.077, special: 0.0115, hyper: 0.007 },
      { confidence: "estimated" }),
    scope: "era",
  },
  {
    ...sv("en-me", { name: "Average of TCGplayer's measured Mega Evolution sets", url: "https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Chaos-Rising-Pull-Rates/304e8bfc-175a-4d31-93fe-5bb1be11e5d2/" },
      { double: 0.207, ultra: 0.083, illustration: 0.109, special: 0.012, megahyper: 0.0009 },
      { confidence: "estimated" }),
    scope: "era",
  },
  {
    ...legacy(
      "en-swsh",
      { name: "Average of TCGplayer's measured Sword & Shield sets (Evolving Skies to Silver Tempest)", url: "https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Evolving-Skies-Pull-Rates/6a743d7b-e5ee-4fd6-9d18-64a636990e8c/" },
      "estimated",
      [
        { rarityKey: "double", perPack: 0.116 },
        { rarityKey: "triple", perPack: 0.042 },
        { rarityKey: "ultra", perPack: 0.032 },
        { rarityKey: "altart", perPack: 0.007 },
        { rarityKey: "altsecret", perPack: 0.003 },
        { rarityKey: "character", perPack: 1 / 12, slot: "reverse" },
        { rarityKey: "charactersuper", perPack: 1 / 28, slot: "reverse" },
        { rarityKey: "radiant", perPack: 0.048 },
        { rarityKey: "amazing", perPack: 0.057 },
        { rarityKey: "secret", perPack: 0.02 },
      ],
    ),
    scope: "era",
  },
  {
    ...legacy("en-sm", { ...E4_MODERN("Unbroken Bonds, applied era-wide", 3888), sampleSize: undefined }, "estimated", [
      { rarityKey: "double", perPack: 0.0988, note: "Regular (non-full-art) GX." },
      { rarityKey: "ultra", perPack: 0.0411 },
      { rarityKey: "secret", perPack: 0.0229 },
    ]),
    scope: "era",
  },
  {
    ...legacy("en-xy", E4_GUIDE("Roaring Skies, 31 boxes, applied era-wide"), "estimated", [
      { rarityKey: "double", perPack: 4.06 / 36, note: "Regular (non-full-art) EX." },
      { rarityKey: "ultra", perPack: (2.42 - 0.29) / 36 },
      { rarityKey: "secret", perPack: 0.29 / 36 },
    ]),
    scope: "era",
  },
  {
    ...legacy("en-bw", E4_GUIDE("Next Destinies box composition, applied era-wide"), "estimated", [
      { rarityKey: "double", perPack: 2 / 36, note: "About two regular EX per box." },
      { rarityKey: "ultra", perPack: 1 / 36, note: "About one full art per box." },
      { rarityKey: "secret", perPack: 1 / 108, note: "About one per three boxes." },
    ]),
    scope: "era",
  },
  {
    ...legacy("en-hgss", E4_GUIDE("HeartGold SoulSilver-era box tallies"), "estimated", [
      { rarityKey: "classic", perPack: 5 / 36, slot: "reverse", note: "Pokémon Prime, about 5 per box after the base set." },
      { rarityKey: "legend", perPack: 2.7 / 36, note: "Each LEGEND half; 2.4–3.0 per box." },
      { rarityKey: "holo", perPack: 1 / 3 },
      { rarityKey: "ultra", perPack: 1 / 216, note: "Alph Lithographs other than ONE: about 1 per case." },
    ]),
    scope: "era",
  },
  {
    region: "en",
    key: "en-dp",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 10,
    packSlots: LEGACY_SLOTS,
    confidence: "estimated",
    source: E4_GUIDE("Diamond & Pearl / Platinum LV.X tallies (1 to 3.75 per box)"),
    odds: [
      { rarityKey: "holo", perPack: 1 / 3, slot: "rare" },
      { rarityKey: "classic", perPack: 3 / 36, slot: "reverse", note: "LV.X: typically about 3 per box, 1 in early sets." },
    ],
  },
  {
    region: "en",
    key: "en-ex",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 9,
    packSlots: VINTAGE_SLOTS,
    confidence: "estimated",
    source: E4_GUIDE("EX-era box tallies (104 Gold Star box videos)"),
    odds: [
      { rarityKey: "holo", perPack: 1 / 3 },
      { rarityKey: "double", perPack: 4 / 36, note: "Pokémon-ex: 3 to 6 per box depending on the set." },
      { rarityKey: "goldstar", perPack: 1 / 108, note: "Measured at 1 in 3 boxes across all Gold Star sets." },
    ],
  },
  {
    region: "en",
    key: "en-vintage",
    scope: "era",
    packsPerBox: 36,
    cardsPerPack: 11,
    packSlots: VINTAGE_SLOTS,
    confidence: "community",
    source: E4_GUIDE("WOTC-era rare slot (holo in 1 of 3 packs)"),
    odds: [{ rarityKey: "holo", perPack: 1 / 3 }],
  },
];

export const EN_ENTRIES: PullRateEntry[] = [...SV_SETS, ...ME_SETS, ...SWSH_SETS, ...OLDER_SETS, ...ERAS];
