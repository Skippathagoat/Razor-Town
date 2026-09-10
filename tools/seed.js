// Manually (re)seed the world with fresh bot citizens + NPC factions.
// Usage: npm run seed   (existing players are kept; only adds bots if missing)
'use strict';
require('../lib/db.js').init();
require('../lib/seed.js').seedWorld({ bots: 42 });
console.log('World seeded. Start the server with: npm start');
