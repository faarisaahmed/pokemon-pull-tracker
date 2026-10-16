import { test } from "node:test";
import assert from "node:assert/strict";
import { ebayLink, NO_AFFILIATE, shopLink, tcgplayerLink } from "../src/lib/affiliate";

const ids = { tcgplayer: "https://tcgplayer.pxf.io/c/1/2/21018", ebay: "5338000000" };

test("links are untouched when nothing is configured", () => {
  const url = "https://www.tcgplayer.com/product/12345";
  assert.equal(tcgplayerLink(url, NO_AFFILIATE), url);
  assert.equal(ebayLink("https://www.ebay.com/sch/i.html?_nkw=x", NO_AFFILIATE), "https://www.ebay.com/sch/i.html?_nkw=x");
});

test("TCGplayer links go through the tracking link", () => {
  assert.equal(
    tcgplayerLink("https://www.tcgplayer.com/product/12345", ids),
    "https://tcgplayer.pxf.io/c/1/2/21018?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F12345",
  );
});

test("eBay links keep their search and gain the campaign", () => {
  const u = new URL(ebayLink("https://www.ebay.com/sch/i.html?_nkw=charizard+psa&LH_Sold=1", ids));
  assert.equal(u.searchParams.get("_nkw"), "charizard psa");
  assert.equal(u.searchParams.get("LH_Sold"), "1");
  assert.equal(u.searchParams.get("campid"), "5338000000");
});

test("other hosts are never rewritten", () => {
  assert.equal(shopLink("https://tcgdex.dev/x", ids), "https://tcgdex.dev/x");
  assert.equal(shopLink("https://eviltcgplayer.com.example/x", ids), "https://eviltcgplayer.com.example/x");
});
