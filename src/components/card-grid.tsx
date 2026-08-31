import { Link } from "react-router";
import { RarityChip } from "./ui";
import { oneIn, usd } from "@/lib/format";
import { rarityMeta } from "@/lib/rarity";
import type { CardRow, PullRateEntry } from "@/lib/types";
import { cardOdds, type SetRarityCounts } from "@/lib/pullrates";

/** Coloured dot standing in for the rarity symbol printed on the card. */
function RarityDot({ rarityKey }: { rarityKey: string | null }) {
  const rank = rarityMeta(rarityKey).rank;
  const color =
    rank >= 90 ? "#ffcb05" : rank >= 70 ? "#cc5de8" : rank >= 50 ? "#4dabf7" : rank >= 30 ? "#8b93a5" : "#4a5163";
  return (
    <span
      title={rarityMeta(rarityKey).label}
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Image-first card grid. The card art is the primary object; number, rarity and
 * price sit underneath it the way a binder page reads.
 */
export function CardGrid({
  cards,
  entry,
  counts,
  totalInSet,
}: {
  cards: CardRow[];
  entry: PullRateEntry;
  counts: SetRarityCounts;
  totalInSet?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((c) => {
        const odds = cardOdds(entry, c.rarityKey, counts);
        return (
          <Link key={c.id} to={`/cards/${encodeURIComponent(c.id)}`} className="group flex flex-col">
            <div className="relative overflow-hidden rounded-lg bg-ink-850 shadow-sm ring-1 ring-ink-800 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:ring-ink-600">
              {c.image ? (
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="aspect-[245/342] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[245/342] place-items-center px-2 text-center text-[10px] text-ink-600">
                  {c.name}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
              <RarityDot rarityKey={c.rarityKey} />
              <span className="tnum truncate text-[11px] text-ink-400">
                {c.localId}
                {totalInSet ? <span className="text-ink-600">/{totalInSet}</span> : null}
              </span>
              <span className="tnum ml-auto text-xs font-semibold text-accent">
                {c.marketPrice != null ? usd(c.marketPrice, { compact: true }) : "—"}
              </span>
            </div>
            <div className="truncate px-0.5 text-[11px] text-ink-300 transition-colors group-hover:text-ink-100">
              {c.name}
            </div>
            <div className="tnum px-0.5 text-[10px] text-ink-600">
              {odds ? `${oneIn(odds.perPack)} packs` : "odds unknown"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function CardTable({
  cards,
  entry,
  counts,
  showSet,
}: {
  cards: CardRow[];
  entry?: PullRateEntry;
  counts?: SetRarityCounts;
  showSet?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-800 bg-ink-900">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-wider text-ink-400">
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Card</th>
            {showSet ? <th className="px-3 py-2.5 font-medium">Set</th> : null}
            <th className="px-3 py-2.5 font-medium">Rarity</th>
            <th className="px-3 py-2.5 text-right font-medium">Market</th>
            <th className="px-3 py-2.5 text-right font-medium">Pull odds</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => {
            const odds = entry && counts ? cardOdds(entry, c.rarityKey, counts) : null;
            return (
              <tr key={c.id} className="group border-b border-ink-850 last:border-0 hover:bg-ink-850">
                <td className="tnum px-3 py-1.5 text-xs text-ink-500">{c.localId}</td>
                <td className="px-3 py-1.5">
                  <Link
                    to={`/cards/${encodeURIComponent(c.id)}`}
                    className="font-medium transition-colors group-hover:text-accent"
                  >
                    {c.name}
                  </Link>
                </td>
                {showSet ? (
                  <td className="px-3 py-1.5">
                    <Link to={`/sets/${encodeURIComponent(c.setId)}`} className="text-xs text-ink-400 hover:text-accent">
                      {c.setId}
                    </Link>
                  </td>
                ) : null}
                <td className="px-3 py-1.5">
                  <RarityChip rarityKey={c.rarityKey} label={c.rarity} />
                </td>
                <td className="tnum px-3 py-1.5 text-right font-medium">{usd(c.marketPrice)}</td>
                <td className="tnum px-3 py-1.5 text-right text-xs text-ink-400">
                  {odds ? oneIn(odds.perPack) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
