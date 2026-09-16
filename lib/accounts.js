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

// stateless signed session tokens so logins survive server restarts.
// The secret is stored NEXT TO THE DATABASE (which may be on a persistent volume via
// DB_PATH), so redeploys don't log everyone out. SESSION_SECRET overrides everything.
let SECRET = process.env.SESSION_SECRET || '';
if (!SECRET) {
  const path = require('path'), fs = require('fs');
  const dbDir = path.dirname(dbm.DB_PATH);                 // e.g. /data when DB_PATH=/data/world.db
  const candidates = [path.join(dbDir, 'session-secret'), path.join(__dirname, '..', 'data', 'session-secret')];
  const fp = candidates.find(f => { try { return fs.existsSync(f); } catch (_) { return false; } }) || candidates[0];
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
function loginKey(s) { return String(s || '').trim().toLowerCase().slice(0, 120); }
function validEmail(raw) {
  const s = loginKey(raw);
  if (s.length > 120 || s.length < 5) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}
function emailTaken(email, exceptId) {
  return !!dbm.getDb().prepare('SELECT id FROM accounts WHERE lower(email)=? AND id<>?').get(email, exceptId || 0);
}

function createAccount(username, pw, kind = 'user', email = '') {
  const db = dbm.getDb();
  const uname = sanitize(username).toLowerCase();
  if (!uname || uname.length < 2) throw new Error('Username must be at least 2 characters.');
  if (uname.length > 20) throw new Error('Username too long.');
  if (String(pw).length < 6) throw new Error('Password must be at least 6 characters.');
  if (uname.startsWith('~')) throw new Error('That name is reserved.');
  const exists = db.prepare('SELECT id FROM accounts WHERE username = ?').get(uname);
  if (exists) throw new Error('That username is already taken.');
  const em = email ? validEmail(email) : '';
  if (email && !em) throw new Error('That email address does not look right.');
  if (em && emailTaken(em)) throw new Error('That email already has an account in this town.');
  const salt = makeSalt();
  const info = db.prepare('INSERT INTO accounts (username, pass_hash, salt, kind, created_at, email) VALUES (?,?,?,?,?,?)')
    .run(uname, hashPassword(pw, salt), salt, kind, Date.now(), em);
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid);
}

function verifyLogin(login, pw) {
  const db = dbm.getDb();
  const key = loginKey(login);
  const acc = db.prepare("SELECT * FROM accounts WHERE kind = 'user' AND (username = ? OR (email <> '' AND lower(email) = ?))").get(key, key);
  if (!acc) return { err: 'No account with that name or email.' };
  if (acc.banned) return { err: 'This account has been banned.' + (acc.ban_reason ? ' Reason: ' + acc.ban_reason : '') };
  if (acc.pass_hash !== hashPassword(pw, acc.salt)) return { err: 'Wrong password.' };
  return { acc };
}

function setEmail(accId, email) {
  const em = validEmail(email);
  if (!em) throw new Error('That email address does not look right.');
  if (emailTaken(em, accId)) throw new Error('That email already has an account in this town.');
  dbm.getDb().prepare('UPDATE accounts SET email=? WHERE id=?').run(em, accId);
  return em;
}

function setPassword(accId, pw) {
  if (String(pw).length < 6) throw new Error('Password must be at least 6 characters.');
  const salt = makeSalt();
  dbm.getDb().prepare('UPDATE accounts SET salt=?, pass_hash=? WHERE id=?').run(salt, hashPassword(pw, salt), accId);
}

// Character creator payload from client.
// Mirrors public/js/avatar.js catalogue sizes ("Rainlight" engine: SKINS 16, FACE_FEAT 36,
// HAIRS 57, SHIRTS 39, ACCENTS 16, BODIES 8, EYES 12, FACIALS 24) minus one.
// Spec: skin|face|hair|shirt|accent|body|eyes|facial — the last two are optional on old saves.
const AVATAR_MAX = { skin: 15, face: 35, hair: 56, shirt: 38, accent: 15, body: 7, eyes: 11, facial: 23 };
const AVATAR_SLOTS = ['skin', 'face', 'hair', 'shirt', 'accent', 'body', 'eyes', 'facial'];
function clampInt(v, max) { v = parseInt(v, 10); return isNaN(v) ? 0 : Math.min(max, Math.max(0, v)); }

function profileFromForm(form) {
  const name = sanitize(form.name, 20);
  if (name.length < 2) throw new Error('Character name must be at least 2 characters.');
  const originId = C.ORIGINS.some(o => o.id === form.origin) ? form.origin : 'street';
  const p8 = String(form.avatar || '').split('|').map(x => parseInt(x, 10));
  const pick = (i, max) => {
    const v = p8[i];
    return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : clampInt(form[AVATAR_SLOTS[i]], max);
  };
  const avatar = AVATAR_SLOTS.map((k, i) => pick(i, AVATAR_MAX[k])).join('|');
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
    money: 2500, bank: 0, vault: 0,
    job: null,
    items: {},
    boosters: {},
    jail_until: null, hosp_until: null,
    total_crimes: 0, total_success: 0, total_fail: 0, wins: 0, losses: 0, hospital_times: 0,
    reputation: 0,
    achievements: {},
    faction: null,
    total_deposits: 0, total_market_spend: 0, total_shift: 0,
    happy: 50, max_happy: 100,
    property: 'shack', property_up: [],
    courses: {}, course: null, course_ends: null,
    merits: 0, merits_earned: 0, perks: {},
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

module.exports = { createAccount, verifyLogin, createPlayerForAccount, defaultPlayerJson, sanitize, AVATAR_MAX, AVATAR_SLOTS, makeSalt, hashPassword, signToken, verifyToken, setEmail, setPassword, validEmail, emailTaken, loginKey,
};
