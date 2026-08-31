import { Link } from "react-router";
import { rarityMeta } from "@/lib/rarity";
import type { Confidence, Region } from "@/lib/types";

export function RegionBadge({ region }: { region: Region }) {
  const en = region === "en";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
        en ? "bg-en/15 text-en" : "bg-jp/15 text-jp"
      }`}
    >
      {en ? "EN" : "JP"}
    </span>
  );
}

/** Rarity chip. Colour tracks the rarity rank so the grid reads at a glance. */
export function RarityChip({ rarityKey, label }: { rarityKey: string | null; label?: string | null }) {
  const meta = rarityMeta(rarityKey);
  const tone =
    meta.rank >= 90
      ? "bg-accent/15 text-accent border-accent/30"
      : meta.rank >= 70
        ? "bg-fuchsia-400/10 text-fuchsia-300 border-fuchsia-400/25"
        : meta.rank >= 50
          ? "bg-sky-400/10 text-sky-300 border-sky-400/25"
          : "bg-ink-800 text-ink-300 border-ink-700";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {label ?? meta.label}
    </span>
  );
}

const CONFIDENCE_TONE: Record<Confidence, string> = {
  verified: "bg-good/15 text-good border-good/30",
  community: "bg-sky-400/10 text-sky-300 border-sky-400/25",
  estimated: "bg-ink-800 text-ink-400 border-ink-700",
};

const CONFIDENCE_TITLE: Record<Confidence, string> = {
  verified: "Measured from a large published sample of pack openings.",
  community: "Compiled from collector reports or a smaller published opening study.",
  estimated: "Derived from pack structure, not from a measured sample. Treat as a rough guide.",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      title={CONFIDENCE_TITLE[confidence]}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${CONFIDENCE_TONE[confidence]}`}
    >
      {confidence}
    </span>
  );
}

export function Card({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-ink-800 bg-ink-900 ${className}`}>
      {title ? (
        <header className="border-b border-ink-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-300">
          {title}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "accent" | "good";
}) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-850 px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={`tnum mt-0.5 text-lg font-semibold ${
          tone === "accent" ? "text-accent" : tone === "good" ? "text-good" : "text-ink-100"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-ink-400">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-sm text-ink-400">{children}</div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-ink-600">/</span> : null}
          {it.href ? (
            <Link to={it.href} className="transition-colors hover:text-accent">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink-200">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
