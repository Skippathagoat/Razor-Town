#!/usr/bin/env node
/* Razor Town — deep check for the Torn-style systems (property, education, merits, bounties).
 *
 * Runs against a THROWAWAY world so it can never touch the live ledger:
 *   DB_PATH=/tmp/check/world.db node tools/check-systems.js
 *
 * Every assertion prints PASS/FAIL and the process exits non-zero if anything fails.
 */
'use strict';
process.env.DB_PATH = process.env.DB_PATH || '/tmp/razor-check/world.db';
const fs = require('fs');
try { fs.rmSync(process.env.DB_PATH, { force: true }); } catch (e) {}

const dbm = require('../lib/db.js');
dbm.init();
const W = require('../lib/world.js');
const A = require('../lib/accounts.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '   → ' + JSON.stringify(detail) : '')); }
};
const head = (t) => console.log('\n' + t);

// ---------------------------------------------------------------- fixtures
const a1 = A.createAccount('alf', 'hunter22', 'user');
A.createPlayerForAccount(a1, { name: 'Alf Cutler', origin: 'factory' });
const a2 = A.createAccount('ned', 'rivalpass', 'user');
A.createPlayerForAccount(a2, { name: 'Ned Slater', origin: 'factory' });
const id = a1.id, id2 = a2.id;
const load = (a) => W.normalize(W.load(a));
const fund = (a, n) => { const p = load(a); p.money = n; W.save(a, p); };
fund(id, 900000);

// ---------------------------------------------------------------- property
head('Property');
ok('every new player starts in the back-to-back terrace', W.propView(load(id)).name === 'Back-to-back Terrace');
ok('buying a house works', !!W.buyProperty(id, 'rooms').ok);
ok('the new address sticks', load(id).property === 'rooms');
ok('a house raises the happiness ceiling', load(id).max_happy === 160, load(id).max_happy);
const up = W.upgradeProperty(id, 'bath');
ok('fittings can be bought', !!up.ok, up.err);
ok('a fitted upgrade raises the ceiling again', load(id).max_happy === 174, load(id).max_happy);
ok('the same fitting cannot be bought twice', !!W.upgradeProperty(id, 'bath').err);
ok('an upgrade from another house is refused', !!W.upgradeProperty(id, 'airfield').err);
ok('cash goes into the safe', !!W.moveVault(id, 20000, 'in').ok);
ok('the safe holds it', load(id).vault === 20000 && load(id).money === 900000 - 25000 - 12000 - 20000);
ok('cash comes back out', !!W.moveVault(id, 5000, 'out').ok);
ok('the safe cannot be overdrawn', !!W.moveVault(id, 99999999, 'out').err);
ok('unaffordable houses are refused', !!W.buyProperty(id, 'manor').err);

// daily upkeep is charged once, not every poll
head('Upkeep & happiness');
let p = load(id);
p._ref.upkeep = Date.now() - 2 * 86400000;
W.save(id, p);
const cashBefore = load(id).money;
W.ready(load(id));
ok('two days of upkeep come off the balance', load(id).money === cashBefore - 50, { before: cashBefore, after: load(id).money });
const cashAfter = load(id).money;
W.ready(load(id)); W.ready(load(id));
ok('the same day is never billed twice', load(id).money === cashAfter);
p = load(id); p.money = 0; p._ref.upkeep = Date.now() - 2 * 86400000;
W.save(id, p);
const happyBefore = load(id).happy;
W.ready(load(id));
ok('unpaid rent costs happiness instead', load(id).happy < happyBefore, { before: happyBefore, after: load(id).happy });
ok('a terrace with no upkeep is never billed', (() => {
  const q = load(id); q.property = 'shack'; q._ref.upkeep = Date.now() - 3 * 86400000; W.save(id, q);
  const before = load(id).money; W.ready(load(id)); return load(id).money === before;
})());
fund(id, 900000); W.buyProperty(id, 'rooms');

// ---------------------------------------------------------------- education
head('Education');
ok('enrolling costs the fees and starts the clock', !!W.startCourse(id, 'shorthand').ok);
const ends = load(id).course_ends;
ok('the clock is set to the course length', Math.round((ends - Date.now()) / 60000) === 60);
ok('only one course at a time', !!W.startCourse(id, 'carpentry').err);
p = load(id); p.course_ends = Date.now() - 1000; W.save(id, p);
W.ready(load(id));
const done = load(id);
ok('the course completes and is recorded', !!done.courses.shorthand);
ok('the stat grant lands', done.stats.dx === 13, done.stats.dx);
W.ready(load(id)); W.ready(load(id));
ok('polling again does not re-grant it', load(id).stats.dx === 13 && Object.keys(load(id).courses).length === 1, load(id).stats.dx);
ok('a passed course cannot be retaken', !!W.startCourse(id, 'shorthand').err);
ok('a locked course is refused', !!W.startCourse(id, 'law').err, W.startCourse(id, 'law').err);
ok('walking out is possible', (() => { W.startCourse(id, 'bookkeeping'); const r = W.abortCourse(id); W.ready(load(id)); return !!r.ok && !load(id).course; })());
p = load(id); p.course = 'bookkeeping'; p.course_ends = Date.now() - 1; W.save(id, p);
W.ready(load(id));
ok('percentage grants reach the bonus panel', load(id).bonuses.crimePct === 1, load(id).bonuses);

// ---------------------------------------------------------------- merits
head('Merits');
p = load(id); p.merits = 3; p.merits_earned = 3; W.save(id, p);
const eBefore = load(id).max_energy;
const mb = W.buyMerit(id, 'energy');
ok('a merit can be spent', !!mb.ok, mb.err);
ok('the perk takes effect', load(id).max_energy === eBefore + 2, { before: eBefore, after: load(id).max_energy });
ok('the point is consumed', load(id).merits === 2);
ok('an unknown perk is refused', !!W.buyMerit(id, 'nonsense').err);
ok('a maxed perk is refused', (() => {
  const q = load(id); q.perks = { energy: 10 }; q.merits = 9; W.save(id, q);
  return !!W.buyMerit(id, 'energy').err;
})());
ok('spending with no points is refused', (() => {
  const q = load(id); q.merits = 0; q.perks = {}; W.save(id, q);
  return !!W.buyMerit(id, 'gym').err;
})());

// ---------------------------------------------------------------- bounties
head('Bounties');
fund(id, 900000);
ok('a bounty needs at least $500', !!W.placeBounty(id, id2, 100, false).err);
ok('you cannot post money you do not have', !!W.placeBounty(id, id2, 99999999, false).err);
ok('an unknown citizen is refused', !!W.placeBounty(id, 999999, 900, false).err);
ok('a bounty can be posted', !!W.placeBounty(id, id2, 8000, false).ok);
ok('the poster is charged', load(id).money === 900000 - 8000, load(id).money);
ok('anonymous posts hide the name', (() => {
  W.placeBounty(id, id2, 2000, true);
  const b = W.bountyList(load(id)).list.find(x => x.id === id2);
  return b.total === 10000 && b.entries.some(e => e.from === 'Anonymous');
})(), W.bountyList(load(id)).list);
ok('the target is warned by letter', dbm.getDb().prepare('SELECT COUNT(*) c FROM messages WHERE to_acc=?').get(id2).c > 0);
ok('a pot cannot be claimed while the target is standing', W.claimBounty(load(id), load(id2), 'a beating') === null);

let claimed = null, thrown = 0, potBefore = 0;
for (let round = 0; round < 20 && !claimed; round++) {
  const t = W.normalize(W.loadSafe(id2)); t.life = 1; t.hosp_until = null; W.save(id2, t);
  const m = load(id); m.hosp_until = null; m.life = m.max_life; m.energy = 100; W.save(id, m);
  for (let i = 0; i < 8 && !claimed; i++) {
    thrown++;
    potBefore = load(id).money;
    const r = W.doAttack(id, id2);
    if (r && r.res && /collected the \$10,000 bounty/.test(r.res.msg)) claimed = r.res.msg;
  }
}
ok('beating the target into hospital collects the pot', !!claimed, { thrown, claimed });
ok('the pot is paid minus the 5% fee', (() => {
  // the winning fight also carries loot, so the payout is the difference above it
  const gain = load(id).money - potBefore;
  return gain >= 9500;
})(), { before: potBefore, after: load(id).money });
ok('the board is cleared once paid', W.bountyList(load(id)).list.length === 0);
ok('it cannot be paid out twice', W.claimBounty(load(id), W.loadSafe(id2), 'again') === null);

// ---------------------------------------------------------------- cleanup
head('Hygiene');
ok('selling up returns the value and the safe', (() => {
  W.buyProperty(id, 'cottage'); W.upgradeProperty(id, 'safe'); W.moveVault(id, 1000, 'in');
  const before = load(id).money;
  const r = W.sellProperty(id);
  return !!r.ok && load(id).property === 'shack' && load(id).vault === 0 && load(id).money > before;
})());
ok('a terrace cannot be sold to anybody', !!W.sellProperty(id).err);
ok('unknown actions are simply refused, not crashed', (() => typeof W.buyProperty(id, 'nope-this-house') === 'object')());

console.log('\n' + (fail === 0 ? `ALL ${pass} SYSTEM CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
process.exit(fail === 0 ? 0 : 1);
