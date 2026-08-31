import { energy } from "@/lib/energy";
import type { CardDetail } from "@/lib/tcgdex-live";

export function EnergyPip({ type, size = 18 }: { type: string; size?: number }) {
  const e = energy(type);
  return (
    <span
      title={type}
      className="inline-grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: e.bg,
        color: e.color,
        border: `1px solid ${e.color}55`,
        fontSize: size * 0.55,
      }}
    >
      {e.short}
    </span>
  );
}

export function AttackList({ detail }: { detail: CardDetail }) {
  const hasAny = (detail.abilities?.length ?? 0) + (detail.attacks?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <div className="divide-y divide-ink-850">
      {detail.abilities?.map((a) => (
        <div key={a.name} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-jp/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-jp">
              {a.type}
            </span>
            <span className="font-semibold text-ink-100">{a.name}</span>
          </div>
          {a.effect ? <p className="mt-1 text-xs leading-relaxed text-ink-400">{a.effect}</p> : null}
        </div>
      ))}
      {detail.attacks?.map((a, i) => (
        <div key={`${a.name}-${i}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex gap-0.5">
              {(a.cost ?? []).map((c, j) => (
                <EnergyPip key={j} type={c} />
              ))}
            </span>
            <span className="font-semibold text-ink-100">{a.name}</span>
            {a.damage ? (
              <span className="tnum ml-auto text-lg font-bold text-ink-100">{a.damage}</span>
            ) : null}
          </div>
          {a.effect ? <p className="mt-1 text-xs leading-relaxed text-ink-400">{a.effect}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-100">{children}</dd>
    </div>
  );
}
