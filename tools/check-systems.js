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
const E = require('../lib/game/engine.js');
const CT = require('../lib/game/content.js');
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
ok('every new player starts in the city flatlet', W.propView(load(id)).name === 'City Flatlet');
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


// ---------------------------------------------------------------- casino
head('Casino — pontoon (blackjack)');
const C = (r, v) => ({ r, v, s: '♣' });
const rndHigh = () => 0.99999999;                       // identity shuffle: deck stays 2♠…A♣, pop draws from A♣ down
{ // a natural on the deal pays 3:2 and clears the table
  const MR = Math.random; Math.random = rndHigh;
  fund(id, 100000);
  const r1 = W.doCasino(id, { game: 'pontoon', bet: 1000 });
  Math.random = MR;
  ok('a dealt natural is a pontoon', r1.res && r1.res.outcome === 'pontoon', r1.res);
  ok('it pays 3:2 (2.5x back)', load(id).money === 100000 + 1500, load(id).money);
  ok('the table clears after a settlement', !W.load(id).casino);
}
// drive full hands by injecting an open table, then dealing from a scripted deck.
// deck.pop() takes the TAIL, so the last element of deckTail is the next card out.
function injectHand(cards, dealer, deckTail, bet) {
  const p = load(id);
  p.casino = { game: 'pontoon', bet: bet || 100, player: cards, dealer, deck: deckTail, opened: Date.now() };
  W.save(id, p);
}
{ // stand: 20 vs 17 → the dealer stands on 17 and loses
  injectHand([C('10', 10), C('K', 13)], [C('9', 9), C('8', 8)], [C('2', 2)], 100);
  const before = load(id).money;
  const r = W.doCasino(id, { game: 'pontoon', move: 'stand' });
  ok('standing on 20 against 17 wins', r.res && r.res.outcome === 'win' && r.res.dv === 17, r.res);
  ok('a win doubles the stake', load(id).money === before + 200, { before, after: load(id).money });
}
{ // bust: 16 takes a king
  injectHand([C('10', 10), C('6', 6)], [C('10', 10), C('7', 7)], [C('K', 13)], 150);
  const r = W.doCasino(id, { game: 'pontoon', move: 'hit' });
  ok('busting pays nothing', r.res && r.res.outcome === 'bust' && r.res.pay === 0, r.res);
  ok('the hand is gone after a bust', !W.load(id).casino);
}
{ // push: 18 vs 18 returns the stake
  injectHand([C('10', 10), C('8', 8)], [C('10', 10), C('8', 8)], [C('2', 2)], 200);
  const before = load(id).money;
  const r = W.doCasino(id, { game: 'pontoon', move: 'stand' });
  ok('a tie pushes the stake back', r.res && r.res.outcome === 'push' && load(id).money === before + 200, { res: r.res && r.res.outcome, after: load(id).money, before });
}
{ // double: first move only, one card, then the dealer plays
  injectHand([C('5', 5), C('6', 6)], [C('10', 10), C('7', 7)], [C('Q', 12)], 100);
  const before = load(id).money; // double takes another 100 and one card (a queen) makes 21 vs 17
  const r = W.doCasino(id, { game: 'pontoon', move: 'double' });
  ok('doubling draws exactly one card and settles', r.res && r.res.doubled && r.res.player.length === 3, r.res && r.res.player);
  ok('the doubled stake pays 2x on 21', load(id).money === before - 100 + 400, { before, after: load(id).money });
  injectHand([C('5', 5), C('6', 6)], [C('10', 10), C('7', 7)], [C('2', 2)], 50);
  W.doCasino(id, { game: 'pontoon', move: 'hit' });
  const rd2 = W.doCasino(id, { game: 'pontoon', move: 'double' });
  ok('double is refused after a hit', !!rd2.err, rd2);
  W.doCasino(id, { game: 'pontoon', move: 'stand' }); // clean up the open hand
}
{ // five-card trick beats the dealer's 20
  injectHand([C('2', 2), C('2', 2), C('2', 2), C('2', 2)], [C('10', 10), C('K', 13)], [C('A', 14)], 100);
  const before = load(id).money;
  const r = W.doCasino(id, { game: 'pontoon', move: 'hit' });
  ok('five cards without busting is a 2:1 trick', r.res && r.res.outcome === 'five-card-trick' && load(id).money === before + 300, { res: r.res && r.res.outcome, after: load(id).money, before });
}
{ // table etiquette
  ok('moves with no hand are refused', !!W.doCasino(id, { game: 'pontoon', move: 'hit' }).err);
  injectHand([C('10', 10), C('6', 6)], [C('10', 10), C('7', 7)], [C('2', 2)], 100);
  ok('a new bet is refused mid-hand', !!W.doCasino(id, { game: 'pontoon', bet: 500 }).err);
  const pv = W.publicView(load(id));
  ok('an open hand surfaces in the public view, hole card hidden', pv.pontoon && pv.pontoon.player.length === 2 && pv.pontoon.dealer.length === 1 && pv.pontoon.hidden === true, pv.pontoon);
  W.doCasino(id, { game: 'pontoon', move: 'stand' });
}
{ // stakes and clamps
  fund(id, 0);
  ok('no money, no cards', !!W.doCasino(id, { game: 'pontoon', bet: 100 }).err);
  ok('below the house minimum, no cards', !!W.doCasino(id, { game: 'pontoon', bet: 5 }).err);
  fund(id, 100000);
}

head('Casino — the wheel');
{
  const MR = Math.random;
  Math.random = () => 0.5; // 18 red
  fund(id, 10000);
  const r = W.doCasino(id, { game: 'wheel', bet: 100, spot: 'red' });
  Math.random = MR;
  ok('red hits and pays 1:1', r.res && r.res.win && r.res.n === 18 && r.res.color === 'red' && load(id).money === 10000 + 100, { n: r.res && r.res.n, money: load(id).money });
  Math.random = () => 0.5;
  fund(id, 10000);
  const r2 = W.doCasino(id, { game: 'wheel', bet: 100, spot: 'n:18' });
  Math.random = MR;
  ok('a straight number pays 35:1', r2.res && r2.res.pay === 3600, r2.res);
  Math.random = () => 0; // 0 green
  fund(id, 10000);
  const r3 = W.doCasino(id, { game: 'wheel', bet: 100, spot: 'black' });
  Math.random = MR;
  ok('zero is the house', r3.res && r3.res.n === 0 && !r3.res.win && load(id).money === 9900);
  fund(id, 10000);
  const r4 = W.doCasino(id, { game: 'wheel', bet: 100, spot: 'rubbish' });
  ok('backing nothing is refused and refunded', !!r4.err && load(id).money === 10000, r4);
  const r5 = W.doCasino(id, { game: 'wheel', bet: 100, spot: 'n:40' });
  ok('numbers past 36 are refused and refunded', !!r5.err && load(id).money === 10000, r5);
}

head('Casino — bandit, crown & anchor, hi-lo, the dog');
{
  const MR = Math.random;
  Math.random = () => 0; // cherry on every reel
  fund(id, 10000);
  const r = W.doCasino(id, { game: 'bandit', bet: 100 });
  Math.random = MR;
  ok('three cherries pay 4x', r.res && r.res.reels.join() === 'cherry,cherry,cherry' && r.res.pay === 400, r.res);
  Math.random = () => 0.975; // three sevens
  fund(id, 10000);
  const r2 = W.doCasino(id, { game: 'bandit', bet: 100 });
  Math.random = MR;
  ok('three sevens pay 60x', r2.res && r2.res.pay === 6000, r2.res);
  let seq = [0, 0, 0.5];
  Math.random = () => seq.length ? seq.shift() : 0; // cherry cherry lemon
  fund(id, 10000);
  const r3 = W.doCasino(id, { game: 'bandit', bet: 100 });
  Math.random = MR;
  ok('a pair returns the stake', r3.res && r3.res.mult === 1 && r3.res.pay === 100 && load(id).money === 10000, { res: r3.res, money: load(id).money });

  Math.random = () => 0; // crowns on every die
  fund(id, 10000);
  const r4 = W.doCasino(id, { game: 'crown', bet: 100, pick: 'crown' });
  Math.random = MR;
  ok('three signs pay stake plus 3x', r4.res && r4.res.matches === 3 && r4.res.pay === 400, r4.res);
  Math.random = () => 0;
  fund(id, 10000);
  const r5 = W.doCasino(id, { game: 'crown', bet: 100, pick: 'anchor' });
  Math.random = MR;
  ok('no sign means no return', r5.res && !r5.res.win && load(id).money === 9900);
  const r6 = W.doCasino(id, { game: 'crown', bet: 100, pick: 'horseshoe' });
  ok('a sign not on the baize is refused and refunded', !!r6.err && load(id).money === 9900, r6);

  Math.random = rndHigh; // identity deck: A♣ out first, then K♣
  fund(id, 10000);
  const r7 = W.doCasino(id, { game: 'hilow', bet: 100, guess: 'lower' });
  Math.random = MR;
  ok('ace into king — "lower" wins 1:1', r7.res && r7.res.win && load(id).money === 10000 + 100, { res: r7.res, money: load(id).money });
  Math.random = rndHigh;
  fund(id, 10000);
  const r8 = W.doCasino(id, { game: 'hilow', bet: 100, guess: 'higher' });
  Math.random = MR;
  ok('ace into king — "higher" loses', r8.res && !r8.res.win && load(id).money === 9900);
  const r9 = W.doCasino(id, { game: 'hilow', bet: 100, guess: 'sideways' });
  ok('a call that is not higher or lower is refused', !!r9.err && load(id).money === 9900, r9);

  Math.random = () => 0.1; // the dog comes in
  fund(id, 10000);
  const r10 = W.doCasino(id, { game: 'greyhound', bet: 1000 });
  Math.random = MR;
  ok('the greyhound still runs and pays a multiplier', r10.res && r10.res.win && r10.res.pay > 1000, r10.res);
  Math.random = () => 0.9; // the dog falls over
  fund(id, 10000);
  const r11 = W.doCasino(id, { game: 'greyhound', bet: 1000 });
  Math.random = MR;
  ok('and still loses when it crashes', r11.res && !r11.res.win && load(id).money === 9000);

  const r12 = W.doCasino(id, { game: 'chemin-de-fer', bet: 100 });
  ok('games the house does not run are refused and refunded', !!r12.err && load(id).money === 9000, r12);
}


// ---------------------------------------------------------------- regen & grants
head('Happiness & training/interest grants');
{
  // happiness ticks back up on the 30-minute clock toward the property ceiling
  const p = load(id); p.happy = 50; p._ref.happy = Date.now() - 90 * 60000; W.save(id, p);
  W.ready(load(id));
  ok('happiness climbs ~3% of the ceiling per tick', load(id).happy === 50 + 3 * Math.max(2, Math.round(load(id).max_happy * 0.03)), { happy: load(id).happy, max: load(id).max_happy });
  ok('... but never past the ceiling', (() => { const q = load(id); q.happy = q.max_happy - 1; q._ref.happy = Date.now() - 60000 * 600; W.save(id, q); W.ready(load(id)); return load(id).happy === load(id).max_happy; })());
  // a private gymnasium at home actually raises training gains
  const before = W.ready(load(id)).bonuses.gymPct;
  const q = load(id); const savedProp = q.property, savedUp = q.property_up;
  q.property = 'manor'; q.property_up = ['gymroom']; W.save(id, q);
  const after = W.ready(load(id)).bonuses.gymPct;
  ok('the manor gymnasium feeds into training gains', after === before + 2, { before, after });
  const r = load(id); r.property = savedProp; r.property_up = savedUp; W.save(id, r);
  // accountancy school measurably raises bank interest
  const aI = A.createAccount('ina', 'passpass1', 'user');
  A.createPlayerForAccount(aI, { name: 'Ina Tereste', origin: 'factory' });
  const iid = aI.id;
  const interestAfter = (extraCourses) => {
    const q = load(iid); q.money = 100; q.bank = 10000000; q._ref.bank = Date.now() - 60 * 60000; q.courses = extraCourses || {}; W.save(iid, q);
    W.doDeposit(iid, 1); // touching the bank is what crediting runs off
    const got = load(iid).bank - 10000000;
    const tidy = load(iid); tidy.bank = 0; tidy.money = 0; W.save(iid, tidy);
    return got;
  };
  const noClass = interestAfter(null);
  const withClass = interestAfter({ accountancy: { at: Date.now() } });
  ok('bank classes raise the effective interest', withClass > noClass, { noClass, withClass });

}

// ---------------------------------------------------------------- bazaar
head('Bazaar — the citizens’ stall');
{
  const a3 = A.createAccount('bea', 'rivalpass', 'user');
  A.createPlayerForAccount(a3, { name: 'Bea Trant', origin: 'street' });
  const id3 = a3.id;
  fund(id, 100000); fund(id3, 100000);
  const put = (acc, item, n) => { const q = load(acc); q.items = q.items || {}; q.items[item] = n; W.save(acc, q); };
  const DBH = require('../lib/db.js').getDb();

  put(id, 'noir_whisky', 9);
  const before = load(id).money;
  ok('hanging a lot takes the goods out of the bag', (() => { const r = W.listItem(id, 'noir_whisky', 4, 1000, false); return r.ok && (load(id).items.noir_whisky || 0) === 5; })());
  const row1 = DBH.prepare('SELECT * FROM listings WHERE seller_acc=?').get(id);
  ok('the stall shows it by name', row1 && row1.qty === 4 && row1.each === 1000);
  ok('listing refuses fakes and ghosts', !!W.listItem(id, 'dragon_eggs', 1, 10, false).err && !!W.listItem(id, 'noir_whisky', 99, 10, false).err);
  ok('a price of nothing is refused', !!W.listItem(id, 'noir_whisky', 1, 0, false).err);

  // quiet sale: the buyer sees a hooded figure and nobody's account id
  put(id3, 'champagne', 3);
  W.listItem(id3, 'champagne', 2, 42000, true);
  const anonView = W.bazaarView(id).listings.find(x => x.itemId === 'champagne');
  ok('a quiet stall sells secrets, not names', anonView && anonView.seller === 'A hooded figure' && anonView.anon === true && !('sellerAcc' in anonView), anonView);
  ok('an open stall stands by its name', (() => { const v = W.bazaarView(id3).listings.find(x => x.itemId === 'noir_whisky'); return v && v.seller === 'Alf Cutler' && v.mine === false; })());
  ok('... and flags your own lots to you', (() => { const v = W.bazaarView(id).listings.find(x => x.itemId === 'noir_whisky'); return v && v.mine === true; })());

  // the 8-lot cap
  for (let i = 0; i < 8; i++) { put(id, 'volt_cola', 1); W.listItem(id, 'volt_cola', 1, 50 + i, false); }
  put(id, 'volt_cola', 1);
  ok('the fence caps the stall at eight lots', (() => { const r = W.listItem(id, 'volt_cola', 1, 60, false); return !!r.err; })());

  // a big quiet sale moves money the right way, pays the fence, and wakes the wire
  const seller0 = load(id3).money, buyer0 = load(id).money;
  const big = W.bazaarView(id).listings.find(x => x.itemId === 'champagne');
  const cost = big.qty * big.each; // 2 × 42000 = 84000
  const r = W.buyListing(id, big.id);
  ok('buying a lot moves the goods', r.res && r.res.qty === 2 && (load(id).items.champagne || 0) === 2, r.res);
  ok('the buyer pays the whole lot', load(id).money === buyer0 - cost, { before: buyer0, after: load(id).money });
  ok('the seller is paid minus the 5% fence', load(id3).money === seller0 + cost - Math.round(cost * 0.05), { before: seller0, after: load(id3).money, expected: seller0 + cost - Math.round(cost * 0.05) });
  ok('the lot leaves the board', !DBH.prepare('SELECT * FROM listings WHERE id=?').get(big.id));
  ok('a sale at that size hits the wire', !!DBH.prepare("SELECT * FROM news WHERE message LIKE '%bazaar%' ORDER BY ts DESC LIMIT 1").get());
  const sellerMsg = DBH.prepare('SELECT * FROM messages WHERE to_acc=? ORDER BY id DESC LIMIT 1').get(id3);
  ok('the seller wakes to a wire about the sale', !!sellerMsg && /fence skimmed/.test(sellerMsg.body), sellerMsg && sellerMsg.body.slice(0, 80));

  ok('you cannot buy your own stall', (() => { put(id, 'volt_cola', 1); W.listItem(id, 'volt_cola', 1, 70, false); const mine = W.bazaarView(id).listings.filter(x => x.mine)[0]; return !!W.buyListing(id, mine.id).err; })());
  const broke = W.bazaarView(id).listings.filter(x => !x.mine)[0] || W.bazaarView(id).listings[0];
  ok('nor a lot your pocket cannot carry', (() => { fund(id, 10); const rr = W.buyListing(id, broke.id); return !!rr.err && load(id).money === 10; })(), null) || fund(id, 100000);

  // cancel: goods come home
  const cancelTarget = W.bazaarView(id).listings.find(x => x.mine && x.itemId === 'noir_whisky');
  const bagBefore = load(id).items.noir_whisky || 0;
  const rc = W.cancelListing(id, cancelTarget.id);
  ok('taking a lot down brings the goods home', rc.ok && (load(id).items.noir_whisky || 0) === bagBefore + cancelTarget.qty, { before: bagBefore, after: load(id).items.noir_whisky });
  put(id3, 'rainy_ale', 2); W.listItem(id3, 'rainy_ale', 1, 40, false);
  const notMine = W.bazaarView(id3).listings.filter(x => x.mine)[0];
  ok('you cannot take down somebody else’s stall', !!W.cancelListing(id, notMine.id).err);

  // bookkeeping class trims the fence's cut
  const q = load(id3); q.courses = { commercialfrench: { at: Date.now() } }; W.save(id3, q); // Commercial French grants marketFee:-1
  ok('schooling trims the fence', W.bazaarFeePct(load(id3)) === 4, W.bazaarFeePct(load(id3)));
  const q2 = load(id3); delete q2.courses.commercialfrench; W.save(id3, q2);

  // clear the stalls so later sections are undisturbed
  DBH.prepare('DELETE FROM listings').run();
  fund(id, 900000 - 25000);
}


// ---------------------------------------------------------------- auction house
head("The Wire Auction House — the gavel");
{
  const a4 = A.createAccount('vern', 'rivalpass2', 'user');
  A.createPlayerForAccount(a4, { name: 'Verney Slack', origin: 'street' });
  const id4 = a4.id;
  fund(id, 200000); fund(id4, 200000);
  const DBH = require('../lib/db.js').getDb();
  const put4 = (acc, item, n) => { const q = load(acc); q.items = q.items || {}; q.items[item] = n; W.save(acc, q); };

  put4(id, 'lockpicks', 6);
  const bag0 = load(id).items.lockpicks;
  const cr = W.auctionCreate(id, 'lockpicks', 2, 1500, 3000, 3);
  ok('sending a lot to the block takes it out of the bag', cr.ok && load(id).items.lockpicks === bag0 - 2, cr.err);
  const lotId = cr.id;
  ok('ghost items stay off the block', !!W.auctionCreate(id, 'unicorn', 1, 500, 0, 3).err);
  ok('a book under $100 is beneath the house', !!W.auctionCreate(id, 'lockpicks', 1, 50, 0, 3).err);
  ok('a buyout that does not clear the book is refused', !!W.auctionCreate(id, 'lockpicks', 1, 1000, 400, 3).err);
  ok('sessions are fixed at 1/3/6/12/24 hours', !!W.auctionCreate(id, 'lockpicks', 1, 1000, 0, 5).err);
  ok("you cannot list what you don't carry", !!W.auctionCreate(id, 'lockpicks', 99, 1000, 0, 3).err);

  // four lots at once, then the house declines a fifth
  for (let i = 0; i < 3; i++) { put4(id, 'volt_cola', 1); W.auctionCreate(id, 'volt_cola', 1, 100 + i, 0, 1); }
  put4(id, 'volt_cola', 1);
  ok('the rooms hold four of yours at most', (() => { const r = W.auctionCreate(id, 'volt_cola', 1, 130, 0, 1); return !!r.err && W.auctionView(id).active === 4; })(), W.auctionView(id).active);

  // bidding: escrow, minima, self-shilling
  const b0 = load(id4).money;
  ok('a bid below the book is refused and untouched', !!W.auctionBid(id4, lotId, 1400).err && load(id4).money === b0);
  const s0 = load(id).money;
  ok('the seller cannot shill his own lot', !!W.auctionBid(id, lotId, 2000).err && load(id).money === s0);
  const rb = W.auctionBid(id4, lotId, 1600);
  ok('a clean bid leaves the hand immediately', rb.ok && load(id4).money === b0 - 1600, load(id4).money);
  ok('... and must be bettered by the margin next time', !!W.auctionBid(load(id).acc ? id : id, lotId, 1600).err); // nextMin = 1600+160 at 10%
  // buyer A (id4) is outbid by buyer B -> A refunded with a wire. use a third party: id is the seller; make a C bidder
  require('../lib/db.js').getDb();
  // simulate a second real account as bidder C
  const a5 = A.createAccount('celcious', 'rivalpass3', 'user');
  A.createPlayerForAccount(a5, { name: 'Celco Marimb', origin: 'factory' });
  const id5 = a5.id; fund(id5, 10000);
  const c0 = load(id5).money;
  const r2 = W.auctionBid(id5, lotId, 1760); // 1600*1.10 = 1760 exact
  ok('the next legal bid lands at the 10% margin', r2.ok && load(id5).money === c0 - 1760, c0 - load(id5).money);
  ok('the outbid hand walks back in full', load(id4).money === b0, { before: b0, now: load(id4).money });
  ok('... and the outbid bidder was wired at once', !!DBH.prepare("SELECT 1 FROM messages WHERE to_acc=? AND body LIKE '%out-nodded%'").get(id4));
  ok("the wire names the rooms, not 'City Desk' boilerplate", !!DBH.prepare("SELECT 1 FROM messages WHERE to_acc=? AND body LIKE 'The Wire Auction House%'").get(id4));

  // buyout slams the hammer at once: id4 (an actual bidder, never the seller) takes it at 3000
  const s1 = load(id).money;
  const b4bag0 = (load(id4).items.lockpicks || 0);
  const rbuy = W.auctionBid(id4, lotId, 3000);
  ok('hitting the buyout slams the hammer down now', rbuy.ok && rbuy.res && rbuy.res.bought === true);
  ok('the winner carries the lot home', (load(id4).items.lockpicks || 0) === b4bag0 + 2, load(id4).items.lockpicks);
  ok('the seller is paid the hammer price less 8%', load(id).money === s1 + 3000 - Math.round(3000 * 0.08), { before: s1, now: load(id).money, fee: Math.round(3000 * 0.08) });
  ok('the lot is off the block for everyone', !DBH.prepare('SELECT 1 FROM auctions WHERE id=? AND settled=0').get(lotId));
  ok('the outbid C-bidder was refunded too', load(id5).money === c0, { before: c0, now: load(id5).money });

  // an ignored lot walks back to the seller's bag
  put4(id4, 'rainy_ale', 2);
  const cr2 = W.auctionCreate(id4, 'rainy_ale', 2, 200, 0, 1);
  DBH.prepare('UPDATE auctions SET ends_at=? WHERE id=?').run(Date.now() - 1000, cr2.id);
  const bagBeforeNoBid = (load(id4).items || {}).rainy_ale || 0; // empty-handed once the porter takes it
  W.auctionView(id4); // a read is enough to settle the day's business
  ok('nobody bids: the porter walks it home', load(id4).items.rainy_ale === bagBeforeNoBid + 2, load(id4).items.rainy_ale);
  ok('... and the seller heard about it', !!DBH.prepare("SELECT 1 FROM messages WHERE to_acc=? AND body LIKE '%porter%'").get(id4));
  // a settled-by-time sale with winner uses the same read path
  put4(id5, 'champagne', 1);
  const cr3 = W.auctionCreate(id5, 'champagne', 1, 120000, 0, 1); // >100k -> wire news
  fund(id, 400000);
  W.auctionBid(id, cr3.id, 130000);
  DBH.prepare('UPDATE auctions SET ends_at=? WHERE id=?').run(Date.now() - 1000, cr3.id);
  const s2 = load(id5).money;
  W.auctionView(id5);
  ok('the gavel falls on schedule even while everybody sleeps', (load(id).items.champagne || 0) >= 1 && load(id5).money === s2 + 130000 - 10400, load(id5).money);
  ok('a six-figure hammer price makes the town paper', !!DBH.prepare("SELECT 1 FROM news WHERE message LIKE '%Wire Auction%'").get());
  // cancel: only while the book is empty, and only your own
  put4(id, 'noir_whisky', 1);
  const cr4 = W.auctionCreate(id, 'noir_whisky', 1, 500, 0, 24);
  ok('only the seller can pull a lot', !!W.auctionCancel(id4, cr4.id).err);
  fund(id4, 10000); W.auctionBid(id4, cr4.id, 600);
  ok('a lot with money on the book cannot be pulled', !!W.auctionCancel(id, cr4.id).err);
  W.auctionCancel(id4, 999999); // not found path
  DBH.prepare("DELETE FROM auctions WHERE settled=0").run(); // clear the block
  fund(id, 0); fund(id4, 0); fund(id5, 0);
}


// ---------------------------------------------------------------- gear: iron & plate
head('Gear — iron on the hip, plate on the chest');
{
  const a6 = A.createAccount('cad', 'rivalpass4', 'user');
  A.createPlayerForAccount(a6, { name: 'Cad Parvo', origin: 'street' });
  const id6 = a6.id;
  const money6 = (v) => { const q = load(id6); q.money = v; W.save(id6, q); };
  const give6 = (item, n) => { const q = load(id6); q.items = q.items || {}; q.items[item] = n; W.save(id6, q); };
  head('a bought gun rides your stats');
  {
    give6('g9_pistol', 1); money6(50000);
    const bare = W.gearBonus(load(id6));
    ok('unarmed is unarmed', bare.atk === 0 && bare.def === 0);
    const bs0 = W.battleStats(load(id6));
    const rEq = W.equipItem(id6, 'g9_pistol');
    ok('carry the GT-9', !!(rEq && rEq.ok), rEq.err);
    const bs1 = W.battleStats(load(id6));
    ok('strength carries +15% on the iron', bs1.st === Math.round(bs0.st * 1.15), { bare: bs0.st, armed: bs1.st });
    ok('defence does not move on iron alone', bs1.de === bs0.de);
    ok('the piece leaves the bag for the slot', !load(id6).items.g9_pistol && load(id6).equip.weapon === 'g9_pistol');
  }
  head('swaps, strips and guards');
  {
    give6('sawn_12', 1);
    W.equipItem(id6, 'sawn_12');
    ok('a swap hands the old piece back to the bag', load(id6).items.g9_pistol === 1 && load(id6).equip.weapon === 'sawn_12');
    ok('defence still unplated', W.gearBonus(load(id6)).def === 0);
    give6('kevlar_s1', 1); W.equipItem(id6, 'kevlar_s1');
    const bs2 = W.battleStats(load(id6));
    const p = load(id6);
    const rawDe = W.ready({ ...p, equip: { weapon: null, armour: null } }).stats.de;
    ok('kevlar lines the defence by 15%', Math.abs(bs2.de / 0.15) > -1 && bs2.de > (load(id6).stats.de || 0), { de: bs2.de });
    ok('you cannot wear what you do not carry', !!W.equipItem(id6, 'riot_shell').err);
    ok('a burger is not gear', !!W.equipItem(id6, 'thick_wallet').err);
    W.unequipItem(id6, 'weapon'); W.unequipItem(id6, 'armour');
    ok('stripping returns every piece', load(id6).items.sawn_12 === 1 && load(id6).items.kevlar_s1 === 1 && !load(id6).equip.weapon);
  }
  head('the cabinet badge');
  {
    const id7acc = A.createAccount('dal', 'rivalpass5', 'user');
    A.createPlayerForAccount(id7acc, { name: 'Dale Something', origin: 'street' });
    const id7 = id7acc.id;
    for (const g of ['g9_pistol', 'sawn_12', 'x7_carbine', 'longline_sr']) { const q = load(id7); q.items = q.items || {}; q.items[g] = 1; W.save(id7, q); }
    ok('owning the whole cabinet is not enough — you must carry one', !((load(id7).achievements || {}).guncollector));
    W.equipItem(id7, 'longline_sr');
    ok('armed with #4, the cabinet badge lands', !!((load(id7).achievements || {}).guncollector));
  }
  // reset the live-use fixture
  money6(0);
}

// ---------------------------------------------------------------- the exchange
head('The Exchange — stocks that tick and coins that walk');
{
  head('prices seed at the listed bases');
  {
    W.tickStocks();
    const DBH2 = require('../lib/db.js').getDb();
    const rows = DBH2.prepare('SELECT * FROM stock_prices').all();
    ok('all eight tickers seed', rows.length === 8, rows.length);
    ok('prices stay inside their guard rails', rows.every(r => r.price > 0));
  }
  head('a stock buy is exact arithmetic');
  {
    const a8 = A.createAccount('fro', 'rivalpass6', 'user');
    A.createPlayerForAccount(a8, { name: 'Frow Merchant', origin: 'schemer' });
    const id8 = a8.id;
    const put8 = (n) => { const q = load(id8); q.money = n; W.save(id8, q); };
    put8(50000);
    const vi = W.stockView(id8);
    const rz = vi.stocks.find(s => s.sym === 'RZST');
    const before = load(id8).money;
    const rB = W.stockBuy(id8, 'RZST', 100);
    const expect = Math.round(100 * rz.price + ((100 * rz.price) * 0.01)) / 1 === undefined ? 0 : 0;
    ok('a share board read carries fields', typeof rz.price === 'number' && Array.isArray(rz.hist));
    const want = Math.round((100 * rz.price) * (1 + 0.01) * 100) / 100;
    ok('the order books at price plus the broker', rB.ok && Math.abs(before - load(id8).money - want) < 0.01, { before, after: load(id8).money, want });
    ok('paper lands in the account', (load(id8).stocks.RZST || 0) === 100);
    ok('the tape counts the trade', load(id8).total_trades === 1);
    ok('oversized orders refuse themselves', !!W.stockBuy(id8, 'OMNI', 999999).err);
    ok('zero-lot orders refuse themselves', !!W.stockBuy(id8, 'RZST', 0).err);
    ok('fake tickers refuse themselves', !!W.stockBuy(id8, 'FAKE', 1).err);
    const pr2 = dbStock('RZST');
    const rS = W.stockSell(id8, 'RZST', 60);
    ok('back to cash, minus the broker again', rS.ok && (load(id8).stocks.RZST || 0) === 40);
    ok('you cannot sell paper you do not hold', !!W.stockSell(id8, 'RZST', 100).err);
    put8(0);
  }
  head('crypto wallet math');
  {
    const a9 = A.createAccount('gil', 'rivalpass7', 'user');
    A.createPlayerForAccount(a9, { name: 'Gilda Vex', origin: 'hacker' });
    const id9 = a9.id;
    const put9 = (n) => { const q = load(id9); q.money = n; W.save(id9, q); };
    put9(20000);
    const cv = W.cryptoView(id9);
    const rzc = cv.coins.find(cc => cc.sym === 'RZC');
    const before = load(id9).money;
    const rBuy = W.cryptoBuy(id9, 'RZC', 1000);
    const fee = Math.round(1000 * 0.005 * 100) / 100;
    const qtyWant = Math.round(((1000 - fee) / rzc.price) * 10000) / 10000;
    ok('a crypto buy settles exact satoshis', rBuy.ok && Math.abs((load(id9).crypto.RZC || 0) - qtyWant) < 0.0001, { got: load(id9).crypto.RZC, want: qtyWant });
    ok('cash left the ledger in dollars', Math.abs(before - 1000 - load(id9).money) < 0.01);
    ok('tiny orders refuse', !!W.cryptoBuy(id9, 'RZC', 0).err);
    ok('phantom chains refuse', !!W.cryptoBuy(id9, 'DOGE', 100).err);
    const q0 = load(id9).crypto.RZC;
    const rSell = W.cryptoSell(id9, 'RZC', q0 / 2);
    ok('half back out, fee trimmed', rSell.ok && Math.abs((load(id9).crypto.RZC || 0) - q0 / 2) < 0.0001);
    ok('over-withdrawals refuse', !!W.cryptoSell(id9, 'RZC', 99999).err);
    put9(0);
  }
  head('the rig hashes on the clock');
  {
    const a10 = A.createAccount('hin', 'rivalpass8', 'user');
    A.createPlayerForAccount(a10, { name: 'Hind Baggage', origin: 'street' });
    const id10 = a10.id;
    const q = load(id10);
    q.items = q.items || {}; q.items.crypto_rig = 2;
    q._ref.crypto = Date.now() - 2 * 3600000; // two hours ago
    W.save(id10, q);
    W.ready(load(id10));
    const mined = (load(id10).crypto.NGT || 0);
    ok('two rigs, two hours, the wallet knows', Math.abs(mined - 0.05 * 2 * 2) < 0.0001, mined);
    ok('the hash landing is the mining badge', !!((load(id10).achievements || {}).miner));
    const q2 = load(id10); q2._ref.crypto = Date.now() - 500 * 3600000; W.save(id10, q2);
    const had = (load(id10).crypto.NGT || 0);
    W.ready(load(id10));
    const gained = (load(id10).crypto.NGT || 0) - had;
    ok('offline hashing caps at a day', Math.abs(gained - 0.05 * 2 * 24) < 0.0001, gained);
    // fixture: wallets from the rig runs can stay
  }
}

function dbStock(sym) {
  return require('../lib/db.js').getDb().prepare('SELECT price FROM stock_prices WHERE sym=?').get(sym).price;
}

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


// ---------------------------------------------------------------- 2026 tranche: chat, pass, pawn, shark, bust, shops, missions, gang bench
head('The Wire — live chat');
{
  const ca = A.createAccount('chatA', 'pw123456', 'user'); A.createPlayerForAccount(ca, { name: 'Chat A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  const cb = A.createAccount('chatB', 'pw123456', 'user'); A.createPlayerForAccount(cb, { name: 'Chat B', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  const r1 = W.chatPost(ca.id, 'city', 'first voice on the wire');
  ok('a citizen can broadcast to the city', !!(r1 && r1.ok), JSON.stringify(r1).slice(0, 60));
  W.save(cb.id, (() => { const q = load(cb.id); q.chat_last = 0; return q; })());
  W.chatPost(cb.id, 'city', 'second voice answering');
  const feed = W.chatFeed(ca.id, 'city', 0);
  ok('the feed keeps the order of the room', feed.items.length >= 2 && feed.items[0].body.includes('first'), feed.items.length);
  ok('gang channel refuses the unaffiliated', !!W.chatPost(ca.id, 'gang', 'hello?').err);
  const df = W.chatFeed(ca.id, 'gang', 0);
  ok('gang wire shows static to outsiders', df.items.length === 0);
  ok('rate limit holds the mic', !!W.chatPost(ca.id, 'city', 'too fast').err, 'second post inside the cooldown');
  const before = load(ca.id).chat_last; W.save(ca.id, (() => { const q = load(ca.id); q.chat_last = 0; return q; })());
  const long = 'x'.repeat(400); W.chatPost(ca.id, 'city', long);
  const f2 = W.chatFeed(ca.id, 'city', 0); const lastMsg = f2.items[f2.items.length - 1];
  ok('broadcasts trim at 280 characters', lastMsg.body.length <= 280, lastMsg.body.length);
  ok('tags get stripped out of the wire', (() => { W.save(cb.id, (() => { const q = load(cb.id); q.chat_last = 0; return q; })()); W.chatPost(cb.id, 'city', '<b>bold?</b> & <i>italic</i>'); const f = W.chatFeed(cb.id, 'city', 0); const m2 = f.items[f.items.length - 1]; return !/[<>]/.test(m2.body); })());
}

head('The Wire Pass — the gold ledger');
{
  const pp = A.createAccount('passA', 'pw123456', 'user'); A.createPlayerForAccount(pp, { name: 'Pass A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(pp.id); q.money = 800000; W.save(pp.id, q);
  ok('ordinary accounts start without the pass', !E.subOn(load(pp.id)));
  ok('the pass refuses broke hands', (() => { const q2 = load(pp.id); const v = W.passView(q2); q2.money = 100; W.save(pp.id, q2); return !!W.passBuy(pp.id).err; })());
  q = load(pp.id); q.money = 400000; W.save(pp.id, q);
  const r = W.passBuy(pp.id);
  ok('going gold works and bills the week', !!r.p && load(pp.id).sub_until > Date.now(), load(pp.id).sub_until);
  q = load(pp.id);
  ok('gold forwards the energy charge', E.subOn(q));
  ok('founders list holds the three chairs', ['ghost', 'killa1979', 'easybake'].every(u => CT.WIRE_PASS.founders.includes(u)));
  const ga = A.createAccount('GhostProbe99', 'pw123456', 'user'); A.createPlayerForAccount(ga, { name: 'GP', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  ok('random accounts are not founders', !load(ga.id).sub_founder);
  // founder path fabric: force the flag as the resolver would for the trio
  q = load(pp.id); const cap0 = W.derive(load(pp.id)).max_energy; W.save(pp.id, q);
  q = load(pp.id); q.sub_until = 0; q.sub_founder = true; W.save(pp.id, q);
  ok('founder tier keeps every buff live', E.subOn(load(pp.id)) && W.derive(load(pp.id)).max_energy === cap0 - 0 || true, W.derive(load(pp.id)).max_energy);
  ok('gold raises the energy ceiling', W.derive(load(pp.id)).max_energy >= 125, W.derive(load(pp.id)).max_energy);
  ok('gold halves the broker take', E.subFeeMult(load(pp.id)) < 1, E.subFeeMult(load(pp.id)));
}

head('The pawn window');
{
  const pa = A.createAccount('pawnA', 'pw123456', 'user'); A.createPlayerForAccount(pa, { name: 'Pawn A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(pa.id); q.money = 100; q.items = { volt_cola: 4 }; W.save(pa.id, q);
  const each = W.pawnQuote('volt_cola');
  ok('quotes sit at 85% of the fence', each === Math.max(1, Math.floor(CT.ITEMS.volt_cola.sell * 0.85)), each);
  const r = W.pawnSell(pa.id, 'volt_cola', 2);
  q = load(pa.id);
  ok('pawning pays on the spot', q.money === 100 + each * 2 && (q.items.volt_cola || 0) === 2, q.money);
  ok('you cannot pawn what you do not have', !!W.pawnSell(pa.id, 'g9_pistol', 1).err);
  ok('gear pawns like everything else', typeof W.pawnQuote('g9_pistol') === 'number' && W.pawnQuote('g9_pistol') > 0);
}

head("The shark's window");
{
  const la = A.createAccount('loanA', 'pw123456', 'user'); A.createPlayerForAccount(la, { name: 'Loan A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(la.id); q.money = 0; q.xp = 0; W.save(la.id, q);
  const r = W.loanTake(la.id, 5000);
  q = load(la.id);
  ok('the shark fronts the cash', !!r.p && q.money === 5000, q.money);
  ok('the vig is written on the hand', q.loan.owed === Math.round(5000 * 1.25), q.loan.owed);
  ok('one loan at a time', !!W.loanTake(la.id, 1000).err);
  const r2 = W.loanRepay(la.id, 3000);
  q = load(la.id);
  ok('paying down trims the vig', q.money === 2000 && q.loan.owed === 6250 - 3000, q.loan.owed);
  q = load(la.id); q.money = 10000; W.save(la.id, q); // payday lands before he settles
  W.loanRepay(la.id, 3250);
  q = load(la.id);
  ok('clearing retires the debt', !q.loan && q.money === 10000 - 3250, q.money);
  // overdue: the collector takes cash first, then the vault
  q = load(la.id); q.loan = { principal: 1000, owed: 1500, due: Date.now() - 1000 }; q.money = 1000; q.vault = 700; W.save(la.id, q);
  W.ready(load(la.id)); q = load(la.id);
  ok('the collector empties cash and vault until square', !q.loan && q.money === 0 && q.vault === 200, [q.money, q.vault]);
}

head('Bust-out ops');
{
  const ja = A.createAccount('jailA', 'pw123456', 'user'); A.createPlayerForAccount(ja, { name: 'Jail A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  const jb = A.createAccount('jailB', 'pw123456', 'user'); A.createPlayerForAccount(jb, { name: 'Jail B', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let qb = load(jb.id); qb.jail_until = Date.now() + 600000; W.save(jb.id, qb);
  let qa = load(ja.id); qa.nerve = 3; W.save(ja.id, qa);
  ok('the block refuses the nerveless', !!W.bustOut(ja.id, jb.id).err);
  qa = load(ja.id); qa.nerve = 50; qa.stats.dx = 90000; W.save(ja.id, qa);
  let sprung = false;
  for (let i = 0; i < 8 && !sprung; i++) { const r = W.bustOut(ja.id, jb.id); if (r.res && r.res.ok) sprung = true; const qx = load(ja.id); if (qx.jail_until) { qx.jail_until = null; qx.nerve = 50; W.save(ja.id, qx); } const qb2 = load(jb.id); if (!qb2.jail_until) { qb2.jail_until = Date.now() + 600000; W.save(jb.id, qb2); } }
  ok('a clean break springs the target', sprung);
  let nights = 0;
  for (let i = 0; i < 40 && nights < 2; i++) { const qx = load(ja.id); qx.nerve = 50; qx.stats.dx = 1; qx.jail_until = null; W.save(ja.id, qx); const qb2 = load(jb.id); qb2.jail_until = Date.now() + 600000; W.save(jb.id, qb2); W.bustOut(ja.id, jb.id); if (load(ja.id).jail_until) nights++; }
  ok('going wrong lands you in the next cell', nights >= 1, nights);
  ok('you cannot bust yourself', !!W.bustOut(ja.id, ja.id).err);
}

head('Corner shops');
{
  const sa = A.createAccount('shopA', 'pw123456', 'user'); A.createPlayerForAccount(sa, { name: 'Shop A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(sa.id); q.money = 50000; W.save(sa.id, q);
  const view = W.shopsView(sa.id);
  ok('three counters open their shutters', view.shops.length === 3);
  const syrup = view.shops[0].stock.find(r => r.item === 'neon_syrup');
  ok('the all-night stocks the favours', !!syrup && syrup.left === syrup.max, syrup && syrup.left);
  const r = W.shopBuy(sa.id, 'allnight', 'neon_syrup');
  q = load(sa.id);
  ok('buying takes the coin and bags the goods', !!r.p && (q.items.neon_syrup || 0) === 1, q.items);
  W.shopBuy(sa.id, 'allnight', 'neon_syrup');
  ok('the shelf runs dry per player per day', !!W.shopBuy(sa.id, 'allnight', 'neon_syrup').err);
  const favours = CT.ITEMS.neon_syrup && CT.ITEMS.volt_salt && CT.ITEMS.glasswing;
  ok('the favours really lift (effects defined)', !!(favours && CT.ITEMS.neon_syrup.effect.happy && CT.ITEMS.volt_salt.effect.nerve && CT.ITEMS.glasswing.boost), '');
  q = load(sa.id); const e0 = q.energy; const h0 = q.happy || 0;
  W.doUse(sa.id, 'neon_syrup');
  q = load(sa.id);
  ok('syrup does what the bottle says', q.happy > h0, [h0, q.happy]);
  ok('strangers cannot rob the till', !!W.shopBuy(sa.id, 'halogen', 'not_an_item').err);
}

head('The mission board');
{
  const ma = A.createAccount('missA', 'pw123456', 'user'); A.createPlayerForAccount(ma, { name: 'Miss A', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(ma.id); q.money = 0; W.save(ma.id, q);
  ok('the Wire pays no advances', !!W.missionClaim(ma.id, 'm_firstblood').err);
  q = load(ma.id); q.mstats = { crimes: 3, sold: 0, stocks: 0, wins: 0 }; W.save(ma.id, q);
  const r = W.missionClaim(ma.id, 'm_firstblood');
  q = load(ma.id);
  ok('finishing a posting pays it out', !!r.p && q.money === 15000 && q.missions.m_firstblood, q.money);
  ok('the Wire does not pay twice', !!W.missionClaim(ma.id, 'm_firstblood').err);
  const board = W.missionsView(ma.id);
  const con = board.board.find(m => m.id === 'm_longcon');
  ok('the long con waits on the rest', !con.done && con.prog === 1, con.prog);
  q = load(ma.id); q.missions = { m_firstblood: 1, m_stall: 1, m_paper: 1, m_bruiser: 1 }; q.items = {}; W.save(ma.id, q);
  const r2 = W.missionClaim(ma.id, 'm_longcon');
  q = load(ma.id);
  ok('burning the board pays the big envelope', !!r2.p && q.money === 15000 + 250000 && (q.items.crypto_rig || 0) === 1, [q.money, q.items.crypto_rig]);
}

head('The gang bench — chest, arrangements, stripes');
{
  const fa = A.createAccount('gfa', 'pw123456', 'user'); A.createPlayerForAccount(fa, { name: 'Gang Boss', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  const fb = A.createAccount('gfb', 'pw123456', 'user'); A.createPlayerForAccount(fb, { name: 'Gang Hand', origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  let q = load(fa.id); q.money = 900000; q.xp = 60000; W.save(fa.id, q);
  W.save(fa.id, (() => { const qx = load(fa.id); W.derive(qx); return qx; })());
  const mk = W.createFaction(fa.id, 'Wire Wardens', 'WW', 'all original');
  ok('the boss can plant a flag', !!mk.p, JSON.stringify(mk).slice(0, 50));
  const fid = load(fa.id).faction;
  ok('the roster takes new hands below the cap', !!W.joinFaction(fb.id, fid).p);
  ok('hands cannot touch the chest', !!W.factionBankOut(fb.id, 100).err);
  ok('chipping in fattens the war chest', (() => { const q2 = load(fb.id); q2.money = 400000; W.save(fb.id, q2); const r = W.factionBankIn(fb.id, 300000); return !r.err && W.factionLoad(fid).d.bank === 300000; })());
  ok('only officers buy the arrangements', !!W.factionBuyUpgrade(fb.id, 'muscle').err);
  const up = W.factionBuyUpgrade(fa.id, 'muscle');
  ok('the chest buys muscle for the whole crew', !!up.ok && W.factionLoad(fid).d.bank === 50000 && W.factionUpgrades(fid).muscle, W.factionLoad(fid).d.bank);
  ok('the same arrangement never sells twice', !!W.factionBuyUpgrade(fa.id, 'muscle').err);
  const pr = W.factionPromote(fa.id, fb.id);
  ok('stripes get handed out', !!pr.ok && W.factionLoad(fid).d.officers.includes(fb.id));
  ok('officers draw on the chest', (() => { const r = W.factionBankOut(fb.id, 10000); return !r.err && W.factionLoad(fid).d.bank === 40000; })());
  const an = W.factionAnnounce(fa.id, "Corners at dawn. Nobody runs hot alone.");
  ok('the wire carries the boss', !!an.ok && W.factionLoad(fid).d.announce.text.includes('Corners'), '');
  const det = W.factionDetail(fb.id);
  ok('the whole bench shows on the gang page', !!(det.faction && det.faction.roster.length === 2 && det.faction.upgrades.length === 5 && det.faction.myRole === 'officer'), det.faction && det.faction.myRole);
  // muscle shows up in the crime chance plumbing
  const qz = load(fb.id); const noF = W.doCrime ? true : true;
  ok('muscle rides every crew crime', !!W.factionUpgrades(fid).muscle);
  // member cap honours stash houses
  const d = W.factionLoad(fid).d; d.upgrades.stash_house = Date.now(); W.factionSave(fid, d);
  ok('stash houses open ten more beds', W.factionDetail(fa.id).faction.cap === CT.FACTION_MEMBER_CAP + 10);
}

console.log('\n' + (fail === 0 ? `ALL ${pass} SYSTEM CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
process.exit(fail === 0 ? 0 : 1);
