# 🆓 Free hosts for Razor Town — verified 2026

Razor Town needs three things from a host, so most "free hosting" lists are useless for it:

1. **A long-running Node process** — not serverless functions (the game holds state and serves SSE live events).
2. **A writable file that persists** — the whole world (`data/world.db`) lives in one SQLite file.
3. **A public HTTPS URL** — so friends can play.

> ### ⚠️ Dead ends — do not waste your time
> **Glitch** ended project hosting **8 July 2025** and fully shut down in **January 2026** — it's gone.
> **Cyclic** (2024) and **Deta** are gone too, and **Fly.io retired its free tier**.
> Vercel / Netlify / Cloudflare Workers are *serverless* — they can't hold a SQLite file or a long-lived
> SSE stream, so the game cannot run there. Any tutorial recommending the above is out of date.

Good news: **this app self-bootstraps.** On an empty host it builds the whole world (42 era citizens, 3
gangs, seed news) and recreates the founder account **Ghost** on first boot — so deploying is genuinely
one step, and a host that wipes its disk is annoying, not fatal.

---

## 🥇 The short answer

| Want | Use | Card? | Always awake? | Saves survive redeploy? |
|---|---|---|---|---|
| **Free, zero hassle, no card** | **Render** free web service + a free uptime pinger | No | ✅ with pinger | ❌ resets (world rebuilds itself + Ghost) |
| **Free, always-on, keeps saves** | **Northflank** Developer Sandbox | Card for verification (not charged) | ✅ no sleeping | ✅ persistent volume |
| **Free forever, full control** | **Oracle Cloud Always Free** VPS | Card for verification | ✅ | ✅ your own disk |
| Paid but rock solid | Hetzner/DigitalOcean VPS ~$4–6/mo | — | ✅ | ✅ |

---

## Option 1 — Render (best no-card starting point) ⭐ recommended to try first

- **Free tier:** 750 hours/month, 512 MB RAM, 100 GB bandwidth, **no credit card**.
- **Catch:** the free service **sleeps after ~15 minutes idle** and takes 30–50 s to wake. Worse, free
  services have **no persistent disk**, so a redeploy or restart resets the world.
- **Both solved:** a free uptime monitor (UptimeRobot, no card) pings `/api/health` every 5 minutes, which
  keeps it awake — 730 hours in a month fits inside the 750-hour allowance. Saves still reset on redeploy,
  but the app rebuilds a fresh world + Ghost automatically, so it's never broken.

**Steps**
1. Put this project on GitHub: create an empty repo, then on the repo page use **Add file → Upload files**
   and drag in everything from the project folder **except `node_modules/` and `data/`** (no git CLI needed).
2. **render.com** → sign up with GitHub → **New + → Web Service** → pick the repo.
3. Runtime **Node**, Build `npm install`, Start `node server.js`, Instance type **Free**.
   (A ready-made `render.yaml` is included — "New + → Blueprint" configures all of that for you.)
4. Health check path: `/api/health` (already supported).
5. Create a free **uptimerobot.com** monitor → HTTP(s) → your URL + `/api/health` → every 5 minutes.
6. Open the URL. First boot log shows `Citizens: 42 | gangs: 3 | accounts: 43 | founder created: ghost`.
   Log in as `ghost` / `Delilah2023!@` (a demo citizen — `node tools/wipe-account.js ghost` empties it out for good).

## Option 2 — Northflank (free + always-on + persistent saves)

- **Free "Developer Sandbox":** 2 services, 1 database, 2 cron jobs, **always-on compute (no sleeping)**,
  ~10 GB egress, ~1M HTTP requests/month, and a **small persistent volume** — perfect for a SQLite file.
- **Catch:** a **credit card is required at signup** as anti-abuse verification. The free tier is not
  charged; you'd only pay if you deliberately upgrade.

**Steps**
1. Push the project to GitHub as above (or use its Git integration).
2. **northflank.com** → create account → **New service → Combined service** (or "Build & deploy from repo"),
   pick the repo. The included **`Dockerfile`** is detected automatically — that's the recommended path.
3. Add a **volume** mounted at **`/data`** and set the environment variable **`DB_PATH=/data/world.db`**.
4. Set the port to **8787** (or set `PORT`); health check path `/api/health`.
5. Deploy → open the URL → same first-boot log, same founder login.

## Option 3 — Oracle Cloud Always Free (a real VPS, free forever)

- **Free forever:** Ampere ARM VMs (Oracle cut the Always Free ARM allowance to **2 cores / 12 GB RAM**
  in Aug 2026), plus 200 GB block storage and 10 TB/month egress. Running a Node game is trivial for it.
- **Catch:** Oracle now requires a **credit card for identity verification** (no prepaid/virtual cards) and
  signup is fussy — no VPN, card address must match your billing address. Capacity errors are common;
  upgrading the account to *Pay-As-You-Go* (still $0 within free limits) usually fixes "out of capacity".

**Steps**
1. Create the Always Free VM (Ubuntu), open port 8787 (or 80/443) in the security list.
2. Install Node 20, upload the project, then:
   ```bash
   npm install
   ./keep-up.sh &          # restart-on-crash supervisor, logs to logs/server.log
   ```
3. Optional: `systemd` unit or `pm2` so it starts on reboot; put Caddy/nginx in front for HTTPS.

## Also viable, with caveats

| Host | Free tier | Notes |
|---|---|---|
| **Koyeb** | 1 free service, scales to zero | Card required to verify (some report GitHub signup avoids it). Sleeps when idle; pinger helps. |
| **Railway** | $5 trial, then ~$1/month perpetual credit | No card to start; the tiny credit is enough for one very small service. |
| **Zeabur** | $5/month usage credit | No card; fine until the credit runs out. |
| **Back4App Containers** | Small free container | Works with the included `Dockerfile`. |
| **Google Cloud free tier** | 1 e2-micro, 30 GB disk, always on | Card required; a genuine always-on box like Oracle but smaller. |

---

## Why the world survives (or doesn't) — the SQLite story

- Everything lives in **one file**: `data/world.db` (override with `DB_PATH`).
- **Hosts with persistent storage** (Northflank volume, Oracle/VPS disk, any host you mount a volume on):
  accounts, banks, gangs, messages and news survive restarts forever. **Back up by downloading that one file.**
- **Hosts without** (Render free): the file is written but wiped on redeploy/restart. The app then
  self-bootstraps a fresh world and recreates Ghost — playable immediately, but players start over.
- Render can attach a disk on a paid instance (a few dollars/month) if you later want persistence there.

## Keeping a free host awake

Free platforms sleep idle apps, which kills a multiplayer city. Point any free monitor at
**`/api/health`** every 5 minutes — it returns `{ok:true, up, citizens, accounts, ...}`. That single trick
turns Render/Koyeb's "sleeps after 15 min" into effectively 24/7 at $0.

```bash
curl https://your-app.onrender.com/api/health
# {"ok":true,"app":"razor-town","up":3600,"citizens":42,"accounts":43,"factions":3,...}
```

## What I need from you

Any of these routes needs **an account that only you can create** (I can't sign up for third-party
services on your behalf). Tell me which one you want and I'll give you the exact click-by-click list for
that host and then verify the live URL end-to-end once it's up. The repository is already deploy-ready:
`Dockerfile`, `render.yaml`, `Procfile`, `app.json`, self-bootstrapping `lib/bootstrap.js`, `/api/health`,
plus `keep-up.sh` for plain VPS installs.
