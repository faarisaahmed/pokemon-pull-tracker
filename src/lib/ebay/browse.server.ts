/**
 * eBay's official Browse API (developer.ebay.com). Graded prices come from
 * here rather than from eBay's web pages, which its User Agreement does not
 * allow automated access to.
 *
 *   EBAY_CLIENT_ID / EBAY_CLIENT_SECRET   An eBay developer app's production
 *                                         keyset. Without them nothing is
 *                                         requested from eBay at all.
 *
 * The Browse API returns current listings, not sold ones, so the figures are
 * asking prices.
 */

export class BlockedError extends Error {
  constructor(public status: number) {
    super(`eBay refused the request (HTTP ${status}).`);
    this.name = "BlockedError";
  }
}

export class NotConfiguredError extends Error {
  constructor() {
    super("Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to look up graded prices.");
    this.name = "NotConfiguredError";
  }
}

export interface BrowseItem {
  title?: string;
  price?: { value: string; currency: string };
}

export function isConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

let token: { value: string; expiresAt: number } | null = null;

/** Application token (client credentials), reused until a minute before it expires. */
async function appToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt) return token.value;
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) throw new NotConfiguredError();

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401 || res.status === 403) throw new BlockedError(res.status);
  if (!res.ok) throw new Error(`HTTP ${res.status} from eBay's token endpoint`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
  return token.value;
}

/** Fixed-price US listings matching `q` in one category, up to 200. */
export async function browseSearch(q: string, categoryId: string): Promise<BrowseItem[]> {
  const params = new URLSearchParams({
    q,
    category_ids: categoryId,
    filter: "buyingOptions:{FIXED_PRICE},itemLocationCountry:US",
    limit: "200",
  });
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      Authorization: `Bearer ${await appToken()}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401) token = null;
  if (res.status === 401 || res.status === 403 || res.status === 429) throw new BlockedError(res.status);
  if (!res.ok) throw new Error(`HTTP ${res.status} from eBay's Browse API`);
  const body = (await res.json()) as { itemSummaries?: BrowseItem[] };
  return body.itemSummaries ?? [];
}
