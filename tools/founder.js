// Razor Town — founder account tool
// Creates (or refreshes) the founder account: max level, maxed stats, hundreds of millions.
//
// Usage:
//   node tools/founder.js            # create if missing, top up fields, keep existing password
//   node tools/founder.js reset      # also reset the password to the one below
//
// Edit the constants in lib/bootstrap.js (or set FOUNDER_USER / FOUNDER_PASS / FOUNDER_NAME)
// to choose your own founder login.
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const boot = require('../lib/bootstrap.js');

const f = boot.createFounder({ reset: process.argv[2] === 'reset' });

console.log('');
console.log('=== FOUNDER ACCOUNT ===');
console.log('login    :', f.username);
console.log('password :', f.password);
console.log('name     :', f.name);
console.log('level    :', f.level);
console.log('total    :', f.total);
console.log('cash     : $' + f.money.toLocaleString());
console.log('bank     : $' + f.bank.toLocaleString());
console.log('net worth: $' + (f.money + f.bank).toLocaleString());
console.log('rep      :', f.reputation.toLocaleString());
console.log('=======================');
console.log('');
console.log('Tip: rerun with "reset" to change the password. Edit the constants in lib/bootstrap.js to rename.');
