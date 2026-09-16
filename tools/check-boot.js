#!/usr/bin/env node
/* Razor Town — boot, static, stream and persistence check.
 *
 *   node tools/check-boot.js
 *
 * Boots its OWN server on a throwaway port and database, so it never touches a live world:
 *   · the world boots from empty and serves the shell
 *   · every asset the shell references actually resolves
 *   · the database passes an integrity check
 *   · the live stream hands out a hello
 *   · an account survives a full restart with its character intact
 *   · the process shuts down cleanly (no orphans)
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = 8899 + (process.pid % 50);
const DB = path.join(os.tmpdir(), `razor-boot-${process.pid}`, 'world.db');
fs.rmSync(path.dirname(DB), { recursive: true, force: true });

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (detail !== undefined ? '\n    -> ' + String(detail).slice(0, 240) : '')); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function up() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(PORT), DB_PATH: DB }), stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 120; i++) {
    if (log.includes('listening on')) break;
    if (child.exitCode != null) break;
    await sleep(150);
  }
  return { child, log: () => log };
}
const get = async (p, opts) => {
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`, opts);
  const text = await r.text();
  return { code: r.status, text, headers: r.headers };
};
const post = (p, body, token) => fetch(`http://127.0.0.1:${PORT}${p}`, {
  method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Cookie: 'nsc_t=' + token } : {}),
  body: JSON.stringify(body || {})
});

(async () => {
  console.log('booting a clean world on :' + PORT);
  let srv = await up();
  ok(srv.log().includes('listening on'), 'the world boots from an empty database', srv.log().slice(-300));
  ok(srv.log().includes('10,000') || srv.log().includes('1000 City Contracts'), 'the boot log reports the content catalogue');

  // ---- shell + assets
  const home = await get('/');
  ok(home.code === 200 && home.text.includes('</html>') && home.text.includes('app.js'), 'the shell serves', home.code);
  ok(/\?v=g\d+/.test(home.text), 'the shell cache-busts its assets');
  const refs = [...home.text.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(u => !/^https?:|^\/\//.test(u) && !u.startsWith('#'));
  const assetFails = [];
  for (const u of refs) { const r = await get(u.startsWith('/') ? u : '/' + u); if (r.code !== 200) assetFails.push(`${u} → ${r.code}`); }
  ok(assetFails.length === 0, `every asset the shell references resolves (${refs.length})`, assetFails.join(', '));

  // every script the shell loads must at least parse
  const scripts = refs.filter(u => u.includes('.js'));
  const badJs = [];
  for (const u of scripts) {
    const r = await get(u.startsWith('/') ? u : '/' + u);
    try { new Function(r.text); } catch (e) { badJs.push(`${u}: ${e.message}`); }
  }
  ok(badJs.length === 0, 'every script the shell ships parses', badJs.join(', '));

  // css url() references
  const css = (await get('/css/style.css')).text;
  const urls = [...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map(m => m[2]).filter(u => !u.startsWith('data:') && !/^https?:/.test(u));
  const cssFails = [];
  for (const u of urls) { const r = await get(u.startsWith('/') ? u : '/' + u); if (r.code !== 200) cssFails.push(`${u} → ${r.code}`); }
  ok(cssFails.length === 0, `every image the stylesheet references resolves (${urls.length})`, cssFails.join(', '));

  // ---- meta + panel on a virgin world
  const meta = await get('/api/meta');
  ok(meta.code === 200, 'meta serves without a session');
  const mj = JSON.parse(meta.text);
  ok(mj.ops && mj.ops.total === 10000 && mj.ops.families.length === 10, 'meta advertises the 10,000-operation catalogue');
  ok(mj.informants && mj.informants.count === 1000, 'meta advertises the 1,000-informant network');
  ok(mj.contractCatalog && mj.contractCatalog.count === 1000, 'meta advertises the 1,000-contract catalogue');

  // ---- register, play a little, then restart
  const uniq = Date.now().toString(36).slice(-5);
  const reg = await post('/api/register', { username: 'boot_' + uniq, password: 'BootPass99!', email: `boot_${uniq}@test.local`,
    profile: { name: 'Boot ' + uniq, origin: 'street', gender: 'f', bio: 'survives restarts' } });
  ok(reg.status === 200, 'a citizen can register on an empty world');
  const rj = await reg.json();
  const tok = rj.token;
  const racket = await post('/api/action', { name: 'ops', fam: 'rackets' }, tok);
  ok(racket.status === 200, 'the operations board answers for a brand new citizen');

  // ---- database integrity while the server is live
  {
    const sqlite = require('node:sqlite');
    const db = new sqlite.DatabaseSync(DB, { readOnly: true });
    const integrity = db.prepare('PRAGMA integrity_check').get();
    const val = Object.values(integrity || {})[0];
    ok(String(val).toLowerCase() === 'ok', 'the live database passes its integrity check', val);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    ok(tables.length >= 10 && tables.includes('players') && tables.includes('kv'), `the schema is intact (${tables.length} tables)`, tables.join(','));
    db.close();
  }

  // ---- live stream
  {
    const ctl = new AbortController();
    const res = await fetch(`http://127.0.0.1:${PORT}/api/stream`, { headers: { Cookie: 'nsc_t=' + tok }, signal: ctl.signal });
    ok(res.status === 200 && String(res.headers.get('content-type')).includes('text/event-stream'), 'the live stream opens with the right content type');
    let hello = false, buf = '';
    const reader = res.body.getReader();
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && !hello) {
      const chunk = await Promise.race([reader.read(), sleep(600).then(() => ({ done: true }))]);
      if (chunk.done) break;
      buf += Buffer.from(chunk.value).toString('utf8');
      if (buf.includes('event: hello')) hello = true;
    }
    ok(hello, 'the stream sends its hello frame', buf.slice(0, 120));
    ctl.abort();
  }

  // ---- restart with the same database
  srv.child.kill('SIGTERM');
  await sleep(600);
  ok(srv.child.exitCode !== null || srv.child.killed, 'the server shuts down on request');
  srv = await up();
  ok(srv.log().includes('listening on'), 'the world comes back up on the same database', srv.log().slice(-300));
  const again = await post('/api/login', { username: 'boot_' + uniq, password: 'BootPass99!' });
  const aj = await again.json();
  ok(again.status === 200 && aj.me && aj.me.name === 'Boot ' + uniq, 'the citizen survives the restart', JSON.stringify(aj).slice(0, 140));
  ok(aj.me && aj.me.gender === 'f' && /^f\|/.test(aj.me.avatar) && aj.me.equip && aj.me.equip.wear.length >= 3,
    'the body, the kit and the look survive the restart', aj.me && aj.me.avatar);
  const panel = await get('/api/sys/panel', { headers: { Cookie: 'nsc_t=' + aj.token } });
  ok(panel.code === 200, 'the systems panel answers straight after a restart');
  const pj = JSON.parse(panel.text);
  ok(pj.ops && pj.ops.total === 10000, 'the long game is present after a restart');

  // ---- clean shutdown, no orphans
  const pid = srv.child.pid;
  srv.child.kill('SIGTERM');
  await sleep(700);
  const alive = (() => { try { process.kill(pid, 0); return true; } catch (e) { return false; } })();
  ok(!alive, 'no server process is left behind');
  fs.rmSync(path.dirname(DB), { recursive: true, force: true });

  console.log('\n' + (fail === 0 ? `ALL ${pass} BOOT CHECKS PASS` : `${pass} passed, ${fail} FAILED`));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('harness error', e); process.exit(2); });
