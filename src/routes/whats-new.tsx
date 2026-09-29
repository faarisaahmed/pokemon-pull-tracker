import { useEffect } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/whats-new";
import { markUpdatesSeen, UPDATES } from "@/lib/updates";

export const meta: Route.MetaFunction = () => [{ title: "What's new — Ripwise" }];

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function WhatsNew() {
  // Opening the page is what clears the dot.
  useEffect(() => markUpdatesSeen(), []);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">What's new</h1>
      <p className="mt-1 text-sm text-ink-400">Everything added to Ripwise, newest first.</p>
      <ol className="mt-6 space-y-6 border-l border-ink-800 pl-5">
        {UPDATES.map((u, i) => (
          <li key={`${u.date}-${i}`} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-ink-950" aria-hidden />
            <div className="text-[11px] uppercase tracking-wider text-ink-500">{fmt(u.date)}</div>
            <h2 className="mt-0.5 text-base font-semibold">{u.title}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
              {u.items.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-ink-600">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {u.link ? (
              <Link to={u.link.to} className="mt-2 inline-block text-xs text-accent underline">
                {u.link.label} →
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
