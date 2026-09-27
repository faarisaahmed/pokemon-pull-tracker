/**
 * Subsets that are pulled from their parent set's packs but also get a page of
 * their own (subset id -> parent set id).
 *
 * The parent owns the cards under their normal ids, so its EV and odds cover
 * everything in the pack. The standalone page holds copies stored as
 * "<card id>@<subset id>"; those copies are left out of anything that spans
 * sets (What to open, the card search, totals) so nothing is counted twice.
 */
export const STANDALONE_SUBSETS: Record<string, string> = {
  "30th-c": "30th",         // 30th Celebration Classic Collection
  cel25cc: "cel25",         // Celebrations Classic Collection
  sma: "sm115",             // Hidden Fates Shiny Vault
  "swsh4.5sv": "swsh4.5",   // Shining Fates Shiny Vault
  swsh9tg: "swsh9",         // Brilliant Stars Trainer Gallery
  swsh10tg: "swsh10",       // Astral Radiance Trainer Gallery
  swsh11tg: "swsh11",       // Lost Origin Trainer Gallery
  swsh12tg: "swsh12",       // Silver Tempest Trainer Gallery
  "swsh12.5gg": "swsh12.5", // Crown Zenith Galarian Gallery
};

/** The set whose packs a set's cards come out of. */
export function pullSetOf(setId: string): string {
  return STANDALONE_SUBSETS[setId] ?? setId;
}

export function isStandaloneSubset(setId: string): boolean {
  return setId in STANDALONE_SUBSETS;
}

/** SQL condition that drops the standalone copies from cross-set queries. */
export const NOT_SUBSET_COPY = "instr(id, '@') = 0";

/** The TCGdex id behind a card, with any "@<subset>" copy suffix removed. */
export function dexIdOf(cardId: string): string {
  return cardId.split("@")[0];
}
