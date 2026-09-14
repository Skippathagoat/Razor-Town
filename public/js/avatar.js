// Razor Town — character art (2026 overhaul).
// One renderer family built from a 6-part avatar spec: "skin|face|hair|top|accent|body"
//   body = 0 → masculine build, body = 1 → feminine build (real proportioned silhouette)
//   AV.svgFor(spec, size)      small square portrait (lists, header, chat)
//   AV.doll(spec, size, opts)  full-length character model with drawn bottoms + sneakers
// The wardrobe is 100% modern streetwear — the vintage 1920s rack was cleared out.
// Original vector work only; no third-party sprites.
(function () {
  'use strict';

  // ---------------------------------------------------------------- palette
  const SKINS = ['#e8b48c', '#d99b6c', '#a96d45', '#7d4e2f', '#e6c39a',
                 '#c98d65', '#8a5a3b', '#f0d7b8', '#5e3a22'];
  const SKIN_NAMES = ['Fair', 'Ruddy', 'Olive', 'Deep brown', 'Pale', 'Bronzed', 'Umber', 'Ivory', 'Ebony'];

  // hair entry: { c: color, t: shape, cap: optional headwear, f: feminine-leaning, n: name }
  const HAIRS = [
    // ---- men's / unisex cuts
    { c: '#141210', t: 'buzz',                 n: 'Buzz cut' },
    { c: '#241a12', t: 'crop',                 n: 'Textured crop' },
    { c: '#191512', t: 'side',                 n: 'Fade, side part' },
    { c: '#0e0c0b', t: 'slick',                n: 'Slicked back' },
    { c: '#241a12', t: 'pomp',                 n: 'Modern pompadour' },
    { c: '#3b2416', t: 'quiff',                n: 'Messy quiff' },
    { c: '#2e2018', t: 'bowl',                 n: 'Bowl crop' },
    { c: '#1c1410', t: 'curtain',              n: 'Curtain middle part' },
    { c: '#171310', t: 'hawk',                 n: 'Faux hawk' },
    { c: '#4a2a16', t: 'longm',                n: 'Surfer length' },
    { c: '#5b3317', t: 'curls',                n: 'Loose curls' },
    { c: '#171310', t: 'cornrows',             n: 'Cornrows, tight' },
    { c: '#101010', t: 'afro',                 n: 'Natural afro' },
    { c: '#1c1410', t: 'dreads',               n: 'Dreadlocks' },
    { c: '#191512', t: 'bald',                 n: 'Razor shaved' },
    // ---- women's cuts
    { c: '#141210', t: 'long',    f: 1,        n: 'Long, straight black' },
    { c: '#4a2a16', t: 'longw',   f: 1,        n: 'Long brunette waves' },
    { c: '#c9a86a', t: 'long',    f: 1,        n: 'Long platinum' },
    { c: '#7a3a1e', t: 'ponytail',f: 1,        n: 'High ponytail' },
    { c: '#141210', t: 'ponytail',f: 1,        n: 'Sleek high pony' },
    { c: '#241a12', t: 'buns',    f: 1,        n: 'Space buns' },
    { c: '#171310', t: 'braids',  f: 1,        n: 'Box braids' },
    { c: '#5b1f1a', t: 'bob',     f: 1,        n: 'Auburn bob' },
    { c: '#101010', t: 'bob',     f: 1,        n: 'Sharp black bob' },
    { c: '#3b2416', t: 'pixie',   f: 1,        n: 'Pixie crop' },
    { c: '#241a12', t: 'topbun',  f: 1,        n: 'Top-knot bun' },
    { c: '#5b3317', t: 'lob',     f: 1,        n: 'Layered lob, fringe' },
    { c: '#101010', t: 'puffs',   f: 1,        n: 'Double afro puffs' },
    { c: '#2e2018', t: 'underf',  f: 1,        n: 'Side-shave undercut' },
    { c: '#8a2f3a', t: 'longw',   f: 1,        n: 'Cherry waves' },
    // ---- street headwear (hair sits under it)
    { c: '#3d3040', t: 'crop', cap: 'beanie',   n: 'Ribbed beanie' },
    { c: '#20262e', t: 'crop', cap: 'snapback', n: 'Snapback, flat brim' },
    { c: '#4a4034', t: 'crop', cap: 'bucket',   n: 'Bucket hat' },
    { c: '#7d2f33', t: 'crop', cap: 'bandana',  n: 'Bandana wrap' },
    { c: '#2b3238', t: 'crop', cap: 'capback',  n: 'Dad cap, backwards' },
    { c: '#26303a', t: 'crop', cap: 'trucker',  n: 'Trucker cap' },
    { c: '#33261f', t: 'crop', cap: 'beret',    n: 'Wool beret' },
    { c: '#1c1c22', t: 'crop', cap: 'headband', n: 'Sport headband' }
  ];

  // tops: { c: color, s: style key, f: feminine cut, n: name }
  const SHIRTS = [
    { c: '#1c1c22', s: 'hoodie',   n: 'Black oversized hoodie' },
    { c: '#6b7f8f', s: 'ziphoo',   n: 'Slate zip hoodie' },
    { c: '#7d2f33', s: 'hoodie',   n: 'Crimson pullover hoodie' },
    { c: '#1f4d3a', s: 'track',    n: 'Forest track jacket' },
    { c: '#28395c', s: 'track',    n: 'Indigo track jacket' },
    { c: '#2b3238', s: 'bomber',   n: 'Charcoal bomber' },
    { c: '#5c3d2b', s: 'puffer',   n: 'Chocolate puffer' },
    { c: '#39455a', s: 'puffer',   n: 'Glacier puffer' },
    { c: '#d8d2c0', s: 'tee',      n: 'Off-white boxy tee' },
    { c: '#141414', s: 'tee',      n: 'Black graphic tee' },
    { c: '#3a3f47', s: 'bigtee',   n: 'Heavy grey tee' },
    { c: '#55606c', s: 'tank',     n: 'Grey rib tank' },
    { c: '#3d6b4f', s: 'polo',     n: 'Forest pique polo' },
    { c: '#33455c', s: 'denim',    n: 'Indigo denim trucker' },
    { c: '#6e3a2f', s: 'flannel',  n: 'Rust flannel overshirt' },
    { c: '#3a506e', s: 'wind',     n: 'Navy panel windbreaker' },
    { c: '#4a5570', s: 'varsity',  n: 'Grey-letter varsity' },
    { c: '#16161a', s: 'moto',     n: 'Black moto leathers' },
    { c: '#20242a', s: 'tech',     n: 'Graphite tech shell' },
    { c: '#4c6a6e', s: 'gilet',    n: 'Slate utility gilet' },
    { c: '#8f2f28', s: 'jersey',   n: 'Crimson football shirt' },
    { c: '#2b6b74', s: 'jersey',   n: 'Teal-stripe kit' },
    { c: '#23232a', s: 'longcoat', n: 'Black longline coat' },
    { c: '#b8b2a2', s: 'denim',    n: 'Stone chore jacket' },
    { c: '#402a2a', s: 'rugby',    n: 'Maroon rugby shirt' },
    { c: '#1f2430', s: 'jersey',   n: 'Midnight soccer kit' },
    { c: '#c9803a', s: 'puffer',   n: 'Amber puffer' },
    { c: '#e6e2d6', s: 'ziphoo',   n: 'Cream fleece zip' },
    { c: '#2e3440', s: 'wind',     n: 'Onyx windrunner' },
    { c: '#a83246', s: 'varsity',  n: 'Cherry varsity' },
    { c: '#334532', s: 'flannel',  n: 'Olive overshirt' },
    { c: '#101010', s: 'gilet',    n: 'Shadow tech gilet' },
    // ---- women's streetwear
    { c: '#d8a7b8', s: 'crophoo',  f: 1, n: 'Blush crop hoodie' },
    { c: '#141414', s: 'croppuff', f: 1, n: 'Black cropped puffer' },
    { c: '#7d5fa0', s: 'croptop',  f: 1, n: 'Lilac crop top' },
    { c: '#2e6f5e', s: 'babytee',  f: 1, n: 'Sage baby tee' },
    { c: '#8f2f28', s: 'dress',    f: 1, n: 'Cherry bodycon dress' },
    { c: '#141414', s: 'slip',     f: 1, n: 'Black slip dress' },
    { c: '#4a6fa5', s: 'skirtset', f: 1, n: 'Denim mini, white tee' },
    { c: '#33455c', s: 'tennis',   f: 1, n: 'Pleated tennis set' },
    { c: '#aab4bd', s: 'babytee',  f: 1, n: 'Silver mesh tee' },
    { c: '#5c4a6e', s: 'cardigan', f: 1, n: 'Plum knit cardigan' },
    { c: '#d9c36a', s: 'bomber',   f: 1, n: 'Gold-thread bomber' },
    { c: '#64748b', s: 'track',    f: 1, n: 'Dove track jacket' },
    { c: '#b0526a', s: 'croptop',  f: 1, n: 'Rose gym crop' },
    { c: '#1c1c22', s: 'dress',    f: 1, n: 'Black skater dress' }
  ];
  const SHIRT_NAMES = SHIRTS.map(x => x.n);
  const SHIRT_STYLE = SHIRTS.map(x => x.s);

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
    { eye: 'round', brow: 0, mouth: 1, lashes: true, rouge: true, n: 'Painted' },
    // ---- new faces (2026)
    { eye: 'round', brow: 0, mouth: 0, lashes: true, n: 'Soft' },
    { eye: 'round', brow: 0, mouth: 1, lashes: true, rouge: true, gloss: true, n: 'Glam' },
    { eye: 'sharp', brow: 1, mouth: 2, lashes: true, n: 'Fierce' },
    { eye: 'round', brow: 0, mouth: 0, freckles: true, n: 'Freckled' },
    { eye: 'round', brow: 0, mouth: 1, beard: 'goatee', n: 'Goatee' },
    { eye: 'half',  brow: 0, mouth: 0, stubble: true, n: 'Five o\u2019clock' }
  ];

  const ACCENTS = ['#c9a24b', '#8f2f28', '#cfc2a6', '#5f7d5e', '#2e4a4a',
                   '#e6ddc4', '#b03030', '#d8d2c0', '#6a3b22', '#e0d6c2',
                   '#7d2432', '#8a8d91', '#2b3a55',
                   '#d4af5a', '#c8cdd4', '#e6e2d6', '#2b2318', '#1c1c20', '#b0b6bd',
                   '#26b8c9', '#6d4c2f', '#d9c36a', '#c8cdd4', '#8f2f28', '#9aa0a8',
                   '#e8e2f0', '#1c1c22', '#d4a373', '#5a8f7b'];
  const ACCENT_NAMES = ['Gold watch chain', 'Oxblood pin', 'Ivory cufflinks', 'Green enamel stud', 'Teal silk tie',
                        'Cream pocket square', 'Red carnation', 'Silver monocle', 'Unlit cigar', 'Cigarette holder',
                        'Burgundy silk scarf', 'Steel tie pin', 'Navy polka cravat',
                        'Cuban link chain', 'Silver curb chain', 'Diamond-drop pendant', 'Aviator shades', 'Wayfarer shades',
                        'Round wire specs', 'Smartwatch', 'Field watch, leather strap', 'Stud earring', 'Silver hoops',
                        'Skull bandana necktie', 'Dog tags, army',
                        'Pearl strand', 'Black choker', 'Amber bead bracelet', 'Jade lucky pendant'];

  // garment metadata: what the equipment sheet reports, driven by the top's style.
  const GARMENT = {
    hoodie:   { bottom: 'Baggy joggers',      shoes: 'Chunky trainers' },
    ziphoo:   { bottom: 'Slim joggers',       shoes: 'Running trainers' },
    crophoo:  { bottom: 'High-waist cargos',  shoes: 'Chunky trainers' },
    track:    { bottom: 'Track bottoms',      shoes: 'Running trainers' },
    bomber:   { bottom: 'Dark cargo pants',   shoes: 'Combat boots' },
    puffer:   { bottom: 'Nylon cargos',       shoes: 'Trail boots' },
    croppuff: { bottom: 'Leggings',           shoes: 'High-tops' },
    tee:      { bottom: 'Straight jeans',     shoes: 'Canvas low-tops' },
    bigtee:   { bottom: 'Bike shorts',        shoes: 'Chunky trainers' },
    babytee:  { bottom: 'Low-rise jeans',     shoes: 'Platform sneakers' },
    tank:     { bottom: 'Basketball shorts',  shoes: 'High-tops' },
    croptop:  { bottom: 'Pleated mini skirt', shoes: 'High-tops' },
    polo:     { bottom: 'Chinos',             shoes: 'Court sneakers' },
    denim:    { bottom: 'Black jeans',        shoes: 'Chukka boots' },
    flannel:  { bottom: 'Faded jeans',        shoes: 'Skate shoes' },
    wind:     { bottom: 'Cuffed joggers',     shoes: 'Racing trainers' },
    varsity:  { bottom: 'Straight jeans',     shoes: 'Court sneakers' },
    moto:     { bottom: 'Slim black jeans',   shoes: 'Engineer boots' },
    tech:     { bottom: 'Parachute cargos',   shoes: 'Tech runners' },
    gilet:    { bottom: 'Tapered joggers',    shoes: 'Trail trainers' },
    jersey:   { bottom: 'Football shorts',    shoes: 'Astro trainers' },
    rugby:    { bottom: 'Chino shorts',       shoes: 'Trainers' },
    longcoat: { bottom: 'Wide-leg trousers',  shoes: 'Chelsea boots' },
    dress:    { bottom: 'Bare legs',          shoes: 'High-top sneakers' },
    slip:     { bottom: 'Bare legs',          shoes: 'Slides' },
    skirtset: { bottom: 'Denim mini skirt',   shoes: 'Canvas high-tops' },
    tennis:   { bottom: 'Pleated court skirt',shoes: 'Court sneakers' },
    cardigan: { bottom: 'Mom jeans',          shoes: 'Loafer sneakers' }
  };

  const BODIES = ['Masculine build', 'Feminine build'];

  // styles that read as dresses/skirts → bare legs on the doll
  const DRESSY = { dress: 1, slip: 1 };
  const SKIRTY = { skirtset: 1, tennis: 1, croptop: 1 };
  const CROPPED = { crophoo: 1, croppuff: 1, croptop: 1, babytee: 1 };

  function num(v, mx) { v = parseInt(v, 10); return isNaN(v) ? 0 : Math.min(mx, Math.max(0, v)); }
  function parts(s) {
    const a = String(s || '').split('|');
    return {
      skin: num(a[0], SKINS.length - 1),
      face: num(a[1], FACE_FEAT.length - 1),
      hair: num(a[2], HAIRS.length - 1),
      shirt: num(a[3], SHIRTS.length - 1),
      accent: num(a[4], ACCENTS.length - 1),
      body: num(a[5], 1)
    };
  }
  function isFem(p) { return p.body === 1; }
  function hash(s) { s = String(s == null ? '' : s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); }
  function shade(hex, amt) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // What the character is actually wearing — every line comes from a real creator choice.
  function wear(s) {
    const p = parts(s);
    const h = HAIRS[p.hair];
    const style = SHIRTS[p.shirt].s;
    const g = GARMENT[style] || GARMENT.tee;
    const capIcon = { beanie: '🧶', snapback: '🧢', bucket: '👒', bandana: '🏴', capback: '🧢', trucker: '🧢', beret: '🫐', headband: '🎽' }[h.cap];
    const fem = isFem(p);
    return [
      { slot: 'Headwear', icon: capIcon || (h.t === 'bald' ? '🪮' : (h.f ? '💁‍♀️' : '💇')), value: h.n },
      { slot: 'Top', icon: fem ? '👚' : '👕', value: SHIRTS[p.shirt].n },
      { slot: 'Bottoms', icon: (DRESSY[style] || SKIRTY[style]) ? '🩳' : '👖', value: g.bottom },
      { slot: 'Feet', icon: '👟', value: g.shoes },
      { slot: 'Build', icon: fem ? '♀' : '♂', value: BODIES[p.body] },
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
        <stop offset="0%" stop-color="#2c2c33"/><stop offset="100%" stop-color="#101014"/>
      </linearGradient>
      <radialGradient id="gl${u}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${acc}" stop-opacity=".2"/><stop offset="100%" stop-color="${acc}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
  }

  // ---------------------------------------------------------------- face (shared)
  function faceSVG(feat, hair, acc, cx, cy, sc, u) {
    const S = (v) => v * sc;
    const hc = hair.c, browc = (hair.t === 'bald' || hair.cap) ? shade(hc, 0.3) : hc;
    const exL = cx - S(9.5), exR = cx + S(9.5), ey = cy - S(1);
    let f = '';

    for (const sx of [-1, 1]) {
      const x = cx + sx * S(22);
      f += `<ellipse cx="${x}" cy="${cy + S(2)}" rx="${S(3.4)}" ry="${S(5.6)}" fill="url(#sk${u})"/>`;
      f += `<path d="M${x} ${cy - S(1)} q${sx * S(1.6)} ${S(2.6)} 0 ${S(5)}" stroke="${shade('#000', 0.4)}" stroke-width="${S(0.9)}" fill="none" opacity=".35"/>`;
    }

    f += `<path d="M${cx - S(21.5)} ${cy - S(4)} Q${cx - S(22.5)} ${cy - S(26)} ${cx} ${cy - S(28)}
                  Q${cx + S(22.5)} ${cy - S(26)} ${cx + S(21.5)} ${cy - S(4)}
                  Q${cx + S(20.5)} ${cy + S(11)} ${cx + S(14)} ${cy + S(18.5)}
                  Q${cx + S(7.5)} ${cy + S(25)} ${cx} ${cy + S(25)}
                  Q${cx - S(7.5)} ${cy + S(25)} ${cx - S(14)} ${cy + S(18.5)}
                  Q${cx - S(20.5)} ${cy + S(11)} ${cx - S(21.5)} ${cy - S(4)} Z" fill="url(#sk${u})"/>`;
    f += `<ellipse cx="${cx - S(13)}" cy="${cy + S(12)}" rx="${S(4.4)}" ry="${S(3)}" fill="#000" opacity=".10"/>`;
    f += `<ellipse cx="${cx + S(13)}" cy="${cy + S(12)}" rx="${S(4.4)}" ry="${S(3)}" fill="#000" opacity=".10"/>`;
    f += `<ellipse cx="${cx + S(9)}" cy="${cy - S(10)}" rx="${S(6.5)}" ry="${S(4.5)}" fill="#000" opacity=".06"/>`;
    if (feat.rouge) for (const sx of [-1, 1])
      f += `<ellipse cx="${cx + sx * S(11.5)}" cy="${cy + S(8)}" rx="${S(4.6)}" ry="${S(3)}" fill="#c9665a" opacity=".22"/>`;
    if (feat.freckles) {
      for (const [dx, dy] of [[-9, 6.4], [-6, 8.2], [-11, 9], [6, 8.2], [9, 6.4], [11, 9], [-3, 7.6], [3, 7.6]])
        f += `<circle cx="${cx + S(dx)}" cy="${cy + S(dy)}" r="${S(0.62)}" fill="#7a4a2c" opacity=".5"/>`;
    }

    const bw = feat.brow === 1 ? 2.4 : feat.brow === 2 ? -1.6 : 0;
    const bwt = feat.brow === 2 ? 3.4 : feat.lashes ? 2.1 : 2.6;
    for (const [ex, sx] of [[exL, -1], [exR, 1]])
      f += `<path d="M${ex - S(6)} ${ey - S(7.6) + sx * S(bw) * -1} Q${ex} ${ey - S(9.6) + sx * S(bw) * -0.4} ${ex + S(6)} ${ey - S(7.2) + sx * S(bw)}"
                    stroke="${browc}" stroke-width="${S(bwt)}" stroke-linecap="round" fill="none" opacity=".9"/>`;

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

    f += `<path d="M${cx + S(1.6)} ${cy + S(2.5)} Q${cx - S(0.6)} ${cy + S(7)} ${cx - S(0.9)} ${cy + S(9.6)}" stroke="#000" stroke-width="${S(1.15)}" fill="none" opacity=".16" stroke-linecap="round"/>`;
    f += `<path d="M${cx - S(3.1)} ${cy + S(11.4)} Q${cx - S(1.1)} ${cy + S(13.1)} ${cx + S(0.4)} ${cy + S(11.9)}" stroke="#000" stroke-width="${S(1.5)}" fill="none" opacity=".34" stroke-linecap="round"/>`;
    f += `<path d="M${cx + S(1.4)} ${cy + S(11.7)} Q${cx + S(3)} ${cy + S(12.4)} ${cx + S(3.9)} ${cy + S(11.2)}" stroke="#000" stroke-width="${S(1.5)}" fill="none" opacity=".3" stroke-linecap="round"/>`;
    f += `<circle cx="${cx - S(0.4)}" cy="${cy + S(9.8)}" r="${S(0.7)}" fill="#fff" opacity=".28"/>`;

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
    if (feat.gloss) f += `<ellipse cx="${cx}" cy="${my + S(1.4)}" rx="${S(4.4)}" ry="${S(1.6)}" fill="#d96a7a" opacity=".5"/><ellipse cx="${cx - S(1.4)}" cy="${my + S(0.9)}" rx="${S(1.1)}" ry="${S(0.5)}" fill="#fff" opacity=".55"/>`;

    if (feat.stache === 'pencil')
      f += `<path d="M${cx - S(7)} ${my - S(2.9)} Q${cx} ${my - S(4.7)} ${cx + S(7)} ${my - S(2.9)}" stroke="${browc}" stroke-width="${S(1.7)}" fill="none" stroke-linecap="round"/>`;
    else if (feat.stache === 'handlebar') {
      f += `<path d="M${cx - S(7.5)} ${my - S(2)} Q${cx - S(4)} ${my - S(5)} ${cx} ${my - S(3.4)} Q${cx + S(4)} ${my - S(5)} ${cx + S(7.5)} ${my - S(2)} Q${cx + S(10.5)} ${my - S(0.6)} ${cx + S(10)} ${my - S(2.8)} Q${cx + S(11.5)} ${my - S(2.2)} ${cx + S(10.6)} ${my - S(1)} Q${cx + S(8.6)} ${my + S(0.6)} ${cx + S(6.6)} ${my - S(1)} Q${cx + S(3)} ${my - S(2.4)} ${cx} ${my - S(2.2)} Q${cx - S(3)} ${my - S(2.4)} ${cx - S(6.6)} ${my - S(1)} Q${cx - S(8.6)} ${my + S(0.6)} ${cx - S(10.6)} ${my - S(1)} Q${cx - S(11.5)} ${my - S(2.2)} ${cx - S(10)} ${my - S(2.8)} Q${cx - S(10.5)} ${my - S(0.6)} ${cx - S(7.5)} ${my - S(2)} Z" fill="${browc}"/>`;
    }
    if (feat.beard === 'full') {
      f += `<path d="M${cx - S(17)} ${cy + S(4)} Q${cx - S(15.5)} ${cy + S(12)} ${cx - S(12.5)} ${cy + S(17.5)} Q${cx - S(8)} ${cy + S(24.5)} ${cx} ${cy + S(24.8)} Q${cx + S(8)} ${cy + S(24.5)} ${cx + S(12.5)} ${cy + S(17.5)} Q${cx + S(15.5)} ${cy + S(12)} ${cx + S(17)} ${cy + S(4)} L${cx + S(13)} ${cy + S(8)} Q${cx + S(11)} ${cy + S(16)} ${cx} ${cy + S(21)} Q${cx - S(11)} ${cy + S(16)} ${cx - S(13)} ${cy + S(8)} Z" fill="${browc}" opacity=".95"/>`;
      f += `<path d="M${cx - S(6.5)} ${my - S(3.2)} Q${cx} ${my - S(5)} ${cx + S(6.5)} ${my - S(3.2)} L${cx + S(5)} ${my - S(1.4)} Q${cx} ${my - S(2.6)} ${cx - S(5)} ${my - S(1.4)} Z" fill="${browc}"/>`;
    } else if (feat.beard === 'goatee') {
      f += `<path d="M${cx - S(8)} ${my + S(2)} Q${cx - S(7)} ${cy + S(23.5)} ${cx} ${cy + S(24.6)} Q${cx + S(7)} ${cy + S(23.5)} ${cx + S(8)} ${my + S(2)} L${cx + S(5)} ${my + S(1)} Q${cx + S(4.5)} ${cy + S(20.5)} ${cx} ${cy + S(21)} Q${cx - S(4.5)} ${cy + S(20.5)} ${cx - S(5)} ${my + S(1)} Z" fill="${browc}" opacity=".92"/>`;
      f += `<path d="M${cx - S(6.5)} ${my - S(3)} Q${cx} ${my - S(4.8)} ${cx + S(6.5)} ${my - S(3)} L${cx + S(5)} ${my - S(1.2)} Q${cx} ${my - S(2.4)} ${cx - S(5)} ${my - S(1.2)} Z" fill="${browc}"/>`;
    }
    if (feat.chops) for (const sx of [-1, 1])
      f += `<path d="M${cx + sx * S(19.5)} ${cy + 0} q0 ${S(10)} ${sx * S(-3.4)} ${S(15.5)} q${sx * S(-2.6)} ${S(2.4)} ${sx * S(-4.6)} ${S(-0.6)} q${sx * S(2.4)} ${S(-6.6)} ${sx * S(1.4)} ${S(-13.4)} Z" fill="${browc}"/>`;
    if (feat.stubble)
      f += `<path d="M${cx - S(15.5)} ${cy + S(7)} Q${cx - S(13)} ${cy + S(18)} ${cx} ${cy + S(23.5)} Q${cx + S(13)} ${cy + S(18)} ${cx + S(15.5)} ${cy + S(7)} L${cx + S(11.5)} ${cy + S(9)} Q${cx + S(9)} ${cy + S(16.5)} ${cx} ${cy + S(20.5)} Q${cx - S(9)} ${cy + S(16.5)} ${cx - S(11.5)} ${cy + S(9)} Z" fill="${browc}" opacity=".22"/>`;
    if (feat.scar) {
      f += `<path d="M${cx + S(6)} ${cy + S(4)} L${cx + S(12.5)} ${cy + S(13)}" stroke="#d9b9a0" stroke-width="${S(1.3)}" stroke-linecap="round" opacity=".75"/>`;
      f += `<path d="M${cx + S(6.9)} ${cy + S(6.7)} l${S(2.2)} ${S(0.4)} M${cx + S(8.4)} ${cy + S(9)} l${S(2.2)} ${S(0.4)}" stroke="#d9b9a0" stroke-width="${S(0.8)}" opacity=".6"/>`;
    }

    // face-mounted trinkets (index-stable)
    if (acc === 7) {
      f += `<circle cx="${exR}" cy="${ey + S(0.4)}" r="${S(5.1)}" fill="#fff" opacity=".07" stroke="#d8d2c0" stroke-width="${S(1.5)}"/>`;
      f += `<path d="M${exR + S(4.2)} ${ey + S(3.4)} Q${cx + S(18)} ${cy + S(14)} ${cx + S(15)} ${cy + S(24)}" stroke="#d8d2c0" stroke-width="${S(0.9)}" fill="none" opacity=".7"/>`;
    } else if (acc === 8) {
      f += `<g transform="rotate(14 ${cx + S(8)} ${cy + S(15.5)})"><rect x="${cx + S(4.4)}" y="${cy + S(14)}" width="${S(9.5)}" height="${S(2.9)}" rx="${S(1.4)}" fill="#5a3319"/>`;
      f += `<rect x="${cx + S(11.9)}" y="${cy + S(14)}" width="${S(2)}" height="${S(2.9)}" fill="#8a5a30"/></g>`;
    } else if (acc === 9) {
      f += `<path d="M${cx + S(4.4)} ${cy + S(15.4)} L${cx + S(14)} ${cy + S(11.6)}" stroke="#2a2015" stroke-width="${S(1.7)}" stroke-linecap="round"/>`;
      f += `<path d="M${cx + S(13)} ${cy + S(12)} L${cx + S(16.6)} ${cy + S(10.6)}" stroke="#e8e0cc" stroke-width="${S(1.9)}" stroke-linecap="round"/>`;
    } else if (acc === 16) {
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<path d="M${ex - S(6.2)} ${ey - S(3.2)} Q${ex} ${ey - S(4.6)} ${ex + S(6.2)} ${ey - S(3.2)} Q${ex + S(6)} ${ey + S(4.4)} ${ex + sx * -S(1.2)} ${ey + S(4.6)} Q${ex - S(5.6)} ${ey + S(4.2)} ${ex - S(6.2)} ${ey - S(3.2)} Z" fill="#1a1712" opacity=".88" stroke="#3d3425" stroke-width="${S(0.9)}"/>`;
        f += `<path d="M${ex + sx * S(6)} ${ey - S(3.4)} L${cx + sx * S(19.5)} ${cy - S(9.5)}" stroke="${shade('#3d3425', 0.1)}" stroke-width="${S(1)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(5.8)} ${ey - S(3.4)} Q${cx} ${ey - S(5.8)} ${exR - S(5.8)} ${ey - S(3.4)}" stroke="${shade('#3d3425', 0.15)}" stroke-width="${S(1.1)}" fill="none"/>`;
    } else if (acc === 17) {
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<path d="M${ex - S(6.4)} ${ey - S(4.2)} L${ex + S(6.4)} ${ey - S(4.6)} L${ex + S(6)} ${ey + S(3.2)} L${ex - S(5.6)} ${ey + S(3.8)} Z" fill="#141414" opacity=".92"/>`;
        f += `<path d="M${ex + sx * S(6.4)} ${ey - S(4.4)} L${cx + sx * S(19.5)} ${cy - S(9)}" stroke="#202020" stroke-width="${S(1.5)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(6.2)} ${ey - S(4.3)} Q${cx} ${ey - S(5.8)} ${exR - S(6.2)} ${ey - S(4.4)}" stroke="#202020" stroke-width="${S(1.5)}" fill="none"/>`;
    } else if (acc === 18) {
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(9.5);
        f += `<circle cx="${ex}" cy="${ey + S(0.3)}" r="${S(4.6)}" fill="#cfe0e8" opacity=".12"/>`;
        f += `<circle cx="${ex}" cy="${ey + S(0.3)}" r="${S(4.6)}" fill="none" stroke="${shade('#b0b6bd', 0.05)}" stroke-width="${S(1.1)}"/>`;
        f += `<path d="M${ex + sx * S(4.4)} ${ey - S(1.6)} L${cx + sx * S(19.5)} ${cy - S(9.5)}" stroke="#b0b6bd" stroke-width="${S(0.9)}" opacity=".9"/>`;
      }
      f += `<path d="M${exL + S(4.4)} ${ey - S(1)} Q${cx} ${ey - S(2.6)} ${exR - S(4.4)} ${ey - S(1)}" stroke="#b0b6bd" stroke-width="${S(1)}" fill="none"/>`;
    } else if (acc === 21 || acc === 22) {
      for (const sx of [-1, 1]) {
        const ex = cx + sx * S(22);
        if (acc === 21) { f += `<circle cx="${ex}" cy="${cy + S(7.6)}" r="${S(1.15)}" fill="${ACCENTS[21]}"/><circle cx="${ex - S(0.35)}" cy="${cy + S(7.2)}" r="${S(0.4)}" fill="#fff" opacity=".8"/>`; }
        else { f += `<circle cx="${ex}" cy="${cy + S(8)}" r="${S(2.3)}" fill="none" stroke="${ACCENTS[22]}" stroke-width="${S(1)}"/><circle cx="${ex}" cy="${cy + S(8)}" r="${S(1.4)}" fill="none" stroke="${shade(ACCENTS[22], -0.25)}" stroke-width="${S(0.5)}" opacity=".7"/>`; }
      }
    }
    return f;
  }

  // ---------------------------------------------------------------- hair & headwear
  // Shapes cover every entry in HAIRS; long styles are drawn with a front piece here and
  // a back panel via hairBackSVG (drawn behind the body on the full doll).
  function headwearSVG(hair, cx, cy, sc, u) {
    const S = (v) => v * sc;
    const hc = hair.c;
    const top = cy - S(28);
    const L = cx - S(21.5), R = cx + S(21.5);
    let f = '';

    function sideburns() {
      for (const sx of [-1, 1])
        f += `<path d="M${cx + sx * S(18.5)} ${cy - S(2)} q${sx * S(-1.2)} ${S(7)} ${sx * S(-1)} ${S(13)}" stroke="${hc}" stroke-width="${S(1.8)}" fill="none" opacity=".55" stroke-linecap="round"/>`;
    }
    function capShell() { // standard crown cover used by short styles
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(2)} ${cx} ${top - S(2)} Q${cx + S(22.5)} ${top + S(2)} ${R} ${cy - S(4)} Q${cx + S(14)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(14)} ${cy - S(15.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
    }

    const t = hair.t;
    if (t === 'buzz') {
      capShell();
      f += `<g opacity=".28">${[[-14, -18], [-6, -22], [3, -23], [11, -19], [16, -12]].map(([x, y]) => `<circle cx="${cx + S(x)}" cy="${cy + S(y)}" r="${S(0.9)}" fill="#000"/>`).join('')}</g>`;
    } else if (t === 'crop') {
      capShell();
      f += `<path d="M${cx - S(10)} ${top + S(0.4)} Q${cx} ${top - S(2)} ${cx + S(10)} ${top + S(1)}" stroke="${shade(hc, 0.24)}" stroke-width="${S(1.6)}" fill="none" opacity=".5" stroke-linecap="round"/>`;
    } else if (t === 'side') {
      capShell();
      f += `<path d="M${cx + S(2)} ${top - S(1.6)} L${cx - S(1)} ${cy - S(15)}" stroke="${shade(hc, 0.45)}" stroke-width="${S(1.2)}" opacity=".9"/>`;
      f += `<path d="M${cx - S(15)} ${cy - S(12)} Q${cx - S(4)} ${cy - S(17.5)} ${cx + S(14)} ${cy - S(10.5)}" stroke="${shade(hc, 0.16)}" stroke-width="${S(1.4)}" fill="none" opacity=".6"/>`;
    } else if (t === 'slick') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(2)} ${cx} ${top - S(2)} Q${cx + S(22.5)} ${top + S(2)} ${R} ${cy - S(4)} Q${cx + S(12)} ${cy - S(16.8)} ${cx} ${cy - S(16.8)} Q${cx - S(12)} ${cy - S(16.8)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      for (let i = -2; i <= 2; i++)
        f += `<path d="M${cx + i * S(6)} ${top + S(1)} Q${cx + i * S(7.4)} ${cy - S(12)} ${cx + i * S(8.4)} ${cy - S(6)}" stroke="${shade(hc, 0.3)}" stroke-width="${S(0.9)}" fill="none" opacity=".5"/>`;
    } else if (t === 'pomp') {
      f += `<path d="M${L} ${cy - S(3)} Q${cx - S(24)} ${top - S(2)} ${cx - S(9)} ${top - S(4.5)} Q${cx - S(10)} ${top - S(14)} ${cx + S(6)} ${top - S(13)} Q${cx + S(22)} ${top - S(12)} ${cx + S(20)} ${top + S(2)} Q${cx + S(22.5)} ${cy - S(6)} ${R} ${cy - S(3)} Q${cx + S(12)} ${cy - S(15)} ${cx} ${cy - S(15)} Q${cx - S(12)} ${cy - S(15)} ${L} ${cy - S(3)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(7)} ${top - S(9)} q${S(9)} ${S(-1.8)} ${S(15)} ${S(3.6)}" stroke="#fff" stroke-width="${S(1.7)}" fill="none" opacity=".13" stroke-linecap="round"/>`;
    } else if (t === 'quiff') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23)} ${top + S(1)} ${cx - S(6)} ${top - S(9)} Q${cx + S(2)} ${top - S(12)} ${cx + S(12)} ${top - S(6)} Q${cx + S(21)} ${top - S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(13)} ${cy - S(15.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(10)} ${top - S(5)} q${S(6)} ${S(-4)} ${S(14)} ${S(-1)}" stroke="${shade(hc, 0.28)}" stroke-width="${S(1.3)}" fill="none" opacity=".7"/>`;
    } else if (t === 'bowl') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23)} ${top - S(1)} ${cx} ${top - S(3)} Q${cx + S(23)} ${top - S(1)} ${R} ${cy - S(4)} Q${cx + S(11)} ${cy - S(10.5)} ${cx} ${cy - S(10.5)} Q${cx - S(11)} ${cy - S(10.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
    } else if (t === 'curtain') {
      f += `<path d="M${L} ${cy - S(3)} Q${cx - S(23)} ${top - S(1)} ${cx} ${top - S(3)} Q${cx + S(23)} ${top - S(1)} ${R} ${cy - S(3)} L${cx + S(16)} ${cy + S(2)} Q${cx + S(13)} ${cy - S(12)} ${cx + S(1.6)} ${cy - S(14)} L${cx} ${cy - S(10)} L${cx - S(1.6)} ${cy - S(14)} Q${cx - S(13)} ${cy - S(12)} ${cx - S(16)} ${cy + S(2)} Z" fill="${hc}"/>`;
    } else if (t === 'hawk') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22)} ${top + S(3)} ${cx - S(7)} ${top - S(1)} L${cx + S(7)} ${top - S(1)} Q${cx + S(22)} ${top + S(3)} ${R} ${cy - S(4)} Q${cx + S(15)} ${cy - S(13)} ${cx + S(6)} ${cy - S(14.5)} L${cx - S(6)} ${cy - S(14.5)} Q${cx - S(15)} ${cy - S(13)} ${L} ${cy - S(4)} Z" fill="${shade(hc, 0.06)}" opacity=".55"/>`;
      f += `<path d="M${cx - S(7)} ${top + S(0.5)} Q${cx - S(8)} ${top - S(11)} ${cx} ${top - S(12)} Q${cx + S(8)} ${top - S(11)} ${cx + S(7)} ${top + S(0.5)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(3)} ${top - S(9)} q${S(3)} ${S(-2)} ${S(6)} 0" stroke="${shade(hc, 0.3)}" stroke-width="${S(1.2)}" fill="none" opacity=".7"/>`;
    } else if (t === 'longm') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23.5)} ${top - S(2)} ${cx} ${top - S(3.4)} Q${cx + S(23.5)} ${top - S(2)} ${R} ${cy - S(4)} L${cx + S(22)} ${cy + S(14)} Q${cx + S(16)} ${cy + S(17)} ${cx + S(13)} ${cy + S(14)} Q${cx + S(16)} ${cy + S(2)} ${cx + S(14)} ${cy - S(6)} Q${cx + S(8)} ${cy - S(14)} ${cx} ${cy - S(14)} Q${cx - S(8)} ${cy - S(14)} ${cx - S(14)} ${cy - S(6)} Q${cx - S(16)} ${cy + S(2)} ${cx - S(13)} ${cy + S(14)} Q${cx - S(16)} ${cy + S(17)} ${cx - S(22)} ${cy + S(14)} Z" fill="${hc}"/>`;
    } else if (t === 'curls') {
      capShell();
      const bumps = [[-17, -6], [-11, -13], [-3, -16.5], [5, -16], [13, -12], [18.5, -5.5], [-19, 1], [19.5, 1]];
      for (const [bx, by] of bumps)
        f += `<circle cx="${cx + S(bx)}" cy="${cy + S(by)}" r="${S(3.6)}" fill="${shade(hc, 0.08)}"/>`;
    } else if (t === 'cornrows') {
      capShell();
      for (let i = 0; i < 4; i++)
        f += `<path d="M${cx - S(13 + i * 0.8)} ${cy - S(10.5 + i * 2.2)} Q${cx} ${cy - S(19.5 - i * 0.4)} ${cx + S(13 + i * 0.8)} ${cy - S(10.5 + i * 2.2)}" stroke="${shade(hc, 0.34)}" stroke-width="${S(1.15)}" fill="none" opacity=".85"/>`;
      sideburns();
    } else if (t === 'afro') {
      const bumps = [[0, -24], [-11, -21], [11, -21], [-19, -13], [19, -13], [-23, -3], [23, -3], [-21, 7], [21, 7]];
      for (const [bx, by] of bumps) f += `<circle cx="${cx + S(bx)}" cy="${cy + S(by)}" r="${S(7.2)}" fill="${hc}"/>`;
      f += `<circle cx="${cx}" cy="${cy - S(14)}" r="${S(21)}" fill="${hc}"/>`;
      f += `<path d="M${cx - S(14)} ${cy - S(20)} q${S(14)} ${S(-6)} ${S(28)} 0" stroke="${shade(hc, 0.22)}" stroke-width="${S(1.4)}" fill="none" opacity=".5"/>`;
    } else if (t === 'dreads') {
      capShell();
      for (const [x0, y0, x1, y1] of [[-19, -2, -24, 16], [-14, -8, -20, 14], [19, -2, 24, 16], [14, -8, 20, 14], [-8, -14, -13, 18], [8, -14, 13, 18]])
        f += `<path d="M${cx + S(x0)} ${cy + S(y0)} Q${cx + S((x0 + x1) / 2)} ${cy + S((y0 + y1) / 2 + 3)} ${cx + S(x1)} ${cy + S(y1)}" stroke="${hc}" stroke-width="${S(3)}" fill="none" stroke-linecap="round"/>`;
      f += `<circle cx="${cx - S(24)}" cy="${cy + S(16)}" r="${S(1.6)}" fill="${shade(hc, 0.3)}"/><circle cx="${cx + S(24)}" cy="${cy + S(16)}" r="${S(1.6)}" fill="${shade(hc, 0.3)}"/>`;
    } else if (t === 'bald') {
      f += `<ellipse cx="${cx - S(6)}" cy="${top + S(4)}" rx="${S(6.5)}" ry="${S(3)}" fill="#fff" opacity=".09"/>`;
      sideburns();
    } else if (t === 'long' || t === 'longw') {
      // front: deep side part frame; the fall is in hairBackSVG
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23)} ${top - S(1)} ${cx} ${top - S(3)} Q${cx + S(23)} ${top - S(1)} ${R} ${cy - S(4)} L${cx + S(19)} ${cy + S(4)} Q${cx + S(14)} ${cy - S(13)} ${cx + S(3)} ${cy - S(15)} Q${cx - S(10)} ${cy - S(16.5)} ${cx - S(17)} ${cy - S(2)} Z" fill="${hc}"/>`;
      if (t === 'longw') f += `<path d="M${cx - S(13)} ${cy - S(13)} q${S(6)} ${S(-3)} ${S(12)} ${S(-1)}" stroke="${shade(hc, 0.24)}" stroke-width="${S(1.2)}" fill="none" opacity=".6"/>`;
    } else if (t === 'ponytail') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(16)} ${cx} ${cy - S(16)} Q${cx - S(13)} ${cy - S(16)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<ellipse cx="${cx}" cy="${top - S(4)}" rx="${S(6)}" ry="${S(4.6)}" fill="${shade(hc, 0.08)}"/>`;
      f += `<path d="M${cx - S(4)} ${top - S(6)} Q${cx} ${top - S(9)} ${cx + S(4)} ${top - S(6)}" stroke="${shade(hc, -0.25)}" stroke-width="${S(1.4)}" fill="none"/>`;
    } else if (t === 'buns') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(16)} ${cx} ${cy - S(16)} Q${cx - S(13)} ${cy - S(16)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      for (const sx of [-1, 1]) {
        f += `<circle cx="${cx + sx * S(14)}" cy="${top - S(4)}" r="${S(6)}" fill="${shade(hc, 0.06)}"/>`;
        f += `<path d="M${cx + sx * S(17)} ${top - S(7)} q${sx * S(-4)} ${S(-2)} ${S(-6)} ${S(1)}" stroke="${shade(hc, -0.22)}" stroke-width="${S(1)}" fill="none" opacity=".8"/>`;
      }
    } else if (t === 'braids') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(23)} ${top + S(0.5)} ${cx} ${top - S(2.5)} Q${cx + S(23)} ${top + S(0.5)} ${R} ${cy - S(4)} Q${cx + S(12)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(12)} ${cy - S(15.5)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      for (let i = -2; i <= 2; i++)
        f += `<path d="M${cx + i * S(7)} ${top - S(1)} Q${cx + i * S(7.6)} ${cy - S(14)} ${cx + i * S(8)} ${cy - S(9)}" stroke="${shade(hc, 0.26)}" stroke-width="${S(1.3)}" fill="none" opacity=".8"/>`;
    } else if (t === 'bob') {
      f += `<path d="M${L} ${cy - S(5)} Q${cx - S(23.5)} ${top - S(2)} ${cx} ${top - S(3)} Q${cx + S(23.5)} ${top - S(2)} ${R} ${cy - S(5)} L${cx + S(22.5)} ${cy + S(9)} Q${cx + S(20)} ${cy + S(20)} ${cx + S(14)} ${cy + S(21)} Q${cx + S(17)} ${cy + S(10)} ${cx + S(16)} ${cy - S(2)} Q${cx + S(8)} ${cy - S(13)} ${cx} ${cy - S(13)} Q${cx - S(8)} ${cy - S(13)} ${cx - S(16)} ${cy - S(2)} Q${cx - S(17)} ${cy + S(10)} ${cx - S(14)} ${cy + S(21)} Q${cx - S(20)} ${cy + S(20)} ${cx - S(22.5)} ${cy + S(9)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(17)} ${cy - S(8)} q${S(-1.5)} ${S(9)} ${S(0.5)} ${S(17)}" stroke="#fff" stroke-width="${S(1.4)}" fill="none" opacity=".1"/>`;
    } else if (t === 'pixie') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(23)} ${top - S(1)} ${cx + S(2)} ${top - S(3.5)} Q${cx + S(22)} ${top - S(2)} ${R} ${cy - S(2)} L${cx + S(21)} ${cy + S(6)} Q${cx + S(16)} ${cy - S(10)} ${cx + S(4)} ${cy - S(13.5)} Q${cx - S(12)} ${cy - S(15)} ${cx - S(18)} ${cy - S(1)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + S(14)} ${cy - S(6)} q${S(4)} ${S(4)} ${S(2)} ${S(9)}" stroke="${hc}" stroke-width="${S(2.6)}" fill="none" stroke-linecap="round"/>`;
    } else if (t === 'topbun') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(16)} ${cx} ${cy - S(16)} Q${cx - S(13)} ${cy - S(16)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<ellipse cx="${cx}" cy="${top - S(6.6)}" rx="${S(7)}" ry="${S(5.6)}" fill="${shade(hc, 0.07)}"/>`;
      f += `<path d="M${cx - S(4)} ${top - S(9)} q${S(4)} ${S(-2.4)} ${S(8)} 0" stroke="${shade(hc, -0.2)}" stroke-width="${S(1.1)}" fill="none" opacity=".8"/>`;
    } else if (t === 'lob') {
      f += `<path d="M${L} ${cy - S(5)} Q${cx - S(24)} ${top - S(2)} ${cx} ${top - S(3.4)} Q${cx + S(24)} ${top - S(2)} ${R} ${cy - S(5)} L${cx + S(22)} ${cy + S(16)} Q${cx + S(17)} ${cy + S(19)} ${cx + S(13.5)} ${cy + S(16)} Q${cx + S(16.5)} ${cy + S(4)} ${cx + S(14)} ${cy - S(8)} L${cx + S(13)} ${cy - S(9.6)} Q${cx + S(6)} ${cy - S(13)} ${cx} ${cy - S(13)} Q${cx - S(6)} ${cy - S(13)} ${cx - S(13)} ${cy - S(9.6)} L${cx - S(14)} ${cy - S(8)} Q${cx - S(16.5)} ${cy + S(4)} ${cx - S(13.5)} ${cy + S(16)} Q${cx - S(17)} ${cy + S(19)} ${cx - S(22)} ${cy + S(16)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(13)} ${cy - S(9.6)} Q${cx} ${cy - S(13.4)} ${cx + S(13)} ${cy - S(9.6)} L${cx + S(11)} ${cy - S(5.4)} Q${cx} ${cy - S(9)} ${cx - S(11)} ${cy - S(5.4)} Z" fill="${shade(hc, 0.05)}"/>`;
    } else if (t === 'puffs') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} Q${cx + S(13)} ${cy - S(16)} ${cx} ${cy - S(16)} Q${cx - S(13)} ${cy - S(16)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      for (const sx of [-1, 1]) {
        f += `<circle cx="${cx + sx * S(15)}" cy="${top - S(5)}" r="${S(6.6)}" fill="${hc}"/>`;
        f += `<circle cx="${cx + sx * S(17)}" cy="${top - S(7)}" r="${S(2.4)}" fill="${shade(hc, 0.22)}" opacity=".7"/>`;
      }
    } else if (t === 'underf') {
      f += `<path d="M${L} ${cy - S(4)} Q${cx - S(22.5)} ${top + S(1)} ${cx} ${top - S(2.5)} Q${cx + S(22.5)} ${top + S(1)} ${R} ${cy - S(4)} L${cx + S(20)} ${cy + S(10)} Q${cx + S(15)} ${cy - S(11)} ${cx + S(6)} ${cy - S(14)} L${cx - S(4)} ${cy - S(15.6)} Q${cx - S(14)} ${cy - S(13)} ${L} ${cy - S(4)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + S(18.5)} ${cy - S(2)} q${S(1)} ${S(6)} ${S(-0.5)} ${S(10)}" stroke="${shade(hc, 0.12)}" stroke-width="${S(2.2)}" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M${cx + S(15)} ${cy - S(10)} l${S(3)} ${S(-1)} M${cx + S(16)} ${cy - S(6)} l${S(3)} ${S(-1)}" stroke="${shade(hc, -0.3)}" stroke-width="${S(0.8)}" opacity=".6"/>`;
    }

    if (!hair.cap && ['buzz', 'crop', 'side', 'slick', 'cornrows', 'bald'].includes(t)) sideburns();

    // ---- modern headwear
    const cap = hair.cap;
    if (cap === 'beanie') {
      f += `<path d="M${L - S(1)} ${cy - S(3)} Q${cx - S(24)} ${top - S(10)} ${cx} ${top - S(11.5)} Q${cx + S(24)} ${top - S(10)} ${R + S(1)} ${cy - S(3)} L${R + S(0.4)} ${cy + S(1.5)} Q${cx} ${cy - S(4.2)} ${L - S(0.4)} ${cy + S(1.5)} Z" fill="${hc}"/>`;
      for (let i = -2; i <= 2; i++)
        f += `<path d="M${cx + i * S(8.2)} ${cy - S(1.6)} Q${cx + i * S(8.6)} ${top - S(2) + Math.abs(i) * S(1.6)} ${cx + i * S(6.8)} ${top - S(8) + Math.abs(i) * S(0.9)}" stroke="${shade(hc, 0.16)}" stroke-width="${S(1.4)}" fill="none" opacity=".8"/>`;
      f += `<path d="M${L - S(0.4)} ${cy - S(1)} Q${cx} ${cy - S(7)} ${R + S(0.4)} ${cy - S(1)} L${R + S(0.1)} ${cy + S(2.2)} Q${cx} ${cy - S(3.4)} ${L - S(0.1)} ${cy + S(2.2)} Z" fill="${shade(hc, -0.24)}"/>`;
    } else if (cap === 'snapback') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(23)} ${top - S(7)} ${cx} ${top - S(8)} Q${cx + S(23)} ${top - S(7)} ${R} ${cy - S(6)} Q${cx + S(12)} ${cy - S(14.5)} ${cx} ${cy - S(14.5)} Q${cx - S(12)} ${cy - S(14.5)} ${L} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(6.5)} ${top - S(8)} L${cx} ${cy - S(14.5)} M${cx + S(6.5)} ${top - S(8)} L${cx} ${cy - S(14.5)} M${cx} ${top - S(8)} L${cx} ${cy - S(14.5)}" stroke="${shade(hc, -0.22)}" stroke-width="${S(0.9)}" opacity=".8"/>`;
      f += `<path d="M${cx - S(9.5)} ${cy - S(15)} Q${cx} ${cy - S(17.2)} ${cx + S(9.5)} ${cy - S(15)} L${cx + 0} ${cy - S(10.8)} Q${cx} ${cy - S(12.2)} ${cx - 0} ${cy - S(10.8)} Z" fill="${shade(hc, -0.14)}"/>`;
      f += `<circle cx="${cx}" cy="${top - S(7.2)}" r="${S(1.5)}" fill="${shade(hc, -0.2)}"/>`;
    } else if (cap === 'bucket') {
      f += `<path d="M${L} ${cy - S(7)} Q${cx - S(23)} ${top - S(6)} ${cx} ${top - S(7)} Q${cx + S(23)} ${top - S(6)} ${R} ${cy - S(7)} Q${cx + S(13)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(13)} ${cy - S(15.5)} ${L} ${cy - S(7)} Z" fill="${hc}"/>`;
      f += `<ellipse cx="${cx}" cy="${cy - S(6.5)}" rx="${S(27)}" ry="${S(5.2)}" fill="${shade(hc, -0.1)}"/>`;
      f += `<ellipse cx="${cx}" cy="${cy - S(7)}" rx="${S(25.6)}" ry="${S(4.3)}" fill="${shade(hc, 0.04)}"/>`;
      f += `<path d="M${L - S(0.5)} ${cy - S(6)} Q${cx} ${cy - S(12)} ${R + S(0.5)} ${cy - S(6)}" stroke="${shade(hc, -0.28)}" stroke-width="${S(1.1)}" fill="none" opacity=".8"/>`;
    } else if (cap === 'bandana') {
      f += `<path d="M${L - S(0.8)} ${cy - S(6)} Q${cx - S(23.5)} ${top - S(8)} ${cx} ${top - S(9)} Q${cx + S(23.5)} ${top - S(8)} ${R + S(0.8)} ${cy - S(6)} Q${cx + S(12)} ${cy - S(15.5)} ${cx} ${cy - S(15.5)} Q${cx - S(12)} ${cy - S(15.5)} ${L - S(0.8)} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${L - S(0.8)} ${cy - S(6)} Q${cx} ${cy - S(11.4)} ${R + S(0.8)} ${cy - S(6)} L${R + S(1.2)} ${cy - S(4.2)} Q${cx} ${cy - S(8.6)} ${L - S(1.2)} ${cy - S(4.2)} Z" fill="${shade(hc, -0.2)}"/>`;
      for (const dx of [-12, -4, 4, 12])
        f += `<circle cx="${cx + S(dx)}" cy="${cy - S(10.2) + Math.abs(dx) * S(0.14)}" r="${S(1.05)}" fill="${shade(hc, 0.45)}" opacity=".8"/>`;
      f += `<circle cx="${cx}" cy="${top - S(8.4)}" r="${S(2.6)}" fill="${shade(hc, -0.28)}"/>`;
    } else if (cap === 'capback') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(22.5)} ${top - S(6)} ${cx} ${top - S(7)} Q${cx + S(22.5)} ${top - S(6)} ${R} ${cy - S(6)} Q${cx + S(12)} ${cy - S(14)} ${cx} ${cy - S(14)} Q${cx - S(12)} ${cy - S(14)} ${L} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(8)} ${top - S(7)} Q${cx} ${top - S(9.4)} ${cx + S(8)} ${top - S(7)} L${cx + S(4.6)} ${top - S(4.6)} Q${cx} ${top - S(5.8)} ${cx - S(4.6)} ${top - S(4.6)} Z" fill="${shade(hc, 0.1)}"/>`;
      f += `<path d="M${cx - S(13)} ${cy - S(13.4)} Q${cx - 0} ${cy - S(15.6)} ${cx + S(13)} ${cy - S(13.4)} L${cx + S(13.6)} ${cy - S(17.6)} Q${cx} ${cy - S(15.2)} ${cx - S(13.6)} ${cy - S(17.6)} Z" fill="${shade(hc, -0.26)}"/>`;
    } else if (cap === 'trucker') {
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(23)} ${top - S(7)} ${cx} ${top - S(8)} Q${cx + S(23)} ${top - S(7)} ${R} ${cy - S(6)} Q${cx + S(12)} ${cy - S(14.5)} ${cx} ${cy - S(14.5)} Q${cx - S(12)} ${cy - S(14.5)} ${L} ${cy - S(6)} Z" fill="#e8e2d4"/>`;
      f += `<path d="M${L} ${cy - S(6)} Q${cx - S(20)} ${cy - S(12)} ${cx - S(12)} ${cy - S(14.2)} L${cx - S(12)} ${cy - S(8)} Q${cx - S(17)} ${cy - S(7.4)} ${L} ${cy - S(6)} Z M${R} ${cy - S(6)} Q${cx + S(20)} ${cy - S(12)} ${cx + S(12)} ${cy - S(14.2)} L${cx + S(12)} ${cy - S(8)} Q${cx + S(17)} ${cy - S(7.4)} ${R} ${cy - S(6)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx - S(9.5)} ${cy - S(15)} Q${cx} ${cy - S(17.2)} ${cx + S(9.5)} ${cy - S(15)} L${cx} ${cy - S(10.8)} Z" fill="${shade(hc, -0.12)}"/>`;
      f += `<path d="M${cx - S(12)} ${cy - S(14.2)} Q${cx} ${cy - S(16.4)} ${cx + S(12)} ${cy - S(14.2)}" stroke="${shade(hc, -0.3)}" stroke-width="${S(1)}" fill="none" opacity=".7"/>`;
    } else if (cap === 'beret') {
      f += `<path d="M${L + S(2)} ${cy - S(8)} Q${cx - S(26)} ${top - S(10)} ${cx - S(2)} ${top - S(11)} Q${cx + S(26)} ${top - S(9)} ${R + S(3)} ${cy - S(11)} Q${cx + S(14)} ${cy - S(14)} ${cx} ${cy - S(14.5)} Q${cx - S(14)} ${cy - S(14)} ${L + S(2)} ${cy - S(8)} Z" fill="${hc}" transform="rotate(-6 ${cx} ${cy - S(14)})"/>`;
      f += `<path d="M${cx - S(2)} ${top - S(12.4)} l${S(1)} ${S(-3)}" stroke="${shade(hc, -0.25)}" stroke-width="${S(1.6)}" stroke-linecap="round"/>`;
    } else if (cap === 'headband') {
      f += capShell();
      f += `<path d="M${L + S(0.6)} ${cy - S(7.6)} Q${cx} ${cy - S(13.8)} ${R - S(0.6)} ${cy - S(7.6)} L${R - S(0.2)} ${cy - S(10.8)} Q${cx} ${cy - S(17)} ${L + S(0.2)} ${cy - S(10.8)} Z" fill="${hc}"/>`;
      f += `<path d="M${L + S(1)} ${cy - S(9.2)} Q${cx} ${cy - S(15.2)} ${R - S(1)} ${cy - S(9.2)}" stroke="#fff" stroke-width="${S(0.9)}" fill="none" opacity=".25"/>`;
    }
    return f;
  }

  // back-of-head hair for the full doll (long styles fall over the shoulders/back)
  function hairBackSVG(hair, cx, cy, sc) {
    const S = (v) => v * sc;
    const hc = hair.c, t = hair.t;
    let f = '';
    if (t === 'long' || t === 'longw') {
      f += `<path d="M${cx - S(21)} ${cy - S(6)} Q${cx - S(30)} ${cy + S(30)} ${cx - S(24)} ${cy + S(74)} Q${cx - S(20)} ${cy + S(86)} ${cx - S(12)} ${cy + S(88)} Q${cx - S(16)} ${cy + S(46)} ${cx - S(15)} ${cy + S(10)} Z" fill="${shade(hc, -0.08)}"/>`;
      f += `<path d="M${cx + S(21)} ${cy - S(6)} Q${cx + S(30)} ${cy + S(30)} ${cx + S(24)} ${cy + S(74)} Q${cx + S(20)} ${cy + S(86)} ${cx + S(12)} ${cy + S(88)} Q${cx + S(16)} ${cy + S(46)} ${cx + S(15)} ${cy + S(10)} Z" fill="${shade(hc, -0.08)}"/>`;
      if (t === 'longw') for (const sx of [-1, 1])
        f += `<path d="M${cx + sx * S(24)} ${cy + S(14)} q${sx * S(4)} ${S(16)} ${sx * S(1)} ${S(34)} q${sx * S(-3)} ${S(14)} ${sx * S(-1)} ${S(26)}" stroke="${shade(hc, 0.18)}" stroke-width="${S(1.3)}" fill="none" opacity=".5"/>`;
    } else if (t === 'ponytail') {
      f += `<path d="M${cx + S(1)} ${cy - S(30)} Q${cx + S(16)} ${cy - S(24)} ${cx + S(14)} ${cy + S(4)} Q${cx + S(12)} ${cy + S(34)} ${cx + S(6)} ${cy + S(52)} Q${cx + S(2)} ${cy + S(58)} ${cx - S(1)} ${cy + S(54)} Q${cx + S(4)} ${cy + S(30)} ${cx + S(6)} ${cy + S(4)} Q${cx + S(7)} ${cy - S(14)} ${cx + S(1)} ${cy - S(30)} Z" fill="${hc}"/>`;
      f += `<path d="M${cx + S(10)} ${cy - S(8)} q${S(3)} ${S(18)} ${S(-2)} ${S(40)}" stroke="${shade(hc, -0.22)}" stroke-width="${S(1.2)}" fill="none" opacity=".5"/>`;
      f += `<path d="M${cx + S(4)} ${cy - S(26)} q${S(5)} ${S(2)} ${S(6)} ${S(7)}" stroke="${ACCENTS[10]}" stroke-width="${S(1.8)}" fill="none"/>`;
    } else if (t === 'braids') {
      for (const [x0, y0, x1, y1] of [[-20, 0, -22, 62], [-15, 6, -17, 70], [20, 0, 22, 62], [15, 6, 17, 70], [-8, 10, -9, 74], [8, 10, 9, 74]])
        f += `<path d="M${cx + S(x0)} ${cy + S(y0)} Q${cx + S((x0 + x1) / 2 + 1.5)} ${cy + S((y0 + y1) / 2)} ${cx + S(x1)} ${cy + S(y1)}" stroke="${hc}" stroke-width="${S(3.2)}" fill="none" stroke-linecap="round"/>`;
      for (const [bx, by] of [[-22, 62], [-17, 70], [22, 62], [17, 70], [-9, 74], [9, 74]])
        f += `<circle cx="${cx + S(bx)}" cy="${cy + S(by)}" r="${S(1.8)}" fill="${shade(hc, 0.3)}"/>`;
    } else if (t === 'dreads') {
      for (const [x0, x1] of [[-18, -21], [-12, -14], [18, 21], [12, 14], [-5, -6], [5, 6]])
        f += `<path d="M${cx + S(x0)} ${cy + S(4)} Q${cx + S((x0 + x1) / 2 + 1)} ${cy + S(26)} ${cx + S(x1)} ${cy + S(46)}" stroke="${shade(hc, -0.06)}" stroke-width="${S(2.8)}" fill="none" stroke-linecap="round"/>`;
    }
    return f;
  }

  // ---------------------------------------------------------------- garment geometry
  // Bust (portrait): torso y 74..120, shoulders x 12..108 (adjusted per build).
  // Doll: torso neck y≈71.5 → hem y≈148, arms 60±(15..31.5), hands (60±23.4,160).
  function torsoPath(fem) {
    return fem
      ? 'M16 120 L16 101 Q16 80 42 74.5 L51 71.5 Q60 80 69 71.5 L78 74.5 Q104 80 104 101 L104 120 Z'
      : 'M12 120 L12 100 Q12 79 40 74 L51 71.5 Q60 80 69 71.5 L80 74 Q108 79 108 100 L108 120 Z';
  }
  function dollBodyPath(fem) {
    return fem
      ? 'M46 148 L45.6 92 Q45.6 76 57.4 71.5 L62.6 71.5 Q74.4 76 74 92 L74.5 148 Z'
      : 'M44.5 148 L44.5 90 Q44.5 75.5 57 71.5 L63 71.5 Q75.5 75.5 75.5 90 L75.5 148 Z';
  }

  function garmentBust(style, coat, accCol, u, fem) {
    const cd = shade(coat, -0.22), cl = shade(coat, 0.14), cm = shade(coat, 0.4);
    const SIL = torsoPath(fem);
    const x0 = fem ? 16 : 12, x1 = fem ? 104 : 108;
    let f = '';
    const zip = (y0) => `<path d="M60 ${y0} L60 120" stroke="${cd}" stroke-width="1.6" opacity=".85"/><path d="M58.4 ${y0 + 5} h3.2 v4 h-3.2 Z" fill="${cm}" opacity=".85"/>`;
    const band = `<rect x="${x0}" y="112" width="${x1 - x0}" height="8" fill="${cd}" opacity=".5"/>`;
    const hoodUp = `<path d="M${fem ? 40 : 38} 76 Q60 62 ${fem ? 80 : 82} 76 Q74 84 60 84 Q46 84 ${fem ? 40 : 38} 76 Z" fill="${cd}"/>`;
    const strings = `<path d="M56.5 82 q-1.4 9 .6 15 M63.5 82 q1.4 9 -.6 15" stroke="${cl}" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="57" cy="97.6" r="1.1" fill="${cl}"/><circle cx="63" cy="97.6" r="1.1" fill="${cl}"/>`;

    if (style === 'hoodie' || style === 'crophoo') {
      const hem = style === 'crophoo' ? 104 : 120;
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      if (style === 'crophoo') f += `<rect x="${x0}" y="${hem}" width="${x1 - x0}" height="3" fill="${cd}" opacity=".6"/>`;
      f += hoodUp + strings;
      f += `<path d="M46 100 L74 100 L77 ${hem - 4} L43 ${hem - 4} Z" fill="${cd}" opacity=".5"/><path d="M46 100 L74 100" stroke="${cd}" stroke-width="1.4" opacity=".9"/>`;
    } else if (style === 'ziphoo') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>` + hoodUp + zip(76);
      f += `<path d="M40 104 h10 M70 104 h10" stroke="${cd}" stroke-width="1.2" opacity=".7"/>` + band;
    } else if (style === 'track') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M48 72.5 L60 79 L72 72.5 L74 79 L60 87 L46 79 Z" fill="${shade(coat, -0.1)}"/>`;
      f += zip(74);
      f += `<path d="M${x0 + 7} 82 Q${x0 + 5} 96 ${x0 + 7} 114 M${x1 - 7} 82 Q${x1 - 5} 96 ${x1 - 7} 114" stroke="#e8e8e8" stroke-width="2.1" opacity=".5" fill="none"/>` + band;
    } else if (style === 'bomber') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M46 71.5 Q60 69.5 74 71.5 L73.5 76.5 Q60 74.8 46.5 76.5 Z" fill="${cd}"/>` + zip(76);
      f += `<path d="M${x0 + 13} 84 l7 -1.4 1 8 -7 1.2 Z" fill="${cd}" opacity=".8"/><circle cx="${x0 + 16.5}" cy="86.6" r="1" fill="${cm}"/>` + band;
    } else if (style === 'puffer' || style === 'croppuff') {
      const hem = style === 'croppuff' ? 103 : 120;
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      if (style === 'croppuff') f += `<rect x="${x0}" y="${hem}" width="${x1 - x0}" height="3" fill="${cd}" opacity=".6"/>`;
      for (const y of [84, 93, 102, 111]) { if (y < hem - 2) f += `<path d="M${x0 + 2} ${y} Q60 ${y + 4} ${x1 - 2} ${y}" stroke="${cd}" stroke-width="1.5" fill="none" opacity=".6"/>`; }
      f += `<path d="M46 70.5 Q60 68.5 74 70.5 L74.5 76.5 Q60 74.6 45.5 76.5 Z" fill="${shade(coat, -0.08)}"/>` + zip(76);
    } else if (style === 'tee' || style === 'bigtee' || style === 'babytee') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M48 71.5 Q60 85 72 71.5 L69.5 70 Q60 80.5 50.5 70 Z" fill="url(#pg${u})"/>`;
      f += `<path d="M48.4 69.4 Q60 79.5 71.6 69.4" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
      if (style !== 'babytee') f += `<circle cx="60" cy="100" r="7.5" fill="none" stroke="${cl}" stroke-width="1.3" opacity=".5"/><path d="M55.5 102 L64.5 96.5 M55.5 97.5 L64.5 103" stroke="${cl}" stroke-width="1.1" opacity=".5"/>`;
      else f += `<path d="M${x0} 104 L${x1} 104 L${x1} 120 L${x0} 120 Z" fill="url(#sk${u})" opacity=".9"/>`;
    } else if (style === 'croptop') {
      f += `<path d="M${fem ? 30 : 27} 120 L${fem ? 30 : 27} 100 Q${fem ? 32 : 29} 80 44 74 L51.6 71.5 Q60 82 68.4 71.5 L76 74 Q${fem ? 91 : 93} 80 ${fem ? 90 : 93} 100 L${fem ? 90 : 93} 120 Z" fill="url(#sk${u})"/>`;
      f += `<path d="M${fem ? 34 : 31} 103 L${fem ? 86 : 89} 103 L${fem ? 88 : 91} 78 Q${fem ? 86 : 88} 76 76 73.6 L68.4 71.5 Q60 80 51.6 71.5 L44 73.6 Q${fem ? 32 : 34} 76 ${fem ? 32 : 29} 78 Z" fill="url(#ct${u})"/>`;
      f += `<path d="M48 71 Q60 82 72 71" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
      f += `<path d="M${fem ? 34 : 31} 100 Q60 106 ${fem ? 86 : 89} 100" stroke="${cd}" stroke-width="1.6" fill="none" opacity=".8"/>`;
    } else if (style === 'tank') {
      const S2 = 'M27 120 L27 97 Q29 79 44 73.5 L51.6 71.5 Q60 83 68.4 71.5 L76 73.5 Q91 79 93 97 L93 120 Z';
      f += `<path d="${S2}" fill="url(#ct${u})"/>`;
      f += `<path d="M48 71 Q60 86 72 71 L69 69.5 Q60 80 51 69.5 Z" fill="url(#pg${u})"/>`;
      f += `<path d="M48.5 70 Q60 80 71.5 70" stroke="${cd}" stroke-width="1.5" fill="none"/>`;
      for (const y of [92, 97, 102]) f += `<path d="M30 ${y} Q60 ${y + 3} 90 ${y}" stroke="${cd}" stroke-width="0.8" fill="none" opacity=".5"/>`;
    } else if (style === 'polo') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M46 70 L60 79.5 L54 84 L43.5 75 Z M74 70 L60 79.5 L66 84 L76.5 75 Z" fill="${shade(coat, -0.1)}"/>`;
      f += `<path d="M60 79.5 L60 92" stroke="${cd}" stroke-width="1.6"/>`;
      f += `<circle cx="60" cy="84" r="1.2" fill="${cl}"/><circle cx="60" cy="89.5" r="1.2" fill="${cl}"/>`;
    } else if (style === 'denim') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M47 71 L60 80 L53 84.5 L44 76 Z M73 71 L60 80 L67 84.5 L76 76 Z" fill="${shade(coat, 0.08)}"/>` + zip(80);
      for (const sx of [0, 1]) { const bx = sx ? 66 : 43; f += `<path d="M${bx} 91 h11 v9 h-11 Z" fill="${shade(coat, 0.02)}" stroke="${cd}" stroke-width="0.9"/><circle cx="${bx + 5.5}" cy="95" r="0.9" fill="${cm}"/>`; }
    } else if (style === 'flannel') {
      f += `<path d="${SIL}" fill="#e8e2d4"/>`;
      f += `<path d="M51 71.6 Q60 82 69 71.6 L60 91 Z" fill="url(#pg${u})"/>`;
      f += `<clipPath id="fl${u}"><path d="M12 120 L12 74 h36 L60 91 L72 74 h36 v46 Z"/></clipPath>`;
      f += `<path d="M12 74 h34.5 L58 91 V120 H12 Z M62 91 L73.5 74 H108 V120 H62 Z" fill="url(#ct${u})"/>`;
      f += `<g clip-path="url(#fl${u})" opacity=".28">${[16, 26, 36, 76, 86, 96].map(x => `<path d="M${x} 74 L${x} 120" stroke="#1c1208" stroke-width="1.6"/>`).join('')}${[82, 92, 102, 112].map(y => `<path d="M12 ${y} L108 ${y}" stroke="#1c1208" stroke-width="1.4"/>`).join('')}</g>`;
      f += `<path d="M46.5 74 L58 91 M73.5 74 L62 91" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
      f += `<path d="M51.5 70 Q57 76.5 60 79 Q63 76.5 68.5 70" stroke="#e8e2d4" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    } else if (style === 'wind') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M60 74 L${x0 + 10} 120 L60 120 Z M60 74 L${x1 - 10} 120 L60 120 Z" fill="${cl}" opacity=".85"/>`;
      f += `<path d="M60 74 L${x0 + 18} 120 M60 74 L${x1 - 18} 120" stroke="${cd}" stroke-width="1.3" opacity=".8"/>` + zip(74);
      f += `<path d="M48 70.5 Q60 69 72 70.5 L71.5 74.5 Q60 73.4 48.5 74.5 Z" fill="${cd}"/>`;
    } else if (style === 'varsity') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M${x0} 100 Q${x0} 79 ${fem ? 42 : 40} 74 L${fem ? 34 : 32} 88 L${fem ? 36 : 34} 120 L${x0 + 3} 120 Z M${x1} 100 Q${x1} 79 ${fem ? 78 : 80} 74 L${fem ? 86 : 88} 88 L${fem ? 84 : 86} 120 L${x1 - 3} 120 Z" fill="${shade(coat, 0.24)}"/>`;
      f += `<path d="M46 70.5 Q60 69.5 74 70.5 L73 75.5 Q60 74.2 47 75.5 Z" fill="${cd}"/>`;
      for (const y of [82, 94, 106, 118]) f += `<circle cx="60" cy="${y}" r="1.4" fill="${cm}"/>`;
      f += `<rect x="${x0}" y="113" width="${x1 - x0}" height="7" fill="${cd}" opacity=".55"/>`;
    } else if (style === 'moto') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M42 71.5 L31 114 L49 120 L56 78 Z M78 71.5 L66 78 L64 91 L80 84 Z" fill="${shade(coat, 0.1)}"/>`;
      f += `<path d="M56 78 L68 120" stroke="${cd}" stroke-width="2"/>`;
      f += `<path d="M${x0 + 10} 76 l9 -1.2 1.4 3 -9 1.2 Z M${x1 - 19} 74.8 l9 1.2 -1.4 3 -9 -1.2 Z" fill="${cd}"/>`;
    } else if (style === 'tech') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M44 68.5 Q60 67 76 68.5 L76 76.5 Q60 74.8 44 76.5 Z" fill="${cd}"/>`;
      f += `<path d="M36 108 L84 84" stroke="${shade(coat, 0.2)}" stroke-width="5.4" opacity=".9"/>`;
      f += `<rect x="56.5" y="93" width="7" height="6.5" fill="none" stroke="${cm}" stroke-width="1.1"/>` + zip(76);
    } else if (style === 'gilet') {
      f += `<path d="${SIL}" fill="#e8e2d4"/>`;
      f += `<path d="M49.5 70.5 Q60 82 70.5 70.5 L69 69 Q60 78 51 69 Z" fill="url(#pg${u})"/>`;
      f += `<path d="M${x0} 100 Q${x0} 79 ${fem ? 42 : 40} 74 L50 71.6 Q56 80 58.6 84 L58.6 120 L${x0 + 3} 120 Z M${x1} 100 Q${x1} 79 ${fem ? 78 : 80} 74 L70 71.6 Q64 80 61.4 84 L61.4 120 L${x1 - 3} 120 Z" fill="url(#ct${u})"/>`;
      for (const y of [88, 97, 106, 115]) f += `<path d="M${x0 + 2} ${y} Q34 ${y + 3} 58 ${y + 1.4} M${x1 - 2} ${y} Q86 ${y + 3} 62 ${y + 1.4}" stroke="${cd}" stroke-width="1.4" fill="none" opacity=".6"/>`;
    } else if (style === 'jersey' || style === 'rugby') {
      f += `<path d="${SIL}" fill="url(#ct${u})"/>`;
      f += `<path d="M47 70.5 Q60 78 73 70.5 L71.5 75 Q60 81.6 48.5 75 Z" fill="#fff" opacity=".9"/>`;
      f += `<path d="M${x0} 84 L${x0 + 14} 84 M${x1} 84 L${x1 - 14} 84" stroke="#fff" stroke-width="3.4" opacity=".75"/>`;
      f += `<text x="60" y="108" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="900" fill="#fff" opacity=".92">10</text>`;
      if (style === 'rugby') f += `<path d="M${x0} 96 h${x1 - x0}" stroke="${shade(coat, 0.3)}" stroke-width="4" opacity=".5"/>`;
    } else if (style === 'longcoat') {
      f += `<path d="${SIL}" fill="#e8e2d4"/>`;
      f += `<path d="M51 71.6 Q60 81 69 71.6 L60 90 Z" fill="url(#pg${u})"/>`;
      f += `<path d="M${x0} 120 L${x0} 82 Q${x0 + 2} 76 ${fem ? 43 : 41} 74 L55 72 L57 120 Z M${x1} 120 L${x1} 82 Q${x1 - 2} 76 ${fem ? 77 : 79} 74 L65 72 L63 120 Z" fill="url(#ct${u})"/>`;
      f += `<path d="M${fem ? 43 : 41} 74 L55 92 M${fem ? 77 : 79} 74 L65 92" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
    } else if (style === 'dress' || style === 'slip') {
      const strappy = style === 'slip';
      f += `<path d="M42 120 L44 92 Q46 78 ${strappy ? 50 : 47} 74 L51.5 71.5 Q60 79 68.5 71.5 L73 74 Q${strappy ? 74 : 74} 78 76 92 L78 120 Z" fill="url(#ct${u})"/>`;
      if (strappy) f += `<path d="M50 74 L51.5 71.5 M70 74 L68.5 71.5" stroke="${cd}" stroke-width="1.6"/>` + `<path d="M44 92 Q60 97 76 92" stroke="${shade(coat, 0.25)}" stroke-width="1" opacity=".6"/>`;
      else f += `<path d="M47 74 Q60 82 73 74" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
      f += `<path d="M42.6 112 Q60 117 77.4 112" stroke="${cd}" stroke-width="1.1" opacity=".6" fill="none"/>`;
    } else if (style === 'skirtset' || style === 'tennis') {
      f += `<path d="M34 120 L36 100 Q38 80 44 74 L51.6 71.5 Q60 81 68.4 71.5 L76 74 Q82 80 84 100 L86 120 Z" fill="#e8e2d4"/>`;
      f += `<path d="M48.4 69.6 Q60 79 71.6 69.6" stroke="#c9c0a8" stroke-width="2" fill="none"/>`;
      f += `<path d="M40 120 L44 104 Q60 108 76 104 L80 120 Z" fill="url(#ct${u})"/>`;
      for (const x of [46, 53, 60, 67, 74]) f += `<path d="M${x} 105 L${x + (x < 60 ? -1.6 : 1.6)} 120" stroke="${cd}" stroke-width="1.1" opacity=".7"/>`;
    } else if (style === 'cardigan') {
      f += `<path d="${SIL}" fill="#e8e2d4"/>`;
      f += `<path d="M51 71.6 Q60 82 69 71.6 L60 92 Z" fill="url(#pg${u})"/>`;
      f += `<path d="M${x0} 120 L${x0} 82 Q${x0 + 3} 76 43 74 L57 73 L57.6 120 Z M${x1} 120 L${x1} 82 Q${x1 - 3} 76 77 74 L63 73 L62.4 120 Z" fill="url(#ct${u})"/>`;
      for (const y of [84, 92, 100, 108]) { f += `<path d="M${x0 + 4} ${y} h10 M${x1 - 14} ${y} h10" stroke="${cd}" stroke-width="1" opacity=".5"/>`; }
      f += `<circle cx="59" cy="86" r="1.1" fill="${cd}"/><circle cx="59" cy="95" r="1.1" fill="${cd}"/><circle cx="59" cy="104" r="1.1" fill="${cd}"/>`;
    }
    return f;
  }

  // chest-level trinkets for the portrait + doll (index-stable with ACCENTS)
  function chestAccent(aIdx, acc, scaleBust, u) {
    const k = scaleBust ? 0.78 : 1;
    const Y = (v) => scaleBust ? (74 + (v - 74) * k) : v;
    let f = '';
    if (aIdx === 0) {
      f += `<path d="M48 ${Y(88)} Q60 ${Y(101)} 72 ${Y(88)}" stroke="${acc}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      f += `<circle cx="69" cy="${Y(95)}" r="2.6" fill="${acc}" stroke="${shade(acc, -0.35)}" stroke-width=".6"/>`;
    } else if (aIdx === 3) { f += `<circle cx="60" cy="${Y(104)}" r="1.8" fill="${acc}"/>`; }
    else if (aIdx === 5) { f += `<path d="M66 ${Y(92)} L69.5 ${Y(84.5)} L72.4 ${Y(92)} Z" fill="${acc}"/>`; }
    else if (aIdx === 6) { f += `<circle cx="70" cy="${Y(88)}" r="1.9" fill="${acc}"/><path d="M69.8 ${Y(90.4)} L69.4 ${Y(95)}" stroke="#2e5126" stroke-width=".9"/>`; }
    else if (aIdx === 1) { f += `<path d="M52 ${Y(88)} L53.4 ${Y(89.4)} L52 ${Y(90.8)} L50.6 ${Y(89.4)} Z" fill="${acc}"/>`; }
    else if (aIdx === 10) {
      f += `<path d="M47 ${Y(78)} Q60 ${Y(70.5)} 73 ${Y(78)} L71.4 ${Y(84.5)} Q60 ${Y(79)} 48.6 ${Y(84.5)} Z" fill="${acc}"/>`;
      f += `<path d="M55 ${Y(84)} L53.6 ${Y(108)} Q57 ${Y(110.2)} 60 ${Y(107.5)} L59 ${Y(85)} Z" fill="${shade(acc, -0.12)}"/><path d="M65 ${Y(84)} L66.4 ${Y(108)} Q63 ${Y(110.2)} 60 ${Y(107.5)} L61 ${Y(85)} Z" fill="${acc}"/>`;
    } else if (aIdx === 12) { f += `<path d="M55 ${Y(76)} Q60 ${Y(81.5)} 65 ${Y(76)} L66.6 ${Y(86)} Q60 ${Y(90.5)} 53.4 ${Y(86)} Z" fill="${acc}"/>`; }
    else if (aIdx === 13 || aIdx === 14) {
      f += `<path d="M47 ${Y(85)} Q60 ${Y(99)} 73 ${Y(85)}" stroke="${acc}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M47.8 ${Y(86)} Q60 ${Y(98)} 72.2 ${Y(86)}" stroke="${shade(acc, 0.35)}" stroke-width=".9" fill="none"/>`;
    } else if (aIdx === 15) {
      f += `<path d="M50 ${Y(84)} Q60 ${Y(97)} 70 ${Y(84)}" stroke="${shade(acc, -0.1)}" stroke-width="1.1" fill="none"/>`;
      f += `<path d="M60 ${Y(100)} L62.8 ${Y(103.4)} L60 ${Y(106.8)} L57.2 ${Y(103.4)} Z" fill="${acc}"/>`;
    } else if (aIdx === 23) {
      f += `<path d="M48 ${Y(77)} L72 ${Y(77)} L60 ${Y(97)} Z" fill="${acc}"/>`;
      f += `<circle cx="60" cy="${Y(78.5)}" r="2.1" fill="${shade(acc, -0.28)}"/>`;
    } else if (aIdx === 24) {
      f += `<path d="M50 ${Y(84)} Q60 ${Y(98)} 70 ${Y(84)}" stroke="#8a8d91" stroke-width="1.1" fill="none"/>`;
      f += `<g transform="rotate(-8 58 ${Y(99)})"><rect x="54.5" y="${Y(94.5)}" width="7" height="9.5" rx="2" fill="#aeb4bc"/></g>`;
      f += `<g transform="rotate(7 63.5 ${Y(100)})"><rect x="60" y="${Y(95.5)}" width="7" height="9.5" rx="2" fill="${shade('#aeb4bc', 0.08)}"/></g>`;
    } else if (aIdx === 25) { // pearl strand
      f += `<path d="M48 ${Y(84)} Q60 ${Y(96)} 72 ${Y(84)}" fill="none" stroke="${shade(acc, -0.15)}" stroke-width=".7"/>`;
      for (let i = 0; i <= 8; i++) { const t2 = i / 8, x = 48 + t2 * 24, y = Y(84) + Math.sin(Math.PI * t2) * 11; f += `<circle cx="${x}" cy="${y}" r="1.6" fill="${acc}"/><circle cx="${x - 0.4}" cy="${y - 0.4}" r=".5" fill="#fff" opacity=".8"/>`; }
    } else if (aIdx === 26) { // black choker
      f += `<path d="M50 ${Y(78.5)} Q60 ${Y(83.5)} 70 ${Y(78.5)}" stroke="${acc}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      f += `<circle cx="60" cy="${Y(82.6)}" r="1.3" fill="#c8cdd4"/>`;
    } else if (aIdx === 28) { // jade pendant
      f += `<path d="M52 ${Y(83)} Q60 ${Y(92)} 68 ${Y(83)}" stroke="#3a3a3a" stroke-width="1" fill="none"/>`;
      f += `<circle cx="60" cy="${Y(95)}" r="3" fill="${acc}"/><circle cx="59" cy="${Y(94)}" r=".9" fill="#fff" opacity=".6"/>`;
    }
    return f;
  }

  function wristWatch(aIdx, acc, u) {
    if (aIdx === 19) {
      return `<g><path d="M33.2 143.2 L33.2 156.5 M40.4 143.2 L40.4 156.5" stroke="#1c1f24" stroke-width="2.6" opacity=".9"/>` +
             `<rect x="32.8" y="145.2" width="8.4" height="8.6" rx="2" fill="#14161a"/>` +
             `<rect x="34" y="146.4" width="6" height="6.2" rx="1.2" fill="${acc}" opacity=".92"/></g>`;
    }
    if (aIdx === 20) {
      return `<g><path d="M33.6 142.5 L34 157.2 M40 142.7 L40.4 157.2" stroke="${acc}" stroke-width="2.2" opacity=".9"/>` +
             `<circle cx="36.8" cy="149.6" r="4.2" fill="#2b2018" stroke="${shade(acc, -0.3)}" stroke-width="1"/>` +
             `<circle cx="36.8" cy="149.6" r="3.1" fill="#e8e0cc"/>` +
             `<path d="M36.8 149.6 L36.8 147.4 M36.8 149.6 L38.6 150.4" stroke="#43301f" stroke-width=".9" stroke-linecap="round"/></g>`;
    }
    if (aIdx === 27) { // amber bead bracelet
      return `<g>${[33.6, 35.8, 38, 40.2].map(x => `<circle cx="${x}" cy="151.5" r="1.3" fill="${acc}"/>`).join('')}</g>`;
    }
    return '';
  }

  // ---------------------------------------------------------------- legs & sneakers (full doll)
  // Bottoms color derives from the top; dresses/skirts show bare legs.
  function bottomColors(style, coat, fem) {
    if (DRESSY[style]) return null;
    let c;
    if (style === 'track') c = coat;
    else if (style === 'skirtset') c = '#3a5578';
    else if (style === 'tennis') c = coat;
    else if (style === 'jersey' || style === 'rugby') c = shade(coat, -0.32);
    else c = fem ? shade(coat, -0.36) : shade(coat, -0.42);
    return { c, d: shade(c, -0.2), l: shade(c, 0.12) };
  }
  function legsSVG(fem, style, bc, skin, u) {
    const bare = DRESSY[style] || SKIRTY[style];
    const skinD = shade(skin, -0.12);
    let f = '';
    const hipL = fem ? 44 : 45, hipR = fem ? 76 : 75;
    if (bare) {
      // bare legs, tapered; feminine calves curve slightly
      for (const sx of [-1, 1]) {
        const ax = (v) => 60 + sx * v;
        const hemY = style === 'dress' ? 188 : style === 'slip' ? 190 : 172;
        f += `<path d="M${ax(hipL - 44 + 4)} ${hemY} Q${ax(fem ? 5.6 : 5.2)} ${hemY + 8} ${ax(fem ? 5.4 : 5)} 196 Q${ax(4.6)} 206 ${ax(4.2)} 212 L${ax(10.6)} 212 Q${ax(fem ? 11.4 : 10.8)} 196 ${ax(11)} 184 Q${ax(12.4)} ${hemY + 16} ${ax(13)} ${hemY} Z" fill="url(#sk${u})"/>`;
        f += `<path d="M${ax(8.2)} ${hemY + 6} q${sx * (fem ? 1.6 : 1)} 10 ${sx * 0.4} 20" stroke="${skinD}" stroke-width="1" fill="none" opacity=".5"/>`;
      }
      return f;
    }
    const wide = { wide: 1, cargo: 1 }[bottomCut(style)] || 0;
    const shorts = bottomCut(style) === 'shorts' || bottomCut(style) === 'bshort';
    const cut = bottomCut(style);
    const hemY = cut === 'shorts' ? 178 : cut === 'bshort' ? 186 : 208;
    // hip block
    f += `<path d="M${hipL} 141 L${hipR} 141 L${hipR + (fem ? 2 : 1)} 156 L${hipL - (fem ? 2 : 1)} 156 Z" fill="${bc.c}"/>`;
    for (const sx of [-1, 1]) {
      const ax = (v) => 60 + sx * v;
      const wTop = wide ? 8.4 : fem ? 6.6 : 7;
      const wKnee = wide ? 8 : fem ? 5.4 : 5.6;
      const wHem = wide ? 8.2 : fem ? 4.6 : 4.9;
      if (shorts) {
        f += `<path d="M${ax(2.2)} 152 L${ax(wTop + 3.4)} 152 L${ax(wKnee + 4)} ${hemY} L${ax(1.4)} ${hemY} Z" fill="${bc.c}"/>`;
        f += `<path d="M${ax(wKnee + 3.6)} ${hemY - 2} L${ax(1.6)} ${hemY - 2}" stroke="${bc.d}" stroke-width="1.2" opacity=".7"/>`;
        // bare shins below the shorts hem
        f += `<path d="M${ax(4.8)} ${hemY} Q${ax(fem ? 6 : 5.6)} ${hemY + 14} ${ax(4.6)} 212 L${ax(10)} 212 Q${ax(10.8)} 186 ${ax(10)} ${hemY} Z" fill="url(#sk${u})"/>`;
      } else {
        f += `<path d="M${ax(2.2)} 152 L${ax(wTop + 3.4)} 152 Q${ax(wKnee + 3.6)} 180 ${ax(wHem + 3)} ${hemY} L${ax(wHem - 1.6)} ${hemY} Q${ax(1)} 178 ${ax(2.2)} 152 Z" fill="${bc.c}"/>`;
        f += `<path d="M${ax(wTop + 2.2)} 154 Q${ax(wKnee + 2.4)} 182 ${ax(wHem + 1.6)} ${hemY - 2}" stroke="${bc.d}" stroke-width="1.1" fill="none" opacity=".7"/>`;
        f += `<path d="M${ax(4.6)} 158 Q${ax(3.4)} 184 ${ax(3)} ${hemY - 4}" stroke="${bc.l}" stroke-width=".9" fill="none" opacity=".4"/>`;
        if (cut === 'cargo') { f += `<path d="M${ax(wKnee + 0.6)} 176 h${sx > 0 ? 5.6 : 5.6} v7 h-5.6 Z" fill="${bc.d}" opacity=".8" transform="translate(${sx > 0 ? 0 : -5.6} 0)"/>`; }
        if (cut === 'jog' || cut === 'track') { f += `<rect x="${ax(0) - (sx > 0 ? 0 : wHem + 3)}" y="${hemY - 5}" width="${wHem + 3}" height="6" rx="2" fill="${bc.d}"/>`; }
      }
    }
    // crease shading
    f += `<ellipse cx="54" cy="172" rx="4.4" ry="7" fill="#000" opacity=".1"/><ellipse cx="66" cy="172" rx="4.4" ry="7" fill="#000" opacity=".1"/>`;
    return f;
  }
  function bottomCut(style) {
    if (style === 'track') return 'track';
    if (style === 'hoodie' || style === 'crophoo' || style === 'ziphoo' || style === 'gilet' || style === 'croppuff') return 'jog';
    if (style === 'bomber' || style === 'puffer' || style === 'tech' || style === 'bigtee') return 'cargo';
    if (style === 'tank' || style === 'jersey' || style === 'rugby') return style === 'tank' ? 'bshort' : 'shorts';
    if (style === 'moto') return 'slim';
    if (style === 'longcoat') return 'wide';
    if (style === 'polo' || style === 'cardigan' || style === 'babytee') return 'slim';
    return 'jeans';
  }
  function shoeStyle(style) {
    if (style === 'moto' || style === 'longcoat') return 'boot';
    if (style === 'slip') return 'slide';
    if (style === 'tank' || style === 'dress' || style === 'croptop' || style === 'skirtset') return 'high';
    if (style === 'track' || style === 'wind' || style === 'croppuff') return 'runner';
    if (style === 'jersey' || style === 'rugby') return 'runner';
    if (style === 'tee' || style === 'babytee') return 'canvas';
    return 'chunky';
  }
  function shoesSVG(fem, kind) {
    let f = '';
    const sole = '#e8e6e0', dark = '#1c1c22';
    for (const sx of [-1, 1]) {
      const x0 = 60 + sx * 6.9;
      if (kind === 'boot') {
        f += `<path d="M${x0 - 5.4} 204 h10.8 v12 q0 6.6 ${sx * 4} 7.6 q${sx * 7.6} 0 ${sx * 8.6} -4.2 v-11 q0 -5.4 -4.8 -5.4 z" fill="#17171c"/>`;
        f += `<path d="M${x0 - 5.4} 219 q${sx * 6} 2.2 ${sx * 11} .4" stroke="#000" stroke-width="1.6" fill="none" opacity=".6"/>`;
        for (let i = 0; i < 3; i++) f += `<path d="M${x0 - 3.6} ${208 + i * 3.2} l7.2 0" stroke="#4a4a55" stroke-width=".9" opacity=".9"/>`;
      } else if (kind === 'slide') {
        f += `<ellipse cx="${x0 + sx * 2.6}" cy="221" rx="8.6" ry="2.8" fill="${dark}"/>`;
        f += `<path d="M${x0 - 4.4} 218.6 Q${x0 + sx * 3} 212.8 ${x0 + sx * 8.6} 217.6" stroke="${dark}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
      } else if (kind === 'high') {
        f += `<path d="M${x0 - 5.4} 200 h10.8 v14 q0 5.6 ${sx * 3.6} 6.6 q${sx * 8} .4 ${sx * 9} -3.6 v-12.4 q0 -5.6 -5 -5.6 z" fill="${sole}"/>`;
        f += `<path d="M${x0 - 5.4} 200 h10.8 v6 h-10.8 Z" fill="${dark}"/>`;
        f += `<path d="M${x0 - 5.4} 220.6 q${sx * 6.4} 2.6 ${sx * 12.4} .6" stroke="#b8b6ae" stroke-width="2.2" fill="none"/>`;
        for (let i = 0; i < 3; i++) f += `<path d="M${x0 - 3.4} ${208.6 + i * 3} l6.8 0" stroke="#9a9890" stroke-width=".9"/>`;
      } else if (kind === 'runner') {
        f += `<path d="M${x0 - 5.2} 208 h10.4 v8 q0 4.6 ${sx * 3.4} 5.4 q${sx * 8.4} .6 ${sx * 9.6} -3 v-8 q0 -4.4 -4.8 -4.4 z" fill="${sole}"/>`;
        f += `<path d="M${x0 - 5.2} 216 q${sx * 7} 3 ${sx * 13.6} .8" stroke="#c9c7c0" stroke-width="2.4" fill="none"/>`;
        f += `<path d="M${x0 - 3.8} 211 l${sx * 8.4} 2.4" stroke="${dark}" stroke-width="1.6" opacity=".8"/>`;
      } else if (kind === 'canvas') {
        f += `<path d="M${x0 - 5.4} 206 h10.8 v9 q0 5 ${sx * 3.6} 6 q${sx * 8} .4 ${sx * 9} -3.2 v-9.6 q0 -4.6 -5 -4.6 z" fill="#f2efe6"/>`;
        f += `<path d="M${x0 - 5.4} 219.6 q${sx * 6.4} 2.6 ${sx * 12.6} .6" stroke="#d9d5c8" stroke-width="2.2" fill="none"/>`;
        f += `<circle cx="${x0 + sx * 4.4}" cy="211.4" r="1.2" fill="#c9c4b4"/>`;
      } else { // chunky trainer
        f += `<path d="M${x0 - 5.8} 205 h11.6 v9 q0 5.4 ${sx * 3.8} 6.6 q${sx * 9} .8 ${sx * 10.2} -3.2 v-9.4 q0 -5 -5.4 -5 z" fill="${sole}"/>`;
        f += `<path d="M${x0 - 5.8} 217.4 q${sx * 7.4} 3.6 ${sx * 14.4} .8" stroke="#cfccc2" stroke-width="3" fill="none"/>`;
        f += `<path d="M${x0 - 4.2} 209.4 q${sx * 5} -1.4 ${sx * 9.8} 1.8" stroke="${dark}" stroke-width="1.6" fill="none" opacity=".75"/>`;
        f += `<path d="M${x0 - 5.8} 213.6 h${sx * 15.4}" stroke="${dark}" stroke-width=".8" opacity=".35"/>`;
      }
    }
    return f;
  }

  // ---------------------------------------------------------------- full doll garments
  function dollGarment(style, coat, skin, u, fem) {
    const cd = shade(coat, -0.22), cl = shade(coat, 0.14), cm = shade(coat, 0.4);
    const BODY = dollBodyPath(fem);
    const shO = fem ? 18.5 : 20.5, shX = fem ? 29 : 31.5;
    const hemY = CROPPED[style] ? 122 : 148;
    const sleeveLong = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(shO)} 78 Q${ax(shX)} 87 ${ax(shX + 1.5)} 110 Q${ax(shX + 3)} 134 ${ax(shX - 2)} 152 L${ax(shX - 12.5)} 150 Q${ax(shX - 8.5)} 126 ${ax(shO - 5.5)} 92 Z" fill="url(#ct${u})"/>` +
             `<path d="M${ax(shO)} 78.5 Q${ax(shX)} 88 ${ax(shX + 1)} 110 Q${ax(shX + 2.4)} 132 ${ax(shX - 2.2)} 150" fill="none" stroke="${cd}" stroke-width="1.2" opacity=".7"/>`;
    };
    const sleeveShort = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(shO)} 78 Q${ax(shX)} 87 ${ax(shX + 1.2)} 107 L${ax(shX - 12.2)} 105 Q${ax(shX - 9.5)} 96 ${ax(shO - 5.5)} 92 Z" fill="url(#ct${u})"/>` +
             `<path d="M${ax(shX + 1.2)} 107 Q${ax(shX + 3)} 134 ${ax(shX - 2)} 152 L${ax(shX - 12.5)} 150 Q${ax(shX - 11.4)} 126 ${ax(shX - 12.2)} 105 Z" fill="${shade(skin, -0.1)}"/>` +
             `<path d="M${ax(shX - 12.2)} 106 L${ax(shX + 1.2)} 108.2" stroke="${cd}" stroke-width="1.4" opacity=".8"/>`;
    };
    const sleeveNone = (sx) => {
      const ax = (v) => 60 + sx * v;
      return `<path d="M${ax(shO)} 78 Q${ax(shX)} 87 ${ax(shX + 1.5)} 110 Q${ax(shX + 3)} 134 ${ax(shX - 2)} 152 L${ax(shX - 12.5)} 150 Q${ax(shX - 8.5)} 126 ${ax(shO - 5.5)} 92 Z" fill="${shade(skin, -0.1)}"/>` +
             `<path d="M${ax(shO + 0.5)} 86 Q${ax(shO + 5)} 94 ${ax(shO + 5)} 118" fill="none" stroke="${shade(skin, 0.22)}" stroke-width=".9" opacity=".5"/>`;
    };
    const zip = `<path d="M60 74 L60 ${hemY}" stroke="${cd}" stroke-width="1.6" opacity=".85"/><path d="M58.2 82 h3.6 v4.6 h-3.6 Z" fill="${cm}"/>`;
    const hem = `<rect x="${fem ? 46 : 44.5}" y="${hemY - 8}" width="${fem ? 28.4 : 31}" height="8" fill="${cd}" opacity=".55"/>`;
    let f = '';
    const cropBody = style === 'crophoo' || style === 'croppuff' || style === 'croptop' || style === 'babytee';

    if (style === 'dress' || style === 'slip') {
      const strappy = style === 'slip';
      // bodice + skirt, feminine flare
      f += `<path d="M46.5 148 L47 96 Q47.6 77 56.6 71.8 L63.4 71.8 Q72.4 77 73 96 L73.5 148 Z" fill="url(#sk${u})"/>`;
      f += `<path d="M44 196 Q45.5 160 ${strappy ? 50.5 : 47.5} 118 Q48.5 84 55 73 Q60 76 65 73 Q71.5 84 72.5 118 Q75.5 160 ${'76'} 196 Q60 203 44 196 Z" fill="url(#ct${u})"/>`;
      if (strappy) f += `<path d="M51.6 73.4 L54 70 M68.4 73.4 L66 70" stroke="${cd}" stroke-width="1.8"/>`;
      else f += `<path d="M47.5 78 Q60 86 72.5 78" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
      f += `<path d="M45 172 Q60 178 75 172" stroke="${cd}" stroke-width="1.2" opacity=".55" fill="none"/>`;
      f += `<path d="M44.4 194 Q60 200.6 75.6 194" stroke="${cd}" stroke-width="1.4" opacity=".7" fill="none"/>`;
      for (const sx of [-1, 1]) f += sleeveNone(sx);
      return f;
    }

    f += `<path d="${BODY}" fill="url(#sk${u})"/>`; // skin base under crops
    if (cropBody) {
      f += `<clipPath id="crop${u}"><path d="M40 66 h40 V124 H40 Z"/></clipPath>`;
      f += `<path d="${BODY}" fill="url(#ct${u})" clip-path="url(#crop${u})"/>`;
      f += `<path d="M${fem ? 46 : 44.5} 122 h${fem ? 28.4 : 31}" stroke="${cd}" stroke-width="2" opacity=".8"/>`;
    } else {
      f += `<path d="${BODY}" fill="url(#ct${u})"/>`;
    }

    if (style === 'hoodie' || style === 'crophoo') {
      f += `<path d="M47 76 Q60 66 73 76 Q68.5 82.5 60 82.5 Q51.5 82.5 47 76 Z" fill="${cd}"/>`;
      f += `<path d="M57.2 83 q-1.4 11 .6 19 M62.8 83 q1.4 11 -.6 19" stroke="${cl}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
      f += `<circle cx="57.6" cy="102.4" r="1" fill="${cl}"/><circle cx="62.4" cy="102.4" r="1" fill="${cl}"/>`;
      if (!cropBody) { f += `<path d="M48.5 116 L71.5 116 L74 136 L46 136 Z" fill="${cd}" opacity=".5"/><path d="M48.5 116 L71.5 116" stroke="${cd}" stroke-width="1.4"/>` + hem; }
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'ziphoo') {
      f += `<path d="M47 76 Q60 66 73 76 Q68.5 82.5 60 82.5 Q51.5 82.5 47 76 Z" fill="${cd}"/>` + zip + hem;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'track') {
      f += `<path d="M51 71.5 L60 78 L69 71.5 L71.5 79 L60 87 L48.5 79 Z" fill="${shade(coat, -0.1)}"/>`;
      f += zip + hem;
      for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(shX + 0.8)} 96 Q${ax(shX + 1.8)} 122 ${ax(shX - 2.4)} 148" stroke="#e8e8e8" stroke-width="2" opacity=".5" fill="none"/>`; }
    } else if (style === 'bomber') {
      f += `<path d="M49.5 71 Q60 69.5 70.5 71 L70 77 Q60 75.4 50 77 Z" fill="${cd}"/>` + zip + hem;
      for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(25)} 96 l8 -1 1.2 7 -8 1 Z" fill="${cd}" opacity=".85"/>`; }
    } else if (style === 'puffer' || style === 'croppuff') {
      for (const y of [82, 92, 102, 112, 122, 132]) { if (y < hemY - 3) f += `<path d="M45 ${y} Q60 ${y + 3.6} 75 ${y}" stroke="${cd}" stroke-width="1.6" fill="none" opacity=".6"/>`; }
      f += `<path d="M49.5 70.5 Q60 68.5 70.5 70.5 L71 77 Q60 75.4 49 77 Z" fill="${shade(coat, -0.08)}"/>` + zip;
      for (const sx of [-1, 1]) { f += sleeveLong(sx); const ax = (v) => 60 + sx * v; for (const y of [92, 108, 124]) { if (y < 140) f += `<path d="M${ax(shO - 4)} ${y} Q${ax(shO + 1)} ${y + 4} ${ax(shX)} ${y + 3}" stroke="${cd}" stroke-width="1.1" fill="none" opacity=".5"/>`; } }
    } else if (style === 'tee' || style === 'bigtee' || style === 'babytee' || style === 'polo') {
      if (style === 'tee' || style === 'bigtee') {
        f += `<path d="M50 71.5 Q60 82 70 71.5" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
        f += `<circle cx="60" cy="112" r="9" fill="none" stroke="${cl}" stroke-width="1.2" opacity=".45"/><path d="M55 114.5 L65 107.5 M55 110 L65 115" stroke="${cl}" stroke-width="1" opacity=".45"/>`;
      } else if (style === 'babytee') {
        f += `<path d="M50 71.5 Q60 80 70 71.5" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
        f += `<text x="60" y="104" text-anchor="middle" font-family="sans-serif" font-size="7.5" font-weight="900" fill="${cl}" opacity=".9">RT</text>`;
      } else {
        f += `<path d="M49.5 70 L60 79.5 L55 84 L46.5 74.5 Z M70.5 70 L60 79.5 L65 84 L73.5 74.5 Z" fill="${shade(coat, -0.1)}"/>`;
        f += `<path d="M60 79.5 L60 93" stroke="${cd}" stroke-width="1.6"/><circle cx="60" cy="85" r="1.1" fill="${cl}"/><circle cx="60" cy="90.5" r="1.1" fill="${cl}"/>`;
      }
      for (const sx of [-1, 1]) f += sleeveShort(sx);
    } else if (style === 'croptop') {
      f += `<path d="M50 71.5 Q60 82 70 71.5" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
      for (const sx of [-1, 1]) f += sleeveNone(sx);
    } else if (style === 'tank') {
      f += `<path d="M50 71.5 Q60 83 70 71.5" stroke="${cd}" stroke-width="1.8" fill="none"/>`;
      for (const y of [102, 107.5, 113]) f += `<path d="M48 ${y} Q60 ${y + 3} 72 ${y}" stroke="${cd}" stroke-width=".9" fill="none" opacity=".45"/>`;
      for (const sx of [-1, 1]) f += sleeveNone(sx);
    } else if (style === 'denim') {
      f += `<path d="M50 71 L60 80 L54 84.5 L46 75.5 Z M70 71 L60 80 L66 84.5 L74 75.5 Z" fill="${shade(coat, 0.08)}"/>` + zip;
      f += `<path d="M48 97 h9 v8 h-9 Z M63 97 h9 v8 h-9 Z" fill="${shade(coat, 0.02)}" stroke="${cd}" stroke-width=".9"/>`;
      f += `<circle cx="60" cy="111" r="1" fill="${cm}"/><circle cx="60" cy="124" r="1" fill="${cm}"/><circle cx="60" cy="137" r="1" fill="${cm}"/>`;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'flannel') {
      f += `<path d="M50.5 71 Q60 81.5 69.5 71" stroke="#c9c0a8" stroke-width="2.2" fill="none"/>`;
      f += `<clipPath id="fld${u}"><path d="M44 70 h15 L58.6 84 V148 H44 Z M61.4 84 L76 70 V148 H61.4 Z"/></clipPath>`;
      f += `<path d="M44.5 148 L44.5 72 L58.6 84 L58.6 148 Z M61.4 84 L75.5 72 L75.5 148 Z" fill="url(#ct${u})"/>`;
      f += `<g clip-path="url(#fld${u})" opacity=".27">${[47, 51, 64, 68].map(x => `<path d="M${x} 71 L${x} 148" stroke="#1c1208" stroke-width="1.4"/>`).join('')}${[80, 92, 104, 116, 128, 140].map(y => `<path d="M44 ${y} L76 ${y}" stroke="#1c1208" stroke-width="1.3"/>`).join('')}</g>`;
      for (const sx of [-1, 1]) f += sleeveShort(sx);
    } else if (style === 'wind') {
      f += `<path d="M60 74 L45 ${hemY} L60 ${hemY} Z M60 74 L75 ${hemY} L60 ${hemY} Z" fill="${cl}" opacity=".85"/>`;
      f += zip + hem;
      f += `<path d="M50 70.5 Q60 69 70 70.5 L69.5 75 Q60 73.6 50.5 75 Z" fill="${cd}"/>`;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'varsity') {
      f += `<path d="M50 70.5 Q60 69.5 70 70.5 L69 76 Q60 74.4 51 76 Z" fill="${cd}"/>`;
      for (const y of [82, 96, 110, 124, 138]) f += `<circle cx="60" cy="${y}" r="1.5" fill="${cm}"/>`;
      f += hem;
      for (const sx of [-1, 1]) f += sleeveLong(sx).replace(`url(#ct${u})`, shade(coat, 0.24));
    } else if (style === 'moto') {
      f += `<path d="M49.5 71.5 L42.5 110 L54 96 L58 76 Z M70.5 71.5 L66 77 L64.5 92 L74 84 Z" fill="${shade(coat, 0.1)}"/>`;
      f += `<path d="M58 76 L64.5 148" stroke="${cd}" stroke-width="2.2"/>`;
      for (const sx of [-1, 1]) { const ax = (v) => 60 + sx * v; f += sleeveLong(sx); f += `<path d="M${ax(shO)} 80 l9 -1.2 1.2 2.8 -9 1.2 Z" fill="${cd}"/>`; }
    } else if (style === 'tech') {
      f += `<path d="M47 70.5 Q60 68.5 73 70.5 L73 78 Q60 75.8 47 78 Z" fill="${cd}"/>`;
      f += `<path d="M44.5 120 L75.5 92" stroke="${shade(coat, 0.2)}" stroke-width="5.6" opacity=".95"/>`;
      f += `<rect x="56.5" y="101.5" width="7" height="6.5" fill="none" stroke="${cm}" stroke-width="1.2"/>` + zip;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'gilet') {
      f += `<path d="M59 148 L59 84 L49.5 71.5 Q44.5 78 44.5 90 L44.5 148 Z M61 148 L61 84 L70.5 71.5 Q75.5 78 75.5 90 L75.5 148 Z" fill="url(#ct${u})"/>`;
      for (const y of [84, 94, 104, 114, 124, 134]) f += `<path d="M44.5 ${y} Q52 ${y + 3.4} 58.6 ${y + 2} M75.5 ${y} Q68 ${y + 3.4} 61.4 ${y + 2}" stroke="${cd}" stroke-width="1.4" fill="none" opacity=".6"/>`;
      f += `<path d="M49.5 71.5 Q60 81 70.5 71.5" stroke="${cd}" stroke-width="2.4" fill="none"/>`;
      for (const sx of [-1, 1]) f += sleeveNone(sx);
    } else if (style === 'jersey' || style === 'rugby') {
      f += `<path d="M50 71 Q60 77.5 70 71 L68.6 69.4 Q60 75.4 51.4 69.4 Z" fill="#fff" opacity=".9"/>`;
      f += `<text x="60" y="118" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="900" fill="#fff" opacity=".92">10</text>`;
      f += `<path d="M44.5 96 h31" stroke="#fff" stroke-width="3" opacity=".6"/>`;
      for (const sx of [-1, 1]) f += sleeveShort(sx);
    } else if (style === 'longcoat') {
      // open long coat over an inner tee
      f += `<path d="M51 71.6 Q60 81 69 71.6 L60 90 Z" fill="#e8e2d4"/>`;
      f += `<path d="M44.5 186 L44.5 90 Q44.5 75.5 57 71.5 L57.6 186 Z M75.5 186 L75.5 90 Q75.5 75.5 63 71.5 L62.4 186 Z" fill="url(#ct${u})"/>`;
      f += `<path d="M44.5 90 L57.6 90 M75.5 90 L62.4 90" stroke="${cd}" stroke-width="1" opacity=".5"/>`;
      f += `<path d="M57 71.5 L52 92 M63 71.5 L68 92" stroke="${cd}" stroke-width="1.6" fill="none"/>`;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    } else if (style === 'skirtset' || style === 'tennis') {
      f += `<path d="M50 71.5 Q60 80 70 71.5" stroke="#c9c0a8" stroke-width="2" fill="none"/>`;
      for (const sx of [-1, 1]) f += sleeveShort(sx);
    } else if (style === 'cardigan') {
      f += `<path d="M51 71.6 Q60 81.5 69 71.6 L60 91 Z" fill="#e8e2d4"/>`;
      f += `<path d="M44.5 148 L44.5 74 L58 72.6 L58.8 148 Z M75.5 148 L75.5 74 L62 72.6 L61.2 148 Z" fill="url(#ct${u})"/>`;
      f += `<circle cx="59.4" cy="96" r="1.1" fill="${cd}"/><circle cx="59.4" cy="108" r="1.1" fill="${cd}"/><circle cx="59.4" cy="120" r="1.1" fill="${cd}"/>`;
      for (const sx of [-1, 1]) f += sleeveLong(sx);
    }
    // skirt layer for skirt sets (drawn over hips)
    if (SKIRTY[style]) {
      const sc = style === 'tennis' ? coat : '#3a5578';
      const scd = shade(sc, -0.22);
      f += `<path d="M42 168 L45.5 142 Q60 147 74.5 142 L78 168 Q60 174 42 168 Z" fill="${sc}"/>`;
      for (const x of [48, 54, 60, 66, 72]) f += `<path d="M${x} 144 L${x + (x < 60 ? -2 : 2)} 169" stroke="${scd}" stroke-width="1.2" opacity=".75"/>`;
      f += `<path d="M45.5 142 Q60 147 74.5 142" stroke="${scd}" stroke-width="1.6" fill="none"/>`;
    }
    if (style === 'croptop') { /* midriff already visible from skin base */ }
    return f;
  }

  // ---------------------------------------------------------------- small portrait
  function svgFor(s, size, glowColor) {
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'p';
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], top = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const style = top.s, fem = isFem(p);
    const coat = top.c, aIdx = p.accent;
    const glow = glowColor || acc;
    const bg2 = '#0d0e14', bg1 = shade(glow, -0.86);
    const cx = 60, cy = 50, sc = 1.12;
    let f = '';

    // long hair falls behind the shoulders
    f += hairBackSVG(hair, cx, cy, sc);
    // bust garment
    f += garmentBust(style, coat, acc, u, fem);
    f += chestAccent(aIdx, acc, true, u);
    f += `<rect x="52.5" y="64" width="15" height="16" rx="5" fill="${shade(skin, -0.2)}"/>`;
    f += `<ellipse cx="60" cy="78" rx="9" ry="3.6" fill="#000" opacity=".18"/>`;
    f += faceSVG(feat, hair, aIdx, cx, cy, sc, u);
    f += `<ellipse cx="46" cy="57" rx="5.5" ry="8" fill="#000" opacity=".1"/>`;
    f += `<ellipse cx="74" cy="57" rx="5.5" ry="8" fill="#000" opacity=".1"/>`;
    f += `<path d="M44 68 Q60 75 76 68" fill="none" stroke="#000" stroke-width="1.4" opacity=".16"/>`;
    f += headwearSVG(hair, cx, cy, sc, u);
    f += `<path d="M14 100 Q14 80 40 74.5" fill="none" stroke="${shade(glow, 0.5)}" stroke-width="1.6" opacity=".3"/>`;

    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" xmlns="http://www.w3.org/2000/svg">
      ${defsGrad(u, skin, coat, acc)}
      <defs><linearGradient id="pg${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
      <rect width="120" height="120" fill="url(#pg${u})"/>
      <ellipse cx="60" cy="52" rx="44" ry="40" fill="url(#gl${u})"/>
      ${f}
    </svg>`;
  }

  // ---------------------------------------------------------------- full character model
  function doll(s, size, opts) {
    opts = opts || {};
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'd';
    const skin = SKINS[p.skin], hair = HAIRS[p.hair], top = SHIRTS[p.shirt], acc = ACCENTS[p.accent], feat = FACE_FEAT[p.face];
    const style = top.s, fem = isFem(p);
    const coat = top.c;
    const S = size || 220;
    const VB_W = 120, VB_H = 254, DROP = 10;
    const H = Math.round(S * (VB_H / VB_W));
    const aIdx = p.accent;
    const bc = bottomColors(style, coat, fem);
    let f = '';

    f += `<ellipse cx="60" cy="230" rx="32" ry="6.5" fill="#000" opacity=".4"/>`;
    // hair behind the body
    f += hairBackSVG(hair, 60, 42, 1.02);
    // legs + bottoms, then shoes
    f += legsSVG(fem, style, bc, skin, u);
    f += shoesSVG(fem, shoeStyle(style));
    // torso garment
    f += dollGarment(style, coat, skin, u, fem);
    if (bc) f += chestAccent(aIdx, acc, false, u);
    else f += chestAccent(aIdx, acc, false, u);
    f += wristWatch(aIdx, acc, u);

    // hands
    for (const sx of [-1, 1]) {
      const gs = sx === -1 ? 1 : -1;
      const hx = 60 + sx * (fem ? 21.4 : 23.4), hy = 160;
      f += `<ellipse cx="${hx}" cy="${hy}" rx="6" ry="6.8" fill="url(#sk${u})"/>`;
      f += `<ellipse cx="${hx + gs * 4.6}" cy="${hy - 2}" rx="2.2" ry="3.2" fill="url(#sk${u})" transform="rotate(${gs * 26} ${hx + gs * 4.6} ${hy - 2})"/>`;
      f += `<path d="M${hx - 2.6} ${hy + 2.8} q.4 2.4 -.3 4 M${hx + 0.5} ${hy + 3.3} q.5 2.2 0 4.1 M${hx + 3.5} ${hy + 2.4} q.6 2.2 .5 3.8" stroke="${shade(skin, -0.34)}" stroke-width=".9" fill="none" opacity=".85" stroke-linecap="round"/>`;
    }

    // neck + head
    f += `<rect x="53.5" y="60" width="13" height="17" rx="5.5" fill="${shade(skin, -0.2)}"/>`;
    f += `<ellipse cx="60" cy="74" rx="8.6" ry="3.4" fill="#000" opacity=".2"/>`;
    f += faceSVG(feat, hair, aIdx, 60, 42, 1.02, u);
    f += headwearSVG(hair, 60, 42, 1.02, u);

    // rim light
    f += `<path d="M40.5 75.5 Q32 84 30 108 L28.6 182" fill="none" stroke="${shade(acc, 0.5)}" stroke-width="1.7" opacity=".3"/>`;
    f += `<path d="M46 22 Q52 14 60 13.6" fill="none" stroke="#fff" stroke-width="1.4" opacity=".14" stroke-linecap="round"/>`;

    return `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="${Math.round(S)}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg" class="doll-svg">
      ${defsGrad(u, skin, coat, acc)}
      <defs><linearGradient id="dg${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(acc, -0.9)}"/><stop offset="60%" stop-color="#12131c"/><stop offset="100%" stop-color="#0b0c12"/>
      </linearGradient></defs>
      ${opts.plainBg ? '' : `<rect width="${VB_W}" height="${VB_H}" fill="url(#dg${u})"/>`}
      <g transform="translate(0,${DROP})">${f}</g>
    </svg>`;
  }

  function svgDataUri(s, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)); }
  function dollDataUri(s, size, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size, opts)); }

  // ---------------------------------------------------------------- MUGSHOT
  function mugshot(s, size, name) {
    const inner = svgFor(s, 120);
    const no = 100000 + (hash(s) % 899999);
    let grid = '';
    for (let y = 18; y <= 108; y += 10) grid += `<path d="M6 ${y} H114" stroke="#aeb6c2" stroke-width=".5" opacity=".35"/>`;
    for (let x = 6; x <= 114; x += 9) grid += `<path d="M${x} 18 v4" stroke="#aeb6c2" stroke-width=".8" opacity=".6"/>`;
    const nm = String(name || 'DETAINED').toUpperCase().slice(0, 16);
    return `<svg viewBox="0 0 120 136" width="${size}" height="${Math.round(size * 136 / 120)}" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="136" fill="#111318"/>
      <g>${inner}</g>
      ${grid}
      <rect x="0" y="0" width="120" height="12" fill="rgba(0,0,0,.55)"/>
      <text x="6" y="9" font-family="monospace" font-size="7" fill="#cfd6e2" letter-spacing="1.4">RTPD&nbsp;&nbsp;${no}</text>
      <rect x="0" y="122" width="120" height="14" fill="#e8e4d8"/>
      <text x="6" y="132" font-family="sans-serif" font-size="7.6" font-weight="700" fill="#23231f" letter-spacing=".6">${nm}</text>
      <text x="114" y="132" text-anchor="end" font-family="monospace" font-size="7" fill="#6b675c">HOLD</text>
    </svg>`;
  }

  window.AV = {
    svgFor, doll, mugshot, svgDataUri, dollDataUri, parts, wear,
    SKINS, SKIN_NAMES, HAIRS, SHIRTS: SHIRTS.map(x => x.c), SHIRTS_FULL: SHIRTS, SHIRT_NAMES, SHIRT_STYLE, ACCENTS, ACCENT_NAMES, FACE_FEAT, BODIES,
    nameOf(kind, i) {
      const t = { skin: SKIN_NAMES, hair: HAIRS.map(h => h.n), shirt: SHIRT_NAMES, accent: ACCENT_NAMES, face: FACE_FEAT.map(x => x.n), body: BODIES };
      return ((t[kind] || [])[i]) || '';
    }
  };
})();
