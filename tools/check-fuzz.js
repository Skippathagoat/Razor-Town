#!/usr/bin/env node
/* Razor Town — wiring sweep + action fuzzer.
 *
 *   node tools/check-fuzz.js            (expects a server on PORT, default 8787)
 *
 * Two hunts in one pass:
 *   1. static cross-reference — dead buttons, ghost actions, missing exports, bad catalogue fields
 *   2. every action on the live server, fed malformed payloads — nothing may 5xx or wedge the process
 */
'use strict';
const fs = require('fs');
const ROOT = require('path').join(__dirname, '..') + '/';
const read = (f) => fs.readFileSync(ROOT + f, 'utf8');
const BASE = 'http://localhost:' + (process.env.PORT || 8787);
let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL:', label, detail !== undefined ? '\n    -> ' + String(detail).slice(0, 240) : ''); }
};

// ---------------------------------------------------------------- 1. static sweep
const app = read('public/js/app.js');
const serverSrc = read('server.js');
const S = require(ROOT + 'lib/systems.js'), W = require(ROOT + 'lib/world.js'), AV = require(ROOT + 'public/js/avatar.js');

const acts = new Set([...app.matchAll(/data-act="([a-z0-9_\-]+)"/g)].map(m => m[1]));
const cases = new Set([...app.matchAll(/case '([a-z0-9_\-]+)':/g)].map(m => m[1]));
for (const m of app.matchAll(/if \(a === '([a-z0-9_\-]+)'\)/g)) cases.add(m[1]);
const dead = [];
for (const a of acts) {
  if (cases.has(a)) continue;
  const markup = app.match(new RegExp(`<[^>]*data-act="${a}"[^>]*>`));
  const attrs = markup ? [...markup[0].matchAll(/data-([a-z-]+)=/g)].map(m => m[1]).filter(x => x !== 'act') : [];
  if (!attrs.some(x => app.includes(`[data-${x}]`))) dead.push(a);
}
ok(dead.length === 0, 'every button in the client has a handler', dead.join(', '));

const serverActions = new Set([...serverSrc.matchAll(/^\s{6}([a-z_0-9]+): \(\) =>/gm)].map(m => m[1]));
const sent = new Set([...app.matchAll(/act\('([a-z0-9_]+)'/g)].map(m => m[1]).concat([...app.matchAll(/opRun\('([a-z0-9_]+)'/g)].map(m => m[1])));
const ghost = [...sent].filter(a => !serverActions.has(a));
ok(ghost.length === 0, 'every action the client sends exists on the server', ghost.join(', '));

const missing = [];
for (const f of new Set([...serverSrc.matchAll(/\bS\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1]))) if (!(f in S)) missing.push('S.' + f);
for (const f of new Set([...serverSrc.matchAll(/\bW\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1]))) if (!(f in W)) missing.push('W.' + f);
for (const f of new Set([...app.matchAll(/\bAV\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1]))) if (!(f in AV)) missing.push('AV.' + f);
ok(missing.length === 0, 'every module call in the server and client resolves', missing.join(', '));

const badNums = [];
for (const op of S.OPS.OPS) for (const k of ['level', 'energy', 'nerve', 'cash', 'min', 'max', 'xp', 'rep', 'heat', 'chance']) if (!Number.isFinite(op[k])) badNums.push(`${op.id}.${k}`);
ok(badNums.length === 0, 'all 10,000 operations carry finite numbers', badNums.slice(0, 5).join(', '));
ok(S.INF.INFORMANTS.every(x => Number.isFinite(x.price) && x.price > 0 && Number.isFinite(x.strength)), 'all 1,000 informants carry finite prices');

// the renderer must never emit NaN or undefined for a legal look
{
  let badLook = null;
  for (let i = 0; i < 2000 && !badLook; i++) {
    const look = AV.random('sweep-' + i);
    const svg = AV.svgFor(look, 96) + AV.doll(look, 96);
    if (/NaN|undefined/.test(svg) || !/^<svg/.test(AV.svgFor(look, 96))) badLook = { look, at: svg.slice(0, 80) };
  }
  ok(!badLook, '2,000 random looks render without NaN or undefined', badLook && JSON.stringify(badLook));
}

// every founder button must name a real console op
{
  const app = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  const srv = fs.readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
  const ops = [...new Set([...app.matchAll(/data-act="dev_(?:self|world)"[^>]*data-op="([a-z_]+)"/g)].map(m => m[1]))];
  const dead = ops.filter(op => !new RegExp("case '" + op + "':|if \\(op === '" + op + "'\\)").test(srv));
  ok(ops.length >= 50 && dead.length === 0, `${ops.length} founder buttons name a real console op`, dead.join(', '));
}

// ---------------------------------------------------------------- 2. live fuzz
async function req(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Cookie: 'nsc_t=' + token } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let j = {}; try { j = JSON.parse(text); } catch (e) { j = { raw: text.slice(0, 120) }; }
  return { code: r.status, j };
}

(async () => {
  const fl = await req('/api/login', { method: 'POST', body: { username: 'ghost', password: 'Delilah2023!@' } });
  ok(fl.code === 200, 'fuzz: founder login');
  const ftok = fl.j.token;
  const uniq = Date.now().toString(36).slice(-5);
  const reg = await req('/api/register', { method: 'POST', body: {
    username: 'fuzz_' + uniq, password: 'TestPass99!', email: `fuzz_${uniq}@test.local`,
    profile: { name: 'Fuzz ' + uniq, origin: 'street', avatar: '1|2|3|4|5|1|1|1', bio: 'qa' } } });
  ok(reg.code === 200, 'fuzz: tester registered');
  const tok = reg.j.token;
  const me = await req('/api/me', { token: tok });
  const accId = me.j.me.acc;
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_xp', target: accId, amount: 1000000 } });
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'set_money', target: accId, amount: 5000000 } });
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'refill', target: accId } });
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'grant_all_items', target: accId } });
  await req('/api/dev/world', { method: 'POST', token: ftok, body: { op: 'reset_cooldowns', target: accId } });

  const P = [{}, { id: null }, { id: 'x'.repeat(400) }, { qty: -1 }, { amount: -1 }, { idx: -5 },
    { slot: 999 }, { name: 123 }, { target: 'nobody_like_this' }, { qty: 'lots' }, { hours: 9999 },
    { itemId: '../../etc/passwd' }, { districtId: '%00' }, { stat: 'zz' }, { grade: 42 }, { bet: -50 }];
  const skip = new Set(['crime', 'attack']);   // these are destructive to other citizens, covered elsewhere
  const actions = [...serverActions].filter(a => !skip.has(a));
  const results = new Map();
  const bad = [];
  for (const name of actions) {
    for (const payload of P) {
      let r;
      try { r = await req('/api/action', { method: 'POST', token: tok, body: Object.assign({}, payload, { name }) }); }
      catch (e) { bad.push(`${name} ${JSON.stringify(payload)} → network ${e.message}`); continue; }
      if (r.code >= 500) bad.push(`${name} ${JSON.stringify(payload)} → ${r.code} ${JSON.stringify(r.j).slice(0, 120)}`);
      results.set(name, Math.max(results.get(name) || 0, r.code === 500 ? 500 : 0));
    }
  }
  if (bad.length) for (const b of bad.slice(0, 40)) console.log('    · ' + b);
  ok(bad.length === 0, `all ${actions.length} actions survive ${P.length} malformed payloads each`, bad.length + ' findings');

  // the process must still be healthy after all that
  const alive = await req('/api/meta');
  ok(alive.code === 200 && alive.j.ops && alive.j.ops.total === 10000, 'the server is still healthy after the fuzz');
  const meAfter = await req('/api/me', { token: tok });
  ok(meAfter.code === 200 && meAfter.j.me && Number.isFinite(meAfter.j.me.money), 'the fuzzed citizen still has a sane purse');

  // stray fields / unicode / deep nesting on a hot action
  const weird = await req('/api/action', { method: 'POST', token: tok, body: { name: 'ops', fam: 'runs', q: 'cigarette', district: { x: 1 }, grade: [1, 2], limit: 'abc', offset: -99 } });
  ok(weird.code === 200 && weird.j.res.list.length === 24 && weird.j.res.matched === 100, 'nonsense filter shapes are ignored, not crashed', JSON.stringify(weird.j.res).slice(0, 120));
  const unicode = await req('/api/action', { method: 'POST', token: tok, body: { name: 'ops', q: 'ünïcödé \u202e', fam: 'rackets' } });
  ok(unicode.code === 200, 'unicode queries survive the board');

  // ---------------------------------------------------------------- 3. client view contract
  // every field the Operations view reads must exist on the wire (a rename here would blank the tab)
  const view = await req('/api/action', { method: 'POST', token: tok, body: { name: 'ops', fam: 'rackets' } });
  const d = view.j.res || {};
  const top = ['total', 'perFamily', 'families', 'districts', 'grades', 'matched', 'shown', 'offset', 'limit',
    'list', 'rackets', 'readyRackets', 'racketIncome', 'art', 'artValue', 'artCap', 'docs', 'chains', 'stats'];
  const missingTop = top.filter(k => !(k in d));
  ok(missingTop.length === 0, 'the operations board carries every field the tab reads', missingTop.join(', '));
  const f0 = (d.families || [])[0];
  ok(['id', 'name', 'ico', 'count', 'blurb', 'verb', 'special'].every(k => k in f0), 'a family row carries id, name, icon, count, hook and verb');
  const l0 = (d.list || [])[0] || {};
  const opFields = ['id', 'ico', 'name', 'tag', 'districtName', 'serial', 'live', 'min', 'max', 'blurb', 'flavour',
    'level', 'crew', 'energy', 'nerve', 'heat', 'carMin', 'special', 'stage', 'stageName', 'owned', 'rate', 'hours', 'cash', 'locked', 'cool', 'canAfford'];
  const missingOp = opFields.filter(k => !(k in l0));
  ok(missingOp.length === 0, 'an operation card carries every field the tab reads', missingOp.join(', '));
  ok(Array.isArray(d.stats && d.stats.total === d.stats.total) || Number.isFinite(d.stats.total), 'the stats block is numeric');
  ok((d.grades || []).every(g => 'i' in g && 'roman' in g && 'name' in g) && (d.districts || []).every(x => 'id' in x && 'name' in x),
    'the filter selects have their labels');

  console.log('\n' + (fail === 0 ? `ALL ${pass} WIRING + FUZZ CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('harness error', e); process.exit(2); });
