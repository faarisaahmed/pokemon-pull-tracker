/**
 * TCGdex reports Japanese series names in Japanese only. The set browser groups
 * by series, so each one gets an English label to sit alongside the original.
 */
const JA_SERIES_EN: Record<string, string> = {
  "ポケモンカードゲーム MEGA": "Mega Evolution",
  "ポケモンカードゲーム スカーレット&バイオレット": "Scarlet & Violet",
  "剣と盾": "Sword & Shield",
  "サン＆ムーン": "Sun & Moon",
  "XY BREAK": "XY BREAK",
  XY: "XY",
  LEGEND: "LEGEND",
  PCG: "Pokémon Card Game (PCG)",
  ADV: "Advanced Generation (ADV)",
  "ポケモンカードe": "Pokémon Card-e",
  web: "Pokémon Card Web",
  VS: "Pokémon Card VS",
  "ポケットモンスターカードゲーム": "Pocket Monsters Card Game",
  "ポケモンカード★neo": "Neo",
};

export interface SeriesLabel {
  /** What to show as the heading. */
  title: string;
  /** The original name, when it differs from the title. */
  subtitle: string | null;
}

export function seriesLabel(name: string | null): SeriesLabel {
  if (!name) return { title: "Other", subtitle: null };
  const en = JA_SERIES_EN[name];
  if (en && en !== name) return { title: en, subtitle: name };
  return { title: name, subtitle: null };
}

/** Slug used for the in-page anchor each series section is linked to. */
export function seriesAnchor(seriesId: string | null): string {
  return `series-${(seriesId ?? "other").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
}
