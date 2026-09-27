import { getDb } from "./db.server";
import { eraOf, eraOptions, eraSlug } from "./series";
import type { Region } from "./types";

/**
 * Master-set builder: every card of one species in one language, with the
 * filters collectors actually use to trim a master set down to something they
 * would buy — skipping straight reprints, old eras, or sets whose packs or
 * singles cost too much. Nothing here is stored per user; it is a reference.
 */

export interface Species {
  dexId: number;
  name: string;
}

export function listSpecies(): Species[] {
  return (
    getDb().prepare(`SELECT dex_id, name FROM species ORDER BY name`).all() as {
      dex_id: number;
      name: string;
    }[]
  ).map((r) => ({ dexId: r.dex_id, name: r.name }));
}

const squash = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9♀♂]+/g, "");

/**
 * Turns what someone typed into a species. A Pokedex number or an exact name
 * wins outright; otherwise names starting with the text, then containing it,
 * in Pokedex order — so "char" lands on Charmander and offers the rest.
 */
export function resolveSpecies(
  query: string,
  all: Species[],
): { match: Species | null; alternatives: Species[] } {
  const q = query.trim();
  if (!q) return { match: null, alternatives: [] };
  if (/^#?\d+$/.test(q)) {
    const n = Number(q.replace("#", ""));
    return { match: all.find((s) => s.dexId === n) ?? null, alternatives: [] };
  }
  const sq = squash(q);
  const exact = all.find((s) => squash(s.name) === sq);
  if (exact) return { match: exact, alternatives: [] };
  const byLength = (a: Species, b: Species) => a.name.length - b.name.length || a.dexId - b.dexId;
  const prefix = all.filter((s) => squash(s.name).startsWith(sq)).sort((a, b) => a.dexId - b.dexId);
  const contains = all.filter((s) => !prefix.includes(s) && squash(s.name).includes(sq)).sort(byLength);
  const ranked = [...prefix, ...contains];
  return { match: ranked[0] ?? null, alternatives: ranked.slice(1, 9) };
}

export interface MasterFilters {
  region: Region;
  /** "one" keeps a single print of each straight reprint. */
  repeats: "all" | "one";
  /** Era slugs to include (see eraSlug); empty means every era. */
  eras: string[];
  /** Loose-pack price cap in USD; sets with no pack price are left out while set. */
  maxPack: number | null;
  /** Single-card price cap in USD; unpriced cards stay in. */
  maxCard: number | null;
  reverse: boolean;
  sort: "release" | "newest" | "price-desc" | "price-asc";
}

export interface MasterCard {
  id: string;
  localId: string;
  name: string;
  rarity: string | null;
  rarityKey: string | null;
  image: string | null;
  marketPrice: number | null;
  reversePrice: number | null;
  setId: string;
  setName: string;
  setAbbr: string | null;
  releaseDate: string | null;
  cardCountOfficial: number;
  packPrice: number | null;
  /** Other sets carrying a straight reprint of this card that were set aside. */
  alsoIn: { setId: string; setName: string; setAbbr: string | null; cardId: string }[];
  /** How many sets print this exact card (1 when it was never reprinted). */
  printCount: number;
}

export interface MasterResult {
  cards: MasterCard[];
  totals: {
    cards: number;
    sets: number;
    value: number;
    unpriced: number;
    reverseCount: number;
    reverseValue: number;
    hiddenRepeats: number;
    /** Cards the price/era filters took out, before repeats. */
    filteredOut: number;
  };
  /** Era checkboxes, counted after the price caps but before the era filter. */
  eraChoices: { value: string; label: string; count: number }[];
}

export function masterSet(dexId: number, f: MasterFilters): MasterResult {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.local_id, c.name, c.rarity, c.rarity_key, c.image, c.market_price,
              c.print_key, c.number_sort,
              s.id set_id, s.name set_name, s.abbreviation, s.release_date,
              s.card_count_official, s.pack_price, s.series_name,
              (SELECT market FROM card_prices p
                WHERE p.card_id = c.id AND p.variant = 'Reverse Holofoil') reverse_price
       FROM cards c JOIN sets s ON s.id = c.set_id
       WHERE c.region = @region AND instr(c.id, '@') = 0
         AND instr(c.dex_ids, @needle) > 0`,
    )
    .all({ region: f.region, needle: `,${dexId},` }) as {
    id: string;
    local_id: string;
    name: string;
    rarity: string | null;
    rarity_key: string | null;
    image: string | null;
    market_price: number | null;
    print_key: string | null;
    number_sort: number;
    set_id: string;
    set_name: string;
    abbreviation: string | null;
    release_date: string | null;
    card_count_official: number;
    pack_price: number | null;
    series_name: string | null;
    reverse_price: number | null;
  }[];

  const printSets = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.print_key) continue;
    const s = printSets.get(r.print_key) ?? new Set<string>();
    s.add(r.set_id);
    printSets.set(r.print_key, s);
  }

  const affordable = rows.filter(
    (r) =>
      (f.maxPack == null || (r.pack_price != null && r.pack_price <= f.maxPack)) &&
      (f.maxCard == null || r.market_price == null || r.market_price <= f.maxCard),
  );
  // Built before the era filter so ticked eras never vanish from the list.
  const eraChoices = eraOptions(
    affordable.map((r) => ({ seriesName: r.series_name, releaseDate: r.release_date })),
  );
  const kept = affordable.filter(
    (r) => f.eras.length === 0 || f.eras.includes(eraSlug(eraOf(r.series_name))),
  );
  const filteredOut = rows.length - kept.length;

  // One of each: within every reprint group, keep the set whose copies are
  // cheapest (newest on a tie) and note the others on the kept card. Cards in
  // the same set are never merged — a holo and non-holo of the same art are
  // both part of that set.
  const hiddenIds = new Set<string>();
  const alsoIn = new Map<string, MasterCard["alsoIn"]>();
  if (f.repeats === "one") {
    const groups = new Map<string, typeof kept>();
    for (const r of kept) {
      if (!r.print_key) continue;
      const g = groups.get(r.print_key) ?? [];
      g.push(r);
      groups.set(r.print_key, g);
    }
    for (const g of groups.values()) {
      const bySet = new Map<string, typeof kept>();
      for (const r of g) bySet.set(r.set_id, [...(bySet.get(r.set_id) ?? []), r]);
      if (bySet.size < 2) continue;
      const cost = (cards: typeof kept) =>
        cards.reduce((sum, c) => sum + (c.market_price ?? Number.POSITIVE_INFINITY), 0);
      const [winner] = [...bySet.entries()].sort(
        ([, a], [, b]) =>
          cost(a) - cost(b) || (b[0].release_date ?? "").localeCompare(a[0].release_date ?? ""),
      );
      const others = [...bySet.entries()].filter(([id]) => id !== winner[0]).flatMap(([, c]) => c);
      for (const o of others) hiddenIds.add(o.id);
      const notes = others.map((o) => ({
        setId: o.set_id,
        setName: o.set_name,
        setAbbr: o.abbreviation,
        cardId: o.id,
      }));
      for (const w of winner[1]) alsoIn.set(w.id, notes);
    }
  }

  const cards: MasterCard[] = kept
    .filter((r) => !hiddenIds.has(r.id))
    .map((r) => ({
      id: r.id,
      localId: r.local_id,
      name: r.name,
      rarity: r.rarity,
      rarityKey: r.rarity_key,
      image: r.image,
      marketPrice: r.market_price,
      reversePrice: f.reverse ? r.reverse_price : null,
      setId: r.set_id,
      setName: r.set_name,
      setAbbr: r.abbreviation,
      releaseDate: r.release_date,
      cardCountOfficial: r.card_count_official,
      packPrice: r.pack_price,
      alsoIn: alsoIn.get(r.id) ?? [],
      printCount: r.print_key ? printSets.get(r.print_key)!.size : 1,
      _numberSort: r.number_sort,
    }))
    .sort((a, b) => {
      if (f.sort === "price-desc") return (b.marketPrice ?? -1) - (a.marketPrice ?? -1);
      if (f.sort === "price-asc")
        return (a.marketPrice ?? Number.POSITIVE_INFINITY) - (b.marketPrice ?? Number.POSITIVE_INFINITY);
      const byDate = (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
      const within = a.setId.localeCompare(b.setId) || a._numberSort - b._numberSort;
      return f.sort === "newest" ? -byDate || within : byDate || within;
    })
    .map(({ _numberSort, ...c }) => {
      void _numberSort;
      return c;
    });

  const reverse = cards.filter((c) => c.reversePrice != null);
  return {
    cards,
    totals: {
      cards: cards.length,
      sets: new Set(cards.map((c) => c.setId)).size,
      value: cards.reduce((s, c) => s + (c.marketPrice ?? 0), 0),
      unpriced: cards.filter((c) => c.marketPrice == null).length,
      reverseCount: reverse.length,
      reverseValue: reverse.reduce((s, c) => s + (c.reversePrice ?? 0), 0),
      hiddenRepeats: hiddenIds.size,
      filteredOut,
    },
    eraChoices,
  };
}
