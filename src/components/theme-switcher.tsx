import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";

/**
 * The active theme lives on <html data-theme>, set by an inline script before
 * first paint. That makes the DOM the source of truth rather than React state,
 * so it is read through useSyncExternalStore instead of being mirrored.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.getAttribute("data-theme") ?? DEFAULT_THEME;
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("ppt-theme", id);
    } catch {
      // Private browsing: the choice applies but will not persist.
    }
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change colour theme"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-600"
      >
        <span
          className="h-3 w-3 rounded-full ring-1 ring-white/20"
          style={{ background: current.swatch }}
        />
        <span className="hidden sm:inline">{current.name}</span>
        <span className="text-ink-600">▾</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-ink-700 bg-ink-900 shadow-xl">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-ink-850 ${
                t.id === theme ? "bg-ink-850" : ""
              }`}
            >
              <span
                className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ background: t.swatch }}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-ink-100">
                  {t.name}
                  {t.id === theme ? <span className="ml-1.5 text-accent">✓</span> : null}
                </span>
                <span className="block text-[10px] leading-snug text-ink-500">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
