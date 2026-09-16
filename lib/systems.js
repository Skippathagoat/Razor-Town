// Razor Town — 2026 systems module.
// Every new subsystem lives here: Arcade, Hustles, Garage, Turf, Finance extras,
// Social, Crafting, Clout, Events, Daily Challenges, Wardrobe and more.
// The module is wired to world.js through S.attach() at boot (no circular requires).
'use strict';
const dbm = require('./db.js');
const E = require('./game/engine.js');
const C = require('./game/content.js');
const makeStreet = require('./game/street-life.js');
const INF = require('./game/informants.js');

const db = () => dbm.getDb();
const M = Math;
const rnd = (n) => M.floor(M.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const now = () => Date.now();
const MIN = 60000, HOUR = 3600000, DAY = 86400000;

// injected world helpers (set by server.js at boot)
let W = null;
let SL = null;
function attach(world) {
  W = world;
  ensureTables();
  SL = makeStreet({ W, C, E, sys, locked, err, now, MIN, HOUR, DAY, rnd, pick, M });
}

function ensureTables() {
  db().exec(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, val TEXT NOT NULL DEFAULT '{}')`);
  db().exec(`CREATE TABLE IF NOT EXISTS turf (district TEXT PRIMARY KEY, acc_id INTEGER, since INTEGER NOT NULL DEFAULT 0)`);
}
function kvGet(key, dflt) {
  try { const r = db().prepare('SELECT val FROM kv WHERE key=?').get(key); return r ? JSON.parse(r.val) : dflt; }
  catch (e) { return dflt; }
}
function kvSet(key, val) {
  db().prepare('INSERT INTO kv (key,val) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val').run(key, JSON.stringify(val));
}

// ------------------------------------------------ state bootstrap
function sys(p) {
  if (!p.sys) p.sys = {};
  const s = p.sys;
  if (!s.gigs) s.gigs = { day: 0, at: 0, ids: [], done: 0 };
  if (!s.contracts || typeof s.contracts !== 'object') s.contracts = { slot: -1, done: [], total: 0, wins: 0 };
  if (!Array.isArray(s.contracts.done)) s.contracts.done = [];
  if (!Number.isFinite(s.contracts.slot)) s.contracts.slot = -1;
  if (!Number.isFinite(s.contracts.total)) s.contracts.total = 0;
  if (!Number.isFinite(s.contracts.wins)) s.contracts.wins = 0;
  if (!s.nights || typeof s.nights !== 'object') s.nights = { slot: -1, done: [], total: 0, wins: 0 };
  if (!Array.isArray(s.nights.done)) s.nights.done = [];
  if (!Number.isFinite(s.nights.slot)) s.nights.slot = -1;
  if (!Number.isFinite(s.nights.total)) s.nights.total = 0;
  if (!Number.isFinite(s.nights.wins)) s.nights.wins = 0;
  if (!s.favours || typeof s.favours !== 'object') s.favours = { slot: -1, done: [], total: 0, wins: 0 };
  if (!Array.isArray(s.favours.done)) s.favours.done = [];
  if (!Number.isFinite(s.favours.slot)) s.favours.slot = -1;
  if (!Number.isFinite(s.favours.total)) s.favours.total = 0;
  if (!Number.isFinite(s.favours.wins)) s.favours.wins = 0;
  if (!s.fish) s.fish = { at: 0, caught: 0, best: null };
  if (!s.salvage) s.salvage = { at: 0, runs: 0 };
  if (!s.courier) s.courier = { active: null, at: 0, done: 0 };
  if (!s.plasma) s.plasma = { at: 0, n: 0 };
  if (!s.trials) s.trials = { at: 0, n: 0 };
  if (!s.busk) s.busk = { at: 0, n: 0 };
  if (!s.storage) s.storage = { day: 0 };
  if (!s.arcade) s.arcade = { wins: 0, mines: null, safe: null, buzzBest: 0, memoryBest: 0, plinkoBest: 0 };
  if (!s.lottery) s.lottery = { day: 0, tickets: [], won: 0 };
  if (!s.cars) s.cars = [];
  if (!s.races) s.races = { wins: 0, losses: 0, at: 0 };
  if (!s.chop) s.chop = 0;
  if (!s.turf) s.turf = { influence: 0, collected: 0, lastCollect: 0 };
  if (!s.stake) s.stake = { amt: 0, at: 0 };
  if (!s.term) s.term = null;
  if (!s.dividends) s.dividends = { at: 0, total: 0 };
  if (s.followers == null) s.followers = p.origin === 'clout' ? 500 : 50;
  if (!s.clout) s.clout = { at: 0, posts: 0 };
  if (!s.tags) s.tags = { n: 0, by: {} };
  if (!s.craft) s.craft = 0;
  if (!s.cards) s.cards = {};
  if (s.cardsDone == null) s.cardsDone = false;
  if (!s.insurance) s.insurance = { until: 0 };
  if (!s.friends) s.friends = [];
  if (!s.blocked) s.blocked = [];
  if (!s.wardrobe) s.wardrobe = [];
  if (!s.today) s.today = { day: dayKey(), crimes: 0, wins: 0, fish: 0, posts: 0, gigs: 0, contracts: 0, races: 0, arcade: 0 };
  if (!s.challenges) s.challenges = { day: 0, ids: [], claimed: [] };
  if (!s.prog) s.prog = {};
  if (!s.inf) s.inf = { hires: 0, spent: 0, hits: 0, blown: 0, roster: {}, last: 0 };
  if (!s.inf.roster) s.inf.roster = {};
  if (!s.tips) s.tips = {};
  if (!s.dials) s.dials = { payout: 100, danger: 100 };
  if (!s.life || typeof s.life !== 'object') s.life = {};
  return s;
}
function dayKey(t) { return new Date(t || now()).toISOString().slice(0, 10); }
function err(m) { return { err: m }; }
function perk(p, id) { return (p.perks && p.perks[id]) || 0; }
function inJail(p) { return !!(p.jail_until && p.jail_until > now()); }
function inHosp(p) { return !!(p.hosp_until && p.hosp_until > now()); }
function locked(p) { if (inJail(p)) return err('Not from the cells.'); if (inHosp(p)) return err('Not from a hospital bed.'); return null; }

// ---------------- founder overrides: weather, city event, economy dials ----------------
const WEATHER_KINDS = ['clear', 'rain', 'fog', 'wind', 'storm', 'heat'];
function weatherOverride() { return kvGet('weather_override', null); }
function setWeatherOverride(kind) { kvSet('weather_override', kind || null); }
function eventOverride() { return kvGet('event_override', null); }
function setEventOverride(id, minutes) { kvSet('event_override', id ? { id, until: now() + Math.max(1, minutes || 20) * MIN } : null); }
function setDials(patch) {
  const cur = kvGet('dials', { payout: 100, danger: 100 });
  if (patch) {
    for (const k of ['payout', 'danger']) {
      if (patch[k] != null && Number.isFinite(Number(patch[k]))) cur[k] = Math.max(10, Math.min(400, Math.round(Number(patch[k]))));
    }
    kvSet('dials', cur);
  }
  return cur;
}
function dials() { return kvGet('dials', { payout: 100, danger: 100 }); }
function flags() {
  return {
    dials: dials(),
    weatherOverride: weatherOverride(),
    eventOverride: eventOverride(),
    informants: INF.INFORMANTS.length,
    contracts: (C.CITY_CONTRACTS || []).length,
    weatherKinds: WEATHER_KINDS.slice()
  };
}

// ---------------- weather & city clock (deterministic per hour) ----------------
function weatherNow() {
  const d = new Date();
  const seed = d.getUTCFullYear() * 9000 + (d.getUTCMonth() + 1) * 400 + d.getUTCDate() * 16 + d.getUTCHours();
  const kinds = [
    { id: 'clear', icon: '🌆', name: 'Clear skies', line: 'The glass towers throw light like dice.' },
    { id: 'rain', icon: '🌧️', name: 'Rain on the wire', line: 'Wet tarmac, clean getaways.' },
    { id: 'fog', icon: '🌫️', name: 'Fog off the canal', line: 'The cameras hate it. You love it.' },
    { id: 'wind', icon: '💨', name: 'High wind', line: 'Drones drift a little left of their routes.' },
    { id: 'storm', icon: '⛈️', name: 'Storm cell', line: 'Thunder covers a lot of noise.' },
    { id: 'heat', icon: '🥵', name: 'Heatwave', line: 'The whole town runs slow but you.' }
  ];
  const ov = weatherOverride();
  const kind = (ov && kinds.find(k => k.id === ov)) || kinds[seed % kinds.length];
  return { ...kind, hour: d.getUTCHours(), night: d.getUTCHours() >= 20 || d.getUTCHours() < 6, forced: !!(ov && kinds.find(k => k.id === ov)) };
}

// ---------------- the rotating city event ----------------
function currentEvent() {
  const ov = eventOverride();
  if (ov && ov.id && ov.until > now()) {
    const ev = C.EVENTS.find(x => x.id === ov.id);
    if (ev) return { ...ev, until: ov.until, forced: true };
  }
  const slot = M.floor(now() / (20 * MIN));
  if (slot % 3 === 0) return null; // every third window the city is just the city
  const ev = C.EVENTS[slot % C.EVENTS.length];
  const started = slot * 20 * MIN;
  const until = started + ev.dur * MIN;
  if (now() > until) return null;
  return { ...ev, until };
}

// ---------------- daily challenges ----------------
const CHALLENGES = [
  { id: 'ch_crime3',  icon: '🧢', name: 'Run 3 jobs',            key: 'crimes', need: 3,  reward: 6000 },
  { id: 'ch_crime8',  icon: '🔥', name: 'Run 8 jobs',            key: 'crimes', need: 8,  reward: 16000 },
  { id: 'ch_win1',    icon: '🥊', name: 'Win a street fight',    key: 'wins',   need: 1,  reward: 8000 },
  { id: 'ch_fish2',   icon: '🎣', name: 'Land 2 catches',        key: 'fish',   need: 2,  reward: 5000 },
  { id: 'ch_post2',   icon: '📸', name: 'Post 2 clout updates',  key: 'posts',  need: 2,  reward: 5000 },
  { id: 'ch_gig2',    icon: '📦', name: 'Finish 2 odd jobs',     key: 'gigs',   need: 2,  reward: 7000 },
  { id: 'ch_contract2',icon: '📜', name: 'Close 2 city contracts',key: 'contracts', need: 2, reward: 11000 },
  { id: 'ch_arcade5', icon: '🎮', name: 'Win 5 arcade rounds',   key: 'arcade', need: 5,  reward: 9000 },
  { id: 'ch_race1',   icon: '🏁', name: 'Win a street race',     key: 'races',  need: 1,  reward: 10000 },
  { id: 'ch_spin',    icon: '🍀', name: 'Spin the Big Wheel',    key: 'spins',  need: 1,  reward: 4000 },
  { id: 'ch_bank',    icon: '🏦', name: 'Deposit $5,000+',       key: 'deposits', need: 1, reward: 6000 }
];
function ensureChallenges(p) {
  const s = sys(p);
  const day = dayKey();
  if (s.challenges.day !== day) {
    const pool = [...CHALLENGES];
    const ids = [];
    while (ids.length < 3 && pool.length) ids.push(pool.splice(rnd(pool.length), 1)[0].id);
    s.challenges = { day, ids, claimed: [] };
    s.today = { day, crimes: 0, wins: 0, fish: 0, posts: 0, gigs: 0, contracts: 0, races: 0, arcade: 0, spins: 0, deposits: 0 };
  }
  return s;
}
function challengeView(p) {
  const s = ensureChallenges(p);
  return {
    day: s.challenges.day,
    list: s.challenges.ids.map(id => {
      const c = CHALLENGES.find(x => x.id === id);
      const prog = M.min(c.need, s.today[c.key] || 0);
      return { id, icon: c.icon, name: c.name, need: c.need, prog, reward: c.reward, done: prog >= c.need, claimed: s.challenges.claimed.includes(id) };
    })
  };
}
function challengeClaim(accId, cid) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  ensureChallenges(p);
  const c = CHALLENGES.find(x => x.id === cid);
  if (!c || !s.challenges.ids.includes(cid)) return err('That challenge is not on today\u2019s slate.');
  if (s.challenges.claimed.includes(cid)) return err('Already collected.');
  if ((s.today[c.key] || 0) < c.need) return err('Not finished yet — the city keeps count.');
  s.challenges.claimed.push(cid);
  p.money += c.reward;
  p.reputation = (p.reputation || 0) + 15;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { reward: c.reward, text: `Challenge closed: ${c.name}. +$${c.reward.toLocaleString()}.` } };
}

// ================================================================ ARCADE
const MINES_TILES = 12, MINES_BOMBS = 3;
function minesMult(picks, safe) {
  // cash-out multiplier for `picks` safe tiles with 3 bombs among 12
  let m = 1;
  for (let i = 0; i < picks; i++) m *= (MINES_TILES - i) / (MINES_TILES - MINES_BOMBS - i);
  return M.round(m * 0.97 * 100) / 100; // 3% house edge
}
function arcadeMines(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const a = s.arcade;
  const op = String(body.op || 'start');
  if (op === 'start') {
    if (a.mines && a.mines.live) return err('A board is already open — pick a tile or cash out.');
    const bet = M.max(100, M.min(500000, M.floor(Number(body.bet) || 0)));
    if (!bet || p.money < bet) return err(`That board needs $${bet.toLocaleString()} on the table.`);
    p.money -= bet;
    const bombs = new Set(); while (bombs.size < MINES_BOMBS) bombs.add(rnd(MINES_TILES));
    a.mines = { live: true, bet, bombs: [...bombs], picked: [] };
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { op: 'start', bet, mult: 1, text: 'Board set. Twelve tiles, three bites.' } };
  }
  const m = a.mines;
  if (!m || !m.live) return err('No live board. Deal one in first.');
  if (op === 'abandon') {
    a.mines = null;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { op: 'abandon', text: 'You walk off and leave the stake on the table.' } };
  }
  if (op === 'cashout') {
    if (!m.picked.length) return err('Pick at least one tile before you walk.');
    const mult = minesMult(m.picked.length);
    const pay = M.round(m.bet * mult);
    p.money += pay; a.wins++; a.mines = null;
    s.today.arcade = (s.today.arcade || 0) + 1;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { op: 'cashout', pay, mult, text: `You walk with $${pay.toLocaleString()} — ×${mult}.` } };
  }
  // op === 'pick'
  const t = M.floor(Number(body.tile));
  if (!(t >= 0 && t < MINES_TILES) || m.picked.includes(t)) return err('Pick a different tile.');
  if (m.bombs.includes(t)) {
    a.mines = { live: false, bet: m.bet, bombs: m.bombs, picked: [...m.picked, t], dead: true };
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { op: 'boom', tile: t, bombs: m.bombs, text: 'It bites. The board eats the stake.' } };
  }
  m.picked.push(t);
  const done = m.picked.length === MINES_TILES - MINES_BOMBS;
  let res = { op: 'pick', tile: t, picks: m.picked.length, mult: minesMult(m.picked.length) };
  if (done) {
    const mult = minesMult(m.picked.length);
    const pay = M.round(m.bet * mult);
    p.money += pay; a.wins++; a.mines = null;
    s.today.arcade = (s.today.arcade || 0) + 1;
    W.unlock(p, 'mines_clear');
    res = { op: 'cleared', pay, mult, text: `Perfect board. $${pay.toLocaleString()} — ×${mult}.` };
  }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res };
}
function arcadePlinko(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const bet = M.max(100, M.min(250000, M.floor(Number(body.bet) || 0)));
  if (!bet || p.money < bet) return err(`The peg board takes $${(bet || 100).toLocaleString()} minimum.`);
  p.money -= bet;
  const mults = [0.2, 0.6, 1.1, 1.8, 3.2, 10, 3.2, 1.8, 1.1, 0.6, 0.2];
  // binomial walk, 10 rows
  let pos = 0; for (let i = 0; i < 10; i++) pos += M.random() < 0.5 ? 0 : 1;
  const mult = mults[pos];
  const pay = M.round(bet * mult);
  p.money += pay;
  const win = pay > bet;
  if (win) { s.arcade.wins++; s.today.arcade++; p.reputation = (p.reputation || 0) + M.max(1, M.round((pay - bet) / 80)); }
  if (mult >= 10) { W.unlock(p, 'plinko_jackpot'); W.logNews('arcade', '🔴', `${p.name} hit the centre 10× on Plinko for $${pay.toLocaleString()}.`); }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { slot: pos, mult, pay, bet, win, text: win ? `The puck lands at ×${mult} — $${pay.toLocaleString()}.` : `×${mult}. The pegs keep the difference.` } };
}
function arcadeDice(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const bet = M.max(100, M.min(500000, M.floor(Number(body.bet) || 0)));
  const call = String(body.call || 'high');
  if (!['high', 'low', 'seven'].includes(call)) return err('Call high, low, or seven.');
  if (!bet || p.money < bet) return err('The dice table takes $100 minimum.');
  p.money -= bet;
  const d1 = 1 + rnd(6), d2 = 1 + rnd(6), tot = d1 + d2;
  const hit = (call === 'high' && tot >= 8) || (call === 'low' && tot <= 6) || (call === 'seven' && tot === 7);
  const mult = call === 'seven' ? 4.5 : 1.95;
  const pay = hit ? M.round(bet * mult) : 0;
  p.money += pay;
  if (hit) { s.arcade.wins++; s.today.arcade++; p.reputation = (p.reputation || 0) + M.max(1, M.round((pay - bet) / 80)); }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { d1, d2, tot, call, hit, pay, text: hit ? `⚀${d1} ⚁${d2} — ${tot}. The table pays $${pay.toLocaleString()}.` : `⚀${d1} ⚁${d2} — ${tot}. The banker grins.` } };
}
function arcadeCoin(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const bet = M.max(100, M.min(500000, M.floor(Number(body.bet) || 0)));
  const call = String(body.call || 'heads');
  if (!['heads', 'tails'].includes(call)) return err('Call heads or tails.');
  if (!bet || p.money < bet) return err('The coin stand takes $100 minimum.');
  p.money -= bet;
  const face = M.random() < 0.5 ? 'heads' : 'tails';
  const win = face === call;
  const pay = win ? M.round(bet * 1.95) : 0;
  p.money += pay;
  if (win) { s.arcade.wins++; s.today.arcade++; }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { face, call, win, pay, text: win ? `${face.toUpperCase()} — the coin loves you. $${pay.toLocaleString()}.` : `${face.toUpperCase()} — the stand keeps it.` } };
}
function arcadeHoops(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const zone = M.max(1, M.min(5, M.floor(Number(body.zone) || 1)));
  const cost = 200;
  if (p.money < cost) return err('A shooting session is $200.');
  p.money -= cost;
  const chance = [0.72, 0.58, 0.46, 0.34, 0.24][zone - 1];
  const mult = [1.5, 2.1, 3, 4.5, 7][zone - 1];
  const win = M.random() < chance;
  const pay = win ? M.round(cost * mult) : 0;
  p.money += pay;
  if (win) { s.arcade.wins++; s.today.arcade++; }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { zone, win, pay, text: win ? `Splash from zone ${zone} — $${pay.toLocaleString()} out of the machine.` : `Rim. The machine makes a sound like laughter.` } };
}
function arcadeBuzz(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const ms = M.floor(Number(body.ms) || 0);
  const cost = 300;
  if (p.money < cost) return err('The buzz wire costs $300 a run.');
  if (!(ms >= 1400 && ms <= 30000)) return err('The machine does not believe that time.');
  p.money -= cost;
  // pay scales with speed: under 4s = 6×, decays to 1.2× at 15s
  const sec = ms / 1000;
  const mult = sec <= 4 ? 6 : sec <= 7 ? 4 : sec <= 10 ? 2.5 : sec <= 13 ? 1.8 : 1.2;
  const pay = M.round(cost * mult);
  p.money += pay;
  const win = pay > cost;
  if (win) { s.arcade.wins++; s.today.arcade++; if (ms < s.arcade.buzzBest || !s.arcade.buzzBest) s.arcade.buzzBest = ms; }
  W.unlock(p, 'buzz_master');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { ms, mult, pay, win, best: s.arcade.buzzBest, text: win ? `Clean hands — ${sec.toFixed(1)}s pays $${pay.toLocaleString()}.` : 'The buzzer kissed the wire. Stake gone.' } };
}
function arcadeMemory(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const flips = M.floor(Number(body.flips) || 0);
  const cost = 400;
  if (p.money < cost) return err('The memory table is $400 a sit.');
  if (!(flips >= 16 && flips <= 80)) return err('The table keeper saw that number from across the room.');
  p.money -= cost;
  const mult = flips <= 18 ? 5 : flips <= 22 ? 3.5 : flips <= 28 ? 2.2 : flips <= 36 ? 1.4 : 0.8;
  const pay = M.round(cost * mult);
  p.money += pay;
  const win = pay > cost;
  if (win) { s.arcade.wins++; s.today.arcade++; if (flips < (s.arcade.memoryBest || 99)) s.arcade.memoryBest = flips; }
  if (flips <= 12) W.unlock(p, 'memory_perfect');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { flips, mult, pay, win, text: win ? `${flips} flips — the table pays $${pay.toLocaleString()}.` : `${flips} flips. The table keeps your money and your dignity.` } };
}
function arcadeSafe(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const op = String(body.op || 'deal');
  if (op === 'deal') {
    const len = M.max(3, M.min(8, M.floor(Number(body.len) || 3)));
    const cost = 200 * len;
    if (p.money < cost) return err(`A length-${len} crack costs $${cost.toLocaleString()}.`);
    p.money -= cost;
    const seq = Array.from({ length: len }, () => rnd(4));
    s.arcade.safe = { seq, len, cost, at: now() };
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { op: 'deal', len, cost, seq, text: `Watch the dials. ${len} long. Echo it back.` } };
  }
  const r = s.arcade.safe;
  if (!r) return err('No safe on the bench. Deal one first.');
  const guess = Array.isArray(body.seq) ? body.seq.map(x => M.floor(Number(x))) : [];
  if (guess.length !== r.len || guess.some(x => !(x >= 0 && x <= 3))) return err('That guess does not match the dials.');
  const elapsed = now() - r.at;
  if (elapsed < r.len * 350) return err('Nobody is that fast. The machine noticed.');
  const hit = guess.every((x, i) => x === r.seq[i]);
  s.arcade.safe = null;
  if (!hit) { W.save(accId, p); return { ok: true, p: W.publicView(p), res: { op: 'fail', seq: r.seq, text: 'Wrong sequence. The dials reset and the bench keeps your cash.' } }; }
  const mult = [0, 0, 0, 1.9, 2.6, 3.6, 5, 7][r.len];
  const pay = M.round(r.cost * mult);
  p.money += pay; s.arcade.wins++; s.today.arcade++;
  if (r.len >= 8) W.unlock(p, 'safecracker');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { op: 'cracked', pay, mult, len: r.len, text: `The door breathes open — $${pay.toLocaleString()} out of the practice vault.` } };
}
function scratch(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const qty = M.max(1, M.min(10, M.floor(Number(body.qty) || 1)));
  if ((p.items.scratch_card || 0) < qty) return err('No scratch cards in your bag — the market sells them.');
  const results = [];
  let total = 0;
  for (let i = 0; i < qty; i++) {
    p.items.scratch_card--;
    const syms = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍀'];
    const grid = Array.from({ length: 9 }, () => pick(syms));
    // force a triple ~18% of the time
    let winSym = null, prize = 0;
    if (M.random() < 0.18) {
      winSym = pick(syms);
      const idxs = []; while (idxs.length < 3) { const j = rnd(9); if (!idxs.includes(j)) idxs.push(j); }
      idxs.forEach(j => grid[j] = winSym);
      prize = { '🍒': 900, '🍋': 1200, '🔔': 2500, '💎': 20000, '7️⃣': 50000, '🍀': 8000 }[winSym];
      total += prize;
      W.unlock(p, 'scratch_lucky');
    }
    results.push({ grid, winSym, prize });
  }
  if (total <= 0) delete p.items.scratch_card;
  p.money += total;
  if (p.items.scratch_card <= 0) delete p.items.scratch_card;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { results, total, text: total ? `Three match — $${total.toLocaleString()} off the counter.` : 'Nine panels, no triples. The card curls up in shame.' } };
}
function lotteryBuy(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const qty = M.max(1, M.min(20, M.floor(Number(body.qty) || 1)));
  const price = 1000;
  if (p.money < price * qty) return err(`Tickets are $${price.toLocaleString()} — you need $${(price * qty).toLocaleString()}.`);
  // settle any tickets from a previous day first
  settleLottery(p);
  if (s.lottery.day !== dayKey()) { s.lottery.day = dayKey(); s.lottery.tickets = []; }
  if (s.lottery.tickets.length + qty > 50) return err('Fifty tickets a day — the clerk is getting suspicious.');
  p.money -= price * qty;
  for (let i = 0; i < qty; i++) s.lottery.tickets.push(100000 + rnd(900000));
  // pool bookkeeping
  const pool = kvGet('lottery', { day: dayKey(), pool: 25000, tickets: 0 });
  if (pool.day !== dayKey()) { pool.day = dayKey(); pool.pool = 25000; pool.tickets = 0; }
  pool.pool += M.round(price * qty * 0.7); pool.tickets += qty;
  kvSet('lottery', pool);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { qty, nums: s.lottery.tickets.slice(-qty), text: `${qty} ticket${qty > 1 ? 's' : ''} in tonight\u2019s draw. The pot is growing.` } };
}
function lotteryNumber(day) {
  // deterministic per-day winning number
  let h = 0; const k = 'lot' + day;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
  return 100000 + (M.abs(h) % 900000);
}
function settleLottery(p) {
  const s = p.sys;
  if (!s || !s.lottery || s.lottery.day === dayKey() || !s.lottery.tickets.length) return;
  const day = s.lottery.day;
  const winNum = lotteryNumber(day);
  const hits = s.lottery.tickets.filter(t => t === winNum).length;
  const near = s.lottery.tickets.filter(t => M.abs(t - winNum) <= 3 && t !== winNum).length;
  const pool = kvGet('lottery', { pool: 25000 });
  let pay = near * 5000;
  if (hits) { pay += M.round(pool.pool * 0.9); W.unlock(p, 'lottery_winner'); W.logNews('casino', '🎰', `${p.name} won the city lottery — $${pay.toLocaleString()}!`); }
  p.money += pay;
  if (pay > 0) W.systemMsg(p._acc, `🎟️ Lottery draw for ${day}: number ${winNum}. You took home $${pay.toLocaleString()}.`);
  s.lottery = { day: dayKey(), tickets: [], won: (s.lottery.won || 0) + pay };
}

// ================================================================ HUSTLES
function gigSlots(p) { return 3 + perk(p, 'gigolo'); }
// deterministic per-slot shuffle so panel reads and gig_do always agree on the board
function seededRng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), h | 1); h ^= h + Math.imul(h ^ (h >>> 7), h | 61); return ((h ^ (h >>> 14)) >>> 0) / 4294967296; };
}
function refreshGigs(p) {
  const s = sys(p);
  const slot = M.floor(now() / (4 * HOUR));
  if (s.gigs.day !== slot) {
    const rng = seededRng((p.name || 'citizen') + ':gigs:' + slot);
    const pool = [...C.GIGS]; const ids = [];
    while (ids.length < gigSlots(p) && pool.length) ids.push(pool.splice(M.floor(rng() * pool.length), 1)[0].id);
    s.gigs = { day: slot, at: now(), ids, done: 0, counts: {} };
  }
  return s.gigs;
}
function gigDo(accId, gigId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const g = refreshGigs(p);
  if (!g.ids.includes(gigId)) return err('That gig rotated off the board.');
  const def = C.GIGS.find(x => x.id === gigId);
  if ((g.counts[gigId] || 0) >= 3) return err('You did that one to death this rotation.');
  if (p.energy < def.energy) return err(`Too tired — that one needs ${def.energy} energy.`);
  p.energy -= def.energy;
  const pay = def.cash[0] + rnd(def.cash[1] - def.cash[0] + 1);
  p.money += pay; p.happy = M.min(p.max_happy, (p.happy || 0) + 2);
  p.reputation = (p.reputation || 0) + 1;
  E.gainXp(p, 6);
  g.counts[gigId] = (g.counts[gigId] || 0) + 1; g.done++;
  s.prog.gigs = (s.prog.gigs || 0) + 1;
  if (s.prog.gigs >= 15) W.unlock(p, 'gig_worker');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { pay, gig: def.name, text: `${def.name} — done. $${pay.toLocaleString()} cash in hand.` } };
}
// City Contracts are a separate, one-shot board: three of the 1,000 catalogued
// jobs are selected deterministically for each citizen every four hours. Keeping the
// selection on the server prevents callers from choosing a high-payout contract.
const CONTRACT_ROTATION_MS = 4 * HOUR;
function cityContractSlot() { return M.floor(now() / CONTRACT_ROTATION_MS); }
function contractChance(p, contract, weatherId) {
  const streetSense = M.floor((((p.stats && p.stats.sp) || 0) + ((p.stats && p.stats.dx) || 0)) / 80);
  const weatherBonus = (weatherId || weatherNow().id) === contract.weather ? 8 : 0;
  return M.max(20, M.min(95, contract.chance + streetSense + weatherBonus));
}
function cityContractBoard(p) {
  const s = sys(p);
  const slot = cityContractSlot();
  const complete = s.contracts.slot === slot ? s.contracts.done : [];
  // Account id is used where available; the name fallback keeps imported legacy saves stable.
  const rng = seededRng(String(p._acc || p.name || 'citizen') + ':contracts:' + slot);
  const available = [...C.CITY_CONTRACTS];
  const offers = [];
  while (offers.length < 3 && available.length) offers.push(available.splice(M.floor(rng() * available.length), 1)[0]);
  const weather = weatherNow();
  return {
    catalogSize: C.CITY_CONTRACTS.length,
    slot,
    until: (slot + 1) * CONTRACT_ROTATION_MS,
    completed: complete.length,
    total: s.contracts.total,
    wins: s.contracts.wins,
    offers: offers.map(c => ({
      ...c,
      chance: contractChance(p, c, weather.id),
      weatherLive: weather.id === c.weather,
      done: complete.includes(c.id)
    }))
  };
}
function cityContractDo(accId, contractId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const board = cityContractBoard(p);
  const id = String(contractId || '');
  const contract = board.offers.find(c => c.id === id);
  if (!contract) return err('That contract is not on your current board.');
  // A new four-hour board starts only when an action is made; read-only panel calls never
  // mutate a player record.
  if (s.contracts.slot !== board.slot) { s.contracts.slot = board.slot; s.contracts.done = []; }
  if (s.contracts.done.includes(id)) return err('That contract is already closed this rotation.');
  if (p.energy < contract.energy) return err(`Too tired — this contract needs ${contract.energy} energy.`);
  if (p.nerve < contract.nerve) return err(`Too rattled — this contract needs ${contract.nerve} nerve.`);
  p.energy -= contract.energy;
  p.nerve -= contract.nerve;
  const chance = contractChance(p, contract);
  const win = M.random() * 100 < chance;
  s.contracts.done.push(id); s.contracts.total++; s.prog.contracts = (s.prog.contracts || 0) + 1;
  let pay = 0;
  if (win) {
    pay = contract.cash[0] + rnd(contract.cash[1] - contract.cash[0] + 1);
    p.money += pay;
    p.reputation = (p.reputation || 0) + contract.reputation;
    s.contracts.wins++;
    E.gainXp(p, contract.xp);
    if (s.contracts.wins >= 20) W.unlock(p, 'contract_closer');
  } else {
    p.life = M.max(1, (p.life || 0) - (2 + contract.nerve * 2));
    p.reputation = M.max(0, (p.reputation || 0) - (1 + M.floor(contract.nerve / 2)));
  }
  W.save(accId, p);
  return {
    ok: true,
    p: W.publicView(p),
    res: {
      win, contract: contract.name, sector: contract.sector, chance, pay,
      lifeLost: win ? 0 : 2 + contract.nerve * 2,
      text: win
        ? `${contract.name}: closed clean. $${pay.toLocaleString()} moved through the right hands.`
        : `${contract.name} went sideways. You get out lighter and empty-handed.`
    }
  };
}

function nightLeadBoard(p) {
  const s = sys(p);
  const slot = cityContractSlot();
  const complete = s.nights.slot === slot ? s.nights.done : [];
  const rng = seededRng(String(p._acc || p.name || 'citizen') + ':nights:' + slot);
  const available = [...C.NIGHT_LEADS];
  const offers = [];
  while (offers.length < 3 && available.length) offers.push(available.splice(M.floor(rng() * available.length), 1)[0]);
  const weather = weatherNow();
  return {
    catalogSize: C.NIGHT_LEADS.length,
    slot,
    until: (slot + 1) * CONTRACT_ROTATION_MS,
    completed: complete.length,
    total: s.nights.total,
    wins: s.nights.wins,
    offers: offers.map(c => ({
      ...c,
      chance: contractChance(p, c, weather.id),
      weatherLive: weather.id === c.weather,
      done: complete.includes(c.id)
    }))
  };
}
function nightLeadDo(accId, leadId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const board = nightLeadBoard(p);
  const id = String(leadId || '');
  const lead = board.offers.find(c => c.id === id);
  if (!lead) return err('That night brief is not on your current board.');
  if (s.nights.slot !== board.slot) { s.nights.slot = board.slot; s.nights.done = []; }
  if (s.nights.done.includes(id)) return err('That brief is already closed this rotation.');
  if (p.energy < lead.energy) return err(`Too tired — this brief needs ${lead.energy} energy.`);
  if (p.nerve < lead.nerve) return err(`Too rattled — this brief needs ${lead.nerve} nerve.`);
  p.energy -= lead.energy;
  p.nerve -= lead.nerve;
  const chance = contractChance(p, lead);
  const win = M.random() * 100 < chance;
  s.nights.done.push(id); s.nights.total++; s.prog.nights = (s.prog.nights || 0) + 1;
  let pay = 0;
  if (win) {
    pay = lead.cash[0] + rnd(lead.cash[1] - lead.cash[0] + 1);
    p.money += pay;
    p.reputation = (p.reputation || 0) + lead.reputation;
    s.nights.wins++;
    E.gainXp(p, lead.xp);
  } else {
    p.life = M.max(1, (p.life || 0) - (1 + lead.nerve));
  }
  W.save(accId, p);
  return {
    ok: true,
    p: W.publicView(p),
    res: {
      win, lead: lead.name, sector: lead.sector, chance, pay,
      text: win
        ? `${lead.name}: the night pays. $${pay.toLocaleString()} in the dark.`
        : `${lead.name} went cold. You walk away empty.`
    }
  };
}
function favourBoard(p) {
  const s = sys(p);
  const slot = cityContractSlot();
  const complete = s.favours.slot === slot ? s.favours.done : [];
  const rng = seededRng(String(p._acc || p.name || 'citizen') + ':favours:' + slot);
  const available = [...C.WIRE_FAVOURS];
  const offers = [];
  while (offers.length < 3 && available.length) offers.push(available.splice(M.floor(rng() * available.length), 1)[0]);
  const weather = weatherNow();
  return {
    catalogSize: C.WIRE_FAVOURS.length,
    slot,
    until: (slot + 1) * CONTRACT_ROTATION_MS,
    completed: complete.length,
    total: s.favours.total,
    wins: s.favours.wins,
    offers: offers.map(c => ({
      ...c,
      chance: contractChance(p, c, weather.id),
      weatherLive: weather.id === c.weather,
      done: complete.includes(c.id)
    }))
  };
}
function favourDo(accId, favourId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const board = favourBoard(p);
  const id = String(favourId || '');
  const fav = board.offers.find(c => c.id === id);
  if (!fav) return err('That favour is not on your current wire.');
  if (s.favours.slot !== board.slot) { s.favours.slot = board.slot; s.favours.done = []; }
  if (s.favours.done.includes(id)) return err('That favour is already closed this rotation.');
  if (p.energy < fav.energy) return err(`Too tired — this favour needs ${fav.energy} energy.`);
  if (p.nerve < fav.nerve) return err(`Too rattled — this favour needs ${fav.nerve} nerve.`);
  p.energy -= fav.energy;
  p.nerve -= fav.nerve;
  const chance = contractChance(p, fav);
  const win = M.random() * 100 < chance;
  s.favours.done.push(id); s.favours.total++; s.prog.favours = (s.prog.favours || 0) + 1;
  let pay = 0;
  if (win) {
    pay = fav.cash[0] + rnd(fav.cash[1] - fav.cash[0] + 1);
    p.money += pay;
    p.reputation = (p.reputation || 0) + fav.reputation;
    s.favours.wins++;
    E.gainXp(p, fav.xp);
  } else {
    p.happy = M.max(0, (p.happy || 0) - 4);
  }
  W.save(accId, p);
  return {
    ok: true,
    p: W.publicView(p),
    res: {
      win, favour: fav.name, sector: fav.sector, chance, pay,
      text: win
        ? `${fav.name}: the wire pays. $${pay.toLocaleString()} for a quiet favour.`
        : `${fav.name} bounced. You keep walking.`
    }
  };
}

const COURIER_ZONES = ['Glass Quarter', 'Kingsway Docks', 'The Night Market', 'Foundry Row', 'Halo Heights', 'The Red Mile'];
function courierTake(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (s.courier.active) return err('You already have a package in the bag.');
  if (now() - (s.courier.at || 0) < 5 * MIN) return err('Dispatch says cool it for ' + M.ceil(((s.courier.at || 0) + 5 * MIN - now()) / MIN) + ' min.');
  const dest = pick(COURIER_ZONES);
  const mins = 8 + rnd(5);
  s.courier.active = { dest, at: now(), deadline: now() + mins * MIN, pay: 2200 + rnd(2800) };
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { dest, mins, pay: s.courier.active.pay, text: `Package scanned: deliver to ${dest} within ${mins} minutes.` } };
}
function courierDeliver(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const c = s.courier.active;
  if (!c) return err('No package in the bag — take a job from dispatch.');
  s.courier.active = null; s.courier.at = now();
  if (now() > c.deadline) { p.reputation = M.max(0, (p.reputation || 0) - 3); W.save(accId, p); return { ok: true, p: W.publicView(p), res: { late: true, text: 'Too slow. The customer refused it; dispatch docks your name.' } }; }
  const bonus = M.round(c.pay * 0.3);
  p.money += c.pay + bonus; s.courier.done++;
  s.prog.courier = (s.prog.courier || 0) + 1;
  if (s.prog.courier >= 10) W.unlock(p, 'courier');
  E.gainXp(p, 10);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { pay: c.pay + bonus, dest: c.dest, text: `Delivered to ${c.dest} with time to spare — $${(c.pay + bonus).toLocaleString()} including the speed bonus.` } };
}
const FISH_TABLE = [
  { item: 'fish_boot', w: 16 }, { item: 'scrap_metal', w: 18 }, { item: 'fish_cod', w: 30 },
  { item: 'gold_lighter', w: 6 }, { item: 'fish_pike', w: 12 }, { item: 'vinyl_classic', w: 5 },
  { item: 'designer_shades', w: 5 }, { item: 'fish_diamond', w: 2 }, { item: 'street_drone', w: 3 }
];
function fishCast(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.fish.at || 0) < 3 * MIN) return err('The fish need ' + M.ceil(((s.fish.at || 0) + 3 * MIN - now()) / MIN) + ' more minutes to forget you.');
  if (p.energy < 4) return err('Casting takes 4 energy.');
  p.energy -= 4; s.fish.at = now();
  let tot = 0; for (const f of FISH_TABLE) tot += f.w;
  const luck = 1 + perk(p, 'angler') * 0.06 + (currentEvent() && currentEvent().perk === 'fish2x' ? 0.12 : 0);
  let roll = M.random() * (tot / luck), item = FISH_TABLE[FISH_TABLE.length - 1].item;
  for (const f of FISH_TABLE) { roll -= f.w; if (roll <= 0) { item = f.item; break; } }
  p.items[item] = (p.items[item] || 0) + 1;
  s.fish.caught++; s.today.fish = (s.today.fish || 0) + 1;
  if (s.fish.caught >= 10) W.unlock(p, 'fisherman');
  if (['fish_pike', 'fish_diamond', 'street_drone', 'vinyl_classic'].includes(item)) W.unlock(p, 'big_fish');
  const it = C.ITEMS[item];
  E.gainXp(p, 4);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { item, name: it.name, icon: it.icon, text: `Out of the grey water: ${it.name}.` } };
}
function salvageRun(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.salvage.at || 0) < 8 * MIN) return err('The skips are picked clean for ' + M.ceil(((s.salvage.at || 0) + 8 * MIN - now()) / MIN) + ' min.');
  if (p.energy < 6) return err('Salvage needs 6 energy.');
  p.energy -= 6; s.salvage.at = now(); s.salvage.runs++;
  const ev = currentEvent();
  const mult = ev && ev.perk === 'salvage2x' ? 2 : 1;
  const roll = M.random();
  let text, gain = 0;
  if (roll < 0.42) {
    gain = (180 + rnd(420)) * mult; p.money += gain;
    text = `Copper coils and a bent alloy — $${gain.toLocaleString()} straight from the skip.`;
  } else if (roll < 0.72) {
    const n = (1 + rnd(2)) * mult; p.items.scrap_metal = (p.items.scrap_metal || 0) + n;
    text = `${n}× scrap metal hauled out. The bench will like this.`;
  } else if (roll < 0.86) {
    const found = pick(['car_part', 'retro_console', 'gig_poster', 'gold_lighter']);
    p.items[found] = (p.items[found] || 0) + 1;
    text = `Score: ${C.ITEMS[found].name}, barely touched.`;
  } else if (roll < 0.94) {
    const n = 2 * mult; p.items.spray_can = (p.items.spray_can || 0) + n;
    text = `${n}× spray cans, shaken and ready.`;
  } else {
    gain = (2000 + rnd(3000)) * mult; p.money += gain;
    text = `A taped bag at the bottom of the skip. $${gain.toLocaleString()}. Do not ask.`;
  }
  s.prog.salvage = (s.prog.salvage || 0) + 1;
  if (s.prog.salvage >= 20) W.unlock(p, 'salvager');
  E.gainXp(p, 5);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { text, gain } };
}
function plasmaDonate(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.plasma.at || 0) < 4 * HOUR) return err('Your veins need ' + M.ceil(((s.plasma.at || 0) + 4 * HOUR - now()) / MIN) + ' more minutes.');
  if (p.life < 30) return err('Too weak to donate. Eat something first.');
  p.life -= 10; s.plasma.at = now(); s.plasma.n++;
  const pay = 1800 + rnd(700) + p.level * 20;
  p.money += pay;
  s.prog.plasma = (s.prog.plasma || 0) + 1;
  if (s.prog.plasma >= 5) W.unlock(p, 'plasma_veins');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { pay, text: `One pint later: $${pay.toLocaleString()} and a biscuit. Mostly the money.` } };
}
function trialJoin(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.trials.at || 0) < 6 * HOUR) return err('The clinic says ' + M.ceil(((s.trials.at || 0) + 6 * HOUR - now()) / MIN) + ' minutes between doses.');
  s.trials.at = now(); s.trials.n++;
  const roll = M.random();
  let text;
  if (roll < 0.3) { const k = pick(['st', 'de', 'sp', 'dx']); p.stats[k] = M.round((p.stats[k] + 1) * 10) / 10; text = `Side effect: +1 ${({ st: 'strength', de: 'defense', sp: 'speed', dx: 'dexterity' })[k]}. The brochure did not mention this one.`; }
  else if (roll < 0.45) { const k = pick(['st', 'de', 'sp', 'dx']); p.stats[k] = M.max(5, M.round((p.stats[k] - 1) * 10) / 10); text = `Side effect: -1 ${({ st: 'strength', de: 'defense', sp: 'speed', dx: 'dexterity' })[k]}. Temporary, they insist.`; }
  else if (roll < 0.6) { p.max_energy += 1; p.energy += 1; text = 'Side effect: boundless vigour. +1 maximum energy, permanently.'; }
  else if (roll < 0.72) { p.happy = M.min(p.max_happy, (p.happy || 0) + 40); text = 'Side effect: suspicious optimism. +40 happy.'; }
  else if (roll < 0.84) { p.happy = M.max(0, (p.happy || 0) - 25); text = 'Side effect: seeing every colour. -25 happy.'; }
  else if (roll < 0.94) { p.life = p.max_life; text = 'Side effect: full recovery. Whatever it was, it worked.'; }
  else { p.boosters.sp = { mult: 1.5, until: now() + 60 * MIN }; text = 'Side effect: legs like a getaway driver. Speed ×1.5 for an hour.'; }
  const pay = 3500 + rnd(1500);
  p.money += pay;
  s.prog.trials = (s.prog.trials || 0) + 1;
  if (s.prog.trials >= 3) W.unlock(p, 'guinea_pig');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { pay, text: `Paid $${pay.toLocaleString()}. ${text}` } };
}
function buskPlay(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.busk.at || 0) < 30 * MIN) return err('The pitch is taken for ' + M.ceil(((s.busk.at || 0) + 30 * MIN - now()) / MIN) + ' more minutes.');
  if (p.energy < 5) return err('Busking takes 5 energy.');
  p.energy -= 5; s.busk.at = now(); s.busk.n++;
  const mood = 0.6 + 0.8 * M.min(1, (p.happy || 0) / M.max(1, p.max_happy || 100));
  const tips = M.round((300 + rnd(500) + p.level * 15) * mood);
  p.money += tips; p.happy = M.min(p.max_happy, (p.happy || 0) + 12);
  p.reputation = (p.reputation || 0) + 3;
  s.prog.busk = (s.prog.busk || 0) + 1;
  if (s.prog.busk >= 10) W.unlock(p, 'busker');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { tips, text: `One set on the promenade — $${tips.toLocaleString()} in the case and a round of applause.` } };
}
function storageUnits(accId) {
  // deterministic per player+day so peeking and buying see the same shutters
  const day = dayKey();
  const mk = (i) => {
    let h = 0; const k = day + '|' + accId + '|' + i;
    for (let j = 0; j < k.length; j++) h = (h * 33 + k.charCodeAt(j)) | 0;
    h = M.abs(h);
    const price = 1500 + (h % 65) * 100;
    const quality = (h >> 4) % 100;
    const frac = ((h >> 9) % 1000) / 1000;   // deterministic 0..1 so peek and pay agree
    let value, loot;
    if (quality < 35) { value = M.round(price * (0.2 + frac * 0.5)); loot = 'junk'; }
    else if (quality < 75) { value = M.round(price * (1.2 + frac * 0.9)); loot = 'mixed goods'; }
    else if (quality < 92) { value = M.round(price * (2.2 + frac * 1.6)); loot = 'boxes of phones'; }
    else { value = M.round(price * (4 + frac * 3)); loot = 'the good stuff'; }
    return { price, value, loot };
  };
  return [mk(0), mk(1), mk(2)];
}
function storageOpen(accId, unitIdx) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (s.storage.day === dayKey()) return err('One unit a day — the auctioneer knows your face already.');
  const units = storageUnits(accId);
  if (unitIdx === undefined || unitIdx === null) {
    // peek without paying: price + a fuzzy read of the contents, never the exact value
    return { ok: true, res: { browse: true, units: units.map(u => {
      const r = u.value / u.price;
      const hint = r < 0.7 ? 'looks picked clean' : r < 1.2 ? 'could go either way' : r < 2.5 ? 'promising boxes' : 'something good is in there';
      return { price: u.price, hint };
    }) } };
  }
  const idx = M.max(0, M.min(2, M.floor(Number(unitIdx) || 0)));
  const u = units[idx];
  if (p.money < u.price) return err(`Unit ${idx + 1} opens at $${u.price.toLocaleString()} — you are short.`);
  p.money -= u.price;
  s.storage.day = dayKey();
  const profit = u.value - u.price;
  p.money += u.value;
  if (profit > 0) { W.unlock(p, 'storage_wars'); W.logNews('market', '📦', `${p.name} cracked a storage unit for $${u.value.toLocaleString()}.`); }
  E.gainXp(p, 12);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { idx, price: u.price, value: u.value, loot: u.loot, profit, units, text: profit > 0 ? `The shutter lifts on ${u.loot} — worth $${u.value.toLocaleString()}. Profit.` : `The shutter lifts on ${u.loot}… worth $${u.value.toLocaleString()}. You overpaid.` } };
}
function boxOpen(accId) {
  const p = W.ready(W.load(accId)); const L = locked(p); if (L) return L;
  if ((p.items.mystery_box || 0) < 1) return err('No mystery box in your bag.');
  p.items.mystery_box--; if (p.items.mystery_box <= 0) delete p.items.mystery_box;
  const roll = M.random();
  let text, itemId = null, cash = 0;
  if (roll < 0.5) { cash = 500 + rnd(3500); p.money += cash; text = `Cash in a rubber band: $${cash.toLocaleString()}.`; }
  else if (roll < 0.8) {
    itemId = pick(['volt_cola', 'energy_shot', 'protein_box', 'lockpicks', 'scratch_card', 'spray_can', 'trading_pack', 'lucky_charm']);
    p.items[itemId] = (p.items[itemId] || 0) + 1; text = `Inside: ${C.ITEMS[itemId].name}.`;
  } else if (roll < 0.95) {
    itemId = pick(['neon_phone', 'sneaker_box', 'vault_watch', 'designer_shades', 'vinyl_classic']);
    p.items[itemId] = (p.items[itemId] || 0) + 1; text = `Jackpot: ${C.ITEMS[itemId].name}.`;
  } else {
    itemId = pick(C.DROP_POOL);
    p.items[itemId] = (p.items[itemId] || 0) + 1; text = `UNREAL. A ${C.ITEMS[itemId].name}, still sealed.`;
    W.logNews('market', '🎁', `${p.name} cracked a mystery box and found a limited drop.`);
  }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { itemId, cash, text } };
}
function dropView(accId) {
  const p = accId ? W.normalize(W.load(accId)) : null;
  // rotation: 2 drops available this week
  const week = M.floor(now() / (7 * DAY));
  const a = C.DROP_POOL[week % C.DROP_POOL.length];
  const b = C.DROP_POOL[(week + 2) % C.DROP_POOL.length];
  const caps = kvGet('dropcaps', {});
  const key = week + '';
  if (!caps[key]) caps[key] = {};
  return {
    week,
    stock: [a, b].map(id => ({
      id, name: C.ITEMS[id].name, icon: C.ITEMS[id].icon, desc: C.ITEMS[id].desc,
      price: C.SNEAKER_DROP_PRICE[id],
      left: M.max(0, 25 - (caps[key][id] || 0)),
      owned: p ? ((p.items[id] || 0)) : 0
    }))
  };
}
function dropBuy(accId, itemId) {
  const p = W.ready(W.load(accId)); const L = locked(p); if (L) return L;
  if (!C.DROP_POOL.includes(itemId)) return err('That is not in this week\u2019s drop.');
  const v = dropView(accId);
  const st = v.stock.find(x => x.id === itemId);
  if (!st) return err('Not in rotation.');
  if (st.left <= 0) return err('Sold out — the queue won.');
  if ((p.items[itemId] || 0) >= 1) return err('One per citizen. The hype is rationed.');
  if (p.money < st.price) return err(`That piece is $${st.price.toLocaleString()}.`);
  p.money -= st.price;
  p.items[itemId] = (p.items[itemId] || 0) + 1;
  const week = M.floor(now() / (7 * DAY));
  const caps = kvGet('dropcaps', {});
  caps[week + ''] = caps[week + ''] || {};
  caps[week + ''][itemId] = (caps[week + ''][itemId] || 0) + 1;
  kvSet('dropcaps', caps);
  checkDrops(p);
  W.logNews('market', '🔥', `${p.name} copped the ${C.ITEMS[itemId].name} off the drop.`);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { itemId, text: `Copped. The ${C.ITEMS[itemId].name} is yours.` } };
}
function checkDrops(p) {
  if (C.DROP_POOL.every(id => (p.items[id] || 0) > 0)) W.unlock(p, 'drop_collector');
}

// ---------------- clout / influencer ----------------
function cloutPost(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  if (now() - (s.clout.at || 0) < 20 * MIN) return err('The algorithm needs ' + M.ceil(((s.clout.at || 0) + 20 * MIN - now()) / MIN) + ' more minutes of silence.');
  const caption = String((body && body.caption) || '').replace(/[<>&]/g, '').slice(0, 80);
  s.clout.at = now(); s.clout.posts++;
  const ev = currentEvent();
  let gain = M.round((18 + rnd(30) + p.level * 1.5) * (1 + perk(p, 'hype') * 0.1) * (ev && ev.perk === 'clout2x' ? 2 : 1));
  s.followers += gain;
  s.today.posts = (s.today.posts || 0) + 1;
  p.happy = M.min(p.max_happy, (p.happy || 0) + 4);
  p.reputation = (p.reputation || 0) + M.max(1, M.round(gain / 20));
  if (s.followers >= 10000) W.unlock(p, 'influencer');
  if (s.followers >= 100000) W.unlock(p, 'super_influencer');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { gain, followers: s.followers, caption, text: `Posted. +${gain.toLocaleString()} followers — the feed eats it up.` } };
}
function cloutPayout(p) {
  // passive follower income, settled lazily (max 12h backfill)
  const s = sys(p);
  const at = s.clout.payAt || now();
  const hrs = M.min(12, (now() - at) / HOUR);
  if (hrs < 0.1) return p;
  s.clout.payAt = now();
  const rate = 0.12 * (1 + (p.property_up || []).includes('studio') * 0.5);
  const gain = M.round(s.followers * rate * hrs);
  if (gain > 0) p.money += gain;
  return p;
}

// ---------------- street art ----------------
function tagWall(accId, districtId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const d = C.DISTRICTS.find(x => x.id === districtId);
  if (!d) return err('No wall by that name.');
  if ((p.items.spray_can || 0) < 1) return err('No cans. The market stocks them.');
  p.items.spray_can--; if (p.items.spray_can <= 0) delete p.items.spray_can;
  const busted = M.random() < 0.12;
  if (busted) {
    W.jailFor(p, 8);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { busted: true, text: 'A patrol rolled up mid-outline. Eight minutes in the cells.' } };
  }
  s.tags.n++; s.tags.by[districtId] = (s.tags.by[districtId] || 0) + 1;
  p.reputation = (p.reputation || 0) + 6;
  s.turf.influence += 2;
  E.gainXp(p, 8);
  if (s.tags.n >= 10) W.unlock(p, 'street_artist');
  if (s.tags.n % 5 === 0) W.logNews('news', '🎨', `A fresh piece went up in ${d.name}. The tag is unreadable and magnificent.`);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { district: d.name, n: s.tags.n, text: `Piece finished in ${d.name}. +6 rep, +2 influence.` } };
}

// ---------------- social ----------------
function findAccByName(name) {
  const rows = db().prepare('SELECT acc_id, name FROM players').all();
  const n = String(name || '').toLowerCase();
  const r = rows.find(x => (x.name || '').toLowerCase() === n);
  return r || null;
}
function friendAdd(accId, name) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const t = findAccByName(name);
  if (!t) return err('No citizen by that name.');
  if (t.acc_id === accId) return err('You cannot befriend yourself. The city tried.');
  if (s.blocked.includes(t.acc_id)) return err('They are on your block list. Unblock them first.');
  if (s.friends.includes(t.acc_id)) return err('Already on your list.');
  s.friends.push(t.acc_id);
  if (s.friends.length >= 5) W.unlock(p, 'friend_of_all');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { name: t.name, text: `${t.name} is now on your list.` } };
}
function friendRemove(accId, name) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const t = findAccByName(name);
  if (!t) return err('No citizen by that name.');
  s.friends = s.friends.filter(x => x !== t.acc_id);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { name: t.name } };
}
function blockAdd(accId, name) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const t = findAccByName(name);
  if (!t) return err('No citizen by that name.');
  if (t.acc_id === accId) return err('Blocking yourself is not the answer.');
  if (!s.blocked.includes(t.acc_id)) s.blocked.push(t.acc_id);
  s.friends = s.friends.filter(x => x !== t.acc_id);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { name: t.name, text: `${t.name} is blocked — their notes and wires bounce.` } };
}
function blockRemove(accId, name) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const t = findAccByName(name);
  if (!t) return err('No citizen by that name.');
  s.blocked = s.blocked.filter(x => x !== t.acc_id);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { name: t.name } };
}
function giftSend(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const toName = String((body && body.to) || '').trim();
  const itemId = String((body && body.itemId) || '');
  const qty = M.max(1, M.min(50, M.floor(Number(body && body.qty) || 1)));
  const it = C.ITEMS[itemId];
  if (!it) return err('Gift what, exactly?');
  if (it.type === 'gear') return err('Gear stays in your own loadout.');
  if ((p.items[itemId] || 0) < qty) return err('You do not have that many to give.');
  const t = findAccByName(toName);
  if (!t) return err('No citizen by that name.');
  if (t.acc_id === accId) return err('Wrap it and keep it — gifting yourself is not gifting.');
  if (s.blocked.includes(t.acc_id)) return err('They are blocked. Gifts bounce.');
  const tp = W.ready(W.load(t.acc_id));
  if ((tp.sys && tp.sys.blocked || []).includes(accId)) return err('Their door is closed to you.');
  p.items[itemId] -= qty; if (p.items[itemId] <= 0) delete p.items[itemId];
  tp.items[itemId] = (tp.items[itemId] || 0) + qty;
  W.unlock(p, 'gifted');
  W.systemMsg(t.acc_id, `🎁 ${p.name} sent you ${qty}× ${it.name}. No return address, no receipt.`);
  W.save(accId, p); W.save(t.acc_id, tp);
  return { ok: true, p: W.publicView(p), res: { to: t.name, itemId, qty, text: `${qty}× ${it.name} wrapped and handed over.` } };
}
function socialView(accId) {
  const p = W.load(accId); const s = sys(p);
  const nameOf = (id) => { const r = db().prepare('SELECT name FROM players WHERE acc_id=?').get(id); return r ? r.name : 'unknown'; };
  const online = () => 0;
  return {
    friends: s.friends.map(id => ({ id, name: nameOf(id) })),
    blocked: s.blocked.map(id => ({ id, name: nameOf(id) })),
    emotes: C.EMOTES
  };
}

// ================================================================ GARAGE
function carBuy(accId, carId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const c = C.CARS.find(x => x.id === carId);
  if (!c) return err('No car by that badge.');
  if (s.cars.length >= 6) return err('Six cars max — the garage is not a dealership. Yet.');
  if (s.cars.some(x => x.id === carId)) return err('That one is already on your drive.');
  if (p.money < c.price) return err(`${c.name} is $${c.price.toLocaleString()}.`);
  p.money -= c.price;
  s.cars.push({ id: c.id, color: pick(['#16161a', '#e8e2d4', '#8f2f28', '#28395c', '#1f4d3a', '#d9c36a']), name: c.name });
  W.unlock(p, 'car_owner');
  W.logNews('market', '🚗', `${p.name} took delivery of a ${c.name}.`);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { car: c, text: `${c.name} — keys, alarm fob, and a new problem to protect.` } };
}
function carSell(accId, idx) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const i = M.floor(Number(idx));
  const owned = s.cars[i];
  if (!owned) return err('No car in that bay.');
  const c = C.CARS.find(x => x.id === owned.id);
  const back = M.round(c.price * 0.7);
  p.money += back;
  s.cars.splice(i, 1);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { back, text: `${c.name} sold for $${back.toLocaleString()}.` } };
}
function carPaint(accId, idx, color) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const i = M.floor(Number(idx));
  const owned = s.cars[i];
  if (!owned) return err('No car in that bay.');
  if (!/^#[0-9a-fA-F]{6}$/.test(String(color || ''))) return err('That is not a colour.');
  owned.color = String(color).toLowerCase();
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { idx: i, color: owned.color } };
}
function carRating(owned) { const c = C.CARS.find(x => x.id === owned.id); return ((c.spd || 0) + (owned.spd || 0)) * 0.62 + ((c.grp || 0) + (owned.grp || 0)) * 0.38; }
function streetRace(accId, body) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const i = M.max(0, M.min((s.cars.length || 1) - 1, M.floor(Number(body && body.idx) || 0)));
  const owned = s.cars[i];
  if (!owned) return err('Buy a car before you race one.');
  if (now() - (s.races.at || 0) < 4 * MIN) return err('The strip resets in ' + M.ceil(((s.races.at || 0) + 4 * MIN - now()) / MIN) + ' min.');
  if (p.energy < 8) return err('Racing takes 8 energy.');
  p.energy -= 8; s.races.at = now();
  const me = carRating(owned);
  const oppName = pick(C.RACE_OPPONENTS);
  // opponent scales near your rating with spread
  const opp = me * (0.75 + M.random() * 0.55);
  const myRoll = me * (0.85 + M.random() * 0.3), opRoll = opp * (0.85 + M.random() * 0.3);
  const win = myRoll >= opRoll;
  const def = C.CARS.find(x => x.id === owned.id);
  const stake = M.round(def.price * 0.06) + 500;
  if (win) {
    p.money += stake; s.races.wins++; s.today.races = (s.today.races || 0) + 1;
    s.prog.races = (s.prog.races || 0) + 1;
    p.reputation = (p.reputation || 0) + 12; s.turf.influence += 3;
    if (s.prog.races >= 10) W.unlock(p, 'race_winner');
    W.logNews('fight', '🏁', `${p.name} took ${oppName} on the strip in a ${def.name}.`);
    E.gainXp(p, 20);
  } else {
    s.races.losses++;
    p.reputation = M.max(0, (p.reputation || 0) - 4);
  }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { win, opp: oppName, stake: win ? stake : 0, car: def.name, text: win ? `You gap ${oppName} by two lengths — $${stake.toLocaleString()} across the bonnet.` : `${oppName} crosses first. The strip remembers.` } };
}
function chopCar(accId, idx) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const i = M.floor(Number(idx));
  const owned = s.cars[i];
  if (!owned) return err('No car in that bay.');
  const def = C.CARS.find(x => x.id === owned.id);
  const parts = 2 + rnd(4);
  const cash = M.round(def.price * 0.3 * (1 + perk(p, 'grease') * 0.06));
  p.items.car_part = (p.items.car_part || 0) + parts;
  p.money += cash;
  s.cars.splice(i, 1); s.chop++;
  if (s.chop >= 5) W.unlock(p, 'car_flipper');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { parts, cash, text: `The ${def.name} goes up on the lift and comes down in boxes: ${parts}× parts + $${cash.toLocaleString()}.` } };
}

// ================================================================ TURF
function turfHolders() {
  const rows = db().prepare('SELECT district, acc_id, since FROM turf').all();
  const nameOf = (id) => { const r = db().prepare('SELECT name FROM players WHERE acc_id=?').get(id); return r ? r.name : null; };
  return rows.map(r => ({ ...r, name: nameOf(r.acc_id) }));
}
function turfView(accId) {
  const p = accId ? sys(W.normalize(W.load(accId))) : null;
  const holders = turfHolders();
  return {
    influence: p ? p.turf.influence : 0,
    maxHold: C.TURF.maxHoldSolo,
    incomeHours: C.TURF.incomeHours,
    districts: C.DISTRICTS.map(d => {
      const h = holders.find(x => x.district === d.id);
      return { ...d, holder: h ? h.acc_id : null, holderName: h ? h.name : null, mine: !!(h && h.acc_id === accId), since: h ? h.since : 0 };
    }),
    lastCollect: p ? p.turf.lastCollect : 0,
    pending: accId ? turfPending(W.normalize(W.load(accId))) : 0
  };
}
function heldDistricts(accId) { return turfHolders().filter(x => x.acc_id === accId).map(x => x.district); }
function turfPending(p) {
  const held = heldDistricts(p._acc);
  if (!held.length) return 0;
  const s = sys(p);
  const since = s.turf.lastCollect || 0;
  const hrs = M.min(C.TURF.incomeHours, (now() - since) / HOUR);
  if (hrs <= 0) return 0;
  const per = held.reduce((a, id) => a + (C.DISTRICTS.find(d => d.id === id) || { income: 0 }).income, 0);
  return M.round(per * hrs);
}
function turfCollect(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const gain = turfPending(p);
  if (gain <= 0) return err('Nothing to collect yet — turf pays hourly, capped at ' + C.TURF.incomeHours + ' hours.');
  p.money += gain; s.turf.lastCollect = now();
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { gain, text: `The districts pay up: $${gain.toLocaleString()}.` } };
}
function turfClaim(accId, districtId) {
  const p = W.ready(W.load(accId)); const s = sys(p); const L = locked(p); if (L) return L;
  const d = C.DISTRICTS.find(x => x.id === districtId);
  if (!d) return err('No district by that name.');
  const row = db().prepare('SELECT * FROM turf WHERE district=?').get(districtId);
  const mine = heldDistricts(accId);
  if (row && row.acc_id === accId) return err('That block already answers to you.');
  if (row) {
    // hostile takeover
    if (s.turf.influence < C.TURF.attackCost) return err(`A takeover costs ${C.TURF.attackCost} influence — you have ${M.floor(s.turf.influence)}.`);
    s.turf.influence -= C.TURF.attackCost;
    const chance = C.TURF.attackChance + (p.faction ? 0.08 : 0) + M.min(0.2, (s.turf.influence / 4000));
    if (M.random() < chance) {
      db().prepare('UPDATE turf SET acc_id=?, since=? WHERE district=?').run(accId, now(), districtId);
      p.reputation = (p.reputation || 0) + 20;
      const old = W.loadSafe(row.acc_id);
      if (old && old._acc) W.systemMsg(row.acc_id, `🗺️ ${p.name} took ${d.name} off your hands. Influence rules.`);
      W.logNews('faction', '🗺️', `${p.name} seized ${d.name}.`);
      W.save(accId, p);
      return { ok: true, p: W.publicView(p), res: { took: true, district: d.name, text: `${d.name} flips. The block is yours.` } };
    }
    p.reputation = M.max(0, (p.reputation || 0) - 8);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { took: false, district: d.name, text: `The crew on ${d.name} held the corner. Influence spent, nothing gained.` } };
  }
  // open claim
  if (mine.length >= C.TURF.maxHoldSolo) return err(`You already hold ${C.TURF.maxHoldSolo} districts — that is the cap.`);
  if (s.turf.influence < d.minInfluence) return err(`${d.name} needs ${d.minInfluence} influence to plant a flag. You have ${M.floor(s.turf.influence)}.`);
  if (s.turf.influence < C.TURF.claimCost) return err(`Planting a flag costs ${C.TURF.claimCost} influence.`);
  s.turf.influence -= M.max(C.TURF.claimCost, 0);
  db().prepare('INSERT INTO turf (district, acc_id, since) VALUES (?,?,?) ON CONFLICT(district) DO UPDATE SET acc_id=excluded.acc_id, since=excluded.since').run(districtId, accId, now());
  if (!s.turf.lastCollect) s.turf.lastCollect = now();
  p.reputation = (p.reputation || 0) + 15;
  if (heldDistricts(accId).length >= 3) W.unlock(p, 'turf_lord');
  W.logNews('faction', '🗺️', `${p.name} planted a flag in ${d.name}.`);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { district: d.name, text: `${d.name} is yours — it pays $${d.income.toLocaleString()}/hour while you hold it.` } };
}
function turfRelease(accId, districtId) {
  const p = W.ready(W.load(accId));
  const row = db().prepare('SELECT * FROM turf WHERE district=?').get(districtId);
  if (!row || row.acc_id !== accId) return err('That block is not yours to drop.');
  db().prepare('DELETE FROM turf WHERE district=?').run(districtId);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { district: districtId } };
}

// ================================================================ FINANCE EXTRAS
function stakeNgt(accId, amt) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  settleStake(p);
  amt = M.round((parseFloat(amt) || 0) * 10000) / 10000;
  if (amt <= 0) return err('Stake something real.');
  if ((p.crypto.NGT || 0) < amt) return err('Your wallet does not hold that much NGT.');
  p.crypto.NGT = M.round(((p.crypto.NGT || 0) - amt) * 10000) / 10000;
  if (p.crypto.NGT <= 0) delete p.crypto.NGT;
  s.stake.amt = M.round((s.stake.amt + amt) * 10000) / 10000;
  if (!s.stake.at) s.stake.at = now();
  if (s.stake.amt >= 1000) W.unlock(p, 'staked');
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { staked: s.stake.amt, text: `${amt} NGT locked in cold storage. It accrues from now.` } };
}
function unstakeNgt(accId, amt) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  settleStake(p);
  amt = M.round((parseFloat(amt) || 0) * 10000) / 10000;
  if (amt <= 0) return err('Name an amount.');
  if (s.stake.amt < amt) return err('Not that much is locked.');
  s.stake.amt = M.round((s.stake.amt - amt) * 10000) / 10000;
  p.crypto.NGT = M.round(((p.crypto.NGT || 0) + amt) * 10000) / 10000;
  if (s.stake.amt <= 0) { s.stake.amt = 0; s.stake.at = 0; }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { staked: s.stake.amt, text: `${amt} NGT back in your hot wallet.` } };
}
const STAKE_DAILY_PCT = 0.012;
function stakeYieldPct(p) { return STAKE_DAILY_PCT * (1 + perk(p, 'staker') * 0.1); }
function settleStake(p) {
  const s = sys(p);
  if (!s.stake.amt || !s.stake.at) return p;
  const days = M.min(30, (now() - s.stake.at) / DAY);
  if (days < 0.02) return p;
  const gain = M.round(s.stake.amt * stakeYieldPct(p) * days * 10000) / 10000;
  if (gain > 0) {
    s.stake.amt = M.round((s.stake.amt + gain) * 10000) / 10000;
    s.stake.gained = M.round(((s.stake.gained || 0) + gain) * 10000) / 10000;
  }
  s.stake.at = now();
  return p;
}
function dividendsTick(p) {
  const s = sys(p);
  const held = Object.entries(p.stocks || {}).reduce((a, [, q]) => a + q, 0);
  if (!held) { s.dividends.at = now(); return p; }
  const at = s.dividends.at || now();
  if (now() - at < 6 * HOUR) return p;
  const hrs = M.min(48, (now() - at) / HOUR);
  let price = 0;
  for (const [sym, q] of Object.entries(p.stocks || {})) {
    const r = db().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym);
    if (r && q) price += r.price * q;
  }
  const gain = M.floor(price * 0.0005 * hrs);
  s.dividends.at = now();
  if (gain > 0) {
    p.money += gain; s.dividends.total += gain;
    W.unlock(p, 'dividends');
  }
  return p;
}
function termDeposit(accId, amt, hours) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  if (s.term) return err('A deposit is already locked — collect it when it matures.');
  amt = M.floor(Number(amt) || 0);
  hours = M.floor(Number(hours) || 0);
  if (![6, 12, 24].includes(hours)) return err('Pick a term: 6, 12 or 24 hours.');
  if (amt < 10000) return err('Term deposits start at $10,000.');
  if (p.money < amt) return err('You do not have that much cash on hand.');
  p.money -= amt;
  const rate = { 6: 0.008, 12: 0.018, 24: 0.04 }[hours];
  s.term = { amt, rate, hours, at: now(), until: now() + hours * HOUR };
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { amt, hours, pays: M.round(amt * (1 + rate)), text: `$${amt.toLocaleString()} locked for ${hours}h at ${(rate * 100).toFixed(1)}%.` } };
}
function termCollect(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  if (!s.term) return err('Nothing is locked in.');
  const t = s.term;
  if (now() < t.until) {
    // early break: principal back, no interest, small penalty
    p.money += M.round(t.amt * 0.98);
    s.term = null;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { early: true, back: M.round(t.amt * 0.98), text: 'Broken early — principal back less a 2% penalty.' } };
  }
  const pays = M.round(t.amt * (1 + t.rate));
  p.money += pays; s.term = null;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { pays, text: `Matured. $${pays.toLocaleString()} — the desk slides it over.` } };
}

// ================================================================ CRAFT & CARDS
function craft(accId, recipeId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const r = C.RECIPES.find(x => x.id === recipeId);
  if (!r) return err('No recipe by that name.');
  for (const [id, n] of Object.entries(r.need)) {
    if ((p.items[id] || 0) < n) return err(`Missing ${n - (p.items[id] || 0)}× ${C.ITEMS[id].name}.`);
  }
  for (const [id, n] of Object.entries(r.need)) {
    p.items[id] -= n; if (p.items[id] <= 0) delete p.items[id];
  }
  p.items[r.out] = (p.items[r.out] || 0) + (r.qty || 1);
  s.craft++;
  if (s.craft >= 10) W.unlock(p, 'crafter');
  if (r.out === 'kevlar_s1') W.unlock(p, 'plated');
  checkDrops(p);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { out: r.out, qty: r.qty || 1, text: `Bench work done: ${r.qty || 1}× ${C.ITEMS[r.out].name}.` } };
}
const CARD_POOL = ['Wire Rider', 'Canal Ghost', 'Neon Saint', 'Dock Wolf', 'Glass Queen', 'Foundry King', 'Night Porter', 'Rooftop Ace',
  'Signal Thief', 'Bass Prophet', 'Chrome Monk', 'Alley Oracle', 'Static Dancer', 'Vault Sparrow', 'Ring Master', 'Haze Baron',
  'Pixel Nun', 'Iron Deacon', 'Velvet Cobra', 'Holo Wire'];
function cardOpen(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  if ((p.items.trading_pack || 0) < 1) return err('No pack in your bag.');
  p.items.trading_pack--; if (p.items.trading_pack <= 0) delete p.items.trading_pack;
  const drawn = [];
  for (let i = 0; i < 5; i++) {
    const c = pick(CARD_POOL);
    drawn.push(c);
    s.cards[c] = (s.cards[c] || 0) + 1;
  }
  let setDone = false;
  if (!s.cardsDone && CARD_POOL.every(c => (s.cards[c] || 0) > 0)) {
    s.cardsDone = true; setDone = true;
    p.money += 50000; p.reputation = (p.reputation || 0) + 100;
    W.logNews('market', '🎴', `${p.name} completed the full Wire card set — $50,000 from the collectors\u2019 circle.`);
  }
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { drawn, setDone, owned: CARD_POOL.filter(c => s.cards[c]).length, total: CARD_POOL.length, text: setDone ? 'THE FULL SET. The collectors\u2019 circle pays $50,000 on the spot.' : 'Pack cracked.' } };
}

// ================================================================ THE INFORMANT NETWORK
// 1,000 hireable leads (lib/game/informants.js). Six ride the board per 4-hour rotation.
// A bought tip either lands (a live buff, or an instant effect) or burns you.
const TIP_LABEL = {
  edge: 'Job intel', payoff: 'Payout tip', fence: 'Fence intro', bail: 'Magistrate nudge',
  muscle: 'Fight corner', crew: 'Crew whisper', heat: 'Heat cooler', patch: 'Back-room patch',
  market: 'Market tip', bribe: 'Cell-door key'
};
const TIMED_TIPS = ['edge', 'payoff', 'fence', 'bail', 'muscle', 'crew'];
function tipPct(p, kind) {
  const s = sys(p); const t = s.tips[kind];
  if (!t || !t.until || t.until <= now()) return 0;
  return t.s || 0;
}
function tipActive(p) {
  const s = sys(p);
  return Object.keys(s.tips).filter(k => s.tips[k] && s.tips[k].until > now())
    .map(k => ({ kind: k, label: s.tips[k].label || TIP_LABEL[k] || k, strength: s.tips[k].s, until: s.tips[k].until, from: s.tips[k].from }));
}
function tipsGrant(accId, kind, strength, durMin, from) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  s.tips[kind] = { s: strength, until: durMin ? now() + durMin * MIN : now() + 12 * HOUR, label: TIP_LABEL[kind] || kind, from: from || 'the network' };
  W.save(accId, p);
  return s.tips[kind];
}
function tipsClear(accId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  s.tips = {};
  W.save(accId, p);
}
function informantBoard(p) {
  const rot = INF.rotationOf();
  const leads = INF.board(p._acc, rot, 6).map(x => ({
    id: x.id, serial: x.serial, name: x.name, alias: x.alias, icon: x.icon,
    circle: x.circleName, circleIcon: x.circleIcon, district: x.districtName, trade: x.tradeName,
    kind: x.kind, price: x.price, reliability: x.reliability, strength: x.strength, dur: x.dur,
    pitch: x.pitch, blurb: `${x.circleName} out of ${x.districtName} — ${x.pitch}`,
    hired: !!(p.sys && p.sys.inf && p.sys.inf.roster[x.id] === rot),
    blown: !!(p.sys && p.sys.inf && p.sys.inf.blown && p.sys.inf.blown[x.id] && p.sys.inf.blown[x.id] > now())
  }));
  const s = p.sys || {};
  const inf = s.inf || { hires: 0, spent: 0, hits: 0, blown: 0 };
  return {
    rotation: rot, ends: INF.rotationEnds(rot), leads, total: INF.INFORMANTS.length,
    stats: { hires: inf.hires || 0, spent: inf.spent || 0, hits: inf.hits || 0, blown: inf.blown || 0,
      rate: inf.hires ? Math.round((inf.hits / inf.hires) * 100) : 0 },
    tips: tipActive(p)
  };
}
function informantHire(accId, infId) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  const lock = locked(p); if (lock) return lock;
  const rot = INF.rotationOf();
  const inf = INF.byId(String(infId || ''));
  if (!inf) return err('No such informant.');
  if (!INF.onBoard(accId, rot, inf.id)) return err('That lead is not on your board this rotation.');
  if (s.inf.roster[inf.id] === rot) return err('You already paid that one this rotation.');
  if (s.inf.blown && s.inf.blown[inf.id] && s.inf.blown[inf.id] > now()) return err('Burned. Give it a day before you go back.');
  if ((p.money || 0) < inf.price) return err('You cannot cover the price — that one wants $' + inf.price.toLocaleString() + '.');
  p.money -= inf.price;
  s.inf.hires = (s.inf.hires || 0) + 1;
  s.inf.spent = (s.inf.spent || 0) + inf.price;
  const landed = Math.random() < inf.reliability;
  const res = { id: inf.id, name: inf.name, landed, price: inf.price, kind: inf.kind, label: TIP_LABEL[inf.kind] };
  if (!landed) {
    s.inf.blown = s.inf.blown || {};
    s.inf.blown[inf.id] = now() + DAY;
    s.inf.blown_n = (s.inf.blown_n || 0) + 1;
    p.reputation = Math.max(0, (p.reputation || 0) - 2);
    res.text = `${inf.name} takes your money, gives you a story with no door in it, and is gone. The lead is cold — and word travels.`;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res };
  }
  s.inf.hits = (s.inf.hits || 0) + 1;
  s.inf.roster[inf.id] = rot;
  const st = inf.strength;
  if (inf.kind === 'heat') {
    if (SL) { const L = SL.ensure(p); L.heat = Math.max(0, (L.heat || 0) - st); L.heatAt = now(); }
    res.text = `${inf.name} makes two officers take leave. Street heat drops by ${st}.`;
  } else if (inf.kind === 'patch') {
    const heal = Math.round((p.max_life || 200) * (st / 100));
    p.life = Math.min(p.max_life || 200, (p.life || 0) + heal);
    res.text = `${inf.name} opens a back-room clinic. You leave ${heal} points healthier and forget the address.`;
  } else if (inf.kind === 'market') {
    const tip = st * 10;
    p.money += tip;
    res.text = `${inf.name} reads the board: a quiet block is moving. You clip $${tip.toLocaleString()} off the move.`;
  } else if (inf.kind === 'bribe') {
    if (p.jail_until && p.jail_until > now()) {
      const cut = Math.round((p.jail_until - now()) * (st / 100));
      p.jail_until -= cut;
      res.text = `${inf.name} knows a screw on the wing. Your sentence loses ${Math.round(cut / 60000)} minutes.`;
    } else {
      p.reputation = (p.reputation || 0) + 40;
      res.text = `${inf.name} keeps the key for later — nobody is holding you, so you bank the favour as reputation (+40).`;
    }
  } else {
    s.tips[inf.kind] = { s: st, until: now() + (inf.dur || 180) * MIN, label: TIP_LABEL[inf.kind], from: inf.name };
    res.text = `${inf.name} brings you the ${TIP_LABEL[inf.kind].toLowerCase()}: +${st}% for ${inf.dur} minutes.`;
  }
  res.strength = st;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res };
}

// ================================================================ WARDROBE & RESPEC
function wardrobeSave(accId, slot) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  slot = M.max(0, M.min(2, M.floor(Number(slot) || 0)));
  s.wardrobe[slot] = p.avatar;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { slot } };
}
function wardrobeLoad(accId, slot) {
  const p = W.ready(W.load(accId)); const s = sys(p);
  slot = M.max(0, M.min(2, M.floor(Number(slot) || 0)));
  const av = s.wardrobe[slot];
  if (!av) return err('That hanger is empty.');
  p.avatar = av;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { slot } };
}
function respecApply(accId, body) {
  const p = W.ready(W.load(accId));
  if (!(p.sys && p.sys.respecOpen)) return err('No identity rewrite pending — use the token first.');
  const want = {};
  let total = 0, curTotal = 0;
  for (const k of ['st', 'de', 'sp', 'dx']) {
    const v = M.floor(Number(body && body.stats && body.stats[k]));
    if (!Number.isFinite(v) || v < 5 || v > 5000) return err('Each stat must be between 5 and 5,000.');
    want[k] = v; total += v; curTotal += M.floor(p.stats[k]);
  }
  if (total !== curTotal) return err(`The points must balance: you have ${curTotal} to place.`);
  p.stats = { st: want.st, de: want.de, sp: want.sp, dx: want.dx };
  p.sys.respecOpen = false;
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { text: 'Identity rewritten. New stats are live.' } };
}

// ================================================================ INSURANCE
function insureUse(p) { p.sys.insurance.until = now() + 7 * DAY; W.unlock(p, 'insured'); }
function insured(p) { return !!(p.sys && p.sys.insurance && p.sys.insurance.until > now()); }

// ================================================================ PANEL — one read for the client
function panel(accId) {
  const p = W.normalize(W.load(accId));
  const s = sys(p);
  settleStake(p); settleLottery(p);
  const ev = currentEvent();
  const gigs = refreshGigs(p);
  return {
    weather: weatherNow(),
    event: ev,
    challenges: challengeView(p),
    gigs: { ids: gigs.ids.map(id => C.GIGS.find(g => g.id === id)), left: Object.values(gigs.counts || {}).reduce((a, b) => a + b, 0), done: gigs.done, slots: gigSlots(p) },
    contracts: cityContractBoard(p),
    nights: nightLeadBoard(p),
    favours: favourBoard(p),
    street: SL ? SL.panel(p) : null,
    courier: s.courier,
    fish: s.fish, salvage: s.salvage, plasma: { n: s.plasma.n, ready: now() - (s.plasma.at || 0) >= 4 * HOUR },
    trials: { n: s.trials.n, ready: now() - (s.trials.at || 0) >= 6 * HOUR },
    busk: { n: s.busk.n, ready: now() - (s.busk.at || 0) >= 30 * MIN },
    storage: { openedToday: s.storage.day === dayKey() },
    lottery: { day: s.lottery.day, tickets: s.lottery.tickets, won: s.lottery.won, pool: kvGet('lottery', { pool: 25000 }).pool, nextNum: lotteryNumber(dayKey()) },
    drops: dropView(accId),
    clout: { followers: s.followers, posts: s.clout.posts, ready: now() - (s.clout.at || 0) >= 20 * MIN, rate: M.round(s.followers * 0.12) },
    tags: s.tags,
    cars: s.cars.map(c => ({ ...c, def: C.CARS.find(x => x.id === c.id), rating: M.round(carRating(c)) })),
    races: s.races,
    turf: turfView(accId),
    stake: { amt: s.stake.amt, gained: s.stake.gained || 0, pct: stakeYieldPct(p) },
    term: s.term,
    dividends: { at: s.dividends.at, total: s.dividends.total },
    craft: { recipes: C.RECIPES, count: s.craft },
    cards: { owned: s.cards, pool: CARD_POOL, done: s.cardsDone },
    social: socialView(accId),
    wardrobe: s.wardrobe,
    informants: informantBoard(p),
    tips: tipActive(p),
    insurance: { until: s.insurance.until, active: insured(p) },
    arcade: { wins: s.arcade.wins, buzzBest: s.arcade.buzzBest, memoryBest: s.arcade.memoryBest,
      mines: s.arcade.mines && s.arcade.mines.live ? { live: true, bet: s.arcade.mines.bet, picked: s.arcade.mines.picked } : null },
    titles: C.TITLES,
    title: titleFor(p.reputation || 0),
    respecOpen: !!s.respecOpen,
    now: now()
  };
}
function titleFor(rep) {
  let t = C.TITLES[0];
  for (const x of C.TITLES) if (rep >= x.rep) t = x;
  return t.name;
}

// ================================================================ TRACKING HOOKS
// called from server.js after every action; keeps counters, challenges, influence and
// lazy income (clout, dividends) ticking without touching world.js internals.
function track(accId, actionName, out) {
  try {
    const p = W.load(accId);
    const s = sys(p);
    if (s.today.day !== dayKey()) ensureChallenges(p);
    let dirty = false;
    const bump = (k, n = 1) => { s.today[k] = (s.today[k] || 0) + n; dirty = true; };
    if (actionName === 'crime' && out && out.res && out.res.ok) { bump('crimes'); s.turf.influence += 1; if (out.res.cash && out.res.cash >= 100000) s.turf.influence += 4; }
    if (actionName === 'attack' && out && out.res && out.res.win) { bump('wins'); s.turf.influence += 3; }
    if (actionName === 'spin_wheel') bump('spins');
    if (actionName === 'deposit') { const amt = Number((out && out.res && out.res.amt) || 0); if (amt >= 5000) bump('deposits'); }
    if (actionName === 'arcade_mines' || actionName === 'arcade_plinko' || actionName === 'arcade_dice' || actionName === 'arcade_coin' || actionName === 'arcade_hoops' || actionName === 'arcade_buzz' || actionName === 'arcade_memory' || actionName === 'arcade_safe') {
      if (out && out.res && (out.res.pay > (out.res.bet || out.res.cost || 0) || out.res.op === 'cashout' || out.res.op === 'cracked' || out.res.op === 'cleared')) bump('arcade');
    }
    if (actionName === 'fish_cast') bump('fish');
    if (actionName === 'clout_post') bump('posts');
    if (actionName === 'gig_do') bump('gigs');
    if (actionName === 'city_contract' && out && out.res) bump('contracts');
    if (actionName === 'night_lead' && out && out.res) bump('nights');
    if (actionName === 'wire_favour' && out && out.res) bump('favours');
    if (actionName === 'crime' && out && out.res && SL) { try { SL.addHeat(p, 4); dirty = true; } catch (_) {} }
    if (actionName === 'street_race' && out && out.res && out.res.win) bump('races');
    // mission tallies
    p.mstats = p.mstats || {};
    if (actionName === 'gig_do') { p.mstats.gigs = (p.mstats.gigs || 0) + 1; dirty = true; }
    if (actionName === 'fish_cast') { p.mstats.fish = (p.mstats.fish || 0) + 1; dirty = true; }
    if (actionName === 'street_race' && out && out.res && out.res.win) { p.mstats.races = (p.mstats.races || 0) + 1; dirty = true; }
    if (s.arcade.wins) { p.mstats.arcade = s.arcade.wins; }
    if (s.followers) { p.mstats.clout = s.followers; }
    if (s.arcade.wins >= 25) W.unlock(p, 'arcade_shark');
    // lazy income
    cloutPayout(p);
    dividendsTick(p);
    settleStake(p);
    if (dirty) W.save(accId, p);
  } catch (e) { /* tracking must never break an action */ }
}

module.exports = {
  attach, sys, weatherNow, currentEvent, challengeView, challengeClaim,
  arcadeMines, arcadePlinko, arcadeDice, arcadeCoin, arcadeHoops, arcadeBuzz, arcadeMemory, arcadeSafe,
  scratch, lotteryBuy, settleLottery, lotteryNumber,
  gigDo, cityContractDo, cityContractBoard, nightLeadDo, nightLeadBoard, favourDo, favourBoard, courierTake, courierDeliver, fishCast, salvageRun, plasmaDonate, trialJoin, buskPlay,
  streetEat: (id, a) => SL.eatFood(id, a), streetOut: (id, a) => SL.goOut(id, a),
  streetPet: (id, a) => SL.adoptPet(id, a), streetRehome: (id, a) => SL.rehomePet(id, a),
  streetInk: (id, a) => SL.getInk(id, a), streetMeet: (id, a) => SL.meetContact(id, a),
  streetCall: (id, a) => SL.callContact(id, a), streetHide: (id, a) => SL.buyHideout(id, a),
  streetRest: (id) => SL.restHideout(id), streetCrate: (id, a) => SL.openCrate(id, a),
  streetSkin: (id, a) => SL.buySkin(id, a), streetWearSkin: (id, a) => SL.wearSkin(id, a),
  streetMod: (id, idx, mid) => SL.fitMod(id, idx, mid), streetStreak: (id) => SL.claimStreak(id),
  streetCool: (id) => SL.coolHeat(id), streetSnack: (id) => SL.quickSnack(id),
  storageOpen, boxOpen, dropView, dropBuy, cloutPost, tagWall,
  friendAdd, friendRemove, blockAdd, blockRemove, giftSend, socialView,
  carBuy, carSell, carPaint, streetRace, chopCar,
  turfView, turfClaim, turfCollect, turfRelease, turfPending,
  stakeNgt, unstakeNgt, termDeposit, termCollect,
  craft, cardOpen, wardrobeSave, wardrobeLoad, respecApply,
  informantBoard, informantHire, tipPct, tipActive, tipsGrant, tipsClear, INF, TIP_LABEL, TIMED_TIPS,
  weatherOverride, setWeatherOverride, setEventOverride, setDials, dials, flags, WEATHER_KINDS,
  insureUse, insured, titleFor, panel, track, CHALLENGES
};
