// Razor Town — the character system, Torn-style (client renderer).
//
// There is no creator rack any more: you pick a body (male / female / enby) and
// the town sees whatever you have EQUIPPED. This file draws that — a base
// citizen, then every piece of clothing and armour from the look string, in
// Torn's layer order (1 undergarment … 5 outerwear, masks over everything).
//
// Look string, produced by lib/game/wear.js:
//   m|torso:hoodie:#23252b:4,legs:jeans:#3b4a63:4,feet:trainers:#e6e4dd:5
//
// Surfaces: svgFor (portrait, used in lists/chat), doll (full figure, profile),
// duel (two citizens facing off — the fight screen), mugshot (custody), scene,
// banner. Every renderer is pure SVG generated here — no third-party art.
(function () {
  'use strict';

  const ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const S = (v) => String(v == null ? '' : v);

  // ---------------------------------------------------------------- palette
  const SKIN = { base: '#d8a67c', lit: '#ecc29a', shade: '#ab7a51', line: '#835c37', dark: '#8d6440' };
  const HAIRC = { m: '#241b14', f: '#3b2819', e: '#2e2418' };
  const BASE = { tee: '#e9e7e0', leg: '#3f4d64', foot: '#ecebe5' };
  const LINE = 'rgba(60,36,16,.35)';

  // ---------------------------------------------------------------- geometry
  // The figure lives in a 120 x 252 box, centred on x = 60, and is cropped by
  // each surface (doll crops the body, svgFor the head).
  const Y = {
    top: 18, head: 36, chin: 53, jaw: 57, neck: 62, sh: 66, chest: 92,
    waist: 120, hip: 138, wrist: 130, knee: 180, ankle: 224, ground: 240
  };
  const CX = 60;
  const FIG = {
    m: { sh: 20.0, wa: 15.0, hi: 17.5, ar: 5.4, le: 6.3, off: 9.0, head: [15.0, 17.0], hair: 'crop' },
    f: { sh: 17.6, wa: 12.6, hi: 19.0, ar: 4.7, le: 5.8, off: 8.6, head: [13.5, 15.5], hair: 'long' },
    e: { sh: 18.8, wa: 13.8, hi: 18.2, ar: 5.1, le: 6.1, off: 8.8, head: [14.0, 16.0], hair: 'mid' }
  };
  const BODIES = ['m', 'f', 'e'];
  const PARTS = ['legs', 'feet', 'torso', 'hands', 'neck', 'head', 'eyes', 'mouth'];
  const PART_LABEL = { legs: 'Legs', feet: 'Feet', torso: 'Torso', hands: 'Hands', neck: 'Neck', head: 'Head', eyes: 'Eyes', mouth: 'Face' };
  const PART_PLACE = { legs: 'legs', feet: 'feet', torso: 'chest', hands: 'hands', neck: 'neck', head: 'head', eyes: 'eyes', mouth: 'mouth' };

  const uid = (() => { let n = 0; return () => 'cv' + (++n) + '_' + (n * 2654435761 % 100003); })();
  function figOf(g) { return FIG[g] || FIG.m; }
  function clampLayer(n) { n = Math.round(Number(n) || 4); return Math.max(1, Math.min(5, n)); }
  function col(v, dflt) {
    const s = S(String(v || ''));
    return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : (dflt || '#3a3d44');
  }
  function shade(hex, amt) {
    const h = S(hex).replace('#', '');
    const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
    const num = parseInt(f, 16);
    if (!Number.isFinite(num)) return '#575757';
    let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    const t = amt < 0 ? 0 : 255, p = Math.min(1, Math.abs(amt));
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    const to = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Math.abs(h);
  }

  // ---------------------------------------------------------------- look parsing
  const LEGACY_KITS = [
    [['torso', 'tee', '#e9e7e0', 2], ['legs', 'jeans', '#3b4a63', 4], ['feet', 'trainers', '#e6e4dd', 5], ['head', 'cap', '#2f4a6b', 4]],
    [['torso', 'hoodie', '#4a4e56', 4], ['legs', 'joggers', '#26272c', 4], ['feet', 'boots', '#4a352a', 5]],
    [['torso', 'shirt', '#cfd8e4', 4], ['legs', 'chinos', '#8a7f6a', 4], ['feet', 'loafers', '#2b2320', 5], ['neck', 'chain', '#d8b25a', 2]],
    [['torso', 'bomber', '#8a8778', 5], ['legs', 'cargo', '#4a503c', 4], ['feet', 'trainers', '#e6e4dd', 5], ['eyes', 'shades', '#14161a', 4]]
  ];
  function parse(raw) {
    const src = S(raw);
    const bar = src.indexOf('|');
    let g = 'm', tail = '';
    if (bar >= 0) { g = src.slice(0, bar).toLowerCase(); tail = src.slice(bar + 1); }
    if (!BODIES.includes(g)) g = 'm';

    const pieces = [];
    let legacy = false;
    if (tail) {
      for (const tok of tail.split(',')) {
        const bits = tok.split(':');
        if (bits.length < 3 || !PARTS.includes(bits[0])) { legacy = true; break; }
        pieces.push({
          part: bits[0], style: String(bits[1] || 'plain'), col: col(bits[2]),
          layer: clampLayer(bits[3] === undefined ? 4 : bits[3])
        });
      }
    }
    // Anything that is not a look string (an old eight-part creator spec, junk
    // in the column, a bot row) still renders as a coherent citizen: the string
    // seeds a body and a plain kit rather than producing a broken drawing.
    if (legacy || (!pieces.length && /[|0-9]/.test(tail))) {
      const seed = hash(src || 'citizen');
      g = BODIES[seed % 3];
      pieces.length = 0;
      for (const [part, style, c, layer] of LEGACY_KITS[seed % LEGACY_KITS.length]) {
        pieces.push({ part, style, col: c, layer: layer || 4 });
      }
    }
    return { g, pieces, seed: hash(g + '|' + tail) };
  }

  // ---------------------------------------------------------------- body
  function torsoTop(g, o) {
    o = o || {};
    const f = figOf(g), grow = o.grow || 0;
    const sh = f.sh + grow, wa = f.wa + grow * 0.6, hi = f.hi + grow * 0.75;
    const shY = Y.sh - (o.shUp || 0);
    const dip = o.dip == null ? 5 : o.dip;
    const hipY = Y.hip + (o.hip || 0);
    return `M ${CX - sh} ${shY}`
      + ` C ${CX - sh - 1.4} ${Y.chest - 12} ${CX - wa - 1} ${Y.chest + 8} ${CX - wa} ${Y.waist - 5}`
      + ` L ${CX - hi} ${hipY} L ${CX + hi} ${hipY}`
      + ` L ${CX + wa} ${Y.waist - 5}`
      + ` C ${CX + wa + 1} ${Y.chest + 8} ${CX + sh + 1.4} ${Y.chest - 12} ${CX + sh} ${shY}`
      + ` C ${CX + sh - 4} ${shY - 4} ${CX + 7} ${shY - 2.5} ${CX + 4} ${shY + dip}`
      + ` Q ${CX} ${shY + dip + 3.4} ${CX - 4} ${shY + dip}`
      + ` C ${CX - 7} ${shY - 2.5} ${CX - sh + 4} ${shY - 4} ${CX - sh} ${shY} Z`;
  }
  function armPath(g, side, yEnd) {
    const f = figOf(g);
    const x0 = CX + side * (f.sh - 2.5), y0 = Y.sh + 6;
    const x1 = CX + side * (f.sh - 0.4), y1 = yEnd;
    return `M ${x0} ${y0} Q ${CX + side * (f.sh + 1.5)} ${(y0 + y1) / 2 + 6} ${x1} ${y1}`;
  }
  function sleeves(c, g, len, w) {
    const f = figOf(g);
    const yEnd = len === 'short' ? Y.chest - 2 : Y.wrist - 1;
    const width = (f.ar + (w == null ? 1.3 : w)) * 2;
    return [-1, 1].map(side => `<path d="${armPath(g, side, yEnd)}" stroke="${c}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`).join('');
  }
  function shoes(c, o) {
    o = o || {};
    const f = { m: FIG.m, f: FIG.f, e: FIG.e };
    const out = [];
    const halfW = o.wide || 8.2;
    const lift = o.lift == null ? 1.6 : o.lift;
    for (const side of [-1, 1]) {
      const cx = CX + side * 9.0;
      const a = cx - halfW, b = cx + halfW;
      const top = Y.ankle - (o.tall || 0);
      out.push(`<path d="M ${a} ${top} h ${halfW * 2} v ${Y.ground - top - 3.6} q 0 3.6 -3.6 3.6 h ${-(halfW * 2 - 7.2)} q -3.6 0 -3.6 -3.6 Z" fill="${c}" stroke="${LINE}" stroke-width=".6"/>`);
      out.push(`<rect x="${a - 0.8}" y="${Y.ground - 3.4 - lift}" width="${halfW * 2 + 1.6}" height="3.6" rx="1.6" fill="${o.sole || '#f3f1ea'}"/>`);
      if (o.lace) out.push(`<path d="M ${a + 3} ${top + 5} h ${halfW * 2 - 6}" stroke="rgba(255,255,255,.55)" stroke-width="1.1"/>`);
      if (o.collar) out.push(`<rect x="${a}" y="${top - 2.4}" width="${halfW * 2}" height="4" rx="1.6" fill="${shade(c, .16)}"/>`);
      if (o.toe) out.push(`<path d="M ${a} ${Y.ground - 5.6} h ${halfW * 2}" stroke="${shade(c, -.3)}" stroke-width=".9" opacity=".7"/>`);
    }
    return out.join('');
  }
  function legSkin(g) {
    const f = figOf(g);
    return [-1, 1].map(side => `<path d="M ${CX + side * f.off} ${Y.hip - 8} L ${CX + side * (f.off + 0.2)} ${Y.ankle + 1}" stroke="${SKIN.base}" stroke-width="${f.le * 2}" stroke-linecap="round" fill="none"/>`).join('');
  }
  function baseClothes(g) {
    const f = figOf(g);
    let out = '';
    out += `<path d="${torsoTop(g, { grow: 0.8, dip: 5 })}" fill="${BASE.tee}"/>` + sleeves(BASE.tee, g, 'short', 1.1);
    out += `<path d="M ${CX - f.wa - 0.4} ${Y.waist - 8} L ${CX - f.hi - 0.6} ${Y.hip + 5} L ${CX + f.hi + 0.6} ${Y.hip + 5} L ${CX + f.wa + 0.4} ${Y.waist - 8} Z" fill="${BASE.leg}"/>`;
    for (const side of [-1, 1]) {
      out += `<path d="M ${CX + side * f.off} ${Y.hip - 8} L ${CX + side * (f.off + 0.2)} ${Y.ankle + 1}" stroke="${BASE.leg}" stroke-width="${f.le * 2 + 1.2}" stroke-linecap="butt" fill="none"/>`;
    }
    out += shoes(BASE.foot, { sole: '#ffffff' });
    return out;
  }
  function baseBody(g) {
    const f = figOf(g), hw = f.head[0], hh = f.head[1];
    const hc = HAIRC[g] || HAIRC.m;
    let out = '';
    out += legSkin(g);
    for (const side of [-1, 1]) out += `<path d="${armPath(g, side, Y.wrist + 3)}" stroke="${SKIN.base}" stroke-width="${f.ar * 2}" stroke-linecap="round" fill="none"/>`;
    out += `<path d="${torsoTop(g, {})}" fill="${SKIN.base}"/>`;
    out += `<rect x="${CX - 5.6}" y="${Y.chin - 5}" width="11.2" height="13" rx="4" fill="${SKIN.shade}"/>`;
    out += `<ellipse cx="${CX - hw}" cy="${Y.head + 5}" rx="2.8" ry="4.4" fill="${SKIN.base}" stroke="${SKIN.shade}" stroke-width=".6"/>`;
    out += `<ellipse cx="${CX + hw}" cy="${Y.head + 5}" rx="2.8" ry="4.4" fill="${SKIN.base}" stroke="${SKIN.shade}" stroke-width=".6"/>`;
    out += `<ellipse cx="${CX}" cy="${Y.head}" rx="${hw}" ry="${hh}" fill="${SKIN.base}"/>`;
    out += `<path d="M ${CX - hw + 1} ${Y.head + 3} C ${CX - hw + 2} ${Y.chin - 1} ${CX - 5} ${Y.jaw + 2} ${CX} ${Y.jaw + 2} C ${CX + 5} ${Y.jaw + 2} ${CX + hw - 2} ${Y.chin - 1} ${CX + hw - 1} ${Y.head + 3} Z" fill="${SKIN.lit}" opacity=".5"/>`;
    // face
    const ey = Y.head + 1.5;
    for (const side of [-1, 1]) {
      out += `<ellipse cx="${CX + side * 6.2}" cy="${ey}" rx="2.5" ry="1.9" fill="#f7f3ea"/>`
        + `<circle cx="${CX + side * 6.2}" cy="${ey}" r="1.25" fill="${'#2a2118'}"/>`
        + `<circle cx="${CX + side * 6.2 + 0.4}" cy="${ey - 0.45}" r="0.4" fill="#fff" opacity=".8"/>`;
      out += `<path d="M ${CX + side * 6.2 - 3} ${ey - 4.6} q 3 -1.6 6 0" stroke="${hc}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    }
    out += `<path d="M ${CX} ${ey + 1.2} l -1.5 5.2 h 3.2" stroke="${SKIN.line}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += `<path d="M ${CX - 3.6} ${Y.jaw - 1} q 3.6 2 7.2 0" stroke="${SKIN.dark}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    out += baseHair(g);
    return out;
  }
  function baseHair(g) {
    const f = figOf(g), hw = f.head[0], hh = f.head[1], c = HAIRC[g] || HAIRC.m;
    const cap = `<path d="M ${CX - hw - 0.5} ${Y.head - 3} C ${CX - hw - 1} ${Y.head - hh - 4} ${CX + hw + 1} ${Y.head - hh - 4} ${CX + hw + 0.5} ${Y.head - 3}`
      + ` C ${CX + hw - 4} ${Y.head - 11} ${CX + 5} ${Y.head - hh + 1} ${CX + 1} ${Y.head - hh + 6}`
      + ` C ${CX - 3} ${Y.head - hh + 1} ${CX - hw + 4} ${Y.head - 11} ${CX - hw - 0.5} ${Y.head - 3} Z" fill="${c}"/>`;
    const sideLock = (side) => `<path d="M ${CX + side * (hw + 0.5)} ${Y.head - 5} C ${CX + side * (hw + 2.6)} ${Y.head + 8} ${CX + side * (hw + 2.2)} ${Y.head + 16} ${CX + side * (hw + 0.8)} ${Y.chin + 12}`
      + ` L ${CX + side * (hw - 5)} ${Y.chin + 8} C ${CX + side * (hw - 0.6)} ${Y.head + 8} ${CX + side * (hw - 1)} ${Y.head + 1} ${CX + side * (hw + 0.5)} ${Y.head - 5} Z" fill="${c}"/>`;
    if (f.hair === 'long') return sideLock(-1) + sideLock(1) + cap;
    if (f.hair === 'mid') return sideLock(-1) + sideLock(1) + cap;
    return cap;
  }

  // ---------------------------------------------------------------- clothing art
  // Every style draws over the base body. Signature: (col, layer, g, u) -> svg.
  const P = { head: {}, eyes: {}, mouth: {}, neck: {}, torso: {}, hands: {}, legs: {}, feet: {} };

  // ---- head
  P.head.cap = (c) => `<path d="M ${CX - 15} ${Y.head - 6} C ${CX - 15.5} ${Y.head - 26} ${CX + 15.5} ${Y.head - 26} ${CX + 15} ${Y.head - 6} Z" fill="${c}" stroke="${LINE}" stroke-width=".6"/>`
    + `<path d="M ${CX + 14} ${Y.head - 7} q 12 1.5 13 5.5 q -8 1.6 -13 1 Z" fill="${shade(c, -.28)}"/>`
    + `<circle cx="${CX}" cy="${Y.head - 25.5}" r="1.5" fill="${shade(c, .3)}"/>`;
  P.head.snapback = (c) => `<path d="M ${CX - 15} ${Y.head - 7} C ${CX - 15.5} ${Y.head - 25} ${CX + 15.5} ${Y.head - 25} ${CX + 15} ${Y.head - 7} Z" fill="${c}"/>`
    + `<path d="M ${CX + 13} ${Y.head - 8.5} q 12 1 13 4.6 q -8 1.4 -13 .8 Z" fill="${shade(c, -.22)}"/>`
    + `<circle cx="${CX + 5}" cy="${Y.head - 20}" r="1.5" fill="${shade(c, .32)}"/>`
    + `<path d="M ${CX - 15} ${Y.head - 9} q 15 -2.6 30 0" stroke="${shade(c, -.3)}" stroke-width="1" fill="none"/>`;
  P.head.beanie = (c) => `<path d="M ${CX - 14} ${Y.head - 8} C ${CX - 15} ${Y.head - 27} ${CX + 15} ${Y.head - 27} ${CX + 14} ${Y.head - 8} Z" fill="${c}"/>`
    + `<rect x="${CX - 14.6}" y="${Y.head - 12}" width="29.2" height="6" rx="3" fill="${shade(c, -.2)}"/>`
    + [0, 1, 2, 3, 4, 5].map(i => `<path d="M ${CX - 10 + i * 4} ${Y.head - 22} v 8" stroke="${shade(c, -.1)}" stroke-width="1" opacity=".7"/>`).join('');
  P.head.bucket = (c) => `<path d="M ${CX - 12.5} ${Y.head - 9} C ${CX - 13} ${Y.head - 22} ${CX + 13} ${Y.head - 22} ${CX + 12.5} ${Y.head - 9} Z" fill="${c}"/>`
    + `<path d="M ${CX - 22} ${Y.head - 8} q 22 -5 44 0 q -5 4 -22 4 q -17 0 -22 -4 Z" fill="${shade(c, -.14)}"/>`
    + `<path d="M ${CX - 13} ${Y.head - 20} q 13 -3 26 0" stroke="${shade(c, .16)}" stroke-width="1.5" fill="none"/>`;
  P.head.durag = (c) => `<path d="M ${CX - 14.5} ${Y.head - 4} C ${CX - 15} ${Y.head - 25} ${CX + 15} ${Y.head - 25} ${CX + 14.5} ${Y.head - 4} Z" fill="${c}"/>`
    + `<path d="M ${CX + 13} ${Y.head - 13} q 11 7 8 17 q -6 -2 -9 -9 Z" fill="${shade(c, -.16)}"/>`
    + `<path d="M ${CX - 13} ${Y.head - 13} q -10 8 -7 16 q 5 -2 8 -9 Z" fill="${shade(c, -.16)}"/>`
    + `<path d="M ${CX + 13} ${Y.head - 6} q 8 3 9 9" stroke="${shade(c, .2)}" stroke-width="1.2" fill="none"/>`;

  // ---- eyes
  P.eyes.shades = (c) => `<rect x="${CX - 13.5}" y="${Y.head - 2}" width="27" height="7.6" rx="2.6" fill="${c}" stroke="rgba(0,0,0,.45)" stroke-width=".7"/>`
    + `<path d="M ${CX - 13.5} ${Y.head + 1.5} h 27" stroke="${shade(c, .3)}" stroke-width="1" opacity=".5"/>`
    + `<rect x="${CX - 12}" y="${Y.head + 1.6}" width="9.4" height="2.2" rx="1.1" fill="rgba(255,255,255,.25)"/>`
    + `<rect x="${CX + 2.6}" y="${Y.head + 1.6}" width="9.4" height="2.2" rx="1.1" fill="rgba(255,255,255,.25)"/>`;
  P.eyes.specs = (c) => `<circle cx="${CX - 6.2}" cy="${Y.head + 1.5}" r="4.6" fill="rgba(205,228,240,.3)" stroke="${c}" stroke-width="1.3"/>`
    + `<circle cx="${CX + 6.2}" cy="${Y.head + 1.5}" r="4.6" fill="rgba(205,228,240,.3)" stroke="${c}" stroke-width="1.3"/>`
    + `<path d="M ${CX - 1.6} ${Y.head + 1.2} h 3.2" stroke="${c}" stroke-width="1.3"/>`
    + `<path d="M ${CX - 10.8} ${Y.head + 0.6} l -3.6 -1.4 M ${CX + 10.8} ${Y.head + 0.6} l 3.6 -1.4" stroke="${c}" stroke-width="1.1"/>`;

  // ---- mouth / face coverings
  P.mouth.bandana = (c) => `<path d="M ${CX - 13.5} ${Y.head + 8} q 13.5 -3 27 0 v 7.4 q -13.5 3.6 -27 0 Z" fill="${c}"/>`
    + `<path d="M ${CX - 13.5} ${Y.head + 8} q -6 -0.6 -8.6 3.4 q 6 3 8.6 3.4 Z" fill="${shade(c, -.22)}"/>`
    + `<path d="M ${CX - 13.5} ${Y.head + 12} q 13.5 3 27 0" stroke="${shade(c, .2)}" stroke-width=".9" fill="none" opacity=".7"/>`;
  P.mouth.balaclava = (c) => `<path d="M ${CX - 16} ${Y.head - 2} C ${CX - 16} ${Y.head - 26} ${CX + 16} ${Y.head - 26} ${CX + 16} ${Y.head - 2}`
    + ` C ${CX + 16} ${Y.jaw + 2} ${CX - 16} ${Y.jaw + 2} ${CX - 16} ${Y.head - 2} Z" fill="${c}"/>`
    + `<rect x="${CX - 9.6}" y="${Y.head - 2.4}" width="19.2" height="6" rx="3" fill="#14161a"/>`
    + `<path d="M ${CX - 9.6} ${Y.head - 0.4} h 19.2" stroke="${shade(c, .35)}" stroke-width=".7" opacity=".6"/>`
    + `<path d="M ${CX - 16} ${Y.head + 6} q 16 -2.4 32 0" stroke="${shade(c, -.25)}" stroke-width="1" fill="none" opacity=".6"/>`;
  P.mouth.resp = (c) => `<path d="M ${CX - 11.6} ${Y.head + 6} q 11.6 -3 23.2 0 q 1.8 9.6 -11.6 11.6 q -13.4 -2 -11.6 -11.6 Z" fill="${c}"/>`
    + `<circle cx="${CX - 7.4}" cy="${Y.head + 11.4}" r="3" fill="${shade(c, -.3)}"/><circle cx="${CX + 7.4}" cy="${Y.head + 11.4}" r="3" fill="${shade(c, -.3)}"/>`
    + `<path d="M ${CX - 11.6} ${Y.head + 7} l -4.4 -1.8 M ${CX + 11.6} ${Y.head + 7} l 4.4 -1.8" stroke="${shade(c, -.24)}" stroke-width="1.8"/>`;
  P.mouth.plain = null;

  // ---- neck
  P.neck.chain = (c) => `<path d="M ${CX - 8.6} ${Y.chin + 1} q 8.6 7 17.2 0" stroke="${c}" stroke-width="2.1" fill="none"/>`
    + `<circle cx="${CX}" cy="${Y.chin + 9.4}" r="3" fill="${c}" stroke="${shade(c, -.35)}" stroke-width=".7"/>`
    + `<circle cx="${CX - 0.8}" cy="${Y.chin + 8.6}" r="1" fill="${shade(c, .45)}" opacity=".8"/>`;
  P.neck.scarf = (c) => `<path d="M ${CX - 9.6} ${Y.chin} q 9.6 8 19.2 0 q 1 6 -0.6 8.6 q -9 5.4 -18 0 q -1.6 -2.6 -0.6 -8.6 Z" fill="${c}"/>`
    + `<path d="M ${CX + 5.4} ${Y.chin + 7} l 4.4 18.6 l -5.6 1 l -2.6 -17.6 Z" fill="${shade(c, -.14)}"/>`
    + `<path d="M ${CX - 9.6} ${Y.chin + 7.6} q 9.6 4 19.2 0" stroke="${shade(c, .24)}" stroke-width="1.4" fill="none" opacity=".8"/>`;

  // ---- torso
  P.torso.tee = (c, l, g) => `<path d="${torsoTop(g, { grow: 0.8, dip: 5 })}" fill="${c}"/>` + sleeves(c, g, 'short', 1.1);
  P.torso.stripe = (c, l, g, u) => {
    const id = u + 'st';
    let stripes = '';
    for (let y = Y.chest - 16; y < Y.hip + 2; y += 7.5) stripes += `<rect x="20" y="${y}" width="80" height="3.2" fill="${shade(c, -.55)}"/>`;
    return `<clipPath id="${id}"><path d="${torsoTop(g, { grow: 0.8, dip: 5 })}"/></clipPath>`
      + `<path d="${torsoTop(g, { grow: 0.8, dip: 5 })}" fill="${c}"/>`
      + `<g clip-path="url(#${id})">${stripes}</g>` + sleeves(c, g, 'short', 1.1);
  };
  P.torso.turtleneck = (c, l, g) => `<path d="${torsoTop(g, { grow: 1.2, dip: 1 })}" fill="${c}"/>`
    + `<path d="M ${CX - 7.4} ${Y.chin - 4} h 14.8 v 11 q -7.4 3.6 -14.8 0 Z" fill="${shade(c, .1)}"/>` + sleeves(c, g, 'long', 1.4);
  P.torso.shirt = (c, l, g) => `<path d="${torsoTop(g, { grow: 1.5, dip: 4 })}" fill="${c}"/>` + sleeves(c, g, 'long', 1.6)
    + `<path d="M ${CX - 5.6} ${Y.sh + 2} l 5.6 6.6 l 5.6 -6.6 l -2.6 -2 l -3 3.4 l -3 -3.4 Z" fill="${shade(c, -.14)}"/>`
    + `<path d="M ${CX} ${Y.sh + 9} v ${Y.hip - Y.sh - 12}" stroke="${shade(c, -.2)}" stroke-width="1"/>`
    + [0, 1, 2, 3].map(i => `<circle cx="${CX}" cy="${Y.chest + i * 13}" r="1" fill="${shade(c, -.4)}"/>`).join('');
  P.torso.jumper = (c, l, g) => `<path d="${torsoTop(g, { grow: 2.2, dip: 3.4 })}" fill="${c}"/>` + sleeves(c, g, 'long', 1.9)
    + `<path d="M ${CX - 7.6} ${Y.sh + 1} q 7.6 5.6 15.2 0 q 0.8 -3.6 -1.8 -3.6 q -5.6 4 -11.6 0 q -2.6 0 -1.8 3.6 Z" fill="${shade(c, .12)}"/>`
    + [0, 1, 2, 3].map(i => `<path d="M ${CX - 11} ${Y.chest + i * 11} q 11 2.6 22 0" stroke="${shade(c, .14)}" stroke-width="1" fill="none" opacity=".7"/>`).join('')
    + `<path d="M ${CX - 13} ${Y.hip - 2} q 13 3 26 0" stroke="${shade(c, .14)}" stroke-width="1.4" fill="none" opacity=".7"/>`;
  P.torso.hoodie = (c, l, g) => `<path d="${torsoTop(g, { grow: 2.6, dip: 3.6 })}" fill="${c}"/>` + sleeves(c, g, 'long', 2.1)
    + `<path d="M ${CX - 12} ${Y.sh + 1} q 12 -7.6 24 0 q 4.4 5 -1.4 8.4 q -10.6 3.4 -21.2 0 q -5.8 -3.4 -1.4 -8.4 Z" fill="${shade(c, -.16)}"/>`
    + `<path d="M ${CX - 8} ${Y.waist + 1} h 16 l -2.6 11.5 h -10.8 Z" fill="none" stroke="${shade(c, .18)}" stroke-width="1.1" opacity=".85"/>`
    + `<path d="M ${CX - 5} ${Y.sh + 8} l -1.4 12 M ${CX + 5} ${Y.sh + 8} l 1.4 12" stroke="${shade(c, .32)}" stroke-width="1.1"/>`
    + `<circle cx="${CX - 5}" cy="${Y.sh + 20}" r="1.1" fill="${shade(c, .45)}"/><circle cx="${CX + 5}" cy="${Y.sh + 20}" r="1.1" fill="${shade(c, .45)}"/>`;
  P.torso.jacket = (c, l, g) => `<path d="${torsoTop(g, { grow: 2.8, dip: 3.6 })}" fill="${c}"/>` + sleeves(c, g, 'long', 2.3)
    + `<path d="M ${CX - 6.6} ${Y.sh + 1} L ${CX} ${Y.chest + 16} L ${CX + 6.6} ${Y.sh + 1} L ${CX + 3.4} ${Y.sh - 1} L ${CX} ${Y.chest + 6} L ${CX - 3.4} ${Y.sh - 1} Z" fill="${shade(c, .2)}"/>`
    + `<path d="M ${CX - 10} ${Y.sh} q 10 6.6 20 0 l 1.8 3.4 q -11.8 7 -23.6 0 Z" fill="${shade(c, -.22)}"/>`
    + `<path d="M ${CX - 12} ${Y.waist + 6} h 24" stroke="${shade(c, .18)}" stroke-width="2" opacity=".7"/>`;
  P.torso.bomber = (c, l, g) => `<path d="${torsoTop(g, { grow: 3, dip: 3.4 })}" fill="${c}"/>` + sleeves(c, g, 'long', 2.5)
    + `<path d="M ${CX - 8.4} ${Y.sh + 0.5} q 8.4 5.4 16.8 0 l 1.8 3.6 q -10.2 6.4 -20.4 0 Z" fill="${shade(c, .18)}"/>`
    + `<path d="M ${CX - 12.4} ${Y.waist + 2} q 12.4 3.6 24.8 0 l 0.8 5.6 q -13.2 3.8 -26.4 0 Z" fill="${shade(c, .12)}"/>`
    + `<path d="M ${CX - 10.6} ${Y.sh + 12} h 21.2" stroke="${shade(c, -.24)}" stroke-width="1" opacity=".8"/>`;
  P.torso.puffer = (c, l, g) => `<path d="${torsoTop(g, { grow: 4, dip: 3.2 })}" fill="${c}"/>` + sleeves(c, g, 'long', 3.1)
    + [0, 1, 2, 3].map(i => `<path d="M ${CX - 19} ${Y.chest - 10 + i * 13} q 19 4.4 38 0" stroke="${shade(c, -.26)}" stroke-width="1.4" fill="none" opacity=".85"/>`).join('')
    + `<path d="M ${CX - 8.2} ${Y.sh + 0.5} q 8.2 5.4 16.4 0 l 1.6 3.6 q -9.8 6.2 -19.6 0 Z" fill="${shade(c, .2)}"/>`;
  P.torso.coat = (c, l, g) => {
    const f = figOf(g);
    const hem = Y.knee + 4;
    return `<path d="M ${CX - f.sh - 3.4} ${Y.sh - 1} C ${CX - f.sh - 5} ${Y.chest + 6} ${CX - f.hi - 3} ${Y.waist + 10} ${CX - f.hi - 2.6} ${hem}`
      + ` L ${CX + f.hi + 2.6} ${hem} C ${CX + f.hi + 3} ${Y.waist + 10} ${CX + f.sh + 5} ${Y.chest + 6} ${CX + f.sh + 3.4} ${Y.sh - 1}`
      + ` C ${CX + f.sh - 4} ${Y.sh - 5} ${CX + 6} ${Y.sh - 3} ${CX + 3} ${Y.sh + 4} Q ${CX} ${Y.sh + 8} ${CX - 3} ${Y.sh + 4}`
      + ` C ${CX - 6} ${Y.sh - 3} ${CX - f.sh + 4} ${Y.sh - 5} ${CX - f.sh - 3.4} ${Y.sh - 1} Z" fill="${c}"/>`
      + sleeves(c, g, 'long', 2.7)
      + `<path d="M ${CX} ${Y.chest - 6} l 2.6 5 l -2.6 26 l -2.6 -26 Z" fill="${shade(c, -.3)}" opacity=".55"/>`
      + `<rect x="${CX - f.hi - 3.4}" y="${Y.waist + 8}" width="${(f.hi + 3.4) * 2}" height="5.6" fill="${shade(c, -.38)}"/>`
      + `<path d="M ${CX - f.hi - 2.6} ${hem - 3} q ${f.hi + 2.6} 3.4 ${(f.hi + 2.6) * 2} 0" stroke="${LINE}" stroke-width=".8" fill="none" opacity=".5"/>`;
  };
  P.torso.vest = (c, l, g) => `<path d="${torsoTop(g, { grow: 1.4, dip: 6 })}" fill="${c}"/>`
    + `<path d="M ${CX - 8} ${Y.chest - 8} h 16 v 20 h -16 Z" fill="${shade(c, .14)}"/>`
    + `<path d="M ${CX - 8} ${Y.chest + 18} h 16 v 14 h -16 Z" fill="${shade(c, .06)}"/>`
    + `<path d="M ${CX - 9} ${Y.sh + 2} q 9 4 18 0" stroke="${shade(c, -.3)}" stroke-width="1.6" fill="none"/>`;
  P.torso.plate = (c, l, g) => `<path d="${torsoTop(g, { grow: 1.6, dip: 6 })}" fill="${c}"/>`
    + `<rect x="${CX - 10.6}" y="${Y.chest - 10}" width="21.2" height="22" rx="3" fill="${shade(c, .16)}"/>`
    + `<rect x="${CX - 10.6}" y="${Y.chest + 14}" width="21.2" height="16" rx="3" fill="${shade(c, .08)}"/>`
    + `<path d="M ${CX - 11} ${Y.sh + 4} h 22" stroke="${shade(c, -.34)}" stroke-width="2"/>`
    + `<path d="M ${CX - 10.6} ${Y.chest + 1} h 21.2 M ${CX - 10.6} ${Y.chest + 11} h 21.2" stroke="${shade(c, -.3)}" stroke-width="1"/>`;
  P.torso.riot = (c, l, g) => `<path d="${torsoTop(g, { grow: 2.2, dip: 6 })}" fill="${c}"/>`
    + `<rect x="${CX - 11.4}" y="${Y.chest - 12}" width="22.8" height="34" rx="4" fill="${shade(c, .1)}"/>`
    + `<path d="M ${CX - 11.4} ${Y.chest - 2} h 22.8 M ${CX - 11.4} ${Y.chest + 9} h 22.8" stroke="${shade(c, -.32)}" stroke-width="1.3"/>`
    + `<path d="M ${CX - 12} ${Y.sh + 2} q 12 4 24 0" stroke="${shade(c, -.4)}" stroke-width="2" fill="none"/>`
    + `<path d="M ${CX - 14.4} ${Y.chest - 14} q 14.4 -6 28.8 0" stroke="${shade(c, .18)}" stroke-width="2.4" fill="none"/>`;

  // ---- hands
  function handCenter(g, side) { const f = figOf(g); return CX + side * (f.sh - 1.6); }
  P.hands.gloves = (c, l, g) => [-1, 1].map(side => {
    const x = handCenter(g, side);
    return `<path d="${armPath(g, side, Y.wrist - 6)}" stroke="${c}" stroke-width="${(FIG[g === 'f' ? 'f' : g === 'e' ? 'e' : 'm'].ar + 0.7) * 2}" stroke-linecap="round" fill="none"/>`
      + `<circle cx="${x}" cy="${Y.wrist + 1}" r="4.8" fill="${c}"/>`
      + `<path d="M ${x - 4} ${Y.wrist - 3} h 8" stroke="${shade(c, -.28)}" stroke-width="1"/>`;
  }).join('');
  P.hands.wraps = (c, l, g) => [-1, 1].map(side => {
    const x = handCenter(g, side);
    return `<circle cx="${x}" cy="${Y.wrist + 1}" r="4.4" fill="${c}"/>`
      + [0, 1, 2].map(i => `<path d="M ${x - 4} ${Y.wrist - 1.6 + i * 2.6} h 8" stroke="${shade(c, -.3)}" stroke-width=".9"/>`).join('');
  }).join('');

  // ---- legs
  function legsArt(c, g, o) {
    o = o || {};
    const f = figOf(g);
    const w = o.w == null ? 1.4 : o.w;
    let out = `<path d="M ${CX - f.wa - 0.4} ${Y.waist - 8} L ${CX - f.hi - 0.8} ${Y.hip + 5} L ${CX + f.hi + 0.8} ${Y.hip + 5} L ${CX + f.wa + 0.4} ${Y.waist - 8} Z" fill="${c}"/>`;
    for (const side of [-1, 1]) {
      const x0 = CX + side * f.off, x1 = CX + side * (f.off + (o.taper || 0));
      out += `<path d="M ${x0} ${Y.hip - 6} L ${x1} ${Y.ankle + (o.break ? 2 : 0)}" stroke="${c}" stroke-width="${f.le * 2 + w}" stroke-linecap="butt" fill="none"/>`;
      out += `<path d="M ${x0} ${Y.hip - 6} L ${x1} ${Y.ankle}" stroke="${shade(c, -.24)}" stroke-width="1" fill="none" opacity=".45"/>`;
      if (o.cuff) out += `<path d="M ${x1 - f.le - 1} ${Y.ankle - 2} h ${(f.le + 1) * 2}" stroke="${shade(c, .22)}" stroke-width="3.4"/>`;
      if (o.break) out += `<path d="M ${x1 - f.le - 1.4} ${Y.ankle + 1} q ${f.le + 1.4} 3 ${(f.le + 1.4) * 2} 0" stroke="${shade(c, -.18)}" stroke-width="1.2" fill="none"/>`;
      if (o.crease) out += `<path d="M ${x1 - 1} ${Y.knee - 14} v 26" stroke="${shade(c, .16)}" stroke-width="1" opacity=".7"/>`;
    }
    out += `<path d="M ${CX - 4.6} ${Y.waist - 7} v 11 M ${CX + 4.6} ${Y.waist - 7} v 11" stroke="${shade(c, -.3)}" stroke-width=".8"/>`;
    return out;
  }
  P.legs.jeans = (c, l, g) => legsArt(c, g, { w: 1.6, crease: true });
  P.legs.cargo = (c, l, g) => legsArt(c, g, { w: 3.2 }) + [-1, 1].map(side => {
    const f = figOf(g), x = CX + side * f.off;
    return `<rect x="${x - f.le - 1.6}" y="${Y.knee - 30}" width="8.4" height="11" rx="1.4" fill="${shade(c, .12)}"/>`
      + `<path d="M ${x - f.le - 1.6} ${Y.knee - 27} h 8.4" stroke="${shade(c, -.24)}" stroke-width=".8"/>`;
  }).join('');
  P.legs.joggers = (c, l, g) => legsArt(c, g, { w: 2, taper: -2.6, cuff: true });
  P.legs.chinos = (c, l, g) => legsArt(c, g, { w: 1.2, taper: -0.8, break: true });

  // ---- feet
  P.feet.trainers = (c) => shoes(c, { tall: 8, sole: '#f5f3ee', lace: true, toe: true });
  P.feet.boots = (c) => shoes(c, { tall: 16, sole: '#1e1b19', lace: true, collar: true, toe: true });
  P.feet.loafers = (c) => shoes(c, { tall: 6, sole: '#191614' });
  P.feet.plain = null;

  // ---------------------------------------------------------------- assembly
  function figure(look, opts) {
    const r = parse(look);
    const u = uid();
    const g = r.g;
    const held = (opts && opts.held) || null;
    let out = baseBody(g) + baseClothes(g);
    const ordered = r.pieces.slice().sort((a, b) =>
      (PARTS.indexOf(a.part) - PARTS.indexOf(b.part)) || (a.layer - b.layer));
    for (const p of ordered) {
      const set = P[p.part];
      const fn = set && set[p.style];
      if (!fn) continue;
      try { out += fn(p.col, p.layer, g, u) || ''; } catch (e) { /* one bad piece must never break a citizen */ }
    }
    if (held) out += held;
    return { svg: out, g, pieces: r.pieces, seed: r.seed };
  }

  function wrap(id, w, h, size, inner, cls) {
    const height = Math.round(size * (h / w));
    return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${height}" class="${cls || 'av-svg'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${inner}</svg>`;
  }

  // ---------------------------------------------------------------- surfaces
  const BODY_CROP = '20 8 80 240';           // tidy figure crop out of the 120 x 252 box
  function doll(s, size, opts) {
    const f = figure(s, opts);
    return `<svg viewBox="${BODY_CROP}" width="${size}" height="${Math.round(size * 240 / 80)}" class="doll-svg av-doll" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${f.svg}</svg>`;
  }
  function svgFor(s, size) {
    const f = figure(s);
    size = size || 64;
    return `<svg viewBox="40 10 40 42" width="${size}" height="${size}" class="av-svg av-portrait" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${f.svg}</svg>`;
  }
  function duel(a, b, size) {
    const fa = figure(a), fb = figure(b);
    size = size || 320;
    const W = 320, H = 176;
    const inner = `<defs>`
      + `<linearGradient id="duelbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#241b3e"/><stop offset="100%" stop-color="#0d0a16"/></linearGradient>`
      + `<radialGradient id="duellight" cx="50%" cy="42%" r="62%"><stop offset="38%" stop-color="#a678e8" stop-opacity=".2"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>`
      + `<clipPath id="figA"><rect x="0" y="0" width="160" height="${H}"/></clipPath>`
      + `<clipPath id="figB"><rect x="160" y="0" width="160" height="${H}"/></clipPath></defs>`
      + `<rect width="${W}" height="${H}" fill="url(#duelbg)"/>`
      + `<rect width="${W}" height="${H}" fill="url(#duellight)"/>`
      // clip on an untransformed wrapper: with clip-path on the transformed
      // group itself, the clip rect travels with the group's own transform and
      // the mirrored figure ends up clipped away entirely
      + `<g clip-path="url(#figA)"><g transform="translate(0.6 6) scale(0.64)"><g transform="translate(56 0)">${fa.svg}</g></g></g>`
      + `<g clip-path="url(#figB)"><g transform="translate(319.4 6) scale(-0.64 0.64)"><g transform="translate(64 0)">${fb.svg}</g></g></g>`
      + `<path d="M 160 26 v 130" stroke="rgba(255,255,255,.07)" stroke-width="2"/>`
      + `<ellipse cx="160" cy="170" rx="128" ry="7" fill="rgba(255,255,255,.04)"/>`;
    return wrap(1, W, H, size, inner, 'av-duel');
  }
  function scene(s, size) {
    const f = figure(s);
    const W = 240, H = 190;
    const sky = 'sc' + (f.seed % 9973);
    const inner = `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2b2149"/><stop offset="100%" stop-color="#0d0a16"/></linearGradient></defs>`
      + `<rect width="${W}" height="${H}" fill="url(#${sky})"/>`
      + `<rect x="0" y="150" width="${W}" height="40" fill="#1a1428"/>`
      + `<rect x="12" y="94" width="22" height="56" fill="#120d1e"/><rect x="196" y="84" width="26" height="66" fill="#120d1e"/>`
      + `<path d="M 34 94 v 56 M 206 84 v 66" stroke="rgba(255,255,255,.06)" stroke-width="2"/>`
      + `<circle cx="176" cy="44" r="12" fill="rgba(216,121,201,.45)"/>`
      + `<g transform="translate(0 2) scale(0.72)"><g transform="translate(-4 0)">${f.svg}</g></g>`;
    return wrap(f.seed, W, H, size, inner, 'av-scene');
  }
  function mugshot(s, size, name) {
    const f = figure(s);
    const W = 120, H = 148;
    let grid = '';
    for (let y = 24; y <= 116; y += 9) grid += `<path d="M6 ${y} H114" stroke="#aeb6c2" stroke-width=".4" opacity=".28"/>`;
    for (let x = 6; x <= 114; x += 8) grid += `<path d="M${x} 16 v3" stroke="#aeb6c2" stroke-width=".7" opacity=".45"/>`;
    const no = 100000 + (f.seed % 899999);
    const nm = S(name || 'DETAINED').toUpperCase().slice(0, 18);
    const inner = `<rect width="${W}" height="${H}" fill="#120d1e"/>`
      + `<g transform="translate(8 -4) scale(0.62)"><g transform="translate(-24 0)">${f.svg}</g></g>`
      + grid
      + `<rect x="0" y="0" width="${W}" height="13" fill="rgba(0,0,0,.66)"/>`
      + `<text x="6" y="9.4" font-family="monospace" font-size="7" fill="#cfd6e2" letter-spacing="1.2">RTPD  ${no}</text>`
      + `<rect x="0" y="132" width="${W}" height="16" fill="#e8e4d8"/>`
      + `<rect x="0" y="132" width="3" height="16" fill="#9c3228"/>`
      + `<text x="9" y="143.4" font-family="sans-serif" font-size="8" font-weight="700" fill="#23231f" letter-spacing=".4">${nm}</text>`
      + `<text x="114" y="143.4" text-anchor="end" font-family="monospace" font-size="7" fill="#6b675c">HOLD</text>`;
    return wrap(f.seed, W, H, size, inner, 'av-mug');
  }
  function banner(s, size, name, sub) {
    const f = figure(s);
    const W = 480, H = 120;
    const nm = S(name || 'CITIZEN').toUpperCase().slice(0, 20);
    const inner = `<defs><linearGradient id="btx" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#221a38"/><stop offset="100%" stop-color="#0a0813"/></linearGradient></defs>`
      + `<rect width="${W}" height="${H}" fill="url(#btx)"/>`
      + `<g transform="translate(4 -12) scale(0.52)"><g transform="translate(-30 0)">${f.svg}</g></g>`
      + `<text x="96" y="58" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#f0ecfa" letter-spacing="2">${nm}</text>`
      + `<text x="98" y="78" font-family="monospace" font-size="12" fill="#a678e8" letter-spacing="2.4">${S(sub || '').toUpperCase().slice(0, 46)}</text>`;
    return wrap(f.seed, W, H, size, inner, 'av-banner');
  }

  // ---- wardrobe ledger (drives the "what you're wearing" panel)
  function wear(look) {
    return parse(look).pieces.map(p => ({
      slot: PART_LABEL[p.part] || p.part, part: p.part, style: p.style,
      col: p.col, layer: p.layer
    }));
  }
  function parts(look) {
    const by = {};
    for (const w of wear(look)) (by[w.part] = by[w.part] || []).push(w);
    return by;
  }

  // ---- deterministic roller (founder tools, sweeps, NPC seeding in the client)
  const KIT = [
    ['head', ['cap', 'snapback', 'beanie', 'bucket', 'durag'], ['#2f4a6b', '#22242a', '#6d4b2f', '#6b6448', '#3d2b52']],
    ['eyes', ['shades', 'specs'], ['#14161a', '#1a1c20', '#c9c2b0']],
    ['mouth', ['bandana', 'balaclava', 'resp'], ['#8c3a33', '#22242a', '#2f3339']],
    ['neck', ['chain', 'scarf'], ['#d8b25a', '#b9c0c9', '#7c3b34']],
    ['torso', ['tee', 'stripe', 'turtleneck', 'shirt', 'jumper', 'hoodie', 'jacket', 'bomber', 'puffer', 'coat'], ['#e8e6df', '#23252b', '#4a4e56', '#cfd8e4', '#7a5c3a', '#2f4a6b']],
    ['hands', ['gloves', 'wraps'], ['#2a2118', '#d8d4c8']],
    ['legs', ['jeans', 'cargo', 'joggers', 'chinos'], ['#3b4a63', '#93a3b8', '#4a503c', '#26272c', '#8a7f6a']],
    ['feet', ['trainers', 'boots', 'loafers'], ['#e6e4dd', '#4a352a', '#2b2320', '#8d5f45']]
  ];
  function random(seed) {
    let h = hash(S(seed == null ? Date.now() : seed));
    const nx = (n) => { h = (h * 48271) % 2147483647; return Math.abs(h) % Math.max(1, n); };
    const g = BODIES[nx(3)];
    const toks = [];
    for (const [part, styles, cols] of KIT) {
      if (part !== 'torso' && nx(4) === 0) continue;
      const layer = ['head', 'eyes', 'hands', 'legs'].includes(part) ? 4
        : (part === 'mouth' || part === 'feet' || (part === 'torso' && nx(2))) ? 5 : 2;
      toks.push(`${part}:${styles[nx(styles.length)]}:${cols[nx(cols.length)]}:${layer}`);
    }
    return g + '|' + toks.join(',');
  }

  // ================================================================ PORTRAITS (2026.5)
  // The face on the door. A citizen's public image is a photo-style portrait —
  // either a catalog face (/img/portraits/…) or their own upload (data URL) —
  // with the head/eyes/mouth/neck pieces of their equipped kit drawn on top as
  // a filter-style overlay. torso/legs/feet still live on the full-body model.
  //
  // Every catalog photo has its own anchor — where THAT face's features sit in
  // the 100x100 box after the browser's square cover crop (object-fit:cover,
  // object-position:center 18%). The overlay art is parameterised on the
  // anchor, so a cap / shades / chain lands on the actual face instead of
  // floating somewhere near it. Anchors are measured per photo; keep this map
  // in sync with PORTRAITS in lib/game/t26.js (tools/check-t26.js guards the
  // ids and files, the ox maps are additive data).
  //
  // ox: x = face centre, headTop = crown/hairline, eyeY = eye line,
  //     chinY = bottom of chin, neckY = base of neck — all in 0..100 box units.
  const PORTRAIT_FILES = {
    p01: { file: '/img/portraits/p01.jpg', ox: { x: 48, headTop: 13, eyeY: 36, chinY: 57, neckY: 65 } },
    p02: { file: '/img/portraits/p02.jpg', ox: { x: 50, headTop: 8,  eyeY: 40, chinY: 58, neckY: 68 } },
    p03: { file: '/img/portraits/p03.jpg', ox: { x: 51, headTop: 10, eyeY: 42, chinY: 60, neckY: 70 } },
    p04: { file: '/img/portraits/p04.jpg', ox: { x: 49, headTop: 10, eyeY: 45, chinY: 63, neckY: 72 } },
    p05: { file: '/img/portraits/p05.jpg', ox: { x: 49, headTop: 10, eyeY: 37, chinY: 55, neckY: 66 } },
    p06: { file: '/img/portraits/p06.jpg', ox: { x: 49, headTop: 14, eyeY: 39, chinY: 56, neckY: 66 } },
    p07: { file: '/img/portraits/p07.jpg', ox: { x: 49, headTop: 12, eyeY: 42, chinY: 60, neckY: 70 } },
    p08: { file: '/img/portraits/p08.jpg', ox: { x: 50, headTop: 12, eyeY: 44, chinY: 62, neckY: 72 } },
    p09: { file: '/img/portraits/p09.jpg', ox: { x: 50, headTop: 8,  eyeY: 42, chinY: 58, neckY: 68 } },
    p10: { file: '/img/portraits/p10.jpg', ox: { x: 49, headTop: 10, eyeY: 40, chinY: 58, neckY: 68 } }
  };
  // uploads are cut to a 200x275 head-and-shoulders frame in the browser;
  // this anchor suits that typical framing once shown in the square box
  const OX_CUSTOM = { x: 50, headTop: 11, eyeY: 31, chinY: 45, neckY: 56 };
  const OX_DEFAULT = { x: 50, headTop: 10, eyeY: 37, chinY: 56, neckY: 66 };

  function anchorOf(p) {
    const face = (p && p.portrait) ? p.portrait : '';
    if (face === 'custom') return OX_CUSTOM;
    const e = PORTRAIT_FILES[face];
    return (e && e.ox) || OX_DEFAULT;
  }
  // derived geometry for the overlay art. The face model: width at eye level
  // scales with the measured head height, the jaw tapers below, hats sit a
  // touch wider than the eyes.
  function geomOf(O) {
    O = O || OX_DEFAULT;
    const x = Number.isFinite(O.x) ? O.x : 50;
    const headTop = Number.isFinite(O.headTop) ? O.headTop : 10;
    const eyeY = Number.isFinite(O.eyeY) ? O.eyeY : 37;
    const chinY = Number.isFinite(O.chinY) ? Math.max(eyeY + 12, O.chinY) : eyeY + 19;
    const neckY = Number.isFinite(O.neckY) ? Math.max(chinY + 4, O.neckY) : chinY + 10;
    const headH = Math.max(18, chinY - headTop);
    const eyeW = Math.max(24, Math.min(38, headH * 0.66));   // width at eye level
    const jawW = eyeW * 0.8;                                  // width at mouth/jaw
    const capW = eyeW * 1.08;                                 // hat width
    const eyeDx = eyeW * 0.21;                                // eye centre offset
    return {
      x, headTop, eyeY, chinY, neckY, headH, eyeW, jawW, capW, eyeDx,
      mouthY: eyeY + (chinY - eyeY) * 0.62
    };
  }
  function overlayPiece(part, style, c, G) {
    const sh = (col, a) => shade(col, a);
    const { x, headTop, eyeY, chinY, neckY, eyeW, jawW, capW, eyeDx, mouthY } = G;
    switch (part + ':' + style) {
      case 'head:cap':
      case 'head:snapback': {
        const hw = capW / 2;
        let out = `<path d="M ${x - hw - 1} ${eyeY - 2.2} C ${x - hw - 2} ${headTop - 4} ${x + hw + 2} ${headTop - 4} ${x + hw + 1} ${eyeY - 2.2} Z" fill="${c}" stroke="rgba(0,0,0,.4)" stroke-width=".6"/>`
          + `<rect x="${x - hw - 1.6}" y="${eyeY - 3.2}" width="${capW + 3.2}" height="4.2" rx="2.1" fill="${sh(c, -.28)}"/>`
          + `<circle cx="${x}" cy="${headTop - 0.6}" r="1.4" fill="${sh(c, .3)}"/>`;
        if (style === 'snapback') out += `<path d="M ${x - hw - 1.2} ${eyeY - 3.6} q ${hw + 1.2} -2.2 ${capW + 2.4} 0" stroke="${sh(c, -.32)}" stroke-width="1" fill="none"/>`;
        return out;
      }
      case 'head:beanie': {
        const hw = eyeW / 2;
        const knit = [0, 1, 2, 3, 4].map(i => `<path d="M ${x - hw * 0.7 + i * (hw * 0.35)} ${headTop + 0.5} v 7.5" stroke="${sh(c, -.1)}" stroke-width="1" opacity=".7"/>`).join('');
        return `<path d="M ${x - hw} ${eyeY - 4.4} C ${x - hw - 1.2} ${headTop - 2.5} ${x + hw + 1.2} ${headTop - 2.5} ${x + hw} ${eyeY - 4.4} Z" fill="${c}"/>`
          + `<rect x="${x - hw - 0.6}" y="${eyeY - 5.8}" width="${eyeW + 1.2}" height="7" rx="3.5" fill="${sh(c, -.2)}"/>`
          + knit;
      }
      case 'head:bucket': {
        const hw = eyeW / 2;
        const bw = hw + 9.5;
        return `<ellipse cx="${x}" cy="${eyeY - 2.2}" rx="${bw}" ry="4.6" fill="${sh(c, -.14)}"/>`
          + `<path d="M ${x - hw + 0.5} ${eyeY - 2.4} C ${x - hw - 1} ${headTop - 3.5} ${x + hw + 1} ${headTop - 3.5} ${x + hw - 0.5} ${eyeY - 2.4} Z" fill="${c}"/>`
          + `<path d="M ${x - hw * 0.72} ${headTop + 0.5} q ${hw * 0.72} -2.8 ${hw * 1.44} 0" stroke="${sh(c, .16)}" stroke-width="1.5" fill="none"/>`;
      }
      case 'head:durag': {
        const hw = eyeW / 2;
        return `<path d="M ${x - hw} ${eyeY - 1.4} C ${x - hw - 1} ${headTop - 2} ${x + hw + 1} ${headTop - 2} ${x + hw} ${eyeY - 1.4} Z" fill="${c}"/>`
          + `<path d="M ${x + hw - 1.5} ${eyeY - 7} q 11.5 7 8.4 18.4 q -6 -2.4 -9 -10 Z" fill="${sh(c, -.16)}"/>`
          + `<path d="M ${x - hw + 1.5} ${eyeY - 7} q -11.5 7 -8.4 18.4 q 6 -2.4 9 -10 Z" fill="${sh(c, -.16)}"/>`
          + `<path d="M ${x + hw - 1.5} ${eyeY - 2} q 7 3 8 8" stroke="${sh(c, .2)}" stroke-width="1.2" fill="none"/>`;
      }
      case 'eyes:shades':
        return `<rect x="${x - eyeW / 2 - 1.4}" y="${eyeY - 4.2}" width="${eyeW + 2.8}" height="8.6" rx="2.9" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>`
          + `<path d="M ${x - eyeW / 2 - 1.4} ${eyeY - 0.6} h ${eyeW + 2.8}" stroke="${sh(c, .3)}" stroke-width="1" opacity=".5"/>`
          + `<rect x="${x - eyeDx - 4.2}" y="${eyeY - 2.2}" width="8.4" height="2.4" rx="1.1" fill="rgba(255,255,255,.3)"/>`
          + `<rect x="${x + eyeDx - 4.2}" y="${eyeY - 2.2}" width="8.4" height="2.4" rx="1.1" fill="rgba(255,255,255,.3)"/>`;
      case 'eyes:specs': {
        const r = eyeW * 0.135;
        return `<circle cx="${x - eyeDx}" cy="${eyeY + 0.3}" r="${r}" fill="rgba(205,228,240,.28)" stroke="${c}" stroke-width="1.4"/>`
          + `<circle cx="${x + eyeDx}" cy="${eyeY + 0.3}" r="${r}" fill="rgba(205,228,240,.28)" stroke="${c}" stroke-width="1.4"/>`
          + `<path d="M ${x - r * 0.4} ${eyeY - 0.1} h ${r * 0.8}" stroke="${c}" stroke-width="1.4"/>`
          + `<path d="M ${x - eyeDx - r} ${eyeY - 0.7} l -4.2 -1.5 M ${x + eyeDx + r} ${eyeY - 0.7} l 4.2 -1.5" stroke="${c}" stroke-width="1.1"/>`;
      }
      case 'mouth:bandana':
        return `<path d="M ${x - jawW / 2 - 1} ${mouthY - 3} q ${jawW / 2 + 1} -2.6 ${jawW + 2} 0 v 8 q -${(jawW + 2) / 2} 3.4 -${jawW + 2} 0 Z" fill="${c}"/>`
          + `<path d="M ${x - jawW / 2 - 1} ${mouthY - 3} q -5.4 -0.5 -7.6 2.9 q 5 2.6 7.6 2.9 Z" fill="${sh(c, -.22)}"/>`
          + `<path d="M ${x - jawW / 2 - 1} ${mouthY + 2.4} q ${jawW / 2 + 1} 2.8 ${jawW + 2} 0" stroke="${sh(c, .2)}" stroke-width=".9" fill="none" opacity=".7"/>`;
      case 'mouth:balaclava': {
        const hw = capW / 2;
        const slitW = eyeW * 0.62;
        return `<path d="M ${x - hw - 2.4} ${eyeY - 4} C ${x - hw - 3.6} ${headTop - 3.5} ${x + hw + 3.6} ${headTop - 3.5} ${x + hw + 2.4} ${eyeY - 4} C ${x + hw + 3} ${chinY + 2.5} ${x - hw - 3} ${chinY + 2.5} ${x - hw - 2.4} ${eyeY - 4} Z" fill="${c}"/>`
          + `<rect x="${x - slitW / 2}" y="${eyeY - 3.6}" width="${slitW}" height="7.2" rx="3.6" fill="#14161a"/>`
          + `<path d="M ${x - slitW / 2} ${eyeY - 1} h ${slitW}" stroke="${sh(c, .35)}" stroke-width=".7" opacity=".6"/>`
          + `<path d="M ${x - hw - 2.4} ${eyeY + 7} q ${hw + 2.4} -2.6 ${capW + 4.8} 0" stroke="${sh(c, -.25)}" stroke-width="1" fill="none" opacity=".6"/>`;
      }
      case 'mouth:resp':
        return `<path d="M ${x - eyeW * 0.41} ${mouthY - 3} q ${eyeW * 0.41} -3 ${eyeW * 0.82} 0 q 1.6 9.6 -${eyeW * 0.41} 11.4 q -${eyeW * 0.41} -1.8 -${eyeW * 0.82} -11.4 Z" fill="${c}"/>`
          + `<circle cx="${x - eyeDx * 1.15}" cy="${mouthY + 3.4}" r="3" fill="${sh(c, -.3)}"/>`
          + `<circle cx="${x + eyeDx * 1.15}" cy="${mouthY + 3.4}" r="3" fill="${sh(c, -.3)}"/>`
          + `<path d="M ${x - eyeW * 0.41} ${mouthY - 2} l -4.4 -1.8 M ${x + eyeW * 0.41} ${mouthY - 2} l 4.4 -1.8" stroke="${sh(c, -.24)}" stroke-width="1.8"/>`;
      case 'neck:chain':
        return `<path d="M ${x - eyeW * 0.3} ${neckY - 2} q ${eyeW * 0.3} 9 ${eyeW * 0.6} 0" stroke="${c}" stroke-width="2.4" fill="none"/>`
          + `<circle cx="${x}" cy="${neckY + 8.6}" r="3.2" fill="${c}" stroke="${sh(c, -.35)}" stroke-width=".8"/>`
          + `<circle cx="${x - 0.8}" cy="${neckY + 7.8}" r="1" fill="${sh(c, .45)}" opacity=".85"/>`;
      case 'neck:scarf': {
        const sw = eyeW * 0.42;
        return `<path d="M ${x - sw} ${neckY - 4.5} q ${sw} 8 ${sw * 2} 0 q 1 5.8 -0.6 8.6 q -${sw * 0.92} 5.2 -${sw * 1.84} 0 q -1.6 -2.8 -0.3 -8.6 Z" fill="${c}"/>`
          + `<path d="M ${x + sw * 0.5} ${neckY + 3.4} l 4.2 19 l -5.6 1 l -2.6 -18 Z" fill="${sh(c, -.14)}"/>`
          + `<path d="M ${x - sw} ${neckY + 0.8} q ${sw} 4.2 ${sw * 2} 0" stroke="${sh(c, .24)}" stroke-width="1.4" fill="none" opacity=".8"/>`;
      }
      default:
        return '';
    }
  }
  // Accessory overlay for a look string on a given face anchor: only the parts
  // a chest-up photo shows (head / eyes / mouth / neck).
  function portraitOverlay(look, O) {
    const G = geomOf(O);
    const r = parse(look);
    const usable = ['head', 'eyes', 'mouth', 'neck'];
    const bits = r.pieces.filter(p => usable.includes(p.part))
      .sort((a, b) => (a.part === 'mouth' ? 0 : 1) - (b.part === 'mouth' ? 0 : 1));
    let inner = '';
    for (const p of bits) { try { inner += overlayPiece(p.part, p.style, p.col, G) || ''; } catch (e) {} }
    if (!inner) return '';
    return `<svg viewBox="0 0 100 100" class="av-overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  }
  // The Torn-style avatar: a photo-style face with the kit's visible pieces on top.
  // p: { avatar (look string), portrait (catalog id | 'custom'), pic, name, online, wanted }
  function portraitFor(p, size, opts) {
    size = size || 64;
    opts = opts || {};
    const look = (p && typeof p.avatar === 'string') ? p.avatar : (typeof p === 'string' ? p : 'm|');
    const O = anchorOf(p);
    let src = '';
    if (p && p.portrait === 'custom' && p.pic) src = p.pic;
    else if (p && p.portrait && p.portrait !== 'custom') src = (PORTRAIT_FILES[p.portrait] || {}).file || '';
    const badge = [];
    if (opts.online) badge.push('<span class="av-online" title="online now"></span>');
    if (opts.wanted > 0) badge.push('<span class="av-wanted" title="' + opts.wanted + '-star warrant">' + '★'.repeat(opts.wanted) + '</span>');
    if (src) {
      return `<span class="av-photo ${opts.cls || ''}" style="width:${size}px;height:${size}px" title="${S(p && p.name || 'citizen').replace(/"/g, '&quot;')}">`
        + `<img src="${src}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center 18%;display:block">`
        + portraitOverlay(look, O)
        + badge.join('')
        + '</span>';
    }
    // no portrait data (dense lists for uploaders, legacy junk): the town model
    return `<span class="av-fallback ${opts.cls || ''}" style="width:${size}px;height:${size}px;display:inline-block">${svgFor(look, size)}</span>`;
  }

  const SURFACES = ['doll', 'svgFor', 'duel', 'scene', 'mugshot', 'banner', 'wear', 'parts', 'random', 'parse', 'figure', 'styleOf', 'svgDataUri', 'portraitDataUri', 'portraitFor', 'portraitOverlay', 'portraitSrc'];
  ROOT.AV = {
    doll, svgFor, duel, scene, mugshot, banner, wear, parts, random, parse, figure,
    portraitFor, portraitOverlay,
    portraitSrc: (p) => {
      if (!p) return '';
      if (p.portrait === 'custom' && p.pic) return p.pic;
      const e = PORTRAIT_FILES[p.portrait];
      return (e && e.file) || '';
    },
    PARTS, PART_LABEL, BODIES, STYLES: P,
    styleOf: (look) => parse(look).pieces.map(p => p.style),
    svgDataUri: (s, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size)),
    portraitDataUri: (s, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)),
    TOTALS: { styles: Object.keys(P).reduce((n, k) => n + Object.keys(P[k]).length, 0) - 4, parts: PARTS.length, bodies: BODIES.length, surfaces: SURFACES.length }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ROOT.AV;
})();
