# Notice

The MIT licence in `LICENSE` covers **the source code in this repository and nothing else.**

## What is not covered

This project displays information about the Pokémon Trading Card Game. None of that information is
mine to license.

- **Card names, card text, artwork, set names, logos and symbols** are the intellectual property of
  The Pokémon Company, Nintendo, Creatures Inc. and GAME FREAK inc. This repository contains no card
  images and no card text — both are fetched from third-party APIs at runtime and are never stored
  in or distributed with this code.
- **Market prices** originate from TCGplayer and are retrieved through
  [TCGCSV](https://tcgcsv.com). They are not redistributed here; the generated database is excluded
  from version control by `.gitignore`. Do not commit `data/*.db`.
- **Card and set metadata** comes from [TCGdex](https://tcgdex.dev) under its own licence.
- **Pull-rate figures** are facts compiled from published pack-opening studies and collector
  reports. Every entry in `src/lib/pullrates/data.ts` carries its source URL. The compilation is
  original work and is covered by the MIT licence; the underlying figures belong to whoever measured
  them and are credited in the app and in the source.
- **Graded sale prices** are read from public eBay listings at request time and are not stored in
  this repository.

## Not affiliated

This project is not produced by, endorsed by, supported by, or affiliated with Nintendo, Creatures
Inc., GAME FREAK inc., The Pokémon Company, TCGplayer, or eBay. "Pokémon" and the names of Pokémon
products are trademarks of their respective owners and are used here only to describe what the
software is for.

## Intended use

A personal, non-commercial price and probability reference. Running it with advertising, affiliate
links or any other revenue attached materially changes the position described above.
