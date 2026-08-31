import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { lastIngest } from "@/lib/queries";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { THEME_INIT_SCRIPT } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Pull Tracker — Pokémon TCG prices & pull rates",
  description:
    "Every English and Japanese Pokémon TCG expansion: card market prices, PSA graded comps, sealed product prices and per-card pull rates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ingested = lastIngest();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored palette before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[11px] font-black tracking-tighter text-black">
                PT
              </span>
              <span>Pull Tracker</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink-300">
              <Link href="/" className="transition-colors hover:text-accent">
                Sets
              </Link>
              <Link href="/cards" className="transition-colors hover:text-accent">
                All cards
              </Link>
              <Link href="/chase" className="transition-colors hover:text-accent">
                What to open
              </Link>
              <Link href="/about" className="transition-colors hover:text-accent">
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
        <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
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
      </body>
    </html>
  );
}
