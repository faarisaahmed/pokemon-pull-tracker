import { useEffect, useState } from "react";
import { usd } from "@/lib/format";

interface Grade {
  grade: string;
  salesCount: number;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  lastSaleDate: string | null;
}

interface Payload {
  status: "ok" | "empty" | "blocked" | "error";
  note?: string | null;
  fetchedAt: string;
  grades: Grade[];
  searchUrl: string;
  cached?: boolean;
}

export function PsaPanel({ cardId, rawPrice }: { cardId: string; rawPrice: number | null }) {
  const [state, setState] = useState<{ for: string; data: Payload | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/psa/${encodeURIComponent(cardId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: Payload) => setState({ for: cardId, data }))
      .catch((err) => {
        if (err?.name !== "AbortError") setState({ for: cardId, data: null });
      });
    return () => controller.abort();
  }, [cardId]);

  // Anything for a previous card is stale, so it reads as still loading.
  const loading = state?.for !== cardId;
  const data = loading ? null : state!.data;

  if (loading) {
    return (
      <div className="space-y-1.5 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 animate-pulse rounded bg-ink-850" />
        ))}
        <p className="pt-1 text-[11px] text-ink-500">Checking eBay sold listings…</p>
      </div>
    );
  }

  if (!data) {
    return <p className="px-4 py-5 text-sm text-ink-500">Could not reach the grading price service.</p>;
  }

  if (data.status !== "ok" || data.grades.length === 0) {
    return (
      <div className="px-4 py-5 text-sm">
        <p className="text-ink-400">
          {data.status === "blocked"
            ? "No graded comps available — eBay refused the request."
            : "No PSA-graded sold listings found for this card."}
        </p>
        {data.note ? <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{data.note}</p> : null}
        <a
          href={data.searchUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-block text-xs text-accent underline"
        >
          Search eBay sold listings yourself →
        </a>
      </div>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-wider text-ink-400">
            <th className="px-4 py-2 font-medium">Grade</th>
            <th className="px-4 py-2 text-right font-medium">Avg sold</th>
            <th className="px-4 py-2 text-right font-medium">Range</th>
            <th className="px-4 py-2 text-right font-medium">Sales</th>
            <th className="px-4 py-2 text-right font-medium">vs raw</th>
          </tr>
        </thead>
        <tbody>
          {data.grades.map((g) => {
            const mult = rawPrice && rawPrice > 0 ? g.avgPrice / rawPrice : null;
            return (
              <tr key={g.grade} className="border-b border-ink-850 last:border-0">
                <td className="px-4 py-1.5 font-semibold text-accent">PSA {g.grade}</td>
                <td className="tnum px-4 py-1.5 text-right font-medium">{usd(g.avgPrice)}</td>
                <td className="tnum px-4 py-1.5 text-right text-xs text-ink-400">
                  {usd(g.lowPrice)} – {usd(g.highPrice)}
                </td>
                <td className="tnum px-4 py-1.5 text-right text-xs text-ink-400">{g.salesCount}</td>
                <td className="tnum px-4 py-1.5 text-right text-xs">
                  {mult ? <span className="text-good">{mult.toFixed(1)}×</span> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <footer className="flex flex-wrap items-center gap-2 border-t border-ink-800 px-4 py-2 text-[11px] text-ink-500">
        <span>
          From eBay sold listings{data.cached ? " (cached)" : ""} ·{" "}
          {new Date(data.fetchedAt).toLocaleDateString()}
        </span>
        <a href={data.searchUrl} target="_blank" rel="noreferrer" className="underline hover:text-accent">
          view on eBay
        </a>
      </footer>
    </div>
  );
}
