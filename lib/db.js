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
    CREATE INDEX IF NOT EXISTS idx_listings_item ON listings(item_id);
    CREATE INDEX IF NOT EXISTS idx_news_ts ON news(ts);
    CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(to_acc, read);
  `);
  return db;
}

function getDb() { return db; }

module.exports = { init, getDb, DB_PATH };
