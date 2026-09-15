// Razor Town — character art (2026 "older rugged" overhaul).
// One renderer family built from a 6-part avatar spec: "skin|face|hair|top|accent|body"
//   body = 0 -> masculine build, body = 1 -> feminine build
//   AV.svgFor(spec, size)      square bust portrait (lists, header, chat, mugshot)
//   AV.doll(spec, size, opts)  full-length character model with trousers + boots
// Look & feel: head-and-torso square portraits, beards/moustaches/grey hair, a
// flat-cap moustache default and an older, weathered wardrobe. The layout grammar is
// Torn-like; every line of art here is original vector work — no third-party sprites.
(function () {
  'use strict';

  // ------------------------------------------------------------------ palette helpers
  function hex(s) { s = String(s).replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
  function rgbStr(a) { return '#' + a.map(v => { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(hexc, amt) { const a = hex(hexc); const t = amt < 0 ? 0 : 255; const p = Math.abs(amt); return rgbStr(a.map(v => Math.round((t - v) * p + v))); }
  function mix(hex1, hex2, t) { const a = hex(hex1), b = hex(hex2); return rgbStr(a.map((v, i) => Math.round(v + (b[i] - v) * t))); }

  // ------------------------------------------------------------------ catalogue
  const SKINS = ['#d9a878', '#c68b5f', '#a96d45', '#7d4e2f', '#e0bd9a',
                 '#b97a4c', '#8f5c39', '#efd8ba', '#5e3a22'];
  const SKIN_NAMES = ['Sun-weathered', 'Ruddy', 'Olive', 'Deep brown', 'Pale', 'Bronzed', 'Umber', 'Ivory', 'Ebony'];

  // hair entry: { t: shape, c: colour, cap: headwear, hc: hair under headwear, g: grey streak, f: feminine-leaning }
  const HAIRS = [
    { t: 'buzz',      c: '#151312',                                     n: 'Buzzed short' },
    { t: 'grown',     c: '#2b1d11',                                     n: 'Grown out, swept' },
    { t: 'part',      c: '#141210',                                     n: 'Brilliantine side part' },
    { t: 'combover',  c: '#5a4d43', g: '#8d857c',                       n: 'Comb-over, thinning' },
    { t: 'thinning',  c: '#6b6157',                                     n: 'Thinning crown' },
    { t: 'sidepart',  c: '#111011',                                     n: 'Sharp side part' },
    { t: 'slick',     c: '#191613',                                     n: 'Slicked back, receding' },
    { t: 'greystone', c: '#16130f', g: '#6f665c',                       n: 'Salt-and-pepper' },
    { t: 'flatcap',   cap: 'flat',    c: '#6d4a2b', hc: '#241a10',      n: 'Tweed flat cap' },
    { t: 'newsboy',   cap: 'newsboy', c: '#26221d', hc: '#171310',      n: 'Newsboy cap' },
    { t: 'bowler',    cap: 'bowler',  c: '#1d1c1e', hc: '#141210',      n: 'Bowler hat' },
    { t: 'fedora',    cap: 'fedora',  c: '#5f5c55', hc: '#2a2118',      n: 'Grey fedora' },
    { t: 'beanie',    cap: 'beanie',  c: '#2b3542', hc: '#171310',      n: 'Dark woollen beanie' },
    { t: 'golfcap',   cap: 'golf',    c: '#a88a58', hc: '#3a2a16',      n: 'Tan flat cap' },
    { t: 'bald',      c: '#4a4038',                                     n: 'Shaven clean' },
    { t: 'horseshoe', c: '#a4a09a',                                     n: 'Grey horseshoe' },
    { t: 'greyneat',  c: '#7d7871',                                     n: 'Grey, neatly cut' },
    { t: 'whitefull', c: '#cfcbc4',                                     n: 'Full head, silver' },
    { t: 'longm',     c: '#20160f',                                     n: 'Shoulder-length, dark' },
    { t: 'greylong',  c: '#9a948c',                                     n: 'Long grey locks' },
    { t: 'topknot',   c: '#171310',                                     n: 'Top-knot' },
    { t: 'longw',     c: '#2a1c10',  f: 1,                              n: 'Long dark waves' },
    { t: 'greylongw', c: '#9a948c',  f: 1,                              n: 'Long grey waves' },
    { t: 'bob',       c: '#2e2016',  f: 1,                              n: 'Bob, side sweep' },
    { t: 'updo',      c: '#6f5a3e',  f: 1,                              n: 'Rolled updo' }
  ];

  // tops: { c: colour, s: coat cut, l: layer colour (shirt/cravat under coat), f: feminine cut, n: name }
  const SHIRTS = [
    { c: '#3a3128', l: '#e3ddcf', s: 'overcoat',      n: 'Heavy brown overcoat' },
    { c: '#23201b', l: '#20222a', s: 'greatcoat',     n: 'Black greatcoat, dark cravat' },
    { c: '#59473a', l: '#e3ddcf', s: 'overcoat',      n: 'Worn moleskin overcoat' },
    { c: '#343a40', l: '#1f2a35', s: 'greatcoat',     n: 'Smoke-grey greatcoat' },
    { c: '#4f3f2c', l: '#2c2417', s: 'workcoat',      n: 'Canvas work coat' },
    { c: '#2c2e38', l: '#e3ddcf', s: 'longweek',      n: 'Tailored black frock coat' },
    { c: '#65523e', l: '#3a2f22', s: 'duster',        n: 'Split canvas duster' },
    { c: '#1b1b1e', l: '#54321f', s: 'duffel',        n: 'Charcoal duffel coat' },
    { c: '#3f5a4a', l: '#e3ddcf', s: 'frock',         n: 'Green banker\u2019s frock' },
    { c: '#41403c', l: '#2a2a26', s: 'peacoat',       n: 'Double-breasted peacoat' },
    // ---- feminine cuts
    { c: '#5c4a3a', l: '#e8e0d0', s: 'ladycoat', f: 1, n: 'Tailored lady\u2019s coat' },
    { c: '#2e2530', l: '#e8e0d0', s: 'longcoatf', f: 1, n: 'Long plum coat' },
    { c: '#3a4a52', l: '#e8e0d0', s: 'wrapcoat', f: 1,  n: 'Slate wrap coat' },
    { c: '#566046', l: '#f0ead8', s: 'ladycoat', f: 1, n: 'Bottle-green coat' }
  ];
  const SHIRT_NAMES = SHIRTS.map(x => x.n);
  const SHIRT_STYLE = SHIRTS.map(x => x.s);

  // faces: sex 0 = masculine, 1 = feminine. bearded/stubbled/creased/etc.
  const FACE_FEAT = [
    { n: 'Clean-shaven, square jaw',  sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat' },
    { n: 'Pencil-thin moustache',     sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', mstache: 'pencil' },
    { n: 'Weathered, smile lines',    sex: 0, eye: 'open',   eyeC: '#4a3a22', brow: 0, nose: 'straight', mouth: 'smile', wrinkle: 1 },
    { n: 'Heavy-lidded sceptic',      sex: 0, eye: 'halflid', eyeC: '#2f2514', brow: 1, nose: 'straight', mouth: 'flat' },
    { n: 'Permanent scowl',           sex: 0, eye: 'line',   eyeC: '#241c10', brow: 2, nose: 'bent', mouth: 'frown' },
    { n: 'Five o\u2019clock shadow',  sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', stubble: true },
    { n: 'Full dark beard',           sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', beard: 2 },
    { n: 'Tight charcoal beard',      sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', beard: 2, beardC: '#56504a' },
    { n: 'Handlebar moustache',       sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', mstache: 'handlebar' },
    { n: 'Wild grey beard, battered nose', sex: 0, eye: 'halflid', eyeC: '#37302a', brow: 1, nose: 'bent', mouth: 'frown', beard: 3, beardC: '#b9b4ab', wrinkle: 3 },
    { n: 'Mutton chops, shaved chin', sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', chops: true },
    { n: 'Battle scarred, white',     sex: 0, eye: 'line',   eyeC: '#332b22', brow: 2, nose: 'bent', mouth: 'frown', beard: 2, beardC: '#e8e4dc', scar: true, wrinkle: 2 },
    { n: 'Long grey beard',           sex: 0, eye: 'halflid', eyeC: '#3c342a', brow: 0, nose: 'straight', mouth: 'flat', beard: 4, beardC: '#cfcbc2', wrinkle: 2 },
    { n: 'Kind eyes, crow\u2019s feet', sex: 0, eye: 'open',  eyeC: '#5a6b52', brow: 0, nose: 'straight', mouth: 'smile', wrinkle: 1 },
    { n: 'Clean-shaven youth',        sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'smile' },
    { n: 'Lines round the eyes',      sex: 0, eye: 'open',   eyeC: '#2f2514', brow: 0, nose: 'straight', mouth: 'flat', wrinkle: 1 },
    { n: 'Heavy jaw, no nonsense',    sex: 0, eye: 'line',   eyeC: '#241c10', brow: 2, nose: 'straight', mouth: 'frown' },
    // ---- feminine faces
    { n: 'Soft eyes, light lashes',   sex: 1, eye: 'open',   eyeC: '#7a4f2a', brow: 0, nose: 'straight', mouth: 'smile', lashes: true, rouge: true },
    { n: 'Sharp liner',               sex: 1, eye: 'open',   eyeC: '#2a2014', brow: 1, nose: 'straight', mouth: 'flat', lashes: true },
    { n: 'Warm, weathered smile',     sex: 1, eye: 'open',   eyeC: '#4a3a22', brow: 0, nose: 'straight', mouth: 'smile', wrinkle: 1 },
    { n: 'Cool grey eyes',            sex: 1, eye: 'open',   eyeC: '#6a7480', brow: 0, nose: 'straight', mouth: 'flat', lashes: true },
    { n: 'Tired eyes, knowing',       sex: 1, eye: 'halflid', eyeC: '#3a2c1a', brow: 1, nose: 'straight', mouth: 'frown', wrinkle: 2 }
  ];

  // accents: index-stable. { k: kind, c: colour, n: name }
  const ACCENTS = [
    { k: 'cravat', c: '#8f2f28', n: 'Wine silk cravat' },
    { k: 'watch',  c: '#c9a24b', n: 'Gold watch chain' },
    { k: 'bouton', c: '#5f7d5e', n: 'Fresh carnation' },
    { k: 'pin',    c: '#c8cdd4', n: 'Steel tie pin' },
    { k: 'cuffs',  c: '#c8cdd4', n: 'Ivory cufflinks' },
    { k: 'cigar',  c: '#3a2a1a', n: 'Unlit cigar' },
    { k: 'pipe',   c: '#2a2015', n: 'Bent briar pipe' },
    { k: 'specs',  c: '#8a8d91', n: 'Round wire spectacles' }
  ];
  const ACCENT_COLORS = ACCENTS.map(x => x.c);
  const ACCENT_NAMES = ACCENTS.map(x => x.n);

  // garment metadata for the equipment sheet (driven by the top's cut)
  const GARMENT = {
    overcoat: { bottom: 'Pressed wool trousers', shoes: 'Cap-toe boots' },
    greatcoat: { bottom: 'Dark serge trousers', shoes: 'Heavy brogues' },
    workcoat: { bottom: 'Canvas breeks', shoes: 'Work boots' },
    longweek: { bottom: 'Pin-stripe trousers', shoes: 'Polished oxfords' },
    duster: { bottom: 'Worn denim trousers', shoes: 'Riding boots' },
    duffel: { bottom: 'Cord trousers', shoes: 'Stout boots' },
    frock: { bottom: 'Tapered trousers', shoes: 'Button boots' },
    peacoat: { bottom: 'Sailor\u2019s whites', shoes: 'Deck shoes' },
    ladycoat: { bottom: 'Long pleated skirt', shoes: 'Heeled court shoes' },
    longcoatf: { bottom: 'Long narrow skirt', shoes: 'Heeled boots' },
    wrapcoat: { bottom: 'Wrap skirt', shoes: 'Low heels' }
  };

  const BODIES = ['Masculine build', 'Feminine build'];

  // ------------------------------------------------------------------ spec parsing
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
  function	isFem(p) { return p.body === 1; }
  function hash(s) { s = String(s == null ? '' : s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); }
  function hashInt(s) { s = String(s == null ? '' : s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // What the character is actually wearing — every line comes from a real creator choice.
  function wear(s) {
    const p = parts(s);
    const h = HAIRS[p.hair];
    const top = SHIRTS[p.shirt];
    const g = GARMENT[top.s] || GARMENT.overcoat;
    const acc = ACCENTS[p.accent];
    const fem = isFem(p);
    const headIcon = h.cap ? '🎩' : (h.t === 'bald' || h.t === 'horseshoe') ? '🪒' : (h.f ? '💁\u200d\u2640' : '💇\u200d\u2642');
    return [
      { slot: 'Headwear', icon: headIcon, value: h.n },
      { slot: 'Top', icon: fem ? '🧥' : '🧥', value: top.n },
      { slot: 'Bottoms', icon: '👖', value: g.bottom },
      { slot: 'Feet', icon: '👞', value: g.shoes },
      { slot: 'Face', icon: '\uD83D\uDC68\u200D\uD83E\uDDB0', value: FACE_FEAT[p.face].n },
      { slot: 'Build', icon: fem ? '\u2640' : '\u2642', value: BODIES[p.body] },
      { slot: 'Trinket', icon: '🕰', value: acc.n }
    ];
  }

  // ------------------------------------------------------------------ shared <defs>
  function defsGrad(u, skin, coat) {
    const coatL = shade(coat, 0.1), coatD = shade(coat, -0.3);
    return `<defs>
      <radialGradient id="sk${u}" cx="42%" cy="34%" r="75%">
        <stop offset="0%" stop-color="${shade(skin, 0.09)}"/><stop offset="66%" stop-color="${skin}"/><stop offset="100%" stop-color="${shade(skin, -0.17)}"/>
      </radialGradient>
      <linearGradient id="ct${u}" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0%" stop-color="${coatL}"/><stop offset="55%" stop-color="${coat}"/><stop offset="100%" stop-color="${coatD}"/>
      </linearGradient>
      <linearGradient id="hd${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(skin, 0.14)}"/><stop offset="45%" stop-color="${skin}"/><stop offset="100%" stop-color="${shade(skin, -0.12)}"/>
      </linearGradient>
    </defs>`;
  }

  // ------------------------------------------------------------------ HEAD
  // head is drawn in a unit space centred on (0,0): dome top -36, chin +28, span +-30.
  function headMask() {
    return 'M -29.5 -10 Q -31 -34 0 -36 Q 31 -34 29.5 -10 ' +
           'Q 27.5 6 22 15 Q 16.5 23 9 26.5 Q 4 28 0 28 Q -4 28 -9 26.5 ' +
           'Q -16.5 23 -22 15 Q -27.5 6 -29.5 -10 Z';
  }
  function faceG(hair, feat, aIdx, acc, skin, u) {
    const hc = effHaircC(feat, hair);
    const browc = shade(hc, 0.55);
    const eyeC = feat.eyeC || '#2f2514';
    const white = '#e7e1d2';
    const line = 'rgba(24,18,12,.55)';
    const S = 1;
    let f = '';

    // head silhouette — fills like the classic "person in a frame" profile
    f += `<path d="${headMask()}" fill="url(#hd${u})"/>`;

    // temple shading — makes the skull read 3D
    f += `<path d="M -30 -14 Q -24 -26 -16 -30 Q -20 -22 -21 -12 Q -23 -4 -22 5 Q -24 -4 -26 -8 Q -29 -10 -30 -14 Z" fill="#000" opacity=".05"/>`;
    f += `<path d="M 30 -14 Q 24 -26 16 -30 Q 20 -22 21 -12 Q 23 -4 22 5 Q 24 -4 26 -8 Q 29 -10 30 -14 Z" fill="#000" opacity=".05"/>`;
    // ears (draw under hair; wide, grown-up)
    for (const sx of [-1, 1]) {
      f += `<path d="M ${sx * 29.5} -4 Q ${sx * 33} 1 ${sx * 32.5} 8 Q ${sx * 33.4} 13 ${sx * 29} 11 Q ${sx * 30.6} 4 ${sx * 29.5} -4 Z" fill="url(#sk${u})"/>`;
      f += `<path d="M ${sx * 31} 2 Q ${sx * 32} 5 ${sx * 31.6} 8.4" stroke="${shade(skin, -0.3)}" stroke-width="1" fill="none" opacity=".5" stroke-linecap="round"/>`;
    }

    // brow ridge shadow + cheek/jowl shading for older faces
    f += `<path d="M -21 -9 Q 0 0 21 -9 Q 21 -5 0 -4 Q -21 -5 -21 -9 Z" fill="#000" opacity=".07"/>`;
    if (feat.wrinkle >= 2) {
      f += `<path d="M -20 10 Q -16 13 -11 13.4" stroke="${shade(skin, -0.24)}" stroke-width="1.1" fill="none" opacity=".45" stroke-linecap="round"/>`;
      f += `<path d="M 20 10 Q 16 13 11 13.4" stroke="${shade(skin, -0.24)}" stroke-width="1.1" fill="none" opacity=".45" stroke-linecap="round"/>`;
    }
    if (feat.wrinkle >= 1) {
      f += `<path d="M -20 15 Q -17 17.6 -13 18" stroke="${shade(skin, -0.2)}" stroke-width=".9" fill="none" opacity=".4" stroke-linecap="round"/>`;
      f += `<path d="M 20 15 Q 17 17.6 13 18" stroke="${shade(skin, -0.2)}" stroke-width=".9" fill="none" opacity=".4" stroke-linecap="round"/>`;
    }

    // nose
    if (feat.nose === 'bent') {
      f += `<path d="M -0.6 0 L -1.6 9 Q -0.4 12.4 2.2 11.8" stroke="${shade(skin, -0.22)}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>`;
      f += `<path d="M 1.6 7.6 L 2.6 12.6" stroke="${shade(skin, -0.22)}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/>`;
    } else {
      f += `<path d="M -0.4 -0.5 L -1.2 10.6 Q -0.7 12.4 1.2 11.8" stroke="${shade(skin, -0.22)}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }
    f += `<ellipse cx="-2.6" cy="12.2" rx="1.2" ry="0.8" fill="${shade(skin, -0.32)}" opacity=".55"/><ellipse cx="2.8" cy="12.2" rx="1.2" ry="0.8" fill="${shade(skin, -0.32)}" opacity=".55"/>`;

    // brow ridges
    const bw = feat.brow === 1 ? 3.2 : feat.brow === 2 ? 3.8 : (feat.sex === 1 ? 2.4 : 3);
    if (feat.brow === 0) {
      f += `<path d="M -8.5 -10.6 Q 0 -12.8 8.5 -10.4" stroke="${browc}" stroke-width="${bw}" fill="none" stroke-linecap="round" opacity=".9"/>`;
      f += `<path d="M -8.5 -10.6 Q 0 -12.8 8.5 -10.4" stroke="${browc}" stroke-width="${bw}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    } else if (feat.brow === 1) {
      f += `<path d="M -9 -9.4 Q 0 -12.2 9 -9.2" stroke="${browc}" stroke-width="${bw}" fill="none" stroke-linecap="round" opacity=".9"/>`;
      f += `<path d="M -9 -9.4 L -9 -8.4 M 9 -9.2 L 9 -8.2" stroke="${browc}" stroke-width="${bw}" opacity=".85" stroke-linecap="round"/>`;
    } else {
      f += `<path d="M -9 -11.8 Q 0 -9.4 9 -11.8" stroke="${browc}" stroke-width="${bw + 0.6}" fill="none" stroke-linecap="round" opacity=".9"/>`;
      f += `<path d="M -6 -11 Q 0 -10.4 6 -11" stroke="${shade(skin, -0.1)}" stroke-width="1" fill="none" opacity=".5"/>`;
    }

    // eyes
    const exL = -10.5, exR = 10.5, ey = -1;
    for (const [ex, sx] of [[exL, -1], [exR, 1]]) {
      // socket shading
      f += `<ellipse cx="${ex}" cy="${ey}" rx="6.4" ry="4.6" fill="#000" opacity=".07"/>`;
      if (feat.eye === 'line') {
        f += `<path d="M ${ex - 5.4} ${ey + 0.4} Q ${ex} ${ey + 2.2} ${ex + 5.4} ${ey + 0.6}" stroke="#1c150c" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>`;
        f += `<path d="M ${ex - 4.6} ${ey + 2.8} Q ${ex} ${ey + 4.4} ${ex + 4.6} ${ey + 3}" stroke="${shade(skin, -0.28)}" stroke-width="1" fill="none" opacity=".5" stroke-linecap="round"/>`;
      } else {
        const open = feat.eye === 'open';
        const H = open ? -3.5 : -2.6;
        f += `<path d="M ${ex - 5.6} ${ey} Q ${ex} ${ey + H} ${ex + 5.6} ${ey} Q ${ex} ${ey + 3.2} ${ex - 5.6} ${ey} Z" fill="${white}" opacity=".96"/>`;
        f += `<circle cx="${ex}" cy="${ey + 0.4}" r="2.7" fill="${eyeC}"/>`;
        f += `<circle cx="${ex}" cy="${ey + 0.5}" r="1.5" fill="#120d07"/>`;
        f += `<circle cx="${ex + 0.9}" cy="${ey - 0.5}" r="0.8" fill="#fff" opacity=".9"/>`;
        // upper lid
        f += `<path d="M ${ex - 5.8} ${ey - 0.2} Q ${ex} ${ey + H - 0.6} ${ex + 5.8} ${ey - 0.2}" stroke="#14100a" stroke-width="1.5" fill="none" opacity=".75"/>`;
        if (!open) {
          // heavy lid drooping over the eye
          f += `<path d="M ${ex - 6.6} ${ey - 1.4} L ${ex + 6.6} ${ey - 1.4} L ${ex + 6} ${ey - 4.6} Q ${ex} ${ey - 6.6} ${ex - 6} ${ey - 4.6} Z" fill="${shade(skin, -0.04)}" opacity=".98"/>`;
          f += `<path d="M ${ex - 6.4} ${ey - 1.4} Q ${ex} ${ey - 0.1} ${ex + 6.4} ${ey - 1.4}" stroke="#14100a" stroke-width="1.5" fill="none" opacity=".8"/>`;
        } else {
          // under-eye bag shadows for older faces
          if (feat.wrinkle >= 1) f += `<path d="M ${ex - 5.2} ${ey + 3.6} Q ${ex} ${ey + 4.6} ${ex + 5.2} ${ey + 3.6}" stroke="${shade(skin, -0.26)}" stroke-width="1.1" fill="none" opacity=".55"/>`;
        }
        if (feat.lashes) { for (let i = -1; i <= 1; i++) f += `<path d="M ${ex + sx * 5} ${ey - 1 + i * 1.6} l ${sx * 2.4} -1.6" stroke="#0e0a06" stroke-width="1" stroke-linecap="round" opacity=".9"/>`; }
      }
      // crow's feet
      if (feat.wrinkle >= 1) for (let i = -1; i <= 1; i++) f += `<path d="M ${ex + sx * 6} ${ey + i * 1.7} l ${sx * 3.2} ${i * 1.2}" stroke="${shade(skin, -0.22)}" stroke-width=".7" fill="none" opacity=".5" stroke-linecap="round"/>`;
    }

    // spectacles (accent 7) drawn over the nose, under the eyes
    if (acc.k === 'specs') {
      f += `<g stroke="${acc.c}" stroke-width="1.3" fill="none" opacity=".92">`;
      for (const sx of [-1, 1]) f += `<circle cx="${sx * 10.5}" cy="-1" r="5.4" fill="#fff" fill-opacity=".05"/>`;
      f += `<path d="M -5.1 -1 Q 0 0.6 5.1 -1"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 5.4} -1 L ${sx * 29} -7"/>`;
      f += `</g>`;
    }

    // mouth
    const my = 16;
    const mouthy = feat.mouth === 'smile' ? 0.4 : feat.mouth === 'frown' ? 2.4 : 1.2;
    if (feat.mouth === 'frown') {
      f += `<path d="M -5.6 ${my + 1.4} Q 0 ${my - 1.6} 5.6 ${my + 1.4}" stroke="#4a2c20" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".85"/>`;
      f += `<path d="M -6.6 ${my + 2.8} Q 0 ${my - 0.2} 6.6 ${my + 2.8}" stroke="${shade(skin, -0.26)}" stroke-width="1" fill="none" opacity=".4"/>`;
    } else if (feat.mouth === 'smile') {
      f += `<path d="M -6.2 ${my - 0.4} Q 0 ${my + 3.2} 6.2 ${my - 0.4}" stroke="#5a3222" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".85"/>`;
      if (feat.wrinkle >= 1) { f += `<path d="M -7.4 ${my - 0.2} Q -8.2 ${my + 1} -7.6 ${my + 2}" stroke="${shade(skin, -0.2)}" stroke-width=".8" fill="none" opacity=".5" stroke-linecap="round"/><path d="M 7.4 ${my - 0.2} Q 8.2 ${my + 1} 7.6 ${my + 2}" stroke="${shade(skin, -0.2)}" stroke-width=".8" fill="none" opacity=".5" stroke-linecap="round"/>`; }
    } else {
      f += `<path d="M -5 ${my + 0.6} Q 0 ${my + 1.4} 5 ${my + 0.8}" stroke="#4a2c20" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".8"/>`;
    }
    if (feat.cleft) f += `<path d="M -1.4 ${my + 3.4} Q 0 ${my + 4} 1.4 ${my + 3.4}" stroke="${shade(skin, -0.3)}" stroke-width="1" fill="none" opacity=".55"/>`;
    if (feat.rouge) for (const sx of [-1, 1]) f += `<ellipse cx="${sx * 11}" cy="${ey + 10}" rx="4" ry="2.6" fill="#c9665a" opacity=".18"/>`;

    // pipe (accent 6) held in the mouth
    if (acc.k === 'pipe') {
      f += `<path d="M 4.6 ${my - 2.6} L 12 ${my + 1.6}" stroke="#1c1208" stroke-width="1.6" stroke-linecap="round"/>`;
      f += `<path d="M 11.4 ${my + 2.2} L 14.4 ${my + 4.6} Q 14 ${my + 6.4} 11.6 ${my + 6} Q 10 ${my + 5.2} 10.6 ${my + 3.6} Z" fill="#3a2a1a"/>`;
      f += `<path d="M 13 ${my + 4.8} l 2 2.2 l 2.6 -0.8 q -1.4 2.2 -4.4 0.6 Z" fill="#1c1208"/>`;
    }

    // facial hair
    f += hairFaceSVG(feat, hc, skin, my);

    // scar
    if (feat.scar) {
      f += `<path d="M 6 -6 L 13 2" stroke="${shade(skin, 0.12)}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>`;
      f += `<path d="M 7.6 -3.4 l 2.6 0.6 M 9.2 -0.8 l 2.6 0.6" stroke="${shade(skin, 0.12)}" stroke-width=".7" opacity=".5"/>`;
    }

    return `<g>${f}</g>`;
  }
  function effHaircC(feat, hair) { return hair.g && feat.beardC && feat.beard >= 3 ? mix(hair.c, hair.g, 0.6) : hair.c; }

  // facial hair drawn in unit head space (centred 0,0, chin +28)
  function hairFaceSVG(feat, hc, skin, my) {
    const beard = feat.beard || 0;
    const beardC = feat.beardC || hc;
    const beardD = shade(beardC, -0.16);
    let f = '';
    const mask = 'M -21 -8 Q -24.5 6 -20 13 Q -16 22 -8 27.5 Q -3 29.3 0 29.3 Q 3 29.3 8 27.5 Q 16 22 20 13 Q 24.5 6 21 -8 Q 13 -13.5 7 -14 Q 0 -14.5 -7 -14 Q -13 -13.5 -21 -8 Z';
    if (beard >= 2) {
      if (beard >= 4) {
        // long: extends onto the chest
        f += `<path d="M -19 -8 Q -21 10 -15 24 Q -10 34 -2 50 L 2 50 Q 10 34 15 24 Q 21 10 19 -8 Z" fill="${beardC}"/>`;
        f += `<path d="M -19 -8 Q -21 10 -15 24 M 19 -8 Q 21 10 15 24 M -15 24 Q -10 34 -2 50 M 15 24 Q 10 34 2 50" stroke="${beardD}" stroke-width="1" fill="none" opacity=".55"/>`;
        for (let i = -2; i <= 2; i++) f += `<path d="M ${i * 6} 6 Q ${i * 7} 24 ${i * 4.6} 42" stroke="${shade(beardC, 0.22)}" stroke-width=".8" fill="none" opacity=".4"/>`;
      } else {
        f += `<path d="${mask}" fill="${beardC}"/>`;
        f += `<path d="M -8 27.5 Q 0 30 8 27.5" stroke="${beardD}" stroke-width="1.1" fill="none" opacity=".6"/>`;
        for (let i = -2; i <= 2; i++) f += `<path d="M ${i * 6.5} -2 Q ${i * 7.5} 12 ${i * 5.5} 24" stroke="${shade(beardC, 0.2)}" stroke-width=".9" fill="none" opacity=".45"/>`;
      }
      if (beard === 2) {
        // mouth opening cut into the beard
        f += `<rect x="-6" y="${my - 1}" width="12" height="3" rx="1.5" fill="#3a241a" opacity=".8"/>`;
        f += `<path d="M -4.4 ${my + 0.6} Q 0 ${my + 1.4} 4.4 ${my + 0.8}" stroke="#1c0f08" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
      }
    } else if (beard === 1) {
      f += `<path d="${mask}" fill="${mix(skin, beardC, 0.55)}" opacity=".3"/>`;
    }
    if (feat.stubble) f += `<path d="${mask}" fill="${mix(skin, hc, 0.5)}" opacity=".26"/>`;
    if (feat.chops) for (const sx of [-1, 1]) {
      f += `<path d="M ${sx * 22} -6 Q ${sx * 25} 6 ${sx * 21} 13 Q ${sx * 17} 21 ${sx * 10} 25 L ${sx * 7} 24 Q ${sx * 9} 15 ${sx * 9} 7 Q ${sx * 8} -3 ${sx * 10} -10 Z" fill="${beardC}"/>`;
      f += `<path d="M ${sx * 11} 14 q ${sx * -1} 5 ${sx * -4} 9" stroke="${shade(beardC, 0.28)}" stroke-width=".8" fill="none" opacity=".5"/>`;
    }
    if (feat.mstache === 'pencil') {
      f += `<path d="M -8 ${my - 3} Q 0 ${my - 4.4} 8 ${my - 3}" stroke="${beardC}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".95"/>`;
    } else if (feat.mstache === 'handlebar') {
      f += `<path d="M -8.4 ${my - 2.4} Q -5 ${my - 5} 0 ${my - 3.6} Q 5 ${my - 5} 8.4 ${my - 2.4} Q 10.6 ${my - 0.8} 9.8 ${my - 2.8} Q 11.4 ${my - 2.2} 10.4 ${my - 1} Q 8.2 ${my + 0.8} 6.2 ${my - 1.8} Q 3 ${my - 3} 0 ${my - 2.2} Q -3 ${my - 3} -6.2 ${my - 1.8} Q -8.2 ${my + 0.8} -10.4 ${my - 1} Q -11.4 ${my - 2.2} -9.8 ${my - 2.8} Q -10.6 ${my - 0.8} -8.4 ${my - 2.4} Z" fill="${beardC}"/>`;
    }
    return f;
  }

  // ------------------------------------------------------------------ HAIR & HEADWEAR (unit head space)
  function hairBack(h, k, u) {
    let f = '';
    const c = h.c;
    const long = ['longm', 'greylong', 'longw', 'greylongw'].indexOf(h.t) >= 0;
    if (long) {
      const cd = shade(c, -0.1);
      f += `<path d="M -26 -8 Q -30 16 -24 46 Q -19 62 -9 66 Q -12 40 -13 14 Q -13 -2 -26 -8 Z" fill="${cd}"/>`;
      f += `<path d="M 26 -8 Q 30 16 24 46 Q 19 62 9 66 Q 12 40 13 14 Q 13 -2 26 -8 Z" fill="${cd}"/>`;
      if (h.t === 'longw' || h.t === 'greylongw') for (const sx of [-1, 1])
        f += `<path d="M ${sx * 24} 6 q ${sx * 3} 16 ${sx * 1} 34" stroke="${shade(c, 0.14)}" stroke-width="1.2" fill="none" opacity=".4"/>`;
    } else if (h.t === 'horseshoe') {
      const cd = shade(c, 0.05);
      f += `<path d="M -28 2 Q -30 -18 -18 -27 Q -8 -32 0 -31 L 0 6 Q -12 2 -28 2 Z" fill="${cd}"/>`;
      f += `<path d="M 28 2 Q 30 -18 18 -27 Q 8 -32 0 -31 L 0 6 Q 12 2 28 2 Z" fill="${cd}"/>`;
    }
    return f;
  }

  function hairFront(h, k, u) {
    const c = h.c;
    const cd = shade(c, -0.14), cl = shade(c, 0.16);
    let f = '';
    const t = h.t;

    if (t === 'buzz' || t === 'grown') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 L 29.5 4 Q 22 -7 0 -7 Q -22 -7 -29.5 4 Z" fill="${c}"/>`;
      if (t === 'buzz') f += `<g opacity=".3">${[[-13, -20], [-5, -25], [4, -26], [12, -20]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1" fill="#000"/>`).join('')}</g>`;
      else f += `<path d="M -24 -2 Q 0 -9 24 -2 M -20 -12 Q 0 -19 20 -12" stroke="${cl}" stroke-width="1" fill="none" opacity=".4"/>`;
      // sideburns
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${c}" stroke-width="2" fill="none" opacity=".8" stroke-linecap="round"/>`;
    }
    else if (t === 'part' || t === 'sidepart') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 Q 28 -13 24 -12 L 1 -16 L -7 -10 Q -20 -10 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -4 -9 L 2 -18" stroke="#fff" stroke-width="1.3" fill="none" opacity=".5"/>`;
      f += `<path d="M -26 -12 Q 0 -20 26 -12 M -24 -4 Q 0 -11 24 -4 M -19 0 Q -14 -7 -9 -7" stroke="${cl}" stroke-width="1" fill="none" opacity=".4"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${c}" stroke-width="2" fill="none" opacity=".8" stroke-linecap="round"/>`;
    }
    else if (t === 'combover') {
      f += `<path d="M -29.5 3 L -30 -12 Q -28 -30 -12 -33 Q 2 -35 22 -30 L 24 -8 Q 2 -16 -8 -14 Q -18 -11 -29.5 3 Z" fill="${c}"/>`;
      f += `<path d="M -14 -26 L 22 -26" stroke="${cl}" stroke-width="1" fill="none" opacity=".5"/>`;
      f += `<ellipse cx="6" cy="-28" rx="5" ry="4" fill="${shade(SKINS[4], -0.08)}" opacity=".7"/>`;
    }
    else if (t === 'thinning') {
      f += `<path d="M -26 -30 Q -18 -36 0 -36 Q 20 -36 27 -29 Q 20 -32 12 -32 Q 0 -31 -10 -31 Q -20 -31 -26 -30 Z" fill="${c}"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${c}" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>`;
      f += `<path d="M -12 -31 q 2 -1 4 0 M 4 -31 q 2 -1 4 0" stroke="${cl}" stroke-width=".8" fill="none" opacity=".5"/>`;
    }
    else if (t === 'slick') {
      f += `<path d="M -29 4 L -29.5 -4 Q -29 -24 -8 -28 Q 6 -30 26 -22 L 26 0 Q 0 -10 -12 -9 Q -24 -7 -29 4 Z" fill="${c}"/>`;
      for (let i = -2; i <= 2; i++) f += `<path d="M ${i * 7} -22 Q ${i * 8} -10 ${i * 9} -2" stroke="${cl}" stroke-width=".9" fill="none" opacity=".5"/>`;
    }
    else if (t === 'greystone') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 L 29.5 4 Q 22 -7 0 -7 Q -22 -7 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -26 -8 Q -20 -18 -8 -20 Q 0 -20 12 -16 Q 4 -10 -4 -10 Q -16 -9 -26 -8 Z" fill="${h.g}" opacity=".85"/>`;
      f += `<path d="M -24 -12 Q -12 -18 -4 -18 M 2 -15 Q 10 -15 16 -11" stroke="${shade(h.g, -0.1)}" stroke-width=".9" fill="none" opacity=".5"/>`;
    }
    else if (t === 'bald') {
      f += `<path d="M -8.5 -25 Q -1 -29 7 -26" stroke="#fff" stroke-width="1.4" fill="none" opacity=".18" stroke-linecap="round"/>`;
      f += `<path d="M -29 3 Q -28 -20 -16 -28 Q -8 -32 4 -31 Q -4 -30 -14 -27 Q -24 -21 -26 2 Z" fill="${shade(SKINS[0], 0.05)}" opacity=".9"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${shade(SKINS[0], -0.2)}" stroke-width="1.4" fill="none" opacity=".5" stroke-linecap="round"/>`;
    }
    else if (t === 'horseshoe') {
      f += `<path d="M -29.5 3 L -30 -12 Q -29 -28 -18 -31 Q -8 -33 0 -32 L 0 2 Q -14 -2 -29.5 3 Z" fill="${c}"/>`;
      f += `<path d="M 29.5 3 L 30 -12 Q 29 -28 18 -31 Q 8 -33 0 -32 L 0 2 Q 14 -2 29.5 3 Z" fill="${c}"/>`;
      f += `<path d="M -26 -6 q 8 -4 22 -4 M 26 -6 q -8 -4 -22 -4" stroke="${cl}" stroke-width=".9" fill="none" opacity=".4"/>`;
    }
    else if (t === 'greyneat') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 L 29.5 4 Q 22 -7 0 -7 Q -22 -7 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -22 -8 Q 0 -13 22 -8 M -14 -26 Q 0 -32 14 -26" stroke="${cl}" stroke-width="1" fill="none" opacity=".5"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${c}" stroke-width="2" fill="none" opacity=".8" stroke-linecap="round"/>`;
    }
    else if (t === 'whitefull') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 L 29.5 4 Q 22 -7 0 -7 Q -22 -7 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -24 -16 Q 0 -24 24 -16 M -18 -24 Q 0 -32 18 -24" stroke="#fff" stroke-width="1.1" fill="none" opacity=".35"/>`;
      for (const sx of [-1, 1]) f += `<path d="M ${sx * 29} -2 q ${sx * -1.4} 8 ${sx * -1.2} 14" stroke="${c}" stroke-width="2" fill="none" opacity=".85" stroke-linecap="round"/>`;
    }
    else if (t === 'longm' || t === 'greylong') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 Q 28 -6 24 -6 L 4 -16 L -3 -7 Q -16 -5 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -26 2 Q -29 18 -26 38 M 26 2 Q 29 18 26 38" stroke="${c}" stroke-width="5" fill="none" opacity=".9"/>`;
      f += `<path d="M -24 -14 Q 0 -22 24 -14 M -14 -26 Q 0 -34 14 -26" stroke="${cl}" stroke-width="1" fill="none" opacity=".45"/>`;
    }
    else if (t === 'topknot') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 L 29.5 4 Q 22 -7 0 -7 Q -22 -7 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -2 -34 Q 4 -44 10 -40 Q 12 -38 10 -33" fill="${c}"/>`;
      f += `<path d="M 1 -34 Q 5 -41 9 -38" stroke="${cl}" stroke-width="1.2" fill="none" opacity=".6"/>`;
    }
    else if (t === 'longw' || t === 'greylongw') {
      f += `<path d="M -29.5 4 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 Q 29 2 20 3 L 3 -15 L -5 -6 Q -18 -3 -29.5 4 Z" fill="${c}"/>`;
      f += `<path d="M -15 -16 q 8 -4 18 -2 M -22 -8 q 10 -5 22 -3" stroke="${cl}" stroke-width="1.1" fill="none" opacity=".5"/>`;
    }
    else if (t === 'bob') {
      f += `<path d="M -29.5 3 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 Q 30 8 26 14 Q 20 20 10 20 Q 16 12 16 2 Q 8 -12 0 -12 Q -8 -12 -16 4 Q -19 12 -24 18 Q -28 12 -29.5 3 Z" fill="${c}"/>`;
      f += `<path d="M 18 6 q -3 7 -9 9" stroke="${cl}" stroke-width="1" fill="none" opacity=".5"/>`;
    }
    else if (t === 'updo') {
      f += `<path d="M -29.5 3 L -30 -10 Q -31 -34 0 -36 Q 31 -34 30 -10 Q 29 0 12 1 L -12 1 Q -27 0 -29.5 3 Z" fill="${c}"/>`;
      f += `<path d="M -6 -34 Q 0 -44 8 -36 Q 9 -33 4 -32 Q -2 -36 -6 -34 Z" fill="${shade(c, -0.08)}"/>`;
      f += `<path d="M -16 -8 q 16 -4 32 0" stroke="${cl}" stroke-width="1.1" fill="none" opacity=".5"/>`;
    }

    // headwear drawn over hair
    if (h.cap === 'flat') {
      f += `<path d="M -30 -4 Q -30 -18 -16 -24 Q 0 -29 16 -24 Q 29 -18 29 -5 Q 29 -8 22 -8 Q 10 -9 2 -6 L -2 -6 Q -10 -9 -22 -8 Q -29 -8 -30 -4 Z" fill="${c}"/>`;
      f += `<rect x="-28" y="-6" width="56" height="5" rx="2.5" fill="${cd}"/>`;
      f += `<path d="M -28 -3.4 L 28 -3.4 L 28 8 Q 0 14 -28 8 Z" fill="${cd}"/>`;
      f += `<path d="M -26 -2 Q 0 2 26 -2" stroke="${shade(c, -0.3)}" stroke-width="1" fill="none" opacity=".5"/>`;
    } else if (h.cap === 'golf') {
      f += `<path d="M -30 -4 Q -30 -18 -16 -24 Q 0 -29 16 -24 Q 29 -18 29 -5 L 29 -8 Q 0 -10 -30 -4 Z" fill="${c}"/>`;
      f += `<rect x="-27" y="-7" width="54" height="5" rx="2.5" fill="${cd}"/>`;
      f += `<path d="M -27 -4.4 L 27 -4.4 L 27 1 Q 0 2 -27 1 Z" fill="${shade(c, -0.08)}"/>`;
      f += `<circle cx="0" cy="-14" r="1" fill="${shade(c, -0.25)}"/>`;
    } else if (h.cap === 'newsboy') {
      f += `<path d="M -30 -2 Q -31 -22 -14 -26 Q 0 -29 14 -26 Q 30 -22 29 -3 Q 0 -8 -30 -2 Z" fill="${c}"/>`;
      for (let i = 0; i < 3; i++) { f += `<path d="M ${-21 + i * 14} -12 Q ${-14 + i * 14} -24 ${-7 + i * 14} -12" stroke="${shade(c, -0.2)}" stroke-width="1.4" fill="none" opacity=".6"/>`; }
      f += `<path d="M -22 -4 Q 0 0 22 -4 Q 22 5 0 9 Q -22 5 -22 -4 Z" fill="${shade(c, -0.06)}"/>`;
      f += `<rect x="-18" y="6" width="36" height="3.6" rx="1.8" fill="${cd}"/>`;
    } else if (h.cap === 'bowler') {
      f += `<ellipse cx="0" cy="-16" rx="27" ry="9" fill="${c}"/>`;
      f += `<path d="M -26 -34 Q 0 -27 26 -34 L 26 -16 Q 0 -8 -26 -16 Z" fill="${c}"/>`;
      f += `<rect x="-26" y="-8.6" width="52" height="3.4" rx="1.7" fill="${cd}"/>`;
      f += `<path d="M -20 -28 Q 0 -24 20 -28" stroke="#fff" stroke-width="1.6" fill="none" opacity=".12"/>`;
    } else if (h.cap === 'fedora') {
      f += `<path d="M -31 -16 Q -31 -26 -12 -28 Q 0 -29 12 -28 Q 31 -26 31 -16 Q 31 -13 20 -13 L 11 -12 L -11 -12 L -20 -13 Q -31 -13 -31 -16 Z" fill="${c}"/>`;
      f += `<path d="M -12 -27 Q 0 -32 12 -27 Q 8 -28 0 -28 Q -8 -28 -12 -27 Z" fill="${shade(c, -0.1)}"/>`;
      f += `<rect x="-31" y="-14.4" width="62" height="4.4" rx="2" fill="${cd}"/>`;
      f += `<path d="M -30 -8 Q 0 -2 30 -8" stroke="${cd}" stroke-width="2.4" fill="none"/>`;
      f += `<path d="M -18 -24 Q 0 -28 18 -24" stroke="#fff" stroke-width="1" fill="none" opacity=".12"/>`;
    } else if (h.cap === 'beanie') {
      f += `<path d="M -29.5 -4 Q -31 -26 -12 -30 Q 0 -32 12 -30 Q 31 -26 29.5 -4 Q 0 -10 -29.5 -4 Z" fill="${c}"/>`;
      for (let i = -2; i <= 2; i++) f += `<path d="M ${i * 8} -7 Q ${i * 9} -18 ${i * 8} -28" stroke="${shade(c, -0.18)}" stroke-width="1.3" fill="none" opacity=".7"/>`;
      f += `<path d="M -29 -3 Q 0 1 29 -3 L 29 1 Q 0 5 -29 1 Z" fill="${shade(c, -0.2)}"/>`;
    }
    return f;
  }

  // ------------------------------------------------------------------ GARMENTS
  function coatBody(p, fem) {
    const w = fem ? 90 : 96;
    const x = (120 - w) / 2;
    return `<path d="M ${x} 120 L ${x} 88 Q ${x + w * 0.32} 74 ${60} 74 Q ${x + w * 0.68} 74 ${x + w} 88 L ${x + w} 120 Z" fill="url(#ct${p.u})"/>`;
  }
  function bust(p, feat) {
    const fem = isFem(p);
    const top = SHIRTS[p.shirt];
    const c = top.c, cd = shade(c, -0.22), cl = shade(c, 0.12);
    const layer = top.l;
    const acc = ACCENTS[p.accent];
    const w = fem ? 90 : 96;
    const x = (120 - w) / 2;
    let f = '';
    // shirt collar + cravat under an open coat
    f += `<path d="M 49 78 L 60 96 L 71 78 L 78 96 L 60 118 L 42 96 Z" fill="${layer}"/>`;
    f += `<path d="M 52 78 L 60 92 Q 53 96 48 88 Z M 68 78 L 60 92 Q 67 96 72 88 Z" fill="${cd}"/>`;
    f += `<path d="M 52 78 Q 60 83 68 78 L 66 88 Q 60 92 54 88 Z" fill="${shade(layer, -0.08)}"/>`;
    f += coatBody(p, fem);
    // lapels
    f += `<path d="M ${x + w * 0.34} 74 L 52 78 Q 60 96 57 120 L ${x + 4} 120 Q ${x + w * 0.3} 96 ${x + w * 0.34} 74 Z" fill="${cl}"/>`;
    f += `<path d="M ${x + w * 0.66} 74 L 68 78 Q 60 96 63 120 L ${x + w - 4} 120 Q ${x + w * 0.7} 96 ${x + w * 0.66} 74 Z" fill="${cl}"/>`;
    f += `<path d="M 52 78 L 60 86 M 68 78 L 60 86" stroke="${cd}" stroke-width="1.2" opacity=".7" fill="none"/>`;
    // coat centre line + buttons
    f += `<path d="M 60 96 L 60 120" stroke="${cd}" stroke-width="1.4" opacity=".8"/>`;
    f += `<circle cx="60" cy="102" r="1.3" fill="${cd}"/><circle cx="60" cy="110" r="1.3" fill="${cd}"/>`;
    // shoulder seams
    for (const sx of [-1, 1]) f += `<path d="M ${60 + sx * (w * 0.34)} 75 Q ${60 + sx * (w * 0.44)} 82 ${60 + sx * (w * 0.5)} 96" stroke="${cd}" stroke-width="1.2" fill="none" opacity=".7"/>`;
    // accent
    if (acc.k === 'cravat') f += `<path d="M 58.5 78 Q 60 80.5 61.5 78 L 61 88 Q 60 90 59 88 Z" fill="${acc.c}"/>`;
    else if (acc.k === 'watch') f += `<path d="M 54 98 Q 60 104 66 98" stroke="${acc.c}" stroke-width="1.6" fill="none"/><circle cx="63" cy="101" r="1.6" fill="${acc.c}"/>`;
    else if (acc.k === 'bouton') f += `<circle cx="67" cy="100" r="2" fill="${acc.c}"/><path d="M 66.8 102 L 66.4 108" stroke="#2e5126" stroke-width=".9"/>`;
    else if (acc.k === 'pin') f += `<path d="M 53.5 82 L 55 83 L 53.5 84 Z" fill="${acc.c}"/>`;
    else if (acc.k === 'cigar') f += `<path d="M 66 100 L 76 95" stroke="${acc.c}" stroke-width="1.6" stroke-linecap="round"/><path d="M 75 95.6 L 77 94.6" stroke="#e8e0cc" stroke-width="1.8" stroke-linecap="round"/>`;
    return f;
  }

  // ------------------------------------------------------------------ full figure
  function figure(p, feat, u, skin, hc, coat, acc) {
    const fem = isFem(p);
    const top = SHIRTS[p.shirt];
    const c = top.c, cd = shade(c, -0.22), cl = shade(c, 0.12);
    const trouser = shade(c, -0.4), trouserD = shade(c, -0.52);
    let f = '';
    const shO = fem ? 17 : 20, shW = fem ? 27 : 31; // arm spacing

    // trousers
    const hipL = fem ? 44 : 44.5, hipR = fem ? 76 : 75.5;
    f += `<path d="M ${hipL} 148 L ${hipR} 148 L ${hipR + 1.5} 222 L ${hipL - 1.5} 222 Z" fill="${trouser}"/>`;
    for (const sx of [-1, 1]) {
      const ax = (v) => 60 + sx * v;
      f += `<path d="M ${ax(2)} 150 L ${ax(fem ? 6.8 : 7.2)} 150 Q ${ax(fem ? 5.6 : 6)} 190 ${ax(fem ? 5 : 5.4)} 222 L ${ax(fem ? 9.6 : 10.4)} 222 Q ${ax(10.2)} 190 ${ax(10.4)} 150 L ${ax(10.4)} 150 Z" fill="${trouser}"/>`;
      f += `<path d="M ${ax(3)} 152 Q ${ax(fem ? 3.6 : 3.9)} 186 ${ax(3.4)} 220" stroke="${trouserD}" stroke-width="1.1" fill="none" opacity=".7"/>`;
    }
    // trouser crease + waist
    f += `<path d="M ${hipL} 150 L ${hipR} 150" stroke="${trouserD}" stroke-width="2"/>`;
    f += `<path d="M 54 160 Q 55 190 55 220 M 66 160 Q 65 190 65 220" stroke="${trouserD}" stroke-width="1" fill="none" opacity=".6"/>`;
    // shirt panel under coat
    f += `<path d="M 51 78 L 60 150 L 69 78 Q 60 84 51 78 Z" fill="${top.l}" opacity=".9"/>`;

    // arms + sleeves (under the torso)
    for (const sx of [-1, 1]) {
      const ax = (v) => 60 + sx * v;
      f += `<path d="M ${ax(shO)} 80 Q ${ax(shW)} 92 ${ax(shW + 1.5)} 132 Q ${ax(shW + 2.5)} 152 ${ax(shW - 2)} 170 L ${ax(shW - 12)} 168 Q ${ax(shW - 9)} 146 ${ax(shO - 5)} 96 Z" fill="url(#ct${p.u})"/>`;
      // cuff + hand
      f += `<rect x="${ax(shW - 12)}" y="164" width="13" height="6" fill="${cd}"/>`;
      f += `<path d="M ${ax(shW - 9)} 170 L ${ax(shW - 4.5)} 170 L ${ax(shW - 5.5)} 178 L ${ax(shW - 9.5)} 178 Z" fill="url(#sk${p.u})"/>`;
      f += `<path d="M ${ax(shW - 6)} 170 v-2.4 M ${ax(shW - 1.5)} 170 v-2.4" stroke="${shade(skin, -0.3)}" stroke-width=".9" opacity=".7"/>`;
    }

    // torso coat
    const body = (fem)
      ? 'M 47 148 L 47 96 Q 47.6 78 57 74 L 63 74 Q 72.4 78 73 96 L 73 148 Z'
      : 'M 44.5 148 L 44.5 92 Q 44.6 76 57 74 L 63 74 Q 75.4 76 75.5 92 L 75.5 148 Z';
    f += `<path d="${body}" fill="url(#ct${p.u})"/>`;
    f += `<path d="M 47 96 Q 60 88 73 96" stroke="${cd}" stroke-width="1.2" fill="none" opacity=".7"/>`;
    // lapels + shirt V
    f += `<path d="M 53 78 L 60 148 L 67 78 Q 60 86 53 78 Z" fill="${top.l}"/>`;
    f += `<path d="M 51 78 L 60 100 L 52 92 Z M 69 78 L 60 100 L 68 92 Z" fill="${cl}"/>`;
    f += `<path d="M 53 78 Q 60 84 67 78" stroke="${cd}" stroke-width="1.2" fill="none"/>`;
    f += `<path d="M 60 100 L 60 148" stroke="${cd}" stroke-width="1.4" opacity=".8"/>`;
    f += `<circle cx="60" cy="108" r="1.3" fill="${cd}"/><circle cx="60" cy="118" r="1.3" fill="${cd}"/><circle cx="60" cy="128" r="1.3" fill="${cd}"/>`;
    // coat skirt open at the bottom (over trousers)
    f += `<path d="M 44.5 138 L 52 138 L 50 148 L 42 148 Z M 75.5 138 L 68 138 L 70 148 L 78 148 Z" fill="${cd}" opacity=".5"/>`;
    // accent (doll)
    f += chestDoll(p, acc);

    // collar + neck drawn by caller
    return f;
  }
  function chestDoll(p, acc) {
    if (acc.k === 'watch') return `<path d="M 56 100 Q 60 106 64 100" stroke="${acc.c}" stroke-width="1.4" fill="none"/><circle cx="62" cy="103" r="1.5" fill="${acc.c}"/><path d="M 56 100 Q 58 98 60 100" stroke="${shade(acc.c, -0.3)}" stroke-width=".8" fill="none"/>`;
    if (acc.k === 'bouton') return `<circle cx="66" cy="104" r="1.9" fill="${acc.c}"/><path d="M 65.8 106 L 65.4 111" stroke="#2e5126" stroke-width=".9"/>`;
    if (acc.k === 'cigar' && !isFem(p)) return `<path d="M 53 108 L 60 104" stroke="${acc.c}" stroke-width="1.4" stroke-linecap="round"/><path d="M 59 104.4 L 61 103.4" stroke="#e8e0cc" stroke-width="1.6" stroke-linecap="round"/>`;
    return '';
  }

  // ------------------------------------------------------------------ portrait
  function svgFor(s, size, glowColor) {
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'p';
    const skin = SKINS[p.skin];
    const hair = HAIRS[p.hair];
    const top = SHIRTS[p.shirt];
    const acc = ACCENTS[p.accent];
    const feat = FACE_FEAT[p.face];
    const fem = isFem(p) || feat.sex === 1;
    p.u = u;
    const glow = glowColor || acc.c;
    const bg2 = '#0b0d11', bg1 = shade(glow, -0.86);
    const cx = 60, cy = 51, k = 1.14;

    let f = '';
    f += bust(p, feat);
    // neck
    f += `<path d="M 51 76 L 69 76 L 68.5 94 Q 60 98 51.5 94 Z" fill="${shade(skin, -0.12)}"/>`;
    f += `<path d="M 51.5 94 Q 60 98 68.5 94" stroke="${shade(skin, -0.3)}" stroke-width="1" fill="none" opacity=".4"/>`;
    // head group
    f += `<g transform="translate(${cx} ${cy}) scale(${k})">`;
    f += faceG(hair, feat, p.accent, acc, skin, u);
    f += hairFront(hair, k, u);
    f += `</g>`;
    // rim light
    f += `<path d="M 15 108 Q 13 88 34 76" fill="none" stroke="${shade(glow, 0.5)}" stroke-width="1.5" opacity=".3"/>`;
    f += `<path d="M 44 30 Q 50 22 60 20.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".12" stroke-linecap="round"/>`;

    return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" xmlns="http://www.w3.org/2000/svg">
      ${defsGrad(u, skin, top.c)}
      <defs><linearGradient id="pg${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
      <rect width="120" height="120" fill="url(#pg${u})"/>
      <ellipse cx="60" cy="52" rx="45" ry="41" fill="${shade(acc.c, -0.7)}" opacity=".22"/>
      ${f}
    </svg>`;
  }

  // ------------------------------------------------------------------ full character model
  function doll(s, size, opts) {
    opts = opts || {};
    s = String(s == null ? '' : s);
    const p = parts(s);
    const u = hash(s) + 'd';
    const skin = SKINS[p.skin];
    const hair = HAIRS[p.hair];
    const top = SHIRTS[p.shirt];
    const acc = ACCENTS[p.accent];
    const feat = FACE_FEAT[p.face];
    const fem = isFem(p) || feat.sex === 1;
    const coat = top.c;
    p.u = u;
    const S = size || 220;
    const VB_W = 120, VB_H = 252, DROP = 8;
    const H = Math.round(S * (VB_H / VB_W));
    const cx = 60, cy = 44, k = 1.04;

    let f = '';
    f += `<ellipse cx="60" cy="238" rx="34" ry="6.5" fill="#000" opacity=".4"/>`;
    // back hair behind body
    f += `<g transform="translate(${cx} 24) scale(${k})">${hairBack(hair, k, u)}</g>`;
    // figure (trousers, arms, coat)
    f += figure(p, feat, u, skin, hair, coat, acc);
    // neck + head
    f += `<path d="M 52 74 L 68 74 L 67.5 92 Q 60 96 52.5 92 Z" fill="${shade(skin, -0.12)}"/>`;
    f += `<g transform="translate(${cx} ${cy - 2}) scale(${k})">`;
    f += faceG(hair, feat, p.accent, acc, skin, u);
    f += hairFront(hair, k, u);
    f += `</g>`;
    // rim light
    f += `<path d="M 41 90 Q 32 104 30 130 L 29 200" fill="none" stroke="${shade(acc.c, 0.5)}" stroke-width="1.6" opacity=".25"/>`;

    return `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="${Math.round(S)}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg" class="doll-svg">
      ${defsGrad(u, skin, coat)}
      <defs><linearGradient id="dg${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(acc.c, -0.88)}"/><stop offset="60%" stop-color="#101218"/><stop offset="100%" stop-color="#090a0e"/>
      </linearGradient></defs>
      ${opts.plainBg ? '' : `<rect width="${VB_W}" height="${VB_H}" fill="url(#dg${u})"/>`}
      <g transform="translate(0,${DROP})">${f}</g>
    </svg>`;
  }

  function svgDataUri(s, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)); }
  function dollDataUri(s, size, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doll(s, size, opts)); }

  // ------------------------------------------------------------------ MUGSHOT
  function mugshot(s, size, name) {
    const inner = svgFor(s, 120);
    const no = 100000 + (hashInt(s) % 899999);
    let grid = '';
    for (let y = 18; y <= 108; y += 10) grid += `<path d="M6 ${y} H114" stroke="#aeb6c2" stroke-width=".5" opacity=".35"/>`;
    for (let x = 6; x <= 114; x += 9) grid += `<path d="M${x} 18 v4" stroke="#aeb6c2" stroke-width=".8" opacity=".6"/>`;
    const nm = String(name || 'DETAINED').toUpperCase().slice(0, 16);
    return `<svg viewBox="0 0 120 136" width="${size}" height="${Math.round(size * 136 / 120)}" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="136" fill="#111318"/>
      <g>${inner}</g>
      ${grid}
      <rect x="0" y="0" width="120" height="12" fill="rgba(0,0,0,.55)"/>
      <text x="6" y="9" font-family="monospace" font-size="7" fill="#cfd6e2" letter-spacing="1.4">RTPD&#160;&#160;${no}</text>
      <rect x="0" y="122" width="120" height="14" fill="#e8e4d8"/>
      <text x="6" y="132" font-family="sans-serif" font-size="7.6" font-weight="700" fill="#23231f" letter-spacing=".6">${nm}</text>
      <text x="114" y="132" text-anchor="end" font-family="monospace" font-size="7" fill="#6b675c">HOLD</text>
    </svg>`;
  }

  window.AV = {
    svgFor, doll, mugshot, svgDataUri, dollDataUri, parts, wear,
    SKINS, SKIN_NAMES, HAIRS, SHIRTS: SHIRTS.map(x => x.c), SHIRTS_FULL: SHIRTS, SHIRT_NAMES, SHIRT_STYLE, ACCENTS: ACCENT_COLORS, ACCENT_NAMES, FACE_FEAT, BODIES,
    nameOf(kind, i) {
      const t = { skin: SKIN_NAMES, hair: HAIRS.map(h => h.n), shirt: SHIRT_NAMES, accent: ACCENT_NAMES, face: FACE_FEAT.map(x => x.n), body: BODIES };
      return ((t[kind] || [])[i]) || '';
    }
  };
})();
