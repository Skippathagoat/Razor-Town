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
    { c: '#5b3317', t: 'curls',                 n: 'Loose curls' },
    { c: '#3d3040', t: 'short', cap: 'beanie',  n: 'Ribbed beanie' },
    { c: '#20262e', t: 'short', cap: 'snapback', n: 'Snapback, flat brim' },
    { c: '#4a4034', t: 'short', cap: 'bucket',  n: 'Bucket hat' },
    { c: '#7d2f33', t: 'short', cap: 'bandana', n: 'Bandana wrap' },
    { c: '#2b3238', t: 'short', cap: 'capback', n: 'Dad cap, backwards' },
    { c: '#171310', t: 'cornrows',              n: 'Cornrows, tight' }
  ];

  const SHIRTS = ['#2b2722', '#3a2020', '#24323b', '#20291f', '#4a3a24', '#38261c', '#262b33', '#3c3a30',
                  '#21232c', '#3c4038', '#1f2430', '#141414', '#4c4433', '#5c5347', '#22303a', '#57262f',
                  '#2f323a', '#7d2f33', '#1f4d3a', '#28395c', '#334532', '#26262e', '#5c3d2b', '#39455a',
                  '#d8d2c0', '#23232a', '#55606c', '#4c6a6e', '#3a506e', '#6e3a2f', '#4a5570', '#34383f',
                  '#16161a', '#20242a', '#2a3038'];
  const SHIRT_NAMES = ['Charcoal twill', 'Oxblood tweed', 'Canal blue serge', 'Moss green wool',
                       'Tobacco brown', 'Rust herringbone', 'Midnight gabardine', 'Dun grey worsted',
                       'Midnight pinstripe', 'Gun-club check', 'Chesterfield, velvet collar', 'Evening dress',
                       'Moleskin work coat', 'Cavalry duster', 'Navy reefer', 'Burgundy corduroy',
                       'Slate pullover hoodie', 'Crimson pullover hoodie', 'Forest track jacket', 'Indigo track jacket',
                       'Olive flight bomber', 'Black satin bomber', 'Chocolate puffer', 'Glacier puffer',
                       'Off-white crew tee', 'Black graphic crew tee', 'Grey rib tank', 'Teal pique polo',
                       'Indigo denim trucker', 'Rust flannel overshirt', 'Navy panel windbreaker', 'Grey-letter varsity',
                       'Black moto leathers', 'Graphite tech shell', 'Slate utility gilet'];
  const SHIRT_STYLE = ['plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain',
                       'pinstripe', 'check', 'velvet', 'tails', 'moleskin', 'duster', 'peacoat', 'plain',
                       'hoodie', 'hoodie', 'track', 'track', 'bomber', 'bomber', 'puffer', 'puffer',
                       'tee', 'tee', 'tank', 'polo', 'denim', 'flannel', 'wind', 'varsity',
                       'moto', 'tech', 'gilet'];

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
                   '#7d2432', '#8a8d91', '#2b3a55',
                   '#d4af5a', '#c8cdd4', '#e6e2d6', '#2b2318', '#1c1c20', '#b0b6bd',
                   '#26b8c9', '#6d4c2f', '#d9c36a', '#c8cdd4', '#8f2f28', '#9aa0a8'];
  const ACCENT_NAMES = ['Gold watch chain', 'Oxblood pin', 'Ivory cufflinks', 'Green enamel stud', 'Teal silk tie',
                        'Cream pocket square', 'Red carnation', 'Silver monocle', 'Unlit cigar', 'Cigarette holder',
                        'Burgundy silk scarf', 'Steel tie pin', 'Navy polka cravat',
                        'Cuban link chain', 'Silver curb chain', 'Diamond-drop pendant', 'Aviator shades', 'Wayfarer shades',
                        'Round wire specs', 'Smartwatch', 'Field watch, leather strap', 'Stud earring', 'Silver hoops',
                        'Skull bandana necktie', 'Dog tags, army'];

  // Modern streetwear branch of the wardrobe: same 5-part spec, new garment styles.
  // Each style drives silhouette, collar, fasteners and what the equipment sheet says for legs/feet.
  const MODERN = { hoodie: 1, track: 1, bomber: 1, puffer: 1, tee: 1, tank: 1, polo: 1, denim: 1, flannel: 1, wind: 1, varsity: 1, moto: 1, tech: 1, gilet: 1 };
  const GARMENT = {
    hoodie: { bottom: 'Slim joggers', shoes: 'Chunky trainers', layer: 'Fleece hood' },
    track: { bottom: 'Track bottoms', shoes: 'Running trainers', layer: 'Ribbed cuffs' },
    bomber: { bottom: 'Dark cargo pants', shoes: 'Combat boots', layer: 'Ribbed hem' },
    puffer: { bottom: 'Nylon cargos', shoes: 'Trail boots', layer: 'Quilted outer' },
    tee: { bottom: 'Straight jeans', shoes: 'Canvas low-tops', layer: 'Cotton crew' },
    tank: { bottom: 'Basketball shorts', shoes: 'High-tops', layer: 'Ribbed cut' },
    polo: { bottom: 'Chinos', shoes: 'Loafers', layer: 'Knit collar' },
    denim: { bottom: 'Black jeans', shoes: 'Chukka boots', layer: 'Denim outer' },
    flannel: { bottom: 'Faded jeans', shoes: 'Skate shoes', layer: 'Open overshirt' },
    wind: { bottom: 'Cuffed joggers', shoes: 'Racing trainers', layer: 'Shell panel' },
    varsity: { bottom: 'Straight jeans', shoes: 'Court sneakers', layer: 'Contrast sleeves' },
    moto: { bottom: 'Slim black jeans', shoes: 'Engineer boots', layer: 'Asymmetric zip' },
    tech: { bottom: 'Parachute cargos', shoes: 'Tech runners', layer: 'Strapped shell' },
    gilet: { bottom: 'Tapered joggers', shoes: 'Trail trainers', layer: 'Insulated vest' }
  };

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
    const style = SHIRT_STYLE[p.shirt];
    const g = GARMENT[style];
    const capIcon = { bowler: '🎩', flat: '🧢', trilby: '🎩', newsboy: '🧢', cloche: '👒', boater: '👒', beanie: '🧶', snapback: '🧢', bucket: '👒', bandana: '🏴', capback: '🧢' }[h.cap];
    if (g) {
      return [
        { slot: 'Headwear', icon: capIcon || (h.t === 'bald' ? '🪮' : '💇'), value: h.n },
        { slot: 'Top', icon: '👕', value: SHIRT_NAMES[p.shirt] },
        { slot: 'Detail', icon: '🧵', value: g.layer },
        { slot: 'Bottoms', icon: '👖', value: g.bottom },
        { slot: 'Feet', icon: '👟', value: g.shoes },
        { slot: 'Trinket', icon: '⌚', value: ACCENT_NAMES[p.accent] }
      ];
    }
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
    } else if (acc === 16) { // aviator shades: teardrop lenses, thin bridge, temple bars
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<path d="M${ex - S(6.2)} ${ey - S(3.2)} Q${ex} ${ey - S(4.6)} ${ex + S(6.2)} ${ey - S(3.2)} Q${ex + S(6)} ${ey + S(4.4)} ${ex + sx * -S(1.2)} ${ey + S(4.6)} Q${ex - S(5.6)} ${ey + S(4.2)} ${ex - S(6.2)} ${ey - S(3.2)} Z" fill="#1a1712" opacity=".88" stroke="#3d3425" stroke-width="${S(0.9)}"/>`;
        f += `<path d="M${ex - S(3.4)} ${ey - S(2)} q${S(2.6)} ${S(-1)} ${S(4)} ${S(0.4)}" stroke="#7d7458" stroke-width="${S(0.7)}" fill="none" opacity=".5"/>`;
        f += `<path d="M${ex + sx * S(6)} ${ey - S(3.4)} L${cx + sx * S(19.5)} ${cy - S(9.5)}" stroke="${shade('#3d3425', 0.1)}" stroke-width="${S(1)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(5.8)} ${ey - S(3.4)} Q${cx} ${ey - S(5.8)} ${exR - S(5.8)} ${ey - S(3.4)}" stroke="${shade('#3d3425', 0.15)}" stroke-width="${S(1.1)}" fill="none"/>`;
    } else if (acc === 17) { // wayfarer shades: chunky trapezoids
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<path d="M${ex - S(6.4)} ${ey - S(4.2)} L${ex + S(6.4)} ${ey - S(4.6)} L${ex + S(6)} ${ey + S(3.2)} L${ex - S(5.6)} ${ey + S(3.8)} Z" fill="#141414" opacity=".92"/>`;
        f += `<path d="M${ex - S(6.4)} ${ey - S(4.2)} L${ex + S(6.4)} ${ey - S(4.6)}" stroke="#2e2e2e" stroke-width="${S(1.3)}" opacity=".9"/>`;
        f += `<path d="M${ex + sx * S(6.4)} ${ey - S(4.4)} L${cx + sx * S(19.5)} ${cy - S(9)}" stroke="#202020" stroke-width="${S(1.5)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(6.2)} ${ey - S(4.3)} Q${cx} ${ey - S(5.8)} ${exR - S(6.2)} ${ey - S(4.4)}" stroke="#202020" stroke-width="${S(1.5)}" fill="none"/>`;
    } else if (acc === 18) { // round wire specs
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<circle cx="${ex}" cy="${ey + S(0.3)}" r="${S(4.6)}" fill="#cfe0e8" opacity=".12"/>`;
        f += `<circle cx="${ex}" cy="${ey + S(0.3)}" r="${S(4.6)}" fill="none" stroke="${shade('#b0b6bd', 0.05)}" stroke-width="${S(1.1)}"/>`;
        f += `<path d="M${ex + sx * S(4.4)} ${ey - S(1.6)} L${cx + sx * S(19.5)} ${cy - S(9.5)}" stroke="#b0b6bd" stroke-width="${S(0.9)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(4.4)} ${ey - S(1)} Q${cx} ${ey - S(2.6)} ${exR - S(4.4)} ${ey - S(1)}" stroke="#b0b6bd" stroke-width="${S(1)}" fill="none"/>`;
    } else if (acc === 21 || acc === 22) { // stud / hoop earrings on both lobes
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(22);
        if (acc === 21) { f += `<circle cx="${ex}" cy="${cy + S(7.6)}" r="${S(1.15)}" fill="${ACCENTS[21]}"/><circle cx="${ex - S(0.35)}" cy="${cy + S(7.2)}" r="${S(0.4)}" fill="#fff" opacity=".8"/>`; }
        else { f += `<circle cx="${ex}" cy="${cy + S(8)}" r="${S(2.3)}" fill="none" stroke="${ACCENTS[22]}" stroke-width="${S(1)}"/><circle cx="${ex}" cy="${cy + S(8)}" r="${S(1.4)}" fill="none" stroke="${shade(ACCENTS[22], -0.25)}" stroke-width="${S(0.5)}" opacity=".7"/>`; }
      }
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
    } else if (t === 'cornrows') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(16.5)} ${cx} ${cy - S(16.5)} Q${cx - S(13)} ${cy - S(16.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      for (let i = 0; i < 4; i++)
        f += `<path d="M${cx - S(13 + i * 0.8)} ${cy - S(10.5 + i * 2.2)} Q${cx} ${cy - S(19.5 - i * 0.4)} ${cx + S(13 + i * 0.8)} ${cy - S(10.5 + i * 2.2)}" stroke="${shade(hc, 0.34)}" stroke-width="${S(1.15)}" fill="none" opacity=".85"/>`;
      for (const sx of [-1, 1])
        f += `<path d="M${cx + sx * S(19)} ${cy - S(3)} q${sx * S(1.1)} ${S(5.5)} ${sx * S(1)} ${S(9.5)}" stroke="${hc}" stroke-width="${S(1.5)}" opacity=".6" fill="none" stroke-linecap="round"/>`;
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
    } else if (cap === 'beanie') {
      f += `<path d="M${L - S(1)} ${cy - S(3)} Q${cx - S(24)} ${top - S(10)} ${cx} ${top - S(11.5)} Q${cx + S(24)} ${top - S(10)} ${R + S(1)} ${cy - S(3)} L${R + S(0.4)} ${cy + S(1.5)} Q${cx} ${cy - S(4.2)} ${L - S(0.4)} ${cy + S(1.5)} Z" fill="${hc}"/>`;
      for (let i = -2; i <= 2; i++)
        f += `<path d="M${cx + i * S(8.2)} ${cy - S(1.6)} Q${cx + i * S(8.6)} ${top - S(2) + Math.abs(i) * S(1.6)} ${cx + i * S(6.8)} ${top - S(8) + Math.abs(i) * S(0.9)}" stroke="${shade(hc, 0.16)}" stroke-width="${S(1.4)}" fill="none" opacity=".8"/>`;
      f += `<path d="M${L - S(0.4)} ${cy - S(1)} Q${cx} ${cy - S(7)} ${R + S(0.4)} ${cy - S(1)} L${R + S(0.1)} ${cy + S(2.2)} Q${cx} ${cy - S(3.4)} ${L - S(0.1)} ${cy + S(2.2)} Z" fill="${shade(hc, -0.24)}"/>`;
      f += shine(cx - S(6), top - S(6.4), S(5), '#fff', 0.12);
    } else if (cap === 'snapback') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(23)} ${top - S(7)} ${cx} ${top - S(8)} Q${cx + S(23)} ${top - S(7)} ${R} ${cy - S(6)} Q${cx + S(12)} ${cy - S(14.5)} ${cx} ${cy - S(14.5)} Q${cx - S(12)} ${cy - S(14.5)} ${L} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(6.5)} ${top - S(8)} L${cx} ${cy - S(14.5)} M${cx + S(6.5)} ${top - S(8)} L${cx} ${cy - S(14.5)} M${cx} ${top - S(8)} L${cx} ${cy - S(14.5)}" stroke="${shade(hc, -0.22)}" stroke-width="${S(0.9)}" opacity=".8"/>`;
      f += `<path d="M${cx - S(9.5)} ${cy - S(15)} Q${cx} ${cy - S(17.2)} ${cx + S(9.5)} ${cy - S(15)} L${cx + 0} ${cy - S(10.8)} Q${cx} ${cy - S(12.2)} ${cx - 0} ${cy - S(10.8)} Z" fill="${shade(hc, -0.14)}"/>`;
      f += `<circle cx="${cx}" cy="${top - S(7.2)}" r="${S(1.5)}" fill="${shade(hc, -0.2)}"/>`;
      f += shine(cx - S(7), top - S(4), S(5), '#fff', 0.12);
    } else if (cap === 'bucket') {
      f += `<path d="M${L} ${cy - S(7)} Q${cx - S(23)} ${top - S(6)} ${cx} ${top - S(7)} Q${cx + S(23)} ${top - S(6)} ${R} ${cy - S(7)} Q${cx + S(13)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(13)} ${cy - S(15.5)} ${L} ${cy - S(7)} Z" fill="${hc}"/>`;
      f += `<ellipse cx="${cx}" cy="${cy - S(6.5)}" rx="${S(27)}" ry="${S(5.2)}" fill="${shade(hc, -0.1)}"/>`;
      f += `<ellipse cx="${cx}" cy="${cy - S(7)}" rx="${S(25.6)}" ry="${S(4.3)}" fill="${shade(hc, 0.04)}"/>`;
      f += `<path d="M${L - S(0.5)} ${cy - S(6)} Q${cx} ${cy - S(12)} ${R + S(0.5)} ${cy - S(6)}" stroke="${shade(hc, -0.28)}" stroke-width="${S(1.1)}" fill="none" opacity=".8"/>`;
      f += shine(cx - S(8), top - S(3.4), S(6), '#fff', 0.1);
    } else if (cap === 'bandana') {
      f += `<path d="M${L - S(0.8)} ${cy - S(6)} Q${cx - S(23.5)} ${top - S(8)} ${cx} ${top - S(9)} Q${cx + S(23.5)} ${top - S(8)} ${R + S(0.8)} ${cy - S(6)} Q${cx + S(12)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(12)} ${cy - S(15.5)} ${L - S(0.8)} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${L - S(0.8)} ${cy - S(6)} Q${cx} ${cy - S(11.4)} ${R + S(0.8)} ${cy - S(6)} L${R + S(1.2)} ${cy - S(4.2)} Q${cx} ${cy - S(8.6)} ${L - S(1.2)} ${cy - S(4.2)} Z" fill="${shade(hc, -0.2)}"/>`;
      for (const dx of [-12, -4, 4, 12])
        f += `<circle cx="${cx + S(dx)}" cy="${cx === -999 ? 0 : (cy - S(10.2) + Math.abs(dx) * S(0.14))}" r="${S(1.05)}" fill="${shade(hc, 0.45)}" opacity=".8"/>`;
      f += `<circle cx="${cx}" cy="${top - S(8.4)}" r="${S(2.6)}" fill="${shade(hc, -0.28)}"/>`;
      f += `<path d="M${cx + S(19.6)} ${cy - S(5.6)} q${S(3.2)} ${S(2.4)} ${S(1.6)} ${S(6.2)} M${cx + S(16.8)} ${cy - S(8.6)} q${S(3.4)} ${S(0.8)} ${S(4)} ${S(3.8)}" stroke="${shade(hc, 0.1)}" stroke-width="${S(1.5)}" fill="none" opacity=".7"/>`;
    } else if (cap === 'capback') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(22.5)} ${top - S(6)} ${cx} ${top - S(7)} Q${cx + S(22.5)} ${top - S(6)} ${R} ${cy - S(6)} Q${cx + S(12)} ${cy - S(14)} ${cx} ${cy - S(14)} Q${cx - S(12)} ${cy - S(14)} ${L} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(8)} ${top - S(7)} Q${cx} ${top - S(9.4)} ${cx + S(8)} ${top - S(7)} L${cx + S(4.6)} ${top - S(4.6)} Q${cx} ${top - S(5.8)} ${cx - S(4.6)} ${top - S(4.6)} Z" fill="${shade(hc, 0.1)}"/>`;
      f += `<path d="M${cx - S(13)} ${cy - S(13.4)} Q${cx - 0} ${cy - S(15.6)} ${cx + S(13)} ${cy - S(13.4)} L${cx + S(13.6)} ${cy - S(17.6)} Q${cx} ${cy - S(15.2)} ${cx - S(13.6)} ${cy - S(17.6)} Z" fill="${shade(hc, -0.26)}"/>`; // rear peak poking out behind the head
      f += shine(cx + S(7), top - S(3.6), S(4.6), '#fff', 0.11);
    }
    return f;
  }


  // ---------------------------------------------------------------- modern garments (shared geometry)
  // Bust chest line: shoulders to y≈74, neck centre (60,76). Doll torso: neck y≈72, hem y≈148,
  // arms at cx=60±(20.5..31.5), hands at (60±23.4, 160). Gradients: ct*u coat, sk*u skin, tr/u legs.
  function garmentBust(style, coat, accCol, u) {
    const cd = shade(coat, -0.22), cl = shade(coat, 0.14), cm = shade(coat, 0.4);
    const SIL = 'M12 120 L12 100 Q12 79 40 74 L51 71.5 Q60 80 69 71.5 L80 74 Q108 79 108 100 L108 120 Z';
    let f = '';
    const zip = (y0) => `<path d="M60 ${y0} L60 120" stroke="${cd}" stroke-width="1.6" opacity=".85"/><path d="M58.4 ${y0 + 5} h3.2 v4 h-3.2 Z" fill="${cm}" opacity=".85"/>`;
    const band = `<rect x="12" y="112" width="96" height="8" fill="${cd}" opacity=".5"/>`;
    switch (style) {
      case 'hoodie':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M38 76 Q60 62 82 76 Q74 84 60 84 Q46 84 38 76 Z" fill="${cd}"/>`;
        f += `<path d="M56.5 82 q-1.4 9 .6 15 M63.5 82 q1.4 9 -.6 15" stroke="${cl}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
        f += `<circle cx="57" cy="97.6" r="1.1" fill="${cl}"/><circle cx="63" cy="97.6" r="1.1" fill="${cl}"/>`;
        f += `<path d="M45 103 L75 103 L78 117 L42 117 Z" fill="${cd}" opacity=".55"/><path d="M45 103 L75 103" stroke="${cd}" stroke-width="1.4" opacity=".9"/>`;
        break;
      case 'track':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M48 72.5 L60 79 L72 72.5 L74 79 L60 87 L46 79 Z" fill="${shade(coat, -0.1)}"/>`;
        f += zip(74);
        f += `<path d="M19 82 Q17 96 19 114 M101 82 Q103 96 101 114" stroke="#e8e8e8" stroke-width="2.1" opacity=".5" fill="none"/>`;
        f += `<path d="M22.4 82 Q20.6 96 22.4 114 M97.6 82 Q99.4 96 97.6 114" stroke="${cl}" stroke-width="0.9" opacity=".7" fill="none"/>` + band;
        break;
      case 'bomber':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M46 71.5 Q60 69.5 74 71.5 L73.5 76.5 Q60 74.8 46.5 76.5 Z" fill="${cd}"/>`;
        f += zip(76);
        f += `<path d="M41 96 q2 -3 5 -1 M34 100 h8" stroke="${cl}" stroke-width="1" opacity=".5" fill="none"/>`;
        f += `<path d="M25 84 l7 -1.4 1 8 -7 1.2 Z" fill="${cd}" opacity=".8"/><circle cx="28.5" cy="86.6" r="1" fill="${cm}"/>` + band;
        break;
      case 'puffer':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        for (const y of [84, 93, 102, 111]) f += `<path d="M14 ${y} Q60 ${y + 4} 106 ${y}" stroke="${cd}" stroke-width="1.5" fill="none" opacity=".6"/>`;
        f += `<path d="M46 70.5 Q60 68.5 74 70.5 L74.5 76.5 Q60 74.6 45.5 76.5 Z" fill="${shade(coat, -0.08)}"/>` + zip(76);
        break;
      case 'tee':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M48 71.5 Q60 85 72 71.5 L69.5 70 Q60 80.5 50.5 70 Z" fill="url(#pg${u})"/>`;
        f += `<path d="M48.4 69.4 Q60 79.5 71.6 69.4" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
        f += `<path d="M16 92 q3 -2.4 5 0 M104 92 q-3 -2.4 -5 0" stroke="${cd}" stroke-width="1.1" fill="none" opacity=".6"/>`;
        f += `<circle cx="60" cy="100" r="7.5" fill="none" stroke="${cl}" stroke-width="1.3" opacity=".5"/><path d="M55.5 102 L64.5 96.5 M55.5 97.5 L64.5 103" stroke="${cl}" stroke-width="1.1" opacity=".5"/>`;
        break;
      case 'tank': {
        const S2 = 'M27 120 L27 97 Q29 79 44 73.5 L51.6 71.5 Q60 83 68.4 71.5 L76 73.5 Q91 79 93 97 L93 120 Z';
        f += `<path d="${S2}" fill="url(#ct${u})"/>`;
        f += `<path d="M48 71 Q60 86 72 71 L69 69.5 Q60 80 51 69.5 Z" fill="url(#pg${u})"/>`;
        f += `<path d="M48.5 70 Q60 80 71.5 70" stroke="${cd}" stroke-width="1.5" fill="none"/>`;
        f += `<path d="M27.6 88 q4 -2 6.5 1.4 M92.4 88 q-4 -2 -6.5 1.4" stroke="url(#pg${u})" stroke-width="4" fill="none"/>`;
        for (const y of [92, 97, 102]) f += `<path d="M30 ${y} Q60 ${y + 3} 90 ${y}" stroke="${cd}" stroke-width="0.8" fill="none" opacity=".5"/>`;
        break;
      }
      case 'polo':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M46 70 L60 79.5 L54 84 L43.5 75 Z M74 70 L60 79.5 L66 84 L76.5 75 Z" fill="${shade(coat, -0.1)}"/>`;
        f += `<path d="M60 79.5 L60 92" stroke="${cd}" stroke-width="1.6"/>`;
        f += `<circle cx="60" cy="84" r="1.2" fill="${cl}"/><circle cx="60" cy="89.5" r="1.2" fill="${cl}"/>`;
        break;
      case 'denim':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M47 71 L60 80 L53 84.5 L44 76 Z M73 71 L60 80 L67 84.5 L76 76 Z" fill="${shade(coat, 0.08)}"/>` + zip(80);
        for (const sx of [0, 1]) { const x0 = sx ? 66 : 43; f += `<path d="M${x0} 91 h11 v9 h-11 Z" fill="${shade(coat, 0.02)}" stroke="${cd}" stroke-width="0.9"/><path d="M${x0} 91 h11 l-1.5 2.8 h-8 Z" fill="${cl}" opacity=".5"/><circle cx="${x0 + 5.5}" cy="95" r="0.9" fill="${cm}"/>`; }
        f += `<path d="M17 84 q1 18 2 30 M103 84 q-1 18 -2 30" stroke="${cl}" stroke-width="0.8" opacity=".45" stroke-dasharray="2.5 2" fill="none"/>`;
        break;
      case 'flannel': {
        f += `<path d="${SIL}" fill="#e8e2d4"/>`; // tee showing through
        f += `<path d="M51 71.6 Q60 82 69 71.6 L60 91 Z" fill="url(#pg${u})"/>`; // open V
        f += `<path d="${SIL}" fill="none"/><clipPath id="fl${u}"><path d="M12 120 L12 74 h36 L60 91 L72 74 h36 v46 Z"/></clipPath>`;
        f += `<g><path d="M12 74 h34.5 L58 91 V120 H12 Z M62 91 L73.5 74 H108 V120 H62 Z" fill="url(#ct${u})"/></g>`;
        f += `<g clip-path="url(#fl${u})" opacity=".28">${[16, 26, 36, 76, 86, 96].map(x => `<path d="M${x} 74 L${x} 120" stroke="#1c1208" stroke-width="1.6"/>`).join('')}${[82, 92, 102, 112].map(y => `<path d="M12 ${y} L108 ${y}" stroke="#1c1208" stroke-width="1.4"/>`).join('')}</g>`;
        f += `<path d="M46.5 74 L58 91 M73.5 74 L62 91" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
        f += `<path d="M51.5 70 Q57 76.5 60 79 Q63 76.5 68.5 70" stroke="#e8e2d4" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
        break;
      }
      case 'wind':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M60 74 L22 120 L60 120 Z M60 74 L98 120 L60 120 Z" fill="${cl}" opacity=".85"/>`;
        f += `<path d="M60 74 L30 120 M60 74 L90 120" stroke="${cd}" stroke-width="1.3" opacity=".8"/>` + zip(74);
        f += `<path d="M48 70.5 Q60 69 72 70.5 L71.5 74.5 Q60 73.4 48.5 74.5 Z" fill="${cd}"/>`;
        break;
      case 'varsity':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M12 100 Q12 79 40 74 L32 88 L34 120 L15 120 Z M108 100 Q108 79 80 74 L88 88 L86 120 L105 120 Z" fill="${shade(coat, 0.24)}"/>`;
        f += `<path d="M40 74 L32 88 M80 74 L88 88" stroke="${cd}" stroke-width="1.2"/>`;
        f += `<path d="M46 70.5 Q60 69.5 74 70.5 L73 75.5 Q60 74.2 47 75.5 Z" fill="${cd}"/>`;
        for (const y of [82, 94, 106, 118]) f += `<circle cx="60" cy="${y}" r="1.4" fill="${cm}"/>`;
        f += `<rect x="12" y="113" width="96" height="7" fill="${cd}" opacity=".55"/><path d="M12 116.5 h96" stroke="${cl}" stroke-width="1" opacity=".6"/>`;
        break;
      case 'moto':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M42 71.5 L31 114 L49 120 L56 78 Z M78 71.5 L66 78 L64 91 L80 84 Z" fill="${shade(coat, 0.1)}"/>`;
        f += `<path d="M42 71.5 L31 114 L49 120" fill="none" stroke="${cl}" stroke-width="1"/>`;
        f += `<path d="M56 78 L68 120" stroke="${cd}" stroke-width="2"/>`;
        f += `<path d="M22 76 l9 -1.2 1.4 3 -9 1.2 Z M89 74.8 l9 1.2 -1.4 3 -9 -1.2 Z" fill="${cd}"/>`;
        f += `<circle cx="26.2" cy="76.6" r="1" fill="${cm}"/><circle cx="93.8" cy="76.6" r="1" fill="${cm}"/>`;
        break;
      case 'tech':
        f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
        f += `<path d="M44 68.5 Q60 67 76 68.5 L76 76.5 Q60 74.8 44 76.5 Z" fill="${cd}"/>`;
        f += `<path d="M36 108 L84 84" stroke="${shade(coat, 0.2)}" stroke-width="5.4" opacity=".9"/><path d="M36 108 L84 84" stroke="${cd}" stroke-width="1" opacity=".9"/>`;
        f += `<rect x="56.5" y="93" width="7" height="6.5" fill="none" stroke="${cm}" stroke-width="1.1"/>`;
        f += `<path d="M16 96 h9 M95 96 h9" stroke="${cm}" stroke-width="1.3"/><path d="M20.5 96 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0" fill="${cm}" opacity=".7"/>` + zip(76);
        break;
      case 'gilet':
        f += `<path d="${SIL}" fill="#e8e2d4"/>`; // crew tee beneath
        f += `<path d="M49.5 70.5 Q60 82 70.5 70.5 L69 69 Q60 78 51 69 Z" fill="url(#pg${u})"/>`;
        f += `<g><path d="M12 100 Q12 79 40 74 L50 71.6 Q56 80 58.6 84 L58.6 120 L15 120 Z M108 100 Q108 79 80 74 L70 71.6 Q64 80 61.4 84 L61.4 120 L105 120 Z" fill="url(#ct${u})"/></g>`;
        for (const y of [88, 97, 106, 115]) { f += `<path d="M14 ${y} Q34 ${y + 3} 58 ${y + 1.4} M106 ${y} Q86 ${y + 3} 62 ${y + 1.4}" stroke="${cd}" stroke-width="1.4" fill="none" opacity=".6"/>`; }
        f += `<path d="M46 71 Q60 80.5 74 71" stroke="${cd}" stroke-width="2.2" fill="none"/>`;
        break;
      default: break;
    }
    return f;
  }


  // Full-body geometry for the modern styles. The doll torso runs neck y≈72 → hem y≈148;
  // arms live at 60±(20.5..31.5); hands land at (60±23.4, 160). Short-sleeve styles keep the
  // forearm in skin; tank/gilet show the whole arm.
  function dollGarment(style, coat, skin, u) {
    const cd = shade(coat, -0.22), cl = shade(coat, 0.14), cm = shade(coat, 0.4);
    const BODY = 'M44.5 148 L44.5 90 Q44.5 75.5 57 71.5 L63 71.5 Q75.5 75.5 75.5 90 L75.5 148 Z';
    const sleeveLong = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(20.5)} 78 Q${ax(29.5)} 87 ${ax(31.5)} 110 Q${ax(33)} 134 ${ax(29)} 152 L${ax(18.5)} 150 Q${ax(22.5)} 126 ${ax(15)} 92 Z" fill="url(#ct${u})"/>` +
             `<path d="M${ax(20.5)} 78.5 Q${ax(29.5)} 88 ${ax(31)} 110 Q${ax(32.4)} 132 ${ax(28.8)} 150" fill="none" stroke="${cd}" stroke-width="1.2" opacity=".7"/>` +
             `<path d="M${ax(21)} 88 Q${ax(26.5)} 96 ${ax(26.5)} 118" fill="none" stroke="${cl}" stroke-width=".9" opacity=".4"/>`;
    };
    const sleeveShort = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(20.5)} 78 Q${ax(29.5)} 87 ${ax(31.2)} 107 L${ax(18.8)} 105 Q${ax(21.5)} 96 ${ax(15)} 92 Z" fill="url(#ct${u})"/>` +
             `<path d="M${ax(31.2)} 107 Q${ax(33)} 134 ${ax(29)} 152 L${ax(18.5)} 150 Q${ax(19.6)} 126 ${ax(18.8)} 105 Z" fill="${shade(skin, -0.1)}"/>` +
             `<path d="M${ax(18.8)} 106 L${ax(31.2)} 108.2" stroke="${cd}" stroke-width="1.4" opacity=".8"/>`;
    };
    const sleeveNone = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(20.5)} 78 Q${ax(29.5)} 87 ${ax(31.5)} 110 Q${ax(33)} 134 ${ax(29)} 152 L${ax(18.5)} 150 Q${ax(22.5)} 126 ${ax(15)} 92 Z" fill="${shade(skin, -0.1)}"/>` +
             `<path d="M${ax(21)} 86 Q${ax(25.5)} 94 ${ax(25.5)} 118" fill="none" stroke="${shade(skin, 0.22)}" stroke-width=".9" opacity=".5"/>`;
    };
    const zip = `<path d="M60 74 L60 148" stroke="${cd}" stroke-width="1.6" opacity=".85"/><path d="M58.2 82 h3.6 v4.6 h-3.6 Z" fill="${cm}"/>`;
    const hem = `<rect x="44.5" y="140" width="31" height="8" fill="${cd}" opacity=".55"/>`;
    let f = '';
    const twoSleeves = (kind) => [sleeveLong, sleeveShort, sleeveNone][kind];
    switch (style) {
      case 'hoodie':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M47 76 Q60 66 73 76 Q68.5 82.5 60 82.5 Q51.5 82.5 47 76 Z" fill="${cd}"/>`;
        f += `<path d="M57.2 83 q-1.4 11 .6 19 M62.8 83 q1.4 11 -.6 19" stroke="${cl}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
        f += `<circle cx="57.6" cy="102.4" r="1" fill="${cl}"/><circle cx="62.4" cy="102.4" r="1" fill="${cl}"/>`;
        f += `<path d="M48.5 116 L71.5 116 L74 136 L46 136 Z" fill="${cd}" opacity=".5"/>`;
        f += `<path d="M48.5 116 L71.5 116" stroke="${cd}" stroke-width="1.4"/>` + hem;
        for (const sx of [-1, 1]) f += sleeveLong(sx);
        break;
      case 'track':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M51 71.5 L60 78 L69 71.5 L71.5 79 L60 87 L48.5 79 Z" fill="${shade(coat, -0.1)}"/>`;
        f += zip + hem;
        for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(30.8)} 96 Q${ax(31.8)} 122 ${ax(28.6)} 148" stroke="#e8e8e8" stroke-width="2" opacity=".5" fill="none"/><path d="M${ax(27.6)} 92 Q${ax(28.4)} 120 ${ax(25.4)} 146" stroke="${cl}" stroke-width=".9" opacity=".6" fill="none"/>`; }
        break;
      case 'bomber':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M49.5 71 Q60 69.5 70.5 71 L70 77 Q60 75.4 50 77 Z" fill="${cd}"/>`;
        f += zip;
        f += `<path d="M47 100 q2.4 -3.4 6 -1.4" stroke="${cl}" stroke-width="1" opacity=".5" fill="none"/>`;
        for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(25)} 96 l8 -1 1.2 7 -8 1 Z" fill="${cd}" opacity=".85"/>`; f += `<circle cx="${ax(29.2)}" cy="98.6" r=".9" fill="${cm}"/>`; }
        f += hem;
        break;
      case 'puffer':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        for (const y of [82, 92, 102, 112, 122, 132]) f += `<path d="M45 ${y} Q60 ${y + 3.6} 75 ${y}" stroke="${cd}" stroke-width="1.6" fill="none" opacity=".6"/>`;
        f += `<path d="M49.5 70.5 Q60 68.5 70.5 70.5 L71 77 Q60 75.4 49 77 Z" fill="${shade(coat, -0.08)}"/>` + zip;
        for (const sx of [-1, 1]) { f += sleeveLong(sx); const ax = (v) => 60 + sx * v; for (const y of [92, 108, 124]) f += `<path d="M${ax(16.5)} ${y} Q${ax(24)} ${y + 4} ${ax(31)} ${y + 3}" stroke="${cd}" stroke-width="1.1" fill="none" opacity=".5"/>`; }
        break;
      case 'tee': case 'polo':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        if (style === 'tee') {
          f += `<path d="M50 71.5 Q60 82 70 71.5" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
          f += `<circle cx="60" cy="112" r="9" fill="none" stroke="${cl}" stroke-width="1.2" opacity=".45"/><path d="M55 114.5 L65 107.5 M55 110 L65 115" stroke="${cl}" stroke-width="1" opacity=".45"/>`;
        } else {
          f += `<path d="M49.5 70 L60 79.5 L55 84 L46.5 74.5 Z M70.5 70 L60 79.5 L65 84 L73.5 74.5 Z" fill="${shade(coat, -0.1)}"/>`;
          f += `<path d="M60 79.5 L60 93" stroke="${cd}" stroke-width="1.6"/>`;
          f += `<circle cx="60" cy="85" r="1.1" fill="${cl}"/><circle cx="60" cy="90.5" r="1.1" fill="${cl}"/>`;
        }
        for (const sx of [-1, 1]) f += sleeveShort(sx);
        break;
      case 'tank':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M50 71.5 Q60 83 70 71.5" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
        f += `<path d="M45.2 92 q-1.5 18 0 30 M74.8 92 q1.5 18 0 30" stroke="${cd}" stroke-width="1.1" fill="none" opacity=".55"/>`;
        for (const y of [102, 107.5, 113]) f += `<path d="M48 ${y} Q60 ${y + 3} 72 ${y}" stroke="${cd}" stroke-width=".9" fill="none" opacity=".45"/>`;
        for (const sx of [-1, 1]) f += sleeveNone(sx);
        break;
      case 'denim':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M50 71 L60 80 L54 84.5 L46 75.5 Z M70 71 L60 80 L66 84.5 L74 75.5 Z" fill="${shade(coat, 0.08)}"/>` + zip;
        f += `<path d="M48 97 h9 v8 h-9 Z M63 97 h9 v8 h-9 Z" fill="${shade(coat, 0.02)}" stroke="${cd}" stroke-width=".9"/>`;
        f += `<circle cx="60" cy="111" r="1" fill="${cm}"/><circle cx="60" cy="124" r="1" fill="${cm}"/><circle cx="60" cy="137" r="1" fill="${cm}"/>`;
        f += `<path d="M45.5 94 L45.5 142 M74.5 94 L74.5 142" stroke="${cl}" stroke-width="0.9" opacity=".5" stroke-dasharray="3 2.4"/>`;
        for (const sx of [-1, 1]) f += sleeveLong(sx);
        break;
      case 'flannel': {
        f += `<path d="${BODY}" fill="#e8e2d4"/>`;
        f += `<path d="M50.5 71 Q60 81.5 69.5 71" stroke="#c9c0a8" stroke-width="2.2" fill="none"/>`;
        f += `<clipPath id="fld${u}"><path d="M44 70 h15 L58.6 84 V148 H44 Z M61.4 84 L76 70 V148 H61.4 Z"/></clipPath>`;
        f += `<path d="M44.5 148 L44.5 72 L58.6 84 L58.6 148 Z M61.4 84 L75.5 72 L75.5 148 Z" fill="url(#ct${u})"/>`;
        f += `<g clip-path="url(#fld${u})" opacity=".27">${[47, 51, 64, 68].map(x => `<path d="M${x} 71 L${x} 148" stroke="#1c1208" stroke-width="1.4"/>`).join('')}${[80, 92, 104, 116, 128, 140].map(y => `<path d="M44 ${y} L76 ${y}" stroke="#1c1208" stroke-width="1.3"/>`).join('')}</g>`;
        f += `<path d="M58.6 84 L58.6 148 M61.4 84 L61.4 148" stroke="#e8e2d4" stroke-width="2"/>`;
        f += `<circle cx="58.6" cy="98" r="1.1" fill="#3a2c18"/><circle cx="61.4" cy="98" r="1.1" fill="#3a2c18"/><circle cx="58.6" cy="112" r="1.1" fill="#3a2c18"/><circle cx="61.4" cy="112" r="1.1" fill="#3a2c18"/>`;
        for (const sx of [-1, 1]) f += sleeveShort(sx);
        break;
      }
      case 'wind':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M60 74 L45 148 L60 148 Z M60 74 L75 148 L60 148 Z" fill="${cl}" opacity=".85"/>`;
        f += `<path d="M60 74 L46.5 148 M60 74 L73.5 148" stroke="${cd}" stroke-width="1.2" opacity=".8"/>` + zip;
        f += `<path d="M50 70.5 Q60 69 70 70.5 L69.5 75 Q60 73.6 50.5 75 Z" fill="${cd}"/>` + hem;
        for (const sx of [-1, 1]) f += sleeveLong(sx);
        break;
      case 'varsity':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M50 70.5 Q60 69.5 70 70.5 L69 76 Q60 74.4 51 76 Z" fill="${cd}"/>`;
        for (const y of [82, 96, 110, 124, 138]) f += `<circle cx="60" cy="${y}" r="1.5" fill="${cm}"/>`;
        f += hem;
        f += `<path d="M44.5 143.5 H75.5" stroke="${cl}" stroke-width="1" opacity=".6"/>`;
        for (const sx of [-1, 1]) { f += sleeveLong(sx).replace(`url(#ct${u})`, shade(coat, 0.24)); }
        break;
      case 'moto':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M49.5 71.5 L42.5 110 L54 96 L58 76 Z M70.5 71.5 L66 77 L64.5 92 L74 84 Z" fill="${shade(coat, 0.1)}"/>`;
        f += `<path d="M49.5 71.5 L42.5 110 L54 96" fill="none" stroke="${cl}" stroke-width="1"/>`;
        f += `<path d="M58 76 L64.5 148" stroke="${cd}" stroke-width="2.2"/>`;
        f += `<path d="M41 78.5 q10 -4 19 -1.4" stroke="#2f2f38" stroke-width="1.1" opacity=".9" fill="none"/>`;
        for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(20.5)} 80 l9 -1.2 1.2 2.8 -9 1.2 Z" fill="${cd}"/>`; }
        break;
      case 'tech':
        f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
        f += `<path d="M47 70.5 Q60 68.5 73 70.5 L73 78 Q60 75.8 47 78 Z" fill="${cd}"/>`;
        f += `<path d="M44.5 120 L75.5 92" stroke="${shade(coat, 0.2)}" stroke-width="5.6" opacity=".95"/><path d="M44.5 120 L75.5 92" stroke="${cd}" stroke-width="1" opacity=".9"/>`;
        f += `<rect x="56.5" y="101.5" width="7" height="6.5" fill="none" stroke="${cm}" stroke-width="1.2"/>`;
        f += `<path d="M47 128 h7 M66 108 h8" stroke="${cm}" stroke-width="1.3"/><circle cx="46.5" cy="128" r="1.4" fill="${cm}" opacity=".7"/>` + zip;
        for (const sx of [-1, 1]) f += sleeveLong(sx);
        break;
      case 'gilet':
        f += `<path d="${BODY}" fill="#e8e2d4"/>`; // crew tee under the vest
        f += `<path d="M59 148 L59 84 L49.5 71.5 Q44.5 78 44.5 90 L44.5 148 Z M61 148 L61 84 L70.5 71.5 Q75.5 78 75.5 90 L75.5 148 Z" fill="url(#ct${u})"/>`;
        for (const y of [84, 94, 104, 114, 124, 134]) { f += `<path d="M44.5 ${y} Q52 ${y + 3.4} 58.6 ${y + 2} M75.5 ${y} Q68 ${y + 3.4} 61.4 ${y + 2}" stroke="${cd}" stroke-width="1.4" fill="none" opacity=".6"/>`; }
        f += `<path d="M59 84 L59 148 M61 84 L61 148" stroke="${cd}" stroke-width="1.2"/>`;
        f += `<path d="M49.5 71.5 Q60 81 70.5 71.5" stroke="${cd}" stroke-width="2.4" fill="none"/>`;
        for (const sx of [-1, 1]) f += sleeveNone(sx);
        break;
      default: break;
    }
    return f;
  }

  // Chest-level trinkets for BOTH wardrobes. aIdx 0-12 are legacy; 13-24 modern.
  // In the modern path these draw over the garment (call after it); legacy keeps its own.
  function chestAccent(aIdx, acc, scaleBust, u) {
    const k = scaleBust ? 0.78 : 1; // bust portrait sits slightly higher/tighter
    const Y = (v) => scaleBust ? (74 + (v - 74) * k) : v;
    let f = '';
    if (aIdx === 0) { // gold watch chain — reads as a chain on any top
      f += `<path d="M48 ${Y(88)} Q60 ${Y(101)} 72 ${Y(88)}" stroke="${acc}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M48.6 ${Y(88.8)} Q60 ${Y(100)} 71.4 ${Y(88.8)}" stroke="${shade(acc, 0.3)}" stroke-width=".8" fill="none"/>`;
      f += `<circle cx="69" cy="${Y(95)}" r="2.6" fill="${acc}" stroke="${shade(acc, -0.35)}" stroke-width=".6"/>`;
    } else if (aIdx === 3) { f += `<circle cx="60" cy="${Y(104)}" r="1.8" fill="${acc}"/><circle cx="59.5" cy="${Y(103.5)}" r=".5" fill="#fff" opacity=".8"/>`; }
    else if (aIdx === 5) { f += `<path d="M66 ${Y(92)} L69.5 ${Y(84.5)} L72.4 ${Y(92)} Z" fill="${acc}"/>`; }
    else if (aIdx === 6) { f += `<circle cx="70" cy="${Y(88)}" r="1.9" fill="${acc}"/><circle cx="69" cy="${Y(89.4)}" r="1.5" fill="${shade(acc, 0.14)}"/><circle cx="70.9" cy="${Y(89.8)}" r="1.4" fill="${shade(acc, -0.12)}"/><path d="M69.8 ${Y(90.4)} L69.4 ${Y(95)}" stroke="#2e5126" stroke-width=".9"/>`; }
    else if (aIdx === 1) { f += `<path d="M52 ${Y(88)} L53.4 ${Y(89.4)} L52 ${Y(90.8)} L50.6 ${Y(89.4)} Z" fill="${acc}" stroke="${shade(acc, 0.35)}" stroke-width=".5"/>`; }
    else if (aIdx === 10) { // silk scarf around any neck
      f += `<path d="M47 ${Y(78)} Q60 ${Y(70.5)} 73 ${Y(78)} L71.4 ${Y(84.5)} Q60 ${Y(79)} 48.6 ${Y(84.5)} Z" fill="${acc}"/>`;
      f += `<path d="M55 ${Y(84)} L53.6 ${Y(108)} Q57 ${Y(110.2)} 60 ${Y(107.5)} L59 ${Y(85)} Z" fill="${shade(acc, -0.12)}"/><path d="M65 ${Y(84)} L66.4 ${Y(108)} Q63 ${Y(110.2)} 60 ${Y(107.5)} L61 ${Y(85)} Z" fill="${acc}"/>`;
    } else if (aIdx === 12) { f += `<path d="M55 ${Y(76)} Q60 ${Y(81.5)} 65 ${Y(76)} L66.6 ${Y(86)} Q60 ${Y(90.5)} 53.4 ${Y(86)} Z" fill="${acc}"/><circle cx="57.5" cy="${Y(81)}" r=".8" fill="#dfe6f0"/><circle cx="62" cy="${Y(83.6)}" r=".8" fill="#dfe6f0"/>`; }
    else if (aIdx === 13 || aIdx === 14) { // cuban / curb chain
      f += `<path d="M47 ${Y(85)} Q60 ${Y(99)} 73 ${Y(85)}" stroke="${acc}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M47.8 ${Y(86)} Q60 ${Y(98)} 72.2 ${Y(86)}" stroke="${shade(acc, 0.35)}" stroke-width=".9" fill="none"/>`;
      f += `<path d="M48.4 ${Y(88.5)} Q60 ${Y(95)} 71.6 ${Y(88.5)}" stroke="${shade(acc, -0.25)}" stroke-width=".8" fill="none" opacity=".7"/>`;
    } else if (aIdx === 15) { // pendant on a thin rope
      f += `<path d="M50 ${Y(84)} Q60 ${Y(97)} 70 ${Y(84)}" stroke="${shade(acc, -0.1)}" stroke-width="1.1" fill="none"/>`;
      f += `<path d="M60 ${Y(96)} L60 ${Y(101)}" stroke="${acc}" stroke-width="1.2"/>`;
      f += `<path d="M60 ${Y(100)} L62.8 ${Y(103.4)} L60 ${Y(106.8)} L57.2 ${Y(103.4)} Z" fill="${acc}" stroke="${shade(acc, -0.3)}" stroke-width=".7"/>`;
      f += `<circle cx="58.6" cy="${Y(103)}" r=".7" fill="#fff" opacity=".85"/>`;
    } else if (aIdx === 23) { // bandana necktie
      f += `<path d="M48 ${Y(77)} L72 ${Y(77)} L60 ${Y(97)} Z" fill="${acc}"/>`;
      f += `<path d="M48 ${Y(77)} L60 ${Y(97)} L72 ${Y(77)}" fill="none" stroke="${shade(acc, -0.25)}" stroke-width=".9" opacity=".7"/>`;
      f += `<circle cx="60" cy="${Y(78.5)}" r="2.1" fill="${shade(acc, -0.28)}"/>`;
      for (const dx of [-6, 0, 6]) f += `<circle cx="${60 + dx}" cy="${Y(84 + Math.abs(dx) * 0.5)}" r=".8" fill="${shade(acc, 0.45)}" opacity=".8"/>`;
    } else if (aIdx === 24) { // dog tags
      f += `<path d="M50 ${Y(84)} Q60 ${Y(98)} 70 ${Y(84)}" stroke="#8a8d91" stroke-width="1.1" fill="none"/>`;
      f += `<g transform="rotate(-8 58 ${Y(99)})"><rect x="54.5" y="${Y(94.5)}" width="7" height="9.5" rx="2" fill="#aeb4bc"/><rect x="55.6" y="${Y(95.6)}" width="4.8" height="7.2" rx="1.4" fill="none" stroke="${shade('#aeb4bc', -0.25)}" stroke-width=".6"/></g>`;
      f += `<g transform="rotate(7 63.5 ${Y(100)})"><rect x="60" y="${Y(95.5)}" width="7" height="9.5" rx="2" fill="${shade('#aeb4bc', 0.08)}"/><rect x="61.1" y="${Y(96.6)}" width="4.8" height="7.2" rx="1.4" fill="none" stroke="${shade('#aeb4bc', -0.2)}" stroke-width=".6"/></g>`;
    }
    return f;
  }

  // Wrist watch for the full doll (viewer-left wrist at ~(36.5, 150)).
  function wristWatch(aIdx, acc, u) {
    if (aIdx === 19) {
      return `<g><path d="M33.2 143.2 L33.2 156.5 M40.4 143.2 L40.4 156.5" stroke="#1c1f24" stroke-width="2.6" opacity=".9"/>` +
             `<rect x="32.8" y="145.2" width="8.4" height="8.6" rx="2" fill="#14161a"/>` +
             `<rect x="34" y="146.4" width="6" height="6.2" rx="1.2" fill="${acc}" opacity=".92"/>` +
             `<circle cx="37" cy="149.5" r="1" fill="#0c0e12"/></g>`;
    }
    if (aIdx === 20) {
      return `<g><path d="M33.6 142.5 L34 157.2 M40 142.7 L40.4 157.2" stroke="${acc}" stroke-width="2.2" opacity=".9"/>` +
             `<circle cx="36.8" cy="149.6" r="4.2" fill="#2b2018" stroke="${shade(acc, -0.3)}" stroke-width="1"/>` +
             `<circle cx="36.8" cy="149.6" r="3.1" fill="#e8e0cc"/>` +
             `<path d="M36.8 149.6 L36.8 147.4 M36.8 149.6 L38.6 150.4" stroke="#43301f" stroke-width=".9" stroke-linecap="round"/></g>`;
    }
    return '';
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
    const modern = MODERN[style];
    const bg2 = '#141109', bg1 = shade(glow, -0.86);
    const cx = 60, cy = 50, sc = 1.12;
    let f = '';

    // bust: coat shoulders + lapels + collar — the vintage cut; modern styles branch
    if (!modern) {
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
    } else {
      f += garmentBust(style, coatFor(style, shirt), acc, u);
      f += chestAccent(aIdx, acc, true, u);
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
    const modern = MODERN[style];

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

    const armDefs = [];
    // ---- shirt base + waistcoat (vintage) / modern garment
    if (!modern) {
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

    } else {
      f += dollGarment(style, coatC, skin, u);
      for (const sx of [-1, 1]) armDefs.push({ sx, gs: sx === -1 ? 1 : -1 });
      f += chestAccent(aIdx, acc, false, u);
      f += wristWatch(aIdx, acc, u);
    }
    // ---- cuffs + hands, over the coat skirt
    for (const { sx, gs } of armDefs) {
      const ax = (v) => 60 + sx * v;
      if (!modern) {
        f += `<path d="M${ax(19)} 148.5 L${ax(28.6)} 151 L${ax(27.9)} 155.4 L${ax(18.4)} 153 Z" fill="${shirtWhite}"/>`;
        f += `<path d="M${ax(18.6)} 148.7 L${ax(28.8)} 151.3" stroke="${shade(shirtWhite, -0.35)}" stroke-width=".7" opacity=".7"/>`;
        if (aIdx === 2) { f += `<circle cx="${ax(23.6)}" cy="151.6" r="1.4" fill="${ACCENTS[2]}"/><circle cx="${ax(23.2)}" cy="151.1" r=".45" fill="#fff"/>`; }
      }
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
