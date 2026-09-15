// Razor Town — founder account tool
// Creates (or refreshes) the founder account: max level, maxed stats, hundreds of millions.
//
// Usage:
//   node tools/founder.js            # create if missing, top up fields, keep existing password
//   node tools/founder.js reset      # also reset the password to the one below
//   node tools/founder.js god        # also override a wipe lock and put the demo back
//   node tools/founder.js lock       # refuse to top this account up on boot (same lock as a wipe)
//
// An account you reset with `node tools/wipe-account.js <name>` is *locked*: boot leaves it
// alone, so a restart or redeploy can't silently refill it. `god` unlocks it and restores the
// level 100 / $500M demo. To keep the founder out of the world entirely, set FOUNDER_DEMO=0.
//
// Edit the constants in lib/bootstrap.js (or set FOUNDER_USER / FOUNDER_PASS / FOUNDER_NAME)
// to choose your own founder login.
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const boot = require('../lib/bootstrap.js');
const V = require('../lib/wipe.js');

const mode = process.argv[2] || '';
if (mode === 'lock' || mode === 'unlock') {
  const who = process.argv[3] || boot.FOUNDER_DEFAULTS.username;
  const acc = V.findAccount(who);
  if (!acc) { console.error('No account called "' + who + '" in ' + dbm.DB_PATH); process.exit(1); }
  if (mode === 'lock') V.setWipeLock(acc.id); else V.clearWipeLock(acc.id);
  console.log('\n"' + acc.username + '" wipe lock ' + (mode === 'lock' ? 'SET — boot will not touch this account.' : 'cleared — the next boot tops the demo back up.') + '\n');
  process.exit(0);
}
if (mode === 'god') {
  const acc = V.findAccount(boot.FOUNDER_DEFAULTS.username);
  if (acc && acc.wiped) { V.clearWipeLock(acc.id); console.log('\nWipe lock cleared on "' + acc.username + '".'); }
}

const f = boot.createFounder({ reset: mode === 'reset' || mode === 'god', force: mode === 'god' });

console.log('');
console.log('=== FOUNDER ACCOUNT ===');
console.log('login    :', f.username);
console.log('password :', f.password);
console.log('name     :', f.name);
if (f.locked) {
  console.log('');
  console.log('LEFT ALONE — this account carries a wipe lock, so nothing was topped up.');
  console.log('level    :', f.level, ' cash: $' + f.money.toLocaleString() + '  bank: $' + f.bank.toLocaleString());
  console.log('To bring the demo back for real: node tools/founder.js god');
} else {
  console.log('level    :', f.level);
  console.log('total    :', f.total);
  console.log('cash     : $' + f.money.toLocaleString());
  console.log('bank     : $' + f.bank.toLocaleString());
  console.log('net worth: $' + (f.money + f.bank).toLocaleString());
  console.log('rep      :', f.reputation.toLocaleString());
}
console.log('=======================');
console.log('');
console.log('Tip: rerun with "reset" to change the password. Edit the constants in lib/bootstrap.js to rename.');
console.log('     rerun with "god" to override a wipe lock. "node tools/wipe-account.js ' + f.username + '" does the opposite.');
