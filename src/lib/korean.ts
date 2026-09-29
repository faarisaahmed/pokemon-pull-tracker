/**
 * Korean sets mirror Japanese ones. Their ids carry a "ko-" prefix over the
 * Japanese id ("ko-SV2a"), which is how pull rates and god packs find the
 * Japanese entry to reuse.
 */
export const KO_PREFIX = "ko-";

export function koSetId(jaSetId: string): string {
  return `${KO_PREFIX}${jaSetId}`;
}

/** The Japanese set a Korean one mirrors, or the id unchanged. */
export function jaTwinId(setId: string): string {
  return setId.startsWith(KO_PREFIX) ? setId.slice(KO_PREFIX.length) : setId;
}

/**
 * Japanese → Korean species names from PokeAPI's pokemon_species_names.csv
 * (language 1 is Japanese katakana, 3 is Korean).
 */
export function parseSpeciesCsv(csv: string): Map<string, string> {
  const ja = new Map<string, string>();
  const ko = new Map<string, string>();
  for (const line of csv.split("\n").slice(1)) {
    const [id, lang, name] = line.split(",");
    if (!name) continue;
    if (lang === "1") ja.set(id, name.trim());
    if (lang === "3") ko.set(id, name.trim());
  }
  const out = new Map<string, string>();
  for (const [id, j] of ja) {
    const k = ko.get(id);
    if (k) out.set(j, k);
  }
  return out;
}

/** Words that surround species names on Japanese cards. */
const WORDS: [string, string][] = [
  ["ロケット団の", "로켓단의 "],
  // Regional forms, with or without the possessive: "ヒスイのゾロアーク".
  ["ヒスイの", "히스이 "],
  ["アローラの", "알로라 "],
  ["ガラルの", "가라르 "],
  ["パルデアの", "팔데아 "],
  ["ヒスイ", "히스이 "],
  ["アローラ", "알로라 "],
  ["ガラル", "가라르 "],
  ["パルデア", "팔데아 "],
  ["テラスタル", "테라스탈 "],
  ["メガ", "메가"],
  ["ダーク", "다크 "],
  ["ひかる", "빛나는 "],
  ["かがやく", "찬란한 "],
];

const SUFFIX = /(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|☆|◇|δ)$/;

/**
 * A Korean card name from the Japanese one: species swapped through the
 * Pokédex ("リザードンex" → "리자몽 ex"). Names with nothing to translate
 * (most trainers and energy) stay Japanese rather than half-translated.
 */
export function koCardName(jaName: string, species: Map<string, string>): string {
  if (!species.size) return jaName;
  let rest = jaName;
  let out = "";
  let translated = false;
  // Longest species first so "ミュウツー" wins over "ミュウ".
  const names = sortedSpecies(species);
  while (rest.length) {
    const word = WORDS.find(([j]) => rest.startsWith(j));
    if (word) {
      out += word[1];
      rest = rest.slice(word[0].length);
      continue;
    }
    const sp = names.find((j) => rest.startsWith(j));
    if (sp) {
      out += species.get(sp)!;
      rest = rest.slice(sp.length);
      translated = true;
      continue;
    }
    out += rest[0];
    rest = rest.slice(1);
  }
  if (!translated) return jaName;
  // Anything still in kana means an untranslated word; keep the original.
  if (/[぀-ヿ]/.test(out)) return jaName;
  const m = out.match(SUFFIX);
  if (m && !out.endsWith(` ${m[1]}`)) out = `${out.slice(0, -m[1].length).trimEnd()} ${m[1]}`;
  return out.replace(/\s+/g, " ").trim();
}

let sortedCache: { from: Map<string, string>; names: string[] } | null = null;
function sortedSpecies(species: Map<string, string>): string[] {
  if (sortedCache?.from !== species) sortedCache = { from: species, names: [...species.keys()].sort((a, b) => b.length - a.length) };
  return sortedCache.names;
}
