import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSpecies, type Species } from "../src/lib/master-set.server";

const ALL: Species[] = [
  { dexId: 4, name: "Charmander" },
  { dexId: 5, name: "Charmeleon" },
  { dexId: 6, name: "Charizard" },
  { dexId: 29, name: "Nidoran♀" },
  { dexId: 122, name: "Mr. Mime" },
  { dexId: 595, name: "Joltik" },
  { dexId: 736, name: "Grubbin" },
  { dexId: 737, name: "Charjabug" },
];

test("exact names win, ignoring case and punctuation", () => {
  assert.equal(resolveSpecies("charizard", ALL).match?.dexId, 6);
  assert.equal(resolveSpecies("mr mime", ALL).match?.dexId, 122);
  assert.equal(resolveSpecies("Nidoran♀", ALL).match?.dexId, 29);
});

test("a Pokedex number resolves directly", () => {
  assert.equal(resolveSpecies("6", ALL).match?.name, "Charizard");
  assert.equal(resolveSpecies("#122", ALL).match?.name, "Mr. Mime");
});

test("partial text picks the first in Pokedex order and offers the rest", () => {
  const r = resolveSpecies("char", ALL);
  assert.equal(r.match?.name, "Charmander");
  assert.deepEqual(r.alternatives.map((s) => s.name), ["Charmeleon", "Charizard", "Charjabug"]);
});

test("nothing typed or nothing matching gives no species", () => {
  assert.equal(resolveSpecies("", ALL).match, null);
  assert.equal(resolveSpecies("zzz", ALL).match, null);
});
