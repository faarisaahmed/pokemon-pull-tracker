import type { GodPack, PullRateEntry } from "../types";
import { GOD_PACK_RATE } from "./common";
import { EN_ENTRIES } from "./en";
import { JA_ENTRIES } from "./ja";

/**
 * Curated pull-rate data. There is no API for pull rates: every figure comes
 * from a published opening study or observed box contents, and each entry
 * carries its source and sample size so the UI can show how far to trust it.
 *
 *  - English packs are random slots, so studies report a per-pack chance for
 *    each tier (en.ts).
 *  - Japanese boxes ship with observed per-box contents ("4 RR, 3 AR, 1 SR or
 *    better"), recorded per box and divided by the box size (ja.ts).
 *
 * "set" entries are measured for that set; "era" entries are the fallback for
 * sets without their own data and say so.
 */
const ALL = [...EN_ENTRIES, ...JA_ENTRIES];

export const PULL_RATES: PullRateEntry[] = ALL.filter((e) => e.scope === "era");
export const SPECIAL_SET_OVERRIDES: PullRateEntry[] = ALL.filter((e) => e.scope === "set");

/**
 * English god packs, kept apart from the rate tables. TCGplayer's own studies
 * confirm them in 151 (demi-god packs), Prismatic Evolutions and Ascended
 * Heroes but could not measure a rate; the figures are community estimates.
 * Black Bolt and White Flare are left out: the reports trace back to the
 * Japanese sets, and no English one has been verified.
 */
export const GOD_PACKS: { region: "en" | "ja"; key: string; godPack: GodPack }[] = [
  {
    region: "en",
    key: "sv03.5", // 151
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: [
        "Demi-god pack: the Illustration and Special Illustration Rare evolution line of one Kanto starter",
      ],
    },
  },
  {
    region: "en",
    key: "sv08.5", // Prismatic Evolutions
    godPack: {
      perPack: GOD_PACK_RATE,
      contents: [
        "God pack: one of each Eeveelution Special Illustration Rare",
        "Demi-god pack: three Special Illustration Rares",
      ],
    },
  },
  {
    region: "en",
    key: "me02.5", // Ascended Heroes
    godPack: {
      // Estimates run from 1 in 600 to 1 in 2,000; TCGplayer found none in
      // 2,000+ packs.
      perPack: 1 / 1400,
      contents: ["3 Mega Attack Rares + 7 Special Illustration Rares"],
    },
  },
];
