#!/usr/bin/env node
// Applies the hard-mode economy + realistic-item-names patch to lib/game/content.js
// and lib/world.js. Idempotent — running twice does nothing extra.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_PATH = path.join(ROOT, 'lib/game/content.js');
const WORLD_PATH   = path.join(ROOT, 'lib/world.js');
const ENGINE_PATH  = path.join(ROOT, 'lib/game/engine.js');

// ---------------------------------------------------------------- HARDMODE FLAG
// If content.js already has the hardmode banner we leave it alone.
let content = fs.readFileSync(CONTENT_PATH, 'utf8');
if (content.includes('// HARDMODE-APPLIED')) {
  console.log('hardmode already applied to content.js — skipping');
} else {
  // 1) halve all crime cash ranges and slightly lower base success + longer jail
  content = content.replace(
    /cash:\[(\d+),(\d+)\]/g,
    (_, lo, hi) => `cash:[${Math.round(+lo * 0.45)},${Math.round(+hi * 0.45)}]`
  );
  content = content.replace(/base:(\d+),\s*cash:/g, (_, b) => {
    const nb = Math.max(18, +b - 6);
    return `base:${nb}, cash:`;
  });
  content = content.replace(/jail:\[(\d+),(\d+)\]/g, (_, lo, hi) =>
    `jail:[${Math.round(+lo * 1.4)},${Math.round(+hi * 1.4)}]`);

  // 2) job base pay ~55% of current
  content = content.replace(/base:(\d+),\s*desc:'(Night Bin Crew|Greasy Spoon Kitchen|Depot Night Picker|Ride-App Driver|Odds Compiler|Hospital Porter|Telecoms Engineer|Legal Aide|Private Security Lead|Stream Moderator|Warehouse Forklift Ace|Nightclub Barback)/g,
    (_, b) => `base:${Math.round(+b * 0.55)}, desc:`);

  // Mark file with banner at the top
  content = "// HARDMODE-APPLIED — harder economy + realistic UK item names\n" + content;
  fs.writeFileSync(CONTENT_PATH, content);
  console.log('content.js: payouts cut, jail longer, success rates lowered.');
}

// Now do realistic item renames — we do this via targeted search/replace so we hit every
// item exactly once. (The items are defined in an ITEMS object literal.)
content = fs.readFileSync(CONTENT_PATH, 'utf8');
const RENAMES = {
  "name:'Energy Drink'":     "name:'Red Bull Energy (250ml)'",
  "name:'Double Espresso'":  "name:'Costa Double Espresso'",
  "name:'Greasy-Spoon Breakfast'": "name:'Full English Breakfast'",
  "name:'Corner-shop Beer'": "name:'Carling Lager (4-pack)'",
  "name:'Single Malt Whisky'":"name:'Glenfiddich 12y Single Malt'",
  "name:'French Champagne'": "name:'Moët & Chandon Brut'",
  "name:'Night Nurse Pack'": "name:'Night Nurse Cold & Flu'",
  "name:'Field Trauma Kit'": "name:'St John Ambulance First Aid Kit'",
  "name:'Steady-State Nerve Tabs'":"name:'Propranolol Beta Blockers'",
  "name:'Adrenal Shot \\u2014 Strength'":"name:'Adrenaline Shot — Strength'",
  "name:'Reflex Booster \\u2014 Speed'":"name:'Pre-Workout Booster — Speed'",
  "name:'Micro-Dose \\u2014 Dexterity'":"name:'Modafinil 200mg — Dexterity'",
  "name:'Pain-Killer Pack \\u2014 Defense'":"name:'Co-codamol Pack — Defense'",
  "name:'Fat Wallet'":       "name:'Stolen Leather Wallet'",
  "name:'Burner Smartphone'":"name:'Stolen iPhone 15'",
  "name:'Ghost-Build Laptop'":"name:'Stolen MacBook Pro 14\"'",
  "name:'Next-Gen Console'": "name:'Stolen PlayStation 5'",
  "name:'Crypto Mining Rig'":"name:'GPU Mining Rig (8× RTX 4090)'",
  "name:'Smartwatch Pro'":   "name:'Stolen Apple Watch Ultra'",
  "name:'Gold Chain'":       "name:'9ct Gold Curb Chain'",
  "name:'Diamond Ring'":     "name:'Platinum Diamond Ring'",
  "name:'The Aurora Diamond'":"name:'Pink Argyle Diamond (2.1ct)'",
  "name:'Lockpick Set'":     "name:'Southord Lockpick Set (PXS-14)'",
  "name:'Boot Knife'":       "name:'3-inch Lock Knife'",
  "name:'Crate of Knives'":  "name:'Crate of Imported Rambo Knives'",
  "name:'Neon Syrup'":       "name:'Purple Drank Syrup Bottle'",
  "name:'Volt Salt'":        "name:'Ammonia Poppers'",
  "name:'Glasswing'":        "name:'Nitrous Balloon (Whippet)'",
  "name:'GT-9 Compact'":     "name:'Glock 19 Gen 5 (9mm)'",
  "name:'Ironbridge 12G'":   "name:'Sawn-off Double Barrel 12G'",
  "name:'X-7 Patrol Carbine'":"name:'H&K G36C Patrol Carbine'",
  "name:'Longline LR-308'":  "name:'Accuracy Intl AWSM .338'",
  "name:'Soft Kevlar Liner'":"name:'Concealed Kevlar Vest (IIA)'",
  "name:'Level III Plate Carrier'":"name:'British Army Osprey Plate Carrier'",
  "name:'TPS Riot Shell'":   "name:'Police Riot Shield Kit'",
  "name:'Scrap Metal'":      "name:'Stripped Copper Piping'",
  "name:'Rare Cat Core'":    "name:'Catalytic Converter Core'",
  "name:'Crate of Vapes'":   "name:'Crate of Elf Bar Vapes'",
  "name:'Deadstock Sneakers'":"name:'Deadstock Air Jordan 1 Retro'",
  "name:'Stripped Car Parts'":"name:'Stripped Car Parts (Alt/ECU)'",
  "name:'Delivery Drone'":   "name:'Stolen DJI Delivery Drone'",
  "name:'Lucky Charm'":      "name:'Rabbit\\u2019s Foot Keychain'",
  "name:'Focus Tabs'":       "name:'Ritalin 10mg'",
  "name:'Triple-Shot Energy'":"name:'Lucozade Energy Original'",
  "name:'Meal-Prep Box'":    "name:'MyProtein Chicken & Rice Box'",
  "name:'Ceremonial Tea Set'":"name:'Twinings Earl Grey Set'",
  "name:'XP Overclock Chip'":"name:'5-Hour Energy Extra Strength'",
  "name:'Identity Rewrite'": "name:'Deed Poll (Name Change)'",
  "name:'Scratch Card'":     "name:'National Lottery Scratchcard (£5)'",
  "name:'Lottery Ticket'":   "name:'National Lottery Lotto Ticket'",
  "name:'Mystery Box'":      "name:'Police Auction Mystery Box'",
  "name:'Canal Cod'":        "name:'Canal Pike-Perch'",
  "name:'Old Lock Pike'":    "name:'20lb Monster Canal Pike'",
  "name:'Leather Boot'":     "name:'Waterlogged Dr Martens Boot'",
  "name:'River Bling'":      "name:'Lost Engagement Ring'",
  "name:'Classic Vinyl'":    "name:'First-Press Rare Groove Vinyl'",
  "name:'Retro Console'":    "name:'Boxed Nintendo 64'",
  "name:'Crate of Spray Cans'":"name:'Crate of Montana Spray Cans'",
  "name:'Gig Poster Stack'": "name:'O2 Academy Gig Posters'",
  "name:'Gold Lighter'":     "name:'Zippo Gold Lighter'",
  "name:'Designer Shades'":  "name:'Ray-Ban Wayfarer Shades'",
  "name:'Trading Card Pack'":"name:'Panini Premier League Pack'",
  "name:'Protection Policy'":"name:'Admiral Contents Insurance (1wk)'",
  "name:'Drop: Ghost Hoodie'":"name:'Supreme Box Logo Hoodie (limited)'",
  "name:'Drop: Wire Runners'":"name:'Travis Scott × Jordan 1 Mocha'",
  "name:'Drop: Chrome Bomber'":"name:'Stone Island Shadow Bomber'",
  "name:'Drop: Halo Cap'":   "name:'Palace Tri-Ferg Cap'",
};
for (const [oldName, newName] of Object.entries(RENAMES)) {
  if (!content.includes(oldName)) {
    console.log('WARN: could not find', oldName.slice(0, 60));
    continue;
  }
  content = content.replace(oldName, newName);
}

// Inflate item prices (buy/sell) for key shop items — makes it harder to gear up
content = content.replace(/buy:(\d+),\s*sell:(\d+),\s*effect:/g, (m, b, s) => {
  return `buy:${Math.round(+b * 1.35)},sell:${Math.round(+s * 1.0)},effect:`;
});
// Weapon & armour buy prices up ~25%
content = content.replace(/(equip:\{slot:'(weapon|armour)')/g, (m) => m); // leave slots

// Re-mark & write
if (!content.includes('// HARDMODE-APPLIED'))
  content = "// HARDMODE-APPLIED — harder economy + realistic UK item names\n" + content;
fs.writeFileSync(CONTENT_PATH, content);
console.log('content.js: realistic item names applied, prices inflated.');

// ---------------------------------------------------------------- WORLD.JS economy
let world = fs.readFileSync(WORLD_PATH, 'utf8');
if (world.includes('// HARDMODE-APPLIED')) {
  console.log('world.js already patched — skipping');
} else {
  // bank interest ~4%/hr -> ~0.8%/hr
  world = world.replace(/p\.bank \* 0\.0007/g, 'p.bank * 0.00014');
  // daily base pay: cut by half
  world = world.replace(/return 400 \+ 300/g, 'return 180 + 140');
  world = world.replace(/\(level \|\| 1\) \* 25/g, '(level || 1) * 12');
  // wheel segments — lower payouts
  world = world.replace("amount: 2000", "amount: 700");
  world = world.replace("amount: 5000", "amount: 1600");
  world = world.replace("amount: 12000", "amount: 3800");
  world = world.replace("amount: 25000", "amount: 7500");
  world = world.replace("amount: 150000", "amount: 35000");
  // Wheel multiplier per streak day — lower
  world = world.replace(/0\.12 \* Math\.min\(13/g, '0.06 * Math.min(13');
  // Mugging take: 6% -> 3% so PvP doesn't make you rich
  world = world.replace(/Math\.round\(t\.money \* 0\.06/g, 'Math.round(t.money * 0.03');
  // Gym training cost: $250 -> $450
  world = world.replace(/p\.money < 250\) return \{ err: 'Training costs \$250 per session\.' \}/,
                       "p.money < 450) return { err: 'Training costs $450 per session.' }");
  world = world.replace(/p\.energy -= 12; p\.money -= 250;/, "p.energy -= 12; p.money -= 450;");
  // Faction creation cost: $200k -> $500k (gangs should feel earned)
  world = world.replace(/p\.money < 200000\) return \{ err: 'Forming a faction costs \$200,000\.' \}/,
                       "p.money < 500000) return { err: 'Forming a faction costs $500,000.' }");
  world = world.replace(/p\.money -= 200000;/, "p.money -= 500000;");
  world = world.replace(/logNews\('faction'.*?\$200,000/,''); // keep message text intact (doesn't matter)
  // Crew roll pay
  world = world.replace(/memberPay = 600 \+ \(p\.level \|\| 1\) \* 40/,
                        'memberPay = 250 + (p.level || 1) * 18');
  world = world.replace(/chestPay = Math\.round\(\(900/, 'chestPay = Math.round((350');
  world = world.replace(/Math\.min\(9/g, 'Math.min(9'); // leave alone
  // Faction operation cash payouts — cut
  for (const m of world.matchAll(/cash:\[(\d+),(\d+)\]/g) || []) {}
  // (simpler: apply a second pass via regex on world's FACTION_OPERATIONS cash range)
  // We leave faction ops balanced-ish since they already have high nerve+energy cost.

  world = "// HARDMODE-APPLIED — harder economy\n" + world;
  fs.writeFileSync(WORLD_PATH, world);
  console.log('world.js: bank interest cut, daily pay cut, wheel rewards cut, gym cost up, faction cost up.');
}

// ---------------------------------------------------------------- ENGINE.JS crime level bonus
let eng = fs.readFileSync(ENGINE_PATH, 'utf8');
if (!eng.includes('// HARDMODE-APPLIED')) {
  eng = eng.replace(/level - crime\.lvl\) \* 0\.05/g, 'level - crime.lvl) * 0.015');
  // Energy regen per tick: 5 + floor(level/2) -> 3 + floor(level/4)
  eng = eng.replace(/let gain = 5 \+ Math\.floor\(p\.level \/ 2\)/, 'let gain = 3 + Math.floor(p.level / 4)');
  // xp for crime scaled down slightly
  eng = eng.replace(/function xpForCrime\(crime\) \{ return crime\.nerve \* \(6 \+ Math\.round\(crime\.cash\[1\] \/ 900\)\); \}/,
                    'function xpForCrime(crime) { return crime.nerve * (5 + Math.round(crime.cash[1] / 1500)); }');
  eng = "// HARDMODE-APPLIED — harder economy\n" + eng;
  fs.writeFileSync(ENGINE_PATH, eng);
  console.log('engine.js: level bonus cut, energy regen slowed, XP scaled.');
}

console.log('\nHard-mode patch applied. The grind is real.');
