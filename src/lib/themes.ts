/**
 * Palettes. Each one only overrides the accent ramp and the darkest surface
 * tones — everything else in the UI is expressed against those, so a theme is
 * a handful of variables rather than a restyle.
 *
 * The accent carries prices and set values, so it has to stay legible at 10px
 * and must not read as an error state. That rules out saturated pure red for
 * the numbers, so the warm palette uses coral rather than a true red.
 */
export interface Theme {
  id: string;
  name: string;
  blurb: string;
  /** Swatch shown in the picker. */
  swatch: string;
}

export const THEMES: Theme[] = [
  {
    id: "violet",
    name: "Violet",
    blurb: "Violet and magenta on cool ink. Reads premium.",
    swatch: "#b06bff",
  },
  {
    id: "coral",
    name: "Coral",
    blurb: "Warm red on charcoal, without reading as an error state.",
    swatch: "#ff5a63",
  },
  {
    id: "foil",
    name: "Foil",
    blurb: "Iridescent teal with a violet second accent, like foil tilt.",
    swatch: "#2fe0d0",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    blurb: "Blue with a warm keyline. The calmest of the set.",
    swatch: "#4d9fff",
  },
  {
    id: "gold",
    name: "Gold",
    blurb: "High-contrast amber on near-black.",
    swatch: "#ffcb05",
  },
];

export const DEFAULT_THEME = "violet";

/**
 * Applied before paint so a stored choice never flashes the default first.
 * Kept as a string because it has to run as an inline script in <head>.
 */
export const THEME_INIT_SCRIPT = `
(function(){
  var ids = ${JSON.stringify(THEMES.map((t) => t.id))};
  var t = '${DEFAULT_THEME}';
  try {
    // ?theme=holo previews a palette without changing the stored preference,
    // which makes a look shareable as a link.
    var q = new URLSearchParams(location.search).get('theme');
    if (q && ids.indexOf(q) !== -1) t = q;
    else t = localStorage.getItem('ppt-theme') || t;
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
})();
`;
