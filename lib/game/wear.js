// Razor Town — the character system, Torn-style.
//
// In Torn your citizen is not something you sculpt in a creator: you are given a
// body (male / female / enby, changed from Preferences) and everything the town
// sees is the clothing and armour you have EQUIPPED. This module is the server
// half of that: it knows which items are wearable, what body part and layer each
// one sits on, and it turns a player's equipped kit into the compact "look"
// string every screen renders.
//
// Look string:  <gender>|<part>:<style>:<colour>:<layer>,…
//   m|torso:hoodie:#23252b:4,legs:jeans:#3b4a63:4,feet:trainers:#e6e4dd:5
//
// The client (public/js/avatar.js) draws that string: base body first, then the
// equipped pieces in Torn's layer order (1 undergarment … 5 outerwear).
'use strict';
const C = require('./content.js');

const GENDERS = ['m', 'f', 'e'];
const GENDER_NAMES = { m: 'Male', f: 'Female', e: 'Enby' };

// Torn's five layers, low to high. Higher layers draw over lower ones.
const LAYERS = [1, 2, 3, 4, 5];

// Body parts in draw order (legs and feet first so coats fall over them).
const PARTS = ['legs', 'feet', 'torso', 'hands', 'neck', 'head', 'eyes', 'mouth'];
const PART_NAMES = {
  legs: 'Legs', feet: 'Feet', torso: 'Torso', hands: 'Hands',
  neck: 'Neck', head: 'Head', eyes: 'Eyes', mouth: 'Face'
};

const WEAR_CAP = 14;          // the most pieces a citizen can have on at once
const ARMOUR_LAYER = 3;       // armour always sits in Torn's middle layer

// Armour is gameplay gear (stats), not clothing — but the town still sees it on
// you. Each plate maps to a drawing style the client knows.
const ARMOUR_STYLE = {
  kevlar_s1: ['vest', '#2f3a33'],
  plate_l3: ['plate', '#3f4636'],
  riot_shell: ['riot', '#414852']
};
function armourStyle(id) { return ARMOUR_STYLE[id] || ['vest', '#33383f']; }

const rnd = (rand) => (typeof rand === 'function' ? rand : Math.random);

function itemOf(id) { return C.ITEMS[id] || null; }
function isWear(id) { const it = itemOf(id); return !!(it && it.wear && it.type === 'wear'); }
const isClothing = isWear;
function partOf(id) { const it = itemOf(id); return it && it.wear ? String(it.wear.part) : null; }
function layerOf(id) { const it = itemOf(id); return it && it.wear ? (Number(it.wear.layer) || 1) : 1; }
function styleOf(id) { const it = itemOf(id); return it && it.wear ? String(it.wear.style || 'plain') : 'plain'; }
function colourOf(id) { const it = itemOf(id); return it && it.wear ? String(it.wear.col || '#3a3d44') : '#3a3d44'; }

function gender(p) {
  const g = String((p && p.gender) || 'm').toLowerCase();
  return GENDERS.includes(g) ? g : 'm';
}
function genderName(g) { return GENDER_NAMES[gender({ gender: g })]; }

// One piece per body part + layer, Torn's rule for how clothes stack. A later
// entry replaces an earlier one in the same seat (re-equipping a slot).
function sanitize(list) {
  const out = [];
  const seat = new Map();
  for (const raw of (Array.isArray(list) ? list : [])) {
    const id = String(raw || '');
    if (!isWear(id)) continue;
    const key = partOf(id) + ':' + layerOf(id);
    if (seat.has(key)) out[seat.get(key)] = id;
    else { seat.set(key, out.length); out.push(id); }
  }
  return out.slice(0, WEAR_CAP);
}

// The full look string: gender, then every equipped piece with the drawing
// tokens the client needs (part, style, colour, layer).
function lookOf(p) {
  const ids = sanitize(p && p.equip && p.equip.wear);
  const tokens = ids.map(id => {
    const it = itemOf(id);
    return `${it.wear.part}:${it.wear.style}:${it.wear.col}:${Number(it.wear.layer) || 1}`;
  });
  // armour rides along so everyone can see who is wearing a plate
  const arm = p && p.equip && p.equip.armour;
  if (arm && itemOf(arm)) {
    const [st, col] = armourStyle(arm);
    tokens.push(`torso:${st}:${col}:${ARMOUR_LAYER}`);
  }
  return gender(p) + '|' + tokens.join(',');
}

// Every wearable piece in the catalogue, grouped by body part.
function catalog() {
  const out = {};
  for (const [id, it] of Object.entries(C.ITEMS)) {
    if (!isWear(id)) continue;
    (out[it.wear.part] = out[it.wear.part] || []).push(id);
  }
  return out;
}

// Deterministic PRNG so a citizen's starter outfit never changes between boots.
function hashInt(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Math.abs(h) || 1;
}
function seeded(str) {
  let h = hashInt(str);
  return () => { h = (h * 48271) % 2147483647; return Math.abs(h) / 2147483647; };
}

// What a brand-new citizen owns and is already wearing: cheap kit, never nothing.
const STARTER = {
  inner: ['tee_white', 'tee_black', 'tee_stripe', 'turtleneck'],
  outer: ['shirt_oxford', 'jumper_knit', 'hoodie_grey', 'denim_jk'],
  legs: ['jeans_indigo', 'jeans_bleach', 'cargo_olive', 'joggers_blk', 'chinos_tan'],
  feet: ['trainers_white', 'boots_dm', 'loafers_blk'],
  head: ['cap_store', 'snap_black', 'beanie_fish', 'bucket_khaki', 'durag_silk'],
  neck: ['chain_steel', 'scarf_wool'],
  hands: ['wraps_train']
};
function starterKit(seed) {
  const r = seeded(seed == null ? 'citizen' : seed);
  const out = [];
  const take = (key) => {
    const pool = (STARTER[key] || []).filter(isWear);
    if (pool.length) out.push(pool[Math.floor(r() * pool.length)]);
  };
  take('inner'); take('legs'); take('feet');
  if (r() < 0.60) take('outer');
  if (r() < 0.45) take('head');
  if (r() < 0.30) take('neck');
  if (r() < 0.20) take('hands');
  return sanitize(out);
}

// Old saves carried the eight-part creator spec (skin|face|hair|…|body|eyes|facial).
// The body slot is the only bit of it that still means anything — even index male,
// odd female — so a veteran keeps their body through the switch to clothing.
function legacyGender(old) {
  const parts = String(old || '').split('|').map(x => parseInt(x, 10));
  if (parts.length >= 6 && Number.isFinite(parts[5])) return (parts[5] % 2) ? 'f' : 'm';
  return 'm';
}
function isLegacyLook(old) {
  const s = String(old || '');
  return !s.includes(':') && /^[0-9|]*$/.test(s) && s.length > 0;
}

// Deterministic outfit roller — the founder tool and the NPC seeder both use it.
function randomOutfit(rand) {
  const r = rnd(rand);
  const byPart = catalog();
  const out = [];
  for (const part of PARTS) {
    const pool = byPart[part] || [];
    if (!pool.length) continue;
    if (part === 'torso') {
      const inner = pool.filter(id => layerOf(id) <= 2);
      const outer = pool.filter(id => layerOf(id) >= 4);
      if (inner.length) out.push(inner[Math.floor(r() * inner.length)]);
      if (outer.length && r() < 0.65) out.push(outer[Math.floor(r() * outer.length)]);
    } else if (r() < 0.7) {
      out.push(pool[Math.floor(r() * pool.length)]);
    }
  }
  return sanitize(out);
}

function randomLook(rand) {
  const r = rnd(rand);
  return lookOf({ gender: GENDERS[Math.floor(r() * GENDERS.length)], equip: { wear: randomOutfit(r) } });
}

module.exports = {
  GENDERS, GENDER_NAMES, LAYERS, PARTS, PART_NAMES, WEAR_CAP, ARMOUR_LAYER, STARTER,
  isWear, isClothing, partOf, layerOf, styleOf, colourOf, armourStyle,
  sanitize, lookOf, gender, genderName, catalog, randomOutfit, randomLook,
  starterKit, legacyGender, isLegacyLook, seeded
};
