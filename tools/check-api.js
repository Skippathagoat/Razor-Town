#!/usr/bin/env node
/* Razor Town — does the whole game actually play?
 *
 *   node tools/check-api.js
 *
 * Starts a throwaway server on its own port and database, then drives every
 * gameplay system through the real HTTP API the way a player would: register,
 * log in, commit crimes, train, work, trade, bank, buy property, study, gamble
 * on all six tables, run the bazaar and auction house, found a gang, message
 * and wire cash, claim the daily, bet the circuit, take a loan, pawn goods,
 * equip gear, play the market, fight, place bounties, and do the whole
 * jail/prison/bail loop. It fails on any 4xx/5xx that should have been a
 * success (and vice versa), any malformed response, or if the server dies.
 *
 * Complements tools/check-systems.js (rule-level assertions) and
 * tools/check-http.js (resilience): this one proves the happy paths.
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.CHECK_PORT || '8941';
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-api-'));
const DB = path.join(DIR, 'world.db');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  \u2713 ' + m); };
const bad = (m, d) => { fail++; console.log('  \u2717 ' + m + (d !== undefined ? '   \u2192 ' + JSON.stringify(d).slice(0, 220) : '')); };

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function call(p, method, body, cookie) {
  try {
    const r = await fetch('http://127.0.0.1:' + PORT + p, {
      method, redirect: 'manual',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null; try { json = await r.json(); } catch (e) {}
    return { status: r.status, json, cookie: r.headers.get('set-cookie') || '' };
  } catch (e) { return { status: 0, json: { err: String(e.message) }, cookie: '' }; }
}
const session = (resp) => (resp.cookie || '').split(';')[0];

(async () => {
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: { ...process.env, DB_PATH: DB, PORT, BOTS: '0' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => { log += d; });
  srv.stderr.on('data', d => { log += d; });

  let alive = false;
  for (let i = 0; i < 60; i++) {
    const h = await call('/api/health', 'GET');
    if (h.status === 200) { alive = true; break; }
    await wait(250);
  }
  if (!alive) { console.log('  \u2717 the server never came up\n' + log.slice(-2000)); process.exit(1); }
  ok('the server boots and answers /api/health');

  const db = new (require(path.join(ROOT, 'node_modules', 'better-sqlite3')))(DB);
  const setJson = (acc, expr) => db.prepare(`UPDATE players SET json = json_set(json, ${expr}) WHERE acc_id=?`).run(acc);
  const founderId = () => db.prepare("SELECT id FROM accounts WHERE username='ghost'").get().id;

  console.log('\n-- auth & boot --');
  const founder = session(await call('/api/login', 'POST', { username: 'ghost', password: 'Delilah2023!@' }));
  founder ? ok('founder (ghost) logs in with the seeded password') : bad('founder login', founder);
  const founderBad = await call('/api/login', 'POST', { username: 'ghost', password: 'wrongpass1' });
  founderBad.status === 401 ? ok('a wrong password is refused') : bad('wrong password refused', founderBad);

  const regA = await call('/api/register', 'POST', { username: 'alfie', password: 'password1', email: 'alfie@test.io', profile: { name: 'Alfie Riggs', origin: 'street', avatar: '1|2|3|4|1', bio: 'A lad' } });
  (regA.status === 200 && regA.json && regA.json.ok && regA.json.me && regA.json.me.name === 'Alfie Riggs')
    ? ok('citizen A registers (name, origin, avatar)') : bad('citizen A registration', regA);
  const A = session(regA);
  const regB = await call('/api/register', 'POST', { username: 'bessie', password: 'password1', email: 'bessie@test.io', profile: { name: 'Bessie Vale', origin: 'bruiser', avatar: '0|0|0|0|0' } });
  (regB.status === 200 && regB.json && regB.json.ok) ? ok('citizen B registers') : bad('citizen B registration', regB);
  const B = session(regB);
  const aId = regA.json.me.id, bId = regB.json.me.id;
  (Number.isInteger(aId) && Number.isInteger(bId) && aId !== bId) ? ok('register returns distinct account ids') : bad('account ids', { aId, bId });

  (await call('/api/register', 'POST', { username: 'alfie', password: 'password1', email: 'x@test.io', profile: { name: 'Copy Cat', origin: 'street' } })).status === 400
    ? ok('a duplicate username is refused') : bad('duplicate username refused');
  (await call('/api/register', 'POST', { username: 'nomail', password: 'password1', profile: { name: 'No Mail' } })).status === 400
    ? ok('registration without an email is refused') : bad('missing-email registration refused');
  const mailLogin = await call('/api/login', 'POST', { username: 'alfie@test.io', password: 'password1' });
  (mailLogin.status === 200 && mailLogin.json.me.name === 'Alfie Riggs') ? ok('an account can log in with its email') : bad('email login', mailLogin);
  const meta = await call('/api/meta', 'GET');
  (meta.status === 200 && meta.json.crimes && meta.json.items && meta.json.origins) ? ok('/api/meta serves content') : bad('/api/meta', meta);
  const meA = await call('/api/me', 'GET', null, A);
  (meA.status === 200 && meA.json.me.name === 'Alfie Riggs') ? ok('/api/me returns the logged-in self') : bad('/api/me', meA);

  console.log('\n-- crime --');
  const crime1 = await call('/api/action', 'POST', { name: 'crime', crimeId: 'shoplift' }, founder);
  (crime1.status === 200 && crime1.json.res && crime1.json.res.ok !== undefined) ? ok('a crime resolves (success or clean bust)') : bad('crime', crime1);
  (await call('/api/action', 'POST', { name: 'crime', crimeId: 'nonsense' }, founder)).status === 400
    ? ok('an unknown crime is refused') : bad('unknown crime refused');
  const heist = await call('/api/action', 'POST', { name: 'crime', crimeId: 'hs_cour_hit' }, founder);
  (heist.status === 400 && /chain order|stage/i.test(heist.json.err || '')) ? ok('a heist stage out of order is refused') : bad('heist stage gating', heist);

  console.log('\n-- gym --');
  const train = await call('/api/action', 'POST', { name: 'train', stat: 'st', gymId: 'abandoned_gym' }, founder);
  (train.status === 200 && train.json.res && train.json.res.gain > 0) ? ok('training a stat works') : bad('train', train);

  console.log('\n-- jobs --');
  (await call('/api/action', 'POST', { name: 'job_apply', jobId: 'taxi' }, A)).status === 400
    ? ok('a level-gated job (taxi, lvl 4) is refused at level 1') : bad('job level gate');
  const apply = await call('/api/action', 'POST', { name: 'job_apply', jobId: 'diner' }, A);
  (apply.status === 200 && apply.json.p.job === 'diner') ? ok('a starter job can be taken') : bad('job apply', apply);
  const work = await call('/api/action', 'POST', { name: 'work' }, A);
  (work.status === 200 && work.json.res && work.json.res.pay > 0) ? ok('working a shift pays') : bad('work', work);
  const quit = await call('/api/action', 'POST', { name: 'job_quit' }, A);
  (quit.status === 200 && quit.json.p.job === null) ? ok('a job can be quit') : bad('job quit', quit);

  console.log('\n-- market / items --');
  const buy = await call('/api/action', 'POST', { name: 'buy', itemId: 'volt_cola', qty: 2 }, A);
  (buy.status === 200 && buy.json.p.items.volt_cola >= 2) ? ok('buying items works') : bad('buy', buy);
  const use = await call('/api/action', 'POST', { name: 'use', itemId: 'volt_cola' }, A);
  (use.status === 200 && use.json.res && use.json.res.used === true) ? ok('using a consumable works') : bad('use', use);
  // Alfie started with 2 volt_cola (street starter): +2 bought, -1 drunk = 3 held.
  (await call('/api/action', 'POST', { name: 'sell', itemId: 'volt_cola', qty: 3 }, A)).status === 200
    ? ok('selling items works') : bad('sell');
  (await call('/api/action', 'POST', { name: 'use', itemId: 'volt_cola' }, A)).status === 400
    ? ok('using what you do not own is refused') : bad('use-without-owning refused');

  console.log('\n-- bank --');
  const dep = await call('/api/action', 'POST', { name: 'deposit', amount: 100000 }, founder);
  (dep.status === 200 && dep.json.p.bank >= 100000) ? ok('depositing cash works') : bad('deposit', dep);
  (await call('/api/action', 'POST', { name: 'withdraw', amount: 50000 }, founder)).status === 200
    ? ok('withdrawing cash works') : bad('withdraw');
  (await call('/api/action', 'POST', { name: 'withdraw', amount: 999999999999 }, founder)).status === 400
    ? ok('over-withdrawing is refused') : bad('over-withdraw refused');

  console.log('\n-- property --');
  const prop = await call('/api/action', 'POST', { name: 'property_buy', propertyId: 'cottage' }, founder);
  (prop.status === 200 && prop.json.p.property === 'cottage') ? ok('buying a property works') : bad('property buy', prop);
  (await call('/api/action', 'POST', { name: 'property_upgrade', upgradeId: 'stove' }, founder)).status === 200
    ? ok('buying a property upgrade works') : bad('property upgrade');
  const vin = await call('/api/action', 'POST', { name: 'vault_in', amount: 1000 }, founder);
  (vin.status === 200 && vin.json.p.vault >= 1000) ? ok('hiding cash in the safe works') : bad('vault in', vin);
  const vout = await call('/api/action', 'POST', { name: 'vault_out', amount: 500 }, founder);
  (vout.status === 200 && vout.json.p.vault >= 500) ? ok('taking cash from the safe works') : bad('vault out', vout);
  const psell = await call('/api/action', 'POST', { name: 'property_sell' }, founder);
  (psell.status === 200 && psell.json.p.property === 'shack') ? ok('selling up and moving out works') : bad('property sell', psell);

  console.log('\n-- college / merits --');
  const course = await call('/api/action', 'POST', { name: 'course_start', courseId: 'bookkeeping' }, founder);
  (course.status === 200 && course.json.p.course && course.json.p.course.id === 'bookkeeping') ? ok('enrolling on a course works') : bad('course start', course);
  (await call('/api/action', 'POST', { name: 'course_start', courseId: 'shorthand' }, founder)).status === 400
    ? ok('a second course while enrolled is refused') : bad('double course refused');
  const cq = await call('/api/action', 'POST', { name: 'course_quit' }, founder);
  (cq.status === 200 && cq.json.p.course === null) ? ok('quitting a course works') : bad('course quit', cq);
  (await call('/api/action', 'POST', { name: 'course_start', courseId: 'accountancy' }, founder)).status === 400
    ? ok('a prerequisite-gated course (accountancy) is refused') : bad('course prereq gate');
  setJson(aId, "'$.merits', 3");
  const merit = await call('/api/action', 'POST', { name: 'merit_buy', perkId: 'energy' }, A);
  (merit.status === 200 && merit.json.p.perks && merit.json.p.perks.energy === 1) ? ok('spending a merit on a perk works') : bad('merit buy', merit);

  console.log('\n-- casino (six tables) --');
  const grey = await call('/api/action', 'POST', { name: 'casino', game: 'greyhound', bet: 100 }, founder);
  (grey.status === 200 && grey.json.res && grey.json.res.win !== undefined) ? ok('greyhound crash resolves') : bad('greyhound', grey);
  const wheel = await call('/api/action', 'POST', { name: 'casino', game: 'wheel', bet: 100, spot: 'red' }, founder);
  (wheel.status === 200 && wheel.json.res && wheel.json.res.n >= 0) ? ok('roulette resolves') : bad('roulette', wheel);
  (await call('/api/action', 'POST', { name: 'casino', game: 'wheel', bet: 100, spot: 'n:37' }, founder)).status === 400
    ? ok('an out-of-range roulette number is refused (stake refunded)') : bad('roulette range guard');
  const bandit = await call('/api/action', 'POST', { name: 'casino', game: 'bandit', bet: 100 }, founder);
  (bandit.status === 200 && bandit.json.res && bandit.json.res.reels.length === 3) ? ok('the one-armed bandit resolves') : bad('bandit', bandit);
  const crown = await call('/api/action', 'POST', { name: 'casino', game: 'crown', bet: 100, pick: 'crown' }, founder);
  (crown.status === 200 && crown.json.res && crown.json.res.dice.length === 3) ? ok('crown & anchor resolves') : bad('crown & anchor', crown);
  const hilow = await call('/api/action', 'POST', { name: 'casino', game: 'hilow', bet: 100, guess: 'higher' }, founder);
  (hilow.status === 200 && hilow.json.res && hilow.json.res.first && hilow.json.res.second) ? ok('high-low resolves') : bad('high-low', hilow);
  let pt = await call('/api/action', 'POST', { name: 'casino', game: 'pontoon', bet: 100 }, founder);
  let hits = 0;
  while (pt.status === 200 && pt.json.res && pt.json.res.stage !== 'settled' && hits < 8) {
    pt = await call('/api/action', 'POST', { name: 'casino', game: 'pontoon', move: 'hit' }, founder);
    hits++;
  }
  (pt.status === 200 && pt.json.res && pt.json.res.stage === 'settled') ? ok('pontoon deals and settles') : bad('pontoon', pt);

  console.log('\n-- bazaar --');
  setJson(aId, "'$.items.volt_cola', 5");
  (await call('/api/action', 'POST', { name: 'bazaar_list', itemId: 'volt_cola', qty: 2, each: 100, anon: false }, A)).status === 200
    ? ok('listing a lot on the bazaar works') : bad('bazaar list');
  const bz = await call('/api/world/bazaar', 'GET', null, A);
  (bz.status === 200 && bz.json.listings.some(l => l.seller === 'Alfie Riggs')) ? ok('the bazaar shows the listing') : bad('bazaar view', bz);
  const bzBuy = await call('/api/action', 'POST', { name: 'bazaar_buy', listingId: bz.json.listings[0].id }, founder);
  (bzBuy.status === 200 && bzBuy.json.p.items.volt_cola >= 2) ? ok('buying a whole lot works') : bad('bazaar buy', bzBuy);

  console.log('\n-- auction house --');
  const auc = await call('/api/action', 'POST', { name: 'auction_create', itemId: 'volt_cola', qty: 1, minBid: 100, buyout: 500, hours: 1 }, founder);
  (auc.status === 200 && auc.json.id) ? ok('creating an auction lot works') : bad('auction create', auc);
  const aucView = await call('/api/world/auctions', 'GET', null, B);
  (aucView.status === 200 && aucView.json.listings.some(l => l.id === auc.json.id)) ? ok('the auction board shows the lot') : bad('auction view', aucView);
  (await call('/api/action', 'POST', { name: 'auction_bid', auctionId: auc.json.id, amount: 100 }, B)).status === 200
    ? ok('placing an opening bid works') : bad('auction bid');
  const aucBuy = await call('/api/action', 'POST', { name: 'auction_bid', auctionId: auc.json.id, amount: 500 }, B);
  (aucBuy.status === 200 && aucBuy.json.res && aucBuy.json.res.bought === true) ? ok('a buyout ends the sale and delivers the lot') : bad('auction buyout', aucBuy);

  console.log('\n-- factions --');
  const fac = await call('/api/action', 'POST', { name: 'faction_create', factionName: 'The Yard Dogs', tag: 'YD' }, founder);
  (fac.status === 200 && fac.json.p.faction) ? ok('founding a gang works') : bad('faction create', fac);
  const fid = fac.json.p.faction;
  const facJoin = await call('/api/action', 'POST', { name: 'faction_join', fid }, B);
  (facJoin.status === 200 && facJoin.json.p.faction === fid) ? ok('joining a gang works') : bad('faction join', facJoin);
  const facDetail = await call('/api/faction/detail', 'GET', null, founder);
  (facDetail.status === 200 && facDetail.json.faction && facDetail.json.faction.roster.length === 2 && facDetail.json.faction.operations.length >= 4)
    ? ok('the gang page shows the roster and operation board') : bad('faction detail', facDetail);
  const recruitMode = await call('/api/action', 'POST', { name: 'faction_recruiting', mode: 'apply' }, founder);
  recruitMode.status === 200 ? ok('a boss can switch recruitment to applications') : bad('recruitment setting', recruitMode);
  const crewApply = await call('/api/action', 'POST', { name: 'faction_apply', fid }, A);
  (crewApply.status === 200 && crewApply.json.res && crewApply.json.res.pending) ? ok('a citizen can apply to a controlled roster') : bad('faction application', crewApply);
  const review = await call('/api/action', 'POST', { name: 'faction_review', targetId: aId, decision: 'accept' }, founder);
  (review.status === 200 && review.json.res && review.json.res.decision === 'accepted') ? ok('officers can accept an application') : bad('faction review', review);
  const crewRoll = await call('/api/action', 'POST', { name: 'faction_roll' }, B);
  (crewRoll.status === 200 && crewRoll.json.res && crewRoll.json.res.chestPay > 0) ? ok('crew roll pays a member and the chest') : bad('crew roll', crewRoll);
  const crewOp = await call('/api/action', 'POST', { name: 'faction_operation', opId: 'corner_sweep' }, B);
  (crewOp.status === 200 && crewOp.json.res && typeof crewOp.json.res.success === 'boolean') ? ok('a crew operation resolves server-side') : bad('crew operation', crewOp);
  (await call('/api/action', 'POST', { name: 'faction_leave' }, B)).status === 200 ? ok('leaving a gang works') : bad('faction leave B');
  (await call('/api/action', 'POST', { name: 'faction_leave' }, A)).status === 200 ? ok('an accepted member can leave cleanly') : bad('faction leave A');
  const facGone = await call('/api/action', 'POST', { name: 'faction_leave' }, founder);
  (facGone.status === 200 && facGone.json.p.faction === null) ? ok('the last owner leaving dissolves the gang') : bad('faction dissolve', facGone);

  console.log('\n-- messages / chat / wire --');
  (await call('/api/action', 'POST', { name: 'msg', to: 'Bessie Vale', body: 'Hello from the yard.' }, A)).status === 200
    ? ok('sending a message by name works') : bad('send message');
  const inbox = await call('/api/messages', 'GET', null, B);
  (inbox.status === 200 && inbox.json.inbox.some(m => m.from === 'Alfie Riggs')) ? ok('the recipient inbox has the message') : bad('inbox', inbox);
  (await call('/api/action', 'POST', { name: 'chat_msg', chan: 'city', body: 'Evening all' }, A)).status === 200
    ? ok('posting to the city wire works') : bad('chat post');
  const feed = await call('/api/chat?chan=city&since=0', 'GET', null, A);
  (feed.status === 200 && feed.json.items.some(m => m.body === 'Evening all')) ? ok('the chat feed has the post') : bad('chat feed', feed);
  const wire = await call('/api/action', 'POST', { name: 'wire', to: 'Bessie Vale', amount: 1000, note: 'drinks' }, founder);
  (wire.status === 200 && wire.json.res && wire.json.res.amt === 1000) ? ok('wiring cash to a citizen works') : bad('wire', wire);

  console.log('\n-- daily / wheel / circuit --');
  const daily = await call('/api/action', 'POST', { name: 'daily' }, founder);
  (daily.status === 200 && daily.json.res && daily.json.res.pay > 0) ? ok('claiming the daily streak works') : bad('daily', daily);
  (await call('/api/action', 'POST', { name: 'daily' }, founder)).status === 400 ? ok('the daily cannot be claimed twice') : bad('daily twice refused');
  const spin = await call('/api/action', 'POST', { name: 'spin_wheel' }, founder);
  (spin.status === 200 && spin.json.res && spin.json.res.index >= 0) ? ok('spinning the big wheel works') : bad('spin wheel', spin);
  const races = await call('/api/world/races', 'GET', null, founder);
  (races.status === 200 && races.json.round && races.json.round.runners.length === 6) ? ok('the circuit board serves six runners') : bad('circuit board', races);
  if (races.status === 200 && races.json.round && !races.json.round.settled) {
    const rb = await call('/api/action', 'POST', { name: 'race_bet', runner: 0, stake: 10 }, founder);
    (rb.status === 200 && rb.json.res && rb.json.res.stake === 10) ? ok('placing a circuit ticket works') : bad('circuit bet', rb);
  }

  console.log('\n-- shops / loan / pawn / gear / market --');
  const shops = await call('/api/shops', 'GET', null, A);
  (shops.status === 200 && shops.json.shops && shops.json.shops.length === 3) ? ok('the corner shops serve stock') : bad('shops', shops);
  (await call('/api/action', 'POST', { name: 'shop_buy', shopId: 'allnight', itemId: 'volt_cola' }, A)).status === 200
    ? ok('buying from a corner shop works') : bad('shop buy');
  const loan = await call('/api/action', 'POST', { name: 'loan_take', amount: 100000 }, founder);
  (loan.status === 200 && loan.json.p.loan && loan.json.p.loan.owed === 125000) ? ok('taking a shark loan applies the vig') : bad('loan take', loan);
  const repay = await call('/api/action', 'POST', { name: 'loan_repay', amount: 125000 }, founder);
  (repay.status === 200 && repay.json.res && repay.json.res.cleared === true && repay.json.p.loan === null) ? ok('repaying a loan clears it') : bad('loan repay', repay);
  setJson(aId, "'$.items.neon_phone', 2");
  const pawn = await call('/api/action', 'POST', { name: 'pawn_sell', itemId: 'neon_phone', qty: 999 }, A);
  (pawn.status === 200 && pawn.json.res && pawn.json.res.take > 0) ? ok('pawning the lot pays out') : bad('pawn', pawn);
  db.prepare(`UPDATE players SET json = json_set(json, '$.items.g9_pistol', 1) WHERE acc_id=?`).run(founderId());
  const equip = await call('/api/action', 'POST', { name: 'equip', itemId: 'g9_pistol' }, founder);
  (equip.status === 200 && equip.json.p.equip && equip.json.p.equip.weapon === 'g9_pistol') ? ok('equipping a weapon works') : bad('equip', equip);
  const uneq = await call('/api/action', 'POST', { name: 'unequip', slot: 'weapon' }, founder);
  (uneq.status === 200 && uneq.json.p.equip && uneq.json.p.equip.weapon === null) ? ok('unequipping works') : bad('unequip', uneq);
  const stBuy = await call('/api/action', 'POST', { name: 'stock_buy', sym: 'RZST', qty: 10 }, founder);
  (stBuy.status === 200 && stBuy.json.p.stocks && stBuy.json.p.stocks.RZST === 10) ? ok('buying shares works') : bad('stock buy', stBuy);
  const stSell = await call('/api/action', 'POST', { name: 'stock_sell', sym: 'RZST', qty: 5 }, founder);
  (stSell.status === 200 && stSell.json.p.stocks && stSell.json.p.stocks.RZST === 5) ? ok('selling shares works') : bad('stock sell', stSell);
  const crBuy = await call('/api/action', 'POST', { name: 'crypto_buy', sym: 'RZC', amount: 100 }, founder);
  (crBuy.status === 200 && crBuy.json.p.crypto && crBuy.json.p.crypto.RZC > 0) ? ok('buying crypto works') : bad('crypto buy', crBuy);
  (await call('/api/action', 'POST', { name: 'crypto_sell', sym: 'RZC', qty: crBuy.json.p.crypto.RZC }, founder)).status === 200
    ? ok('selling crypto works') : bad('crypto sell');

  console.log('\n-- pvp fight --');
  const targets = await call('/api/attacks', 'GET', null, founder);
  (targets.status === 200 && Array.isArray(targets.json.targets)) ? ok('the attack target list serves') : bad('attack targets', targets);
  const fight = await call('/api/action', 'POST', { name: 'attack', targetId: bId }, founder);
  (fight.status === 200 && fight.json.res && fight.json.res.win !== undefined) ? ok('attacking another citizen resolves') : bad('attack', fight);
  const bMe = await call('/api/me', 'GET', null, B);
  (bMe.status === 200 && (bMe.json.me.wins > 0 || bMe.json.me.losses > 0)) ? ok('the defender\u2019s record updates after a fight') : bad('defender record', bMe);

  console.log('\n-- bounties --');
  const bounty = await call('/api/action', 'POST', { name: 'bounty_place', targetId: bId, amount: 5000, anon: false }, founder);
  (bounty.status === 200 && bounty.json.bounties && bounty.json.bounties.total >= 5000) ? ok('placing a bounty works') : bad('bounty place', bounty);
  const bounties = await call('/api/world/bounties', 'GET', null, A);
  (bounties.status === 200 && bounties.json.list.some(b => b.id === bId)) ? ok('the bounty board lists the target') : bad('bounty board', bounties);

  console.log('\n-- jail / prison / bail --');
  const jb = await call('/api/dev/world', 'POST', { op: 'jail', target: bId, minutes: 30 }, founder);
  (jb.status === 200) ? ok('the founder can jail a citizen (dev tool)') : bad('dev jail', jb);
  const jail = await call('/api/jail', 'GET', null, A);
  (jail.status === 200 && jail.json.inmates.some(i => i.id === bId)) ? ok('the jail board lists the inmate') : bad('jail board', jail);
  const pw = await call('/api/action', 'POST', { name: 'prison', op: 'work' }, B);
  (pw.status === 200 && pw.json.res && pw.json.res.cigs >= 2) ? ok('an inmate works a laundry shift') : bad('prison work', pw);
  const bail = await call('/api/action', 'POST', { name: 'bail_other', targetId: bId }, founder);
  (bail.status === 200 && bail.json.res && bail.json.res.freed === true) ? ok('the founder posts the inmate\u2019s bail') : bad('bail other', bail);
  const bAfter = await call('/api/me', 'GET', null, B);
  (bAfter.status === 200 && !(bAfter.json.me.jail_until && bAfter.json.me.jail_until > Date.now())) ? ok('the inmate walks free') : bad('inmate freed', bAfter);

  console.log('\n-- uptime / no-crash --');
  const h1 = await call('/api/health', 'GET');
  await wait(300);
  const h2 = await call('/api/health', 'GET');
  (h1.status === 200 && h2.status === 200 && h2.json.up >= h1.json.up) ? ok('the server is still up and its clock ticks') : bad('server alive at the end', { h1: h1.json && h1.json.up, h2: h2.json && h2.json.up });

  console.log('\n' + (fail === 0 ? `ALL ${pass} API CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
  if (log && fail) console.log('--- server log tail ---\n' + log.slice(-1500));
  srv.kill('SIGKILL');
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  process.exit(fail === 0 ? 0 : 1);
})();
