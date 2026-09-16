#!/usr/bin/env node
/* Razor Town — 2026.5 "Torn season" end-to-end check.
 * Expects the server on PORT (default 8787).
 * Drives the new systems: portraits, travel, warrants, daily deals, PDA,
 * the weekly championship, profile visits, online presence, new feats.
 *
 *   node tools/check-t26.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:' + (process.env.PORT || 8787);
const ROOT = path.join(__dirname, '..') + '/';
let pass = 0, fail = 0;
let lastDetail = '';
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', label, lastDetail ? '\n    -> ' + String(lastDetail).slice(0, 260) : ''); } };
const detail = (x) => { lastDetail = JSON.stringify(x); return x; };

async function req(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Cookie: 'nsc_t=' + token } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  return { code: r.status, j };
}
async function act(token, name, payload = {}) {
  return req('/api/action', { method: 'POST', token, body: Object.assign({ name }, payload) });
}
async function devSelf(token, op, extra = {}) {
  return req('/api/dev/self', { method: 'POST', token, body: Object.assign({ op }, extra) });
}
async function devWorld(token, op, extra = {}) {
  return req('/api/dev/world', { method: 'POST', token, body: Object.assign({ op }, extra) });
}
const uniq = Date.now().toString(36);

(async () => {
  // ---- founder (dev tools) ----
  const fl = await req('/api/login', { method: 'POST', body: { username: 'ghost', password: 'Delilah2023!@' } });
  ok(fl.code === 200, 'founder login');
  const ftok = fl.j.token;

  // ---- fresh citizens ----
  const mk = async (name, portrait) => {
    const r = await req('/api/register', { method: 'POST', body: {
      username: name, password: 'TestPass99!', email: name + '@test.local',
      profile: Object.assign({ name, origin: 'street', gender: 'm', bio: 'qa' }, portrait ? { portrait } : {}) } });
    ok(r.code === 200, 'register ' + name);
    return { tok: r.j.token, me: r.j.me };
  };
  const A = await mk('qa_t26a_' + uniq.slice(-4));
  const B = await mk('qa_t26b_' + uniq.slice(-4), 'p03');
  const meA = () => (req('/api/me', { token: A.tok })).then(r => r.j.me);

  // ================================================================ 1. PORTRAITS
  const meta = (await req('/api/meta')).j;
  const portraits = meta.portraits;
  ok(Array.isArray(portraits) && portraits.length === 10, 'meta: portrait catalog ships 10 faces', detail(meta));
  ok(portraits.every(p => p.id && p.file && p.gender && p.label), 'meta: each face has id/file/gender/label');
  const onDisk = fs.readdirSync(ROOT + 'public/img/portraits').filter(f => /^p\d{2}\.jpg$/.test(f));
  ok(onDisk.length === portraits.length, 'catalog matches the files on disk (' + onDisk.length + ' files)');
  ok(portraits.every(p => onDisk.includes(p.file)), 'every catalog face is a real file');
  ok(/^(p01|p02|p03|p04|p05|p06|p07|p08|p09|p10)$/.test(A.me.portrait), 'a fresh citizen is handed a face from the catalog', detail(A.me));
  ok(B.me.portrait === 'p03', 'the face picked in the creator is stamped on the record', detail(B.me));
  ok(A.me.dist && A.me.dist.id === 'glassq', 'a fresh citizen starts on the line at Glass Quarter', detail(A.me.dist));
  ok(A.me.warrant && A.me.warrant.stars === 0, 'a fresh citizen carries no warrant', detail(A.me.warrant));
  // preferences: the door can be changed
  ok((await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { portrait: 'nope' } })).code === 400, 'an unknown face is refused');
  ok((await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { portrait: 'p07' } })).code === 200, 'a catalog face is accepted');
  ok((await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { portrait: 'custom' } })).code === 400, '"your picture" needs an actual picture first');
  ok((await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { pic: 'data:image/jpeg;base64,AAAA' } })).code === 200, 'a plain image upload is kept');
  const pc = await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { portrait: 'custom' } });
  ok(pc.code === 200 && pc.j.p.portrait === 'custom', 'an uploaded picture becomes the face on the door');
  // the public profile carries the face + the visit counter
  const profB = await req('/api/profile?id=' + B.me.id, { token: A.tok });
  ok(profB.code === 200 && profB.j.profile.portrait === 'p03', 'the public file shows their face', detail(profB.j.profile));
  ok(profB.j.profile.visits >= 1, 'looking at a citizen counts as a visit', detail(profB.j.profile.visits));
  const visits1 = profB.j.profile.visits;
  const profB2 = await req('/api/profile?id=' + B.me.id, { token: A.tok });
  ok(profB2.j.profile.visits === visits1, 'visits are throttled (one per five minutes)');

  // ================================================================ 2. TRAVEL
  const tv0 = (await req('/api/travel', { token: A.tok })).j;
  ok(tv0.districts && tv0.districts.length === 8, 'the line has eight stops', detail(tv0));
  ok(tv0.districts.some(d => d.here && d.id === 'glassq'), 'your stop is marked', detail(tv0.districts));
  ok(tv0.cdLeft === 0, 'a fresh citizen is not on cooldown');
  ok(tv0.districts.every(d => d.hops >= 0 && (d.here || d.cost > 0)), 'every stop prices its fare (your own stop is free)', detail(tv0.districts));
  const moneyBefore = (await meA()).money;
  const eBefore = (await meA()).energy;
  const badTrip = await act(A.tok, 'travel', { to: 'nowhere' });
  ok(badTrip.code === 400 || badTrip.j.err, 'a stop that is not on the line is refused');
  const selfTrip = await act(A.tok, 'travel', { to: 'glassq' });
  ok(selfTrip.code === 400 || selfTrip.j.err, 'you cannot ride to where you already stand');
  const red = tv0.districts.find(d => d.id === 'redmile');
  const trip = await act(A.tok, 'travel', { to: 'redmile' });
  ok(trip.code === 200 && trip.j.ok, 'a ride to Red Mile works', detail(trip.j));
  ok(trip.j.res && trip.j.res.cost === red.cost, 'the fare matches the board', detail(red));
  const meAfter = await meA();
  ok(meAfter.dist && meAfter.dist.id === 'redmile', 'the town sees you standing in Red Mile', detail(meAfter.dist));
  ok(meAfter.money === moneyBefore - red.cost, 'the fare comes out of your pocket');
  ok(meAfter.energy === eBefore - 5, 'the ride costs five energy');
  const trip2 = await act(A.tok, 'travel', { to: 'glassq' });
  ok(trip2.code === 400 || trip2.j.err, 'the second ride is refused on cooldown');
  const tv1 = (await req('/api/travel', { token: A.tok })).j;
  ok(tv1.cdLeft > 0 && tv1.cdLeft <= 90 * 60000 + 5000, 'the next run is inside ninety minutes', detail(tv1.cdLeft));
  ok(tv1.districts.find(d => d.id === 'redmile').visited, 'visited stops keep their tick');

  // ================================================================ 3. WARRANTS
  // heat tiers: 55 -> 1, 75 -> 2, 90 -> 3 (fines scale with level)
  await devSelf(ftok, 'heat_set', { value: 50 });   // founder's own heat — use target ops on A instead
  const heat = async (value) => {
    const r = await devWorld(ftok, 'heat_set_target', { targetId: A.me.id, value });
    ok(r.code === 200, 'dev heat_set_target ' + value);
  };
  await heat(50);
  let w = (await meA()).warrant;
  ok(w.stars === 0 && w.heat >= 48 && w.heat <= 50, 'heat under the line carries no stars', detail(w));
  await heat(60);
  w = (await meA()).warrant;
  ok(w.stars === 1 && w.fine === Math.round(5000 * (1 + A.me.level / 50)), 'one star at 60 heat, fine scales with level', detail(w));
  await heat(80);
  w = (await meA()).warrant;
  ok(w.stars === 2 && w.fine === Math.round(25000 * (1 + A.me.level / 50)), 'two stars at 80 heat', detail(w));
  await heat(95);
  w = (await meA()).warrant;
  ok(w.stars === 3 && w.fine === Math.round(100000 * (1 + A.me.level / 50)), 'three stars at 95 heat', detail(w));
  const board = (await req('/api/jail')).j;
  const onBoard = (board.wanted || []).find(x => x.id === A.me.id);
  ok(onBoard && onBoard.stars === 3, 'three stars puts you on the wanted board', detail(board.wanted));
  ok(onBoard.fine === w.fine && onBoard.portrait, 'the board shows the fine and your face');
  const payNoCash = await act(A.tok, 'warrant_pay');
  ok((payNoCash.code === 400 || !!payNoCash.j.err) && /magistrate wants/.test(payNoCash.j.err || ''), 'paying without the fine is refused politely', detail(payNoCash.j));
  await devWorld(ftok, 'grant_cash', { target: A.me.id, amount: 200000 });
  const paid = await act(A.tok, 'warrant_pay');
  ok(paid.code === 200 && paid.j.ok, 'the fine is paid', detail(paid.j));
  w = (await meA()).warrant;
  ok(w.stars === 0 && w.heat < 55, 'paying the fine clears the board', detail(w));
  ok((await req('/api/jail')).j.wanted.every(x => x.id !== A.me.id), 'the board forgets your face');
  // surrender: heat back over the line, then walk it in
  await heat(80);
  const beforeJail = (await meA()).jail_until || 0;
  const surr = await act(A.tok, 'warrant_surrender');
  ok(surr.code === 200 && surr.j.ok, 'walking it in is accepted', detail(surr.j));
  const meJail = await meA();
  ok(meJail.jail_until > Date.now() + 120 * 60000, 'the corridor costs real time (135 min for two stars)', detail({ jail: meJail.jail_until, before: beforeJail }));
  ok(meJail.warrant.stars === 0, 'surrendering clears the warrant');
  const surr2 = await act(A.tok, 'warrant_surrender');
  ok(surr2.code === 400 || !!surr2.j.err, 'there is nothing left to surrender');

  // ================================================================ 4. DAILY DEALS / SHOPS
  const shops = (await req('/api/shops', { token: A.tok })).j;
  ok(shops.shops && shops.shops.length === 6, 'the six corner shops', detail(shops));
  ok(typeof shops.eventShopMult === 'number' && shops.eventShopMult > 0, 'the event multiplier is on the board', detail(shops.eventShopMult));
  ok(typeof shops.warrantMult === 'number', 'the warrant multiplier is on the board');
  let rows = 0, dealOk = true, idxOk = true;
  for (const s of shops.shops) {
    for (const r of s.stock) {
      rows++;
      if (typeof r.idx !== 'number' || r.idx < 0.9 || r.idx > 1.1) idxOk = false;
      if (typeof r.deal !== 'boolean' || r.base <= 0 || r.price <= 0) dealOk = false;
      if (r.deal) ok(r.price < r.base, 'a deal price sits below the shelf price (' + r.name + ')');
    }
    if (s.deal) {
      const row = s.stock.find(x => x.item === s.deal);
      if (!row || !row.deal) dealOk = false;
    }
  }
  ok(rows >= 6 && idxOk, 'every shelf row carries a daily index (0.9–1.1)', detail(shops.shops.map(s => s.stock[0])));
  ok(dealOk, 'the daily deal item is real and priced like a deal');

  // ================================================================ 5. PDA
  const pda0 = (await req('/api/pda', { token: A.tok })).j;
  ok(pda0.bars && pda0.bars.max_life > 0 && pda0.bars.max_energy > 0, 'the PDA mirrors your vitals', detail(pda0.bars));
  ok(pda0.district === 'The Red Mile', 'the PDA shows where you stand', detail(pda0.district));
  ok(pda0.warrant && pda0.warrant.stars === 0, 'the PDA shows the warrant');
  ok(typeof pda0.pda_uses === 'number', 'the PDA counts its own uses');
  await devSelf(ftok, 'heal');
  await devWorld(ftok, 'grant_item', { target: A.me.id, item: 'trauma_kit', qty: 2 });
  const pda1 = (await req('/api/pda', { token: A.tok })).j;
  const hasKit = (pda1.items || []).some(i => i.id === 'trauma_kit' && i.qty >= 1);
  ok(hasKit, 'a granted kit lands in the pocket', detail(pda1.items));
  const life0 = pda1.bars.life;
  const use = await act(A.tok, 'pda_use', { itemId: 'trauma_kit' });
  ok(use.code === 200 && !!use.j.res, 'one-tap use from the PDA works', detail(use.j));
  const pda2 = (await req('/api/pda', { token: A.tok })).j;
  ok(pda2.pda_uses === pda1.pda_uses + 1, 'every PDA use is counted');
  ok(pda2.bars.life >= life0, 'the kit did its job');
  const junkUse = await act(A.tok, 'pda_use', { itemId: 'not_an_item' });
  ok(junkUse.code === 400 || !!junkUse.j.err, 'the PDA refuses an item it does not know');
  // the branch through the PDA
  const dep = await act(A.tok, 'pda_deposit', { amount: 1234 });
  ok(dep.code === 200 && dep.j.res && dep.j.res.to === 'bank', 'the PDA deposits to the branch', detail(dep.j));
  const pda3 = (await req('/api/pda', { token: A.tok })).j;
  ok(pda3.bank >= 1234, 'the branch shows the deposit', detail(pda3.bank));
  const wd = await act(A.tok, 'pda_withdraw', { amount: 500 });
  ok(wd.code === 200 && wd.j.res && wd.j.res.to === 'cash', 'the PDA draws from the branch', detail(wd.j));
  const pda4 = (await req('/api/pda', { token: A.tok })).j;
  ok(pda4.bank === pda3.bank - 500, 'branch math is exact', detail({ pda3: pda3.bank, pda4: pda4.bank }));

  // ================================================================ 6. THE CHAMPIONSHIP
  // the dev sweep starts the week with a clean card so the entry path is always testable
  await devWorld(ftok, 'tourney_clear');
  const t0 = (await req('/api/tourney', { token: A.tok })).j;
  ok(t0.fee === 25000 && t0.minLevel === 5 && t0.poolPct === 70, 'the card: $25,000 in, level 5, 70% of the pool', detail(t0));
  ok(['open', 'closing', 'settled'].includes(t0.state), 'the card reports a state', detail(t0.state));
  ok(Array.isArray(t0.entrants) && t0.entrants.length <= 16, 'the floor caps at sixteen');
  if (t0.state === 'open') {
    const early = await act(A.tok, 'tourney_enter');
    ok(early.code === 400 || /level 5/.test(early.j.err || ''), 'level 1 does not walk onto the card', detail(early.j));
    // bring A and B to level 5 (1,936 xp each) with money for the fee
    await devWorld(ftok, 'grant_xp', { target: A.me.id, amount: 2000 });
    await devWorld(ftok, 'grant_xp', { target: B.me.id, amount: 2000 });
    await devWorld(ftok, 'grant_cash', { target: A.me.id, amount: 60000 });
    await devWorld(ftok, 'grant_cash', { target: B.me.id, amount: 60000 });
    const lvl = await meA();
    ok(lvl.level >= 5, 'xp buys the level up', detail(lvl.level));
    const enterA = await act(A.tok, 'tourney_enter');
    ok(enterA.code === 200 && enterA.j.ok, 'A goes on the card', detail(enterA.j));
    const again = await act(A.tok, 'tourney_enter');
    ok(again.code === 400 || /already/.test(again.j.err || ''), 'a name cannot be on the card twice', detail(again.j));
    const enterB = await act(B.tok, 'tourney_enter');
    ok(enterB.code === 200 && enterB.j.ok, 'B goes on the card', detail(enterB.j));
    // two stars keep you out
    const bt = (await req('/api/tourney', { token: B.tok })).j;
    ok(bt.entrants.length === 2 && bt.pool === 50000, 'the floor reads both names, the pool doubles', detail(bt));
    // settle
    const settle = await devWorld(ftok, 'tourney_settle');
    ok(settle.code === 200 && settle.j.entries === 2, 'the bracket settles on two names', detail(settle.j));
    const res = settle.j.result;
    ok(res && (res.winner === A.me.name || res.winner === B.me.name), 'a champion takes the belt (one of the two names on the card)', detail(res));
    ok(res && res.pool === 50000 && res.prize === 35000, 'seventy percent of the pool is the prize', detail(res));
    ok(res && Array.isArray(res.rounds) && res.rounds.length === 1 && res.rounds[0].rows.length === 1, 'two names make a final');
    const champId = res.winnerId;
    const champMe = (await req('/api/me', { token: champId === A.me.id ? A.tok : B.tok })).j.me;
    ok((champMe.items || {}).champ_belt >= 1, 'the champion walks out with the belt', detail(champMe.items));
    ok(champMe.tourney_wins === 1, 'the win is on the record');
    const t1 = (await req('/api/tourney', { token: A.tok })).j;
    ok(t1.state === 'settled' && t1.result && t1.result.winner === res.winner, 'the card shows the settled bracket', detail(t1.state));
    ok(Array.isArray(t1.lastWeek.result) || t1.lastWeek, 'last week has a home on the card');
  } else {
    console.log('  (card is not open this moment — the entry path is asserted by the fuzzer)');
  }

  // ================================================================ 7. FEATS
  const newFeats = ['first_trip', 'district_hopper', 'street_champ', 'marked_man', 'quiet_words', 'deal_hunter', 'pda_pro'];
  ok(newFeats.every(f => meta.achievements[f]), 'the seven new feats are in the ledger', detail(newFeats.filter(f => !meta.achievements[f])));
  const featsA = (await meA()).achievements;
  ok(!!featsA.first_trip, 'riding the line earned First Ride', detail(Object.keys(featsA)));
  ok(!!featsA.quiet_words, 'paying the fine earned Paid in Full', detail(Object.keys(featsA)));
  ok(!!featsA.marked_man, 'three stars earned Three Stars', detail(Object.keys(featsA)));

  // ================================================================ 8. ONLINE PRESENCE
  // a real wire connection makes A "live" — the roster must see them by name
  const ac = new AbortController();
  const sres = await fetch(BASE + '/api/stream', { headers: { Cookie: 'nsc_t=' + A.tok, Accept: 'text/event-stream' }, signal: ac.signal });
  const sreader = sres.body.getReader();
  const onHello = new Promise(res => { const dec = new TextDecoder(); let buf = ''; const tick = async () => { try { const { value, done } = await sreader.read(); if (done) return res(); buf += dec.decode(value, { stream: true }); if (buf.includes('hello')) res(); else setTimeout(tick, 50); } catch (e) { res(); } }; tick(); });
  await Promise.race([onHello, new Promise(res => setTimeout(res, 2500))]);
  await new Promise(res => setTimeout(res, 300));
  const on = (await req('/api/world/online', { token: A.tok })).j;
  ok(typeof on.online === 'number' && Array.isArray(on.names) && (typeof on.you === 'number' || on.you === null), 'the yard reports who is live', detail(on));
  ok(on.online >= 1 && (on.names || []).some(n => n.name === A.me.name && n.id === A.me.id), 'a live wire connection shows up in the roster by name', detail(on));
  try { ac.abort(); } catch (e) {}

  console.log(`\ncheck-t26: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('check-t26 crashed:', e); process.exit(2); });
