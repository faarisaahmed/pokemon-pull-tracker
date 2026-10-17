import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListings, summarise } from "../src/lib/ebay/psa.server";

/** Shaped like Browse API item summaries (only the fields the parser reads). */
const usd = (value: string) => ({ value, currency: "USD" });
const listings = [
  { title: "Charizard ex 234/191 Surging Sparks PSA 10 GEM MINT", price: usd("412.00") },
  { title: "Charizard ex 234/191 Surging Sparks  PSA 10", price: usd("395.00") },
  { title: "2024 Pokemon Surging Sparks Charizard ex #234 PSA 10", price: usd("420.00") },
  { title: "Charizard ex 234/191 Surging Sparks PSA 9 MINT", price: usd("188.50") },
];

test("reads grade and price from graded listings", () => {
  const sales = parseListings(listings);
  assert.equal(sales.length, 4);
  assert.equal(sales[0].grade, "10");
  assert.equal(sales[0].price, 412);
  assert.equal(sales[1].title, "Charizard ex 234/191 Surging Sparks PSA 10");
  assert.equal(sales[3].grade, "9");
});

test("skips ungraded copies, lots, sealed, other currencies and missing prices", () => {
  const sales = parseListings([
    { title: "Charizard ex Surging Sparks raw NM", price: usd("40.00") },
    { title: "Pokemon card LOT PSA 10 x5", price: usd("500.00") },
    { title: "Surging Sparks booster box PSA 10 chance", price: usd("200.00") },
    { title: "Charizard ex PSA 10", price: { value: "300.00", currency: "GBP" } },
    { title: "Charizard ex PSA 10" },
    { price: usd("10.00") },
  ]);
  assert.equal(sales.length, 0);
});

test("summarise groups by grade with the median as the typical price", () => {
  const out = summarise(parseListings(listings));
  const psa10 = out.find((g) => g.grade === "10")!;
  assert.equal(psa10.salesCount, 3);
  assert.equal(psa10.avgPrice, 412);
  assert.equal(psa10.lowPrice, 395);
  assert.equal(psa10.highPrice, 420);
  assert.equal(psa10.lastSaleDate, null);

  // Grades come back rarest-first.
  assert.deepEqual(out.map((g) => g.grade), ["10", "9"]);
});

test("drops price outliers so one mis-titled listing cannot skew the figure", () => {
  const sales = [100, 105, 110, 95, 5000].map((price, i) => ({
    title: `card PSA 10 #${i}`,
    grade: "10",
    price,
    soldAt: null,
  }));
  const [summary] = summarise(sales);
  assert.equal(summary.salesCount, 4);
  assert.equal(summary.highPrice, 110);
});
