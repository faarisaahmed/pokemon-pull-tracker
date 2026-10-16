/**
 * Optional affiliate tagging for outbound TCGplayer and eBay links. Both are
 * off unless the deployment sets them, and with neither set every link is
 * exactly the plain URL it always was.
 *
 * TCGPLAYER_AFFILIATE_URL — your TCGplayer (Impact) tracking link, e.g.
 *   https://tcgplayer.pxf.io/c/1234567/1830156/21018 ; the destination is
 *   passed through as ?u=.
 * EBAY_CAMPAIGN_ID — your eBay Partner Network campaign ID (10 digits).
 */
export interface AffiliateIds {
  tcgplayer: string | null;
  ebay: string | null;
}

export const NO_AFFILIATE: AffiliateIds = { tcgplayer: null, ebay: null };

/** Server only: read the settings from the environment. */
export function affiliateIdsFromEnv(): AffiliateIds {
  const tcg = process.env.TCGPLAYER_AFFILIATE_URL?.trim();
  const ebay = process.env.EBAY_CAMPAIGN_ID?.trim();
  return {
    // Accept the link with or without a trailing slash or an empty ?u=.
    tcgplayer: tcg ? tcg.replace(/[?&]u=.*$/, "").replace(/\/$/, "") : null,
    ebay: ebay && /^\d+$/.test(ebay) ? ebay : null,
  };
}

export function hasAffiliate(ids: AffiliateIds): boolean {
  return Boolean(ids.tcgplayer || ids.ebay);
}

function host(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Route a tcgplayer.com link through the tracking link, when one is set. */
export function tcgplayerLink(url: string, ids: AffiliateIds): string {
  if (!ids.tcgplayer || !/(^|\.)tcgplayer\.com$/.test(host(url))) return url;
  return `${ids.tcgplayer}?u=${encodeURIComponent(url)}`;
}

/** Add eBay Partner Network parameters to an ebay.com link, when set. */
export function ebayLink(url: string, ids: AffiliateIds): string {
  if (!ids.ebay || !/(^|\.)ebay\.com$/.test(host(url))) return url;
  const u = new URL(url);
  u.searchParams.set("mkcid", "1");
  u.searchParams.set("mkrid", "711-53200-19255-0");
  u.searchParams.set("siteid", "0");
  u.searchParams.set("campid", ids.ebay);
  u.searchParams.set("toolid", "10001");
  u.searchParams.set("mkevt", "1");
  return u.toString();
}

/** Either kind of outbound shop link. */
export function shopLink(url: string, ids: AffiliateIds): string {
  return ebayLink(tcgplayerLink(url, ids), ids);
}
