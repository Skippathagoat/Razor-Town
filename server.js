// Razor Town — HTTP server: static + REST + SSE. Zero framework.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const urlm = require('url');

const ROOT = path.join(__dirname, 'public');
const dbm = require('./lib/db.js');
const A = require('./lib/accounts.js');
const W = require('./lib/world.js');
const C = require('./lib/game/content.js');
const boot = require('./lib/bootstrap.js');
const E = require('./lib/game/engine.js');
const S = require('./lib/systems.js');

// First boot anywhere = playable world: seeds NPC citizens + gangs and creates the
// founder account when the database is empty. Idempotent, so restarts are cheap.
const world = boot.ensureWorld();   // BOTS env controls NPCs; default 0 = real players only
S.attach(W);                        // wire the 2026 systems once the DB exists
console.log('World ready. Content:', C.CRIMES.length, 'crimes |', C.JOBS.length, 'jobs |', Object.keys(C.ITEMS).length, 'items |', C.CITY_CONTRACTS.length, 'City Contracts');
console.log('Citizens:', world.citizens, '| gangs:', world.gangs, '| accounts:', world.accounts,
  world.bots ? '| NPC bots: ' + world.bots : '| NPC bots: off (real players only)',
  world.founder && world.founder.created ? '| founder created: ' + world.founder.username : '');
if (world.purged && (world.purged.bots || world.purged.factions)) {
  console.log('Purged NPCs ->', world.purged.bots, 'accounts,', world.purged.characters, 'characters,',
    world.purged.factions, 'seeded gangs,', world.purged.news, 'news rows,',
    world.purged.membersRemoved, 'players pulled out of those gangs');
}

// ---------------------------------------------------------------- SSE hub
const sseClients = new Set();
function pushAll(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) { try { res.write(msg); } catch (_) {} }
}
function tickAll() {
  try { W.raceView(null); } catch (_) {}   // keeps the Circuit board settling even with nobody watching
  const msg = `event: tick\ndata: {}\n\n`;
  for (const res of sseClients) { try { res.write(msg); } catch (_) {} }
}

// ---------------------------------------------------------------- helpers
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

function send(res, code, obj, type) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': type || (typeof obj === 'string' ? 'text/plain; charset=utf-8' : 'application/json'), 'Cache-Control': 'no-store' });
  res.end(body);
}
function sendError(res, code, err) {
  send(res, code, { err: err && err.message ? err.message : String(err) });
}
function cookieOf(req) {
  const c = (req.headers.cookie || '').split(';');
  for (const kv of c) { const i = kv.indexOf('='); if (i > -1 && kv.slice(0, i).trim() === 'nsc_t') return decodeURIComponent(kv.slice(i + 1).trim()); }
  return null;
}
function authOf(req) {
  const tok = cookieOf(req) || (urlm.parse(req.url, true).query.t) || '';
  const id = A.verifyToken(tok);
  if (!id) return null;
  return id;
}
function readBody(req, max = 100000) {
  return new Promise((resolve, reject) => {
    let d = ''; let tooBig = false;
    req.on('data', c => { d += c; if (d.length > max) { tooBig = true; d = ''; req.destroy(); } });
    req.on('end', () => { if (!tooBig) { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } } });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------- STRIPE (live pass fulfilment)
// Raw bytes are required for the webhook signature check — never JSON-parse first.
function readRawBody(req, max = 200000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0;
    req.on('data', c => { total += c.length; if (total > max) { req.destroy(); resolve(Buffer.concat(chunks)); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function stripeSigOk(raw, header, secret) {
  try {
    const parts = {};
    String(header || '').split(',').forEach(kv => { const i = kv.indexOf('='); parts[kv.slice(0, i)] = kv.slice(i + 1); });
    const t = parts.t, v1 = parts.v1;
    if (!t || !v1) return false;
    if (Math.abs(Date.now() / 1000 - parseInt(t, 10)) > 300) return false;   // 5-minute tolerance
    const expect = crypto.createHmac('sha256', secret).update(t + '.' + raw.toString('utf8')).digest('hex');
    const a = Buffer.from(v1, 'utf8'), b = Buffer.from(expect, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}
async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret) return send(res, 501, { err: 'Stripe webhook not configured on this server yet.' });
  const raw = await readRawBody(req);
  if (!stripeSigOk(raw, req.headers['stripe-signature'], secret)) return send(res, 400, { err: 'Bad signature.' });
  let ev;
  try { ev = JSON.parse(raw.toString('utf8')); } catch (e) { return send(res, 400, { err: 'Bad payload.' }); }
  if (ev.type !== 'checkout.session.completed') return send(res, 200, { received: true, ignored: ev.type });
  const sess = ev.data && ev.data.object ? ev.data.object : {};
  const accId = parseInt(sess.client_reference_id || (sess.metadata && sess.metadata.acc_id) || '0', 10);
  if (!accId) { console.error('stripe: session had no account reference', sess.id); return send(res, 200, { received: true, unassigned: true }); }
  const db = dbm.getDb();
  const acct = db.prepare('SELECT id, username FROM accounts WHERE id=?').get(accId);
  if (!acct) { console.error('stripe: unknown account in session', sess.id, accId); return send(res, 200, { received: true, unknown_account: accId }); }
  const evtRef = 'evt_' + String(ev.id || sess.id || '').slice(0, 60);
  const dupe = db.prepare("SELECT 1 FROM pay_claims WHERE method='stripe' AND ref=? AND status='approved'").get(evtRef);
  if (dupe) return send(res, 200, { received: true, duplicate: true });
  const days = parseInt(process.env.STRIPE_PASS_DAYS || '7', 10) || 7;
  const p = grantSubDays(db, accId, days);
  db.prepare("INSERT INTO pay_claims (acc_id, ts, method, ref, status, decided_by, decided_ts) VALUES (?,?,?,?,'approved',0,?)").run(accId, Date.now(), 'stripe', evtRef, Date.now());
  W.noteTo(accId, 0, 'The Wire Desk', '\uD83D\uDEE2\uFE0F Payment landed — your Wire Pass is live for ' + days + ' days (until ' + new Date(p.sub_until).toLocaleString() + '). Thank you for keeping the town running.');
  W.logNews('news', '\uD83D\uDD12', 'A citizen just went gold over the wire.');
  console.log('stripe: pass granted to', acct.username, '+', days, 'days via', evtRef);
  return send(res, 200, { received: true, granted: days, account: acct.username });
}

function serveStatic(req, res, urlPath) {
  let p = urlPath;
  if (p === '/') p = '/index.html';
  let file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e2, data) => {
      if (e2) return send(res, 404, 'Not found');
      const ext = path.extname(file).toLowerCase();
      const head = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
      if (ext === '.html' || ext === '.js' || ext === '.css') head['Cache-Control'] = 'no-cache';
      else head['Cache-Control'] = 'public, max-age=86400';
      res.writeHead(200, head);
      res.end(data);
    });
  });
}

// ------------------------------------------------ auth guards
function guard(req, res) {
  const accId = authOf(req);
  if (!accId) { send(res, 401, { err: 'Please log in.' }); return null; }
  const acc = dbm.getDb().prepare('SELECT * FROM accounts WHERE id=?').get(accId);
  if (!acc) { send(res, 401, { err: 'Account no longer exists.' }); return null; }
  if (acc.banned) { send(res, 403, { err: 'This account has been banned.' }); return null; }
  const player = dbm.getDb().prepare('SELECT acc_id FROM players WHERE acc_id=?').get(accId);
  if (!player) { send(res, 401, { err: 'No character yet. Create one first.' }); return null; }
  return accId;
}

// ---------------------------------------------------------------- founder dev tools + payments
const DEV_USERS = (process.env.DEV_ACCOUNTS || 'ghost,killa1979').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
const _devCache = new Map();
function isDevAcc(accId) {
  if (accId == null) return false;
  if (_devCache.has(accId)) return _devCache.get(accId);
  let f = false;
  try { const a = dbm.getDb().prepare('SELECT username FROM accounts WHERE id=?').get(accId); f = !!(a && DEV_USERS.includes(String(a.username).toLowerCase())); } catch (e) {}
  _devCache.set(accId, f); return f;
}
function devOf(req, res) {
  const id = authOf(req);
  if (!id) { send(res, 401, { err: 'Sign in first.' }); return null; }
  if (!isDevAcc(id)) { send(res, 403, { err: 'Founder tools only.' }); return null; }
  return id;
}
dbm.getDb().exec(`CREATE TABLE IF NOT EXISTS pay_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT, acc_id INTEGER NOT NULL, ts INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'other', ref TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
  decided_by INTEGER, decided_ts INTEGER)`);
function grantSubDays(db, accId, days) {
  const p = W.load(accId);
  p.sub_until = Math.max(Date.now(), p.sub_until || 0) + days * 86400000;
  W.save(accId, p);
  return p;
}
function withId(id, pj){
  const m = W.publicView(pj); m.id = id; m.dev = isDevAcc(id);
  const a = dbm.getDb().prepare('SELECT email FROM accounts WHERE id=?').get(id);
  m.needs_email = a ? !a.email : false;
  return m;
}
function metaPayload(){
  return { crimes: C.CRIMES, crimeCats: C.CRIME_CATS, items: C.ITEMS, jobs: C.JOBS, gyms: C.GYMS, origins: C.ORIGINS, achievements: C.ACHIEVEMENTS,
    courses: C.COURSES, properties: C.PROPERTIES, meritPerks: C.MERIT_PERKS,
    // 2026 expansion content
    cars: C.CARS, gigs: C.GIGS, recipes: C.RECIPES, districts: C.DISTRICTS, titles: C.TITLES,
    drops: C.DROP_POOL, dropPrices: C.SNEAKER_DROP_PRICE, emotes: C.EMOTES, factionOperations: C.FACTION_OPERATIONS,
    contractCatalog: { count: C.CITY_CONTRACTS.length, rotationHours: 4, offersPerRotation: 3 } };
}
// load a player for a non-combat action, normalised (courses/perks/housing defaults)
function me(accId) { return W.normalize(W.load(accId)); }
// ------------------------------------------------ API
const routes = async (req, res, urlPath, q) => {
  const method = req.method;
  const accId = authOf(req);
  if (urlPath === '/api/stripe/webhook' && method === 'POST') return stripeWebhook(req, res);
  const body = method === 'POST' ? await readBody(req) : null;

  // banned accounts are dead on arrival — existing tokens stop working everywhere
  if (accId && !['/api/register', '/api/login', '/api/logout', '/api/health', '/api/meta', '/api/validate'].includes(urlPath)) {
    const banRow = dbm.getDb().prepare('SELECT banned FROM accounts WHERE id=?').get(accId);
    if (banRow && banRow.banned) return send(res, 403, { err: 'This account has been banned.' });
  }

  // -- auth & onboarding
  if (urlPath === '/api/register' && method === 'POST') {
    if (!body.email || !String(body.email).trim()) return send(res, 400, { err: 'You need an email to found an account.' });
    try {
      const acc = A.createAccount(body.username, body.password, 'user', body.email);
      const form = body.profile || {};
      const pj = A.createPlayerForAccount(acc, form);
      const token = A.signToken(acc.id);
      W.logNews('welcome', '\uD83C\uDF88', `${pj.name} just walked into Razor Town.`);
      pushAll('news', { n: 1 });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `nsc_t=${encodeURIComponent(token)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax` });
      res.end(JSON.stringify({ ok: true, me: withId(acc.id, pj), token }));
    } catch (e) { sendError(res, 400, e); }
    return;
  }
  if (urlPath === '/api/login' && method === 'POST') {
    const r = A.verifyLogin(body.username, body.password);
    if (r.err) return send(res, 401, { err: r.err });
    const p = dbm.getDb().prepare('SELECT json FROM players WHERE acc_id=?').get(r.acc.id);
    if (!p) return send(res, 400, { err: 'No character on this account. Complete the character creator first.' });
    const token = A.signToken(r.acc.id);
    const pj = JSON.parse(p.json);
    W.logNews('login', '\uD83D\uDC65', `${pj.name} logged in. The city takes notice.`);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `nsc_t=${encodeURIComponent(token)}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax` });
    res.end(JSON.stringify({ ok: true, me: withId(r.acc.id, pj), token }));
    return;
  }
  if (urlPath === '/api/logout' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'nsc_t=; Path=/; Max-Age=0' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // -- online character creator: validate before register
  if (urlPath === '/api/validate' && method === 'POST') {
    try {
      const profile = body.profile || {};
      const db = dbm.getDb();
      const name = A.sanitize(profile.name, 20);
      let err = null;
      if (name.length < 2) err = 'Character name needs at least 2 characters.';
      else if (db.prepare('SELECT 1 FROM players WHERE name=?').get(name)) err = 'That character name is already taken in this city.';
      return send(res, 200, { ok: !err, err });
    } catch (e) { return sendError(res, 400, e); }
  }

  // -- content meta (public)
  if (urlPath === '/api/meta') { return send(res, 200, metaPayload()); }

  // -- health (public): lets uptime pingers + hosts check the game is alive
  if (urlPath === '/api/health') {
    const db = dbm.getDb();
    return send(res, 200, {
      ok: true,
      app: 'razor-town',
      up: Math.round(process.uptime()),
      started: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      live: sseClients.size,
      citizens: db.prepare('SELECT COUNT(*) c FROM players WHERE acc_id<0').get().c,
      accounts: db.prepare('SELECT COUNT(*) c FROM accounts').get().c,
      factions: db.prepare('SELECT COUNT(*) c FROM factions').get().c,
      content: { crimes: C.CRIMES.length, jobs: C.JOBS.length, items: Object.keys(C.ITEMS).length, contracts: C.CITY_CONTRACTS.length },
      now: new Date().toISOString()
    });
  }

  // -- me (200 + {me:null} when logged out, so the client can probe quietly)
  if (urlPath === '/api/jail' && method === 'GET') return send(res, 200, { inmates: W.jailBoard() });

  if (urlPath === '/api/world/races' && method === 'GET') {
    const rid = authOf(req);
    if (!rid) return send(res, 401, { err: 'Sign in first.' });
    return send(res, 200, W.raceView(rid));
  }

  if (urlPath === '/api/me' && method === 'GET') {
    const id = authOf(req);
    if (id) {
      const acc = dbm.getDb().prepare('SELECT id FROM accounts WHERE id=?').get(id);
      const pl = dbm.getDb().prepare('SELECT acc_id FROM players WHERE acc_id=?').get(id);
      if (acc && pl) {
        const p = W.ready(W.load(id));
        return send(res, 200, { me: withId(id, p) });
      }
    }
    return send(res, 200, { me: null });
  }
  if (urlPath === '/api/seen' && method === 'POST') {
    const id = guard(req, res); if (!id) return;
    const p = W.load(id); p.seen_tutorial = true; W.save(id, p);
    return send(res, 200, { ok: true });
  }
  if (urlPath === '/api/updateprofile' && method === 'POST') {
    const id = guard(req, res); if (!id) return;
    const p = W.load(id);
    if (typeof body.avatar === 'string') {
      // clamp every part against the live catalog, exactly like the creator does
      const parts = String(body.avatar).split('|').map(x => parseInt(x, 10));
      const maxes = [A.AVATAR_MAX.skin, A.AVATAR_MAX.face, A.AVATAR_MAX.hair, A.AVATAR_MAX.shirt, A.AVATAR_MAX.accent, A.AVATAR_MAX.body];
      p.avatar = maxes.map((mx, i) => {
        const v = parts[i];
        return Number.isFinite(v) ? Math.max(0, Math.min(mx, v)) : 0;
      }).join('|');
    }
    if (typeof body.bio === 'string') p.bio = String(body.bio).replace(/[<>&]/g, '').slice(0, 120);
    W.save(id, p);
    return send(res, 200, { p: withId(id, p) });
  }

  // ==================== founder dev tools ====================
  if (urlPath === '/api/account/email' && method === 'POST') {
    const id = guard(req, res); if (!id) return;
    try {
      const em = A.setEmail(id, body.email);
      return send(res, 200, { ok: true, email: em });
    } catch (e) { return send(res, 400, { err: e.message }); }
  }

  if (urlPath === '/api/dev/panel' && method === 'GET') {
    const id = devOf(req, res); if (!id) return;
    const db = dbm.getDb();
    const players = db.prepare('SELECT a.id acc_id, a.username, a.email, a.banned, a.ban_reason, a.created_at, p.name, p.json, p.updated_at FROM accounts a JOIN players p ON p.acc_id=a.id WHERE a.id>0 ORDER BY a.id').all().slice(0, 300).map(r => {
      const pj = JSON.parse(r.json);
      return { acc_id: r.acc_id, username: r.username, name: r.name, level: W.publicView(pj).level || (pj.level || 1), money: pj.money || 0, bank: pj.bank || 0,
        jail_until: pj.jail_until || 0, hosp_until: pj.hosp_until || 0,
        email: r.email || '', banned: !!r.banned, ban_reason: r.ban_reason || '', created: r.created_at || 0, active: r.updated_at || 0,
        sub: { active: E.subOn(pj), founder: !!pj.sub_founder, until: pj.sub_until || 0 }, dev: isDevAcc(r.acc_id) };
    });
    const claims = db.prepare("SELECT c.id, c.acc_id, c.ts, c.method, c.ref, c.status, a.username, p.name FROM pay_claims c JOIN accounts a ON a.id=c.acc_id JOIN players p ON p.acc_id=c.acc_id WHERE c.status='pending' ORDER BY c.ts DESC").all();
    return send(res, 200, { players, claims });
  }

  if (urlPath === '/api/dev/self' && method === 'POST') {
    const id = devOf(req, res); if (!id) return;
    const op = String(body.op || '');
    const clampAmt = (n, dflt) => { n = parseInt(n, 10); if (!Number.isFinite(n) || n === 0) n = dflt || 0; return Math.max(-50000000, Math.min(50000000, n)); };
    if (op === 'reset_self') {
      const cur = W.load(id);
      // step out of any gang first so the roster never holds a ghost seat
      if (cur.faction) { try { W.leaveFaction(id); } catch (_) {} }
      try { W.factionClearPending(id); } catch (_) {}
      const fresh = A.defaultPlayerJson({ name: cur.name, origin: cur.origin || 'street', avatar: cur.avatar, bio: cur.bio });
      fresh._acc = id;
      fresh.sub_founder = cur.sub_founder;      // founder tier survives a wipe, by design
      fresh.sub_until = cur.sub_until;
      W.save(id, fresh);
      return send(res, 200, { ok: true, me: withId(id, fresh) });
    }
    const p = W.load(id);
    switch (op) {
      case 'grant_cash': p.money = (p.money || 0) + clampAmt(body.amount, 100000); break;
      case 'grant_bank': p.bank = (p.bank || 0) + clampAmt(body.amount, 500000); break;
      case 'set_money': p.money = Math.max(0, clampAmt(body.amount, 50000)); break;
      case 'refill': p.life = p.max_life || 200; p.energy = p.max_energy || 100; p.nerve = p.max_nerve || 20; p.happy = p.max_happy || 100; p.life = p.max_life; p.energy = p.max_energy; p.nerve = p.max_nerve; break;
      case 'heal': p.life = p.max_life; p.hosp_until = 0; p.jail_until = p.jail_until || 0; break;
      case 'clear_status': p.jail_until = 0; p.hosp_until = 0; break;
      case 'clear_jail': p.jail_until = 0; break;
      case 'clear_hospital': p.hosp_until = 0; p.life = p.max_life; break;
      case 'grant_item': {
        const it = String(body.item || ''); if (!C.ITEMS[it]) return send(res, 400, { err: 'No such item.' });
        const q = Math.max(1, Math.min(99, parseInt(body.qty, 10) || 1));
        p.items = p.items || {}; p.items[it] = (p.items[it] || 0) + q; break;
      }
      case 'grant_all_items': {
        p.items = p.items || {};
        for (const k of Object.keys(C.ITEMS)) p.items[k] = (p.items[k] || 0) + 1;
        break;
      }
      case 'grant_xp': {
        const amt = Math.max(1, Math.min(5000000, parseInt(body.amount, 10) || 1000));
        p.xp = (p.xp || 0) + amt;
        break;
      }
      case 'grant_rep': {
        const amt = clampAmt(body.amount, 1000);
        p.reputation = (p.reputation || 0) + amt;
        break;
      }
      case 'grant_merit': {
        const amt = Math.max(1, Math.min(100, parseInt(body.amount, 10) || 1));
        p.merits = (p.merits || 0) + amt;
        p.merits_earned = (p.merits_earned || 0) + amt;
        break;
      }
      case 'max_stats': {
        p.stats = p.stats || { st:10,de:10,sp:10,dx:10 };
        p.stats.st = 100; p.stats.de = 100; p.stats.sp = 100; p.stats.dx = 100;
        break;
      }
      case 'set_stat': {
        const k = String(body.stat || 'st');
        const v = Math.max(1, Math.min(200, parseInt(body.value,10)||10));
        if (!['st','de','sp','dx'].includes(k)) return send(res,400,{err:'bad stat'});
        p.stats[k]=v; break;
      }
      case 'grant_pass': {
        p.sub_until = Math.max(Date.now(), p.sub_until||0)+7*86400000; break;
      }
      case 'grant_founder_pass': p.sub_founder=true; p.sub_until=Math.max(Date.now(),p.sub_until||0)+365*86400000; break;
      case 'revoke_pass': p.sub_until=0; p.sub_founder=false; break;
      case 'reset_cooldowns': {
        if (p.prison) { p.prison.shift_at=0; p.prison.gym_at=0; p.prison.gamble_at=0; p.prison.bust_at=0; }
        if (p.sys){ if(p.sys.fish) p.sys.fish.at=0; if(p.sys.salvage) p.sys.salvage.at=0; if(p.sys.plasma) p.sys.plasma.at=0; if(p.sys.courier) p.sys.courier.at=0; p._ref={ ...p._ref, energy:Date.now()-3600000, nerve:Date.now()-3600000 };}
        if(p.shop_caps) p.shop_caps={day:0,counts:{}};
        if(p.daily) {} // leave daily
        break;
      }
      case 'time_warp': {
        // fast-forward: clear course, jail, hospital timers
        if (p.course_ends) p.course_ends = Date.now()-1000;
        p.jail_until=0; p.hosp_until=0; p.life=p.max_life; p.energy=p.max_energy;
        break;
      }
      case 'unlock_all_courses': {
        p.courses = p.courses || {};
        for(const c of C.COURSES) p.courses[c.id]=Date.now();
        p.course=null; p.course_ends=null;
        break;
      }
      case 'unlock_all_achievements': {
        p.achievements = p.achievements || {};
        for(const k of Object.keys(C.ACHIEVEMENTS)) p.achievements[k]=Date.now();
        break;
      }
      case 'spawn_car': {
        // give a random car by directly pushing to sys garage — handled via items fallback
        const cars = C.CARS || [];
        if(cars.length){ const cid=cars[Math.floor(Math.random()*cars.length)].id; S.carBuy(id,cid); }
        break;
      }
      case 'give_vault': {
        const amt = clampAmt(body.amount, 100000);
        p.vault = (p.vault||0)+amt; break;
      }
      case 'set_level': {
        const lvl = Math.max(1, Math.min(100, parseInt(body.level, 10) || 1));
        let acc = 0, need = 300;
        for (let i = 1; i < lvl; i++) { acc += need; need = Math.floor(need * 1.06) + 100; }
        p.xp = acc; break;
      }
      default: return send(res, 400, { err: 'Unknown op: ' + op });
    }
    W.save(id, p);
    // ensure derived fields refresh
    try{ const fresh=W.load(id); return send(res,200,{ok:true,me:withId(id,fresh)});}catch(e){ return send(res,200,{ok:true,me:withId(id,p)});}
  }

  if (urlPath === '/api/dev/world' && method === 'POST') {
    const id = devOf(req, res); if (!id) return;
    const db = dbm.getDb();
    const op = String(body.op || '');
    if (op === 'announce') {
      const msg = String(body.message || '').replace(/[<>&]/g, '').slice(0, 200);
      if (!msg) return send(res, 400, { err: 'Say something.' });
      W.logNews('announce', '\uD83D\uDCE3', 'FOUNDER: ' + msg);
      pushAll('news', { n: 1 });
      return send(res, 200, { ok: true });
    }
    if (op === 'pay_decide') {
      const claimId = parseInt(body.claim_id, 10);
      const claim = db.prepare('SELECT * FROM pay_claims WHERE id=?').get(claimId);
      if (!claim || claim.status !== 'pending') return send(res, 400, { err: 'No pending claim with that id.' });
      const approve = !!body.approve;
      if (approve) grantSubDays(db, claim.acc_id, 7);
      db.prepare('UPDATE pay_claims SET status=?, decided_by=?, decided_ts=? WHERE id=?').run(approve ? 'approved' : 'declined', id, Date.now(), claimId);
      return send(res, 200, { ok: true, decided: approve ? 'approved' : 'declined' });
    }
    const target = parseInt(body.target, 10);
    const trow = db.prepare('SELECT 1 FROM players WHERE acc_id=?').get(target);
    if (!trow) return send(res, 400, { err: 'No such player.' });
    if (target === id) return send(res, 400, { err: 'Use Self tools for your own sheet.' });
    const founderUnames = C.WIRE_PASS.founders;
    const targetAcc = db.prepare('SELECT username FROM accounts WHERE id=?').get(target);
    const targetUname = targetAcc ? String(targetAcc.username).toLowerCase() : '';
    const untouchable = isDevAcc(target) || founderUnames.includes(targetUname);
    if (op === 'ban') {
      if (untouchable) return send(res, 400, { err: 'Founders cannot be banned.' });
      const reason = String(body.reason || '').replace(/[<>&]/g, '').slice(0, 140);
      db.prepare('UPDATE accounts SET banned=1, ban_reason=?, ban_by=?, ban_ts=? WHERE id=?').run(reason, id, Date.now(), target);
      return send(res, 200, { ok: true });
    }
    if (op === 'unban') {
      db.prepare("UPDATE accounts SET banned=0, ban_reason='', ban_by=0, ban_ts=0 WHERE id=?").run(target);
      return send(res, 200, { ok: true });
    }
    if (op === 'set_password') {
      if (untouchable) return send(res, 400, { err: 'Founder passwords are yours to keep — set them yourself.' });
      try { A.setPassword(target, body.password); return send(res, 200, { ok: true }); }
      catch (e) { return send(res, 400, { err: e.message }); }
    }
    if (op === 'jail') {
      const tj = W.devJail(parseInt(body.target, 10) || 0, body.minutes);
      return tj.err ? send(res, 404, { err: tj.err }) : send(res, 200, { ok: true, jailed: tj.name, minutes: tj.minutes });
    }
    if (op === 'delete_account') {
      if (untouchable) return send(res, 400, { err: 'Founders are eternal.' });
      const grow = db.prepare('SELECT name FROM players WHERE acc_id=?').get(target);
      const pname = grow ? grow.name : targetUname;
      // factions: leave/fix ownership, drop the gang if they were the last one in
      for (const f of db.prepare('SELECT id, json FROM factions').all()) {
        let d; try { d = JSON.parse(f.json || '{}'); } catch (e) { continue; }
        if (!(d.memberIds || []).includes(target)) continue;
        if (d.memberIds.length <= 1) { db.prepare('DELETE FROM factions WHERE id=?').run(f.id); continue; }
        d.memberIds = d.memberIds.filter(i => i !== target);
        d.officers = (d.officers || []).filter(i => i !== target);
        if (d.ownerAcc === target) {
          d.ownerAcc = d.memberIds[0];
          const nx = db.prepare('SELECT name FROM players WHERE acc_id=?').get(d.ownerAcc);
          d.ownerName = nx ? nx.name : 'The yard';
        }
        db.prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id);
      }
      db.prepare('DELETE FROM listings WHERE seller_acc=?').run(target);
      db.prepare('DELETE FROM auctions WHERE seller_acc=?').run(target);
      db.prepare("UPDATE auctions SET cur_bid=0, bidder_acc=NULL WHERE bidder_acc=?").run(target);
      db.prepare('DELETE FROM bounties WHERE from_acc=? OR target_acc=?').run(target, target);
      db.prepare('DELETE FROM messages WHERE from_acc=? OR to_acc=?').run(target, target);
      db.prepare('DELETE FROM chat WHERE acc=?').run(target);
      db.prepare('DELETE FROM news WHERE message LIKE ?').run('%' + String(pname).replace(/[%_]/g, '') + '%');
      db.prepare('DELETE FROM pay_claims WHERE acc_id=? OR decided_by=?').run(target, target);
      db.prepare('DELETE FROM players WHERE acc_id=?').run(target);
      db.prepare('DELETE FROM accounts WHERE id=?').run(target);
      W.logNews('gone', '\uD83D\uDD73\uFE0F', pname + ' was struck off the ledger.');
      return send(res, 200, { ok: true, gone: pname });
    }
    const tp = W.load(target);
    switch (op) {
      case 'grant_cash': tp.money = (tp.money || 0) + Math.max(-50000000, Math.min(50000000, parseInt(body.amount, 10) || 100000)); break;
      case 'grant_bank': tp.bank = (tp.bank || 0) + Math.max(-50000000, Math.min(50000000, parseInt(body.amount, 10) || 100000)); break;
      case 'set_money': tp.money = Math.max(0, Math.min(50000000, parseInt(body.amount, 10) || 0)); break;
      case 'clear_status': tp.jail_until = 0; tp.hosp_until = 0; break;
      case 'clear_jail': tp.jail_until = 0; break;
      case 'clear_hospital': tp.hosp_until = 0; tp.life = tp.max_life; break;
      case 'heal': tp.life = tp.max_life; tp.hosp_until = 0; break;
      case 'refill': tp.life = tp.max_life || 200; tp.energy = tp.max_energy || 100; tp.nerve = tp.max_nerve || 20; tp.happy = tp.max_happy || 100; break;
      case 'grant_item': {
        const it = String(body.item || ''); if (!C.ITEMS[it]) return send(res, 400, { err: 'No such item.' });
        const q = Math.max(1, Math.min(99, parseInt(body.qty, 10) || 1));
        tp.items = tp.items || {}; tp.items[it] = (tp.items[it] || 0) + q; break;
      }
      case 'grant_all_items': {
        tp.items = tp.items || {};
        for (const k of Object.keys(C.ITEMS)) tp.items[k] = (tp.items[k] || 0) + 1;
        break;
      }
      case 'grant_xp': tp.xp = (tp.xp||0)+ Math.max(1,Math.min(5000000,parseInt(body.amount,10)||1000)); break;
      case 'grant_rep': tp.reputation = (tp.reputation||0)+ Math.max(-50000000,Math.min(50000000,parseInt(body.amount,10)||1000)); break;
      case 'grant_merit': { const amt=Math.max(1,Math.min(100,parseInt(body.amount,10)||1)); tp.merits=(tp.merits||0)+amt; tp.merits_earned=(tp.merits_earned||0)+amt; break; }
      case 'max_stats': tp.stats={st:100,de:100,sp:100,dx:100}; break;
      case 'set_stat': { const k=String(body.stat||'st'); const v=Math.max(1,Math.min(200,parseInt(body.value,10)||10)); if(!['st','de','sp','dx'].includes(k)) return send(res,400,{err:'bad stat'}); tp.stats[k]=v; break; }
      case 'set_level': {
        const lvl = Math.max(1, Math.min(100, parseInt(body.level, 10) || 1));
        let acc = 0, need = 300;
        for (let i = 1; i < lvl; i++) { acc += need; need = Math.floor(need * 1.06) + 100; }
        tp.xp = acc; break;
      }
      case 'grant_sub': {
        const days=Math.max(1, Math.min(30, parseInt(body.days,10)||7));
        tp.sub_until=Math.max(Date.now(), tp.sub_until||0)+days*86400000; break;
      }
      case 'founder_sub': tp.sub_founder = true; tp.sub_until=Math.max(Date.now(),tp.sub_until||0)+30*86400000; break;
      case 'revoke_sub': {
        const a = db.prepare('SELECT username FROM accounts WHERE id=?').get(target);
        if (a && C.WIRE_PASS.founders.includes(String(a.username).toLowerCase())) return send(res, 400, { err: 'Founders carry the pass forever.' });
        tp.sub_until = 0; tp.sub_founder = false; break;
      }
      case 'hospital': {
        const mins = Math.max(1, Math.min(1440, parseInt(body.minutes,10)||30));
        tp.hosp_until = Date.now()+ mins*60000; tp.life=1; break;
      }
      case 'give_vault': tp.vault=(tp.vault||0)+ Math.max(0,Math.min(50000000,parseInt(body.amount,10)||100000)); break;
      case 'reset_cooldowns': {
        if (tp.prison) { tp.prison.shift_at=0; tp.prison.gym_at=0; tp.prison.gamble_at=0; tp.prison.bust_at=0; }
        tp._ref={ ...tp._ref, energy:Date.now()-3600000, nerve:Date.now()-3600000 };
        if(tp.shop_caps) tp.shop_caps={day:0,counts:{}};
        break;
      }
      case 'time_warp': {
        if(tp.course_ends) tp.course_ends=Date.now()-1000; tp.jail_until=0; tp.hosp_until=0; tp.life=tp.max_life; tp.energy=tp.max_energy;
        break;
      }
      case 'unlock_all_courses': {
        tp.courses = tp.courses||{}; for(const c of C.COURSES) tp.courses[c.id]=Date.now(); tp.course=null; tp.course_ends=null; break;
      }
      case 'unlock_all_achievements': {
        tp.achievements=tp.achievements||{}; for(const k of Object.keys(C.ACHIEVEMENTS)) tp.achievements[k]=Date.now(); break;
      }
      default: return send(res, 400, { err: 'Unknown op: ' + op });
    }
    W.save(target, tp);
    return send(res, 200, { ok: true });
  }

  // ==================== real-money pass payments ====================
  if (urlPath === '/api/pay/config' && method === 'GET') {
    const id = guard(req, res); if (!id) return;
    const db = dbm.getDb();
    const pending = db.prepare("SELECT id, ts, method, ref FROM pay_claims WHERE acc_id=? AND status='pending' ORDER BY ts DESC LIMIT 1").get(id);
    const base = process.env.PASS_PAY_LINK || '';
    const acct = db.prepare('SELECT email FROM accounts WHERE id=?').get(id);
    let linkUrl = base;
    if (base) {
      const sep = base.includes('?') ? '&' : '?';
      linkUrl = base + sep + 'client_reference_id=' + id + (acct && acct.email ? '&prefilled_email=' + encodeURIComponent(acct.email) : '');
    }
    return send(res, 200, {
      link: base,
      linkUrl,
      provider: process.env.PASS_PAY_PROVIDER || 'Stripe',
      label: process.env.PASS_PAY_LABEL || 'Wire Pass — 1 week',
      autofulfill: !!process.env.STRIPE_WEBHOOK_SECRET,
      pendingClaim: pending || null
    });
  }
  if (urlPath === '/api/pay/claim' && method === 'POST') {
    const id = guard(req, res); if (!id) return;
    const method = ['stripe', 'paypal', 'other'].includes(body.method) ? body.method : 'other';
    const ref = String(body.ref || '').replace(/[<>&]/g, '').trim().slice(0, 120);
    if (!ref) return send(res, 400, { err: 'Drop your name or payment reference so the founder can match it.' });
    const db = dbm.getDb();
    const dupe = db.prepare("SELECT 1 FROM pay_claims WHERE acc_id=? AND status='pending'").get(id);
    if (dupe) return send(res, 429, { err: 'You already have a claim waiting for the founder.' });
    const r = db.prepare('INSERT INTO pay_claims (acc_id, ts, method, ref) VALUES (?,?,?,?)').run(id, Date.now(), method, ref);
    return send(res, 200, { ok: true, claim_id: r.lastInsertRowid });
  }

  // -- gameplay actions
  if (urlPath === '/api/action' && method === 'POST') {
    const id = guard(req, res); if (!id) return;
    const name = body.name;
    const handlers = {
      crime: () => W.doCrime(id, body.crimeId),
      prison: () => W.prisonDo(id, body),
      bail_other: () => W.prisonBailOther(id, body.targetId ? parseInt(body.targetId, 10) : 0),
      daily: () => W.dailyClaim(id),
      wire: () => W.wireCash(id, body),
      spin_wheel: () => W.wheelSpin(id),
      race_bet: () => W.raceBet(id, body),
      heist_walk: () => W.heistWalk(id, body.group),
      train: () => W.doTrain(id, body.stat, body.gymId),
      work: () => W.doWork(id),
      attack: () => W.doAttack(id, body.targetId),
      buy: () => W.doBuy(id, body.itemId, body.qty),
      sell: () => W.doSell(id, body.itemId, body.qty),
      use: () => W.doUse(id, body.itemId),
      deposit: () => W.doDeposit(id, body.amount),
      withdraw: () => W.doWithdraw(id, body.amount),
      casino: () => W.doCasino(id, body),
      bazaar_list: () => W.listItem(id, body.itemId, body.qty, body.each, body.anon),
      bazaar_buy: () => W.buyListing(id, body.listingId),
      auction_create: () => W.auctionCreate(id, body.itemId, body.qty, body.minBid, body.buyout, body.hours),
      auction_bid: () => W.auctionBid(id, body.auctionId, body.amount),
      auction_cancel: () => W.auctionCancel(id, body.auctionId),
      equip: () => W.equipItem(id, body.itemId),
      unequip: () => W.unequipItem(id, body.slot),
      stock_buy: () => W.stockBuy(id, body.sym, body.qty),
      stock_sell: () => W.stockSell(id, body.sym, body.qty),
      crypto_buy: () => W.cryptoBuy(id, body.sym, body.amount),
      crypto_sell: () => W.cryptoSell(id, body.sym, body.qty),
      bazaar_cancel: () => W.cancelListing(id, body.listingId),
      faction_create: () => W.createFaction(id, body.factionName || body.name, body.tag, body.desc),
      faction_join: () => W.joinFaction(id, body.fid),
      faction_leave: () => W.leaveFaction(id),
      job_apply: () => W.applyJob(id, body.jobId),
      job_quit: () => W.quitJob(id),
      msg: () => W.sendMsg(id, body.to, body.body),
      // -- property, education, merits, bounties
      property_buy: () => W.buyProperty(id, body.propertyId),
      property_upgrade: () => W.upgradeProperty(id, body.upgradeId),
      property_sell: () => W.sellProperty(id),
      vault_in: () => W.moveVault(id, body.amount, 'in'),
      vault_out: () => W.moveVault(id, body.amount, 'out'),
      course_start: () => W.startCourse(id, body.courseId),
      course_quit: () => W.abortCourse(id),
      merit_buy: () => W.buyMerit(id, body.perkId),
      bounty_place: () => W.placeBounty(id, body.targetId, body.amount, body.anon),
      chat_msg: () => W.chatPost(id, body.chan, body.body),
      pawn_sell: () => W.pawnSell(id, body.itemId, body.qty),
      loan_take: () => W.loanTake(id, body.amount),
      loan_repay: () => W.loanRepay(id, body.amount),
      bust_out: () => W.bustOut(id, body.targetId),
      shop_buy: () => W.shopBuy(id, body.shopId, body.itemId),
      mission_claim: () => W.missionClaim(id, body.mid),
      pass_buy: () => W.passBuy(id),
      fbank_in: () => W.factionBankIn(id, body.amount),
      fbank_out: () => W.factionBankOut(id, body.amount),
      fupgrade: () => W.factionBuyUpgrade(id, body.upId),
      fannounce: () => W.factionAnnounce(id, body.text),
      fpromote: () => W.factionPromote(id, body.targetId),
      faction_apply: () => W.factionApply(id, body.fid),
      faction_recruiting: () => W.factionSetRecruiting(id, body.mode),
      faction_review: () => W.factionReviewApplication(id, body.targetId, body.decision),
      faction_roll: () => W.factionRoll(id),
      faction_operation: () => W.factionOperation(id, body.opId),
      faction_kick: () => W.factionKick(id, body.targetId),
      faction_transfer: () => W.factionTransfer(id, body.targetId),
      faction_invite: () => W.factionInvite(id, body.target),
      faction_invite_cancel: () => W.factionInviteCancel(id, body.targetId),
      faction_edit: () => W.factionEdit(id, { name: body.factionName, tag: body.tag, desc: body.desc }),
      farmory_in: () => W.factionArmoryIn(id, body.itemId, body.qty),
      farmory_out: () => W.factionArmoryOut(id, body.itemId, body.qty),
      faction_raid: () => W.factionRaid(id, body.fid),
      // ---------- 2026 systems ----------
      // arcade
      arcade_mines: () => S.arcadeMines(id, body),
      arcade_plinko: () => S.arcadePlinko(id, body),
      arcade_dice: () => S.arcadeDice(id, body),
      arcade_coin: () => S.arcadeCoin(id, body),
      arcade_hoops: () => S.arcadeHoops(id, body),
      arcade_buzz: () => S.arcadeBuzz(id, body),
      arcade_memory: () => S.arcadeMemory(id, body),
      arcade_safe: () => S.arcadeSafe(id, body),
      scratch: () => S.scratch(id, body),
      lottery_buy: () => S.lotteryBuy(id, body),
      // hustles
      gig_do: () => S.gigDo(id, body.gigId),
      city_contract: () => S.cityContractDo(id, body.contractId),
      courier_take: () => S.courierTake(id),
      courier_deliver: () => S.courierDeliver(id),
      fish_cast: () => S.fishCast(id),
      salvage_run: () => S.salvageRun(id),
      plasma_donate: () => S.plasmaDonate(id),
      trial_join: () => S.trialJoin(id),
      busk_play: () => S.buskPlay(id),
      storage_open: () => S.storageOpen(id, body.unitIdx),
      box_open: () => S.boxOpen(id),
      drop_buy: () => S.dropBuy(id, body.itemId),
      clout_post: () => S.cloutPost(id, body),
      tag_wall: () => S.tagWall(id, body.districtId),
      // social
      friend_add: () => S.friendAdd(id, body.target),
      friend_remove: () => S.friendRemove(id, body.target),
      block_add: () => S.blockAdd(id, body.target),
      block_remove: () => S.blockRemove(id, body.target),
      gift_send: () => S.giftSend(id, body),
      // garage
      car_buy: () => S.carBuy(id, body.carId),
      car_sell: () => S.carSell(id, body.idx),
      car_paint: () => S.carPaint(id, body.idx, body.color),
      street_race: () => S.streetRace(id, body),
      chop_car: () => S.chopCar(id, body.idx),
      // turf
      turf_claim: () => S.turfClaim(id, body.districtId),
      turf_release: () => S.turfRelease(id, body.districtId),
      turf_collect: () => S.turfCollect(id),
      // finance extras
      stake_ngt: () => S.stakeNgt(id, body.amount),
      unstake_ngt: () => S.unstakeNgt(id, body.amount),
      term_deposit: () => S.termDeposit(id, body.amount, body.hours),
      term_collect: () => S.termCollect(id),
      // craft / collect / wardrobe / challenges
      craft: () => S.craft(id, body.recipeId),
      card_open: () => S.cardOpen(id),
      wardrobe_save: () => S.wardrobeSave(id, body.slot),
      wardrobe_load: () => S.wardrobeLoad(id, body.slot),
      challenge_claim: () => S.challengeClaim(id, body.cid),
      respec_apply: () => S.respecApply(id, body),
    };
    const fn = handlers[name];
    if (!fn) return send(res, 404, { err: 'Unknown action.' });
    try {
      const out = fn();
      try { S.track(id, name, out); } catch (_) {}
      if (out && out.err) return send(res, 400, { err: out.err });
      if (out && out.p) { out.p.id = id; pushAll('p', { id, name: out.p.name, rep: out.p.reputation, level: out.p.level }); }
      if (/^(crime|attack|casino|bazaar_buy|auction_bid|stock_buy|stock_sell|crypto_buy|crypto_sell|street_race|turf_claim|drop_buy|storage_open|lottery_buy|faction_raid|faction_operation|faction_roll)$/.test(name)) pushAll('news', { n: 1 });
      if (name === 'bounty_place') pushAll('news', { n: 1 });
      return send(res, 200, out);
    } catch (e) { console.error('action err', e); return sendError(res, 500, 'Something went wrong in the city.'); }
  }

  // -- chat / shops / missions
  if (urlPath === '/api/chat') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, W.chatFeed(id, q.chan, q.since));
  }
  if (urlPath === '/api/shops') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, W.shopsView(id));
  }
  if (urlPath === '/api/missions') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, W.missionsView(id));
  }
  if (urlPath === '/api/faction/detail') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, W.factionDetail(id));
  }
  if (urlPath === '/api/finance/desk') {
    const id = guard(req, res); if (!id) return;
    const p = W.ready(W.load(id));
    return send(res, 200, { loan: W.loanView(p), pass: W.passView(p) });
  }

  // -- 2026 systems panel (one read for every new tab)
  if (urlPath === '/api/sys/panel') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, S.panel(id));
  }

  // -- world reads
  if (urlPath === '/api/world/news') {
    return send(res, 200, { items: W.recentNews(30) });
  }
  if (urlPath === '/api/world/leaders') {
    const kind = q.kind || 'rep';
    return send(res, 200, { kind, list: W.leaderboard(kind), me: accId ? W.myRank(kind, accId) : null });
  }
  if (urlPath === '/api/world/bazaar') {
    return send(res, 200, W.bazaarView(accId));
  }
  if (urlPath === '/api/world/auctions') {
    return send(res, 200, W.auctionView(accId));
  }
  if (urlPath === '/api/world/stocks') {
    return send(res, 200, W.stockView(accId));
  }
  if (urlPath === '/api/world/crypto') {
    return send(res, 200, W.cryptoView(accId));
  }
  if (urlPath === '/api/world/bounties') {
    const meP = accId ? W.loadSafe(accId) : null;
    return send(res, 200, W.bountyList(meP ? W.normalize(meP) : null));
  }
  if (urlPath === '/api/world/college') {
    const meC = accId ? W.loadSafe(accId) : null;
    if (!meC) return send(res, 200, { courses: C.COURSES });
    return send(res, 200, W.eduView(W.normalize(meC)));
  }
  if (urlPath === '/api/world/estate') {
    return send(res, 200, { properties: C.PROPERTIES });
  }
  if (urlPath === '/api/world/merits') {
    const meM = accId ? W.loadSafe(accId) : null;
    if (!meM) return send(res, 200, { perks: C.MERIT_PERKS, points: 0 });
    return send(res, 200, W.meritView(W.normalize(meM)));
  }
  if (urlPath === '/api/world/factions') {
    const f = W.listFactions();
    return send(res, 200, f);
  }
  if (urlPath === '/api/world/online') {
    // real live connections only — no invented players
    return send(res, 200, { online: sseClients.size });
  }
  if (urlPath === '/api/attacks') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, W.attackTargets(id));
  }
  if (urlPath === '/api/messages') {
    const id = guard(req, res); if (!id) return;
    return send(res, 200, { inbox: W.myMessages(id), sent: W.sentMessages(id) });
  }
  if (urlPath === '/api/profile' && q.id) {
    const tid = parseInt(q.id, 10);
    const r = dbm.getDb().prepare('SELECT json FROM players WHERE acc_id=?').get(tid);
    if (!r) return send(res, 404, { err: 'No such citizen.' });
    const p = W.ready(JSON.parse(r.json));
    const isMe = accId === tid;
    const isBot = tid < 0;
    return send(res, 200, {
      profile: {
        id: tid, name: p.name, avatar: p.avatar, isBot, isMe,
        level: p.level, total: p.total, stats: isMe ? p.stats : { st: p.stats.st, de: p.stats.de, sp: p.stats.sp, dx: p.stats.dx },
        rep: p.reputation, crimes: p.total_crimes, wins: p.wins, losses: p.losses,
        life: isBot ? null : p.life, max: p.max_life,
        wealth: isMe ? p.money + p.bank : null,
        faction: p.faction,
        items: isMe ? p.items : null,
        job: isBot ? (p.job || null) : (isMe ? p.job : null),
        bio: p.bio, created: p.created, origin: p.origin,
        achCount: Object.keys(p.achievements).length
      }
    });
  }

  // SSE stream
  if (urlPath === '/api/stream') {
    const id = guard(req, res); if (!id) return;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(`retry: 5000\n\n`);
    res.write(`event: hello\ndata: {"ok":true}\n\n`);
    sseClients.add(res);
    const keep = setInterval(() => { try { res.write(`: keep\n\n`); } catch (_) {} }, 25000);
    req.on('close', () => { clearInterval(keep); sseClients.delete(res); });
    return;
  }

  send(res, 404, { err: 'No such route.' });
};

// ---------------------------------------------------------------- http server
// A live game must not fall over quietly. Anything that escapes a handler gets logged,
// answered with a clean 500, and the process keeps serving the people already playing.
process.on('unhandledRejection', (e) => { console.error('unhandled rejection (kept serving):', e); });
process.on('uncaughtException', (e) => { console.error('uncaught exception (kept serving):', e); });

const server = http.createServer(async (req, res) => {
  const u = urlm.parse(req.url, true);
  const pathname = decodeURIComponent(u.pathname);
  try {
    if (pathname.startsWith('/api/')) return await routes(req, res, pathname, u.query);
    if (req.method === 'GET') return serveStatic(req, res, pathname);
    res.writeHead(405); res.end();
  } catch (e) {
    console.error('server error', e);
    try { send(res, 500, { err: 'Server hiccup.' }); } catch (_) {}
  }
});

// town wire pulse: keeps the feed breathing without inventing citizens.
// Used only where it can be said without naming a person who doesn't exist.
function ambientNews() {
  const raw = C.NEWS_FLAIR.filter(l => !l.includes('{name}'));
  if (!raw.length) return;
  const pick = raw[Math.floor(Math.random() * raw.length)];
  const place = C.PLACES[Math.floor(Math.random() * C.PLACES.length)];
  W.logNews('news', '\uD83D\uDCF0', pick.replace('{place}', place));
}
setInterval(() => {
  const names = [
    ...dbm.getDb().prepare('SELECT p.name FROM players p JOIN accounts a ON a.id=p.acc_id WHERE a.kind=\'bot\' ORDER BY RANDOM() LIMIT 1').all()
  ];
  if (!names.length) { ambientNews(); pushAll('news', { n: 1 }); return; }
  const nm = names[0].name;
  const kind = ['crime', 'fight', 'news'][Math.floor(Math.random() * 3)];
  const pick = C.NEWS_FLAIR[Math.floor(Math.random() * C.NEWS_FLAIR.length)];
  const place = C.PLACES[Math.floor(Math.random() * C.PLACES.length)];
  W.logNews(kind, kind === 'crime' ? '\uD83D\uDCB0' : kind === 'fight' ? '\u2694\uFE0F' : '\uD83C\uDFAF', pick.replace('{name}', nm).replace('{place}', place));
  pushAll('news', { n: 1 });
}, 24000);
setInterval(tickAll, 4000);

const PORT = process.env.PORT || 8787;
server.listen(PORT, '0.0.0.0', () => console.log(`Razor Town listening on http://0.0.0.0:${PORT}`));

// a live Circuit round must never die unpaid on deploy — settle before Northflank swaps the process, then EXIT
// (installing a SIGTERM handler suppresses node's default terminate, so exit explicitly or deploys hang)
process.on('SIGTERM', () => { try { W.raceSettleNow(); } catch (_) {} process.exit(0); });
