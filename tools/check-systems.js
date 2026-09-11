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
