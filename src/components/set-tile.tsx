import Link from "next/link";
import { shortDate, usd } from "@/lib/format";
import { RegionBadge } from "./ui";
import type { SetRow } from "@/lib/types";

/**
 * A set tile. Where TCG Collector shows collection progress, this shows the
 * thing the app is actually for: what a pack costs against what the pull rates
 * say a pack holds.
 */
export function SetTile({ set }: { set: SetRow }) {
  const ratio =
    set.expectedPackValue != null && set.packPrice ? set.expectedPackValue / set.packPrice : null;
  const barPct = ratio == null ? 0 : Math.min(100, ratio * 100);

  return (
    <Link
      href={`/sets/${encodeURIComponent(set.id)}`}
      className="group flex flex-col rounded-xl border border-ink-800 bg-ink-900 p-3 transition-colors hover:border-ink-600"
    >
      <div className="flex items-start gap-2">
        <span className="mt-px shrink-0 rounded bg-ink-800 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-ink-300">
          {set.abbreviation ?? set.id.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-100 transition-colors group-hover:text-accent">
            {set.name}
          </span>
          {set.localName ? (
            <span className="block truncate text-[11px] text-ink-500">{set.localName}</span>
          ) : null}
        </span>
        <RegionBadge region={set.region} />
      </div>

      <div className="my-3 flex items-center gap-3">
        <div className="grid h-14 flex-1 place-items-center overflow-hidden">
          {set.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={set.logo} alt="" loading="lazy" className="max-h-14 w-auto max-w-full object-contain" />
          ) : set.tileImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={set.tileImage}
              alt=""
              loading="lazy"
              className="h-14 w-auto rounded-sm object-contain opacity-90"
            />
          ) : (
            <span className="text-2xl font-black tracking-tight text-ink-700">
              {set.abbreviation ?? set.id.toUpperCase()}
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] text-ink-400">{shortDate(set.releaseDate)}</div>
          <div className="tnum text-sm font-semibold text-accent">
            {usd(set.setValue, { compact: true })}
          </div>
          <div className="text-[10px] text-ink-500">set value</div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="tnum text-ink-300">
            {set.packPrice != null ? `${usd(set.packPrice)} / pack` : "no pack listed"}
          </span>
          <span className="tnum text-ink-400">
            {ratio != null ? `${ratio.toFixed(2)}× EV` : "—"}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full ${ratio != null && ratio >= 1 ? "bg-good" : "bg-accent-dim"}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <div className="tnum mt-1.5 flex justify-between text-[10px] text-ink-500">
          <span>{set.cardCountTotal} cards</span>
          <span>{set.boxPrice != null ? `${usd(set.boxPrice, { compact: true })} box` : ""}</span>
        </div>
      </div>
    </Link>
  );
}

/** Compact one-line variant for the list view. */
export function SetRowItem({ set }: { set: SetRow }) {
  const ratio =
    set.expectedPackValue != null && set.packPrice ? set.expectedPackValue / set.packPrice : null;
  return (
    <Link
      href={`/sets/${encodeURIComponent(set.id)}`}
      className="group flex items-center gap-3 border-b border-ink-850 px-3 py-2 last:border-0 hover:bg-ink-850"
    >
      <span className="w-12 shrink-0 rounded bg-ink-800 px-1.5 py-0.5 text-center text-[9px] font-bold tracking-wider text-ink-300">
        {set.abbreviation ?? set.id.toUpperCase()}
      </span>
      <RegionBadge region={set.region} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm transition-colors group-hover:text-accent">{set.name}</span>
        {set.localName ? (
          <span className="block truncate text-[11px] text-ink-500">{set.localName}</span>
        ) : null}
      </span>
      <span className="tnum hidden w-20 shrink-0 text-right text-xs text-ink-400 sm:block">
        {shortDate(set.releaseDate)}
      </span>
      <span className="tnum w-12 shrink-0 text-right text-xs text-ink-400">{set.cardCountTotal}</span>
      <span className="tnum w-16 shrink-0 text-right text-sm">{usd(set.packPrice)}</span>
      <span className="tnum hidden w-16 shrink-0 text-right text-xs text-ink-300 sm:block">
        {usd(set.boxPrice, { compact: true })}
      </span>
      <span className="tnum w-14 shrink-0 text-right text-xs">
        {ratio != null ? (
          <span className={ratio >= 1 ? "text-good" : "text-ink-400"}>{ratio.toFixed(2)}×</span>
        ) : (
          "—"
        )}
      </span>
      <span className="tnum w-16 shrink-0 text-right text-sm font-medium text-accent">
        {usd(set.setValue, { compact: true })}
      </span>
    </Link>
  );
}
