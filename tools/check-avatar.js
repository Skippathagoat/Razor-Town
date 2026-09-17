#!/usr/bin/env node
/* Razor Town — the renderer and the markup it emits.
 *
 *   node tools/check-avatar.js
 *
 * No server, no database: this loads public/js/avatar.js the way the browser
 * does and asserts the things that actually broke in the past —
 *
 *   - every style in the catalog still draws, on every body
 *   - no surface ever emits NaN, undefined or a dangling url(#id)
 *   - two avatars on one page never share a gradient id
 *   - player-controlled text (name, picture, css class) cannot break out of
 *     the attribute or the <text> node it is pasted into
 *   - junk looks, legacy looks and hostile looks all render something
 *   - content tables cannot be indexed through Object.prototype
 */
'use strict';
global.window = global;
const AV = require('../public/js/avatar.js');
const C = require('../lib/game/content.js');

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  \u2713 ' + m); };
const bad = (m, d) => { fail++; console.log('  \u2717 ' + m + (d !== undefined ? '   \u2192 ' + String(JSON.stringify(d)).slice(0, 200) : '')); };
const is = (cond, m, d) => cond ? ok(m) : bad(m, d);

const idsOf = (s) => [...s.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const refsOf = (s) => [...s.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);

console.log('\n-- every style draws on every body --');
{
  const styles = AV.STYLES || {};
  let drawn = 0, missing = [];
  for (const part of Object.keys(styles)) {
    for (const style of Object.keys(styles[part])) {
      for (const body of ['m', 'f', 'e']) {
        const svg = AV.doll(`${body}|${part}:${style}:#7a5cff:3`, 120);
        if (!/<(path|rect|ellipse|circle|g)\b/.test(svg)) missing.push(`${body}/${part}/${style}`);
        else drawn++;
      }
    }
  }
  is(!missing.length, `${drawn} body/part/style combinations all produce geometry`, missing.slice(0, 5));
  is(AV.TOTALS && AV.TOTALS.styles === 32, 'the catalog still advertises 32 styles', AV.TOTALS);
}

console.log('\n-- no surface emits broken numbers or dangling references --');
{
  const surfaces = (l) => [AV.doll(l, 120), AV.svgFor(l, 64), AV.mugshot(l, 100, 'NAME'),
    AV.banner(l, 300, 'NAME', 'SUB'), AV.scene(l, 200), AV.duel(l, l, 340)];
  let numeric = [], dangling = [];
  for (let i = 0; i < 400; i++) {
    const look = AV.random('seed' + i);
    for (const svg of surfaces(look)) {
      if (/NaN|Infinity|undefined/.test(svg)) numeric.push(look);
      const have = new Set(idsOf(svg));
      for (const r of refsOf(svg)) if (!have.has(r)) dangling.push(r + ' in ' + look);
    }
  }
  is(!numeric.length, '400 random looks across 6 surfaces: no NaN/Infinity/undefined', numeric.slice(0, 3));
  is(!dangling.length, 'every url(#id) resolves inside its own svg', dangling.slice(0, 3));
}

console.log('\n-- two avatars on one page never collide --');
{
  const a = AV.doll('m|torso:hoodie:#111111:4', 100);
  const b = AV.doll('f|torso:hoodie:#eeeeee:4', 100);
  const shared = idsOf(a).filter(i => idsOf(b).includes(i));
  is(!shared.length, 'gradient ids are unique across two dolls', shared.slice(0, 3));
  const two = AV.banner('m|', 300, 'A') + AV.banner('f|', 300, 'B');
  const all = idsOf(two);
  is(all.length === new Set(all).size, 'two banners on one page do not share a gradient id');
  const strip = (s) => s.replace(/cv\d+_\d+/g, 'U');
  is(strip(AV.doll('m|head:cap:#2f4a6b:4', 90)) === strip(AV.doll('m|head:cap:#2f4a6b:4', 90)),
    'the same look renders identically apart from its unique id prefix');
}

console.log('\n-- player text cannot break out of the markup --');
{
  const evil = '"><script>alert(1)</script>';
  const m = AV.mugshot('m|', 90, '</text><a href="x">y');
  is(!/<\/text><a/i.test(m), 'a name cannot close the mugshot <text> node');
  const bn = AV.banner('m|', 300, '<b>x</b>', '</text><script>');
  is(!/<b>|<script/i.test(bn), 'a name and subtitle are escaped in the banner');
  const p = AV.portraitFor({ portrait: 'custom', pic: 'javascript:alert(1)', avatar: 'm|', name: evil }, 48);
  is(!/javascript:/.test(p), 'a javascript: picture url is refused');
  is(!/<script/i.test(p), 'a hostile name is escaped in the portrait title');
  const svgpic = AV.portraitFor({ portrait: 'custom', pic: 'data:image/svg+xml;base64,PHN2Zz4=', avatar: 'm|' }, 48);
  is(!/svg\+xml/.test(svgpic), 'a data: URL carrying an SVG payload is refused');
  const good = AV.portraitFor({ portrait: 'custom', pic: 'data:image/png;base64,iVBORw0KGgo=', avatar: 'm|' }, 48);
  is(/data:image\/png/.test(good), 'a real base64 PNG upload still renders');
  const cls = AV.portraitFor({ portrait: 'p01', avatar: 'm|' }, 48, { cls: 'x" onerror=alert(1) z="' });
  is(!/onerror=/.test(cls), 'a hostile css class cannot add an event handler');
  is(!/javascript:/.test(AV.portraitSrc({ portrait: 'custom', pic: 'javascript:alert(1)' })), 'portraitSrc refuses a javascript: url');
  is(AV.portraitSrc({ portrait: 'p05' }) === '/img/portraits/p05.jpg', 'portraitSrc still returns catalog faces');
}

console.log('\n-- hostile and legacy looks all render --');
{
  const junk = ['', null, undefined, 0, 'x', 'm', 'm|', '|', 'zzz|torso:hoodie', 'm|torso',
    'm|torso:hoodie:notacolour:9', 'm|torso:hoodie:#fff:-5', 'm|torso:hoodie:#fff:NaN',
    'm|bogus:hoodie:#fff:4', 'm|torso:bogusstyle:#fff:4', '1|2|3|4|5|6|7|8', '5|3|1|0|2|1|4|0',
    'm|'.padEnd(4000, 'a'), '<script>alert(1)</script>', 'm|torso:hoodie:"><svg onload=alert(1)>:4',
    {}, [], true];
  let threw = [], leaked = [];
  for (const j of junk) {
    try {
      const out = AV.doll(j, 100) + AV.svgFor(j, 64) + AV.mugshot(j, 90, 'n') + AV.duel(j, j, 200)
        + AV.scene(j, 180) + AV.banner(j, 300, 'x', 'y') + JSON.stringify(AV.wear(j)) + JSON.stringify(AV.parts(j));
      if (/NaN|Infinity/.test(out)) leaked.push(['numeric', j]);
      if (/<script|onload=/i.test(out)) leaked.push(['markup', j]);
    } catch (e) { threw.push([String(j).slice(0, 20), e.message]); }
  }
  is(!threw.length, `${junk.length} junk looks: nothing throws`, threw.slice(0, 3));
  is(!leaked.length, 'junk looks leak neither bad numbers nor markup', leaked.slice(0, 3));
  is(/<svg/.test(AV.doll('5|3|1|0|2|1|4|0', 100)), 'a legacy 8-number look still renders a figure');
}

console.log('\n-- the photo overlay wears the same art as the figure --');
{
  let missed = [];
  for (const pid of ['p01', 'p05', 'p10']) {
    for (const look of ['m|head:cap:#2f4a6b:4', 'm|eyes:shades:#1a1a1a:4', 'm|mouth:bandana:#8b2f2f:4', 'm|neck:chain:#d4af37:3']) {
      const o = AV.portraitOverlay(look, { portrait: pid });
      if (!/<svg/.test(o)) missed.push(pid + ' ' + look);
    }
  }
  is(!missed.length, 'caps, shades, masks and chains all draw over the catalog faces', missed);
  is(AV.portraitOverlay('m|torso:hoodie:#111:4', { portrait: 'p01' }) === '',
    'body-only kit adds nothing to a head-and-shoulders photo');
  const o1 = AV.portraitOverlay('m|head:cap:#2f4a6b:4', { portrait: 'p01' });
  const d1 = AV.doll('m|head:cap:#2f4a6b:4', 100);
  is(!idsOf(o1).some(i => idsOf(d1).includes(i)), 'the overlay never reuses the figure\'s gradient ids');
}

console.log('\n-- content tables cannot be walked through the prototype --');
{
  const tables = Object.keys(C).filter(k => C[k] && typeof C[k] === 'object' && !Array.isArray(C[k]));
  const leaky = tables.filter(k => C[k].constructor !== undefined || C[k].__proto__ !== undefined);
  is(!leaky.length, `${tables.length} id-indexed tables reject prototype keys`, leaky);
  is(Object.keys(C.ITEMS).length > 200, 'the item catalog is still fully populated', Object.keys(C.ITEMS).length);
  is(C.ITEMS.volt_cola && typeof C.ITEMS.volt_cola.buy === 'number', 'a real item still looks up');
}

console.log('');
if (fail) { console.log(`check-avatar: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`ALL ${pass} AVATAR + MARKUP CHECKS PASS`);
