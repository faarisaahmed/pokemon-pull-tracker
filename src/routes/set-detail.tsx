import { Link } from "react-router";
import type { Route } from "./+types/set-detail";
import { CardGrid, CardTable } from "@/components/card-grid";
import { DirToggle, Pager, SearchBox, Select, Toggle } from "@/components/controls";
import { DetailsPanel } from "@/components/details-panel";
import { Breadcrumbs, ConfidenceBadge, RarityChip, RegionBadge } from "@/components/ui";
import { fullDate, oneIn, pct, usd } from "@/lib/format";
import { entryFor, tierOdds } from "@/lib/pullrates";
import { rarityMeta } from "@/lib/rarity";
import { seriesLabel } from "@/lib/series";
import {
  getSet,
  listCards,
  sealedForSet,
  setRarityBreakdown,
  setRarityCounts,
} from "@/lib/queries.server";
import { CARD_SORTS, resolveDir, type CardSort } from "@/lib/sorting";

const PAGE_SIZE = 120;

const KIND_LABEL: Record<string, string> = {
  pack: "Booster pack",
  bundle: "Booster bundle",
  box: "Booster box",
  etb: "Elite Trainer Box",
  collection: "Collection / tin",
};

export function loader({ params, request }: Route.LoaderArgs) {
  const sp = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>;
  const set = getSet(decodeURIComponent(params.setId));
  if (!set) throw new Response("Set not found", { status: 404 });

  const sort = (sp.sort ?? "number") as CardSort;
  const dir = resolveDir(CARD_SORTS[sort] ?? CARD_SORTS.number, sp.dir);
  const rarityKey = sp.rarity ?? "all";
  const search = sp.q ?? "";
  const view = sp.view === "list" ? "list" : "grid";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const counts = setRarityCounts(set.id);
  const entry = entryFor(set.region, set.id, set.releaseDate);
  const breakdown = setRarityBreakdown(set.id);
  const sealed = sealedForSet(set.id);
  const { cards, total } = listCards({
    setId: set.id,
    sort,
    dir,
    rarityKey,
    search,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  return {
    set,
    sort,
    dir,
    rarityKey,
    search,
    view,
    page,
    counts,
    entry,
    breakdown,
    sealed,
    cards,
    total,
  };
}

export default function SetPage({ loaderData }: Route.ComponentProps) {
  const { set, sort, dir, rarityKey, search, view, page, counts, entry, breakdown, sealed, cards, total } =
    loaderData;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const evRatio =
    set.expectedPackValue != null && set.packPrice ? set.expectedPackValue / set.packPrice : null;
  const series = seriesLabel(set.seriesName);

  return (
    <>
      <Breadcrumbs items={[{ href: "/", label: "Sets" }, { label: set.name }]} />

      {/* ---------------------------------------------------------- header */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-40 shrink-0 place-items-center">
          {set.logo ? (
            <img src={set.logo} alt="" className="max-h-16 w-auto max-w-full object-contain" />
          ) : set.tileImage ? (
            <img src={set.tileImage} alt="" className="h-16 w-auto rounded object-contain" />
          ) : (
            <span className="text-2xl font-black text-ink-700">{set.abbreviation}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-ink-300">
              {set.abbreviation ?? set.id.toUpperCase()}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">{set.name}</h1>
            <RegionBadge region={set.region} />
          </div>
          {set.localName ? <p className="mt-0.5 text-sm text-ink-400">{set.localName}</p> : null}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
            <span>Released {fullDate(set.releaseDate)}</span>
            <span className="text-ink-700">|</span>
            <span className="tnum font-semibold text-accent">{usd(set.setValue, { compact: true })}</span>
            <span className="text-ink-700">|</span>
            <span className="tnum">{set.cardCountTotal} cards</span>
            <span className="text-ink-700">|</span>
            <span>{series.title} series</span>
          </p>
        </div>
      </div>

      {/* ------------------------------------------------- price highlights */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Pack", value: usd(set.packPrice) },
          { label: "Bundle", value: usd(set.bundlePrice) },
          { label: "Box", value: usd(set.boxPrice, { compact: true }) },
          { label: "ETB", value: usd(set.etbPrice, { compact: true }) },
          {
            label: "EV / pack",
            value: usd(set.expectedPackValue),
            sub: evRatio != null ? `${evRatio.toFixed(2)}× pack` : undefined,
            good: evRatio != null && evRatio >= 1,
          },
          { label: "Packs / box", value: String(entry.packsPerBox) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">{s.label}</div>
            <div className={`tnum text-base font-semibold ${s.good ? "text-good" : "text-ink-100"}`}>
              {s.value}
            </div>
            {s.sub ? <div className="text-[10px] text-ink-500">{s.sub}</div> : null}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------- collapsible detail */}
      <div className="mb-6 grid gap-2 lg:grid-cols-2">
        <DetailsPanel label="Pull rates" count={`${breakdown.length} rarities`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-wider text-ink-400">
                  <th className="px-4 py-2 font-medium">Rarity</th>
                  <th className="px-4 py-2 text-right font-medium">Cards</th>
                  <th className="px-4 py-2 text-right font-medium">Per pack</th>
                  <th className="px-4 py-2 text-right font-medium">Per card</th>
                  <th className="px-4 py-2 text-right font-medium">Avg</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => {
                  const tier = tierOdds(entry, b.rarity_key);
                  const perCard = tier != null && b.n > 0 ? tier / b.n : null;
                  return (
                    <tr key={b.rarity_key} className="border-b border-ink-850 last:border-0">
                      <td className="px-4 py-1.5">
                        <Link to={`/sets/${encodeURIComponent(set.id)}?rarity=${b.rarity_key}`}>
                          <RarityChip
                            rarityKey={b.rarity_key}
                            label={b.rarity ?? rarityMeta(b.rarity_key).label}
                          />
                        </Link>
                      </td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-300">{b.n}</td>
                      <td className="tnum px-4 py-1.5 text-right text-xs">
                        {tier != null ? (
                          <span title={pct(tier)}>{oneIn(tier)}</span>
                        ) : (
                          <span className="text-ink-600">slot</span>
                        )}
                      </td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-300">
                        {perCard != null ? oneIn(perCard) : "—"}
                      </td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-300">
                        {usd(b.avg_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center gap-2 border-t border-ink-800 px-4 py-2 text-[11px] text-ink-500">
            <ConfidenceBadge confidence={entry.confidence} />
            <span>
              {entry.scope === "set" ? "Measured for this set" : "Era-wide figures"} ·{" "}
              <a href={entry.source.url} target="_blank" rel="noreferrer" className="underline hover:text-accent">
                {entry.source.name}
              </a>
              {entry.source.sampleSize ? ` · ${entry.source.sampleSize.toLocaleString()} packs` : ""}
            </span>
          </footer>
        </DetailsPanel>

        <DetailsPanel label="Sealed products" count={`${sealed.length} listed`}>
          {sealed.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-500">
              No sealed product is currently listed for this set on TCGplayer.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-ink-850 overflow-y-auto">
              {sealed.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-ink-100">{s.name}</div>
                    <div className="text-[10px] text-ink-500">
                      {KIND_LABEL[s.kind] ?? s.kind}
                      {s.packCount ? ` · ${s.packCount} pack${s.packCount > 1 ? "s" : ""}` : ""}
                      {s.packCount && s.market ? ` · ${usd(s.market / s.packCount)}/pack` : ""}
                    </div>
                  </div>
                  <div className="tnum shrink-0 text-sm font-semibold">{usd(s.market)}</div>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-[10px] text-ink-500 underline hover:text-accent"
                    >
                      buy
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DetailsPanel>
      </div>

      {/* --------------------------------------------------------- card list */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-ink-800 pb-2">
        <SearchBox name="q" placeholder="Search cards…" value={search} />
        <Select
          name="rarity"
          label="Filter"
          value={rarityKey}
          options={[
            { value: "all", label: "All rarities" },
            ...breakdown.map((b) => ({
              value: b.rarity_key,
              label: `${b.rarity ?? rarityMeta(b.rarity_key).label} (${b.n})`,
            })),
          ]}
        />
        <Select
          name="sort"
          label="Sort"
          value={sort}
          options={Object.entries(CARD_SORTS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <DirToggle name="dir" value={dir} />
        <span className="tnum text-xs text-ink-500">{total.toLocaleString()} cards</span>
        <div className="ml-auto">
          <Toggle
            name="view"
            value={view}
            options={[
              { value: "grid", label: "Images" },
              { value: "list", label: "List" },
            ]}
          />
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
          No cards match those filters.
        </div>
      ) : view === "grid" ? (
        <CardGrid
          cards={cards}
          entry={entry}
          counts={counts}
          totalInSet={set.cardCountOfficial || set.cardCountTotal}
        />
      ) : (
        <CardTable cards={cards} entry={entry} counts={counts} />
      )}
      <Pager page={page} pageCount={pageCount} />
    </>
  );
}
