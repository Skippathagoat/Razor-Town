// Razor Town — first-boot bootstrap.
// Guarantees a playable world no matter where the app lands: if the database is
// empty or missing, it seeds the NPC citizens + gangs and creates the founder
// account. Safe to run on every boot (all steps are idempotent).
'use strict';
const dbm = require('./db.js');
const A = require('./accounts.js');
const W = require('./world.js');
const C = require('./game/content.js');
const { seedWorld, xpForLevel, purgeNPCs } = require('./seed.js');

const FOUNDER_DEFAULTS = {
  username: process.env.FOUNDER_USER || 'ghost',
  password: process.env.FOUNDER_PASS || 'Delilah2023!@',
  name: process.env.FOUNDER_NAME || 'Ghost',
  level: 100,
  stats: { st: 500000, de: 500000, sp: 500000, dx: 500000 },
  cash: 250000000,
  bank: 250000000,
  reputation: 50000000,
  avatar: '6|1|29|2|1|0|3|22',   // era look: bronze heavy-browed boss, grey flat cap, greatcoat, salt-and-pepper beard
  bio: 'Founder of Razor Town. Birmingham runs on my clock — cap off to the old man of the yard.'
};

function founderSheet(p) {
  const check = W.ready(JSON.parse(JSON.stringify(p)));
  return {
    level: check.level,
    total: check.total,
    money: check.money,
    bank: check.bank,
    reputation: check.reputation
  };
}

// Looking after the founder's maxed sheet (level 100, half a billion, every feat).
// Split out so create/reset paths share the exact same numbers.
function applyFounderSheet(p) {
  const now = Date.now();
  p.name = FOUNDER_DEFAULTS.name;
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
  return p;
}

// Create the founder if missing. An existing founder is LEFT ALONE unless
// `reset` is passed (explicit restore to the maxed sheet + password re-hash) —
// rebooting the server must never wipe or re-max a founder who chose to play fresh.
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
  // Existing character + no explicit reset = hands off. Report the live sheet.
  if (existing && !opts.reset) {
    let live;
    try { live = JSON.parse(existing.json); } catch (e) { live = null; }
    if (live) {
      return { username, name: live.name || name, created, toppedUp: false, ...founderSheet(live) };
    }
    // fall through: corrupt row gets rebuilt as the founder below
  }

  // Reaching here means: no character row, an explicit reset, or a corrupt row —
  // all three get a fresh base before the founder sheet is applied.
  let p = A.defaultPlayerJson({ name, origin: 'street', avatar: FOUNDER_DEFAULTS.avatar, bio: '' });

  p = applyFounderSheet(p);

  const rowExists = db.prepare('SELECT 1 FROM players WHERE acc_id=?').get(acc.id);
  if (!rowExists) {
    db.prepare('INSERT INTO players (acc_id, name, avatar, json, updated_at) VALUES (?,?,?,?,?)')
      .run(acc.id, p.name, p.avatar, JSON.stringify(p), Date.now());
  } else {
    W.save(acc.id, p);
  }

  return { username, password, name, created, toppedUp: true, ...founderSheet(p) };
}

// Wipe the founder (default: ghost) back to a brand-new level 1 character while
// keeping the login (username + password + email) intact. Gang seats, pending
// applications/invites and bazaar listings are cleaned up so nothing dangles.
// The founder pass survives (it is tied to the username, not the sheet).
function resetFounderFresh(opts = {}) {
  const username = String(opts.username || FOUNDER_DEFAULTS.username).toLowerCase();
  const db = dbm.getDb();
  const acc = db.prepare("SELECT * FROM accounts WHERE username=? AND kind='user'").get(username);
  if (!acc) throw new Error('No account named "' + username + '".');
  const row = db.prepare('SELECT json FROM players WHERE acc_id=?').get(acc.id);
  if (!row) throw new Error('Account "' + username + '" has no character to reset.');

  let cur;
  try { cur = JSON.parse(row.json); } catch (e) { cur = {}; }

  // Step out of any gang cleanly first (hands the flag over or folds a solo crew).
  if (cur.faction) {
    try { W.leaveFaction(acc.id); } catch (e) { /* gang already gone — carry on */ }
  }
  // Clear pending applications and invites pointing at this account, everywhere.
  try { W.factionClearPending(acc.id); } catch (e) {}
  // Pull bazaar listings (the stalled goods go with the old sheet, not to buyers).
  try { db.prepare('DELETE FROM listings WHERE seller_acc=?').run(acc.id); } catch (e) {}

  const fresh = A.defaultPlayerJson({
    name: cur.name || opts.name || FOUNDER_DEFAULTS.name,
    origin: cur.origin || 'street',
    avatar: cur.avatar || FOUNDER_DEFAULTS.avatar,
    bio: typeof cur.bio === 'string' ? cur.bio : ''
  });
  fresh.sub_founder = true;                 // the name carries the pass forever
  if (cur.sub_until) fresh.sub_until = cur.sub_until;   // paid-for time is paid-for

  W.save(acc.id, fresh);
  return { username, name: fresh.name, ...founderSheet(fresh) };
}

// Called on every boot (and by ./start-all.sh). Cheap when the world already exists.
function ensureWorld(opts = {}) {
  dbm.init();
  const db = dbm.getDb();
  // NPC population: 0 by default (a clean town where every citizen is a real player).
  // Set BOTS=42 (or BOTS=<n>) to fill the city with NPC citizens again.
  const raw = opts.bots !== undefined ? opts.bots : (process.env.BOTS !== undefined ? process.env.BOTS : 0);
  const bots = Math.max(0, Number(raw) || 0);
  seedWorld({ bots });

  // bots=0 means "real players only" -> clear out any NPCs left from an earlier boot.
  const purged = bots === 0 ? purgeNPCs() : { bots: 0, characters: 0, messages: 0, factions: 0, membersRemoved: 0, news: 0 };

  const summary = {
    citizens: db.prepare('SELECT COUNT(*) c FROM players WHERE acc_id<0').get().c,
    gangs: db.prepare('SELECT COUNT(*) c FROM factions').get().c,
    accounts: db.prepare('SELECT COUNT(*) c FROM accounts').get().c,
    news: db.prepare('SELECT COUNT(*) c FROM news').get().c,
    bots: bots,
    purged,
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

module.exports = { ensureWorld, createFounder, resetFounderFresh, FOUNDER_DEFAULTS };
