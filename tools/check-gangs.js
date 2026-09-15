#!/usr/bin/env node
/* Razor Town — deep check for the expanded gang bench (wars, armory, ranks,
 * invites, rebrands, levels, chains, wired upgrade effects) + the founder
 * fresh-reset path.
 *
 * Runs against a THROWAWAY world so it can never touch the live ledger:
 *   DB_PATH=/tmp/check/gangs.db node tools/check-gangs.js
 *
 * Every assertion prints PASS/FAIL and the process exits non-zero if anything fails.
 */
'use strict';
process.env.DB_PATH = process.env.DB_PATH || '/tmp/razor-check-gangs/world.db';
const fs = require('fs');
try { fs.rmSync(process.env.DB_PATH, { force: true }); } catch (e) {}

const dbm = require('../lib/db.js');
dbm.init();
const W = require('../lib/world.js');
const CT = require('../lib/game/content.js');
const A = require('../lib/accounts.js');
const B = require('../lib/bootstrap.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '   → ' + JSON.stringify(detail) : '')); }
};
const head = (t) => console.log('\n' + t);

// ---------------------------------------------------------------- fixtures
const mk = (user, name) => {
  const a = A.createAccount(user, 'pw123456', 'user');
  A.createPlayerForAccount(a, { name, origin: 'street', avatar: '0|0|0|0|0', bio: '' });
  return a.id;
};
const load = (a) => W.normalize(W.load(a));
const level5 = (a) => { const q = load(a); q.money = 900000; q.xp = 60000; W.save(a, q); const qx = load(a); W.derive(qx); W.save(a, qx); };
const fund = (a, n) => { const q = load(a); q.money = n; W.save(a, q); };
const topUp = (a) => { const q = load(a); q.energy = 100; q.nerve = 100; q.money = Math.max(q.money, 200000); q.jail_until = null; q.hosp_until = null; W.save(a, q); };
const realRandom = Math.random;

const boss = mk('ga_boss', 'Boss Mori');
const off = mk('ga_off', 'Off Lena');
const mem = mk('ga_mem', 'Mem Kip');
const out1 = mk('ga_out1', 'Out Paz');
const out2 = mk('ga_out2', 'Out Rex');
const rival = mk('gr_boss', 'Rival Sykes');
const lowbie = mk('ga_low', 'Low Tad');
const poor = mk('ga_poor', 'Poor Sal');
level5(boss); level5(rival); level5(off); level5(mem);
fund(poor, 1000);

// ---------------------------------------------------------------- content catalog
head('Gang content catalog');
ok('eight crew operations ride the board', CT.FACTION_OPERATIONS.length === 8, CT.FACTION_OPERATIONS.length);
ok('sixteen arrangements can be bought', CT.FACTION_UPGRADES.length === 16, CT.FACTION_UPGRADES.length);
ok('the original four operations stay ungated', CT.FACTION_OPERATIONS.filter(o => !o.minLvl && !o.minGang).length === 4);
ok('four operations sit behind level gates', CT.FACTION_OPERATIONS.filter(o => o.minLvl || o.minGang).length === 4);
ok('ten gang levels climb from the street', CT.FACTION_LEVELS.length === 10 && CT.FACTION_LEVELS[0] === 0);
ok('raid terms are spelled out', !!(CT.FACTION_RAID && CT.FACTION_RAID.stealPct === 0.08 && CT.FACTION_RAID.energy === 20));
ok('chain, armory and rebrand terms exist', CT.FACTION_CHAIN_NEED === 3 && CT.FACTION_CHAIN_BONUS === 0.25 && CT.FACTION_ARMORY_CAP === 50 && CT.FACTION_ARMORY_CAP_VAULT === 250 && CT.FACTION_RENAME_COST === 50000);

// ---------------------------------------------------------------- founding gates
head('Founding gates');
ok('a low-level name cannot plant a flag', !!W.createFaction(lowbie, 'Low Crew', 'LC', '').err);
ok('a broke name cannot plant a flag', !!W.createFaction(poor, 'Poor Crew', 'PC', '').err);
const mkA = W.createFaction(boss, 'Wire Wardens', 'WW', 'all original');
ok('a funded level-5 boss plants a flag', !!mkA.ok, mkA.err);
const fidA = load(boss).faction;
const mkB = W.createFaction(rival, 'Cutler Kings', 'CK', 'rivals');
ok('a second flag flies elsewhere', !!mkB.ok, mkB.err);
const fidB = load(rival).faction;
ok('a duplicate name is refused', !!W.createFaction(off, 'Wire Wardens', 'WX', '').err);
ok('a duplicate tag is refused', !!W.createFaction(off, 'Other Crew', 'WW', '').err);
ok('open doors take new hands', !!W.joinFaction(off, fidA).ok && !!W.joinFaction(mem, fidA).ok);

// ---------------------------------------------------------------- levels & rank
head('Gang levels & city rank');
ok('level 1 at zero rep', W.factionLevel(0).level === 1);
ok('level 1 just below the first step', W.factionLevel(149).level === 1);
ok('level 2 on the first step', W.factionLevel(150).level === 2);
ok('level 10 at the top of the city', W.factionLevel(999999).level === 10);
{ // rig reputations: A out-muscles B
  const da = W.factionLoad(fidA); da.d.reputation = 5000; W.factionSave(fidA, da.d);
  const db = W.factionLoad(fidB); db.d.reputation = 100; W.factionSave(fidB, db.d);
}
ok('the stronger flag ranks first', W.factionRank(fidA).rank === 1 && W.factionRank(fidA).of === 2, W.factionRank(fidA));
ok('the weaker flag ranks second', W.factionRank(fidB).rank === 2);
ok('the cockpit carries level and rank', (() => { const d = W.factionDetail(boss).faction; return d.level === 6 && d.rank === 1 && d.rankOf === 2; })());
ok('the public list carries level, wars and chest', (() => {
  const rows = W.listFactions().factions;
  const a = rows.find(r => r.id === fidA);
  return rows[0].id === fidA && a.level === 6 && a.wins === 0 && typeof a.bank === 'number';
})());

// ---------------------------------------------------------------- roster discipline
head('Roster discipline — stripes, kicks');
ok('the boss hands out a stripe', !!W.factionPromote(boss, off).ok && W.factionLoad(fidA).d.officers.includes(off));
ok('an officer cuts a loose hand', !!W.factionKick(off, mem).ok && !W.factionLoad(fidA).d.memberIds.includes(mem));
ok('a cut hand holds no seat', !load(mem).faction);
ok('a regular hand cannot cut anyone', (() => { W.joinFaction(mem, fidA); return !!W.factionKick(mem, off).err; })());
ok('an officer cannot cut the boss', !!W.factionKick(off, boss).err);
ok('the boss cuts an officer', !!W.factionKick(boss, off).ok && !W.factionLoad(fidA).d.officers.includes(off));
ok('kicking a stranger fails clean', !!W.factionKick(boss, out1).err);
W.joinFaction(off, fidA); W.factionPromote(boss, off);   // bench restored: boss + officer + member

// ---------------------------------------------------------------- leadership transfer
head('Leadership transfer');
ok('a hand cannot seize the flag', !!W.factionTransfer(mem, off).err);
ok('an officer cannot seize the flag', !!W.factionTransfer(off, mem).err);
const tr = W.factionTransfer(boss, off);
ok('the boss hands the flag over', !!tr.ok && W.factionLoad(fidA).d.ownerAcc === off);
ok('the old boss keeps a stripe', W.factionLoad(fidA).d.officers.includes(boss));
ok('the new boss rewrites the public line for free', (() => {
  const before = load(off).money;
  const r = W.factionEdit(off, { desc: 'new management, same corners' });
  return !!r.ok && !r.res.renamed && W.factionLoad(fidA).d.desc.includes('new management') && load(off).money === before;
})());
ok('an officer cannot rewrite the flag', !!W.factionEdit(boss, { desc: 'coup' }).err);
const leaderA = off;   // the flag moved — every leader-only step below rides with off

// ---------------------------------------------------------------- invites
head('Invites beat the desk');
ok('a hand cannot invite', !!W.factionInvite(mem, 'Out Paz').err);
ok('an officer invites a citizen', !!W.factionInvite(leaderA, 'Out Paz').ok);
ok('the same invite never goes out twice', !!W.factionInvite(leaderA, 'Out Paz').err);
ok('an invite to a rival seat is refused', !!W.factionInvite(leaderA, 'Rival Sykes').err);
W.factionSetRecruiting(leaderA, 'closed');
ok('a closed door opens for an invite', !!W.joinFaction(out1, fidA).ok && load(out1).faction === fidA);
ok('the invite is spent on entry', (W.factionLoad(fidA).d.invites || []).length === 0);
ok('a stranger still bounces off a closed door', !!W.joinFaction(out2, fidA).err);
ok('an invite can be torn up', (() => {
  W.factionInvite(leaderA, 'Out Rex');
  const r = W.factionInviteCancel(leaderA, out2);
  return !!r.ok && (W.factionLoad(fidA).d.invites || []).length === 0;
})());
W.factionSetRecruiting(leaderA, 'open');

// ---------------------------------------------------------------- rebrands
head('Rebrands cost paint money');
ok('a rebrand under 3 characters is refused', !!W.factionEdit(leaderA, { name: 'AB' }).err);
ok('a duplicate tag is refused', !!W.factionEdit(leaderA, { tag: 'CK' }).err);
ok('a rebrand charges the rename fee', (() => {
  fund(leaderA, 400000);
  const before = load(leaderA).money;
  const r = W.factionEdit(leaderA, { name: 'Wire Regents', tag: 'WR' });
  const fx = W.factionLoad(fidA);
  return !!r.ok && r.res.renamed && fx.f.name === 'Wire Regents' && fx.f.tag === 'WR' && load(leaderA).money === before - 50000;
})());
ok('a broke rebrand is refused', (() => { fund(leaderA, 100); return !!W.factionEdit(leaderA, { name: 'Wire Royalty' }).err; })());
fund(leaderA, 5000000);

// ---------------------------------------------------------------- arrangements
head('Crew arrangements — all seven new ones');
fund(boss, 5000000);
W.factionBankIn(boss, 3000000);
for (const up of ['gymnasium', 'infirmary', 'fence_network', 'laundromat', 'war_room', 'safehouse']) {
  const r = W.factionBuyUpgrade(leaderA, up);
  ok('the chest buys ' + up, !!r.ok, r.err);
}
ok('every arrangement shows active on the cockpit', (() => {
  const ups = W.factionDetail(leaderA).faction.upgrades;
  return ['gymnasium', 'infirmary', 'fence_network', 'laundromat', 'war_room', 'safehouse'].every(id => ups.find(u => u.id === id && u.owned));
})());

// ---------------------------------------------------------------- wired upgrade effects
head('Wired upgrade effects');
ok('the laundromat washes +10% onto deposits', (() => {
  const before = W.factionLoad(fidA).d.bank;
  const r = W.factionBankIn(mem, 10000);
  return !!r.ok && r.res.bonus === 1000 && W.factionLoad(fidA).d.bank === before + 11000;
})());
ok('the fence network pays +8% on sales', (() => {
  const it = 'volt_cola', base = CT.ITEMS[it].sell;
  const q = load(mem); q.items[it] = (q.items[it] || 0) + 1; W.save(mem, q);
  const mine = W.doSell(mem, it, 1);
  const o = load(out2); o.items[it] = (o.items[it] || 0) + 1; W.save(out2, o);
  const theirs = W.doSell(out2, it, 1);
  return mine.res.gain === Math.round(base * 1.08) && theirs.res.gain === base;
})());
ok('the gymnasium adds +6% to training', (() => {
  Math.random = () => 0.5;
  const run = () => { topUp(mem); const q = load(mem); q.stats = { st: 10, de: 10, sp: 10, dx: 10 }; W.derive(q); q.life = q.max_life; q.happy = 100; W.save(mem, q); return W.doTrain(mem, 'st', 'abandoned_gym').res.gain; };
  const withGym = run();
  const d = W.factionLoad(fidA); delete d.d.upgrades.gymnasium; W.factionSave(fidA, d.d);
  const withoutGym = run();
  d.d.upgrades.gymnasium = Date.now(); W.factionSave(fidA, d.d);
  Math.random = realRandom;
  return withGym > withoutGym && Math.abs(withGym / withoutGym - 1.06) < 0.03;
})());

// ---------------------------------------------------------------- armory
head('The shared armory');
{ const q = load(mem); q.items = { volt_cola: 60 }; W.save(mem, q); }
ok('a hand racks gear in the armory', !!W.factionArmoryIn(mem, 'volt_cola', 50).ok && W.factionLoad(fidA).d.armory.volt_cola === 50);
ok('the armory refuses the 51st piece', !!W.factionArmoryIn(mem, 'volt_cola', 1).err);
ok('stashing what you do not carry fails', !!W.factionArmoryIn(mem, 'volt_cola', 99).err);
ok('a hand cannot draw from the armory', !!W.factionArmoryOut(mem, 'volt_cola', 1).err);
ok('an officer draws from the armory', (() => {
  const before = (load(boss).items.volt_cola || 0);
  const r = W.factionArmoryOut(boss, 'volt_cola', 5);
  return !!r.ok && W.factionLoad(fidA).d.armory.volt_cola === 45 && (load(boss).items.volt_cola || 0) === before + 5;
})());
ok('the armory usage reads 45 of 50', W.armoryUsed(W.factionLoad(fidA).d) === 45 && W.armoryCap(W.factionLoad(fidA).d) === 50);
ok('the vault opens 250 slots', !!W.factionBuyUpgrade(leaderA, 'armory_vault').ok && W.armoryCap(W.factionLoad(fidA).d) === 250);
ok('bulk stashing fits after the vault', (() => {
  const q = load(mem); q.items.volt_cola = (q.items.volt_cola || 0) + 100; W.save(mem, q);
  return !!W.factionArmoryIn(mem, 'volt_cola', 100).ok && W.armoryUsed(W.factionLoad(fidA).d) === 145;
})());
ok('the cockpit lists every racked line', (() => {
  const rows = W.factionDetail(leaderA).faction.armory;
  return rows.length === 1 && rows[0].itemId === 'volt_cola' && rows[0].qty === 145;
})());

// ---------------------------------------------------------------- crew operations & chain
head('Crew operations & the coordinated chain');
const openOps = CT.FACTION_OPERATIONS.filter(o => !o.minLvl && !o.minGang);
const gatedOp = CT.FACTION_OPERATIONS.find(o => o.minLvl || o.minGang);
ok('a gated operation names its price', !!W.factionOperation(lowbie, gatedOp.id).err);
Math.random = () => 0;   // every crew job lands while the chain is measured
topUp(boss); topUp(leaderA); topUp(mem);
ok('three hands close crew work', !!W.factionOperation(boss, openOps[0].id).ok && !!W.factionOperation(leaderA, openOps[0].id).ok && !!W.factionOperation(mem, openOps[0].id).ok);
ok('the chain counts three hands', W.factionDetail(boss).faction.chain.count === 3);
topUp(boss);
const chained = W.factionOperation(boss, openOps[1].id);
ok('the fourth job lights the chain bonus', !!chained.ok && chained.res.chain === true, chained.res && chained.res.chain);
Math.random = realRandom;
ok('operations land in the activity ledger', W.factionLoad(fidA).d.ledger.some(e => e.kind === 'operation'));
// ---------------------------------------------------------------- crew roll & contributions
head('Crew roll & member contributions');
const roll = W.factionRoll(boss);
ok('crew roll pays the hand and the chest', !!roll.ok && roll.res.chestPay > 0);
const contribs = (() => {
  const d = W.factionDetail(boss).faction;
  const row = d.roster.find(r => r.id === boss);
  return row && row.contrib;
})();
ok('deposits show on the member line', contribs && contribs.deposited >= 3000000, contribs);
ok('operations show on the member line', contribs && contribs.ops >= 2, contribs);
ok('rolls show on the member line', contribs && contribs.rolls === 1, contribs);

// ---------------------------------------------------------------- gang wars
head('Gang wars — raids between flags');
fund(rival, 2000000);
W.factionBankIn(rival, 600000);
{ // pin both flags mid-table so raid odds sit clear of the 10/90 clamps
  const pa = W.factionLoad(fidA); pa.d.reputation = 1000; W.factionSave(fidA, pa.d);
  const pb = W.factionLoad(fidB); pb.d.reputation = 1000; W.factionSave(fidB, pb.d);
}
topUp(boss);
ok('a hand cannot call a raid', !!W.factionRaid(mem, fidB).err);
ok('a crew cannot raid its own flag', !!W.factionRaid(boss, fidA).err);
Math.random = () => 0;   // the first raid lands
const bankA0 = W.factionLoad(fidA).d.bank, bankB0 = W.factionLoad(fidB).d.bank;
const cash0 = load(boss).money;
const raid1 = W.factionRaid(boss, fidB);
const expectSteal = Math.min(250000, Math.round(Math.round(bankB0 * 0.08) * 1.2));   // war room juices the loot
ok('a raid strips the rival chest', !!raid1.ok && raid1.res.win && raid1.res.steal === expectSteal, raid1.res);
ok('the loot moves flag to flag', W.factionLoad(fidA).d.bank === bankA0 + expectSteal && W.factionLoad(fidB).d.bank === bankB0 - expectSteal);
ok('a raid costs wheels-and-burners cash', load(boss).money === cash0 - 2500 - 0 || load(boss).money <= cash0 - 2500);
ok('the raider rests an hour', load(boss).faction_raid_at > Date.now());
ok('the attacking crew rides every 6h', W.factionLoad(fidA).d.wars.lastRaidAt > 0);
ok('the victim barricades for 2h', W.factionLoad(fidB).d.wars.shieldUntil > Date.now());
ok('raid honors post to both war records', W.factionLoad(fidA).d.wars.wins === 1 && W.factionLoad(fidB).d.wars.losses === 1);
ok('a second raid bounces off the personal cooldown', !!W.factionRaid(boss, fidB).err);
{ // clear the raider, keep the crew tired
  const q = load(boss); q.faction_raid_at = 0; W.save(boss, q);
}
ok('a fresh raider bounces off the crew cooldown', !!W.factionRaid(boss, fidB).err);
{ // clear the crew too — the victim barricade still stands
  const d = W.factionLoad(fidA); d.d.wars.lastRaidAt = 0; W.factionSave(fidA, d.d);
}
ok('a barricaded flag cannot be hit', /barricad/.test(W.factionRaid(boss, fidB).err || ''));
{ // drop the barricade, buy B a safehouse, ride again — the defence should bite
  const d = W.factionLoad(fidB); d.d.wars.shieldUntil = 0; W.factionSave(fidB, d.d);
}
ok('the victim buys a safehouse grid', !!W.factionBuyUpgrade(rival, 'safehouse').ok);
{ // re-pin reps — the first raid moved them, and the defence delta must be exact
  const pa = W.factionLoad(fidA); pa.d.reputation = 1000; W.factionSave(fidA, pa.d);
  const pb = W.factionLoad(fidB); pb.d.reputation = 1000; W.factionSave(fidB, pb.d);
}
topUp(boss);
const raid2 = W.factionRaid(boss, fidB);
ok('a safehouse cuts raid odds by 10', !!raid2.ok && raid2.res.chance === raid1.res.chance - 10, { c1: raid1.res.chance, c2: raid2.res && raid2.res.chance });
Math.random = () => 0.9999;   // the third raid bounces
{ const d = W.factionLoad(fidA); d.d.wars.lastRaidAt = 0; W.factionSave(fidA, d.d);
  const e = W.factionLoad(fidB); e.d.wars.shieldUntil = 0; W.factionSave(fidB, e.d);
  const q = load(boss); q.faction_raid_at = 0; W.save(boss, q); }
topUp(boss);
const repA0 = W.factionLoad(fidA).d.reputation, repB0 = W.factionLoad(fidB).d.reputation;
const raid3 = W.factionRaid(boss, fidB);
Math.random = realRandom;
ok('a failed raid honors the defenders', !!raid3.ok && !raid3.res.win && W.factionLoad(fidB).d.wars.wins === 1 && W.factionLoad(fidA).d.wars.losses === 1);
ok('rep moves with the outcome', W.factionLoad(fidB).d.reputation === repB0 + 20 && W.factionLoad(fidA).d.reputation === Math.max(0, repA0 - 15));
ok('raids hit the town wire', dbm.getDb().prepare("SELECT COUNT(*) c FROM news WHERE message LIKE '%raid%'").get().c >= 2);
ok('raids show on the raider line', W.factionDetail(boss).faction.roster.find(r => r.id === boss).contrib.raids === 3);

// ---------------------------------------------------------------- founder fresh reset
head('Founder fresh reset — Ghost walks in clean');
const gf = B.createFounder({});
ok('a missing founder is created maxed', gf.created && gf.toppedUp && gf.level === 100, { created: gf.created, level: gf.level });
const ghostAcc = dbm.getDb().prepare("SELECT * FROM accounts WHERE username='ghost'").get();
const ghostPass = ghostAcc.pass_hash + '|' + ghostAcc.salt;
W.joinFaction(ghostAcc.id, fidA);
W.factionInvite(leaderA, 'Out Rex');
const wiped = B.resetFounderFresh({});
ok('the reset keeps the name on the account', wiped.username === 'ghost' && wiped.name.length > 0);
ok('the sheet wipes to level 1', wiped.level === 1 && wiped.money === 2500 && wiped.bank === 0, wiped);
ok('the login survives the wipe', (() => {
  const a = dbm.getDb().prepare("SELECT * FROM accounts WHERE username='ghost'").get();
  return !!a && (a.pass_hash + '|' + a.salt) === ghostPass;
})());
ok('the founder pass survives the wipe', !!load(ghostAcc.id).sub_founder);
ok('the gang seat is vacated', !load(ghostAcc.id).faction && !W.factionLoad(fidA).d.memberIds.includes(ghostAcc.id));
const handsOff = B.createFounder({});
ok('a reboot never re-maxes a fresh founder', !handsOff.toppedUp && handsOff.level === 1, handsOff);
const restored = B.createFounder({ reset: true });
ok('an explicit reset restores the maxed sheet', restored.toppedUp && restored.level === 100, { toppedUp: restored.toppedUp, level: restored.level });

// ---------------------------------------------------------------- summary
console.log('\n' + (fail === 0 ? `ALL ${pass} GANG CHECKS PASS` : `${fail} FAILURES / ${pass} passed`));
process.exit(fail === 0 ? 0 : 1);
