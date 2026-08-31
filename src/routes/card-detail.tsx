import { Link } from "react-router";
import type { Route } from "./+types/card-detail";
import { Breadcrumbs, Card, ConfidenceBadge, RarityChip, RegionBadge } from "@/components/ui";
import { AttackList, EnergyPip, Field } from "@/components/card-detail-body";
import { PsaPanel } from "@/components/psa-panel";
import { fullDate, oneIn, pct, usd } from "@/lib/format";
import { rarityMeta } from "@/lib/rarity";
import { fetchCardDetail } from "@/lib/tcgdex-live.server";
import { formatLegality } from "@/lib/tcgdex";
import { cardPrices, getCard, getSet, listCards, oddsForCard } from "@/lib/queries.server";

export async function loader({ params }: Route.LoaderArgs) {
  const card = getCard(decodeURIComponent(params.cardId));
  if (!card) throw new Response("Card not found", { status: 404 });
  const set = getSet(card.setId);
  if (!set) throw new Response("Set not found", { status: 404 });

  const [detail, prices] = await Promise.all([
    fetchCardDetail(card.region, card.id),
    Promise.resolve(cardPrices(card.id)),
  ]);
  const { entry, odds } = oddsForCard(card, set);

  const siblings = listCards({
    setId: set.id,
    rarityKey: card.rarityKey ?? "all",
    sort: "price",
    limit: 13,
  }).cards.filter((c) => c.id !== card.id);

  return { card, set, detail, prices, entry, odds, siblings };
}

export default function CardPage({ loaderData }: Route.ComponentProps) {
  const { card, set, detail, prices, entry, odds, siblings } = loaderData;
  const meta = rarityMeta(card.rarityKey);
  const costToPull = odds && set.packPrice ? odds.packsPerCopy * set.packPrice : null;
  const primaryType = detail?.types?.[0];

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/", label: "Sets" },
          { href: `/sets/${encodeURIComponent(set.id)}`, label: set.name },
          { label: `${card.localId} ${card.name}` },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ------------------------------------------------------- card art */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl bg-ink-850 ring-1 ring-ink-800">
            {card.image ? (
              <img src={card.image} alt={card.name} className="w-full" />
            ) : (
              <div className="grid aspect-[245/342] place-items-center text-sm text-ink-600">
                No image
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-500">Market</span>
            <span className="tnum text-xl font-bold text-accent">{usd(card.marketPrice)}</span>
          </div>

          <Link
            to={`/sets/${encodeURIComponent(set.id)}`}
            className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 transition-colors hover:border-ink-600"
          >
            <span className="grid h-9 w-16 shrink-0 place-items-center">
              {set.logo ? (
                <img src={set.logo} alt="" className="max-h-9 w-auto max-w-full object-contain" />
              ) : (
                <span className="text-[11px] font-black text-ink-700">{set.abbreviation}</span>
              )}
            </span>
            <span className="min-w-0 text-xs">
              <span className="block truncate text-ink-200">{set.name}</span>
              <span className="block text-ink-500">{fullDate(set.releaseDate)}</span>
            </span>
          </Link>
        </div>

        {/* ------------------------------------------------------- card data */}
        <div className="min-w-0 space-y-4">
          <header className="border-b border-ink-800 pb-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{card.name}</h1>
              {detail?.hp ? (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-ink-500">HP</span>
                  <span className="tnum text-xl font-bold">{detail.hp}</span>
                  {primaryType ? <EnergyPip type={primaryType} size={22} /> : null}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-400">
              <RegionBadge region={card.region} />
              <span>{detail?.category ?? "Card"}</span>
              {detail?.stage ? (
                <>
                  <span className="text-ink-700">·</span>
                  <span>{detail.stage}</span>
                </>
              ) : null}
              {detail?.evolveFrom ? (
                <>
                  <span className="text-ink-700">·</span>
                  <span>Evolves from {detail.evolveFrom}</span>
                </>
              ) : null}
              {detail?.trainerType ? (
                <>
                  <span className="text-ink-700">·</span>
                  <span>{detail.trainerType}</span>
                </>
              ) : null}
            </div>
          </header>

          {detail ? (
            <>
              <AttackList detail={detail} />
              {detail.description ? (
                <p className="px-4 text-xs italic leading-relaxed text-ink-400">{detail.description}</p>
              ) : null}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink-800 pt-4 sm:grid-cols-3">
                <Field label="Weakness">
                  {detail.weaknesses?.length ? (
                    <span className="flex items-center gap-1.5">
                      <EnergyPip type={detail.weaknesses[0].type} />
                      {detail.weaknesses[0].value}
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Resistance">
                  {detail.resistances?.length ? (
                    <span className="flex items-center gap-1.5">
                      <EnergyPip type={detail.resistances[0].type} />
                      {detail.resistances[0].value}
                    </span>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Retreat cost">
                  {detail.retreat != null ? (
                    detail.retreat === 0 ? (
                      "Free"
                    ) : (
                      <span className="flex gap-0.5">
                        {Array.from({ length: detail.retreat }, (_, i) => (
                          <EnergyPip key={i} type="Colorless" />
                        ))}
                      </span>
                    )
                  ) : (
                    "—"
                  )}
                </Field>

                <Field label="Expansion">
                  <Link
                    to={`/sets/${encodeURIComponent(set.id)}`}
                    className="text-en hover:underline"
                  >
                    {set.name}
                  </Link>{" "}
                  <span className="text-[11px] text-ink-500">{set.abbreviation}</span>
                </Field>
                <Field label="Card number">
                  <span className="tnum">
                    {card.localId} / {set.cardCountOfficial || set.cardCountTotal}
                  </span>
                </Field>
                <Field label="Rarity">
                  <RarityChip rarityKey={card.rarityKey} label={card.rarity} />
                </Field>

                <Field label="Illustrator">{detail.illustrator ?? "—"}</Field>
                <Field label="Pokédex">
                  {detail.dexId?.length ? `#${detail.dexId.join(", #")}` : "—"}
                </Field>
                <Field label="Card format">{formatLegality(detail.legal)}</Field>

                {detail.regulationMark ? (
                  <Field label="Regulation mark">{detail.regulationMark}</Field>
                ) : null}
              </dl>
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Expansion">
                <Link to={`/sets/${encodeURIComponent(set.id)}`} className="text-en hover:underline">
                  {set.name}
                </Link>
              </Field>
              <Field label="Card number">
                <span className="tnum">
                  {card.localId} / {set.cardCountOfficial || set.cardCountTotal}
                </span>
              </Field>
              <Field label="Rarity">
                <RarityChip rarityKey={card.rarityKey} label={card.rarity} />
              </Field>
            </dl>
          )}

          {/* ------------------------------------------------------- odds */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Pull odds", value: odds ? oneIn(odds.perPack) : "—", sub: odds ? pct(odds.perPack) : "no data" },
              { label: "Per box", value: odds ? odds.perBox.toFixed(2) : "—", sub: `per ${entry.packsPerBox} packs` },
              { label: "Boxes / copy", value: odds ? odds.boxesPerCopy.toFixed(1) : "—", sub: "on average" },
              {
                label: "Cost to pull",
                value: usd(costToPull, { compact: true }),
                sub: set.packPrice ? `at ${usd(set.packPrice)}/pack` : "no pack price",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-ink-500">{s.label}</div>
                <div className="tnum text-base font-semibold">{s.value}</div>
                <div className="truncate text-[10px] text-ink-500">{s.sub}</div>
              </div>
            ))}
          </div>

          <Card title="Market prices by printing">
            {prices.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-500">
                No TCGplayer listing is matched to this card.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-800 text-left text-[10px] uppercase tracking-wider text-ink-400">
                    <th className="px-4 py-2 font-medium">Printing</th>
                    <th className="px-4 py-2 text-right font-medium">Market</th>
                    <th className="px-4 py-2 text-right font-medium">Low</th>
                    <th className="px-4 py-2 text-right font-medium">Mid</th>
                    <th className="px-4 py-2 text-right font-medium">High</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.variant} className="border-b border-ink-850 last:border-0">
                      <td className="px-4 py-1.5">
                        {p.tcgplayerProductId ? (
                          <a
                            href={`https://www.tcgplayer.com/product/${p.tcgplayerProductId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-accent hover:underline"
                          >
                            {p.variant}
                          </a>
                        ) : (
                          p.variant
                        )}
                      </td>
                      <td className="tnum px-4 py-1.5 text-right font-medium">{usd(p.market)}</td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-400">{usd(p.low)}</td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-400">{usd(p.mid)}</td>
                      <td className="tnum px-4 py-1.5 text-right text-xs text-ink-400">{usd(p.high)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="PSA graded sold prices">
            <PsaPanel cardId={card.id} rawPrice={card.marketPrice} />
          </Card>

          <Card title="How these odds are worked out">
            <div className="space-y-2 px-4 py-3 text-xs leading-relaxed text-ink-400">
              {odds ? (
                <>
                  <p>
                    {set.name} packs contain a <strong className="text-ink-200">{meta.label}</strong>{" "}
                    roughly{" "}
                    <strong className="text-ink-200">{oneIn(odds.perPack * odds.poolSize)}</strong>{" "}
                    packs. <strong className="text-ink-200">{odds.poolSize}</strong> cards share that
                    rarity here, so the odds of hitting this one are{" "}
                    <strong className="text-accent">{oneIn(odds.perPack)}</strong> packs — about{" "}
                    <strong className="text-ink-200">{odds.boxesPerCopy.toFixed(1)}</strong> booster
                    boxes.
                  </p>
                  <p className="flex flex-wrap items-center gap-2 pt-1">
                    <ConfidenceBadge confidence={odds.confidence} />
                    <span>
                      {odds.scope === "set" ? "Measured for this set." : "Era-wide figures."} Source:{" "}
                      <a
                        href={odds.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-accent"
                      >
                        {odds.source.name}
                      </a>
                      {odds.source.sampleSize
                        ? ` (${odds.source.sampleSize.toLocaleString()} packs)`
                        : ""}
                      .
                    </span>
                  </p>
                </>
              ) : (
                <p>
                  No pull-rate data covers the{" "}
                  <strong className="text-ink-200">{meta.label}</strong> tier in this set — usually
                  because it is a deck or boxed product rather than a booster release.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {siblings.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 border-b border-ink-800 pb-2 text-sm font-semibold tracking-tight">
            Other {meta.label} cards in {set.name}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {siblings.map((s) => (
              <Link key={s.id} to={`/cards/${encodeURIComponent(s.id)}`} className="group">
                <div className="overflow-hidden rounded-lg bg-ink-850 ring-1 ring-ink-800 transition-all group-hover:-translate-y-0.5 group-hover:ring-ink-600">
                  {s.image ? (
                        <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="aspect-[245/342] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[245/342] place-items-center text-[10px] text-ink-600">
                      {s.name}
                    </div>
                  )}
                </div>
                <div className="tnum mt-1 flex justify-between px-0.5 text-[10px]">
                  <span className="text-ink-500">{s.localId}</span>
                  <span className="font-semibold text-accent">{usd(s.marketPrice, { compact: true })}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
