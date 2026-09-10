# 🧢 Deploy Razor Town — and keep it online

**See [`FREE-HOSTS.md`](FREE-HOSTS.md) for the full, verified-2026 comparison of free hosts and their
trade-offs.** This file is the hands-on runbook.

> ⚠️ **Glitch is dead.** It ended project hosting on 8 July 2025 and shut down in January 2026 — if you
> found older instructions pointing there, ignore them. Fly.io also retired its free tier, and serverless
> platforms (Vercel/Netlify/Cloudflare Workers) cannot run this app because it needs a long-lived Node
> process and a real SQLite file.

**The good news:** the app **deploys itself**. On a brand-new, completely empty host it builds the world
(42 era citizens, 3 gangs, seed news) and recreates the founder account **Ghost** on first boot. There is
no seed step, no shell command, nothing to configure.

---

## 🕐 The three levels of "always up"

| Level | What you get | Needs | Persists saves? |
|---|---|---|---|
| **This workspace** (`./keep-up.sh`) | Auto-restarts on crash (~2 s) and reinstalls wiped dependencies. Survives crashes, **not** a workspace rebuild (the box is torn down and processes die). | nothing | ✅ `data/world.db` in the workspace |
| **Free host** (Render / Northflank) | A real 24/7 URL anyone can play on | an account *you* create | Northflank **yes** (volume); Render free **no** (ephemeral — world rebuilds itself) |
| **VPS** (Oracle Always Free, ~$4/mo Hetzner) | Bulletproof, full control, your own disk | an account (Oracle needs a card to verify) | ✅ |

---

## ✅ Route A — Render, free, no credit card (quickest)
Free tier: 750 hrs/month, 512 MB, sleeps after ~15 min idle, **no persistent disk**.

1. Put this project on GitHub — create an empty repo, then **Add file → Upload files** and drag in the
   project files **except `node_modules/` and `data/`** (no git CLI required).
2. **render.com** → sign up with GitHub → **New + → Web Service** → choose the repo.
3. Build command `npm install`, start command `node server.js`, instance type **Free**.
   (Or use **New + → Blueprint**: the included `render.yaml` fills all this in, health check included.)
4. Deploy, then open the URL. The first log lines will read
   `Citizens: 42 | gangs: 3 | accounts: 43 | founder created: ghost`.
5. **Keep it awake:** free **uptimerobot.com** monitor → HTTP(s) → `https://your-app.onrender.com/api/health`
   → every 5 minutes. 730 hrs/month of uptime fits the 750-hour free allowance, so this is effectively 24/7.

## ✅ Route B — Northflank, free, always-on with persistent saves
Free "Developer Sandbox": 2 services, always-on (no sleeping), and a small **persistent volume** — the
best free fit for a city that must keep its players. Requires a card at signup for verification (not charged).

1. Push the project to GitHub as above (the included `Dockerfile` is detected automatically).
2. **northflank.com** → new account → **New service** → build from the repo.
3. Add a **volume mounted at `/data`** and set env **`DB_PATH=/data/world.db`**.
4. Port **8787** (or set `PORT`), health check `/api/health`. Deploy.

## ✅ Route C — Your own VPS (Oracle Always Free, Hetzner, DigitalOcean…)
```bash
npm install
./keep-up.sh &                    # restart-on-crash supervisor -> logs/server.log
PORT=80 DB_PATH=/data/world.db node server.js    # foreground alternative
```
Put Caddy/nginx in front for HTTPS, and a `systemd` unit or `pm2` so it starts on reboot.
Oracle Always Free (2 ARM cores / 12 GB, cut from 4/24 in Aug 2026) needs a card to verify and can be
fussy about capacity — upgrading to Pay-As-You-Go stays $0 within free limits and fixes "out of capacity".

---

## ✅ After it's live
1. Nothing to run by hand — the first boot self-bootstraps the world and the founder.
2. Open your URL → log in as the founder → then **New recruit** → make a character → log out and back in
   to confirm saves stick (on hosts **with** a volume/disk, that is).
3. Put your real URL in the **"▶️ Play it right now"** section of `README.md`.

### 🔑 Founder account (recreated automatically on an empty world)
| | |
|---|---|
| login | `ghost` |
| password | `Delilah2023!@` |
| character | **Ghost** — level 100, $500M net worth, #1 in the Gallery |

Change it with the env vars `FOUNDER_USER` / `FOUNDER_PASS` / `FOUNDER_NAME` **before the first boot**, or
run `node tools/founder.js reset` afterwards to set the password back to the constant.

### 🛠 Keeping it up
| Command | What it does |
|---|---|
| `./start-all.sh` | deps + world + self-healing supervisor in the background, prints status |
| `./start-all.sh --public` | same, plus a public Cloudflare link (saved to `public-url.txt`) |
| `./start-all.sh --fg` | run the supervisor in the foreground (Ctrl-C stops it) |
| `./keep-up.sh` | just the supervisor: restart-on-crash + reinstalls wiped dependencies |
| `./stop-all.sh` | stops supervisor, server and tunnel |
| `curl localhost:8787/api/health` | liveness JSON: uptime, citizens, accounts, content counts |

---

## 🗄 Database facts (honest notes)
- Accounts, characters, items, money, messages, gangs, achievements and news live in **one SQLite file**:
  `data/world.db` (or wherever `DB_PATH` points).
- Passwords are **salted + hashed** (scrypt) — nobody, including you, can read them in plain text.
- On a host with persistent storage (volume/disk), that file *is* your permanent save; back up = download it.
- On a host without one, the world resets on restart/redeploy — and the app **rebuilds itself** (citizens,
  gangs, founder) so the URL is never broken, just fresh.
- Want to move an existing world to a host? Copy `data/world.db` up to it (alongside `data/session-secret`
  if you want existing logins to stay valid), or leave it empty and let it bootstrap.

## 🔒 Privacy basics
Enable HTTPS (every host above gives it free) and keep the default of not storing emails. That's it.
