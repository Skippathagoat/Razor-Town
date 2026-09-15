# 🧢 RAZOR TOWN

**An online crime sim you can play in the browser — fully overhauled for 2026.** Modern streetwear, real modeled characters, an arcade floor of ten games, eight side hustles, a 1,000-contract city board, a garage, a turf war across eight districts, stocks, crafting, trading cards and 47 crimes. Real accounts & passwords (hashed + salted), crimes with consequences, gyms, day jobs, a black market, bank interest, a betting shop, player-vs-player fights, gangs, feats, a town news wire and leaderboards — all running at 60 fps on desktop *and* mobile.

> **New in the 2026 overhaul:** 1,735 playable additions, including 1,000 server-backed City Contracts — see **[FEATURES.md](FEATURES.md)** for the numbered ledger and verification details.

**The look:** a Torn-style layout — status bars across the top header, a grouped left sidebar, dense zebra-striped panels and tables, and a full-length **modeled character** on your profile: two body builds (masculine & feminine), 9 skin tones, 18 faces, 38 hairstyles (including a full range of women's styles), 46 modern streetwear garments and 29 accents, each figure shaded and proportioned like a real character rather than a flat paper doll. The art and icons are our own; the structure is what makes it read like the games you already know.

**Every citizen in this town is a real player.** There are no NPC characters and no seeded gangs: the streets start empty, and the only names on the wire, the leaderboard and the target list are people who actually signed up. Fight reports land in your inbox, so nobody gets jumped without being told.

> **Inspired by classic browser crime sims (like Torn) — not a copy.** Every name, crime, item, gang and line of fiction here is original Razor Town flavor. No copyrighted shows, houses or characters.

---

## ▶️ Play it right now
**Permanent URL (always on):** https://p01--razor-town--zynzxj4wfx54.code.run
*(this is the deployed build on Northflank — it stays up on its own and does not depend on this workspace.)*

**Workspace preview:** the **LIVE PREVIEW** on port 8787 here, or `http://localhost:8787` locally.
Need to share it from a workspace session? `bash ./start-all.sh --public` opens a temporary
Cloudflare tunnel and prints the link — that URL **changes every time the workspace restarts**,
so share the permanent URL above with anyone you want to keep playing.

**Keeping it up:** `./start-all.sh` (add `--public` for a shareable link) starts a **self-healing
supervisor** — it restarts the game within ~2s if it crashes and reinstalls its own dependencies if
they go missing. A brand-new empty host **builds its own world** on first boot (no NPC citizens, no NPC gangs —
seed news, founder account), so there is nothing to set up by hand. `curl localhost:8787/api/health`
reports liveness. True 24/7 for other people needs a host with an account — see **DEPLOY.md**.

**Founder login:** `ghost` · `Delilah2023!@` — created as a demo citizen (level 100, half a billion in the bank,
top of the Gallery) and **currently wiped to nothing**: $0, level 1, empty bag, no gang, no property, no Wire Pass.
Wipe it (or any account) yourself with `node tools/wipe-account.js ghost` — a wiped account stays wiped across
restarts and redeploys, and `node tools/founder.js god` puts the demo back.
(create your own account + character in about 30 seconds — accounts save to the city database and work from any device.)

---

## 🎩 What you can do
| Area | What's in it |
|---|---|
| **Character creator** | Fully modeled characters in two body builds (masc/fem) — 9 skin tones, 18 faces, 38 hairstyles with a full range of women's styles, 46 modern streetwear garments (hoodies, puffers, bombers, varsities, crop tops, dresses…) and 29 accents (snapbacks, chains, shades, headphones…). Garments dress the whole figure with matching bottoms & sneakers. Save up to 3 looks in your **wardrobe**. The vintage wardrobe is gone. Re-style any time from your profile. |
| **Crimes** | 47 original jobs across 7 categories. Each costs nerve + energy, has skill requirements, odds, loot drops and bust risk. Chain successes for a **🔥 Spree** cash bonus. |
| **Busted** | Screw up badly and you're **NICKED!** — the gaol keeps you below stairs (or the infirmary takes you in). Timers run live; energy refills while you wait. |
| **Profile** | Your character model in full, every stat and slot, what you're wearing, your street title and followers, and your career record. |
| **Attack** | Fight other **real players** for cash and respect. The target list only ever shows accounts that exist, and coming off worst goes on your record. |
| **Gym / Jobs** | Train 4 stats (balanced training enforced); work shifts at day jobs — Corner Café, Racing Clerk, Exchange Engineer… |
| **Market & Items** | Buy consumables (strong tea, Doc's kit, nerve draught), stat tonics, tools, and fence your loot with the fences. |
| **Bank** | The Exchange Bank parks your cash and pays ~4%/hr interest. Cash on you is lootable in fights. |
| **Property** | Pemberton & Sons, estate agents — 10 addresses from a back-to-back terrace to the Manor at Solihull, each with three improvements and an iron safe. Where you live sets how happy you can get (happy men train harder, and happiness regenerates every 30 minutes). Rent is charged once a day; unpaid rent costs you happiness instead. Sell up and you get 75% of the value plus everything in the safe. |
| **College** | Digbeth Technical College — 18 evening courses from Pitman Shorthand to Industrial Chemistry, Law of Property and Quant Methods (which trims your broker fee). One at a time, fees up front, and the grant is permanent: stat blocks, +% crime success, +% training gains, shorter sentences, cheaper property. Some courses are gated behind a level or an earlier course. |
| **Merits** | One merit point per level, spent permanently on 13 perks (extra energy, nerve, life, happiness, training, crime success, heavier muggings, shorter stretches…). |
| **Bounties** | The Bounty Board — post money on any citizen's name ($500 minimum, anonymously if you like) and it pools. Beat that man into hospital and you collect the pot less a 5% fee; the target gets a letter telling them. |
| **Betting shop** | Six real tables in The Corner Betting Shop: **Pontoon** (blackjack — hit/stand/double, naturals 3:2, five-card trick 2:1), **The Wheel** (single-zero roulette: colours, odds, dozens, columns, 35:1 numbers), **The Bandit** (three weighted reels, up to 60×), **Crown & Anchor** (service-dice classic), **High-Low**, and the **Greyhound Dash** crash multiplier. Stakes $10–$1,000,000, all settled server-side. |
| **Gangs** | Found a player-run crew for $200k (level 5+). Run a transparent war chest, set open/application/closed recruitment, approve applications, promote officers, check in for Crew Roll, and complete four cooldown-based crew operations that reward both the hand and the gang. |
| **Feats** | 67 achievements that fire juicy popups + town-wide news — covering every new 2026 system. |
| **The Gallery** | The city's live high-score table: reputation, level, crimes, fights, wealth. |
| **Messages** | Telegrams — send a note to any citizen by character name. |
| **Live city** | A town wire fed by what real players actually do — heists, scraps, gang notices — plus plain street colour when the town is quiet, hourly weather and rotating city events. |
| **🎮 Arcade** *(tab 7)* | Ten games: Mines, Plinko, Dice, Coin flip, Hoops, Buzz wire, Memory, Safe cracker, scratch cards and a daily lottery. |
| **📦 Hustles** *(tab 8)* | A three-lead **City Contracts** board drawn from 1,000 distinct jobs every 4h, plus gig board, courier runs, canal fishing, scrapyard salvage, plasma donation, fight trials, busking, storage-unit auctions (hints only until you pay) and mystery boxes. |
| **🚗 Garage** *(tab 9)* | 8 cars with ratings, a 10-color paint shop, street races for stakes, and a chop shop. |
| **🗺️ Turf** *(tab 5)* | 8 districts to claim with influence earned from crimes and fight wins; held turf pays collectible income. |
| **💸 Money games** | Stocks & crypto with transparent fees, staking, term deposits, 6-hour dividends, a crafting bench (7 recipes), trading-card packs with a set bonus, weekly limited drops, insurance policies, clout followers that pay out, and gifts between citizens. |

**Juice everywhere:** coin bursts, confetti, floating cash, screen shake on busts, animated XP/money/stat bars, poster-style **MADE!** / **NICKED!** result cards, a synthesized era synth engine, and level-up fanfares.

**Daily Streak:** claim once per UTC calendar day; the reward forecast and reset time are shown in the Home panel. Crew members with the **Roll Call** upgrade receive a 10% Daily Streak cash bonus.

**Is it up?** `curl <url>/api/health` returns `{"ok":true,...}` with an `up` counter — if a monitor
ever sees the counter reset, the process restarted (a redeploy does that on purpose; anything else
is a fault worth reporting).

**Verify the systems yourself — 432 automated checks, all passing:**
`node tools/check-2026.js` drives **every 2026 system over real HTTP** against throwaway accounts — avatar clamping, all ten arcade games, every hustle, storage auctions, cars/races/chop, turf, stocks, staking, crafting, cards, wardrobe, respec, insurance, friends/blocks/gifts, and the 1,000-lead City Contracts board (95 assertions).
`node tools/check-wipe.js` runs 44 assertions on the wipe/reset path (blank citizen, refunds to neighbours, the boot lock).
`node tools/check-systems.js` runs 236 rule-level assertions (property, upkeep, education, merits, bounties, the bazaar, the auction rooms, and every casino table) against a throwaway world in `/tmp` — it never touches the live ledger.
`node tools/check-api.js` adds 93 API-contract checks, and `node tools/check-http.js` adds 8 resilience checks (dead sessions, broken JSON, absurd amounts, path traversal) proving the same process keeps serving.
`node tools/e2e/qa.mjs` drives a real headless browser through all tabs on desktop and phone, the whole casino floor, a full two-citizen bazaar sale, an auction bid-buyout-pull round, and the character editor (29 checks; one-time browser setup with `tools/e2e/setup-qa.sh`).

### The auction rooms
Above the fence sits Boulton's Auction Rooms on Snow Hill: send a lot to the block (max 4 at once, sessions of 1–24h), set an opening book and an optional buy-out price. Bids leave the bidder's hand immediately as escrow and an outbid bidder is refunded and wired the same instant; the hammer takes 8%, a six-figure hammer price makes the town paper, and a lot nobody wants walks home with the porter.

### The bazaar
Beside the fence sits a citizens' market: hang lots from your own bag at your price (8 lots max, sold as whole lots). The fence skims 5% — a Commercial French diploma trims a point — anonymous stalls show only *"A hooded figure"*, sellers are paid while offline and wake to a wire, and a sale over $50k makes the town paper.

**Controls:** full keyboard shortcuts (see Help in-game, e.g. `c` crimes, `a` attack, `Esc` menu) *and* a thumb-friendly bottom nav on mobile. Menu/button based throughout — no movement controls.

---

## 🧱 Architecture
```
server.js           HTTP server (static + REST + SSE live feed) — zero framework
lib/db.js           SQLite (better-sqlite3) persistence layer
lib/accounts.js     accounts, salted+hashed passwords, signed session cookies
lib/world.js        all gameplay actions + rules
lib/game/engine.js  battle math, progression, regen timers (pure functions)
lib/game/content.js the content DB (crimes/items/jobs/gyms/feats/cars/gigs/districts/recipes)
lib/game/contract-catalog.js 1,000 validated City Contract definitions (10 × 10 × 10)
lib/systems.js      the 2026 systems layer (arcade, hustles, garage, turf, stocks, cards…)
lib/seed.js         builds the world; purges any legacy NPC citizens/gangs on boot
tools/founder.js    (re)creates the founder account on a fresh world
lib/wipe.js         account wipe/reset — blank a citizen and lock them against boot top-ups
tools/wipe-account.js  wipe any account to nothing (`--dry-run`, `--like-new`, `--purge-news`)
tools/dlfonts.js    one-time: downloads the self-hosted era fonts
public/             the whole client (HTML/CSS/JS, self-hosted fonts, art)
```
Player state, banks, messages, gangs, achievements and news all persist in `data/world.db`. Accounts use salted **scrypt** hashes. Session tokens are HMAC-signed and survive server restarts.

### Run it
```bash
./start-all.sh              # deps + world + self-healing supervisor (background)
./start-all.sh --public     # ...and open a public Cloudflare link
./start-all.sh --fg         # foreground (Ctrl-C to stop)
./stop-all.sh               # stop everything
```
Or by hand:
```bash
npm install                              # installs better-sqlite3
npm start                                # -> http://localhost:8787  (PORT overrides)
npm run seed                             # optional; NPCs only if you set BOTS>0
node tools/founder.js                    # (re)create login ghost / Delilah2023!@
node tools/wipe-account.js ghost          # wipe any account back to a blank citizen (see --dry-run)
FOUNDER_DEMO=0 node server.js             # boot without ever creating the demo founder
```
`--dry-run` prints exactly what would go without touching the world. The wipe keeps the login, the password,
the character's name and look, and cancels nothing that belongs to anyone else: bounties other players placed
on the wiped account are refunded to them and any auction escrow the house was holding goes back to the bidder.
`node server.js` self-bootstraps: an empty or missing database gets the citizens, gangs, seed news and
the founder account automatically (see `lib/bootstrap.js`). No API keys, no build step, Node >= 18 only.

### Keeping it online
| Where | Command / file | Survives crashes | Survives host restart | Saves persist |
|---|---|---|---|---|
| This workspace | `./keep-up.sh` | ✅ auto-restart + dep reinstall | ❌ (whole box is rebuilt) | ✅ `data/world.db` |
| Free host — Render (no card) | upload repo, start `node server.js` | ✅ | ✅ + free pinger keeps it awake | ❌ ephemeral (world self-rebuilds) |
| Free host — Northflank | repo + volume at `/data` | ✅ | ✅ always-on, no sleep | ✅ persistent volume |
| Any VPS / Docker | `Dockerfile` + `keep-up.sh` | ✅ | ✅ (systemd/pm2/`--restart`) | ✅ volume at `/data` |

**Deploying on Northflank?** See **`NORTHFLANK.md`** — exact settings (port 8787, volume at `/data`, `DB_PATH=/data/world.db`, health check `/api/health`) and troubleshooting.

**`FREE-HOSTS.md`** compares the free 2026 options for this exact app (and lists the dead ones — Glitch
shut down in 2025, so ignore any older guide pointing there). `DEPLOY.md` is the hands-on runbook, including
the free uptime-pinger trick that stops free hosts from sleeping. `/api/health` exists for exactly that.

---

## 📦 Hosting it for free
See **FREE-HOSTS.md** for the verified-2026 comparison of free hosts (which ones keep player saves, which need a card, which are dead), and **DEPLOY.md** for the click-by-click runbook: Render (free, no card), Northflank (free, always-on, persistent volume) or any VPS.

---

## 🖼 Screenshots
In **`docs/screenshots/`** — `era-auth.png`, `era-creator.png`, `era-desktop-*.png` (each view) and `era-mobile-*.png` (each view, phone layout).

---

## ✏️ Editing / extending
Everything is plain files — change them and restart (`npm start`). Content balances live in `lib/game/content.js`; the 2026 systems (arcade, hustles, garage, turf, stocks, turf, cards…) live in `lib/systems.js`; client screens are in `public/js/app.js` (templates for each tab); the look lives in `public/css/style.css` + `public/img/`; the character model engine is `public/js/avatar.js` (6-part spec: `skin|face|hair|shirt|accent|body`). Ask and this project can be changed, extended or rethemed at any time.

---

*Razor Town is an original work set in an imagined 1925 Birmingham. All characters, jobs, items and stories are our own fiction.*
