import type { PackSlot, PullRateEntry, RarityOdds } from "../types";

/**
 * Japanese pull rates, as per-box counts.
 *
 * The Pokémon Company publishes none of these (the one exception is Tag All
 * Stars' official "one SR or better in every box"). The figures are observed
 * box contents: "guaranteed" means every tallied box had it. The main source,
 * ポケゲトちゃんねる (pokemon-infomation.com), hand-tallies 300-2,000 boxes per
 * set and gives the per-box chance of each hit; houhou-news compiles posted
 * openings; The Trainer Court lists the observed guarantees.
 *
 * Keys follow the English tiers so both languages read the same:
 * RR = double, RRR = triple, AR = illustration, SR = ultra, SAR / SA =
 * special, UR (gold) = hyper in SV and M, secret before that, HR = hyper,
 * CHR / CSR = character / charactersuper, K = radiant, S / SSR = shiny /
 * shinyultra, MA = megaattack, MUR = megahyper, PR = prism, TR = holo.
 *
 * Research log (Sept 2026): every figure was read from the pages cited.
 */

// ------------------------------------------------------------------ sources

const PI = (set: string, slug: string, boxes: number) => ({
  name: `ポケゲトちゃんねる — ${set} box tally (${boxes.toLocaleString()} boxes)`,
  url: `https://pokemon-infomation.com/pull-rates-${slug}/`,
  sampleSize: boxes * 30,
});

const TTC = {
  name: "The Trainer Court — Japanese booster box guarantees (collector-observed)",
  url: "https://www.thetrainercourt.com/blogs/resources/japanese-booster-box-guaranteed-hit-rates-god-packs",
};

const HH = (set: string, slug: string) => ({
  name: `ポケカ速報まとめ — ${set} box openings`,
  url: `https://www.houhou-news.com/${slug}`,
});

// ----------------------------------------------------------------- shapes

/** Standard expansion: 5 cards, the fifth a rare or better. */
const STANDARD: PackSlot[] = [
  { rarityKeys: ["common"], count: 3 },
  { rarityKeys: ["uncommon"], count: 1 },
  { rarityKeys: ["rare", "holo"], count: 1, name: "rare" },
];

/** Subset / special packs that run 6 or 7 cards. */
const special = (cards: number): PackSlot[] => [
  { rarityKeys: ["common"], count: cards - 2 },
  { rarityKeys: ["uncommon"], count: 1 },
  { rarityKeys: ["rare", "holo"], count: 1, name: "rare" },
];

/**
 * High-class packs: the main-set cards carry no rarity mark and fill the pack
 * around its guaranteed hits.
 */
const highClass = (cards: number): PackSlot[] => [
  { rarityKeys: ["common", "uncommon", "rare"], count: cards, name: "rare" },
];

function box(
  key: string,
  shape: { packs: number; cards: number; slots: PackSlot[] },
  source: PullRateEntry["source"],
  counts: Record<string, number>,
  opts: { confidence?: PullRateEntry["confidence"]; notes?: Record<string, string>; scope?: "set" | "era" } & Pick<
    PullRateEntry,
    "godPack"
  > = {},
): PullRateEntry {
  const odds: RarityOdds[] = Object.entries(counts).map(([rarityKey, perBox]) => ({
    rarityKey,
    perBox,
    ...(opts.notes?.[rarityKey] ? { note: opts.notes[rarityKey] } : {}),
  }));
  return {
    region: "ja",
    key,
    scope: opts.scope ?? "set",
    packsPerBox: shape.packs,
    cardsPerPack: shape.cards,
    packSlots: shape.slots,
    confidence: opts.confidence ?? "community",
    source,
    odds,
    ...(opts.godPack ? { godPack: opts.godPack } : {}),
  };
}

const BOX_30x5 = { packs: 30, cards: 5, slots: STANDARD };
const BOX_20x7 = { packs: 20, cards: 7, slots: special(7) };
const BOX_20x6 = { packs: 20, cards: 6, slots: special(6) };
const HC_10x10 = { packs: 10, cards: 10, slots: highClass(10) };
const HC_10x11 = { packs: 10, cards: 11, slots: highClass(11) };

// ------------------------------------------------------------------ MEGA

/**
 * Standard MEGA box: 4-5 RR, 3 AR, one trainer SR (item, tool or stadium) in
 * its own slot, plus one "SR or better" (Pokémon / supporter SR about 80%,
 * SAR about 28%, MUR 1-2%; sometimes two hits).
 */
const MEGA_BOX = { double: 4.1, illustration: 3, ultra: 1.8, special: 0.28, megahyper: 0.015 };
const MEGA_NOTES = {
  ultra: "One trainer SR in its own slot, plus a Pokémon or supporter SR in about 80% of boxes.",
  megahyper: "About 1-2% of boxes.",
};

const MEGA: PullRateEntry[] = [
  box("M1S", BOX_30x5, PI("Mega Symphonia", "megasymphonia", 1000), MEGA_BOX, { notes: MEGA_NOTES }),
  box("M1L", BOX_30x5, TTC, MEGA_BOX, { notes: MEGA_NOTES }),
  box("M2", BOX_30x5, PI("Inferno X", "infernox", 1000), MEGA_BOX, { notes: MEGA_NOTES }),
  box("M3", BOX_30x5, PI("Nihil Zero", "munikisuzero", 1000), MEGA_BOX, {
    notes: { ...MEGA_NOTES, double: "4-5 per box (The Trainer Court lists 2; the 1,000-box tally says 4-5)." },
  }),
  box("M4", BOX_30x5, PI("Ninja Spinner", "ninjaspiner", 1000), MEGA_BOX, { notes: MEGA_NOTES }),
  box("M5", BOX_30x5, PI("Abyss Eye", "abysseye", 600), MEGA_BOX, { notes: MEGA_NOTES }),
  box("M6", BOX_30x5, TTC, MEGA_BOX, { notes: MEGA_NOTES, confidence: "estimated" }),
  box(
    "M2a",
    HC_10x10,
    PI("MEGA Dream ex", "megadreamex", 2000),
    // Guaranteed MA and trainer SR; the second hit (about half of boxes) is
    // a SAR about 40%, SR about 10%, MUR about 2%.
    { double: 9, megaattack: 1, illustration: 3, ultra: 1.1, special: 0.4, megahyper: 0.02 },
    {
      notes: { megaattack: "Guaranteed one per box.", special: "About 40% of boxes." },
      godPack: {
        perPack: 1 / 400,
        contents: ["1 Art Rare + 5 Mega Attack Rares + 4 Special Art Rares"],
      },
    },
  ),
];

// ------------------------------------------------------ Scarlet & Violet

/**
 * Standard SV box: 4 RR (5 in about 10% of boxes), 3 AR, one ACE SPEC in
 * sets that print them, and one "SR or better": SR about 70%, SAR about 20%,
 * UR about 10%, with a second hit in 5-10% of boxes.
 */
const SV_BOX = { double: 4.1, illustration: 3, acespec: 1, ultra: 0.75, special: 0.2, hyper: 0.1 };

const SV_STANDARD: [string, string, string, number][] = [
  ["SV1V", "Violet ex", "violetex", 500],
  ["SV1a", "Triplet Beat", "tripletbeat", 1000],
  ["SV2P", "Snow Hazard", "snowhazard", 1000],
  ["SV2D", "Clay Burst", "clayburst", 1000],
  ["SV3", "Ruler of the Black Flame", "kokuennoshihaisha", 600],
  ["SV3a", "Raging Surf", "ragingsurf", 600],
  ["SV4K", "Ancient Roar", "kodainohoko", 600],
  ["SV4M", "Future Flash", "mirainoissen", 600],
  ["SV5K", "Wild Force", "wildforce", 1000],
  ["SV5M", "Cyber Judge", "cyberjudge", 1000],
  ["SV5a", "Crimson Haze", "crimsonhaze", 1000],
  ["SV6", "Mask of Change", "hengennokamen", 1000],
  ["SV6a", "Night Wanderer", "nightwanderer", 1000],
  ["SV7", "Stellar Miracle", "stellamiracle", 1000],
  ["SV7a", "Paradise Dragona", "rakuendoragona", 1000],
  ["SV8", "Super Electric Breaker", "tyodenbraker", 1000],
  ["SV9", "Battle Partners", "battlepartner", 1000],
  ["SV9a", "Heat Wave Arena", "neppuuarina", 1000],
  ["SV10", "Glory of Team Rocket", "rocketdaneikou", 1000],
];

const SV: PullRateEntry[] = [
  ...SV_STANDARD.map(([key, name, slug, boxes]) => box(key, BOX_30x5, PI(name, slug, boxes), SV_BOX)),
  box("SV1S", BOX_30x5, PI("Scarlet ex", "scarletex", 500), { ...SV_BOX, ultra: 0.75, special: 0.15 }),
  box(
    "SV2a",
    BOX_20x7,
    PI("Pokémon Card 151", "pokemoncard151", 960),
    { double: 4.5, illustration: 3, ultra: 0.8, special: 0.2, hyper: 0.1 },
    {
      notes: { ultra: "SR or better: one per box, two in about 10% of boxes." },
      godPack: {
        perPack: 1 / 700,
        contents: ["1 Common + the complete secret rare evolution lines of two starters"],
      },
    },
  ),
  box(
    "SV4a",
    HC_10x10,
    PI("Shiny Treasure ex", "shinytreasure", 1000),
    // SR / SAR / UR turn up in about one box in two; the split between them
    // is not published, so it follows the standard SV proportions.
    { double: 8.5, shinyultra: 1, shiny: 2.9, illustration: 0.1, ultra: 0.35, special: 0.1, hyper: 0.05 },
    {
      notes: {
        shinyultra: "Guaranteed one full-art shiny per box.",
        ultra: "SR or better in about half of boxes; split across SR, SAR and UR in the usual proportions (estimate).",
      },
      godPack: { perPack: 1 / 250, contents: ["1 Art Rare + 6 baby shinies + 3 full-art shinies"] },
    },
  ),
  box(
    "SV8a",
    HC_10x10,
    PI("Terastal Festival ex", "terafesex", 2000),
    // A Pokémon SAR is guaranteed; about half of boxes add a supporter SR /
    // SAR or a UR (split not published).
    { double: 9, special: 1.2, acespec: 1, ultra: 0.2, hyper: 0.1 },
    {
      notes: {
        special: "One Pokémon SAR guaranteed, plus a supporter SAR in some boxes.",
        acespec: "One per box according to The Trainer Court.",
      },
      godPack: {
        perPack: 1 / 400,
        contents: [
          "6 Poké Ball reverse holos + 3 Eeveelution Special Art Rares",
          "All 9 Eevee and Eeveelution Special Art Rares",
        ],
      },
    },
  ),
  ...(["SV11B", "SV11W"] as const).map((key) =>
    box(
      key,
      BOX_20x7,
      TTC,
      // One SR or better per box; how it splits between SR, SAR and the
      // Black White Rare is not published.
      { double: 4, illustration: 4, ultra: 0.7, special: 0.25, blackwhite: 0.05 },
      {
        notes: {
          ultra: "One SR or better per box; the split between SR, SAR and Black White Rare is an estimate.",
          blackwhite: "Estimate — no published count.",
        },
        godPack: { perPack: 1 / 600, contents: ["1 Special Art Rare + 6 Art Rares"] },
      },
    ),
  ),
];

// -------------------------------------------------------- Sword & Shield

/**
 * Standard S box: 4-5 RR, 2-3 RRR, one "SR or better" from SR / SA / HR / UR
 * (Time Gazer / Space Juggler tallies: SA about 12%, HR about 18%, UR about
 * 10%), two hits in about 10% of boxes.
 */
const S_BOX = { double: 4.3, triple: 2.2, ultra: 0.7, special: 0.12, hyper: 0.18, secret: 0.1 };

const S_STANDARD: [string, string, string][] = [
  ["S1W", "Sword", "sword-shield-kaihuu"],
  ["S1H", "Shield", "sword-shield-kaihuu"],
  ["S1a", "VMAX Rising", "vmaxrising-kaihuu"],
  ["S2", "Rebellion Crash", "treason-crash-kaihuu"],
  ["S2a", "Explosive Walker", "bakuen-walker-kaihuu"],
  ["S3", "Infinity Zone", "mugen-zone-kaihuu"],
  ["S4", "Amazing Volt Tackle", "gyoutenno-voltecker-kaihuu"],
  ["S5I", "Single Strike Master", "one-hit-master-kaihuu"],
  ["S5R", "Rapid Strike Master", "continuous-shooting-master-kaihuu"],
  ["S5a", "Matchless Fighters", "souhekinofighter-kaihuu"],
  ["S6H", "Silver Lance", "hakuginno-lance-kaihuu"],
  ["S6K", "Jet-Black Spirit", "siltukokuno-gaisuto-kaihuu"],
  ["S8", "Fusion Arts", "fusion-arts-kaihuu"],
];

const S_NOTES = {
  ultra:
    "One SR or better per box (two in about 10%); its split across SR, SA, HR and UR follows the 1,200-box Time Gazer / Space Juggler tally.",
};

const S: PullRateEntry[] = [
  ...S_STANDARD.map(([key, name, slug]) => box(key, BOX_30x5, HH(name, slug), S_BOX, { notes: S_NOTES })),
  box("S11", BOX_30x5, PI("Lost Abyss", "lostabys", 300), S_BOX, { notes: S_NOTES }),
  box("S6a", BOX_30x5, PI("Eevee Heroes", "eeveeheroes", 1000), { ...S_BOX, special: 0.3, hyper: 0.25, secret: 0.1, ultra: 0.45 }),
  box("S9", BOX_30x5, { name: "gamesearch.jp — Star Birth box contents", url: "https://gamesearch.jp/star-birth-fuunyu/" },
    { double: 4, triple: 2, ultra: 1, hyper: 0.2, secret: 1 / 12 }),
  box("S10D", BOX_30x5, PI("Time Gazer", "timegazer", 1200), S_BOX),
  box("S10P", BOX_30x5, PI("Space Juggler", "spacejuggler", 1200), S_BOX),
  box("S12", BOX_30x5, PI("Paradigm Trigger", "paradimtriger", 500), S_BOX, { notes: S_NOTES }),
  // Towering Perfection and Blue Sky Stream: boxes with no SR or better
  // were reported, so the usual floor does not hold.
  ...(
    [
      ["S7D", "Towering Perfection", "maten-perfect-kaihuu"],
      ["S7R", "Blue Sky Stream", "soukuu-stream-kaihuu"],
    ] as const
  ).map(([key, name, slug]) =>
    box(key, BOX_30x5, HH(name, slug), { ...S_BOX, ultra: 0.55 }, {
      confidence: "estimated",
      notes: { ultra: "SR or better is not guaranteed in this set: 0-3 per box." },
    }),
  ),
  box("S3a", BOX_20x7, HH("Legendary Heartbeat", "legendary-beat-kaihuu"), { amazing: 1, triple: 2, double: 4.5, ultra: 0.8, hyper: 0.15, secret: 0.1 }, { notes: S_NOTES }),
  box("S9a", BOX_20x6, HH("Battle Region", "battle-region-kaihuu"),
    { character: 3, radiant: 1, double: 4.5, triple: 2.5, ultra: 0.7, charactersuper: 0.1, hyper: 0.15, secret: 0.1 }, { notes: { ...S_NOTES, charactersuper: "About 10% of boxes." } }),
  box("S10a", BOX_20x6, PI("Dark Phantasma", "darkfantasma", 500),
    { character: 3, radiant: 1, double: 4.5, triple: 2.5, ultra: 0.65, charactersuper: 0.1, hyper: 0.15, secret: 0.1 }, { notes: { ...S_NOTES, charactersuper: "About 10% of boxes." } }),
  box("S11a", BOX_20x6, PI("Incandescent Arcana", "hakunetunoarukana", 500),
    { character: 3, radiant: 1, double: 4.5, triple: 2.5, ultra: 0.65, charactersuper: 0.1, hyper: 0.15, secret: 0.1 }, { notes: { ...S_NOTES, charactersuper: "About 10% of boxes." } }),
  box("S10b", BOX_20x6, PI("Pokémon GO", "pokemongo", 300), { radiant: 1, double: 4.5, triple: 2.5, ultra: 0.8, hyper: 0.15, secret: 0.1 }, { notes: S_NOTES }),
  box(
    "S4a",
    HC_10x10,
    HH("Shiny Star V", "shiny-star-v-kaihuu"),
    { shinyultra: 1, shiny: 3, amazing: 1, triple: 2.5, double: 6.5, ultra: 0.5, secret: 0.3 },
    {
      notes: { shinyultra: "Guaranteed one full-art shiny (SSR) per box." },
      godPack: { perPack: 1 / 600, contents: ["3 full-art shinies + 7 baby shinies"] },
    },
  ),
  box(
    "S8b",
    HC_10x11,
    PI("VMAX Climax", "vmaxclimax", 1000),
    { charactersuper: 1, character: 3.5, triple: 3.5, double: 5.5, ultra: 0.5, secret: 0.1 },
    {
      notes: { charactersuper: "Guaranteed one CSR per box." },
      // Gym Leader SR pack about 1.5% of boxes, CHR/CSR pack about 1%.
      godPack: {
        perPack: 0.025 / 10,
        contents: ["10 Galar Gym Leader Super Rares", "5 Character Rares + 5 Character Super Rares"],
      },
    },
  ),
  box(
    "S12a",
    HC_10x10,
    PI("VSTAR Universe", "vstaruniverse", 1800),
    { special: 1.2, illustration: 3, radiant: 1, ultra: 1.2, triple: 3.5, double: 5.5, secret: 0.1 },
    {
      notes: {
        special: "One Pokémon SAR guaranteed, plus a supporter SAR in about 20% of boxes.",
        ultra: "One SR basic Energy per box, plus a supporter SR in about 20%.",
      },
      // 9-AR pack about 1.5% of boxes, SAR pack about 2.25%.
      godPack: { perPack: 0.0375 / 10, contents: ["9 Art Rares", "5 Art Rares + 5 Special Art Rares"] },
    },
  ),
];

// ------------------------------------------------------------- Sun & Moon

/**
 * Standard SM box: 4 RR, 1-2 TR from Tag Bolt on, one Prism Star in the 2018
 * sets, and one "SR or better". How that one splits between SR, HR and UR is
 * not published for this era; the split below follows the later S-era
 * proportions and is marked as an estimate.
 */
const SM_BOX = { double: 4, ultra: 0.75, hyper: 0.18, secret: 0.1, prism: 1, holo: 1.5 };

const SM: PullRateEntry[] = [
  box(
    "ja-sm",
    BOX_30x5,
    { name: "pokecazilla — SM-era box contents (1 SR or better, 4 RR)", url: "https://pokecazilla.com/column/booster-box-rates/" },
    SM_BOX,
    {
      scope: "era",
      confidence: "estimated",
      notes: {
        ultra: "One SR or better per box; the split across SR, HR and UR is an estimate.",
        prism: "One per box in the sets that print Prism Stars.",
        holo: "Trainer Rares (TR), 1-2 per box from Tag Bolt on.",
      },
    },
  ),
  box("SM11b", BOX_30x5, HH("Dream League", "dream-league-kaihuu"), { ...SM_BOX, character: 3 }, { confidence: "estimated" }),
  box(
    "SM8b",
    HC_10x10,
    HH("GX Ultra Shiny", "pokemon-card-gx-ultra-shiny-kaihuu"),
    { shinyultra: 1, double: 9, shiny: 2, prism: 1.5, ultra: 0.3, secret: 0.2 },
    { notes: { shinyultra: "Guaranteed one shiny GX (SSR) per box." } },
  ),
  box(
    "SM12a",
    HC_10x11,
    { name: "Official Tag All Stars product page (one SR or better per box)", url: "https://www.pokemon-card.com/ex/sm12a/" },
    // Official guarantee of one SR or better, plus an SR basic Energy.
    { double: 9.5, ultra: 1.75, hyper: 0.15, secret: 0.1, prism: 1 },
    {
      confidence: "verified",
      notes: { ultra: "One SR basic Energy, plus the officially guaranteed SR or better (split estimated)." },
    },
  ),
];

// ------------------------------------------------------------- eras

const ERAS: PullRateEntry[] = [
  box("ja-me", BOX_30x5, PI("MEGA-series average", "megasymphonia", 1000), MEGA_BOX, { scope: "era", notes: MEGA_NOTES }),
  box("ja-sv", BOX_30x5, PI("Scarlet & Violet average", "tyodenbraker", 1000), SV_BOX, { scope: "era" }),
  box("ja-swsh", BOX_30x5, PI("Sword & Shield average", "timegazer", 1200), S_BOX, { scope: "era", confidence: "estimated" }),
  {
    region: "ja",
    key: "ja-vintage",
    scope: "era",
    packsPerBox: 20,
    cardsPerPack: 10,
    packSlots: [
      { rarityKeys: ["common"], count: 6 },
      { rarityKeys: ["uncommon"], count: 3 },
      { rarityKeys: ["rare", "holo"], count: 1, name: "rare" },
    ],
    confidence: "estimated",
    source: { name: "Vintage Japanese expansion pack composition", url: "https://bulbapedia.bulbagarden.net/wiki/Booster_pack" },
    odds: [{ rarityKey: "holo", perPack: 1 / 3 }],
  },
];

export const JA_ENTRIES: PullRateEntry[] = [...MEGA, ...SV, ...S, ...SM, ...ERAS];
