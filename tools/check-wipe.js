#!/usr/bin/env node
/* Razor Town — does an account wipe actually stick?
 *
 *   node tools/check-wipe.js
 *
 * Builds a THROWAWAY world in /tmp (never the live ledger), inflates the founder with
 * money, items, a gang, turf, a bazaar stall, an auction lot and a bounty on its head,
 * then runs the real wipe and asserts that:
 *   • the account is left as a blank recruit, with its login, name and look intact;
 *   • nobody else pays for it — a bounty they posted is cancelled, a bounty on their
 *     head is refunded, escrowed bids on their lots go back to the bidders, the empty
 *     crew folds, turf is freed, and other citizens keep their own progress;
 *   • --dry-run changes nothing;
 *   • a full boot afterwards does NOT put the level 100 / $500M founder demo back, and
 *     `node tools/founder.js god` (createFounder({force:true})) still can.
 */
'use strict';
process.env.DB_PATH = process.env.DB_PATH || '/tmp/razor-wipe-check/world.db';
const fs = require('fs');
const path = require('path');
try { fs.rmSync(path.dirname(process.env.DB_PATH), { recursive: true, force: true }); } catch (e) {}

const dbm = require('../lib/db.js');
dbm.init();
const db = dbm.getDb();
const W = require('../lib/world.js');
const A = require('../lib/accounts.js');
const S = require('../lib/systems.js');
const V = require('../lib/wipe.js');
S.attach(W);
const boot = require('../lib/bootstrap.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  \u2713 ' + name); }
  else { fail++; console.log('  \u2717 ' + name + (detail !== undefined ? '   \u2192 ' + JSON.stringify(detail) : '')); }
};
const head = (t) => console.log('\n' + t);
const load = (a) => W.normalize(W.load(a));
const json = (a) => JSON.parse(db.prepare('SELECT json FROM players WHERE acc_id=?').get(a).json);

// ---------------------------------------------------------------- fixtures
head('-- fixtures: a founder with everything --');
boot.ensureWorld({ bots: 0 });
const gid = db.prepare("SELECT id FROM accounts WHERE username='ghost'").get().id;
const uid = A.createAccount('victim', 'rivalpass', 'user').id;
A.createPlayerForAccount({ id: uid }, { name: 'Ned Slater', origin: 'factory' });
let vp = load(uid); vp.money = 100000; vp.bank = 100000; W.save(uid, vp);

let g = load(gid);
g.money = 500000000; g.bank = 500000000; g.vault = 123456; g.reputation = 50000000;
g.property = 'manor'; g.property_up = ['stove']; g.items.pink_diamond = 3;
g.stocks = { NIB: 40 }; g.crypto = { BIL: 12 }; g.achievements['first_blood'] = Date.now();
g.merits = 40; g.perks = { energy: 2 }; g.courses = { bookkeeping: Date.now() };
g.sys = { friends: [], blocked: [], cars: ['ratrod'], turf: { influence: 900, collected: 5, lastCollect: 0 } };
W.save(gid, g);
const gang = W.createFaction(gid, 'Ghost Syndicate', 'GSY', 'the boss crew');
ok('the founder founds a crew, holds turf and is worth $1bn+', !gang.err && !!json(gid).faction);
db.prepare('INSERT OR REPLACE INTO turf (district, acc_id, since) VALUES (?,?,?)').run('underpass', gid, Date.now());
db.prepare('INSERT INTO listings (seller_acc, seller_name, item_id, qty, each, ts) VALUES (?,?,?,?,?,?)').run(gid, 'Ghost', 'pink_diamond', 2, 40000, Date.now());
// a lot Ned is selling that Ghost is currently winning — 9,000 of Ghost's cash in escrow
db.prepare('INSERT INTO auctions (seller_acc, item_id, qty, min_bid, buyout, cur_bid, bidder_acc, ends_at, settled, ts) VALUES (?,?,?,?,?,?,?,?,0,?)')
  .run(uid, 'ice_ring', 1, 1000, null, 9000, gid, Date.now() + 3600000, Date.now());
// and one Ghost is selling that Ned is winning — the house holds Ned's money
db.prepare('INSERT INTO auctions (seller_acc, item_id, qty, min_bid, buyout, cur_bid, bidder_acc, ends_at, settled, ts) VALUES (?,?,?,?,?,?,?,?,0,?)')
  .run(gid, 'pink_diamond', 1, 1000, null, 25000, uid, Date.now() + 3600000, Date.now());
db.prepare('INSERT INTO bounties (target_acc, target_name, amount, from_acc, from_name, anon, ts) VALUES (?,?,?,?,?,?,?)')
  .run(gid, 'Ghost', 50000, uid, 'Ned Slater', 0, Date.now());
db.prepare('INSERT INTO bounties (target_acc, target_name, amount, from_acc, from_name, anon, ts) VALUES (?,?,?,?,?,?,?)')
  .run(uid, 'Ned Slater', 5000, gid, 'Ghost', 0, Date.now());
db.prepare('INSERT INTO messages (from_acc, from_name, to_acc, body, ts, read) VALUES (?,?,?,?,?,?)').run(uid, 'Ned Slater', gid, 'you owe me', Date.now(), 0);
db.prepare('INSERT INTO chat (chan, acc, name, avatar, body, ts) VALUES (?,?,?,?,?,?)').run('town', gid, 'Ghost', '', 'sup', Date.now());
db.prepare('INSERT INTO news (ts, kind, icon, message) VALUES (?,?,?,?)').run(Date.now(), 'crime', '\uD83D\uDCB0', 'Ghost pulled off a big job.');

// ---------------------------------------------------------------- dry run
head('-- --dry-run changes nothing --');
const moneyBefore = json(gid).money;
const dry = V.wipe('ghost', { dryRun: true });
ok('the report reads the account as it stands', dry.before.money === moneyBefore && moneyBefore > 400000000, dry.before.money);
ok('the account itself is untouched', json(gid).money === moneyBefore);
ok('the bounty board, the block and the stall are untouched',
  db.prepare('SELECT COUNT(*) c FROM bounties').get().c === 2 && db.prepare('SELECT COUNT(*) c FROM auctions').get().c === 2 && db.prepare('SELECT COUNT(*) c FROM listings').get().c === 1);
ok('no wipe lock is set', db.prepare('SELECT wiped FROM accounts WHERE id=?').get(gid).wiped === 0);

// ---------------------------------------------------------------- the wipe
head('-- the wipe: back to a blank citizen --');
const r = V.wipe('ghost', {});
const p = json(gid);
ok('cash, bank and the safe are all zero', p.money === 0 && p.bank === 0 && p.vault === 0, [p.money, p.bank, p.vault]);
ok('the bag is empty', Object.keys(p.items).length === 0, p.items);
ok('level 1 with recruit stats and no record',
  (p.level == null ? 1 : p.level) === 1 && p.total_crimes === 0 && p.wins === 0 && p.losses === 0, p.xp);
ok('reputation, achievements, merits, perks and college cleared',
  p.reputation === 0 && Object.keys(p.achievements).length === 0 && p.merits === 0 &&
  Object.keys(p.perks).length === 0 && Object.keys(p.courses).length === 0);
ok('holdings, crypto and any loan are gone', Object.keys(p.stocks).length === 0 && Object.keys(p.crypto).length === 0 && !p.loan);
ok('sold up and back in the flatlet', p.property === 'shack' && (p.property_up || []).length === 0);
ok('gang seat vacated and turf freed', !p.faction && r.gone.turf === 1);
ok('a crew left with nobody in it folds', db.prepare('SELECT COUNT(*) c FROM factions').get().c === 0);
ok('nobody is in gaol or the ward', !p.jail_until && !p.hosp_until);
ok('the founder Wire Pass is cancelled too', p.sub_founder === false && !(p.sub_until > Date.now()));
ok('every 2026 system reset with it (cars, hustle ledgers, arcade)', !p.sys || Object.keys(p.sys).length === 0, p.sys);
ok('the login, name, look and bio survived',
  db.prepare('SELECT username FROM accounts WHERE id=?').get(gid).username === 'ghost' &&
  p.name === 'Ghost' && !!p.avatar && (p.bio || '').length > 5, [p.name, p.bio]);
ok('the tutorial is on offer again, like any fresh recruit', p.seen_tutorial === false);
ok('their bazaar stall came down', r.gone.listings === 1 && db.prepare('SELECT COUNT(*) c FROM listings').get().c === 0);
ok('their telegrams and chat lines are gone',
  r.gone.messages === 1 && db.prepare('SELECT COUNT(*) c FROM messages WHERE to_acc=? OR from_acc=?').get(gid, gid).c === 0 &&
  db.prepare('SELECT COUNT(*) c FROM chat WHERE acc=?').get(gid).c === 0, r.gone);

// ---------------------------------------------------------------- the neighbours
head('-- nobody else pays for it --');
const v = json(uid);
ok('the bounty they posted on the founder is refunded, as is their escrowed bid', v.money === 100000 + 50000 + 25000, v.money);
const theirLot = db.prepare('SELECT settled, cur_bid, bidder_acc FROM auctions WHERE seller_acc=?').get(uid);
ok("the lot they were bidding on is back to no bids, still on the block",
  theirLot && theirLot.settled === 0 && theirLot.cur_bid === 0 && theirLot.bidder_acc === null, theirLot);
ok('the house holds nobody\'s money', db.prepare('SELECT COUNT(*) c FROM auctions WHERE settled=0 AND bidder_acc IS NOT NULL').get().c === 0);
ok('their own progress is untouched', v.bank === 100000 && v.reputation === 0, v.bank);
ok('they were told what happened', db.prepare('SELECT COUNT(*) c FROM messages WHERE to_acc=? AND body LIKE ?').get(uid, '%Ghost%').c >= 1);
ok('the town wire keeps its history', db.prepare('SELECT COUNT(*) c FROM news WHERE message LIKE ?').get('%big job%').c === 1);
ok('...and it reported the reset', db.prepare("SELECT COUNT(*) c FROM news WHERE message LIKE '%wiped to nothing%'").get().c === 1);

// ---------------------------------------------------------------- the lock
head('-- the lock: a reboot must not refill it --');
ok('accounts.wiped is set', db.prepare('SELECT wiped FROM accounts WHERE id=?').get(gid).wiped === 1);
const again = boot.ensureWorld({ bots: 0 });
ok('bootstrap reports the founder as locked, not topped up', again.founder && again.founder.locked === true, again.founder);
ok('still broke after a full boot', json(gid).money === 0 && json(gid).bank === 0, json(gid).money);
ok('still level 1', (json(gid).level == null ? 1 : json(gid).level) === 1);
ok('a second boot is just as quiet', boot.ensureWorld({ bots: 0 }).founder.locked === true && json(gid).money === 0);
const pw = db.prepare('SELECT pass_hash FROM accounts WHERE id=?').get(gid).pass_hash;
boot.ensureWorld({ bots: 0, resetFounder: true });
ok('a password reset still works while locked', db.prepare('SELECT pass_hash FROM accounts WHERE id=?').get(gid).pass_hash !== pw);
ok('...without touching the balance', json(gid).money === 0);

// ---------------------------------------------------------------- undo
head('-- an operator can still bring the demo back --');
const god = boot.createFounder({ force: true });
ok('founder.js god overrides the lock', god.locked !== true && god.money > 100000000, god.money);
ok('the demo citizen is maxed again', json(gid).money === 250000000 && (json(gid).stats || {}).st === 500000, json(gid).stats);
ok('the lock was cleared with it', db.prepare('SELECT wiped FROM accounts WHERE id=?').get(gid).wiped === 0);
const r2 = V.wipe('ghost', { likeNew: true });
ok('--like-new hands over the standard recruit start', r2.after.money === 2500 && Object.keys(json(gid).items).length > 0, json(gid).money);
ok('and the lock goes back on', db.prepare('SELECT wiped FROM accounts WHERE id=?').get(gid).wiped === 1);

// ---------------------------------------------------------------- refusals
head('-- guard rails --');
let threw = false;
try { V.wipe('nobody_at_all', {}); } catch (e) { threw = /No account/.test(e.message); }
ok('an unknown name is refused, loudly', threw);
db.prepare('INSERT OR REPLACE INTO accounts (id, username, pass_hash, salt, kind, created_at) VALUES (-999,?,?,?,\'bot\',?)').run('~bot999', 'x', 'x', Date.now());
let botErr = '';
try { V.wipe(-999, {}); } catch (e) { botErr = e.message; }
ok('an NPC account is refused (that is purge-npcs work)', /NPC account/.test(botErr), botErr);
db.prepare('DELETE FROM accounts WHERE id=-999').run();
ok('an untouched citizen still plays on', (() => { const q = json(uid); return q.money === 175000 && !!q.name; })());
// --purge-news on a fresh name: the wire keeps everyone else's lines
const kid = A.createAccount('third', 'rivalpass', 'user').id;
A.createPlayerForAccount({ id: kid }, { name: 'Tiny Hall', origin: 'street' });
db.prepare('INSERT INTO news (ts, kind, icon, message) VALUES (?,?,?,?)').run(Date.now(), 'crime', '\uD83D\uDCB0', 'Tiny Hall did a crime.');
db.prepare('INSERT INTO news (ts, kind, icon, message) VALUES (?,?,?,?)').run(Date.now(), 'crime', '\uD83D\uDCB0', 'Ghost did another crime.');
const purged = V.wipe('third', { purgeNews: true, news: false });
ok('--purge-news scrubs only their own lines', purged.gone.news === 1 &&
  db.prepare("SELECT COUNT(*) c FROM news WHERE message LIKE '%Tiny Hall%'").get().c === 0 &&
  db.prepare("SELECT COUNT(*) c FROM news WHERE message LIKE '%Ghost did another%'").get().c === 1, purged.gone);
ok('--news=false writes nothing about the reset', db.prepare("SELECT COUNT(*) c FROM news WHERE message LIKE '%Tiny Hall was wiped%'").get().c === 0);

console.log('\n' + (fail ? '\u2717 ' + fail + ' of ' + (pass + fail) + ' checks FAILED' : '\u2713 all ' + pass + ' wipe checks passed') + '\n');
process.exit(fail ? 1 : 0);
