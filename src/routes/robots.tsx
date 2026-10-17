import type { Route } from "./+types/robots";
import { siteOrigin } from "@/lib/origin.server";

export function loader({ request }: Route.LoaderArgs) {
  // /api/psa costs an eBay API call per card, so crawlers are kept off it.
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin(request)}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
