// Razor Town — remove every NPC from the world.
//
//   node tools/purge-npcs.js
//
// Deletes bot accounts, their characters, the seeded NPC gangs and any news that
// mentions them. Real accounts, their progress and any gang a real player founded
// are left completely alone. Players who were members of a deleted gang are simply
// removed from it. Safe to run more than once — a clean world is a no-op.
//
// The server does this automatically whenever BOTS=0 (the default), so you only need
// this to clean an already-running database by hand.
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const { purgeNPCs } = require('../lib/seed.js');

const before = {
  bots: dbm.getDb().prepare("SELECT COUNT(*) c FROM accounts WHERE kind='bot'").get().c,
  factions: dbm.getDb().prepare('SELECT COUNT(*) c FROM factions').get().c,
  accounts: dbm.getDb().prepare('SELECT COUNT(*) c FROM accounts').get().c,
  news: dbm.getDb().prepare('SELECT COUNT(*) c FROM news').get().c,
};

const r = purgeNPCs();

const after = {
  bots: dbm.getDb().prepare("SELECT COUNT(*) c FROM accounts WHERE kind='bot'").get().c,
  factions: dbm.getDb().prepare('SELECT COUNT(*) c FROM factions').get().c,
  accounts: dbm.getDb().prepare('SELECT COUNT(*) c FROM accounts').get().c,
  news: dbm.getDb().prepare('SELECT COUNT(*) c FROM news').get().c,
};

console.log('');
console.log('=== NPC PURGE ===');
console.log('bot accounts removed :', r.bots, `(${before.bots} -> ${after.bots})`);
console.log('characters removed   :', r.characters);
console.log('seeded gangs removed :', r.factions, `(${before.factions} -> ${after.factions})`);
console.log('players pulled out   :', r.membersRemoved);
console.log('news rows removed    :', r.news, `(${before.news} -> ${after.news})`);
console.log('---');
console.log('real accounts left   :', after.accounts);
console.log('every citizen in the town is now a real player.');
console.log('=================');
console.log('');
console.log('Tip: the server also does this on boot whenever BOTS=0, which is the default.');
