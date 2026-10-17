import type { Route } from "./+types/sitemap";
import { getDb } from "@/lib/db.server";
import { siteOrigin } from "@/lib/origin.server";
import { lastIngest } from "@/lib/queries.server";
import { NOT_SUBSET_COPY } from "@/lib/subsets";

/**
 * Every set and card page, for search engines. About 40k URLs, under the
 * 50k a single sitemap may hold; subset copies are left out because they
 * duplicate a card that already has its own page.
 */
export function loader({ request }: Route.LoaderArgs) {
  const origin = siteOrigin(request);
  const db = getDb();
  const sets = db.prepare(`SELECT id FROM sets`).all() as { id: string }[];
  const cards = db.prepare(`SELECT id FROM cards WHERE ${NOT_SUBSET_COPY}`).all() as { id: string }[];
  const lastmod = lastIngest()?.slice(0, 10);

  const urls = [
    ...["/", "/chase", "/cards", "/master", "/china", "/about"].map((p) => `${origin}${p}`),
    ...sets.map((s) => `${origin}/sets/${encodeURIComponent(s.id)}`),
    ...cards.map((c) => `${origin}/cards/${encodeURIComponent(c.id)}`),
  ];
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `<url><loc>${escapeXml(u)}</loc>${mod}</url>`).join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
