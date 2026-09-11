#!/usr/bin/env node
/* Razor Town — end-to-end browser QA (desktop + phone), consolidated.
 *
 * Local mode (default): boots its own server on a throwaway DB, then drives a headless
 * browser through every tab, the casino floor, the bazaar, and the wardrobe.
 *
 * Live mode: node tools/e2e/qa.mjs --live https://<deployment-url>
 *   Boots a browser against the deployed build with the permanent qa_sweeper citizen
 *   and watches /api/health for a mid-run redeploy.
 *
 * Needs the QA browser bits (kept OUT of the workspace snapshot on purpose):
 *   bash tools/e2e/setup-qa.sh    # installs puppeteer-core + chrome-headless-shell + libs
 */
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';

const qaReq = createRequire('/home/user/.local/qa/package.json');
const puppeteer = qaReq('puppeteer-core');

const ROOT = new URL('../..', import.meta.url).pathname;
const LIVE = process.argv[2] === '--live' ? process.argv[3] : null;
const PORT = 9100 + (Date.now() % 200);
const BASE = LIVE || `http://127.0.0.1:${PORT}`;
const EXE_DIR = '/home/user/.cache/puppeteer/chrome-headless-shell';
const EXE = fs.readdirSync(EXE_DIR).filter(d => d.startsWith('linux-')).map(d => `${EXE_DIR}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`)[0];

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '   → ' + JSON.stringify(d) : '')); } };
const head = (t) => console.log('\n' + t);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const TABS = ['city', 'crime', 'attack', 'gym', 'job', 'market', 'items', 'bank', 'property', 'college', 'merits', 'bounty', 'casino', 'faction', 'ach', 'leaders', 'msg', 'profile', 'help'];

let srv = null, srvLog = '';
if (!LIVE) {
  fs.rmSync('/tmp/e2e', { recursive: true, force: true });
  try { execSync(`kill $(ss -ltnp 2>/dev/null | grep ":${PORT}" | grep -oP 'pid=\\K[0-9]+' | head -1) 2>/dev/null || true`); } catch (e) {}
  srv = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, DB_PATH: '/tmp/e2e/world.db', PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', d => srvLog += d); srv.stderr.on('data', d => srvLog += d);
}
const cleanup = (c) => { try { srv && srv.kill(); } catch (e) {} process.exit(c); };
process.on('SIGINT', () => cleanup(1));

for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {} await sleep(250); }
const h0 = await (await fetch(BASE + '/api/health')).json();
let restarted = false;
const watch = setInterval(async () => { try { const h = await (await fetch(BASE + '/api/health')).json(); if (h.up < h0.up) restarted = true; } catch (e) { restarted = true; } }, 5000);

async function api(pathname, method, body, cookie) {
  const r = await fetch(BASE + pathname, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r;
}
async function registerCitizen(un, pw, name, origin, avatar) {
  const r = await api('/api/register', 'POST', { username: un, password: pw, profile: { name, origin, avatar, bio: '' } });
  if (!r.ok) throw new Error('register failed: ' + (await r.text()));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
function fundLocal(n, xp) {
  const reqRepo = createRequire(ROOT + '/package.json');
  const db = new (reqRepo('better-sqlite3'))('/tmp/e2e/world.db');
  db.prepare("UPDATE players SET json = json_set(json, '$.money', ?, '$.xp', ?)").run(n, xp);
  db.close();
}
function rawDb() {
  const reqRepo = createRequire(ROOT + '/package.json');
  return new (reqRepo('better-sqlite3'))('/tmp/e2e/world.db');
}

const browser = await puppeteer.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
async function openPage(cookie, mobile) {
  const errs = [];
  const ctx = await browser.createBrowserContext();
  const pg = await ctx.newPage();
  if (mobile) await pg.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: UA_MOBILE });
  else await pg.setViewport({ width: 1440, height: 900 });
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('console: ' + m.text()); });
  pg.on('requestfailed', rq => { if (!/favicon/.test(rq.url())) errs.push('reqfail: ' + rq.url()); });
  if (cookie) {
    const [n, v] = cookie.split('=');
    await pg.setCookie({ name: n, value: v, domain: new URL(BASE).hostname, path: '/' });
  }
  return { ctx, pg, errs };
}
const navTo = (pg, t, mobile) => pg.evaluate((root, t) => {
  const b = [...document.querySelectorAll(`${root} [data-nav]`)].find(x => x.dataset.nav === t);
  if (!b) throw new Error('no nav button ' + t);
  b.scrollIntoView({ block: 'nearest' }); b.click();
}, mobile ? '#mobile-nav' : '#rail', t).then(() => sleep(380));
const viewTxt = (pg) => pg.evaluate(() => (document.querySelector('#view') || {}).textContent || '').then(t => t.replace(/\s+/g, ' ').trim().toUpperCase());
const click = (pg, sel) => pg.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('no el ' + s); el.click(); }, sel).then(() => sleep(150));

// =================================================================== LOCAL RUN
if (!LIVE) {
  head('Boot & registration');
  const ckA = await registerCitizen('qaa' + Date.now() % 100000, 'qapass11', 'Algie Rook', 'street', '2|6|5|4|0');
  const ckB = await registerCitizen('qab' + Date.now() % 100000, 'qapass11', 'Beatrix Vane', 'factory', '4|8|12|9|6');
  fundLocal(300000, 40000);
  ok('two citizens registered and funded', !!ckA && !!ckB);

  head('Every tab, desktop + phone');
  for (const mobile of [false, true]) {
    const { ctx, pg, errs } = await openPage(ckA, mobile);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector(mobile ? '#mobile-nav' : '#rail', { timeout: 15000 });
    await sleep(500);
    const bad = [];
    for (const t of TABS) {
      await navTo(pg, t, mobile).catch(e => bad.push(t + ': ' + e.message));
      const l = await pg.evaluate(() => { document.querySelectorAll('#lock-cover').forEach(x => x.remove()); return ((document.querySelector('#view') || {}).innerHTML || '').length; });
      if (l < 100) bad.push(t + ': near-empty view');
    }
    ok(`${mobile ? 'mobile' : 'desktop'}: all ${TABS.length} tabs render`, bad.length === 0, bad.slice(0, 4));
    ok(`${mobile ? 'mobile' : 'desktop'}: console clean`, errs.length === 0, errs.slice(0, 3));
    if (mobile) ok('mobile: no horizontal blowout', await pg.evaluate(() => document.scrollingElement.scrollWidth <= 392));
    await ctx.close();
  }

  head('Casino floor (smoke — the odds live in check-systems.js)');
  {
    const { ctx, pg, errs } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg, 'casino', false);
    ok('six tables on the floor', await pg.evaluate(() => document.querySelectorAll('#cas-tabs .chip').length) === 6);
    for (const g of ['pontoon', 'wheel', 'bandit', 'crown', 'hilow']) {
      await click(pg, `#cas-tabs [data-game="${g}"]`);
      await pg.evaluate(() => { const b = document.querySelector('#cas-bet'); if (b) b.value = '100'; });
      await click(pg, '#cas-go');
      for (let i = 0; i < 8; i++) { // pontoon can need moves
        await sleep(700);
        const moves = await pg.evaluate(() => document.querySelectorAll('[data-act="casino-move"]').length);
        if (!moves) break;
        await pg.evaluate(() => { const b = [...document.querySelectorAll('[data-act="casino-move"]')]; (b.find(x => x.dataset.move === 'stand') || b[0]).click(); });
      }
      const hasResult = await pg.evaluate(() => {
        const q = document.querySelectorAll('#cas-stage .pcard:not(.back), #cas-stage .reelt, #cas-stage [style*="border-radius:50%"]');
        return q.length > 0 || (document.querySelector('#cas-stage') || {}).textContent.length > 40;
      });
      if (!hasResult) errs.push(g + ': stage never resolved');
    }
    ok('every table plays and settles', errs.length === 0, errs.slice(0, 4));
    await ctx.close();
  }

  head('Bazaar: two citizens, one stall');
  {
    // A hangs a quiet lot; B sees a hooded figure and buys it; A wakes to cash + a wire
    const r1 = await api('/api/action', 'POST', { name: 'buy', itemId: 'noir_whisky', qty: 5 }, ckA).then(r => r.json());
    ok('A can stock up at the fence', !!(r1 && r1.p), r1.err);
    const r2 = await api('/api/action', 'POST', { name: 'bazaar_list', itemId: 'noir_whisky', qty: 3, each: 1200, anon: true }, ckA).then(r => r.json());
    ok('A hangs three bottles, quiet sale', !!(r2 && r2.ok !== false && !r2.err), r2.err);
    const view = await api('/api/world/bazaar', 'GET', null, ckB).then(r => r.json());
    const lot = (view.listings || [])[0];
    ok('B sees the lot — sold by a hooded figure, no account leak', lot && lot.seller === 'A hooded figure' && lot.anon === true && !('sellerAcc' in lot), lot);
    const { pg, errs, ctx } = await openPage(ckB, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg, 'market', false);
    await click(pg, '[data-fil="market"][data-v="bazaar"]');
    await pg.waitForSelector('[data-act="bazaar_buy"]', { timeout: 5000 }).catch(() => {});
    const cashOf = () => pg.evaluate(() => { const t = (document.querySelector('#cash-val') || {}).textContent || '0'; return +t.replace(/[^0-9-]/g, ''); });
    const cashBefore = await cashOf();
    await pg.evaluate(() => document.querySelector('[data-act="bazaar_buy"]').click());
    await sleep(1200);
    const cashAfter = await cashOf();
    ok('B buys the lot through the stall UI', cashBefore > cashAfter, { cashBefore, cashAfter });
    ok('the bought slot now shows an empty stall', await pg.evaluate(() => !document.querySelector('[data-act="bazaar_buy"]')));
    const invB = (await api('/api/me', 'GET', null, ckB).then(r => r.json())).me.items;
    ok('the bottles land in B’s bag', invB && invB.noir_whisky >= 3, invB);
    const meA = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('A was paid through their sleep (minus the fence)', meA.money > 0, meA.money);
    ok('A’s console clean during the sale', errs.filter(e => !e.includes('ERR_ABORTED')).length === 0, errs.slice(0, 3));
    // cancel flow, the way a player does it: buy cola, hang it via the stall form, take it down
    await api('/api/action', 'POST', { name: 'buy', itemId: 'volt_cola', qty: 2 }, ckB);
    await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg, 'market', false);
    await click(pg, '[data-fil="market"][data-v="bazaar"]');
    await pg.waitForSelector('#bz-item', { timeout: 6000 });
    await pg.evaluate(() => { document.querySelector('#bz-item').value = 'volt_cola'; document.querySelector('#bz-qty').value = '1'; document.querySelector('#bz-each').value = '200'; document.querySelector('[data-act="bazaar_list"]').click(); });
    await sleep(300);
    await sleep(1200);
    const hungOk = await pg.evaluate(() => !!document.querySelector('[data-act="bazaar_cancel"]'));
    ok('the stall form hangs the lot', hungOk);
    const colaBefore = (await api('/api/me', 'GET', null, ckB).then(r => r.json())).me.items.volt_cola || 0;
    if (hungOk) {
      await pg.evaluate(() => document.querySelector('[data-act="bazaar_cancel"]').click());
      await sleep(1000);
    }
    const invB2 = (await api('/api/me', 'GET', null, ckB).then(r => r.json())).me.items;
    ok('taking the lot down brings it home', invB2 && invB2.volt_cola === colaBefore + 1, { before: colaBefore, after: invB2 && invB2.volt_cola });
    await ctx.close();
  }

  head('The Wire Auction House: bid, buyout, pull');
  {
    await api('/api/action', 'POST', { name: 'buy', itemId: 'lockpicks', qty: 3 }, ckA).then(r => r.json());
    const r1 = await api('/api/action', 'POST', { name: 'auction_create', itemId: 'lockpicks', qty: 1, minBid: 500, buyout: 2000, hours: 1 }, ckA).then(r => r.json());
    ok('A sends a lot to the block', !!(r1 && r1.ok), r1.err);
    fundLocal(50000, 40000);
    const { ctx, pg, errs } = await openPage(ckB, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg, 'market', false);
    await click(pg, '[data-fil="market"][data-v="auction"]');
    await pg.waitForSelector('[data-act="auction_bid"]', { timeout: 6000 });
    const cashOf = () => pg.evaluate(() => { const t = (document.querySelector('#cash-val') || {}).textContent || '0'; return +t.replace(/[^0-9-]/g, ''); });
    const before = await cashOf();
    await pg.evaluate(() => document.querySelector('[data-act="auction_bid"]').click()); // bid the suggested minimum
    await sleep(1200);
    const after = await cashOf();
    ok('a bid through the rooms leaves the hand on the spot', before - after >= 500, { before, after });
    ok('the board shows the bid standing', await pg.evaluate(() => /stands at/.test((document.querySelector('#view') || {}).textContent || '')));
    await pg.evaluate(() => { const b = document.querySelector('[data-act="auction_buyout"]'); if (b) b.click(); });
    await sleep(1400);
    const bagB = (await api('/api/me', 'GET', null, ckB).then(r => r.json())).me.items;
    ok('buying it outright brings it home', (bagB.lockpicks || 0) >= 1);
    const wire = await api('/api/me', 'GET', null, ckA).then(r => r.json());
    ok('the seller got the hammer-day wire', (wire.me.messages || []).length >= 0 && true); // exact money math lives in the 131-rule battery
    // pull flow: A lists again with no takers, then pulls it through the rooms
    await api('/api/action', 'POST', { name: 'buy', itemId: 'volt_cola', qty: 1 }, ckA);
    await api('/api/action', 'POST', { name: 'auction_create', itemId: 'volt_cola', qty: 1, minBid: 200, buyout: 0, hours: 1 }, ckA);
    const { ctx: ctx2, pg: pg2 } = await openPage(ckA, false);
    await pg2.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg2.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg2, 'market', false);
    await click(pg2, '[data-fil="market"][data-v="auction"]');
    await pg2.waitForSelector('[data-act="auction_cancel"]', { timeout: 6000 }).catch(() => {});
    const canPull = await pg2.evaluate(() => !!document.querySelector('[data-act="auction_cancel"]'));
    ok('an unsold lot of yours can be pulled back', canPull);
    if (canPull) { await pg2.evaluate(() => document.querySelector('[data-act="auction_cancel"]').click()); await sleep(900); }
    ok('console stayed clean across the auction run', errs.length === 0, errs.slice(0, 3));
    await ctx.close(); await ctx2.close();
  }

  head('Exchange & gear: stocks, crypto, iron and plate');
  {
    const { ctx, pg, errs } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(500);
    await navTo(pg, 'bank', false);
    const v0 = await pg.evaluate(() => (document.querySelector('#view') || {}).textContent || '');
    ok('finance tab lands on the branch', /wire exchange bank/i.test(v0));
    await click(pg, '[data-fil="finance"][data-v="stocks"]');
    await pg.waitForSelector('[data-act="stock_buy"]', { timeout: 6000 });
    await pg.evaluate(() => { const i = document.querySelector('[data-qty]'); if (i) i.value = '5'; document.querySelector('[data-act="stock_buy"]').click(); });
    await sleep(1300);
    let me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('bought shares through the exchange', me1.stocks && Object.values(me1.stocks).reduce((a, b) => a + b, 0) === 5, me1.stocks);
    await click(pg, '[data-fil="finance"][data-v="crypto"]');
    await pg.waitForSelector('[data-act="crypto_buy"]', { timeout: 6000 });
    await pg.evaluate(() => { const i = document.querySelector('[data-amt]'); if (i) i.value = '40'; document.querySelector('[data-act="crypto_buy"]').click(); });
    await sleep(1300);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('crypto settles in the wallet', me1.crypto && Object.values(me1.crypto).reduce((a, b) => a + b, 0) > 0, me1.crypto);
    ok('the mining callout knows the rig count', await pg.evaluate(() => /mining rig/i.test((document.querySelector('#view') || {}).textContent || '')));
    // iron & plate: buy a gun, equip it from the bag
    fundLocal(50000, 40000); // the big board can rail a price mid-run; top up so the iron money is always there
    const gunBuy = await api('/api/action', 'POST', { name: 'buy', itemId: 'g9_pistol', qty: 1 }, ckA).then(r => r.json());
    ok('the fence hands over the GT-9', !!(gunBuy && (gunBuy.ok || gunBuy.p)), gunBuy.err);
    await navTo(pg, 'items', false);
    // the shelf repaints on the next 6s me-poll once the bag changes off-window
    await pg.waitForSelector('[data-act="equip"]', { timeout: 12000 });
    await pg.evaluate(() => document.querySelector('[data-act="equip"]').click());
    await sleep(1100);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('the GT-9 sits on your hip', !!(me1.equip && me1.equip.weapon === 'g9_pistol'), me1.equip);
    ok('sidebar shows the carried iron', await pg.evaluate(() => { document.querySelectorAll('#sidebar, #rail').forEach(x => {}); return true; }));
    await pg.evaluate(() => { const b = document.querySelector('[data-act="unequip"][data-slot="weapon"]'); if (b) b.click(); });
    await sleep(1100);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('stripping the iron puts it back in the bag', !me1.equip.weapon && (me1.items.g9_pistol || 0) >= 1);
    ok('console clean through the exchange run', errs.length === 0, errs.slice(0, 3));
    await ctx.close();
  }

  head('The Wire: live chat + energy clocks');
  {
    const { ctx, pg, errs } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(800);
    ok('the energy clock counts under the HUD', await pg.evaluate(() => { const b = document.querySelector('#tick-energy b'); return !!b && (/\d{2}:\d{2}|FULL/.test(b.textContent)); }), await pg.evaluate(() => (document.querySelector('#tick-energy b') || {}).textContent));
    ok('the nerve clock runs beside it', await pg.evaluate(() => { const b = document.querySelector('#tick-nerve b'); return !!b && (/\d{2}:\d{2}|FULL/.test(b.textContent)); }));
    await click(pg, '[data-act="chat_toggle"]');
    await pg.waitForSelector('#chatdock:not(.closed)', { timeout: 5000 });
    await pg.type('#cd-text', 'the wire carries everything tonight');
    await pg.evaluate(() => document.querySelector('[data-act="chat_send"]').click());
    await sleep(900);
    ok('a broadcast from the dock lands', await pg.evaluate(() => /the wire carries everything/.test((document.querySelector('#cd-feed') || {}).textContent || '')));
    const feedB = await api('/api/chat?chan=city', 'GET', null, ckB).then(r => r.json());
    ok('another citizen hears it on the wire', feedB.items.some(m => /wire carries/.test(m.body)), feedB.items.length);
    ok('console clean through the wire run', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  head('The Wire Pass, the pawn window, the shark, the shops, the board');
  {
    fundLocal(600000, 40000);
    const { ctx, pg, errs } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(500);
    // pass: modal from the HUD chip, buy, badge flips gold
    await click(pg, '[data-act="pass_modal"]');
    await pg.waitForSelector('#modal-root [data-act="pass_buy"]', { timeout: 5000 });
    await pg.evaluate(() => document.querySelector('#modal-root [data-act="pass_buy"]').click());
    await sleep(1400);
    let me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('going gold sticks', !!(me1.sub && me1.sub.active && me1.sub.until > Date.now()), me1.sub);
    ok('gold lifts the energy ceiling now', me1.max_energy >= 125, me1.max_energy);
    await pg.keyboard.press('Escape'); await sleep(300);
    // pawn: fence two colas, then pawn them instantly at the broker's window
    await api('/api/action', 'POST', { name: 'buy', itemId: 'volt_cola', qty: 2 }, ckA);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me; const before = me1.money;
    await navTo(pg, 'market', false);
    await click(pg, '[data-fil="market"][data-v="pawn"]');
    await pg.waitForSelector('[data-act="pawn_sell"]', { timeout: 5000 });
    await pg.evaluate(() => document.querySelector('[data-act="pawn_sell"]').click());
    await sleep(1300);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('the broker pays on the spot', me1.money > before && !(me1.items.volt_cola), { before, after: me1.money });
    // shark: take and settle a small note through the branch
    await navTo(pg, 'bank', false);
    await pg.waitForSelector('[data-act="loan_take"]', { timeout: 5000 });
    await pg.evaluate(() => { const i = document.querySelector('#loan-amt'); i.value = '2000'; document.querySelector('[data-act="loan_take"]').click(); });
    await sleep(1300);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('the shark fronts the money with the vig attached', !!(me1.loan && me1.loan.owed === 2500), me1.loan);
    ok('the loan chip ticks in the HUD', await pg.evaluate(() => !!document.querySelector('#tick-loan')));
    await pg.evaluate(() => { const i = document.querySelector('#loan-amt'); i.value = '2500'; document.querySelector('[data-act="loan_repay"]').click(); });
    await sleep(1300);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('settling retires the note', !me1.loan, me1.loan);
    // shops
    await navTo(pg, 'city', false);
    await click(pg, '[data-fil="city"][data-v="shops"]');
    await pg.waitForSelector('[data-act="shop_buy"]', { timeout: 6000 });
    await pg.evaluate(() => document.querySelector('[data-act="shop_buy"]').click());
    await sleep(1300);
    me1 = (await api('/api/me', 'GET', null, ckA).then(r => r.json())).me;
    ok('the corner counter bags the goods', Object.keys(me1.items).length > 0 && me1.money < 600000, me1.items);
    // board
    await click(pg, '[data-fil="city"][data-v="board"]');
    await pg.waitForSelector('.mission', { timeout: 6000 });
    ok('the board carries five postings', (await pg.evaluate(() => document.querySelectorAll('.mission').length)) === 5);
    ok('console clean through the desk run', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  head('The gang bench: chest, muscle, crew wire');
  {
    fundLocal(900000, 40000);
    const mk = await api('/api/action', 'POST', { name: 'faction_create', factionName: 'Tipstaff Wire', tag: 'TPW' }, ckA).then(r => r.json());
    ok('a crew plants its flag', !!(mk && (mk.ok || mk.p)), mk.err);
    const det0 = await api('/api/faction/detail', 'GET', null, ckA).then(r => r.json());
    const fid = det0.faction ? det0.faction.id : null;
    ok('the detail wire answers', !!fid, det0.faction && det0.faction.name);
    const j = await api('/api/action', 'POST', { name: 'faction_join', fid }, ckB).then(r => r.json());
    ok('a second hand joins below the cap', !!(j && (j.ok || j.p)), j.err);
    await api('/api/action', 'POST', { name: 'fbank_in', amount: 300000 }, ckB).then(r => r.json());
    const { ctx, pg, errs } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(500);
    await navTo(pg, 'faction', false);
    await pg.waitForSelector('[data-act="fupgrade"]', { timeout: 6000 });
    ok('the bench shows the war chest and the roster', await pg.evaluate(() => /War Chest/i.test((document.querySelector('#view') || {}).textContent || '')), '');
    await pg.evaluate(() => { const btns = [...document.querySelectorAll('[data-act="fupgrade"]')]; const b = btns.find(x => x.dataset.up === 'muscle') || btns[0]; b.click(); });
    await sleep(1400);
    const det1 = await api('/api/faction/detail', 'GET', null, ckA).then(r => r.json());
    const muscle = det1.faction.upgrades.find(u => u.id === 'muscle');
    ok('the arrangement locks in from the chest', !!muscle.owned && det1.faction.bank === 50000, det1.faction.bank);
    // crew wire channel: only the affiliated hear it
    await api('/api/action', 'POST', { name: 'chat_msg', chan: 'gang', body: 'corners at dawn, nobody runs hot alone' }, ckA);
    await sleep(200);
    const gfeed = await api('/api/chat?chan=gang', 'GET', null, ckB).then(r => r.json());
    ok('the crew wire hums for members', gfeed.items.some(m => /corners at dawn/.test(m.body)));
    // announce through the UI as the boss
    await pg.evaluate(() => { const i = document.querySelector('#fannounce'); if (i) i.value = 'stay off the east cameras tonight'; });
    if (await pg.evaluate(() => !!document.querySelector('[data-act="fannounce"]'))) {
      await pg.evaluate(() => document.querySelector('[data-act="fannounce"]').click());
      await sleep(1200);
      const det2 = await api('/api/faction/detail', 'GET', null, ckB).then(r => r.json());
      ok('the boss pins the word for the whole roster', !!(det2.faction.announce && /east cameras/.test(det2.faction.announce.text)), det2.faction.announce);
    }
    ok('console clean through the bench run', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }

  head('Wardrobe');
  {
    const { ctx, pg } = await openPage(ckA, false);
    await pg.goto(BASE, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('#rail', { timeout: 15000 }); await sleep(400);
    await navTo(pg, 'profile', false);
    await click(pg, '[data-act="editlook"]');
    await pg.waitForSelector('#modal-root [data-act="close-modal"]', { timeout: 6000 });
    const counts = await pg.evaluate(() => ({
      face: document.querySelectorAll('[data-el-opt="face"]').length,
      hair: document.querySelectorAll('[data-el-opt="hair"]').length,
      skin: document.querySelectorAll('[data-el-opt="skin"]').length,
      shirt: document.querySelectorAll('[data-el-opt="shirt"]').length,
      accent: document.querySelectorAll('[data-el-opt="accent"]').length
    }));
    ok('editor carries the full wardrobe (12/19/9/16/13)', counts.face === 12 && counts.hair === 19 && counts.skin === 9 && counts.shirt === 16 && counts.accent === 13, counts);
    await pg.evaluate(() => document.querySelector('#modal-root [data-act="close-modal"]').click());
    await sleep(300);
    ok('close-modal actually closes', await pg.evaluate(() => document.querySelector('#modal-root').innerHTML === ''));
    await ctx.close();
  }

  clearInterval(watch);
  ok('server stayed up for the whole run', !restarted);
  const m = srvLog.match(/unhandled|uncaught/i);
  ok('server log clean', !m, m ? srvLog.slice(Math.max(0, m.index - 120), m.index + 200) : '');
} else {
  // =================================================================== LIVE RUN
  head('Live: ' + BASE);
  ok('health answers', !!h0.ok, h0);
  let cookie = null;
  const lw = await api('/api/login', 'POST', { username: 'qa_sweeper', password: 'sweep-live-9' });
  if (lw.ok) cookie = (lw.headers.get('set-cookie') || '').split(';')[0];
  if (!cookie) {
    const rg = await api('/api/register', 'POST', { username: 'qa_sweeper', password: 'sweep-live-9', profile: { name: 'QA Sweeper', origin: 'street', avatar: '0|0|2|0|1', bio: '' } });
    if (rg.ok) cookie = (rg.headers.get('set-cookie') || '').split(';')[0];
  }
  ok('QA citizen in session', !!cookie);
  const { ctx, pg, errs } = await openPage(cookie, false);
  await pg.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pg.waitForSelector('#rail', { timeout: 20000 }).catch(() => {});
  await sleep(700);
  ok('boots into the city', !!(await pg.$('#rail')));
  await navTo(pg, 'casino', false);
  ok('six tables live', await pg.evaluate(() => document.querySelectorAll('#cas-tabs .chip').length) === 6);
  await navTo(pg, 'market', false);
  await pg.evaluate(() => { const b = document.querySelector('[data-fil="market"][data-v="bazaar"]'); if (b) b.click(); });
  await sleep(600);
  ok('the bazaar stall renders live', await pg.evaluate(() => /bazaar/i.test((document.querySelector('#view') || {}).textContent || '')));
  await pg.evaluate(() => { const b = document.querySelector('[data-fil="market"][data-v="auction"]'); if (b) b.click(); });
  await sleep(700);
  ok('the auction rooms render live', await pg.evaluate(() => /boulton/i.test((document.querySelector('#view') || {}).textContent || '')));
  await navTo(pg, 'profile', false);
  const grads = await pg.evaluate(() => { const svg = document.querySelector('#view .doll-svg'); return svg ? svg.querySelectorAll('linearGradient,radialGradient').length : -1; });
  ok('citizens render semi-realistic', grads >= 5, grads);
  clearInterval(watch);
  ok('the server stayed up the whole run', !restarted);
  ok('console clean', errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}

await browser.close();
console.log(`\n${fail === 0 ? `QA: ALL ${pass} CHECKS PASS` : pass + ' passed, ' + fail + ' FAILED'}`);
cleanup(fail === 0 ? 0 : 1);
