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

/** Era title for a series: English and Japanese sets of one era share it. */
export function eraOf(seriesName: string | null): string {
  return seriesLabel(seriesName).title;
}

export function eraSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Era chips for whatever is on screen (sets or cards), newest era first, each
 * with how many items it would show.
 */
export function eraOptions(items: { seriesName: string | null; releaseDate: string | null }[]) {
  const eras = new Map<string, { count: number; newest: string }>();
  for (const it of items) {
    const title = eraOf(it.seriesName);
    const e = eras.get(title) ?? { count: 0, newest: "" };
    e.count++;
    if ((it.releaseDate ?? "") > e.newest) e.newest = it.releaseDate ?? "";
    eras.set(title, e);
  }
  return [...eras.entries()]
    .sort((a, b) => b[1].newest.localeCompare(a[1].newest))
    .map(([title, e]) => ({ value: eraSlug(title), label: title, count: e.count }));
}
