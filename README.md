# 🧢 RAZOR TOWN

**An online 1920s Birmingham crime sim you can play in the browser.** Flat caps, razor gangs, canal whisky and honest thievery. Character creator, real accounts & passwords (hashed + salted), crimes with consequences, gyms, day jobs, a black market, bank interest, a betting shop, player-vs-player fights, gangs, feats, a town news wire and leaderboards — all running at 60 fps on desktop *and* mobile.

**The look:** a Torn-style layout — status bars across the top header, a grouped left sidebar, dense zebra-striped panels and tables, and a full-length paper-doll character on your profile with the six things you're wearing (headwear, jacket, waistcoat, trousers, boots, trinket). The art and icons are our own; the structure is what makes it read like the games you already know.

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

**Founder login:** `ghost` · `Delilah2023!@` — level 100, half a billion in the bank, top of the Gallery.
(create your own account + character in about 30 seconds — accounts save to the city database and work from any device.)

---

## 🎩 What you can do
| Area | What's in it |
|---|---|
| **Character creator** | Pick skin, face, headwear (flat caps, bowlers, head scarves…), jacket and trinket, plus an origin story that grants bonus stats & starter loot. |
| **Crimes** | 23 original jobs across 6 categories (Theft & Dip, Fraud & Forge, Black Market, Sharp Practice, Strong-Arm Work, Big Jobs). Each costs nerve + energy, has skill requirements, odds, loot drops and bust risk. Chain successes for a **🔥 Spree** cash bonus. |
| **Busted** | Screw up badly and you're **NICKED!** — the gaol keeps you below stairs (or the infirmary takes you in). Timers run live; energy refills while you wait. |
| **Profile** | Your paper-doll in full, every stat and slot, what you're wearing, and your career record. |
| **Attack** | Fight other **real players** for cash and respect. The target list only ever shows accounts that exist, and coming off worst goes on your record. |
| **Gym / Jobs** | Train 4 stats (balanced training enforced); work shifts at day jobs — Corner Café, Racing Clerk, Exchange Engineer… |
| **Market & Items** | Buy consumables (strong tea, Doc's kit, nerve draught), stat tonics, tools, and fence your loot with the fences. |
| **Bank** | The Exchange Bank parks your cash and pays ~4%/hr interest. Cash on you is lootable in fights. |
| **Property** | Pemberton & Sons, estate agents — 8 addresses from a back-to-back terrace to the Manor at Solihull, each with three improvements and an iron safe. Where you live sets how happy you can get (happy men train harder, and happiness regenerates every 30 minutes). Rent is charged once a day; unpaid rent costs you happiness instead. Sell up and you get 75% of the value plus everything in the safe. |
| **College** | Digbeth Technical College — 14 evening courses from Pitman Shorthand to Industrial Chemistry and Law of Property. One at a time, fees up front, and the grant is permanent: stat blocks, +% crime success, +% training gains, shorter sentences, cheaper property. Some courses are gated behind a level or an earlier course. |
| **Merits** | One merit point per level, spent permanently on 8 perk lines (extra energy, nerve, life, happiness, training, crime success, heavier muggings, shorter stretches). |
| **Bounties** | The Bounty Board — post money on any citizen's name ($500 minimum, anonymously if you like) and it pools. Beat that man into hospital and you collect the pot less a 5% fee; the target gets a letter telling them. |
| **Betting shop** | The Corner Betting Shop — the Greyhound Dash. Back the dog, ride the multiplier, cash out before the crash. |
| **Gangs** | Found your own crew for $200k (level 5+) and invite whoever turns up — every gang in the city is player-run. |
| **Feats** | 20 achievements that fire juicy popups + town-wide news. |
| **The Gallery** | The city's live high-score table: reputation, level, crimes, fights, wealth. |
| **Messages** | Telegrams — send a note to any citizen by character name. |
| **Live city** | A town wire fed by what real players actually do — heists, scraps, gang notices — plus plain street colour when the town is quiet. |

**Juice everywhere:** coin bursts, confetti, floating cash, screen shake on busts, animated XP/money/stat bars, poster-style **MADE!** / **NICKED!** result cards, a synthesized era synth engine, and level-up fanfares.

**Is it up?** `curl <url>/api/health` returns `{"ok":true,...}` with an `up` counter — if a monitor
ever sees the counter reset, the process restarted (a redeploy does that on purpose; anything else
is a fault worth reporting).

**Verify the systems yourself:** `node tools/check-systems.js` runs 48 rule-level assertions (property, upkeep, education, merits, bounties, payout) against a throwaway world in `/tmp` — it never touches the live ledger.

**Controls:** full keyboard shortcuts (see Help in-game, e.g. `c` crimes, `a` attack, `Esc` menu) *and* a thumb-friendly bottom nav on mobile. Menu/button based throughout — no movement controls.

---

## 🧱 Architecture
```
server.js           HTTP server (static + REST + SSE live feed) — zero framework
lib/db.js           SQLite (better-sqlite3) persistence layer
lib/accounts.js     accounts, salted+hashed passwords, signed session cookies
lib/world.js        all gameplay actions + rules
lib/game/engine.js  battle math, progression, regen timers (pure functions)
lib/game/content.js the original era content DB (crimes/items/jobs/gyms/feats)
lib/seed.js         builds the world; purges any legacy NPC citizens/gangs on boot
tools/founder.js    (re)creates the founder account on a fresh world
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
```
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
Everything is plain files — change them and restart (`npm start`). Content balances live in `lib/game/content.js`; client screens are in `public/js/app.js` (templates for each tab); the 1920s look lives in `public/css/style.css` + `public/img/`; era avatars in `public/js/avatar.js`. Ask and this project can be changed, extended or rethemed at any time.

---

*Razor Town is an original work set in an imagined 1925 Birmingham. All characters, jobs, items and stories are our own fiction.*
