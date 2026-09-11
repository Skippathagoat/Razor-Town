// Razor Town — character art.
// Two renderers, both built from the same 5-part avatar spec ("skin|face|hair|shirt|accent"):
//   AV.svgFor(spec, size)                 small square portrait, for lists and headers
//   AV.doll(spec, size, opts)             full-length front-facing paper-doll, Torn-style
// Semi-realistic original vector work: graded skin, tapered anatomy, lit cloth — no third-party sprites.
(function () {
  'use strict';

  // ---------------------------------------------------------------- palette (append-only: old specs must still render)
  const SKINS = ['#e8b48c', '#d99b6c', '#a96d45', '#7d4e2f', '#e6c39a',
                 '#c98d65', '#8a5a3b', '#f0d7b8', '#5e3a22'];
  const SKIN_NAMES = ['Fair', 'Ruddy', 'Olive', 'Deep brown', 'Pale', 'Bronzed', 'Umber', 'Ivory', 'Ebony'];

  // t: hair shape          cap: optional headwear
  const HAIRS = [
    { c: '#191512', t: 'short', cap: 'flat',    n: 'Flat cap' },
    { c: '#241a12', t: 'short', cap: 'bowler',  n: 'Bowler hat' },
    { c: '#0e0c0b', t: 'short',                 n: 'Slicked back' },
    { c: '#4a2a16', t: 'bob',                   n: 'Bobbed hair' },
    { c: '#2e2018', t: 'bowl',                  n: 'Bowl crop' },
    { c: '#141210', t: 'short',                 n: 'Cropped' },
    { c: '#3b2416', t: 'short',                 n: 'Rough crop' },
    { c: '#7a5a3c', t: 'scarf',                 n: 'Head scarf' },
    { c: '#191512', t: 'short',                 n: 'Trimmed side-part' },
    { c: '#5b1f1a', t: 'pony',                  n: 'Auburn and loose' },
    { c: '#221c16', t: 'short', cap: 'trilby',  n: 'Trilby, snapped brim' },
    { c: '#3a3126', t: 'short', cap: 'newsboy', n: 'Baker-boy cap' },
    { c: '#47272f', t: 'bob',   cap: 'cloche',  n: 'Cloche hat' },
    { c: '#101010', t: 'waves',                 n: 'Finger waves' },
    { c: '#241a12', t: 'pomp',                  n: 'Pompadour' },
    { c: '#191512', t: 'bald',                  n: 'Razor shaved' },
    { c: '#3b2416', t: 'side',                  n: 'Brilliantined parting' },
    { c: '#c9a86a', t: 'short', cap: 'boater',  n: 'Straw boater' },
    { c: '#5b3317', t: 'curls',                 n: 'Loose curls' }
  ];

  const SHIRTS = ['#2b2722', '#3a2020', '#24323b', '#20291f', '#4a3a24', '#38261c', '#262b33', '#3c3a30',
                  '#21232c', '#3c4038', '#1f2430', '#141414', '#4c4433', '#5c5347', '#22303a', '#57262f'];
  const SHIRT_NAMES = ['Charcoal twill', 'Oxblood tweed', 'Canal blue serge', 'Moss green wool',
                       'Tobacco brown', 'Rust herringbone', 'Midnight gabardine', 'Dun grey worsted',
                       'Midnight pinstripe', 'Gun-club check', 'Chesterfield, velvet collar', 'Evening dress',
                       'Moleskin work coat', 'Cavalry duster', 'Navy reefer', 'Burgundy corduroy'];
  const SHIRT_STYLE = ['plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain',
                       'pinstripe', 'check', 'velvet', 'tails', 'moleskin', 'duster', 'peacoat', 'plain'];

  const FACE_FEAT = [
    { eye: 'round', brow: 0, mouth: 0, n: 'Open' },
    { eye: 'sharp', brow: 1, mouth: 1, n: 'Sharpe' },
    { eye: 'round', brow: 1, mouth: 2, n: 'Rugged' },
    { eye: 'sharp', brow: 2, mouth: 0, n: 'Hooded' },
    { eye: 'half',  brow: 0, mouth: 1, n: 'Sleepy' },
    { eye: 'half',  brow: 2, mouth: 2, scar: true, n: 'Scarred' },
    { eye: 'round', brow: 0, mouth: 0, stache: 'pencil', n: 'Pencil moustache' },
    { eye: 'round', brow: 0, mouth: 1, stache: 'handlebar', n: 'Handlebar, waxed' },
    { eye: 'sharp', brow: 1, mouth: 0, beard: 'full', n: 'Full beard' },
    { eye: 'round', brow: 2, mouth: 0, chops: true, n: 'Mutton chops' },
    { eye: 'half',  brow: 1, mouth: 2, stubble: true, scar: true, n: 'War-worn' },
    { eye: 'round', brow: 0, mouth: 1, lashes: true, rouge: true, n: 'Painted' }
  ];

  const ACCENTS = ['#c9a24b', '#8f2f28', '#cfc2a6', '#5f7d5e', '#2e4a4a',
                   '#e6ddc4', '#b03030', '#d8d2c0', '#6a3b22', '#e0d6c2',
                   '#7d2432', '#8a8d91', '#2b3a55'];
  const ACCENT_NAMES = ['Gold watch chain', 'Oxblood pin', 'Ivory cufflinks', 'Green enamel stud', 'Teal silk tie',
                        'Cream pocket square', 'Red carnation', 'Silver monocle', 'Unlit cigar', 'Cigarette holder',
                        'Burgundy silk scarf', 'Steel tie pin', 'Navy polka cravat'];

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
    const capIcon = { bowler: '🎩', flat: '🧢', trilby: '🎩', newsboy: '🧢', cloche: '👒', boater: '👒' }[h.cap];
    return [
      { slot: 'Headwear', icon: capIcon || (h.t === 'bald' ? '🪮' : '💇'), value: h.n },
      { slot: 'Jacket', icon: '🧥', value: SHIRT_NAMES[p.shirt] },
      { slot: 'Waistcoat', icon: '🦺', value: SHIRT_STYLE[p.shirt] === 'tails' ? 'Marcella evening vest' : 'Matching waistcoat' },
      { slot: 'Trousers', icon: '👖', value: SHIRT_STYLE[p.shirt] === 'moleskin' ? 'Moleskin strides' : 'Wool trousers' },
      { slot: 'Boots', icon: '🥾', value: SHIRT_STYLE[p.shirt] === 'tails' ? 'Patent oxfords' : 'Leather boots' },
      { slot: 'Trinket', icon: '⌚', value: ACCENT_NAMES[p.accent] }
    ];
  }

  // ---------------------------------------------------------------- defs (per-svg, id-suffixed)
  function defsGrad(u, skin, coat, acc) {
    const coatL = shade(coat, 0.12), coatD = shade(coat, -0.26);
    return `<defs>
      <radialGradient id="sk${u}" cx="42%" cy="34%" r="75%">
        <stop offset="0%" stop-color="${shade(skin, 0.1)}"/><stop offset="68%" stop-color="${skin}"/><stop offset="100%" stop-color="${shade(skin, -0.16)}"/>
      </radialGradient>
      <linearGradient id="ct${u}" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0%" stop-color="${coatL}"/><stop offset="55%" stop-color="${coat}"/><stop offset="100%" stop-color="${coatD}"/>
      </linearGradient>
      <linearGradient id="tr${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(coat, -0.3)}"/><stop offset="100%" stop-color="${shade(coat, -0.45)}"/>
      </linearGradient>
      <linearGradient id="bt${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(coat, -0.5)}"/><stop offset="100%" stop-color="${shade(coat, -0.68)}"/>
      </linearGradient>
      <radialGradient id="gl${u}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${acc}" stop-opacity=".2"/><stop offset="100%" stop-color="${acc}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
  }

  // ---------------------------------------------------------------- face (shared)
  // Head occupies roughly rx 23*sc, ry 27*sc, chin at cy+25*sc, crown at cy-28*sc.
  function faceSVG(feat, hair, acc, cx, cy, sc, u) {
    const S = (v) => v * sc;
    const hc = hair.c, browc = (hair.t === 'scarf' || hair.cap) ? shade(hc, 0.3) : hc;
    const exL = cx - S(9.5), exR = cx + S(9.5), ey = cy - S(1);
    let f = '';

    // ears (drawn before the jaw sits over them)
    for (const sx of [-1, 1]) {
      const x = cx + sx * S(22);
      f += `<ellipse cx="${x}" cy="${cy + S(2)}" rx="${S(3.4)}" ry="${S(5.6)}" fill="url(#sk${u})"/>`;
      f += `<path d="M${x} ${cy - S(1)} q${sx * S(1.6)} ${S(2.6)} 0 ${S(5)}" stroke="${shade('#000', 0.4)}" stroke-width="${S(0.9)}" fill="none" opacity=".35"/>`;
    }

    // head: temples wide, jaw tapered, chin rounded
    f += `<path d="M${cx - S(21.5)} ${cy - S(4)} Q${cx - S(22.5)} ${cy - S(26)} ${cx} ${cy - S(28)}
                  Q${cx + S(22.5)} ${cy - S(26)} ${cx + S(21.5)} ${cy - S(4)}
                  Q${cx + S(20.5)} ${cy + S(11)} ${cx + S(14)} ${cy + S(18.5)}
                  Q${cx + S(7.5)} ${cy + S(25)} ${cx} ${cy + S(25)}
                  Q${cx - S(7.5)} ${cy + S(25)} ${cx - S(14)} ${cy + S(18.5)}
                  Q${cx - S(20.5)} ${cy + S(11)} ${cx - S(21.5)} ${cy - S(4)} Z" fill="url(#sk${u})"/>`;
    // cheek hollows + jaw shadow — the semi-realism lives in this grading
    f += `<ellipse cx="${cx - S(13)}" cy="${cy + S(12)}" rx="${S(4.6)}" ry="${S(3.2)}" fill="${shade(SKINS[0], 0)}" opacity="0"/>`;
    f += `<ellipse cx="${cx - S(13)}" cy="${cy + S(12)}" rx="${S(4.4)}" ry="${S(3)}" fill="${shade('#000', 0)}" opacity=".10"/>`;
    f += `<ellipse cx="${cx + S(13)}" cy="${cy + S(12)}" rx="${S(4.4)}" ry="${S(3)}" fill="#000" opacity=".10"/>`;
    f += `<ellipse cx="${cx + S(9)}" cy="${cy - S(10)}" rx="${S(6.5)}" ry="${S(4.5)}" fill="#000" opacity=".06"/>`;
    if (feat.rouge) for (const sx of [-1, 1])
      f += `<ellipse cx="${cx + sx * S(11.5)}" cy="${cy + S(8)}" rx="${S(4.6)}" ry="${S(3)}" fill="#c9665a" opacity=".22"/>`;

    // brows
    const bw = feat.brow === 1 ? 2.4 : feat.brow === 2 ? -1.6 : 0;
    const bwt = feat.brow === 2 ? 3.4 : 2.6;
    for (const [ex, sx] of [[exL, -1], [exR, 1]])
      f += `<path d="M${ex - S(6)} ${ey - S(7.6) + sx * S(bw) * -1} Q${ex} ${ey - S(9.6) + sx * S(bw) * -0.4} ${ex + S(6)} ${ey - S(7.2) + sx * S(bw)}"
                    stroke="${browc}" stroke-width="${S(bwt)}" stroke-linecap="round" fill="none" opacity=".9"/>`;

    // eyes — almond whites, iris, pupil, catchlight, lid line
    const H = feat.eye === 'sharp' ? 2.6 : feat.eye === 'half' ? 2.2 : 3.4;
    for (const [ex, sx] of [[exL, -1], [exR, 1]]) {
      const tilt = feat.eye === 'sharp' ? sx * S(0.9) : 0;
      f += `<path d="M${ex - S(5.2)} ${ey + tilt} Q${ex} ${ey - S(H)} ${ex + S(5.2)} ${ey - tilt} Q${ex} ${ey + S(H * 0.82)} ${ex - S(5.2)} ${ey + tilt} Z" fill="#f0e8d2"/>`;
      f += `<circle cx="${ex}" cy="${ey + S(0.4)}" r="${S(2.7)}" fill="#43301f"/>`;
      f += `<circle cx="${ex}" cy="${ey + S(0.4)}" r="${S(1.4)}" fill="#171008"/>`;
      f += `<circle cx="${ex + S(1)}" cy="${ey - S(0.7)}" r="${S(0.8)}" fill="#fff" opacity=".9"/>`;
      f += `<path d="M${ex - S(5.2)} ${ey + tilt} Q${ex} ${ey - S(H)} ${ex + S(5.2)} ${ey - tilt}" stroke="${shade('#000', 0.1)}" stroke-width="${S(1.4)}" fill="none" opacity=".7"/>`;
      if (feat.eye === 'half') f += `<path d="M${ex - S(5.4)} ${ey - S(1.4)} Q${ex} ${ey - S(4.6)} ${ex + S(5.4)} ${ey - S(1.4)} L${ex + S(5.6)} ${ey - S(2.8)} Q${ex} ${ey - S(6.4)} ${ex - S(5.6)} ${ey - S(2.8)} Z" fill="url(#sk${u})" opacity=".92"/>`;
      if (feat.lashes) for (let i = -1; i <= 1; i++)
        f += `<path d="M${ex + sx * S(4.6)} ${ey - S(1 + i * 1.3)} l${sx * S(2.2)} ${S(-1.5)}" stroke="#0e0a06" stroke-width="${S(0.9)}" stroke-linecap="round"/>`;
    }

    // nose — bridge, tip, nostril wings
    f += `<path d="M${cx + S(1.6)} ${cy + S(2.5)} Q${cx - S(0.6)} ${cy + S(7)} ${cx - S(0.9)} ${cy + S(9.6)}" stroke="#000" stroke-width="${S(1.15)}" fill="none" opacity=".16" stroke-linecap="round"/>`;
    f += `<path d="M${cx - S(3.1)} ${cy + S(11.4)} Q${cx - S(1.1)} ${cy + S(13.1)} ${cx + S(0.4)} ${cy + S(11.9)}" stroke="#000" stroke-width="${S(1.5)}" fill="none" opacity=".34" stroke-linecap="round"/>`;
    f += `<path d="M${cx + S(1.4)} ${cy + S(11.7)} Q${cx + S(3)} ${cy + S(12.4)} ${cx + S(3.9)} ${cy + S(11.2)}" stroke="#000" stroke-width="${S(1.5)}" fill="none" opacity=".3" stroke-linecap="round"/>`;
    f += `<circle cx="${cx - S(0.4)}" cy="${cy + S(9.8)}" r="${S(0.7)}" fill="#fff" opacity=".28"/>`;

    // mouth — lip line, lower-lip light
    const my = cy + S(17);
    const m = feat.mouth;
    if (m === 0) {
      f += `<path d="M${cx - S(6)} ${my} Q${cx} ${my + S(2)} ${cx + S(6)} ${my}" stroke="#5a2c22" stroke-width="${S(1.7)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
      f += `<ellipse cx="${cx}" cy="${my + S(2.6)}" rx="${S(3.4)}" ry="${S(1.2)}" fill="#a15a48" opacity=".35"/>`;
    } else if (m === 1) {
      f += `<path d="M${cx - S(6.5)} ${my - S(0.6)} Q${cx + S(1)} ${my + S(2.6)} ${cx + S(7)} ${my - S(1.6)}" stroke="#5a2c22" stroke-width="${S(1.8)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
      f += `<ellipse cx="${cx + S(1)}" cy="${my + S(2.2)}" rx="${S(3.8)}" ry="${S(1.4)}" fill="#a15a48" opacity=".4"/>`;
    } else {
      f += `<path d="M${cx - S(5.6)} ${my + S(1.4)} Q${cx} ${my - S(1.8)} ${cx + S(5.6)} ${my + S(1.4)}" stroke="#5a2c22" stroke-width="${S(1.8)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
      f += `<ellipse cx="${cx}" cy="${my + S(3)}" rx="${S(2.8)}" ry="${S(1.1)}" fill="#a15a48" opacity=".3"/>`;
    }

    // facial hair
    if (feat.stache === 'pencil')
      f += `<path d="M${cx - S(7)} ${my - S(2.9)} Q${cx} ${my - S(4.7)} ${cx + S(7)} ${my - S(2.9)}" stroke="${browc}" stroke-width="${S(1.7)}" fill="none" stroke-linecap="round"/>`;
    else if (feat.stache === 'handlebar') {
      f += `<path d="M${cx - S(7.5)} ${my - S(2)} Q${cx - S(4)} ${my - S(5)} ${cx} ${my - S(3.4)} Q${cx + S(4)} ${my - S(5)} ${cx + S(7.5)} ${my - S(2)} Q${cx + S(10.5)} ${my - S(0.6)} ${cx + S(10)} ${my - S(2.8)} Q${cx + S(11.5)} ${my - S(2.2)} ${cx + S(10.6)} ${my - S(1)} Q${cx + S(8.6)} ${my + S(0.6)} ${cx + S(6.6)} ${my - S(1)} Q${cx + S(3)} ${my - S(2.4)} ${cx} ${my - S(2.2)} Q${cx - S(3)} ${my - S(2.4)} ${cx - S(6.6)} ${my - S(1)} Q${cx - S(8.6)} ${my + S(0.6)} ${cx - S(10.6)} ${my - S(1)} Q${cx - S(11.5)} ${my - S(2.2)} ${cx - S(10)} ${my - S(2.8)} Q${cx - S(10.5)} ${my - S(0.6)} ${cx - S(7.5)} ${my - S(2)} Z" fill="${browc}"/>`;
    }
    if (feat.beard) {
      f += `<path d="M${cx - S(17)} ${cy + S(4)} Q${cx - S(15.5)} ${cy + S(12)} ${cx - S(12.5)} ${cy + S(17.5)} Q${cx - S(8)} ${cy + S(24.5)} ${cx} ${cy + S(24.8)} Q${cx + S(8)} ${cy + S(24.5)} ${cx + S(12.5)} ${cy + S(17.5)} Q${cx + S(15.5)} ${cy + S(12)} ${cx + S(17)} ${cy + S(4)} L${cx + S(13)} ${cy + S(8)} Q${cx + S(11)} ${cy + S(16)} ${cx} ${cy + S(21)} Q${cx - S(11)} ${cy + S(16)} ${cx - S(13)} ${cy + S(8)} Z" fill="${browc}" opacity=".95"/>`;
      f += `<path d="M${cx - S(6.5)} ${my - S(3.2)} Q${cx} ${my - S(5)} ${cx + S(6.5)} ${my - S(3.2)} L${cx + S(5)} ${my - S(1.4)} Q${cx} ${my - S(2.6)} ${cx - S(5)} ${my - S(1.4)} Z" fill="${browc}"/>`;
    }
    if (feat.chops) for (const sx of [-1, 1])
      f += `<path d="M${cx + sx * S(19.5)} ${cy + 0} q0 ${S(10)} ${sx * S(-3.4)} ${S(15.5)} q${sx * S(-2.6)} ${S(2.4)} ${sx * S(-4.6)} ${S(-0.6)} q${sx * S(2.4)} ${S(-6.6)} ${sx * S(1.4)} ${S(-13.4)} Z" fill="${browc}"/>`;
    if (feat.stubble)
      f += `<path d="M${cx - S(15.5)} ${cy + S(7)} Q${cx - S(13)} ${cy + S(18)} ${cx} ${cy + S(23.5)} Q${cx + S(13)} ${cy + S(18)} ${cx + S(15.5)} ${cy + S(7)} L${cx + S(11.5)} ${cy + S(9)} Q${cx + S(9)} ${cy + S(16.5)} ${cx} ${cy + S(20.5)} Q${cx - S(9)} ${cy + S(16.5)} ${cx - S(11.5)} ${cy + S(9)} Z" fill="${browc}" opacity=".22"/>`;
    if (feat.scar) {
      f += `<path d="M${cx + S(6)} ${cy + S(4)} L${cx + S(12.5)} ${cy + S(13)}" stroke="#d9b9a0" stroke-width="${S(1.3)}" stroke-linecap="round" opacity=".75"/>`;
      f += `<path d="M${cx + S(6.9)} ${cy + S(6.7)} l${S(2.2)} ${S(0.4)} M${cx + S(8.4)} ${cy + S(9)} l${S(2.2)} ${S(0.4)}" stroke="#d9b9a0" stroke-width="${S(0.8)}" opacity=".6"/>`;
    }

    // face-mounted trinkets
    if (acc === 7) { // monocle
      f += `<circle cx="${exR}" cy="${ey + S(0.4)}" r="${S(5.1)}" fill="#fff" opacity=".07" stroke="#d8d2c0" stroke-width="${S(1.5)}"/>`;
      f += `<path d="M${exR + S(4.2)} ${ey + S(3.4)} Q${cx + S(18)} ${cy + S(14)} ${cx + S(15)} ${cy + S(24)}" stroke="#d8d2c0" stroke-width="${S(0.9)}" fill="none" opacity=".7"/>`;
    } else if (acc === 8) { // cigar, unlit but cocky
      f += `<g transform="rotate(14 ${cx + S(8)} ${cy + S(15.5)})"><rect x="${cx + S(4.4)}" y="${cy + S(14)}" width="${S(9.5)}" height="${S(2.9)}" rx="${S(1.4)}" fill="#5a3319"/>`;
      f += `<rect x="${cx + S(11.9)}" y="${cy + S(14)}" width="${S(2)}" height="${S(2.9)}" fill="#8a5a30"/></g>`;
    } else if (acc === 9) { // cigarette holder
      f += `<path d="M${cx + S(4.4)} ${cy + S(15.4)} L${cx + S(14)} ${cy + S(11.6)}" stroke="#2a2015" stroke-width="${S(1.7)}" stroke-linecap="round"/>`;
      f += `<path d="M${cx + S(13)} ${cy + S(12)} L${cx + S(16.6)} ${cy + S(10.6)}" stroke="#e8e0cc" stroke-width="${S(1.9)}" stroke-linecap="round"/>`;
    }
    return f;
  }

  // ---------------------------------------------------------------- hair & hats (shared)
  function headwearSVG(hair, cx, cy, sc, u) {
    const S = (v) => v * sc;
    const hc = hair.c;
    const top = cy - S(28);
    const L = cx - S(21.5), R = cx + S(21.5);
    let f = '';

    function shine(x0, y0, w2, color, op) {
      return `<ellipse cx="${x0}" cy="${y0}" rx="${w2}" ry="${S(2.2)}" fill="${color || '#fff'}" opacity="${op || 0.1}"/>`;
    }
    function capBody() { // what's worn on top; hair underneath is reduced to sideburns
      f2();
      for (const sx of [-1, 1])
        f += `<path d="M${cx + sx * S(18.5)} ${cy - S(2)} q${sx * S(-1.2)} ${S(7)} ${sx * S(-1)} ${S(13)}" stroke="${hc}" stroke-width="${S(1.8)}" fill="none" opacity=".55" stroke-linecap="round"/>`;
    }
    function f2() {} // hair under a cap is hidden — sideburns only

    const t = hair.t;
    if (t === 'short') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(2)} ${cx} ${top - S(2)} Q${cx + S(22.5)} ${top + S(2)} ${R} ${cy - S(4)} Q${cx + S(14)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(14)} ${cy - S(15.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(8)} ${top + S(1)} Q${cx} ${top - S(1.2)} ${cx + S(10)} ${top + S(1.4)}" stroke="#fff" stroke-width="${S(1.6)}" fill="none" opacity=".14" stroke-linecap="round"/>`;
    } else if (t === 'bowl') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23)} ${top - S(1)} ${cx} ${top - S(3)} Q${cx + S(23)} ${top - S(1)} ${R} ${cy - S(4)} Q${cx + S(11)} ${cy - S(10.5)} ${cx} ${cy - S(10.5)} Q${cx - S(11)} ${cy - S(10.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
    } else if (t === 'bob') {
      f += `<path d="M${L} ${cy - S(5)} Q${cx - S(23.5)} ${top - S(2)} ${cx} ${top - S(3)} Q${cx + S(23.5)} ${top - S(2)} ${R} ${cy - S(5)} L${cx + S(22.5)} ${cy + S(9)} Q${cx + S(20)} ${cy + S(20)} ${cx + S(14)} ${cy + S(21)} Q${cx + S(17)} ${cy + S(10)} ${cx + S(16)} ${cy - S(2)} Q${cx + S(8)} ${cy - S(13)} ${cx} ${cy - S(13)} Q${cx - S(8)} ${cy - S(13)} ${cx - S(16)} ${cy - S(2)} Q${cx - S(17)} ${cy + S(10)} ${cx - S(14)} ${cy + S(21)} Q${cx - S(20)} ${cy + S(20)} ${cx - S(22.5)} ${cy + S(9)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(17)} ${cy - S(8)} q${S(-1.5)} ${S(9)} ${S(0.5)} ${S(17)}" stroke="#fff" stroke-width="${S(1.4)}" fill="none" opacity=".1"/>`;
    } else if (t === 'scarf') {
      f += `<path d="M${L - S(1.5)} ${cy - S(3)} Q${cx - S(26.5)} ${top - S(6)} ${cx} ${top - S(8)} Q${cx + S(26.5)} ${top - S(6)} ${R + S(1.5)} ${cy - S(3)} L${R + S(0.5)} ${cy - S(11)} Q${cx + S(13)} ${cy - S(20.5)} ${cx} ${cy - S(20.5)} Q${cx - S(13)} ${cy - S(20.5)} ${L - S(0.5)} ${cy - S(11)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + S(15)} ${cy - S(10)} q${S(7)} ${S(3)} ${S(4.5)} ${S(12)} q${S(-7)} ${S(-3)} ${S(-6)} ${S(-11)} Z" fill="${shade(hc, 0.14)}"/>`;
      f += `<path d="M${cx - S(10)} ${top - S(5)} q${S(10)} ${S(-3.4)} ${S(20.5)} ${S(0.6)}" stroke="${shade(hc, 0.2)}" stroke-width="${S(1.3)}" fill="none" opacity=".8"/>`;
    } else if (t === 'pony') {
      f += `<path d="M${L} ${cy - S(3)} Q${cx - S(22.5)} ${top - S(3)} ${cx} ${top - S(4)} Q${cx + S(22.5)} ${top - S(3)} ${R} ${cy - S(3)} Q${cx + S(12)} ${cy - S(14)} ${cx} ${cy - S(14)} Q${cx - S(12)} ${cy - S(14)} ${L} ${cy - S(3)} Z" fill="${hc}"/>`;
      f += `<path d="M${R - S(1)} ${cy - S(6)} Q${cx + S(33)} ${cy - S(2)} ${cx + S(30)} ${cy + S(26)} Q${cx + S(28)} ${cy + S(40)} ${cx + S(21)} ${cy + S(44)} Q${cx + S(25)} ${cy + S(24)} ${cx + S(19.5)} ${cy + S(6)} Z" fill="${shade(hc, 0.1)}"/>`;
      f += `<path d="M${cx + S(24)} ${cy + S(4)} q${S(4)} ${S(14)} ${S(-0.5)} ${S(30)}" stroke="${shade(hc, -0.25)}" stroke-width="${S(1.2)}" fill="none" opacity=".5"/>`;
    } else if (t === 'waves') {
      f += `<path d="M${L} ${cy - S(5)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(5)} Q${cx + S(13)} ${cy - S(16.5)} ${cx} ${cy - S(16.5)} Q${cx - S(13)} ${cy - S(16.5)} ${L} ${cy - S(5)} Z" fill="${hc}"/>`;
      for (let i = 0; i < 3; i++)
        f += `<path d="M${cx - S(14 + i * 1.5)} ${cy - S(14 + i * 3.4)} q${S(3.4)} ${S(-2.6)} ${S(7)} ${S(0)} q${S(3.6)} ${S(2.6)} ${S(7)} ${S(0)} q${S(3.4)} ${S(-2.6)} ${S(7)} ${S(0)}" stroke="${shade(hc, 0.3)}" stroke-width="${S(1.1)}" fill="none" opacity=".85"/>`;
    } else if (t === 'pomp') {
      f += `<path d="M${L} ${cy - S(3)} Q${cx - S(24)} ${top - S(2)} ${cx - S(9)} ${top - S(4.5)} Q${cx - S(10)} ${top - S(14)} ${cx + S(6)} ${top - S(13)} Q${cx + S(22)} ${top - S(12)} ${cx + S(20)} ${top + S(2)} Q${cx + S(22.5)} ${cy - S(6)} ${R} ${cy - S(3)} Q${cx + S(12)} ${cy - S(15)} ${cx} ${cy - S(15)} Q${cx - S(12)} ${cy - S(15)} ${L} ${cy - S(3)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(7)} ${top - S(9)} q${S(9)} ${S(-1.8)} ${S(15)} ${S(3.6)}" stroke="#fff" stroke-width="${S(1.7)}" fill="none" opacity=".13" stroke-linecap="round"/>`;
    } else if (t === 'bald') {
      f += `<ellipse cx="${cx - S(6)}" cy="${top + S(4)}" rx="${S(6.5)}" ry="${S(3)}" fill="#fff" opacity=".09"/>`;
      for (const sx of [-1, 1])
        f += `<path d="M${cx + sx * S(19)} ${cy - S(1)} q0 ${S(5)} ${sx * S(-0.8)} ${S(9)}" stroke="${hc}" stroke-width="${S(1.5)}" fill="none" opacity=".5" stroke-linecap="round"/>`;
    } else if (t === 'side') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(8)} ${cy - S(13)} ${cx + S(1)} ${cy - S(16)} L${cx - S(2)} ${cy - S(14)} Q${cx - S(13)} ${cy - S(12.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + S(1)} ${cy - S(16)} L${cx - S(2)} ${top + S(0.6)}" stroke="${shade(hc, 0.45)}" stroke-width="${S(1.2)}" opacity=".9"/>`;
      f += `<path d="M${cx + S(4)} ${top + S(2)} q${S(8)} ${S(0)} ${S(13)} ${S(2.6)}" stroke="#fff" stroke-width="${S(1.5)}" fill="none" opacity=".12" stroke-linecap="round"/>`;
    } else if (t === 'curls') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top - S(1)} ${cx} ${top - S(3)} Q${cx + S(22.5)} ${top - S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(15)} ${cx} ${cy - S(15)} Q${cx - S(13)} ${cy - S(15)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      const bumps = [[-17, -6], [-11, -13], [-3, -16.5], [5, -16], [13, -12], [18.5, -5.5]];
      for (const [bx, by] of bumps)
        f += `<circle cx="${cx + S(bx)}" cy="${cy + S(by)}" r="${S(3.4)}" fill="${shade(hc, 0.08)}"/>`;
    }

    if (!hair.cap && t !== 'scarf') capBody(); // sideburns when the crown is bare of a hat

    // ---- hats
    const cap = hair.cap;
    if (cap === 'flat') {
      f += `<path d="M${L - S(2.5)} ${cy - S(9)} Q${cx - S(24)} ${top - S(6)} ${cx} ${top - S(7)} Q${cx + S(24)} ${top - S(6)} ${R + S(2.5)} ${cy - S(9)} Q${cx + S(13)} ${cy - S(16.5)} ${cx} ${cy - S(16.5)} Q${cx - S(13)} ${cy - S(16.5)} ${L - S(2.5)} ${cy - S(9)} Z" fill="${shade(hc, 0.07)}"/>`;
      f += `<path d="M${cx - S(9.5)} ${cy - S(17.5)} Q${cx} ${cy - S(19.5)} ${cx + S(9.5)} ${cy - S(17.5)} L${cx + S(7)} ${cy - S(13.6)} Q${cx} ${cy - S(15.1)} ${cx - S(7)} ${cy - S(13.6)} Z" fill="${shade(hc, -0.18)}"/>`;
      f += `<circle cx="${cx}" cy="${top - S(6.4)}" r="${S(1.5)}" fill="${shade(hc, -0.15)}"/>`;
      f += `<path d="M${cx - S(12)} ${top - S(4.6)} q${S(12)} ${S(-2.4)} ${S(24)} ${S(0)}" stroke="#000" stroke-width="${S(1)}" fill="none" opacity=".15"/>`;
    } else if (cap === 'bowler') {
      f += `<ellipse cx="${cx}" cy="${cy - S(13)}" rx="${S(26.5)}" ry="${S(4.6)}" fill="${shade(hc, -0.1)}"/>`;
      f += `<path d="M${cx - S(19)} ${cy - S(13)} Q${cx - S(19.5)} ${top - S(12.5)} ${cx} ${top - S(13.5)} Q${cx + S(19.5)} ${top - S(12.5)} ${cx + S(19)} ${cy - S(13)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(19.2)} ${cy - S(14)} Q${cx} ${cy - S(20.5)} ${cx + S(19.2)} ${cy - S(14)} L${cx + S(19.2)} ${cy - S(11.4)} Q${cx} ${cy - S(17)} ${cx - S(19.2)} ${cy - S(11.4)} Z" fill="${shade(hc, -0.35)}"/>`;
      f += shine(cx - S(7), top - S(8), S(5));
    } else if (cap === 'trilby') {
      f += `<ellipse cx="${cx}" cy="${cy - S(13.5)}" rx="${S(25)}" ry="${S(4.2)}" fill="${shade(hc, -0.12)}" transform="rotate(-3 ${cx} ${cy - S(13.5)})"/>`;
      f += `<path d="M${cx - S(16.5)} ${cy - S(14)} Q${cx - S(17.5)} ${top - S(12)} ${cx - S(6)} ${top - S(13)} L${cx + S(6)} ${top - S(13)} Q${cx + S(17.5)} ${top - S(12)} ${cx + S(16.5)} ${cy - S(14)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(6)} ${top - S(13)} q${S(6)} ${S(-1.7)} ${S(12)} ${S(0)} l0 ${S(2.2)} q${S(-6)} ${S(1.7)} ${S(-12)} ${S(0)} Z" fill="${shade(hc, -0.3)}"/>`;
      f += `<path d="M${cx - S(16.8)} ${cy - S(15)} Q${cx} ${cy - S(21)} ${cx + S(16.8)} ${cy - S(15)} L${cx + S(16.8)} ${cy - S(12.6)} Q${cx} ${cy - S(18)} ${cx - S(16.8)} ${cy - S(12.6)} Z" fill="${shade(hc, -0.32)}"/>`;
    } else if (cap === 'newsboy') {
      f += `<path d="M${L - S(4)} ${cy - S(9.5)} Q${cx - S(26)} ${top - S(9)} ${cx} ${top - S(10)} Q${cx + S(26)} ${top - S(9)} ${R + S(4)} ${cy - S(9.5)} Q${cx + S(13)} ${cy - S(18.5)} ${cx} ${cy - S(18.5)} Q${cx - S(13)} ${cy - S(18.5)} ${L - S(4)} ${cy - S(9.5)} Z" fill="${shade(hc, 0.05)}"/>`;
      for (const sx of [-1, -0.5, 0, 0.5, 1])
        f += `<path d="M${cx + sx * S(20)} ${cy - S(13)} Q${cx + sx * S(8)} ${top - S(2)} ${cx} ${top - S(9)}" stroke="${shade(hc, -0.2)}" stroke-width="${S(1)}" fill="none" opacity=".8"/>`;
      f += `<circle cx="${cx}" cy="${top - S(9.2)}" r="${S(1.6)}" fill="${shade(hc, -0.2)}"/>`;
      f += `<path d="M${cx - S(10)} ${cy - S(19)} Q${cx} ${cy - S(21.4)} ${cx + S(10)} ${cy - S(19)} L${cx + S(7.4)} ${cy - S(15.4)} Q${cx} ${cy - S(17)} ${cx - S(7.4)} ${cy - S(15.4)} Z" fill="${shade(hc, -0.2)}"/>`;
    } else if (cap === 'cloche') {
      f += `<path d="M${L - S(1.5)} ${cy - S(2)} Q${cx - S(24.5)} ${top - S(11)} ${cx} ${top - S(12)} Q${cx + S(24.5)} ${top - S(11)} ${R + S(1.5)} ${cy - S(2)} Q${cx + S(12)} ${cy - S(7.5)} ${cx} ${cy - S(7.5)} Q${cx - S(12)} ${cy - S(7.5)} ${L - S(1.5)} ${cy - S(2)} Z" fill="${hc}"/>`;
      f += `<path d="M${L - S(1.5)} ${cy - S(2)} Q${cx} ${cy - S(7.9)} ${R + S(1.5)} ${cy - S(2)} L${R + S(1.8)} ${cy + S(0.4)} Q${cx} ${cy - S(5.4)} ${L - S(1.8)} ${cy + S(0.4)} Z" fill="${shade(hc, -0.25)}"/>`;
      f += `<path d="M${cx + S(8)} ${top - S(8)} q${S(8)} ${S(2.4)} ${S(9)} ${S(7.4)}" stroke="${shade(hc, 0.22)}" stroke-width="${S(1.4)}" fill="none" opacity=".8" stroke-linecap="round"/>`;
    } else if (cap === 'boater') {
      f += `<ellipse cx="${cx}" cy="${cy - S(11)}" rx="${S(27)}" ry="${S(4.6)}" fill="${shade(hc, -0.06)}"/>`;
      f += `<path d="M${cx - S(20)} ${cy - S(11)} L${cx - S(19)} ${top - S(6)} Q${cx} ${top - S(10.5)} ${cx + S(19)} ${top - S(6)} L${cx + S(20)} ${cy - S(11)} Z" fill="${hc}"/>`;
      f += `<ellipse cx="${cx}" cy="${top - S(6)}" rx="${S(19.4)}" ry="${S(3.4)}" fill="${shade(hc, 0.08)}"/>`;
      f += `<path d="M${cx - S(20.1)} ${cy - S(12.6)} L${cx - S(19.4)} ${cy - S(17.6)} Q${cx} ${cy - S(21.6)} ${cx + S(19.4)} ${cy - S(17.6)} L${cx + S(20.1)} ${cy - S(12.6)} Q${cx} ${cy - S(16.2)} ${cx - S(20.1)} ${cy - S(12.6)} Z" fill="#2a2320"/>`;
      f += `<path d="M${cx - S(13)} ${top - S(7.6)} q${S(13)} ${S(-2.8)} ${S(26)} ${S(0.2)}" stroke="#000" stroke-width="${S(1.1)}" fill="none" opacity=".12"/>`;
    }
    return f;
  }

  // ---------------------------------------------------------------- small portrait (lists, header, creator strip)
  function svgFor(s, size, glowColor) {
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'p';
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], shirt = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const style = SHIRT_STYLE[p.shirt];
    const aIdx = p.accent;
    const glow = glowColor || acc;
    const bg2 = '#141109', bg1 = shade(glow, -0.86);
    const cx = 60, cy = 50, sc = 1.12;
    let f = '';

    // bust: coat shoulders + lapels + collar
    f += `<path d="M12 120 L12 100 Q12 79 40 74 L51 71.5 Q60 80 69 71.5 L80 74 Q108 79 108 100 L108 120 Z" fill="url(#ct${u})"/>`;
    for (const sx of [-1, 1]) { // coat lapels, peak style
      const x0 = cx + sx * 9, x1 = cx + sx * 21;
      f += `<path d="M${x0} 73 L${x1} 84 L${cx + sx * 13} 97 L${x0 - sx * 4} 82 Z" fill="${shade(coatFor(style, shirt), 0.14)}"/>`;
      f += `<path d="M${x0} 73 L${x1} 84 L${cx + sx * 13} 97" fill="none" stroke="${shade(shirt, 0.3)}" stroke-width="1" opacity=".6"/>`;
    }
    if (style === 'pinstripe') for (let x = 26; x <= 94; x += 7)
      f += `<path d="M${x} ${x < 51 ? 77 : 88} L${x + 2.5} 120" stroke="#e8e2cf" stroke-width=".8" opacity=".16"/>`;
    // shirt + tie at the throat
    f += `<path d="M49 88 L60 76 L71 88 L66 120 L54 120 Z" fill="#e8e0cd"/>`;
    f += `<path d="M53 84 L60 74 L67 84 L60 81 Z" fill="#f4ecd8"/>`;
    if (style === 'tails') {
      f += `<path d="M60 78.5 L52 74.6 L52 82.6 Z M60 78.5 L68 74.6 L68 82.6 Z" fill="#f4f0e4"/>`;
      f += `<rect x="58.3" y="76.6" width="3.4" height="4.4" rx="1" fill="#d8d2c0"/>`;
    } else if (aIdx === 12) {
      f += `<path d="M56.4 76 Q60 81.5 63.6 76 L65 86 Q60 90.5 55 86 Z" fill="${acc}"/>`;
      f += `<circle cx="58.4" cy="80.5" r=".9" fill="#dfe6f0"/><circle cx="61.6" cy="83.5" r=".9" fill="#dfe6f0"/>`;
    } else if (aIdx === 10) {
      f += `<path d="M49.5 79 Q60 71.5 70.5 79 L68.6 86 Q60 80.5 51.4 86 Z" fill="${acc}"/>`;
    } else {
      const tieC = aIdx === 4 ? acc : '#26201c';
      f += `<path d="M56.6 77 L60 85 L63.4 77 L60 73.6 Z" fill="${shade(tieC, 0.12)}"/>`;
      f += `<path d="M60 85 L57 110 Q60 113 63 110 Z" fill="${tieC}"/>`;
      if (aIdx === 11) f += `<rect x="55.4" y="92" width="9.2" height="1.8" rx=".8" fill="${acc}"/>`;
    }
    f += `<rect x="52.5" y="64" width="15" height="16" rx="5" fill="${shade(skin, -0.2)}"/>`;
    f += `<ellipse cx="60" cy="78" rx="9" ry="3.6" fill="#000" opacity=".18"/>`;

    // head
    f += faceSVG(feat, hair, p.accent, cx, cy, sc, u);
    f += headwearSVG(hair, cx, cy, sc, u);

    // vignette + rim light
    f += `<path d="M14 100 Q14 80 40 74.5" fill="none" stroke="${shade(glow, 0.5)}" stroke-width="1.6" opacity=".3"/>`;

    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" xmlns="http://www.w3.org/2000/svg">
      ${defsGrad(u, skin, coatFor(style, shirt), acc)}
      <defs><linearGradient id="pg${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
      <rect width="120" height="120" fill="url(#pg${u})"/>
      <ellipse cx="60" cy="52" rx="44" ry="40" fill="url(#gl${u})"/>
      ${f}
    </svg>`;
  }

  function coatFor(style, shirt) {
    if (style === 'tails') return shade(shirt, 0.02);
    if (style === 'moleskin') return shade(shirt, 0.04);
    return shirt;
  }

  // ---------------------------------------------------------------- full paper-doll
  function doll(s, size, opts) {
    opts = opts || {};
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'd';
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], coat = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const style = SHIRT_STYLE[p.shirt];
    const coatC = coatFor(style, coat);
    const coatDark = shade(coatC, -0.28), coatLight = shade(coatC, 0.12);
    const vest = style === 'tails' ? '#e6ddc6' : shade(coatC, 0.18), vestDark = shade(vest, -0.2);
    const shirtWhite = style === 'moleskin' ? '#c9b894' : '#e8e0cd';
    const S = size || 220;
    const VB_W = 120, VB_H = 254, DROP = 10;
    const H = Math.round(S * (VB_H / VB_W));
    const aIdx = p.accent;
    let f = '';

    // ground shadow
    f += `<ellipse cx="60" cy="230" rx="32" ry="6.5" fill="#000" opacity=".4"/>`;

    // ---- trousers: tapered legs, crease, knee shading
    f += `<path d="M44 141 L50 208 L58.5 208 L60 158 L61.5 208 L70 208 L76 141 Z" fill="url(#tr${u})"/>`;
    f += `<path d="M50 150 L54 206 M60 158 L60 170 M66 150 L70 206" stroke="${shade(coatC, -0.5)}" stroke-width="1" opacity=".45" fill="none"/>`;
    f += `<ellipse cx="54" cy="178" rx="4.4" ry="7" fill="#000" opacity=".12"/><ellipse cx="66" cy="178" rx="4.4" ry="7" fill="#000" opacity=".12"/>`;

    // ---- laced boots
    for (const sx of [-1, 1]) {
      const x0 = 60 + sx * 6.5;
      f += `<path d="M${x0 - 5.6} 199 h11.2 v16 q0 7.4 ${sx * 4.4} 8.6 q${sx * 8.2} 0 ${sx * 9.2} -4.6 v-14 q0 -6 -5.2 -6 z" fill="url(#bt${u})"/>`;
      f += `<path d="M${x0 - 5.6} 199 h11.2" stroke="${shade(coatC, -0.18)}" stroke-width="1.2" opacity=".8"/>`;
      f += `<path d="M${x0 - 5.8} 222.4 q6.4 3.6 ${sx * 11.6} 1.6" stroke="#000" stroke-width="1.7" fill="none" opacity=".55"/>`;
      for (let i = 0; i < 3; i++) f += `<path d="M${x0 - 3.8} ${204 + i * 3.4} l7.6 0" stroke="${shade(coatC, 0.42)}" stroke-width=".95" opacity=".8"/>`;
      f += `<ellipse cx="${x0 + sx * 2.4}" cy="203" rx="3.6" ry="1.5" fill="#fff" opacity=".16"/>`;
      f += `<path d="M${x0 - 5.6} 216 q${sx * 5.6} 2.4 ${sx * 11.4} 0.4" stroke="${shade(coatC, -0.05)}" stroke-width=".9" fill="none" opacity=".6"/>`; // toe cap seam
    }

    // ---- shirt base + waistcoat
    f += `<path d="M46.5 143 L46.5 88 Q46.5 74 58 70.5 L62 70.5 Q73.5 74 73.5 88 L73.5 143 Z" fill="${shirtWhite}"/>`;
    f += `<path d="M46.5 146 L46.5 90 Q46.5 81 56 78.5 L60 96 L64 78.5 Q73.5 81 73.5 90 L73.5 146 Z" fill="${vest}"/>`;
    f += `<path d="M46.5 146 L46.5 90 Q46.5 81 56 78.5 L60 96 L58 146 Z" fill="${vestDark}" opacity=".5"/>`;
    f += `<path d="M46.5 90 L73.5 90" stroke="${shade(vest, 0.3)}" stroke-width=".7" opacity=".4"/>`;
    for (const y of [104, 114, 124]) f += `<circle cx="60" cy="${y}" r="1.7" fill="${shade(vest, -0.45)}" stroke="${shade(vest, 0.35)}" stroke-width=".4"/>`;
    f += `<path d="M49 108 h6.5 M64.5 108 h6.5" stroke="${vestDark}" stroke-width="1.1" opacity=".7"/>`;

    // collar + neckwear
    f += `<path d="M52.5 88 L60 78 L56.5 98 Z" fill="#f2ead6"/><path d="M67.5 88 L60 78 L63.5 98 Z" fill="#f2ead6"/>`;
    if (style === 'tails') { // white bow tie
      f += `<path d="M60 84 L52.5 80 L52.5 88 Z M60 84 L67.5 80 L67.5 88 Z" fill="#f4f0e4"/><rect x="58.4" y="82" width="3.2" height="4.2" rx="1" fill="#d8d2c0"/>`;
    } else if (aIdx === 12) { // polka cravat
      f += `<path d="M56.5 82 Q60 87 63.5 82 L65 92 Q60 96 55 92 Z" fill="${acc}"/>`;
      f += `<circle cx="58.5" cy="86" r=".9" fill="#dfe6f0"/><circle cx="61.5" cy="89" r=".9" fill="#dfe6f0"/>`;
    } else { // four-in-hand tie
      const tieC = aIdx === 4 ? acc : '#26201c';
      f += `<path d="M57 82.5 L60 90 L63 82.5 L60 79 Z" fill="${shade(tieC, 0.12)}"/>`;
      f += `<path d="M60 90 L57.4 112 Q60 114.4 62.6 112 Z" fill="${tieC}"/>`;
      f += `<path d="M60 90 L58.6 104 M60 90 L61.4 104" stroke="${shade(tieC, -0.3)}" stroke-width=".7" opacity=".6"/>`;
      if (aIdx === 11) f += `<rect x="55.6" y="96" width="8.8" height="1.7" rx=".8" fill="${acc}" stroke="#000" stroke-width=".3"/>`; // tie pin
    }

    // accent lives on the waistcoat / neck
    if (aIdx === 0) { // watch chain
      f += `<path d="M51 100 Q60 113 69 100" stroke="${acc}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M51.6 100.8 Q60 112 68.4 100.8" stroke="${shade(acc, 0.3)}" stroke-width=".7" fill="none"/>`;
      f += `<circle cx="67" cy="106" r="3" fill="${acc}" stroke="${shade(acc, -0.35)}" stroke-width=".7"/>`;
      f += `<circle cx="67" cy="106" r="1.3" fill="${shade(acc, 0.4)}"/>`;
    } else if (aIdx === 3) {
      f += `<circle cx="60" cy="114" r="2" fill="${acc}" stroke="${shade(acc, -0.35)}" stroke-width=".5"/><circle cx="59.4" cy="113.4" r=".55" fill="#fff" opacity=".8"/>`;
    } else if (aIdx === 10) { // silk scarf, draped over the collar
      f += `<path d="M50 84 Q60 77 70 84 L68 91 Q60 86 52 91 Z" fill="${acc}"/>`;
      f += `<path d="M55 88 L53.5 118 Q57 120.5 60 118 L59 90 Z" fill="${shade(acc, -0.12)}"/><path d="M65 88 L66.5 118 Q63 120.5 60 118 L61 90 Z" fill="${acc}"/>`;
      f += `<path d="M53.5 118 h3 M57 119 h3 M63.5 119 h3 M66 118 h3" stroke="${shade(acc, 0.35)}" stroke-width=".8"/>`;
    }

    // ---- arms: coat sleeves pushed out past the body panels, hands drawn LAST (after the coat)
    const armDefs = [];
    for (const sx of [-1, 1]) {
      const gs = sx === -1 ? 1 : -1;
      const ax = (v) => 60 + sx * v;
      f += `<path d="M${ax(20.5)} 78 Q${ax(29.5)} 87 ${ax(31.5)} 110 Q${ax(33)} 134 ${ax(29)} 152 L${ax(18.5)} 150 Q${ax(22.5)} 126 ${ax(15)} 92 Z" fill="${shade(coatC, -0.14)}"/>`;
      f += `<path d="M${ax(20.5)} 78.5 Q${ax(29.5)} 88 ${ax(31)} 110 Q${ax(32.4)} 132 ${ax(28.8)} 150" fill="none" stroke="${coatDark}" stroke-width="1.3" opacity=".7"/>`;
      f += `<path d="M${ax(21)} 88 Q${ax(26.5)} 96 ${ax(26.5)} 118" fill="none" stroke="${shade(coatC, 0.22)}" stroke-width=".9" opacity=".4"/>`; // bicep light
      armDefs.push({ sx, gs });
    }

    // ---- overcoat: open front, peaked lapels, long skirt with drape
    for (const sx of [-1, 1]) {
      f += `<path d="M${60 + sx * 19.5} 75.5 Q${60 + sx * 28.5} 84 ${60 + sx * 30.5} 108 L${60 + sx * 32.5} 184 Q${60 + sx * 29} 189 ${60 + sx * 23.5} 187 L${60 + sx * 16.5} 148 Z" fill="url(#ct${u})"/>`;
      f += `<path d="M${60 + sx * 19.5} 75.5 Q${60 + sx * 31} 92 ${60 + sx * 32} 130" fill="none" stroke="${coatDark}" stroke-width="1.2" opacity=".5"/>`;
      f += `<path d="M${60 + sx * 31.5} 150 q${sx * 1.6} 22 ${sx * 0.6} 34" stroke="${coatDark}" stroke-width="1.1" fill="none" opacity=".45"/>`; // hem fold
      // lapel: notch at neck, peak rolled outward
      f += `<path d="M${60 + sx * 15.5} 74 L${60 + sx * 5.5} 93.5 L${60 + sx * 10} 96 L${60 + sx * 8.5} 82.5 L${60 + sx * 13.8} 88.5 L${60 + sx * 17.2} 76.5 Z" fill="${style === 'velvet' ? '#191921' : coatLight}"/>`;
      f += `<path d="M${60 + sx * 15.5} 74 L${60 + sx * 5.5} 93.5" stroke="${shade(coatC, 0.34)}" stroke-width=".9" opacity=".55"/>`;
      // skirt swing behind the legs
      f += `<path d="M${60 + sx * 16.5} 148 L${60 + sx * 23.5} 187 L${60 + sx * 20} 188.6 L${60 + sx * 12.5} 186.8 L${60 + sx * 13.5} 148 Z" fill="${shade(coatC, -0.1)}"/>`;
    }
    if (style === 'pinstripe' || style === 'check') {
      const clipId = `clip${u}`;
      f += `<defs><clipPath id="${clipId}"><path d="M28 70 Q40 74 44 84 L42 148 L27 190 L50 184 L48 70 Z M92 70 Q80 74 76 84 L78 148 L93 190 L70 184 L72 70 Z"/></clipPath></defs>`;
      if (style === 'pinstripe') f += `<g clip-path="url(#${clipId})">${[30, 37, 44, 51, 69, 76, 83, 90].map(x => `<path d="M${x} 70 L${x - 2} 190" stroke="#e8e2cf" stroke-width=".8" opacity=".18"/>`).join('')}</g>`;
      else f += `<g clip-path="url(#${clipId})">${[76, 108, 140, 172].map(y => `<path d="M26 ${y} L94 ${y - 4}" stroke="#1c2018" stroke-width="1.4" opacity=".22"/>`).join('')}${[34, 54, 74, 90].map(x => `<path d="M${x} 70 L${x - 2} 188" stroke="#1c2018" stroke-width="1.2" opacity=".22"/>`).join('')}</g>`;
    }
    // breast pocket + squares / flowers / pins on the character's left lapel side
    f += `<path d="M70.5 104.5 h8" stroke="${coatDark}" stroke-width="1.4"/>`;
    if (aIdx === 5) f += `<path d="M71.5 104.5 L74.5 97.5 L77.8 104.5 Z" fill="${acc}"/><path d="M73 101 L74.5 97.5 L76 101" stroke="${shade(acc, -0.2)}" stroke-width=".7" fill="none"/>`;
    if (aIdx === 6) { f += `<circle cx="74.6" cy="98.6" r="2.1" fill="${acc}"/><circle cx="73.4" cy="100.2" r="1.7" fill="${shade(acc, 0.14)}"/><circle cx="75.6" cy="100.6" r="1.6" fill="${shade(acc, -0.12)}"/><path d="M74.4 101 L74 106.5" stroke="#2e5126" stroke-width=".9"/><ellipse cx="72.6" cy="104" rx="2" ry=".9" fill="#2e5126" transform="rotate(28 72.6 104)"/>`; }
    if (aIdx === 1) f += `<path d="M47.2 92.6 L48.8 94.2 L47.2 95.8 L45.6 94.2 Z" fill="${acc}" stroke="${shade(acc, 0.35)}" stroke-width=".5"/>`;
    if (aIdx === 8) f += `<path d="M44 112 q2.4 -1.2 4.8 0" stroke="${shade(acc, -0.2)}" stroke-width=".9" opacity=".5" fill="none"/>`; // ash

    // ---- cuffs + hands, over the coat skirt
    for (const { sx, gs } of armDefs) {
      const ax = (v) => 60 + sx * v;
      f += `<path d="M${ax(19)} 148.5 L${ax(28.6)} 151 L${ax(27.9)} 155.4 L${ax(18.4)} 153 Z" fill="${shirtWhite}"/>`;
      f += `<path d="M${ax(18.6)} 148.7 L${ax(28.8)} 151.3" stroke="${shade(shirtWhite, -0.35)}" stroke-width=".7" opacity=".7"/>`;
      if (aIdx === 2) { f += `<circle cx="${ax(23.6)}" cy="151.6" r="1.4" fill="${ACCENTS[2]}"/><circle cx="${ax(23.2)}" cy="151.1" r=".45" fill="#fff"/>`; }
      const hx = ax(23.4), hy = 160;
      f += `<ellipse cx="${hx}" cy="${hy}" rx="6.3" ry="7" fill="url(#sk${u})"/>`;
      f += `<ellipse cx="${hx + gs * 4.8}" cy="${hy - 2}" rx="2.3" ry="3.3" fill="url(#sk${u})" transform="rotate(${gs * 26} ${hx + gs * 4.8} ${hy - 2})"/>`;
      f += `<path d="M${hx - 2.8} ${hy + 2.8} q.4 2.5 -.3 4.2 M${hx + 0.5} ${hy + 3.4} q.5 2.3 0 4.3 M${hx + 3.7} ${hy + 2.5} q.6 2.3 .5 4" stroke="${shade(skin, -0.34)}" stroke-width=".95" fill="none" opacity=".85" stroke-linecap="round"/>`;
      f += `<ellipse cx="${hx - gs * 2}" cy="${hy - 2.8}" rx="2.5" ry="1.6" fill="#fff" opacity=".12"/>`;
      f += `<ellipse cx="${hx}" cy="${hy + 5.6}" rx="4.6" ry="1.3" fill="#000" opacity=".14"/>`; // knuckle shade
    }

    // ---- neck + head
    f += `<rect x="53.5" y="60" width="13" height="17" rx="5.5" fill="${shade(skin, -0.2)}"/>`;
    f += `<ellipse cx="60" cy="74" rx="8.6" ry="3.4" fill="#000" opacity=".2"/>`;
    f += faceSVG(feat, hair, aIdx, 60, 42, 1.02, u);
    f += headwearSVG(hair, 60, 42, 1.02, u);

    // studio rim light down the left side
    f += `<path d="M40.5 75.5 Q32 84 30 108 L28.6 182" fill="none" stroke="${shade(acc, 0.5)}" stroke-width="1.7" opacity=".3"/>`;
    f += `<path d="M46 22 Q52 14 60 13.6" fill="none" stroke="#fff" stroke-width="1.4" opacity=".14" stroke-linecap="round"/>`;

    return `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="${Math.round(S)}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg" class="doll-svg">
      ${defsGrad(u, skin, coatC, acc)}
      <defs><linearGradient id="dg${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(acc, -0.9)}"/><stop offset="60%" stop-color="#171309"/><stop offset="100%" stop-color="#0e0b06"/>
      </linearGradient></defs>
      ${opts.plainBg ? '' : `<rect width="${VB_W}" height="${VB_H}" fill="url(#dg${u})"/>`}
      <g transform="translate(0,${DROP})">${f}</g>
    </svg>`;
  }

  function svgDataUri(s, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)); }
  function dollDataUri(s, size, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size, opts)); }

  window.AV = {
    svgFor, doll, svgDataUri, dollDataUri, parts, wear,
    SKINS, SKIN_NAMES, HAIRS, SHIRTS, SHIRT_NAMES, SHIRT_STYLE, ACCENTS, ACCENT_NAMES, FACE_FEAT,
    nameOf(kind, i) {
      const t = { skin: SKIN_NAMES, hair: HAIRS.map(h => h.n), shirt: SHIRT_NAMES, accent: ACCENT_NAMES, face: FACE_FEAT.map(x => x.n) };
      return ((t[kind] || [])[i]) || '';
    }
  };
})();
