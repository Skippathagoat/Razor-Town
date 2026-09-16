// Razor Town — SQLite persistence layer
// Prefers better-sqlite3; falls back to Node 22's built-in node:sqlite when the
// native module cannot be compiled (common in sandboxes with broken TLS).
'use strict';
const path = require('path');
const fs = require('fs');

let db = null;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'world.db');

function wrapNodeSqlite(raw) {
  return {
    exec(sql) { raw.exec(sql); return this; },
    pragma(stmt) {
      const s = String(stmt || '').trim();
      if (!s) return;
      try { raw.exec('PRAGMA ' + s + (s.includes('=') ? '' : '')); } catch (_) {}
      return this;
    },
    prepare(sql) {
      const st = raw.prepare(sql);
      return {
        run(...args) { return st.run(...args); },
        get(...args) { return st.get(...args) || undefined; },
        all(...args) { return st.all(...args) || []; }
      };
    },
    transaction(fn) {
      return (...args) => {
        raw.exec('BEGIN');
        try {
          const out = fn(...args);
          raw.exec('COMMIT');
          return out;
        } catch (e) {
          try { raw.exec('ROLLBACK'); } catch (_) {}
          throw e;
        }
      };
    }
  };
}

function openDb() {
  try {
    const Database = require('better-sqlite3');
    const d = new Database(DB_PATH);
    d.pragma('journal_mode = WAL');
    d.pragma('synchronous = NORMAL');
    console.log('SQLite: better-sqlite3');
    return d;
  } catch (e) {
    const { DatabaseSync } = require('node:sqlite');
    const raw = new DatabaseSync(DB_PATH);
    try { raw.exec('PRAGMA journal_mode = WAL'); raw.exec('PRAGMA synchronous = NORMAL'); } catch (_) {}
    console.log('SQLite: node:sqlite (built-in) — better-sqlite3 unavailable:', e && e.code || e.message);
    return wrapNodeSqlite(raw);
  }
}

function init() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = openDb();
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
  const cols = db.prepare('PRAGMA table_info(listings)').all().map(c => c.name);
  if (!cols.includes('anon')) db.exec('ALTER TABLE listings ADD COLUMN anon INTEGER NOT NULL DEFAULT 0');
  const acols = db.prepare('PRAGMA table_info(accounts)').all().map(c => c.name);
  if (!acols.includes('email')) db.exec("ALTER TABLE accounts ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  if (!acols.includes('banned')) db.exec('ALTER TABLE accounts ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
  if (!acols.includes('ban_reason')) db.exec("ALTER TABLE accounts ADD COLUMN ban_reason TEXT NOT NULL DEFAULT ''");
  if (!acols.includes('ban_ts')) db.exec('ALTER TABLE accounts ADD COLUMN ban_ts INTEGER NOT NULL DEFAULT 0');
  if (!acols.includes('ban_by')) db.exec('ALTER TABLE accounts ADD COLUMN ban_by INTEGER NOT NULL DEFAULT 0');
  return db;
}

function getDb() { return db; }

module.exports = { init, getDb, DB_PATH };
