"use client";

import { useState } from "react";

/** Collapsible section, used for the set page's pull-rate and sealed panels. */
export function DetailsPanel({
  label,
  children,
  defaultOpen = false,
  count,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-ink-850"
      >
        <span
          className={`text-ink-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▸
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-200">{label}</span>
        {count ? <span className="text-[11px] text-ink-500">{count}</span> : null}
      </button>
      {open ? <div className="border-t border-ink-800">{children}</div> : null}
    </div>
  );
}
