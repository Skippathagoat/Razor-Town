# 🧢 RAZOR TOWN

**An online 1920s Birmingham crime sim you can play in the browser.** Flat caps, razor gangs, canal whisky and honest thievery. Character creator, real accounts & passwords (hashed + salted), a live city of NPC citizens, crimes with consequences, gyms, day jobs, a black market, bank interest, a betting shop, player-vs-player fights, gangs, feats, a town news wire and leaderboards — all running at 60 fps on desktop *and* mobile.

> **Inspired by classic browser crime sims (like Torn) — not a copy.** Every name, crime, item, gang and line of fiction here is original Razor Town flavor. No copyrighted shows, houses or characters.

---

## ▶️ Play it right now
**Public URL (live):** https://essay-nelson-reader-tennis.trycloudflare.com
*(a free Cloudflare tunnel from this workspace — anyone with the link can play; it lives as long as this session is running. For a permanent URL see DEPLOY.md.)*

Also available as the **LIVE PREVIEW** on port 8787 in this workspace, or `http://localhost:8787` locally.

**Keeping it up:** `./start-all.sh` (add `--public` for a shareable link) starts a **self-healing
supervisor** — it restarts the game within ~2s if it crashes and reinstalls its own dependencies if
they go missing. A brand-new empty host **builds its own world** on first boot (42 citizens, 3 gangs,
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
| **Attack** | Fight NPC citizens or other online players for cash and respect. Target list is ranked to your power so newbies have winnable fights. |
| **Gym / Jobs** | Train 4 stats (balanced training enforced); work shifts at day jobs — Corner Café, Racing Clerk, Exchange Engineer… |
| **Market & Items** | Buy consumables (strong tea, Doc's kit, nerve draught), stat tonics, tools, and fence your loot with the fences. |
| **Bank** | The Exchange Bank parks your cash and pays ~4%/hr interest. Cash on you is lootable in fights. |
| **Betting shop** | The Corner Betting Shop — the Greyhound Dash. Back the dog, ride the multiplier, cash out before the crash. |
| **Gangs** | Join an NPC crew (Crown Street, Canal Basin, Rag Market) or found your own for $200k (level 5+). |
| **Feats** | 20 achievements that fire juicy popups + town-wide news. |
| **The Gallery** | The city's live high-score table: reputation, level, crimes, fights, wealth. |
| **Messages** | Telegrams — send a note to any citizen by character name. |
| **Live city** | A town wire that never stops — NPCs commit crimes, scrap in the yards and get talked about while you play. |

**Juice everywhere:** coin bursts, confetti, floating cash, screen shake on busts, animated XP/money/stat bars, poster-style **MADE!** / **NICKED!** result cards, a synthesized era synth engine, and level-up fanfares.

**Controls:** full keyboard shortcuts (see Help in-game, e.g. `c` crimes, `a` attack, `Esc` menu) *and* a thumb-friendly bottom nav on mobile. Menu/button based throughout — no movement controls.

---

## 🧱 Architecture
```
server.js           HTTP server (static + REST + SSE live feed) — zero framework
lib/db.js           SQLite (better-sqlite3) persistence layer
lib/accounts.js     accounts, salted+hashed passwords, signed session cookies
lib/world.js        all gameplay actions + rules
lib/game/engine.js  battle math, progression, regen timers (pure functions)
lib/game/content.js the original era content DB (crimes/items/jobs/gyms/feats/bots)
lib/seed.js         boots 42 NPC citizens + 3 NPC gangs into the world
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
npm run seed                             # optional: refill NPC citizens
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
