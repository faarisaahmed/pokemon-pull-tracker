import { test } from "node:test";
import assert from "node:assert/strict";
import { nameKey, pairByName, productCardName } from "../scripts/ingest/names";
import type { CsvProduct } from "../scripts/ingest/tcgcsv";

/**
 * Classic Collection subsets are joined to TCGplayer by name, because TCGdex
 * numbers them 001-030 while TCGplayer keeps each reprint's original number.
 * These fixtures are real name pairs from both sides; if TCGplayer renames a
 * product and one of these stops matching, that card silently loses its price.
 */
function product(productId: number, name: string, number: string): CsvProduct {
  return {
    productId,
    name,
    cleanName: name,
    imageUrl: null,
    groupId: 1,
    url: null,
    extendedData: [{ name: "Number", value: number }],
  };
}

test("TCGplayer spellings meet TCGdex spellings", () => {
  const pairs: [string, string][] = [
    ["Gengar (Prime)", "Gengar"],
    ["Palkia LV.X", "Palkia"],
    ["Luxray GL LV.X", "Luxray GL LV.X"],
    ["Umbreon Star", "Umbreon ☆"],
    ["Metagross (Delta Species)", "Metagross"],
    ["Genesect EX (Team Plasma)", "Genesect EX"],
    ["______'s Pikachu", "_____'s Pikachu"],
    ["Darkrai & Cresselia Legend (Top)", "Darkrai & Cresselia LEGEND"],
  ];
  for (const [tcgplayer, tcgdex] of pairs) {
    assert.equal(nameKey(tcgplayer), nameKey(tcgdex), `${tcgplayer} vs ${tcgdex}`);
  }
});

test("different cards stay apart", () => {
  assert.notEqual(nameKey("Mew ex"), nameKey("Mew"));
  assert.notEqual(nameKey("Mewtwo EX"), nameKey("Mew ex"));
  assert.notEqual(nameKey("Pikachu"), nameKey("Pikachu & Zekrom GX"));
});

test("collector-number suffixes are dropped from product names", () => {
  assert.equal(productCardName({ name: "Mew - R/RGB" }), "Mew");
  assert.equal(productCardName({ name: "Pikachu ex - 149/128" }), "Pikachu ex");
  assert.equal(productCardName({ name: "Charizard" }), "Charizard");
});

test("duplicate names pair up in collector-number order", () => {
  const products = [
    product(200, "Darkrai & Cresselia Legend (Bottom)", "100/102"),
    product(100, "Charizard", "4/102"),
    product(199, "Darkrai & Cresselia Legend (Top)", "99/102"),
  ];
  const cards = [
    { name: "Charizard" },
    { name: "Darkrai & Cresselia LEGEND" },
    { name: "Darkrai & Cresselia LEGEND" },
    { name: "Magikarp" },
  ];
  assert.deepEqual(pairByName(cards, products), [100, 199, 200, undefined]);
});
