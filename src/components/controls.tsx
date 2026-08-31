import { useSearchParams } from "react-router";
import { useCallback, useEffect, useState } from "react";

/** Writes control state into the query string so every view is linkable. */
function useSetParam() {
  const [params, setParams] = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (v == null || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      // Any filter change invalidates the current page.
      if (!("page" in updates)) next.delete("page");
      setParams(next, { replace: true, preventScrollReset: true });
    },
    [params, setParams],
  );
}

export function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const set = useSetParam();
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-400">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => set({ [name]: e.target.value })}
        className="rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-ink-100 outline-none transition-colors focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const set = useSetParam();
  return (
    <div className="inline-flex rounded-md border border-ink-700 bg-ink-850 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => set({ [name]: o.value })}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ name, placeholder, value }: { name: string; placeholder: string; value: string }) {
  const set = useSetParam();
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // The URL is the source of truth. When it changes underneath us (back button,
  // a filter reset) adopt it during render rather than in an effect, which
  // would render the stale text first.
  if (lastValue !== value) {
    setLastValue(value);
    setText(value);
  }

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => set({ [name]: text }), 250);
    return () => clearTimeout(t);
  }, [text, value, name, set]);

  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-xs text-ink-100 placeholder:text-ink-600 outline-none transition-colors focus:border-accent sm:w-56"
    />
  );
}

/** Ascending/descending switch that sits next to a Sort dropdown. */
export function DirToggle({ name, value }: { name: string; value: "asc" | "desc" }) {
  const set = useSetParam();
  const next = value === "desc" ? "asc" : "desc";
  return (
    <button
      onClick={() => set({ [name]: next })}
      title={value === "desc" ? "Highest first — click for lowest first" : "Lowest first — click for highest first"}
      aria-label={value === "desc" ? "Sorted descending" : "Sorted ascending"}
      className="flex items-center gap-1 rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-ink-200 transition-colors hover:border-accent"
    >
      <span className="text-[13px] leading-none">{value === "desc" ? "\u2193" : "\u2191"}</span>
      <span className="hidden text-[11px] text-ink-400 sm:inline">
        {value === "desc" ? "High" : "Low"}
      </span>
    </button>
  );
}

/**
 * Horizontally scrollable series chips. Selecting one filters the list to that
 * series; selecting it again clears the filter.
 */
export function ChipRow({
  name,
  value,
  options,
  allLabel,
}: {
  name: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  /** Leave unset where one option must always be selected. */
  allLabel?: string;
}) {
  const set = useSetParam();
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
      {allLabel ? (
        <button
          onClick={() => set({ [name]: null })}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
            value === "all"
              ? "border-accent bg-accent/10 text-accent"
              : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600"
          }`}
        >
          {allLabel}
        </button>
      ) : null}
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => set({ [name]: !allLabel || value !== o.value ? o.value : null })}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
            value === o.value
              ? "border-accent bg-accent/10 text-accent"
              : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600"
          }`}
        >
          {o.label}
          {o.count != null ? <span className="ml-1.5 text-ink-500">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, pageCount }: { page: number; pageCount: number }) {
  const set = useSetParam();
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-xs">
      <button
        disabled={page <= 1}
        onClick={() => set({ page: String(page - 1) })}
        className="rounded-md border border-ink-700 bg-ink-850 px-3 py-1.5 text-ink-200 transition-colors enabled:hover:border-accent disabled:opacity-35"
      >
        Previous
      </button>
      <span className="tnum px-2 text-ink-400">
        Page {page} of {pageCount}
      </span>
      <button
        disabled={page >= pageCount}
        onClick={() => set({ page: String(page + 1) })}
        className="rounded-md border border-ink-700 bg-ink-850 px-3 py-1.5 text-ink-200 transition-colors enabled:hover:border-accent disabled:opacity-35"
      >
        Next
      </button>
    </div>
  );
}
