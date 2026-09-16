// Razor Town — Night Briefs catalog.
// 10 desks × 10 briefs × 10 blocks = 1,000 playable night jobs.
'use strict';

const DESKS = [
  { id: 'whisper', icon: '🌙', verb: 'Whisper', lead: 'A night desk wants a quiet word about' },
  { id: 'shadow', icon: '🕶️', verb: 'Shadow', lead: 'Someone needs a tail on' },
  { id: 'lift', icon: '🧳', verb: 'Lift', lead: 'A buyer will pay if you can retrieve' },
  { id: 'plant', icon: '📌', verb: 'Plant', lead: 'A rival needs a planted story around' },
  { id: 'listen', icon: '🎧', verb: 'Listen', lead: 'A tap is waiting near' },
  { id: 'swap', icon: '🔄', verb: 'Swap', lead: 'Two parcels need exchanging involving' },
  { id: 'clean', icon: '✨', verb: 'Clean', lead: 'A mess needs vanishing around' },
  { id: 'open', icon: '🗝️', verb: 'Open', lead: 'A lock is keeping you from' },
  { id: 'ferry', icon: '🚤', verb: 'Ferry', lead: 'A boatman wants a passenger for' },
  { id: 'mark', icon: '🎯', verb: 'Mark', lead: 'A name needs watching around' }
];

const BRIEFS = [
  { id: 'lost_envelope', name: 'a lost envelope' },
  { id: 'night_photo', name: 'a night photograph' },
  { id: 'spare_badge', name: 'a spare badge' },
  { id: 'signed_chit', name: 'a signed chit' },
  { id: 'warm_key', name: 'a still-warm key' },
  { id: 'burner_list', name: 'a burner list' },
  { id: 'dock_crate', name: 'a dock crate' },
  { id: 'club_pass', name: 'a club pass' },
  { id: 'quiet_debt', name: 'a quiet debt' },
  { id: 'glass_sample', name: 'a glass sample' }
];

const BLOCKS = [
  { id: 'lamp_row', name: 'Lamp Row', line: 'The lamps buzz loud enough to hide a footstep.' },
  { id: 'back_arcade', name: 'the Back Arcade', line: 'Machines cover every cough and every click.' },
  { id: 'steel_bridge', name: 'Steel Bridge', line: 'Wind off the canal carries voices the wrong way.' },
  { id: 'chapel_cut', name: 'Chapel Cut', line: 'Nobody looks twice at a late walker here.' },
  { id: 'yard_gates', name: 'the Yard Gates', line: 'Shift change is a ten-minute country of its own.' },
  { id: 'hotel_service', name: 'Hotel Service', line: 'The staff door never quite latches.' },
  { id: 'market_stalls', name: 'the Market Stalls', line: 'Canvas walls make excellent cover.' },
  { id: 'tram_loop', name: 'the Tram Loop', line: 'Empty cars rattle on a schedule you can set a watch to.' },
  { id: 'roof_garden', name: 'the Roof Garden', line: 'The city looks the other way from up here.' },
  { id: 'lock_cut', name: 'Lock Cut', line: 'Barges bump and the cameras fog over.' }
];

const WEATHER_EDGES = ['clear', 'rain', 'fog', 'wind', 'storm', 'heat'];

const NIGHT_LEADS = [];
for (let d = 0; d < DESKS.length; d++) {
  for (let b = 0; b < BRIEFS.length; b++) {
    for (let k = 0; k < BLOCKS.length; k++) {
      const desk = DESKS[d];
      const brief = BRIEFS[b];
      const block = BLOCKS[k];
      const serial = d * 100 + b * 10 + k;
      const risk = (d * 5 + b * 7 + k * 3) % 8;
      const tier = 1 + Math.floor((d + b + k) / 7);
      const minimum = 700 + tier * 720 + risk * 180 + (serial % 7) * 70;
      NIGHT_LEADS.push({
        id: `night_${desk.id}_${brief.id}_${block.id}`,
        serial: serial + 1,
        icon: desk.icon,
        name: `${desk.verb} ${brief.name} — ${block.name}`,
        sector: block.name,
        blurb: `${desk.lead} ${brief.name}. ${block.line}`,
        energy: 3 + ((d * 2 + b * 4 + k * 5) % 10),
        nerve: 1 + ((d + b * 3 + k) % 4),
        chance: 54 + ((d * 9 + b * 6 + k * 4) % 32),
        cash: [minimum, minimum + 900 + tier * 800 + risk * 220],
        reputation: 2 + tier + Math.floor(risk / 4),
        xp: 4 + tier * 2,
        weather: WEATHER_EDGES[(d + b + k) % WEATHER_EDGES.length]
      });
    }
  }
}

if (NIGHT_LEADS.length !== 1000) throw new Error('Night Briefs catalog must contain exactly 1,000 entries.');

module.exports = { NIGHT_LEADS, DESKS, BRIEFS, BLOCKS };
