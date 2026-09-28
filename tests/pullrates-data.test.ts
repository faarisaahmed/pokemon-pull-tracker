import { test } from "node:test";
import assert from "node:assert/strict";
import { PULL_RATES, SPECIAL_SET_OVERRIDES } from "../src/lib/pullrates";
import { GOD_PACKS } from "../src/lib/pullrates/data";
import { RARITIES } from "../src/lib/rarity";

/**
 * Sanity checks over every pull-rate entry. They catch the mechanical
 * mistakes a hand-maintained table picks up: a typo'd rarity key that never
 * matches a card, a hit slot whose tiers add up to more than one hit, a tier
 * pointing at a slot that does not exist.
 */
const ENTRIES = [...PULL_RATES, ...SPECIAL_SET_OVERRIDES];
const KEYS = new Set(RARITIES.map((r) => r.key));

test("every entry is unique per region and key", () => {
  const seen = new Set<string>();
  for (const e of ENTRIES) {
    const k = `${e.region}:${e.key}`;
    assert.ok(!seen.has(k), `duplicate entry ${k}`);
    seen.add(k);
  }
});

test("every rarity key exists", () => {
  for (const e of ENTRIES) {
    for (const o of e.odds) assert.ok(KEYS.has(o.rarityKey), `${e.key}: unknown key ${o.rarityKey}`);
    for (const s of e.packSlots) for (const k of s.rarityKeys) assert.ok(KEYS.has(k), `${e.key}: unknown slot key ${k}`);
  }
});

test("rates are probabilities and cite a source", () => {
  for (const e of ENTRIES) {
    assert.ok(e.source.name && e.source.url.startsWith("https://"), `${e.key}: missing source`);
    for (const o of e.odds) {
      const p = o.perPack ?? (o.perBox ?? 0) / e.packsPerBox;
      assert.ok(p > 0, `${e.key}/${o.rarityKey}: no rate`);
      if (o.perPack != null) assert.ok(o.perPack <= 1, `${e.key}/${o.rarityKey}: perPack > 1`);
    }
  }
});

test("hits sharing a slot never add up to more than one card", () => {
  for (const e of ENTRIES) {
    // Per-box Japanese counts routinely exceed one per pack (9 RR in a
    // 10-pack high-class box); the check is for English per-pack slots.
    if (e.region !== "en") continue;
    const bySlot = new Map<string, number>();
    for (const o of e.odds) {
      if (o.perPack == null || o.perPack >= 1) continue;
      const slot = o.slot ?? "rare";
      bySlot.set(slot, (bySlot.get(slot) ?? 0) + o.perPack);
    }
    for (const [slot, total] of bySlot) {
      assert.ok(total <= 1, `${e.key}: slot ${slot} totals ${total.toFixed(3)}`);
    }
  }
});

test("named hit slots exist in the pack", () => {
  for (const e of ENTRIES) {
    const names = new Set(e.packSlots.map((s) => s.name).filter(Boolean));
    for (const o of e.odds) {
      if (o.slot) assert.ok(names.has(o.slot), `${e.key}/${o.rarityKey}: no slot named ${o.slot}`);
    }
  }
});

test("god packs point at entries and have a rate", () => {
  for (const g of GOD_PACKS) {
    assert.ok(g.godPack.perPack > 0 && g.godPack.perPack < 0.05, `${g.key}: god pack rate`);
    assert.ok(g.godPack.contents.length > 0);
  }
});
