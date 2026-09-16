// Razor Town — 2026.5 "Torn season" systems.
//
// The systems that make the town behave like the classic browser crime sims
// it was cut from: a face on the door (portrait avatars), a train line to
// ride (travel across the eight districts), a weekly championship bracket,
// a warrant desk, a deals board, and a pocket data assistant.
//
// Every function is defensive: junk input degrades to a refusal, never a 500.
'use strict';
const M = Math;
const MIN = 60000, HOUR = 3600000, DAY = 86400000;

let W = null;   // wired by attach(world) — the world module
let S = null;   // the 2026 systems module (heat, events)
// feat unlocks must never take the town down when a host uses the module
// without a full boot (in-process check suites load world.js standalone)
function unlock(p, id) { try { return (W && W.unlock) ? W.unlock(p, id) : null; } catch (e) { return null; } }
let dbm = null;
// content is loaded lazily: world normalize() can call into this module before
// the server has attached anything, and content.js never requires us back.
function Cc() { return require('./content.js'); }
const C = new Proxy({}, { get: (t, k) => Cc()[k] });

function attach(world, systems) {
  W = world; S = systems;
  dbm = require('../db.js');
  const d = dbm.getDb();
  if (d) {
    d.exec(`CREATE TABLE IF NOT EXISTS t26 (key TEXT PRIMARY KEY, val TEXT NOT NULL DEFAULT '{}')`);
    d.exec(`CREATE TABLE IF NOT EXISTS tourneys (week TEXT PRIMARY KEY, json TEXT NOT NULL)`);
  }
}

const db = () => dbm.getDb();
function kvGet(key, dflt) {
  try { const r = db().prepare('SELECT val FROM t26 WHERE key=?').get(key); return r ? JSON.parse(r.val) : dflt; }
  catch (e) { return dflt; }
}
function kvSet(key, val) {
  db().prepare('INSERT INTO t26 (key,val) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val').run(key, JSON.stringify(val));
}
function dayKey(now) { return new Date(now || Date.now()).toISOString().slice(0, 10); }
function hash(s) {
  let h = 2166136261; s = String(s == null ? '' : s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = M.imul(h, 16777619); }
  return M.abs(h);
}
function seeded(str) { let h = hash(str) % 2147483647; return () => { h = (h * 48271) % 2147483647; return (h % 100000) / 100000; }; }
function err(msg) { return { err: msg }; }
function clampN(n, a, b) { return M.max(a, M.min(b, n)); }

// ================================================================ PORTRAITS
// The face on the door. A citizen's public image is a portrait: either one of
// the catalog faces (original, AI-generated, ours) or their own uploaded cut
// (stored as p.pic, flagged portrait='custom').
const PORTRAITS = [
  { id: 'p01', file: 'p01.jpg', gender: 'm', label: 'The Fresh Face' },
  { id: 'p02', file: 'p02.jpg', gender: 'm', label: 'The Slick' },
  { id: 'p03', file: 'p03.jpg', gender: 'm', label: 'The Old Guard' },
  { id: 'p04', file: 'p04.jpg', gender: 'f', label: 'The Vantage' },
  { id: 'p05', file: 'p05.jpg', gender: 'f', label: 'The Bob' },
  { id: 'p06', file: 'p06.jpg', gender: 'f', label: 'The Pixie' },
  { id: 'p07', file: 'p07.jpg', gender: 'm', label: 'The Wall' },
  { id: 'p08', file: 'p08.jpg', gender: 'f', label: 'The Hoops' },
  { id: 'p09', file: 'p09.jpg', gender: 'e', label: 'The Ash' },
  { id: 'p10', file: 'p10.jpg', gender: 'm', label: 'The Reader' }
];
function portraitById(id) { return PORTRAITS.find(x => x.id === String(id)) || null; }
function portraitUrl(id) { const e = portraitById(id); return e ? '/img/portraits/' + e.file : ''; }
function pickPortrait(seedStr, gender) {
  const pool = PORTRAITS.filter(x => x.gender === gender);
  const list = pool.length ? pool : PORTRAITS;
  return list[hash(seedStr || 'citizen') % list.length].id;
}
// Make sure a citizen has a face. Runs from world normalize(); legacy citizens
// get a deterministic catalog pick so nobody is a blank in the town.
function ensurePortrait(p) {
  if (!p) return;
  if (typeof p.portrait === 'string' && p.portrait.length) {
    if (p.portrait === 'custom' && !p.pic) p.portrait = pickPortrait((p.name || '') + '|' + (p.gender || 'm'), p.gender);
    else if (p.portrait !== 'custom' && !portraitById(p.portrait)) p.portrait = pickPortrait((p.name || '') + '|' + (p.gender || 'm'), p.gender);
  } else {
    p.portrait = pickPortrait((p.name || '') + '|' + (p.gender || 'm'), p.gender);
  }
}
function portraitMeta(p) {
  if (!p) return null;
  if (p.portrait === 'custom' && p.pic) return { id: 'custom', url: p.pic };
  const e = portraitById(p.portrait);
  return e ? { id: e.id, url: '/img/portraits/' + e.file, gender: e.gender, label: e.label } : null;
}

// ================================================================ TRAVEL
// The town is a line of eight districts; the train runs the whole line.
// Riding it costs cash + a little energy, puts you somewhere the whole town
// can see, pays out per-district modifiers, and sometimes finds you something.
const TRIP_CD = 90 * MIN;
const TRIP_ENERGY = 5;
// One bonus per district, wired into the systems listed in TRAVEL_MODS.
const DISTRICT_MODS = {
  underpass:   { hustle: 1.10, label: 'Side hustles pay +10%' },
  nightmarket: { shops: 0.90, label: 'Shop prices −10%' },
  glassq:      { crime: 1.10, label: 'Crime payouts +10%' },
  foundry:     { work: 1.10, label: 'Shift pay +10%' },
  halo:        { stake: 1.10, label: 'Term deposits yield +10%' },
  kingsway:    { fight: 1.10, label: 'Fight winnings +10%' },
  redmile:     { bust: 0.85, label: 'Bust risk −15%' },
  exchange:    { payout: 1.05, label: 'Every payout +5%' }
};
// Per-district trip finds (real item ids from the market).
const TRIP_FINDS = {
  underpass:   ['volt_cola', 'rainy_ale', 'spike', 'lockpicks'],
  nightmarket: ['neon_phone', 'thick_wallet', 'neon_syrup', 'volt_salt'],
  glassq:      ['vault_watch', 'silk_laptop', 'gold_chain', 'pixelbox_x'],
  foundry:     ['crate_iron', 'lockpicks', 'volt_salt', 'spike'],
  halo:        ['gold_chain', 'vault_watch', 'neon_phone', 'silk_laptop'],
  kingsway:    ['crate_iron', 'crypto_rig', 'spike', 'lockpicks'],
  redmile:     ['noir_whisky', 'thick_wallet', 'glasswing', 'rainy_ale'],
  exchange:    ['silk_laptop', 'crypto_rig', 'vault_watch', 'gold_chain']
};
function districtIdx(id) { const i = C.DISTRICTS.findIndex(d => d.id === id); return i; }
function districtOf(p) {
  const id = String((p && p.dist) || '');
  if (C.DISTRICTS.some(d => d.id === id)) return C.DISTRICTS.find(d => d.id === id);
  return C.DISTRICTS[2]; // Glass Quarter — the town centre, where new names appear
}
function distMod(p) {
  const d = districtOf(p);
  return Object.assign({ id: d.id, name: d.name, icon: d.icon }, DISTRICT_MODS[d.id] || {});
}
function hops(a, b) { return M.abs(districtIdx(a) - districtIdx(b)); }
function tripCost(from, to) { return 100 + 200 * hops(from, to); }
function travelView(p) {
  p = p || {};
  const here = districtIdx(districtOf(p).id);
  const now = Date.now();
  const cd = (p.travel_cd || 0) - now;
  const rows = C.DISTRICTS.map((d, i) => {
    const mod = DISTRICT_MODS[d.id] || {};
    return {
      id: d.id, name: d.name, icon: d.icon, here: i === here,
      hops: M.abs(i - here), cost: tripCost(d.id, d.id) === 0 ? 0 : tripCost(districtOf(p).id, d.id),
      income: d.income,
      modLabel: mod.label || '', mod: Object.keys(mod).filter(k => k !== 'label').map(k => k + (mod[k] > 1 ? '+' : '')),
      visited: !!(p.travel_visits && p.travel_visits[d.id])
    };
  });
  return {
    you: districtOf(p).id, here: districtOf(p).name, hereIcon: districtOf(p).icon,
    cdLeft: M.max(0, cd), energyCost: TRIP_ENERGY,
    trips: p.total_trips || 0, visits: p.travel_visits || {},
    districts: rows,
    scene: sceneOf(p),
    findsToday: (p.travel_finds_today || 0)
  };
}
function sceneOf(p) {
  // who else is standing in your district right now — real players only
  const mine = districtOf(p).id;
  const now = Date.now();
  const out = [];
  try {
    for (const r of db().prepare('SELECT acc_id, name, json FROM players WHERE acc_id > 0').all()) {
      try {
        const q = JSON.parse(r.json);
        if (r.acc_id === (p._acc || p.id) ) continue;
        const qdist = C.DISTRICTS.some(d => d.id === String(q.dist)) ? String(q.dist) : 'glassq';
        if (qdist !== mine) continue;
        const fresh = (q.updated_at || q.last_seen || 0) > now - 30 * MIN;
        out.push({ id: r.acc_id, name: q.name, level: q.level || 1, fresh });
        if (out.length >= 12) break;
      } catch (e) {}
    }
  } catch (e) {}
  return out;
}
function travelDo(accId, to) {
  const p = W.ready(W.load(accId));
  const target = C.DISTRICTS.find(d => d.id === String(to));
  if (!target) return err('That is not on the line.');
  const from = districtOf(p).id;
  if (target.id === from) return err('You are already standing there.');
  if ((p.energy || 0) < TRIP_ENERGY) return err('The ride costs ' + TRIP_ENERGY + ' energy — wait for a refill.');
  const now = Date.now();
  if ((p.travel_cd || 0) > now) return err('The train has not stopped yet — ' + M.ceil((p.travel_cd - now) / MIN) + ' min to the next run.');
  const cost = tripCost(from, target.id);
  if (p.money < cost) return err('The fare is $' + cost.toLocaleString() + '.');
  p.money -= cost; p.energy -= TRIP_ENERGY;
  p.dist = target.id; p.travel_cd = now + TRIP_CD;
  p.total_trips = (p.total_trips || 0) + 1;
  p.travel_visits = p.travel_visits || {}; p.travel_visits[target.id] = true;
  const res = { to: target.id, name: target.name, cost };
  // the find: 18% of the time the ride turns up with something
  const finds = TRIP_FINDS[target.id] || [];
  const pool = finds.filter(id => C.ITEMS && C.ITEMS[id]);
  if (pool.length && M.random() < 0.18) {
    const item = pool[M.floor(M.random() * pool.length)];
    p.items = p.items || {}; p.items[item] = (p.items[item] || 0) + 1;
    p.travel_finds_today = (p.travel_finds_today || 0) + 1;
    res.found = item;
    const it = C.ITEMS[item];
    res.text = 'A ' + it.name + ' comes up in your pocket on the way to ' + target.name + '.';
    try { W.logNews('travel', '🚆', p.name + ' surfaced in ' + target.name + ' carrying something that was not theirs.'); } catch (e) {}
  } else {
    res.text = 'The doors close on ' + from + '. ' + target.name + ' smells of rain and diesel.';
  }
  const ach = [];
  const a1 = unlock(p, 'first_trip'); if (a1) ach.push(a1);
  const all = C.DISTRICTS.every(d => p.travel_visits[d.id]);
  const a2 = all ? unlock(p, 'district_hopper') : null; if (a2) ach.push(a2);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: Object.assign(res, { travel: travelView(p) }), ach };
}

// ================================================================ TOURNAMENT
// A weekly championship bracket. Real citizens only — the town has no NPCs.
// Enter before Sunday 22:00; the bracket settles itself and the winner takes
// the pool, the belt and the wire.
const TOURNY_FEE = 25000;
const TOURNY_MIN_LEVEL = 5;
const TOURNY_POOL_PCT = 70;
const TOURNY_BELT = 'champ_belt';
function weekStart(now) {
  now = now || Date.now();
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 Sun … 6 Sat
  const diff = (day === 0 ? 6 : day - 1); // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
function tourneyWindow(now) {
  now = now || Date.now();
  const start = weekStart(now);
  const close = start + 7 * DAY - 2 * HOUR; // Sunday 22:00 UTC
  return { week: dayKey(start), start, close, open: now < close };
}
function tourneyState(week) {
  try {
    const r = db().prepare('SELECT json FROM tourneys WHERE week=?').get(week);
    if (r) return JSON.parse(r.json);
  } catch (e) {}
  return { week, entries: [], settled: false, result: null };
}
function tourneySettle(week, force) {
  const win = tourneyWindow();
  if (week !== win.week && !force) return tourneyState(week);
  const st = tourneyState(week);
  if (st.settled) return st;
  if (!(win.open === false || force) && win.week === week) return st; // still open — refuse
  const entrants = (st.entries || []).map(e => {
    try {
      const r = db().prepare('SELECT json FROM players WHERE acc_id=?').get(e.id);
      return r ? Object.assign({ id: e.id }, JSON.parse(r.json)) : null;
    } catch (err) { return null; }
  }).filter(Boolean);
  if (entrants.length === 0) { st.settled = true; st.result = { week, text: 'The bracket sat empty. The belt keeps waiting.' }; kvPersist(st); return st; }
  if (entrants.length === 1) {
    // a lone champion: the fee comes back, the belt does not move
    try { const p = W.ready(W.load(entrants[0].id)); p.money += TOURNY_FEE; W.save(entrants[0].id, p); } catch (e) {}
    st.settled = true; st.result = { week, text: entrants[0].name + ' was the only one on the card — the fee is refunded, the belt stays on the shelf.' };
    kvPersist(st);
    try { W.logNews('tourney', '🏆', entrants[0].name + ' walked the championship alone. Nobody was there to stop them.'); } catch (e) {}
    return st;
  }
  // bracket: seeded single elimination, byes for non-powers-of-two
  const n = entrants.length;
  const size = M.pow(2, M.ceil(M.log2(n)));
  const power = (p) => ((p.stats || {}).st || 0) + ((p.stats || {}).de || 0) + ((p.stats || {}).sp || 0) + ((p.stats || {}).dx || 0) + (p.level || 1) * 2;
  const seeded = entrants.map(p => ({ p, power: power(p), name: p.name, id: p.id })).sort((a, b) => b.power - a.power);
  const slots = new Array(size).fill(null);
  // standard bracket seeding so #1 and #2 cannot meet before the final
  const seedOrder = (s) => { if (s === 2) return [0, 1]; const half = seedOrder(s / 2); const out = []; for (const i of half) { out.push(i); out.push(s - 1 - i); } return out; };
  for (const [slot, seedIdx] of seedOrder(size).entries()) slots[slot] = seeded[seedIdx] || null;
  let round = 1;
  const rounds = [];
  let field = slots;
  while (field.length > 1) {
    const next = [];
    const roundRows = [];
    for (let i = 0; i < field.length; i += 2) {
      const A = field[i], B = field[i + 1];
      if (A && !B) { next.push(A); roundRows.push({ a: A.name, b: '—', winner: A.name, bye: true }); continue; }
      if (B && !A) { next.push(B); roundRows.push({ a: '—', b: B.name, winner: B.name, bye: true }); continue; }
      const ra = resolveFight(A.p, B.p);
      const winner = ra.winner === 'a' ? A : B;
      winner.wins = (winner.wins || 0) + 1;
      next.push(winner);
      roundRows.push({ a: A.name, b: B.name, winner: winner.name, da: ra.da, db: ra.db });
    }
    rounds.push({ round, rows: roundRows });
    field = next;
  }
  const champ = field[0];
  const pool = entrants.length * TOURNY_FEE;
  const prize = M.round(pool * TOURNY_POOL_PCT / 100);
  try {
    const p = W.ready(W.load(champ.id));
    p.money += prize;
    p.items = p.items || {}; p.items[TOURNY_BELT] = (p.items[TOURNY_BELT] || 0) + 1;
    p.tourney_wins = (p.tourney_wins || 0) + 1;
    p.merits = (p.merits || 0) + 2; p.merits_earned = (p.merits_earned || 0) + 2;
    p.reputation = (p.reputation || 0) + 200;
    p.xp = (p.xp || 0) + 400;
    const a = unlock(p, 'street_champ');
    W.save(champ.id, p);
    champ.achieved = a ? a.id : null;
  } catch (e) {}
  // consolation XP for the rest
  for (const e of seeded) {
    if (e.id === champ.id) continue;
    try { const p = W.ready(W.load(e.id)); p.xp = (p.xp || 0) + 100; W.save(e.id, p); } catch (err) {}
  }
  st.settled = true;
  st.result = { week, winner: champ.name, winnerId: champ.id, pool, prize, prizePct: TOURNY_POOL_PCT, rounds };
  kvPersist(st);
  try { W.logNews('tourney', '🏆', champ.name + ' takes the championship belt — $' + prize.toLocaleString() + ' out of a $' + pool.toLocaleString() + ' pool.'); } catch (e) {}
  return st;
}
function kvPersist(st) {
  db().prepare('INSERT INTO tourneys (week,json) VALUES (?,?) ON CONFLICT(week) DO UPDATE SET json=excluded.json').run(st.week, JSON.stringify(st));
}
// One simulated exchange between two real sheets. Deterministic given the
// sheets and a roll; the same math the streets use, compressed to a number.
function resolveFight(pa, pb) {
  const stats = (p) => ({
    st: (p.stats || {}).st || 0, de: (p.stats || {}).de || 0,
    sp: (p.stats || {}).sp || 0, dx: (p.stats || {}).dx || 0,
    life: p.life || 50, max: p.max_life || 100, level: p.level || 1
  });
  const a = stats(pa), b = stats(pb);
  const ev = S && S.currentEvent ? S.currentEvent() : null;
  const dmgMult = (ev && ev.perk === 'bloodmoon') ? 1.15 : 1;
  const outA = (a.st + a.dx * 0.5 + a.sp * 0.25) * (0.8 + M.random() * 0.4) * dmgMult;
  const outB = (b.st + b.dx * 0.5 + b.sp * 0.25) * (0.8 + M.random() * 0.4) * dmgMult;
  const da = M.max(1, M.round(outA - b.de * 0.35));
  const db = M.max(1, M.round(outB - a.de * 0.35));
  const winner = da === db ? (M.random() < 0.5 ? 'a' : 'b') : (da > db ? 'a' : 'b');
  return { da, db, winner };
}
function tourneyView(accId) {
  const now = Date.now();
  const win = tourneyWindow(now);
  let st = tourneyState(win.week);
  if (!st.settled && !win.open) st = tourneySettle(win.week, true);
  const mineRow = (st.entries || []).find(e => e.id === accId) || null;
  const win2 = tourneyWindow(now);
  const lastWeek = dayKey(win.start - DAY);
  const last = tourneyState(lastWeek);
  const entrants = (st.entries || []).map(e => {
    let p = null;
    try { const r = db().prepare('SELECT json FROM players WHERE acc_id=?').get(e.id); if (r) p = JSON.parse(r.json); } catch (err) {}
    const power = p ? ((p.stats || {}).st || 0) + ((p.stats || {}).de || 0) + ((p.stats || {}).sp || 0) + ((p.stats || {}).dx || 0) + (p.level || 1) * 2 : 0;
    return { id: e.id, name: p ? p.name : 'Unknown', level: p ? (p.level || 1) : 1, power };
  }).sort((a, b) => b.power - a.power);
  return {
    week: win.week, state: st.settled ? 'settled' : (win2.open ? 'open' : 'closing'),
    closesAt: win.close, fee: TOURNY_FEE, minLevel: TOURNY_MIN_LEVEL, poolPct: TOURNY_POOL_PCT,
    pool: (st.entries || []).length * TOURNY_FEE,
    entrants, mine: mineRow ? { entered: true, fee: TOURNY_FEE } : null,
    result: st.result || null,
    lastWeek: { week: lastWeek, result: last.result || null }
  };
}
function tourneyEnter(accId) {
  const p = W.ready(W.load(accId));
  const win = tourneyWindow();
  if (!win.open) return err('The card is closed for this week — the bracket settles and a new one opens Monday.');
  if ((p.level || 1) < TOURNY_MIN_LEVEL) return err('The championship wants level ' + TOURNY_MIN_LEVEL + ' or better on the card.');
  const stars = warrantStars(p);
  if (stars >= 2) return err('The door is not opening for a ' + stars + '-star mark. Clear the warrant desk first.');
  const st = tourneyState(win.week);
  if ((st.entries || []).some(e => e.id === accId)) return err('Your name is already on this week\u2019s card.');
  if (st.entries.length >= 16) return err('The bracket is full — 16 is the most the floor takes.');
  if (p.money < TOURNY_FEE) return err('The entry is $' + TOURNY_FEE.toLocaleString() + '.');
  p.money -= TOURNY_FEE;
  st.entries = st.entries || [];
  st.entries.push({ id: accId, name: p.name, at: Date.now() });
  kvPersist(st);
  W.save(accId, p);
  return { ok: true, p: W.publicView(p), res: { text: 'Your name goes on the card. ' + (st.entries.length) + ' on the floor this week.', tourney: tourneyView(accId) } };
}

// ================================================================ WARRANTS
// Street heat crosses a line and the magistrate writes your name down.
// Three stars, three prices: pay the fine, or walk yourself in.
const WARRANT_TIERS = [
  { stars: 0, at: 0, fine: 0 },
  { stars: 1, at: 55, fine: 5000 },
  { stars: 2, at: 75, fine: 25000 },
  { stars: 3, at: 90, fine: 100000 }
];
function heatOfRaw(p) {
  // heat lives in p.sys.heat and cools on its own — read it without saving
  try {
    const s = p.sys || {};
    if (!s.heat || typeof s.heat !== 'object') return 0;
    const drop = M.floor((Date.now() - (s.heat.at || Date.now())) / (3 * MIN));
    return M.max(0, (s.heat.n || 0) - drop);
  } catch (e) { return 0; }
}
function warrantTier(heat, level) {
  let t = WARRANT_TIERS[0];
  for (const tier of WARRANT_TIERS) if (heat >= tier.at) t = tier;
  const fine = M.round(t.fine * (1 + (level || 1) / 50));
  return Object.assign({}, t, { fine });
}
function warrantStars(p) { return warrantTier(heatOfRaw(p), p && p.level).stars; }
function warrantOf(p) {
  p = p || {};
  const heat = heatOfRaw(p);
  const t = warrantTier(heat, p.level);
  return { stars: t.stars, fine: t.fine, heat, labels: ['clean', 'one star', 'two stars', 'three stars'][t.stars] };
}
function warrantBustMult(p) { return 1 + 0.08 * warrantStars(p); }
function warrantShopMult(p) { return 1 + 0.10 * warrantStars(p); }
function warrantPay(accId) {
  const p = W.ready(W.load(accId));
  const w = warrantOf(p);
  if (w.stars === 0) return err('You are not marked. Keep it that way.');
  if (p.money < w.fine) return err('The magistrate wants $' + w.fine.toLocaleString() + '.');
  p.money -= w.fine;
  p.warrant_paid = (p.warrant_paid || 0) + 1;
  if (S) S.coolHeat(p, 100);
  const a = unlock(p, 'quiet_words');
  W.save(accId, p);
  try { W.logNews('warrant', '🧾', p.name + ' paid the fine and walked off the board.'); } catch (e) {}
  return { ok: true, p: W.publicView(p), res: { text: 'Paperwork. $' + w.fine.toLocaleString() + ' for a clean record.', warrant: warrantOf(p) }, ach: a ? [a] : [] };
}
function warrantSurrender(accId) {
  const p = W.ready(W.load(accId));
  const w = warrantOf(p);
  if (w.stars === 0) return err('There is nothing to surrender. The board is clean.');
  const mins = 45 + w.stars * 45;
  p.jail_until = Date.now() + mins * MIN;
  if (S) S.coolHeat(p, 100);
  p.warrants_served = (p.warrants_served || 0) + 1;
  W.save(accId, p);
  try { W.logNews('warrant', '⛓️', p.name + ' walked themselves in. ' + w.stars + '-star mark, cleared.'); } catch (e) {}
  return { ok: true, p: W.publicView(p), res: { text: 'The corridor is short. ' + mins + ' minutes, and the board forgets your face.', minutes: mins, warrant: warrantOf(p) } };
}
function wantedList() {
  // the public board: who the town is looking for, hottest first
  const out = [];
  try {
    for (const r of db().prepare('SELECT acc_id, name, json FROM players WHERE acc_id > 0').all()) {
      try {
        const q = JSON.parse(r.json);
        const heat = heatOfRaw(q);
        const t = warrantTier(heat, q.level);
        if (t.stars > 0) out.push({ id: r.acc_id, name: q.name, level: q.level || 1, stars: t.stars, heat, fine: t.fine, portrait: q.portrait || '' });
      } catch (e) {}
    }
  } catch (e) {}
  out.sort((a, b) => (b.stars - a.stars) || (b.heat - a.heat));
  return out.slice(0, 30);
}

// ================================================================ DEALS & PRICE INDEX
// The shelf prices move with the day: a slow ±10% drift, and one item per
// shop marked down 40% for the whole day. Vendors notice your heat.
function priceIndex(itemId) {
  const r = seeded(dayKey() + '|' + itemId);
  return 1 + (r() - 0.5) * 0.2; // 0.90 … 1.10
}
function priceTrend(itemId) {
  const today = priceIndex(itemId);
  const r = seeded(dayKey(Date.now() - DAY) + '|' + itemId);
  const yest = 1 + (r() - 0.5) * 0.2;
  if (today < yest - 0.005) return 'down';
  if (today > yest + 0.005) return 'up';
  return 'flat';
}
function dailyDeal(shopId) {
  const shop = (C.SHOPS || []).find(s => s.id === shopId);
  if (!shop || !shop.stock || !shop.stock.length) return null;
  const r = seeded(dayKey() + '|' + shopId + '|deal');
  const row = shop.stock[M.floor(r() * shop.stock.length)];
  return row ? row.item : null;
}
function eventShopMult() {
  try { const ev = S && S.currentEvent ? S.currentEvent() : null; return ev && ev.perk === 'market_day' ? 0.75 : 1; } catch (e) { return 1; }
}
function shopPrice(row, p) {
  const it = C.ITEMS[row.item];
  let base = row.price || M.ceil((it.buy || it.sell * 2.2) * (row.mult || 1));
  const idx = priceIndex(row.item);
  const deal = dailyDeal(null); // placeholder — caller passes shop id
  return { base, idx };
}
// Full breakdown used by shopsView + shopBuy
function shopRowPrice(shopId, row, p) {
  const it = C.ITEMS[row.item];
  const base = row.price || M.ceil((it.buy || it.sell * 2.2) * (row.mult || 1));
  const idx = priceIndex(row.item);
  const isDeal = dailyDeal(shopId) === row.item;
  const dealMult = isDeal ? 0.6 : 1;
  const warn = warrantShopMult(p);
  const ev = eventShopMult();
  const dist = (distMod(p).shops) || 1;
  const price = M.max(1, M.round(base * idx * dealMult * warn * ev * dist));
  return { base, idx: Math.round(idx * 1000) / 1000, trend: priceTrend(row.item), deal: isDeal, price };
}
function markDealBuy(p) {
  const a = unlock(p, 'deal_hunter');
  return a;
}

// ================================================================ PDA
// The pocket data assistant: everything you touch every minute, one screen.
function pdaView(p) {
  p = p || {};
  const items = p.items || {};
  const quick = Object.keys(items).filter(id => C.ITEMS && C.ITEMS[id] && C.ITEMS[id].type === 'use' && items[id] > 0).slice(0, 10);
  return {
    bars: { life: M.round(p.life || 0), max_life: p.max_life || 0, energy: M.round(p.energy || 0), max_energy: p.max_energy || 0, nerve: M.round(p.nerve || 0), max_nerve: p.max_nerve || 0, happy: M.round(p.happy || 0), max_happy: p.max_happy || 0 },
    money: p.money || 0, bank: p.bank || 0, vault: p.vault || 0,
    level: p.level || 1, rep: Math.round(p.reputation || 0),
    quick,
    equip: { weapon: p.equip && p.equip.weapon || null, armour: p.equip && p.equip.armour || null, wear: p.equip && (p.equip.wear || []).length || 0 },
    district: districtOf(p).name,
    warrant: warrantOf(p),
    pda_uses: p.pda_uses || 0,
    items: quick.map(id => ({ id, name: C.ITEMS[id].name, icon: C.ITEMS[id].icon, qty: items[id], desc: C.ITEMS[id].desc || '' }))
  };
}
function countPdaUse(p) {
  p.pda_uses = (p.pda_uses || 0) + 1;
  return p.pda_uses >= 10 ? unlock(p, 'pda_pro') : null;   // One-Handed: ten uses, not the first
}

// ================================================================ FEATS (merged into content)
const ACHS = {
  first_trip:     { name: 'First Ride',        icon: '\u{1F686}', desc: 'Ride the line to another district.' },
  district_hopper:{ name: 'The Whole Line',    icon: '\u{1F5FA}\uFE0F', desc: 'Stand in all eight districts.' },
  street_champ:   { name: 'Trophy Night',      icon: '\u{1F3C6}', desc: 'Win the championship bracket.' },
  marked_man:     { name: 'Three Stars',       icon: '\u{1F6A8}', desc: 'Get a three-star warrant.' },
  quiet_words:    { name: 'Paid in Full',      icon: '\u{1F9FE}', desc: 'Pay a warrant fine.' },
  deal_hunter:    { name: 'Bargain Spotter',   icon: '\u{1F3F7}\uFE0F', desc: 'Buy the daily deal at a shop.' },
  pda_pro:        { name: 'One-Handed',        icon: '\u{1F4F0}', desc: 'Use ten items from the PDA.' }
};
function mergeFeats() {
  if (C && C.ACHIEVEMENTS) for (const k of Object.keys(ACHS)) if (!C.ACHIEVEMENTS[k]) C.ACHIEVEMENTS[k] = ACHS[k];
}
function checkWarrantFeat(p) {
  const stars = warrantStars(p);
  const seen = (p.sys && p.sys.warrants_seen) || 0;
  if (stars > seen && p.sys) p.sys.warrants_seen = stars;
  if (stars >= 3) return unlock(p, 'marked_man');
  return null;
}

// ================================================================ EVENTS (merged into content)
const EXTRA_EVENTS = [
  { id: 'crackdown', icon: '\u{1F693}', name: 'Police Crackdown',   desc: 'Extra patrols on every corner — bust risk is up.', dur: 20, perk: 'crackdown' },
  { id: 'market_day', icon: '\u{1F3FA}', name: 'Market Day',        desc: 'The stalls cut prices by a quarter for a day.', dur: 20, perk: 'market_day' },
  { id: 'festival',  icon: '\u{1F3AA}', name: 'Street Festival',    desc: 'Hustles pay 25% more and the mood lifts.', dur: 20, perk: 'festival' },
  { id: 'bloodmoon', icon: '\u{1F315}', name: 'Blood Moon',         desc: 'Fights get ugly — damage is up 15%.', dur: 20, perk: 'bloodmoon' },
  { id: 'blackout',  icon: '\u{1F311}', name: 'Blackout',           desc: 'The lights are out. Crime pays 30% more in the dark.', dur: 20, perk: 'blackout' }
];
function mergeEvents() {
  if (!C || !C.EVENTS) return;
  for (const ev of EXTRA_EVENTS) if (!C.EVENTS.some(x => x.id === ev.id)) C.EVENTS.push(Object.assign({}, ev));
}
// Multipliers the world reads at payout time (defensive: no S → no event).
function eventPayoutMult() {
  try { const ev = S && S.currentEvent ? S.currentEvent() : null; return ev && ev.perk === 'blackout' ? 1.3 : 1; } catch (e) { return 1; }
}
function eventCrimeMult() {
  try { const ev = S && S.currentEvent ? S.currentEvent() : null; return ev && ev.perk === 'crime2x' ? 2 : 1; } catch (e) { return 1; }
}
function eventBustMult() {
  try { const ev = S && S.currentEvent ? S.currentEvent() : null; return ev && ev.perk === 'crackdown' ? 1.3 : 1; } catch (e) { return 1; }
}
function eventHustleMult() {
  try { const ev = S && S.currentEvent ? S.currentEvent() : null; return ev && ev.perk === 'festival' ? 1.25 : 1; } catch (e) { return 1; }
}

// ================================================================ PRESENCE
let presence = new Set(); // live connection ids
function presenceAdd(id, name) { presence.add(id); try { presenceNames.set(id, name); } catch (e) {} }
const presenceNames = new Map();
function presenceRemove(id) { presence.delete(id); presenceNames.delete(id); }
function onlineNames() {
  const out = [];
  for (const [id, name] of presenceNames) out.push({ id, name });
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

module.exports = {
  attach, mergeFeats, mergeEvents,
  PORTRAITS, portraitById, portraitUrl, pickPortrait, ensurePortrait, portraitMeta,
  districtIdx, districtOf, distMod, hops, tripCost, travelView, travelDo, TRIP_CD, TRIP_ENERGY, DISTRICT_MODS, TRIP_FINDS,
  TOURNY_FEE, TOURNY_MIN_LEVEL, TOURNY_BELT, tourneyView, tourneyEnter, tourneySettle, tourneyWindow, resolveFight,
  WARRANT_TIERS, warrantTier, warrantStars, warrantOf, warrantBustMult, warrantShopMult, warrantPay, warrantSurrender, wantedList, heatOfRaw, checkWarrantFeat,
  priceIndex, priceTrend, dailyDeal, eventShopMult, shopRowPrice, markDealBuy,
  pdaView, countPdaUse,
  eventPayoutMult, eventCrimeMult, eventBustMult, eventHustleMult,
  presenceAdd, presenceRemove, onlineNames,
  dayKey, hash, seeded, err
};
