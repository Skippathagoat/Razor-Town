// Razor Town — wipe/reset an account back to a blank citizen.
//
// The account survives (same login, same password, same name and look); everything it
// *owns* goes: cash, bank, vault, level, stats, items, gear, property, courses, merits,
// gang seat, turf, bazaar lots, auction lots, bounties, notes, chat lines, arcade state.
// Afterwards the character is indistinguishable from a brand-new recruit.
//
// Every wipe also sets `accounts.wiped` — a lock that stops the boot-time founder demo
// (lib/bootstrap.js) from quietly topping the account back up to level 100 / $500M.
//
// Driven by tools/wipe-account.js; kept in lib/ so the checks and any future admin
// screen run exactly the same code.
'use strict';
const dbm = require('./db.js');
const A = require('./accounts.js');
const W = require('./world.js');
const C = require('./game/content.js');
const E = require('./game/engine.js');
const S = require('./systems.js');

const db = () => dbm.getDb();

// ------------------------------------------------------------------ lookup
// ref = username (case-insensitive), email, or numeric account id. Never NPCs/bots.
function findAccount(ref) {
  const key = String(ref == null ? '' : ref).trim();
  if (!key) return null;
  if (/^-?\d+$/.test(key)) {
    return db().prepare('SELECT * FROM accounts WHERE id=?').get(Number(key)) || null;
  }
  const lk = A.loginKey(key);
  return db().prepare("SELECT * FROM accounts WHERE username=? OR lower(email)=?").get(lk, lk) || null;
}

function districtName(id) {
  const d = (C.DISTRICTS || []).find(x => x.id === id);
  return d ? d.name : id;
}
function itemTally(items) {
  let units = 0, resale = 0;
  for (const id of Object.keys(items || {})) {
    const q = Number(items[id]) || 0;
    if (q <= 0) continue;
    units += q;
    resale += q * ((C.ITEMS[id] && C.ITEMS[id].sell) || 0);
  }
  return { units, resale };
}

// ------------------------------------------------------------------ what is on the account right now?
function snapshot(accId) {
  const dbh = db();
  const row = dbh.prepare('SELECT name, json, avatar FROM players WHERE acc_id=?').get(accId);
  let p = {};
  if (row) { try { p = JSON.parse(row.json || '{}'); } catch (e) { p = {}; } }
  const items = itemTally(p.items);
  const out = {
    accId,
    exists: !!row,
    name: (row && row.name) || p.name || null,
    avatar: (row && row.avatar) || '',
    bio: p.bio || '',
    origin: p.origin || 'street',
    level: p.level || 1,
    total: p.total != null ? p.total : E.calcTotal(p),
    stats: p.stats || {},
    xp: p.xp || 0,
    money: p.money || 0,
    bank: p.bank || 0,
    vault: p.vault || 0,
    reputation: p.reputation || 0,
    crimeCount: p.total_crimes || 0,
    wins: p.wins || 0,
    losses: p.losses || 0,
    itemUnits: items.units,
    itemResale: items.resale,
    achievements: Object.keys(p.achievements || {}).length,
    merits: p.merits || 0,
    perks: Object.keys(p.perks || {}).length,
    courses: Object.keys(p.courses || {}).length,
    stocks: Object.keys(p.stocks || {}).length,
    crypto: Object.keys(p.crypto || {}).length,
    loan: (p.loan && p.loan.owed) || 0,
    property: p.property || 'shack',
    propertyUp: (p.property_up || []).length,
    faction: p.faction || null,
    jail: !!(p.jail_until && p.jail_until > Date.now()),
    hospital: !!(p.hosp_until && p.hosp_until > Date.now()),
    subFounder: !!p.sub_founder,
    subUntil: p.sub_until || 0,
    wiped: false
  };
  out.netWorth = out.money + out.bank + out.vault;
  out.gangName = null; out.gangBoss = false;
  if (out.faction) {
    const f = dbh.prepare('SELECT id, name, json FROM factions WHERE id=?').get(out.faction);
    if (f) {
      let d = {}; try { d = JSON.parse(f.json || '{}'); } catch (e) {}
      out.gangName = f.name;
      out.gangBoss = d.ownerAcc === accId;
      out.gangBank = d.bank || 0;
    }
  }
  let turf = [];
  try { turf = dbh.prepare('SELECT district FROM turf WHERE acc_id=?').all(accId).map(r => r.district); } catch (e) {}
  out.turf = turf;
  out.turfNames = turf.map(districtName);
  // how many citizens still list this account as a friend (left alone by a wipe, worth reporting)
  let friends = 0;
  for (const r of dbh.prepare('SELECT json FROM players WHERE acc_id<>?').all(accId)) {
    let q; try { q = JSON.parse(r.json || '{}'); } catch (e) { continue; }
    if (((q.sys || {}).friends || []).includes(accId)) friends++;
  }
  out.friendOf = friends;
  const acc = dbh.prepare('SELECT wiped FROM accounts WHERE id=?').get(accId);
  out.wiped = !!(acc && acc.wiped);
  return out;
}

// ------------------------------------------------------------------ the wipe
// opts: likeNew    leave the standard recruit start ($2,500 + the origin's starter kit)
//       keepPass   leave a founder Wire Pass on the account instead of cancelling it
//       keepBio    default: the bio survives with the name/look; pass false to clear it
//       purgeNews  also scrub every line of the town wire that mentions them
//       news=false skip writing the "wiped clean" line to the wire
//       dryRun     report only, change nothing
function wipe(ref, opts = {}) {
  const dbh = db();
  S.ensureTables();                 // turf/kv live with the 2026 systems; make sure they exist
  const acc = findAccount(ref);
  if (!acc) throw new Error('No account called "' + ref + '" in this world.');
  if (acc.kind === 'bot') throw new Error('That is an NPC account — use tools/purge-npcs.js instead.');
  const accId = acc.id;
  const before = snapshot(accId);
  const gone = {
    listings: 0, lotsWithdrawn: 0, lotsReopened: 0, bidderRefunds: 0, bountiesPosted: 0, bountiesLifted: 0, bountyRefunds: 0,
    messages: 0, chat: 0, turf: 0, gangSeats: 0, applications: 0, gangsFolded: 0, gangTakenOver: 0,
    gang: null, newBoss: null, news: 0
  };

  const body = () => {
    // ---- bazaar: their stall comes down (the goods leave with the bag)
    gone.listings = dbh.prepare('DELETE FROM listings WHERE seller_acc=?').run(accId).changes;

    // ---- auction rooms. Two directions, and the house must not end up holding anyone's money:
    //      · their own lots come off the block, and any bid the house is sitting on goes back
    //        to the bidder (the lot itself is gone with their bag);
    //      · a lot they were winning simply has no bids on it again — their escrow dies with
    //        the wipe, the goods stay with the house until the hammer or the pull.
    for (const a of dbh.prepare('SELECT id, bidder_acc, cur_bid FROM auctions WHERE seller_acc=? AND settled=0').all(accId)) {
      if (a.bidder_acc && a.bidder_acc !== accId && a.cur_bid > 0) {
        const bidder = W.loadSafe(a.bidder_acc);
        if (bidder) {
          bidder.money = (bidder.money || 0) + a.cur_bid;
          W.save(a.bidder_acc, bidder);
          W.systemMsg(a.bidder_acc, '🔨 ' + before.name + ' was emptied out and their lot was pulled — your $' + a.cur_bid.toLocaleString() + ' is back in your pocket.');
          gone.bidderRefunds++;
        }
      }
      dbh.prepare('UPDATE auctions SET settled=1, cur_bid=0, bidder_acc=NULL WHERE id=?').run(a.id);
      gone.lotsWithdrawn++;
    }
    for (const a of dbh.prepare('SELECT id, seller_acc FROM auctions WHERE bidder_acc=? AND settled=0').all(accId)) {
      dbh.prepare('UPDATE auctions SET cur_bid=0, bidder_acc=NULL WHERE id=?').run(a.id);
      gone.lotsReopened++;
      const seller = W.loadSafe(a.seller_acc);
      if (seller) { W.systemMsg(a.seller_acc, '🔨 ' + before.name + ' was emptied out, so there are no bids on your lot again. It stays on the block.'); }
    }

    // ---- bounties: the ones they posted die with the cash; the ones on their head go back
    //      to whoever paid them, so nobody loses money over someone else's reset
    gone.bountiesPosted = dbh.prepare('DELETE FROM bounties WHERE from_acc=?').run(accId).changes;
    for (const b of dbh.prepare('SELECT id, from_acc, amount FROM bounties WHERE target_acc=?').all(accId)) {
      gone.bountiesLifted++;
      if (b.from_acc && b.from_acc !== accId) {
        const p = W.loadSafe(b.from_acc);
        if (p) {
          p.money = (p.money || 0) + b.amount;
          W.save(b.from_acc, p);
          W.systemMsg(b.from_acc, '🎯 The bounty on ' + before.name + ' was called off — $' + b.amount.toLocaleString() + ' is back in your pocket.');
          gone.bountyRefunds++;
        }
      }
      dbh.prepare('DELETE FROM bounties WHERE id=?').run(b.id);
    }

    // ---- post, wire chat, corners held
    gone.messages = dbh.prepare('DELETE FROM messages WHERE from_acc=? OR to_acc=?').run(accId, accId).changes;
    gone.chat = dbh.prepare('DELETE FROM chat WHERE acc=?').run(accId).changes;
    gone.turf = dbh.prepare('DELETE FROM turf WHERE acc_id=?').run(accId).changes;

    // ---- gangs: off the roster, out of the applications pile; the chair passes down,
    //      and a crew left with nobody in it folds
    for (const f of dbh.prepare('SELECT id, name, json FROM factions').all()) {
      let d; try { d = JSON.parse(f.json || '{}'); } catch (e) { continue; }
      const wasMember = (d.memberIds || []).includes(accId);
      const applied = (d.applications || []).some(a => Number(a.accId) === accId);
      if (!wasMember && !applied) continue;
      if (applied) { d.applications = d.applications.filter(a => Number(a.accId) !== accId); gone.applications++; }
      if (!wasMember) { dbh.prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id); continue; }
      gone.gangSeats++;
      d.memberIds = d.memberIds.filter(i => i !== accId);
      d.officers = (d.officers || []).filter(i => i !== accId);
      d.roll = d.roll || {};
      d.roll.memberIds = (d.roll.memberIds || []).filter(i => i !== accId);
      if (d.ownerAcc === accId) {
        if (d.memberIds.length === 0) {
          dbh.prepare('DELETE FROM factions WHERE id=?').run(f.id);
          gone.gangsFolded++; gone.gang = f.name;
          continue;
        }
        d.ownerAcc = d.memberIds[0];
        const nx = dbh.prepare('SELECT name FROM players WHERE acc_id=?').get(d.ownerAcc);
        d.ownerName = nx ? nx.name : 'The yard';
        gone.gang = f.name; gone.newBoss = d.ownerName;
        gone.gangTakenOver++;
        const heir = W.loadSafe(d.ownerAcc);
        if (heir) { W.systemMsg(d.ownerAcc, '🪑 ' + before.name + ' was wiped out and left ' + f.name + ' leaderless. The chair is yours.'); W.save(d.ownerAcc, heir); }
      }
      dbh.prepare('UPDATE factions SET json=? WHERE id=?').run(JSON.stringify(d), f.id);
    }

    // ---- the character: a fresh recruit, same face
    const fresh = A.defaultPlayerJson({
      name: before.name || A.sanitize(acc.username, 20),
      origin: C.ORIGINS.some(o => o.id === before.origin) ? before.origin : 'street',
      avatar: before.avatar || '1|5|0|1|2|0',
      bio: opts.keepBio === false ? '' : before.bio
    });
    const now = Date.now();
    const blank = {
      money: opts.likeNew ? fresh.money : 0,
      bank: 0, vault: 0,
      items: opts.likeNew ? fresh.items : {},
      reputation: 0, xp: fresh.xp,
      achievements: {}, merits: 0, merits_earned: 0, perks: {}, courses: {}, course: null, course_ends: null,
      stocks: {}, crypto: {}, equip: { weapon: null, armour: null }, loan: null,
      property: 'shack', property_up: [],
      faction: null, jail_until: null, hosp_until: null,
      total_crimes: 0, total_success: 0, total_fail: 0, wins: 0, losses: 0, hospital_times: 0,
      boosters: {},
      sub_founder: opts.keepPass ? !!before.subFounder : false,
      sub_until: opts.keepPass ? (before.subUntil || 0) : 0,
      seen_tutorial: false,
      last_seen: now, created: now,
      _ref: { life: now, energy: now, nerve: now, bank: now }
    };
    const p = Object.assign(fresh, blank);
    if (before.exists) {
      dbh.prepare('UPDATE players SET json=?, name=?, avatar=?, updated_at=? WHERE acc_id=?')
        .run(JSON.stringify(p), p.name, p.avatar, now, accId);
    } else {
      dbh.prepare('INSERT INTO players (acc_id, name, avatar, json, updated_at) VALUES (?,?,?,?,?)')
        .run(accId, p.name, p.avatar, JSON.stringify(p), now);
    }

    // ---- the lock: a reboot must not put the demo millions back
    dbh.prepare('UPDATE accounts SET wiped=1, wiped_ts=? WHERE id=?').run(now, accId);

    // ---- the town wire: keep the history by default, say nothing at all if asked
    if (opts.purgeNews) {
      const like = '%' + String(p.name || '').replace(/[%_]/g, '') + '%';
      gone.news = dbh.prepare('DELETE FROM news WHERE message LIKE ?').run(like).changes;
    }
    if (opts.news !== false) W.logNews('gone', '🧹', p.name + ' was wiped to nothing. The ledger starts again from zero.');
  };
  const run = dbh.transaction(body);

  if (opts.dryRun) {
    // Run the real code path inside a transaction we throw away: the report then says
    // exactly what a live wipe would do, without the world changing underneath us.
    dbh.exec('BEGIN IMMEDIATE');
    let after = null, err = null;
    try { body(); after = snapshot(accId); } catch (e) { err = e; }
    dbh.exec('ROLLBACK');
    if (err) throw err;
    return { dryRun: true, account: acc, before, after, gone };
  }
  run();
  return { dryRun: false, account: acc, before, after: snapshot(accId), gone };
}

function isWiped(accId) {
  try { const a = db().prepare('SELECT wiped FROM accounts WHERE id=?').get(accId); return !!(a && a.wiped); }
  catch (e) { return false; }
}
function setWipeLock(accId) { db().prepare('UPDATE accounts SET wiped=1, wiped_ts=? WHERE id=?').run(Date.now(), accId); }
function clearWipeLock(accId) { db().prepare('UPDATE accounts SET wiped=0, wiped_ts=0 WHERE id=?').run(accId); }

module.exports = { wipe, findAccount, snapshot, isWiped, setWipeLock, clearWipeLock };
