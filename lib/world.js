// Razor Town — server-side world actions
'use strict';
const dbm = require('./db.js');
const E = require('./game/engine.js');
const C = require('./game/content.js');
const A = require('./accounts.js');

const db = () => dbm.getDb();
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

// ------- derived numbers
function derive(p) {
  const lv = E.levelFromXp(p.xp || 0);
  p.level = lv.level;
  p.xpInto = lv.into; p.xpNeed = lv.need;
  p.max_life = Math.floor(100 + (p.stats.de || 0) * 10 + p.level * 25);
  p.max_nerve = Math.min(100, 20 + 5 * Math.floor((p.level - 1) / 5));
  p.total = E.calcTotal(p);
  return p;
}

function ready(p) { p = derive(E.refill(p, Date.now())); return p; }

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
  p.jail_until = Date.now() + minutes * E.MINUTES;
  p.job = null;
  const jb = unlock(p, 'jailbird'); return jb;
}
function goHospital(p, minutes) {
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
  if (p.jail_until) return { err: 'You are in jail. Pay your debt to society first.' };
  if (p.hosp_until) return { err: 'You are in the hospital. Recover first.' };
  const energyCost = 3 + crime.nerve * 2;
  if (p.energy < energyCost) return { err: `Not enough energy (needs ${energyCost}). Wait for regeneration.` };
  if (p.nerve < crime.nerve) return { err: `Not enough nerve (needs ${crime.nerve}). Steady yourself.` };
  const chance = E.crimeSuccessChance(p, crime);
  const roll = Math.random();
  const ok = roll < chance;
  p.energy -= energyCost; p.nerve -= crime.nerve;
  p.total_crimes = (p.total_crimes || 0) + 1;
  const res = { id: crime.id, name: crime.name, ok, nerve: crime.nerve, tag: crime.tag, cat: crime.cat };
  let gainedLv = 0, ach = [];
  if (ok) {
    p.total_success = (p.total_success || 0) + 1;
    const cash = E.crimePayout(crime, p.level);
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
    gainedLv = E.gainXp(p, xpGain) - 0; // gainXp returns levels newly gained
  } else {
    p.total_fail = (p.total_fail || 0) + 1;
    p.spree = 0; res.spree = 0;
    p.reputation = Math.max(0, (p.reputation || 0) - (2 + crime.nerve));
    if (Math.random() < E.arrestChance(p)) {
      const mins = crime.jail[0] + Math.floor(Math.random() * (crime.jail[1] - crime.jail[0]));
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
  if (p.jail_until || p.hosp_until) return { err: 'Not available right now.' };
  if (p.level < gym.lvl) return { err: `This gym requires level ${gym.lvl}.` };
  if (p.money < 250) return { err: 'Training costs $250 per session.' };
  const blocked = E.trainBlocker(p, stat);
  if (blocked) return {
    err: `Your ${blocked.statName} is ${blocked.gap} ahead of the rest. Train ${blocked.laggingName} next — or train ${blocked.statName} again once the others have caught up.`,
    hint: { lagging: blocked.lagging, gap: blocked.gap }
  };
  if (p.energy < 12) return { err: 'Too tired to train. Energy regenerates over time.' };
  p.energy -= 12; p.money -= 250;
  const gain = E.trainResult(p, stat, gym.lvl);
  p.stats[stat] = Math.round((p.stats[stat] + gain) * 10) / 10;
  derive(p);
  p.life = Math.min(p.max_life, p.life);
  save(accId, p);
  return { p: publicView(p), res: { gain, stat, gym: gym.name } };
}

// ================= WORK =================
function doWork(accId) {
  const p = ready(load(accId));
  if (p.jail_until || p.hosp_until) return { err: 'Not available right now.' };
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
  E.gainXp(p, xpGain);
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
    q = derive(q);
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

function doAttack(accId, targetId) {
  const p = ready(load(accId));
  if (p.jail_until || p.hosp_until) return { err: 'Not available right now.' };
  if (p.energy < 10) return { err: 'Not enough energy to fight.' };
  const tacc = db().prepare('SELECT * FROM accounts WHERE id=?').get(targetId);
  if (!tacc) return { err: 'Target not found.' };
  const isBot = tacc.kind === 'bot';
  const t = ready(load(targetId));
  if (t.jail_until && t.jail_until > Date.now()) return { err: `${t.name} is in jail. Pick on someone who can fight back.` };
  if (t.hosp_until && t.hosp_until > Date.now()) return { err: `${t.name} is in the hospital already.` };
  const aStats = E.playerBattleStats(p);
  const bStats = isBot ? E.botBattleStats(t, aStats) : E.playerBattleStats(t);
  const fight = E.simulateFight(aStats, bStats, 1.8);
  p.energy -= 10;
  const ach = [];
  let resMsg = '';
  if (fight.win) {
    p.wins = (p.wins || 0) + 1;
    const loot = isBot
      ? Math.max(50, Math.round(t.money * (0.04 + Math.random() * 0.06)))
      : Math.max(25, Math.round(t.money * 0.06));
    p.money += loot;
    const xpGain = 40 + Math.round(t.level * 3);
    p.xp += xpGain;
    p.reputation = (p.reputation || 0) + 25;
    t.money = Math.max(0, t.money - loot);
    if (!isBot) t.losses = (t.losses || 0) + 1;   // the loser's record has to show it
    if (p.wins === 1) ach.push(unlock(p, 'first_win'));
    if (p.wins === 5) ach.push(unlock(p, 'five_wins'));
    if (p.wins === 25) ach.push(unlock(p, 'hitlist'));
    E.gainXp(p, xpGain);
    const dmgTaken = Math.min(p.max_life - 1, Math.max(1, Math.round(fight.pLost)));
    p.life = Math.max(1, p.life - dmgTaken);
    if (!isBot) {
      const dmgTo = Math.max(1, Math.round(t.max_life * (0.08 + Math.random() * 0.1)));
      t.life = Math.max(1, t.life - dmgTo);
      if (t.life <= 1) goHospital(t, 25 + Math.round(Math.random() * 30));
      systemMsg(targetId, `${p.name} jumped you in the street and lifted $${loot.toLocaleString()}. You are down to ${Math.round(t.life)} life. Hit the gym and pay it back.`);
      save(targetId, t);
    }
    resMsg = `You beat ${t.name} and took $${loot.toLocaleString()}.`;
  } else {
    p.losses = (p.losses || 0) + 1;
    const dmg = Math.min(p.max_life - 1, Math.max(1, Math.round(p.max_life * (0.10 + Math.random() * 0.1))));
    p.life = Math.max(1, p.life - dmg);
    if (p.life <= 1) goHospital(p, 30 + Math.round(Math.random() * 40));
    if (!isBot) {
      // the defender won this one, so their record and name should show it
      t.wins = (t.wins || 0) + 1;
      t.xp += 25 + Math.round(p.level * 2);
      t.reputation = (t.reputation || 0) + 20;
      E.gainXp(t, 25 + Math.round(p.level * 2));
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
  const gain = it.sell * qty;
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
    let used = false;
    if (e.energy) { p.energy = Math.min(p.max_energy, p.energy + e.energy); used = true; }
    if (e.happy) { p.happy = Math.min(100, (p.happy || 50) + e.happy); used = true; }
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

// ================= BANK =================
function bankAccrue(p) {
  const now = Date.now();
  if (!p._ref) p._ref = {};
  const last = p._ref.bank || now;
  const hrs = (now - last) / (60 * 60000);
  if (hrs > 0.016) { // ~1 min granularity
    const interest = Math.floor(p.bank * 0.0007 * hrs); // ~4%/hour while banked
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
function doCasino(accId, game, bet) {
  const p = ready(load(accId));
  bet = Math.max(10, Math.min(1000000, parseInt(bet, 10) || 0));
  if (p.money < bet) return { err: 'Not enough cash for that bet.' };
  p.money -= bet;
  let win = false, mult = 0, crash = 1;
  // Crash Dash: an escalating multiplier. You cash out automatically at a lucky point before it crashes.
  win = Math.random() < 0.46;
  crash = 1 + Math.random() * 1.8;
  mult = win ? (1 + Math.pow(Math.random(), 1.7) * 2.8) : 0;
  const pay = win ? Math.round(bet * mult) : 0;
  if (win) { p.money += pay; p.reputation = (p.reputation || 0) + Math.round(pay / 60); }
  const ach = win ? [unlock(p, 'casino')] : [];
  logNews('casino', '\uD83C\uDFB0', win ? `${p.name} won $${pay.toLocaleString()} at the Skyline Casino.` : `${p.name} chased the dragon at the casino and lost.`);
  save(accId, p);
  return { p: publicView(p), res: { game, bet, win, mult, crash, pay } };
}

// ================= FACTION =================
function listFactions(accId) {
  const fs2 = db().prepare('SELECT id, name, tag, json FROM factions').all();
  const out = [];
  for (const f of fs2) {
    const d = JSON.parse(f.json);
    out.push({ id: f.id, name: f.name, tag: f.tag, desc: d.desc, members: d.memberIds.length, power: d.power, owner: d.ownerName });
  }
  return { factions: out };
}
function createFaction(accId, name, tag, desc) {
  const p = load(accId);
  if (p.faction) return { err: 'Leave your current faction first.' };
  if (p.money < 200000) return { err: 'Forming a faction costs $200,000.' };
  if (p.level < 5) return { err: 'You must be level 5 to found a faction.' };
  const clean = A.sanitize(name, 24) || 'Unnamed';
  const tagc = (String(tag || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4)).toUpperCase();
  if (!tagc) return { err: 'Need a 2-4 letter tag.' };
  p.money -= 200000;
  const info = db().prepare('INSERT INTO factions (name, tag, json, created_at) VALUES (?,?,?,?)')
    .run(clean, tagc, JSON.stringify({ desc: desc || '', ownerAcc: accId, ownerName: p.name, memberIds: [accId], power: 0, createdAt: Date.now() }), Date.now());
  p.faction = info.lastInsertRowid;
  unlock(p, 'faction');
  save(accId, p);
  logNews('faction', '\uD83E\uDE92', `${p.name} founded faction "${clean}" [${tagc}].`);
  return { p: publicView(p), res: { id: info.lastInsertRowid } };
}
function joinFaction(accId, fid) {
  const p = load(accId);
  if (p.faction) return { err: 'You already belong to a faction.' };
  const f = db().prepare('SELECT * FROM factions WHERE id=?').get(fid);
  if (!f) return { err: 'Faction not found.' };
  const d = JSON.parse(f.json);
  if (!d.memberIds.includes(accId)) d.memberIds.push(accId);
  d.power = d.memberIds.length * 100;
  db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), fid);
  p.faction = fid;
  unlock(p, 'faction');
  save(accId, p);
  logNews('faction', '\uD83E\uDE92', `${p.name} joined ${f.name}.`);
  return { p: publicView(p), res: {} };
}
function leaveFaction(accId) {
  const p = load(accId);
  if (!p.faction) return { err: 'You are not in a faction.' };
  const f = db().prepare('SELECT * FROM factions WHERE id=?').get(p.faction);
  if (f) {
    const d = JSON.parse(f.json);
    if (d.ownerAcc === accId) {
      if (d.memberIds.length <= 1) { db().prepare('DELETE FROM factions WHERE id=?').run(f.id); }
      else { const next = d.memberIds.find(i => i !== accId); d.ownerAcc = next; d.ownerName = nameOfAcc(next); d.memberIds = d.memberIds.filter(i => i !== accId); db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id); }
    } else {
      d.memberIds = d.memberIds.filter(i => i !== accId);
      d.power = d.memberIds.length * 100;
      db().prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id);
    }
  }
  p.faction = null;
  save(accId, p);
  return { p: publicView(p), res: {} };
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
    happy: Math.round(p.happy || 50),
    money: p.money, bank: p.bank,
    job: p.job,
    items: p.items,
    boosters: Object.fromEntries(Object.keys(p.boosters || {}).map(k => [k, p.boosters[k]])),
    jail_until: p.jail_until, hosp_until: p.hosp_until,
    total_crimes: p.total_crimes, total_success: p.total_success, total_fail: p.total_fail,
    wins: p.wins || 0, losses: p.losses || 0,
    reputation: Math.round(p.reputation || 0),
    spree: p.spree || 0,
    achievements: p.achievements,
    faction: p.faction,
    total_deposits: p.total_deposits, total_market_spend: p.total_market_spend, total_shift: p.total_shift,
    seen_tutorial: !!p.seen_tutorial,
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

module.exports = {
  load, save, ready, derive, publicView,
  doCrime, doTrain, doWork, attackTargets, doAttack,
  doBuy, doSell, doUse,
  doDeposit, doWithdraw, doCasino,
  listFactions, createFaction, joinFaction, leaveFaction,
  applyJob, quitJob,
  sendMsg, myMessages, sentMessages,
  recentNews, leaderboard, myRank, logNews
};
