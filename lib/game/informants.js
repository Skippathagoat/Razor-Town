// Razor Town — The Informant Network catalogue.
// 10 circles × 10 districts × 10 trades = exactly 1,000 hireable informants.
// Each one is an individual, deterministic, server-owned lead: own name, own patch of the
// city, own trade, own price, own reliability, own strength and duration.
'use strict';

// ---------------------------------------------------------------- the ten circles
// rank drives price & reliability; each circle talks to a different part of the machine.
const CIRCLES = [
  { id: 'dockers',  icon: '⚓', name: 'Dockers',      rank: 0, rel: 0.02, line: 'Crane-men who count what goes on the night manifests.' },
  { id: 'cabbies',  icon: '🚕', name: 'Cabbies',      rank: 1, rel: 0.05, line: 'Hack drivers who know who a fare really is before they sit down.' },
  { id: 'bookies',  icon: '🎲', name: 'Bookies',      rank: 2, rel: 0.03, line: 'Runners with a ledger of every debt and every favour.' },
  { id: 'barmaids', icon: '🍸', name: 'Barmaids',     rank: 3, rel: 0.06, line: 'They hear the confession before the drink is even poured.' },
  { id: 'fencers',  icon: '🧰', name: 'Fencers',      rank: 4, rel: 0.04, line: 'They know what went missing this week — and who is moving it.' },
  { id: 'printers', icon: '🖨️', name: 'Printers',     rank: 5, rel: 0.03, line: 'IDs, papers, plates. Nothing leaves the shop without a copy.' },
  { id: 'clerks',   icon: '🗄️', name: 'Clerks',       rank: 6, rel: 0.05, line: 'Town hall files, deeds, and the letters nobody is supposed to read.' },
  { id: 'medics',   icon: '🩺', name: 'Medics',       rank: 7, rel: 0.04, line: 'Back-room surgeons who stitch the night back together.' },
  { id: 'coppers',  icon: '🚔', name: 'Coppers',      rank: 8, rel: -0.04, line: 'Bent badges. Expensive, twitchy, and worth every note.' },
  { id: 'runners',  icon: '📻', name: 'Runners',      rank: 9, rel: 0.01, line: 'Couriers of the wire — they hear the city before the city does.' }
];

// ---------------------------------------------------------------- the ten districts
const DISTRICTS = [
  { id: 'lamp_row',      name: 'Lamp Row',      tier: 0, line: 'Gas lamps and long shadows.' },
  { id: 'back_arcade',   name: 'the Back Arcade', tier: 1, line: 'Slot machines drown out every whisper.' },
  { id: 'steel_bridge',  name: 'Steel Bridge',  tier: 2, line: 'Wind off the canal carries voices the wrong way.' },
  { id: 'chapel_cut',    name: 'Chapel Cut',    tier: 3, line: 'Nobody looks twice at a late walker.' },
  { id: 'yard_gates',    name: 'the Yard Gates', tier: 4, line: 'Shift change is a ten-minute country of its own.' },
  { id: 'hotel_service', name: 'Hotel Service', tier: 5, line: 'The staff door never quite latches.' },
  { id: 'market_stalls', name: 'the Market',    tier: 6, line: 'Canvas walls make excellent cover.' },
  { id: 'tram_loop',     name: 'the Tram Loop', tier: 7, line: 'Empty cars rattle on a watchmaker’s schedule.' },
  { id: 'roof_garden',   name: 'the Roof Garden', tier: 8, line: 'The city looks the other way from up here.' },
  { id: 'lock_cut',      name: 'Lock Cut',      tier: 9, line: 'Barges bump and the cameras fog over.' }
];

// ---------------------------------------------------------------- the ten trades (tip kinds)
// kind is what the intel actually does; strength is a percentage or an instant value.
const TRADES = [
  { id: 'edge',    kind: 'edge',    icon: '🎯', name: 'Job intel',       tier: 3, strength: 12, dur: 180,
    verb: 'walks you through', line: 'Guard rotations, the loose hinge, the camera that never came back from repair.' },
  { id: 'payoff',  kind: 'payoff',  icon: '💷', name: 'Payout tip',      tier: 4, strength: 25, dur: 180,
    verb: 'tells you what the load is worth', line: 'Bid high on the next one — the buyer is desperate and everyone knows it.' },
  { id: 'fence',   kind: 'fence',   icon: '🏷️', name: 'Fence intro',     tier: 5, strength: 30, dur: 240,
    verb: 'spreads word to', line: 'A fence who will not haggle you into the floor this week.' },
  { id: 'bail',    kind: 'bail',    icon: '⚖️', name: 'Magistrate nudge', tier: 6, strength: 35, dur: 240,
    verb: 'covers you with', line: 'A clerk who owes a favour and a magistrate who has a golf habit.' },
  { id: 'muscle',  kind: 'muscle',  icon: '🥊', name: 'Fight corner',    tier: 5, strength: 18, dur: 150,
    verb: 'wires round about', line: 'Which boys are carrying, and which ones are bluffing.' },
  { id: 'crew',    kind: 'crew',    icon: '🪓', name: 'Crew whisper',    tier: 7, strength: 15, dur: 200,
    verb: 'briefs the crew about', line: 'The other firm’s shift change, their armorer, their weak door.' },
  { id: 'heat',    kind: 'heat',    icon: '🧊', name: 'Heat cooler',     tier: 4, strength: 22, dur: 0,
    verb: 'cools the tail on', line: 'Two officers go on leave, one file goes missing.' },
  { id: 'patch',   kind: 'patch',   icon: '🩹', name: 'Back-room patch', tier: 3, strength: 35, dur: 0,
    verb: 'opens a clinic on', line: 'No forms, no questions, no scar worth mentioning.' },
  { id: 'market',  kind: 'market',  icon: '📈', name: 'Market tip',      tier: 6, strength: 18000, dur: 0,
    verb: 'reads the board on', line: 'A block of shares moving quieter than it should.' },
  { id: 'bribe',   kind: 'bribe',   icon: '🔑', name: 'Cell-door key',   tier: 8, strength: 30, dur: 0,
    verb: 'knows a screw on', line: 'A sentence can get shorter. Nobody asks how.' }
];

const FIRST = ['Wilf', 'Maud', 'Alfie', 'Nell', 'Bert', 'Rosa', 'Cyril', 'Ida', 'Amos', 'Vera'];
const LAST = ['Hardacre', 'Boyles', 'Nuttall', 'Greaves', 'Sedgwick', 'Marsh', 'Duffield', 'Pike', 'Rowbotham', 'Coyle'];
const ALIAS = ['Two-Coat', 'Brass', 'Quiet', 'Half-Mile', 'Penny', 'Blue', 'Left Hook', 'Sparrow', 'Chalk', 'Sunday'];

// ---------------------------------------------------------------- the catalogue (exactly 1,000)
const INFORMANTS = [];
for (let c = 0; c < CIRCLES.length; c++) {
  for (let d = 0; d < DISTRICTS.length; d++) {
    for (let t = 0; t < TRADES.length; t++) {
      const circle = CIRCLES[c], district = DISTRICTS[d], trade = TRADES[t];
      const serial = c * 100 + d * 10 + t;
      const price = Math.round((9000 + circle.rank * 2600 + district.tier * 1400 + trade.tier * 3200) / 100) * 100;
      const reliability = Math.min(0.94, Math.max(0.4, 0.42 + circle.rank * 0.022 + circle.rel + trade.tier * 0.021 - district.tier * 0.004));
      const strength = trade.strength + circle.rank;           // better circles get sharper intel
      INFORMANTS.push({
        id: `inf_${circle.id}_${district.id}_${trade.id}`,
        serial: serial + 1,
        name: `${FIRST[d]} “${ALIAS[t]}” ${LAST[c]}`,
        first: FIRST[d], alias: ALIAS[t], last: LAST[c],
        circle: circle.id, circleName: circle.name, circleIcon: circle.icon,
        district: district.id, districtName: district.name, districtLine: district.line,
        trade: trade.id, tradeName: trade.name, kind: trade.kind, tradeIcon: trade.icon,
        rank: circle.rank, districtTier: district.tier,
        price, reliability: Math.round(reliability * 100) / 100,
        strength, dur: trade.dur,
        icon: trade.icon,
        blurb: `${circle.name} out of ${district.name}: ${trade.verb} ${district.line}`,
        pitch: trade.line
      });
    }
  }
}
if (INFORMANTS.length !== 1000) throw new Error('Informant Network must be exactly 1,000 leads, got ' + INFORMANTS.length);

const BY_ID = {};
for (const inf of INFORMANTS) BY_ID[inf.id] = inf;

// ---------------------------------------------------------------- deterministic board
// Every citizen gets six unique leads per rotation. Server-side only: the rotation is a
// time bucket, so a forged or stale id simply is not on the board.
const ROTATION_MS = 4 * 3600000;
function rotationOf(ts) { return Math.floor((ts == null ? Date.now() : ts) / ROTATION_MS); }
function rotationEnds(rot) { return (rot + 1) * ROTATION_MS; }

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

function board(accId, rot, count) {
  count = Math.min(6, count || 6);
  const start = hash32('inf:' + accId + ':' + rot) % INFORMANTS.length;
  const stride = 137;                                  // co-prime with 1,000 → unique walk
  const out = [];
  const seen = {};
  for (let i = 0; i < INFORMANTS.length && out.length < count; i++) {
    const idx = (start + i * stride) % INFORMANTS.length;
    if (seen[idx]) continue;
    seen[idx] = 1;
    out.push(INFORMANTS[idx]);
  }
  return out;
}

function onBoard(accId, rot, id) { return board(accId, rot, 6).some(x => x.id === id); }
function byId(id) { return BY_ID[id] || null; }
// how much a bought tip is actually worth, after the reliability roll already happened
function tipValue(inf) { return inf.strength; }

module.exports = { INFORMANTS, CIRCLES, DISTRICTS, TRADES, board, onBoard, byId, rotationOf, rotationEnds, ROTATION_MS, tipValue, BY_ID };
