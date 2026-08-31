import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.PPT_DB_PATH ?? path.join(process.cwd(), "data", "pokemon.db");

export const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sets (
  id                 TEXT PRIMARY KEY,
  region             TEXT NOT NULL,
  name               TEXT NOT NULL,
  local_name         TEXT,
  series_id          TEXT,
  series_name        TEXT,
  release_date       TEXT,
  card_count_official INTEGER NOT NULL DEFAULT 0,
  card_count_total   INTEGER NOT NULL DEFAULT 0,
  logo               TEXT,
  symbol             TEXT,
  abbreviation       TEXT,
  -- Japanese sets have no logo art anywhere, so tiles fall back to the image
  -- of the set's most valuable card.
  tile_image         TEXT,
  tcgcsv_group_ids   TEXT NOT NULL DEFAULT '',
  pack_price         REAL,
  bundle_price       REAL,
  box_price          REAL,
  etb_price          REAL,
  set_value          REAL,
  expected_pack_value REAL
);
CREATE INDEX IF NOT EXISTS idx_sets_region ON sets(region);
CREATE INDEX IF NOT EXISTS idx_sets_release ON sets(release_date);

CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  set_id        TEXT NOT NULL REFERENCES sets(id),
  region        TEXT NOT NULL,
  local_id      TEXT NOT NULL,
  number_sort   INTEGER NOT NULL DEFAULT 0,
  name          TEXT NOT NULL,
  rarity        TEXT,
  rarity_key    TEXT,
  rarity_rank   INTEGER NOT NULL DEFAULT 0,
  category      TEXT,
  illustrator   TEXT,
  image         TEXT,
  types         TEXT,
  hp            INTEGER,
  market_price  REAL
);
CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_id);
CREATE INDEX IF NOT EXISTS idx_cards_region ON cards(region);
CREATE INDEX IF NOT EXISTS idx_cards_price ON cards(market_price);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity_key);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);

CREATE TABLE IF NOT EXISTS card_prices (
  card_id      TEXT NOT NULL REFERENCES cards(id),
  variant      TEXT NOT NULL,
  tcgplayer_product_id INTEGER,
  low REAL, mid REAL, high REAL, market REAL, direct_low REAL,
  updated_at TEXT,
  PRIMARY KEY (card_id, variant)
);

CREATE TABLE IF NOT EXISTS sealed (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id       TEXT NOT NULL REFERENCES sets(id),
  region       TEXT NOT NULL,
  kind         TEXT NOT NULL,
  name         TEXT NOT NULL,
  tcgplayer_product_id INTEGER NOT NULL UNIQUE,
  url          TEXT,
  image        TEXT,
  market REAL, low REAL, mid REAL, high REAL,
  pack_count   INTEGER,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sealed_set ON sealed(set_id);
CREATE INDEX IF NOT EXISTS idx_sealed_kind ON sealed(kind);

CREATE TABLE IF NOT EXISTS psa_prices (
  card_id     TEXT NOT NULL,
  grade       TEXT NOT NULL,
  sales_count INTEGER NOT NULL,
  avg_price   REAL NOT NULL,
  low_price   REAL NOT NULL,
  high_price  REAL NOT NULL,
  last_sale_date TEXT,
  fetched_at  TEXT NOT NULL,
  PRIMARY KEY (card_id, grade)
);

CREATE TABLE IF NOT EXISTS psa_fetch_log (
  card_id    TEXT PRIMARY KEY,
  fetched_at TEXT NOT NULL,
  status     TEXT NOT NULL,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  _db = db;
  return db;
}

export function dbPath() {
  return DB_PATH;
}
