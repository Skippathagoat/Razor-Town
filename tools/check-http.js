#!/usr/bin/env node
/* Razor Town — does the server stay up when it is poked badly?
 *
 *   node tools/check-http.js
 *
 * Starts a throwaway server on its own port and database, then hammers it the way a
 * broken browser, a stale cookie or a deleted account would:
 *   - a correctly signed session for a citizen who no longer exists
 *   - every read route, with and without that session
 *   - actions aimed at a dead session
 *   - unknown routes, wrong methods, broken JSON, absurd amounts
 * It fails if any of that returns a 5xx, or if the server stops answering afterwards.
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.CHECK_PORT || '8931';
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-http-'));
const DB = path.join(DIR, 'world.db');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ✓ ' + m); };
const bad = (m, d) => { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + JSON.stringify(d).slice(0, 200) : '')); };

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function get(p, opts = {}) {
  try {
    const r = await fetch('http://127.0.0.1:' + PORT + p, { ...opts, redirect: 'manual' });
    const text = await r.text();
    return { status: r.status, text };
  } catch (e) { return { status: 0, text: String(e.message) }; }
}

(async () => {
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: { ...process.env, DB_PATH: DB, PORT }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => { log += d; });
  srv.stderr.on('data', d => { log += d; });

  let alive = false;
  for (let i = 0; i < 40; i++) {
    const h = await get('/api/health');
    if (h.status === 200) { alive = true; break; }
    await wait(250);
  }
  if (!alive) { console.log('  ✗ the server never came up\n' + log); process.exit(1); }
  ok('the server boots and answers /api/health');

  // a real citizen, so we know the happy path works too
  const reg = await get('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'keeper', password: 'keeperpass1', email: 'keeper@http.test', profile: { name: 'Kit Keeper', origin: 'street' } }) });
  let token = '';
  try { token = JSON.parse(reg.text).token || ''; } catch (e) {}
  token ? ok('a citizen can register and receives a session') : bad('registration broke', reg);

  // the nasty part: a *validly signed* token for an account that does not exist.
  // This is what a browser with an old cookie looks like after a world reset.
  const dead = require(path.join(ROOT, 'lib', 'accounts.js'));
  process.env.DB_PATH = DB;
  require(path.join(ROOT, 'lib', 'db.js')).init();
  const deadToken = dead.signToken(424242);
  ok('minted a signed session for a citizen who does not exist');

  const routes = ['/api/me', '/api/world/bounties', '/api/world/college', '/api/world/merits', '/api/world/estate',
    '/api/attacks', '/api/world/leaders', '/api/world/factions', '/api/world/news', '/api/world/online', '/api/meta'];
  let fiveHundreds = 0, deadProblems = [];
  for (const r of routes) {
    const anon = await get(r);
    const withDead = await get(r, { headers: { Cookie: 'nsc_t=' + deadToken } });
    const withReal = await get(r, { headers: { Cookie: 'nsc_t=' + token } });
    if (anon.status >= 500) fiveHundreds++;
    if (withDead.status >= 500) { fiveHundreds++; deadProblems.push(r + ' → ' + withDead.status); }
    if (withReal.status >= 500) fiveHundreds++;
  }
  fiveHundreds === 0
    ? ok(`all ${routes.length} read routes survive anonymous, dead-session and real-session calls`)
    : bad('a read route returned 5xx', { fiveHundreds, deadProblems });

  const deadAction = await get('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'nsc_t=' + deadToken },
    body: JSON.stringify({ name: 'property_buy', propertyId: 'rooms' }) });
  deadAction.status < 500 ? ok('an action on a dead session is refused cleanly (' + deadAction.status + ')') : bad('dead-session action 5xx', deadAction);

  // garbage in
  const junk = [
    ['unknown route', await get('/api/does-not-exist')],
    ['broken JSON', await get('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not json' })],
    ['absurd bounty', await get('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'nsc_t=' + token },
      body: JSON.stringify({ name: 'bounty_place', targetId: 999999, amount: -5 }) })],
    ['absurd vault move', await get('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'nsc_t=' + token },
      body: JSON.stringify({ name: 'vault_in', amount: 'lots' }) })],
    ['unknown action', await get('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'nsc_t=' + token },
      body: JSON.stringify({ name: 'launder_the_books' }) })],
    ['path traversal', await get('/../server.js')]
  ];
  let junk5xx = junk.filter(([, r]) => r.status >= 500);
  junk5xx.length === 0 ? ok('garbage requests (' + junk.length + ' of them) are all answered without a 5xx') : bad('garbage caused 5xx', junk5xx);

  // and after all of that, is it still the same process serving us?
  const before = await get('/api/health');
  await wait(400);
  const after = await get('/api/health');
  let upBefore = 0, upAfter = 0;
  try { upBefore = JSON.parse(before.text).up; upAfter = JSON.parse(after.text).up; } catch (e) {}
  upAfter >= upBefore && after.status === 200
    ? ok('the same process is still serving after the abuse (uptime ' + upAfter + 's, no restart)')
    : bad('the server restarted or stopped during the abuse', { upBefore, upAfter, status: after.status });

  const crashes = log.split('\n').filter(l => /uncaught exception|unhandled rejection/.test(l));
  crashes.length === 0 ? ok('nothing logged an uncaught exception or unhandled rejection') : bad('the safety net caught something', crashes.slice(0, 3));

  srv.kill('SIGKILL');
  try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + (fail === 0 ? `ALL ${pass} HTTP RESILIENCE CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
  process.exit(fail === 0 ? 0 : 1);
})();
