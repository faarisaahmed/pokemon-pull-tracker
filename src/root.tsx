import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  Link,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { THEME_INIT_SCRIPT } from "@/lib/themes";
import { lastIngest } from "@/lib/queries.server";

export function loader() {
  return { ingested: lastIngest() };
}

export const meta: Route.MetaFunction = () => [
  { title: "Pull Tracker — Pokémon TCG prices & pull rates" },
  {
    name: "description",
    content:
      "Every English and Japanese Pokémon TCG expansion: card market prices, PSA graded comps, sealed product prices and per-card pull rates.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Applies the stored palette before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const ingested = loaderData?.ingested ?? null;
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[11px] font-black tracking-tighter text-black">
              PT
            </span>
            <span>Pull Tracker</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink-300">
            <Link to="/" className="transition-colors hover:text-accent">
              Sets
            </Link>
            <Link to="/cards" className="transition-colors hover:text-accent">
              All cards
            </Link>
            <Link to="/chase" className="transition-colors hover:text-accent">
              What to open
            </Link>
            <Link to="/about" className="transition-colors hover:text-accent">
              Data &amp; sources
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[11px] text-ink-400 sm:block">
              {ingested ? `Prices updated ${new Date(ingested).toLocaleDateString()}` : null}
            </span>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-10 pt-4 text-[11px] leading-relaxed text-ink-400">
        A reference for prices and odds — not a collection tracker. Card data from TCGdex, market
        prices from TCGplayer via TCGCSV, graded comps from eBay sold listings. Pull rates are
        compiled from published pack-opening studies and per-box guarantees; every figure links to
        its source.
        <br />
        Not produced by, endorsed by, or affiliated with Nintendo, Creatures Inc., GAME FREAK inc.,
        The Pokémon Company, TCGplayer or eBay. Pokémon and all related names are trademarks of
        their respective owners.
      </footer>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {is404 ? "Not found" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-ink-400">
        {is404
          ? "No set or card matches that address."
          : "An unexpected error occurred while rendering this page."}
      </p>
      <Link to="/" className="mt-4 inline-block text-sm text-accent underline">
        Back to sets
      </Link>
    </div>
  );
}
