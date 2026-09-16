// HARDMODE-APPLIED — harder economy
// Razor Town — server-side world actions
'use strict';
const dbm = require('./db.js');
const E = require('./game/engine.js');
const C = require('./game/content.js');
const A = require('./accounts.js');

const db = () => dbm.getDb();
// Informant tips (systems.js owns the store; world.js only reads it, so there is no cycle).
// World dials (the founder's economy levers) live in kv; world.js reads them directly.
function dialPct(kind) {
  try {
    const r = db().prepare('SELECT val FROM kv WHERE key=?').get('dials');
    const d = r ? JSON.parse(r.val) : null;
    const v = d && Number.isFinite(d[kind]) ? d[kind] : 100;
    return Math.max(10, Math.min(400, v));
  } catch (e) { return 100; }
}
function tipOf(p, kind) {
  const t = p && p.sys && p.sys.tips && p.sys.tips[kind];
  if (!t || !t.until || t.until <= Date.now()) return 0;
  return t.s || 0;
}
const byId = {};

function load(accId) {
  const p = JSON.parse(db().prepare('SELECT json FROM players WHERE acc_id=?').get(accId).json);
  p._acc = accId;   // lets views answer "how many unread notes do I have"
  return p;
}
function save(accId, p) {
  const clean = Object.assign({}, p);
  delete clean._acc;
  db().prepare('UPDATE players SET json=?, name=?, avatar=?, updated_at=? WHERE acc_id=?')
    .run(JSON.stringify(clean), p.name, p.avatar, Date.now(), accId);
}
function row(accId) { return db().prepare('SELECT acc_id, name, avatar FROM players WHERE acc_id=?').get(accId); }
function accountOf(accId) { return db().prepare('SELECT * FROM accounts WHERE id=?').get(accId); }
function logNews(kind, icon, message) { db().prepare('INSERT INTO news (ts, kind, icon, message) VALUES (?,?,?,?)').run(Date.now(), kind, icon, message); }

// ------- progression: courses, perks, housing -------
function normalize(p) {
  p.stocks = p.stocks || {}; p.crypto = p.crypto || {}; p.equip = p.equip || { weapon: null, armour: null };
  if (!p.mstats) p.mstats = { crimes: 0, sold: 0, stocks: 0, wins: 0 };        // mission board tallies
  if (!p.missions) p.missions = {};                                            // claimed mission ids
  if (p.sub_founder == null) p.sub_founder = isFounderAcc(p._acc);             // the three names carry the pass forever
  if (p.sub_until == null) p.sub_until = 0;
  if (p.loan === undefined) p.loan = null;                                     // {owed, due, principal}
  if (!p.shop_caps) p.shop_caps = { day: 0, counts: {} };                      // corner-store daily stock per player
  if (p.chat_last == null) p.chat_last = 0;
  if (!p.courses) p.courses = {};
  if (!p.perks) p.perks = {};
  if (p.merits == null) p.merits = 0;
  if (p.merits_earned == null) p.merits_earned = 0;
  if (p.vault == null) p.vault = 0;
  if (p.happy == null) p.happy = 50;
  if (!p.property) p.property = 'shack';
  if (!Array.isArray(p.property_up)) p.property_up = [];
  if (!p.prison) p.prison = { cigs: 0, shifts: 0, busts: 0, shift_at: 0, gym_at: 0, gamble_at: 0, bust_at: 0 };  // life behind bars
  if (!p.spin) p.spin = { day: null, streak: 0 };                                  // Big Wheel — one free spin a day
  if (!p.heists) p.heists = {};                                                    // { group: { stage, cool } }
  if (p.course === undefined) p.course = null;
  if (p.course_ends === undefined) p.course_ends = null;
  return p;
}
// ---------------------------------------------------------------- PRISON — a real sentence
// While jail_until is live the yard stays open: work shifts for cigarettes, hit the weights,
// run the dice, buy your way out, or try the wall. Cigarettes contraband persists.
const SHIFT_CD = 15 * E.MINUTES, GYM_CD = 20 * E.MINUTES, GAMBLE_CD = 4 * E.MINUTES, BUST_CD = 10 * E.MINUTES;
function prisonBailCost(p, now) {
  const minsLeft = Math.max(1, Math.ceil((p.jail_until - now) / 60000));
  const base = (400 + minsLeft * 22) * (1 + Math.min(2, (p.level || 1) / 40));
  const cut = tipOf(p, 'bail');
  return Math.max(1, Math.round(base * (1 - cut / 100)));
}
function prisonDo(accId, body) {
  const now = Date.now();
  const p = ready(load(accId));
  const op = String((body && body.op) || 'yard');
  if (!p.jail_until || p.jail_until <= now) return { err: 'The gates are already open — you are free.' };
  const res = { op };
  if (op === 'work') {
    if (now < (p.prison.shift_at || 0)) return { err: 'The laundry is cooling. Back in ' + Math.ceil((p.prison.shift_at - now) / 60000) + ' min.' };
    p.prison.shift_at = now + SHIFT_CD;
    const cigs = 2 + (Math.random() < 0.25 ? 1 : 0);
    p.prison.cigs = (p.prison.cigs || 0) + cigs;
    p.prison.shifts = (p.prison.shifts || 0) + 1;
    E.gainXp(p, 4);
    if (p.prison.shifts >= 60) unlock(p, 'sweatshop');
    res.cigs = cigs; res.text = 'Folding sheets for the whole wing. The screws slip you ' + cigs + ' cigarettes.';
  } else if (op === 'gym') {
    if (now < (p.prison.gym_at || 0)) return { err: 'The yard is off-limits for ' + Math.ceil((p.prison.gym_at - now) / 60000) + ' min.' };
    p.prison.gym_at = now + GYM_CD;
    const stat = ['st', 'de', 'sp'][Math.floor(Math.random() * 3)];
    p.stats[stat] += 1;
    E.gainXp(p, 3);
    if (Math.random() < 0.03) { p.jail_until += 4 * E.MINUTES; res.noted = 'A warden caught the extra reps — 4 more minutes added.'; }
    res.stat = stat; res.text = 'Cold iron, bare knuckles — +1 ' + ({ st: 'strength', de: 'defence', sp: 'speed' })[stat] + '.';
  } else if (op === 'gamble') {
    if (now < (p.prison.gamble_at || 0)) return { err: 'The dice are cold for ' + Math.ceil((p.prison.gamble_at - now) / 60000) + ' min.' };
    const stake = Math.max(1, Math.min(10, parseInt((body && body.stake), 10) || 1));
    if ((p.prison.cigs || 0) < stake) return { err: 'You need ' + stake + ' cigarettes to sit at that game.' };
    p.prison.gamble_at = now + GAMBLE_CD;
    const win = Math.random() < 0.48;
    p.prison.cigs += win ? stake : -stake;
    res.win = win; res.stake = stake;
    res.text = win ? 'Snake eyes for the other man. +' + stake + ' cigarettes.' : 'The cell block takes your stake. -' + stake + ' cigarettes.';
  } else if (op === 'bail') {
    const cost = prisonBailCost(p, now);
    if ((p.money + p.bank) < cost) return { err: 'Bail sits at $' + cost.toLocaleString() + ' — ask a friend to move money to you, or sweat the clock.' };
    let owe = cost;
    const take = Math.min(p.money, owe); p.money -= take; owe -= take;
    if (owe > 0) p.bank -= owe;
    p.jail_until = 0;
    p.energy = p.max_energy;
    res.cost = cost; res.freed = true;
    res.text = 'Papers signed. The door opens for $' + cost.toLocaleString() + '.';
    logNews('release', '\uD83C\uDFAB', p.name + ' bought their way out of the cells.');
  } else if (op === 'bust') {
    if (now < (p.prison.bust_at || 0)) return { err: 'The screws just swept the corridor — try in ' + Math.ceil((p.prison.bust_at - now) / 60000) + ' min.' };
    p.prison.bust_at = now + BUST_CD;
    const chance = Math.min(45, 10 + Math.round((p.nerve || 0) * 0.5));
    if (Math.random() * 100 < chance) {
      p.jail_until = 0;
      p.prison.busts = (p.prison.busts || 0) + 1;
      E.gainXp(p, 25);
      unlock(p, 'escape_artist');
      res.freed = true; res.rolled = chance;
      res.text = 'Bar bents. Fire door breathes. You are out before the count.';
      logNews('escape', '\uD83D\uDD27', p.name + ' vanished off the prison rolls. Nobody saw a thing.');
    } else {
      p.jail_until += 14 * E.MINUTES;
      p.prison.cigs = Math.max(0, (p.prison.cigs || 0) - 3);
      res.rolled = chance; res.busted = true;
      res.text = 'The wall held. The shakedown took 3 cigarettes and the sentence grew 14 minutes.';
    }
  } else {
    return { err: 'Unknown yard move: ' + op };
  }
  save(accId, p);
  return { ok: true, res, p };
}
function noteTo(acc, fromAcc, fromName, body) {
  db().prepare('INSERT INTO messages (from_acc, from_name, to_acc, body, ts, read) VALUES (?,?,?,?,?,0)').run(fromAcc, fromName || 'Wire Desk', acc, body, Date.now());
}
// ---------------------------------------------------------------- JAIL BOARD — who is inside, and who can open the door
function jailBoard(now) {
  now = now || Date.now();
  const rows = [];
  for (const r of db().prepare('SELECT acc_id, json FROM players').all()) {
    try {
      const q = JSON.parse(r.json);
      if (q.jail_until && q.jail_until > now) {
        rows.push({ id: r.acc_id, name: q.name, level: q.level || 1, avatar: q.avatar || '',
          left: q.jail_until - now, bail: prisonBailCost(q, now), busts: (q.prison && q.prison.busts) || 0 });
      }
    } catch (e) {}
  }
  rows.sort((a, b) => a.left - b.left);
  return rows;
}
function prisonBailOther(accId, targetId) {
  const now = Date.now();
  if (accId === targetId) return { err: 'That is your own cell — post bail from the yard.' };
  const p = ready(load(accId));
  if (p.jail_until && p.jail_until > now) return { err: 'You are behind the same wall. Get yourself free first.' };
  let tp = null;
  for (const r of db().prepare('SELECT acc_id, json FROM players').all()) {
    if (r.acc_id === targetId) { try { tp = JSON.parse(r.json); } catch (e) {} break; }
  }
  if (!tp) return { err: 'No citizen by that number.' };
  if (!tp.jail_until || tp.jail_until <= now) return { err: tp.name + ' is not inside right now.' };
  const cost = prisonBailCost(tp, now);
  if ((p.money + p.bank) < cost) return { err: 'Their bail sits at $' + cost.toLocaleString() + ' — you are short across cash and bank.' };
  let owe = cost; const takeCash = Math.min(p.money, owe); p.money -= takeCash; owe -= takeCash;
  if (owe > 0) p.bank -= owe;
  tp.jail_until = 0; tp.energy = tp.max_energy || 100;
  save(accId, p); save(targetId, tp);
  noteTo(targetId, accId, p.name, '\uD83E\uDEAE ' + p.name + ' posted your bail ($' + cost.toLocaleString() + '). The door is open — walk.');
  logNews('release', '\uD83E\uDEAE', p.name + ' bailed ' + tp.name + ' out of the cells.');
  return { ok: true, res: { op: 'bail_other', cost, freed: true, bailed: tp.name, text: 'Bail posted. ' + tp.name + ' walks for $' + cost.toLocaleString() + '.' }, p };
}
function devJail(targetId, minutes) {
  let tp = null;
  for (const r of db().prepare('SELECT acc_id, json FROM players').all()) {
    if (r.acc_id === targetId) { try { tp = JSON.parse(r.json); } catch (e) {} break; }
  }
  if (!tp) return { err: 'No citizen by that number.' };
  const mins = Math.max(1, Math.min(1440, Math.floor(Number(minutes) || 10)));
  tp.jail_until = Date.now() + mins * 60000;
  save(targetId, tp);
  return { ok: true, name: tp.name, minutes: mins };
}
// ---------------------------------------------------------------- DAILY STREAK — your cut for showing up
// Dates are stored as UTC calendar days. Moving the clock across a daylight-saving
// boundary cannot manufacture a second day or snap an honest streak.
function todayKey(now) { return new Date(now).toISOString().slice(0, 10); }
function dayBeforeKey(day) {
  const d = new Date(String(day || '') + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - 1);
  return todayKey(d.getTime());
}
function nextDayAt(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
function dailyBasePay(level, streak) {
  return 180 + 140 * Math.min(9, Math.max(0, streak - 1)) + (level || 1) * 12;
}
function dailyGangBonusPct(p) { return factionUpgrades(p.faction).roll_call ? 10 : 0; }
function dailyPay(level, streak, gangBonusPct) {
  return Math.round(dailyBasePay(level, streak) * (1 + (gangBonusPct || 0) / 100));
}
function dailyStatus(p, now) {
  now = now || Date.now();
  const stored = p.daily || { day: null, streak: 0 };
  const day = todayKey(now);
  const claimed = stored.day === day;
  const canContinue = stored.day === dayBeforeKey(day);
  // Once today's payment is claimed, this forecasts tomorrow's payment if the
  // player returns. Before claiming, it is exactly the payment available now.
  const targetStreak = claimed ? Math.max(1, (stored.streak || 0) + 1) : (canContinue ? (stored.streak || 0) + 1 : 1);
  const gangBonusPct = dailyGangBonusPct(p);
  return {
    streak: stored.streak || 0,
    claimed,
    targetStreak,
    next: dailyPay(p.level, targetStreak, gangBonusPct),
    gangBonusPct,
    resetAt: nextDayAt(now)
  };
}
function dailyClaim(accId) {
  const now = Date.now();
  const p = ready(load(accId));
  if (p.jail_until && p.jail_until > now) return { err: 'The daily post does not reach the cells. Claim it on release.' };
  if (!p.daily) p.daily = { day: null, streak: 0 };
  const status = dailyStatus(p, now);
  if (status.claimed) return { err: 'Already collected today — the streak desk resets at midnight.' };
  p.daily.streak = status.targetStreak;
  p.daily.day = todayKey(now);
  const pay = dailyPay(p.level, p.daily.streak, status.gangBonusPct);
  p.money = (p.money || 0) + pay;
  p.happy = Math.min(p.max_happy || 100, (p.happy || 50) + 20);
  E.gainXp(p, 2);
  save(accId, p);
  if (p.daily.streak >= 3) logNews('daily', '\u2728', p.name + ' kept a ' + p.daily.streak + '-day Daily Streak alive at the wire desk.');
  const bonusText = status.gangBonusPct ? ' (including your crew’s +' + status.gangBonusPct + '% Roll Call)' : '';
  return {
    ok: true,
    res: { streak: p.daily.streak, pay, gangBonusPct: status.gangBonusPct, resetAt: nextDayAt(now), text: 'Day ' + p.daily.streak + ' on the wire: +$' + pay.toLocaleString() + bonusText + '.' },
    p: publicView(p)
  };
}
// ---------------------------------------------------------------- WIRES — cash, person to person
function wireCash(accId, body) {
  const p = ready(load(accId));
  const amt = Math.floor(Number((body && body.amount)) || 0);
  const toName = String((body && body.to) || '').trim();
  const note = String((body && body.note) || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 80);
  if (!toName) return { err: 'Name who the wire goes to.' };
  if (amt < 50) return { err: 'Wires start at $50 — pocket change walks by hand.' };
  let tRow = null;
  for (const r of db().prepare('SELECT acc_id, json FROM players').all()) {
    try { const q = JSON.parse(r.json); if ((q.name || '').toLowerCase() === toName.toLowerCase()) { tRow = { acc: r.acc_id, name: q.name }; break; } } catch (e) {}
  }
  if (!tRow) return { err: 'No citizen answers to the name "' + toName + '".' };
  if (tRow.acc === accId) return { err: 'Wiring yourself? The bank charges for circles.' };
  const fee = Math.max(5, Math.ceil(amt * 0.02));
  if ((p.money || 0) < amt + fee) return { err: 'Need $' + (amt + fee).toLocaleString() + ' on hand (includes the $' + fee.toLocaleString() + ' wire fee).' };
  p.money -= (amt + fee);
  const tp = ready(load(tRow.acc));
  tp.money = (tp.money || 0) + amt;
  save(accId, p); save(tRow.acc, tp);
  noteTo(tRow.acc, accId, p.name, '\uD83D\uDCE1 ' + p.name + ' wired you $' + amt.toLocaleString() + (note ? ' — "' + note + '"' : '.'));
  logNews('wire', '\uD83D\uDCE1', p.name + ' wired $' + amt.toLocaleString() + ' to ' + tp.name + '.');
  return { ok: true, res: { amt, fee, to: tp.name, text: 'Wire sent — $' + amt.toLocaleString() + ' to ' + tp.name + ' (fee $' + fee.toLocaleString() + ').' }, p };
}

// ------------------------------------------------ BIG WHEEL — one free spin a day; streaks fatten the wedges
const WHEEL_SEGS = [
  { label: 'BUSTED',       w: 26, kind: 'none',   amount: 0 },
  { label: '$2,000',       w: 20, kind: 'cash',   amount: 700 },
  { label: '$5,000',       w: 16, kind: 'cash',   amount: 1600 },
  { label: 'CIGS ×10',     w: 12, kind: 'cigs',   amount: 10 },
  { label: '$12,000',      w: 10, kind: 'cash',   amount: 3800 },
  { label: 'ENERGY +30',   w: 8,  kind: 'energy', amount: 30 },
  { label: '$25,000',      w: 6,  kind: 'cash',   amount: 7500 },
  { label: 'JACKPOT $150k', w: 2, kind: 'cash',   amount: 35000 },
];
function wheelMult(streak) { return 1 + 0.06 * Math.min(13, Math.max(0, streak - 1)); }
function wheelLabel(seg, mult) {
  if (seg.kind === 'cash')   return '$' + Math.round(seg.amount * mult).toLocaleString();
  if (seg.kind === 'cigs')   return 'CIGS ×' + Math.round(seg.amount * mult);
  if (seg.kind === 'energy') return 'ENERGY +' + Math.round(seg.amount * mult);
  return seg.label;
}
function wheelSpin(accId) {
  const now = Date.now();
  const p = ready(load(accId));
  if (p.jail_until && p.jail_until > now) return { err: 'The wheel never visits the cells — spin when you walk free.' };
  p.spin = p.spin || { day: null, streak: 0 };
  const today = todayKey(now);
  if (p.spin.day === today) return { err: 'One spin a day — the wheel dodges you until midnight.' };
  p.spin.streak = (p.spin.day === todayKey(now - 86400000)) ? (p.spin.streak || 0) + 1 : 1;
  p.spin.day = today;
  const mult = wheelMult(p.spin.streak);
  let tot = 0; for (const s of WHEEL_SEGS) tot += s.w;
  let roll = Math.random() * tot, index = WHEEL_SEGS.length - 1;
  for (let i = 0; i < WHEEL_SEGS.length; i++) { roll -= WHEEL_SEGS[i].w; if (roll <= 0) { index = i; break; } }
  const seg = WHEEL_SEGS[index];
  const amount = Math.round(seg.amount * mult);
  const res = { index, kind: seg.kind, amount, streak: p.spin.streak, mult: Math.round(mult * 100) / 100, label: wheelLabel(seg, mult) };
  if (seg.kind === 'cash') {
    p.money = (p.money || 0) + amount;
    res.text = 'The needle settles on ' + res.label + ' — $' + amount.toLocaleString() + ' straight into the coat.';
    if (amount >= 25000) logNews('casino', '\uD83C\uDF40', p.name + ' landed ' + res.label + ' on the Big Wheel (day ' + p.spin.streak + ' streak).');
  } else if (seg.kind === 'energy') {
    p.energy = Math.min(p.max_energy || 100, (p.energy || 0) + amount);
    res.text = 'A vial of something honest — +' + amount + ' energy, on the house.';
  } else if (seg.kind === 'cigs') {
    p.prison.cigs = (p.prison.cigs || 0) + amount;
    res.text = amount + ' cigarettes for the stash. Useful in here — and out.';
  } else {
    res.text = 'BUSTED. The wheel gives you a long, sympathetic shrug.';
  }
  E.gainXp(p, 2);
  save(accId, p);
  return { ok: true, res, p: publicView(p) };
}

// ------------------------------------------------ THE CIRCUIT — six riders, real book odds, settles every few minutes
const RACE_WALK_MS = (parseInt(process.env.RACE_WALK_S, 10) || 120) * 1000;
const RACE_RUN_MS  = (parseInt(process.env.RACE_RUN_S, 10)  || 25) * 1000;
const RACE_SHOW_MS = (parseInt(process.env.RACE_SHOW_S, 10) || 20) * 1000;
const RACERS = ['Neon Wraith', 'Paramount Kid', 'Static Bishop', 'Gin Lantern', 'Data Sprinter', 'Old Lampshade'];
const RACE_BASE_ODDS = [2.5, 3.8, 5.0, 6.5, 9.0, 14.0];
const RC = { round: null, hist: [], nextId: 1 };   // live round is in-memory; SIGTERM settle covers deploys
function raceMake(now) {
  const runners = RACERS.map((n, i) => ({ n, odds: Math.max(1.4, Math.round(RACE_BASE_ODDS[i] * (0.85 + Math.random() * 0.3) * 10) / 10) }));
  return { id: RC.nextId++, created: now, openUntil: now + RACE_WALK_MS, runUntil: now + RACE_WALK_MS + RACE_RUN_MS, runners, bets: [], winner: null, settled: false };
}
function raceSettle(now) {
  const r = RC.round; if (!r || r.settled) return;
  let tw = 0; const ws = r.runners.map(x => { const w = 1 / x.odds; tw += w; return w; });  // overround = the bookie's slice
  let roll = Math.random() * tw, wi = ws.length - 1;
  for (let i = 0; i < ws.length; i++) { roll -= ws[i]; if (roll <= 0) { wi = i; break; } }
  r.winner = wi; r.settled = true;
  let biggest = 0, winners = 0;
  for (const b of r.bets) {
    if (b.ri !== wi) continue;
    try {
      const tp = ready(load(b.acc));
      const ret = Math.round(b.stake * b.odds);
      tp.money = (tp.money || 0) + ret;
      tp.reputation = (tp.reputation || 0) + Math.max(1, Math.round((ret - b.stake) / 60));
      save(b.acc, tp);
      noteTo(b.acc, 0, 'The Circuit', '\uD83C\uDFC1 ' + r.runners[wi].n + ' came home — your $' + b.stake.toLocaleString() + ' ticket paid $' + ret.toLocaleString() + '.');
      biggest = Math.max(biggest, ret); winners++;
    } catch (e) {}
  }
  logNews('casino', '\uD83C\uDFC1', RACERS[wi] + ' takes round ' + r.id + ' of the Circuit' + (winners ? ' — ' + winners + ' winning ticket' + (winners > 1 ? 's' : '') + ', biggest $' + biggest.toLocaleString() : ' — nobody backed it.') + '.');
}
function raceEnsure() {
  const now = Date.now();
  if (!RC.round) { RC.round = raceMake(now); return; }
  const r = RC.round;
  if (!r.settled && now >= r.runUntil) raceSettle(now);
  if (r.settled && now >= r.runUntil + RACE_SHOW_MS) {
    RC.hist.unshift({ id: r.id, w: r.winner });
    RC.hist = RC.hist.slice(0, 8);
    RC.round = raceMake(now);
  }
}
function raceView(accId) {
  raceEnsure();
  const r = RC.round, now = Date.now();
  return { now,
    round: { id: r.id, created: r.created, openUntil: r.openUntil, runUntil: r.runUntil, settled: r.settled, winner: r.winner,
      nextOpenAt: r.settled ? (r.runUntil + RACE_SHOW_MS) : null,
      runners: r.runners, bets: r.bets.map(b => ({ acc: b.acc, name: b.name, ri: b.ri, stake: b.stake, odds: b.odds, me: b.acc === accId })) },
    hist: RC.hist.map(h => ({ id: h.id, winnerName: RACERS[h.w] })) };
}
function raceBet(accId, body) {
  raceEnsure();
  const now = Date.now(), r = RC.round;
  if (now >= r.openUntil) return { err: 'Gates closed — the flag is already up. Next round opens soon.' };
  const p = ready(load(accId));
  if (p.jail_until && p.jail_until > now) return { err: 'The wire does not reach into the cells — bet when you walk free.' };
  if (p.hosp_until && p.hosp_until > now) return { err: 'Banged up and betting? Rest first.' };
  const ri = Math.max(0, Math.min(RACERS.length - 1, parseInt(body && body.runner, 10) || 0));
  const stake = Math.floor(Number(body && body.stake) || 0);
  if (r.bets.filter(b => b.acc === accId).length >= 5) return { err: 'Five tickets a round, Stranger — the book remembers your handwriting.' };
  if (stake < 10 || stake > 1000000) return { err: 'Circuit tickets run $10 to $1,000,000.' };
  if ((p.money || 0) < stake) return { err: 'Not enough on hand for that ticket.' };
  p.money -= stake; save(accId, p);
  const odds = r.runners[ri].odds;
  r.bets.push({ acc: accId, name: p.name, ri, stake, odds });
  return { ok: true, res: { runner: r.runners[ri].n, stake, odds, text: 'Ticket taken — $' + stake.toLocaleString() + ' on ' + r.runners[ri].n + ' at ' + odds.toFixed(1) + '. Pays $' + Math.round(stake * odds).toLocaleString() + ' if it lands.' }, p: publicView(p) };
}
function raceSettleNow() { try { raceSettle(Date.now()); } catch (e) {} }

// ------------------------------------------------ HEIST DISENGAGE — drop an in-progress chain
function heistWalk(accId, group) {
  const p = ready(load(accId));
  p.heists = p.heists || {};
  const h = p.heists[group];
  if (!h || !(h.stage > 0)) return { err: 'No open work on that board to walk away from.' };
  const gname = (C.CRIMES.find(c => c.heist && c.heist.group === group) || { heist: {} }).heist.gname || 'the job';
  p.heists[group] = { stage: 0, cool: 0 };
  save(accId, p);
  return { ok: true, res: { text: 'You slip out quiet. ' + gname + ' forgets your name — recon again when your stomach is back.', group }, p: publicView(p) };
}

function propOf(p) { return C.PROPERTIES.find(x => x.id === p.property) || C.PROPERTIES[0]; }
// every completed course's grants, added up
function courseGrant(p) {
  const g = {};
  for (const id of Object.keys(p.courses || {})) {
    const c = C.COURSES.find(x => x.id === id);
    if (!c) continue;
    for (const k of Object.keys(c.grant || {})) g[k] = (g[k] || 0) + c.grant[k];
  }
  return g;
}
function perkCount(p, id) { return (p.perks && p.perks[id]) || 0; }
function perkTotals(p) { const o = {}; for (const k of C.MERIT_PERKS) o[k.id] = perkCount(p, k.id); return o; }
function happyMax(p) {
  const prop = propOf(p);
  let h = prop.happy;
  for (const upId of (p.property_up || [])) {
    const up = (prop.upgrades || []).find(u => u.id === upId);
    if (up) h += up.happy || 0;
  }
  const g = courseGrant(p);
  return h + (g.maxHappy || 0) + perkCount(p, 'happy') * 10;
}
function gymBonusPct(p) {
  let pct = (courseGrant(p).gymPct || 0) + perkCount(p, 'gym') * 2;
  if (factionUpgrades(p.faction).gymnasium) pct += 6;   // the crew keeps iron downstairs
  // a private gymnasium at home counts too
  const prop = C.PROPERTIES.find(x => x.id === (p.property || 'shack'));
  if (prop) for (const u of (p.property_up || [])) {
    const up = (prop.upgrades || []).find(x => x.id === u);
    if (up && up.gymPct) pct += up.gymPct;
  }
  return pct;
}
function crimeBonusPct(p) { return (courseGrant(p).crimePct || 0) + perkCount(p, 'crime'); }
function jailCutPct(p) { return Math.max(-60, (courseGrant(p).jailPct || 0) - perkCount(p, 'jail') * 3); }
function mugBonusPct(p) { return perkCount(p, 'mug') * 3; }
function propDiscountPct(p) { return Math.min(25, courseGrant(p).propDiscPct || 0); }

// finish a course whose time is up
function courseTick(p, now) {
  if (p.course && p.course_ends && now >= p.course_ends) {
    const c = C.COURSES.find(x => x.id === p.course);
    if (c) {
      p.courses[p.course] = now;
      for (const k of ['st', 'de', 'sp', 'dx']) if (c.grant && c.grant[k]) p.stats[k] = Math.round(((p.stats[k] || 0) + c.grant[k]) * 10) / 10;
      const nm = rowNameOf(p);
      logNews('edu', c.icon, `${nm.name} finished ${c.name} at Wireside College.`);
    }
    p.course = null; p.course_ends = null;
    p.happy = Math.min(happyMax(p), (p.happy || 0) + 5);
  }
  return p;
}
// rent, rates and coal: charged once a day, and an unpaid house is an unhappy one
const UPKEEP_PERIOD = 24 * 60 * 60 * 1000;
function upkeepTick(p, now) {
  const prop = propOf(p);
  if (!prop.upkeep) return p;
  if (!p._ref) p._ref = { life: now, energy: now, nerve: now };
  if (!p._ref.upkeep) { p._ref.upkeep = now; return p; }
  let days = Math.floor((now - p._ref.upkeep) / UPKEEP_PERIOD);
  if (days <= 0) return p;
  if (days > 30) days = 30;                      // don't bill someone back to the stone age
  const bill = prop.upkeep * days;
  const paid = Math.min(p.money, bill);
  p.money -= paid;
  p._ref.upkeep += days * UPKEEP_PERIOD;
  if (paid < bill) p.happy = Math.max(0, (p.happy || 0) - 10 * days);
  return p;
}

// levels are worth a merit each — spend them on permanent perks
function gainXpAndMerits(p, amount) {
  const levels = E.gainXp(p, amount) || 0;
  if (levels > 0) {
    p.merits = (p.merits || 0) + levels;
    p.merits_earned = (p.merits_earned || 0) + levels;
  }
  return levels;
}

// ------- derived numbers
function derive(p) {
  const lv = E.levelFromXp(p.xp || 0);
  p.level = lv.level;
  p.xpInto = lv.into; p.xpNeed = lv.need;
  const g = courseGrant(p), k = perkTotals(p);
  p.max_life = Math.floor(100 + (p.stats.de || 0) * 10 + p.level * 25) + (g.maxLife || 0) + k.life * 20;
  p.max_energy = 100 + (g.maxEnergy || 0) + k.energy * 2 + (E.subOn(p) ? C.WIRE_PASS.buffs.maxEnergy : 0);
  p.max_nerve = Math.min(110, 20 + 5 * Math.floor((p.level - 1) / 5)) + (g.maxNerve || 0) + k.nerve + (E.subOn(p) ? C.WIRE_PASS.buffs.maxNerve : 0);
  p.max_happy = happyMax(p);
  if (p.happy > p.max_happy) p.happy = p.max_happy;
  p.bonuses = { gymPct: gymBonusPct(p), crimePct: crimeBonusPct(p), jailPct: jailCutPct(p), mugPct: mugBonusPct(p), propDiscPct: propDiscountPct(p) };
  p.total = E.calcTotal(p);
  return p;
}

const _founderCache = new Map();
function isFounderAcc(accId) {
  if (accId == null) return false;
  if (_founderCache.has(accId)) return _founderCache.get(accId);
  let f = false;
  try { const a = db().prepare('SELECT username FROM accounts WHERE id=?').get(accId); f = !!(a && C.WIRE_PASS.founders.includes(String(a.username).toLowerCase())); } catch (e) {}
  _founderCache.set(accId, f);
  return f;
}

function loadSafe(accId) { try { return load(accId); } catch (e) { return null; } }
// a persisted player carries its account id as _acc (load() attaches it); bots never do
function accIdOf(p) { return p._acc != null ? p._acc : (p.acc_id != null ? p.acc_id : p.id); }

function ready(p) {
  const now = Date.now();
  const sig = (q) => [q.money, q.vault || 0, Math.round(q.life), Math.round(q.energy), Math.round(q.nerve),
    Math.round(q.happy || 0), q.course, q.course_ends, JSON.stringify(q.courses || {}), JSON.stringify(q._ref || {})].join('|');
  const before = sig(p);
  p = normalize(p);
  p = courseTick(p, now);
  p = upkeepTick(p, now);
  p = loanCollector(cryptoWalletTick(derive(E.refill(p, now))));
  // anything that changed here (a course finishing, a day's rent, regeneration) has to stick,
  // or the next poll would hand out the same grant twice
  if (p._acc != null && sig(p) !== before) { try { save(p._acc, p); } catch (e) {} }
  return p;
}

function unlock(p, id) {
  const def = C.ACHIEVEMENTS[id];
  if (!def || p.achievements[id]) return null;
  def.id = id; // annotate shared def so callers can report the key
  p.achievements[id] = Date.now();
  const nm = rowNameOf(p);
  logNews('ach', def.icon, `${nm.name} earned the "${def.name}" achievement.`);
  return def;
}
function rowNameOf(p) { return { name: p.name, avatar: p.avatar }; }

// Sentences a player to the cells for `mins` minutes (used by world + systems).
function jailFor(p, mins) {
  p.jail_until = Date.now() + Math.max(1, Math.round(mins)) * E.MINUTES;
  return p.jail_until;
}

function unreadCount(accId) {
  if (accId === undefined || accId === null) return 0;
  try { return db().prepare('SELECT COUNT(*) c FROM messages WHERE to_acc=? AND read=0').get(accId).c; }
  catch (e) { return 0; }
}

function unlockLevels(p) {
  const out = [];
  for (const id of ['level5', 'level10', 'level20']) {
    const lvl = parseInt(id.replace('level', ''), 10);
    if (p.level >= lvl && !p.achievements[id]) out.push(unlock(p, id));
  }
  return out.filter(Boolean);
}

// ------- jail / hospital penalties
function goJail(p, minutes) {
  const fup = factionUpgrades(p.faction);
  minutes = Math.max(1, Math.round(minutes * (1 - 0.15 * (fup.dentist ? 1 : 0)) * (1 - 0.10 * (fup.safehouse ? 1 : 0))));
  p.jail_until = Date.now() + minutes * E.MINUTES;
  p.job = null;
  const jb = unlock(p, 'jailbird'); return jb;
}
function goHospital(p, minutes) {
  if (factionUpgrades(p.faction).infirmary) minutes = Math.max(1, Math.round(minutes * 0.75));
  p.hosp_until = Date.now() + minutes * E.MINUTES;
  p.job = null; p.life = 1;
  p.hospital_times = (p.hospital_times || 0) + 1;
  const s = unlock(p, 'survivor'); return s;
}

// ================= CRIME =================
function doCrime(accId, crimeId) {
  const p = ready(load(accId));
  const crime = C.CRIMES.find(c => c.id === crimeId);
  if (!crime) return { err: 'Unknown job.' };
  if (!isFounderAcc(accId)) {
    if (p.jail_until) return { err: 'You are in jail. Pay your debt to society first.' };
    if (p.hosp_until) return { err: 'You are in the hospital. Recover first.' };
  }
  const energyCost = 3 + crime.nerve * 2;
  if (p.energy < energyCost) return { err: `Not enough energy (needs ${energyCost}). Wait for regeneration.` };
  if (p.nerve < crime.nerve) return { err: `Not enough nerve (needs ${crime.nerve}). Steady yourself.` };
  const nowMs2 = Date.now();
  if (crime.heist) {
    if (!p.heists) p.heists = {};
    const hh = p.heists[crime.heist.group] = p.heists[crime.heist.group] || { stage: 0, cool: 0 };
    if ((hh.cool || 0) > nowMs2) return { err: `${crime.heist.gname.replace(/^the /i, 'The ')} crew is lying low after the score — ${Math.ceil((hh.cool - nowMs2) / 60000)} min yet.` };
    if (crime.heist.step !== (hh.stage || 0) + 1) {
      return { err: (hh.stage || 0) >= crime.heist.step
        ? `That stage is banked — stage ${(hh.stage || 0) + 1} is the one on the table now.`
        : `Chain order, Stranger. Stage ${(hh.stage || 0) + 1} of ${crime.heist.gname} comes before this.` };
    }
  }
  const fup = factionUpgrades(p.faction);
  const subCrime = E.subOn(p) ? C.WIRE_PASS.buffs.crimePct : 0;
  const tipEdge = tipOf(p, 'edge');
  const chance = Math.min(0.96, E.crimeSuccessChance(p, crime) * (1 + (crimeBonusPct(p) + subCrime + (fup.muscle ? 6 : 0) + tipEdge) / 100));
  const roll = Math.random();
  const ok = roll < chance;
  p.energy -= energyCost; p.nerve -= crime.nerve;
  p.total_crimes = (p.total_crimes || 0) + 1;
  const res = { id: crime.id, name: crime.name, ok, nerve: crime.nerve, tag: crime.tag, cat: crime.cat };
  let gainedLv = 0, ach = [];
  if (ok) {
    p.total_success = (p.total_success || 0) + 1; p.mstats.crimes = (p.mstats.crimes || 0) + 1;
    let cash = E.crimePayout(crime, p.level);
    const tipPay = tipOf(p, 'payoff');
    if (tipPay) cash = Math.round(cash * (1 + tipPay / 100));
    cash = Math.round(cash * dialPct('payout') / 100);
    const xpGain = E.xpForCrime(crime);
    // SPREE: consecutive clean scores build a multiplier bonus
    p.spree = (p.spree || 0) + 1;
    let bonus = 0;
    if (p.spree > 1) bonus = Math.round(cash * Math.min(25, (p.spree - 1) * 2) / 100);
    const total = cash + bonus;
    p.money += total; p.xp += xpGain;
    p.reputation = (p.reputation || 0) + Math.round(total / 40) + crime.nerve * 2;
    res.cash = cash; res.bonus = bonus || 0; res.spree = p.spree; res.xp = xpGain;
    // loot drops
    const drops = {};
    for (const [itemId, wt] of (crime.drop || [])) {
      if (Math.random() * 100 < wt) drops[itemId] = true;
    }
    res.loot = [];
    for (const itemId of Object.keys(drops)) {
      if (!p.items[itemId]) p.items[itemId] = 0;
      p.items[itemId]++;
      res.loot.push(itemId);
    }
    if (cash >= 10000) { const a = unlock(p, 'big_payout'); if (a) ach.push(a); }
    if (crime.heist) {
      if (!p.heists) p.heists = {};
      const hh = p.heists[crime.heist.group] = p.heists[crime.heist.group] || { stage: 0, cool: 0 };
      hh.stage = crime.heist.step;
      res.heist = { group: crime.heist.group, step: crime.heist.step, done: false };
      if (crime.heist.step >= 3) {
        res.heist.done = true;
        const a3 = unlock(p, 'heist_done'); if (a3) ach.push(a3);
        logNews('crime', '\uD83C\uDFAF', p.name + ' closed every stage of ' + crime.heist.gname + ' — the three-part score is in the wind.');
        hh.stage = 0; hh.cool = nowMs2 + 30 * E.MINUTES;
      }
    }
    gainedLv = gainXpAndMerits(p, xpGain); // levels gained (and a merit each)
  } else {
    p.total_fail = (p.total_fail || 0) + 1;
    p.spree = 0; res.spree = 0;
    if (crime.heist && crime.heist.step >= 2 && p.heists && p.heists[crime.heist.group] && (p.heists[crime.heist.group].stage || 0) >= 1) {
      p.heists[crime.heist.group].stage = 0;
      res.heistBroken = true;
      res.chainText = 'The chain broke — the ' + crime.heist.gname + ' crew scattered. Back to recon when your stomach is back.';
    }
    p.reputation = Math.max(0, (p.reputation || 0) - (2 + crime.nerve));
    if (Math.random() < E.arrestChance(p) * (dialPct('danger') / 100)) {
      let mins = crime.jail[0] + Math.floor(Math.random() * (crime.jail[1] - crime.jail[0]));
      mins = Math.max(5, Math.round(mins * (1 + jailCutPct(p) / 100)));
      res.busted = 'jail'; res.jailMin = mins;
      const a = goJail(p, mins); if (a) ach.push(a);
    } else if (Math.random() < 0.30 && crime.cash[1] > 4000) {
      const mins = 30 + Math.floor(Math.random() * 120);
      res.busted = 'hospital'; res.jailMin = mins;
      const a = goHospital(p, mins); if (a) ach.push(a);
    }
  }
  // achievements
  if (p.total_crimes === 1) ach.push(unlock(p, 'first_crime'));
  if (p.total_crimes === 10) ach.push(unlock(p, 'ten_crimes'));
  if (p.total_crimes === 50) ach.push(unlock(p, 'fifty_crimes'));
  derive(p);
  ach.push(...unlockLevels(p));
  res.levelUps = Math.max(0, gainedLv);
  res.ach = ach.filter(Boolean).map(a => a.id);
  if (ok && res.cash >= 100000) logNews('crime', '\uD83D\uDCA5', `${p.name} pulled off ${crime.name} — $${res.cash.toLocaleString()} richer.`);
  save(accId, p);
  return { p: publicView(p), res };
}

// ================= GYM / TRAINING =================
function doTrain(accId, stat, gymId) {
  const p = ready(load(accId));
  const gym = C.GYMS.find(g => g.id === gymId) || C.GYMS[0];
  if (!isFounderAcc(accId) && (p.jail_until || p.hosp_until)) return { err: 'Not available right now.' };
  if (p.level < gym.lvl) return { err: `This gym requires level ${gym.lvl}.` };
  if (p.money < 450) return { err: 'Training costs $450 per session.' };
  const blocked = E.trainBlocker(p, stat);
  if (blocked) return {
    err: `Your ${blocked.statName} is ${blocked.gap} ahead of the rest. Train ${blocked.laggingName} next — or train ${blocked.statName} again once the others have caught up.`,
    hint: { lagging: blocked.lagging, gap: blocked.gap }
  };
  if (p.energy < 12) return { err: 'Too tired to train. Energy regenerates over time.' };
  p.energy -= 12; p.money -= 450;
  // training is better with a full belly of happiness and a course behind you
  const happyFactor = 0.8 + 0.4 * Math.min(1, (p.happy || 0) / Math.max(1, p.max_happy || 100));
  const gain = Math.round(E.trainResult(p, stat, gym.lvl) * (1 + gymBonusPct(p) / 100) * happyFactor * 10) / 10;
  p.stats[stat] = Math.round((p.stats[stat] + gain) * 10) / 10;
  derive(p);
  p.life = Math.min(p.max_life, p.life);
  save(accId, p);
  return { p: publicView(p), res: { gain, stat, gym: gym.name } };
}

// ================= WORK =================
function doWork(accId) {
  const p = ready(load(accId));
  if (!isFounderAcc(accId) && (p.jail_until || p.hosp_until)) return { err: 'Not available right now.' };
  if (!p.job) return { err: 'You are not employed.' };
  const job = C.JOBS.find(j => j.id === p.job);
  if (!job) return { err: 'Job not found.' };
  if (p.energy < 12) return { err: 'Too tired to work.' };
  p.energy -= 12;
  const pay = Math.round(job.base * (0.85 + Math.random() * 0.3) * (1 + p.level * 0.02));
  const xpGain = Math.round(job.base / 12);
  p.money += pay; p.xp += xpGain;
  p.total_shift = (p.total_shift || 0) + 1;
  p.reputation = (p.reputation || 0) + 2;
  gainXpAndMerits(p, xpGain);
  const ach = [];
  if (p.total_shift === 20) ach.push(unlock(p, 'jobber'));
  derive(p); ach.push(...unlockLevels(p));
  save(accId, p);
  return { p: publicView(p), res: { pay, xp: xpGain } };
}

// ================= ATTACK =================
function attackTargets(accId) {
  const me = ready(load(accId));
  const rows = db().prepare(`SELECT p.acc_id, p.name, p.avatar, p.json FROM players p JOIN accounts a ON a.id=p.acc_id`).all();
  const out = [];
  for (const r of rows) {
    if (r.acc_id === accId) continue;
    let q; try { q = JSON.parse(r.json); } catch { continue; }
    q._acc = r.acc_id;
    q = derive(normalize(q));
    if (q.jail_until && q.jail_until > Date.now()) continue;
    if (q.hosp_until && q.hosp_until > Date.now()) continue;
    const isBot = r.acc_id < 0;
    out.push({
      acc_id: r.acc_id, name: r.name, avatar: r.avatar, isBot,
      level: q.level, total: q.total, life: q.life, max: q.max_life,
      cash: isBot ? Math.round(q.money * (0.04 + Math.random() * 0.08)) : Math.round(q.money * 0.1),
      rep: q.reputation || 0,
      wins: q.wins || 0,
      gap: Math.abs(q.total - me.total)
    });
  }
  // closest to your power first — winnable fights, room to climb
  out.sort((a, b) => a.gap - b.gap);
  return { targets: out.slice(0, 40) };
}

// ---------------- GEAR: guns & plate
function gearBonus(p) {
  const eq = (p && p.equip) || {};
  const wpn = eq.weapon && C.ITEMS[eq.weapon] && C.ITEMS[eq.weapon].equip ? C.ITEMS[eq.weapon].equip.atk || 0 : 0;
  const arm = eq.armour && C.ITEMS[eq.armour] && C.ITEMS[eq.armour].equip && C.ITEMS[eq.armour].equip.def ? C.ITEMS[eq.armour].equip.def : 0;
  return { atk: wpn, def: arm };
}
// Load-bearing over E.playerBattleStats: strength rides the iron, defence rides the plate.
function battleStats(p) {
  const fu = factionUpgrades(p.faction);
  if (fu.burner_ring) p._atkMult = 1.08; else p._atkMult = 1;
  if (fu.kevlar_net) p._defMult = 1.08; else p._defMult = 1;
  const s = E.playerBattleStats(p);
  const g = gearBonus(p);
  return { ...s, st: Math.round(s.st * (1 + g.atk / 100)), de: Math.round(s.de * (1 + g.def / 100)) };
}
function equipItem(accId, itemId) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it || it.type !== 'gear' || !it.equip) return { err: 'That is not gear.' };
  if (((p.items || {})[itemId] || 0) < 1) return { err: 'You are not carrying it.' };
  p.items[itemId] -= 1; if (p.items[itemId] <= 0) delete p.items[itemId];
  const old2id = p.equip[it.equip.slot];
  if (old2id) { p.items[old2id] = (p.items[old2id] || 0) + 1; }
  p.equip[it.equip.slot] = itemId;
  if (it.equip.slot === 'armour') unlock(p, 'plated');
  checkGunCabinet(p);
  save(accId, p);
  return { ok: true, p: publicView(p), res: { slot: it.equip.slot } };
}
function unequipItem(accId, slot) {
  const p = ready(load(accId));
  const cur = p.equip[slot];
  if (!cur) return { err: 'Nothing there to strip.' };
  p.items = p.items || {}; p.items[cur] = (p.items[cur] || 0) + 1;
  p.equip[slot] = null;
  save(accId, p);
  return { ok: true, p: publicView(p) };
}
// gun cabinet badge: own one of every gun at once — canonical set (original 4) stays the badge even after 600+ catalog expansion
function checkGunCabinet(p) {
  const canonical = ['g9_pistol','sawn_12','x7_carbine','longline_sr'];
  const useCanonical = canonical.every(k => C.ITEMS[k]);
  const guns = useCanonical ? canonical : Object.keys(C.ITEMS).filter(k => C.ITEMS[k].equip && C.ITEMS[k].equip.slot === 'weapon');
  const owned = new Set(Object.keys(p.items || {}).concat(Object.values(p.equip || {}).filter(Boolean)));
  if (guns.length && guns.every(g => owned.has(g))) unlock(p, 'guncollector');
}

function doAttack(accId, targetId) {
  const p = ready(load(accId));
  if (!isFounderAcc(accId) && (p.jail_until || p.hosp_until)) return { err: 'Not available right now.' };
  if (p.energy < 10) return { err: 'Not enough energy to fight.' };
  const tacc = db().prepare('SELECT * FROM accounts WHERE id=?').get(targetId);
  if (!tacc) return { err: 'Target not found.' };
  const isBot = tacc.kind === 'bot';
  const t = ready(load(targetId));
  if (t.jail_until && t.jail_until > Date.now()) return { err: `${t.name} is in jail. Pick on someone who can fight back.` };
  if (t.hosp_until && t.hosp_until > Date.now()) return { err: `${t.name} is in the hospital already.` };
  const aStats = battleStats(p);
  const bStats = isBot ? E.botBattleStats(t, aStats) : battleStats(t);
  const fight = E.simulateFight(aStats, bStats, 1.8);
  p.energy -= 10;
  const ach = [];
  let resMsg = '', claimMsg = null;
  if (fight.win) {
    p.wins = (p.wins || 0) + 1; p.mstats.wins = (p.mstats.wins || 0) + 1;
    let loot = isBot
      ? Math.max(50, Math.round(t.money * (0.04 + Math.random() * 0.06)))
      : Math.max(25, Math.round(t.money * 0.03 * (1 + mugBonusPct(p) / 100)));
    // 2026 protection policy: an insured citizen loses at most 2% of their cash per mugging
    if (!isBot && t.sys && t.sys.insurance && t.sys.insurance.until > Date.now()) {
      loot = Math.min(loot, Math.max(1, Math.round(t.money * 0.02)));
    }
    p.money += loot;
    const xpGain = 40 + Math.round(t.level * 3);
    p.reputation = (p.reputation || 0) + 25;
    t.money = Math.max(0, t.money - loot);
    if (!isBot) t.losses = (t.losses || 0) + 1;   // the loser's record has to show it
    if (p.wins === 1) ach.push(unlock(p, 'first_win'));
    if (p.wins === 5) ach.push(unlock(p, 'five_wins'));
    if (p.wins === 25) ach.push(unlock(p, 'hitlist'));
    gainXpAndMerits(p, xpGain);
    const dmgTaken = Math.min(p.max_life - 1, Math.max(1, Math.round(fight.pLost)));
    p.life = Math.max(1, p.life - dmgTaken);
    if (!isBot) {
      const dmgTo = Math.max(1, Math.round(t.max_life * (0.08 + Math.random() * 0.1)));
      t.life = Math.max(1, t.life - dmgTo);
      if (t.life <= 1) goHospital(t, 25 + Math.round(Math.random() * 30));
      // a beaten man can still be wanted: the price on his head is paid out the moment he goes down
      claimMsg = claimBounty(p, t, 'a beating');
      systemMsg(targetId, `${p.name} jumped you in the street and lifted $${loot.toLocaleString()}. You are down to ${Math.round(t.life)} life. Hit the gym and pay it back.`);
      save(targetId, t);
    }
    resMsg = `You beat ${t.name} and took $${loot.toLocaleString()}.` + (claimMsg ? ' ' + claimMsg : '');
  } else {
    p.losses = (p.losses || 0) + 1;
    const dmg = Math.min(p.max_life - 1, Math.max(1, Math.round(p.max_life * (0.10 + Math.random() * 0.1))));
    p.life = Math.max(1, p.life - dmg);
    if (p.life <= 1) goHospital(p, 30 + Math.round(Math.random() * 40));
    if (!isBot) {
      // the defender won this one, so their record and name should show it
      t.wins = (t.wins || 0) + 1;
      t.reputation = (t.reputation || 0) + 20;
      gainXpAndMerits(t, 25 + Math.round(p.level * 2));
      derive(t);
      systemMsg(targetId, `${p.name} tried to jump you and came off worst. You win — ${t.wins} win${t.wins === 1 ? '' : 's'} on your record.`);
      save(targetId, t);
    }
    resMsg = `${t.name} handed you a beating and sent you packing.`;
  }
  derive(p);
  ach.push(...unlockLevels(p));
  logNews('fight', '\u2694\uFE0F', `${p.name} ${fight.win ? 'beat' : 'lost to'} ${t.name} in a street fight.`);
  save(accId, p);
  return {
    p: publicView(p),
    res: { win: fight.win, target: t.name, targetId, msg: resMsg, rounds: fight.rounds, pDmg: fight.pDmg, eDmg: fight.eDmg, isBot }
  };
}

// ================= ITEMS =================
function doBuy(accId, itemId, qty = 1) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  qty = Math.max(1, Math.min(999, parseInt(qty, 10) || 1));
  if (!it || typeof it.buy !== 'number') return { err: 'Not for sale.' };
  const cost = it.buy * qty;
  if (p.money < cost) return { err: 'Not enough cash.' };
  p.money -= cost;
  p.items[itemId] = (p.items[itemId] || 0) + qty;
  p.total_market_spend = (p.total_market_spend || 0) + cost;
  const ach = [];
  if ((p.total_market_spend || 0) >= 50000) ach.push(unlock(p, 'spender'));
  save(accId, p);
  return { p: publicView(p), res: { qty, itemId, cost } };
}

function doSell(accId, itemId, qty = 1) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it || typeof it.sell !== 'number') return { err: 'This item has no resale value.' };
  const owned = p.items[itemId] || 0;
  if (!owned) return { err: 'You do not own any of those.' };
  qty = Math.min(999, Math.max(1, parseInt(qty, 10) || 1), owned); // cap to what you hold
  p.items[itemId] -= qty;
  if (p.items[itemId] <= 0) delete p.items[itemId];
  let gain = it.sell * qty;
  if (factionUpgrades(p.faction).fence_network) gain = Math.round(gain * 1.08);   // better buyers on every corner
  p.money += gain;
  save(accId, p);
  return { p: publicView(p), res: { qty, itemId, gain } };
}

function doUse(accId, itemId) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'Unknown item.' };
  if (it.type === 'use') {
    if ((p.items[itemId] || 0) < 1) return { err: 'You do not own one of those.' };
    const e = it.effect || {};
    // ---- 2026 special consumables: consumed here, effects live in lib/systems.js
    if (e.scratch) return { err: 'Scratch these in the Arcade — the machine lives there.' };
    if (e.lottery) return { err: 'Register lottery tickets from the Arcade counter.' };
    if (e.mystery) return { err: 'Open mystery boxes from the Hustles board.' };
    if (e.cardpack) return { err: 'Crack trading packs from your Items page — the set tracker is there.' };
    if (e.insure) {
      p.sys = p.sys || {}; p.sys.insurance = p.sys.insurance || {};
      p.sys.insurance.until = Date.now() + 7 * 86400000;
      p.items[itemId]--; if (p.items[itemId] <= 0) delete p.items[itemId];
      save(accId, p);
      return { p: publicView(p), res: { itemId, used: true, name: it.name, text: 'Covered for a week: muggings can now take no more than 2% of your cash.' } };
    }
    if (e.respec) {
      p.sys = p.sys || {};
      p.sys.respecOpen = true;
      p.items[itemId]--; if (p.items[itemId] <= 0) delete p.items[itemId];
      save(accId, p);
      return { p: publicView(p), res: { itemId, used: true, name: it.name, text: 'Identity rewrite armed — open your Profile and redistribute your points.' } };
    }
    let used = false;
    if (e.energy) { p.energy = Math.min(p.max_energy, p.energy + e.energy); used = true; }
    if (e.happy) { p.happy = Math.min(p.max_happy || 100, (p.happy || 50) + e.happy); used = true; }
    if (e.nerve) { p.nerve = Math.min(p.max_nerve, p.nerve + e.nerve); used = true; }
    if (e.life) { p.life = Math.min(p.max_life, p.life + e.life); used = true; }
    p.items[itemId]--;
    if (p.items[itemId] <= 0) delete p.items[itemId];
    save(accId, p);
    return { p: publicView(p), res: { itemId, used: true, name: it.name } };
  }
  if (it.type === 'boost') {
    if ((p.items[itemId] || 0) < 1) return { err: 'You do not own one of those.' };
    const b = it.boost;
    p.boosters[b.stat] = { mult: b.mult, until: Date.now() + b.min * E.MINUTES };
    p.items[itemId]--;
    if (p.items[itemId] <= 0) delete p.items[itemId];
    save(accId, p);
    return { p: publicView(p), res: { itemId, used: true, name: it.name, boost: b } };
  }
  return { err: 'Nothing happens.' };
}

// ================= BAZAAR (the players' stall) =================
// Citizens list lots from their own inventory; buyers take the whole lot.
// The fence skims a fee off the seller's take (schooling lowers it).
const BAZAAR_BASE_FEE_PCT = 5;
const BAZAAR_MAX_LISTINGS = 8;
const BAZAAR_MAX_QTY = 500;
const BAZAAR_NEWS_MIN = 50000;
function bazaarFeePct(p) { return Math.max(0, BAZAAR_BASE_FEE_PCT + (courseGrant(p).marketFee || 0)); }
function bazaarView(accId) {
  const rows = db().prepare('SELECT * FROM listings ORDER BY ts DESC LIMIT 120').all();
  return {
    listings: rows.map(r => {
      const it = C.ITEMS[r.item_id] || {};
      return {
        id: r.id, itemId: r.item_id, name: it.name || r.item_id, icon: it.icon || '\uD83D\uDCE6',
        desc: it.desc || '', qty: r.qty, each: r.each,
        seller: r.anon ? 'A hooded figure' : r.seller_name, anon: !!r.anon, mine: accId != null && r.seller_acc === accId, ts: r.ts
      };
    })
  };
}
function listItem(accId, itemId, qty, each, anon) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'Nobody trades that down the cut.' };
  qty = parseInt(qty, 10);
  each = parseInt(each, 10);
  if (!(qty >= 1)) return { err: 'How many are you shifting?' };
  if (!(each >= 1) || each > 1000000000) return { err: 'Name your price — even a fence needs a number.' };
  qty = Math.min(qty, BAZAAR_MAX_QTY);
  if ((p.items[itemId] || 0) < qty) return { err: 'You do not have that many to shift.' };
  const listed = db().prepare('SELECT COUNT(*) c FROM listings WHERE seller_acc=?').get(accId).c;
  if (listed >= BAZAAR_MAX_LISTINGS) return { err: `The fence only watches ${BAZAAR_MAX_LISTINGS} lots per name. Sell something first.` };
  p.items[itemId] -= qty;
  if (p.items[itemId] <= 0) delete p.items[itemId];
  db().prepare('INSERT INTO listings (seller_acc, seller_name, item_id, qty, each, ts, anon) VALUES (?,?,?,?,?,?,?)')
    .run(accId, p.name, itemId, qty, each, Date.now(), anon ? 1 : 0);
  save(accId, p);
  return { ok: true, msg: `${qty}\u00D7 ${it.name} on your stall at $${each.toLocaleString()} each${anon ? ' — sold quiet' : ''}.`, p: publicView(p), res: { itemId, qty, each } };
}
function buyListing(accId, listingId) {
  const buyer = ready(load(accId));
  const row = db().prepare('SELECT * FROM listings WHERE id=?').get(listingId);
  if (!row) return { err: 'That lot is long gone.' };
  if (row.seller_acc === accId) return { err: 'Buying your own stall? The fence just laughs.' };
  const it = C.ITEMS[row.item_id] || {};
  const cost = row.qty * row.each;
  if (buyer.money < cost) return { err: 'Not enough cash for the whole lot.' };
  buyer.money -= cost;
  buyer.items[row.item_id] = (buyer.items[row.item_id] || 0) + row.qty;
  buyer.total_market_spend = (buyer.total_market_spend || 0) + cost;
  if (buyer.total_market_spend >= 50000) unlock(buyer, 'spender');
  // the seller gets paid even while they are asleep
  const sp = loadSafe(row.seller_acc);
  let fee = 0;
  if (sp) {
    fee = Math.round(cost * bazaarFeePct(sp) / 100);
    sp.money += cost - fee;
    sp.reputation = (sp.reputation || 0) + Math.max(1, Math.round(cost / 20000));
    sp.mstats = sp.mstats || {}; sp.mstats.sold = (sp.mstats.sold || 0) + 1;
    systemMsg(row.seller_acc, `Your stall shifted ${row.qty}\u00D7 ${it.name || row.item_id} for $${cost.toLocaleString()}. The fence skimmed $${fee.toLocaleString()} — $${(cost - fee).toLocaleString()} lands in your pocket.`);
    save(row.seller_acc, sp);
  }
  db().prepare('DELETE FROM listings WHERE id=?').run(row.id);
  if (cost >= BAZAAR_NEWS_MIN) logNews('market', '\uD83E\uDDFA', `${buyer.name} snapped up ${row.qty}\u00D7 ${it.name || row.item_id} at the bazaar for $${cost.toLocaleString()}.`);
  save(accId, buyer);
  return { p: publicView(buyer), res: { itemId: row.item_id, qty: row.qty, cost, fee } };
}
function cancelListing(accId, listingId) {
  const p = ready(load(accId));
  const row = db().prepare('SELECT * FROM listings WHERE id=?').get(listingId);
  if (!row || row.seller_acc !== accId) return { err: 'That is not your lot to take down.' };
  p.items[row.item_id] = (p.items[row.item_id] || 0) + row.qty;
  db().prepare('DELETE FROM listings WHERE id=?').run(row.id);
  save(accId, p);
  return { ok: true, msg: `Lot taken down — ${row.qty}\u00D7 ${(C.ITEMS[row.item_id] || {}).name || row.item_id} back in your bag.`, p: publicView(p), res: { itemId: row.item_id, qty: row.qty } };
}

// ================= AUCTION HOUSE =================
// Boulton's Auction Rooms, Snow Hill — gavel-and-estate-sale culture, unlike the quiet bazaar.
// Money for a bid is ESCROWED out of the bidder's hand the moment it lands; an outbid bidder
// is refunded in full and wired immediately. The hammer takes 8% of the final price.
const AUCTION_FEE_PCT = 8;
const AUCTION_MAX_ACTIVE = 4;
const AUCTION_MIN_BID = 100;
const AUCTION_HOURS = [1, 3, 6, 12, 24];
function auctionIncrement(bid) { return Math.max(50, Math.round(bid * 0.10)); }

function settleAuctions() {
  const rows = db().prepare('SELECT * FROM auctions WHERE settled=0 AND ends_at<=?').all(Date.now());
  for (const a of rows) {
    const it = C.ITEMS[a.item_id];
    const name = it ? it.name : a.item_id;
    if (a.bidder_acc) {
      const winner = loadSafe(a.bidder_acc);
      if (winner) {
        winner.items = winner.items || {}; winner.items[a.item_id] = (winner.items[a.item_id] || 0) + a.qty;
        unlock(winner, 'firstlot');
        save(a.bidder_acc, winner);
        systemMsg(a.bidder_acc, "The Wire Auction House: " + a.qty + 'x ' + name + ' came down on your bid of $' + a.cur_bid.toLocaleString() + '. The lot is in your bag, collector.');
      }
      const seller = loadSafe(a.seller_acc);
      if (seller) {
        const fee = Math.round(a.cur_bid * AUCTION_FEE_PCT / 100);
        seller.money = (seller.money || 0) + a.cur_bid - fee;
        save(a.seller_acc, seller);
        const rested = fee > 0 ? " after the house's 8%" : '';
        systemMsg(a.seller_acc, "The Wire Auction House: hammer down — your " + a.qty + 'x ' + name + ' sold for $' + a.cur_bid.toLocaleString() + rested + ' ($' + (a.cur_bid - fee).toLocaleString() + ' paid out).');
        if (a.cur_bid >= 100000) logNews('market', '🔨', "The Wire Auction House: " + a.qty + 'x ' + name + ' went under the hammer for $' + a.cur_bid.toLocaleString() + '.');
      }
    } else {
      const seller = loadSafe(a.seller_acc);
      if (seller) {
        seller.items = seller.items || {}; seller.items[a.item_id] = (seller.items[a.item_id] || 0) + a.qty;
        save(a.seller_acc, seller);
        systemMsg(a.seller_acc, "The Wire Auction House: no takers for your " + a.qty + 'x ' + name + ' — the lot walked home with the porter.');
      }
    }
    db().prepare('UPDATE auctions SET settled=1 WHERE id=?').run(a.id);
  }
}

function auctionView(accId) {
  settleAuctions();
  const rows = db().prepare('SELECT * FROM auctions WHERE settled=0 ORDER BY ends_at ASC LIMIT 60').all();
  const mine = db().prepare('SELECT COUNT(*) n FROM auctions WHERE seller_acc=? AND settled=0').get(accId).n;
  const now = Date.now();
  const me = accId ? loadSafe(accId) : null;
  const listings = rows.map(a => {
    const it = C.ITEMS[a.item_id] || { name: a.item_id, icon: '❓', desc: '' };
    const sellerP = loadSafe(a.seller_acc);
    const lidP = a.bidder_acc ? loadSafe(a.bidder_acc) : null;
    const nextMin = a.cur_bid ? a.cur_bid + auctionIncrement(a.cur_bid) : a.min_bid;
    return {
      id: a.id, itemId: a.item_id, name: it.name, icon: it.icon, desc: it.desc, qty: a.qty,
      min: a.min_bid, buyout: a.buyout || 0, bid: a.cur_bid || 0,
      nextMin,
      seller: sellerP ? sellerP.name : 'The Estate of a Stranger',
      leading: lidP ? lidP.name : null,
      remaining: Math.max(0, a.ends_at - now),
      mine: a.seller_acc === accId, imWinning: a.bidder_acc === accId,
      canBid: !!(me && me.money >= nextMin)
    };
  });
  return { listings, active: mine, maxActive: AUCTION_MAX_ACTIVE, feePct: AUCTION_FEE_PCT, hours: AUCTION_HOURS };
}

function auctionCreate(accId, itemId, qty, minBid, buyout, hours) {
  settleAuctions();
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'Nobody trades that down the cut.' };
  qty = parseInt(qty, 10); minBid = parseInt(minBid, 10); buyout = parseInt(buyout, 10) || 0;
  hours = parseInt(hours, 10);
  if (!(qty >= 1)) return { err: 'How much of it are you selling?' };
  if (!(minBid >= AUCTION_MIN_BID)) return { err: "The house will not open a book under $" + AUCTION_MIN_BID + '.' };
  if (buyout && buyout < Math.max(minBid, 500)) return { err: 'A buyout must clear the opening book — $500 or more.' };
  if (!AUCTION_HOURS.includes(hours)) return { err: 'Pick a session: one, three, six, twelve or twenty-four hours.' };
  const mine = db().prepare('SELECT COUNT(*) n FROM auctions WHERE seller_acc=? AND settled=0').get(accId).n;
  if (mine >= AUCTION_MAX_ACTIVE) return { err: 'The rooms will not hold more than four of your lots at once.' };
  if (((p.items || {})[itemId] || 0) < qty) return { err: 'You are not carrying that many.' };
  p.items[itemId] -= qty; if (p.items[itemId] <= 0) delete p.items[itemId];
  save(accId, p);
  const endsAt = Date.now() + hours * 3600000;
  const r = db().prepare('INSERT INTO auctions(seller_acc,item_id,qty,min_bid,buyout,ends_at,ts) VALUES (?,?,?,?,?,?,?)').run(accId, itemId, qty, minBid, buyout || null, endsAt, Date.now());
  return { ok: true, id: r.lastInsertRowid, p: publicView(p) };
}

function auctionBid(accId, auctionId, amount) {
  settleAuctions();
  const p = ready(load(accId));
  const a = db().prepare('SELECT * FROM auctions WHERE id=? AND settled=0').get(auctionId);
  if (!a) return { err: 'That lot is off the block.' };
  if (a.seller_acc === accId) return { err: 'Bidding up your own lot will get you barred from the rooms.' };
  amount = parseInt(amount, 10);
  const need = a.cur_bid ? a.cur_bid + auctionIncrement(a.cur_bid) : a.min_bid;
  if (!(amount >= need)) return { err: 'The book stands at $' + need.toLocaleString() + ' or better.' };
  if (p.money < amount) return { err: 'Your hand holds no such money.' };
  const it = C.ITEMS[a.item_id] || { name: a.item_id };
  const previous = a.bidder_acc;
  const prevAmt = a.cur_bid;
  p.money -= amount;
  if (a.buyout && amount >= a.buyout) unlock(p, 'buyout');
  save(accId, p);
  if (previous) {
    const oldP = loadSafe(previous);
    if (oldP) {
      oldP.money = (oldP.money || 0) + prevAmt;
      save(previous, oldP);
      systemMsg(previous, "The Wire Auction House: " + p.name + ' out-nodded you on the ' + a.qty + 'x ' + it.name + ' — your $' + prevAmt.toLocaleString() + ' walks back to your pocket.');
    }
  }
  db().prepare('UPDATE auctions SET cur_bid=?, bidder_acc=? WHERE id=?').run(amount, accId, a.id);
  const res = { amt: amount, lot: a.id };
  if (a.buyout && amount >= a.buyout) {
    db().prepare('UPDATE auctions SET ends_at=? WHERE id=?').run(Date.now() - 1, a.id);
    settleAuctions();
    res.bought = true;
  }
  return { ok: true, p: publicView(p), res };
}

function auctionCancel(accId, auctionId) {
  settleAuctions();
  const p = ready(load(accId));
  const a = db().prepare('SELECT * FROM auctions WHERE id=? AND settled=0').get(auctionId);
  if (!a) return { err: 'That lot is off the block.' };
  if (a.seller_acc !== accId) return { err: 'That is not your lot to pull.' };
  if (a.cur_bid) return { err: 'Money is already on the book — the house will finish the sale.' };
  p.items = p.items || {}; p.items[a.item_id] = (p.items[a.item_id] || 0) + a.qty;
  save(accId, p);
  db().prepare('UPDATE auctions SET settled=1 WHERE id=?').run(a.id);
  return { ok: true, p: publicView(p) };
}

// ================= THE EXCHANGE (stocks & crypto) =================
// Prices are seeded at the listed bases and walk a random-walk tick (5 min stocks,
// 10 min crypto) lazily on the first read or trade after each window. Deterministic
// per player: one world price per symbol per tick — the market is shared.
const STK = {
  stockTick: 300000,      // 5 minutes
  cryptoTick: 600000,     // 10 minutes
  genesis: 1789900000000, // prices seed the first time anyone reads the board
  feeStock: 0.01, feeCrypto: 0.005,
  histN: 48, maxJump: 2.5,
};
function symMeta(sym) { return C.STOCKS.find(s => s.sym === sym) || C.COINS.find(cc => cc.sym === sym) || null; }
function symTick(sym) { return C.STOCKS.some(s => s.sym === sym) ? STK.stockTick : STK.cryptoTick; }
function tickStocks() {
  const now = Date.now();
  for (const s of C.STOCKS.concat(C.COINS)) {
    const row = db().prepare('SELECT * FROM stock_prices WHERE sym=?').get(s.sym);
    if (!row) {
      const t0 = STK.genesis;
      db().prepare('INSERT INTO stock_prices (sym, price, tick, hist) VALUES (?,?,?,?)').run(s.sym, s.base, t0, JSON.stringify([round2(s.base)]));
      continue;
    }
    const per = symTick(s.sym);
    const due = Math.floor((now - row.tick) / per);
    if (due < 1) continue;
    let p = row.price;
    const hist = JSON.parse(row.hist || '[]');
    for (let k = 0; k < due; k++) {
      const shock = Math.random() < 0.03 ? (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 2) : 0;
      p = p * (1 + s.drift + s.vol * (Math.random() * 2 - 1) * 2 + shock * s.vol);
      p = Math.min(s.base * 20, Math.max(s.base * 0.1, p));
      hist.push(round2(p));
    }
    if (hist.length > STK.histN) hist.splice(0, hist.length - STK.histN);
    db().prepare('UPDATE stock_prices SET price=?, tick=?, hist=? WHERE sym=?').run(round2(p), row.tick + due * per, JSON.stringify(hist), s.sym);
  }
}
function round2(x) { return Math.round(x * 100) / 100; }
function round4(x) { return Math.round(x * 10000) / 10000; }

function stockView(accId) {
  tickStocks();
  const p = accId ? normalize(loadSafe(accId)) : null;
  const me = p ? (p.stocks || {}) : {};
  const rows = C.STOCKS.map(s => {
    const pr = db().prepare('SELECT price, hist FROM stock_prices WHERE sym=?').get(s.sym) || { price: s.base, hist: '[]' };
    const hist = JSON.parse(pr.hist || '[]');
    const ref = hist.length > 1 ? hist[0] : pr.price;
    return {
      sym: s.sym, name: s.name, icon: s.icon, desc: s.desc,
      price: pr.price, prev: ref, chg: round2(((pr.price - ref) / ref) * 10000) / 100,
      hist, held: me[s.sym] || 0, heldValue: round2((me[s.sym] || 0) * pr.price)
    };
  });
  const portValue = round2(rows.reduce((a, r) => a + r.heldValue, 0));
  return {
    stocks: rows, portValue,
    fee: STK.feeStock * (1 + (p ? (courseGrant(p).bankPct || 0) : 0) / 100 * -1), // quant coursework trims the broker a notch
    cash: p ? p.money : 0
  };
}
function stockFeePct(p) {
  // must match the fee shown in stockView: broker fee, trimmed by quant coursework, trimmed by the wire pass
  return 0.01 * (1 - ((p ? (courseGrant(p).bankPct || 0) : 0) / 100)) * E.subFeeMult(p);
}
function stockBuy(accId, sym, qty, pOverride) {
  tickStocks();
  const p = pOverride || ready(load(accId));
  const s = C.STOCKS.find(x => x.sym === sym);
  if (!s) return { err: 'That ticker does not trade here.' };
  qty = Math.floor(parseInt(qty, 10) || 0);
  if (qty < 1) return { err: 'Whole shares only — this board does not fragment.' };
  const pr = db().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym).price;
  const fee = stockFeePct(p);
  const cost = round2(qty * pr); const costFee = round2(cost * fee); const total = round2(cost + costFee);
  if (p.money < total) return { err: `That order needs $${total.toLocaleString()} on the ledger.` };
  p.money = round2(p.money - total);
  p.stocks = p.stocks || {}; p.stocks[sym] = (p.stocks[sym] || 0) + qty; p.mstats.stocks = (p.mstats.stocks || 0) + qty;
  p.total_trades = (p.total_trades || 0) + 1;
  unlock(p, 'firststock');
  if (p.total_trades >= 25) unlock(p, 'daytrader');
  if (cost >= 100000) unlock(p, 'whale');
  if (cost >= 250000) logNews('market', '📈', `${p.name} put $${cost.toLocaleString()} into ${sym} on the Exchange.`);
  save(accId, p);
  return { ok: true, p: publicView(p), res: { sym, qty, price: pr, fee: costFee } };
}
function stockSell(accId, sym, qty) {
  tickStocks();
  const p = ready(load(accId));
  const s = C.STOCKS.find(x => x.sym === sym);
  if (!s) return { err: 'That ticker does not trade here.' };
  qty = Math.floor(parseInt(qty, 10) || 0);
  if (qty < 1) return { err: 'Whole shares only.' };
  if ((p.stocks[sym] || 0) < qty) return { err: 'You do not hold that much paper.' };
  const pr = db().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym).price;
  const fee = stockFeePct(p);
  const gross = round2(qty * pr); const sellFee = round2(gross * fee);
  p.stocks[sym] -= qty; if (p.stocks[sym] <= 0) delete p.stocks[sym];
  p.money = round2(p.money + gross - sellFee);
  p.total_trades = (p.total_trades || 0) + 1;
  if (p.total_trades >= 25) unlock(p, 'daytrader');
  if (gross >= 250000) logNews('market', '📉', `${p.name} dumped $${gross.toLocaleString()} of ${sym} on the Exchange.`);
  save(accId, p);
  return { ok: true, p: publicView(p), res: { sym, qty, price: pr, fee: sellFee } };
}

function cryptoWalletTick(p) {
  // crypto_rig mines NGT steadily while owned; anchored to a frame so restarts never double-dip
  const rigs = (p.items && p.items.crypto_rig) || 0;
  if (!rigs) return p;
  const now = Date.now();
  if (!p._ref) p._ref = { life: now, energy: now, nerve: now };
  if (!p._ref.crypto) { p._ref.crypto = now; return p; }
  const hours = Math.min(24, (now - p._ref.crypto) / 3600000);
  if (hours < 0.05) return p;
  p._ref.crypto = now;
  const mined = round4(C.RIG_MINE_NGT_PER_HOUR * rigs * hours);
  p.crypto = p.crypto || {}; p.crypto.NGT = round4((p.crypto.NGT || 0) + mined);
  unlock(p, 'miner');
  return p;
}
function cryptoView(accId) {
  tickStocks();
  let p = accId ? normalize(loadSafe(accId)) : null;
  if (p) p = cryptoWalletTick(p);
  const me = p ? (p.crypto || {}) : {};
  const rows = C.COINS.map(s => {
    const pr = db().prepare('SELECT price, hist FROM stock_prices WHERE sym=?').get(s.sym) || { price: s.base, hist: '[]' };
    const hist = JSON.parse(pr.hist || '[]');
    const ref = hist.length > 1 ? hist[0] : pr.price;
    return {
      sym: s.sym, name: s.name, icon: s.icon, desc: s.desc,
      price: pr.price, chg: hist.length > 1 ? round2(((pr.price - ref) / ref) * 10000) / 100 : 0, hist,
      held: me[s.sym] || 0, heldValue: round4((me[s.sym] || 0) * pr.price)
    };
  });
  return { coins: rows, walletValue: round4(rows.reduce((a, r) => a + r.heldValue, 0)),
    rigs: p ? ((p.items && p.items.crypto_rig) || 0) : 0, mineRate: C.RIG_MINE_NGT_PER_HOUR,
    fee: STK.feeCrypto, cash: p ? p.money : 0,
    meta: { acceptUsd: true } };
}
function cryptoBuy(accId, sym, usdAmt) {
  tickStocks();
  const p = ready(load(accId));
  const s = C.COINS.find(x => x.sym === sym);
  if (!s) return { err: 'That chain does not settle here.' };
  usdAmt = round2(parseFloat(usdAmt) || 0);
  if (usdAmt < 1) return { err: 'Minimum order is a dollar.' };
  const pr = db().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym).price;
  const fee = round2(usdAmt * STK.feeCrypto * E.subFeeMult(p));
  if (p.money < usdAmt) return { err: `Your cash is ${'short'} — that order needs $${usdAmt.toLocaleString()}.` };
  const qty = round4((usdAmt - fee) / pr);
  if (qty <= 0) return { err: 'The fee would eat the whole order at that size.' };
  p.money = round2(p.money - usdAmt);
  p.crypto = p.crypto || {}; p.crypto[sym] = round4((p.crypto[sym] || 0) + qty);
  unlock(p, 'firstcoin');
  if (usdAmt >= 100000) logNews('market', '🪙', `${p.name} moved $${usdAmt.toLocaleString()} into ${sym}.`);
  save(accId, p);
  return { ok: true, p: publicView(p), res: { sym, usd: usdAmt, qty, price: pr, fee } };
}
function cryptoSell(accId, sym, qty) {
  tickStocks();
  const p = ready(load(accId));
  const s = C.COINS.find(x => x.sym === sym);
  if (!s) return { err: 'That chain does not settle here.' };
  qty = round4(parseFloat(qty) || 0);
  if (qty <= 0) return { err: 'Nothing to settle at that size.' };
  if (round4((p.crypto[sym] || 0) - qty) < 0) return { err: 'Your wallet does not hold that much.' };
  const pr = db().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym).price;
  const gross = round2(qty * pr); const fee = round2(gross * STK.feeCrypto * E.subFeeMult(p));
  p.crypto[sym] = round4((p.crypto[sym] || 0) - qty); if (p.crypto[sym] <= 0) delete p.crypto[sym];
  p.money = round2(p.money + gross - fee);
  if (gross >= 100000) logNews('market', '🪙', `${p.name} settled $${gross.toLocaleString()} of ${sym}.`);
  save(accId, p);
  return { ok: true, p: publicView(p), res: { sym, qty, usd: gross, price: pr, fee } };
}

// ================= BANK =================
function bankAccrue(p) {
  const now = Date.now();
  if (!p._ref) p._ref = {};
  const last = p._ref.bank || now;
  const hrs = (now - last) / (60 * 60000);
  if (hrs > 0.016) { // ~1 min granularity
    const interest = Math.floor(p.bank * 0.00014 * (1 + ((courseGrant(p).bankPct || 0) / 100)) * hrs); // ~4%/hour while banked, plus bookkeeping class"
    p.bank += interest;
    p._ref.bank = now;
  }
  return p;
}
function doDeposit(accId, amt) {
  const p = bankAccrue(ready(load(accId)));
  amt = Math.max(1, parseInt(amt, 10) || 0);
  if (amt > p.money) return { err: 'You do not have that much cash.' };
  p.money -= amt; p.bank += amt;
  p.total_deposits = (p.total_deposits || 0) + amt;
  const ach = [];
  if ((p.total_deposits || 0) >= 250000) ach.push(unlock(p, 'banker'));
  save(accId, p);
  return { p: publicView(p), res: { amt, to: 'bank' } };
}
function doWithdraw(accId, amt) {
  const p = bankAccrue(ready(load(accId)));
  amt = Math.max(1, parseInt(amt, 10) || 0);
  if (amt > p.bank) return { err: 'You do not have that much banked.' };
  p.bank -= amt; p.money += amt;
  save(accId, p);
  return { p: publicView(p), res: { amt, to: 'cash' } };
}

// ================= CASINO =================
// Six house games, all with real odds and real stakes, resolved server-side.
//   greyhound — the crash-dash dog race (instant multiplier)
//   pontoon   — period blackjack: deal, hit, stand, double, five-card trick
//   wheel     — single-zero roulette: even-money, dozens, columns, straight numbers
//   bandit    — three-reel one-armed bandit with a weighted paytable
//   crown     — Crown & Anchor dice: pick a sign, three dice roll
//   hilow     — High or Low: guess the next card
const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_SUITS = ['\u2660', '\u2665', '\u2666', '\u2663']; // spades hearts diamonds clubs
function newDeck() {
  const d = [];
  for (const s of CARD_SUITS) for (let i = 0; i < 13; i++) d.push({ r: CARD_RANKS[i], v: i + 2, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; }
  return d;
}
function handValue(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { if (c.r === 'A') { t += 11; aces++; } else t += Math.min(10, c.v); }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}
const BANDIT_SYMS = [
  { id: 'cherry', g: '\uD83C\uDF52', w: 30, three: 4 },
  { id: 'lemon', g: '\uD83C\uDF4B', w: 26, three: 6 },
  { id: 'bell', g: '\uD83D\uDD14', w: 20, three: 10 },
  { id: 'horseshoe', g: '\uD83E\uDDF2', w: 13, three: 15 },
  { id: 'crown', g: '\uD83D\uDC51', w: 8, three: 25 },
  { id: 'seven', g: '7\uFE0F\u20E3', w: 3, three: 60 }
];
const CROWN_SIGNS = [
  { id: 'crown', g: '\uD83D\uDC51', n: 'Crown' }, { id: 'anchor', g: '\u2693', n: 'Anchor' },
  { id: 'heart', g: '\u2665\uFE0F', n: 'Heart' }, { id: 'diamond', g: '\u2666\uFE0F', n: 'Diamond' },
  { id: 'club', g: '\u2663\uFE0F', n: 'Club' }, { id: 'spade', g: '\u2660\uFE0F', n: 'Spade' }
];
const ROULETTE_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function settleCasino(p, game, bet, ret, note) {
  // ret = total returned to the player, stake included. The stake was taken up-front.
  if (ret > 0) p.money += ret;
  const win = ret > bet, push = ret === bet;
  if (win) { p.reputation = (p.reputation || 0) + Math.max(1, Math.round((ret - bet) / 60)); unlock(p, 'casino'); }
  const verb = push ? 'pushed' : win ? 'won' : 'lost';
  const amt = push ? `$${bet.toLocaleString()} back` : win ? `$${(ret - bet).toLocaleString()}` : `$${bet.toLocaleString()}`;
  logNews('casino', '\uD83C\uDFB0', `${p.name} ${verb} ${amt} ${note}`);
  return { win, push, pay: ret };
}

// ---- pontoon (blackjack) ------------------------------------------------
function pontoonView(h, reveal) {
  return {
    player: h.player, dealer: reveal ? h.dealer : [h.dealer[0]],
    hidden: !reveal, pv: handValue(h.player),
    dv: reveal ? handValue(h.dealer) : handValue([h.dealer[0]]),
    bet: h.bet, doubled: !!h.doubled
  };
}
function pontoonSettle(p, h, res) {
  // the dealer plays out anything left, standing on all 17s
  while (handValue(h.dealer) < 17) h.dealer.push(h.deck.pop());
  const pv = handValue(h.player), dv = handValue(h.dealer);
  const natural = h.player.length === 2 && pv === 21;
  const dNatural = h.dealer.length === 2 && dv === 21;
  const trick = h.player.length >= 5 && pv <= 21;
  let outcome, ret;
  if (pv > 21) { outcome = 'bust'; ret = 0; }
  else if (natural && !dNatural) { outcome = 'pontoon'; ret = Math.round(h.bet * 2.5); }
  else if (dNatural) { outcome = 'house-pontoon'; ret = natural ? h.bet : 0; }
  else if (trick) { outcome = 'five-card-trick'; ret = h.bet * 3; }
  else if (dv > 21) { outcome = 'dealer-bust'; ret = h.bet * 2; }
  else if (pv > dv) { outcome = 'win'; ret = h.bet * 2; }
  else if (pv === dv) { outcome = 'push'; ret = h.bet; }
  else { outcome = 'lose'; ret = 0; }
  const s = settleCasino(p, 'pontoon', h.bet, ret, `at the blackjack table (${pv} against ${dv}).`);
  p.casino = null;
  Object.assign(res, {
    outcome, pv, dv, player: h.player, dealer: h.dealer, hidden: false,
    bet: h.bet, doubled: !!h.doubled, stage: 'settled',
    win: s.win, push: s.push, pay: s.pay
  });
}
function pontoonPlay(p, body) {
  const res = { game: 'pontoon', stage: 'done', bet: 0 };
  const h = p.casino && p.casino.game === 'pontoon' ? p.casino : null;
  const move = String(body.move || '');
  if (h && Date.now() - (h.opened || 0) > 86400000) { p.money += h.bet; p.casino = null; return { err: 'That hand went cold on the table — your stake was returned.' }; }
  if (move && !h) return { err: 'No cards on the table. Lay a bet first.' };
  if (h && parseInt(body.bet, 10)) return { err: 'Finish the hand in front of you first.' };
  if (!h) {
    const bet = Math.max(10, Math.min(1000000, parseInt(body.bet, 10) || 0));
    if (!bet) return { err: 'Lay a bet first (house minimum $10).' };
    if (p.money < bet) return { err: 'Not enough cash for that bet.' };
    p.money -= bet;
    const deck = newDeck();
    const hand = { game: 'pontoon', deck, bet, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()], opened: Date.now() };
    p.casino = hand;
    if (handValue(hand.player) === 21 || handValue(hand.dealer) === 21) {
      pontoonSettle(p, hand, res); // a natural settles on the deal
      return { res };
    }
    Object.assign(res, pontoonView(hand, false), { stage: 'hand', win: null, msg: 'Cards are out. Your call: hit, stand or double.' });
    return { res };
  }
  if (move === 'hit') {
    h.player.push(h.deck.pop());
    const pv = handValue(h.player);
    if (pv > 21 || pv === 21 || h.player.length === 5) pontoonSettle(p, h, res);
    else Object.assign(res, pontoonView(h, false), { stage: 'hand', win: null, msg: `${pv}. Again?` });
    return { res };
  }
  if (move === 'double') {
    if (h.player.length !== 2 || h.doubled) return { err: 'You can only double on your first two cards.' };
    if (p.money < h.bet) return { err: 'Not enough cash to double.' };
    p.money -= h.bet; h.bet *= 2; h.doubled = true;
    h.player.push(h.deck.pop());
    pontoonSettle(p, h, res); // one card and the dealer plays
    return { res };
  }
  if (move === 'stand') { pontoonSettle(p, h, res); return { res }; }
  if (move === 'peek') { Object.assign(res, pontoonView(h, false), { stage: 'hand', win: null, msg: `${handValue(h.player)}. Your call.` }); return { res }; }
  return { err: 'Hit, stand or double.' };
}

// ---- the instant games --------------------------------------------------
function playGreyhound(p, bet, res) {
  const win = Math.random() < 0.46;
  const crash = +( (1 + Math.random() * 1.8).toFixed(2) );
  const mult = win ? +( (1 + Math.pow(Math.random(), 1.7) * 2.8).toFixed(2) ) : 0;
  const ret = win ? Math.round(bet * mult) : 0;
  const s = settleCasino(p, 'greyhound', bet, ret, win ? 'on the crash line.' : 'riding the line.');
  Object.assign(res, { win: s.win, push: false, mult, crash, pay: s.pay });
}
function playWheel(p, bet, body) {
  const spot = String(body.spot || 'red');
  const n = Math.floor(Math.random() * 37);
  const color = n === 0 ? 'green' : (ROULETTE_RED.includes(n) ? 'red' : 'black');
  let hit = false, mult = 0;
  if (spot === 'red' || spot === 'black') { hit = color === spot; mult = 1; }
  else if (spot === 'odd' || spot === 'even') { hit = n !== 0 && (n % 2 === (spot === 'odd' ? 1 : 0)); mult = 1; }
  else if (spot === 'low' || spot === 'high') { hit = (spot === 'low' && n >= 1 && n <= 18) || (spot === 'high' && n >= 19 && n <= 36); mult = 1; }
  else if (/^dozen[123]$/.test(spot)) { const d = +spot.slice(5); hit = n >= (d - 1) * 12 + 1 && n <= d * 12; mult = 2; }
  else if (/^col[123]$/.test(spot)) { const c = +spot.slice(3); hit = n !== 0 && n % 3 === c % 3; mult = 2; }
  else if (/^n:(\d{1,2})$/.test(spot)) { const t = +spot.slice(2); if (t > 36) return { err: 'The wheel only runs 0 to 36.' }; hit = n === t; mult = 35; }
  else return { err: 'Back something first: a colour, a dozen, a column or a number.' };
  const ret = hit ? bet * (mult + 1) : 0;
  const s = settleCasino(p, 'wheel', bet, ret, `on the wheel — ${n} ${color}.`);
  return { res: { game: 'wheel', bet, stage: 'done', win: s.win, push: s.push, pay: s.pay, n, color, spot, mult: hit ? mult : 0 } };
}
function playBandit(p, bet) {
  const bag = [];
  for (const s of BANDIT_SYMS) for (let i = 0; i < s.w; i++) bag.push(s);
  const reels = [0, 0, 0].map(() => bag[Math.floor(Math.random() * bag.length)]);
  let mult = 0;
  if (reels[0].id === reels[1].id && reels[1].id === reels[2].id) mult = reels[0].three;
  else if (reels[0].id === reels[1].id || reels[1].id === reels[2].id || reels[0].id === reels[2].id) mult = 1; // a pair returns the stake
  const ret = mult ? Math.round(bet * mult) : 0;
  const s = settleCasino(p, 'bandit', bet, ret, 'on the slots.');
  return { res: { game: 'bandit', bet, stage: 'done', win: s.win, push: mult === 1, pay: s.pay, reels: reels.map(r => r.id), glyphs: reels.map(r => r.g), mult } };
}
function playCrown(p, bet, body) {
  const pick = String(body.pick || '');
  if (!CROWN_SIGNS.some(s => s.id === pick)) return { err: 'Back one of the six signs painted on the baize.' };
  const dice = [0, 0, 0].map(() => CROWN_SIGNS[Math.floor(Math.random() * 6)]);
  const matches = dice.filter(d => d.id === pick).length;
  const ret = matches ? bet * (matches + 1) : 0;
  const s = settleCasino(p, 'crown', bet, ret, matches ? `at the dice table — ${matches} ${matches === 1 ? 'sign' : 'signs'} landed.` : 'at the dice table.');
  return { res: { game: 'crown', bet, stage: 'done', win: s.win, push: false, pay: s.pay, dice: dice.map(d => d.id), glyphs: dice.map(d => d.g), pick, matches } };
}
function playHilow(p, bet, body) {
  const guess = String(body.guess || '');
  if (!['higher', 'lower'].includes(guess)) return { err: 'Call it: higher or lower.' };
  const deck = newDeck();
  const first = deck.pop(), second = deck.pop();
  const win = guess === 'higher' ? second.v > first.v : second.v < first.v; // tied ranks: the house takes it
  const ret = win ? bet * 2 : 0;
  const s = settleCasino(p, 'hilow', bet, ret, `at High-Low — ${first.r} then ${second.r}.`);
  return { res: { game: 'hilow', bet, stage: 'done', win: s.win, push: false, pay: s.pay, first, second, guess } };
}

function doCasino(accId, body) {
  body = body || {};
  const p = ready(load(accId));
  const game = String(body.game || 'greyhound');
  let out = null;
  if (game === 'pontoon') out = pontoonPlay(p, body);
  else {
    const bet = Math.max(10, Math.min(1000000, parseInt(body.bet, 10) || 0));
    if (!bet) return { err: 'Lay a bet first (house minimum $10).' };
    if (p.money < bet) return { err: 'Not enough cash for that bet.' };
    p.money -= bet;
    let r = null;
    if (game === 'greyhound') { r = { res: { game } }; playGreyhound(p, bet, r.res); r.res.bet = bet; r.res.stage = 'done'; }
    else if (game === 'wheel') r = playWheel(p, bet, body);
    else if (game === 'bandit') r = playBandit(p, bet);
    else if (game === 'crown') r = playCrown(p, bet, body);
    else if (game === 'hilow') r = playHilow(p, bet, body);
    else r = { err: 'The house does not run that game.' };
    if (r && r.err) p.money += bet; // a bad call never eats a stake
    out = r;
  }
  // A stale pontoon hand refunds the stake and clears the table in-memory before
  // returning its error — persist that refund or the money evaporates for good.
  if (!out || out.err) { save(accId, p); return { err: (out && out.err) || 'The table boss shakes his head.' }; }
  save(accId, p);
  return { p: publicView(p), res: out.res };
}

// ================= FACTION =================
function listFactions() {
  const out = [];
  for (const f of db().prepare('SELECT id FROM factions ORDER BY created_at DESC').all()) {
    const fx = factionLoad(f.id);
    if (!fx) continue;
    out.push({
      id: fx.f.id, name: fx.f.name, tag: fx.f.tag, desc: fx.d.desc || '',
      members: fx.d.memberIds.length, capacity: C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0),
      power: factionPower(fx.d), reputation: fx.d.reputation, owner: fx.d.ownerName || nameOfAcc(fx.d.ownerAcc),
      recruiting: fx.d.recruiting, applications: fx.d.applications.length,
      level: factionLevel(fx.d.reputation).level,
      wins: (fx.d.wars || {}).wins || 0, losses: (fx.d.wars || {}).losses || 0,
      bank: fx.d.bank || 0   // the chest is public now — raiders scout before they ride
    });
  }
  out.sort((a, b) => b.power - a.power);   // the leaderboard order: strongest flag first
  return { factions: out };
}
function createFaction(accId, name, tag, desc) {
  const p = ready(load(accId));
  if (p.faction) return { err: 'Leave your current faction first.' };
  if (p.money < 500000) return { err: 'Forming a faction costs $500,000.' };
  if (p.level < 5) return { err: 'You must be level 5 to found a faction.' };
  const clean = A.sanitize(name, 24);
  if (clean.length < 3) return { err: 'A crew name needs at least 3 characters.' };
  const tagc = (String(tag || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4)).toUpperCase();
  if (tagc.length < 2) return { err: 'Need a 2-4 letter tag.' };
  const dupe = db().prepare('SELECT 1 FROM factions WHERE LOWER(name)=LOWER(?) OR UPPER(tag)=?').get(clean, tagc);
  if (dupe) return { err: 'That crew name or tag is already flying in this city.' };
  p.money -= 500000;
  const data = {
    desc: A.sanitize(desc, 180), ownerAcc: accId, ownerName: p.name, memberIds: [accId], power: 100,
    bank: 0, upgrades: {}, officers: [], announce: null, recruiting: 'open', applications: [], ledger: [],
    roll: { day: null, streak: 0, memberIds: [] }, operations: 0, reputation: 0, createdAt: Date.now(),
    armory: {}, invites: [], contrib: {}, wars: { wins: 0, losses: 0, lastRaidAt: 0, shieldUntil: 0 }, recentOps: []
  };
  factionLog(data, 'founded', p.name + ' founded the crew.');
  const info = db().prepare('INSERT INTO factions (name, tag, json, created_at) VALUES (?,?,?,?)')
    .run(clean, tagc, JSON.stringify(data), Date.now());
  p.faction = info.lastInsertRowid;
  unlock(p, 'faction');
  save(accId, p);
  logNews('faction', '\uD83E\uDE92', `${p.name} founded faction "${clean}" [${tagc}].`);
  return { ok: true, p: publicView(p), res: { id: info.lastInsertRowid, text: 'Your flag is up. Set the recruitment desk and start building the chest.' } };
}
function joinFaction(accId, fid) {
  const p = ready(load(accId));
  if (p.faction) return { err: 'You already belong to a faction.' };
  const fx = factionLoad(Number(fid));
  if (!fx) return { err: 'Faction not found.' };
  // A personal invite beats the recruitment desk — even a closed door opens.
  const invIdx = (fx.d.invites || []).findIndex(i => Number(i.accId) === accId);
  const invited = invIdx >= 0;
  if (!invited && factionMembershipPending(accId)) return { err: 'You already have an application with another crew.' };
  if (fx.d.recruiting === 'closed' && !invited) return { err: 'That crew is not recruiting right now.' };
  if (fx.d.recruiting === 'apply' && !invited) return factionApply(accId, fid);
  const cap = C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0);
  if (fx.d.memberIds.length >= cap) return { err: 'The roster is full — no more beds until the crew buys stash houses.' };
  if (!fx.d.memberIds.includes(accId)) fx.d.memberIds.push(accId);
  if (invited) {
    fx.d.invites.splice(invIdx, 1);
    // they chose this flag — quietly withdraw any applications gathering dust elsewhere
    for (const f of db().prepare('SELECT id, json FROM factions WHERE id<>?').all(fx.f.id)) {
      try {
        const d = JSON.parse(f.json || '{}');
        const na = (d.applications || []).filter(a => Number(a.accId) !== accId);
        if (na.length !== (d.applications || []).length) {
          d.applications = na;
          db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id);
        }
      } catch (e) {}
    }
  }
  fx.d.power = factionPower(fx.d);
  factionLog(fx.d, invited ? 'invited' : 'joined', p.name + (invited ? ' accepted an invite to the crew.' : ' joined the crew.'));
  factionSave(fx.f.id, fx.d);
  p.faction = fx.f.id;
  unlock(p, 'faction');
  save(accId, p);
  logNews('faction', '\uD83E\uDE92', `${p.name} joined ${fx.f.name}.`);
  return { ok: true, p: publicView(p), res: { text: 'You are on the roster. Check in for Crew Roll, then find a crew operation.' } };
}
function factionApply(accId, fid) {
  const p = ready(load(accId));
  if (p.faction) return { err: 'You already belong to a faction.' };
  if (factionMembershipPending(accId)) return { err: 'You already have an application waiting with another crew.' };
  const fx = factionLoad(Number(fid));
  if (!fx) return { err: 'Faction not found.' };
  if (fx.d.recruiting === 'closed') return { err: 'That crew is not recruiting right now.' };
  if (fx.d.recruiting === 'open') return joinFaction(accId, fid);
  const cap = C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0);
  if (fx.d.memberIds.length >= cap) return { err: 'The roster is full right now.' };
  fx.d.applications.push({ accId, name: p.name, level: p.level, at: Date.now() });
  fx.d.applications = fx.d.applications.slice(-30);
  factionLog(fx.d, 'application', p.name + ' put their name forward.');
  factionSave(fx.f.id, fx.d);
  systemMsg(fx.d.ownerAcc, '🪓 ' + p.name + ' applied to ' + fx.f.name + '. Open the gang desk to review the roster.');
  return { ok: true, p: publicView(p), res: { pending: true, text: 'Your application is with ' + fx.f.name + '. Their officers will have the final word.' } };
}
function factionSetRecruiting(accId, mode) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (fx.d.ownerAcc !== accId) return { err: 'Only the boss sets the recruitment desk.' };
  if (!['open', 'apply', 'closed'].includes(mode)) return { err: 'That recruitment setting does not exist.' };
  fx.d.recruiting = mode;
  factionLog(fx.d, 'recruitment', p.name + ' set recruitment to ' + mode + '.');
  factionSave(fx.f.id, fx.d);
  return { ok: true, p: publicView(p), res: { recruiting: mode } };
}
function factionReviewApplication(accId, targetId, decision) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (factionRole(fx.d, accId) === 'member') return { err: 'Only officers and the boss review applications.' };
  targetId = Number(targetId);
  const idx = fx.d.applications.findIndex(a => Number(a.accId) === targetId);
  if (idx < 0) return { err: 'That application is no longer on the desk.' };
  const app = fx.d.applications[idx];
  fx.d.applications.splice(idx, 1);
  const target = loadSafe(targetId);
  if (decision !== 'accept') {
    factionLog(fx.d, 'application', p.name + ' declined ' + app.name + '\'s application.');
    factionSave(fx.f.id, fx.d);
    if (target) systemMsg(targetId, '🪓 ' + fx.f.name + ' declined your application. Keep your head up and try another flag.');
    return { ok: true, p: publicView(p), res: { decision: 'declined' } };
  }
  const cap = C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0);
  if (!target || target.faction) {
    factionSave(fx.f.id, fx.d);
    return { err: 'They already found a different crew. The stale application has been cleared.' };
  }
  if (fx.d.memberIds.length >= cap) {
    // keep the application visible when a full roster is the only problem.
    fx.d.applications.splice(idx, 0, app);
    factionSave(fx.f.id, fx.d);
    return { err: 'The roster filled up before you could sign them.' };
  }
  fx.d.memberIds.push(targetId);
  fx.d.power = factionPower(fx.d);
  factionLog(fx.d, 'recruited', p.name + ' signed ' + target.name + ' to the roster.');
  target.faction = fx.f.id;
  unlock(target, 'faction');
  factionSave(fx.f.id, fx.d); save(targetId, target);
  systemMsg(targetId, '🪓 ' + fx.f.name + ' accepted you. You are on the roster — check the crew desk for work.');
  logNews('faction', '\uD83E\uDE92', `${target.name} was signed to ${fx.f.name}.`);
  return { ok: true, p: publicView(p), res: { decision: 'accepted', name: target.name } };
}
function factionRoll(accId) {
  const now = Date.now();
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no Crew Roll.' };
  if (p.jail_until && p.jail_until > now) return { err: 'Check in when the cell door opens.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const day = todayKey(now);
  const previous = dayBeforeKey(day);
  const roll = fx.d.roll;
  if (roll.day !== day) {
    roll.streak = roll.day === previous ? (roll.streak || 0) + 1 : 1;
    roll.day = day; roll.memberIds = [];
  }
  if (roll.memberIds.includes(accId)) return { err: 'You already answered Crew Roll today.' };
  roll.memberIds.push(accId);
  const memberPay = 250 + (p.level || 1) * 18 + Math.min(9, Math.max(0, roll.streak - 1)) * 100;
  const chestPay = Math.round((350 + Math.min(9, Math.max(0, roll.streak - 1)) * 150) * (fx.d.upgrades.signal_room ? 1.5 : 1));
  p.money += memberPay; fx.d.bank += chestPay; fx.d.reputation += 4;
  factionContrib(fx.d, accId).rolls++;
  factionLog(fx.d, 'roll', p.name + ' answered Crew Roll — day ' + roll.streak + '.', chestPay);
  factionSave(fx.f.id, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { streak: roll.streak, memberPay, chestPay, text: 'Crew Roll pays you ' + '$' + memberPay.toLocaleString() + ' and sends $' + chestPay.toLocaleString() + ' to the war chest.' } };
}
function factionOperation(accId, opId) {
  const now = Date.now();
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew before you take crew work.' };
  if (p.jail_until && p.jail_until > now) return { err: 'The crew does not run operations from a cell.' };
  if (p.hosp_until && p.hosp_until > now) return { err: 'You need to be on your feet for crew work.' };
  const op = C.FACTION_OPERATIONS.find(x => x.id === opId);
  if (!op) return { err: 'That crew operation is not on the board.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const gangLvl = factionLevel(fx.d.reputation).level;
  if (op.minLvl && (p.level || 1) < op.minLvl) return { err: op.name + ' needs level ' + op.minLvl + ' — you are level ' + (p.level || 1) + '.' };
  if (op.minGang && gangLvl < op.minGang) return { err: op.name + ' needs a level ' + op.minGang + ' crew — yours is level ' + gangLvl + '.' };
  p.faction_ops = p.faction_ops || {};
  const readyAt = Number(p.faction_ops[op.id]) || 0;
  if (readyAt > now) return { err: op.name + ' is cooling off for another ' + Math.ceil((readyAt - now) / 60000) + ' min.' };
  if (p.energy < op.energy) return { err: op.name + ' needs ' + op.energy + ' energy.' };
  if (p.nerve < op.nerve) return { err: op.name + ' needs ' + op.nerve + ' nerve.' };
  p.energy -= op.energy; p.nerve -= op.nerve; p.faction_ops[op.id] = now + op.cooldown;
  const statEdge = Math.min(14, Math.floor(((p.stats.sp || 0) + (p.stats.dx || 0)) / 40));
  const crewEdge = Math.min(8, Math.max(0, fx.d.memberIds.length - 1) * 2);
  const lvlEdge = Math.min(9, Math.max(0, gangLvl - 1));   // seasoned crews work cleaner
  const chance = Math.min(96, op.chance + statEdge + crewEdge + lvlEdge + (fx.d.upgrades.lookouts ? 12 : 0) + tipOf(p, 'crew'));
  const success = Math.random() * 100 < chance;
  let cash = 0, chest = 0, rep = 0, chainBonus = false;
  if (success) {
    const mult = fx.d.upgrades.runner_net ? 1.15 : 1;
    cash = Math.round((op.cash[0] + Math.random() * (op.cash[1] - op.cash[0])) * mult);
    chest = Math.round(op.chest * mult);
    // CHAIN: three or more members closing work in 24h fattens every chest cut.
    fx.d.recentOps = (fx.d.recentOps || []).filter(o => o && now - Number(o.at) < 86400000);
    fx.d.recentOps.push({ accId, at: now });
    fx.d.recentOps = fx.d.recentOps.slice(-60);
    if (factionChainCount(fx.d, now) >= (C.FACTION_CHAIN_NEED || 3)) {
      chest = Math.round(chest * (1 + (C.FACTION_CHAIN_BONUS || 0.25)));
      chainBonus = true;
    }
    rep = op.rep;
    p.money += cash; fx.d.bank += chest; fx.d.reputation += rep; fx.d.operations += 1;
    factionContrib(fx.d, accId).ops++;
    E.gainXp(p, Math.max(4, Math.round(op.rep / 2)));
    factionLog(fx.d, 'operation', p.name + ' closed ' + op.name + ' clean' + (chainBonus ? ' — chain bonus lit.' : '.'), chest);
    if (chest >= 20000) logNews('faction', op.icon, `${p.name} closed ${op.name} for ${fx.f.name}; $${chest.toLocaleString()} landed in the war chest.`);
  } else {
    const hit = 4 + Math.floor(Math.random() * 9);
    p.life = Math.max(1, p.life - hit);
    factionLog(fx.d, 'operation', p.name + ' had to abort ' + op.name + '.', 0);
  }
  fx.d.power = factionPower(fx.d);
  factionSave(fx.f.id, fx.d); save(accId, p);
  const text = success
    ? op.name + ' lands: $' + cash.toLocaleString() + ' for you and $' + chest.toLocaleString() + ' for the war chest' + (chainBonus ? ' (chain bonus lit).' : '.')
    : op.name + ' went cold. You got away, but the crew got no cut.';
  return { ok: true, p: publicView(p), res: { operation: op.id, success, chance, cash, chest, rep, chain: chainBonus, gangLevel: gangLvl, text } };
}
function leaveFaction(accId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'You are not in a faction.' };
  const fx = factionLoad(p.faction);
  if (fx) {
    const d = fx.d;
    if (d.ownerAcc === accId) {
      if (d.memberIds.length <= 1) {
        db().prepare('DELETE FROM factions WHERE id=?').run(fx.f.id);
        logNews('faction', '🪓', p.name + ' folded ' + fx.f.name + '.');
      } else {
        const next = d.officers.find(id => id !== accId) || d.memberIds.find(id => id !== accId);
        d.ownerAcc = next; d.ownerName = nameOfAcc(next);
        d.memberIds = d.memberIds.filter(i => i !== accId);
        d.officers = d.officers.filter(i => i !== accId && i !== next);
        d.roll.memberIds = d.roll.memberIds.filter(i => i !== accId);
        d.power = factionPower(d);
        factionLog(d, 'leadership', p.name + ' walked; ' + d.ownerName + ' now holds the flag.');
        factionSave(fx.f.id, d);
        systemMsg(next, '👑 ' + p.name + ' left ' + fx.f.name + '. The flag is yours now.');
      }
    } else {
      d.memberIds = d.memberIds.filter(i => i !== accId);
      d.officers = d.officers.filter(i => i !== accId);
      d.roll.memberIds = d.roll.memberIds.filter(i => i !== accId);
      d.power = factionPower(d);
      factionLog(d, 'left', p.name + ' walked away from the crew.');
      factionSave(fx.f.id, d);
    }
  }
  p.faction = null;
  save(accId, p);
  return { ok: true, p: publicView(p), res: { text: 'You stepped away from the crew.' } };
}
function nameOfAcc(accId) { const r = row(accId); return r ? r.name : 'unknown'; }

// ================= JOBS =================
function applyJob(accId, jobId) {
  const p = ready(load(accId));
  const job = C.JOBS.find(j => j.id === jobId);
  if (!job) return { err: 'Unknown job.' };
  if (p.job) return { err: 'You already have a job. Quit it first.' };
  if (p.level < job.minLvl) return { err: `Requires level ${job.minLvl}.` };
  p.job = jobId;
  save(accId, p);
  return { p: publicView(p), res: { job: jobId } };
}
function quitJob(accId) {
  const p = ready(load(accId));
  if (!p.job) return { err: 'You are not employed.' };
  p.job = null;
  save(accId, p);
  return { p: publicView(p), res: {} };
}

// ================= MESSAGES =================
// system note dropped straight into a player's inbox (fight reports, house news)
function systemMsg(toAcc, body) {
  try {
    db().prepare('INSERT INTO messages (from_acc, from_name, to_acc, body, ts, read) VALUES (?,?,?,?,?,0)')
      .run(-1, 'City Desk', toAcc, String(body).slice(0, 400), Date.now());
  } catch (e) { /* a missing inbox must never break a fight */ }
}

function sendMsg(accId, toName, body) {
  const me = row(accId);
  const to = db().prepare('SELECT p.acc_id FROM players p JOIN accounts a ON a.id=p.acc_id WHERE LOWER(p.name)=? LIMIT 1').get(String(toName).toLowerCase());
  if (!to || to.acc_id === accId) return { err: 'No player with that name.' };
  const clean = String(body || '').replace(/[<>&]/g, '').slice(0, 400);
  if (!clean.trim()) return { err: 'Empty message.' };
  db().prepare('INSERT INTO messages (from_acc, from_name, to_acc, body, ts, read) VALUES (?,?,?,?,?,0)')
    .run(accId, me.name, to.acc_id, clean, Date.now());
  return { ok: true };
}
function myMessages(accId) {
  const rows = db().prepare('SELECT * FROM messages WHERE to_acc=? ORDER BY ts DESC LIMIT 60').all(accId);
  db().prepare('UPDATE messages SET read=1 WHERE to_acc=?').run(accId);
  return rows.map(r => ({ id: r.id, from: r.from_name, body: r.body, ts: r.ts }));
}
function sentMessages(accId) {
  const rows = db().prepare('SELECT m.* FROM messages m WHERE m.from_acc=? ORDER BY m.ts DESC LIMIT 60').all(accId);
  const nameOf = new Map();
  const ids = rows.map(r => r.to_acc);
  for (const id of ids) nameOf.set(id, (() => { const r = row(id); return r ? r.name : 'unknown'; })());
  return rows.map(r => ({ id: r.id, to: nameOf.get(r.to_acc), body: r.body, ts: r.ts }));
}

// ================= NEWS =================
function recentNews(limit = 25) {
  return db().prepare('SELECT * FROM news ORDER BY id DESC LIMIT ?').all(limit);
}

// ================= VIEW =================
function publicView(p) {
  p = ready(p);
  return {
    acc: 'self', name: p.name, avatar: p.avatar, bio: p.bio, origin: p.origin,
    unread: unreadCount(p._acc),
    stats: p.stats, total: p.total, level: p.level, xpInto: p.xpInto, xpNeed: p.xpNeed,
    life: Math.max(0, Math.round(p.life)), max_life: p.max_life,
    energy: Math.round(p.energy), max_energy: p.max_energy,
    nerve: Math.round(p.nerve), max_nerve: p.max_nerve,
    happy: Math.round(p.happy || 50), max_happy: p.max_happy,
    money: p.money, bank: p.bank, vault: p.vault || 0,
    property: p.property, aproperty: propView(p),
    courses_done: Object.keys(p.courses || {}),
    course: p.course ? { id: p.course, ends: p.course_ends, name: (C.COURSES.find(x => x.id === p.course) || {}).name } : null,
    merits: p.merits || 0, perks: p.perks || {}, bonuses: p.bonuses || {},
    job: p.job,
    items: p.items,
    stocks: p.stocks || {}, crypto: p.crypto || {}, equip: p.equip || { weapon: null, armour: null },
    sub: { active: E.subOn(p), founder: !!p.sub_founder, until: p.sub_until || 0 },
    loan: p.loan || null,
    reftick: { energyIn: p._ref ? Math.max(0, (p._ref.energy + E.PERIODS.energy) - Date.now()) : 0, energyPeriod: E.PERIODS.energy,
               nerveIn: p._ref ? Math.max(0, (p._ref.nerve + E.PERIODS.nerve) - Date.now()) : 0, nervePeriod: E.PERIODS.nerve },
    mstats: p.mstats || {}, missions: p.missions || {},
    prison: p.prison ? { cigs: p.prison.cigs || 0, shifts: p.prison.shifts || 0, busts: p.prison.busts || 0,
      shift_in: Math.max(0, (p.prison.shift_at || 0) - Date.now()), gym_in: Math.max(0, (p.prison.gym_at || 0) - Date.now()),
      gamble_in: Math.max(0, (p.prison.gamble_at || 0) - Date.now()), bust_in: Math.max(0, (p.prison.bust_at || 0) - Date.now()) } : null,
    daily: dailyStatus(p),
    spin: (() => { const now2 = Date.now(); const spun = !!(p.spin && p.spin.day === todayKey(now2));
      const nextStreak = spun ? (p.spin.streak || 1) : ((p.spin && p.spin.day === todayKey(now2 - 86400000)) ? (p.spin.streak || 0) + 1 : 1);
      const mult = wheelMult(nextStreak);
      return { spun, streak: (p.spin && p.spin.streak) || 0, nextStreak, mult: Math.round(mult * 100) / 100,
        segs: WHEEL_SEGS.map(s => wheelLabel(s, mult)) }; })(),
    heists: (() => { const o = {}; for (const k of Object.keys(p.heists || {})) { const h = p.heists[k]; o[k] = { stage: h.stage || 0, cool: h.cool || 0 }; } return o; })(),
    boosters: Object.fromEntries(Object.keys(p.boosters || {}).map(k => [k, p.boosters[k]])),
    jail_until: p.jail_until, hosp_until: p.hosp_until,
    pontoon: (p.casino && p.casino.game === 'pontoon' && p.casino.player && p.casino.dealer)
      ? { player: p.casino.player, dealer: [p.casino.dealer[0]], hidden: true, pv: handValue(p.casino.player), bet: p.casino.bet, doubled: !!p.casino.doubled }
      : null,
    total_crimes: p.total_crimes, total_success: p.total_success, total_fail: p.total_fail,
    wins: p.wins || 0, losses: p.losses || 0,
    reputation: Math.round(p.reputation || 0),
    spree: p.spree || 0,
    achievements: p.achievements,
    faction: p.faction,
    total_deposits: p.total_deposits, total_market_spend: p.total_market_spend, total_shift: p.total_shift,
    seen_tutorial: !!p.seen_tutorial,
    // 2026 systems surface
    followers: p.sys ? (p.sys.followers || 0) : 0,
    respecOpen: !!(p.sys && p.sys.respecOpen),
    insuredUntil: p.sys && p.sys.insurance ? (p.sys.insurance.until || 0) : 0,
    now: Date.now()
  };
}

// leaderboards
function leaderboard(kind) {
  const rows = db().prepare('SELECT acc_id, name, avatar, json FROM players').all();
  const items = rows.map(r => { let q; try { q = JSON.parse(r.json); } catch { return null; } q = derive(q); const isBot = r.acc_id < 0; return { id: r.acc_id, name: r.name, avatar: r.avatar, isBot, ...q }; }).filter(Boolean);
  const sorters = {
    rep: (a, b) => b.reputation - a.reputation,
    level: (a, b) => (b.level - a.level) || (b.xp - a.xp),
    crime: (a, b) => b.total_crimes - a.total_crimes,
    fight: (a, b) => b.wins - a.wins,
    wealth: (a, b) => (b.money + b.bank) - (a.money + a.bank),
  };
  const top = items.sort(sorters[kind] || sorters.rep).slice(0, 50);
  return top.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name, avatar: t.avatar, isBot: t.isBot,
    level: t.level, rep: t.reputation, crimes: t.total_crimes, wins: t.wins, wealth: t.money + t.bank }));
}

function myRank(kind, accId) {
  const lb = leaderboard(kind);
  const idx = lb.findIndex(x => x.id === accId);
  return idx >= 0 ? { rank: idx + 1, of: lb.length } : null;
}

// ================= PROPERTY =================
function propView(p) {
  const prop = propOf(p);
  const own = C.PROPERTIES.indexOf(prop);
  return {
    id: prop.id, name: prop.name, icon: prop.icon, desc: prop.desc,
    happy: prop.happy, upkeep: prop.upkeep, vault: prop.vault + (p.property_up || []).reduce((n, id) => {
      const up = (prop.upgrades || []).find(u => u.id === id); return n + ((up && up.vault) || 0);
    }, 0),
    upgrades: (prop.upgrades || []).map(u => ({ ...u, owned: (p.property_up || []).includes(u.id) })),
    value: Math.round(prop.price * 0.75 + (p.property_up || []).reduce((n, id) => {
      const up = (prop.upgrades || []).find(u => u.id === id); return n + ((up && up.cost) || 0) * 0.5;
    }, 0)),
    tier: own, maxHappy: happyMax(p)
  };
}
function buyProperty(accId, id) {
  const p = normalize(load(accId));
  const prop = C.PROPERTIES.find(x => x.id === id);
  if (!prop) return { err: 'No such property.' };
  if (prop.price <= 0) return { err: 'You already live there.' };
  const price = Math.round(prop.price * (1 - propDiscountPct(p) / 100));
  if (p.money < price) return { err: `This one is $${price.toLocaleString()} — you are short.` };
  p.money -= price;
  p.property = prop.id; p.property_up = [];
  p.happy = Math.min(happyMax(p), (p.happy || 0) + 10);
  derive(p); save(accId, p);
  logNews('property', prop.icon, `${p.name} bought ${prop.name}.`);
  return { ok: true, msg: `You bought ${prop.name} for $${price.toLocaleString()}.${propDiscountPct(p) ? ' (lawyered fee applied)' : ''}`, p: publicView(p) };
}
function upgradeProperty(accId, upId) {
  const p = normalize(load(accId));
  const prop = propOf(p);
  const up = (prop.upgrades || []).find(u => u.id === upId);
  if (!up) return { err: 'No such upgrade.' };
  if ((p.property_up || []).includes(up.id)) return { err: 'You already have that.' };
  const cost = Math.round(up.cost * (1 - propDiscountPct(p) / 100));
  if (p.money < cost) return { err: `That costs $${cost.toLocaleString()}.` };
  p.money -= cost; p.property_up.push(up.id);
  derive(p); save(accId, p);
  return { ok: true, msg: `${up.name} fitted.${up.happy ? ` Maximum happiness is now ${p.max_happy}.` : ''}`, p: publicView(p) };
}
function sellProperty(accId) {
  const p = normalize(load(accId));
  const prop = propOf(p);
  if (!prop.price) return { err: 'Nobody wants to buy a back-to-back off you.' };
  const v = propView(p).value;
  const cash = Math.max(p.vault, 0);
  p.money += v + cash; p.vault = 0;
  p.property = 'shack'; p.property_up = [];
  derive(p); p.happy = Math.min(p.happy, p.max_happy); save(accId, p);
  logNews('property', '🏚️', `${p.name} sold up on ${prop.name} for $${(v + cash).toLocaleString()}.`);
  return { ok: true, msg: `Sold. $${v.toLocaleString()} for the house, $${cash.toLocaleString()} out of the safe.`, p: publicView(p) };
}
function moveVault(accId, amountRaw, dir) {
  const p = normalize(load(accId));
  const v = propView(p).vault;
  if (!v) return { err: 'This house has nowhere to hide money. Buy a safe, or a better house.' };
  const amount = Math.max(0, Math.floor(Number(amountRaw) || 0));
  if (dir === 'in') {
    if (p.money < amount) return { err: 'You do not have that much on you.' };
    p.money -= amount; p.vault += amount;
  } else {
    if (p.vault < amount) return { err: 'Not that much in the safe.' };
    p.vault -= amount; p.money += amount;
  }
  derive(p); save(accId, p);
  return { ok: true, msg: `$${amount.toLocaleString()} ${dir === 'in' ? 'into' : 'out of'} the safe.`, p: publicView(p) };
}

// ================= EDUCATION =================
function eduView(p) {
  return {
    courses: C.COURSES.map(c => {
      const done = !!(p.courses && p.courses[c.id]);
      const locked = !!(c.req && ((c.req.course && !(p.courses || {})[c.req.course]) || (c.req.level && p.level < c.req.level)));
      return { ...c, done, locked, reqText: c.req ? `${c.req.level ? `level ${c.req.level}` : ''}${c.req.course ? `${c.req.level ? ' + ' : ''}${(C.COURSES.find(x => x.id === c.req.course) || {}).name}` : ''}` : null };
    }),
    current: p.course ? { id: p.course, ends: p.course_ends, name: (C.COURSES.find(x => x.id === p.course) || {}).name } : null,
    done: Object.keys(p.courses || {}).length
  };
}
function startCourse(accId, id) {
  const p = normalize(load(accId));
  const c = C.COURSES.find(x => x.id === id);
  if (!c) return { err: 'No such course.' };
  if (p.course) return { err: 'You are already enrolled. One course at a time.' };
  if ((p.courses || {})[c.id]) return { err: 'You have already passed this one.' };
  if (c.req && c.req.course && !(p.courses || {})[c.req.course]) return { err: `You need ${(C.COURSES.find(x => x.id === c.req.course) || {}).name} first.` };
  if (c.req && c.req.level && p.level < c.req.level) return { err: `You need to be level ${c.req.level}.` };
  if (p.jail_until > Date.now() || p.hosp_until > Date.now()) return { err: 'Not while you are banged up.' };
  if (p.money < c.cost) return { err: `Fees are $${c.cost.toLocaleString()}.` };
  p.money -= c.cost;
  p.course = c.id; p.course_ends = Date.now() + c.minutes * 60 * 1000;
  derive(p); save(accId, p);
  return { ok: true, msg: `Enrolled on ${c.name} — ${c.minutes} minutes.`, p: publicView(p), edu: eduView(p) };
}
function abortCourse(accId) {
  const p = normalize(load(accId));
  if (!p.course) return { err: 'You are not enrolled on anything.' };
  const c = C.COURSES.find(x => x.id === p.course);
  p.course = null; p.course_ends = null;
  save(accId, p);
  return { ok: true, msg: `You walked out of ${c.name}. The fees are gone.`, p: publicView(p), edu: eduView(p) };
}

// ================= MERITS =================
function meritView(p) {
  return { points: p.merits || 0, earned: p.merits_earned || 0,
    perks: C.MERIT_PERKS.map(k => ({ ...k, taken: perkCount(p, k.id) })) };
}
function buyMerit(accId, perkId) {
  const p = normalize(load(accId));
  if ((p.merits || 0) < 1) return { err: 'No merit points. You earn one for every level.' };
  const k = C.MERIT_PERKS.find(x => x.id === perkId);
  if (!k) return { err: 'No such perk.' };
  if (perkCount(p, k.id) >= k.max) return { err: `${k.name} is maxed out (${k.max}).` };
  p.perks[k.id] = perkCount(p, k.id) + 1;
  p.merits = p.merits - 1;
  const before = { life: p.max_life, energy: p.max_energy, nerve: p.max_nerve };
  derive(p);
  p.life = Math.min(p.max_life, p.life + Math.max(0, p.max_life - before.life));
  p.energy = Math.min(p.max_energy, p.energy + Math.max(0, p.max_energy - before.energy));
  p.nerve = Math.min(p.max_nerve, p.nerve + Math.max(0, p.max_nerve - before.nerve));
  save(accId, p);
  return { ok: true, msg: `${k.name} — ${k.desc} (now ${perkCount(p, k.id)}/${k.max}).`, p: publicView(p), merits: meritView(p) };
}

// ================= BOUNTIES =================
function placeBounty(accId, targetId, amountRaw, anon) {
  const p = normalize(load(accId));
  const amount = Math.floor(Number(amountRaw) || 0);
  if (amount < 500) return { err: 'The minimum price on a head is $500.' };
  if (p.money < amount) return { err: 'You cannot back a bounty with money you do not have.' };
  const t = loadSafe(targetId);
  if (!t) return { err: 'No such citizen.' };
  p.money -= amount; save(accId, p);
  db().prepare(`INSERT INTO bounties (target_acc,target_name,amount,from_acc,from_name,anon,ts) VALUES (?,?,?,?,?,?,?)`)
    .run(targetId, t.name, amount, accIdOf(p), p.name, anon ? 1 : 0, Date.now());
  const total = bountyTotal(targetId);
  logNews('bounty', '🎯', `New money on ${t.name}'s head — the pot now stands at $${total.toLocaleString()}.`);
  if (targetId !== accIdOf(p)) {
    systemMsg(targetId, `${anon ? 'Someone' : p.name} put $${amount.toLocaleString()} on your head. The pot is now $${total.toLocaleString()}. Sleep lightly.`);
  }
  return { ok: true, msg: `$${amount.toLocaleString()} placed on ${t.name}. Pot: $${total.toLocaleString()}`, p: publicView(p), bounties: bountyList(p) };
}
function bountyTotal(targetId) {
  const r = db().prepare('SELECT COALESCE(SUM(amount),0) s FROM bounties WHERE target_acc=? AND claimed_at IS NULL').get(targetId);
  return r.s || 0;
}
function bountyList(p) {
  const mine = p ? accIdOf(p) : null;
  const rows = db().prepare(`SELECT target_acc,target_name,amount,from_name,anon,ts FROM bounties WHERE claimed_at IS NULL ORDER BY amount DESC`).all();
  const byTarget = {};
  for (const r of rows) {
    if (!byTarget[r.target_acc]) byTarget[r.target_acc] = { id: r.target_acc, name: r.target_name, total: 0, entries: [] };
    byTarget[r.target_acc].total += r.amount;
    byTarget[r.target_acc].entries.push({ amount: r.amount, from: r.anon ? 'Anonymous' : r.from_name, ts: r.ts });
  }
  const list = Object.values(byTarget).sort((a, b) => b.total - a.total);
  // work out whom you are actually able to collect from right now
  for (const b of list) {
    const t = loadSafe(b.id);
    b.mine = b.id === mine;
    b.collectable = !!t && !t.isBot && !(t.hosp_until > Date.now()) ? true : !!t && !t.isBot;
    b.status = !t ? 'gone' : (t.hosp_until > Date.now() ? 'hospital' : (t.jail_until > Date.now() ? 'jail' : 'free'));
  }
  return { list, total: list.reduce((n, b) => n + b.total, 0) };
}
// call this when a wanted citizen is beaten into hospital
function claimBounty(p, target, how) {
  const tid = accIdOf(target);
  if (tid == null) return null;
  let t = (target && target.name) ? target : loadSafe(tid);
  if (!t) return null;
  let inHosp = !!(t.hosp_until && t.hosp_until > Date.now());
  if (!inHosp) {                    // caller may hold a stale copy: check the ledger
    const fresh = loadSafe(tid);
    if (fresh && fresh.hosp_until && fresh.hosp_until > Date.now()) { t = fresh; inHosp = true; }
  }
  if (!inHosp) return null;         // the pot is only paid once they are in hospital
  const pot = bountyTotal(tid);
  if (pot <= 0) return null;
  db().prepare('UPDATE bounties SET claimed_by=?, claimed_by_name=?, claimed_at=? WHERE target_acc=? AND claimed_at IS NULL')
    .run(accIdOf(p), p.name, Date.now(), tid);
  const fee = Math.round(pot * 0.05);
  p.money += pot - fee;
  systemMsg(tid, `${p.name} collected the $${pot.toLocaleString()} on your head${how ? ` with a ${how}` : ''}.`);
  logNews('bounty', '☠️', `${p.name} collected the $${pot.toLocaleString()} bounty on ${t.name}.`);
  return `You also collected the $${pot.toLocaleString()} bounty on ${t.name} (after a $${fee.toLocaleString()} fee).`;
}


// ================= CHAT =================
// Two live channels: the whole city ('city') and the gang's own wire ('gang').
function chatPost(accId, chan, body) {
  const p = ready(load(accId));
  chan = chan === 'gang' ? 'gang' : 'city';
  body = String(body || '').replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, 280);
  if (!body) return { err: 'Say something or do not hold the mic.' };
  if (chan === 'gang' && !p.faction) return { err: 'No crew, no crew channel.' };
  const room = chan === 'gang' ? 'gang:' + p.faction : 'city';
  const now = Date.now();
  if (now - (p.chat_last || 0) < 1500) return { err: 'Easy — one breath between broadcasts.' };
  p.chat_last = now; save(accId, p);
  db().prepare('INSERT INTO chat (chan, acc, name, avatar, body, ts) VALUES (?,?,?,?,?,?)')
    .run(room, accId, p.name, p.avatar || '0|0|0|0|0', body, now);
  db().prepare('DELETE FROM chat WHERE chan=? AND id NOT IN (SELECT id FROM chat WHERE chan=? ORDER BY id DESC LIMIT 200)').run(room, room);
  return { ok: true };
}
function chatFeed(accId, chan, since) {
  const p = loadSafe(accId); if (!p) return { items: [] };
  chan = chan === 'gang' ? 'gang' : 'city';
  const room = chan === 'gang' ? (p.faction ? 'gang:' + p.faction : 'gang:0') : 'city';
  since = parseInt(since, 10) || 0;
  const rows = db().prepare('SELECT id, acc, name, avatar, body, ts FROM chat WHERE chan=? AND id>? ORDER BY id DESC LIMIT 60').all(room, since);
  return { items: rows.reverse(), chan, faction: !!p.faction };
}

// ================= PAWN SHOP =================
// instant money, worse rate than the fence — the price of not waiting
const PAWN_PCT = 0.85;
function pawnQuote(itemId) { const it = C.ITEMS[itemId]; if (!it || !it.sell) return 0; return Math.max(1, Math.floor(it.sell * PAWN_PCT)); }
function pawnQuoteFor(p, itemId) { const q = pawnQuote(itemId); const f = tipOf(p, 'fence'); return f ? Math.max(1, Math.round(q * (1 + f / 100))) : q; }
function pawnSell(accId, itemId, qty) {
  const p = ready(load(accId));
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'The broker does not deal in that.' };
  const owned = p.items[itemId] || 0;
  qty = Math.max(1, Math.min(parseInt(qty, 10) || 1, owned || 1)); // 999 from the window means "the lot"
  if (owned < qty) return { err: 'You are short of that to pawn.' };
  if (!it.sell) return { err: 'That is not worth money to anybody.' };
  const each = pawnQuoteFor(p, itemId);
  let take = each * qty;
  if (factionUpgrades(p.faction).fence_network) take = Math.round(take * 1.08);   // the crew's buyers pay up
  p.items[itemId] -= qty; if (p.items[itemId] <= 0) delete p.items[itemId];
  p.money += take;
  save(accId, p);
  return { p: publicView(p), res: { itemId, qty, take, name: it.name } };
}

// ================= LOAN SHARK =================
// fast paper, ugly vig. miss the window and the collector walks into your vault.
const LOAN = { pct: 0.25, hours: 48, perLevel: 10000 };
function loanView(p) {
  const max = Math.max(10000, p.level * LOAN.perLevel);
  return { max, pct: LOAN.pct, hours: LOAN.hours, loan: p.loan || null, overdue: !!(p.loan && Date.now() > p.loan.due) };
}
function loanTake(accId, amount) {
  const p = ready(load(accId));
  amount = Math.floor(parseInt(amount, 10) || 0);
  const v = loanView(p);
  if (p.loan) return { err: 'You already owe the shark. Clear that first.' };
  if (amount < 1000) return { err: 'The shark does not count small change. $1,000 minimum.' };
  if (amount > v.max) return { err: `At your level the shark fronts at most $${v.max.toLocaleString()}.` };
  const owed = Math.round(amount * (1 + LOAN.pct));
  p.loan = { principal: amount, owed, due: Date.now() + LOAN.hours * 3600000 };
  p.money += amount;
  save(accId, p);
  systemMsg(accId, `The shark counts out $${amount.toLocaleString()} into your hand. $${owed.toLocaleString()} comes back inside ${LOAN.hours} hours — or the collector visits.`);
  return { p: publicView(p), res: { amount, owed, due: p.loan.due } };
}
function loanRepay(accId, amount) {
  const p = ready(load(accId));
  if (!p.loan) return { err: 'You owe nobody. Keep it that way.' };
  amount = Math.floor(parseInt(amount, 10) || 0);
  if (amount < 1) return { err: 'Pure air will not buy the shark off.' };
  const pay = Math.min(amount, p.money, p.loan.owed);
  if (pay < 1) return { err: 'Your pockets are empty.' };
  p.money -= pay; p.loan.owed -= pay;
  const cleared = p.loan.owed <= 0;
  if (cleared) { systemMsg(accId, 'The shark nods once. The debt is dead — this time.'); p.loan = null; }
  save(accId, p);
  return { p: publicView(p), res: { paid: pay, cleared } };
}
// the collector: runs on ready(); late money gets taken from cash, then the vault
function loanCollector(p) {
  if (!p.loan || Date.now() <= p.loan.due) return p;
  let grab = Math.min(p.money, p.loan.owed);
  if (grab > 0) { p.money -= grab; p.loan.owed -= grab; }
  if (p.loan.owed > 0 && p.vault > 0) { grab = Math.min(p.vault, p.loan.owed); p.vault -= grab; p.loan.owed -= grab; }
  if (p.loan.owed <= 0 && p._acc != null) { try { systemMsg(p._acc, 'The collector came for what was owed. Account settled — without asking.'); } catch (e) {} p.loan = null; }
  else if (p._acc != null && p.money === 0 && (p.vault || 0) === 0) { try { systemMsg(p._acc, 'The collector emptied what you had and broke a pencil for the rest. The vig still stands: $' + p.loan.owed.toLocaleString() + '.'); } catch (e) {} }
  return p;
}

// ================= JAIL BUST-OUT =================
// spring a crewmate (or anybody) off the block for nerve and risk
const BUST = { nerve: 12, base: 0.45 };
function bustOut(accId, targetId) {
  const p = ready(load(accId));
  if (accId === targetId) return { err: 'You cannot bust yourself out — that is just escaping.' };
  if (p.jail_until) return { err: 'You are behind the same bars.' };
  if (p.hosp_until) return { err: 'You are in no shape to climb fences.' };
  const t = loadSafe(targetId);
  if (!t) return { err: 'That fighter is not on the board.' };
  if (!t.jail_until || t.jail_until <= Date.now()) return { err: 'They are not inside right now.' };
  if (p.nerve < BUST.nerve) return { err: `Busting the block takes ${BUST.nerve} nerve.` };
  p.nerve -= BUST.nerve;
  const fup = factionUpgrades(p.faction);
  const chance = Math.min(0.9, BUST.base + (p.stats.dx || 0) / 2000 + (fup.muscle ? 0.08 : 0) + (p.faction && p.faction === t.faction ? 0.07 : 0) + tipOf(p, 'muscle') / 100);
  const ok = Math.random() < chance;
  if (ok) {
    t.jail_until = null;
    save(targetId, t);
    p.reputation = (p.reputation || 0) + 8;
    E.gainXp(p, 40);
    systemMsg(targetId, `${p.name} cut the fence and walked you out of the block. You owe them one.`);
    systemMsg(accId, `Textbook work — the crew walked ${t.name} straight off the yard.`);
    logNews('crime', '🔓', `${t.name} vanished from a cell block in broad daylight.`);
    save(accId, p);
    return { p: publicView(p), res: { ok, name: t.name } };
  }
  goJail(p, 15);
  systemMsg(accId, 'The cameras were not as dead as promised. Fifteen minutes to think about it.');
  save(accId, p);
  return { p: publicView(p), res: { ok: false, name: t.name, chance: Math.round(chance * 100) } };
}

// ================= CORNER SHOPS =================
function dayIdx() { return Math.floor(Date.now() / 86400000); }
function shopsView(accId) {
  const p = ready(load(accId));
  if (p.shop_caps.day !== dayIdx()) p.shop_caps = { day: dayIdx(), counts: {} };
  const shops = C.SHOPS.map(s => ({
    id: s.id, icon: s.icon, name: s.name, area: s.area, blurb: s.blurb,
    stock: s.stock.map(row => {
      const it = C.ITEMS[row.item];
      const bought = ((p.shop_caps.counts[s.id] || {})[row.item]) || 0;
      const base = row.price || Math.ceil((it.buy || it.sell * 2.2) * (row.mult || 1));
      return { item: row.item, name: it.name, icon: it.icon, desc: it.desc, price: base, left: Math.max(0, row.qty - bought), max: row.qty };
    })
  }));
  save(accId, p);
  return { shops };
}
function shopBuy(accId, shopId, itemId) {
  const p = ready(load(accId));
  const s = C.SHOPS.find(x => x.id === shopId);
  if (!s) return { err: 'That door is boarded up.' };
  const row = s.stock.find(x => x.item === itemId);
  if (!row) return { err: 'Not on these shelves.' };
  if (p.shop_caps.day !== dayIdx()) p.shop_caps = { day: dayIdx(), counts: {} };
  const bought = ((p.shop_caps.counts[shopId] || {})[itemId]) || 0;
  if (bought >= row.qty) return { err: 'You cleaned out today\u2019s shelf of that. Come back tomorrow.' };
  const it = C.ITEMS[itemId];
  const price = row.price || Math.ceil((it.buy || it.sell * 2.2) * (row.mult || 1));
  if (p.money < price) return { err: `The counter wants $${price.toLocaleString()}.` };
  p.money -= price;
  p.items[itemId] = (p.items[itemId] || 0) + 1;
  p.shop_caps.counts[shopId] = p.shop_caps.counts[shopId] || {};
  p.shop_caps.counts[shopId][itemId] = bought + 1;
  save(accId, p);
  return { p: publicView(p), res: { item: itemId, name: it.name, price, left: row.qty - bought - 1 } };
}

// ================= MISSION BOARD =================
function missionStat(p, key) {
  if (key === 'missions') return C.MISSIONS.filter(m => m.id !== 'm_longcon' && p.missions[m.id]).length;
  return (p.mstats && p.mstats[key]) || 0;
}
function missionsView(accId) {
  const p = ready(load(accId));
  return { board: C.MISSIONS.map(m => {
    const claimed = !!p.missions[m.id];
    const prog = m.chain ? m.chain.filter(id => p.missions[id]).length : Math.min(m.need, missionStat(p, m.stat));
    const need = m.chain ? m.chain.length : m.need;
    return { id: m.id, icon: m.icon, name: m.name, desc: m.desc, prog, need, done: prog >= need, claimed, reward: m.reward };
  }) };
}
function missionClaim(accId, mid) {
  const p = ready(load(accId));
  const m = C.MISSIONS.find(x => x.id === mid);
  if (!m) return { err: 'That posting is not on the board.' };
  if (p.missions[mid]) return { err: 'Already claimed. The Wire does not pay twice.' };
  const prog = m.chain ? m.chain.filter(id => p.missions[id]).length : Math.min(m.need, missionStat(p, m.stat));
  if (prog < (m.chain ? m.chain.length : m.need)) return { err: 'The job is not done yet. Finish it, then collect.' };
  p.missions[mid] = Date.now();
  const r = m.reward || {};
  if (r.cash) p.money += r.cash;
  if (r.xp) E.gainXp(p, r.xp);
  if (r.item) p.items[r.item] = (p.items[r.item] || 0) + 1;
  systemMsg(accId, `Mission \"${m.name}\" closed out — $${(r.cash || 0).toLocaleString()}${r.item ? ' and a little hardware' : ''} lands with the Wire's regards.`);
  save(accId, p);
  return { p: publicView(p), res: { id: mid, reward: r } };
}

// ================= THE WIRE PASS =================
function passView(p) {
  const active = E.subOn(p);
  return { price: C.WIRE_PASS.price, days: C.WIRE_PASS.days, buffs: C.WIRE_PASS.buffs, active, founder: !!p.sub_founder, until: p.sub_until || 0, left: active && !p.sub_founder ? p.sub_until - Date.now() : 0 };
}
function passBuy(accId) {
  const p = ready(load(accId));
  if (p.sub_founder) return { err: 'Founders carry the pass for life. It never lapses.' };
  if (p.money < C.WIRE_PASS.price) return { err: `The pass costs $${C.WIRE_PASS.price.toLocaleString()} on the table.` };
  p.money -= C.WIRE_PASS.price;
  const from = Math.max(Date.now(), p.sub_until || 0);
  p.sub_until = from + C.WIRE_PASS.days * 86400000;
  save(accId, p);
  systemMsg(accId, 'The Wire Pass lights up gold on your ledger: faster charge, steadier trigger finger, friendlier brokers. Seven days of it.');
  logNews('wire', '💳', `${p.name} went gold with the Wire Pass.`);
  return { p: publicView(p), res: { until: p.sub_until } };
}

// ================= FACTION: bank, upgrades, wire, ranks =================
function factionLoad(fid) {
  const f = db().prepare('SELECT * FROM factions WHERE id=?').get(fid);
  if (!f) return null;
  let d; try { d = JSON.parse(f.json); } catch (e) { d = {}; }
  d.memberIds = [...new Set((Array.isArray(d.memberIds) ? d.memberIds : []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
  d.ownerAcc = Number(d.ownerAcc);
  if (!Number.isInteger(d.ownerAcc) || d.ownerAcc < 1) d.ownerAcc = d.memberIds[0] || null;
  if (d.ownerAcc && !d.memberIds.includes(d.ownerAcc)) d.memberIds.unshift(d.ownerAcc);
  d.ownerName = d.ownerName || (d.ownerAcc ? nameOfAcc(d.ownerAcc) : 'unknown');
  d.bank = Math.max(0, Math.floor(Number(d.bank) || 0));
  d.upgrades = d.upgrades || {};
  d.officers = [...new Set((Array.isArray(d.officers) ? d.officers : []).map(Number).filter(id => d.memberIds.includes(id) && id !== d.ownerAcc))];
  d.announce = d.announce || null;
  d.recruiting = ['open', 'apply', 'closed'].includes(d.recruiting) ? d.recruiting : 'open';
  d.applications = (Array.isArray(d.applications) ? d.applications : []).filter(a => a && Number.isInteger(Number(a.accId))).slice(-30);
  d.ledger = (Array.isArray(d.ledger) ? d.ledger : []).filter(e => e && e.text).slice(-40);
  d.roll = d.roll && typeof d.roll === 'object' ? d.roll : { day: null, streak: 0, memberIds: [] };
  d.roll.memberIds = [...new Set((Array.isArray(d.roll.memberIds) ? d.roll.memberIds : []).map(Number).filter(id => d.memberIds.includes(id)))];
  d.operations = Math.max(0, Math.floor(Number(d.operations) || 0));
  d.reputation = Math.max(0, Math.floor(Number(d.reputation) || 0));
  d.createdAt = d.createdAt || f.created_at || Date.now();
  // ---- gang expansion fields (old crews pick up the defaults on first read)
  d.armory = (d.armory && typeof d.armory === 'object') ? d.armory : {};
  for (const k of Object.keys(d.armory)) { d.armory[k] = Math.max(0, Math.floor(Number(d.armory[k]) || 0)); if (!d.armory[k] || !C.ITEMS[k]) delete d.armory[k]; }
  d.invites = (Array.isArray(d.invites) ? d.invites : []).filter(i => i && Number.isInteger(Number(i.accId))).slice(-30);
  d.contrib = (d.contrib && typeof d.contrib === 'object') ? d.contrib : {};
  d.wars = d.wars && typeof d.wars === 'object' ? d.wars : {};
  d.wars.wins = Math.max(0, Math.floor(Number(d.wars.wins) || 0));
  d.wars.losses = Math.max(0, Math.floor(Number(d.wars.losses) || 0));
  d.wars.lastRaidAt = Number(d.wars.lastRaidAt) || 0;
  d.wars.shieldUntil = Number(d.wars.shieldUntil) || 0;
  d.recentOps = (Array.isArray(d.recentOps) ? d.recentOps : [])
    .filter(o => o && Number.isInteger(Number(o.accId)) && Number(o.at) > Date.now() - 86400000).slice(-60);
  return { f, d };
}
function factionSave(fid, d) { db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), fid); }
function factionUpgrades(fid) {
  if (!fid) return {};
  try { const f = db().prepare('SELECT json FROM factions WHERE id=?').get(fid); const d = f ? JSON.parse(f.json) : {}; return d.upgrades || {}; } catch (e) { return {}; }
}
function factionRole(d, accId) { return d.ownerAcc === accId ? 'leader' : ((d.officers || []).includes(accId) ? 'officer' : 'member'); }
function factionPower(d) { return (d.memberIds || []).length * 100 + (d.reputation || 0); }
// Gang level is derived from crew reputation — see FACTION_LEVELS in content.js.
function factionLevel(rep) {
  rep = Math.max(0, Math.floor(Number(rep) || 0));
  let level = 1;
  const steps = C.FACTION_LEVELS || [0];
  for (let i = 0; i < steps.length; i++) if (rep >= steps[i]) level = i + 1;
  const nextAt = level < steps.length ? steps[level] : null;
  const base = steps[level - 1] || 0;
  const progress = nextAt == null ? 1 : Math.min(1, Math.max(0, (rep - base) / Math.max(1, nextAt - base)));
  return { level, nextAt, progress };
}
// Rank among all crews by power (1 = top of the city).
function factionRank(fid) {
  const rows = db().prepare('SELECT id FROM factions').all();
  const powers = rows.map(r => { const fx = factionLoad(r.id); return fx ? { id: r.id, power: factionPower(fx.d) } : null; }).filter(Boolean);
  powers.sort((a, b) => b.power - a.power);
  const idx = powers.findIndex(x => x.id === fid);
  return { rank: idx >= 0 ? idx + 1 : null, of: powers.length };
}
// Per-member lifetime contribution ledger: { deposited, ops, rolls, raids }.
function factionContrib(d, accId) {
  d.contrib = d.contrib || {};
  const k = String(accId);
  if (!d.contrib[k]) d.contrib[k] = { deposited: 0, ops: 0, rolls: 0, raids: 0 };
  const c = d.contrib[k];
  c.deposited = Math.max(0, Math.floor(Number(c.deposited) || 0));
  c.ops = Math.max(0, Math.floor(Number(c.ops) || 0));
  c.rolls = Math.max(0, Math.floor(Number(c.rolls) || 0));
  c.raids = Math.max(0, Math.floor(Number(c.raids) || 0));
  return c;
}
// How many distinct members closed an operation in the last 24h (chain bonus).
function factionChainCount(d, now) {
  now = now || Date.now();
  const seen = new Set();
  for (const o of (d.recentOps || [])) if (o && now - Number(o.at) < 86400000) seen.add(Number(o.accId));
  return seen.size;
}
function armoryCap(d) { return (d.upgrades || {}).armory_vault ? C.FACTION_ARMORY_CAP_VAULT : C.FACTION_ARMORY_CAP; }
function armoryUsed(d) { return Object.values(d.armory || {}).reduce((n, q) => n + Math.max(0, Math.floor(Number(q) || 0)), 0); }
// Scrub every pending application and invite pointing at one account (resets, wipes).
function factionClearPending(accId) {
  let touched = 0;
  for (const f of db().prepare('SELECT id, json FROM factions').all()) {
    let d; try { d = JSON.parse(f.json || '{}'); } catch (e) { continue; }
    const na = (d.applications || []).filter(a => Number(a.accId) !== accId);
    const ni = (d.invites || []).filter(i => Number(i.accId) !== accId);
    if (na.length !== (d.applications || []).length || ni.length !== (d.invites || []).length) {
      d.applications = na; d.invites = ni;
      db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id);
      touched++;
    }
  }
  return touched;
}
function factionLog(d, kind, text, amount) {
  d.ledger = Array.isArray(d.ledger) ? d.ledger : [];
  d.ledger.unshift({ at: Date.now(), kind: String(kind || 'note').slice(0, 24), text: String(text || '').slice(0, 180), amount: Math.floor(Number(amount) || 0) });
  d.ledger = d.ledger.slice(0, 40);
}
function factionMembershipPending(accId) {
  for (const f of db().prepare('SELECT id, json FROM factions').all()) {
    try { if ((JSON.parse(f.json).applications || []).some(a => Number(a.accId) === accId)) return f.id; } catch (e) {}
  }
  return null;
}
function factionBankIn(accId, amount) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no war chest.' };
  amount = Math.floor(parseInt(amount, 10) || 0);
  if (amount < 1) return { err: 'Thin air fattens no chest.' };
  if (p.money < amount) return { err: 'Your roll is not that deep.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  p.money -= amount;
  const bonus = fx.d.upgrades.laundromat ? Math.round(amount * 0.10) : 0;   // the wash pays for itself
  fx.d.bank += amount + bonus;
  factionContrib(fx.d, accId).deposited += amount;
  factionLog(fx.d, 'deposit', p.name + ' put cash into the war chest' + (bonus ? ' — the laundromat washed an extra $' + bonus.toLocaleString() + '.' : '.'), amount + bonus);
  factionSave(p.faction, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { bank: fx.d.bank, amount, bonus, text: '$' + amount.toLocaleString() + ' added to the war chest' + (bonus ? ' (+$' + bonus.toLocaleString() + ' laundromat bonus).' : '.') } };
}
function factionBankOut(accId, amount) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no war chest.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const role = factionRole(fx.d, accId);
  if (role === 'member') return { err: 'Only officers and the boss touch the chest.' };
  amount = Math.floor(parseInt(amount, 10) || 0);
  amount = Math.min(amount, fx.d.bank);
  if (amount < 1) return { err: 'The chest is empty.' };
  fx.d.bank -= amount; p.money += amount;
  factionLog(fx.d, 'withdrawal', p.name + ' drew cash from the war chest.', -amount);
  factionSave(p.faction, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { bank: fx.d.bank, amount, text: '$' + amount.toLocaleString() + ' drawn from the war chest.' } };
}
function factionBuyUpgrade(accId, upId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const role = factionRole(fx.d, accId);
  if (role === 'member') return { err: 'Upgrades are an officers\' call.' };
  const up = C.FACTION_UPGRADES.find(u => u.id === upId);
  if (!up) return { err: 'No such arrangement.' };
  if (fx.d.upgrades[upId]) return { err: 'Already bought and paid for.' };
  if (fx.d.bank < up.cost) return { err: `The war chest is $${fx.d.bank.toLocaleString()} — this arrangement costs $${up.cost.toLocaleString()}.` };
  fx.d.bank -= up.cost;
  fx.d.upgrades[upId] = Date.now();
  factionLog(fx.d, 'upgrade', p.name + ' secured ' + up.name + ' for the crew.', -up.cost);
  factionSave(p.faction, fx.d);
  logNews('faction', '\u{1F6E0}\uFE0F', `${fx.f.name} [${fx.f.tag}] locked in ${up.name}.`);
  return { ok: true, p: publicView(p), res: { id: upId, bank: fx.d.bank, text: up.name + ' is live for the whole crew.' } };
}
function factionAnnounce(accId, text) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (fx.d.ownerAcc !== accId) return { err: 'The wire only carries the boss\'s voice.' };
  text = String(text || '').replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  fx.d.announce = text ? { text, at: Date.now(), by: p.name } : null;
  if (text) factionLog(fx.d, 'notice', p.name + ' pinned a crew notice.');
  factionSave(p.faction, fx.d);
  return { ok: true, p: publicView(p), res: { announce: fx.d.announce } };
}
function factionPromote(accId, targetId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (fx.d.ownerAcc !== accId) return { err: 'Only the boss hands out stripes.' };
  targetId = Number(targetId);
  if (!fx.d.memberIds.includes(targetId) || targetId === accId) return { err: 'They are not an eligible hand on the roster.' };
  const i = fx.d.officers.indexOf(targetId);
  const memberName = nameOfAcc(targetId);
  if (i >= 0) { fx.d.officers.splice(i, 1); factionLog(fx.d, 'rank', p.name + ' pulled ' + memberName + "'s stripe."); }
  else { fx.d.officers.push(targetId); factionLog(fx.d, 'rank', p.name + ' made ' + memberName + ' an officer.'); }
  factionSave(p.faction, fx.d);
  return { ok: true, p: publicView(p), res: { officers: fx.d.officers } };
}
// ================= FACTION: ranks, invites, profile, armory, war =================
function factionKick(accId, targetId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const role = factionRole(fx.d, accId);
  if (role === 'member') return { err: 'Only officers and the boss cut people loose.' };
  targetId = Number(targetId);
  if (targetId === accId) return { err: 'Walk away instead — leaving is the honourable exit.' };
  if (!fx.d.memberIds.includes(targetId)) return { err: 'They are not on this roster.' };
  if (role === 'officer' && factionRole(fx.d, targetId) !== 'member') return { err: 'Officers can only cut loose regular members.' };
  const tName = nameOfAcc(targetId);
  fx.d.memberIds = fx.d.memberIds.filter(i => i !== targetId);
  fx.d.officers = (fx.d.officers || []).filter(i => i !== targetId);
  if (fx.d.roll) fx.d.roll.memberIds = (fx.d.roll.memberIds || []).filter(i => i !== targetId);
  fx.d.power = factionPower(fx.d);
  factionLog(fx.d, 'kicked', p.name + ' cut ' + tName + ' loose from the roster.');
  factionSave(fx.f.id, fx.d);
  const t = loadSafe(targetId);
  if (t) { t.faction = null; save(targetId, t); }
  systemMsg(targetId, '🥾 ' + p.name + ' cut you loose from ' + fx.f.name + '. Your envelope is your own again.');
  return { ok: true, p: publicView(p), res: { kicked: tName, text: tName + ' is off the roster.' } };
}
function factionTransfer(accId, targetId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (fx.d.ownerAcc !== accId) return { err: 'Only the boss hands over the flag.' };
  targetId = Number(targetId);
  if (targetId === accId) return { err: 'You already hold the flag.' };
  if (!fx.d.memberIds.includes(targetId)) return { err: 'They are not on this roster.' };
  fx.d.ownerAcc = targetId;
  fx.d.ownerName = nameOfAcc(targetId);
  fx.d.officers = (fx.d.officers || []).filter(i => i !== targetId);
  if (!fx.d.officers.includes(accId)) fx.d.officers.push(accId);   // the old boss keeps a stripe
  factionLog(fx.d, 'leadership', p.name + ' handed the flag to ' + fx.d.ownerName + '.');
  factionSave(fx.f.id, fx.d);
  systemMsg(targetId, '👑 ' + p.name + ' handed you the flag of ' + fx.f.name + '. The chest, the desk and the wire are yours.');
  logNews('faction', '👑', `${fx.d.ownerName} now holds the flag of ${fx.f.name}.`);
  return { ok: true, p: publicView(p), res: { owner: fx.d.ownerName, text: 'The flag is ' + fx.d.ownerName + '’s now. You keep an officer’s stripe.' } };
}
function factionInvite(accId, targetName) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (factionRole(fx.d, accId) === 'member') return { err: 'Only officers and the boss send invites.' };
  const want = String(targetName || '').trim().toLowerCase();
  if (!want) return { err: 'Name the citizen you want.' };
  let tRow = null;
  for (const r of db().prepare('SELECT acc_id, json FROM players').all()) {
    try { const q = JSON.parse(r.json); if ((q.name || '').toLowerCase() === want) { tRow = { acc: r.acc_id, q }; break; } } catch (e) {}
  }
  if (!tRow) return { err: 'No citizen answers to "' + String(targetName).slice(0, 30) + '".' };
  if (tRow.acc === accId) return { err: 'You are already holding this flag.' };
  if (tRow.q.faction) return { err: tRow.q.name + ' already rides with another crew.' };
  if (factionMembershipPending(tRow.acc)) return { err: tRow.q.name + ' already has an application waiting elsewhere.' };
  for (const f of db().prepare('SELECT id, name, json FROM factions').all()) {
    try {
      const d = JSON.parse(f.json || '{}');
      if ((d.invites || []).some(i => Number(i.accId) === tRow.acc)) {
        return f.id === fx.f.id
          ? { err: tRow.q.name + ' already holds your invite — give them time.' }
          : { err: tRow.q.name + ' already holds an invite from ' + f.name + '.' };
      }
    } catch (e) {}
  }
  const cap = C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0);
  if (fx.d.memberIds.length >= cap) return { err: 'The roster is full — invites need an empty bed too.' };
  fx.d.invites.push({ accId: tRow.acc, name: tRow.q.name, at: Date.now() });
  fx.d.invites = fx.d.invites.slice(-30);
  factionLog(fx.d, 'invite', p.name + ' invited ' + tRow.q.name + ' to the crew.');
  factionSave(fx.f.id, fx.d);
  systemMsg(tRow.acc, `✉️ ${p.name} invited you to ride with ${fx.f.name} [${fx.f.tag}]. Open the Gangs tab to accept — the door opens even if recruiting is closed.`);
  return { ok: true, p: publicView(p), res: { invited: tRow.q.name, text: 'Invite sent to ' + tRow.q.name + '.' } };
}
function factionInviteCancel(accId, targetId) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (factionRole(fx.d, accId) === 'member') return { err: 'Only officers and the boss touch invites.' };
  targetId = Number(targetId);
  const idx = (fx.d.invites || []).findIndex(i => Number(i.accId) === targetId);
  if (idx < 0) return { err: 'That invite is not on the desk.' };
  const gone = fx.d.invites[idx];
  fx.d.invites.splice(idx, 1);
  factionLog(fx.d, 'invite', p.name + ' tore up the invite to ' + (gone.name || 'a citizen') + '.');
  factionSave(fx.f.id, fx.d);
  return { ok: true, p: publicView(p), res: { cancelled: gone.name } };
}
function factionEdit(accId, patch) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'Join a crew first.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (fx.d.ownerAcc !== accId) return { err: 'Only the boss rewrites the flag.' };
  patch = patch || {};
  let renamed = false;
  if (patch.name !== undefined || patch.tag !== undefined) {
    const wantName = patch.name !== undefined ? A.sanitize(patch.name, 24) : fx.f.name;
    const wantTag = patch.tag !== undefined
      ? String(patch.tag || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()
      : fx.f.tag;
    if (wantName !== fx.f.name || wantTag !== fx.f.tag) {
      if (wantName.length < 3) return { err: 'A crew name needs at least 3 characters.' };
      if (wantTag.length < 2) return { err: 'Need a 2-4 letter tag.' };
      const dupe = db().prepare('SELECT 1 FROM factions WHERE id<>? AND (LOWER(name)=LOWER(?) OR UPPER(tag)=?)').get(fx.f.id, wantName, wantTag);
      if (dupe) return { err: 'That crew name or tag already flies in this city.' };
      const cost = C.FACTION_RENAME_COST || 50000;
      if ((p.money || 0) < cost) return { err: 'A rebrand costs $' + cost.toLocaleString() + ' cash — painters, printers, new tattoos.' };
      p.money -= cost;
      const oldName = fx.f.name, oldTag = fx.f.tag;
      db().prepare('UPDATE factions SET name=?, tag=? WHERE id=?').run(wantName, wantTag, fx.f.id);
      fx.f.name = wantName; fx.f.tag = wantTag;
      factionLog(fx.d, 'renamed', p.name + ' rebranded ' + oldName + ' [' + oldTag + '] as ' + wantName + ' [' + wantTag + '].', 0);
      logNews('faction', '🎨', `${oldName} [${oldTag}] flies a new flag: ${wantName} [${wantTag}].`);
      renamed = true;
    }
  }
  if (patch.desc !== undefined) fx.d.desc = A.sanitize(patch.desc, 180);
  factionSave(fx.f.id, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { name: fx.f.name, tag: fx.f.tag, desc: fx.d.desc || '', renamed } };
}
function factionArmoryIn(accId, itemId, qty) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no armory.' };
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'Nobody racks that down the cut.' };
  qty = Math.max(1, Math.min(999, parseInt(qty, 10) || 1));
  if (((p.items || {})[itemId] || 0) < qty) return { err: 'You are not carrying that many.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  const cap = armoryCap(fx.d), used = armoryUsed(fx.d);
  if (used + qty > cap) return { err: `The armory holds ${cap} pieces (${used} racked). An Armory Vault would open 250 slots.` };
  p.items[itemId] -= qty; if (p.items[itemId] <= 0) delete p.items[itemId];
  fx.d.armory[itemId] = (fx.d.armory[itemId] || 0) + qty;
  factionLog(fx.d, 'armory', p.name + ' racked ' + qty + '× ' + it.name + ' in the armory.');
  factionSave(fx.f.id, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { itemId, qty, text: qty + '× ' + it.name + ' racked in the armory.' } };
}
function factionArmoryOut(accId, itemId, qty) {
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no armory.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (factionRole(fx.d, accId) === 'member') return { err: 'Only officers and the boss hand out armory pieces.' };
  const it = C.ITEMS[itemId];
  if (!it) return { err: 'Nobody racks that down the cut.' };
  qty = Math.max(1, Math.min(999, parseInt(qty, 10) || 1));
  if (((fx.d.armory || {})[itemId] || 0) < qty) return { err: 'The armory does not hold that many.' };
  fx.d.armory[itemId] -= qty; if (fx.d.armory[itemId] <= 0) delete fx.d.armory[itemId];
  p.items = p.items || {}; p.items[itemId] = (p.items[itemId] || 0) + qty;
  factionLog(fx.d, 'armory', p.name + ' drew ' + qty + '× ' + it.name + ' from the armory.');
  factionSave(fx.f.id, fx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { itemId, qty, text: qty + '× ' + it.name + ' drawn from the armory.' } };
}
function factionRaid(accId, targetFid) {
  const now = Date.now();
  const R = C.FACTION_RAID;
  const p = ready(load(accId));
  if (!p.faction) return { err: 'No crew, no war.' };
  if (p.jail_until && p.jail_until > now) return { err: 'Wars are not run from a cell.' };
  if (p.hosp_until && p.hosp_until > now) return { err: 'You need to be on your feet for a raid.' };
  const fx = factionLoad(p.faction); if (!fx) return { err: 'The gang is gone.' };
  if (factionRole(fx.d, accId) === 'member') return { err: 'Only officers and the boss call a raid.' };
  targetFid = Number(targetFid);
  if (targetFid === fx.f.id) return { err: 'You cannot raid your own flag.' };
  const tx = factionLoad(targetFid); if (!tx) return { err: 'That crew is not on the map.' };
  if ((p.faction_raid_at || 0) > now) return { err: 'You personally need another ' + Math.ceil(((p.faction_raid_at || 0) - now) / 60000) + ' min before the next raid.' };
  if (((fx.d.wars || {}).lastRaidAt || 0) + R.gangCooldown > now) return { err: fx.f.name + ' needs another ' + Math.ceil((((fx.d.wars || {}).lastRaidAt || 0) + R.gangCooldown - now) / 3600000) + 'h before it rides again.' };
  if (((tx.d.wars || {}).shieldUntil || 0) > now) return { err: tx.f.name + ' is still barricaded — try another flag or come back later.' };
  if ((tx.d.bank || 0) < R.minTargetBank) return { err: tx.f.name + '’s chest is too thin to be worth the noise.' };
  if (p.energy < R.energy) return { err: 'A raid needs ' + R.energy + ' energy.' };
  if (p.nerve < R.nerve) return { err: 'A raid needs ' + R.nerve + ' nerve.' };
  if ((p.money || 0) < R.cashCost) return { err: 'A raid needs $' + R.cashCost.toLocaleString() + ' on hand for wheels and burners.' };
  p.energy -= R.energy; p.nerve -= R.nerve; p.money -= R.cashCost;
  p.faction_raid_at = now + R.playerCooldown;
  const atkP = Math.max(1, factionPower(fx.d));
  const defP = Math.max(1, factionPower(tx.d));
  let chance = Math.round((atkP / (atkP + defP)) * 100);
  const aup = fx.d.upgrades || {}, dup = tx.d.upgrades || {};
  if (aup.war_room) chance += 12;
  if (aup.burner_ring) chance += 4;
  if (dup.safehouse) chance -= 10;
  if (dup.kevlar_net) chance -= 4;
  chance = Math.max(10, Math.min(90, chance));
  const win = Math.random() * 100 < chance;
  fx.d.wars.lastRaidAt = now;
  tx.d.wars.shieldUntil = now + R.shield;
  let steal = 0, text;
  if (win) {
    steal = Math.round((tx.d.bank || 0) * R.stealPct);
    if (aup.war_room) steal = Math.round(steal * 1.2);
    steal = Math.max(R.stealMin, Math.min(R.stealMax, steal, tx.d.bank || 0));
    tx.d.bank -= steal; fx.d.bank += steal;
    fx.d.reputation += R.winRep;
    tx.d.reputation = Math.max(0, (tx.d.reputation || 0) - R.raidedLoseRep);
    fx.d.wars.wins++; tx.d.wars.losses++;
    factionContrib(fx.d, accId).raids++;
    factionLog(fx.d, 'raid', p.name + ' raided ' + tx.f.name + ' and stripped the chest.', steal);
    factionLog(tx.d, 'raid', fx.f.name + ' raided the chest.', -steal);
    logNews('faction', '⚔️', `${fx.f.name} [${fx.f.tag}] raided ${tx.f.name} [${tx.f.tag}] and stripped $${steal.toLocaleString()} from the war chest.`);
    systemMsg(tx.d.ownerAcc, `⚔️ ${fx.f.name} just raided your war chest for $${steal.toLocaleString()}. Barricades are up for 2 hours — hit back when they drop.`);
    text = 'The raid lands: $' + steal.toLocaleString() + ' stripped from ' + tx.f.name + '’s chest into yours.';
  } else {
    fx.d.reputation = Math.max(0, (fx.d.reputation || 0) - R.loseRep);
    tx.d.reputation += R.defendRep;
    fx.d.wars.losses++; tx.d.wars.wins++;
    factionContrib(fx.d, accId).raids++;   // leading the raid counts, win or lose
    factionLog(fx.d, 'raid', p.name + '’s raid on ' + tx.f.name + ' bounced off the barricades.', 0);
    factionLog(tx.d, 'raid', 'The crew repelled a raid by ' + fx.f.name + '.', 0);
    logNews('faction', '🛡️', `${tx.f.name} [${tx.f.tag}] repelled a raid by ${fx.f.name} [${fx.f.tag}].`);
    systemMsg(tx.d.ownerAcc, `🛡️ ${fx.f.name} tried to raid your war chest and bounced off. Your crew’s name grows.`);
    text = 'The raid bounces off ' + tx.f.name + '’s barricades. The city saw everything.';
  }
  fx.d.power = factionPower(fx.d); tx.d.power = factionPower(tx.d);
  factionSave(fx.f.id, fx.d); factionSave(tx.f.id, tx.d); save(accId, p);
  return { ok: true, p: publicView(p), res: { win, chance, steal, target: tx.f.name, tag: tx.f.tag, text } };
}
// rich view for the faction page: roster + bank + upgrades + wire
function factionDetail(accId) {
  const p = loadSafe(accId);
  if (!p || !p.faction) return { faction: null };
  const fx = factionLoad(p.faction); if (!fx) return { faction: null };
  const now = Date.now();
  const myRole = factionRole(fx.d, accId);
  const lvl = factionLevel(fx.d.reputation);
  const rnk = factionRank(fx.f.id);
  const roster = fx.d.memberIds.map(id2 => {
    const q = loadSafe(id2);
    const c = (fx.d.contrib || {})[String(id2)] || { deposited: 0, ops: 0, rolls: 0, raids: 0 };
    return q ? { id: id2, name: q.name, avatar: q.avatar, level: q.level || 1, role: factionRole(fx.d, id2), jailed: !!(q.jail_until && q.jail_until > now),
      contrib: { deposited: c.deposited || 0, ops: c.ops || 0, rolls: c.rolls || 0, raids: c.raids || 0 } }
      : { id: id2, name: 'Missing citizen', role: 'member', contrib: { deposited: 0, ops: 0, rolls: 0, raids: 0 } };
  });
  const ops = C.FACTION_OPERATIONS.map(op => {
    const nextAt = Math.max(0, Number((p.faction_ops || {})[op.id]) || 0);
    let locked = null;
    if (op.minLvl && (p.level || 1) < op.minLvl) locked = 'Needs level ' + op.minLvl;
    else if (op.minGang && lvl.level < op.minGang) locked = 'Needs gang level ' + op.minGang;
    return { ...op, ready: !locked && nextAt <= now, nextAt, locked };
  });
  const isOfficer = myRole !== 'member';
  const rollToday = fx.d.roll.day === todayKey(now);
  const armory = Object.entries(fx.d.armory || {}).map(([itemId, qty]) => {
    const it = C.ITEMS[itemId] || { name: itemId, icon: '📦' };
    return { itemId, name: it.name, icon: it.icon, qty };
  });
  const R = C.FACTION_RAID || {};
  return { faction: {
    id: fx.f.id, name: fx.f.name, tag: fx.f.tag, desc: fx.d.desc || '', bank: fx.d.bank,
    cap: C.FACTION_MEMBER_CAP + (fx.d.upgrades.stash_house ? 10 : 0), power: factionPower(fx.d), reputation: fx.d.reputation,
    level: lvl.level, nextLevelAt: lvl.nextAt, levelProgress: Math.round(lvl.progress * 100) / 100,
    rank: rnk.rank, rankOf: rnk.of,
    roster, announce: fx.d.announce, myRole, recruiting: fx.d.recruiting,
    roll: { streak: fx.d.roll.streak || 0, checkedIn: rollToday ? fx.d.roll.memberIds.length : 0, total: fx.d.memberIds.length, mine: rollToday && fx.d.roll.memberIds.includes(accId), resetAt: nextDayAt(now) },
    operations: ops, operationCount: fx.d.operations, ledger: fx.d.ledger.slice(0, 12),
    chain: { count: factionChainCount(fx.d, now), need: C.FACTION_CHAIN_NEED || 3 },
    applications: isOfficer ? fx.d.applications.map(a => ({ id: Number(a.accId), name: String(a.name || 'Unknown').slice(0, 30), level: Number(a.level) || 1, at: Number(a.at) || 0 })) : [],
    invites: isOfficer ? (fx.d.invites || []).map(i => ({ id: Number(i.accId), name: String(i.name || 'Unknown').slice(0, 30), at: Number(i.at) || 0 })) : [],
    armory, armoryCap: armoryCap(fx.d), armoryUsed: armoryUsed(fx.d),
    wars: { wins: (fx.d.wars || {}).wins || 0, losses: (fx.d.wars || {}).losses || 0,
      shieldUntil: (fx.d.wars || {}).shieldUntil || 0, lastRaidAt: (fx.d.wars || {}).lastRaidAt || 0 },
    raid: { playerReadyAt: Number(p.faction_raid_at) || 0,
      gangReadyAt: ((fx.d.wars || {}).lastRaidAt || 0) + (R.gangCooldown || 0),
      cost: R.cashCost || 0, energy: R.energy || 0, nerve: R.nerve || 0 },
    upgrades: C.FACTION_UPGRADES.map(u => ({ id: u.id, icon: u.icon, name: u.name, cost: u.cost, desc: u.desc, owned: !!fx.d.upgrades[u.id] })),
    renameCost: C.FACTION_RENAME_COST || 50000,
    now
  } };
}
module.exports = {
  load, save, ready, derive, publicView, unlock, systemMsg, gainXpAndMerits, jailFor, happyMax,
  doCrime, doTrain, doWork, attackTargets, doAttack,
  chatPost, chatFeed, pawnQuote, pawnSell, loanView, loanTake, loanRepay, bustOut,
  shopsView, shopBuy, missionsView, missionClaim, passView, passBuy,
  factionLoad, factionSave, factionUpgrades, factionBankIn, factionBankOut, factionBuyUpgrade, factionAnnounce, factionPromote, factionDetail, factionApply, factionSetRecruiting, factionReviewApplication, factionRoll, factionOperation,
  factionLevel, factionRank, factionContrib, factionClearPending, factionKick, factionTransfer, factionInvite, factionInviteCancel, factionEdit, factionArmoryIn, factionArmoryOut, factionRaid, armoryCap, armoryUsed,
  doBuy, doSell, doUse,
  doDeposit, doWithdraw, doCasino,
  wheelSpin, raceView, raceBet, raceSettleNow, heistWalk,
  bazaarView, bazaarFeePct, listItem, buyListing, cancelListing,
  AUCTION_FEE_PCT, AUCTION_MAX_ACTIVE, AUCTION_HOURS, auctionView, auctionCreate, auctionBid, auctionCancel, settleAuctions,
  gearBonus, battleStats, equipItem, unequipItem, checkGunCabinet, stockView, stockBuy, stockSell, cryptoView, cryptoBuy, cryptoSell, cryptoWalletTick, tickStocks,
  propView, buyProperty, upgradeProperty, sellProperty, moveVault,
  eduView, startCourse, abortCourse, meritView, buyMerit,
  bountyList, bountyTotal, placeBounty, claimBounty,
  listFactions, createFaction, joinFaction, leaveFaction,
  applyJob, quitJob,
  sendMsg, myMessages, sentMessages,
  recentNews, leaderboard, myRank, logNews,
  propView, buyProperty, upgradeProperty, sellProperty, moveVault, propOf, happyMax,
  eduView, startCourse, abortCourse,
  meritView, buyMerit,
  placeBounty, bountyList, bountyTotal, claimBounty, normalize, loadSafe, accIdOf, prisonDo, prisonBailCost,
  jailBoard, prisonBailOther, devJail, dailyClaim, wireCash, noteTo
};
