import { test } from "node:test";
import assert from "node:assert/strict";
import { makePackOpener, type SimCard } from "../src/lib/simulate";
import type { PullRateEntry } from "../src/lib/types";

/** Deterministic PRNG so the statistical checks below are repeatable. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const card = (id: string, rarityKey: string, rank: number, price: number): SimCard => ({
  id, name: id, image: null, rarityKey, rarity: null, rank, price,
});

const cards: SimCard[] = [
  ...Array.from({ length: 40 }, (_, i) => card(`c${i}`, "common", 10, 0.05)),
  ...Array.from({ length: 30 }, (_, i) => card(`u${i}`, "uncommon", 20, 0.1)),
  ...Array.from({ length: 20 }, (_, i) => card(`r${i}`, "rare", 30, 0.25)),
  ...Array.from({ length: 10 }, (_, i) => card(`d${i}`, "double", 50, 2)),
  ...Array.from({ length: 5 }, (_, i) => card(`s${i}`, "special", 90, 80)),
];

const entry: PullRateEntry = {
  region: "en",
  key: "test",
  scope: "set",
  packsPerBox: 36,
  cardsPerPack: 10,
  packSlots: [
    { rarityKeys: ["common"], count: 4 },
    { rarityKeys: ["uncommon"], count: 3 },
    { rarityKeys: ["common", "uncommon", "rare"], count: 1 },
    { rarityKeys: ["rare"], count: 1 },
  ],
  odds: [
    { rarityKey: "double", perPack: 1 / 5 },
    { rarityKey: "special", perPack: 1 / 40 },
  ],
  confidence: "estimated",
  source: { name: "test", url: "" },
};

test("hit tiers come up at their published rates", () => {
  const open = makePackOpener(entry, cards, mulberry32(7));
  const n = 40_000;
  let doubles = 0;
  let specials = 0;
  for (let i = 0; i < n; i++) {
    const pack = open();
    if (pack.cards.some((c) => c.rarityKey === "double")) doubles++;
    if (pack.cards.some((c) => c.rarityKey === "special")) specials++;
  }
  assert.ok(Math.abs(doubles / n - 1 / 5) < 0.01, `double rate ${doubles / n}`);
  assert.ok(Math.abs(specials / n - 1 / 40) < 0.004, `special rate ${specials / n}`);
});

test("a hit replaces the rare slot, so pack size holds", () => {
  const open = makePackOpener(entry, cards, mulberry32(11));
  for (let i = 0; i < 2000; i++) {
    const pack = open();
    assert.equal(pack.cards.length, 9);
    assert.equal(new Set(pack.cards).size, pack.cards.length, "no card twice in one pack");
  }
});

test("pack value is the sum of its cards", () => {
  const pack = makePackOpener(entry, cards, mulberry32(3))();
  const total = pack.cards.reduce((s, c) => s + (c.price ?? 0), 0);
  assert.equal(pack.value, total);
});
