# COLLAB.md — Handoff for collaborators

Welcome to Razor Town. This doc is everything you need before touching code.
Ten minutes here saves an hour of archaeology.

## What this is

A browser crime sim: original 1920s-flavored fiction, a Torn-*style* UI
(top status bars, grouped left sidebar, dense tables, paper-doll profile),
real accounts, crimes & consequences, jail with bail, gangs, casino,
daily streaks, player-to-player wires, fights, a news wire, leaderboards.

**House rule #1 — originality.** Every name, sprite and line of copy is
ours. Do not import art, fiction or data from Torn or any other game.
"Inspired by" stops at layout conventions.

## Repo map

| Path | What it is |
| --- | --- |
| `server.js` | HTTP server, zero framework: static files, REST API, SSE stream. All routes and auth checks live here. |
| `lib/db.js` | better-sqlite3 connection + schema. |
| `lib/accounts.js` | Registration, logins, sessions, email gate, bans, founder powers. |
| `lib/world.js` | The game's spine: state, money flows, jail/bail, Daily Streak, wires, pay-claim ledger, `publicView`. |
| `lib/game/content.js` | Content tables: crimes, casino flavor, items, achievements. |
| `lib/game/engine.js` | Rolls/resolution for content tables. |
| `lib/seed.js`, `lib/bootstrap.js` | First-boot world build (founder + seed news). Runs automatically — **ignore `npm run seed`, it's a stale pointer; booting the server self-seeds**. |
| `lib/wipe.js`, `tools/wipe-account.js` | Wiping/resetting an account to a blank citizen + the wipe lock that keeps boot from refilling it. |
| `public/js/app.js` | All in-game UI (SPA). Tabs, renders, click handling, dev panel. |
| `public/js/avatar.js` | SVG paper-doll renderer + jail mugshot renderer. Original art only. |
| `public/js/net.js`, `public/js/ui.js` | Fetch/SSE helpers, shared widgets. |
| `public/index.html` | Shell. **Bump the `?v=` cache-bust on script/style tags whenever you ship JS/CSS changes** or returning players keep stale code. |
| `NORTHFLANK.md` | Host runbook: env vars, redeploys, the Wire Pass payment setup. Never put real env **values** in the repo. |
| `DEPLOY.md`, `FREE-HOSTS.md` | Other host options + comparison notes. |
| `tools/check-http.js`, `docs/REVIEW.md` | Smoke checks, design review notes. |
| `Dockerfile`, `Procfile` | How hosts build/run it. |

## Run it locally

```bash
npm install            # single dep: better-sqlite3
DB_PATH=/tmp/world.db DEV_ACCOUNTS=ghost,devtester PORT=9546 node server.js
```

Open `http://localhost:9546`, register through the email gate.
Accounts named in `DEV_ACCOUNTS` become founders and get the dev panel
(inspect, `jail`, inline account delete — follow its on-screen arm flow).
`curl localhost:9546/api/health` reports liveness.

## Deploy chain — read this before pushing

> **`main` is the Live Button.** Push to `main` = Northflank auto-builds
> (Dockerfile) and deploys with health checks to:
> `https://p01--razor-town--zynzxj4wfx54.code.run`
> There is no staging gate and no rollback button in this doc.

Therefore:

1. **`git pull` before you start, every time.** Two sandboxes = two clones.
2. Branches + PRs for anything non-trivial. Direct-to-`main` only for
   small, verified fixes.
3. If it doesn't boot locally, it doesn't get pushed. Full stop.

## Non-negotiables

- **No secrets, ever.** Envs (`STRIPE_WEBHOOK_SECRET`, `PASS_PAY_LINK`, …)
  live only on Northflank. `.gitignore` already covers `data/*.db`,
  `.env`, `node_modules/` — keep it that way.
- **Server ids are API.** Casino/crime/etc. ids in content tables are the
  contract between client and server. Rename *display strings* freely
  (precedent: casino 2026 rebrand); never change an id.
- **Verify UI with a real browser, hit-tested.** We shipped a jail bug
  that synthetic clicks missed — a sticky overlay swallowed real taps.
  Click it like a player, on desktop **and** ~390px mobile width.
- **Originality rule** (top of this file) applies to every PR.

## What you do NOT get from this repo

- The **live player database** and Northflank **env values** are not in
  git. If a feature needs real data or config, ask the owner.
- The live game's save files. Test against your own local DB only.
- Founder credentials for live — those belong to the owner.

## Where things stand

- Payments: the Wire Pass fulfils automatically via `/api/stripe/webhook`
  once the owner finishes env setup — see `NORTHFLANK.md` § Real-money
  pass. Don't rework payment plumbing without the owner.
- Queued ideas the owner has noted: racing/betting board, multi-stage
  heists, a 7-day bonus wheel.
- Your first change? Ship something tiny (a copy tweak, a CSS fix) so
  you walk the whole loop — pull, branch, run, verify, PR — on day one.

Questions on intent, fiction voice, or live config: **owner first.**
Questions on "why does this route work this way": the code answers.
