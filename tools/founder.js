// Razor Town — founder account tool
//
// Usage:
//   node tools/founder.js            # create if missing; otherwise just report (never overwrites)
//   node tools/founder.js reset      # restore the maxed founder sheet + reset the password
//   node tools/founder.js fresh      # wipe the founder to a fresh level 1 (login kept)
//
// Edit the constants in lib/bootstrap.js (or set FOUNDER_USER / FOUNDER_PASS / FOUNDER_NAME)
// to choose your own founder login.
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const boot = require('../lib/bootstrap.js');

const mode = process.argv[2] || '';

if (mode === 'fresh') {
  const f = boot.resetFounderFresh({});
  console.log('');
  console.log('=== FOUNDER RESET TO FRESH ===');
  console.log('login    :', f.username, '(password unchanged)');
  console.log('name     :', f.name);
  console.log('level    :', f.level);
  console.log('cash     : $' + f.money.toLocaleString());
  console.log('bank     : $' + f.bank.toLocaleString());
  console.log('rep      :', f.reputation.toLocaleString());
  console.log('==============================');
  console.log('');
  console.log('The founder now plays from level 1. Reboots will not re-max the sheet.');
  process.exit(0);
}

const f = boot.createFounder({ reset: mode === 'reset' });

console.log('');
console.log('=== FOUNDER ACCOUNT ===');
console.log('login    :', f.username);
if (f.created || f.toppedUp) console.log('password :', f.password);
else console.log('password : (unchanged — existing character left untouched)');
console.log('name     :', f.name);
console.log('level    :', f.level);
console.log('total    :', f.total);
console.log('cash     : $' + f.money.toLocaleString());
console.log('bank     : $' + f.bank.toLocaleString());
console.log('net worth: $' + (f.money + f.bank).toLocaleString());
console.log('rep      :', f.reputation.toLocaleString());
console.log('=======================');
console.log('');
if (f.created) console.log('Fresh world: founder created with the maxed sheet.');
else if (f.toppedUp) console.log('Founder sheet restored to maxed; password reset.');
else console.log('Existing founder kept as-is. Use "reset" to re-max, "fresh" to wipe to level 1.');
