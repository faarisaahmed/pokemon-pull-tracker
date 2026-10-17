/**
 * The public origin of this deployment. SITE_URL wins when set; otherwise it is
 * read from the request, trusting the proxy's X-Forwarded-Proto (Render
 * terminates TLS, so the request itself arrives as http).
 */
export function siteOrigin(request: Request): string {
  const fixed = process.env.SITE_URL?.replace(/\/$/, "");
  if (fixed) return fixed;
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${proto || url.protocol.replace(":", "")}://${request.headers.get("x-forwarded-host") ?? url.host}`;
}
