import type { Route } from "./+types/sets";
import { ChipRow, DirToggle, SearchBox, Select, Toggle } from "@/components/controls";
import { SetRowItem, SetTile } from "@/components/set-tile";
import { seriesAnchor, seriesLabel } from "@/lib/series";
import { listSeries, listSets } from "@/lib/queries.server";
import { resolveDir, SET_SORTS, type SetSort } from "@/lib/sorting";
import type { Region, SetRow } from "@/lib/types";

const PRODUCT_FILTERS = [
  { value: "all", label: "Any product" },
  { value: "pack", label: "Has pack price" },
  { value: "bundle", label: "Has bundle price" },
  { value: "box", label: "Has box price" },
  { value: "etb", label: "Has ETB price" },
];

export function loader({ request }: Route.LoaderArgs) {
  const sp = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>;
  const region = (sp.region ?? "all") as Region | "all";
  const sort = (sp.sort ?? "release") as SetSort;
  const dir = resolveDir(SET_SORTS[sort] ?? SET_SORTS.release, sp.dir);
  const search = sp.q ?? "";
  const product = sp.product as "pack" | "bundle" | "box" | "etb" | undefined;
  const seriesId = sp.series ?? "all";
  const view = sp.view === "list" ? "list" : "grid";

  return {
    sp,
    region,
    sort,
    dir,
    search,
    product: product ?? null,
    seriesId,
    view,
    sets: listSets({ region, sort, dir, search, hasProduct: product, seriesId }),
    allSeries: listSeries(region),
  };
}

export default function SetsPage({ loaderData }: Route.ComponentProps) {
  const { region, sort, dir, search, product, seriesId, view, sets, allSeries } = loaderData;

  // Series sections only make sense while the default chronological sort is
  // active. Any other sort is a cross-series ranking, so it renders flat.
  const grouped = sort === "release";

  const sections: { id: string; name: string; region: Region; sets: SetRow[] }[] = [];
  if (grouped) {
    const byKey = new Map<string, { id: string; name: string; region: Region; sets: SetRow[] }>();
    for (const s of sets) {
      const key = `${s.region}:${s.seriesId ?? "other"}`;
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = { id: s.seriesId ?? "other", name: s.seriesName ?? "Other", region: s.region, sets: [] };
        byKey.set(key, bucket);
        sections.push(bucket);
      }
      bucket.sets.push(s);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Toggle
          name="region"
          value={region}
          options={[
            { value: "all", label: "All" },
            { value: "en", label: "International" },
            { value: "ja", label: "Japan" },
          ]}
        />
        <SearchBox name="q" placeholder="Search sets…" value={search} />
        <Select
          name="sort"
          label="Sort"
          value={sort}
          options={Object.entries(SET_SORTS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <DirToggle name="dir" value={dir} />
        <Select name="product" label="Filter" value={product ?? "all"} options={PRODUCT_FILTERS} />
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

      <div className="mb-3 flex items-baseline gap-3 border-b border-ink-800 pb-2">
        <h1 className="tnum text-lg font-semibold tracking-tight">
          {sets.length.toLocaleString()} sets found
        </h1>
        <p className="hidden text-xs text-ink-500 sm:block">
          Prices are TCGplayer market. The bar on each tile is expected singles value per pack
          against what a pack costs.
        </p>
      </div>

      {allSeries.length > 1 ? (
        <div className="mb-5">
          <ChipRow
            name="series"
            allLabel="All series"
            value={seriesId}
            // EN and JA both have a "Scarlet & Violet" series, so the region is
            // part of the label whenever both are on screen.
            options={allSeries.map((s) => ({
              value: s.id,
              label:
                region === "all"
                  ? `${seriesLabel(s.name).title} · ${s.region === "en" ? "EN" : "JP"}`
                  : seriesLabel(s.name).title,
              count: s.count,
            }))}
          />
        </div>
      ) : null}

      {sets.length === 0 ? (
        <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
          No sets match those filters.
        </div>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
          {sets.map((s) => (
            <SetRowItem key={`${s.region}-${s.id}`} set={s} />
          ))}
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {sections.map((section) => {
            const label = seriesLabel(section.name);
            return (
              <section key={`${section.region}-${section.id}`} id={seriesAnchor(section.id)}>
                <header className="mb-3 flex flex-wrap items-baseline gap-2">
                  <span className="h-4 w-1 rounded-full bg-accent" />
                  <h2 className="text-base font-semibold tracking-tight">{label.title}</h2>
                  {label.subtitle ? (
                    <span className="text-xs text-ink-500">{label.subtitle}</span>
                  ) : null}
                  <span className="text-xs text-ink-600">
                    {section.region === "en" ? "International" : "Japan"} · {section.sets.length} sets
                  </span>
                </header>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.sets.map((s) => (
                    <SetTile key={`${s.region}-${s.id}`} set={s} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sets.map((s) => (
            <SetTile key={`${s.region}-${s.id}`} set={s} />
          ))}
        </div>
      )}
    </>
  );
}
