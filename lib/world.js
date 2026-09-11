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

// ------- progression: courses, perks, housing -------
function normalize(p) {
  p.stocks = p.stocks || {}; p.crypto = p.crypto || {}; p.equip = p.equip || { weapon: null, armour: null };
  if (!p.courses) p.courses = {};
  if (!p.perks) p.perks = {};
  if (p.merits == null) p.merits = 0;
  if (p.merits_earned == null) p.merits_earned = 0;
  if (p.vault == null) p.vault = 0;
  if (p.happy == null) p.happy = 50;
  if (!p.property) p.property = 'shack';
  if (!Array.isArray(p.property_up)) p.property_up = [];
  if (p.course === undefined) p.course = null;
  if (p.course_ends === undefined) p.course_ends = null;
  return p;
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
  p.max_energy = 100 + (g.maxEnergy || 0) + k.energy * 2;
  p.max_nerve = Math.min(100, 20 + 5 * Math.floor((p.level - 1) / 5)) + (g.maxNerve || 0) + k.nerve;
  p.max_happy = happyMax(p);
  if (p.happy > p.max_happy) p.happy = p.max_happy;
  p.bonuses = { gymPct: gymBonusPct(p), crimePct: crimeBonusPct(p), jailPct: jailCutPct(p), mugPct: mugBonusPct(p), propDiscPct: propDiscountPct(p) };
  p.total = E.calcTotal(p);
  return p;
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
  p = cryptoWalletTick(derive(E.refill(p, now)));
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
  const chance = Math.min(0.95, E.crimeSuccessChance(p, crime) * (1 + crimeBonusPct(p) / 100));
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
    gainedLv = gainXpAndMerits(p, xpGain); // levels gained (and a merit each)
  } else {
    p.total_fail = (p.total_fail || 0) + 1;
    p.spree = 0; res.spree = 0;
    p.reputation = Math.max(0, (p.reputation || 0) - (2 + crime.nerve));
    if (Math.random() < E.arrestChance(p)) {
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

// ---------------- GEAR: guns & plate
function gearBonus(p) {
  const eq = (p && p.equip) || {};
  const wpn = eq.weapon && C.ITEMS[eq.weapon] && C.ITEMS[eq.weapon].equip ? C.ITEMS[eq.weapon].equip.atk || 0 : 0;
  const arm = eq.armour && C.ITEMS[eq.armour] && C.ITEMS[eq.armour].equip && C.ITEMS[eq.armour].equip.def ? C.ITEMS[eq.armour].equip.def : 0;
  return { atk: wpn, def: arm };
}
// Load-bearing over E.playerBattleStats: strength rides the iron, defence rides the plate.
function battleStats(p) {
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
// gun cabinet badge: own one of every gun at once
function checkGunCabinet(p) {
  const guns = Object.keys(C.ITEMS).filter(k => C.ITEMS[k].equip && C.ITEMS[k].equip.slot === 'weapon');
  const owned = new Set(Object.keys(p.items || {}).concat(Object.values(p.equip || {}).filter(Boolean)));
  if (guns.length && guns.every(g => owned.has(g))) unlock(p, 'guncollector');
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
  const aStats = battleStats(p);
  const bStats = isBot ? E.botBattleStats(t, aStats) : battleStats(t);
  const fight = E.simulateFight(aStats, bStats, 1.8);
  p.energy -= 10;
  const ach = [];
  let resMsg = '', claimMsg = null;
  if (fight.win) {
    p.wins = (p.wins || 0) + 1;
    const loot = isBot
      ? Math.max(50, Math.round(t.money * (0.04 + Math.random() * 0.06)))
      : Math.max(25, Math.round(t.money * 0.06 * (1 + mugBonusPct(p) / 100)));
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
  if (a.seller_acc === accId) return { err: 'Shilling your own lot will get you barred from the rooms.' };
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
function stockFeePct(p) { return Math.max(0, STK.feeStock - Math.max(0, (courseGrant(p).bankPct || 0)) * 0.001); }
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
  p.stocks = p.stocks || {}; p.stocks[sym] = (p.stocks[sym] || 0) + qty;
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
  const fee = round2(usdAmt * STK.feeCrypto);
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
  const gross = round2(qty * pr); const fee = round2(gross * STK.feeCrypto);
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
    const interest = Math.floor(p.bank * 0.0007 * (1 + ((courseGrant(p).bankPct || 0) / 100)) * hrs); // ~4%/hour while banked, plus bookkeeping class"
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
  const s = settleCasino(p, 'pontoon', h.bet, ret, `at the pontoon table (${pv} against ${dv}).`);
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
  const s = settleCasino(p, 'greyhound', bet, ret, win ? 'on the Greyhound Dash.' : 'chasing the dog.');
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
  const s = settleCasino(p, 'bandit', bet, ret, 'on the one-armed bandit.');
  return { res: { game: 'bandit', bet, stage: 'done', win: s.win, push: mult === 1, pay: s.pay, reels: reels.map(r => r.id), glyphs: reels.map(r => r.g), mult } };
}
function playCrown(p, bet, body) {
  const pick = String(body.pick || '');
  if (!CROWN_SIGNS.some(s => s.id === pick)) return { err: 'Back one of the six signs painted on the baize.' };
  const dice = [0, 0, 0].map(() => CROWN_SIGNS[Math.floor(Math.random() * 6)]);
  const matches = dice.filter(d => d.id === pick).length;
  const ret = matches ? bet * (matches + 1) : 0;
  const s = settleCasino(p, 'crown', bet, ret, matches ? `at Crown & Anchor — ${matches} ${matches === 1 ? 'sign' : 'signs'} landed.` : 'at Crown & Anchor.');
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
  if (!out || out.err) return { err: (out && out.err) || 'The table boss shakes his head.' };
  save(accId, p);
  return { p: publicView(p), res: out.res };
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
    happy: Math.round(p.happy || 50), max_happy: p.max_happy,
    money: p.money, bank: p.bank, vault: p.vault || 0,
    property: p.property, aproperty: propView(p),
    courses_done: Object.keys(p.courses || {}),
    course: p.course ? { id: p.course, ends: p.course_ends, name: (C.COURSES.find(x => x.id === p.course) || {}).name } : null,
    merits: p.merits || 0, perks: p.perks || {}, bonuses: p.bonuses || {},
    job: p.job,
    items: p.items,
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

module.exports = {
  load, save, ready, derive, publicView,
  doCrime, doTrain, doWork, attackTargets, doAttack,
  doBuy, doSell, doUse,
  doDeposit, doWithdraw, doCasino,
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
  placeBounty, bountyList, bountyTotal, claimBounty, normalize, loadSafe, accIdOf
};
