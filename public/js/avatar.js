// Razor Town — character art.
// Two renderers, both built from the same 5-part avatar spec ("skin|face|hair|shirt|accent"):
//   AV.svgFor(spec, size)                 small square portrait, for lists and headers
//   AV.doll(spec, size, opts)             full-length front-facing paper-doll, Torn-style
// Everything is original vector art drawn here — no third-party sprites.
(function () {
  'use strict';

  const SKINS = ['#e8b48c', '#d99b6c', '#a96d45', '#7d4e2f', '#e6c39a'];
  const SKIN_NAMES = ['Fair', 'Ruddy', 'Olive', 'Deep brown', 'Pale'];
  // t: hair shape          cap: optional headwear
  const HAIRS = [
    { c: '#191512', t: 'short', cap: 'flat',   n: 'Flat cap' },
    { c: '#241a12', t: 'short', cap: 'bowler', n: 'Bowler hat' },
    { c: '#0e0c0b', t: 'short',                n: 'Slicked back' },
    { c: '#4a2a16', t: 'bob',                  n: 'Bobbed hair' },
    { c: '#2e2018', t: 'bowl',                 n: 'Bowl crop' },
    { c: '#141210', t: 'short',                n: 'Cropped' },
    { c: '#3b2416', t: 'short',                n: 'Rough crop' },
    { c: '#7a5a3c', t: 'scarf',                n: 'Head scarf' },
    { c: '#191512', t: 'short',                n: 'Trimmed side-part' },
    { c: '#5b1f1a', t: 'pony',                 n: 'Auburn and loose' }
  ];
  const SHIRTS = ['#2b2722', '#3a2020', '#24323b', '#20291f', '#4a3a24', '#38261c', '#262b33', '#3c3a30'];
  const SHIRT_NAMES = ['Charcoal twill', 'Oxblood tweed', 'Canal blue serge', 'Moss green wool',
                       'Tobacco brown', 'Rust herringbone', 'Midnight gabardine', 'Dun grey worsted'];
  const FACE_FEAT = [
    { eye: 'round', brow: 0, mouth: 0, n: 'Open' },
    { eye: 'sharp', brow: 1, mouth: 1, n: 'Sharpe' },
    { eye: 'round', brow: 1, mouth: 2, n: 'Rugged' },
    { eye: 'sharp', brow: 2, mouth: 0, n: 'Hooded' },
    { eye: 'half',  brow: 0, mouth: 1, n: 'Sleepy' },
    { eye: 'half',  brow: 2, mouth: 2, n: 'Scarred' }
  ];
  const ACCENTS = ['#c9a24b', '#8f2f28', '#cfc2a6', '#5f7d5e', '#2e4a4a'];
  const ACCENT_NAMES = ['Gold watch chain', 'Oxblood pin', 'Ivory cufflinks', 'Green enamel stud', 'Teal silk tie'];

  function num(v, mx) { v = parseInt(v, 10); return isNaN(v) ? 0 : Math.min(mx, Math.max(0, v)); }
  function parts(s) {
    const a = String(s || '').split('|');
    return {
      skin: num(a[0], SKINS.length - 1),
      face: num(a[1], FACE_FEAT.length - 1),
      hair: num(a[2], HAIRS.length - 1),
      shirt: num(a[3], SHIRTS.length - 1),
      accent: num(a[4], ACCENTS.length - 1)
    };
  }
  function hash(s) { s = String(s == null ? '' : s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); }
  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // What the character is actually wearing — every value comes from a real creator choice,
  // so the profile's equipment slots can never show invented gear.
  function wear(s) {
    const p = parts(s);
    const h = HAIRS[p.hair];
    return [
      { slot: 'Headwear', icon: h.cap === 'bowler' ? '🎩' : h.cap === 'flat' ? '🧢' : '💇', value: h.n },
      { slot: 'Jacket', icon: '🧥', value: SHIRT_NAMES[p.shirt] },
      { slot: 'Waistcoat', icon: '🦺', value: 'Matching waistcoat' },
      { slot: 'Trousers', icon: '👖', value: 'Wool trousers' },
      { slot: 'Boots', icon: '🥾', value: 'Leather boots' },
      { slot: 'Trinket', icon: '⌚', value: ACCENT_NAMES[p.accent] }
    ];
  }

  // ---------------------------------------------------------------- face (shared)
  function faceSVG(feat, hair, acc, cx, cy, sc) {
    // cx/cy = head centre, sc = head radius scale (1 = a 23px head)
    const lx = cx - 10 * sc, rx = cx + 10 * sc, ey = cy;
    const hc = hair.c, browc = (hair.t === 'scarf' || hair.cap) ? shade(hc, 0.25) : hc;
    const bw = feat.brow === 0 ? 0 : feat.brow === 1 ? 2.2 : -2.2;
    let f = '';
    f += `<path d="M${lx - 7 * sc} ${ey - 9 * sc - bw} L${lx + 7 * sc} ${ey - 6 * sc - bw}" stroke="${browc}" stroke-width="${2.6 * sc}" stroke-linecap="round" fill="none"/>`;
    f += `<path d="M${rx - 7 * sc} ${ey - 6 * sc - bw} L${rx + 7 * sc} ${ey - 9 * sc - bw}" stroke="${browc}" stroke-width="${2.6 * sc}" stroke-linecap="round" fill="none"/>`;
    const e = '#16110e';
    if (feat.eye === 'round') {
      for (const x of [lx, rx])
        f += `<circle cx="${x}" cy="${ey}" r="${4.6 * sc}" fill="#f2ead6"/><circle cx="${x}" cy="${ey}" r="${2.7 * sc}" fill="${e}"/><circle cx="${x + 1.2 * sc}" cy="${ey - 1.2 * sc}" r="${0.9 * sc}" fill="#fff"/>`;
    } else if (feat.eye === 'sharp') {
      for (const x of [lx, rx])
        f += `<path d="M${x - 5 * sc} ${ey} L${x} ${ey + 2.5 * sc} L${x + 5 * sc} ${ey} L${x} ${ey - 2.5 * sc} Z" fill="${e}"/><circle cx="${x}" cy="${ey}" r="${1.2 * sc}" fill="${acc}"/>`;
    } else {
      for (const x of [lx, rx])
        f += `<path d="M${x - 5.4 * sc} ${ey} Q${x} ${ey - 3.4 * sc} ${x + 5.4 * sc} ${ey}" stroke="${e}" stroke-width="${2.5 * sc}" fill="none" stroke-linecap="round"/>`;
    }
    // nose
    f += `<path d="M${cx} ${cy + 6 * sc} L${cx - 1 * sc} ${cy + 11 * sc} Q${cx} ${cy + 12.6 * sc} ${cx + 1.4 * sc} ${cy + 11.6 * sc}" stroke="${shade('#000000', 0.55)}" stroke-width="${1.8 * sc}" fill="none" stroke-linecap="round" opacity=".55"/>`;
    const m = feat.mouth, my = cy + 14 * sc;
    if (m === 0) f += `<path d="M${cx - 6 * sc} ${my} Q${cx} ${my + 3 * sc} ${cx + 6 * sc} ${my}" stroke="${shade('#000000', 0.45)}" stroke-width="${2 * sc}" fill="none" stroke-linecap="round"/>`;
    else if (m === 1) f += `<path d="M${cx - 7 * sc} ${my - 2 * sc} Q${cx} ${my + 2 * sc} ${cx + 7 * sc} ${my - 2 * sc} L${cx + 7 * sc} ${my - 1 * sc} Q${cx} ${my + 7 * sc} ${cx - 7 * sc} ${my - 1 * sc} Z" fill="#5a1420"/>`;
    else f += `<circle cx="${cx}" cy="${my}" r="${1.8 * sc}" fill="#7a1a28"/><path d="M${cx - 2 * sc} ${my} h${4 * sc}" stroke="#3f0d15" stroke-width="${1.6 * sc}"/>`;
    return f;
  }

  function headwearSVG(hair, cx, cy, sc) {
    const hc = hair.c;
    let f = '';
    const top = cy - 26 * sc, side = cx - 23 * sc, side2 = cx + 23 * sc;
    if (hair.t === 'short' || hair.t === 'bowl') {
      f += `<path d="M${side} ${cy + 2 * sc} Q${cx - 25 * sc} ${top} ${cx} ${top - 4 * sc} Q${cx + 25 * sc} ${top} ${side2} ${cy + 2 * sc} L${side2} ${cy - 6 * sc} Q${cx + 25 * sc} ${top + 4 * sc} ${cx} ${top + 0.5 * sc} Q${cx - 25 * sc} ${top + 4 * sc} ${side} ${cy - 6 * sc} Z" fill="${hc}"/>`;
      if (hair.t === 'bowl') f += `<path d="M${side} ${cy - 10 * sc} Q${side} ${top - 2 * sc} ${cx} ${top - 3 * sc} Q${side2} ${top - 2 * sc} ${side2} ${cy - 10 * sc} Q${cx + 20 * sc} ${top + 8 * sc} ${cx} ${top + 8 * sc} Q${cx - 20 * sc} ${top + 8 * sc} ${side} ${cy - 10 * sc} Z" fill="${shade(hc, 0.1)}"/>`;
    } else if (hair.t === 'bob') {
      f += `<path d="M${side} ${cy - 4 * sc} Q${cx - 25 * sc} ${top - 4 * sc} ${cx} ${top - 4 * sc} Q${cx + 25 * sc} ${top - 4 * sc} ${side2} ${cy - 4 * sc} L${side2} ${cy + 14 * sc} Q${cx + 18 * sc} ${cy + 34 * sc} ${cx} ${cy + 36 * sc} Q${cx - 18 * sc} ${cy + 34 * sc} ${side} ${cy + 14 * sc} Z" fill="${hc}"/>`;
      f += `<path d="M${side + 1 * sc} ${cy + 6 * sc} Q${cx - 22 * sc} ${cy - 10 * sc} ${cx - 12 * sc} ${cy - 16 * sc} Q${cx - 18 * sc} ${cy - 4 * sc} ${cx - 16 * sc} ${cy + 16 * sc} Q${cx - 20 * sc} ${cy + 4 * sc} ${side + 1 * sc} ${cy - 4 * sc} Z" fill="${shade(hc, 0.14)}"/>`;
    } else if (hair.t === 'scarf') {
      f += `<path d="M${side} ${cy + 4 * sc} Q${cx - 27 * sc} ${top - 10 * sc} ${cx} ${top - 12 * sc} Q${cx + 27 * sc} ${top - 10 * sc} ${side2} ${cy + 4 * sc} L${side2} ${cy - 10 * sc} Q${cx + 24 * sc} ${top + 2 * sc} ${cx} ${top} Q${cx - 24 * sc} ${top + 2 * sc} ${side} ${cy - 10 * sc} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - 9 * sc} ${cy + 24 * sc} Q${cx - 16 * sc} ${cy + 36 * sc} ${cx - 14 * sc} ${cy + 48 * sc} L${cx - 4 * sc} ${cy + 46 * sc} Q${cx - 6 * sc} ${cy + 34 * sc} ${cx - 4 * sc} ${cy + 28 * sc} Z" fill="${hc}"/>`;
    } else if (hair.t === 'pony') {
      f += `<path d="M${side} ${cy + 2 * sc} Q${side} ${top - 8 * sc} ${cx} ${top - 8 * sc} Q${side2} ${top - 8 * sc} ${side2} ${cy + 2 * sc} Q${cx + 22 * sc} ${cy - 14 * sc} ${cx} ${cy - 18 * sc} Q${cx - 22 * sc} ${cy - 14 * sc} ${side} ${cy + 2 * sc} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + 20 * sc} ${cy - 14 * sc} Q${cx + 40 * sc} ${cy - 6 * sc} ${cx + 34 * sc} ${cy + 30 * sc} Q${cx + 30 * sc} ${cy + 46 * sc} ${cx + 21 * sc} ${cy + 50 * sc} Q${cx + 26 * sc} ${cy + 26 * sc} ${cx + 21 * sc} ${cy + 12 * sc} Z" fill="${shade(hc, -0.12)}"/>`;
    }
    // sideburns
    f += `<path d="M${side + 1 * sc} ${cy + 2 * sc} Q${side - 1 * sc} ${cy + 14 * sc} ${side + 2 * sc} ${cy + 24 * sc}" stroke="${hc}" stroke-width="${3.2 * sc}" fill="none" stroke-linecap="round"/>`;
    f += `<path d="M${side2 - 1 * sc} ${cy + 2 * sc} Q${side2 + 1 * sc} ${cy + 14 * sc} ${side2 - 2 * sc} ${cy + 24 * sc}" stroke="${hc}" stroke-width="${3.2 * sc}" fill="none" stroke-linecap="round"/>`;
    if (hair.cap === 'flat') {
      f += `<path d="M${side} ${cy - 6 * sc} Q${cx - 25 * sc} ${top - 6 * sc} ${cx} ${top - 8 * sc} Q${cx + 25 * sc} ${top - 6 * sc} ${side2} ${cy - 6 * sc} Q${cx + 25 * sc} ${top + 6 * sc} ${cx} ${top + 7 * sc} Q${cx - 25 * sc} ${top + 6 * sc} ${side} ${cy - 6 * sc} Z" fill="${shade(hc, 0.08)}"/>`;
      f += `<path d="M${side - 1 * sc} ${cy - 8 * sc} L${cx - 8 * sc} ${cy - 10 * sc} Q${cx - 2 * sc} ${cy - 11 * sc} ${cx} ${cy - 8 * sc} L${cx - 2 * sc} ${cy - 3 * sc} L${side + 3 * sc} ${cy - 1 * sc} Z" fill="#1d1812"/>`;
      f += `<path d="M${side - 1 * sc} ${cy - 5 * sc} L${cx - 9 * sc} ${cy - 7 * sc}" stroke="#c9a24b" stroke-width="${1.6 * sc}" stroke-linecap="round"/>`;
    } else if (hair.cap === 'bowler') {
      f += `<path d="M${side} ${cy - 8 * sc} Q${side} ${top - 12 * sc} ${cx} ${top - 14 * sc} Q${side2} ${top - 12 * sc} ${side2} ${cy - 8 * sc} Q${cx + 10 * sc} ${cy - 12 * sc} ${cx} ${cy - 11 * sc} Q${cx - 10 * sc} ${cy - 12 * sc} ${side} ${cy - 8 * sc} Z" fill="${hc}"/>`;
      f += `<path d="M${side - 2 * sc} ${cy - 8 * sc} Q${side - 2 * sc} ${cy - 14 * sc} ${cx - 14 * sc} ${cy - 15 * sc} Q${cx} ${cy - 11 * sc} ${cx + 14 * sc} ${cy - 15 * sc} Q${side2 + 2 * sc} ${cy - 14 * sc} ${side2 + 2 * sc} ${cy - 8 * sc} Q${cx + 10 * sc} ${cy - 11 * sc} ${cx} ${cy - 10 * sc} Q${cx - 10 * sc} ${cy - 11 * sc} ${side - 2 * sc} ${cy - 8 * sc} Z" fill="${hc}"/>`;
      f += `<path d="M${side - 2 * sc} ${cy - 9 * sc} H${side2 + 2 * sc}" stroke="${shade(hc, 0.12)}" stroke-width="${2.4 * sc}"/>`;
    }
    return f;
  }

  // ---------------------------------------------------------------- small portrait (lists, header, creator strip)
  function svgFor(s, size, glowColor) {
    s = String(s == null ? '' : s);
    const p = parts(s);
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], shirt = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const vw = 120, glow = glowColor || acc;
    const bg2 = '#141109', bg1 = shade(glow, -0.86);
    let f = '';
    // shoulders / coat
    f += `<path d="M16 120 L16 96 Q16 76 42 71 L52 68 Q60 77 68 68 L78 71 Q104 76 104 96 L104 120 Z" fill="${shirt}"/>`;
    f += `<path d="M16 120 L16 104 Q16 84 44 76 L60 120 Z" fill="${shade(shirt, -0.2)}"/>`;
    f += `<path d="M104 120 L104 104 Q104 84 76 76 L60 120 Z" fill="${shade(shirt, -0.2)}"/>`;
    f += `<path d="M52 70 L60 94 L68 70 Z" fill="${shade(shirt, -0.24)}"/>`;
    f += `<circle cx="60" cy="98" r="1.5" fill="${acc}"/><circle cx="60" cy="108" r="1.5" fill="${acc}"/>`;
    f += `<path d="M52 86 Q60 100 68 86" stroke="${acc}" stroke-width="1.6" fill="none"/>`;
    f += `<rect x="52" y="64" width="16" height="20" rx="6" fill="${shade(skin, -0.2)}"/>`;
    f += `<path d="M46 88 L58 74 L54 94 Z" fill="#e8e0cd"/><path d="M74 88 L62 74 L66 94 Z" fill="#e8e0cd"/>`;
    f += `<path d="M56 76 L60 86 L64 76 L60 70 Z" fill="${acc}"/>`;
    f += `<path d="M60 86 L56 108 L64 108 Z" fill="${shade(acc, -0.12)}"/>`;
    // head
    f += `<ellipse cx="60" cy="56" rx="24" ry="26" fill="${skin}"/>`;
    f += `<path d="M36 58 Q35 28 60 25 Q85 28 84 58 L84 62 Q83 78 74 83 Q60 90 46 83 Q37 78 36 62 Z" fill="${skin}"/>`;
    f += `<ellipse cx="36" cy="58" rx="3" ry="5" fill="${shade(skin, -0.1)}"/><ellipse cx="84" cy="58" rx="3" ry="5" fill="${shade(skin, -0.1)}"/>`;
    f += headwearSVG(hair, 60, 56, 1);
    f += faceSVG(feat, hair, acc, 60, 58, 1);
    return `<svg viewBox="0 0 ${vw} ${vw}" width="${size}" height="${size}" role="img" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg${hash(s)}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#pg${hash(s)})"/>
      ${f}
    </svg>`;
  }

  // ---------------------------------------------------------------- full paper-doll
  function doll(s, size, opts) {
    opts = opts || {};
    s = String(s == null ? '' : s);
    const p = parts(s);
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], coat = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const coatDark = shade(coat, -0.22), coatLight = shade(coat, 0.1);
    const vest = shade(coat, 0.16), vestDark = shade(coat, -0.06);
    const trouser = shade(coat, -0.34), boot = shade(coat, -0.62);
    const shirtWhite = '#ded4bb', collar = '#f0e8d4';
    const S = size || 220;
    const VB_W = 120, VB_H = 254, DROP = 10;   // headroom for hats, floor for the shadow
    const H = Math.round(S * (VB_H / VB_W));
    let f = '';

    // ground shadow
    f += `<ellipse cx="60" cy="234" rx="30" ry="6" fill="#000" opacity=".38"/>`;

    // ---- legs / trousers
    f += `<path d="M45 148 L75 148 L74 206 L62 206 L60 168 L58 206 L46 206 Z" fill="${trouser}"/>`;
    f += `<path d="M58 168 L62 168 L62 206 L58 206 Z" fill="${shade(trouser, -0.3)}" opacity=".7"/>`;
    // ---- boots
    f += `<path d="M45 204 h13 v20 q0 5 -6.5 5 q-6.5 0 -6.5 -5 z" fill="${boot}"/>`;
    f += `<path d="M62 204 h13 v20 q0 5 -6.5 5 q-6.5 0 -6.5 -5 z" fill="${boot}"/>`;
    f += `<path d="M45 226 h13 M62 226 h13" stroke="${shade(boot, 0.22)}" stroke-width="3"/>`;
    f += `<path d="M45 222 a2.4 2.4 0 0 0 5 0 a2.4 2.4 0 0 0 -5 0 M62 222 a2.4 2.4 0 0 0 5 0 a2.4 2.4 0 0 0 -5 0" fill="${acc}" opacity=".8"/>`;

    // ---- shirt / torso
    f += `<path d="M42 150 L42 88 Q42 73 58 69 L62 69 Q78 73 78 88 L78 150 Z" fill="${shirtWhite}"/>`;
    // waistcoat
    f += `<path d="M45 148 L45 92 Q45 82 55 79 L60 96 L65 79 Q75 82 75 92 L75 148 Z" fill="${vest}"/>`;
    f += `<path d="M45 148 L45 92 Q45 82 55 79 L60 96 L58 148 Z" fill="${vestDark}" opacity=".55"/>`;
    for (const y of [104, 116, 128]) f += `<circle cx="60" cy="${y}" r="1.6" fill="${acc}"/>`;
    // watch chain
    f += `<path d="M52 100 Q60 116 68 100" stroke="${acc}" stroke-width="1.8" fill="none"/>`;
    f += `<circle cx="63" cy="108" r="2.8" fill="${acc}" stroke="${shade(acc, -0.3)}" stroke-width=".6"/>`;
    // collar + tie
    f += `<path d="M50 92 L60 80 L56 100 Z" fill="${collar}"/><path d="M70 92 L60 80 L64 100 Z" fill="${collar}"/>`;
    f += `<path d="M56 82 L60 92 L64 82 L60 76 Z" fill="${acc}"/>`;
    f += `<path d="M60 92 L56 116 L64 116 Z" fill="${shade(acc, -0.14)}"/>`;

    // ---- arms (sleeves + hands)
    f += `<path d="M42 81 Q30 90 27 116 Q25 138 31 148 L43 146 Q38 122 45 92 Z" fill="${coatLight}"/>`;
    f += `<path d="M78 81 Q90 90 93 116 Q95 138 89 148 L77 146 Q82 122 75 92 Z" fill="${coatLight}"/>`;
    f += `<path d="M42 81 Q30 90 27 116 Q25 138 31 148" fill="none" stroke="${coatDark}" stroke-width="1.4" opacity=".7"/>`;
    f += `<path d="M78 81 Q90 90 93 116 Q95 138 89 148" fill="none" stroke="${coatDark}" stroke-width="1.4" opacity=".7"/>`;
    f += `<ellipse cx="35" cy="152" rx="6.2" ry="7" fill="${skin}"/><ellipse cx="85" cy="152" rx="6.2" ry="7" fill="${skin}"/>`;

    // ---- overcoat (open front, long)
    f += `<path d="M39 76 Q31 84 29 110 L30 186 Q33 190 38 188 L42 150 Z" fill="${coat}"/>`;
    f += `<path d="M81 76 Q89 84 91 110 L90 186 Q87 190 82 188 L78 150 Z" fill="${coat}"/>`;
    f += `<path d="M39 76 Q34 92 33 112 L34 186 Q37 188 40 186 L43 118 Q43 96 44 84 Z" fill="${coatDark}" opacity=".55"/>`;
    f += `<path d="M81 76 Q86 92 87 112 L86 186 Q83 188 80 186 L77 118 Q77 96 76 84 Z" fill="${coatDark}" opacity=".55"/>`;
    // lapels
    f += `<path d="M44 74 L60 96 L50 78 Q47 75 44 74 Z" fill="${coatLight}"/>`;
    f += `<path d="M76 74 L60 96 L70 78 Q73 75 76 74 Z" fill="${coatLight}"/>`;
    // pockets + buttons
    f += `<path d="M34 150 h9 M77 150 h9" stroke="${coatDark}" stroke-width="1.4"/>`;
    f += `<circle cx="38" cy="126" r="1.7" fill="${shade(acc, -0.2)}"/><circle cx="82" cy="126" r="1.7" fill="${shade(acc, -0.2)}"/>`;

    // ---- neck + head
    f += `<rect x="53" y="58" width="14" height="18" rx="6" fill="${shade(skin, -0.22)}"/>`;
    f += `<ellipse cx="60" cy="40" rx="23" ry="26" fill="${skin}"/>`;
    f += `<ellipse cx="37" cy="42" rx="3" ry="5" fill="${shade(skin, -0.12)}"/><ellipse cx="83" cy="42" rx="3" ry="5" fill="${shade(skin, -0.12)}"/>`;
    f += headwearSVG(hair, 60, 40, 1);
    f += faceSVG(feat, hair, acc, 60, 41, 1);

    // gentle rim light down the left edge, like a studio portrait
    f += `<path d="M39 76 Q31 84 29 110 L30 186" fill="none" stroke="${shade(acc, 0.45)}" stroke-width="1.6" opacity=".28"/>`;

    return `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="${Math.round(S)}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg" class="doll-svg">
      <defs>
        <linearGradient id="dg${hash(s)}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${shade(acc, -0.9)}"/><stop offset="60%" stop-color="#171309"/><stop offset="100%" stop-color="#0e0b06"/>
        </linearGradient>
      </defs>
      ${opts.plainBg ? '' : `<rect width="${VB_W}" height="${VB_H}" fill="url(#dg${hash(s)})"/>`}
      <g transform="translate(0,${DROP})">${f}</g>
    </svg>`;
  }

  function svgDataUri(s, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)); }
  function dollDataUri(s, size, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size, opts)); }

  window.AV = {
    svgFor, doll, svgDataUri, dollDataUri, parts, wear,
    SKINS, SKIN_NAMES, HAIRS, SHIRTS, SHIRT_NAMES, ACCENTS, ACCENT_NAMES, FACE_FEAT,
    nameOf(kind, i) {
      const t = { skin: SKIN_NAMES, hair: HAIRS.map(h => h.n), shirt: SHIRT_NAMES, accent: ACCENT_NAMES, face: FACE_FEAT.map(x => x.n) };
      return ((t[kind] || [])[i]) || '';
    }
  };
})();
