import type { PullRateEntry } from "./types";

/**
 * Pack-opening simulator. Builds packs from a set's pull-rate entry: the
 * guaranteed slots (commons, uncommons, the rare slot) are drawn from their
 * pooled cards, and the hit tiers are rolled from their per-pack rates. It is
 * a model of the published odds, not of any real print run.
 */

export interface SimCard {
  id: string;
  name: string;
  image: string | null;
  rarityKey: string;
  /** The rarity as printed ("Futuristic Rare"), for display. */
  rarity: string | null;
  /** Higher = rarer; see src/lib/rarity.ts. */
  rank: number;
  price: number | null;
}

export interface SimPack {
  cards: SimCard[];
  value: number;
  godPack: boolean;
}

type Rng = () => number;

function pick<T>(pool: T[], rng: Rng, avoid: Set<T>): T | undefined {
  if (!pool.length) return undefined;
  const fresh = pool.filter((c) => !avoid.has(c));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
}

export function makePackOpener(entry: PullRateEntry, cards: SimCard[], rng: Rng = Math.random) {
  const byKey = new Map<string, SimCard[]>();
  for (const c of cards) byKey.set(c.rarityKey, [...(byKey.get(c.rarityKey) ?? []), c]);

  const tiers = entry.odds
    .map((o) => ({
      key: o.rarityKey,
      slot: o.slot ?? "rare",
      p: o.perPack ?? (o.perBox != null ? o.perBox / entry.packsPerBox : 0),
    }))
    .filter((t) => t.p > 0 && byKey.has(t.key));
  const guaranteed = tiers.filter((t) => t.p >= 1);
  // Hit tiers grouped by the slot they take over: within a slot they are
  // alternatives, across slots they are independent.
  const bySlotName = new Map<string, typeof tiers>();
  for (const t of tiers.filter((t) => t.p < 1)) {
    bySlotName.set(t.slot, [...(bySlotName.get(t.slot) ?? []), t]);
  }

  const slots = entry.packSlots
    .map((s) => ({ ...s, pool: s.rarityKeys.flatMap((k) => byKey.get(k) ?? []) }))
    .filter((s) => s.pool.length);
  /** Index of the slot a hit displaces: the named one, else the last rare slot. */
  const slotIndex = (name: string) => {
    const named = slots.findIndex((s) => s.name === name);
    return named >= 0 ? named : slots.findLastIndex((s) => s.rarityKeys.includes("rare"));
  };
  const godPool = cards.filter((c) => c.rank >= 80).length >= 3
    ? cards.filter((c) => c.rank >= 80)
    : cards.filter((c) => c.rank >= 50);

  return function openPack(): SimPack {
    if (entry.godPack && godPool.length && rng() < entry.godPack.perPack) {
      const taken = new Set<SimCard>();
      for (let i = 0; i < entry.cardsPerPack; i++) {
        const c = pick(godPool, rng, taken);
        if (c) taken.add(c);
      }
      const god = [...taken].sort((a, b) => a.rank - b.rank);
      return { cards: god, value: sum(god), godPack: true };
    }

    const taken = new Set<SimCard>();
    const bySlot: SimCard[][] = slots.map((s) => {
      const drawn: SimCard[] = [];
      for (let i = 0; i < s.count; i++) {
        const c = pick(s.pool, rng, taken);
        if (c) {
          taken.add(c);
          drawn.push(c);
        }
      }
      return drawn;
    });

    const hits: SimCard[] = [];
    const draw = (key: string) => {
      const c = pick(byKey.get(key)!, rng, taken);
      if (c) {
        taken.add(c);
        hits.push(c);
      }
    };
    for (const t of guaranteed) {
      for (let i = 0; i < Math.floor(t.p); i++) draw(t.key);
      if (rng() < t.p % 1) draw(t.key);
    }
    for (const [slotName, group] of bySlotName) {
      const total = group.reduce((s, t) => s + t.p, 0);
      let hit = false;
      if (total <= 1) {
        let u = rng();
        for (const t of group) {
          if (u < t.p) {
            draw(t.key);
            hit = true;
            break;
          }
          u -= t.p;
        }
      } else {
        // Published rates that overlap (e.g. a pack can hold two) can't share
        // one slot; roll them independently instead.
        for (const t of group) {
          if (rng() < t.p) {
            draw(t.key);
            hit = true;
          }
        }
      }
      const idx = slotIndex(slotName);
      if (hit && idx >= 0 && bySlot[idx].length) bySlot[idx].pop();
    }

    const pack = [...bySlot.flat(), ...hits].sort((a, b) => a.rank - b.rank);
    return { cards: pack, value: sum(pack), godPack: false };
  };
}

function sum(cards: SimCard[]): number {
  return cards.reduce((s, c) => s + (c.price ?? 0), 0);
}
