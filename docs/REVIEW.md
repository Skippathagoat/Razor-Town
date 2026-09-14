# Razor Town — review & fix log

Two jobs: find out why parts of the game weren't working, and take every NPC
character and NPC gang out of the live world for good.

Everything below was reproduced by actually playing the game in a browser
(clicking the menus, registering characters, fighting between two real
accounts), then fixed and re-verified on the live site.

---

## 1. NPCs and NPC gangs are gone

The world now contains **only real accounts**.

- `BOTS` defaults to `0`. On boot the server calls `purgeNPCs()`, which deletes
  bot accounts, their characters and their messages; deletes any gang whose
  stored owner is not a real account; clears `faction` on anyone who pointed at
  a deleted gang; and deletes wire stories that named removed people or gangs.
  It is idempotent — a second boot reports zeroes.
- Real accounts, real gangs, money, levels and progress are never touched.
- `/api/world/online` reports the true number of live players. It used to
  return `1 + Math.round(Math.random() * 4)`, and a background job invented
  news stories attributed to NPCs. Both are gone; the wire now falls back to
  name-free street colour when nobody else is on.
- With the town empty, **Hunt** and **Gangs** explain the situation and point
  you at what to do instead, rather than rendering blank screens.
- Manual purge at any time: `node tools/purge-npcs.js`.
- To go back to a populated town (not recommended): `BOTS=42`.

Live result after redeploy: `citizens: 0 | accounts: 1 | factions: 0`.
Only the founder account remains, untouched: **Ghost, level 100, $250M cash +
$250M bank (net $500M)**.

## 2. Bugs found by playing, and fixed

| # | What a player saw | Cause | Fix |
|---|---|---|---|
| 1 | **Founding a gang was impossible** — clicking "Found it" gave "Unknown action" | The client sent one object `{name, tag, desc}` where `name` was *both* the action name and the gang name, so the gang name overwrote the action name | Action name is now applied last and can never be clobbered; the gang name travels as `factionName` |
| 2 | A newly founded gang didn't appear for up to a minute | Gang list cached 60s and never invalidated after a gang action | Cache is dropped on create/join/leave; TTL now 15s |
| 3 | **Losing a fight wasn't recorded**, and if the attacker lost, the defender got no win credit | Only the attacker's record was written | Both records are updated; the winner keeps their side of the story |
| 4 | You could be jumped and told nothing | Fights only wrote a public wire line | The victim gets a report in their inbox, plus an **unread badge** on Messages (desktop and mobile) |
| 5 | **A new Street Lad couldn't train Speed** — the button was greyed out with "Needs balancing" | Origin gives +8 to your speciality but the balance cap allowed only +3, so your own origin skill was illegal from the first session | Cap is +10, mirrored exactly in client and server, and the message names the skill to train next ("Your Speed is 21 ahead of the rest. Train Strength next.") |
| 6 | Leftover placeholder copy in the gym ("Gains are better when you train alone? Not in this city.") | Draft text shipped | Replaced with copy that explains the actual house rule |
| 7 | The gym always sent you to the starter gym even once better ones unlocked | Hard-coded gym id in the click handler | Uses the gym you actually qualify for |

## 3. Verification

| Suite | Result |
|---|---|
| Full click-through, **desktop 1440×900 + mobile 390×844** (register → creator → all 15 screens → crime scene → gym → job → market → bank → betting shop → avatar editor → menu → logout → login again) | **70/70 passed** |
| Two real players: target list, fight, records, victim notification, gallery | **9/9 passed** |
| Live site `p01--razor-town--zynzxj4wfx54.code.run` (read-only + founder login, no state changed) | **20/20 passed** |

Checks included: no console errors, no failed requests (a refused action is
counted separately and must be explained on screen as a toast), no horizontal
overflow on a phone, all 18 menu buttons comfortably tappable, and character
money/stats surviving a logout and log back in.

## 4. What this means for the town

Because every target is now a real player, a solo player's loop is the honest
one: crimes, day jobs, gym, market, bank, betting shop, feats and the wire.
Fighting only exists between real accounts — which is what was asked for —
so the Hunt list fills up as people sign up, and the wire reports what they
actually did.

## 5. Follow-up bug hunt (this pass)

A full pass over `lib/world.js`, `lib/game/*.js`, `lib/accounts.js`,
`lib/bootstrap.js`, `lib/seed.js`, `lib/db.js`, `server.js` and the whole
client (`public/js/*.js`, `public/index.html`), plus a new end-to-end API
drive of every gameplay system.

| # | What was wrong | Cause | Fix |
|---|---|---|---|
| 1 | A stale pontoon (blackjack) hand that refunded its stake did so only in memory — the refund was never written, so the money silently vanished | `doCasino` returned the "hand went cold / table boss" error without calling `save()`, even though it had already added the stake back to `p.money` | Persist the player before returning the error in `lib/world.js` |
| 2 | `tools/check-http.js` was failing its "a citizen can register" probe | Registration gained a required `email` field; the test's request body had gone stale | Added `email: 'keeper@http.test'` to the test's registration body |

Also noted (not changed): `doTrain` does not validate the `stat` key against
`st/de/sp/dx`, so a hand-crafted API call could add a junk `p.stats.<key>`
entry. Harmless — `calcTotal`/`derive` only read the four real stats and the
client only sends valid keys — but a one-line allowlist would close it.

### New: `tools/check-api.js`

An 87-assertion integration suite that boots a throwaway world and plays the
whole game through the real HTTP API: register/login (incl. email login),
crimes + heist gating, gym, jobs, market, bank, property + vault, college +
merits, all six casino tables (including a full pontoon deal), bazaar, auction
house (bid + buyout), factions (found/join/leave/dissolve), messages/chat/wire,
daily strike, big wheel, circuit betting, corner shops, shark loans, pawn shop,
gear equipping, stocks, crypto, PvP fight with record updates, bounties, and the
jail → prison → bail loop.

| Suite | Result |
|---|---|
| `node tools/check-systems.js` | **219/219 pass** |
| `node tools/check-http.js` | **8/8 pass** |
| `node tools/check-api.js` | **87/87 pass** |
| `node --check` over `server.js`, `lib/**/*.js`, `tools/*.js`, `public/js/*.js` | clean |
