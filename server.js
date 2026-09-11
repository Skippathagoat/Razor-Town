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

// First boot anywhere = playable world: seeds NPC citizens + gangs and creates the
// founder account when the database is empty. Idempotent, so restarts are cheap.
const world = boot.ensureWorld();   // BOTS env controls NPCs; default 0 = real players only
console.log('World ready. Content:', C.CRIMES.length, 'crimes |', C.JOBS.length, 'jobs |', Object.keys(C.ITEMS).length, 'items');
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
function withId(id, pj){ const m = W.publicView(pj); m.id = id; m.dev = isDevAcc(id); return m; }
function metaPayload(){
  return { crimes: C.CRIMES, crimeCats: C.CRIME_CATS, items: C.ITEMS, jobs: C.JOBS, gyms: C.GYMS, origins: C.ORIGINS, achievements: C.ACHIEVEMENTS,
    courses: C.COURSES, properties: C.PROPERTIES, meritPerks: C.MERIT_PERKS };
}
// load a player for a non-combat action, normalised (courses/perks/housing defaults)
function me(accId) { return W.normalize(W.load(accId)); }
// ------------------------------------------------ API
const routes = async (req, res, urlPath, q) => {
  const method = req.method;
  const accId = authOf(req);
  const body = method === 'POST' ? await readBody(req) : null;

  // -- auth & onboarding
  if (urlPath === '/api/register' && method === 'POST') {
    try {
      const acc = A.createAccount(body.username, body.password, 'user');
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
      content: { crimes: C.CRIMES.length, jobs: C.JOBS.length, items: Object.keys(C.ITEMS).length },
      now: new Date().toISOString()
    });
  }

  // -- me (200 + {me:null} when logged out, so the client can probe quietly)
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
    if (typeof body.avatar === 'string') p.avatar = String(body.avatar).slice(0, 40);
    if (typeof body.bio === 'string') p.bio = String(body.bio).replace(/[<>&]/g, '').slice(0, 120);
    W.save(id, p);
    return send(res, 200, { p: withId(id, p) });
  }

  // ==================== founder dev tools ====================
  if (urlPath === '/api/dev/panel' && method === 'GET') {
    const id = devOf(req, res); if (!id) return;
    const db = dbm.getDb();
    const players = db.prepare('SELECT a.id acc_id, a.username, p.name, p.json FROM accounts a JOIN players p ON p.acc_id=a.id WHERE a.id>0 ORDER BY a.id').all().slice(0, 300).map(r => {
      const pj = JSON.parse(r.json);
      return { acc_id: r.acc_id, username: r.username, name: r.name, level: W.publicView(pj).level || (pj.level || 1), money: pj.money || 0, bank: pj.bank || 0,
        jail_until: pj.jail_until || 0, hosp_until: pj.hosp_until || 0,
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
      case 'refill': p.life = p.max_life; p.energy = p.max_energy; p.nerve = p.max_nerve; p.happy = 100; break;
      case 'clear_status': p.jail_until = 0; p.hosp_until = 0; break;
      case 'grant_item': {
        const it = String(body.item || ''); if (!C.ITEMS[it]) return send(res, 400, { err: 'No such item.' });
        const q = Math.max(1, Math.min(99, parseInt(body.qty, 10) || 1));
        p.items = p.items || {}; p.items[it] = (p.items[it] || 0) + q; break;
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
    return send(res, 200, { ok: true, me: withId(id, p) });
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
    const tp = W.load(target);
    switch (op) {
      case 'grant_cash': tp.money = (tp.money || 0) + Math.max(-50000000, Math.min(50000000, parseInt(body.amount, 10) || 100000)); break;
      case 'clear_status': tp.jail_until = 0; tp.hosp_until = 0; break;
      case 'grant_sub': grantSubDays(db, target, Math.max(1, Math.min(30, parseInt(body.days, 10) || 7))); break;
      case 'revoke_sub': {
        const a = db.prepare('SELECT username FROM accounts WHERE id=?').get(target);
        if (a && C.WIRE_PASS.founders.includes(String(a.username).toLowerCase())) return send(res, 400, { err: 'Founders carry the pass forever.' });
        tp.sub_until = 0; break;
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
    return send(res, 200, {
      link: process.env.PASS_PAY_LINK || '',
      provider: process.env.PASS_PAY_PROVIDER || '',
      label: process.env.PASS_PAY_LABEL || 'Wire Pass — 1 week',
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
    };
    const fn = handlers[name];
    if (!fn) return send(res, 404, { err: 'Unknown action.' });
    try {
      const out = fn();
      if (out && out.err) return send(res, 400, { err: out.err });
      if (out && out.p) { out.p.id = id; pushAll('p', { id, name: out.p.name, rep: out.p.reputation, level: out.p.level }); }
      if (/^(crime|attack|casino|bazaar_buy|auction_bid|stock_buy|stock_sell|crypto_buy|crypto_sell)$/.test(name)) pushAll('news', { n: 1 });
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
