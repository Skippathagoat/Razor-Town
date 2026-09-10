// Razor Town — procedural SVG avatars (1920s Birmingham: flat caps, waistcoats, watch chains)
(function () {
  'use strict';
  const SKINS = ['#e8b48c', '#d99b6c', '#a96d45', '#7d4e2f', '#e6c39a'];
  // t: short | bob | bowl | scarf | pony ;  cap: flat | bowler (optional)
  const HAIRS = [
    { c: '#191512', t: 'short', cap: 'flat',  n: 'Flat cap' },
    { c: '#241a12', t: 'short', cap: 'bowler',n: 'Bowler' },
    { c: '#0e0c0b', t: 'short', n: 'Slicked' },
    { c: '#4a2a16', t: 'bob',   n: 'Bobbed' },
    { c: '#2e2018', t: 'bowl',  n: 'Bowl crop' },
    { c: '#141210', t: 'short', n: 'Cropped' },
    { c: '#3b2416', t: 'short', n: 'Rough crop' },
    { c: '#7a5a3c', t: 'scarf', n: 'Head scarf' },
    { c: '#191512', t: 'short', n: 'Trimmed' },
    { c: '#5b1f1a', t: 'pony',  n: 'Auburn' }
  ];
  const SHIRTS = ['#2b2722', '#3a2020', '#24323b', '#20291f', '#4a3a24', '#38261c', '#262b33', '#3c3a30'];
  const FACE_FEAT = [
    { eye: 'round', brow: 0, mouth: 0 }, { eye: 'sharp', brow: 1, mouth: 1 }, { eye: 'round', brow: 1, mouth: 2 },
    { eye: 'sharp', brow: 2, mouth: 0 }, { eye: 'half', brow: 0, mouth: 1 }, { eye: 'half', brow: 2, mouth: 2 }
  ];
  const ACCENTS = ['#c9a24b', '#8f2f28', '#cfc2a6', '#5f7d5e', '#2e4a4a'];

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
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); }
  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function svgFor(s, size, glowColor) {
    const p = parts(s);
    const skin = SKINS[p.skin];
    const hair = HAIRS[p.hair];
    const shirt = SHIRTS[p.shirt];
    const acc = ACCENTS[p.accent];
    const feat = FACE_FEAT[p.face];
    const vw = 120;
    const glow = glowColor || acc;
    const bg1 = shade(glow, -0.74), bg2 = '#12100c';
    const dark = shade(glow, -0.82);
    let f = '';

    // shoulders / overcoat / waistcoat
    f += `<path d="M18 120 L18 94 Q18 74 42 70 L52 68 Q60 76 68 68 L78 70 Q102 74 102 94 L102 120 Z" fill="${shirt}"/>`;
    f += `<path d="M18 120 L18 102 Q18 82 44 75 L60 120 Z" fill="${shade(shirt,-0.18)}"/>`;
    f += `<path d="M102 120 L102 102 Q102 82 76 75 L60 120 Z" fill="${shade(shirt,-0.18)}"/>`;
    // waistcoat V with watch chain + buttons
    f += `<path d="M52 70 L60 92 L68 70 Z" fill="${shade(shirt,-0.2)}"/>`;
    f += `<circle cx="60" cy="96" r="1.4" fill="${acc}"/><circle cx="60" cy="106" r="1.4" fill="${acc}"/>`;
    f += `<path d="M52 84 Q60 98 68 84" stroke="${acc}" stroke-width="1.6" fill="none"/>`;
    f += `<circle cx="63" cy="92" r="2.6" fill="${acc}"/>`; // pocket watch
    // neck
    f += `<rect x="52" y="66" width="16" height="20" rx="6" fill="${shade(skin,-0.18)}"/>`;
    // collar points
    f += `<path d="M46 86 L58 74 L54 92 Z" fill="#e8e0cd"/><path d="M74 86 L62 74 L66 92 Z" fill="#e8e0cd"/>`;
    // tie knot + blade
    f += `<path d="M56 76 L60 84 L64 76 L60 70 Z" fill="${acc}"/>`;
    f += `<path d="M60 84 L56 104 L64 104 Z" fill="${shade(acc,-0.1)}"/>`;

    // head
    f += `<ellipse cx="60" cy="56" rx="25" ry="27" fill="${skin}"/>`;
    f += `<path d="M35 58 Q34 27 60 24 Q86 27 85 58 L85 62 Q84 78 74 84 Q60 92 46 84 Q36 78 35 62 Z" fill="${skin}"/>`;
    // ears
    f += `<ellipse cx="35" cy="58" rx="3" ry="5" fill="${shade(skin,-0.1)}"/><ellipse cx="85" cy="58" rx="3" ry="5" fill="${shade(skin,-0.1)}"/>`;

    // ---- HAIR / HEADWEAR
    const hc = hair.c;
    if (hair.t === 'short' || hair.t === 'bowl') {
      f += `<path d="M36 58 Q34 26 60 22 Q86 26 84 58 L84 50 Q85 34 74 30 Q60 24 46 30 Q35 34 36 50 Z" fill="${hc}"/>`;
      if (hair.t === 'bowl') { f += `<path d="M36 46 Q36 30 60 28 Q84 30 84 46 Q80 40 60 39 Q40 40 36 46 Z" fill="${shade(hc,0.1)}"/>`; }
    } else if (hair.t === 'bob') {
      f += `<path d="M35 52 Q34 24 60 22 Q86 24 85 52 L85 70 Q80 90 60 92 Q40 90 35 70 Z" fill="${hc}"/>`;
      f += `<path d="M36 62 Q38 46 48 40 Q42 52 44 72 Q40 60 37 52 Z" fill="${shade(hc,0.14)}"/>`;
      f += `<path d="M40 78 Q44 92 60 94 Q76 92 80 78 Q72 98 60 99 Q48 98 40 78 Z" fill="${hc}"/>`;
    } else if (hair.t === 'scarf') {
      f += `<path d="M36 60 Q33 20 60 16 Q87 20 84 60 L84 46 Q83 26 72 21 Q60 17 48 21 Q37 26 36 46 Z" fill="${hc}"/>`;
      f += `<path d="M38 36 Q40 24 60 22 Q80 24 82 36 Q80 28 60 26 Q40 28 38 36 Z" fill="${shade(hc,0.28)}"/>`;
      // knotted tails at the nape
      f += `<path d="M47 88 Q40 100 42 112 L52 110 Q50 98 52 92 Z" fill="${hc}"/>`;
      f += `<path d="M73 88 Q80 100 78 112 L68 110 Q70 98 68 92 Z" fill="${hc}"/>`;
    } else if (hair.t === 'pony') {
      f += `<path d="M35 58 Q35 24 60 20 Q85 24 85 58 Q84 38 60 34 Q36 38 35 58 Z" fill="${hc}"/>`;
      f += `<path d="M80 42 Q98 46 94 76 Q91 92 82 96 Q86 74 81 58 Z" fill="${shade(hc,-0.12)}"/>`;
    }
    // side hair / sideburns
    f += `<path d="M36 56 Q34 68 37 78" stroke="${hc}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    f += `<path d="M84 56 Q86 68 83 78" stroke="${hc}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    // ---- CAPS
    if (hair.cap === 'flat') {
      // flat cap crown + peak
      f += `<path d="M35 48 Q33 22 60 20 Q87 22 85 48 Q80 34 60 33 Q40 34 35 48 Z" fill="${shade(hc,0.08)}"/>`;
      f += `<path d="M35 48 Q33 22 60 20 Q87 22 85 48 Q85 44 82 42 Q80 30 60 29 Q40 30 38 42 Q35 44 35 48 Z" fill="${hc}"/>`;
      f += `<path d="M34 46 L52 44 Q58 43 60 46 L58 52 L38 55 Z" fill="#1d1812"/>`; // peak
      f += `<path d="M34 49 L52 47" stroke="#c9a24b" stroke-width="1.6" stroke-linecap="round"/>`; // stitching
    } else if (hair.cap === 'bowler') {
      f += `<path d="M35 46 Q35 20 60 18 Q85 20 85 46 Q70 42 60 43 Q50 42 35 46 Z" fill="${hc}"/>`;
      f += `<path d="M34 46 Q34 40 38 37 Q44 44 60 45 Q76 44 82 37 Q86 40 86 46 Q70 44 60 45 Q50 44 34 46 Z" fill="${hc}"/>`; // brim
      f += `<rect x="33" y="43" width="54" height="2.6" rx="1.3" fill="${shade(hc,0.1)}"/>`;
    }

    // brows, eyes, mouth, nose
    const ey = 58, lx = 50, rx = 70;
    const bw = feat.brow === 0 ? 0 : feat.brow === 1 ? 2.2 : -2.2;
    const browc = (hair.t === 'scarf' || hair.cap) ? shade(hair.c,0.25) : hc;
    f += `<path d="M${lx-7} ${ey-9-bw} L${lx+7} ${ey-6-bw}" stroke="${browc}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    f += `<path d="M${rx-7} ${ey-6-bw} L${rx+7} ${ey-9-bw}" stroke="${browc}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    const eyeColor = '#16110e';
    if (feat.eye === 'round') {
      f += `<circle cx="${lx}" cy="${ey}" r="4.6" fill="#f2ead6"/><circle cx="${lx}" cy="${ey}" r="2.7" fill="${eyeColor}"/><circle cx="${lx+1.2}" cy="${ey-1.2}" r="0.9" fill="#fff"/>`;
      f += `<circle cx="${rx}" cy="${ey}" r="4.6" fill="#f2ead6"/><circle cx="${rx}" cy="${ey}" r="2.7" fill="${eyeColor}"/><circle cx="${rx+1.2}" cy="${ey-1.2}" r="0.9" fill="#fff"/>`;
    } else if (feat.eye === 'sharp') {
      f += `<path d="M${lx-5} ${ey} L${lx} ${ey+2.5} L${lx+5} ${ey} L${lx} ${ey-2.5} Z" fill="${eyeColor}"/><path d="M${rx-5} ${ey} L${rx} ${ey+2.5} L${rx+5} ${ey} L${rx} ${ey-2.5} Z" fill="${eyeColor}"/>`;
      f += `<circle cx="${lx}" cy="${ey}" r="1.2" fill="${acc}"/><circle cx="${rx}" cy="${ey}" r="1.2" fill="${acc}"/>`;
    } else {
      f += `<path d="M${lx-5.4} ${ey} Q${lx} ${ey-3.4} ${lx+5.4} ${ey}" stroke="${eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      f += `<path d="M${rx-5.4} ${ey} Q${rx} ${ey-3.4} ${rx+5.4} ${ey}" stroke="${eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    const m = feat.mouth;
    if (m === 0) f += `<path d="M54 74 Q60 77 66 74" stroke="${shade(skin,-0.35)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    else if (m === 1) f += `<path d="M53 72 Q60 76 67 72 L67 73 Q60 81 53 73 Z" fill="#5a1420"/>`;
    else f += `<circle cx="60" cy="74" r="1.8" fill="#7a1a28"/><path d="M58 74 h4" stroke="#3f0d15" stroke-width="1.6"/>`;
    f += `<path d="M60 66 L59 71 Q60 72.6 61.4 71.6" stroke="${shade(skin,-0.2)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

    const svg = `<svg viewBox="0 0 ${vw} ${vw}" width="${size}" height="${size}" role="img" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g${hash(s)}" cx="30%" cy="20%" r="85%">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="55%" stop-color="${bg2}"/>
          <stop offset="100%" stop-color="#0a0907"/>
        </radialGradient>
        <linearGradient id="rim${hash(s)}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${glow}"/>
          <stop offset="100%" stop-color="${shade(glow,-0.55)}"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#g${hash(s)})"/>
      <rect x="1" y="1" width="118" height="118" rx="20" fill="none" stroke="url(#rim${hash(s)})" stroke-width="3" opacity="0.8"/>
      ${f}
    </svg>`;
    return svg;
  }

  function svgDataUri(s, size) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFor(s, size)); }
  window.AV = { svgFor, svgDataUri, parts, SKINS, HAIRS, SHIRTS, ACCENTS, FACE_FEAT };
})();
