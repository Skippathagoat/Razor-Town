// Razor Town — wipe a citizen down to nothing.
//
//   node tools/wipe-account.js ghost                # reset that account to a blank citizen
//   node tools/wipe-account.js ghost --dry-run      # show exactly what would go, change nothing
//   node tools/wipe-account.js ghost --like-new     # hand them the standard recruit start
//                                                   #   ($2,500 in pocket + the origin's kit)
//   node tools/wipe-account.js ghost --keep-pass    # leave a founder Wire Pass on the account
//   node tools/wipe-account.js ghost --purge-news   # also scrub the town wire of their name
//   node tools/wipe-account.js ghost --no-bio       # clear the profile bio too
//   node tools/wipe-account.js ghost --unlock       # drop the wipe lock only (no wipe)
//   node tools/wipe-account.js ghost --lock         # set the wipe lock only (no wipe)
//
// What survives: the login, the password, the character name, the look (avatar), and the
// account's place in the world. What goes: cash, bank, vault, level, xp, stats, items,
// gear, boosts, property, college, merits, perks, achievements, gang seat, turf, bazaar
// lots, auction lots, bounties, telegrams, chat lines, arcade/casino/hustle state.
//
// The account is left **locked** (accounts.wiped=1) so the boot-time founder demo in
// lib/bootstrap.js can't quietly put the level 100 / $500M back on the next restart or
// redeploy. `node tools/founder.js god` is the deliberate way to unlock it and restore
// the demo. Other people's money is never destroyed: a bounty this account posted is
// cancelled, and a bounty placed on it is refunded to whoever paid for it.
'use strict';
const dbm = require('../lib/db.js');
dbm.init();
const V = require('../lib/wipe.js');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const refs = argv.filter(a => !a.startsWith('--'));
const opts = {
  dryRun: flags.has('--dry-run'),
  likeNew: flags.has('--like-new'),
  keepPass: flags.has('--keep-pass'),
  purgeNews: flags.has('--purge-news'),
  keepBio: !flags.has('--no-bio'),
  news: !flags.has('--no-news')
};

const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Number(n) || 0).toLocaleString();
const row = (label, before, after) => '  ' + label.padEnd(18) + String(before).padStart(16) + '   →   ' + String(after).padStart(14);
const dash = (n) => '-'.repeat(n);

if (!refs.length) {
  console.log('\nUsage: node tools/wipe-account.js <username> [--dry-run] [--like-new] [--keep-pass] [--purge-news] [--no-bio]');
  console.log('       node tools/wipe-account.js --lock|--unlock <username>   (toggle the boot lock only)\n');
  process.exit(2);
}

let bad = 0;
for (const ref of refs) {
  const acc = V.findAccount(ref);
  if (!acc) { console.error('\nNo account called "' + ref + '" in ' + dbm.DB_PATH + '\n'); bad++; continue; }
  if (acc.kind === 'bot') { console.error('\n"' + acc.username + '" is an NPC account — use node tools/purge-npcs.js for those.\n'); bad++; continue; }

  // lock-only switches: no wipe
  if (flags.has('--unlock') || flags.has('--lock')) {
    const on = flags.has('--lock');
    if (on) V.setWipeLock(acc.id); else V.clearWipeLock(acc.id);
    console.log('\nWipe lock on "' + acc.username + '" ' + (on ? 'SET — boot will not touch this account.' : 'cleared — boot may top the founder demo back up.') + '\n');
    continue;
  }

  let r;
  try { r = V.wipe(ref, opts); }
  catch (e) { console.error('\n' + e.message + '\n'); bad++; continue; }
  const b = r.before, a = r.after, g = r.gone;
  const tag = opts.dryRun ? ' (dry run — nothing changed)' : '';

  console.log('');
  console.log('=== WIPE: ' + acc.username + ' / "' + (b.name || 'no character') + '"' + tag + ' ===');
  console.log('  ' + dash(52));
  console.log('  ' + 'the account'.padEnd(18) + 'before'.padStart(16) + '   →   ' + 'after'.padStart(14));
  console.log(row('level', b.level, a.level));
  console.log(row('total stat', b.total, a.total));
  console.log(row('cash on hand', money(b.money), money(a.money)));
  console.log(row('bank', money(b.bank), money(a.bank)));
  console.log(row('safe (vault)', money(b.vault), money(a.vault)));
  console.log(row('reputation', b.reputation.toLocaleString(), a.reputation.toLocaleString()));
  console.log(row('crimes run', b.crimeCount.toLocaleString(), a.crimeCount.toLocaleString()));
  console.log(row('fights w/l', b.wins + '/' + b.losses, a.wins + '/' + a.losses));
  console.log(row('items', b.itemUnits + 'u ' + money(b.itemResale), a.itemUnits + 'u ' + money(a.itemResale)));
  console.log(row('achievements', b.achievements, a.achievements));
  console.log(row('merits / perks', b.merits + '/' + b.perks, a.merits + '/' + a.perks));
  console.log(row('courses done', b.courses, a.courses));
  console.log(row('stocks / coins', b.stocks + '/' + b.crypto, a.stocks + '/' + a.crypto));
  console.log(row('loan owed', money(b.loan), money(a.loan)));
  console.log(row('home', b.property + ' +' + b.propertyUp, a.property + ' +' + a.propertyUp));
  console.log(row('gang', (b.gangName || 'none') + (b.gangBoss ? ' (boss)' : ''), a.faction ? a.gangName : 'none'));
  console.log(row('turf held', b.turf.length + (b.turfNames.length ? ' — ' + b.turfNames.join(', ') : ''), a.turf.length));
  console.log(row('in gaol / hospital', (b.jail ? 'yes' : 'no') + '/' + (b.hospital ? 'yes' : 'no'), (a.jail ? 'yes' : 'no') + '/' + (a.hospital ? 'yes' : 'no')));
  console.log(row('wire pass', b.subFounder ? 'founder, forever' : (b.subUntil > Date.now() ? 'until ' + new Date(b.subUntil).toISOString().slice(0, 10) : 'none'),
    a.subFounder ? 'founder, forever' : (a.subUntil > Date.now() ? 'active' : 'none')));
  console.log('  ' + dash(52));
  console.log('  cleared from the world');
  console.log('    bazaar lots taken down :' + g.listings);
  console.log('    auction lots withdrawn :' + g.lotsWithdrawn + (g.bidderRefunds ? '   (bidders refunded: ' + g.bidderRefunds + ')' : ''));
  console.log('    lots reopened          :' + g.lotsReopened + '   (a lot they were winning now has no bids)');
  console.log('    bounties posted        :' + g.bountiesPosted);
  console.log('    bounties lifted        :' + g.bountiesLifted + (g.bountyRefunds ? '   (refunded to the posters: ' + g.bountyRefunds + ')' : ''));
  console.log('    telegrams deleted      :' + g.messages);
  console.log('    chat lines deleted     :' + g.chat);
  console.log('    corners of turf freed  :' + g.turf);
  console.log('    gang seats vacated     :' + g.gangSeats + (g.gangsFolded ? '   (crew folded: ' + g.gang + ')' : g.newBoss ? '   (chair passed to ' + g.newBoss + ')' : ''));
  console.log('    gang applications pulled :' + g.applications);
  if (opts.purgeNews) console.log('    news lines scrubbed  :' + g.news);
  console.log('    wipe lock              :' + (opts.dryRun ? 'would be set' : 'set — a reboot will not refill this account'));
  console.log('  ' + dash(52));
  console.log('  kept: login "' + acc.username + '", the same password, the name "' + a.name +
    '", the look, ' + (b.bio ? 'the bio' : 'no bio') + ', ' + a.friendOf + ' citizen' + (a.friendOf === 1 ? '' : 's') +
    ' still listing them as a friend, and the billing history in pay_claims.');
  if (opts.likeNew) console.log('  they were handed the standard recruit start: ' + money(a.money) + ' and ' + a.itemUnits + ' starter item(s).');
  if (!opts.dryRun && a.total !== b.total) console.log('  net worth ' + money(b.netWorth) + ' → ' + money(a.netWorth) + '.');
  console.log('  ' + dash(52));
  console.log('');
  if (!opts.dryRun) {
    console.log('  Log back in with ' + acc.username + ' and it plays like a fresh recruit.' +
      (opts.dryRun ? '' : ' To undo the lock only: node tools/wipe-account.js --unlock ' + acc.username));
    console.log('');
  }
}
process.exit(bad ? 1 : 0);
