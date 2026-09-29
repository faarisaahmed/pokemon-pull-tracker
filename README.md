# Ripwise

*Know the odds before you rip.*

> **Not produced by, endorsed by, or affiliated with Nintendo, Creatures Inc., GAME FREAK inc., The
> Pokémon Company, TCGplayer or eBay.** "Pokémon" and all related names are trademarks of their
> respective owners and are used here only to describe what this software is for. No card artwork or
> card text is stored in or distributed with this repository — both are fetched from third-party
> APIs at runtime. See [NOTICE.md](NOTICE.md) for what the MIT licence does and does not cover.

A read-only reference for Pokémon TCG **prices** and **pull rates**, covering every English and
Japanese expansion. It is deliberately not a collection tracker — there is nothing to log, add or
own; that's its sibling, [Shadowless](https://github.com/faarisaahmed/holovault). You look up what a card is worth, what a pack costs, and how many packs you would have to open
to hit a given card.

- **Sets index** — set tiles grouped by series, with a series chip filter and an Images/List view
  toggle. Each tile shows the set logo, release date, total set value, pack price and a bar for
  expected singles value per pack against what a pack costs. Sortable by pack / bundle / box / ETB
  price, set value, EV per pack and card count.
- **Set page** — header with logo, release date and set value; a price strip; collapsible pull-rate
  and sealed-product panels; then an image-first card grid with number, rarity dot, price and
  per-card odds under each card. Filter by rarity, sort by number / rarity / price, search by name.
- **What to open** (`/chase`) — pick a rarity and every set that prints it is ranked by **cost per
  hit**: pack price ÷ the odds of a pack containing that rarity. Narrow it by era (any number at
  once, English and Japanese sets share an era) and by a pack-price cap. Also shows the odds, how
  many cards share the tier, the average and best card value, and what fraction of the pack price
  that tier returns. A separate God packs view lists the English and Japanese sets with documented
  god packs, their estimated rate and their known contents.
- **Master sets** (`/master`) — search a Pokémon (name or Pokédex number) and see every card of
  it in English or Japanese, grouped by set with images and prices, plus totals for the whole
  master set with or without reverse holos. Trim it with "one of each reprint" (straight reprints
  like Cynthia's Garchomp ex in Destined Rivals and Ascended Heroes collapse to the cheapest set),
  an era checklist (tick any mix, e.g. Scarlet & Violet + Sword & Shield + Mega Evolution), a
  pack-price cap and a card-price cap. Species come from TCGdex Pokédex
  numbers, so "Charizard" includes Dark Charizard, Mega Charizard X ex and tag teams. Reprints are
  confirmed by name, HP, illustrator, rarity, attacks and abilities. Nothing is tracked per user.
- **Open packs** (`/sets/:id/open`) — a pack-opening simulator driven by the set's pull rates and
  current prices, with a running spent / pulled / net tally. Nothing is saved.
- **Buying packs** — each set page ranks loose packs, bundles, ETBs and boxes by price per pack,
  and What to open can price hits at the cheapest route instead of loose packs. Card pages show how
  many packs (and dollars) it takes for a 50/75/90/99% chance at that card, against buying it.
- **Subsets** — Trainer Galleries, Shiny Vaults, the Galarian Gallery and both Classic Collections
  are part of their parent set (so its EV and odds cover the whole pack) and also have a page of
  their own. See `src/lib/subsets.ts`.
- **Card page** — full card detail (HP, type, abilities and attacks with energy costs, weakness,
  resistance, retreat, illustrator, Pokédex number, regulation mark, format legality), market price
  per printing, PSA graded sold comps, the odds of pulling that specific card with the arithmetic
  shown and the source cited, and the other cards sharing its rarity.

Card detail beyond what the grid needs (attacks, HP, weaknesses) is fetched from TCGdex when a card
page is opened rather than stored — ingesting it would mean ~30,000 extra requests for data only
ever read one card at a time.

## Themes

Five palettes, switchable from the header and remembered in `localStorage`. A theme only
overrides the accent ramp and the darkest surface tones in `src/app/globals.css`; everything else
is expressed against those, so adding one is a handful of variables plus an entry in
`src/lib/themes.ts`.

| Theme | Accent | Notes |
| --- | --- | --- |
| Violet (default) | `#b06bff` | Cool ink base. |
| Coral | `#ff5a63` | Pure red reads as an error state on dark, so the numbers use coral. |
| Foil | `#2fe0d0` | Success shifts to lime, since teal and green are hard to tell apart on the EV bars. |
| Cobalt | `#4d9fff` | The calmest option. |
| Gold | `#ffcb05` | Highest contrast. |

`?theme=foil` previews any palette without changing the stored preference, so a look is shareable
as a link.

## Setup

```bash
npm install
npm run ingest      # builds data/pokemon.db — takes about 15 seconds
npm run dev
```

## Data sources

| Data | Source | Notes |
| --- | --- | --- |
| Sets, cards, rarities, card detail | [TCGdex](https://tcgdex.dev) | The only open source covering both the English and Japanese card pools. |
| Card images | TCGdex, falling back to TCGplayer | TCGdex only has art for ~34% of the Japanese pool; the TCGplayer product image covers the rest. |
| Single + sealed market prices | TCGplayer via [TCGCSV](https://tcgcsv.com) | Category 3 (English) and 85 (Japanese). |
| Korean sets | TCGdex's Korean set list, plus `KO_EXTRA` in `scripts/ingest/korean.ts` for newer sets | Korean sets are the Japanese ones card for card, so cards, images and pull rates come from the Japanese twin (`ko-<id>`). Pokémon names are translated with [PokeAPI](https://pokeapi.co)'s species names; trainers keep Japanese names. No prices. |
| Simplified Chinese odds | Official per-product odds tables via the 52poke wiki | `src/lib/pullrates/zh.ts`, shown at `/china`. No open card lists exist, so there are no set pages. |
| PSA graded prices | eBay sold listings | Scraped on demand per card, cached for 7 days. |
| Pull rates | Published opening studies + per-box tallies | Curated in `src/lib/pullrates/en.ts` and `ja.ts`, every entry carrying its source and sample size. |

### What is excluded

Promo sets, McDonald's collections, blister exclusives, trainer kits, deck- and tin-only products,
and the digital TCG Pocket sets. None of them come out of a booster pack, so pull rates and pack
prices are meaningless for them. The rules live in `scripts/ingest/set-config.ts`.

## Pull rates

No API publishes pull rates, so they are hand-curated from published studies, with the source and
sample size on every entry. Two shapes of data exist because the two markets differ:

- **English** (`src/lib/pullrates/en.ts`): packs are random slots, so studies report a per-pack
  chance per tier. Every Scarlet & Violet and Mega Evolution set, and Evolving Skies, Fusion Strike,
  Astral Radiance, Lost Origin, Silver Tempest and Crown Zenith, use TCGplayer's own studies
  (1,200–8,500 packs each). Other Sword & Shield sets use Elite Fourum's stream-opening tallies
  (2,000–5,000 packs) or smaller DigitalTQ samples; older eras use Elite Fourum box tallies.
  Sword & Shield alternate arts get their own tiers (TCGplayer's product names mark them), as do
  Trainer and Galarian Gallery V cards, and regular GX/EX are split from full arts before that.
- **Japanese** (`src/lib/pullrates/ja.ts`): boxes ship with observed per-box contents ("4 RR, 3 AR,
  1 SR or better"), mostly from ポケゲトちゃんねる's 300–2,000-box tallies, divided by the box size.
  Japanese rarities come from TCGplayer first (TCGdex's labels change meaning between eras) — see
  `scripts/ingest/rarity-rules.ts`.

Per-card odds are the tier's rate divided by the number of cards sharing that tier in the set. A
tier with no sourced figure is left without odds rather than guessed (the card says "no data"), and
where a gap had to be filled from a neighbouring set or an estimated split, the note on that tier
says so. `tests/pullrates-data.test.ts` checks every entry for unknown rarity keys, impossible
slot totals and missing sources.

**God packs** have never been acknowledged by The Pokémon Company, so there is no measured rate.
Japanese sets have printed them for years; in English, TCGplayer's studies confirm them in 151
(demi-god packs), Prismatic Evolutions and Ascended Heroes (`GOD_PACKS` in
`src/lib/pullrates/data.ts`). Rates are community estimates — Japanese box tallies where they exist,
1 in 600 otherwise — and always labelled as such.

**EV per pack** is each tier's per-card odds × its average card price, summed. A tier where most
cards have no price yet only counts the priced ones, so one sale does not stand in for the rest.
**Hits EV** is the same from Double Rare up, leaving out bulk. The ingest warns when a modern set
falls back to vintage pull rates, which usually means a new set id needs an entry.
Commons, uncommons and the rare slot have no published rate and are modelled from the pack's slot
structure — those are always labelled *estimated*.

Every figure is tagged `verified`, `community` or `estimated`, and the badge is shown next to the
number everywhere it appears. Adding a set: append a `scope: "set"` entry to `PULL_RATES` or
`SPECIAL_SET_OVERRIDES` keyed by the TCGdex set id.

## PSA prices

> **eBay's User Agreement prohibits automated access to the site.** The scraper in `src/lib/ebay/`
> is provided as code; whether to run it is your call and your risk. It is rate-limited to one
> request every 1.5 seconds and caches for a week, but that does not make it permitted. If you want
> graded prices without this trade-off, use eBay's official Marketplace Insights API or a PSA data
> licence instead.

eBay blocks automated requests from most servers — a bare request from a datacentre IP gets a 403
on every path, including the homepage. The app degrades gracefully (the card page says so and links
you to the search) but to actually get comps you need either a residential connection or a proxy:

```bash
export PPT_SCRAPER_URL='https://api.scraperapi.com?api_key=YOUR_KEY&url={url}'
npm run psa:warm -- --limit=200 --min-price=50
```

`{url}` is replaced with the URL-encoded eBay search. The same shape works for ScrapingBee, Zyte,
Bright Data and similar. Requests are serialised with a 1.5s gap regardless.

The parser is covered by `tests/ebay-psa.test.ts` against fixtures of both markups eBay currently
serves. Those tests will keep passing if eBay changes its class names, so check a real response
before assuming the scraper is healthy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run ingest` | Rebuilds `data/pokemon.db` from TCGdex + TCGCSV. Safe to re-run; it upserts. |
| `npm run ingest -- --region=en` | Ingests one region only. |
| `npm run psa:warm` | Bulk-fetches PSA comps for the most valuable cards. |
| `npm test` | Runs the eBay parser tests. |
| `npm run typecheck` | Generates route types, then runs `tsc`. |
| `npm run dev` / `build` / `start` | React Router dev server, production build, production server. |

## Known gaps

- **795 Japanese cards have no rarity** (~7% of the Japanese pool), mostly in pre-2010 sets, because
  neither TCGdex nor TCGplayer records one. They show as "unknown" and get no pull-rate figure.
- **~18% of Japanese cards have no price** — TCGplayer simply does not list every Japanese single.
- **8% of Japanese cards have no image** from either source, and 59 mostly pre-2010 Japanese sets
  therefore have no tile art; those tiles fall back to the set abbreviation.
- **No Japanese set has logo art** anywhere, so Japanese tiles use the set's most valuable card as
  their image instead.
- Pull-rate coverage is strongest for Scarlet & Violet and modern Japanese sets. Older eras fall back
  to era-wide estimates; the confidence badge tells you which you are looking at.
- Expected-value-per-pack ignores condition, grading upside and the resale value of the sealed
  product itself.

## Licence

Code is MIT — see [LICENSE](LICENSE). The card data, prices and images the app displays are **not**
covered by it and are not mine to license; [NOTICE.md](NOTICE.md) sets out who owns what.

Two things to keep in mind if you fork or deploy this:

- **Never commit `data/*.db`.** It is gitignored, and it contains a full copy of TCGplayer's pricing
  dataset, which is not yours to redistribute.
- **Keep it non-commercial.** No ads, no affiliate links. That is the single biggest factor in
  whether a project like this is left alone.

## Deploying

The database is deliberately not in version control, so any host has to build it. The ingest takes
about 40 seconds and pulls current prices, which means each deploy ships fresh data and no
third-party pricing dataset ever lands in git.

**GitHub Pages will not work.** Pages serves static files only — there is no Node process to run the
SQLite queries behind every page or the `/api/psa` route. A static export would mean prerendering
~30,000 card pages, moving all sorting and filtering into client-side JavaScript, baking the price
data into the published repo, and dropping the PSA endpoint entirely.

### Render

Optional: set `SHADOWLESS_URL` (or the older name `HOLOVAULT_URL`) to the sister collection tracker's address to show a few quiet links to it
(footer, set pages, card pages). Without it, Ripwise never mentions Shadowless.

The app was renamed from Pull Tracker to Ripwise; the GitHub repo (`pokemon-pull-tracker`) and the Render
service (`pull-tracker`) keep their original names so the live deployment and its deploy hook are untouched.

`render.yaml` is a ready blueprint — create a Blueprint instance from the repo and it deploys. The
free tier sleeps after 15 minutes idle, so the first request afterwards takes roughly a minute.
Everything works unchanged because Render runs a normal container with a writable filesystem.

Fly.io, Railway and any VPS work the same way: `npm ci && npm run ingest && npm run build` to build,
`npm start` to run. Nothing in the app depends on a particular host — `getDb()` handles a read-only
filesystem, so serverless platforms work too.

## Stack

React Router v7 (framework mode) on Vite, React 19, Tailwind v4, SQLite via better-sqlite3.
No telemetry, and no dependency on any particular host or platform vendor.

Server-only modules are suffixed `.server.ts` — `db.server.ts`, `queries.server.ts`,
`tcgdex-live.server.ts`, `ebay/*.server.ts`. The build fails if one is reachable from browser code,
which is deliberate: it keeps SQLite and the scraper out of the client bundle. Anything a component
needs (`sorting.ts`, `rarity.ts`, `types.ts`, `pullrates/`, `tcgdex.ts`) is a plain shared module.

### Keeping prices current

Prices are baked into the database at build time, so they are only as fresh as the last deploy.
Render auto-deploys on every push to `main`, but if you are not actively pushing code the data goes
stale.

`.github/workflows/refresh-prices.yml` fixes that: it pings the host's deploy hook daily at 21:00
UTC (TCGCSV publishes around 20:00), which re-runs the ingest and redeploys. Add the hook URL as a
repository secret named `RENDER_DEPLOY_HOOK` — including its `?key=` parameter, which is what
authenticates it. Run it manually from the Actions tab to test.

Each deploy makes roughly 4,500 small requests to TCGdex and TCGCSV — most of them the one-per-value
list queries behind the master-set search and reprint checks. Daily is fine; hourly would not be.

The ingest refuses to finish if it produced implausibly little data — under 250 sets, 27,000 cards
or 600 sealed products. A total upstream failure already throws, but a partial one could otherwise
ship a thin database over a good one. Failing the build means the previous deploy keeps serving.
