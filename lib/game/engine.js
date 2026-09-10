// Razor Town — game engine (pure functions, server- & client-agnostic)
'use strict';

const C = require('./content.js');

const MINUTES = 60 * 1000;
const PERIODS = { life: 6 * MINUTES, energy: 30 * MINUTES, nerve: 30 * MINUTES, jail: 60 * MINUTES, hospital: 30 * MINUTES };

// Effective stat with active booster applied
function eff(p, key) {
  let v = p.stats[key] || 0;
  const b = p.boosters && p.boosters[key];
  if (b && b.until && b.until > Date.now()) v = Math.floor(v * (b.mult || 1));
  return v;
}

function levelFromXp(xp) {
  let lvl = 1, need = 300, total = 0, acc = 0;
  while (acc + need <= xp) { acc += need; lvl++; need = Math.floor(need * 1.06) + 100; }
  return { level: lvl, into: xp - acc, need };
}

function gainXp(p, amount) {
  p.xp = (p.xp || 0) + amount;
  const before = levelFromXp((p.xp || 0) - amount);
  const after = levelFromXp(p.xp);
  if (after.level > before.level) {
    const j = C.JOBS.find(j => j.id === p.job && p.job_shift !== undefined);
    if (j) p.job = null;
    return after.level - before.level; // levels gained
  }
  return 0;
}

// stat gain step that can never let two stats diverge too far (soft balance).
// The allowance is wider than an origin head-start (+8) so a new player can always
// train the skill their own origin is famous for.
const STAT_NAMES = { st: 'Strength', de: 'Defence', sp: 'Speed', dx: 'Dexterity' };
const TRAIN_GAP = 10;

function trainBlocker(p, key) {
  const stat = p.stats[key] || 0;
  const others = ['st', 'de', 'sp', 'dx'].filter(k => k !== key);
  const maxOther = Math.max(...others.map(k => p.stats[k] || 0));
  if (stat <= maxOther + TRAIN_GAP) return null;
  const lagging = others.reduce((a, k) => ((p.stats[a] || 0) <= (p.stats[k] || 0) ? a : k), others[0]);
  return {
    lagging,
    laggingName: STAT_NAMES[lagging],
    statName: STAT_NAMES[key] || key,
    gap: Math.round(stat - maxOther)
  };
}

function canTrain(p, key) { return trainBlocker(p, key) === null; }

function trainResult(p, key, gymLvl) {
  const stat = p.stats[key] || 0;
  const rate = Math.max(2.2, Math.floor(6 + stat / 3.5 + gymLvl * 1.4));
  const lifePct = (p.life / p.max_life);
  const mult = lifePct < 0.35 ? 0.5 : 1;
  const gain = Math.max(0.2, Math.round((rate + Math.random() * rate * 0.3) * mult * 10) / 10);
  return gain;
}

function calcTotal(p) {
  return Math.floor((eff(p,'st') + eff(p,'de') + eff(p,'sp') + eff(p,'dx')) / 4);
}

function playerBattleStats(p) {
  return {
    st: eff(p,'st'), de: eff(p,'de'), sp: eff(p,'sp'), dx: eff(p,'dx'),
    life: p.life, max: p.max_life, level: levelFromXp(p.xp).level
  };
}

function botBattleStats(bot, targetStats) {
  // bot power scales to challenge or spare the target
  const scale = Math.random();
  const k = targetStats;
  const make = (base, mn, mx) => Math.max(1, Math.round(base * (mn + scale * (mx - mn))));
  return {
    st: make(k.st, 0.5, 1.1), de: make(k.de, 0.5, 1.1), sp: make(k.sp, 0.6, 1.2), dx: make(k.dx, 0.5, 1.1),
    life: 0, max: make(k.max, 0.7, 1.15), level: make(k.level, 0.5, 1.25)
  };
}

// Simulated fight. Returns detailed report for animation.
// a = player, b = opponent (bot stat block). dmgScale ~ seconds of combat.
function simulateFight(a, b, dmgScale = 2.0) {
  const p = a, e = b;
  const pHP = p.life, eHP = e.max;
  const pDmg = dmgScale * Math.max(1, (p.st * 0.55 + p.de * 0.1 + p.dx * 0.15 + p.level * 2) * (0.85 + Math.random() * 0.3));
  const eDmg = dmgScale * Math.max(1, (e.st * 0.55 + e.de * 0.1 + e.dx * 0.15 + e.level * 2) * (0.85 + Math.random() * 0.3));
  // accuracy tie-break by dexterity + random
  const pAcc = p.dx / (p.dx + e.dx) * (0.85 + Math.random() * 0.3);
  const eAcc = 1 - pAcc;
  const pHit = Math.round(pHP - eHP * eAcc * (eDmg / (pDmg + eDmg)) * 2.2);
  const eHit = Math.round(eHP - pHP * pAcc * (pDmg / (pDmg + eDmg)) * 2.2);
  const win = pHit > eHit;
  const pLost = Math.max(1, Math.min(pHP, Math.round(pHP * (eDmg / (pDmg + eDmg)) * 0.85 * (0.7 + Math.random() * 0.6))));
  const eLost = Math.max(1, Math.min(eHP, Math.round(eHP * (pDmg / (pDmg + eDmg)) * 0.85 * (0.7 + Math.random() * 0.6))));
  // do NOT kill player on loss below 1 life: goes to hospital at >= ~1; see resolve
  const pEnd = win ? Math.max(1, pHP - pLost) : 1;
  const eEnd = win ? Math.max(0, eHP - eLost) : Math.max(1, eHP - eLost * 0.4);
  return { win, pStart: pHP, eStart: eHP, pLost: win ? pLost : Math.min(pHP - 1, pLost), eLost: win ? eLost : Math.round(eLost * 0.4), pHP: pEnd, eHP: eEnd,
           pDmg, eDmg, rounds: Math.max(2, Math.round(4 + Math.random() * 5)) };
}

function crimeSuccessChance(p, crime) {
  const req = crime.req || {};
  const scores = { st: 0.9, de: 0.55, sp: 0.95, dx: 1.0 };
  let mult = 1;
  for (const k of ['st','de','sp','dx']) {
    const effK = eff(p, k);
    if (req[k] > 0) mult *= 0.85 + Math.min(0.8, (effK - req[k]) / (req[k] * 2.2));
  }
  // levels above requirement unlock bigger rewards; failing bank jobs when dex<req risks hospital
  return Math.max(0.03, Math.min(0.96, (crime.base / 100) * mult));
}

function crimePayout(crime, level) {
  const lvlBonus = 1 + Math.max(0, level - crime.lvl) * 0.05;
  const [lo, hi] = crime.cash;
  return Math.round((lo + Math.random() * (hi - lo)) * lvlBonus);
}

function xpForCrime(crime) { return crime.nerve * (6 + Math.round(crime.cash[1] / 900)); }

function hpCap(p) { return Math.floor((p.max_hp_base + (p.stats.de || 0) * 10 + p.level * 25)); }

function refill(p, now) {
  // life regen every 6 min, 1 point
  const lifeRegen = 1;
  // energy every 30 min: 5 + level
  // nerve every 30 min: 1 + floor(lvl/15)
  if (!p._ref) p._ref = { life: now, energy: now, nerve: now };
  let dl = Math.floor((now - p._ref.life) / PERIODS.life);
  if (dl > 0) { p.life = Math.min(p.max_life, p.life + dl * lifeRegen); p._ref.life += dl * PERIODS.life; }
  let de = Math.floor((now - p._ref.energy) / PERIODS.energy);
  if (de > 0) { p.energy = Math.min(p.max_energy, p.energy + de * (5 + Math.floor(p.level / 2))); p._ref.energy += de * PERIODS.energy; }
  let dn = Math.floor((now - p._ref.nerve) / PERIODS.nerve);
  if (dn > 0) { p.nerve = Math.min(p.max_nerve, p.nerve + dn * 1); p._ref.nerve += dn * PERIODS.nerve; }
  // timers
  if (p.jail_until && now >= p.jail_until) { p.jail_until = null; p.energy = p.max_energy; }
  if (p.hosp_until && now >= p.hosp_until) { p.hosp_until = null; p.life = p.max_life; p.energy = p.max_energy; }
  // booster expiry cleanup
  for (const k of ['st','de','sp','dx']) if (p.boosters && p.boosters[k] && p.boosters[k].until <= now) delete p.boosters[k];
  return p;
}

function arrestChance(p) { return Math.min(0.35, 0.16 + (p.total_crimes || 0) * 0.0006); }

module.exports = { C, MINUTES, PERIODS, eff, levelFromXp, gainXp, canTrain, trainBlocker, STAT_NAMES, TRAIN_GAP, trainResult, calcTotal, playerBattleStats, botBattleStats, simulateFight, crimeSuccessChance, crimePayout, xpForCrime, hpCap, refill, arrestChance };
