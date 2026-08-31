import { Card } from "@/components/ui";
import { PULL_RATES, SPECIAL_SET_OVERRIDES } from "@/lib/pullrates";
import { ConfidenceBadge } from "@/components/ui";
import { globalStats, lastIngest } from "@/lib/queries.server";
import type { Route } from "./+types/about";

export function loader() {
  return { stats: globalStats(), ingested: lastIngest() };
}

export default function AboutPage({ loaderData }: Route.ComponentProps) {
  const { stats, ingested } = loaderData;
  const entries = [...PULL_RATES, ...SPECIAL_SET_OVERRIDES];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data &amp; sources</h1>
        <p className="mt-1 text-sm text-ink-400">
          What is in the database, where it came from, and how far to trust it.
        </p>
      </div>

      <Card title="Coverage">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-ink-800 sm:grid-cols-4">
          {[
            ["English sets", stats.en_sets],
            ["Japanese sets", stats.ja_sets],
            ["English cards", stats.en_cards],
            ["Japanese cards", stats.ja_cards],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-ink-900 px-4 py-3">
              <dt className="text-[10px] uppercase tracking-wider text-ink-400">{label}</dt>
              <dd className="tnum mt-0.5 text-xl font-semibold">{(value as number).toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Where each number comes from">
        <div className="space-y-3 px-4 py-3 text-sm leading-relaxed text-ink-300">
          <p>
            <strong className="text-ink-100">Cards, sets and images</strong> come from{" "}
            <a href="https://tcgdex.dev" target="_blank" rel="noreferrer" className="text-accent underline">
              TCGdex
            </a>
            , which is the only open source covering both the English and Japanese card pools.
          </p>
          <p>
            <strong className="text-ink-100">Market prices</strong>, for singles and for sealed
            product, come from TCGplayer via{" "}
            <a href="https://tcgcsv.com" target="_blank" rel="noreferrer" className="text-accent underline">
              TCGCSV
            </a>
            , refreshed each time the ingest runs
            {ingested ? ` (last run ${new Date(ingested).toLocaleString()})` : ""}.
          </p>
          <p>
            <strong className="text-ink-100">PSA graded prices</strong> are scraped from eBay sold
            listings on demand, per card, and cached for a week. eBay blocks automated traffic from
            most servers, so this needs a residential connection or a proxy configured through{" "}
            <code className="rounded bg-ink-850 px-1 py-0.5 text-[11px]">PPT_SCRAPER_URL</code>.
          </p>
          <p>
            <strong className="text-ink-100">Pull rates</strong> have no API anywhere. Every figure
            below was taken from a published pack-opening study or a documented per-box guarantee.
            Where a set has no measured data, the era-wide table is used instead and labelled as such.
          </p>
          <p className="text-ink-400">
            Promo sets, McDonald&apos;s collections, blister exclusives, trainer kits, deck-only
            products and the digital TCG Pocket sets are excluded — none of them come out of a booster
            pack.
          </p>
        </div>
      </Card>

      <Card title="Pull-rate sources">
        <ul className="divide-y divide-ink-850">
          {entries.map((e) => (
            <li key={`${e.region}:${e.key}`} className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs">
              <code className="rounded bg-ink-850 px-1.5 py-0.5 text-[11px] text-ink-200">
                {e.region}:{e.key}
              </code>
              <ConfidenceBadge confidence={e.confidence} />
              <a
                href={e.source.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-ink-400 underline hover:text-accent"
              >
                {e.source.name}
              </a>
              {e.source.sampleSize ? (
                <span className="tnum shrink-0 text-ink-500">
                  {e.source.sampleSize.toLocaleString()} packs
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="How per-card odds are calculated">
        <div className="space-y-2 px-4 py-3 text-sm leading-relaxed text-ink-300">
          <p>
            Published studies give the chance a pack contains{" "}
            <em className="text-ink-100">any</em> card of a given rarity. To get the odds for one
            specific card, that figure is divided by the number of cards sharing the rarity in that
            set.
          </p>
          <p>
            Japanese sets work differently: boxes ship with fixed guarantees such as &ldquo;1 Super
            Rare or better, 3 Art Rares, 4 Double Rares per box&rdquo;. Those are converted to a
            per-pack figure by dividing by the box size before the same split is applied.
          </p>
          <p>
            Commons, uncommons and the rare slot have no published rate, so they are modelled from
            the pack&apos;s slot structure against the number of cards eligible for that slot. Those
            are always labelled <em className="text-ink-100">estimated</em>.
          </p>
        </div>
      </Card>
    </div>
  );
}
