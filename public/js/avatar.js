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
//
// 2026.6 overhaul: the figure is now a shaded, anatomically-posed model rather
// than a flat paper doll. Every surface shares one lighting rig (key light from
// the upper left, cool rim from the right, contact shadow on the ground), every
// garment is drawn with its own cloth gradient, folds and hem shadow, and the
// face is built from real features (lids, brow ridge, nose bridge, lips, ears)
// instead of dots. The look-string format, the style ids and the exported
// surfaces are unchanged, so nothing upstream has to move.
(function () {
  'use strict';

  const ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const S = (v) => String(v == null ? '' : v);

  // ---------------------------------------------------------------- palette
  const SKIN = { base: '#c9926a', lit: '#e8bb92', hi: '#f3d3ae', shade: '#a06c48', line: '#7d4f30', dark: '#7a4c2c' };
  const HAIRC = { m: '#2a1d14', f: '#3c2617', e: '#31241a' };
  const BASE = { tee: '#e9e7e0', leg: '#3f4d64', foot: '#ecebe5' };
  const LINE = 'rgba(48,28,12,.42)';
  const INK = 'rgba(16,10,6,.55)';       // contour ink, used sparingly

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
  // Draw order, low to high. Face coverings go on BEFORE headwear so a cap
  // sits on top of a balaclava the way it does in life.
  const PARTS = ['legs', 'feet', 'torso', 'hands', 'neck', 'mouth', 'eyes', 'head'];
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
  const n2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);

  // ---------------------------------------------------------------- render context
  // One drawing pass shares a defs bucket so every garment can carry its own
  // cloth gradient without leaking ids across citizens on the same page.
  let CTX = null;
  function ctx() {
    if (!CTX) CTX = { u: uid(), defs: [], n: 0 };
    return CTX;
  }
  function def(markup) { const c = ctx(); c.defs.push(markup); }
  function nid(tag) { const c = ctx(); return c.u + '_' + (tag || 'd') + (++c.n); }

  // Cloth: lit from the upper left, falling to a cool shadow bottom right.
  // Gradients are emitted in USER SPACE on purpose: an objectBoundingBox
  // gradient silently fails to paint on a stroked straight line (a trouser leg,
  // a sleeve) because that path's bounding box has zero width, which used to
  // drop whole garments out of the drawing.
  function ramp(stops, box) {
    const b = box || [CX - 26, Y.sh - 8, CX + 26, Y.hip + 8];
    const id = nid('g');
    def(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n2(b[0])}" y1="${n2(b[1])}" x2="${n2(b[2])}" y2="${n2(b[3])}">${stops}</linearGradient>`);
    return 'url(#' + id + ')';
  }
  function cloth(c, strength, box) {
    const s = strength == null ? 1 : strength;
    return ramp(`<stop offset="0%" stop-color="${shade(c, 0.17 * s)}"/>`
      + `<stop offset="46%" stop-color="${c}"/>`
      + `<stop offset="100%" stop-color="${shade(c, -0.26 * s)}"/>`, box);
  }
  // Metal / leather: a harder specular ramp.
  function sheen(c, box) {
    return ramp(`<stop offset="0%" stop-color="${shade(c, 0.42)}"/>`
      + `<stop offset="28%" stop-color="${shade(c, 0.06)}"/>`
      + `<stop offset="62%" stop-color="${shade(c, -0.18)}"/>`
      + `<stop offset="100%" stop-color="${shade(c, 0.12)}"/>`, box);
  }
  function skinGrad(box) {
    return ramp(`<stop offset="0%" stop-color="${SKIN.lit}"/>`
      + `<stop offset="45%" stop-color="${SKIN.base}"/>`
      + `<stop offset="100%" stop-color="${SKIN.shade}"/>`, box || [CX - 24, Y.head - 20, CX + 24, Y.hip]);
  }
  function hairGrad(c) {
    return ramp(`<stop offset="0%" stop-color="${shade(c, 0.3)}"/>`
      + `<stop offset="40%" stop-color="${c}"/>`
      + `<stop offset="100%" stop-color="${shade(c, -0.35)}"/>`, [CX - 18, Y.head - 22, CX + 18, Y.chin + 8]);
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
  // The torso silhouette: trapezius slope into the deltoids, a ribcage that
  // narrows to the waist, then flares to the hips.
  function torsoTop(g, o) {
    o = o || {};
    const f = figOf(g), grow = o.grow || 0;
    const sh = f.sh + grow, wa = f.wa + grow * 0.6, hi = f.hi + grow * 0.75;
    const shY = Y.sh - (o.shUp || 0);
    const dip = o.dip == null ? 5 : o.dip;
    const hipY = Y.hip + (o.hip || 0);
    const rib = Y.chest - 4;
    return `M ${n2(CX - sh)} ${n2(shY + 3)}`
      + ` C ${n2(CX - sh - 1.6)} ${n2(rib - 8)} ${n2(CX - wa - 2.2)} ${n2(rib + 6)} ${n2(CX - wa)} ${n2(Y.waist - 4)}`
      + ` C ${n2(CX - wa - 0.6)} ${n2(Y.waist + 5)} ${n2(CX - hi + 0.6)} ${n2(hipY - 8)} ${n2(CX - hi)} ${n2(hipY)}`
      + ` L ${n2(CX + hi)} ${n2(hipY)}`
      + ` C ${n2(CX + hi - 0.6)} ${n2(hipY - 8)} ${n2(CX + wa + 0.6)} ${n2(Y.waist + 5)} ${n2(CX + wa)} ${n2(Y.waist - 4)}`
      + ` C ${n2(CX + wa + 2.2)} ${n2(rib + 6)} ${n2(CX + sh + 1.6)} ${n2(rib - 8)} ${n2(CX + sh)} ${n2(shY + 3)}`
      + ` C ${n2(CX + sh - 3.2)} ${n2(shY - 3.6)} ${n2(CX + 7.4)} ${n2(shY - 2.2)} ${n2(CX + 4.2)} ${n2(shY + dip)}`
      + ` Q ${n2(CX)} ${n2(shY + dip + 3.6)} ${n2(CX - 4.2)} ${n2(shY + dip)}`
      + ` C ${n2(CX - 7.4)} ${n2(shY - 2.2)} ${n2(CX - sh + 3.2)} ${n2(shY - 3.6)} ${n2(CX - sh)} ${n2(shY + 3)} Z`;
  }
  // Arms hang with a slight outward bow and settle beside the hips.
  function armPath(g, side, yEnd) {
    const f = figOf(g);
    const x0 = CX + side * (f.sh - 2.6), y0 = Y.sh + 9;
    const xe = CX + side * (f.sh - 0.2);
    const mid = (y0 + yEnd) / 2;
    return `M ${n2(x0)} ${n2(y0)} C ${n2(CX + side * (f.sh + 1.1))} ${n2(mid - 6)} ${n2(CX + side * (f.sh + 0.8))} ${n2(mid + 8)} ${n2(xe)} ${n2(yEnd)}`;
  }
  function sleeves(c, g, len, w, opt) {
    opt = opt || {};
    const f = figOf(g);
    const short = len === 'short';
    const yEnd = short ? Y.chest - 3 : Y.wrist - 1;
    const width = (f.ar + (w == null ? 1.3 : w)) * 2;
    const fill = opt.flat ? c : cloth(c, 0.8, [CX - f.sh - 4, Y.sh, CX + f.sh + 4, yEnd]);
    let out = '';
    for (const side of [-1, 1]) {
      const d = armPath(g, side, yEnd);
      // a short sleeve ends in a straight hem, not a ball: butt cap plus a hem
      // band. A long sleeve keeps the rounded cap so it wraps the wrist.
      // butt caps at both ends: a round cap at the shoulder balloons into a
      // pauldron, so the shoulder is capped flat and the deltoid is drawn as
      // its own rounded shape that tucks under the torso shell.
      const sx = CX + side * (f.sh - 2.6);
      out += `<ellipse cx="${n2(sx)}" cy="${n2(Y.sh + 8)}" rx="${n2(width * 0.46)}" ry="${n2(width * 0.42)}" fill="${fill}"/>`;
      out += `<path d="${d}" stroke="${fill}" stroke-width="${n2(width)}" stroke-linecap="butt" fill="none"/>`;
      if (!short) out += `<circle cx="${n2(CX + side * (f.sh - 0.2))}" cy="${n2(yEnd)}" r="${n2(width * 0.5)}" fill="${fill}"/>`;
      out += `<path d="${d}" stroke="${shade(c, -0.3)}" stroke-width="${n2(width * 0.3)}" stroke-linecap="butt" fill="none" opacity=".4"`
        + ` transform="translate(${n2(side * width * 0.24)} 0)"/>`;
      out += `<path d="${d}" stroke="${shade(c, 0.26)}" stroke-width="${n2(width * 0.16)}" stroke-linecap="butt" fill="none" opacity=".38"`
        + ` transform="translate(${n2(-side * width * 0.26)} 0)"/>`;
      const x = CX + side * (f.sh - (short ? 1.4 : 0.2));
      if (short) {
        out += `<path d="M ${n2(x - width / 2)} ${n2(yEnd - 1.6)} q ${n2(width / 2)} 2.4 ${n2(width)} 0 v 2 q ${n2(-width / 2)} 2.4 ${n2(-width)} 0 Z" fill="${shade(c, -0.2)}"/>`;
      } else if (opt.cuff) {
        out += `<rect x="${n2(x - width / 2)}" y="${n2(yEnd - 4)}" width="${n2(width)}" height="4.4" rx="2" fill="${shade(c, -0.18)}"/>`;
      }
      // shoulder seam
      out += `<path d="M ${n2(CX + side * (f.sh - 4))} ${n2(Y.sh + 2)} q ${n2(side * 3)} 3.4 ${n2(side * 3.4)} 7" stroke="${shade(c, -0.24)}" stroke-width=".9" fill="none" opacity=".5"/>`;
    }
    return out;
  }
  // Shoes: a heel block, an instep and a rounded toe, on both feet.
  function shoes(c, o) {
    o = o || {};
    const out = [];
    const halfW = o.wide || 8.2;
    const lift = o.lift == null ? 1.6 : o.lift;
    const body = cloth(c, 0.9, [CX - 20, Y.ankle - (o.tall || 0) - 2, CX + 20, Y.ground]);
    for (const side of [-1, 1]) {
      const cx = CX + side * 9.0;
      const a = cx - halfW, b = cx + halfW;
      const top = Y.ankle - (o.tall || 0);
      const solY = Y.ground - 3.4 - lift;
      out.push(`<path d="M ${n2(a)} ${n2(top)} q 0 -2 ${n2(halfW)} -2 q ${n2(halfW)} 0 ${n2(halfW)} 2`
        + ` v ${n2(solY - top - 1)} q 0 3.4 -3.4 3.4 h ${n2(-(halfW * 2 - 6.8))} q -3.4 0 -3.4 -3.4 Z"`
        + ` fill="${body}" stroke="${LINE}" stroke-width=".5"/>`);
      // toe box highlight + instep shadow
      out.push(`<path d="M ${n2(a + 1.2)} ${n2(solY - 5)} q ${n2(halfW - 1)} -3 ${n2(halfW * 1.5)} 0" stroke="${shade(c, 0.28)}" stroke-width="1.1" fill="none" opacity=".45"/>`);
      out.push(`<path d="M ${n2(b - 3)} ${n2(top + 1)} v ${n2(solY - top - 2)}" stroke="${shade(c, -0.32)}" stroke-width="2.2" opacity=".35"/>`);
      out.push(`<rect x="${n2(a - 0.9)}" y="${n2(solY)}" width="${n2(halfW * 2 + 1.8)}" height="3.8" rx="1.7" fill="${o.sole || '#f3f1ea'}"/>`);
      out.push(`<rect x="${n2(a - 0.9)}" y="${n2(solY + 2.4)}" width="${n2(halfW * 2 + 1.8)}" height="1.4" rx=".7" fill="rgba(0,0,0,.22)"/>`);
      if (o.lace) {
        for (let i = 0; i < 3; i++) out.push(`<path d="M ${n2(a + 3.4)} ${n2(top + 4 + i * 3)} h ${n2(halfW * 2 - 6.8)}" stroke="rgba(255,255,255,.5)" stroke-width=".9"/>`);
      }
      if (o.collar) out.push(`<rect x="${n2(a)}" y="${n2(top - 2.6)}" width="${n2(halfW * 2)}" height="4.2" rx="1.8" fill="${shade(c, .18)}"/>`);
      if (o.toe) out.push(`<path d="M ${n2(a)} ${n2(solY - 2.2)} h ${n2(halfW * 2)}" stroke="${shade(c, -.32)}" stroke-width=".8" opacity=".7"/>`);
    }
    return out.join('');
  }
  function legSkin(g) {
    const f = figOf(g), sk = skinGrad();
    let out = '';
    for (const side of [-1, 1]) {
      const x = CX + side * f.off;
      out += `<path d="M ${n2(x)} ${n2(Y.hip - 8)} C ${n2(x + side * 1.2)} ${n2(Y.knee - 24)} ${n2(x - side * 0.6)} ${n2(Y.knee + 10)} ${n2(x)} ${n2(Y.ankle + 1)}"`
        + ` stroke="${sk}" stroke-width="${n2(f.le * 2)}" stroke-linecap="round" fill="none"/>`;
      out += `<path d="M ${n2(x + side * f.le * 0.45)} ${n2(Y.hip - 4)} L ${n2(x + side * f.le * 0.45)} ${n2(Y.ankle - 2)}"`
        + ` stroke="${SKIN.shade}" stroke-width="${n2(f.le * 0.5)}" opacity=".35" stroke-linecap="round"/>`;
    }
    // inner-thigh separation
    out += `<path d="M ${n2(CX)} ${n2(Y.hip + 2)} v ${n2(Y.ankle - Y.hip - 4)}" stroke="rgba(60,34,16,.26)" stroke-width="2"/>`;
    return out;
  }
  // Bare hands are drawn LAST, on top of every sleeve, so a long-sleeved coat
  // can never swallow them. Gloves and wraps suppress them and draw their own.
  function bareHands(g) {
    const f = figOf(g);
    let out = '';
    for (const side of [-1, 1]) {
      const hx = CX + side * (f.sh - 0.2);
      out += `<path d="M ${n2(hx - 3.4)} ${n2(Y.wrist + 1)} q 3.4 -1.8 6.8 0 q 1.1 5.6 -3.4 8 q -4.5 -2.4 -3.4 -8 Z" fill="${SKIN.base}" stroke="${LINE}" stroke-width=".4"/>`;
      out += `<path d="M ${n2(hx - 1.6)} ${n2(Y.wrist + 4.8)} v 3.4 M ${n2(hx + 0.8)} ${n2(Y.wrist + 5)} v 3.2" stroke="${SKIN.shade}" stroke-width=".5" opacity=".7"/>`;
      out += `<path d="M ${n2(hx - 3.2)} ${n2(Y.wrist + 2)} q 2 -1.4 4 -0.6" stroke="${SKIN.lit}" stroke-width=".8" fill="none" opacity=".5"/>`;
    }
    return out;
  }
  // The base kit is only the underwear the citizen has nothing over: if they
  // own a torso piece we do not draw the default tee underneath it, which used
  // to push a white sleeve out past every jacket cuff.
  function baseClothes(g, has) {
    has = has || {};
    const f = figOf(g);
    let out = '';
    if (!has.torso) out += `<path d="${torsoTop(g, { grow: 0.8, dip: 5 })}" fill="${cloth(BASE.tee, .7)}"/>` + sleeves(BASE.tee, g, 'short', 0.5);
    if (!has.legs) {
      out += `<path d="M ${n2(CX - f.wa - 0.4)} ${n2(Y.waist - 8)} L ${n2(CX - f.hi - 0.6)} ${n2(Y.hip + 5)} L ${n2(CX + f.hi + 0.6)} ${n2(Y.hip + 5)} L ${n2(CX + f.wa + 0.4)} ${n2(Y.waist - 8)} Z" fill="${cloth(BASE.leg, .8, [CX - f.hi, Y.waist - 10, CX + f.hi, Y.ankle])}"/>`;
      for (const side of [-1, 1]) {
        out += `<path d="M ${n2(CX + side * f.off)} ${n2(Y.hip - 8)} L ${n2(CX + side * (f.off + 0.2))} ${n2(Y.ankle + 1)}" stroke="${BASE.leg}" stroke-width="${n2(f.le * 2 + 1.2)}" stroke-linecap="butt" fill="none"/>`;
      }
    }
    if (!has.feet) out += shoes(BASE.foot, { sole: '#ffffff' });
    return out;
  }

  // ---- head ---------------------------------------------------------------
  // A real skull: cranium, temple, cheekbone, jaw angle and chin, with the ears
  // set behind. Everything downstream (hats, masks, shades) keys off Y.head.
  function headPath(g) {
    const f = figOf(g), hw = f.head[0], hh = f.head[1];
    const top = Y.head - hh, chin = Y.chin + 1.5;
    const cheek = Y.head + 5;
    return `M ${n2(CX)} ${n2(top)}`
      + ` C ${n2(CX + hw * 0.72)} ${n2(top)} ${n2(CX + hw)} ${n2(top + hh * 0.45)} ${n2(CX + hw)} ${n2(Y.head + 1)}`
      + ` C ${n2(CX + hw)} ${n2(cheek + 2)} ${n2(CX + hw * 0.82)} ${n2(Y.jaw - 3)} ${n2(CX + hw * 0.5)} ${n2(chin - 2.4)}`
      + ` C ${n2(CX + hw * 0.3)} ${n2(chin)} ${n2(CX - hw * 0.3)} ${n2(chin)} ${n2(CX - hw * 0.5)} ${n2(chin - 2.4)}`
      + ` C ${n2(CX - hw * 0.82)} ${n2(Y.jaw - 3)} ${n2(CX - hw)} ${n2(cheek + 2)} ${n2(CX - hw)} ${n2(Y.head + 1)}`
      + ` C ${n2(CX - hw)} ${n2(top + hh * 0.45)} ${n2(CX - hw * 0.72)} ${n2(top)} ${n2(CX)} ${n2(top)} Z`;
  }
  function face(g) {
    const f = figOf(g), hw = f.head[0];
    const hc = HAIRC[g] || HAIRC.m;
    const ey = Y.head + 1.5;
    const browY = ey - 4.6;
    const noseY = ey + 6.4;
    const mouthY = Y.jaw - 3.2;
    let out = '';
    // brow ridge shadow + cheek modelling
    out += `<path d="M ${n2(CX - hw + 2)} ${n2(browY + 0.6)} q ${n2(hw - 2)} -2.6 ${n2((hw - 2) * 2)} 0" stroke="rgba(110,66,34,.22)" stroke-width="3" fill="none"/>`;
    // cheekbone planes — a soft lit plane on the key side, a cool one opposite
    // cheekbone planes — soft radial falloff, never a visible disc
    const soft = (c2) => {
      const id = nid('sf');
      def(`<radialGradient id="${id}"><stop offset="0%" stop-color="${c2}" stop-opacity=".3"/>`
        + `<stop offset="100%" stop-color="${c2}" stop-opacity="0"/></radialGradient>`);
      return 'url(#' + id + ')';
    };
    out += `<ellipse cx="${n2(CX - hw * 0.58)}" cy="${n2(ey + 4.6)}" rx="4.4" ry="3.8" fill="${soft(SKIN.lit)}"/>`;
    out += `<ellipse cx="${n2(CX + hw * 0.66)}" cy="${n2(ey + 5)}" rx="4.2" ry="4.2" fill="${soft(SKIN.shade)}"/>`;
    // eyes — almond socket, iris, upper lid line, lashes at the outer corner
    for (const side of [-1, 1]) {
      const ex = CX + side * 5.9;
      out += `<path d="M ${n2(ex - 3.1)} ${n2(ey)} q 3.1 -2.8 6.2 0 q -3.1 2.6 -6.2 0 Z" fill="#f6f1e6"/>`;
      out += `<circle cx="${n2(ex + side * 0.25)}" cy="${n2(ey - 0.1)}" r="1.45" fill="#5b4126"/>`;
      out += `<circle cx="${n2(ex + side * 0.25)}" cy="${n2(ey - 0.1)}" r=".72" fill="#20160e"/>`;
      out += `<circle cx="${n2(ex + side * 0.25 - 0.5)}" cy="${n2(ey - 0.7)}" r=".42" fill="#fff" opacity=".9"/>`;
      out += `<path d="M ${n2(ex - 3.2)} ${n2(ey - 0.3)} q 3.2 -3 6.4 0" stroke="rgba(52,30,14,.75)" stroke-width=".85" fill="none" stroke-linecap="round"/>`;
      out += `<path d="M ${n2(ex - 3)} ${n2(ey + 0.8)} q 3 1.9 6 0" stroke="rgba(120,78,44,.4)" stroke-width=".6" fill="none"/>`;
      // brow
      out += `<path d="M ${n2(ex - side * 0.4 - 3.4)} ${n2(browY + (side < 0 ? 0.5 : 0.2))} q 3.4 -2.1 6.8 ${n2(side < 0 ? 0.3 : 0.6)}"`
        + ` stroke="${hc}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
    }
    // nose: bridge shadow, tip highlight, nostril wings
    out += `<path d="M ${n2(CX - 0.9)} ${n2(ey - 1)} L ${n2(CX - 1.5)} ${n2(noseY - 1)}" stroke="rgba(120,74,40,.3)" stroke-width="1.6" stroke-linecap="round"/>`;
    out += `<path d="M ${n2(CX - 2.1)} ${n2(noseY)} q 2.1 1.9 4.2 0" stroke="${SKIN.line}" stroke-width="1.05" fill="none" stroke-linecap="round"/>`;
    out += `<ellipse cx="${n2(CX + 0.2)}" cy="${n2(noseY - 1.2)}" rx="1.5" ry="1.1" fill="${SKIN.hi}" opacity=".5"/>`;
    // mouth: upper lip line, lower lip catch-light, corner shadows
    out += `<path d="M ${n2(CX - 3.6)} ${n2(mouthY)} q 1.8 -1 3.6 0 q 1.8 -1 3.6 0" stroke="rgba(112,58,44,.75)" stroke-width="1.05" fill="none" stroke-linecap="round"/>`;
    out += `<path d="M ${n2(CX - 3)} ${n2(mouthY + 0.7)} q 3 2 6 0" stroke="${g === 'f' ? 'rgba(178,92,86,.55)' : 'rgba(150,92,64,.4)'}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    // chin + jaw shadow
    out += `<path d="M ${n2(CX - 3)} ${n2(Y.chin - 0.6)} q 3 1.6 6 0" stroke="rgba(120,74,40,.15)" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    if (g === 'm') {
      const st = nid('sb');
      def(`<radialGradient id="${st}"><stop offset="55%" stop-color="rgba(42,26,14,.13)"/>`
        + `<stop offset="100%" stop-color="rgba(42,26,14,0)"/></radialGradient>`);
      out += `<ellipse cx="${n2(CX)}" cy="${n2(mouthY + 3)}" rx="${n2(hw * 0.72)}" ry="6.4" fill="url(#${st})"/>`;
    }
    return out;
  }
  function baseBody(g, cover, has) {
    has = has || {};
    const f = figOf(g), hw = f.head[0], hh = f.head[1];
    const sk = skinGrad();
    let out = '';
    // contact shadow on the ground, drawn first
    const gs = nid('gs');
    def(`<radialGradient id="${gs}"><stop offset="35%" stop-color="rgba(0,0,0,.34)"/>`
      + `<stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient>`);
    out += `<ellipse cx="${CX}" cy="${n2(Y.ground + 2)}" rx="${n2(f.hi + 10)}" ry="4.6" fill="url(#${gs})"/>`;
    // bare legs only show when nothing is worn on them: a tapered trouser is
    // narrower than the calf at the hem, and the skin used to poke out beside it
    if (!has.legs) out += legSkin(g);
    for (const side of [-1, 1]) {
      out += `<ellipse cx="${n2(CX + side * (f.sh - 2.6))}" cy="${n2(Y.sh + 8)}" rx="${n2(f.ar)}" ry="${n2(f.ar * 1.1)}" fill="${sk}"/>`;
      out += `<path d="${armPath(g, side, Y.wrist + 3)}" stroke="${sk}" stroke-width="${n2(f.ar * 2)}" stroke-linecap="round" fill="none"/>`;
    }
    out += `<path d="${torsoTop(g, {})}" fill="${sk}"/>`;
    // collar bones + sternum shading
    out += `<path d="M ${n2(CX - f.sh * 0.6)} ${n2(Y.sh + 5.6)} q ${n2(f.sh * 0.6)} 3.4 ${n2(f.sh * 1.2)} 0" stroke="rgba(120,74,40,.22)" stroke-width="1.4" fill="none"/>`;
    out += `<path d="M ${n2(CX)} ${n2(Y.sh + 8)} v ${n2(Y.chest - Y.sh)}" stroke="rgba(120,74,40,.16)" stroke-width="2"/>`;
    // neck (with the shadow the jaw casts on it)
    out += `<path d="M ${n2(CX - 5.8)} ${n2(Y.chin - 5)} h 11.6 v 12 q -5.8 3 -11.6 0 Z" fill="${SKIN.base}"/>`;
    out += `<path d="M ${n2(CX - 5.8)} ${n2(Y.chin - 4)} q 5.8 5.6 11.6 0 v 4 q -5.8 4 -11.6 0 Z" fill="rgba(90,52,26,.35)"/>`;
    // ears
    for (const side of [-1, 1]) {
      out += `<ellipse cx="${n2(CX + side * hw)}" cy="${n2(Y.head + 4.5)}" rx="2.9" ry="4.4" fill="${SKIN.base}" stroke="${SKIN.shade}" stroke-width=".55"/>`;
      out += `<path d="M ${n2(CX + side * hw)} ${n2(Y.head + 2.4)} q ${n2(side * -1.3)} 2.2 0 4.2" stroke="${SKIN.shade}" stroke-width=".6" fill="none" opacity=".8"/>`;
    }
    // skull
    out += `<path d="${headPath(g)}" fill="${skinGrad([CX - hw, Y.head - hh, CX + hw, Y.chin + 2])}"/>`;
    out += `<path d="${headPath(g)}" fill="none" stroke="rgba(90,52,26,.2)" stroke-width=".7"/>`;
    // forehead light
    out += `<ellipse cx="${n2(CX - 2)}" cy="${n2(Y.head - hh * 0.45)}" rx="${n2(hw * 0.46)}" ry="${n2(hh * 0.26)}" fill="${SKIN.hi}" opacity=".16"/>`;
    out += face(g);
    out += baseHair(g, cover);
    return out;
  }
  // cover: 0 = bare head, 1 = a hat covers the crown (only the hair below the
  // band shows), 2 = a full head covering (balaclava) hides the lot.
  function baseHair(g, cover) {
    if (cover === 2) return '';
    const f = figOf(g), hw = f.head[0], hh = f.head[1];
    const c = HAIRC[g] || HAIRC.m;
    const fill = hairGrad(c);
    const top = Y.head - hh;
    const hairline = Y.head - hh * 0.46;    // where the fringe meets the brow
    // The crown follows the skull from temple to temple, a touch proud of it,
    // then comes back across the forehead as a hairline with a swept fringe.
    const cap = `M ${n2(CX - hw - 0.8)} ${n2(Y.head + 2)}`
      + ` C ${n2(CX - hw - 2.2)} ${n2(top - hh * 0.62)} ${n2(CX + hw + 2.2)} ${n2(top - hh * 0.62)} ${n2(CX + hw + 0.8)} ${n2(Y.head + 2)}`
      + ` L ${n2(CX + hw - 1)} ${n2(Y.head - 1)}`
      + ` C ${n2(CX + hw - 1.6)} ${n2(hairline + 2)} ${n2(CX + hw * 0.5)} ${n2(hairline - 1.4)} ${n2(CX + 1)} ${n2(hairline)}`
      + ` C ${n2(CX - hw * 0.55)} ${n2(hairline + 1.6)} ${n2(CX - hw + 2)} ${n2(hairline + 1)} ${n2(CX - hw + 1)} ${n2(Y.head - 1)} Z`;
    const crown = `<path d="${cap}" fill="${fill}"/>`;
    // a swept fringe sitting on the hairline, heavier on the key-light side
    const fringe = `<path d="M ${n2(CX - hw + 1)} ${n2(hairline + 0.8)}`
      + ` C ${n2(CX - hw * 0.5)} ${n2(hairline + 3.6)} ${n2(CX + hw * 0.35)} ${n2(hairline + 2.6)} ${n2(CX + hw - 1.2)} ${n2(hairline - 1.2)}`
      + ` C ${n2(CX + hw * 0.4)} ${n2(hairline + 0.4)} ${n2(CX - hw * 0.4)} ${n2(hairline + 1)} ${n2(CX - hw + 1)} ${n2(hairline + 0.8)} Z" fill="${shade(c, -0.18)}" opacity=".85"/>`;
    const gloss = `<path d="M ${n2(CX - hw * 0.6)} ${n2(top - 0.4)} C ${n2(CX - hw * 0.15)} ${n2(top - 3.4)} ${n2(CX + hw * 0.4)} ${n2(top - 2.8)} ${n2(CX + hw * 0.72)} ${n2(top + 1)}"`
      + ` stroke="${shade(c, .42)}" stroke-width="2" fill="none" opacity=".32" stroke-linecap="round"/>`;
    const sideLock = (side, len) => `<path d="M ${n2(CX + side * (hw - 0.6))} ${n2(Y.head - 4)}`
      + ` C ${n2(CX + side * (hw + 3.2))} ${n2(Y.head + 8)} ${n2(CX + side * (hw + 2.8))} ${n2(Y.head + 18)} ${n2(CX + side * (hw + 1.2))} ${n2(Y.chin + len)}`
      + ` L ${n2(CX + side * (hw - 4.4))} ${n2(Y.chin + len - 5)}`
      + ` C ${n2(CX + side * (hw - 1))} ${n2(Y.head + 8)} ${n2(CX + side * (hw - 2.2))} ${n2(Y.head + 1)} ${n2(CX + side * (hw - 0.6))} ${n2(Y.head - 4)} Z" fill="${fill}"/>`;
    const locks = (f.hair === 'long') ? sideLock(-1, 17) + sideLock(1, 17)
      : (f.hair === 'mid') ? sideLock(-1, 5) + sideLock(1, 5) : '';
    // under a hat the crown is hidden: only what falls below the band shows, so
    // a beanie no longer has hair growing through it
    if (cover === 1) {
      const clip = nid('hc');
      def(`<clipPath id="${clip}"><rect x="0" y="${n2(Y.head + 1)}" width="120" height="${n2(Y.chin + 34 - Y.head)}"/></clipPath>`);
      return `<g clip-path="url(#${clip})">${locks}${crown}</g>`;
    }
    const gclip = nid('hg');
    def(`<clipPath id="${gclip}"><path d="${cap}"/></clipPath>`);
    return locks + crown + fringe + `<g clip-path="url(#${gclip})">${gloss}</g>`;
  }

  // ---------------------------------------------------------------- clothing art
  // Every style draws over the base body. Signature: (col, layer, g, u) -> svg.
  const P = { head: {}, eyes: {}, mouth: {}, neck: {}, torso: {}, hands: {}, legs: {}, feet: {} };

  // Shared garment scaffolding: body shell + hem shadow + a couple of fabric folds.
  function shell(c, g, o) {
    o = o || {};
    const d = torsoTop(g, o);
    let out = `<path d="${d}" fill="${cloth(c, o.soft == null ? 1 : o.soft)}"/>`;
    const clip = nid('gc');
    def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    const f = figOf(g), hi = f.hi + (o.grow || 0) * 0.75;
    let inner = '';
    // side core shadows so the garment reads as a cylinder, not a cut-out
    inner += `<path d="M ${n2(CX + hi - 3)} ${n2(Y.sh)} v ${n2(Y.hip - Y.sh + 8)}" stroke="${shade(c, -0.34)}" stroke-width="7" opacity=".38"/>`;
    inner += `<path d="M ${n2(CX - hi + 2)} ${n2(Y.sh)} v ${n2(Y.hip - Y.sh + 8)}" stroke="${shade(c, 0.22)}" stroke-width="4.4" opacity=".24"/>`;
    // hem shadow
    inner += `<rect x="0" y="${n2(Y.hip - 4)}" width="120" height="12" fill="${shade(c, -0.3)}" opacity=".3"/>`;
    if (o.folds !== false) {
      inner += `<path d="M ${n2(CX - 8)} ${n2(Y.waist - 8)} q 4 6 1 12" stroke="${shade(c, -0.22)}" stroke-width="1.1" fill="none" opacity=".45"/>`;
      inner += `<path d="M ${n2(CX + 7)} ${n2(Y.waist - 6)} q -3.4 6 -0.6 11" stroke="${shade(c, -0.22)}" stroke-width="1.1" fill="none" opacity=".4"/>`;
    }
    out += `<g clip-path="url(#${clip})">${inner}</g>`;
    return { out, clip, d };
  }

  // Compose a garment: SLEEVES FIRST, then the body shell over them, so the
  // deltoid tucks under the chest panel instead of ballooning out past the
  // shoulder line, then the trim on top.
  function dress(sleeveSvg, shellObj, trim) {
    return sleeveSvg + shellObj.out + (trim || '');
  }

  // ---- head
  // Head box: the user-space window every headwear gradient spans.
  const HB = [CX - 18, Y.head - 28, CX + 18, Y.chin];
  // Caps get a curved peak drawn as a filled crescent, plus a crown seam.
  function capArt(c, o) {
    o = o || {};
    const w = o.w || 15, crown = o.crown || 22, peakDrop = o.drop || 1.2;
    const y = Y.head - (o.sit || 6);
    // a six-panel dome: wide at the band, rounded over the crown
    let out = `<path d="M ${n2(CX - w)} ${n2(y)}`
      + ` C ${n2(CX - w - 0.4)} ${n2(Y.head - crown + 2)} ${n2(CX - w * 0.55)} ${n2(Y.head - crown)} ${n2(CX)} ${n2(Y.head - crown)}`
      + ` C ${n2(CX + w * 0.55)} ${n2(Y.head - crown)} ${n2(CX + w + 0.4)} ${n2(Y.head - crown + 2)} ${n2(CX + w)} ${n2(y)} Z" fill="${cloth(c, 1.1, HB)}"/>`;
    out += `<path d="M ${n2(CX - w + 1)} ${n2(y - 2)} C ${n2(CX - w * 0.5)} ${n2(Y.head - crown + 2)} ${n2(CX + w * 0.5)} ${n2(Y.head - crown + 2)} ${n2(CX + w - 1)} ${n2(y - 2)}" stroke="${shade(c, -0.28)}" stroke-width=".8" fill="none" opacity=".7"/>`;
    out += `<path d="M ${n2(CX)} ${n2(y - 1)} V ${n2(Y.head - crown + 3)}" stroke="${shade(c, -0.22)}" stroke-width=".8" opacity=".6"/>`;
    // peak: a long curved bill sweeping off to the right, with a dark underside
    const px = CX + w - 2, pt = y - 0.6, tipX = CX + w + 14, tipY = y + 2.4 + peakDrop;
    out += `<path d="M ${n2(px)} ${n2(pt)}`
      + ` C ${n2(CX + w + 7)} ${n2(pt - 0.6)} ${n2(tipX)} ${n2(pt + 1.2)} ${n2(tipX)} ${n2(tipY)}`
      + ` C ${n2(CX + w + 6)} ${n2(tipY + 2.6)} ${n2(CX + 8)} ${n2(y + 5)} ${n2(CX + 3)} ${n2(y + 4.2)}`
      + ` C ${n2(CX + 6)} ${n2(y + 3)} ${n2(CX + w - 7)} ${n2(pt + 1.4)} ${n2(px)} ${n2(pt)} Z" fill="${cloth(shade(c, -0.24), .8, HB)}"/>`;
    out += `<path d="M ${n2(px)} ${n2(pt)} C ${n2(CX + w + 7)} ${n2(pt - 0.6)} ${n2(tipX)} ${n2(pt + 1.2)} ${n2(tipX)} ${n2(tipY)}" stroke="${shade(c, 0.22)}" stroke-width=".9" fill="none" opacity=".65"/>`;
    // brow shadow the hat casts on the face
    out += `<path d="M ${n2(CX - w)} ${n2(y)} h ${n2(w * 2)} v 3 q ${n2(-w)} 2.4 ${n2(-w * 2)} 0 Z" fill="rgba(20,12,6,.3)"/>`;
    out += `<circle cx="${CX}" cy="${n2(Y.head - crown + 1)}" r="1.4" fill="${shade(c, .28)}"/>`;
    // sweatband at the brow
    out += `<path d="M ${n2(CX - w)} ${n2(y - 2)} h ${n2(w * 2)} v 2.4 q ${n2(-w)} 1.6 ${n2(-w * 2)} 0 Z" fill="${shade(c, -0.18)}"/>`;
    return out;
  }
  P.head.cap = (c) => capArt(c, { w: 15, crown: 24, sit: 9 });
  P.head.snapback = (c) => capArt(c, { w: 15, crown: 23, sit: 10, drop: 0.2 })
    + `<path d="M ${n2(CX - 15)} ${n2(Y.head - 9)} q 15 -2.6 30 0" stroke="${shade(c, -.32)}" stroke-width="1" fill="none"/>`
    + `<rect x="${n2(CX - 15)}" y="${n2(Y.head - 11)}" width="30" height="3.6" rx="1.8" fill="${shade(c, -0.14)}" opacity=".8"/>`;
  P.head.beanie = (c) => {
    const w = 14.4;
    const d = `M ${n2(CX - w)} ${n2(Y.head - 6)} C ${n2(CX - w - 1.4)} ${n2(Y.head - 27)} ${n2(CX + w + 1.4)} ${n2(Y.head - 27)} ${n2(CX + w)} ${n2(Y.head - 6)} Z`;
    const clip = nid('bn');
    def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    let out = `<path d="${d}" fill="${cloth(c, 1, HB)}"/>`;
    // the knit runs the height of the cap and is clipped to it, so no stitch
    // ever escapes above the crown
    let knit = '';
    for (let i = -4; i <= 4; i++) {
      knit += `<path d="M ${n2(CX + i * 3.6)} ${n2(Y.head - 28)} v 24" stroke="${shade(c, -0.14)}" stroke-width="1.3" opacity=".5"/>`;
      knit += `<path d="M ${n2(CX + i * 3.6 + 1.5)} ${n2(Y.head - 28)} v 24" stroke="${shade(c, 0.16)}" stroke-width=".8" opacity=".35"/>`;
    }
    out += `<g clip-path="url(#${clip})">${knit}</g>`;
    out += `<rect x="${n2(CX - w - 0.8)}" y="${n2(Y.head - 12)}" width="${n2(w * 2 + 1.6)}" height="6.6" rx="3.3" fill="${cloth(shade(c, -0.16), .8, HB)}"/>`;
    out += `<path d="M ${n2(CX - w - 0.8)} ${n2(Y.head - 6.4)} h ${n2(w * 2 + 1.6)}" stroke="rgba(20,12,6,.32)" stroke-width="1.6"/>`;
    return out;
  };
  P.head.bucket = (c) => {
    const w = 12.6;
    const lift = 2.6;
    return `<path d="M ${n2(CX - w)} ${n2(Y.head - 9)} C ${n2(CX - w - 0.8)} ${n2(Y.head - 23)} ${n2(CX + w + 0.8)} ${n2(Y.head - 23)} ${n2(CX + w)} ${n2(Y.head - 9)} Z" fill="${cloth(c, 1, HB)}"/>`
      + `<path d="M ${n2(CX - 22)} ${n2(Y.head - 8.4 - lift)} q 22 -5 44 0 q -6 4.2 -22 4.2 q -16 0 -22 -4.2 Z" fill="${cloth(shade(c, -0.12), .9, HB)}"/>`
      + `<path d="M ${n2(CX - 22)} ${n2(Y.head - 8.4 - lift)} q 22 4 44 0" stroke="${shade(c, -0.34)}" stroke-width=".8" fill="none" opacity=".6"/>`
      + `<path d="M ${n2(CX - w)} ${n2(Y.head - 16)} q ${n2(w)} -3.4 ${n2(w * 2)} 0" stroke="${shade(c, .18)}" stroke-width="1.6" fill="none"/>`
      + `<path d="M ${n2(CX - 13)} ${n2(Y.head - 8 - lift)} h 26 v 3 q -13 2.4 -26 0 Z" fill="rgba(20,12,6,.3)"/>`;
  };
  P.head.durag = (c) => {
    const w = 14.2, y = Y.head - 4.5;
    // tails first, behind the wrap, so they read as fabric falling away
    let out = `<path d="M ${n2(CX + 8)} ${n2(Y.head - 14)} C ${n2(CX + 22)} ${n2(Y.head - 8)} ${n2(CX + 25)} ${n2(Y.head + 6)} ${n2(CX + 22)} ${n2(Y.head + 12)}`
      + ` C ${n2(CX + 17)} ${n2(Y.head + 6)} ${n2(CX + 12)} ${n2(Y.head - 4)} ${n2(CX + 8)} ${n2(Y.head - 14)} Z" fill="${shade(c, -.3)}"/>`;
    out += `<path d="M ${n2(CX - 8)} ${n2(Y.head - 14)} C ${n2(CX - 20)} ${n2(Y.head - 8)} ${n2(CX - 22)} ${n2(Y.head + 4)} ${n2(CX - 20)} ${n2(Y.head + 9)}`
      + ` C ${n2(CX - 15)} ${n2(Y.head + 4)} ${n2(CX - 11)} ${n2(Y.head - 5)} ${n2(CX - 8)} ${n2(Y.head - 14)} Z" fill="${shade(c, -.4)}"/>`;
    out += `<path d="M ${n2(CX - w)} ${n2(y)}`
      + ` C ${n2(CX - w - 0.6)} ${n2(Y.head - 24)} ${n2(CX + w + 0.6)} ${n2(Y.head - 24)} ${n2(CX + w)} ${n2(y)}`
      + ` q ${n2(-w)} 3 ${n2(-w * 2)} 0 Z" fill="${cloth(c, 1.1, HB)}"/>`;
    // the seam over the crown and the band across the brow
    out += `<path d="M ${n2(CX)} ${n2(y - 3)} V ${n2(Y.head - 20)}" stroke="${shade(c, -0.24)}" stroke-width=".8" opacity=".6"/>`;
    out += `<path d="M ${n2(CX - w)} ${n2(y - 1.6)} q ${n2(w)} 3.4 ${n2(w * 2)} 0 v 2.6 q ${n2(-w)} 2.6 ${n2(-w * 2)} 0 Z" fill="${shade(c, -0.22)}"/>`;
    out += `<path d="M ${n2(CX - 8)} ${n2(Y.head - 19)} q 8 -3.2 16 0" stroke="${shade(c, .3)}" stroke-width="1.2" fill="none" opacity=".5"/>`;
    return out;
  };

  // ---- eyes
  P.eyes.shades = (c) => {
    const lens = nid('lens');
    def(`<linearGradient id="${lens}" x1="0" y1="0" x2="0.6" y2="1">`
      + `<stop offset="0%" stop-color="${shade(c, 0.36)}"/><stop offset="42%" stop-color="${c}"/>`
      + `<stop offset="100%" stop-color="${shade(c, -0.3)}"/></linearGradient>`);
    const y = Y.head - 2.4;
    return `<path d="M ${n2(CX - 13.6)} ${n2(y)} h 27.2 v 3.4 q 0 5.4 -5.8 5.4 h -3.2 q -3.4 0 -4.6 -3.6 q -1.2 3.6 -4.6 3.6 h -3.2 q -5.8 0 -5.8 -5.4 Z" fill="url(#${lens})" stroke="rgba(0,0,0,.5)" stroke-width=".7"/>`
      + `<path d="M ${n2(CX - 13.6)} ${n2(y + 0.9)} h 27.2" stroke="${shade(c, .45)}" stroke-width=".9" opacity=".6"/>`
      + `<path d="M ${n2(CX - 11.4)} ${n2(y + 2.4)} l 4 4.6" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-linecap="round"/>`
      + `<path d="M ${n2(CX + 3.2)} ${n2(y + 2.4)} l 4 4.6" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linecap="round"/>`
      + `<path d="M ${n2(CX - 13.6)} ${n2(y + 1)} l -2.6 -1.4 M ${n2(CX + 13.6)} ${n2(y + 1)} l 2.6 -1.4" stroke="${shade(c, -.2)}" stroke-width="1.3"/>`;
  };
  P.eyes.specs = (c) => {
    // round wire frames, one per eye, sitting on the eye line
    const ey = Y.head + 1.2, r = 4.3, dx = 6.1;
    let out = '';
    for (const side of [-1, 1]) {
      const x = CX + side * dx;
      out += `<circle cx="${n2(x)}" cy="${n2(ey)}" r="${r}" fill="rgba(206,228,242,.16)" stroke="${c}" stroke-width="1.15"/>`;
      out += `<path d="M ${n2(x - 2.6)} ${n2(ey - 2.2)} l 2.4 2.2" stroke="rgba(255,255,255,.45)" stroke-width="1" stroke-linecap="round"/>`;
      out += `<path d="M ${n2(x + side * r)} ${n2(ey - 1)} l ${n2(side * 3.6)} -1.5" stroke="${c}" stroke-width="1" stroke-linecap="round"/>`;
    }
    out += `<path d="M ${n2(CX - dx + r)} ${n2(ey - 0.4)} h ${n2((dx - r) * 2)}" stroke="${c}" stroke-width="1.1"/>`;
    return out;
  };

  // ---- mouth / face coverings
  P.mouth.bandana = (c) => `<path d="M ${n2(CX - 13.6)} ${n2(Y.head + 7.4)} q 13.6 -3.4 27.2 0 q 0.6 8 -13.6 11.4 q -14.2 -3.4 -13.6 -11.4 Z" fill="${cloth(c, 1, HB)}"/>`
    + `<path d="M ${n2(CX - 13.6)} ${n2(Y.head + 7.4)} q -4.2 -0.4 -6 2.6 q 4.2 2.2 6 2.4 Z" fill="${shade(c, -.26)}"/>`
    + `<path d="M ${n2(CX - 11)} ${n2(Y.head + 10.4)} q 11 3.4 22 0" stroke="${shade(c, .22)}" stroke-width=".9" fill="none" opacity=".7"/>`
    + `<path d="M ${n2(CX - 5)} ${n2(Y.head + 9)} q 2 6 0 9 M ${n2(CX + 5)} ${n2(Y.head + 9)} q -2 6 0 9" stroke="${shade(c, -.24)}" stroke-width=".9" fill="none" opacity=".6"/>`;
  P.mouth.balaclava = (c) => {
    const f = { hw: 16 };
    return `<path d="M ${n2(CX - f.hw)} ${n2(Y.head - 2)} C ${n2(CX - f.hw)} ${n2(Y.head - 27)} ${n2(CX + f.hw)} ${n2(Y.head - 27)} ${n2(CX + f.hw)} ${n2(Y.head - 2)}`
      + ` C ${n2(CX + f.hw)} ${n2(Y.jaw + 3)} ${n2(CX - f.hw)} ${n2(Y.jaw + 3)} ${n2(CX - f.hw)} ${n2(Y.head - 2)} Z" fill="${cloth(c, 1.1, HB)}"/>`
      + `<path d="M ${n2(CX - 10.2)} ${n2(Y.head - 2.8)} q 10.2 -3 20.4 0 q 0.6 5.4 -10.2 6.4 q -10.8 -1 -10.2 -6.4 Z" fill="#0f1114"/>`
      + `<circle cx="${n2(CX - 5.6)}" cy="${n2(Y.head + 0.4)}" r="1.5" fill="#d9cdbb" opacity=".85"/>`
      + `<circle cx="${n2(CX + 5.6)}" cy="${n2(Y.head + 0.4)}" r="1.5" fill="#d9cdbb" opacity=".85"/>`
      + `<path d="M ${n2(CX - 10.2)} ${n2(Y.head - 2.6)} q 10.2 -2.6 20.4 0" stroke="${shade(c, .38)}" stroke-width=".8" fill="none" opacity=".6"/>`
      + `<path d="M ${n2(CX - f.hw + 1)} ${n2(Y.head + 8)} q ${n2(f.hw - 1)} -2.6 ${n2((f.hw - 1) * 2)} 0" stroke="${shade(c, -.3)}" stroke-width="1" fill="none" opacity=".6"/>`;
  };
  P.mouth.resp = (c) => `<path d="M ${n2(CX - 11.8)} ${n2(Y.head + 5.4)} q 11.8 -3.4 23.6 0 q 2 10.4 -11.8 12.6 q -13.8 -2.2 -11.8 -12.6 Z" fill="${cloth(c, 1, HB)}"/>`
    + `<circle cx="${n2(CX - 7.2)}" cy="${n2(Y.head + 11.2)}" r="3.2" fill="${shade(c, -.34)}"/><circle cx="${n2(CX - 7.2)}" cy="${n2(Y.head + 11.2)}" r="1.6" fill="${shade(c, -.12)}"/>`
    + `<circle cx="${n2(CX + 7.2)}" cy="${n2(Y.head + 11.2)}" r="3.2" fill="${shade(c, -.34)}"/><circle cx="${n2(CX + 7.2)}" cy="${n2(Y.head + 11.2)}" r="1.6" fill="${shade(c, -.12)}"/>`
    + `<path d="M ${n2(CX - 11.8)} ${n2(Y.head + 6.4)} l -4.6 -2 M ${n2(CX + 11.8)} ${n2(Y.head + 6.4)} l 4.6 -2" stroke="${shade(c, -.26)}" stroke-width="1.8" stroke-linecap="round"/>`
    + `<path d="M ${n2(CX - 8)} ${n2(Y.head + 6.6)} q 8 -2.2 16 0" stroke="${shade(c, .26)}" stroke-width="1" fill="none" opacity=".6"/>`;
  P.mouth.plain = null;

  // ---- neck
  P.neck.chain = (c) => {
    const m = sheen(c, [CX - 10, Y.chin, CX + 10, Y.chin + 14]);
    let links = '';
    for (let i = -4; i <= 4; i++) {
      const t = i / 4;
      const x = CX + t * 8.6, y = Y.chin + 1 + (1 - t * t) * 6.4;
      links += `<circle cx="${n2(x)}" cy="${n2(y)}" r="1.15" fill="${m}" stroke="${shade(c, -.38)}" stroke-width=".3"/>`;
    }
    return links
      + `<circle cx="${CX}" cy="${n2(Y.chin + 10.4)}" r="3.2" fill="${m}" stroke="${shade(c, -.4)}" stroke-width=".6"/>`
      + `<circle cx="${n2(CX - 0.9)}" cy="${n2(Y.chin + 9.5)}" r="1" fill="${shade(c, .55)}" opacity=".9"/>`;
  };
  P.neck.scarf = (c) => `<path d="M ${n2(CX - 10)} ${n2(Y.chin - 1)} q 10 8.4 20 0 q 1.2 6.4 -0.6 9.2 q -9.4 5.6 -18.8 0 q -1.8 -2.8 -0.6 -9.2 Z" fill="${cloth(c, 1, HB)}"/>`
    + `<path d="M ${n2(CX + 5.4)} ${n2(Y.chin + 7)} q 3.4 9 4.6 19 l -6 1 q -2 -9.6 -3.2 -18.4 Z" fill="${cloth(shade(c, -0.1), .9, HB)}"/>`
    + `<path d="M ${n2(CX - 10)} ${n2(Y.chin + 6.6)} q 10 4.4 20 0" stroke="${shade(c, .26)}" stroke-width="1.3" fill="none" opacity=".8"/>`
    + [0, 1, 2].map(i => `<path d="M ${n2(CX - 8 + i * 6)} ${n2(Y.chin + 2)} q 1.4 4 0 6.4" stroke="${shade(c, -.26)}" stroke-width=".8" fill="none" opacity=".5"/>`).join('');

  // ---- torso
  P.torso.tee = (c, l, g) => {
    const s = shell(c, g, { grow: 0.8, dip: 5, soft: 0.8 });
    return dress(sleeves(c, g, 'short', 0.6), s)
      + `<path d="M ${n2(CX - 5)} ${n2(Y.sh + 4)} q 5 4.4 10 0" stroke="${shade(c, -0.22)}" stroke-width="1.6" fill="none"/>`;
  };
  P.torso.stripe = (c, l, g) => {
    const s = shell(c, g, { grow: 0.8, dip: 5, soft: 0.8 });
    let stripes = '';
    for (let y = Y.sh - 2; y < Y.hip + 6; y += 7.6) stripes += `<rect x="20" y="${n2(y)}" width="80" height="3.4" fill="${shade(c, -.55)}" opacity=".9"/>`;
    return dress(sleeves(c, g, 'short', 0.6), s, `<g clip-path="url(#${s.clip})">${stripes}</g>`);
  };
  P.torso.turtleneck = (c, l, g) => {
    const s = shell(c, g, { grow: 1.2, dip: 1, soft: 0.9 });
    let rib = '';
    for (let i = 0; i < 6; i++) rib += `<path d="M ${n2(CX - 7.4 + i * 3)} ${n2(Y.chin - 5)} v 12" stroke="${shade(c, -.16)}" stroke-width=".8" opacity=".6"/>`;
    return dress(sleeves(c, g, 'long', 1.4), s)
      + `<path d="M ${n2(CX - 7.6)} ${n2(Y.chin - 5.5)} h 15.2 v 11.5 q -7.6 3.6 -15.2 0 Z" fill="${cloth(shade(c, .08), .7, HB)}"/>` + rib;
  };
  P.torso.shirt = (c, l, g) => {
    const s = shell(c, g, { grow: 1.5, dip: 4 });
    return dress(sleeves(c, g, 'long', 1.6, { cuff: true }), s)
      // open collar: two lapels meeting at the throat
      + `<path d="M ${n2(CX - 5.6)} ${n2(Y.sh + 1.4)} l 6 7.4 l -3.6 2.4 l -4.8 -7 Z" fill="${shade(c, -.16)}"/>`
      + `<path d="M ${n2(CX + 5.6)} ${n2(Y.sh + 1.4)} l -6 7.4 l 3.6 2.4 l 4.8 -7 Z" fill="${shade(c, .14)}"/>`
      + `<path d="M ${n2(CX)} ${n2(Y.sh + 9)} v ${n2(Y.hip - Y.sh - 11)}" stroke="${shade(c, -.24)}" stroke-width="1.2"/>`
      + `<path d="M ${n2(CX + 1.6)} ${n2(Y.sh + 9)} v ${n2(Y.hip - Y.sh - 11)}" stroke="${shade(c, .18)}" stroke-width=".8" opacity=".7"/>`
      + [0, 1, 2, 3].map(i => `<circle cx="${CX}" cy="${n2(Y.chest + i * 12)}" r="1.05" fill="${shade(c, -.45)}"/>`).join('')
      + `<rect x="${n2(CX + 4)}" y="${n2(Y.chest - 4)}" width="7.6" height="6.4" rx=".8" fill="none" stroke="${shade(c, -.2)}" stroke-width=".7" opacity=".7"/>`;
  };
  P.torso.jumper = (c, l, g) => {
    const s = shell(c, g, { grow: 2.2, dip: 3.4 });
    return dress(sleeves(c, g, 'long', 1.9, { cuff: true }), s)
      + `<path d="M ${n2(CX - 7.6)} ${n2(Y.sh + 0.6)} q 7.6 6 15.2 0 q 1 -3.8 -1.8 -3.8 q -5.6 4.2 -11.6 0 q -2.8 0 -1.8 3.8 Z" fill="${cloth(shade(c, .12), .6)}"/>`
      + [0, 1, 2, 3].map(i => `<path d="M ${n2(CX - 12)} ${n2(Y.chest + i * 11)} q 12 3 24 0" stroke="${shade(c, .14)}" stroke-width="1" fill="none" opacity=".55"/>`).join('')
      + [0, 1, 2, 3, 4].map(i => `<path d="M ${n2(CX - 12 + i * 6)} ${n2(Y.sh + 12)} v ${n2(Y.hip - Y.sh - 14)}" stroke="${shade(c, -.12)}" stroke-width=".7" opacity=".4"/>`).join('')
      + `<path d="M ${n2(CX - 14)} ${n2(Y.hip - 2)} q 14 3.4 28 0" stroke="${shade(c, .16)}" stroke-width="1.6" fill="none" opacity=".7"/>`;
  };
  P.torso.hoodie = (c, l, g) => {
    const s = shell(c, g, { grow: 2.6, dip: 3.6 });
    const f = figOf(g);
    return dress(sleeves(c, g, 'long', 2.1, { cuff: true }), s)
      // hood bunched behind the neck
      + `<path d="M ${n2(CX - 13)} ${n2(Y.sh + 2)} q 1.6 -12 13 -12 q 11.4 0 13 12 q -4.4 5.4 -13 5.4 q -8.6 0 -13 -5.4 Z" fill="${cloth(shade(c, -.14), .8)}"/>`
      + `<path d="M ${n2(CX - 11)} ${n2(Y.sh + 1)} q 11 5.4 22 0" stroke="${shade(c, -.32)}" stroke-width="1.4" fill="none" opacity=".8"/>`
      // kangaroo pocket
      + `<path d="M ${n2(CX - 9)} ${n2(Y.waist + 1)} h 18 l -2.8 12 h -12.4 Z" fill="${shade(c, -.1)}" stroke="${shade(c, -.3)}" stroke-width=".8"/>`
      // drawstrings
      + `<path d="M ${n2(CX - 4.6)} ${n2(Y.sh + 7)} q -1.4 7 -0.6 13" stroke="${shade(c, .4)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      + `<path d="M ${n2(CX + 4.6)} ${n2(Y.sh + 7)} q 1.4 7 0.6 13" stroke="${shade(c, .4)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      + `<circle cx="${n2(CX - 5.2)}" cy="${n2(Y.sh + 20)}" r="1.2" fill="${shade(c, .5)}"/><circle cx="${n2(CX + 5.2)}" cy="${n2(Y.sh + 20)}" r="1.2" fill="${shade(c, .5)}"/>`;
  };
  P.torso.jacket = (c, l, g) => {
    const s = shell(c, g, { grow: 2.8, dip: 3.6 });
    return dress(sleeves(c, g, 'long', 2.3, { cuff: true }), s)
      // wide lapels
      + `<path d="M ${n2(CX - 7.4)} ${n2(Y.sh + 0.6)} L ${n2(CX - 0.6)} ${n2(Y.chest + 16)} L ${n2(CX - 0.6)} ${n2(Y.chest + 4)} L ${n2(CX - 4.6)} ${n2(Y.sh - 0.6)} Z" fill="${shade(c, .22)}"/>`
      + `<path d="M ${n2(CX + 7.4)} ${n2(Y.sh + 0.6)} L ${n2(CX + 0.6)} ${n2(Y.chest + 16)} L ${n2(CX + 0.6)} ${n2(Y.chest + 4)} L ${n2(CX + 4.6)} ${n2(Y.sh - 0.6)} Z" fill="${shade(c, .1)}"/>`
      + `<path d="M ${n2(CX)} ${n2(Y.chest + 6)} v ${n2(Y.hip - Y.chest - 4)}" stroke="${shade(c, -.36)}" stroke-width="1.2"/>`
      + `<path d="M ${n2(CX - 10)} ${n2(Y.sh - 0.4)} q 10 6.8 20 0 l 1.8 3.4 q -11.8 7.2 -23.6 0 Z" fill="${shade(c, -.26)}"/>`
      + `<path d="M ${n2(CX - 13)} ${n2(Y.waist + 6)} h 8 M ${n2(CX + 5)} ${n2(Y.waist + 6)} h 8" stroke="${shade(c, -.34)}" stroke-width="1.6" opacity=".8"/>`;
  };
  P.torso.bomber = (c, l, g) => {
    const s = shell(c, g, { grow: 3, dip: 3.4, hip: -6 });
    return dress(sleeves(c, g, 'long', 2.5, { cuff: true }), s)
      + `<path d="M ${n2(CX - 8.6)} ${n2(Y.sh)} q 8.6 5.6 17.2 0 l 1.8 3.8 q -10.4 6.6 -20.8 0 Z" fill="${cloth(shade(c, .2), .6)}"/>`
      + `<rect x="${n2(CX - figOf(g).hi - 2.6)}" y="${n2(Y.hip - 6)}" width="${n2((figOf(g).hi + 2.6) * 2)}" height="7" rx="3" fill="${cloth(shade(c, .12), .7)}"/>`
      + [0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M ${n2(CX - 15 + i * 5)} ${n2(Y.hip - 5.4)} v 6" stroke="${shade(c, -.2)}" stroke-width=".8" opacity=".55"/>`).join('')
      + `<path d="M ${n2(CX)} ${n2(Y.sh + 4)} v ${n2(Y.hip - Y.sh - 10)}" stroke="${shade(c, -.3)}" stroke-width="1.1"/>`
      + `<path d="M ${n2(CX - 10.6)} ${n2(Y.chest + 12)} h 7 M ${n2(CX + 3.6)} ${n2(Y.chest + 12)} h 7" stroke="${shade(c, -.26)}" stroke-width="1" opacity=".8"/>`;
  };
  P.torso.puffer = (c, l, g) => {
    const s = shell(c, g, { grow: 4, dip: 3.2, folds: false });
    let baffles = '';
    for (let i = 0; i < 5; i++) {
      const y = Y.sh + 6 + i * 12;
      baffles += `<path d="M 18 ${n2(y)} q 42 5.2 84 0" stroke="${shade(c, -.3)}" stroke-width="1.6" fill="none" opacity=".9"/>`;
      baffles += `<path d="M 18 ${n2(y + 3)} q 42 5 84 0" stroke="${shade(c, .2)}" stroke-width="2.2" fill="none" opacity=".35"/>`;
    }
    return dress(sleeves(c, g, 'long', 3.1, { cuff: true }), s, `<g clip-path="url(#${s.clip})">${baffles}</g>`)
      + `<path d="M ${n2(CX - 8.4)} ${n2(Y.sh)} q 8.4 5.6 16.8 0 l 1.6 3.8 q -10 6.4 -20 0 Z" fill="${cloth(shade(c, .2), .6)}"/>`
      + `<path d="M ${n2(CX)} ${n2(Y.sh + 4)} v ${n2(Y.hip - Y.sh - 2)}" stroke="${shade(c, -.36)}" stroke-width="1.2"/>`;
  };
  P.torso.coat = (c, l, g) => {
    const f = figOf(g);
    const hem = Y.knee + 4;
    const d = `M ${n2(CX - f.sh - 3.4)} ${n2(Y.sh - 1)} C ${n2(CX - f.sh - 5)} ${n2(Y.chest + 6)} ${n2(CX - f.hi - 3)} ${n2(Y.waist + 10)} ${n2(CX - f.hi - 3.4)} ${n2(hem)}`
      + ` L ${n2(CX + f.hi + 3.4)} ${n2(hem)} C ${n2(CX + f.hi + 3)} ${n2(Y.waist + 10)} ${n2(CX + f.sh + 5)} ${n2(Y.chest + 6)} ${n2(CX + f.sh + 3.4)} ${n2(Y.sh - 1)}`
      + ` C ${n2(CX + f.sh - 4)} ${n2(Y.sh - 5)} ${n2(CX + 6)} ${n2(Y.sh - 3)} ${n2(CX + 3)} ${n2(Y.sh + 4)} Q ${n2(CX)} ${n2(Y.sh + 8)} ${n2(CX - 3)} ${n2(Y.sh + 4)}`
      + ` C ${n2(CX - 6)} ${n2(Y.sh - 3)} ${n2(CX - f.sh + 4)} ${n2(Y.sh - 5)} ${n2(CX - f.sh - 3.4)} ${n2(Y.sh - 1)} Z`;
    const clip = nid('ct');
    def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    let inner = `<path d="M ${n2(CX + f.hi - 1)} ${n2(Y.sh)} v ${n2(hem - Y.sh)}" stroke="${shade(c, -.34)}" stroke-width="8" opacity=".35"/>`
      + `<path d="M ${n2(CX - f.hi + 1)} ${n2(Y.sh)} v ${n2(hem - Y.sh)}" stroke="${shade(c, .22)}" stroke-width="5" opacity=".22"/>`
      + `<path d="M ${n2(CX - 8)} ${n2(Y.waist + 14)} q 3 16 1 26" stroke="${shade(c, -.24)}" stroke-width="1.4" fill="none" opacity=".5"/>`
      + `<path d="M ${n2(CX + 9)} ${n2(Y.waist + 14)} q -3 16 -1 26" stroke="${shade(c, -.24)}" stroke-width="1.4" fill="none" opacity=".45"/>`;
    return sleeves(c, g, 'long', 2.7)
      + `<path d="${d}" fill="${cloth(c, 1, [CX - f.hi - 6, Y.sh, CX + f.hi + 6, hem])}"/><g clip-path="url(#${clip})">${inner}</g>`
      // storm-flap lapels + double-breasted line
      + `<path d="M ${n2(CX - 7)} ${n2(Y.sh)} L ${n2(CX - 0.8)} ${n2(Y.chest + 12)} L ${n2(CX - 0.8)} ${n2(Y.chest)} L ${n2(CX - 4)} ${n2(Y.sh - 1.4)} Z" fill="${shade(c, .2)}"/>`
      + `<path d="M ${n2(CX + 7)} ${n2(Y.sh)} L ${n2(CX + 0.8)} ${n2(Y.chest + 12)} L ${n2(CX + 0.8)} ${n2(Y.chest)} L ${n2(CX + 4)} ${n2(Y.sh - 1.4)} Z" fill="${shade(c, .08)}"/>`
      + `<path d="M ${n2(CX)} ${n2(Y.chest + 4)} L ${n2(CX)} ${n2(hem - 6)}" stroke="${shade(c, -.34)}" stroke-width="1.2" opacity=".8"/>`
      // belt
      + `<rect x="${n2(CX - f.hi - 3.4)}" y="${n2(Y.waist + 8)}" width="${n2((f.hi + 3.4) * 2)}" height="6" fill="${cloth(shade(c, -.4), .7)}"/>`
      + `<rect x="${n2(CX - 3.4)}" y="${n2(Y.waist + 7.4)}" width="6.8" height="7.2" rx="1.2" fill="${sheen('#b9a26a', [CX - 4, Y.waist + 7, CX + 4, Y.waist + 15])}"/>`
      + `<path d="M ${n2(CX - f.hi - 3.4)} ${n2(hem - 3)} q ${n2(f.hi + 3.4)} 3.6 ${n2((f.hi + 3.4) * 2)} 0" stroke="${INK}" stroke-width=".9" fill="none" opacity=".5"/>`;
  };
  P.torso.vest = (c, l, g) => {
    const s = shell(c, g, { grow: 1.4, dip: 6, soft: .9 });
    return s.out
      + `<rect x="${n2(CX - 8.4)}" y="${n2(Y.chest - 9)}" width="16.8" height="20" rx="2" fill="${cloth(shade(c, .14), .6)}" stroke="${shade(c, -.3)}" stroke-width=".7"/>`
      + `<rect x="${n2(CX - 8.4)}" y="${n2(Y.chest + 15)}" width="16.8" height="15" rx="2" fill="${cloth(shade(c, .06), .6)}" stroke="${shade(c, -.3)}" stroke-width=".7"/>`
      + `<path d="M ${n2(CX - 9)} ${n2(Y.sh + 2)} q 9 4.4 18 0" stroke="${shade(c, -.34)}" stroke-width="1.8" fill="none"/>`
      + `<path d="M ${n2(CX - 13)} ${n2(Y.chest - 12)} h 26" stroke="${shade(c, -.24)}" stroke-width="1" opacity=".7"/>`;
  };
  P.torso.plate = (c, l, g) => {
    const s = shell(c, g, { grow: 1.6, dip: 6, soft: .7 });
    const m = sheen(c, [CX - 13, Y.chest - 14, CX + 13, Y.hip]);
    return s.out
      + `<path d="M ${n2(CX - 11.4)} ${n2(Y.chest - 12)} h 22.8 v 20 q 0 4 -11.4 6 q -11.4 -2 -11.4 -6 Z" fill="${m}" stroke="${shade(c, -.4)}" stroke-width=".8"/>`
      + `<path d="M ${n2(CX - 11)} ${n2(Y.chest + 15)} h 22 v 15 q 0 3 -11 4.4 q -11 -1.4 -11 -4.4 Z" fill="${m}" stroke="${shade(c, -.4)}" stroke-width=".8"/>`
      + `<path d="M ${n2(CX - 11)} ${n2(Y.sh + 4)} h 22" stroke="${shade(c, -.4)}" stroke-width="2"/>`
      + `<path d="M ${n2(CX - 9)} ${n2(Y.chest - 9)} l 3 18" stroke="rgba(255,255,255,.28)" stroke-width="1.4"/>`
      + [0, 1, 2, 3].map(i => `<circle cx="${n2(CX - 9 + i * 6)}" cy="${n2(Y.chest - 9.6)}" r=".9" fill="${shade(c, .45)}"/>`).join('');
  };
  P.torso.riot = (c, l, g) => {
    const s = shell(c, g, { grow: 2.2, dip: 6, soft: .7 });
    const m = sheen(c, [CX - 14, Y.chest - 16, CX + 14, Y.hip]);
    return s.out
      + `<path d="M ${n2(CX - 12)} ${n2(Y.chest - 14)} h 24 v 34 q 0 4 -12 5.6 q -12 -1.6 -12 -5.6 Z" fill="${m}" stroke="${shade(c, -.44)}" stroke-width="1"/>`
      + [0, 1, 2].map(i => `<path d="M ${n2(CX - 12)} ${n2(Y.chest - 3 + i * 11)} h 24" stroke="${shade(c, -.36)}" stroke-width="1.3"/>`).join('')
      + `<path d="M ${n2(CX - 14.6)} ${n2(Y.chest - 16)} q 14.6 -6.4 29.2 0 l -1.6 5 q -13 -5 -26 0 Z" fill="${cloth(shade(c, .18), .6)}"/>`
      + `<path d="M ${n2(CX - 12)} ${n2(Y.sh + 2)} q 12 4.4 24 0" stroke="${shade(c, -.42)}" stroke-width="2.2" fill="none"/>`
      + `<path d="M ${n2(CX - 9)} ${n2(Y.chest - 11)} l 3.4 30" stroke="rgba(255,255,255,.2)" stroke-width="1.6"/>`;
  };

  // ---- hands
  function handCenter(g, side) { const f = figOf(g); return CX + side * (f.sh - 0.2); }
  P.hands.gloves = (c, l, g) => {
    const f = figOf(g);
    return [-1, 1].map(side => {
      const x = handCenter(g, side);
      // only the hand and a short cuff: a glove that repainted the whole arm
      // used to black out the sleeve of whatever the citizen had on
      return `<path d="M ${n2(x - 3.8)} ${n2(Y.wrist + 1)} q 3.8 -2 7.6 0 q 1.2 6 -3.8 8.4 q -5 -2.4 -3.8 -8.4 Z" fill="${cloth(c, 1, [x - 5, Y.wrist - 1, x + 5, Y.wrist + 10])}" stroke="${shade(c, -.36)}" stroke-width=".5"/>`
        + `<path d="M ${n2(x - 2)} ${n2(Y.wrist + 4.6)} v 4 M ${n2(x + 0.6)} ${n2(Y.wrist + 4.8)} v 3.8" stroke="${shade(c, -.32)}" stroke-width=".6"/>`
        + `<rect x="${n2(x - 4.4)}" y="${n2(Y.wrist - 2.6)}" width="8.8" height="3.4" rx="1.6" fill="${shade(c, -.24)}"/>`;
    }).join('');
  };
  P.hands.wraps = (c, l, g) => [-1, 1].map(side => {
    const x = handCenter(g, side);
    return `<path d="M ${n2(x - 3.8)} ${n2(Y.wrist + 0.6)} q 3.8 -2 7.6 0 q 1.2 6 -3.8 8.4 q -5 -2.4 -3.8 -8.4 Z" fill="${cloth(c, .7, [x - 5, Y.wrist - 1, x + 5, Y.wrist + 10])}"/>`
      + [0, 1, 2, 3].map(i => `<path d="M ${n2(x - 4)} ${n2(Y.wrist - 1.4 + i * 2.5)} q 4 1.4 8 0" stroke="${shade(c, -.3)}" stroke-width=".85" fill="none"/>`).join('')
      + `<path d="M ${n2(x + 2.2)} ${n2(Y.wrist + 6.4)} l 2.6 1.4" stroke="${shade(c, -.2)}" stroke-width="1" stroke-linecap="round"/>`;
  }).join('');

  // ---- legs
  function legsArt(c, g, o) {
    o = o || {};
    const f = figOf(g);
    const w = o.w == null ? 1.4 : o.w;
    const fill = cloth(c, o.soft == null ? 1 : o.soft, [CX - f.hi - 4, Y.waist - 10, CX + f.hi + 4, Y.ankle + 4]);
    const waistY = Y.waist - 8;
    const hemY = Y.ankle + (o.break ? 2 : 0);
    const half = (f.le * 2 + w) / 2;
    const taper = o.taper || 0;
    const crotch = Y.hip + 8;                 // where the two legs part
    // ONE closed trouser outline — seat, both legs and the crotch V. Drawing
    // the legs as two separate strokes used to leave a gap at the centre line
    // that the bare skin (and its shadows) showed through.
    const xoL = CX - f.off, xoR = CX + f.off;
    const d = `M ${n2(CX - f.wa - 0.6)} ${n2(waistY)}`
      + ` L ${n2(xoL - half)} ${n2(Y.hip - 2)}`
      + ` L ${n2(xoL - taper - half)} ${n2(hemY)} L ${n2(xoL - taper + half)} ${n2(hemY)}`
      + ` L ${n2(CX - 0.9)} ${n2(crotch)} L ${n2(CX + 0.9)} ${n2(crotch)}`
      + ` L ${n2(xoR + taper - half)} ${n2(hemY)} L ${n2(xoR + taper + half)} ${n2(hemY)}`
      + ` L ${n2(xoR + half)} ${n2(Y.hip - 2)}`
      + ` L ${n2(CX + f.wa + 0.6)} ${n2(waistY)} Z`;
    const clip = nid('lg');
    def(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    let inner = '';
    // Soft cylindrical shading: a feathered dark band down each outside edge
    // and a narrow light band inside, so the legs read as form rather than as
    // painted-on stripes (the old hard offset strokes).
    const band = (c2, o1) => {
      const id = nid('bd');
      def(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n2(CX - 22)}" y1="0" x2="${n2(CX + 22)}" y2="0">`
        + `<stop offset="0%" stop-color="${c2}" stop-opacity="${o1}"/>`
        + `<stop offset="42%" stop-color="${c2}" stop-opacity="0"/>`
        + `<stop offset="58%" stop-color="${c2}" stop-opacity="0"/>`
        + `<stop offset="100%" stop-color="${c2}" stop-opacity="${o1}"/></linearGradient>`);
      return 'url(#' + id + ')';
    };
    inner += `<rect x="0" y="${n2(Y.hip - 12)}" width="120" height="${n2(hemY - Y.hip + 16)}" fill="${band(shade(c, -0.45), 0.55)}"/>`;
    for (const side of [-1, 1]) {
      const x0 = CX + side * f.off;
      const hx = (side < 0 ? xoL - taper : xoR + taper);
      inner += `<path d="M ${n2(x0 - side * half * 0.48)} ${n2(Y.hip - 8)} L ${n2(hx - side * half * 0.48)} ${n2(hemY + 2)}" stroke="${shade(c, .3)}" stroke-width="${n2(half * 0.34)}" opacity=".2"/>`;
      inner += `<path d="M ${n2(hx - half)} ${n2(Y.knee - 2)} q ${n2(half)} 2.6 ${n2(half * 2)} 0" stroke="${shade(c, -.24)}" stroke-width="1" fill="none" opacity=".35"/>`;
      if (o.crease) inner += `<path d="M ${n2(x0 - 0.6)} ${n2(Y.hip)} L ${n2(hx - 0.6)} ${n2(hemY)}" stroke="${shade(c, .2)}" stroke-width=".9" opacity=".4"/>`;
    }
    // crotch and seat shading
    inner += `<path d="M ${n2(CX)} ${n2(crotch)} v -14" stroke="${shade(c, -.3)}" stroke-width="3" opacity=".35"/>`;
    inner += `<rect x="0" y="${n2(Y.hip - 4)}" width="120" height="8" fill="${shade(c, -.2)}" opacity=".2"/>`;
    let out = `<path d="${d}" fill="${fill}"/><g clip-path="url(#${clip})">${inner}</g>`;
    for (const side of [-1, 1]) {
      const hx = (side < 0 ? xoL - taper : xoR + taper);
      if (o.cuff) out += `<rect x="${n2(hx - half - 0.4)}" y="${n2(hemY - 5)}" width="${n2(half * 2 + 0.8)}" height="5.4" rx="2" fill="${shade(c, .2)}"/>`;
      if (o.break) out += `<path d="M ${n2(hx - half)} ${n2(hemY - 1)} q ${n2(half)} 3 ${n2(half * 2)} 0" stroke="${shade(c, -.2)}" stroke-width="1.2" fill="none"/>`;
    }
    // waistband, belt loops and a fly seam
    out += `<rect x="${n2(CX - f.wa - 1)}" y="${n2(waistY - 1)}" width="${n2((f.wa + 1) * 2)}" height="5" rx="1.4" fill="${shade(c, .14)}"/>`;
    out += `<path d="M ${n2(CX - 5)} ${n2(waistY - 1)} v 5 M ${n2(CX + 5)} ${n2(waistY - 1)} v 5" stroke="${shade(c, -.32)}" stroke-width=".9"/>`;
    out += `<path d="M ${n2(CX)} ${n2(waistY + 4)} v 8" stroke="${shade(c, -.3)}" stroke-width=".8" opacity=".7"/>`;
    out += `<path d="M ${n2(CX - f.wa + 1)} ${n2(waistY + 5)} q 3.4 5 1 8 M ${n2(CX + f.wa - 1)} ${n2(waistY + 5)} q -3.4 5 -1 8" stroke="${shade(c, -.26)}" stroke-width=".8" fill="none" opacity=".6"/>`;
    return out;
  }
  P.legs.jeans = (c, l, g) => legsArt(c, g, { w: 1.6, crease: true });
  P.legs.cargo = (c, l, g) => legsArt(c, g, { w: 3.2 }) + [-1, 1].map(side => {
    const f = figOf(g), x = CX + side * f.off;
    return `<rect x="${n2(x - f.le - 1.2)}" y="${n2(Y.knee - 30)}" width="9" height="12" rx="1.4" fill="${shade(c, .14)}" stroke="${shade(c, -.28)}" stroke-width=".6"/>`
      + `<path d="M ${n2(x - f.le - 1.2)} ${n2(Y.knee - 26.6)} h 9" stroke="${shade(c, -.3)}" stroke-width=".9"/>`
      + `<path d="M ${n2(x - f.le - 0.2)} ${n2(Y.ankle - 16)} h 7" stroke="${shade(c, -.2)}" stroke-width=".8" opacity=".6"/>`;
  }).join('');
  P.legs.joggers = (c, l, g) => legsArt(c, g, { w: 2.6, taper: -1.8, cuff: true })
    + `<path d="M ${n2(CX - 4)} ${n2(Y.waist - 6)} q 4 3.4 8 0" stroke="${shade(c, .36)}" stroke-width="1.1" fill="none"/>`;
  P.legs.chinos = (c, l, g) => legsArt(c, g, { w: 1.2, taper: -0.8, break: true, crease: true });

  // ---- feet
  P.feet.trainers = (c) => shoes(c, { tall: 9, sole: '#f5f3ee', lace: true, laces: 2, toe: true });
  P.feet.boots = (c) => shoes(c, { tall: 17, sole: '#1e1b19', lace: true, laces: 4, collar: true, toe: true });
  P.feet.loafers = (c) => shoes(c, { tall: 6, sole: '#191614' });
  P.feet.plain = null;

  // ---------------------------------------------------------------- assembly
  function figure(look, opts) {
    const r = parse(look);
    const prev = CTX;
    CTX = { u: uid(), defs: [], n: 0 };
    let out = '';
    try {
      const g = r.g;
      const held = (opts && opts.held) || null;
      const HIDE_ALL = { balaclava: 1 };
      const HIDE_CROWN = { cap: 1, snapback: 1, beanie: 1, bucket: 1, durag: 1 };
      let cover = 0;
      for (const p of r.pieces) {
        if (HIDE_ALL[p.style]) cover = 2;
        else if (p.part === 'head' && HIDE_CROWN[p.style] && cover < 1) cover = 1;
      }
      const has = {};
      for (const p of r.pieces) if (P[p.part] && P[p.part][p.style]) has[p.part] = true;
      out = baseBody(g, cover, has) + baseClothes(g, has);
      const ordered = r.pieces.slice().sort((a, b) =>
        (PARTS.indexOf(a.part) - PARTS.indexOf(b.part)) || (a.layer - b.layer));
      for (const p of ordered) {
        const set = P[p.part];
        const fn = set && set[p.style];
        if (!fn) continue;
        try { out += fn(p.col, p.layer, g, CTX.u) || ''; } catch (e) { /* one bad piece must never break a citizen */ }
      }
      if (!has.hands) out += bareHands(g);
      if (held) out += held;
      const defs = CTX.defs.length ? `<defs>${CTX.defs.join('')}</defs>` : '';
      return { svg: defs + out, g, pieces: r.pieces, seed: r.seed };
    } finally {
      CTX = prev;
    }
  }

  function wrap(id, w, h, size, inner, cls) {
    const height = Math.round(size * (h / w));
    return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${height}" class="${cls || 'av-svg'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${inner}</svg>`;
  }

  // ---------------------------------------------------------------- surfaces
  const BODY_CROP = '18 6 84 240';           // tidy figure crop out of the 120 x 252 box
  function doll(s, size, opts) {
    const f = figure(s, opts);
    size = size || 120;
    return `<svg viewBox="${BODY_CROP}" width="${size}" height="${Math.round(size * 240 / 84)}" class="doll-svg av-doll" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${f.svg}</svg>`;
  }
  // head-and-shoulders crop for lists, chat and the target board
  function svgFor(s, size) {
    const f = figure(s);
    size = size || 64;
    return `<svg viewBox="34 6 52 52" width="${size}" height="${size}" class="av-svg av-portrait" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="citizen">${f.svg}</svg>`;
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
    const inner = `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2b2149"/><stop offset="100%" stop-color="#0d0a16"/></linearGradient>`
      + `<radialGradient id="${sky}g" cx="50%" cy="58%" r="60%"><stop offset="0%" stop-color="rgba(216,121,201,.22)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>`
      + `<rect width="${W}" height="${H}" fill="url(#${sky})"/>`
      + `<rect width="${W}" height="${H}" fill="url(#${sky}g)"/>`
      + `<rect x="0" y="150" width="${W}" height="40" fill="#1a1428"/>`
      + `<rect x="12" y="94" width="22" height="56" fill="#120d1e"/><rect x="196" y="84" width="26" height="66" fill="#120d1e"/>`
      + `<path d="M 34 94 v 56 M 206 84 v 66" stroke="rgba(255,255,255,.06)" stroke-width="2"/>`
      + `<circle cx="176" cy="44" r="12" fill="rgba(216,121,201,.45)"/>`
      + `<g transform="translate(0 14) scale(0.7)"><g transform="translate(-4 0)">${f.svg}</g></g>`;
    return wrap(f.seed, W, H, size, inner, 'av-scene');
  }
  // names and subtitles are player-typed and land inside SVG <text>, so they
  // are escaped as XML text, not pasted raw
  function escText(v) {
    return S(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function mugshot(s, size, name) {
    const f = figure(s);
    const W = 120, H = 148;
    let grid = '';
    for (let y = 24; y <= 116; y += 9) grid += `<path d="M6 ${y} H114" stroke="#aeb6c2" stroke-width=".4" opacity=".28"/>`;
    for (let x = 6; x <= 114; x += 8) grid += `<path d="M${x} 16 v3" stroke="#aeb6c2" stroke-width=".7" opacity=".45"/>`;
    const no = 100000 + (f.seed % 899999);
    const nm = escText(S(name || 'DETAINED').toUpperCase().slice(0, 18));
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
    const nm = escText(S(name || 'CITIZEN').toUpperCase().slice(0, 20));
    const bg = nid('btx');
    const inner = `<defs><linearGradient id="${bg}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#221a38"/><stop offset="100%" stop-color="#0a0813"/></linearGradient></defs>`
      + `<rect width="${W}" height="${H}" fill="url(#${bg})"/>`
      + `<g transform="translate(4 -12) scale(0.52)"><g transform="translate(-30 0)">${f.svg}</g></g>`
      + `<text x="96" y="58" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#f0ecfa" letter-spacing="2">${nm}</text>`
      + `<text x="98" y="78" font-family="monospace" font-size="12" fill="#a678e8" letter-spacing="2.4">${escText(S(sub || '').toUpperCase().slice(0, 46))}</text>`;
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
    p01: { file: '/img/portraits/p01.jpg', ox: { x: 49, headTop: 21, eyeY: 41, chinY: 62, neckY: 70 } },
    p02: { file: '/img/portraits/p02.jpg', ox: { x: 50, headTop: 10, eyeY: 33, chinY: 57, neckY: 65 } },
    p03: { file: '/img/portraits/p03.jpg', ox: { x: 50, headTop: 8,  eyeY: 38, chinY: 62, neckY: 71 } },
    p04: { file: '/img/portraits/p04.jpg', ox: { x: 50, headTop: 15, eyeY: 37, chinY: 60, neckY: 68 } },
    p05: { file: '/img/portraits/p05.jpg', ox: { x: 50, headTop: 11, eyeY: 32, chinY: 55, neckY: 63 } },
    p06: { file: '/img/portraits/p06.jpg', ox: { x: 49, headTop: 17, eyeY: 37, chinY: 60, neckY: 68 } },
    p07: { file: '/img/portraits/p07.jpg', ox: { x: 50, headTop: 15, eyeY: 35, chinY: 60, neckY: 68 } },
    p08: { file: '/img/portraits/p08.jpg', ox: { x: 50, headTop: 14, eyeY: 35, chinY: 58, neckY: 66 } },
    p09: { file: '/img/portraits/p09.jpg', ox: { x: 50, headTop: 27, eyeY: 48, chinY: 67, neckY: 75 } },
    p10: { file: '/img/portraits/p10.jpg', ox: { x: 49, headTop: 14, eyeY: 35, chinY: 58, neckY: 66 } }
  };
  // uploads are cut to a 200x275 head-and-shoulders frame in the browser;
  // this anchor suits that typical framing once shown in the square box
  const OX_CUSTOM = { x: 50, headTop: 12, eyeY: 33, chinY: 52, neckY: 62 };
  const OX_DEFAULT = { x: 50, headTop: 14, eyeY: 36, chinY: 59, neckY: 67 };

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
      // brow sits just above the eye line, a fixed share of the head height;
      // the mouth sits about two thirds of the way from eyes to chin
      // where a hat band sits: on the hairline, i.e. just below the measured
      // crown, but never further up than a brow's worth above the eyes
      hatY: Math.min(headTop + headH * 0.16, eyeY - (chinY - eyeY) * 0.16),
      browY: eyeY - (chinY - eyeY) * 0.28,
      mouthY: eyeY + (chinY - eyeY) * 0.66
    };
  }
  // The overlay used to carry a SECOND, flat copy of every hat / mask / chain,
  // drawn against the photo anchor. It drifted out of sync with the figure art
  // constantly. Now there is exactly one set of art: the same style functions
  // the full-body model uses are drawn in figure space and mapped onto the
  // photo's measured anchor, so a cap is the same cap wherever it appears.
  //
  // A photographed head is not the model's proportions, so ONE transform can
  // never land a hat on the crown, glasses on the eyes and a mask on the mouth
  // at the same time. Each zone therefore gets its own vertical anchor on the
  // feature it actually belongs to, at one shared scale taken from the head
  // height — so nothing is ever stretched out of shape relative to anything
  // else on the same face.
  const REF_TOP = Y.head - FIG.m.head[1];       // crown of the reference head
  const REF_BROW = Y.head - 9;                  // where a hat band sits on it
  const REF_EYE = Y.head + 1.5;                 // its eye line
  const REF_CHIN = Y.chin + 1.5;                // bottom of its chin
  const OVER_WIDE = 1.12;                       // real heads run a touch wider
  // Each piece of art is anchored on the feature it is DRAWN around, not on
  // the slot it occupies: a bandana's art is centred a few units above the jaw,
  // a balaclava covers the whole skull and so keys off the brow like a hat.
  // ref = the y in figure space the art hangs from; at = the measured feature
  // on the photo it should land on.
  // [ y in figure space the art hangs from, the measured photo feature it lands
  //   on, an optional size multiplier ]
  const ANCHOR = {
    'head:cap': [REF_BROW, 'hatY', 0.86],
    'head:snapback': [REF_BROW, 'hatY', 0.86],
    'head:beanie': [REF_BROW, 'hatY', 0.9],
    'head:bucket': [REF_BROW, 'hatY', 0.88],
    'head:durag': [REF_BROW, 'hatY', 0.9],
    'eyes:shades': [REF_EYE, 'eyeY', 0.92],
    'eyes:specs': [REF_EYE, 'eyeY', 0.95],
    'mouth:bandana': [Y.head + 14, 'mouthY', 0.82],
    'mouth:resp': [Y.head + 12, 'mouthY', 0.85],
    'mouth:balaclava': [Y.head, 'eyeY', 1.05],
    'neck:chain': [Y.chin + 6, 'neckY', 1],
    'neck:scarf': [Y.chin + 4, 'neckY', 1]
  };
  function overlayTransform(G, key) {
    const a = ANCHOR[key];
    if (!a) return '';
    // scale off eye-to-chin, not the full head: the crown of a photo moves with
    // the subject's hair, the eye line and chin do not
    const k = ((G.chinY - G.eyeY) / (REF_CHIN - REF_EYE)) * OVER_WIDE * (a[2] || 1);
    if (!(k > 0)) return '';
    const atY = G[a[1]];
    if (!Number.isFinite(atY)) return '';
    return `translate(${n2(G.x - CX * k)} ${n2(atY - a[0] * k)}) scale(${n2(k)})`;
  }
  function overlayPiece(part, style, c) {
    const set = P[part];
    const fn = set && set[style];
    if (!fn) return '';
    try { return fn(c, 4, 'm', ctx().u) || ''; } catch (e) { return ''; }
  }
  // Accessory overlay for a look string on a given face anchor: only the parts
  // a chest-up photo shows (head / eyes / mouth / neck).
  function portraitOverlay(look, O) {
    const G = geomOf(O);
    const r = parse(look);
    const order = ['neck', 'mouth', 'eyes', 'head'];
    const bits = r.pieces.filter(p => ANCHOR[p.part + ':' + p.style])
      .sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part));
    if (!bits.length) return '';
    const prev = CTX;
    CTX = { u: uid(), defs: [], n: 0 };
    try {
      let inner = '';
      for (const p of bits) {
        const art = overlayPiece(p.part, p.style, p.col);
        if (!art) continue;
        const t = overlayTransform(G, p.part + ':' + p.style);
        if (!t) continue;
        inner += `<g transform="${t}">${art}</g>`;
      }
      if (!inner) return '';
      const defs = CTX.defs.length ? `<defs>${CTX.defs.join('')}</defs>` : '';
      return `<svg viewBox="0 0 100 100" class="av-overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${inner}</svg>`;
    } finally {
      CTX = prev;
    }
  }
  // The Torn-style avatar: a photo-style face with the kit's visible pieces on top.
  // p: { avatar (look string), portrait (catalog id | 'custom'), pic, name, online, wanted }
  // Every value that reaches this markup is player-controlled (name, pic, the
  // caller's class) so all of it is escaped, and the image source is restricted
  // to the two shapes we ever legitimately emit: a catalog path under /img/ or
  // a base64 data-image. Anything else — javascript:, a bare URL, a data: with
  // an svg payload — is dropped rather than rendered.
  function escAttr(v) {
    return S(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeSrc(v) {
    const t = S(v).trim();
    if (/^\/img\/[A-Za-z0-9_\-./]+\.(png|jpe?g|webp|gif|svg)$/.test(t)) return t;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(t)) return t.replace(/\s+/g, '');
    return '';
  }
  function portraitFor(p, size, opts) {
    size = Math.max(8, Math.min(1024, Math.round(Number(size) || 64)));
    opts = opts || {};
    const look = (p && typeof p.avatar === 'string') ? p.avatar : (typeof p === 'string' ? p : 'm|');
    const O = anchorOf(p);
    let src = '';
    if (p && p.portrait === 'custom' && p.pic) src = safeSrc(p.pic);
    else if (p && p.portrait && p.portrait !== 'custom') src = safeSrc((PORTRAIT_FILES[p.portrait] || {}).file || '');
    const cls = S(opts.cls || '').replace(/[^A-Za-z0-9_\- ]/g, '');
    const badge = [];
    if (opts.online) badge.push('<span class="av-online" title="online now"></span>');
    const wanted = Math.max(0, Math.min(5, Math.round(Number(opts.wanted) || 0)));
    if (wanted > 0) badge.push('<span class="av-wanted" title="' + wanted + '-star warrant">' + '\u2605'.repeat(wanted) + '</span>');
    if (src) {
      return `<span class="av-photo ${cls}" style="width:${size}px;height:${size}px" title="${escAttr((p && p.name) || 'citizen')}">`
        + `<img src="${escAttr(src)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center 18%;display:block">`
        + portraitOverlay(look, O)
        + badge.join('')
        + '</span>';
    }
    // no portrait data (dense lists for uploaders, legacy junk): the town model
    return `<span class="av-fallback ${cls}" style="width:${size}px;height:${size}px;display:inline-block">${svgFor(look, size)}</span>`;
  }

  const SURFACES = ['doll', 'svgFor', 'duel', 'scene', 'mugshot', 'banner', 'wear', 'parts', 'random', 'parse', 'figure', 'styleOf', 'svgDataUri', 'portraitDataUri', 'portraitFor', 'portraitOverlay', 'portraitSrc'];
  ROOT.AV = {
    doll, svgFor, duel, scene, mugshot, banner, wear, parts, random, parse, figure,
    portraitFor, portraitOverlay,
    portraitSrc: (p) => {
      if (!p) return '';
      if (p.portrait === 'custom' && p.pic) return safeSrc(p.pic);
      const e = PORTRAIT_FILES[p.portrait];
      return safeSrc((e && e.file) || '');
    },
    PARTS, PART_LABEL, BODIES, STYLES: P,
    styleOf: (look) => parse(look).pieces.map(p => p.style),
    svgDataUri: (s, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size)),
    portraitDataUri: (s, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)),
    TOTALS: { styles: Object.keys(P).reduce((n, k) => n + Object.keys(P[k]).length, 0) - 4, parts: PARTS.length, bodies: BODIES.length, surfaces: SURFACES.length }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ROOT.AV;
})();
