import { CardTable } from "@/components/card-grid";
import { DirToggle, Pager, SearchBox, Select, Toggle } from "@/components/controls";
import { RARITIES } from "@/lib/rarity";
import { CARD_SORTS, listCards, resolveDir, type CardSort } from "@/lib/queries";
import type { Region } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AllCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const region = (sp.region ?? "all") as Region | "all";
  const sort = (sp.sort ?? "price") as CardSort;
  const dir = resolveDir(CARD_SORTS[sort] ?? CARD_SORTS.price, sp.dir);
  const rarityKey = sp.rarity ?? "all";
  const search = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { cards, total } = listCards({
    region,
    sort,
    dir,
    rarityKey,
    search,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">All cards</h1>
        <p className="mt-1 text-sm text-ink-400">
          Every card across every English and Japanese expansion, sortable by price and rarity.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Toggle
          name="region"
          value={region}
          options={[
            { value: "all", label: "All" },
            { value: "en", label: "English" },
            { value: "ja", label: "Japanese" },
          ]}
        />
        <Select
          name="rarity"
          label="Rarity"
          value={rarityKey}
          options={[
            { value: "all", label: "All rarities" },
            ...[...RARITIES]
              .filter((r) => r.key !== "unknown" && r.key !== "promo")
              .sort((a, b) => b.rank - a.rank)
              .map((r) => ({ value: r.key, label: r.label })),
          ]}
        />
        <Select
          name="sort"
          label="Sort"
          value={sort}
          options={Object.entries(CARD_SORTS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <DirToggle name="dir" value={dir} />
        <div className="ml-auto">
          <SearchBox name="q" placeholder="Search cards…" value={search} />
        </div>
      </div>

      <p className="mb-2 text-xs text-ink-500">{total.toLocaleString()} cards</p>
      {cards.length === 0 ? (
        <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-12 text-center text-sm text-ink-400">
          No cards match those filters.
        </div>
      ) : (
        <CardTable cards={cards} showSet />
      )}
      <Pager page={page} pageCount={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
