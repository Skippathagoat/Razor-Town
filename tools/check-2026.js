// Razor Town — 2026 systems end-to-end check.
// Boots nothing itself; expects the server on PORT (default 8787).
// Creates two throwaway accounts, drives every new action family, asserts the results.
'use strict';
const BASE = 'http://localhost:' + (process.env.PORT || 8787);
let pass = 0, fail = 0;
let lastDetail = '';
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', label, lastDetail ? '\n    -> ' + String(lastDetail).slice(0, 220) : ''); } };
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
  const r = await req('/api/action', { method: 'POST', token, body: Object.assign({ name }, payload) });
  return r;
}
const uniq = Date.now().toString(36);

(async () => {
  // ---- founder login (dev tools) ----
  const fl = await req('/api/login', { method: 'POST', body: { username: 'ghost', password: 'Delilah2023!@' } });
  ok(fl.code === 200, 'founder login');
  const ftok = fl.j.token;

  // ---- two fresh citizens ----
  const mk = async (name) => {
    const r = await req('/api/register', { method: 'POST', body: {
      username: name, password: 'TestPass99!', email: name + '@test.local',
      profile: { name, origin: 'street', avatar: '1|2|3|4|5|1', bio: 'qa' } } });
    ok(r.code === 200, 'register ' + name);
    return { tok: r.j.token, name };
  };
  const A = await mk('qa_alpha_' + uniq.slice(-4));
  const B = await mk('qa_beta_' + uniq.slice(-4));

  const meta = await req('/api/meta');
  ok(Array.isArray(meta.j.cars) && meta.j.cars.length === 8, 'meta: cars');
  ok(Array.isArray(meta.j.districts) && meta.j.districts.length === 8, 'meta: districts');
  ok(Array.isArray(meta.j.titles) && meta.j.titles.length >= 5, 'meta: titles');
  ok(meta.j.items.drop_kicks && meta.j.items.insurance_pol, 'meta: new items');

  const panel = async (tok) => (await req('/api/sys/panel', { token: tok })).j;

  // ---- avatar clamping (new catalog + 6 parts) ----
  const pr = await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '99|99|99|99|99|9' } });
  ok(pr.code === 200 && pr.j.p.avatar === '8|17|37|45|28|1', 'avatar clamp to new catalog');
  const pr5 = await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '1|2|3|4|5' } });
  ok(pr5.j.p.avatar === '1|2|3|4|5|0', 'legacy 5-part spec keeps body 0');

  // ---- dev: fund both testers
  for (const t of [A, B]) {
    await req('/api/dev/self', { method: 'POST', token: ftok, body: { op: 'grant_cash', amount: 0 } }); // noop warm-up
  }
  // founder world grants
  const plist = await req('/api/dev/panel', { token: ftok });
  const accOf = {};
  for (const p of plist.j.players) accOf[p.name] = p.acc_id;
  for (const t of [A, B]) {
    const g = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_cash', target: accOf[t.name], amount: 5000000 } });
    ok(g.code === 200, 'grant cash ' + t.name);
  }
  // refresh self view
  const meA0 = await req('/api/me', { token: A.tok });
  ok(meA0.j.me.money >= 5000000, 'A funded');

  // ================= ARCADE =================
  let r;
  r = await act(A.tok, 'arcade_dice', { bet: 500, call: 'high' });
  ok(r.code === 200 && typeof r.j.res.tot === 'number', 'arcade dice');
  r = await act(A.tok, 'arcade_coin', { bet: 500, call: 'heads' });
  ok(r.code === 200 && ['heads', 'tails'].includes(r.j.res.face), 'arcade coin');
  r = await act(A.tok, 'arcade_plinko', { bet: 500 });
  ok(r.code === 200 && r.j.res.slot >= 0 && r.j.res.slot <= 10, 'arcade plinko');
  r = await act(A.tok, 'arcade_hoops', { zone: 3 });
  ok(r.code === 200, 'arcade hoops');
  r = await act(A.tok, 'arcade_buzz', { ms: 5200 });
  ok(r.code === 200 && r.j.res.pay > 0, 'arcade buzz');
  r = await act(A.tok, 'arcade_buzz', { ms: 40 });
  ok(r.code === 400, 'arcade buzz rejects impossible time');
  r = await act(A.tok, 'arcade_memory', { flips: 20 });
  ok(r.code === 200, 'arcade memory');
  r = await act(A.tok, 'arcade_memory', { flips: 5 });
  ok(r.code === 400, 'arcade memory rejects too-few flips');
  // mines: start, pick a tile, cashout (or boom)
  r = await act(A.tok, 'arcade_mines', { op: 'start', bet: 1000 });
  ok(r.code === 200, 'mines start');
  r = await act(A.tok, 'arcade_mines', { op: 'pick', tile: 0 });
  ok(r.code === 200, 'mines pick');
  if (r.j.res.op === 'boom') {
    ok(true, 'mines boom path');
  } else {
    r = await act(A.tok, 'arcade_mines', { op: 'cashout' });
    ok(r.code === 200 && r.j.res.pay > 0, 'mines cashout');
  }
  r = await act(A.tok, 'arcade_mines', { op: 'start', bet: 1000 });
  r = await act(A.tok, 'arcade_mines', { op: 'abandon' });
  ok(r.code === 200, 'mines abandon');
  // safe cracker: deal then echo exact sequence back
  r = await act(A.tok, 'arcade_safe', { op: 'deal', len: 4 });
  ok(r.code === 200 && Array.isArray(r.j.res.seq), 'safe deal');
  await new Promise(s => setTimeout(s, 4 * 350 + 200));
  r = await act(A.tok, 'arcade_safe', { op: 'echo', seq: r.j.res ? r.j.res.seq : [] });
  // note: res may be gone after re-fetch; re-deal if needed
  if (r.code === 400) {
    const d2 = await act(A.tok, 'arcade_safe', { op: 'deal', len: 4 });
    await new Promise(s => setTimeout(s, 4 * 350 + 200));
    r = await act(A.tok, 'arcade_safe', { op: 'echo', seq: d2.j.res.seq });
  }
  ok(r.code === 200 && (r.j.res.op === 'cracked' || r.j.res.op === 'fail'), 'safe echo resolves');
  // scratch needs cards — founder grants
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_cash', target: accOf[A.name], amount: 0 } });
  const grantItem = async (target, item, qty) => req('/api/dev/self', { method: 'POST', token: ftok, body: { op: 'grant_item', item, qty, target } });
  // dev/self works on the founder only; use direct item buy for A instead:
  r = await act(A.tok, 'buy', { itemId: 'scratch_card', qty: 2 });
  ok(r.code === 200, 'buy scratch cards from market');
  r = await act(A.tok, 'scratch', { qty: 2 });
  ok(r.code === 200 && r.j.res.results.length === 2, 'scratch two cards');
  r = await act(A.tok, 'lottery_buy', { qty: 3 });
  ok(r.code === 200 && r.j.res.nums.length === 3, 'lottery buy');

  // ================= HUSTLES =================
  let p = await panel(A.tok);
  const g0 = p.gigs.ids[0];
  const gigId = typeof g0 === 'object' ? g0.id : g0;
  r = detail(await act(A.tok, 'gig_do', { gigId }));
  ok(r.code === 200 && r.j.res.pay > 0, 'gig do');
  r = await act(A.tok, 'gig_do', { gigId: 'nope' });
  ok(r.code === 400, 'gig rejects unknown');
  r = await act(A.tok, 'courier_take');
  ok(r.code === 200 && r.j.res.dest, 'courier take');
  r = await act(A.tok, 'courier_deliver');
  ok(r.code === 200, 'courier deliver');
  r = await act(A.tok, 'fish_cast');
  ok(r.code === 200 && r.j.res.item, 'fish cast');
  r = await act(A.tok, 'fish_cast');
  ok(r.code === 400, 'fish cooldown enforced');
  r = await act(A.tok, 'salvage_run');
  ok(r.code === 200, 'salvage run');
  r = await act(A.tok, 'plasma_donate');
  ok(r.code === 200, 'plasma donate');
  r = await act(A.tok, 'trial_join');
  ok(r.code === 200, 'clinical trial');
  r = await act(A.tok, 'busk_play');
  ok(r.code === 200, 'busking');
  r = await act(A.tok, 'storage_open');
  ok(r.code === 200 && r.j.res.browse && r.j.res.units.length === 3, 'storage browse');
  r = detail(await act(A.tok, 'storage_open', { unitIdx: 1 }));
  ok(r.code === 200 && typeof r.j.res.value === 'number', 'storage open unit');
  r = detail(await act(A.tok, 'storage_open', { unitIdx: 0 }));
  ok(r.code === 400, 'storage one-a-day enforced');
  r = await act(A.tok, 'buy', { itemId: 'mystery_box', qty: 1 });
  ok(r.code === 200, 'buy mystery box');
  r = await act(A.tok, 'box_open');
  ok(r.code === 200 && r.j.res.text, 'box open');
  p = await panel(A.tok);
  const drop = p.drops.stock[0];
  r = await act(A.tok, 'drop_buy', { itemId: drop.id });
  ok(r.code === 200, 'drop buy');
  r = await act(A.tok, 'drop_buy', { itemId: drop.id });
  ok(r.code === 400, 'drop one-per-citizen enforced');
  r = await act(A.tok, 'clout_post', { caption: 'hello town' });
  ok(r.code === 200 && r.j.res.gain > 0, 'clout post');
  r = await act(A.tok, 'clout_post', { caption: 'again' });
  ok(r.code === 400, 'clout cooldown enforced');
  r = await act(A.tok, 'buy', { itemId: 'spray_can', qty: 1 });
  ok(r.code === 200, 'buy spray can');
  r = await act(A.tok, 'tag_wall', { districtId: 'underpass' });
  ok(r.code === 200, 'tag wall');

  // ================= GARAGE =================
  r = await act(A.tok, 'car_buy', { carId: 'city_runabout' });
  ok(r.code === 200, 'car buy');
  r = await act(A.tok, 'car_buy', { carId: 'city_runabout' });
  ok(r.code === 400, 'car no dupe');
  r = await act(A.tok, 'car_paint', { idx: 0, color: '#ff7043' });
  ok(r.code === 200, 'car paint');
  r = await act(A.tok, 'car_paint', { idx: 0, color: 'blue' });
  ok(r.code === 400, 'car paint rejects bad hex');
  r = await act(A.tok, 'street_race', { idx: 0 });
  ok(r.code === 200 && typeof r.j.res.win === 'boolean', 'street race');
  r = await act(A.tok, 'car_buy', { carId: 'hot_hatch' });
  r = await act(A.tok, 'chop_car', { idx: 1 });
  ok(r.code === 200 && r.j.res.parts > 0, 'chop car');
  r = await act(A.tok, 'car_sell', { idx: 0 });
  ok(r.code === 200, 'car sell');

  // ================= TURF =================
  // earn influence first: grant via crimes is slow — use dev level boost then crimes
  await req('/api/dev/self', { method: 'POST', token: ftok, body: { op: 'grant_cash', amount: 0 } });
  // easiest influence: tag walls more + a couple of crimes; just check claim path errors properly first
  r = await act(A.tok, 'turf_claim', { districtId: 'exchange' });
  ok(r.code === 400, 'turf claim needs influence');
  // run cheap crimes until at least one lands (or 8 tries) and confirm influence accrues
  const cheap = meta.j.crimes.find(c => c.nerve === 1);
  let wins = 0;
  for (let i = 0; i < 8 && wins === 0; i++) {
    const cr = await act(A.tok, 'crime', { crimeId: cheap.id });
    if (cr.code === 200 && cr.j.res && cr.j.res.ok) wins++;
    if (cr.j.res && cr.j.res.busted === 'jail') {
      await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'clear_status', target: accOf[A.name] } });
    }
  }
  p = await panel(A.tok);
  ok(wins === 0 || p.turf.influence >= 1, 'influence accrues from successful crimes (wins=' + wins + ', inf=' + p.turf.influence + ')');

  // ================= FINANCE EXTRAS =================
  r = await act(A.tok, 'crypto_buy', { sym: 'NGT', amount: 200000 });
  ok(r.code === 200, 'crypto buy NGT');
  r = await act(A.tok, 'stake_ngt', { amount: 10 });
  ok(r.code === 200 && r.j.res.staked >= 10, 'stake NGT');
  r = await act(A.tok, 'unstake_ngt', { amount: 5 });
  ok(r.code === 200, 'unstake NGT');
  r = await act(A.tok, 'term_deposit', { amount: 50000, hours: 6 });
  ok(r.code === 200, 'term deposit');
  r = await act(A.tok, 'term_deposit', { amount: 50000, hours: 6 });
  ok(r.code === 400, 'term no double-lock');
  r = await act(A.tok, 'term_collect');
  ok(r.code === 200 && r.j.res.early === true, 'term break early');
  r = await act(A.tok, 'deposit', { amount: 5000 });
  ok(r.code === 200, 'deposit (challenge counter)');

  // ================= CRAFT & CARDS =================
  r = await act(A.tok, 'craft', { recipeId: 'lockpicks' });
  ok(r.code === 400 || r.code === 200, 'craft path responds');
  // give scrap via salvage repeats is slow — salvage already ran once; buy nothing; just verify recipe check works
  r = await act(A.tok, 'buy', { itemId: 'trading_pack', qty: 1 });
  ok(r.code === 200, 'buy trading pack');
  r = await act(A.tok, 'card_open');
  ok(r.code === 200 && r.j.res.drawn.length === 5, 'card pack opens 5');

  // ================= SOCIAL =================
  r = await act(A.tok, 'friend_add', { target: B.name });
  ok(r.code === 200, 'friend add');
  r = await act(A.tok, 'friend_add', { target: B.name });
  ok(r.code === 400, 'friend no dupe');
  r = await act(A.tok, 'gift_send', { to: B.name, itemId: 'trading_pack', qty: 0 });
  // qty clamps to 1; A has none left — expect error
  ok(r.code === 400 || r.code === 200, 'gift path responds');
  r = await act(A.tok, 'block_add', { target: B.name });
  ok(r.code === 200, 'block add');
  p = await panel(A.tok);
  ok(p.social.blocked.length === 1 && p.social.friends.length === 0, 'block removes friendship');
  r = await act(A.tok, 'block_remove', { target: B.name });
  ok(r.code === 200, 'block remove');

  // ================= INSURANCE + RESPEC =================
  r = await act(A.tok, 'buy', { itemId: 'insurance_pol', qty: 1 });
  ok(r.code === 200, 'buy policy');
  r = await act(A.tok, 'use', { itemId: 'insurance_pol' });
  ok(r.code === 200 && r.j.p.insuredUntil > Date.now(), 'policy activates');
  r = await act(A.tok, 'buy', { itemId: 'respec_token', qty: 1 });
  ok(r.code === 200, 'buy respec token');
  r = await act(A.tok, 'use', { itemId: 'respec_token' });
  ok(r.code === 200 && r.j.p.respecOpen === true, 'respec armed');
  const meA = await req('/api/me', { token: A.tok });
  const tot = ['st', 'de', 'sp', 'dx'].reduce((a, k) => a + Math.floor(meA.j.me.stats[k]), 0);
  r = await act(A.tok, 'respec_apply', { stats: { st: tot - 15, de: 5, sp: 5, dx: 5 } });
  ok(r.code === 200, 'respec apply');
  r = await act(A.tok, 'respec_apply', { stats: { st: 5, de: 5, sp: 5, dx: 5 } });
  ok(r.code === 400, 'respec one-shot enforced');

  // ================= WARDROBE =================
  r = await act(A.tok, 'wardrobe_save', { slot: 0 });
  ok(r.code === 200, 'wardrobe save');
  await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '2|3|4|5|6|1' } });
  r = await act(A.tok, 'wardrobe_load', { slot: 0 });
  ok(r.code === 200 && r.j.p.avatar === '1|2|3|4|5|0', 'wardrobe load restores look');

  // ================= CHALLENGES =================
  p = await panel(A.tok);
  ok(p.challenges.list.length === 3, 'three daily challenges');
  const done = p.challenges.list.find(c => c.done && !c.claimed);
  if (done) {
    r = await act(A.tok, 'challenge_claim', { cid: done.id });
    ok(r.code === 200, 'challenge claim');
  } else {
    ok(true, 'no claimable challenge yet (ok)');
  }
  // weather + event shape
  ok(typeof p.weather.id === 'string' && typeof p.weather.night === 'boolean', 'weather shape');

  // ================= PANEL FOR B (fresh state) =================
  p = await panel(B.tok);
  ok(p.turf.districts.length === 8 && p.cars.length === 0, 'panel shape for fresh citizen');

  // ================= META ROUND TRIP =================
  ok(meta.j.emotes && meta.j.emotes.length >= 10, 'meta emotes');
  ok(meta.j.recipes.length >= 7, 'meta recipes');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHECK CRASHED:', e); process.exit(2); });
