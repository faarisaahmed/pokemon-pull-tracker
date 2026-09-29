import type { Confidence } from "../types";

/**
 * Simplified Chinese (mainland) booster products. These are their own sets,
 * renumbered mixes of Japanese cards, and no open source carries their card
 * lists, so Ripwise shows their odds only.
 *
 * Every product ships with an official "概率及种类说明" table giving each
 * rarity group's share of all cards printed (生产配比). The lowest group always
 * equals the non-foil share (80% = 4 of 5 cards), so a group's chance per pack
 * is its share times the cards in a pack. The tables don't split a group
 * (SR vs SAR vs UR), so neither does this page. Figures are the 52poke wiki's
 * transcriptions, cross-checked against pokemon.cn's pack descriptions.
 */

export interface ZhTier {
  label: string;
  /** Share of all cards printed, as a fraction. */
  share: number;
}

export interface ZhFormat {
  cardsPerPack: number;
  packsPerBox: number | null;
  price: string;
  tiers: ZhTier[];
}

export interface ZhProduct {
  name: string;
  /** Only where there's an established English name; main sets have none. */
  english: string | null;
  kind: string;
  formats: ZhFormat[];
  confidence: Confidence;
  sources: { name: string; url: string }[];
  note?: string;
}

const wiki = (name: string) => ({ name: "52poke wiki", url: `https://wiki.52poke.com/wiki/${encodeURIComponent(`${name}（TCG）`)}` });
const official = (id: number) => ({ name: "pokemon.cn", url: `https://www.pokemon.cn/tcg/product/${id}.html` });

const TOP = "SR / SAR / UR";
const MID = "RR / AR / Master Ball";
const MID_ACE = "RR / AR / Master Ball / ACE";

function mainSet(name: string, mid: [number, number], midLabel: string, sources: { name: string; url: string }[]): ZhProduct {
  return {
    name,
    english: null,
    kind: "Expansion",
    formats: [
      { cardsPerPack: 5, packsPerBox: 15, price: "¥10", tiers: [{ label: TOP, share: 0.0073 }, { label: midLabel, share: mid[0] }] },
      { cardsPerPack: 20, packsPerBox: 6, price: "¥50", tiers: [{ label: TOP, share: 0.01 }, { label: midLabel, share: mid[1] }] },
    ],
    confidence: "community",
    sources: [wiki(name), ...sources],
  };
}

export const ZH_PRODUCTS: ZhProduct[] = [
  mainSet("共逐荣光", [0.0526, 0.0665], MID_ACE, []),
  mainSet("星彩晶璃", [0.0545, 0.0689], MID_ACE, []),
  mainSet("璀璨诡幻", [0.0545, 0.0689], MID_ACE, []),
  mainSet("利刃猛醒", [0.0545, 0.0689], MID_ACE, []),
  mainSet("真实玄虚", [0.0474, 0.0601], MID, []),
  mainSet("黑晶炽诚", [0.0474, 0.0601], MID, [official(15448)]),
  mainSet("嘉奖回合", [0.0474, 0.0601], MID, [official(15482)]),
  mainSet("无畏太晶", [0.0474, 0.0601], MID, []),
  mainSet("奇迹启程", [0.0474, 0.0601], MID, []),
  mainSet("亘古开来", [0.0474, 0.0601], MID, []),
  {
    name: "收集啦151 旅",
    english: "151 Collect (Journey)",
    kind: "151",
    formats: [
      { cardsPerPack: 5, packsPerBox: null, price: "¥10", tiers: [{ label: "SR / SSR / AR / UR", share: 0.0073 }, { label: "RR / S / Master Ball", share: 0.0474 }] },
      { cardsPerPack: 20, packsPerBox: null, price: "¥50", tiers: [{ label: "SR / SSR / AR / UR", share: 0.0104 }] },
    ],
    confidence: "community",
    sources: [wiki("收集啦151"), official(15541), official(15486)],
    note: "Box counts aren't confirmed by a source we trust.",
  },
  {
    name: "收集啦151 望 / 惊 / 聚",
    english: "151 Collect (other editions)",
    kind: "151",
    formats: [
      { cardsPerPack: 5, packsPerBox: null, price: "¥10", tiers: [{ label: "SR / SSR / AR / UR", share: 0.007 }, { label: "RR / S / Master Ball", share: 0.03 }] },
      { cardsPerPack: 20, packsPerBox: null, price: "¥50", tiers: [{ label: "SR / SSR / AR / UR", share: 0.0104 }] },
    ],
    confidence: "community",
    sources: [wiki("收集啦151"), official(15541)],
    note: "Coin inserts are stated officially: Poké Ball to Master Ball 99 : 1, ex to SAR 99 : 1.",
  },
  {
    name: "30周年庆典",
    english: "30th Celebration",
    kind: "Special",
    formats: [{ cardsPerPack: 6, packsPerBox: 20, price: "¥18", tiers: [{ label: "SAR / FUR", share: 0.01 }, { label: "R / RR / AR / Classic", share: 0.0917 }] }],
    confidence: "community",
    sources: [wiki("30周年庆典"), { name: "SMZDM (box size)", url: "https://post.smzdm.com/p/al3lo4n0/" }],
    note: "All six cards are foil. The 20-pack box comes from a retail listing.",
  },
  {
    name: "太晶盛聚",
    english: "Terastal Festival ex",
    kind: "High class",
    formats: [{ cardsPerPack: 10, packsPerBox: null, price: "¥30", tiers: [{ label: "SAR (Pokémon)", share: 0.014 }, { label: "RR / Ball / ACE", share: 0.13 }] }],
    confidence: "estimated",
    sources: [wiki("太晶盛聚")],
    note: "The wiki's table is incomplete (SR, trainer SAR and UR are blank), so treat this as a floor.",
  },
  ...[
    { vol: "1", star: [0.179, 0.0493, 0.0217], src: [official(15431)] },
    { vol: "2", star: [0.1813, 0.047, 0.0217], src: [official(15518)] },
    { vol: "3", star: [0.1842, 0.0477, 0.0181], src: [] },
    { vol: "4–6", star: [0.1739, 0.058, 0.0181], src: [official(20382)] },
  ].map(
    ({ vol, star, src }): ZhProduct => ({
      name: `宝石包 VOL.${vol}`,
      english: `Gem Pack Vol. ${vol}`,
      kind: "Gem pack",
      formats: [
        {
          cardsPerPack: 4,
          packsPerBox: 15,
          price: "¥10",
          tiers: [
            { label: "★★★", share: star[2] },
            { label: "★★", share: star[1] },
            { label: "★", share: star[0] },
          ],
        },
      ],
      confidence: "community",
      sources: [wiki("宝石包"), ...src],
      note: "Every pack is 3 ● / ◆ cards plus one star card.",
    }),
  ),
];

/** Chance a pack holds a card from the tier (share × cards, capped at 1 per pack). */
export function perPack(tier: ZhTier, format: ZhFormat): number {
  return tier.share * format.cardsPerPack;
}
