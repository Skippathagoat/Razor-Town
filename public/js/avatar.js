// Razor Town — CHARACTER ENGINE v2 ("Rainlight").
// A full rebuild of the avatar art: modelled heads, layered cloth, per-garment
// fabric, five render surfaces and a much larger wardrobe.
//
// Spec string (all parts optional, missing parts fall back to sensible defaults):
//   skin|face|hair|top|accent|body|eyes|facial
//     skin    0-15   tone (each tone carries its own shading + shadow hue)
//     face    0-35   bone structure, expression, wear
//     hair    0-47   cut or headwear
//     top     0-39   coat / jacket / dress-shirt family
//     accent  0-15   trinket
//     body    0-7    build
//     eyes      0-11 iris (the "rainlight" eye colours)
//     facial  0-23   beard / moustache
// Every renderer is pure SVG, built from analytical geometry — no third-party art.
(function () {
  'use strict';

  const ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  const S = (v) => String(v == null ? '' : v);

  // ---------------------------------------------------------------- colour science
  function hex(s) {
    s = S(s).replace('#', '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function rgbStr(a) { return '#' + a.map(v => { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, amt) { const a = hex(c); const t = amt < 0 ? 0 : 255; const p = Math.abs(amt); return rgbStr(a.map(v => (t - v) * p + v)); }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return rgbStr(a.map((v, i) => v + (b[i] - v) * t)); }
  function alpha(c, a) { return `rgba(${hex(c).join(',')},${a})`; }
  function luma(c) { const a = hex(c); return (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255; }

  // ---------------------------------------------------------------- catalogue: skin
  const SKINS = [
    '#f4d7bd', '#eec3a0', '#e2ae86', '#d19a72', '#b9825c', '#a06d49',
    '#875a3b', '#6d452c', '#553423', '#3f2618', '#f7e3cd', '#d9a878',
    '#c68b5f', '#9c6a48', '#7a5033', '#5c3a26'
  ];
  const SKIN_NAMES = [
    'Porcelain', 'Fair rose', 'Warm cream', 'Peach', 'Honey', 'Sand',
    'Olive', 'Bronze', 'Chestnut', 'Deep umber', 'Winter pale', 'Sun-weathered',
    'Ruddy tan', 'Burnt sienna', 'Rich walnut', 'Ebony'
  ];

  // ---------------------------------------------------------------- eyes
  const EYES = [
    { n: 'Coal',       c: '#3a2a1e', rim: '#6b4a30' },
    { n: 'Amber',      c: '#8a5a1e', rim: '#d99a3a' },
    { n: 'Steel grey', c: '#5b6670', rim: '#a9b6c0' },
    { n: 'Rain blue',  c: '#3c5d80', rim: '#7fa6cc' },
    { n: 'Sea green',  c: '#3f6047', rim: '#7ba884' },
    { n: 'Hazel',      c: '#6b5220', rim: '#b9a049' },
    { n: 'Whisky',     c: '#5a3a17', rim: '#a97c37' },
    { n: 'Ice',        c: '#7f97a8', rim: '#cfdfe8' },
    { n: 'Violet',     c: '#503a63', rim: '#94729f' },
    { n: 'Copper',     c: '#7a4326', rim: '#c47a45' },
    { n: 'Sloe',       c: '#2a2b33', rim: '#5c6070' },
    { n: 'Moss',       c: '#4a5330', rim: '#8b9a5c' }
  ];
  const EYE_NAMES = EYES.map(e => e.n);

  // ---------------------------------------------------------------- faces
  // e: eye shape · b: brow (thick, angle, arch) · n: nose · m: mouth · c: cheeks
  // j: jaw · w: wrinkles · extra: scar / freckles / mole / lashes / rouge / goatee-ish
  const FACE_FEAT = [
    { n: 'Square-jawed stoic',    e: 'steady', b: [2.4, -1, 0.4], no: 'straight', m: 'flat',    c: 'flat',   j: 'square', w: 1 },
    { n: 'Heavy-browed bruiser',  e: 'deep',   b: [3.4, -4, 0.1], no: 'broken',   m: 'frown',   c: 'padded', j: 'wide',   w: 2 },
    { n: 'Thin-lipped accountant',e: 'small',  b: [1.8, 0, 1.0],  no: 'long',     m: 'pressed', c: 'hollow', j: 'narrow', w: 2 },
    { n: 'Broken-nose pugilist',  e: 'steady', b: [3, -3, 0.2],   no: 'broken',   m: 'smirk',   c: 'flat',   j: 'wide',   w: 3, scar: 1 },
    { n: 'Cheeky grin',           e: 'bright', b: [2.2, 1, 0.8],  no: 'snub',     m: 'grin',    c: 'full',   j: 'round',  w: 0, dimple: 1 },
    { n: 'Long-faced melancholy', e: 'sad',    b: [2.2, 2, 0.3],  no: 'long',     m: 'sad',     c: 'hollow', j: 'long',   w: 2 },
    { n: 'Sallow gambler',        e: 'hooded', b: [2, 1, 0.6],    no: 'straight', m: 'smirk',   c: 'hollow', j: 'narrow', w: 2 },
    { n: 'Pockmarked veteran',    e: 'deep',   b: [3, -2, 0.2],   no: 'wide',     m: 'flat',    c: 'flat',   j: 'square', w: 4, pocks: 1 },
    { n: 'Sharp-eyed hawk',       e: 'narrow', b: [2.6, -5, 0.1], no: 'beak',     m: 'pressed', c: 'hollow', j: 'narrow', w: 2 },
    { n: 'Sleepy-lidded',         e: 'heavy',  b: [2.2, 0, 0.4],  no: 'straight', m: 'sad',     c: 'full',   j: 'round',  w: 1 },
    { n: 'Big-jawed friendly',    e: 'bright', b: [2.6, 1, 0.7],  no: 'wide',     m: 'grin',    c: 'full',   j: 'wide',   w: 1 },
    { n: 'Hollow-cheeked ascetic',e: 'sunken', b: [2, 2, 0.5],    no: 'long',     m: 'flat',    c: 'hollow', j: 'long',   w: 3 },
    { n: 'Snub-nosed kid',        e: 'wide',   b: [1.7, 0, 1.1],  no: 'button',   m: 'grin',    c: 'full',   j: 'soft',   w: 0, freckles: 1 },
    { n: 'Sardonic smirk',        e: 'hooded', b: [2.3, -3, 0.9], no: 'straight', m: 'smirk',   c: 'flat',   j: 'square', w: 2 },
    { n: 'Iron stare',            e: 'steady', b: [2.8, -2, 0.1], no: 'straight', m: 'pressed', c: 'flat',   j: 'square', w: 2, mole: 1 },
    { n: 'Weathered dockhand',    e: 'heavy',  b: [3, -1, 0.3],   no: 'wide',     m: 'flat',    c: 'flat',   j: 'wide',   w: 4, weather: 1 },
    { n: 'Fresh-faced youth',     e: 'wide',   b: [1.9, 0, 1.0],  no: 'straight', m: 'smile',   c: 'full',   j: 'soft',   w: 0 },
    { n: 'Broad-nosed boxer',     e: 'deep',   b: [3.2, -3, 0.2], no: 'wide',     m: 'frown',   c: 'padded', j: 'wide',   w: 4, scar: 2 },
    // ---- feminine / soft-featured (safe on any build)
    { n: 'Soft oval, calm',       e: 'almond', b: [1.6, 0, 1.3],  no: 'straight', m: 'softsmile', c: 'soft', j: 'oval',  w: 1, lashes: 1, lips: 'full' },
    { n: 'Sharp cheekbones',      e: 'almond', b: [1.7, -2, 1.2], no: 'straight', m: 'flat',    c: 'sculpt', j: 'oval',   w: 1, lashes: 1 },
    { n: 'Round-cheeked smile',   e: 'bright', b: [1.5, 0, 1.2],  no: 'button',   m: 'smile',   c: 'full',   j: 'round',  w: 0, lashes: 1, dimple: 1 },
    { n: 'Almond eyes, cool',     e: 'almond', b: [1.5, -3, 1.4], no: 'long',     m: 'pressed', c: 'sculpt', j: 'oval',   w: 1, lashes: 1, liner: 1 },
    { n: 'Tired elegance',        e: 'heavy',  b: [1.7, 0, 1.0],  no: 'straight', m: 'sad',     c: 'sculpt', j: 'oval',   w: 3, lashes: 1, rouge: 1 },
    { n: 'Bright and quick',      e: 'wide',   b: [1.6, 0, 1.3],  no: 'snub',     m: 'grin',    c: 'full',   j: 'heart',  w: 0, lashes: 1, freckles: 1 },
    { n: 'High-arched brows',     e: 'almond', b: [1.4, 1, 1.8],  no: 'straight', m: 'softsmile', c: 'soft', j: 'oval', w: 1, lashes: 1 },
    { n: 'Heart-shaped face',     e: 'almond', b: [1.6, 0, 1.2],  no: 'button',   m: 'pout',    c: 'soft',   j: 'heart',  w: 0, lashes: 1, rouge: 1 },
    { n: 'Wide-set eyes, warm',   e: 'wide',   b: [1.6, 0, 1.1],  no: 'straight', m: 'smile',   c: 'full',   j: 'round',  w: 1, lashes: 1 },
    { n: 'Arch and smirk',        e: 'hooded', b: [1.6, -3, 1.5], no: 'straight', m: 'smirk',   c: 'sculpt', j: 'oval',   w: 1, lashes: 1, liner: 1, mole: 1 },
    { n: 'Serene, low-lidded',    e: 'heavy',  b: [1.5, 0, 1.2],  no: 'long',     m: 'flat',    c: 'soft',   j: 'oval',   w: 2, lashes: 1 },
    { n: 'Freckled youth',        e: 'bright', b: [1.6, 0, 1.2],  no: 'snub',     m: 'grin',    c: 'full',   j: 'soft',   w: 0, freckles: 2, lashes: 1 },
    // ---- shared / character pieces
    { n: 'Grinning wide',         e: 'bright', b: [2.4, 1, 0.6],  no: 'wide',     m: 'grin',    c: 'full',   j: 'wide',   w: 1, teeth: 1 },
    { n: 'Blank slate',           e: 'steady', b: [2, 0, 0.6],    no: 'straight', m: 'flat',    c: 'flat',   j: 'square', w: 0 },
    { n: 'Cold blue stare',       e: 'narrow', b: [2.2, -4, 0.3], no: 'beak',     m: 'pressed', c: 'sculpt', j: 'narrow', w: 2 },
    { n: 'Scowling',              e: 'deep',   b: [3.4, -6, 0.1], no: 'wide',     m: 'frown',   c: 'padded', j: 'wide',   w: 3 },
    { n: 'Frown lines, kind',     e: 'steady', b: [2.4, -1, 0.7],  no: 'straight', m: 'softsmile', c: 'flat', j: 'square', w: 3, weather: 1 },
    { n: 'Aristocratic brow',     e: 'hooded', b: [1.8, 1, 1.6],  no: 'long',     m: 'pressed', c: 'hollow', j: 'long',   w: 2, mole: 1 }
  ];

  // ---------------------------------------------------------------- facial hair
  const FACIALS = [
    { n: 'Clean-shaven',     kind: 'none' },
    { n: 'Shadow of stubble',kind: 'stubble', d: 0.35 },
    { n: 'Three-day stubble',kind: 'stubble', d: 0.62 },
    { n: 'Heavy beard shadow',kind: 'stubble', d: 0.9 },
    { n: 'Pencil moustache', kind: 'mstache', style: 'pencil' },
    { n: 'Handlebar',        kind: 'mstache', style: 'handlebar' },
    { n: 'Walrus moustache', kind: 'mstache', style: 'walrus' },
    { n: 'Toothbrush moustache', kind: 'mstache', style: 'toothbrush' },
    { n: 'Horseshoe moustache', kind: 'mstache', style: 'horseshoe' },
    { n: 'Soul patch',       kind: 'patch' },
    { n: 'Mutton chops',     kind: 'chops' },
    { n: 'Sideburns',        kind: 'burns' },
    { n: 'Chinstrap',        kind: 'strap' },
    { n: 'Jawline beard',    kind: 'jaw' },
    { n: 'Goatee',           kind: 'goatee' },
    { n: 'Van Dyke',         kind: 'vandyke' },
    { n: 'Short boxed beard',kind: 'boxed' },
    { n: 'Full beard',       kind: 'full', len: 1 },
    { n: 'Long beard',       kind: 'full', len: 1.6 },
    { n: 'Wild long beard',  kind: 'full', len: 2.1, wild: 1 },
    { n: 'Stubble + moustache', kind: 'stubm', d: 0.5 },
    { n: 'Grey full beard',  kind: 'full', len: 1.1, c: '#bdb8ae' },
    { n: 'Salt-and-pepper beard', kind: 'boxed', c: '#8e8880' },
    { n: 'Snow-white beard', kind: 'full', len: 1.4, c: '#e6e2d8' }
  ];

  // ---------------------------------------------------------------- hair & headwear
  // shape families: SH = short, PT = parted, SL = slick, RC = receding, LN = long,
  // WV = wavy, CR = curly, AF = afro, LC = locs, BN = bun, BB = bob, UP = updo,
  // ROL = rolls, BS = bald/buzz. caps: separate families.
  const HAIRS = [
    { n: 'Shaved head',        k: 'bald',      c: '#5a5148' },
    { n: 'Buzz cut',           k: 'buzz',      c: '#191512' },
    { n: 'Buzz cut, greying',  k: 'buzz',      c: '#6a6259' },
    { n: 'Crew cut',           k: 'crew',      c: '#26180f' },
    { n: 'Short back and sides',k: 'crew',     c: '#3b2a1b' },
    { n: 'Square crop',        k: 'crew',      c: '#1c1512', g: '#3a3028' },
    { n: 'Brilliantine side part', k: 'part',  c: '#120f0d' },
    { n: 'Soft side part',     k: 'part',      c: '#3a2716' },
    { n: 'Parted, salt-and-pepper', k: 'part', c: '#3a3129', g: '#a9a49b' },
    { n: 'Slicked back',       k: 'slick',     c: '#181410' },
    { n: 'Slicked back, grey', k: 'slick',     c: '#8b857c' },
    { n: 'Pompadour',          k: 'pompadour', c: '#231a12' },
    { n: 'Receding hairline',  k: 'recede',    c: '#4a4038' },
    { n: 'Comb-over',          k: 'combover',  c: '#6b6157', g: '#cfc9c0' },
    { n: 'Thinning crown',     k: 'thin',      c: '#5f574d' },
    { n: 'Horseshoe ring',     k: 'horse',     c: '#a8a29a' },
    { n: 'Grey, neatly cut',   k: 'crew',      c: '#8d8880' },
    { n: 'Silver sweep',       k: 'slick',     c: '#c6c1b8' },
    { n: 'Shoulder-length',    k: 'long',      c: '#20160f' },
    { n: 'Long grey locks',    k: 'long',      c: '#9d978e' },
    { n: 'Wavy and wild',      k: 'wavy',      c: '#2d1e12' },
    { n: 'Man bun',            k: 'bun',       c: '#241a11' },
    { n: 'Top-knot',           k: 'knot',      c: '#171310' },
    { n: 'Short afro',         k: 'afro',      c: '#1e1410' },
    { n: 'Full afro',          k: 'afrobig',   c: '#150f0c' },
    { n: 'Tight curls',        k: 'curls',     c: '#2a1a11' },
    { n: 'Locs, tied back',    k: 'locs',      c: '#2a1c12' },
    { n: 'Long locs',          k: 'locs',      c: '#1f1610', len: 1.5 },
    // ---- headwear
    { n: 'Tweed flat cap',     k: 'flatcap',   c: '#6d4a2b', hc: '#2b1f14' },
    { n: 'Grey flat cap',      k: 'flatcap',   c: '#767068', hc: '#3a332b' },
    { n: 'Newsboy cap',        k: 'newsboy',   c: '#2b2620', hc: '#191512' },
    { n: 'Bowler hat',         k: 'bowler',    c: '#1d1c1e', hc: '#171310' },
    { n: 'Grey trilby',        k: 'trilby',    c: '#8b867c', hc: '#2d2419' },
    { n: 'Black fedora',       k: 'fedora',    c: '#1b1a1c', hc: '#241a11' },
    { n: 'Camel fedora',       k: 'fedora',    c: '#a98b5c', hc: '#3a2a16' },
    { n: 'Straw boater',       k: 'boater',    c: '#d8c48c', hc: '#4a3a1c' },
    { n: 'Panama hat',         k: 'panama',    c: '#e3d3a8', hc: '#3a2f1a' },
    { n: 'Watch cap',          k: 'beanie',    c: '#2b3542', hc: '#1a1512' },
    { n: 'Wool beanie',        k: 'beanie',    c: '#6d3b34', hc: '#241a11' },
    { n: 'Hood up',            k: 'hood',      c: '#242a34', hc: '#141110' },
    { n: 'Snapback, backwards',k: 'snapback',  c: '#1e2430', hc: '#171310' },
    { n: 'Peaked cap',         k: 'peaked',    c: '#20242c', hc: '#15161a' },
    { n: 'Baker boy cap',      k: 'newsboy',   c: '#4a3a2c', hc: '#241c14' },
    { n: 'Silk bandana',       k: 'bandana',   c: '#8a3b32', hc: '#241a11' },
    { n: 'Head scarf',         k: 'scarf',     c: '#4a5a63', hc: '#241a11' },
    // ---- feminine-leaning cuts
    { n: 'Long dark waves',    k: 'waves',     c: '#2a1c10', f: 1 },
    { n: 'Long auburn waves',  k: 'waves',     c: '#6d3a1e', f: 1 },
    { n: 'Blunt bob',          k: 'bob',       c: '#2e2016', f: 1 },
    { n: 'Bob with fringe',    k: 'bobfringe', c: '#1d1410', f: 1 },
    { n: 'Pixie crop',         k: 'pixie',     c: '#33231a', f: 1 },
    { n: 'Chignon',            k: 'chignon',   c: '#3a2a1c', f: 1 },
    { n: 'Rolled updo',        k: 'updo',      c: '#6f5a3e', f: 1 },
    { n: 'Victory rolls',      k: 'rolls',     c: '#33221a', f: 1 },
    { n: 'Finger waves',       k: 'fingerwave',c: '#241811', f: 1 },
    { n: 'High ponytail',      k: 'ponytail',  c: '#3d2a1a', f: 1 },
    { n: 'Long braid',         k: 'braid',     c: '#4a3220', f: 1 },
    { n: 'Curly shoulder bob', k: 'curlbob',   c: '#3a2414', f: 1 }
  ];

  // ---------------------------------------------------------------- tops
  // k = silhouette family · c = cloth · l = lining/shirt · tr = trousers · sh = shoes
  // s = secondary cloth (collar/trim) · pt = fabric pattern
  const SHIRTS = [
    { k: 'overcoat',  c: '#3f352a', l: '#e6dfd0', s: '#2c251c', tr: '#2f2a22', sh: '#241d16', pt: 'weave',   n: 'Heavy brown overcoat' },
    { k: 'overcoat',  c: '#4a4034', l: '#dcd2be', s: '#332b21', tr: '#3a3226', sh: '#221b14', pt: 'tweed',   n: 'Worn moleskin overcoat' },
    { k: 'greatcoat', c: '#1d1e22', l: '#2a3140', s: '#141519', tr: '#191a1e', sh: '#15161a', pt: 'weave',   n: 'Black greatcoat' },
    { k: 'greatcoat', c: '#3a4049', l: '#1f2a35', s: '#262b32', tr: '#2c3138', sh: '#1b1d22', pt: 'plain',   n: 'Smoke-grey greatcoat' },
    { k: 'frock',     c: '#23252c', l: '#e6dfd0', s: '#16171c', tr: '#2b2d34', sh: '#17181c', pt: 'pinstripe', n: 'Tailored frock coat' },
    { k: 'frock',     c: '#31503c', l: '#e9e3d4', s: '#1f3628', tr: '#2c3a30', sh: '#1a1b18', pt: 'plain',   n: 'Green banker\u2019s frock' },
    { k: 'trench',    c: '#8a7a5e', l: '#e4dcc8', s: '#6a5c46', tr: '#7a6c52', sh: '#3a3126', pt: 'weave',   n: 'Rain-beaten trench' },
    { k: 'trench',    c: '#3d3a35', l: '#d8d2c2', s: '#2b2925', tr: '#343230', sh: '#1e1d1a', pt: 'plain',   n: 'Charcoal trench' },
    { k: 'duster',    c: '#6b5a42', l: '#3a2f22', s: '#4f4230', tr: '#5a4a34', sh: '#302517', pt: 'plaid',   n: 'Split canvas duster' },
    { k: 'peacoat',   c: '#3c4148', l: '#22262b', s: '#2a2e33', tr: '#2f333a', sh: '#1c1e22', pt: 'weave',   n: 'Double-breasted peacoat' },
    { k: 'duffel',    c: '#22262e', l: '#5a3f28', s: '#171a20', tr: '#23262c', sh: '#191a1d', pt: 'plain',   n: 'Charcoal duffel coat' },
    { k: 'bomber',    c: '#2a2f38', l: '#e0d8c6', s: '#1c2027', tr: '#2c3038', sh: '#191b1f', pt: 'plain',   n: 'Black bomber jacket' },
    { k: 'bomber',    c: '#455238', l: '#e6e0d0', s: '#33402a', tr: '#3e4934', sh: '#26281f', pt: 'plain',   n: 'Olive bomber' },
    { k: 'leather',   c: '#31211a', l: '#cfc7b6', s: '#1f1512', tr: '#2b2320', sh: '#171312', pt: 'hide',    n: 'Flying leather jacket' },
    { k: 'waistcoat', c: '#2a3140', l: '#e9e3d6', s: '#1a1f2a', tr: '#2f3542', sh: '#1a1b1f', pt: 'pinstripe', n: 'Waistcoat and shirtsleeves' },
    { k: 'waistcoat', c: '#5a3a2c', l: '#efe7d6', s: '#3d261c', tr: '#3a3027', sh: '#241d16', pt: 'weave',   n: 'Brown waistcoat, rolled cuffs' },
    { k: 'blazer',    c: '#28354f', l: '#e6e0d2', s: '#1a2436', tr: '#2c3346', sh: '#1c1e23', pt: 'plain',   n: 'Navy blazer, club stripe' },
    { k: 'blazer',    c: '#5c4a3a', l: '#e8e0d0', s: '#3f3126', tr: '#4a3f33', sh: '#28211a', pt: 'plaid',   n: 'Tweed blazer' },
    { k: 'rollneck',  c: '#2c3038', l: '#3a4048', s: '#22262c', tr: '#33373e', sh: '#1c1e21', pt: 'rib',     n: 'Roll-neck and overcoat' },
    { k: 'rollneck',  c: '#6a3b33', l: '#7c473c', s: '#4e2b25', tr: '#3a2d28', sh: '#241c19', pt: 'rib',     n: 'Rust roll-neck' },
    { k: 'dockjacket',c: '#2f3a3a', l: '#d9d2c0', s: '#212a2a', tr: '#3a4038', sh: '#22261f', pt: 'weave',   n: 'Dockhand\u2019s canvas jacket' },
    { k: 'dockjacket',c: '#4a3f2e', l: '#e2dac6', s: '#332b20', tr: '#4a4436', sh: '#2a2a22', pt: 'plaid',   n: 'Flannel work jacket' },
    { k: 'surcoat',   c: '#3a2f3c', l: '#ded6c4', s: '#271f29', tr: '#332c34', sh: '#1e1a20', pt: 'pinstripe', n: 'Plum surcoat' },
    { k: 'surcoat',   c: '#1f2b30', l: '#cfd8dc', s: '#151e22', tr: '#242e33', sh: '#161b1e', pt: 'plain',   n: 'Bottle-green city coat' },
    { k: 'raincoat',  c: '#3d4a3c', l: '#d6cfba', s: '#2a342a', tr: '#333c32', sh: '#1d211c', pt: 'hide',    n: 'Waxed raincoat' },
    { k: 'raincoat',  c: '#7a6a4a', l: '#e6dec8', s: '#57492f', tr: '#5c5140', sh: '#2f2a20', pt: 'hide',    n: 'Oilskin coat, big collar' },
    { k: 'smoking',   c: '#4a2230', l: '#e9dcc9', s: '#331620', tr: '#3a2c31', sh: '#211a1c', pt: 'plain',   n: 'Burgundy smoking jacket' },
    { k: 'smoking',   c: '#2b2f3a', l: '#e2e0d4', s: '#1d2029', tr: '#31343d', sh: '#1c1d22', pt: 'weave',   n: 'Midnight smoking jacket' },
    { k: 'sailor',    c: '#243a56', l: '#eee9dc', s: '#1a2b40', tr: '#2a3242', sh: '#1c1e24', pt: 'plain',   n: 'Deck jacket, brass buttons' },
    // ---- feminine cuts
    { k: 'ladycoat',  c: '#5c4a3a', l: '#efe7d6', s: '#3d3126', tr: '#4a3f33', sh: '#2a231c', pt: 'weave',   n: 'Tailored lady\u2019s coat', f: 1 },
    { k: 'ladycoat',  c: '#7a3b46', l: '#f0e6d8', s: '#54242d', tr: '#5e3a40', sh: '#2c2024', pt: 'plain',   n: 'Wine fitted coat', f: 1 },
    { k: 'wrapcoat',  c: '#3a4a52', l: '#e8e2d4', s: '#28343a', tr: '#3e464c', sh: '#22262a', pt: 'weave',   n: 'Slate wrap coat', f: 1 },
    { k: 'wrapcoat',  c: '#566046', l: '#f0ead8', s: '#3a422f', tr: '#4a5040', sh: '#262a22', pt: 'weave',   n: 'Bottle-green wrap coat', f: 1 },
    { k: 'longcoatf', c: '#2e2530', l: '#e8e0d0', s: '#201a22', tr: '#3a3340', sh: '#231d26', pt: 'plain',   n: 'Long plum coat', f: 1 },
    { k: 'dress',     c: '#2f3a4a', l: '#dde3ea', s: '#212a36', tr: '#2f3a4a', sh: '#20242c', pt: 'plain',   n: 'Shirt-dress and coat', f: 1 },
    { k: 'dress',     c: '#4a3a48', l: '#e6dcea', s: '#332630', tr: '#463a44', sh: '#241f26', pt: 'plain',   n: 'Plum dress coat', f: 1 },
    { k: 'knitf',     c: '#6a5340', l: '#e9dfcc', s: '#4a382b', tr: '#5a4a3a', sh: '#2a231c', pt: 'rib',     n: 'Camel knit coat', f: 1 },
    { k: 'knitf',     c: '#8a4a3a', l: '#f0e0d0', s: '#652e26', tr: '#5c3a33', sh: '#2c2220', pt: 'rib',     n: 'Terracotta knit coat', f: 1 },
    { k: 'trenchf',   c: '#a89878', l: '#f2ead6', s: '#7d6f52', tr: '#8a7c5e', sh: '#3a3126', pt: 'weave',   n: 'Belted stone trench', f: 1 }
  ];

  // ---------------------------------------------------------------- accents
  const ACCENTS = [
    { n: 'None',              k: 'none',    c: '#c7a252' },
    { n: 'Gold watch chain',  k: 'watch',   c: '#d9b45e' },
    { n: 'Silk cravat',       k: 'cravat',  c: '#7d1f2a' },
    { n: 'Fresh carnation',   k: 'bouton',  c: '#c0392b' },
    { n: 'Steel tie pin',     k: 'pin',     c: '#b9c0c9' },
    { n: 'Ivory cufflinks',   k: 'links',   c: '#efe9dc' },
    { n: 'Unlit cigar',       k: 'cigar',   c: '#54321f' },
    { n: 'Briar pipe',        k: 'pipe',    c: '#6b4525' },
    { n: 'Wire spectacles',   k: 'glasses', c: '#d8d2c0' },
    { n: 'Tinted round specs',k: 'shades',  c: '#1d2026' },
    { n: 'Wool scarf',        k: 'scarf',   c: '#8a3b32' },
    { n: 'Pocket square',     k: 'square',  c: '#e8e2d0' },
    { n: 'Cigarette',         k: 'fag',     c: '#efe6d2' },
    { n: 'Silver hip flask',  k: 'flask',   c: '#a9b0ba' },
    { n: 'Pearl rosary',      k: 'rosary',  c: '#ddd6c4' },
    { n: 'Monocle',           k: 'monocle', c: '#d8d2c0' }
  ];
  const ACCENT_COLORS = ACCENTS.map(a => a.c);

  // ---------------------------------------------------------------- builds
  const BODIES = [
    { n: 'Broad shouldered', sex: 0, sh: 1.14, wa: 1.0,  hip: 1.0,  len: 1.0,  limb: 1.06 },
    { n: 'Standard build',   sex: 0, sh: 1.0,  wa: 1.0,  hip: 1.0,  len: 1.0,  limb: 1.0 },
    { n: 'Lanky',            sex: 0, sh: 0.96, wa: 0.94, hip: 0.95, len: 1.09, limb: 0.94 },
    { n: 'Heavy set',        sex: 0, sh: 1.08, wa: 1.24, hip: 1.16, len: 0.97, limb: 1.14 },
    { n: 'Wiry',             sex: 0, sh: 0.94, wa: 0.9,  hip: 0.93, len: 1.0,  limb: 0.92 },
    { n: 'Lady, standard',   sex: 1, sh: 0.92, wa: 0.82, hip: 1.08, len: 1.0,  limb: 0.94 },
    { n: 'Lady, athletic',   sex: 1, sh: 0.98, wa: 0.84, hip: 1.04, len: 1.02, limb: 0.96 },
    { n: 'Lady, softer line',sex: 1, sh: 0.9,  wa: 0.86, hip: 1.14, len: 0.97, limb: 1.02 }
  ];

  // ---------------------------------------------------------------- tools
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function parts(str) {
    const p = S(str).split('|').map(x => parseInt(x, 10));
    const max = [SKINS.length - 1, FACE_FEAT.length - 1, HAIRS.length - 1, SHIRTS.length - 1, ACCENTS.length - 1, BODIES.length - 1, EYES.length - 1, FACIALS.length - 1];
    const out = { skin: 0, face: 0, hair: 0, shirt: 0, accent: 0, body: 0, eyes: 0, facial: 0 };
    const keys = ['skin', 'face', 'hair', 'shirt', 'accent', 'body', 'eyes', 'facial'];
    keys.forEach((k, i) => { let v = p[i]; if (!Number.isFinite(v)) v = 0; out[k] = Math.max(0, Math.min(max[i], v)); });
    return out;
  }
  function joinParts(p) { return ['skin', 'face', 'hair', 'shirt', 'accent', 'body', 'eyes', 'facial'].map(k => p[k] | 0).join('|'); }
  function isFem(p) { return BODIES[p.body] && BODIES[p.body].sex === 1; }

  // a face + hair + facial resolved down to a plain object the geometry reads
  function resolve(str, override) {
    const p = parts(str);
    if (override) for (const k of Object.keys(override)) if (override[k] != null) p[k] = override[k];
    const skin = SKINS[p.skin];
    const feat = FACE_FEAT[p.face];
    const hair = HAIRS[p.hair];
    const top = SHIRTS[p.shirt];
    const acc = ACCENTS[p.accent];
    const body = BODIES[p.body];
    const eye = EYES[p.eyes];
    const facial = FACIALS[p.facial];
    const dark = luma(skin) < 0.42;
    const sk = {
      base: shade(skin, 0.06),
      lit: shade(skin, dark ? 0.28 : 0.34),
      mid: shade(skin, -0.03),
      form: shade(skin, -0.18),
      deep: shade(skin, -0.46),
      warm: mix(skin, '#c6553c', 0.2),
      cool: mix(skin, '#6a7f9c', 0.16)
    };
    return { p, skin, sk, feat, hair, top, acc, body, eye, facial, fem: body.sex === 1, dark, u: hash(joinParts(p)).toString(36) };
  }

  // ---------------------------------------------------------------- svg plumbing
  function defsFor(r, opts) {
    opts = opts || {};
    const sk = r.sk, u = r.u;
    const coat = shade(r.top.c, 0.14), lining = r.top.l;
    let d = '';
    d += `<linearGradient id="sk${u}" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${sk.lit}"/><stop offset="38%" stop-color="${sk.base}"/><stop offset="100%" stop-color="${shade(sk.mid, -0.06)}"/></linearGradient>`;
    d += `<linearGradient id="skn${u}" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="${shade(sk.base, -0.2)}"/><stop offset="100%" stop-color="${shade(sk.base, -0.42)}"/></linearGradient>`;
    d += `<linearGradient id="ct${u}" x1="0.05" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${shade(coat, 0.34)}"/><stop offset="34%" stop-color="${shade(coat, 0.1)}"/><stop offset="72%" stop-color="${coat}"/><stop offset="100%" stop-color="${shade(coat, -0.22)}"/></linearGradient>`;
    d += `<linearGradient id="cl${u}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="${shade(lining, 0.24)}"/><stop offset="100%" stop-color="${shade(lining, -0.02)}"/></linearGradient>`;
    d += `<linearGradient id="hr${u}" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${shade(r.hair.c, 0.26)}"/><stop offset="38%" stop-color="${shade(r.hair.c, 0.02)}"/><stop offset="100%" stop-color="${shade(r.hair.c, -0.42)}"/></linearGradient>`;
    d += `<linearGradient id="hs${u}" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${shade(r.top.sh || '#222', 0.12)}"/><stop offset="100%" stop-color="${shade(r.top.sh || '#222', -0.35)}"/></linearGradient>`;
    d += `<linearGradient id="tr${u}" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${shade(r.top.tr, 0.12)}"/><stop offset="100%" stop-color="${shade(r.top.tr, -0.34)}"/></linearGradient>`;
    d += `<radialGradient id="ir${u}" cx="45%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${shade(r.eye.rim, 0.18)}"/><stop offset="55%" stop-color="${r.eye.c}"/><stop offset="100%" stop-color="${shade(r.eye.c, -0.5)}"/></radialGradient>`;
    d += `<radialGradient id="gl${u}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${alpha(opts.glow || r.acc.c, 0.5)}"/><stop offset="100%" stop-color="${alpha(opts.glow || r.acc.c, 0)}"/></radialGradient>`;
    // fabric patterns
    if (r.top.pt === 'weave') d += `<pattern id="pt${u}" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2 H4 M2 0 V4" stroke="${alpha('#000', 0.16)}" stroke-width="0.6"/></pattern>`;
    if (r.top.pt === 'tweed') d += `<pattern id="pt${u}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 L6 6 M0 6 L6 0" stroke="${alpha('#fff', 0.1)}" stroke-width="0.7"/><path d="M3 0 V6" stroke="${alpha('#000', 0.12)}" stroke-width="0.6"/></pattern>`;
    if (r.top.pt === 'pinstripe') d += `<pattern id="pt${u}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M1 0 V6" stroke="${alpha('#fff', 0.14)}" stroke-width="0.7"/><path d="M4.5 0 V6" stroke="${alpha('#000', 0.16)}" stroke-width="0.9"/></pattern>`;
    if (r.top.pt === 'plaid') d += `<pattern id="pt${u}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0 H10 M0 5 H10" stroke="${alpha('#000', 0.2)}" stroke-width="1.1"/><path d="M0 0 V10 M5 0 V10" stroke="${alpha('#fff', 0.09)}" stroke-width="1.1"/></pattern>`;
    if (r.top.pt === 'hide') d += `<pattern id="pt${u}" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 4 Q 2 2 4 4 T 9 3" stroke="${alpha('#fff', 0.08)}" stroke-width="1" fill="none"/><path d="M0 8 Q 3 6 6 8" stroke="${alpha('#000', 0.2)}" stroke-width="0.8" fill="none"/></pattern>`;
    if (r.top.pt === 'rib') d += `<pattern id="pt${u}" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M2 0 V4" stroke="${alpha('#000', 0.18)}" stroke-width="1"/></pattern>`;
    if (r.top.pt === 'plain') d += '';
    return `<defs>${d}</defs>`;
  }
  function patternOverlay(r, id) { return r.top.pt === 'plain' ? '' : id; }

  // ---------------------------------------------------------------- HEAD GEOMETRY
  // Local space: (0,0) = centre of the face, crown -27, chin +27, cheekbones +-18.
  // skull archetypes — widest at the cheekbones, tapering to jaw and crown
  const GEO = {
    square: { jaw: 1.05, chin: 1.0, cheek: 1.0, len: 1.0, chinY: 27.0, jawY: 18.6 },
    wide:   { jaw: 1.16, chin: 1.06, cheek: 1.03, len: 0.97, chinY: 27.4, jawY: 19.4 },
    narrow: { jaw: 0.88, chin: 0.88, cheek: 0.93, len: 1.02, chinY: 26.2, jawY: 17.8 },
    long:   { jaw: 0.95, chin: 0.9, cheek: 0.94, len: 1.1, chinY: 29.4, jawY: 20.4 },
    round:  { jaw: 1.0, chin: 0.98, cheek: 1.06, len: 0.94, chinY: 25.2, jawY: 17.4 },
    soft:   { jaw: 0.94, chin: 0.92, cheek: 0.99, len: 0.97, chinY: 25.8, jawY: 17.6 },
    oval:   { jaw: 0.88, chin: 0.86, cheek: 0.99, len: 1.0, chinY: 26.4, jawY: 17.6 },
    heart:  { jaw: 0.8,  chin: 0.74, cheek: 1.03, len: 0.98, chinY: 25.6, jawY: 16.6 }
  };
  function outline(feat) {
    const g = GEO[feat.j] || GEO.square;
    const j = g.jaw, c = g.chin, ck = g.cheek, L = g.len;
    const CROWN = -27.6 * L, TEMPLE = -12.4 * L;
    const W = 18.4 * ck;                 // widest — the cheekbones
    const T = 16.9 * ck;                 // temples
    const JW = 12.2 * j;                 // jaw at its angle
    const CW = 5.4 * c;                  // chin half-width at the point
    const JY = g.jawY, CY = g.chinY;
    return `M 0 ${CROWN}
      C ${6.6 * ck} ${CROWN + 0.4} ${12.4 * ck} ${CROWN + 2.6} ${T} ${TEMPLE}
      C ${T + 1.4} ${-9} ${W - 0.6} ${-5.6} ${W} ${-1.4}
      C ${W + 0.4} ${3.6} ${W - 1.2} ${8.6} ${JW * 1.36} ${JW - 2.4}
      C ${JW * 1.14} ${JY + 3.4} ${CW * 1.5} ${CY - 3.4} ${CW} ${CY}
      C ${CW * 0.7} ${CY + 0.6} ${-CW * 0.7} ${CY + 0.6} ${-CW} ${CY}
      C ${-CW * 1.5} ${CY - 3.4} ${-JW * 1.14} ${JY + 3.4} ${-JW * 1.36} ${JW - 2.4}
      C ${-W + 1.2} ${8.6} ${-W - 0.4} ${3.6} ${-W} ${-1.4}
      C ${-W + 0.6} ${-5.6} ${-T - 1.4} ${-9} ${-T} ${TEMPLE}
      C ${-12.4 * ck} ${CROWN + 2.6} ${-6.6 * ck} ${CROWN + 0.4} 0 ${CROWN} Z`;
  }

  // eye + brow + nose + mouth + beard, drawn at local scale
  function featuresSvg(r, o) {
    o = o || {};
    const f = r.feat, sk = r.sk, s = [];
    const E = { x: 7.6, y: -2.0 };
    const shapes = {
      steady:  { top: 3.3, bot: 2.5, w: 4.5, lid: 0 },
      deep:    { top: 3.0, bot: 2.2, w: 4.4, lid: 0.9 },
      small:   { top: 2.7, bot: 2.0, w: 3.7, lid: 0.3 },
      bright:  { top: 3.8, bot: 2.9, w: 4.6, lid: 0 },
      sad:     { top: 3.2, bot: 2.6, w: 4.2, lid: 0.5 },
      hooded:  { top: 2.6, bot: 2.4, w: 4.6, lid: 1.5 },
      narrow:  { top: 2.2, bot: 2.0, w: 4.8, lid: 1.2 },
      heavy:   { top: 2.8, bot: 2.5, w: 4.4, lid: 1.7 },
      sunken:  { top: 3.0, bot: 2.6, w: 4.3, lid: 1.0, socket: 1 },
      wide:    { top: 3.6, bot: 3.0, w: 4.9, lid: 0 },
      almond:  { top: 3.2, bot: 2.4, w: 5.1, lid: 0.6, tilt: -0.06 },
      sleepy:  { top: 2.6, bot: 2.4, w: 4.4, lid: 1.8 }
    };
    const es = shapes[f.e] || shapes.steady;
    const brow = f.b || [2.2, 0, 0.6];
    const irisC = r.eye;

    // ---- eye sockets (soft)
    for (const sx of [-1, 1]) {
      s.push(`<ellipse cx="${sx * E.x}" cy="${E.y - 1.6}" rx="${es.w + 1.6}" ry="${es.top + 3.6}" fill="${alpha(sk.deep, 0.2)}"/>`);
    }
    // ---- brows
    for (const sx of [-1, 1]) {
      const bw = brow[0], ang = brow[1] * (sx > 0 ? 1 : -1) * 0.6, arch = brow[2];
      const x0 = sx * (E.x - 4.3), x1 = sx * (E.x + 4.1);
      const tipUp = ang * -1;
      s.push(`<path d="M ${x0} ${E.y - 6.6 + tipUp}
        C ${sx * (E.x - 2.4)} ${E.y - 8.6 - arch * 1.3} ${sx * (E.x + 1.2)} ${E.y - 8.9 - arch * 1.1} ${x1} ${E.y - 6.9 - tipUp * 0.4}"
        stroke="${alpha(shade(r.hair.c, 0.06), r.hair.hc ? 0.95 : 0.92)}" stroke-width="${bw}" stroke-linecap="round" fill="none"/>`);
      s.push(`<path d="M ${x0} ${E.y - 5.9 + tipUp} C ${sx * (E.x - 2)} ${E.y - 7.8} ${sx * (E.x + 1.4)} ${E.y - 8.1} ${x1} ${E.y - 6.2}"
        stroke="${alpha(sk.form, 0.35)}" stroke-width="1.1" stroke-linecap="round" fill="none"/>`);
    }
    // ---- upper-lid crease
    if (es.lid > 0.2) {
      for (const sx of [-1, 1]) {
        s.push(`<path d="M ${sx * (E.x - 4.4)} ${E.y - 2.6 + es.lid * 1.4} C ${sx * (E.x - 1.6)} ${E.y - 4.4} ${sx * (E.x + 2.2)} ${E.y - 4.6} ${sx * (E.x + 4.4)} ${E.y - 2.2}"
          stroke="${alpha(sk.deep, 0.5)}" stroke-width="1.15" fill="none" stroke-linecap="round"/>`);
      }
    }
    // ---- eyes
    for (const sx of [-1, 1]) {
      const x = sx * E.x, tilt = (es.tilt || 0) * sx;
      const w = es.w, t = es.top, b = es.bot;
      const lead = sx < 0 ? -1 : 1;
      s.push(`<g transform="translate(${x} ${E.y}) rotate(${tilt * 40})">
        <path d="M ${-w} ${0.2} C ${-w * 0.55} ${-t} ${w * 0.5} ${-t} ${w} ${-0.2 + b * 0.2} C ${w * 0.5} ${b} ${-w * 0.5} ${b} ${-w} ${0.2} Z" fill="#f2ece4"/>
        <ellipse cx="${lead * 0.5}" cy="0.3" rx="${w * 0.72}" ry="${b * 0.86}" fill="#dfd6c9" opacity="0.55"/>
        <circle cx="${lead * 0.4}" cy="0.4" r="${Math.min(2.5, t + 0.4)}" fill="url(#ir${r.u})"/>
        <circle cx="${lead * 0.4}" cy="0.4" r="${Math.min(1.05, t * 0.42)}" fill="#12100f"/>
        <circle cx="${lead * 0.4 - 0.7}" cy="${0.4 - 0.85}" r="0.5" fill="#fff" opacity="0.92"/>
        <circle cx="${lead * 0.4 + 0.8}" cy="${0.4 + 0.7}" r="0.42" fill="#fff" opacity="0.35"/>
        <path d="M ${-w} ${0.1} C ${-w * 0.5} ${-t * 1.02} ${w * 0.5} ${-t * 1.05} ${w} ${-0.3}" stroke="${alpha('#100d0c', 0.9)}" stroke-width="${1.5 + (r.fem ? 0.4 : 0)}" fill="none" stroke-linecap="round"/>
        <path d="M ${-w * 0.95} ${b * 0.72} C ${-w * 0.3} ${b * 1.05} ${w * 0.4} ${b * 1.02} ${w * 0.95} ${b * 0.55}" stroke="${alpha(sk.form, 0.6)}" stroke-width="0.85" fill="none" stroke-linecap="round"/>
        ${f.lashes ? `<path d="M ${w * 0.9} ${-0.2} L ${w * 1.5} ${-1.2} M ${w * 1.1} ${0.4} L ${w * 1.7} ${-0.2} M ${-w * 1.05} ${-0.4} L ${-w * 1.6} ${-1.3}" stroke="${alpha('#160f0d', 0.85)}" stroke-width="1" stroke-linecap="round"/>` : ''}
        ${f.liner ? `<path d="M ${w} ${-0.4} L ${w + 1.5} ${-1.6}" stroke="${alpha('#1b1114', 0.85)}" stroke-width="1.2" stroke-linecap="round"/>` : ''}
      </g>`);
    }

    // ---- nose
    const N = { long: 1.25, straight: 1, snub: 0.72, button: 0.62, wide: 0.92, beak: 1.2, broken: 1.05 }[f.no] || 1;
    const wide = (f.no === 'wide' || f.no === 'broken') ? 1.2 : f.no === 'button' || f.no === 'snub' ? 0.9 : 1;
    const tipY = 5.4 * N;
    s.push(`<path d="M ${-1.9} -6.4 C ${-2.4} -1.6 ${-2.9} ${tipY - 2.2} ${-3.5 * wide} ${tipY - 0.6}
      C ${-3.9 * wide} ${tipY + 0.9} ${-2.2 * wide} ${tipY + 1.7} ${-1.1} ${tipY + 1.2}" fill="none" stroke="${alpha(sk.deep, 0.42)}" stroke-width="1.7" stroke-linecap="round"/>`);
    s.push(`<path d="M ${1.4} -6.2 C ${1.9} -1.4 ${2.6} ${tipY - 2} ${3.6 * wide} ${tipY - 0.4}
      C ${4.3 * wide} ${tipY + 1.4} ${2.1 * wide} ${tipY + 2.4} ${0.5} ${tipY + 1.6}" fill="none" stroke="${alpha(sk.deep, 0.55)}" stroke-width="1.5" stroke-linecap="round"/>`);
    s.push(`<ellipse cx="${0.6}" cy="${tipY - 1.6}" rx="${2.4 * wide}" ry="${2.0 * N}" fill="${alpha(sk.lit, 0.5)}"/>`);
    s.push(`<path d="M ${-3.3 * wide} ${tipY + 1.1} C ${-2.1 * wide} ${tipY + 2.2} ${-0.6} ${tipY + 2.2} ${0.4} ${tipY + 1.5}" fill="none" stroke="${alpha(sk.deep, 0.8)}" stroke-width="1.5" stroke-linecap="round"/>`);
    s.push(`<ellipse cx="${-2.3 * wide}" cy="${tipY + 0.6}" rx="1.25" ry="0.85" fill="${alpha('#1a0f0b', 0.72)}" transform="rotate(-18 ${-2.3 * wide} ${tipY + 0.6})"/>`);
    s.push(`<ellipse cx="${2.3 * wide}" cy="${tipY + 0.6}" rx="1.25" ry="0.85" fill="${alpha('#1a0f0b', 0.72)}" transform="rotate(18 ${2.3 * wide} ${tipY + 0.6})"/>`);
    if (f.no === 'broken') s.push(`<path d="M -0.4 -2.4 C 1.4 -1.6 0.2 -0.4 2 -0.2" fill="none" stroke="${alpha(sk.deep, 0.6)}" stroke-width="1.6" stroke-linecap="round"/>`);

    // ---- mouth
    const mY = tipY + 5.3, lip = r.fem ? mix(sk.base, '#a8454a', 0.42) : mix(sk.base, '#9c4a44', 0.34);
    const M = {
      flat:    { curve: 0.2, open: 0, w: 4.5, up: 0 },
      pressed: { curve: -0.4, open: 0, w: 4.6, up: 0 },
      smirk:   { curve: 1.5, open: 0.2, w: 4.4, up: 1.1 },
      grin:    { curve: 1.9, open: 2.9, w: 5.1, up: 0.4 },
      frown:   { curve: -1.5, open: 0, w: 4.4, up: -0.5 },
      sad:     { curve: -0.9, open: 0, w: 4.3, up: 0 },
      smile:   { curve: 1.3, open: 1.1, w: 4.7, up: 0.9 },
      softsmile: { curve: 0.95, open: 0.4, w: 4.3, up: 0.6 },
      pout:    { curve: 0.3, open: 1.2, w: 3.9, up: 0 }
    };
    const mo = M[f.m] || M.flat;
    const full = f.lips === 'full' ? 1.28 : r.fem ? 1.12 : 0.96;
    s.push(`<path d="M ${-mo.w} ${mY} C ${-mo.w * 0.5} ${mY - 1.5 - mo.up} ${mo.w * 0.5} ${mY - 1.5 + mo.up} ${mo.w} ${mY + mo.curve * 0.2}" fill="none" stroke="${alpha(sk.deep, 0.85)}" stroke-width="1.5" stroke-linecap="round"/>`);
    if (mo.open > 0.6) {
      s.push(`<path d="M ${-mo.w * 0.92} ${mY + 0.2} C ${-mo.w * 0.4} ${mY - 0.6} ${mo.w * 0.4} ${mY - 0.6 + mo.up} ${mo.w * 0.92} ${mY + mo.curve * 0.2}
        C ${mo.w * 0.4} ${mY + mo.open} ${-mo.w * 0.4} ${mY + mo.open} ${-mo.w * 0.92} ${mY + 0.2} Z" fill="#2b1416"/>`);
      s.push(`<path d="M ${-mo.w * 0.8} ${mY + 0.3} C ${-mo.w * 0.3} ${mY - 0.3} ${mo.w * 0.3} ${mY - 0.3} ${mo.w * 0.8} ${mY + 0.3} Z" fill="#eae2d4"/>`);
      s.push(`<path d="M ${-mo.w * 0.7} ${mY + mo.open * 0.65} C 0 ${mY + mo.open * 0.95} 0 ${mY + mo.open * 0.95} ${mo.w * 0.7} ${mY + mo.open * 0.62}" fill="none" stroke="${alpha('#8f3a3a', 0.7)}" stroke-width="2.2" stroke-linecap="round"/>`);
    }
    s.push(`<path d="M ${-mo.w * 0.78} ${mY - 1.1} C ${-mo.w * 0.4} ${mY - 2.5 * full - mo.up} ${mo.w * 0.4} ${mY - 2.5 * full + mo.up} ${mo.w * 0.78} ${mY - 1.1}" fill="none" stroke="${alpha(lip, 0.9)}" stroke-width="${2.3 * full}" stroke-linecap="round"/>`);
    s.push(`<path d="M ${-mo.w * 0.7} ${mY + 1.3} C ${-mo.w * 0.3} ${mY + 3.0 * full} ${mo.w * 0.3} ${mY + 3.0 * full} ${mo.w * 0.7} ${mY + 1.3}" fill="none" stroke="${alpha(lip, 0.85)}" stroke-width="${2.1 * full}" stroke-linecap="round"/>`);
    s.push(`<path d="M 0 ${mY - 2.9} L 0 ${mY - 1.4}" stroke="${alpha(sk.deep, 0.35)}" stroke-width="0.9"/>`);
    if (f.dimple) s.push(`<path d="M ${mo.w * 1.15} ${mY - 1.4} q 0.7 1.3 0 2.4 M ${-mo.w * 1.15} ${mY - 1.4} q -0.7 1.3 0 2.4" stroke="${alpha(sk.deep, 0.45)}" stroke-width="1" fill="none"/>`);

    // ---- wear and character
    if (f.w >= 2) {
      s.push(`<path d="M ${-E.x - 5} ${E.y - 2.6} l -2.6 -0.9 M ${-E.x - 5} ${E.y} l -2.7 -0.1 M ${-E.x - 4.7} ${E.y + 2.4} l -2.3 0.7" stroke="${alpha(sk.deep, 0.4)}" stroke-width="0.85" fill="none"/>`);
      s.push(`<path d="M ${E.x + 5} ${E.y - 2.6} l 2.6 -0.9 M ${E.x + 5} ${E.y} l 2.7 -0.1 M ${E.x + 4.7} ${E.y + 2.4} l 2.3 0.7" stroke="${alpha(sk.deep, 0.4)}" stroke-width="0.85" fill="none"/>`);
    }
    if (f.w >= 3) s.push(`<path d="M ${-4.5} ${-10.4} q 4.5 -2 9 0 M ${-4} ${-9.1} q 4 -1.6 8 0" stroke="${alpha(sk.deep, 0.42)}" stroke-width="0.9" fill="none"/>`);
    if (f.w >= 4) s.push(`<path d="M ${-6} ${mY + 5.2} q 6 1.8 12 0 M ${-6.4} ${mY + 6.8} q 6.4 1.6 12.8 0" stroke="${alpha(sk.deep, 0.34)}" stroke-width="0.9" fill="none"/>`);
    if (f.scar) s.push(`<path d="M ${E.x + 3.4} ${E.y - 7.6} L ${E.x + 5.2} ${E.y + 3.2}" stroke="${alpha('#a8584f', 0.75)}" stroke-width="1.35" stroke-linecap="round"/>`);
    if (f.scar === 2) s.push(`<path d="M -5.5 ${18.5} L 4.5 15.5" stroke="${alpha('#a8584f', 0.7)}" stroke-width="1.3" stroke-linecap="round"/>`);
    if (f.pocks) for (let i = 0; i < 7; i++) {
      const px = [-9, -5, 7.5, 10, -11, 3, 9.5][i], py = [4, 9.5, 3.5, 8, -1, 12, -2][i];
      s.push(`<circle cx="${px}" cy="${py}" r="0.85" fill="${alpha(sk.deep, 0.5)}"/>`);
    }
    if (f.weather) s.push(`<path d="M -13.6 6 C -12 12 -8.4 17.6 -3.4 20.4 M 13.6 6 C 12 12 8.4 17.6 3.4 20.4" fill="none" stroke="${alpha(sk.form, 0.32)}" stroke-width="1.2"/>`);
    if (f.mole) s.push(`<circle cx="10.6" cy="${mY - 3.6}" r="1.15" fill="${alpha('#4a2a20', 0.85)}"/>`);
    if (f.rouge) {
      for (const sx of [-1, 1]) s.push(`<ellipse cx="${sx * 10.6}" cy="${mY - 6.4}" rx="5.4" ry="3.4" fill="${alpha('#b8454a', 0.16)}"/>`);
    }
    if (f.freckles) {
      const spots = [[-10, 5.5], [-7.6, 8.2], [-11.6, 8.6], [10, 5.5], [7.6, 8.2], [11.6, 8.6], [-4.4, 2.4], [4.4, 2.4]];
      for (const [px, py] of spots) s.push(`<circle cx="${px}" cy="${py}" r="0.72" fill="${alpha('#8a4a2e', f.freckles === 2 ? 0.6 : 0.42)}"/>`);
    }
    // ---- cheek / jaw modelling
    s.push(`<path d="M -13.2 1.6 C -11 9 -7 17 -1.6 21.4" fill="none" stroke="${alpha(sk.form, 0.3)}" stroke-width="2.4"/>`);
    s.push(`<path d="M 13.2 1.6 C 11 9 7 17 1.6 21.4" fill="none" stroke="${alpha(sk.form, 0.25)}" stroke-width="2.4"/>`);
    if (f.c === 'hollow') {
      for (const sx of [-1, 1]) s.push(`<ellipse cx="${sx * 11}" cy="7.2" rx="3.6" ry="6" fill="${alpha(sk.deep, 0.27)}"/>`);
    }
    if (f.c === 'sculpt') {
      for (const sx of [-1, 1]) s.push(`<path d="M ${sx * 6.4} 4.6 C ${sx * 11} 5.6 ${sx * 13.4} 8.2 ${sx * 12.6} 12.4" stroke="${alpha(sk.deep, 0.34)}" stroke-width="1.6" fill="none"/>`);
      for (const sx of [-1, 1]) s.push(`<ellipse cx="${sx * 11.6}" cy="2.6" rx="3.2" ry="1.7" fill="${alpha(sk.lit, 0.3)}" transform="rotate(${sx * -14} ${sx * 11.6} 2.6)"/>`);
    }
    if (f.c === 'padded') {
      for (const sx of [-1, 1]) s.push(`<ellipse cx="${sx * 12}" cy="8.6" rx="5" ry="5.6" fill="${alpha(sk.lit, 0.16)}"/>`);
    }
    return s.join('');
  }

  function earsSvg(r) {
    const sk = r.sk;
    let s = '';
    for (const sx of [-1, 1]) {
      s += `<g transform="translate(${sx * 17.2} 0.6) scale(${sx} 1)">
        <path d="M 0 -4.6 C 2.8 -5.4 4.4 -3.4 4.2 -0.2 C 4 3 3.1 5.6 1 6.6 C -0.9 7.5 -1.6 5.4 -1.1 3.6" fill="${sk.base}" stroke="${alpha(sk.deep, 0.35)}" stroke-width="0.7"/>
        <path d="M 0.7 -3.4 C 2.3 -3.6 2.9 -1.6 2.4 0.6 C 2 2.6 1.2 4.3 0.1 4.7" fill="none" stroke="${alpha(sk.form, 0.6)}" stroke-width="0.85"/>
        <path d="M 1.9 -0.2 C 2.6 0.6 2.2 2.2 1.1 2.8" fill="none" stroke="${alpha(sk.form, 0.45)}" stroke-width="0.7"/>
      </g>`;
    }
    return s;
  }

  ROOT.AVQ = { SKINS, SKIN_NAMES, EYES, EYE_NAMES, FACE_FEAT, FACIALS, HAIRS, SHIRTS, ACCENTS, ACCENT_COLORS, BODIES,
    parts, joinParts, resolve, defsFor, outline, featuresSvg, earsSvg, shade, mix, alpha, luma, hex, rgbStr, isFem, hash, S };
})();

// ==================================================================================
// PART TWO — hair, facial hair, garments, the body and the render surfaces.
// Reads the catalogues + geometry published by PART ONE on the global AVQ.
// ==================================================================================
(function () {
  'use strict';
  const G = (typeof window !== 'undefined') ? window : globalThis;
  const Q = G.AVQ;
  if (!Q) throw new Error('AVQ (character engine part one) failed to load');
  const { SKINS, SKIN_NAMES, EYES, EYE_NAMES, FACE_FEAT, FACIALS, HAIRS, SHIRTS, ACCENTS, ACCENT_COLORS, BODIES,
    parts, joinParts, resolve, defsFor, outline, featuresSvg, earsSvg, shade, mix, alpha, isFem, hash } = Q;
  const ROOT = G;

  const NOSE_N = { long: 1.25, straight: 1, snub: 0.72, button: 0.62, wide: 0.92, beak: 1.2, broken: 1.05 };
  const mouthY = (feat) => 5.4 * (NOSE_N[feat.no] || 1) + 5.3;   // kept in step with featuresSvg()
  const EYE_Y = -2.0, EYE_X = 7.6;

  // ------------------------------------------------------------------ HAIR
  function strand(c, w, o) { return `stroke="${alpha(c, o == null ? 0.5 : o)}" stroke-width="${w}" fill="none" stroke-linecap="round"`; }
  function lum(c) {
    const t = String(c).replace('#', '');
    const v = t.length === 3 ? t.split('').map(x => x + x).join('') : t;
    const n = parseInt(v.slice(0, 6), 16) || 0;
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  function hairParts(r) {
    const h = r.hair;
    const cols = { c: h.c, lit: shade(h.c, 0.3), dark: shade(h.c, -0.34), g: h.g };
    const back = [], front = [];
    const greys = h.g ? `<path d="M -6 -27.4 C -8 -24 -9.4 -20 -10 -17.4" ${strand(h.g, 2.4, 0.55)}/>` : '';
    const S = r.feat.j === 'wide' ? 1.05 : r.feat.j === 'narrow' ? 0.94 : r.feat.j === 'heart' ? 0.97 : 1;
    const HX = 17.6 * S;            // hair sits just outside the skull
    const HY = -12.2;               // where the sides come down past the temples
    const cap = (thick, hairline, spread) => {
      const T = spread == null ? 0 : spread, t = thick;
      // most hairlines sit too high on the skull — drop them so hair reads as hair
      hairline = hairline + (hairline < -15 ? 3.4 : 0);
      return `M ${-HX - T} ${HY}
        C ${-HX - 1.4 - T} ${HY - 10.6 - t * 1.4} ${-10.2 - T * 0.4} ${-29.4 - t * 1.9} 0 ${-29.8 - t * 2}
        C ${10.2 + T * 0.4} ${-29.4 - t * 1.9} ${HX + 1.4 + T} ${HY - 10.6 - t * 1.4} ${HX + T} ${HY}
        C ${HX - 0.4 + T * 0.5} ${HY - 3.2} ${HX - 2.2} ${HY - 5.6 - t} ${HX - 4.4} ${hairline - t * 0.6}
        C ${11.2} ${hairline - 2.8} ${4.2} ${hairline - 3.6} 0 ${hairline - 3.5}
        C -4.2 ${hairline - 3.6} -11.2 ${hairline - 2.8} ${-HX + 4.4} ${hairline - t * 0.6}
        C ${-HX + 2.2} ${HY - 5.6 - t} ${-HX + 0.4 - T * 0.5} ${HY - 3.2} ${-HX - T} ${HY} Z`;
    };
    const sideMass = (L, wobble) => {
      let p = `M -17.6 -13 C -20.4 -6 -21.4 4 -20.4 ${12 + L * 0.4} C -19.6 ${18 + L * 0.6} -18.4 ${22 + L} -15.4 ${23.6 + L}`;
      for (let i = 0; i < 3; i++) p += ` q ${2 + wobble} -1.6 3.6 0`;
      p += ` C -12 ${25.4 + L} -11.6 ${20 + L} -12 ${16 + L * 0.6} C -12.6 6 -13.4 -4 -14.6 -12.4 Z`;
      return p;
    };

    switch (h.k) {
      case 'bald':
        front.push(`<path d="${cap(0.1, -13.6)}" fill="url(#hr${r.u})" opacity="0.26"/>`);
        break;
      case 'buzz':
        front.push(`<path d="${cap(0.35, -21)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -16.4 -11.8 C -16.6 -18 -10 -22.4 0 -22.6 C 10 -22.4 16.6 -18 16.4 -11.8" ${strand(cols.dark, 1.1, 0.5)}/>`);
        break;
      case 'crew':
        front.push(`<path d="${cap(0.7, -21.6)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -13.8 -19.4 C -8 -22.6 8 -22.6 13.8 -19.4" ${strand(cols.lit, 1.3, 0.35)}/>`);
        if (greys) front.push(greys);
        break;
      case 'part':
        front.push(`<path d="${cap(1, -22.6)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -7.6 -29.6 C -6.4 -25 -6.2 -21.4 -6.6 -18.6" ${strand(cols.dark, 1.8, 0.8)}/>`);
        front.push(`<path d="M -7.4 -26.6 C -2 -24.6 6 -24.2 14 -21.4" ${strand(cols.lit, 1.4, 0.4)}/>`);
        if (greys) front.push(greys);
        break;
      case 'slick':
        front.push(`<path d="${cap(1.5, -23)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -17 -14 C -16 -22 2 -30 14 -22.6 C 9 -24.4 -3 -22 -8.6 -15.4" ${strand(cols.lit, 1.6, 0.42)}/>`);
        if (greys) front.push(greys);
        break;
      case 'pompadour':
        front.push(`<path d="${cap(2, -23.4)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -12.6 -26.4 C -8 -38.4 8 -38.6 14.4 -27.6 C 10 -33.4 -4 -33.6 -12.6 -26.4 Z" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -10.4 -30.6 C -4 -34.6 8 -34 13 -29.4" ${strand(cols.lit, 1.5, 0.45)}/>`);
        break;
      case 'recede':
        front.push(`<path d="M -17.4 -11.6 C -18.6 -21 -11 -26.6 -3.4 -27.4 C 10 -27.6 18.4 -21.4 17.4 -11.6
          C 17 -15 15.4 -17.6 13 -19 C 9 -16.4 4.4 -16.2 0 -18.4 C -4.4 -16.2 -9 -16.4 -13 -19 C -15.4 -17.6 -17 -15 -17.4 -11.6 Z" fill="url(#hr${r.u})"/>`);
        break;
      case 'combover':
        front.push(`<path d="${cap(0.4, -20)}" fill="url(#hr${r.u})" opacity="0.9"/>`);
        for (let i = 0; i < 5; i++) front.push(`<path d="M ${-13 + i * 1.2} ${-23 + i * 0.5} C ${-4 + i * 2} ${-25 + i} ${6 + i} ${-24 + i * 1.2} ${14 - i * 0.6} ${-19 + i * 0.8}" ${strand(cols.c, 1.5, 0.75)}/>`);
        front.push(`<path d="M 6 -27.4 C 12 -24 15 -19 16 -13.4" ${strand(cols.lit, 1.6, 0.4)}/>`);
        break;
      case 'thin':
        front.push(`<path d="${cap(0.2, -20.4)}" fill="url(#hr${r.u})" opacity="0.5"/>`);
        front.push(`<ellipse cx="0" cy="-24.4" rx="9.4" ry="4.4" fill="${alpha(r.sk.lit, 0.42)}"/>`);
        for (let i = 0; i < 7; i++) front.push(`<path d="M ${-11 + i * 3.4} ${-26.6 + Math.abs(i - 3) * 0.5} C ${-9 + i * 3} -22.4 ${-8 + i * 3} -19 ${-7 + i * 3} -16.4" ${strand(cols.c, 1, 0.55)}/>`);
        break;
      case 'horse':
        front.push(`<path d="M -17.4 -11.6 C -18.8 -20 -13 -25.4 -8.6 -24 C -6 -19 -1.4 -17 0 -17 C 1.4 -17 6 -19 8.6 -24
          C 13 -25.4 18.8 -20 17.4 -11.6 C 15.8 -15 12 -16.4 8 -15.6 C 4 -17.4 -4 -17.4 -8 -15.6 C -12 -16.4 -15.8 -15 -17.4 -11.6 Z" fill="url(#hr${r.u})"/>`);
        break;
      case 'long':
        back.push(`<path d="${sideMass(1, 1)}" fill="url(#hr${r.u})"/>`);
        back.push(`<g transform="scale(-1 1)"><path d="${sideMass(1, 1)}" fill="url(#hr${r.u})"/></g>`);
        back.push(`<path d="M -18 -8 C -15 14 -12 26 -8 34 L 8 34 C 12 26 15 14 18 -8 C 14 6 -14 6 -18 -8 Z" fill="${shade(h.c, -0.4)}"/>`);
        front.push(`<path d="${cap(1.2, -22.4)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -17 -12 C -18.6 -4 -18 6 -16 16" ${strand(cols.c, 3.2, 0.85)}/>`);
        front.push(`<path d="M 17 -12 C 18.6 -4 18 6 16 16" ${strand(cols.c, 3.2, 0.85)}/>`);
        if (greys) front.push(greys);
        break;
      case 'wavy':
        back.push(`<path d="M -19 -6 C -20 4 -18 12 -15 20 L 15 20 C 18 12 20 4 19 -6 Z" fill="${shade(h.c, -0.4)}"/>`);
        front.push(`<path d="${cap(1.6, -22.8, 1.6)}" fill="url(#hr${r.u})"/>`);
        for (let i = 0; i < 4; i++) front.push(`<path d="M ${-15 + i * 6} ${-30 + (i % 2) * 1.4} q 3 -2.6 6 0 q 3 2.4 6 0" ${strand(cols.lit, 1.6, 0.4)}/>`);
        front.push(`<path d="M -19 -12 C -20.4 -2 -19 8 -16.6 16" ${strand(cols.c, 3, 0.9)}/>`);
        front.push(`<path d="M 19 -12 C 20.4 -2 19 8 16.6 16" ${strand(cols.c, 3, 0.9)}/>`);
        break;
      case 'bun':
        back.push(`<circle cx="-2" cy="-30.5" r="7.4" fill="${shade(h.c, -0.26)}"/>`);
        back.push(`<circle cx="-2" cy="-30.5" r="7.4" ${strand(cols.lit, 1.2, 0.35)}/>`);
        front.push(`<path d="${cap(0.6, -22)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -14 -22 C -6 -25 8 -25 14 -21" ${strand(cols.dark, 1.4, 0.6)}/>`);
        break;
      case 'knot':
        back.push(`<path d="M -3 -34.4 q 3 -6 6.4 -1.4 q 3 4.4 -1.6 5.6 q -5 1.2 -4.8 -4.2 Z" fill="${shade(h.c, -0.2)}"/>`);
        front.push(`<path d="${cap(0.7, -22.2)}" fill="url(#hr${r.u})"/>`);
        break;
      case 'afro': case 'afrobig': {
        const R = h.k === 'afro' ? 20.6 : 24.6, cy = h.k === 'afro' ? -9 : -7;
        back.push(`<circle cx="0" cy="${cy + 1}" r="${R}" fill="${shade(h.c, -0.3)}"/>`);
        front.push(`<path d="${cap(1.2, -22)}" fill="url(#hr${r.u})"/>`);
        front.push(`<circle cx="0" cy="${cy}" r="${R - 1.4}" fill="url(#hr${r.u})"/>`);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          front.push(`<circle cx="${(Math.cos(a) * (R - 3)).toFixed(1)}" cy="${(Math.sin(a) * (R - 3) + cy).toFixed(1)}" r="3.4" fill="${alpha(shade(h.c, i % 2 ? 0.16 : -0.24), 0.9)}"/>`);
        }
        front.push(`<path d="M -12 -20 C -6 -24 6 -24 12 -20" ${strand(cols.dark, 1.4, 0.5)}/>`);
        break;
      }
      case 'curls':
        front.push(`<path d="${cap(0.9, -21)}" fill="url(#hr${r.u})"/>`);
        for (let i = 0; i < 22; i++) {
          const a = Math.PI + (i / 21) * Math.PI, rr = 16 + (i % 3) * 1.2;
          front.push(`<circle cx="${(Math.cos(a) * rr).toFixed(1)}" cy="${(Math.sin(a) * (rr - 4) - 9).toFixed(1)}" r="3.1" fill="${alpha(shade(h.c, i % 2 ? 0.2 : -0.2), 0.85)}"/>`);
        }
        break;
      case 'locs': {
        const len = h.len || 1;
        back.push(`<path d="M -19 -8 C -21 6 -20 22 -17 30 L 17 30 C 20 22 21 6 19 -8 Z" fill="${shade(h.c, -0.42)}"/>`);
        for (let i = 0; i < 9; i++) {
          const x = -17 + i * 4.25;
          back.push(`<path d="M ${x} -24 C ${x + (i % 2 ? 1.6 : -1.6)} ${-6 + len * 2} ${x + (i % 2 ? 2.4 : -2.4)} ${10 * len} ${x + (i % 2 ? 2 : -2)} ${20 * len}" ${strand(i % 2 ? cols.lit : cols.c, 2.2, 0.85)}/>`);
        }
        front.push(`<path d="${cap(0.8, -21.6)}" fill="url(#hr${r.u})"/>`);
        break;
      }
      case 'flatcap': case 'newsboy': case 'peaked': {
        const squat = h.k === 'newsboy' ? 1 : 0.6, peak = h.k === 'peaked' ? 1 : 0;
        const crown = `M -18 -16.6 C -20 -22 -14 -27.4 -2 -28.4 C 10 -29.2 19 -25.6 19.4 -19.6 C 19.6 -16.4 18 -14.6 16 -14
          C 12 -12.8 6 -12.2 0 ${-12 + squat} C -6 -12.4 -12 -13 -15 -14.4 C -16.6 -15.2 -17.4 -15.8 -18 -16.6 Z`;
        front.push(`<path d="${cap(0.2, -19)}" fill="${shade(h.hc, -0.1)}"/>`);
        front.push(`<path d="${crown}" fill="${h.c}"/>`);
        front.push(`<path d="${crown}" fill="${alpha('#000', 0.16)}"/>`);
        front.push(`<path d="${crown}" fill="none" stroke="${alpha(shade(h.c, 0.2), 0.5)}" stroke-width="1"/>`);
        front.push(`<path d="M -19.5 -17.4 C -24 -16.4 -27.4 -14.6 -28 -12.6 C -28.4 -11 -26.6 -10.4 -24 -11 C -20 -12 -17 -13.6 -15.4 -15.6 Z" fill="${shade(h.c, -0.28)}"/>`);
        front.push(`<path d="M -14 -27.4 C -4 -30.4 10 -30 18 -24.6" ${strand(shade(h.c, 0.26), 1.8, 0.35)}/>`);
        if (peak) front.push(`<path d="M -20 -17 C -26 -16.4 -30 -14.8 -30.4 -13 C -30.6 -11.8 -28.8 -11.2 -26 -11.6 C -21.6 -12.2 -18.4 -14 -16.4 -16.2 Z" fill="${shade(h.c, -0.42)}"/>`);
        if (h.k === 'newsboy') front.push(`<circle cx="-1" cy="-30" r="1.9" fill="${shade(h.c, -0.3)}"/>`);
        break;
      }
      case 'bowler': case 'trilby': case 'fedora': case 'panama': {
        const dome = { bowler: 1, trilby: 0.86, fedora: 0.95, panama: 0.8 }[h.k] || 0.9;
        const pinch = h.k === 'trilby' || h.k === 'fedora';
        const topY = -27.8 - 4.4 * dome, sideY = -22 - 5 * dome, midY = -27.6 - 4.4 * dome;
        front.push(`<path d="${cap(0.2, -19.5)}" fill="${shade(h.hc, -0.1)}"/>`);
        front.push(`<ellipse cx="0" cy="-15.4" rx="21.6" ry="4.6" fill="${shade(h.c, -0.36)}"/>`);
        front.push(`<path d="M -14.6 -15.4 C -15.6 ${sideY} -9.6 ${midY} 0 ${topY} C 9.6 ${midY} 15.6 ${sideY} 14.6 -15.4 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -14.6 -15.4 C -15.6 ${sideY} -9.6 ${midY} 0 ${topY}" ${strand(shade(h.c, 0.24), 1.6, 0.4)}/>`);
        front.push(`<path d="M -14.8 -18.4 C -6 -19.6 6 -19.6 14.8 -18.4 L 14.8 -14.6 C 6 -15.8 -6 -15.8 -14.8 -14.6 Z" fill="${shade(h.c, -0.5)}"/>`);
        if (pinch) front.push(`<path d="M -3.4 ${topY} C -2.4 -24 -1.6 -21 0 ${-19.4 - 1.4 * dome} C 1.6 -21 2.4 -24 3.4 ${topY}" fill="${alpha('#000', 0.38)}"/>`);
        if (h.k === 'panama') front.push(`<path d="M -14 -19.4 C -6 -20.6 6 -20.6 14 -19.4" ${strand('#8a6a3a', 2.4, 0.8)}/>`);
        if (h.k === 'fedora' || h.k === 'trilby') front.push(`<path d="M -14.6 -18.6 C -6 -19.8 6 -19.8 14.6 -18.6" ${strand(shade(h.c, 0.2), 1.6, 0.4)}/>`);
        break;
      }
      case 'boater': {
        front.push(`<path d="${cap(0.2, -19.5)}" fill="${shade(h.hc, -0.1)}"/>`);
        front.push(`<ellipse cx="0" cy="-14.4" rx="23" ry="5" fill="${shade(h.c, -0.24)}"/>`);
        front.push(`<path d="M -13.6 -14.4 L -13.6 -21.4 C -13.6 -24.4 -7 -26.4 0 -26.4 C 7 -26.4 13.6 -24.4 13.6 -21.4 L 13.6 -14.4 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -13.6 -18.6 L 13.6 -18.6 L 13.6 -16 L -13.6 -16 Z" fill="#8a2f34"/>`);
        front.push(`<path d="M -13.6 -21.6 C -7 -23.4 7 -23.4 13.6 -21.6" ${strand(shade(h.c, 0.2), 1.4, 0.35)}/>`);
        break;
      }
      case 'beanie': {
        front.push(`<path d="M -17.8 -10.4 C -19.4 -22 -10 -30.4 0 -30.6 C 10 -30.4 19.4 -22 17.8 -10.4 C 12 -13.4 -12 -13.4 -17.8 -10.4 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -17.8 -12.6 C -12 -15.4 12 -15.4 17.8 -12.6 C 17.4 -8.6 12 -6.4 0 -6.4 C -12 -6.4 -17.4 -8.6 -17.8 -12.6 Z" fill="${shade(h.c, -0.3)}"/>`);
        for (let i = -4; i <= 4; i++) front.push(`<path d="M ${i * 3.9} -15 C ${i * 3.7} -19 ${i * 3.7} -22 ${i * 3.6} -25" ${strand(shade(h.c, i % 2 ? 0.22 : -0.2), 1.6, 0.5)}/>`);
        front.push(`<circle cx="0" cy="-31" r="3" fill="${shade(h.c, 0.16)}"/>`);
        break;
      }
      case 'hood': {
        back.push(`<path d="M -22 -8 C -25 -24 -12 -36 0 -36.4 C 12 -36 25 -24 22 -8 C 21 6 16 16 12 20 L -12 20 C -16 16 -21 6 -22 -8 Z" fill="${h.c}"/>`);
        front.push(`<path d="${cap(0.4, -21)}" fill="${h.hc}"/>`);
        front.push(`<path d="M -20 -11 C -22.4 -3 -21.6 6 -18.6 13 C -15.4 8 -14.4 0 -14.8 -8 Z" fill="${shade(h.c, -0.16)}"/>`);
        front.push(`<path d="M 20 -11 C 22.4 -3 21.6 6 18.6 13 C 15.4 8 14.4 0 14.8 -8 Z" fill="${shade(h.c, -0.16)}"/>`);
        front.push(`<path d="M -19 -13 C -22 -24 -11 -33.4 0 -33.6 C 11 -33.4 22 -24 19 -13 C 14 -17.6 -14 -17.6 -19 -13 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -18.6 -13.4 C -13 -17.6 13 -17.6 18.6 -13.4 C 17 -19.6 11 -23.6 0 -23.8 C -11 -23.6 -17 -19.6 -18.6 -13.4 Z" fill="${alpha('#000', 0.42)}"/>`);
        break;
      }
      case 'snapback': {
        front.push(`<path d="${cap(0.2, -20)}" fill="${shade(h.hc, -0.1)}"/>`);
        front.push(`<path d="M -15 -14.4 C -16 -24 -8.6 -29.4 0 -29.6 C 8.6 -29.4 16 -24 15 -14.4 C 10 -16.6 -10 -16.6 -15 -14.4 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -15 -15.6 C -10 -17.8 10 -17.8 15 -15.6 C 15 -12.6 10 -11 0 -11 C -10 -11 -15 -12.6 -15 -15.6 Z" fill="${shade(h.c, -0.34)}"/>`);
        front.push(`<path d="M 13.4 -17.6 C 22 -18.6 26 -16.6 25.6 -13.6 C 25.4 -11.6 20 -11 13 -12.6 Z" fill="${shade(h.c, -0.46)}"/>`);
        front.push(`<circle cx="0" cy="-29.6" r="1.7" fill="${shade(h.c, 0.24)}"/>`);
        break;
      }
      case 'bandana': {
        front.push(`<path d="${cap(0.25, -20.4)}" fill="${h.hc}"/>`);
        front.push(`<path d="M -18 -17.6 C -10 -20.4 10 -20.4 18 -17.6 C 17.4 -14.6 10 -13 0 -13 C -10 -13 -17.4 -14.6 -18 -17.6 Z" fill="${h.c}"/>`);
        front.push(`<path d="M 14 -16 C 20 -14 22 -10 20 -7 q -3 3 -6 -1 Z" fill="${h.c}"/>`);
        front.push(`<path d="M 12 -22 C 4 -25 -6 -25 -13 -22" ${strand('#ffffff', 1.4, 0.28)}/>`);
        break;
      }
      case 'scarf': {
        back.push(`<path d="M -21 -6 C -23 6 -20 18 -16 26 L 16 26 C 20 18 23 6 21 -6 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -18.6 -10 C -20.6 -18 -12 -26.6 0 -26.8 C 12 -26.6 20.6 -18 18.6 -10 C 12 -13.6 -12 -13.6 -18.6 -10 Z" fill="${h.c}"/>`);
        front.push(`<path d="M -18.6 -10 C -12 -13.6 12 -13.6 18.6 -10 C 18 6 14 18 10 24 L -10 24 C -14 18 -18 6 -18.6 -10 Z" fill="${shade(h.c, -0.22)}"/>`);
        front.push(`<path d="M -12 -12 C -6 -15.6 6 -15.6 12 -12" ${strand(shade(h.c, 0.24), 1.8, 0.45)}/>`);
        break;
      }
      case 'waves': case 'bob': case 'bobfringe': case 'curlbob': {
        const len = h.k === 'bob' ? 0.9 : h.k === 'curlbob' ? 1.05 : 1.3;
        back.push(`<path d="M -20 -8 C -22 ${6 * len} -21 ${16 * len} -18 ${22 * len} L 18 ${22 * len} C 21 ${16 * len} 22 ${6 * len} 20 -8 Z" fill="${shade(h.c, -0.4)}"/>`);
        front.push(`<path d="${cap(1.2, -22)}" fill="url(#hr${r.u})"/>`);
        if (h.k === 'curlbob' || h.k === 'waves') {
          for (let i = 0; i < 13; i++) {
            const a = Math.PI * 0.98 + (i / 12) * Math.PI * 1.04, rr = 19 + (i % 2) * 1.4;
            front.push(`<circle cx="${(Math.cos(a) * rr).toFixed(1)}" cy="${(Math.sin(a) * rr * 0.9 - 6).toFixed(1)}" r="${h.k === 'curlbob' ? 3.5 : 3}" fill="${alpha(shade(h.c, i % 2 ? 0.16 : -0.2), 0.92)}"/>`);
          }
        }
        front.push(`<path d="M -20 -10 C -21.4 2 -19.6 ${14 * len} -16.6 ${20 * len}" ${strand(h.c, 4.4, 0.95)}/>`);
        front.push(`<path d="M 20 -10 C 21.4 2 19.6 ${14 * len} 16.6 ${20 * len}" ${strand(h.c, 4.4, 0.95)}/>`);
        front.push(`<path d="M -18 -14 C -16 -20 -8 -23.4 0 -23.6 C 8 -23.4 16 -20 18 -14 C 14 -18 -14 -18 -18 -14 Z" fill="${h.k === 'bobfringe' ? shade(h.c, 0.1) : h.c}"/>`);
        if (h.k === 'bobfringe') front.push(`<path d="M -15.6 -17.6 C -8 -22.4 8 -22.4 15.6 -17.6 C 10 -20.4 -10 -20.4 -15.6 -17.6 Z" fill="${alpha('#000', 0.32)}"/>`);
        break;
      }
      case 'pixie':
        front.push(`<path d="${cap(1, -22.8)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -16.4 -22.4 C -12 -28.6 -2 -30.4 4 -28 C 10 -25.8 16 -21 17.2 -14.6 C 14 -20 6 -22.6 -1 -21.6 C -8 -20.6 -13.6 -18.4 -16.4 -22.4 Z" fill="url(#hr${r.u})"/>`);
        for (let i = 0; i < 5; i++) front.push(`<path d="M ${-14 + i * 4.2} -26.4 C ${-12 + i * 4} -22 ${-11 + i * 4} -18 ${-10 + i * 4} -14.4" ${strand(cols.lit, 1.3, 0.4)}/>`);
        front.push(`<path d="M 16.6 -12 C 18 -6 17.6 -1 15.6 2.6" ${strand(h.c, 2.6, 0.9)}/>`);
        front.push(`<path d="M -16.6 -12 C -18 -6 -17.6 -1 -15.6 2.6" ${strand(h.c, 2.6, 0.9)}/>`);
        break;
      case 'chignon': case 'updo': case 'rolls': case 'fingerwave': {
        const bunY = h.k === 'chignon' ? -18 : -30, rx = h.k === 'updo' ? 9.4 : 7.6;
        back.push(`<ellipse cx="-1" cy="${bunY}" rx="${rx}" ry="${h.k === 'updo' ? 6 : 5.4}" fill="${shade(h.c, -0.28)}"/>`);
        back.push(`<ellipse cx="-1" cy="${bunY - 1}" rx="${rx - 1}" ry="3.4" fill="${alpha(shade(h.c, 0.2), 0.4)}"/>`);
        front.push(`<path d="${cap(0.9, -22.4)}" fill="url(#hr${r.u})"/>`);
        if (h.k === 'rolls') {
          for (const sx of [-1, 1]) {
            front.push(`<ellipse cx="${sx * 12.4}" cy="-24.4" rx="6.6" ry="4.4" fill="${h.c}" transform="rotate(${sx * -14} ${sx * 12.4} -24.4)"/>`);
            front.push(`<path d="M ${sx * 8} -26.4 C ${sx * 12} -29 ${sx * 17} -28.4 ${sx * 18} -24.6" ${strand(shade(h.c, 0.22), 1.3, 0.5)}/>`);
          }
        }
        if (h.k === 'fingerwave') for (let i = 0; i < 3; i++) front.push(`<path d="M ${-15 + i * 3} ${-26 + i} q 4 -3 7.6 -0.4 q 4 2.6 7.6 -0.6" ${strand(shade(h.c, 0.2), 1.5, 0.45)}/>`);
        front.push(`<path d="M -17 -13 C -18.6 -6 -18 2 -15.6 8" ${strand(h.c, 3, 0.85)}/>`);
        front.push(`<path d="M 17 -13 C 18.6 -6 18 2 15.6 8" ${strand(h.c, 3, 0.85)}/>`);
        break;
      }
      case 'ponytail':
        back.push(`<path d="M -6 -26 C 2 -34 12 -32 16 -24 C 20 -16 22 6 20 24 C 18 30 12 32 8 28 C 12 14 12 -2 8 -14 C 4 -22 -2 -24 -6 -26 Z" fill="${h.c}"/>`);
        front.push(`<path d="${cap(1.1, -22.6)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M -15 -22 C -6 -26 8 -26 15 -21.4" ${strand(cols.dark, 1.5, 0.65)}/>`);
        front.push(`<path d="M 16 -22 C 12 -18 6 -16 -1 -15.4" ${strand(cols.lit, 1.4, 0.4)}/>`);
        break;
      case 'braid': {
        front.push(`<path d="${cap(1.1, -22.4)}" fill="url(#hr${r.u})"/>`);
        front.push(`<path d="M 13 -22 C 18 -14 19 0 16 14 C 14 22 12 26 10 30" ${strand(h.c, 6, 0.95)}/>`);
        for (let i = 0; i < 7; i++) {
          const y = -8 + i * 5.4, x = 15.6 - i * 0.9;
          front.push(`<ellipse cx="${x.toFixed(1)}" cy="${y}" rx="3.6" ry="2.6" fill="${alpha(shade(h.c, i % 2 ? 0.2 : -0.22), 0.95)}" transform="rotate(${i % 2 ? 18 : -18} ${x.toFixed(1)} ${y})"/>`);
        }
        front.push(`<path d="M -14 -22 C -6 -25.6 8 -25.6 14 -21.6" ${strand(cols.lit, 1.4, 0.4)}/>`);
        break;
      }
      default:
        front.push(`<path d="${cap(0.6, -21.4)}" fill="url(#hr${r.u})"/>`);
    }
    if (h.wild) front.push(`<path d="M -19 -6 C -22 2 -22 10 -19 16" ${strand(h.c, 3.4, 0.9)}/><path d="M 19 -6 C 22 2 22 10 19 16" ${strand(h.c, 3.4, 0.9)}/>`);
    return { back: back.join(''), front: front.join(''), cols };
  }

  // ------------------------------------------------------------------ FACIAL HAIR
  function hairColour(r) {
    const h = r.hair;
    const capped = ['flatcap', 'newsboy', 'bowler', 'trilby', 'fedora', 'boater', 'panama', 'beanie', 'hood', 'snapback', 'peaked', 'bandana', 'scarf'].includes(h.k);
    return (capped && h.hc) ? h.hc : h.c;
  }
  function facialSvg(r) {
    const f = r.facial;
    if (!f || f.kind === 'none') return '';
    const base = f.c || hairColour(r);
    // a near-black beard turns into an unreadable slab — lift it just enough to keep form
    const c = lum(base) < 0.14 ? shade(base, 0.2) : base;
    const lit = shade(c, 0.24), dark = shade(c, -0.3);
    const mY = mouthY(r.feat);
    const wide = { square: 1, wide: 1.1, narrow: 0.92, long: 1, round: 1, soft: 0.96, oval: 0.94, heart: 0.9 }[r.feat.j] || 1;
    const chinY = { long: 29, wide: 27.6, round: 25.6, heart: 25.4, narrow: 26.4, oval: 26.2, soft: 26, square: 27.2 }[r.feat.j] || 26.4;
    const out = [];

    if (f.kind === 'stubble' || f.kind === 'stubm') {
      const a = 0.12 + f.d * 0.13;
      out.push(`<path d="M ${-11.4 * wide} 12.6 C ${-14 * wide} 18 ${-10 * wide} 24 ${-4 * wide} ${chinY - 1.4}
        C -1.4 ${chinY + 0.6} 1.4 ${chinY + 0.6} ${4 * wide} ${chinY - 1.4}
        C ${10 * wide} 24 ${14 * wide} 18 ${11.4 * wide} 12.6 C ${12 * wide} 19 ${8 * wide} 22.6 0 22.6
        C ${-8 * wide} 22.6 ${-12 * wide} 19 ${-11.4 * wide} 12.6 Z" fill="${alpha(c, a)}"/>`);
      out.push(`<path d="M -8 9.4 C -9.6 12 -11 14.4 -13 16.4 M 8 9.4 C 9.6 12 11 14.4 13 16.4" stroke="${alpha(c, a * 1.4)}" stroke-width="1.2" fill="none"/>`);
      if (f.kind === 'stubm') out.push(`<path d="M -6.4 ${mY - 2.4} C -3 ${mY - 3.6} 3 ${mY - 3.6} 6.4 ${mY - 2.4} C 3 ${mY - 1.2} -3 ${mY - 1.2} -6.4 ${mY - 2.4} Z" fill="${alpha(c, 0.72)}"/>`);
      return out.join('');
    }
    const moustache = (style) => {
      const M = {
        pencil: { h: 1.5, w: 7.6, drop: 0.6, tails: 0 },
        handlebar: { h: 2.6, w: 8.8, drop: 1.4, tails: 3.4 },
        walrus: { h: 4.6, w: 8.6, drop: 3.4, tails: 0 },
        toothbrush: { h: 2.2, w: 4.2, drop: 0.4, tails: 0 },
        horseshoe: { h: 4.2, w: 9.2, drop: 5.4, tails: 0 },
        classic: { h: 3.4, w: 8.2, drop: 1.8, tails: 0.8 }
      }[style] || { h: 3, w: 8, drop: 1.6, tails: 0.8 };
      let p = `<path d="M ${-M.w} ${mY - 2.2} C ${-M.w * 0.5} ${mY - 2.2 - M.h} ${M.w * 0.5} ${mY - 2.2 - M.h} ${M.w} ${mY - 2.2}
        C ${M.w * 0.86} ${mY - 2.2 + M.drop} ${M.w * 0.3} ${mY - 1.4 + M.drop * 0.3} 0 ${mY - 1.6 + M.drop * 0.2}
        C ${-M.w * 0.3} ${mY - 1.4 + M.drop * 0.3} ${-M.w * 0.86} ${mY - 2.2 + M.drop} ${-M.w} ${mY - 2.2} Z" fill="${c}"/>`;
      if (M.tails) p += `<path d="M ${-M.w} ${mY - 2} C ${-M.w - M.tails} ${mY - 3.4} ${-M.w - M.tails * 1.2} ${mY - 5.4} ${-M.w - M.tails * 0.7} ${mY - 6.4}
        M ${M.w} ${mY - 2} C ${M.w + M.tails} ${mY - 3.4} ${M.w + M.tails * 1.2} ${mY - 5.4} ${M.w + M.tails * 0.7} ${mY - 6.4}"
        stroke="${c}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
      p += `<path d="M ${-M.w * 0.6} ${mY - 2.6 - M.h * 0.5} C ${-M.w * 0.2} ${mY - 3.4 - M.h * 0.7} ${M.w * 0.2} ${mY - 3.4 - M.h * 0.7} ${M.w * 0.6} ${mY - 2.6 - M.h * 0.5}" stroke="${alpha(lit, 0.5)}" stroke-width="1" fill="none"/>`;
      return p;
    };

    switch (f.kind) {
      case 'mstache': out.push(moustache(f.style || 'classic')); break;
      case 'patch': out.push(`<path d="M -2.6 ${mY + 3.4} C -1.4 ${mY + 2.4} 1.4 ${mY + 2.4} 2.6 ${mY + 3.4} C 2 ${mY + 7.6} -2 ${mY + 7.6} -2.6 ${mY + 3.4} Z" fill="${c}"/>`); break;
      case 'burns':
        out.push(`<path d="M ${-16.6 * wide} -4 C ${-17.4 * wide} 4 ${-15.6 * wide} 12 ${-12.6 * wide} 16.4 C -14.6 12 -15 4 -14.4 -3.4 Z" fill="${c}"/>`);
        out.push(`<path d="M ${16.6 * wide} -4 C ${17.4 * wide} 4 ${15.6 * wide} 12 ${12.6 * wide} 16.4 C 14.6 12 15 4 14.4 -3.4 Z" fill="${c}"/>`);
        break;
      case 'chops':
        out.push(`<path d="M ${-17 * wide} -5 C ${-18 * wide} 6 ${-15 * wide} 18 ${-9.6 * wide} 24 C ${-11.4 * wide} 18 ${-12 * wide} 8 ${-11.6 * wide} 2 C -13 0 -14.6 -2 ${-17 * wide} -5 Z" fill="${c}"/>`);
        out.push(`<path d="M ${17 * wide} -5 C ${18 * wide} 6 ${15 * wide} 18 ${9.6 * wide} 24 C ${11.4 * wide} 18 ${12 * wide} 8 ${11.6 * wide} 2 C 13 0 14.6 -2 ${17 * wide} -5 Z" fill="${c}"/>`);
        out.push(moustache('walrus'));
        break;
      case 'strap':
        out.push(`<path d="M ${-11.4 * wide} 6.6 C ${-14 * wide} 13 ${-11 * wide} 21 ${-4 * wide} ${chinY - 1.6} C -1.4 ${chinY + 0.4} 1.4 ${chinY + 0.4} ${4 * wide} ${chinY - 1.6}
          C ${11 * wide} 21 ${14 * wide} 13 ${11.4 * wide} 6.6 C ${12.6 * wide} 13 ${13.4 * wide} 14.4 ${13.6 * wide} 16
          C ${11 * wide} 21.4 ${6 * wide} 24 0 24 C ${-6 * wide} 24 ${-11 * wide} 21.4 ${-13.6 * wide} 16
          C ${-13.4 * wide} 14.4 ${-12.6 * wide} 13 ${-11.4 * wide} 6.6 Z" fill="${c}"/>`);
        break;
      case 'jaw':
        out.push(`<path d="M ${-12.4 * wide} 8 C ${-15 * wide} 15 ${-11.6 * wide} 22.6 ${-4 * wide} ${chinY - 0.6} C -1.4 ${chinY + 1.2} 1.4 ${chinY + 1.2} ${4 * wide} ${chinY - 0.6}
          C ${11.6 * wide} 22.6 ${15 * wide} 15 ${12.4 * wide} 8 C ${14 * wide} 16 ${12 * wide} 22 ${4 * wide} ${chinY} C 1.4 ${chinY + 2} -1.4 ${chinY + 2} ${-4 * wide} ${chinY}
          C ${-12 * wide} 22 ${-14 * wide} 16 ${-12.4 * wide} 8 Z" fill="${c}"/>`);
        out.push(`<path d="M ${-10 * wide} 13 C -6 13.6 6 13.6 ${10 * wide} 13" stroke="${alpha(lit, 0.25)}" stroke-width="1.4" fill="none"/>`);
        break;
      case 'goatee':
        out.push(moustache('classic'));
        out.push(`<path d="M -4.2 ${mY + 3.2} C -2.6 ${mY + 2.2} 2.6 ${mY + 2.2} 4.2 ${mY + 3.2} C 5.4 ${mY + 8.4} 2.4 ${mY + 12.4} 0 ${mY + 12.6} C -2.4 ${mY + 12.4} -5.4 ${mY + 8.4} -4.2 ${mY + 3.2} Z" fill="${c}"/>`);
        break;
      case 'vandyke':
        out.push(moustache('handlebar'));
        out.push(`<path d="M -3.6 ${mY + 3.4} C -2 ${mY + 5.4} 2 ${mY + 5.4} 3.6 ${mY + 3.4} C 3.4 ${mY + 9.4} 2 ${mY + 13} 0 ${mY + 13.8} C -2 ${mY + 13} -3.4 ${mY + 9.4} -3.6 ${mY + 3.4} Z" fill="${c}"/>`);
        break;
      case 'boxed':
        out.push(`<path d="M ${-12.6 * wide} 5.4 C ${-15.4 * wide} 13 ${-12.4 * wide} 21.6 ${-4.4 * wide} ${chinY + 0.8} C -1.6 ${chinY + 2.4} 1.6 ${chinY + 2.4} ${4.4 * wide} ${chinY + 0.8}
          C ${12.4 * wide} 21.6 ${15.4 * wide} 13 ${12.6 * wide} 5.4 C ${13.6 * wide} 13.6 ${12.4 * wide} 21 ${4.4 * wide} ${chinY + 0.4}
          C 1.6 ${chinY + 2} -1.6 ${chinY + 2} ${-4.4 * wide} ${chinY + 0.4} C ${-12.4 * wide} 21 ${-13.6 * wide} 13.6 ${-12.6 * wide} 5.4 Z" fill="${c}"/>`);
        out.push(moustache('classic'));
        out.push(`<path d="M -7 ${mY + 6} C -3 ${mY + 7.4} 3 ${mY + 7.4} 7 ${mY + 6}" stroke="${alpha(lit, 0.3)}" stroke-width="1.3" fill="none"/>`);
        break;
      default: {
        const L = f.len || 1;
        const chinEnd = chinY + 2.6 + L * 7.4 + (f.wild ? 3 : 0);
        out.push(`<path d="M ${-14 * wide} 2.6 C ${-17.4 * wide} 10 ${-15.4 * wide} 19 ${-11 * wide} 24
          C ${-8 * wide} ${chinEnd - 1} ${-4 * wide} ${chinEnd} 0 ${chinEnd} C ${4 * wide} ${chinEnd} ${8 * wide} ${chinEnd - 1} ${11 * wide} 24
          C ${15.4 * wide} 19 ${17.4 * wide} 10 ${14 * wide} 2.6 C ${15 * wide} 12 ${13 * wide} 20 ${10 * wide} 24
          C ${6 * wide} 21 ${3 * wide} 18.6 0 18.6 C ${-3 * wide} 18.6 ${-6 * wide} 21 ${-10 * wide} 24
          C ${-13 * wide} 20 ${-15 * wide} 12 ${-14 * wide} 2.6 Z" fill="${c}"/>`);
        out.push(`<path d="M ${-9.4 * wide} 16 C ${-11 * wide} 22 ${-8 * wide} 26 ${-5 * wide} 27.6 C -2 29.4 2 29.4 ${5 * wide} 27.6
          C ${8 * wide} 26 ${11 * wide} 22 ${9.4 * wide} 16 C ${8 * wide} 21 ${4 * wide} 23.4 0 23.4 C ${-4 * wide} 23.4 ${-8 * wide} 21 ${-9.4 * wide} 16 Z" fill="${shade(c, -0.12)}"/>`);
        if (L > 1) {
          const tip = chinY + 6 + L * 7;
          out.push(`<path d="M ${-8.4 * wide} ${chinY - 4} C ${-10 * wide} ${tip - 10} ${-6 * wide} ${tip - 2} 0 ${tip}
            C ${6 * wide} ${tip - 2} ${10 * wide} ${tip - 10} ${8.4 * wide} ${chinY - 4}
            C ${7 * wide} ${tip - 8} ${3 * wide} ${tip + 1} 0 ${tip + 1.4} C ${-3 * wide} ${tip + 1} ${-7 * wide} ${tip - 8} ${-8.4 * wide} ${chinY - 4} Z" fill="${shade(c, -0.16)}"/>`);
          for (let i = -1; i <= 1; i++) out.push(`<path d="M ${i * 4.2} ${chinY - 4} C ${i * 4.6} ${tip - 8} ${i * 3.4} ${tip - 3} ${i * 2.6} ${tip - 0.4}" stroke="${alpha(f.wild ? lit : dark, f.wild ? 0.34 : 0.2)}" stroke-width="1.6" fill="none"/>`);
          if (f.wild) {
            out.push(`<path d="M -11 ${chinY - 6} C -15 ${tip - 12} -14 ${tip - 4} -11.6 ${tip + 2}" stroke="${c}" stroke-width="2.4" fill="none"/>`);
            out.push(`<path d="M 11 ${chinY - 6} C 15 ${tip - 12} 14 ${tip - 4} 11.6 ${tip + 2}" stroke="${c}" stroke-width="2.4" fill="none"/>`);
          }
        }
        out.push(moustache(f.wild ? 'walrus' : 'classic'));
        out.push(`<path d="M -8 ${mY + 9} C -3.4 ${mY + 11} 3.4 ${mY + 11} 8 ${mY + 9}" stroke="${alpha(lit, 0.18)}" stroke-width="1.6" fill="none"/>`);
      }
    }
    return out.join('');
  }

  // ------------------------------------------------------------------ head accessories
  function headAccent(r, mode) {
    const a = r.acc;
    if (!a || a.k === 'none') return '';
    const out = [];
    const mY = mouthY(r.feat);
    const EY = EYE_Y, EX = EYE_X;
    switch (a.k) {
      case 'glasses': case 'shades': {
        const lens = a.k === 'shades' ? alpha('#0d1015', 0.84) : alpha('#cfe3ea', 0.18);
        out.push(`<g>
          <ellipse cx="${-EX}" cy="${EY}" rx="5.7" ry="5.2" fill="${lens}" stroke="${a.c}" stroke-width="1.3"/>
          <ellipse cx="${EX}" cy="${EY}" rx="5.7" ry="5.2" fill="${lens}" stroke="${a.c}" stroke-width="1.3"/>
          <path d="M ${-EX + 5.6} ${EY} h 3.6" stroke="${a.c}" stroke-width="1.3" fill="none"/>
          <path d="M ${-EX - 5.6} ${EY - 1} L -18 ${EY - 2.4} M ${EX + 5.6} ${EY - 1} L 18 ${EY - 2.4}" stroke="${a.c}" stroke-width="1.2" fill="none"/>
          <path d="M -13 ${EY - 4.4} C -8 ${EY - 6.6} 8 ${EY - 6.6} 13 ${EY - 4.4}" stroke="${a.c}" stroke-width="1.1" fill="none" opacity="0.8"/>
          ${a.k === 'shades' ? '' : `<path d="M ${-EX - 3.6} ${EY - 1.8} l 3.6 -0.2 M ${EX - 3} ${EY - 2} l 3.6 0.2" stroke="#ffffff" stroke-width="0.9" opacity="0.45"/>`}
        </g>`);
        break;
      }
      case 'monocle':
        out.push(`<g>
          <ellipse cx="${EX}" cy="${EY}" rx="6.4" ry="6" fill="${alpha('#cfe3ea', 0.16)}" stroke="${a.c}" stroke-width="1.6"/>
          <path d="M ${EX + 1.4} ${EY + 5.6} C ${EX + 3} ${EY + 12} ${EX + 1.4} ${EY + 17} ${EX - 0.6} ${EY + 21}" stroke="${a.c}" stroke-width="1" fill="none"/>
          <path d="M ${EX - 3} ${EY - 3} l 4 -0.4" stroke="#ffffff" stroke-width="1.1" opacity="0.5"/>
        </g>`);
        break;
      case 'pipe':
        out.push(`<g transform="translate(0 ${mY + 1})">
          <path d="M -3 1 C -6 2.6 -7.6 5.6 -6.2 8 C -4.8 10.4 -1.8 10.2 -0.4 9" fill="none" stroke="${a.c}" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M -3 1 L -4.6 -2" stroke="${shade(a.c, -0.3)}" stroke-width="2.6" stroke-linecap="round"/>
          <ellipse cx="-4.6" cy="-2.8" rx="2.6" ry="1.9" fill="${shade(a.c, 0.2)}"/>
          <path d="M -8 -4.8 c -1.6 -2.4 1 -3.6 0.2 -5.6 c -1 -2.4 1.8 -3.4 1.2 -5.4" fill="none" stroke="#dcd6c8" stroke-width="1" opacity="0.35"/>
        </g>`);
        break;
      case 'cigar': case 'fag': {
        const cig = a.k === 'cigar';
        out.push(`<g transform="translate(0 ${mY - 1}) rotate(-8)">
          <path d="M 3.4 0.6 L ${cig ? -6.6 : -5.4} 3.6" stroke="${cig ? a.c : '#efe6d2'}" stroke-width="${cig ? 2.6 : 1.7}" stroke-linecap="round"/>
          ${cig ? `<path d="M 3.2 1.1 L 1.4 1.9" stroke="#e8dfc8" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M -6.6 3.6 l -1.5 0.5" stroke="#a8341f" stroke-width="2.2" stroke-linecap="round"/>` : `<circle cx="-5.6" cy="3.8" r="1.1" fill="#c2431f"/>`}
          <path d="M -8 2 c -1.4 -2 0.6 -3.2 -0.4 -5" fill="none" stroke="#dcd6c8" stroke-width="0.9" opacity="0.3"/>
        </g>`);
        break;
      }
    }
    return out.join('');
  }

  function chestAccent(r, mode) {
    const a = r.acc, top = r.top;
    if (!a || a.k === 'none') return '';
    const y0 = mode === 'bust' ? 104 : 118;
    const out = [];
    switch (a.k) {
      case 'watch':
        out.push(`<path d="M -11 ${y0 - 6} C -4 ${y0 + 2} 4 ${y0 + 2} 11 ${y0 - 6}" stroke="${a.c}" stroke-width="1.5" fill="none"/>
          <path d="M -6 ${y0 - 1} C -2 ${y0 + 5} 2 ${y0 + 5} 6 ${y0 - 1}" stroke="${shade(a.c, -0.2)}" stroke-width="1.1" fill="none"/>
          <circle cx="0" cy="${y0 + 3.6}" r="2.6" fill="${a.c}" stroke="${shade(a.c, -0.45)}" stroke-width="0.6"/>
          <path d="M 0 ${y0 + 3.6} v -1.6 M 0 ${y0 + 3.6} h 1.3" stroke="${shade(a.c, -0.55)}" stroke-width="0.7"/>`);
        break;
      case 'cravat':
        out.push(`<path d="M -7 ${y0 - 12} C -3 ${y0 - 6} 3 ${y0 - 6} 7 ${y0 - 12} C 5 ${y0 - 2} 4 ${y0 + 4} 0 ${y0 + 6} C -4 ${y0 + 4} -5 ${y0 - 2} -7 ${y0 - 12} Z" fill="${a.c}"/>
          <path d="M -5 ${y0 - 9} C -2 ${y0 - 5} 2 ${y0 - 5} 5 ${y0 - 9}" stroke="${shade(a.c, 0.3)}" stroke-width="1" fill="none"/>`);
        break;
      case 'bouton':
        out.push(`<circle cx="12" cy="${y0 - 2}" r="2.6" fill="${a.c}"/><circle cx="12" cy="${y0 - 2}" r="1.1" fill="${shade(a.c, 0.4)}"/>
          <path d="M 12 ${y0 + 0.6} C 12 ${y0 + 4} 11 ${y0 + 7} 10 ${y0 + 9}" stroke="#3f5a34" stroke-width="1" fill="none"/>`);
        break;
      case 'pin':
        out.push(`<path d="M -1.8 ${y0 - 10} L 1.8 ${y0 - 10}" stroke="${a.c}" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="0" cy="${y0 - 10}" r="1.5" fill="${shade(a.c, 0.3)}"/>`);
        break;
      case 'links':
        out.push(`<circle cx="-16" cy="${y0 + 8}" r="1.7" fill="${a.c}"/><circle cx="16" cy="${y0 + 8}" r="1.7" fill="${a.c}"/>`);
        break;
      case 'square':
        out.push(`<path d="M 8 ${y0 - 4} l 7 -2.6 l 0.6 8 l -7 2.4 Z" fill="${a.c}" stroke="${shade(a.c, -0.3)}" stroke-width="0.5"/>`);
        break;
      case 'scarf':
        out.push(`<path d="M -13 ${y0 - 14} C -4 ${y0 - 8} 4 ${y0 - 8} 13 ${y0 - 14} C 12 ${y0 + 2} 10 ${y0 + 14} 8 ${y0 + 26} L -8 ${y0 + 26}
          C -10 ${y0 + 14} -12 ${y0 + 2} -13 ${y0 - 14} Z" fill="${a.c}" opacity="0.92"/>
          <path d="M -11 ${y0 + 6} L 11 ${y0 + 4} M -10 ${y0 + 14} L 10 ${y0 + 12}" stroke="${alpha('#000000', 0.18)}" stroke-width="2.4"/>
          <path d="M 6 ${y0 + 24} l 2 8 M 1 ${y0 + 24} l 1 9 M -4 ${y0 + 24} l 0 8" stroke="${a.c}" stroke-width="1.6"/>`);
        break;
      case 'flask':
        out.push(`<path d="M 10 ${y0} h 7 a 2 2 0 0 1 2 2 v 9 a 2 2 0 0 1 -2 2 h -7 a 2 2 0 0 1 -2 -2 v -9 a 2 2 0 0 1 2 -2 Z"
          fill="${a.c}" stroke="${shade(a.c, -0.4)}" stroke-width="0.7"/><rect x="12" y="${y0 - 3}" width="3" height="3" fill="${shade(a.c, -0.3)}"/>`);
        break;
      case 'rosary':
        out.push(`<path d="M -9 ${y0 - 8} C -4 ${y0 + 6} 4 ${y0 + 6} 9 ${y0 - 8}" fill="none" stroke="${a.c}" stroke-width="1" stroke-dasharray="2 2"/>
          <path d="M 0 ${y0 + 5} v 7" stroke="${a.c}" stroke-width="1"/><circle cx="0" cy="${y0 + 13}" r="1.8" fill="${a.c}"/>`);
        break;
      case 'monocle':
        out.push(`<path d="M 9 ${y0 - 34} C 11 ${y0 - 20} 10 ${y0 - 10} 8 ${y0 - 4}" stroke="${a.c}" stroke-width="0.9" fill="none"/>`);
        break;
    }
    return out.join('');
  }

  // ------------------------------------------------------------------ the clothed bust + figure
  function torsoSvg(r, mode) {
    const top = r.top, u = r.u, fem = r.fem, body = r.body;
    const lin = top.l, trim = top.s;
    const out = [];
    const SW = (fem ? 24.4 : 27.2) * body.sh;
    const pat = (top.pt && top.pt !== 'plain') ? `url(#pt${u})` : 'none';
    const shY = 99;
    const shell = `M ${-SW - 4} 130 C ${-SW - 3} ${shY + 2} ${-SW * 0.62} ${shY - 6} ${-SW * 0.2} ${shY - 7.4}
        C ${SW * 0.2} ${shY - 7.4} ${SW * 0.62} ${shY - 6} ${SW + 4} 130 L ${SW + 6} 130 L ${-SW - 6} 130 Z`;
    out.push(`<path d="${shell}" fill="url(#ct${u})"/>`);
    out.push(`<path d="${shell}" fill="${pat}"/>`);
    out.push(`<path d="M ${-SW * 0.34} ${shY - 5} L 0 130 L ${SW * 0.34} ${shY - 5} C ${SW * 0.16} ${shY - 8.6} ${-SW * 0.16} ${shY - 8.6} ${-SW * 0.34} ${shY - 5} Z" fill="url(#cl${u})"/>`);
    const lapW = ['greatcoat', 'duffel', 'peacoat', 'trench', 'trenchf', 'raincoat'].includes(top.k) ? 1.24 : 1;
    out.push(`<path d="M ${-SW * 0.42} ${shY - 6} L 0 ${shY + 30} L ${-SW * 0.86} ${shY + 6} C ${-SW * 0.72} ${shY - 1} ${-SW * 0.58} ${shY - 4} ${-SW * 0.42} ${shY - 6} Z" fill="${trim}" opacity="0.95"/>`);
    out.push(`<path d="M ${SW * 0.42} ${shY - 6} L 0 ${shY + 30} L ${SW * 0.86} ${shY + 6} C ${SW * 0.72} ${shY - 1} ${SW * 0.58} ${shY - 4} ${SW * 0.42} ${shY - 6} Z" fill="${shade(trim, -0.12)}" opacity="0.95"/>`);
    out.push(`<path d="M ${-SW * 0.42 * lapW} ${shY - 5.4} C ${-SW * 0.24} ${shY + 6} ${-SW * 0.14} ${shY + 18} 0 ${shY + 30}" stroke="${alpha('#000000', 0.3)}" stroke-width="1.1" fill="none"/>`);
    out.push(`<path d="M ${SW * 0.42 * lapW} ${shY - 5.4} C ${SW * 0.24} ${shY + 6} ${SW * 0.14} ${shY + 18} 0 ${shY + 30}" stroke="${alpha('#000000', 0.34)}" stroke-width="1.2" fill="none"/>`);
    if (['overcoat', 'greatcoat', 'peacoat', 'duffel', 'trench', 'raincoat', 'frock', 'blazer', 'smoking', 'sailor'].includes(top.k)) {
      const bx = (top.k === 'sailor' || top.k === 'smoking' ? -1 : 1) * SW * 0.52;
      for (let i = 0; i < 3; i++) out.push(`<circle cx="${bx}" cy="${shY + 14 + i * 8}" r="1.7" fill="${shade(trim, -0.34)}" stroke="${alpha('#ffffff', 0.16)}" stroke-width="0.5"/>`);
    }
    if (top.k === 'smoking') out.push(`<path d="M -7 ${shY + 8} L 0 ${shY + 6} L 7 ${shY + 8} L 0 ${shY + 14} Z" fill="#161018"/>`);
    if (top.k === 'sailor') out.push(`<path d="M ${-SW * 0.6} ${shY - 4} L 0 ${shY + 16} L ${SW * 0.6} ${shY - 4}" fill="none" stroke="${lin}" stroke-width="4" stroke-linejoin="round" opacity="0.85"/>`);
    if (top.k === 'rollneck') out.push(`<path d="M ${-SW * 0.36} ${shY - 15} C ${-SW * 0.2} ${shY - 6} ${SW * 0.2} ${shY - 6} ${SW * 0.36} ${shY - 15} L ${SW * 0.36} ${shY - 9} C ${SW * 0.2} ${shY - 1} ${-SW * 0.2} ${shY - 1} ${-SW * 0.36} ${shY - 9} Z" fill="${lin}"/>`);
    if (top.k === 'waistcoat') for (const sx of [-1, 1]) out.push(`<path d="M ${sx * SW * 0.88} ${shY + 4} L ${sx * SW * 0.6} ${shY + 30} L ${sx * (SW * 0.66 + 9)} 130 L ${sx * (SW * 0.92 + 9)} 130 Z" fill="${lin}" opacity="0.95"/>`);
    if (fem && ['dress', 'knitf', 'ladycoat', 'wrapcoat', 'trenchf', 'longcoatf'].includes(top.k)) {
      out.push(`<path d="M ${-SW * 0.8} ${shY + 12} C ${-SW * 0.4} ${shY + 20} ${SW * 0.4} ${shY + 20} ${SW * 0.8} ${shY + 12}" stroke="${trim}" stroke-width="3.4" fill="none" opacity="0.9"/>`);
    }
    out.push(`<path d="M ${-SW - 4} 130 C ${-SW - 3} ${shY + 2} ${-SW * 0.62} ${shY - 6} ${-SW * 0.2} ${shY - 7.4}" stroke="${alpha('#000000', 0.28)}" stroke-width="1.2" fill="none"/>`);
    out.push(`<path d="M ${SW + 4} 130 C ${SW + 3} ${shY + 2} ${SW * 0.62} ${shY - 6} ${SW * 0.2} ${shY - 7.4}" stroke="${alpha('#000000', 0.34)}" stroke-width="1.3" fill="none"/>`);
    out.push(chestAccent(r, mode));
    return out.join('');
  }

  function figureSvg(r) {
    const top = r.top, u = r.u, body = r.body;
    const lin = top.l, trim = top.s;
    const pat = (top.pt && top.pt !== 'plain') ? `url(#pt${u})` : 'none';
    const coatLen = { duster: 212, trench: 202, trenchf: 202, greatcoat: 208, overcoat: 200, longcoatf: 210, duffel: 192,
      raincoat: 204, ladycoat: 198, wrapcoat: 196, surcoat: 192, frock: 188, peacoat: 180, blazer: 174, smoking: 170,
      leather: 162, bomber: 154, dockjacket: 162, waistcoat: 152, rollneck: 170, knitf: 184, dress: 192, sailor: 166 }[top.k] || 182;
    const out = [];
    const waist = 13.4 * body.wa;
    const shW = 24.6 * body.sh;
    const coatW = shW * 1.06;
    const shY = 78;
    const legTop = 150, ankle = 236;

    // ---- trousers
    for (const sx of [-1, 1]) {
      out.push(`<path d="M ${sx * 3.4} ${legTop - 6} C ${sx * (waist * 0.9)} ${legTop + 6} ${sx * (waist * 0.86 - 1)} ${legTop + 40} ${sx * (waist * 0.6 - 3)} ${ankle}
        L ${sx * (waist * 0.6 + 4)} ${ankle} C ${sx * waist * 0.62} ${legTop + 34} ${sx * (waist * 0.5 + 4)} ${legTop + 4} ${sx * 3.4} ${legTop - 8} Z" fill="url(#tr${u})"/>`);
      out.push(`<path d="M ${sx * (waist * 0.9 - 1)} ${legTop + 6} C ${sx * (waist * 0.84 - 1)} ${legTop + 44} ${sx * (waist * 0.62 - 3)} ${ankle - 30} ${sx * (waist * 0.6 - 3)} ${ankle - 4}" stroke="${alpha('#000000', 0.26)}" stroke-width="1.4" fill="none"/>`);
    }
    out.push(`<path d="M ${-15.4 * body.hip} ${legTop - 8} L ${15.4 * body.hip} ${legTop - 8} L ${15.4 * body.hip - 1} ${legTop + 12} L ${-15.4 * body.hip + 1} ${legTop + 12} Z" fill="${shade(top.tr, -0.32)}"/>`);
    // ---- boots
    for (const sx of [-1, 1]) {
      const bx = sx * (waist * 0.6 + 1);
      out.push(`<path d="M ${bx - 6} ${ankle - 10} L ${bx + 6} ${ankle - 10} L ${bx + 6.6} ${ankle + 6}
        C ${bx + 7} ${ankle + 9} ${bx + 4} ${ankle + 10.4} ${bx - 1} ${ankle + 10.4} L ${bx - 7.4} ${ankle + 10.4}
        C ${bx - 10.4} ${ankle + 10.4} ${bx - 11} ${ankle + 7} ${bx - 10} ${ankle + 3.6} C ${bx - 8.6} ${ankle - 2} ${bx - 6.8} ${ankle - 6} ${bx - 6} ${ankle - 10} Z" fill="url(#hs${u})"/>`);
      out.push(`<path d="M ${bx - 10} ${ankle + 6.4} L ${bx + 6.6} ${ankle + 6.4}" stroke="${alpha('#000000', 0.42)}" stroke-width="1.6"/>`);
      out.push(`<path d="M ${bx - 5} ${ankle - 6} l 10 0.4 M ${bx - 5} ${ankle - 2} l 10.4 0.4" stroke="${alpha('#ffffff', 0.16)}" stroke-width="0.9"/>`);
    }
    // ---- coat body
    const shell = `M ${-coatW} ${coatLen} C ${-coatW - 1.4} ${shY + 40} ${-coatW - 1} ${shY + 6} ${-coatW * 0.72} ${shY - 1}
      C ${-coatW * 0.4} ${shY - 8} ${coatW * 0.4} ${shY - 8} ${coatW * 0.72} ${shY - 1}
      C ${coatW + 1} ${shY + 6} ${coatW + 1.4} ${shY + 40} ${coatW} ${coatLen} Z`;
    out.push(`<path d="${shell}" fill="url(#ct${u})"/>`);
    out.push(`<path d="${shell}" fill="${pat}"/>`);
    out.push(`<path d="M ${-coatW * 0.44} ${shY - 4} C ${-coatW * 0.3} ${shY + 30} ${-coatW * 0.2} ${shY + 60} ${-coatW * 0.24} ${coatLen} L ${coatW * 0.24} ${coatLen}
      C ${coatW * 0.2} ${shY + 60} ${coatW * 0.3} ${shY + 30} ${coatW * 0.44} ${shY - 4} C ${coatW * 0.2} ${shY - 9} ${-coatW * 0.2} ${shY - 9} ${-coatW * 0.44} ${shY - 4} Z" fill="url(#cl${u})" opacity="0.97"/>`);
    out.push(`<path d="M ${-coatW * 0.4} ${shY - 3} L ${-coatW * 0.1} ${shY + 40} L ${-coatW * 0.62} ${shY + 16} C ${-coatW * 0.56} ${shY + 6} ${-coatW * 0.48} ${shY + 1} ${-coatW * 0.4} ${shY - 3} Z" fill="${trim}"/>`);
    out.push(`<path d="M ${coatW * 0.4} ${shY - 3} L ${coatW * 0.1} ${shY + 40} L ${coatW * 0.62} ${shY + 16} C ${coatW * 0.56} ${shY + 6} ${coatW * 0.48} ${shY + 1} ${coatW * 0.4} ${shY - 3} Z" fill="${shade(trim, -0.14)}"/>`);
    if (['overcoat', 'greatcoat', 'peacoat', 'duffel', 'trench', 'raincoat', 'frock', 'blazer', 'smoking', 'ladycoat', 'wrapcoat', 'trenchf'].includes(top.k)) {
      for (let i = 0; i < 4; i++) out.push(`<circle cx="${coatW * 0.2}" cy="${shY + 16 + i * 20}" r="2" fill="${shade(trim, -0.38)}" stroke="${alpha('#ffffff', 0.18)}" stroke-width="0.5"/>`);
    }
    if (['trench', 'trenchf', 'raincoat'].includes(top.k)) out.push(`<path d="M ${-coatW * 1.02} ${shY + 62} L ${coatW * 1.02} ${shY + 62} L ${coatW * 1.02} ${shY + 71} L ${-coatW * 1.02} ${shY + 71} Z" fill="${shade(trim, -0.22)}"/>
      <rect x="${-6}" y="${shY + 60}" width="12" height="13" rx="2" fill="${shade(trim, 0.1)}" stroke="${alpha('#000000', 0.3)}" stroke-width="0.6"/>`);
    if (top.k === 'sailor') out.push(`<path d="M ${-coatW * 0.6} ${shY - 2} L 0 ${shY + 22} L ${coatW * 0.6} ${shY - 2}" fill="none" stroke="${lin}" stroke-width="5.4" stroke-linejoin="round" opacity="0.85"/>`);
    if (top.k === 'smoking') out.push(`<path d="M -6 ${shY + 4} L 0 ${shY + 2} L 6 ${shY + 4} L 0 ${shY + 9} Z" fill="#161018"/>`);
    out.push(`<path d="M ${-coatW * 0.98} ${coatLen} L ${coatW * 0.98} ${coatLen} L ${coatW * 0.94} ${coatLen + 6} L ${-coatW * 0.94} ${coatLen + 6} Z" fill="${alpha('#000000', 0.22)}"/>`);
    // ---- arms
    for (const sx of [-1, 1]) {
      const arm = `M ${sx * (coatW * 0.86)} ${shY + 6} C ${sx * (coatW * 1.32)} ${shY + 16} ${sx * (coatW * 1.3)} ${shY + 54} ${sx * (coatW * 1.2)} ${shY + 84}
        C ${sx * (coatW * 1.16)} ${shY + 94} ${sx * (coatW * 0.98)} ${shY + 96} ${sx * (coatW * 0.82)} ${shY + 90}
        C ${sx * (coatW * 0.86)} ${shY + 58} ${sx * (coatW * 0.8)} ${shY + 26} ${sx * (coatW * 0.78)} ${shY + 4} Z`;
      out.push(`<path d="${arm}" fill="url(#ct${u})"/>`);
      out.push(`<path d="${arm}" fill="${pat}"/>`);
      out.push(`<path d="M ${sx * (coatW * 1.08)} ${shY + 66} C ${sx * (coatW * 1.14)} ${shY + 66} ${sx * (coatW * 1.2)} ${shY + 65} ${sx * (coatW * 1.22)} ${shY + 62}" stroke="${alpha('#000000', 0.24)}" stroke-width="1.2" fill="none"/>`);
      out.push(`<ellipse cx="${sx * (coatW * 1.04)}" cy="${shY + 88}" rx="6.2" ry="7.2" fill="url(#sk${u})"/>`);
      out.push(`<path d="M ${sx * (coatW * 1.04) - 4.2} ${shY + 84} l 0 6 M ${sx * (coatW * 1.04) - 1.2} ${shY + 83} l 0 7.4 M ${sx * (coatW * 1.04) + 1.8} ${shY + 84} l 0 6" stroke="${alpha(r.sk.form, 0.5)}" stroke-width="0.9" fill="none"/>`);
    }
    // ---- collar (drawn last so the neck sits inside it)
    out.push(`<path d="M -14 ${shY - 11} C -8 ${shY - 3} -3 ${shY - 1.4} 0 ${shY - 1.4} C 3 ${shY - 1.4} 8 ${shY - 3} 14 ${shY - 11}
      C 11 ${shY - 19} 6 ${shY - 23} 0 ${shY - 23} C -6 ${shY - 23} -11 ${shY - 19} -14 ${shY - 11} Z" fill="${shade(trim, -0.06)}"/>`);
    out.push(chestAccent(r, 'doll'));
    return out.join('');
  }

  // ------------------------------------------------------------------ head assembly
  function headSvg(r, opts) {
    opts = opts || {};
    const hair = hairParts(r);
    const out = [];
    out.push(hair.back);
    out.push(earsSvg(r));
    out.push(`<path d="${outline(r.feat)}" fill="url(#sk${r.u})"/>`);
    out.push(`<path d="M -16.8 -12.4 C -15.6 -21 -9.4 -26.8 0 -27.2 C 9.4 -26.8 15.6 -21 16.8 -12.4 C 12 -19.4 -12 -19.4 -16.8 -12.4 Z" fill="${alpha(r.sk.deep, 0.18)}"/>`);
    out.push(`<path d="M 8.4 -25.4 C 15 -21.6 18 -14.6 18 -8.8 C 19 -2.8 17.6 4.4 14.6 10.2" fill="none" stroke="${alpha(r.sk.deep, 0.2)}" stroke-width="3.6"/>`);
    out.push(`<path d="M -9.4 -26.2 C -15.6 -22 -17.6 -15.4 -17 -9.4" fill="none" stroke="${alpha(r.sk.lit, 0.4)}" stroke-width="4.2"/>`);
    out.push(`<path d="M -8.6 -17.6 C -3.4 -19.6 3.4 -19.6 8.6 -17.6" fill="none" stroke="${alpha(r.sk.lit, 0.22)}" stroke-width="5"/>`);
    out.push(featuresSvg(r));
    out.push(facialSvg(r));
    out.push(hair.front);
    out.push(headAccent(r, opts.mode));
    return out.join('');
  }

  // ------------------------------------------------------------------ render surfaces
  function wrap(u, vbW, vbH, size, body, cls) {
    const h = Math.round(size * vbH / vbW);
    return `<svg viewBox="0 0 ${vbW} ${vbH}" width="${Math.round(size)}" height="${h}" role="img" class="av-svg ${cls || ''}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }

  function svgFor(s, size, glowColor) {
    size = size || 120;
    const r = resolve(s);
    const lite = size <= 46;
    const u = r.u;
    const glow = glowColor || (r.acc.k === 'none' ? shade(r.top.c, 0.34) : r.acc.c);
    const bg1 = shade(glow, -0.9), bg2 = '#0a0c10';
    let f = '';
    f += `<rect width="120" height="120" fill="url(#pg${u})"/>`;
    f += `<ellipse cx="60" cy="54" rx="52" ry="48" fill="url(#gl${u})" opacity="0.55"/>`;
    if (!lite) {
      f += `<g opacity="0.3">`;
      for (let i = 0; i < 6; i++) f += `<path d="M ${14 + i * 16} 118 C ${18 + i * 15} 96 ${6 + i * 17} 86 ${12 + i * 16} 62" stroke="${alpha('#ffffff', 0.05 + i * 0.012)}" stroke-width="${6 + (i % 3) * 3}" fill="none"/>`;
      f += `</g>`;
    }
    f += torsoSvg(r, 'bust');
    f += `<g transform="translate(60 50) scale(1.24)">`;
    f += `<path d="M -7.6 22 C -8.4 30 -8.6 34 -9.4 37 L 9.4 37 C 8.6 34 8.4 30 7.6 22 Z" fill="url(#skn${u})"/>`;
    f += `<path d="M -9.6 34 C -4 37.4 4 37.4 9.6 34 C 5 33 -5 33 -9.6 34 Z" fill="${alpha(r.sk.deep, 0.55)}"/>`;
    f += `<path d="M -8.2 24 C -8.8 30 -9 33 -9.6 36" stroke="${alpha(r.sk.deep, 0.22)}" stroke-width="1.6" fill="none"/>`;
    f += headSvg(r, { mode: 'bust' });
    f += `</g>`;
    f += `<path d="M 22 104 C 15 84 26 62 40 54" fill="none" stroke="${alpha(shade(glow, 0.6), 0.22)}" stroke-width="2"/>`;
    f += `<path d="M 44 24 C 48 18 54 15 60 14" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.1"/>`;
    const defs = defsFor(r, { glow }) +
      `<defs><linearGradient id="pg${u}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="62%" stop-color="#141821"/><stop offset="100%" stop-color="${bg2}"/></linearGradient>
       <radialGradient id="vig${u}" cx="50%" cy="50%" r="70%"><stop offset="62%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.42"/></radialGradient></defs>`;
    f += `<rect width="120" height="120" fill="url(#vig${u})"/>`;
    return wrap(u, 120, 120, size, defs + f, 'av-bust');
  }

  function doll(s, size, opts) {
    opts = opts || {};
    size = size || 220;
    const r = resolve(s);
    const u = r.u;
    const VB_W = 120, VB_H = 266;
    const glow = opts.glow || (r.acc.k === 'none' ? shade(r.top.c, 0.34) : r.acc.c);
    const hair = hairParts(r);
    let f = '';
    f += `<ellipse cx="60" cy="252" rx="34" ry="6" fill="#000000" opacity="0.42"/>`;
    f += `<g transform="translate(60 44) scale(1.3)">${hair.back}</g>`;
    f += `<g transform="translate(60 0)">${figureSvg(r)}</g>`;
    f += `<g transform="translate(60 44) scale(1.3)">`;
    f += `<path d="M -7.6 22 C -8.6 32 -9 37 -10 41 L 10 41 C 9 37 8.6 32 7.6 22 Z" fill="url(#skn${u})"/>`;
    f += `<path d="M -10 38 C -4 41 4 41 10 38 C 5 37 -5 37 -10 38 Z" fill="${alpha(r.sk.deep, 0.5)}"/>`;
    f += headSvg(r, { mode: 'doll' });
    f += `</g>`;
    f += `<path d="M 40 78 C 32 110 31 168 33 214" fill="none" stroke="${alpha(shade(glow, 0.55), 0.2)}" stroke-width="2"/>`;
    const defs = defsFor(r, { glow }) +
      `<defs><linearGradient id="dg${u}" x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0%" stop-color="${shade(glow, -0.72)}"/><stop offset="46%" stop-color="#191d25"/><stop offset="100%" stop-color="#0b0d12"/></linearGradient>
        <radialGradient id="dgl${u}" cx="50%" cy="32%" r="55%"><stop offset="0%" stop-color="${alpha(glow, 0.32)}"/><stop offset="100%" stop-color="${alpha(glow, 0)}"/></radialGradient></defs>`;
    if (!opts.plainBg) f = `<rect width="${VB_W}" height="${VB_H}" fill="url(#dg${u})"/><ellipse cx="60" cy="70" rx="62" ry="66" fill="url(#dgl${u})"/>` + f;
    return wrap(u, VB_W, VB_H, size, defs + f, 'av-doll');
  }

  // the scene: the character standing in a lit part of town
  function scene(s, size, mood) {
    size = size || 300;
    const r = resolve(s);
    const u = r.u;
    const M = mood || {};
    const sky1 = M.sky1 || '#111a2a', sky2 = M.sky2 || '#2a2233';
    const ground = M.ground || '#0d0f14';
    const haze = M.haze || (r.acc.k === 'none' ? shade(r.top.c, 0.4) : r.acc.c);
    const W = 200, H = 220;
    let f = '';
    f += `<rect width="${W}" height="${H}" fill="url(#sky${u})"/>`;
    f += `<circle cx="146" cy="58" r="26" fill="${alpha(haze, 0.45)}"/>`;
    f += `<circle cx="146" cy="58" r="15" fill="${alpha(shade(haze, 0.4), 0.7)}"/>`;
    let seed = hash(String(s) + 'sky'), x = -6;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 1000) / 1000; };
    while (x < W + 10) {
      const bw = 12 + rnd() * 20, bh = 30 + rnd() * 70;
      f += `<rect x="${x.toFixed(1)}" y="${(178 - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${shade(sky1, -0.2)}"/>`;
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 3; wx++) {
        if (rnd() > 0.62) f += `<rect x="${(x + 3 + wx * (bw / 3)).toFixed(1)}" y="${(182 - bh + 6 + wy * 12).toFixed(1)}" width="${(bw / 5).toFixed(1)}" height="4" fill="${alpha('#e5b95e', 0.3 + rnd() * 0.45)}"/>`;
      }
      x += bw + 3;
    }
    f += `<rect y="150" width="${W}" height="34" fill="${alpha(haze, 0.14)}"/>`;
    f += `<rect y="178" width="${W}" height="${H - 178}" fill="${ground}"/>`;
    f += `<rect y="178" width="${W}" height="3" fill="${alpha('#e5b95e', 0.2)}"/>`;
    f += `<g><rect x="24" y="86" width="4" height="92" fill="#1a1c22"/><path d="M 15 88 L 37 88 L 33 62 L 19 62 Z" fill="#1a1c22"/>
      <ellipse cx="26" cy="64" rx="8" ry="5" fill="${alpha('#f0d79a', 0.85)}"/>
      <path d="M 26 66 L 8 176 L 46 176 Z" fill="${alpha('#f0d79a', 0.11)}"/></g>`;
    f += `<ellipse cx="70" cy="203" rx="34" ry="5" fill="${alpha('#7fa6cc', 0.12)}"/>`;
    f += `<ellipse cx="150" cy="196" rx="22" ry="3.4" fill="${alpha('#7fa6cc', 0.09)}"/>`;
    // the citizen, mid-ground, feet on the pavement
    const hair = hairParts(r);
    f += `<g transform="translate(112 100) scale(0.52) translate(-60 -252)">`;
    f += `<g transform="translate(60 44) scale(1.3)">${hair.back}</g>`;
    f += `<g transform="translate(60 0)">${figureSvg(r)}</g>`;
    f += `<g transform="translate(60 44) scale(1.3)">`;
    f += `<path d="M -7.6 22 C -8.6 32 -9 37 -10 41 L 10 41 C 9 37 8.6 32 7.6 22 Z" fill="url(#skn${u})"/>`;
    f += headSvg(r, { mode: 'doll' });
    f += `</g></g>`;
    f += `<path d="M 112 226 C 130 220 168 220 190 226" stroke="${alpha('#000000', 0.3)}" stroke-width="3" fill="none"/>`;
    f += `<rect width="${W}" height="${H}" fill="url(#vig${u})"/>`;
    const defs = defsFor(r, { glow: haze }) +
      `<defs><linearGradient id="sky${u}" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0%" stop-color="${sky1}"/><stop offset="100%" stop-color="${sky2}"/></linearGradient>
        <radialGradient id="vig${u}" cx="50%" cy="50%" r="72%"><stop offset="52%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.72"/></radialGradient></defs>`;
    return wrap(u, W, H, size, defs + f, 'av-scene');
  }

  function mugshot(s, size, name) {
    size = size || 120;
    const r = resolve(s);
    const inner = svgFor(s, 120).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const no = 100000 + (hash(String(s) + (name || '')) % 899999);
    let grid = '';
    for (let y = 18; y <= 116; y += 9) grid += `<path d="M6 ${y} H114" stroke="#aeb6c2" stroke-width=".4" opacity="0.3"/>`;
    for (let x = 6; x <= 114; x += 8) grid += `<path d="M${x} 18 v3" stroke="#aeb6c2" stroke-width=".7" opacity="0.5"/>`;
    const nm = String(name || 'DETAINED').toUpperCase().slice(0, 18);
    const body = `
      <rect width="120" height="140" fill="#101216"/>
      <g>${inner}</g>
      ${grid}
      <rect x="0" y="0" width="120" height="13" fill="rgba(0,0,0,.62)"/>
      <text x="6" y="9.4" font-family="monospace" font-size="7" fill="#cfd6e2" letter-spacing="1.3">RTPD&#160;&#160;${no}</text>
      <rect x="0" y="124" width="120" height="16" fill="#e8e4d8"/>
      <rect x="0" y="124" width="3" height="16" fill="#9c3228"/>
      <text x="8" y="135.4" font-family="sans-serif" font-size="8" font-weight="700" fill="#23231f" letter-spacing=".5">${nm}</text>
      <text x="114" y="135.4" text-anchor="end" font-family="monospace" font-size="7" fill="#6b675c">HOLD</text>`;
    return wrap(r.u, 120, 140, size, body, 'av-mug');
  }

  function banner(s, size, name, sub) {
    size = size || 480;
    const r = resolve(s);
    const u = r.u;
    const W = 480, H = 120;
    const glow = r.acc.k === 'none' ? shade(r.top.c, 0.4) : r.acc.c;
    const inner = svgFor(s, 112).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const nm = String(name || 'CITIZEN').toUpperCase().slice(0, 20);
    let streaks = '';
    for (let i = 0; i < 9; i++) streaks += `<path d="M ${20 + i * 55} 118 C ${26 + i * 54} 96 ${14 + i * 56} 84 ${20 + i * 55} 60" stroke="${alpha('#ffffff', 0.035 + i * 0.006)}" stroke-width="${7 + (i % 3) * 4}" fill="none"/>`;
    const body = `
      <rect width="${W}" height="${H}" fill="url(#bg${u})"/>
      <g opacity="0.9">${streaks}</g>
      <path d="M0 98 C 90 84 150 102 240 94 C 330 86 400 102 480 90 L480 120 L0 120 Z" fill="${alpha('#000000', 0.32)}"/>
      <g transform="translate(4 0) scale(0.94)">${inner}</g>
      <g transform="translate(122 0)">
        <text x="8" y="54" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#f0e6d2" letter-spacing="2">${nm}</text>
        <text x="10" y="74" font-family="monospace" font-size="12" fill="${alpha(glow, 0.95)}" letter-spacing="2.4">${String(sub || '').toUpperCase().slice(0, 46)}</text>
        <path d="M8 84 H${Math.min(W - 24, 200 + nm.length * 13)}" stroke="${alpha(glow, 0.55)}" stroke-width="2"/>
      </g>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#vig${u})"/>`;
    const defs = defsFor(r, { glow }) +
      `<defs><linearGradient id="bg${u}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="${shade(glow, -0.86)}"/><stop offset="70%" stop-color="#0c0e13"/><stop offset="100%" stop-color="#08090c"/></linearGradient>
        <radialGradient id="vig${u}" cx="40%" cy="50%" r="75%"><stop offset="55%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.55"/></radialGradient></defs>`;
    return wrap(u, W, H, size, defs + body, 'av-banner');
  }

  // ------------------------------------------------------------------ helpers for the UI
  function wear(str) {
    const p = parts(str);
    return [
      { slot: 'Build', icon: '🧍', value: BODIES[p.body].n },
      { slot: 'Skin', icon: '🎨', value: SKIN_NAMES[p.skin] },
      { slot: 'Face', icon: '🧑', value: FACE_FEAT[p.face].n },
      { slot: 'Eyes', icon: '👁️', value: EYE_NAMES[p.eyes] },
      { slot: 'Hair / hat', icon: '💇', value: HAIRS[p.hair].n },
      { slot: 'Facial hair', icon: '🧔', value: FACIALS[p.facial].n },
      { slot: 'Clothing', icon: '🧥', value: SHIRTS[p.shirt].n },
      { slot: 'Trinket', icon: '💎', value: ACCENTS[p.accent].n }
    ];
  }
  function nameOf(kind, i) {
    const t = { skin: SKIN_NAMES, hair: HAIRS.map(h => h.n), shirt: SHIRTS.map(s => s.n), accent: ACCENTS.map(a => a.n),
      face: FACE_FEAT.map(f => f.n), body: BODIES.map(b => b.n), eyes: EYE_NAMES, facial: FACIALS.map(f => f.n) };
    return ((t[kind] || [])[i]) || '';
  }
  function random(seed) {
    let h = (seed == null ? Date.now() : seed) | 0;
    const nx = (n) => { h = (h * 48271) % 2147483647; return Math.abs(h) % n; };
    const body = nx(BODIES.length);
    const fem = BODIES[body].sex === 1;
    const faces = FACE_FEAT.map((f, i) => i).filter(i => fem ? true : !(FACE_FEAT[i].lashes && FACE_FEAT[i].rouge));
    const facial = fem && nx(3) === 0 ? 0 : nx(FACIALS.length);
    return joinParts({ skin: nx(SKINS.length), face: faces[nx(faces.length)], hair: nx(HAIRS.length), shirt: nx(SHIRTS.length),
      accent: nx(ACCENTS.length), body, eyes: nx(EYES.length), facial });
  }
  function catalogCount() {
    return SKINS.length * FACE_FEAT.length * HAIRS.length * SHIRTS.length * ACCENTS.length * BODIES.length * EYES.length * FACIALS.length;
  }

  ROOT.AV = {
    svgFor, doll, scene, mugshot, banner, wear, parts, joinParts, nameOf, random, catalogCount, resolve,
    SKINS, SKIN_NAMES, EYES, EYE_NAMES, FACE_FEAT, FACIALS, HAIRS, SHIRTS,
    SHIRT_NAMES: SHIRTS.map(s => s.n), SHIRT_STYLE: SHIRTS.map(s => s.k),
    SHIRTS_FULL: SHIRTS, ACCENTS: ACCENT_COLORS, ACCENT_FULL: ACCENTS, ACCENT_NAMES: ACCENTS.map(a => a.n),
    BODIES: BODIES.map(b => b.n), BODY_FULL: BODIES,
    TOTALS: { skin: SKINS.length, face: FACE_FEAT.length, hair: HAIRS.length, shirt: SHIRTS.length,
      accent: ACCENTS.length, body: BODIES.length, eyes: EYES.length, facial: FACIALS.length },
    svgDataUri: (s, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)),
    dollDataUri: (s, size, opts) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size, opts))
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ROOT.AV;
})();
