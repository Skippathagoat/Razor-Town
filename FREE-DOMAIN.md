# 🌐 Free domain for Razor Town (Northflank)

You asked for a **free custom domain** you can point at your Northflank deploy so the URL
reads like `https://razortown.xxx` instead of `https://svc-proj.code.run`. These are the
**four options that actually work in 2026** — all $0, all with HTTPS, all compatible with
Northflank's custom-domain screen.

> None of them are `.com` — a true `.com` will always cost money (~£8/yr on Namecheap).
> The free options below are real TLDs / subdomains that behave exactly like a paid
> domain in browsers.

---

## 🥇 Option 1 — **`*.js.org`** (recommended — professional, forever-free)

The JS Foundation gives away free subdomains of **`js.org`** to any JavaScript project on
GitHub. A URL like `https://razortown.js.org` looks legit and stays free forever.

**Steps:**
1. Push this project to a **public** GitHub repo (e.g. `yourname/razor-town`).
2. Fork https://github.com/js-org/js.org.
3. Add one line to the file `cnames_active.js` (keep the alphabetical order):
   ```js
   "razortown": "yourname.github.io/razor-town",
   ```
   — or, if you don't want a GitHub Pages site, you can point it directly at Northflank
   using a CNAME once you have the Northflank URL. The js.org team is fine with CNAMEs to
   hosts like `code.run`, `onrender.com`, `vercel.app`, etc. — just put the CNAME target in
   your PR and they'll sort it.
4. Open a PR against `js-org/js.org` titled "razortown".
5. Once merged, in **Northflank → your service → Domains → Add domain**, type
   `razortown.js.org` and click Verify (it creates a TXT/CNAME target).
6. Back in your js.org PR comment (or in a fresh commit) update the line to whatever
   CNAME target Northflank showed you.
7. HTTPS is provisioned automatically by Northflank in ~2 minutes.

Time: ~20 minutes.  Cost: $0 forever.  Look: ⭐⭐⭐⭐⭐.

---

## 🥈 Option 2 — **Free subdomains from `afraid.org` (FreeDNS)**

https://freedns.afraid.org/ — the grand-daddy of free subdomains. Thousands of public
domains you can grab a subdomain on (e.g. `razortown.chickenkiller.com`,
`razortown.mooo.com`, `razortown.ignorelist.com`, `razortown.uk.to`).

**Steps:**
1. Sign up free at https://freedns.afraid.org/signup/ (no card).
2. Go to **Subdomains → Add a subdomain**.
3. Pick a domain you like from the public list (there are hundreds), type `razortown` as
   the subdomain, set type **CNAME**, destination = your Northflank `code.run` URL.
4. In **Northflank → your service → Domains → Add domain**, type the full hostname
   (e.g. `razortown.chickenkiller.com`) and add it.
5. Northflank verifies CNAME automatically and issues a Let's Encrypt HTTPS cert.

Time: ~5 minutes.  Cost: $0.  Look: ⭐⭐⭐ (some shared domains look a little spammy).

> `uk.to` looks the most British / natural. `chickenkiller.com` is a meme but classic.

---

## 🥉 Option 3 — **DuckDNS** — `razortown.duckdns.org`

https://duckdns.org — super simple, run by a redditor, $0 forever.  Gives you
`something.duckdns.org`.

**Steps:**
1. Sign in with GitHub/Twitter/Google at https://duckdns.org.
2. Add a subdomain e.g. `razortown` — full URL becomes `razortown.duckdns.org`.
3. Set its **IP/CNAME** to your Northflank `code.run` hostname.
4. In Northflank → Domains add `razortown.duckdns.org`; Northflank provisions HTTPS.

Time: ~2 minutes.  Cost: $0.  Look: ⭐⭐⭐ — everyone knows DuckDNS so it doesn't scream
"cheap".

---

## 🏅 Option 4 — **`*.pages.dev` / `*.web.app` via a free Cloudflare Worker proxy**

If you already have a Cloudflare account, you can point a free **Cloudflare Pages**
project subdomain (e.g. `razortown.pages.dev`) at your Northflank service via a one-line
`_redirects` file:

```
/*  https://your-svc-your-proj.code.run/:splat  200
```

Push that as a static Pages project and you get `https://razortown.pages.dev` with free
HTTPS and Cloudflare's CDN in front.

Time: ~10 minutes.  Cost: $0.  Look: ⭐⭐⭐⭐ — `pages.dev` looks very professional.

---

## 🔧 How to wire it into Northflank (once you own the name)

Whichever free domain above you pick, the Northflank side is always the same:

1. Open your Northflank project → your Razor-Town combined **service** → the
   **Domains** tab.
2. Click **Add domain** → enter your chosen hostname (e.g. `razortown.js.org`).
3. Northflank shows you a **CNAME target** that looks like
   `your-service-namespace.code.run.` — copy it.
4. Go to wherever you manage the domain (js.org PR, FreeDNS, DuckDNS, Cloudflare) and
   create a **CNAME** record pointing your hostname to that target.
5. Save and wait — Northflank polls DNS and, once it sees the record, automatically
   issues a **Let's Encrypt** SSL certificate (usually 1–3 minutes).
6. When the cert says **Issued**, click the 🔒 lock icon to **enforce HTTPS**
   (redirect all HTTP traffic to HTTPS).
7. Visit your new URL — you're live. The game loads; accounts and saves keep working
   because the persistent volume at `/data` is still attached.

> You don't **need** a domain — the free `https://svc-proj.code.run` URL Northflank gives
> you out of the box already works. A custom domain just makes it easier to share.

---

## ⛔ What doesn't work for free

- **`.com` / `.co.uk` / `.gg` / `.io` / `.app`** — all cost money (typically £6–15/yr).
  Freenom.com used to give away `.tk / .ml / .ga / .cf / .gq` for free but **stopped new
  signups in 2024** after a Meta lawsuit; their domains are also widely blacklisted for
  phishing, so avoid them even if you get one.
- **EU.org** gives free subdomains but their approval queue is 3–6 weeks and they reject
  game/fun projects about half the time.
- **GitHub Pages** (`.github.io`) gives `username.github.io/repo` but you need to put the
  project in a repo named `<user>.github.io` for a bare subdomain.

---

## 🎯 Recommendation

For this game, I'd grab **`razortown.duckdns.org`** first (takes two minutes while you
wait for Northflank's first build to finish) and apply for **`razortown.js.org`** in
parallel — the js.org PR takes a day or two to merge but once you have it it's the best
free domain you can get anywhere.
