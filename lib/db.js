// Razor Town — SQLite persistence layer (better-sqlite3)
'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'world.db');

function init() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pass_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      kind TEXT DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS players (
      acc_id INTEGER PRIMARY KEY REFERENCES accounts(id),
      name TEXT NOT NULL,
      avatar TEXT,
      json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS factions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tag TEXT NOT NULL,
      json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      kind TEXT,
      icon TEXT,
      message TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_acc INTEGER,
      from_name TEXT,
      to_acc INTEGER NOT NULL,
      body TEXT NOT NULL,
      ts INTEGER NOT NULL,
      read INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bounties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_acc INTEGER NOT NULL,
      target_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      from_acc INTEGER,
      from_name TEXT,
      anon INTEGER DEFAULT 0,
      ts INTEGER NOT NULL,
      claimed_by INTEGER,
      claimed_by_name TEXT,
      claimed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_acc INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      qty INTEGER NOT NULL,
      min_bid INTEGER NOT NULL,
      buyout INTEGER,
      cur_bid INTEGER DEFAULT 0,
      bidder_acc INTEGER,
      ends_at INTEGER NOT NULL,
      settled INTEGER DEFAULT 0,
      ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_prices (
      sym TEXT PRIMARY KEY,
      price REAL NOT NULL,
      tick INTEGER NOT NULL,
      hist TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chan TEXT NOT NULL,
      acc INTEGER NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_chan ON chat(chan, id);
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_acc INTEGER NOT NULL,
      seller_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      qty INTEGER NOT NULL,
      each INTEGER NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bounty_target ON bounties(target_acc, claimed_at);
    CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_acc);
    CREATE INDEX IF NOT EXISTS idx_listings_item ON listings(item_id);
    CREATE INDEX IF NOT EXISTS idx_news_ts ON news(ts);
    CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(to_acc, read);
  `);
  // zero-downtime column adds for worlds created before the column existed
  const cols = db.prepare('PRAGMA table_info(listings)').all().map(c => c.name);
  if (!cols.includes('anon')) db.exec('ALTER TABLE listings ADD COLUMN anon INTEGER NOT NULL DEFAULT 0');
  // zero-downtime columns for email logins + bans (worlds predating them start empty/raw)
  const acols = db.prepare('PRAGMA table_info(accounts)').all().map(c => c.name);
  if (!acols.includes('email')) db.exec("ALTER TABLE accounts ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  if (!acols.includes('banned')) db.exec('ALTER TABLE accounts ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
  if (!acols.includes('ban_reason')) db.exec("ALTER TABLE accounts ADD COLUMN ban_reason TEXT NOT NULL DEFAULT ''");
  if (!acols.includes('ban_ts')) db.exec('ALTER TABLE accounts ADD COLUMN ban_ts INTEGER NOT NULL DEFAULT 0');
  if (!acols.includes('ban_by')) db.exec('ALTER TABLE accounts ADD COLUMN ban_by INTEGER NOT NULL DEFAULT 0');
  // wipe lock: set by tools/wipe-account.js. A wiped account stays wiped — the boot-time
  // founder demo (max level, half a billion) must never refill it behind your back.
  if (!acols.includes('wiped')) db.exec('ALTER TABLE accounts ADD COLUMN wiped INTEGER NOT NULL DEFAULT 0');
  if (!acols.includes('wiped_ts')) db.exec('ALTER TABLE accounts ADD COLUMN wiped_ts INTEGER NOT NULL DEFAULT 0');
  return db;
}

function getDb() { return db; }

module.exports = { init, getDb, DB_PATH };
