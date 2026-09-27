import { Link } from "react-router";
import type { Route } from "./+types/master";
import { SearchBox, Select, Toggle } from "@/components/controls";
import { RarityChip } from "@/components/ui";
import { shortDate, usd } from "@/lib/format";
import {
  listSpecies,
  masterSet,
  resolveSpecies,
  type MasterCard,
  type MasterFilters,
} from "@/lib/master-set.server";
import type { Region } from "@/lib/types";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  {
    title: loaderData?.species
      ? `${loaderData.species.name} master set — Pull Tracker`
      : "Master set builder — Pull Tracker",
  },
];

const SINCE_OPTIONS = [
  { value: "all", label: "Every era" },
  { value: "2025", label: "2025 on — Mega Evolution" },
  { value: "2023", label: "2023 on — Scarlet & Violet" },
  { value: "2020", label: "2020 on — Sword & Shield" },
  { value: "2017", label: "2017 on — Sun & Moon" },
  { value: "2014", label: "2014 on — XY" },
  { value: "2011", label: "2011 on — Black & White" },
  { value: "2007", label: "2007 on — Diamond & Pearl" },
  { value: "2003", label: "2003 on — EX" },
];

const MAX_PACK_OPTIONS = [
  { value: "all", label: "Any pack price" },
  { value: "5", label: "Packs under $5" },
  { value: "10", label: "Packs under $10" },
  { value: "20", label: "Packs under $20" },
  { value: "50", label: "Packs under $50" },
];

const MAX_CARD_OPTIONS = [
  { value: "all", label: "Any card price" },
  { value: "1", label: "Cards under $1" },
  { value: "5", label: "Cards under $5" },
  { value: "20", label: "Cards under $20" },
  { value: "50", label: "Cards under $50" },
  { value: "100", label: "Cards under $100" },
  { value: "500", label: "Cards under $500" },
];

const SORTS = [
  { value: "release", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "price-asc", label: "Price: low to high" },
];

const POPULAR = ["Charizard", "Pikachu", "Eevee", "Umbreon", "Mewtwo", "Gengar", "Rayquaza", "Lugia", "Gardevoir", "Garchomp"];

const positive = (v: string | undefined) => (Number(v) > 0 ? Number(v) : null);

export function loader({ request }: Route.LoaderArgs) {
  const sp = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string>;
  const query = sp.p ?? "";
  const filters: MasterFilters = {
    region: sp.region === "ja" ? "ja" : "en",
    repeats: sp.repeats === "one" ? "one" : "all",
    since: positive(sp.since),
    maxPack: positive(sp.max),
    maxCard: positive(sp.card),
    reverse: sp.reverse !== "skip",
    sort: (SORTS.some((s) => s.value === sp.sort) ? sp.sort : "release") as MasterFilters["sort"],
  };

  const species = listSpecies();
  const { match, alternatives } = resolveSpecies(query, species);
  const result = match ? masterSet(match.dexId, filters) : null;

  return {
    query,
    species: match,
    alternatives,
    names: species.map((s) => s.name),
    result,
    filters: {
      region: filters.region as Region,
      repeats: filters.repeats,
      since: filters.since == null ? "all" : String(filters.since),
      maxPack: filters.maxPack == null ? "all" : String(filters.maxPack),
      maxCard: filters.maxCard == null ? "all" : String(filters.maxCard),
      reverse: filters.reverse ? "count" : "skip",
      sort: filters.sort,
    },
  };
}

export default function MasterPage({ loaderData }: Route.ComponentProps) {
  const { query, species, alternatives, names, result, filters } = loaderData;

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Master set builder</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-400">
          Search a Pokémon to see every card of it — every set, every rarity, every form — with
          today&rsquo;s prices. Then trim it to the master set you actually want: skip straight
          reprints, leave out old eras, or cap what you will pay for a pack or a single.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox name="p" placeholder="Search a Pokémon, e.g. Charizard" value={query} list="species-names" />
        <datalist id="species-names">
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Toggle
          name="region"
          value={filters.region}
          options={[
            { value: "en", label: "English" },
            { value: "ja", label: "Japanese" },
          ]}
        />
      </div>

      {!species ? (
        <EmptyState query={query} />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Toggle
              name="repeats"
              value={filters.repeats}
              options={[
                { value: "all", label: "Every print" },
                { value: "one", label: "One of each reprint" },
              ]}
            />
            <Toggle
              name="reverse"
              value={filters.reverse}
              options={[
                { value: "count", label: "Count reverse holos" },
                { value: "skip", label: "Skip reverse holos" },
              ]}
            />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select name="since" label="Released" value={filters.since} options={SINCE_OPTIONS} />
            <Select name="max" label="Pack price" value={filters.maxPack} options={MAX_PACK_OPTIONS} />
            <Select name="card" label="Card price" value={filters.maxCard} options={MAX_CARD_OPTIONS} />
            <Select name="sort" label="Order" value={filters.sort} options={SORTS} />
          </div>

          {alternatives.length ? (
            <p className="mb-3 text-xs text-ink-400">
              Showing <strong className="text-ink-200">{species.name}</strong>. Also matches:{" "}
              {alternatives.map((a, i) => (
                <span key={a.dexId}>
                  {i ? ", " : ""}
                  <Link
                    to={`?p=${encodeURIComponent(a.name)}${filters.region === "ja" ? "&region=ja" : ""}`}
                    className="text-accent underline"
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}

          {result ? <Results species={species.name} result={result} sort={filters.sort} /> : null}
        </>
      )}
    </>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-10 text-center">
      <p className="text-sm text-ink-300">
        {query ? `No Pokémon matches "${query}".` : "Pick a Pokémon to start."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {POPULAR.map((name) => (
          <Link
            key={name}
            to={`?p=${encodeURIComponent(name)}`}
            className="rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-xs text-ink-300 transition-colors hover:border-accent hover:text-accent"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Results({
  species,
  result,
  sort,
}: {
  species: string;
  result: NonNullable<Route.ComponentProps["loaderData"]["result"]>;
  sort: string;
}) {
  const { cards, totals } = result;
  const grouped = sort === "release" || sort === "newest";

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Cards", value: totals.cards.toLocaleString(), sub: `across ${totals.sets} sets` },
          {
            label: "Market cost",
            value: usd(totals.value),
            sub: totals.unpriced ? `${totals.unpriced} with no price yet` : "every card priced",
          },
          {
            label: "Reverse holos",
            value: totals.reverseCount ? `+${totals.reverseCount}` : "—",
            sub: totals.reverseCount ? `+${usd(totals.reverseValue)}` : "not counted",
          },
          {
            label: "Total",
            value: usd(totals.value + totals.reverseValue),
            sub: `${(totals.cards + totals.reverseCount).toLocaleString()} cards to collect`,
            accent: true,
          },
          {
            label: "Left out",
            value: (totals.hiddenRepeats + totals.filteredOut).toLocaleString(),
            sub: `${totals.hiddenRepeats} reprints · ${totals.filteredOut} by filters`,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">{s.label}</div>
            <div className={`tnum text-base font-semibold ${s.accent ? "text-accent" : "text-ink-100"}`}>
              {s.value}
            </div>
            <div className="truncate text-[10px] text-ink-500">{s.sub}</div>
          </div>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
          No {species} cards are left with these filters — try an earlier era or a higher price cap.
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {groupBySet(cards).map((g) => (
            <section key={g.setId}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-ink-800 pb-1.5">
                <Link
                  to={`/sets/${encodeURIComponent(g.setId)}`}
                  className="font-semibold transition-colors hover:text-accent"
                >
                  {g.setName}
                </Link>
                <span className="tnum text-[11px] text-ink-500">{shortDate(g.releaseDate)}</span>
                <span className="tnum text-[11px] text-ink-500">
                  {g.cards.length} card{g.cards.length === 1 ? "" : "s"}
                </span>
                <span className="tnum text-[11px] text-ink-500">
                  {g.packPrice != null ? `${usd(g.packPrice)} / pack` : "no loose pack price"}
                </span>
                <span className="tnum ml-auto text-xs font-semibold text-accent">
                  {usd(g.cards.reduce((s, c) => s + (c.marketPrice ?? 0) + (c.reversePrice ?? 0), 0))}
                </span>
              </div>
              <CardTiles cards={g.cards} showSet={false} />
            </section>
          ))}
        </div>
      ) : (
        <CardTiles cards={cards} showSet />
      )}

      <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-ink-500">
        A <strong className="text-ink-400">reprint</strong> is the same card in another set: same
        name, HP, artwork, rarity, attacks and abilities (like Cynthia&rsquo;s Garchomp ex in
        Destined Rivals and Ascended Heroes). &ldquo;One of each&rdquo; keeps the set where it is
        cheapest and notes the others; a holo and non-holo in the same set are always both kept.
        Prices are TCGplayer market prices. Sets with no loose-pack price are left out while a pack
        cap is on. This page does not track your collection.
      </p>
    </>
  );
}

function groupBySet(cards: MasterCard[]) {
  const out: {
    setId: string;
    setName: string;
    releaseDate: string | null;
    packPrice: number | null;
    cards: MasterCard[];
  }[] = [];
  for (const c of cards) {
    const last = out[out.length - 1];
    if (last?.setId === c.setId) last.cards.push(c);
    else
      out.push({
        setId: c.setId,
        setName: c.setName,
        releaseDate: c.releaseDate,
        packPrice: c.packPrice,
        cards: [c],
      });
  }
  return out;
}

function CardTiles({ cards, showSet }: { cards: MasterCard[]; showSet: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
      {cards.map((c) => (
        <Link key={c.id} to={`/cards/${encodeURIComponent(c.id)}`} className="group flex flex-col">
          <div className="relative overflow-hidden rounded-lg bg-ink-850 shadow-sm ring-1 ring-ink-800 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:ring-ink-600">
            {c.image ? (
              <img src={c.image} alt={c.name} loading="lazy" className="aspect-[245/342] w-full object-cover" />
            ) : (
              <div className="grid aspect-[245/342] place-items-center px-2 text-center text-[10px] text-ink-600">
                {c.name}
              </div>
            )}
            {c.printCount > 1 ? (
              <span
                title={`Printed in ${c.printCount} sets`}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white"
              >
                ×{c.printCount} sets
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
            <span className="tnum truncate text-[11px] text-ink-400">
              {showSet && c.setAbbr ? `${c.setAbbr} ` : ""}
              {c.localId}
              {c.cardCountOfficial ? <span className="text-ink-600">/{c.cardCountOfficial}</span> : null}
            </span>
            <span className="tnum ml-auto text-xs font-semibold text-accent">
              {c.marketPrice != null ? usd(c.marketPrice, { compact: true }) : "—"}
            </span>
          </div>
          <div className="truncate px-0.5 text-[11px] text-ink-300 transition-colors group-hover:text-ink-100">
            {c.name}
          </div>
          <div className="mt-0.5 px-0.5">
            <RarityChip rarityKey={c.rarityKey} label={c.rarity} />
          </div>
          {c.reversePrice != null ? (
            <div className="tnum px-0.5 text-[10px] text-ink-500">
              + reverse holo {usd(c.reversePrice, { compact: true })}
            </div>
          ) : null}
          {c.alsoIn.length ? (
            <div className="truncate px-0.5 text-[10px] text-ink-500" title={c.alsoIn.map((a) => a.setName).join(", ")}>
              Also in {c.alsoIn.map((a) => a.setAbbr ?? a.setName).join(", ")}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
