import { Link } from "react-router";
import type { Route } from "./+types/china";
import { ConfidenceBadge } from "@/components/ui";
import { formatOdds } from "@/lib/pullrates";
import { ZH_PRODUCTS, perPack, type ZhFormat, type ZhTier } from "@/lib/pullrates/zh";

export const meta: Route.MetaFunction = () => [
  { title: "Simplified Chinese pull rates — Ripwise" },
  { name: "description", content: "Official odds for mainland China Pokémon TCG boosters: expansions, 151, 30th Celebration and gem packs." },
];

/** Hits per box, when the box size is known. */
function perBox(tier: ZhTier, f: ZhFormat): string {
  if (!f.packsPerBox) return "—";
  const n = perPack(tier, f) * f.packsPerBox;
  return n >= 10 ? Math.round(n).toString() : n.toFixed(n >= 1 ? 1 : 2);
}

/** A pack can hold several mid-tier cards; say "per pack" rather than "1 in 0.8". */
function oddsLabel(p: number): string {
  return p >= 1 ? `${p.toFixed(1)} per pack` : formatOdds(p);
}

export default function ChinaPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <div className="text-xs text-ink-500">
          <Link to="/" className="hover:text-accent">
            Sets
          </Link>{" "}
          / Simplified Chinese
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Simplified Chinese pull rates</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-400">
          Mainland China boosters are their own sets, remixed from Japanese cards and renumbered. Each product is
          printed with an official odds table giving every rarity group's share of the print run. Below, that share
          is turned into odds per pack. The tables group rarities together (SR, SAR and UR share one line), so these
          are group odds. There are no open card lists or prices for these sets, so there are no set pages or
          values here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ZH_PRODUCTS.map((p) => (
          <section key={p.name} className="rounded-xl border border-ink-800 bg-ink-900">
            <header className="flex items-start gap-2 border-b border-ink-800 px-4 py-3">
              <div className="min-w-0">
                <div className="text-base font-semibold" lang="zh-CN">
                  {p.name}
                </div>
                <div className="text-[11px] text-ink-500">
                  {p.kind}
                  {p.english ? ` · ${p.english}` : ""}
                </div>
              </div>
              <span className="ml-auto">
                <ConfidenceBadge confidence={p.confidence} />
              </span>
            </header>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-1.5 font-medium">Pack</th>
                  <th className="px-2 py-1.5 font-medium">Rarity group</th>
                  <th className="px-2 py-1.5 text-right font-medium">Odds</th>
                  <th className="px-4 py-1.5 text-right font-medium">Per box</th>
                </tr>
              </thead>
              <tbody>
                {p.formats.map((f) =>
                  f.tiers.map((t, i) => (
                    <tr key={`${f.cardsPerPack}-${t.label}`} className={i === 0 ? "border-t border-ink-850" : ""}>
                      <td className="px-4 py-1.5 align-top text-ink-400">
                        {i === 0 ? (
                          <>
                            {f.cardsPerPack} cards · {f.price}
                            {f.packsPerBox ? <span className="block text-[10px] text-ink-600">{f.packsPerBox} packs / box</span> : null}
                          </>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-ink-200">{t.label}</td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-100">{oddsLabel(perPack(t, f))}</td>
                      <td className="tnum px-4 py-1.5 text-right text-ink-400">{perBox(t, f)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
            <footer className="border-t border-ink-800 px-4 py-2 text-[11px] text-ink-500">
              {p.note ? <p className="mb-1">{p.note}</p> : null}
              Source:{" "}
              {p.sources.map((s, i) => (
                <span key={s.url}>
                  {i ? ", " : ""}
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-accent">
                    {s.name}
                  </a>
                </span>
              ))}
            </footer>
          </section>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-ink-500">
        Odds per pack are the group's share of the print run times the cards in a pack; a 1% share in a 5-card pack
        is 1 in 20. Real boxes vary around these.
      </p>
    </div>
  );
}
