import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRarity } from "../scripts/ingest/rarity-rules";

/**
 * Fixtures are real Japanese cards whose printed rarity was checked against
 * TCGplayer, the TCGdex API and Japanese retailer listings. Each case records
 * what the two sources say and the key the card must end up with.
 */
const ja = (
  cardId: string,
  dex: string | null,
  tcgplayer: string | null,
  number = 999,
  officialCount = 100,
) => resolveRarity({
  region: "ja",
  setId: cardId.slice(0, cardId.lastIndexOf("-")),
  cardId,
  localId: cardId.slice(cardId.lastIndexOf("-") + 1),
  number,
  officialCount,
  dex,
  tcgplayer,
}).key;

test("Japanese SR and UR are not confused across sources", () => {
  assert.equal(ja("SV1S-091", null, "Super Rare"), "ultra"); // Gyarados ex SR
  assert.equal(ja("SV1S-106", null, "Ultra Rare"), "hyper"); // Koraidon ex UR gold
  assert.equal(ja("S9-125", null, "Ultra Rare"), "secret"); // Arceus VSTAR UR gold (S era)
  assert.equal(ja("M3-093", "Ultra Rare", null), "ultra"); // TCGdex "Ultra Rare" = SR
});

test("TCGplayer wins over TCGdex's era-specific labels", () => {
  assert.equal(ja("S10P-081", "Holo Rare", "Hyper Rare"), "hyper"); // Origin Palkia VSTAR HR
  assert.equal(ja("S8-119", "Secret Rare", "Hyper Rare"), "hyper"); // Mew VMAX HR
  assert.equal(ja("M2a-223", "Ultra Rare", "Mega Attack Rare"), "megaattack");
  assert.equal(ja("SM8b-170", "Ultra Rare", "Shiny Rare"), "shiny");
  assert.equal(ja("M2-116", "Mega Hyper Rare", "Mega Ultra Rare"), "megahyper");
});

test("TCGdex fallback reads each era's labels correctly", () => {
  assert.equal(ja("S11-117", "Holo Rare", null), "hyper");
  assert.equal(ja("S11-125", "Mega Hyper Rare", null), "secret");
  assert.equal(ja("SV8-136", "Mega Hyper Rare", null), "hyper");
  assert.equal(ja("M1S-076", "Secret Rare", null), "ultra");
});

test("hand-checked overrides and unmarked high-class filler", () => {
  assert.equal(ja("SV4a-350", null, null), "special");
  assert.equal(ja("SV4a-358", null, null), "hyper");
  assert.equal(ja("M2-102", "Ultra Rare", "Promo"), "ultra");
  assert.equal(ja("SV4a-001", null, null, 1, 190), "common");
  assert.equal(ja("SV4a-400", null, null, 400, 190), "unknown");
});

test("English keeps TCGdex first", () => {
  const r = resolveRarity({
    region: "en", setId: "sv03.5", cardId: "sv03.5-199", localId: "199", number: 199, officialCount: 165,
    dex: "Special illustration rare", tcgplayer: "Special Illustration Rare",
  });
  assert.equal(r.key, "special");
});

const en = (cardId: string, dex: string, productName: string, cardName = "", tcgplayer = "") =>
  resolveRarity({
    region: "en",
    setId: cardId.slice(0, cardId.lastIndexOf("-")),
    cardId,
    localId: cardId.slice(cardId.lastIndexOf("-") + 1),
    cardName,
    productName,
    number: 0,
    officialCount: 0,
    dex,
    tcgplayer,
  }).key;

test("English Sword & Shield splits alt arts from full arts and secrets", () => {
  assert.equal(en("swsh7-215", "Secret Rare", "Umbreon VMAX (Alternate Art Secret)"), "altsecret");
  assert.equal(en("swsh7-189", "Ultra Rare", "Umbreon V (Alternate Full Art)"), "altart");
  assert.equal(en("swsh7-188", "Ultra Rare", "Umbreon V (Full Art)"), "ultra");
  assert.equal(en("swsh7-214", "Secret Rare", "Umbreon VMAX (Secret)"), "secret");
  assert.equal(en("swsh7-95", "Holo Rare VMAX", "Umbreon VMAX"), "triple");
});

test("English Sun & Moon splits regular GX from full art", () => {
  assert.equal(en("sm10-20", "Ultra Rare", "Reshiram & Charizard GX"), "double");
  assert.equal(en("sm10-206", "Ultra Rare", "Whimsicott GX (Full Art)"), "ultra");
  assert.equal(en("sm10-205", "Ultra Rare", "Gardevoir & Sylveon GX (205) (Alternate Full Art)"), "ultra");
  assert.equal(en("sm10-229", "Secret Rare", "Beast Bringer (Secret)"), "secret");
  assert.equal(en("sma-SV49", "Shiny rare", "Charizard GX", "Charizard-GX"), "shinyultra");
  assert.equal(en("sma-SV10", "Shiny rare", "Charmander", "Charmander"), "shiny");
});

test("Trainer Gallery splits like Character Rare / Character Super Rare", () => {
  assert.equal(en("swsh9tg-TG01", "Holo Rare", "Flareon"), "character");
  assert.equal(en("swsh10tg-TG23", "Ultra Rare", "Garchomp V"), "charactersuper");
});

test("vintage takes TCGplayer's rarity where TCGdex only says Rare", () => {
  assert.equal(en("base1-4", "Rare", "Charizard", "Charizard", "Holo Rare"), "holo");
  assert.equal(en("ex9-93", "Rare", "Deoxys ex", "Deoxys ex", "Ultra Rare"), "double");
  assert.equal(en("ex13-17", "Rare", "Gyarados Star (Delta Species)", "Gyarados ★", "Ultra Rare"), "goldstar");
  assert.equal(en("base1-20", "Rare", "Electabuzz", "Electabuzz", "Rare"), "rare");
});
