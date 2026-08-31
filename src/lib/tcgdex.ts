/**
 * Shapes and helpers for TCGdex card detail. Kept separate from the fetch so
 * components can use the type and the formatter without pulling a server-only
 * module into the browser bundle.
 */
export interface CardDetail {
  id: string;
  name: string;
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  suffix?: string;
  dexId?: number[];
  retreat?: number;
  regulationMark?: string;
  description?: string;
  evolveFrom?: string;
  abilities?: { type: string; name: string; effect: string }[];
  attacks?: { cost?: string[]; name: string; effect?: string; damage?: string | number }[];
  weaknesses?: { type: string; value: string }[];
  resistances?: { type: string; value: string }[];
  legal?: { standard: boolean; expanded: boolean };
  trainerType?: string;
  energyType?: string;
}

/** "Standard" / "Expanded" / "Unlimited" from TCGdex's legality flags. */
export function formatLegality(legal: CardDetail["legal"]): string {
  if (!legal) return "—";
  if (legal.standard) return "Standard";
  if (legal.expanded) return "Expanded";
  return "Unlimited";
}
