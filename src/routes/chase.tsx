import { Link } from "react-router";
import type { Route } from "./+types/chase";
import { ChipRow, DirToggle, MultiChipRow, Select, Toggle } from "@/components/controls";
import { ConfidenceBadge, RarityChip, RegionBadge } from "@/components/ui";
import { oneIn, pct, shortDate, usd } from "@/lib/format";
import { boxUnit } from "@/lib/pullrates";
import { rarityMeta } from "@/lib/rarity";
import { eraOf, eraOptions, eraSlug } from "@/lib/series";
import { availableRarities, chaseRows, godPackSets } from "@/lib/queries.server";
import type { ChaseRow, GodPackSet } from "@/lib/types";
import type { Region, SetRow } from "@/lib/types";

const MAX_PACK_OPTIONS = [
  { value: "all", label: "Any price" },
  { value: "5", label: "Under $5" },
  { value: "10", label: "Under $10" },
  { value: "20", label: "Under $20" },
  { value: "50", label: "Under $50" },
];


const CHASE_SORTS = {
  cost: { label: "Cost per hit", key: "costPerHit", defaultDir: "asc" },
  ratio: { label: "Value returned", key: "valueRatio", defaultDir: "desc" },
  odds: { label: "Best odds", key: "tierPerPack", defaultDir: "desc" },
  top: { label: "Best chase card", key: "maxPrice", defaultDir: "desc" },
  avg: { label: "Average hit value", key: "avgPrice", defaultDir: "desc" },
  pack: { label: "Pack price", key: "packPrice", defaultDir: "asc" },
} as const;

type ChaseSort = keyof typeof CHASE_SORTS;

function valueOf(row: ChaseRow, key: string): number | null {
  if (key === "packPrice") return row.packPrice;
  return (row as unknown as Record<string, number | null>)[key] ?? null;
}

export function loader({ request }: Route.LoaderArgs) {
  const sp = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>;
  const region = (sp.region ?? "all") as Region | "all";
  const target = sp.rarity ?? "special";
  const sort = (sp.sort ?? "cost") as ChaseSort;
  const sortDef = CHASE_SORTS[sort] ?? CHASE_SORTS.cost;
  const dir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : sortDef.defaultDir;

  const eras = (sp.era ?? "").split(",").filter(Boolean);
  // Loose packs, or the cheapest per-pack route (a bundle, ETB or box).
  const buy = sp.buy === "best" ? "best" : "loose";
  const maxPack = Number(sp.max) > 0 ? Number(sp.max) : null;

  const rarities = availableRarities(region).filter((r) => r.rank >= 40);
  const isGodPacks = target === "godpack";

  // Era chips are built before the era filter applies (so they never vanish
  // as you pick them), but after the price cap (so counts match what shows).
  const affordable = (set: SetRow) =>
    maxPack == null || (set.packPrice != null && set.packPrice <= maxPack);
  const inEra = (set: SetRow) => eras.length === 0 || eras.includes(eraSlug(eraOf(set.seriesName)));

  const allRows = isGodPacks
    ? []
    : chaseRows(target, region)
        .map((r) => {
          const packPrice = buy === "best" ? (r.set.bestPackPrice ?? r.set.packPrice) : r.set.packPrice;
          return {
            ...r,
            packPrice,
            costPerHit: packPrice != null ? packPrice / r.tierPerPack : null,
            valueRatio:
              packPrice != null && r.avgPrice != null ? (r.tierPerPack * r.avgPrice) / packPrice : null,
          };
        })
        .filter((r) => maxPack == null || (r.packPrice != null && r.packPrice <= maxPack));
  const allGods = isGodPacks ? godPackSets(region).filter((g) => affordable(g.set)) : [];
  const eraChoices = eraOptions(isGodPacks ? allGods.map((g) => g.set) : allRows.map((r) => r.set));

  const rows = allRows.filter((r) => inEra(r.set));
  rows.sort((a, b) => {
    const av = valueOf(a, sortDef.key);
    const bv = valueOf(b, sortDef.key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last regardless of direction
    if (bv == null) return -1;
    return dir === "asc" ? av - bv : bv - av;
  });

  const gods = allGods.filter((g) => inEra(g.set));

  return {
    region,
    target,
    sort,
    dir,
    rarities,
    isGodPacks,
    rows,
    gods,
    eras,
    eraChoices,
    maxPack: maxPack == null ? "all" : String(maxPack),
    buy,
    filtered: eras.length > 0 || maxPack != null,
  };
}

export default function ChasePage({ loaderData }: Route.ComponentProps) {
  const { region, target, sort, dir, rarities, isGodPacks, rows, gods, eras, eraChoices, maxPack, filtered, buy } =
    loaderData;
  const meta = rarityMeta(target);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">What to open</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-400">
          Pick the card type you are chasing, narrow it to the eras and pack prices you would
          actually buy, and this ranks every set by how much a hit costs — the pack price divided by
          the odds of a pack containing that rarity at all. For one specific card, use the odds on
          its card page.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toggle
          name="region"
          value={region}
          options={[
            { value: "all", label: "All" },
            { value: "en", label: "International" },
            { value: "ja", label: "Japan" },
          ]}
        />
        <Select name="max" label="Pack price" value={maxPack} options={MAX_PACK_OPTIONS} />
        {!isGodPacks ? (
          <Toggle
            name="buy"
            value={buy}
            options={[
              { value: "loose", label: "Loose packs" },
              { value: "best", label: "Cheapest way to buy" },
            ]}
          />
        ) : null}
        {!isGodPacks ? (
          <>
            <Select
              name="sort"
              label="Rank by"
              value={sort}
              options={Object.entries(CHASE_SORTS).map(([value, s]) => ({ value, label: s.label }))}
            />
            <DirToggle name="dir" value={dir} />
          </>
        ) : null}
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">Chasing</div>
        <ChipRow
          name="rarity"
          value={target}
          options={[
            ...rarities.map((r) => ({
              value: r.rarity_key,
              label: rarityMeta(r.rarity_key).label,
              count: r.sets,
            })),
            { value: "godpack", label: "God packs" },
          ]}
        />
      </div>

      <div className="mb-5">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">
          Eras <span className="normal-case tracking-normal text-ink-600">— pick any number</span>
        </div>
        <MultiChipRow name="era" values={eras} options={eraChoices} allLabel="All eras" />
      </div>

      {isGodPacks ? (
        <GodPacks gods={gods} filtered={filtered} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
          {filtered
            ? `No set matches these filters for ${meta.label} cards — try another era or a higher pack price.`
            : `No set with pull-rate data prints ${meta.label} cards in this region.`}
        </div>
      ) : (
        <>
          {/* Phones: the ranking with cost per hit up front. */}
          <ol className="divide-y divide-ink-850 overflow-hidden rounded-xl border border-ink-800 bg-ink-900 md:hidden">
            {rows.map((r, i) => (
              <li key={`${r.set.region}-${r.set.id}`}>
                <Link to={`/sets/${encodeURIComponent(r.set.id)}?rarity=${target}`} className="flex items-center gap-2.5 px-3 py-2.5 active:bg-ink-850">
                  <span className="tnum w-5 shrink-0 text-xs text-ink-600">{i + 1}</span>
                  <RegionBadge region={r.set.region} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.set.name}</span>
                    <span className="tnum block text-[10px] text-ink-500">
                      {usd(r.packPrice)} pack · {oneIn(r.tierPerPack)} · {shortDate(r.set.releaseDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-sm font-semibold text-accent">{usd(r.costPerHit)}</span>
                    <span className="block text-[9px] uppercase tracking-wider text-ink-500">per hit</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="hidden overflow-x-auto rounded-xl border border-ink-800 bg-ink-900 md:block">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-wider text-ink-400">
                  <th className="px-3 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Set</th>
                  <th className="px-3 py-2.5 text-right font-medium">Pack</th>
                  <th className="px-3 py-2.5 text-right font-medium" title={`Chance a pack holds any ${meta.label}`}>
                    Odds
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">In set</th>
                  <th className="px-3 py-2.5 text-right font-medium" title="Pack price divided by the odds of hitting this rarity">
                    Cost / hit
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg hit</th>
                  <th className="px-3 py-2.5 text-right font-medium" title="Expected value of this rarity per pack, against the pack price">
                    Returned
                  </th>
                  <th className="px-3 py-2.5 font-medium">Best card</th>
                  <th className="px-3 py-2.5 font-medium">Odds data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.set.region}-${r.set.id}`} className="group border-b border-ink-850 last:border-0 hover:bg-ink-850">
                    <td className="tnum px-3 py-2 text-xs text-ink-600">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/sets/${encodeURIComponent(r.set.id)}?rarity=${target}`}
                        className="flex items-center gap-2"
                      >
                        <RegionBadge region={r.set.region} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium transition-colors group-hover:text-accent">
                            {r.set.name}
                          </span>
                          <span className="block text-[10px] text-ink-500">
                            {shortDate(r.set.releaseDate)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="tnum px-3 py-2 text-right text-xs">{usd(r.packPrice)}</td>
                    <td className="tnum px-3 py-2 text-right text-xs" title={pct(r.tierPerPack)}>
                      {oneIn(r.tierPerPack)}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-xs text-ink-400">{r.poolSize}</td>
                    <td className="tnum px-3 py-2 text-right font-semibold text-accent">
                      {usd(r.costPerHit)}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-xs text-ink-300">
                      {usd(r.avgPrice)}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-xs">
                      {r.valueRatio != null ? (
                        <span className={r.valueRatio >= 1 ? "text-good" : "text-ink-400"}>
                          {r.valueRatio.toFixed(2)}×
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.topCardId ? (
                        <Link
                          to={`/cards/${encodeURIComponent(r.topCardId)}`}
                          className="flex items-center gap-2 hover:text-accent"
                        >
                          {r.topCardImage ? (
                                        <img
                              src={r.topCardImage}
                              alt=""
                              loading="lazy"
                              className="h-9 w-auto rounded-sm ring-1 ring-ink-700"
                            />
                          ) : null}
                          <span className="min-w-0">
                            <span className="block max-w-[150px] truncate text-xs">
                              {r.topCardName}
                            </span>
                            <span className="tnum block text-[10px] text-ink-400">
                              {usd(r.maxPrice)}
                            </span>
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ConfidenceBadge confidence={r.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-ink-500">
            <strong className="text-ink-400">Cost / hit</strong> is what you would expect to spend in
            packs before pulling any <RarityChip rarityKey={target} /> — pack price ÷ per-pack odds.
            With <strong className="text-ink-400">Cheapest way to buy</strong> on, the pack price is
            the lowest per-pack cost across loose packs, booster bundles, ETBs and booster boxes.{" "}
            <strong className="text-ink-400">Returned</strong> is the average value of that rarity
            multiplied by its odds, divided by the pack price; above 1.00× means the tier alone pays
            for the pack. Both assume you buy loose packs at market and ignore everything else in the
            pack, so treat them as a comparison between sets rather than a profit forecast. Sets
            whose odds come from an era-wide estimate rather than a measured sample are marked in the
            last column.
          </p>
        </>
      )}
    </>
  );
}

function GodPacks({ gods, filtered }: { gods: GodPackSet[]; filtered: boolean }) {
  if (gods.length === 0) {
    return (
      <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
        {filtered
          ? "No god-pack set matches these filters."
          : "No god-pack sets are documented in this region yet."}
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {gods.map(({ set, entry }) => {
          const gp = entry.godPack!;
          const perBox = gp.perPack * entry.packsPerBox;
          const box = boxUnit(entry);
          return (
            <div key={set.id} className="rounded-xl border border-ink-800 bg-ink-900 p-4">
              <div className="flex items-start gap-3">
                {set.tileImage ? (
                    <img
                    src={set.tileImage}
                    alt=""
                    loading="lazy"
                    className="h-16 w-auto rounded ring-1 ring-ink-700"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/sets/${encodeURIComponent(set.id)}`}
                    className="block truncate font-semibold hover:text-accent"
                  >
                    {set.name}
                  </Link>
                  {set.localName ? (
                    <span className="block truncate text-[11px] text-ink-500">{set.localName}</span>
                  ) : null}
                  <div className="tnum mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-400">
                    <RegionBadge region={set.region} />
                    <span>{shortDate(set.releaseDate)}</span>
                    <span>{usd(set.packPrice)} / pack</span>
                    <span>{usd(set.boxPrice)} / box</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Cell label="Per pack" value={oneIn(gp.perPack)} />
                <Cell label={`Per ${box.short}`} value={`${(perBox * 100).toFixed(1)}%`} />
                <Cell
                  label={`${box.plural} / god pack`}
                  value={perBox > 0 ? Math.round(1 / perBox).toString() : "—"}
                />
              </div>

              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-500">Known contents</div>
                <ul className="mt-1 space-y-0.5">
                  {gp.contents.map((c) => (
                    <li key={c} className="text-xs text-ink-300">
                      • {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-ink-500">
        God packs replace every slot in a booster with hits. Japanese sets have printed them for
        years; in English, TCGplayer&rsquo;s studies confirm them in 151 (as demi-god packs),
        Prismatic Evolutions and Ascended Heroes. No one has published a rate, so every figure is a
        community estimate — box tallies for the Japanese high-class packs, 1 in 600 where nothing
        better exists, and 1 in 600 to 2,000 for Ascended Heroes. Treat the percentages as an order
        of magnitude, not a number to plan around. Japanese contents are compiled from collector
        reports via{" "}
        <a
          href="https://www.thetrainercourt.com/blogs/resources/japanese-booster-box-guaranteed-hit-rates-god-packs"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent"
        >
          The Trainer Court
        </a>
        .
      </p>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-850 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="tnum text-sm font-semibold">{value}</div>
    </div>
  );
}
