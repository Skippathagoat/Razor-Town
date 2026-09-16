// Razor Town — Wire Favours catalog.
// 10 desks × 10 favours × 6 corners = 600 playable day jobs on the wire.
'use strict';

const DESKS = [
  { id: 'tip', icon: '📡', verb: 'Tip', lead: 'A whisper on the wire wants a hand with' },
  { id: 'drop', icon: '📦', verb: 'Drop', lead: 'A courier desk needs a quiet drop of' },
  { id: 'hold', icon: '🤲', verb: 'Hold', lead: 'Someone needs you to sit on' },
  { id: 'pass', icon: '➡️', verb: 'Pass', lead: 'A handshake is waiting for' },
  { id: 'watch', icon: '👁️', verb: 'Watch', lead: 'A lookout is needed around' },
  { id: 'fix', icon: '🔧', verb: 'Fix', lead: 'A fixer needs you to sort' },
  { id: 'buy', icon: '💵', verb: 'Buy', lead: 'A silent buyer is circling' },
  { id: 'sell', icon: '🏷️', verb: 'Sell', lead: 'A stall wants you to move' },
  { id: 'warn', icon: '⚠️', verb: 'Warn', lead: 'A friend of a friend needs word about' },
  { id: 'collect', icon: '🧲', verb: 'Collect', lead: 'The desk wants you to pick up' }
];

const FAVOURS = [
  { id: 'spare_ticket', name: 'a spare ticket' },
  { id: 'warm_parcel', name: 'a warm parcel' },
  { id: 'folded_note', name: 'a folded note' },
  { id: 'borrowed_pass', name: 'a borrowed pass' },
  { id: 'quiet_envelope', name: 'a quiet envelope' },
  { id: 'shop_keys', name: 'a set of shop keys' },
  { id: 'shift_list', name: 'a shift list' },
  { id: 'counter_bag', name: 'a counter bag' },
  { id: 'loan_chit', name: 'a loan chit' },
  { id: 'door_code', name: 'a door code' }
];

const CORNERS = [
  { id: 'bus_shelter', name: 'the Bus Shelter', line: 'The timetable never matches the street.' },
  { id: 'chippy_queue', name: 'the Chippy Queue', line: 'Steam and vinegar cover every whisper.' },
  { id: 'car_park', name: 'the Multi-storey', line: 'Level four is always empty at this hour.' },
  { id: 'laundrette', name: 'the Laundrette', line: 'Dryers drown a conversation if you time it.' },
  { id: 'bookies', name: 'the Bookies', line: 'Nobody looks up from the screens.' },
  { id: 'canal_steps', name: 'the Canal Steps', line: 'Barges hide a handover better than alleys.' }
];

const WEATHER_EDGES = ['clear', 'rain', 'fog', 'wind', 'storm', 'heat'];

const WIRE_FAVOURS = [];
for (let d = 0; d < DESKS.length; d++) {
  for (let f = 0; f < FAVOURS.length; f++) {
    for (let c = 0; c < CORNERS.length; c++) {
      const desk = DESKS[d];
      const fav = FAVOURS[f];
      const corner = CORNERS[c];
      const serial = d * 60 + f * 6 + c;
      const risk = (d * 3 + f * 5 + c * 7) % 8;
      const tier = 1 + Math.floor((d + f + c) / 8);
      const minimum = 500 + tier * 480 + risk * 140 + (serial % 9) * 40;
      WIRE_FAVOURS.push({
        id: `favour_${desk.id}_${fav.id}_${corner.id}`,
        serial: serial + 1,
        icon: desk.icon,
        name: `${desk.verb} ${fav.name} — ${corner.name}`,
        sector: corner.name,
        blurb: `${desk.lead} ${fav.name}. ${corner.line}`,
        energy: 2 + ((d * 2 + f * 3 + c * 4) % 8),
        nerve: 1 + ((d + f * 2 + c) % 3),
        chance: 58 + ((d * 7 + f * 5 + c * 3) % 28),
        cash: [minimum, minimum + 600 + tier * 520 + risk * 160],
        reputation: 1 + tier + Math.floor(risk / 4),
        xp: 3 + tier * 2,
        weather: WEATHER_EDGES[(d + f + c) % WEATHER_EDGES.length]
      });
    }
  }
}

if (WIRE_FAVOURS.length !== 600) throw new Error('Wire Favours catalog must contain exactly 600 entries.');

module.exports = { WIRE_FAVOURS, DESKS, FAVOURS, CORNERS };
