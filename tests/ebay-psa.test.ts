import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSales, summarise } from "../src/lib/ebay/psa";

/**
 * eBay blocks automated traffic from most hosts, so the parser is verified
 * against fixtures shaped like the two markups eBay currently serves rather
 * than against a live response. If eBay changes its class names these tests
 * keep passing while the scraper stops working — check a real response before
 * assuming the scraper is healthy.
 */
const legacyMarkup = `
<ul>
  <li class="s-item">
    <div class="s-item__title">Charizard ex 234/191 Surging Sparks PSA 10 GEM MINT</div>
    <span class="s-item__price">$412.00</span>
    <div class="s-item__caption"><span>Sold  Aug 12, 2026</span></div>
  </li>
  <li class="s-item">
    <div class="s-item__title">Charizard ex 234/191 Surging Sparks PSA 9 MINT</div>
    <span class="s-item__price">$188.50</span>
    <div class="s-item__caption"><span>Sold  Aug 9, 2026</span></div>
  </li>
  <li class="s-item">
    <div class="s-item__title">Charizard ex Surging Sparks PSA 10</div>
    <span class="s-item__price">$395.00</span>
    <div class="s-item__caption"><span>Sold  Aug 1, 2026</span></div>
  </li>
</ul>`;

const modernMarkup = `
<ul>
  <li class="s-card">
    <div class="s-card__title">Pikachu ex 238 Surging Sparks PSA 10</div>
    <span class="s-card__price">$1,250.00</span>
    <div class="s-card__caption">Sold  Jul 30, 2026</div>
  </li>
</ul>`;

test("parses grade, price and sold date from the legacy markup", () => {
  const sales = parseSales(legacyMarkup);
  assert.equal(sales.length, 3);
  assert.deepEqual(sales[0], {
    title: "Charizard ex 234/191 Surging Sparks PSA 10 GEM MINT",
    grade: "10",
    price: 412,
    soldAt: "2026-08-12",
  });
});

test("parses the newer s-card markup and comma-separated prices", () => {
  const sales = parseSales(modernMarkup);
  assert.equal(sales.length, 1);
  assert.equal(sales[0].price, 1250);
  assert.equal(sales[0].grade, "10");
});

test("skips listings with no grade, price ranges, and lots", () => {
  const html = `
  <ul>
    <li class="s-item"><div class="s-item__title">Charizard ex Surging Sparks raw NM</div><span class="s-item__price">$40.00</span></li>
    <li class="s-item"><div class="s-item__title">Charizard PSA 10</div><span class="s-item__price">$10.00 to $30.00</span></li>
    <li class="s-item"><div class="s-item__title">Pokemon card LOT PSA 10 x5</div><span class="s-item__price">$500.00</span></li>
    <li class="s-item"><div class="s-item__title">Shop on eBay</div><span class="s-item__price">$20.00</span></li>
  </ul>`;
  assert.equal(parseSales(html).length, 0);
});

test("summarise groups by grade and reports the latest sale", () => {
  const out = summarise(parseSales(legacyMarkup));
  assert.equal(out.length, 2);

  const psa10 = out.find((g) => g.grade === "10")!;
  assert.equal(psa10.salesCount, 2);
  assert.equal(psa10.avgPrice, 403.5);
  assert.equal(psa10.lowPrice, 395);
  assert.equal(psa10.highPrice, 412);
  assert.equal(psa10.lastSaleDate, "2026-08-12");

  // Grades come back rarest-first.
  assert.deepEqual(out.map((g) => g.grade), ["10", "9"]);
});

test("drops price outliers so one mis-titled listing cannot skew an average", () => {
  const sales = [100, 105, 110, 95, 5000].map((price, i) => ({
    title: `card PSA 10 #${i}`,
    grade: "10",
    price,
    soldAt: null,
  }));
  const [summary] = summarise(sales);
  assert.equal(summary.salesCount, 4);
  assert.ok(summary.avgPrice < 120, `expected the 5000 outlier to be dropped, got ${summary.avgPrice}`);
});
