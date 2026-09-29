import { useSyncExternalStore } from "react";

/**
 * What's new, newest first. Shown on /whats-new; a small dot on the "What's
 * new" link shows until the visitor opens it (remembered on this device —
 * Ripwise has no accounts). Add an entry whenever something visible ships.
 */
export interface Update {
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  items: string[];
  link?: { to: string; label: string };
}

export const UPDATES: Update[] = [
  {
    date: "2026-09-29",
    title: "Korean sets and Chinese odds",
    items: [
      "Korean sets: 75 sets up to Storm Emeralda, with Korean Pokémon names. They share the Japanese pull rates (same pack and box format). No prices yet, since no open price data covers them.",
      "Simplified Chinese: official odds for 16 mainland products, from expansions to gem packs.",
    ],
    link: { to: "/?region=ko", label: "Browse Korean sets" },
  },
  {
    date: "2026-09-29",
    title: "Built for phones",
    items: ["A tab bar at the bottom on phones, and card lists that keep prices and odds on screen."],
  },
  {
    date: "2026-09-28",
    title: "Pack simulator and sourced pull rates",
    items: [
      "Open virtual packs of any set, built from its pull rates and today's prices.",
      "The cheapest way to buy packs (loose, bundles, ETBs or boxes), and how many packs until you pull a card.",
      "Every set's pull rates rebuilt from sourced opening data, with Japanese rarities fixed.",
    ],
  },
  {
    date: "2026-09-27",
    title: "Master sets",
    items: [
      "Search a Pokémon to see every card of it, with filters for repeats, eras and prices.",
      "Subset pages (like trainer galleries), English god packs and era filters on What to open.",
      "30th Celebration Classic Collection and the RGB Mews.",
    ],
    link: { to: "/master", label: "Build a master set" },
  },
  {
    date: "2026-08-31",
    title: "Ripwise launches",
    items: ["Prices, set values and pull rates for every English and Japanese set, refreshed daily."],
  },
];

export const LATEST_UPDATE = UPDATES[0].date;

const KEY = "ripwise:seen-updates";
const listeners = new Set<() => void>();

function seen(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return LATEST_UPDATE; // Storage blocked: never nag.
  }
}

/** True when there's an entry newer than this device has seen. Off during server render. */
export function useHasNewUpdates(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => (seen() ?? "") < LATEST_UPDATE,
    () => false,
  );
}

export function markUpdatesSeen() {
  try {
    window.localStorage.setItem(KEY, LATEST_UPDATE);
  } catch {
    // Storage blocked.
  }
  listeners.forEach((fn) => fn());
}
