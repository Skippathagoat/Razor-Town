// Razor Town — City Contracts catalog.
// 10 playbooks × 10 objectives × 10 sectors = 1,000 playable contract variants.
'use strict';

const PLAYBOOKS = [
  { id: 'broker', icon: '📡', verb: 'Broker', lead: 'A fixer needs a quiet handoff for' },
  { id: 'audit', icon: '📋', verb: 'Audit', lead: 'A shell company has left a loose thread around' },
  { id: 'recover', icon: '🧲', verb: 'Recover', lead: 'Someone important misplaced' },
  { id: 'route', icon: '🗺️', verb: 'Route', lead: 'A courier needs a clean path for' },
  { id: 'cover', icon: '🎭', verb: 'Cover', lead: 'A nervous client needs a convincing story around' },
  { id: 'trace', icon: '🔎', verb: 'Trace', lead: 'The night desk wants eyes on' },
  { id: 'secure', icon: '🔐', verb: 'Secure', lead: 'A back-room contact needs protection for' },
  { id: 'brokerage', icon: '🤝', verb: 'Settle', lead: 'Two crews need a neutral voice over' },
  { id: 'signal', icon: '📻', verb: 'Signal', lead: 'A rooftop operator needs a discreet relay for' },
  { id: 'sweep', icon: '🧹', verb: 'Sweep', lead: 'The city has left evidence near' }
];

const OBJECTIVES = [
  { id: 'relay_shipment', name: 'a relay shipment' },
  { id: 'maintenance_ledger', name: 'a maintenance ledger' },
  { id: 'night_key', name: 'a night key' },
  { id: 'sealed_case', name: 'a sealed case' },
  { id: 'courier_route', name: 'a courier route' },
  { id: 'venue_manifest', name: 'a venue manifest' },
  { id: 'lost_device', name: 'a lost device' },
  { id: 'dock_receipt', name: 'a dock receipt' },
  { id: 'service_badge', name: 'a service badge' },
  { id: 'quiet_favor', name: 'a quiet favour' }
];

const SECTORS = [
  { id: 'underpass', name: 'the Underpass', line: 'The traffic above drowns out every loose word.' },
  { id: 'old_quay', name: 'Old Quay', line: 'The tide clocks every arrival and never signs a receipt.' },
  { id: 'exchange', name: 'the Exchange', line: 'Everyone is watching their own reflection, not yours.' },
  { id: 'foundry', name: 'the Foundry', line: 'Shift changes create a gap if you know where to stand.' },
  { id: 'night_market', name: 'the Night Market', line: 'A crowd is cover until it suddenly is not.' },
  { id: 'civic_ring', name: 'the Civic Ring', line: 'The cameras point everywhere except the service lane.' },
  { id: 'canal_walk', name: 'Canal Walk', line: 'Rain turns the pavement into a second sky.' },
  { id: 'tower_row', name: 'Tower Row', line: 'The lobby is polished, but the loading dock is honest.' },
  { id: 'rail_yard', name: 'the Rail Yard', line: 'Freight noise gives you a rhythm to work inside.' },
  { id: 'glass_district', name: 'the Glass District', line: 'Every clean window hides a less clean back room.' }
];

const WEATHER_EDGES = ['clear', 'rain', 'fog', 'wind', 'storm', 'heat'];

const CITY_CONTRACTS = [];
for (let playbookIndex = 0; playbookIndex < PLAYBOOKS.length; playbookIndex++) {
  for (let objectiveIndex = 0; objectiveIndex < OBJECTIVES.length; objectiveIndex++) {
    for (let sectorIndex = 0; sectorIndex < SECTORS.length; sectorIndex++) {
      const playbook = PLAYBOOKS[playbookIndex];
      const objective = OBJECTIVES[objectiveIndex];
      const sector = SECTORS[sectorIndex];
      const serial = playbookIndex * 100 + objectiveIndex * 10 + sectorIndex;
      const risk = (playbookIndex * 7 + objectiveIndex * 5 + sectorIndex * 3) % 8;
      const tier = 1 + Math.floor((playbookIndex + objectiveIndex + sectorIndex) / 7);
      const minimum = 900 + tier * 850 + risk * 240 + (serial % 5) * 90;
      CITY_CONTRACTS.push({
        id: `contract_${playbook.id}_${objective.id}_${sector.id}`,
        serial: serial + 1,
        icon: playbook.icon,
        name: `${playbook.verb} ${objective.name} — ${sector.name}`,
        sector: sector.name,
        blurb: `${playbook.lead} ${objective.name}. ${sector.line}`,
        energy: 4 + ((playbookIndex * 3 + objectiveIndex * 5 + sectorIndex * 7) % 12),
        nerve: 1 + ((playbookIndex + objectiveIndex * 2 + sectorIndex * 3) % 5),
        chance: 57 + ((playbookIndex * 11 + objectiveIndex * 7 + sectorIndex * 5) % 29),
        cash: [minimum, minimum + 1100 + tier * 950 + risk * 300],
        reputation: 3 + tier * 2 + Math.floor(risk / 3),
        xp: 5 + tier * 3,
        weather: WEATHER_EDGES[(playbookIndex + objectiveIndex + sectorIndex) % WEATHER_EDGES.length]
      });
    }
  }
}

if (CITY_CONTRACTS.length !== 1000) throw new Error('City Contracts catalog must contain exactly 1,000 entries.');

module.exports = { CITY_CONTRACTS, PLAYBOOKS, OBJECTIVES, SECTORS };
