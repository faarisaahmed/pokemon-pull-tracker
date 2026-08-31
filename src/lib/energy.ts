/** Colour and glyph per energy type, used for HP badges and attack costs. */
export const ENERGY: Record<string, { color: string; bg: string; short: string }> = {
  Grass: { color: "#4caf50", bg: "#1b3a20", short: "G" },
  Fire: { color: "#ff6b3d", bg: "#3d1a10", short: "R" },
  Water: { color: "#4dabf7", bg: "#10283d", short: "W" },
  Lightning: { color: "#ffd43b", bg: "#3a3110", short: "L" },
  Psychic: { color: "#cc5de8", bg: "#33113a", short: "P" },
  Fighting: { color: "#e8845d", bg: "#3a2010", short: "F" },
  Darkness: { color: "#868e96", bg: "#1a1d22", short: "D" },
  Metal: { color: "#adb5bd", bg: "#24282e", short: "M" },
  Fairy: { color: "#f783ac", bg: "#3a1425", short: "Y" },
  Dragon: { color: "#c9a227", bg: "#332a10", short: "N" },
  Colorless: { color: "#ced4da", bg: "#25282d", short: "C" },
};

export function energy(type: string | null | undefined) {
  return ENERGY[type ?? ""] ?? { color: "#8b93a5", bg: "#1e222a", short: "?" };
}
