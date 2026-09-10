// Razor Town — account & character creation
'use strict';
const crypto = require('crypto');
const dbm = require('./db.js');
const E = require('./game/engine.js');
const C = require('./game/content.js');

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function makeSalt() { return crypto.randomBytes(16).toString('hex'); }

// stateless signed session tokens so logins survive server restarts
let SECRET = process.env.SESSION_SECRET || '';
if (!SECRET) {
  const path = require('path'), fs = require('fs');
  const fp = path.join(__dirname, '..', 'data', 'session-secret');
  try { SECRET = fs.readFileSync(fp, 'utf8').trim(); }
  catch (e) {
    SECRET = crypto.randomBytes(24).toString('hex');
    try { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, SECRET); } catch (_) {}
  }
}
function signToken(accId) {
  const exp = Date.now() + 30 * 86400000;
  const payload = `${accId}.${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  try {
    const [id, exp, sig] = String(token).split('.');
    const payload = `${id}.${exp}`;
    const good = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url') === sig;
    if (!good) return null;
    if (+exp < Date.now()) return null;
    return +id;
  } catch (e) { return null; }
}
function sanitize(s, max = 24) {
  return String(s || '').replace(/[^\w\s\u00C0-\u024F\u2019'-]/g, '').trim().slice(0, max);
}

function createAccount(username, pw, kind = 'user') {
  const db = dbm.getDb();
  const uname = sanitize(username).toLowerCase();
  if (!uname || uname.length < 2) throw new Error('Username must be at least 2 characters.');
  if (uname.length > 20) throw new Error('Username too long.');
  if (String(pw).length < 6) throw new Error('Password must be at least 6 characters.');
  if (uname.startsWith('~')) throw new Error('That name is reserved.');
  const exists = db.prepare('SELECT id FROM accounts WHERE username = ?').get(uname);
  if (exists) throw new Error('That username is already taken.');
  const salt = makeSalt();
  const info = db.prepare('INSERT INTO accounts (username, pass_hash, salt, kind, created_at) VALUES (?,?,?,?,?)')
    .run(uname, hashPassword(pw, salt), salt, kind, Date.now());
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
}

function verifyLogin(username, pw) {
  const db = dbm.getDb();
  const uname = sanitize(username).toLowerCase();
  const acc = db.prepare('SELECT * FROM accounts WHERE username = ? AND kind = \'user\'').get(uname);
  if (!acc) return { err: 'No account with that name.' };
  if (acc.pass_hash !== hashPassword(pw, acc.salt)) return { err: 'Wrong password.' };
  return { acc };
}

// Character creator payload from client
const AVATAR_MAX = { skin: 4, face: 5, hair: 9, shirt: 7, accent: 4 };
function clampInt(v, max) { v = parseInt(v, 10); return isNaN(v) ? 0 : Math.min(max, Math.max(0, v)); }

function profileFromForm(form) {
  const name = sanitize(form.name, 20);
  if (name.length < 2) throw new Error('Character name must be at least 2 characters.');
  const originId = C.ORIGINS.some(o => o.id === form.origin) ? form.origin : 'street';
  const p5 = String(form.avatar || '').split('|').map(x => parseInt(x, 10));
  const pick = (i, max) => {
    const v = p5[i];
    return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : clampInt(form[['skin', 'face', 'hair', 'shirt', 'accent'][i]], max);
  };
  const avatar = [
    pick(0, AVATAR_MAX.skin),
    pick(1, AVATAR_MAX.face),
    pick(2, AVATAR_MAX.hair),
    pick(3, AVATAR_MAX.shirt),
    pick(4, AVATAR_MAX.accent),
  ].join('|');
  const bio = String(form.bio || '').replace(/[<>&]/g, '').slice(0, 120);
  return { name, origin: originId, avatar, bio };
}

function defaultPlayerJson(profile) {
  const origin = C.ORIGINS.find(o => o.id === profile.origin) || C.ORIGINS[0];
  const base = 10;
  const now = Date.now();
  const stats = { st: base, de: base, sp: base, dx: base };
  stats[origin.stat] = base + origin.bonus;
  const p = {
    name: profile.name,
    avatar: profile.avatar,
    bio: profile.bio,
    origin: origin.id,
    stats,
    xp: 60,
    life: 200, max_life: 200, energy: 100, max_energy: 100, nerve: 20, max_nerve: 20,
    money: 2500, bank: 0,
    job: null,
    items: {},
    boosters: {},
    jail_until: null, hosp_until: null,
    total_crimes: 0, total_success: 0, total_fail: 0, wins: 0, losses: 0, hospital_times: 0,
    reputation: 0,
    achievements: {},
    faction: null,
    total_deposits: 0, total_market_spend: 0, total_shift: 0,
    seen_tutorial: false,
    last_seen: now, created: now,
    _ref: { life: now, energy: now, nerve: now, bank: now }
  };
  // starter loot
  for (const id of origin.starter) p.items[id] = (p.items[id] || 0) + 1;
  return p;
}

function createPlayerForAccount(acc, form) {
  const db = dbm.getDb();
  const profile = profileFromForm(form);
  const pj = defaultPlayerJson(profile);
  db.prepare('INSERT INTO players (acc_id, name, avatar, json, updated_at) VALUES (?,?,?,?,?)')
    .run(acc.id, pj.name, pj.avatar, JSON.stringify(pj), Date.now());
  return pj;
}

module.exports = { createAccount, verifyLogin, createPlayerForAccount, defaultPlayerJson, sanitize, AVATAR_MAX, makeSalt, hashPassword, signToken, verifyToken };
