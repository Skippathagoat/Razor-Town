// Razor Town — The Long Game: Underworld Operations catalogue.
// 10 families × 10 districts × 10 grades = exactly 10,000 playable operations.
// Every single one is an individual job: own name, own patch of the city, own grade,
// own price, own odds, own payout, own downtime cost and own consequence.
// Nothing here is decorative — systems.js spreads every record onto the live player.
'use strict';

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round = (n, to) => Math.round(n / to) * to;

// ---------------------------------------------------------------- the ten patches of town
const DISTRICTS = [
  { id: 'lamp_row',      name: 'Lamp Row',        tier: 0, line: 'Gas lamps, long shadows, nobody watching.' },
  { id: 'back_arcade',   name: 'the Back Arcade', tier: 1, line: 'Slot noise covers every conversation.' },
  { id: 'steel_bridge',  name: 'Steel Bridge',    tier: 2, line: 'Wind off the canal takes voices with it.' },
  { id: 'chapel_cut',    name: 'Chapel Cut',      tier: 3, line: 'A late walker is nobody here.' },
  { id: 'yard_gates',    name: 'the Yard Gates',  tier: 4, line: 'Shift change is its own small country.' },
  { id: 'hotel_service', name: 'Hotel Service',   tier: 5, line: 'The staff door never quite latches.' },
  { id: 'market_stalls', name: 'the Market',      tier: 6, line: 'Canvas walls make excellent cover.' },
  { id: 'tram_loop',     name: 'the Tram Loop',   tier: 7, line: 'Empty cars on a watchmaker’s schedule.' },
  { id: 'roof_garden',   name: 'the Roof Garden', tier: 8, line: 'The city looks away from up here.' },
  { id: 'lock_cut',      name: 'Lock Cut',        tier: 9, line: 'Barges bump and the cameras fog over.' }
];

// ---------------------------------------------------------------- the ten grades
const GRADES = [
  { i: 0, roman: 'I',    name: 'Street' },      { i: 1, roman: 'II',   name: 'Corner' },
  { i: 2, roman: 'III',  name: 'Borough' },     { i: 3, roman: 'IV',   name: 'Citywide' },
  { i: 4, roman: 'V',    name: 'County' },      { i: 5, roman: 'VI',   name: 'National' },
  { i: 6, roman: 'VII',  name: 'Continental' }, { i: 7, roman: 'VIII', name: 'Global' },
  { i: 8, roman: 'IX',   name: 'Legend' },      { i: 9, roman: 'X',    name: 'Mythic' }
];

// ---------------------------------------------------------------- helper for category tables
// [id, name, icon, one-line pitch]
const cat = (rows) => rows.map(([id, name, ico, line]) => ({ id, name, ico, line }));

// ================================================================ the ten families
// Special mechanics are implemented in systems.js and keyed off `special`.
const FAMILIES = [
  {
    id: 'rackets', name: 'Rackets', ico: '🏦', special: 'racket', verb: 'Set up',
    stat: 'st', unlock: 3, nerve: true, cost: { base: 4500, step: 0.85 },
    pay: { base: 900, step: 260, tier: 90 }, odds: 0.93, heat: 2, hours: 2, capHours: 12,
    blurb: 'Standing rackets that keep paying while you are busy elsewhere. Set one up, let the neighbourhood learn your name, collect when the envelope swells — but a racket left in the open makes heat, and heat brings the law.',
    cats: cat([
      ['protection', 'Protection racket',        '🛡️', 'Shopkeepers pay so that nothing happens to them.'],
      ['numbers',    'Numbers book',            '🔢', 'Three digits, lunchtime bets, a runner on every corner.'],
      ['slots',      'Slot route',              '🎰', 'Twelve machines in eleven back rooms and one garage.'],
      ['bookmaking', 'Bookmaking office',       '📓', 'Sports results settle faster than debts do.'],
      ['loanshark',  'Loan-shark ledger',       '💸', 'Money out at twenty a week, kneecaps as collateral.'],
      ['vending',    'Vending route',           '🧃', 'Machines that never sell what the label says.'],
      ['parking',    'Parking pitch',           '🅿️', 'Every space belongs to somebody. Today it is you.'],
      ['laundry',    'Laundry front',           '🧺', 'Clean sheets on the line and clean money in the till.'],
      ['waste',      'Waste cartel',            '🚛', 'One firm collects. Bids are a formality.'],
      ['contraband', 'Contraband depot',        '📦', 'Nothing in the vans is on any manifest that exists.']
    ])
  },
  {
    id: 'heists', name: 'Heists', ico: '💣', special: 'chain', verb: 'Work', stages: ['Scout it', 'Crew up', 'Pull it'],
    stat: 'dx', unlock: 8, nerve: true, cost: { base: 2500, step: 0.7 },
    pay: { base: 14000, step: 5200, tier: 1500 }, odds: 0.9, heat: 5, hours: 0,
    blurb: 'Three-stage jobs: case the place, assemble the crew, then pull it. Each stage costs real time and real money, and every stage you rushed is a door that will not open when you need it.',
    cats: cat([
      ['bank',      'Bank vault job',        '🏛️', 'Sunday shift, one guard, a vault older than the war.'],
      ['jewelers',  'Jeweller’s window job', '💎', 'Everything in the window is insured. Most of it is also loose.'],
      ['armored',   'Armoured van job',      '🚐', 'The route sheet changes every Tuesday. Mostly.'],
      ['casino',    'Casino cage job',       '🎲', 'Counting room, two cameras, one blind spot.'],
      ['bonds',     'Bond office job',       '📜', 'Bearer bonds are cash that refuses to be traced.'],
      ['gallery',   'Gallery night job',     '🖼️', 'The alarms are new. The locks are not.'],
      ['pharmacy',  'Pharmacy raid',         '💊', 'Antibiotics, opioids and a back door nobody locks.'],
      ['freight',   'Freight yard job',      '🚂', 'Container numbers are only checked at the far end.'],
      ['vaultroom', 'Counting-house job',    '🔐', 'Where the bookmakers bank their week.'],
      ['museum',    'Museum job',            '🏺', 'One glass case, four hundred years of paperwork.']
    ])
  },
  {
    id: 'runs', name: 'Smuggling runs', ico: '🚚', special: 'run', verb: 'Run',
    stat: 'sp', unlock: 4, nerve: true, cost: { base: 900, step: 0.6 },
    pay: { base: 5200, step: 1500, tier: 620 }, odds: 0.88, heat: 4, hours: 0,
    blurb: 'One van, one border, one night. Payout scales with how much you dare carry, and the odds turn ugly in fog and storms — but weather also hides a loaded van from the wrong eyes.',
    cats: cat([
      ['cigs',      'Cigarette run',       '🚬', 'Duty-free by the crate, no questions at the gate.'],
      ['spirits',   'Spirit run',          '🥃', 'Barrels in the back, marked as feed.'],
      ['pharma',    'Pharmaceutical run',  '💊', 'Hospital stock that never reached a hospital.'],
      ['fireworks', 'Fireworks run',       '🎆', 'Illegal, loud, and gone before anyone complains.'],
      ['diamonds',  'Diamond run',         '💎', 'Rough stones in a tin of coffee.'],
      ['weapons',   'Weapons run',         '🔫', 'Wrapped, greased, and counted twice at the far end.'],
      ['people',    'Passage run',         '🛶', 'Somebody’s whole family in the back, quietly.'],
      ['art',       'Art run',             '🖼️', 'A wooden crate that must not get wet.'],
      ['fuel',      'Fuel run',            '⛽', 'Bowsers switched at the services, paperwork in the glovebox.'],
      ['fake',      'Counterfeit run',     '💵', 'Paper that is worth something only until it is spent.']
    ])
  },
  {
    id: 'prints', name: 'Forgery', ico: '🖨️', special: 'forgery', verb: 'Print',
    stat: 'sp', unlock: 3, cost: { base: 1200, step: 0.55 },
    pay: { base: 0, step: 0, tier: 0 }, odds: 0.94, heat: 1, hours: 0, storeHours: 48,
    blurb: 'Papers earn their keep later. A freshly printed document sits in your pocket as a one-shot shield: it can shred a pinch of heat, shave a bail demand, or walk a charge back off the desk.',
    cats: cat([
      ['ids',        'Identity card',       '🪪', 'A name that has never been in trouble.'],
      ['passports',  'Passport',            '📕', 'Stamped in a country that does not answer letters.'],
      ['permits',    'Work permit',         '📋', 'Everything official is a formality after one of these.'],
      ['plates',     'Plate set',           '🚗', 'Two clean numbers for a car that should not exist.'],
      ['notes',      'Banknote plates',     '💷', 'The paper is the hard part. The ink is chemistry.'],
      ['cheques',    'Cheque book',         '🧾', 'Draw on an account that closed in 2019.'],
      ['deeds',      'Property deed',       '🏠', 'A building that can be sold, if nobody checks.'],
      ['badges',     'Warrant card',        '🎫', 'Open a door, close a file, walk out again.'],
      ['papers',     'Court papers',        '⚖️', 'A continuance nobody in the room can argue with.'],
      ['certs',      'Certificates',        '🎓', 'Qualifications that were earned at a desk in the back.']
    ])
  },
  {
    id: 'muscle', name: 'Muscle work', ico: '🥊', special: 'muscle', verb: 'Take',
    stat: 'st', unlock: 4, nerve: true, cost: { base: 400, step: 0.35 },
    pay: { base: 3100, step: 1150, tier: 420 }, odds: 0.9, heat: 3, hours: 0, buffHours: 3,
    blurb: 'Collections, doors and escorts. Real money, real reputations, and a real chance somebody calls it in — but a fortnight of this work leaves your hands heavy for whatever comes next.',
    cats: cat([
      ['collections', 'Collection job',     '💷', 'Somebody owes somebody. You are the somebody in between.'],
      ['protection',  'Standing protection','🛡️', 'Stand where you can be seen. That is the entire job.'],
      ['doors',       'Door work',          '🚪', 'Decide who comes in, and make it stick.'],
      ['evictions',   'Eviction job',       '📦', 'Furniture on the pavement by eleven.'],
      ['escort',      'Escort job',         '🚶', 'Walk beside somebody who is frightened.'],
      ['wrecking',    'Wrecking shift',     '🔨', 'Every fixture in the room, back to plaster.'],
      ['intimidation','Intimidation job',   '😠', 'No contact. Just a name that arrives before you do.'],
      ['buyout',      'Debt buyout',        '📉', 'You buy the paper cheap and collect it whole.'],
      ['witness',     'Witness chase',      '👁️', 'Find them before the other side does.'],
      ['union',       'Union vote job',     '🗳️', 'A card count, a car park, and one reluctant man.']
    ])
  },
  {
    id: 'chops', name: 'Chop shop', ico: '🔧', special: 'chop', verb: 'Break down',
    stat: 'de', unlock: 5, cost: { base: 300, step: 0.4 },
    pay: { base: 3400, step: 1400, tier: 380 }, odds: 0.95, heat: 3, hours: 0, carMin: true,
    blurb: 'Everything in this yard was somebody else’s car this morning. Higher grades ask for better metal — bring a machine matching the grade and it comes apart beautifully.',
    cats: cat([
      ['saloon',    'Saloon strip-down',   '🚙', 'Four doors, one buyer, no paperwork.'],
      ['coupe',     'Coupé strip-down',    '🚗', 'Fast and wanted, which is why it is here.'],
      ['roadster',  'Roadster strip-down', '🏎️', 'Soft top, hard money.'],
      ['limo',      'Limousine strip-down','🚘', 'Wiped down, stripped, and quietly sold in panels.'],
      ['motorcycle','Motorcycle break-up', '🏍️', 'Engine out, frame cut, chrome gone by dawn.'],
      ['lorry',     'Lorry break-up',      '🚛', 'Too big to hide is too big to leave alone.'],
      ['armored',   'Armoured-shell cut',  '🛡️', 'The panels are worth more than the vehicle.'],
      ['vintage',   'Vintage break-up',    '🚕', 'Wrong to cut. Right price.'],
      ['exotic',    'Exotic teardown',     '🐎', 'Nobody in this yard will ever see another one.'],
      ['prototype', 'Prototype dissection','🧪', 'Serial numbers filed off in the first ten minutes.']
    ])
  },
  {
    id: 'cyber', name: 'Cyber jobs', ico: '💻', special: 'cyber', verb: 'Work',
    stat: 'dx', unlock: 6, cost: { base: 700, step: 0.5 },
    pay: { base: 4200, step: 1700, tier: 520 }, odds: 0.89, heat: 2, hours: 0,
    blurb: 'Records, wallets, cameras and rails. Some of these pay in clean numbers that land in the wallet instantly; the deep ones buy you files — and files change odds everywhere else.',
    cats: cat([
      ['records',   'Record wipe',        '🗄️', 'A file goes missing and a charge follows it.'],
      ['wallets',   'Wallet drain',        '👛', 'Keys found in a pastebin like it is still 2014.'],
      ['cameras',   'Camera blind',        '📹', 'Four hours of empty footage on a busy street.'],
      ['ledgers',   'Ledger lift',         '📊', 'Someone else’s bookkeeping, in your pocket.'],
      ['boards',    'Message board crawl', '📻', 'The city talks constantly. You just have to listen.'],
      ['grid',      'Grid job',            '🔌', 'Two substations and a very dark block.'],
      ['casino',    'Casino software',     '🎰', 'The house edge had a typo in the source.'],
      ['rails',     'Bank rails job',      '🏦', 'Small, slow, and untraceable for now.'],
      ['traffic',   'Traffic control',     '🚦', 'Green all the way to the docks and nobody in the way.'],
      ['satellites','Satellite time',      '🛰️', 'Borrowed eyes over a borrowed city.']
    ])
  },
  {
    id: 'clinic', name: 'Back-alley clinic', ico: '🩺', special: 'clinic', verb: 'Visit',
    stat: 'de', unlock: 3, cost: { base: 600, step: 0.45 },
    pay: { base: 0, step: 0, tier: 0 }, odds: 0.96, heat: 1, hours: 0, buffHours: 4,
    blurb: 'No forms, no questions. Stitches and blood work put you back on the street tonight; the expensive grades leave you tougher than you started, for a few hours at least.',
    cats: cat([
      ['stitch',     'Stitch-up',       '🧵', 'Sixty seconds and a curved needle.'],
      ['blood',      'Blood work',      '🩸', 'A pint back, no questions about the last one.'],
      ['dentist',    'Back-room dentist','🦷', 'Extraction, replacement, or a little cosmetic work.'],
      ['optician',   'Knock-off optician','👓', 'Lenses ground to your own prescription.'],
      ['bones',      'Bone setting',    '🦴', 'Splint, tape, and a countdown to full speed.'],
      ['burns',      'Burn care',       '🔥', 'Dressed properly instead of badly.'],
      ['detox',      'Detox bed',       '💉', 'Two days in a locked room and a new blood count.'],
      ['transplant', 'Field transplant','🫀', 'Do not ask where it came from. Ask how you feel.'],
      ['prosthetics','Prosthetics bench','🦿', 'Metal where bone used to be, and it works.'],
      ['pharmacy',   'Clinic pharmacy', '💊', 'Whatever the last job left in the back room.']
    ])
  },
  {
    id: 'art', name: 'Art & collectibles', ico: '🖼️', special: 'art', verb: 'Acquire',
    stat: 'sp', unlock: 6, cost: { base: 8000, step: 0.9 },
    pay: { base: 0, step: 0, tier: 0 }, odds: 0.92, heat: 1, hours: 0, vault: 12, appHours: 3,
    blurb: 'Pieces that get more valuable while they sit in your vault. Buy low from people who cannot hold on, sell high to people who cannot resist, and mind the storage — the vault only holds so much.',
    cats: cat([
      ['oil',        'Oil painting',    '🎨', 'Signed, varnished, and missing from a catalogue.'],
      ['sculpture',  'Bronze sculpture','🗿', 'Heavy, beautiful, and impossible to move quietly.'],
      ['antique',    'Antique furniture','🪑', 'Three hundred years old and worth more every season.'],
      ['jewel',      'Jewellery box',   '💎', 'Someone’s whole inheritance in one small case.'],
      ['manuscript', 'Manuscript page', '📜', 'A single page worth more than the book it left.'],
      ['coin',       'Coin set',        '🪙', 'Mint marks, errors, and one coin nobody can price.'],
      ['stamp',      'Stamp album',     '📮', 'Gum intact, hinge free, catalogue number memorised.'],
      ['watch',      'Watch collection','⌚', 'Six movements, five of them running.'],
      ['vinyl',      'Vinyl crate',     '🎵', 'First pressings, water-damaged sleeves, perfect records.'],
      ['relic',      'Relic piece',     '🏺', 'Provenance is a story; the story is the price.']
    ])
  },
  {
    id: 'circuits', name: 'Street circuits', ico: '🏁', special: 'race', verb: 'Enter',
    stat: 'dx', unlock: 5, cost: { base: 500, step: 0.5 },
    pay: { base: 6000, step: 2600, tier: 700 }, odds: 0.62, heat: 4, hours: 0, carMin: true,
    blurb: 'Ten circuits, ten fields, ten grades of fool. Your car’s rating is your whole argument — enter a nail in a fast field and you will pay for the privilege, then pay the body shop too.',
    cats: cat([
      ['docks',     'Docks Sprint',        '🏁', 'Four corners, one bridge, no marshals.'],
      ['canal',     'Canal Loop',          '🌊', 'Wet tarmac all year and a wall with your name on it.'],
      ['market',    'Night Market Dash',   '🏮', 'Stalls in the road and a crowd that cannot move.'],
      ['foundry',   'Foundry Drag',        '🔥', 'Half a mile of hot steel and no brakes to speak of.'],
      ['halo',      'Halo Hill Climb',     '⛰️', 'Uphill, blind, and lined with expensive cars.'],
      ['kingsway',  'Kingsway Run',        '🛣️', 'Wide, fast, and watched from three directions.'],
      ['redmile',   'Red Mile Circuit',    '🔴', 'The long one. Fifty minutes of nerve.'],
      ['exchange',  'Exchange Time Trial', '⏱️', 'Alone against the clock and last month’s record.'],
      ['underpass', 'Underpass Sprint',    '🌃', 'Two lanes, echo, and nowhere to spin.'],
      ['glassq',    'Glass Quarter Grand', '🏙️', 'Smooth cobbles, expensive kerbs, zero forgiveness.']
    ])
  }
];

// ================================================================ build the 10,000
const OPS = [];
const BY_ID = Object.create(null);
const BY_FAM = Object.create(null);

for (const fam of FAMILIES) {
  BY_FAM[fam.id] = [];
  fam.short = fam.id.slice(0, 3);
  for (const c of fam.cats) {
    for (const d of DISTRICTS) {
      for (const g of GRADES) {
        const id = `${fam.id}_${c.id}_${d.id}_${g.i}`;
        const h = hash32(id);
        const jitter = ((h % 200) - 100) / 1000;            // -10% .. +10%
        const payMin = Math.max(0, round((fam.pay.base + g.i * fam.pay.step + d.tier * fam.pay.tier) * (1 + jitter), 50));
        const payMax = Math.max(0, round(payMin * (1.45 + ((h >> 7) % 40) / 100), 50));
        const cost = fam.cost ? Math.max(0, round(fam.cost.base * (1 + g.i * fam.cost.step) * (1 + d.tier * 0.22), 50)) : 0;
        const odds = clamp(fam.odds - g.i * 0.044 - d.tier * 0.009 + ((h >> 11) % 60) / 1000, 0.16, 0.96);
        const op = {
          id, fam: fam.id, famName: fam.name, famIco: fam.ico, special: fam.special,
          cat: c.id, ico: c.ico, catName: c.name, line: c.line,
          district: d.id, districtName: d.name, districtTier: d.tier,
          grade: g.i, gradeName: g.name, roman: g.roman,
          serial: OPS.length + 1,
          name: `${c.name} · ${d.name}`,
          tag: `${fam.name} ${g.roman} — ${g.name}`,
          blurb: `${c.line} ${d.line}`,
          stat: fam.stat,
          level: 1 + g.i * 6 + Math.round(d.tier * 1.4),
          crew: fam.id === 'heists' ? 1 + Math.floor(g.i / 2) + (d.tier > 5 ? 1 : 0)
              : (fam.id === 'muscle' && g.i >= 3) ? 1 : 0,
          energy: 5 + Math.round(g.i * 1.7) + Math.floor(d.tier * 0.9),
          nerve: fam.nerve ? 1 + Math.round(g.i * 0.8) + Math.floor(d.tier / 4) : 0,
          cash: cost, min: payMin, max: payMax,
          xp: 12 + g.i * 16 + d.tier * 3,
          rep: 1 + Math.floor(g.i * 0.9) + Math.floor(d.tier / 3),
          heat: fam.heat + Math.round(g.i * 0.7),
          chance: Math.round(odds * 100),
          hours: fam.hours || 0,
          capHours: fam.capHours || 0,
          buffHours: fam.buffHours || 0,
          carMin: fam.carMin ? 35 + g.i * 5 + d.tier * 2 : 0,
          vault: fam.vault || 0,
          appHours: fam.appHours || 0
        };
        OPS.push(op);
        BY_ID[id] = op;
        BY_FAM[fam.id].push(op);
      }
    }
  }
}

// A thousand operations per family, ten thousand in all — assert it every boot.
const PER_FAMILY = DISTRICTS.length * GRADES.length * FAMILIES[0].cats.length; // 1,000
const EXPECTED = FAMILIES.length * PER_FAMILY;                                 // 10,000
if (OPS.length !== EXPECTED) throw new Error(`ops catalog must hold ${EXPECTED} operations, found ${OPS.length}`);
for (const fam of FAMILIES) if (BY_FAM[fam.id].length !== PER_FAMILY) throw new Error(`ops family ${fam.id} must hold ${PER_FAMILY}, found ${BY_FAM[fam.id].length}`);

function byId(id) { return BY_ID[id] || null; }
function byFamily(famId) { return BY_FAM[famId] || []; }

// One deterministic line of colour per operation so the board never reads like a spreadsheet.
const FLAVOUR = [
  'Everyone who mattered here is already paid off.',
  'Two exits, one of them honest.',
  'The neighbours have learned to look away.',
  'It changes hands every few years, badly.',
  'Nobody has counted the stock since spring.',
  'The paperwork is real. The business is not.',
  'There is a policeman on the corner who owes a favour.',
  'It runs itself until it suddenly does not.',
  'Somebody talks on Fridays.',
  'The last man who tried this left town.'
];
function flavour(op) { return FLAVOUR[hash32(op.id + ':f') % FLAVOUR.length]; }

module.exports = {
  FAMILIES, DISTRICTS, GRADES, OPS, BY_ID,
  byId, byFamily, flavour, hash32,
  PER_FAMILY, TOTAL: OPS.length
};
