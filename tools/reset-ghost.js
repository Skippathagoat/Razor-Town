#!/usr/bin/env node
// Razor Town — wipe the founder back to a fresh level 1 character.
//
//   node tools/reset-ghost.js [username]     (default: ghost)
//
// Keeps the login (username + password + email) and the lifetime founder pass,
// but the character starts over: level 1, starter cash, starter kit, no feats.
// Gang seats, pending applications/invites and bazaar listings are cleaned up
// so nothing dangles. The reset SURVIVES reboots — the bootstrapper only seeds
// the maxed founder sheet on a fresh world, never over an existing character.
//
// To restore the maxed founder sheet instead:  node tools/founder.js reset
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const boot = require('../lib/bootstrap.js');

const username = (process.argv[2] || 'ghost').toLowerCase();

try {
  const before = dbm.getDb().prepare('SELECT p.json FROM players p JOIN accounts a ON a.id=p.acc_id WHERE a.username=?').get(username);
  if (before) {
    try {
      const p = JSON.parse(before.json);
      console.log('Before: ' + p.name + ' · level ' + (p.level || 1) + ' · $' + (p.money || 0).toLocaleString() + ' cash · $' + (p.bank || 0).toLocaleString() + ' bank · ' + (p.reputation || 0).toLocaleString() + ' rep');
    } catch (e) {}
  }
  const f = boot.resetFounderFresh({ username });
  console.log('');
  console.log('=== CHARACTER RESET (login kept) ===');
  console.log('login    :', f.username, '(password unchanged)');
  console.log('name     :', f.name);
  console.log('level    :', f.level);
  console.log('cash     : $' + f.money.toLocaleString());
  console.log('bank     : $' + f.bank.toLocaleString());
  console.log('rep      :', f.reputation.toLocaleString());
  console.log('====================================');
  console.log('');
  console.log('Ghost walks back in as a level 1 citizen. The reset survives reboots.');
} catch (e) {
  console.error('Reset failed:', e.message);
  process.exit(1);
}
