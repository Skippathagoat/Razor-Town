# 🟦 Deploying Razor Town on Northflank (free, always-on, keeps saves)

Northflank's free **Developer Sandbox** is the best free home for this game: it **doesn't sleep** and it
can attach a **persistent volume**, so player accounts, banks, gangs and news survive redeploys.

Stack used here: your GitHub repo → Northflank builds the included **`Dockerfile`** → runs `node server.js`
→ the app **bootstraps its own world** (no NPC citizens, no NPC gangs, founder **Ghost**) on first boot.

> ⚠️ Northflank asks for a **credit card at signup** as anti-abuse verification. The Sandbox plan itself is
> free and isn't charged unless you deliberately upgrade to Pay-As-You-Go.

---

## 1. Connect your repo
1. Sign up at **northflank.com** (GitHub sign-in is easiest) and verify with a card when prompted.
2. Create a **project** (name it `razor-town`).
3. Give Northflank access to the repo: **Account → Integrations / VCS → GitHub → Authorize**, and grant it
   access to **`Skippathagoat/Razor-Town`** (for personal repos you may need to explicitly select the repo).

## 2. Create the service
4. Inside the project: **Create new → Service**.
5. Choose **Build & deploy from Git repository** → pick `Razor-Town` → branch **`main`**.
6. Build type: **Dockerfile** (auto-detected — the repo root has one). Leave the build context at the root.
7. Deployment/instance: **1 instance**, smallest available size (this game needs well under 512 MB).

## 3. The three settings that matter
8. **Networking → Ports:** add a port
   - **Internal port: `8787`**
   - Protocol **HTTP**
   - Enable **Publicly expose** → Northflank gives you an HTTPS URL (looks like
     `https://<service>-<project>.code.run`).
9. **Persistent volume:** create a volume (project → **Volumes → Create volume**), size **1 GB** is plenty,
   and attach it with the **mount path `/data`**. This is what makes saves permanent.
10. **Environment variables:**
    | Key | Value | Why |
    |---|---|---|
    | `DB_PATH` | `/data/world.db` | puts the whole world on the persistent volume |
    | `SESSION_SECRET` | *(optional)* any long random string | fixes logins forever; otherwise one is generated on the volume automatically |
    | `FOUNDER_USER` / `FOUNDER_PASS` / `FOUNDER_NAME` | *(optional)* | only if you want different founder credentials **before** the first boot |

    `PORT` is already `8787` inside the image, so nothing else is needed.

11. **Health check:** path **`/api/health`**, port **8787**. Northflank's rolling deploys will then wait for
    the game to actually answer before switching traffic.

## 4. Deploy and verify
12. **Create service / Deploy.** The first build takes ~2–4 minutes (it installs a small toolchain for SQLite).
13. Watch **Logs**. On a fresh volume you should see exactly:
    ```
    World ready. Content: 23 crimes | 9 jobs | 25 items
    Citizens: 0 | gangs: 0 | accounts: 1 | NPC bots: off (real players only) | founder created: ghost
    Razor Town listening on http://0.0.0.0:8787
    ```
14. Open your Northflank URL. You'll land on the 1920s auth screen → log in:
    **`ghost`** / **`Delilah2023!@`** (level 100, $500M, #1 in the Gallery), or register a new recruit.
15. Quick check from your own machine:
    ```bash
    curl https://YOUR-URL/api/health
    # {"ok":true,"app":"razor-town","up":12,"citizens":42,"accounts":43,"factions":3,...}
    ```

---

## ✅ What "working" looks like
- `/api/health` returns `ok:true` with **citizens: 42** and **accounts: 43**.
- You can log in as `ghost`, and a new recruit you register still exists after you:
  **Deployments → Restart** the service (that's the proof the volume is wired up).
- Two people can play at once — the world is shared and streaming live events to both. No NPCs are ever added, so every name you see is a real account; the boot log states this plainly.

## 🧯 If something looks wrong
| Symptom | Cause | Fix |
|---|---|---|
| Health check fails / service won't start | wrong internal port | port must be **8787**, protocol HTTP |
| `NPC bots: off (real players only)` | normal — the town is players-only | nothing to do; the founder + real accounts are kept |
| `Purged NPCs -> 42 accounts, 3 seeded gangs` | legacy NPCs from an older build | expected once; a second boot shows `0` everywhere |
| Everything resets after each deploy | volume not attached | mount a volume at **`/data`** and set `DB_PATH=/data/world.db` |
| Everyone logged out after a deploy | session secret not on the volume | keep `DB_PATH` on the volume (the secret is stored beside it), or set `SESSION_SECRET` |
| Build fails on `better-sqlite3` | Dockerfile not used (buildpack instead) | set build type to **Dockerfile** explicitly |

## 🔁 Updating the game later
Push to `main` and Northflank redeploys automatically (with a health-gated switchover, so players don't land
on a half-started container). Your volume — and therefore every account, gang and bank balance — is untouched
because it lives at `/data`, outside the image.

**CI/CD is on by default on a combined service** — every commit to the tracked branch is built and deployed,
so there is no deploy button to press [northflank docs](https://northflank.com/docs/v1/application/getting-started/build-and-deploy-your-code).
Two toggles worth knowing in **Service → Build & deploy settings**:
- **CI** — build automatically on each new commit.
- **CD** — roll the newest successful build out automatically. Keep both on for "push = live".

You can also turn **CD off** if you'd rather stage builds and promote them manually:
`Service → Builds → (pick a build) → Deploy`.

### How changes get made (no host access needed)
1. Describe the change you want.
2. The commit is pushed to **`main`** in `Skippathagoat/Razor-Town`.
3. Northflank builds and deploys it automatically; watch the service **Logs** for
   `Razor Town listening on http://0.0.0.0:8787`.
4. Confirm at `https://YOUR-URL/api/health` (`ok: true`, `citizens: 42`).
5. Something broke? `git revert <commit>` and push — the previous version redeploys within a couple of minutes.

> ⚠️ Don't edit code through the Northflank **Shell/Exec** tab. The container is rebuilt from the image on
> every deploy, so those edits disappear — it's only useful for one-off commands (e.g. `node tools/founder.js reset`).

## 🔑 Founder account
`ghost` / `Delilah2023!@` — created automatically when the world is empty. To force a password reset later,
run once from the Northflank **Shell/Exec** tab:
```bash
node tools/founder.js reset
```
