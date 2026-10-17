import type { MetaDescriptor } from "react-router";

/**
 * Title, description, canonical link and share-preview tags for a page.
 * `origin` comes from the root loader; the canonical drops the query string
 * so filtered and sorted views of a page count as that one page.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  origin?: string | null;
  path: string;
  image?: string | null;
}): MetaDescriptor[] {
  const url = opts.origin ? `${opts.origin}${opts.path}` : null;
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:site_name", content: "Ripwise" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: "website" },
    ...(url ? [{ tagName: "link", rel: "canonical", href: url }, { property: "og:url", content: url }] : []),
    ...(opts.image
      ? [
          { property: "og:image", content: opts.image },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ name: "twitter:card", content: "summary" }]),
  ];
}

/** The site's origin as the root loader saw it, for use inside a route's meta. */
export function originFrom(matches: readonly unknown[]): string | null {
  const root = matches.find((m) => (m as { id?: string } | undefined)?.id === "root") as
    | { loaderData?: { origin?: string } }
    | undefined;
  return root?.loaderData?.origin ?? null;
}
