// Razor Town — first-boot bootstrap.
// Guarantees a playable world no matter where the app lands: if the database is
// empty or missing, it seeds the NPC citizens + gangs and creates the founder
// account. Safe to run on every boot (all steps are idempotent).
'use strict';
const dbm = require('./db.js');
const A = require('./accounts.js');
const W = require('./world.js');
const C = require('./game/content.js');
const { seedWorld, xpForLevel } = require('./seed.js');

const FOUNDER_DEFAULTS = {
  username: process.env.FOUNDER_USER || 'ghost',
  password: process.env.FOUNDER_PASS || 'Delilah2023!@',
  name: process.env.FOUNDER_NAME || 'Ghost',
  level: 100,
  stats: { st: 500000, de: 500000, sp: 500000, dx: 500000 },
  cash: 250000000,
  bank: 250000000,
  reputation: 50000000,
  avatar: '1|5|0|1|2',            // era look: scarred face under a flat cap, oxblood jacket
  bio: 'Founder of Razor Town. Birmingham runs on my clock — cap off to the old man of the yard.'
};

// Create the founder if missing; top up an existing one. `reset` also re-hashes the password.
function createFounder(opts = {}) {
  const username = String(opts.username || FOUNDER_DEFAULTS.username).toLowerCase();
  const password = opts.password || FOUNDER_DEFAULTS.password;
  const name = opts.name || FOUNDER_DEFAULTS.name;
  const db = dbm.getDb();

  let acc = db.prepare("SELECT * FROM accounts WHERE username=? AND kind='user'").get(username);
  let created = false;
  if (!acc) {
    acc = A.createAccount(username, password, 'user');
    created = true;
  } else if (opts.reset) {
    const salt = A.makeSalt();
    db.prepare('UPDATE accounts SET pass_hash=?, salt=? WHERE id=?')
      .run(A.hashPassword(password, salt), salt, acc.id);
  }

  const existing = db.prepare('SELECT json FROM players WHERE acc_id=?').get(acc.id);
  let p = existing
    ? JSON.parse(existing.json)
    : A.defaultPlayerJson({ name, origin: 'street', avatar: FOUNDER_DEFAULTS.avatar, bio: '' });

  const now = Date.now();
  p.name = name;
  p.avatar = FOUNDER_DEFAULTS.avatar;
  p.bio = FOUNDER_DEFAULTS.bio;
  p.stats = { ...FOUNDER_DEFAULTS.stats };
  p.xp = xpForLevel(FOUNDER_DEFAULTS.level);
  p.money = FOUNDER_DEFAULTS.cash;
  p.bank = FOUNDER_DEFAULTS.bank;
  p.reputation = FOUNDER_DEFAULTS.reputation;
  p.happy = 100;
  p.total_crimes = 50000;
  p.total_success = 50000;
  p.total_fail = 0;
  p.wins = 10000;
  p.losses = 0;
  p.hospital_times = 0;
  p.jail_until = null;
  p.hosp_until = null;
  p.seen_tutorial = true;
  p.boosters = {};
  for (const id of Object.keys(C.ACHIEVEMENTS)) p.achievements[id] = now;
  p.items = {
    trauma_kit: 50, spike: 10, stim: 10, cortex: 10, plating: 10,
    volt_cola: 100, noir_whisky: 25, champagne: 10, nerve_tab: 10, lockpicks: 25,
    pink_diamond: 3, ice_ring: 5
  };

  // derive caps (max_life from defense, max_nerve from level) then fill them
  p = W.derive(p);
  p.life = p.max_life;
  p.energy = p.max_energy;
  p.nerve = p.max_nerve;
  p._ref = { life: now, energy: now, nerve: now, bank: now };

  const rowExists = db.prepare('SELECT 1 FROM players WHERE acc_id=?').get(acc.id);
  if (!rowExists) {
    db.prepare('INSERT INTO players (acc_id, name, avatar, json, updated_at) VALUES (?,?,?,?,?)')
      .run(acc.id, p.name, p.avatar, JSON.stringify(p), now);
  } else {
    W.save(acc.id, p);
  }

  const check = W.ready(JSON.parse(JSON.stringify(p)));
  return {
    username, password, name,
    created,
    level: check.level,
    total: check.total,
    money: check.money,
    bank: check.bank,
    reputation: check.reputation
  };
}

// Called on every boot (and by ./start-all.sh). Cheap when the world already exists.
function ensureWorld(opts = {}) {
  dbm.init();
  const db = dbm.getDb();
  const bots = Number(opts.bots || process.env.BOTS || 42);
  seedWorld({ bots });

  const summary = {
    citizens: db.prepare('SELECT COUNT(*) c FROM players WHERE acc_id<0').get().c,
    gangs: db.prepare('SELECT COUNT(*) c FROM factions').get().c,
    accounts: db.prepare('SELECT COUNT(*) c FROM accounts').get().c,
    news: db.prepare('SELECT COUNT(*) c FROM news').get().c,
    founder: null
  };

  if (!opts.noFounder) {
    const f = createFounder({ username: opts.founderUser, password: opts.founderPass, name: opts.founderName, reset: !!opts.resetFounder });
    summary.founder = f;
  }
  // recount so callers see the true totals (founder included)
  summary.accounts = db.prepare('SELECT COUNT(*) c FROM accounts').get().c;
  summary.citizens = db.prepare('SELECT COUNT(*) c FROM players WHERE acc_id<0').get().c;
  summary.gangs = db.prepare('SELECT COUNT(*) c FROM factions').get().c;
  return summary;
}

module.exports = { ensureWorld, createFounder, FOUNDER_DEFAULTS };
