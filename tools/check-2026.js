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
  ok(meta.j.contractCatalog && meta.j.contractCatalog.count === 1000 && meta.j.contractCatalog.offersPerRotation === 3, 'meta: 1,000 City Contracts');

  const panel = async (tok) => (await req('/api/sys/panel', { token: tok })).j;

  // ---- avatar clamping (Rainlight catalog + 8 parts) ----
  const pr = await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '99|99|99|99|99|9|99|99' } });
  ok(pr.code === 200 && pr.j.p.avatar === '15|35|56|38|15|7|11|23', 'avatar clamp to new catalog');
  const pr5 = await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '1|2|3|4|5' } });
  ok(pr5.j.p.avatar === '1|2|3|4|5|0|0|0', 'legacy 5-part spec fills eyes + facial with 0');

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
  ok(r.code === 200 && (r.j.res.op === 'cracked' || r.j.res.op === 'fail'), 'safe echo resolves', detail(r.j));
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
  ok(p.contracts && p.contracts.catalogSize === 1000 && p.contracts.offers.length === 3 && p.contracts.offers.every(c => c.id && c.chance >= 20 && c.chance <= 95), 'City Contracts board serves three valid offers');
  const contract = p.contracts.offers[0];
  r = detail(await act(A.tok, 'city_contract', { contractId: contract.id }));
  ok(r.code === 200 && typeof r.j.res.win === 'boolean' && r.j.res.contract === contract.name, 'City Contract resolves server-side');
  r = await act(A.tok, 'city_contract', { contractId: contract.id });
  ok(r.code === 400, 'City Contract cannot be repeated in a rotation');
  r = await act(A.tok, 'city_contract', { contractId: 'contract_not_on_board' });
  ok(r.code === 400, 'City Contract rejects forged lead');
  p = await panel(A.tok);
  ok(p.contracts.completed === 1, 'City Contract completion persists on the board');
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

  // ================= FOUNDER CONSOLE: THE LONG GAME =================
  for (const op of ['op_rackets', 'op_papers', 'op_vault', 'op_cooldowns', 'op_clear']) {
    const d = await req('/api/dev/self', { method: 'POST', token: ftok, body: { op } });
    ok(d.code === 200, 'founder tool ' + op, detail(d.j && d.j.err));
  }
  {
    const d = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'op_wipe_target', target: accOf[A.name] } });
    ok(d.code === 200, 'founder tool op_wipe_target', detail(d.j && d.j.err));
  }
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
  ok(r.code === 200, 'respec apply', detail(r.j));
  r = await act(A.tok, 'respec_apply', { stats: { st: 5, de: 5, sp: 5, dx: 5 } });
  ok(r.code === 400, 'respec one-shot enforced');

  // ================= INFORMANT NETWORK =================
  {
    // the meta payload advertises the 1,000-lead catalog
    const m2 = await req('/api/meta');
    ok(m2.j.informants && m2.j.informants.count === 1000 && m2.j.informants.perRotation === 6, 'meta: 1,000-informant network');

    // fund the tester so the board is affordable, then read the board
    await req('/api/dev/self', { method: 'POST', token: ftok, body: { op: 'grant_cash', amount: 5000000 } });
    let pn = await panel(A.tok);
    ok(pn.informants && pn.informants.leads.length === 6 && pn.informants.total === 1000, 'panel: six leads ride the board');
    const lead = pn.informants.leads.slice().sort((a, b) => a.price - b.price)[0];
    ok(lead && lead.price > 0 && lead.reliability >= 0.4 && lead.strength > 0, 'panel: a lead carries a price, a reliability and a payout');

    // forged + duplicate guards
    r = await act(A.tok, 'informant_hire', { informantId: 'inf_not_a_real_lead' });
    ok(r.code === 400, 'a forged informant id is refused');
    const offBoard = (pn.informants.leads.some(l => l.id === 'inf_coppers_lock_cut_bribe')) ? 'inf_dockers_lamp_row_edge' : 'inf_coppers_lock_cut_bribe';
    r = await act(A.tok, 'informant_hire', { informantId: offBoard });
    ok(r.code === 400, 'a lead that is not on the board is refused');

    // buy the cheapest lead, then buy it again
    const moneyBefore = (await req('/api/me', { token: A.tok })).j.me.money;
    r = await act(A.tok, 'informant_hire', { informantId: lead.id });
    ok(r.code === 200 && r.j.res && typeof r.j.res.landed === 'boolean' && r.j.p.money === moneyBefore - lead.price, 'buying a lead charges the price and reports the outcome');
    const spent = moneyBefore - r.j.p.money;
    ok(spent === r.j.res.price, 'the reported price is what left the purse');
    const dup = await act(A.tok, 'informant_hire', { informantId: lead.id });
    ok(dup.code === 400, 'the same lead cannot be bought twice in a rotation');
  }

  // ================= FOUNDER CONSOLE =================
  {
    // new self tools
    for (const op of ['make_whole', 'random_look', 'give_all_tips', 'comp_leads', 'cool_heat']) {
      const rr = await req('/api/dev/self', { method: 'POST', token: ftok, body: { op } });
      ok(rr.code === 200, 'founder self tool: ' + op);
    }
    const whole = await req('/api/dev/self', { method: 'POST', token: ftok, body: { op: 'make_whole' } });
    ok(whole.j.me.stats.st === 500 && whole.j.me.level === 100, 'make-me-whole raises stats and level');

    // world dials
    let w = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'weather', kind: 'fog' } });
    ok(w.code === 200 && w.j.weather === 'fog', 'the founder can force the weather');
    w = await panel(A.tok);
    ok(w.weather.id === 'fog' && w.weather.forced, 'the forced weather shows up in the panel');
    w = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'economy', payout: 150, danger: 50 } });
    ok(w.code === 200 && w.j.dials.payout === 150 && w.j.dials.danger === 50, 'the founder can move the economy dials');
    const mt = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'metrics' } });
    ok(mt.code === 200 && mt.j.metrics && mt.j.metrics.informants === 1000 && mt.j.metrics.contracts === 1000, 'the live metrics board reports the catalogs');
    const evId = ((await req('/api/meta')).j.events[0] || {}).id;
    w = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'event', event: evId, minutes: 20 } });
    ok(w.code === 200 && w.j.event === evId, 'the founder can trigger a city event');

    // bot spawning + per-target tools, then clean up
    w = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'spawn_bot', count: 2 } });
    ok(w.code === 200 && w.j.made.length === 2, 'the founder can spawn NPC citizens');
    const botId = w.j.made[0].id;
    for (const [op, body] of [['set_look', {}], ['give_tip', { kind: 'payoff' }], ['set_level_target', { value: 12 }], ['heal_target', {}], ['cool_heat_target', {}]]) {
      const rr = await req('/api/dev/world', { method: 'POST', token: ftok, body: Object.assign({ op, target: botId }, body) });
      ok(rr.code === 200, 'founder world tool: ' + op);
    }
    const botRow = (await req('/api/dev/panel', { token: ftok })).j.players;
    w = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'purge_bots' } });
    ok(w.code === 200 && w.j.purged >= 2, 'the founder can purge every NPC');

    // dials back to neutral so later assertions see a normal world
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'economy', payout: 100, danger: 100 } });
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'weather', kind: 'auto' } });
    ok(Array.isArray(botRow), 'the dev panel still serves its player list');
  }

  // ================= THE LONG GAME — 10,000 UNDERWORLD OPERATIONS =================
  {
    const m3 = await req('/api/meta');
    ok(m3.j.ops && m3.j.ops.total === 10000 && m3.j.ops.perFamily === 1000, 'meta: 10,000-operation catalogue');
    ok(m3.j.ops.families.length === 10 && m3.j.ops.districts === 10 && m3.j.ops.grades === 10, 'meta: ten families, ten districts, ten grades');
    ok(m3.j.ops.families.every(f => f.count === 1000 && f.ico && f.blurb), 'meta: every family carries its own hook');

    let board = await act(A.tok, 'ops', { fam: 'rackets' });
    ok(board.code === 200 && board.j.res.total === 10000 && board.j.res.perFamily === 1000, 'ops board: catalogue totals', detail(board.j));
    const firstOp = (board.j.res.list || [])[0];
    ok(!!firstOp && !!firstOp.id && firstOp.chance > 0 && firstOp.energy > 0 && !!firstOp.blurb && !!firstOp.flavour,
      'ops board: a listing is a complete job card', detail(firstOp));
    ok(board.j.res.list.length === 24 && board.j.res.matched === 1000, 'ops board: one family, paged twenty-four at a time');

    const filtered = await act(A.tok, 'ops', { fam: 'heists', district: 'lock_cut', grade: '9' });
    ok(filtered.j.res.matched === 10 && filtered.j.res.list.every(o => o.district === 'lock_cut' && o.grade === 9), 'ops board: district + grade filters');
    const searched = await act(A.tok, 'ops', { fam: 'heists', q: 'museum' });
    ok(searched.j.res.matched === 100 && searched.j.res.list.every(o => o.cat === 'museum'), 'ops board: full-text search over the family');
    const page1 = await act(A.tok, 'ops', { fam: 'runs', offset: 0, limit: 24 });
    const page2 = await act(A.tok, 'ops', { fam: 'runs', offset: 24, limit: 24 });
    ok(page2.j.res.list.length === 24 && page1.j.res.list[0].id !== page2.j.res.list[0].id, 'ops board: paging moves the window');

    // ---- guards
    r = await act(A.tok, 'op_do', { id: 'ops_not_a_real_job' });
    ok(r.code === 400, 'a forged operation id is refused');
    r = await act(A.tok, 'op_do', { id: 'heists_bank_lock_cut_9' });
    ok(r.code === 400, 'a mythic-grade job is locked far above a fresh citizen');
    r = await act(A.tok, 'op_do', { id: 'heists_bank_lamp_row_0' });
    ok(r.code === 400, 'a heist without a crew behind you is refused');
    r = await act(A.tok, 'op_sell', { idx: 0 });
    ok(r.code === 400, 'selling from an empty vault is refused');
    r = await act(A.tok, 'doc_use', { id: 'prints_ids_lamp_row_0' });
    ok(r.code === 400, 'using a document you never printed is refused');
    r = await act(A.tok, 'op_collect');
    ok(r.code === 400, 'collecting when nothing is running is refused');

    // ---- a real racket, funded and collected
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_cash', target: accOf[A.name], amount: 100000 } });
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_cash', target: accOf[A.name], amount: 100000 } });
    const m0 = (await req('/api/me', { token: A.tok })).j.me.money;
    r = await act(A.tok, 'op_do', { id: 'rackets_protection_lamp_row_0' });
    ok(r.code === 200 && r.j.res.kind === 'racket' && r.j.p.money === m0 - 4500, 'setting up a racket charges the sticker price', detail(r.j.res));
    board = await act(A.tok, 'ops', { fam: 'rackets' });
    ok(board.j.res.rackets.length === 1 && board.j.res.list.some(o => o.id === 'rackets_protection_lamp_row_0' && o.owned), 'a standing racket shows as running on the board');
    r = await act(A.tok, 'op_collect');
    ok(r.code === 200 && Array.isArray(r.j.res.lines) && r.j.res.lines.length === 1, 'collecting a racket that has not banked yet is handled');
    const run0 = board.j.res.rackets[0];
    ok(run0 && ['ico', 'name', 'value', 'full', 'nextIn', 'rate', 'hours'].every(k => k in run0),
      'a running racket carries every field the tab prints', detail(run0));
    const card0 = board.j.res.list.find(o => o.id === 'rackets_protection_lamp_row_0');
    ok(card0 && card0.owned === true && Number.isFinite(card0.rate) && card0.rate > 0, 'an owned card carries its banking rate', detail(card0));

    // ---- a one-shot job, its cooldown and its heat
    const heatBefore = (await panel(A.tok)).street.heat;
    r = await act(A.tok, 'op_do', { id: 'runs_cigs_lamp_row_0' });
    ok(r.code === 200 && typeof r.j.res.win === 'boolean' && !!r.j.res.text, 'a smuggling run resolves with a real outcome', detail(r.j.res));
    const dup = await act(A.tok, 'op_do', { id: 'runs_cigs_lamp_row_0' });
    ok(dup.code === 400, 'a job that is still settling cannot be run twice');
    ok((await panel(A.tok)).street.heat > heatBefore, 'a night on the road leaves heat behind');

    // ---- forgery → a document you can actually burn
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'clear_status', target: accOf[A.name] } });
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'refill', target: accOf[A.name] } });
    let printed = await act(A.tok, 'op_do', { id: 'prints_ids_lamp_row_0' });
    ok(printed.code === 200 && printed.j.res.kind === 'forgery', 'forgery resolves with a printing outcome', detail(printed.j.res));
    if (!printed.j.res.win) printed = await act(A.tok, 'op_do', { id: 'prints_plates_lamp_row_0' });   // a second press, so the papers check always runs
    board = await act(A.tok, 'ops', { fam: 'prints' });
    ok(Array.isArray(board.j.res.docs) && board.j.res.docs.length > 0, 'the board reports the papers you are holding', detail(board.j.res.docs));
    const held = (board.j.res.docs || [])[0];
    ok(!held || ['id', 'ico', 'catName', 'n', 'cat'].every(k => k in held), 'a held document carries every field the tab prints', detail(held));
    if (held) {
      const used = await act(A.tok, 'doc_use', { id: held.id });
      ok(used.code === 200 && !!used.j.res.text, 'a printed document can be burned for its effect', detail(used.j));
    }

    // ---- the clinic, the vault and the panel summary
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'refill', target: accOf[A.name] } });
    const injured = await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'hospital', target: accOf[A.name] } });
    ok(injured.code === 200, 'dev: the tester is put in a ward');
    const healed = await act(A.tok, 'op_do', { id: 'clinic_stitch_lamp_row_0' });
    ok(healed.code === 200 && healed.j.res.kind === 'clinic', 'the back-alley clinic treats real injuries', detail(healed.j.res));
    ok((await req('/api/me', { token: A.tok })).j.me.life > 1, 'the clinic puts life back on the clock');

    const pn2 = await panel(A.tok);
    ok(pn2.ops && pn2.ops.total === 10000 && pn2.ops.perFamily === 1000 && pn2.ops.finished >= 3 && pn2.ops.spent > 0,
      'panel: the long game summary counts jobs, spending and takings', detail(pn2.ops));

    // ---- a levelled citizen can reach the deep end of the book
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_xp', target: accOf[A.name], amount: 3000000 } });
    await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'reset_cooldowns', target: accOf[A.name] } });
    const deepBoard = await act(A.tok, 'ops', { fam: 'runs', district: 'lock_cut', grade: '9' });
    const deepOp = (deepBoard.j.res.list || []).find(o => !o.locked);
    ok(!!deepOp, 'after a grant of experience the deep end of the book unlocks', detail(deepBoard.j.res.list[0]));
    r = await act(A.tok, 'op_do', { id: 'runs_weapons_lock_cut_9' });
    ok(r.code === 200 && (r.j.res.win === true || r.j.res.win === false), 'a mythic-grade smuggling run resolves end to end', detail(r.j.res));
  }

  // ================= WARDROBE =================
  r = await act(A.tok, 'wardrobe_save', { slot: 0 });
  ok(r.code === 200, 'wardrobe save');
  await req('/api/updateprofile', { method: 'POST', token: A.tok, body: { avatar: '2|3|4|5|6|1|2|3' } });
  r = await act(A.tok, 'wardrobe_load', { slot: 0 });
  ok(r.code === 200 && r.j.p.avatar === '1|2|3|4|5|0|0|0', 'wardrobe load restores look');

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
