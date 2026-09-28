import { useMemo, useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/open-packs";
import { Breadcrumbs, RarityChip } from "@/components/ui";
import { usd } from "@/lib/format";
import { boxUnit, entryFor } from "@/lib/pullrates";
import { getDb } from "@/lib/db.server";
import { getSet } from "@/lib/queries.server";
import { makePackOpener, type SimCard, type SimPack } from "@/lib/simulate";
import { STANDALONE_SUBSETS } from "@/lib/subsets";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `Open ${loaderData.set.name} packs — Ripwise` : "Open packs — Ripwise" },
];

export function loader({ params }: Route.LoaderArgs) {
  const id = decodeURIComponent(params.setId);
  // A standalone subset has no packs; open its parent's instead.
  if (STANDALONE_SUBSETS[id]) throw redirect(`/sets/${encodeURIComponent(STANDALONE_SUBSETS[id])}/open`);
  const set = getSet(id);
  if (!set) throw new Response("Set not found", { status: 404 });

  const entry = entryFor(set.region, set.id, set.releaseDate);
  const cards = (
    getDb()
      .prepare(
        `SELECT id, name, image, rarity, rarity_key, rarity_rank, market_price FROM cards
         WHERE set_id = ? AND rarity_key IS NOT NULL AND rarity_key != 'unknown'`,
      )
      .all(set.id) as {
      id: string;
      name: string;
      image: string | null;
      rarity: string | null;
      rarity_key: string;
      rarity_rank: number;
      market_price: number | null;
    }[]
  ).map(
    (c): SimCard => ({
      id: c.id,
      name: c.name,
      image: c.image,
      rarityKey: c.rarity_key,
      rarity: c.rarity,
      rank: c.rarity_rank,
      price: c.market_price,
    }),
  );
  return { set, entry, cards, packPrice: set.packPrice ?? set.bestPackPrice };
}

interface Session {
  packs: number;
  value: number;
  godPacks: number;
  /** The most recent batch, newest last. */
  last: SimPack[];
  /** Top pulls this session, most valuable first. */
  best: SimCard[];
}

const EMPTY: Session = { packs: 0, value: 0, godPacks: 0, last: [], best: [] };

export default function OpenPacksPage({ loaderData }: Route.ComponentProps) {
  const { set, entry, cards, packPrice } = loaderData;
  const box = boxUnit(entry);
  const openPack = useMemo(() => makePackOpener(entry, cards), [entry, cards]);
  const [session, setSession] = useState<Session>(EMPTY);

  const open = (n: number) => {
    const batch = Array.from({ length: n }, () => openPack());
    setSession((s) => {
      const pulled = batch.flatMap((p) => p.cards).filter((c) => c.price != null && c.price >= 1);
      const best = [...s.best, ...pulled]
        .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        .slice(0, 12);
      return {
        packs: s.packs + n,
        value: s.value + batch.reduce((v, p) => v + p.value, 0),
        godPacks: s.godPacks + batch.filter((p) => p.godPack).length,
        last: batch,
        best,
      };
    });
  };

  const spent = packPrice != null ? session.packs * packPrice : null;
  const net = spent != null ? session.value - spent : null;
  const single = session.last.length === 1 ? session.last[0] : null;
  const batchHits = session.last
    .flatMap((p) => p.cards)
    .filter((c) => c.rank >= 50)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/", label: "Sets" },
          { href: `/sets/${encodeURIComponent(set.id)}`, label: set.name },
          { label: "Open packs" },
        ]}
      />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Open {set.name} packs</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-400">
          Rip virtual packs built from this set&rsquo;s published pull rates and today&rsquo;s card
          prices, and see whether you would have come out ahead. Nothing is saved; reload to start
          over.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => open(1)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Open a pack
        </button>
        <button
          onClick={() => open(10)}
          className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 transition-colors hover:border-accent"
        >
          Open 10
        </button>
        <button
          onClick={() => open(entry.packsPerBox)}
          className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 transition-colors hover:border-accent"
        >
          Open a {box.short} ({entry.packsPerBox})
        </button>
        {session.packs ? (
          <button
            onClick={() => setSession(EMPTY)}
            className="ml-auto text-xs text-ink-500 underline hover:text-accent"
          >
            Reset
          </button>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Packs opened", value: session.packs.toLocaleString(), sub: session.godPacks ? `${session.godPacks} god pack${session.godPacks > 1 ? "s" : ""}!` : undefined },
          { label: "Spent", value: usd(spent), sub: packPrice != null ? `${usd(packPrice)} a pack` : "no pack price" },
          { label: "Pulled", value: usd(session.value), sub: "market value of every card" },
          {
            label: "Net",
            value: net == null ? "—" : `${net >= 0 ? "+" : "−"}${usd(Math.abs(net))}`,
            sub: net == null || !session.packs ? undefined : net >= 0 ? "you would be up" : "you would be down",
            tone: net == null || !session.packs ? "" : net >= 0 ? "text-good" : "text-rose-400",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">{s.label}</div>
            <div className={`tnum text-lg font-semibold ${s.tone ?? "text-ink-100"}`}>{s.value}</div>
            {s.sub ? <div className="text-[10px] text-ink-500">{s.sub}</div> : null}
          </div>
        ))}
      </div>

      {session.packs === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900 px-4 py-16 text-center text-sm text-ink-400">
          Nothing opened yet.
        </div>
      ) : single ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-200">
            {single.godPack ? "GOD PACK! " : ""}Your pack · {usd(single.value)}
          </h2>
          <CardRow cards={single.cards} highlightFrom={50} />
        </section>
      ) : (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-200">
            Hits from those {session.last.length} packs · {usd(session.last.reduce((v, p) => v + p.value, 0))}
          </h2>
          {batchHits.length ? (
            <CardRow cards={batchHits} highlightFrom={50} />
          ) : (
            <p className="text-sm text-ink-400">No hits at all. It happens.</p>
          )}
        </section>
      )}

      {session.best.length ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-200">Best pulls this session</h2>
          <CardRow cards={session.best} highlightFrom={Infinity} />
        </section>
      ) : null}

      <p className="max-w-3xl text-[11px] leading-relaxed text-ink-500">
        Each pack draws its guaranteed slots from the set&rsquo;s commons, uncommons and rares, then
        rolls the hit tiers at their per-pack rates ({entry.scope === "set" ? "measured for this set" : "era-wide estimates"}
        {" "}from {entry.source.name}). A hit replaces the rare, as in a real pack. Values are
        TCGplayer market prices, which bulk rarely fetches, so the &ldquo;Pulled&rdquo; figure is
        optimistic. Real print runs are not perfectly random; treat this as a feel for the odds, not
        a forecast.{" "}
        <Link to={`/sets/${encodeURIComponent(set.id)}`} className="underline hover:text-accent">
          Back to {set.name}
        </Link>
      </p>
    </>
  );
}

function CardRow({ cards, highlightFrom }: { cards: SimCard[]; highlightFrom: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {cards.map((c, i) => (
        <Link key={`${c.id}-${i}`} to={`/cards/${encodeURIComponent(c.id)}`} className="group flex flex-col">
          <div
            className={`overflow-hidden rounded-md bg-ink-850 ring-1 transition-transform group-hover:-translate-y-0.5 ${
              c.rank >= highlightFrom ? "ring-2 ring-accent shadow-[0_0_18px_-4px_var(--color-accent)]" : "ring-ink-800"
            }`}
          >
            {c.image ? (
              <img src={c.image} alt={c.name} loading="lazy" className="aspect-[245/342] w-full object-cover" />
            ) : (
              <div className="grid aspect-[245/342] place-items-center px-1 text-center text-[9px] text-ink-600">
                {c.name}
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1 px-0.5">
            <span className="truncate text-[10px] text-ink-400">{c.name}</span>
            <span className="tnum ml-auto text-[10px] font-semibold text-accent">
              {c.price != null ? usd(c.price, { compact: true }) : "—"}
            </span>
          </div>
          {c.rank >= 50 ? (
            <div className="mt-0.5 px-0.5">
              <RarityChip rarityKey={c.rarityKey} label={c.rarity} />
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
